const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "*",
    methods: ["GET", "POST"]
  }
});

// CORS middleware for Express HTTP routes (Socket.IO has its own CORS above)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const PORT = process.env.PORT || 3000;
const MODULE_PORTS = [3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008];
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const MODULE_TIMEOUT = 60000; // 60 seconds

// Archive system
const archiveDir = path.join(__dirname, '../archive');
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
}

// Hub v2 State
const state = {
  submissions: [],        // All submissions (pending moderation)
  approved: [],           // Approved messages (ready for routing)
  routed: [],            // Messages sent to modules  
  rejected: [],          // Rejected messages with reasons
  modules: new Map(),    // Connected modules: id -> {name, status, socket, lastSeen, queue, config}
  moduleOrder: [],       // Drag-drop order for 3x3 grid
  archive: [],           // Event log for JSON export
  config: {
    rateLimitMs: 30000,
    maxMessageLength: 280,
    prompts: [
      "Send a dream...",
      "Describe a future you imagine...",
      "Share a hope or fear..."
    ],
    currentPromptIndex: 0,
    safeMode: false,      // Skip offline modules
    display: {
      resolution: '1080p',  // '720p' | '1080p' | '1440p' | '4k'
      framerate: 25,         // 25 | 30 | 50 | 60
      messageDisplayMs: 3000,
      transitionMs: 500,
      presets: {
        '720p':  { width: 1280, height: 720 },
        '1080p': { width: 1920, height: 1080 },
        '1440p': { width: 2560, height: 1440 },
        '4k':    { width: 3840, height: 2160 }
      },
      validFramerates: [25, 30, 50, 60]
    }
  }
};

// Rate limit tracking: sessionId -> lastSubmitTime
const rateLimits = new Map();

// Module discovery and management
const discoveredModules = new Map();

// ============ PROGRESS TRACKING ============

const PROGRESS_STAGES = [
  { id: 'received',   label: 'Message Received',     minMs: 3000 },
  { id: 'queued',     label: 'Entering Queue',        minMs: 3000 },
  { id: 'reviewed',   label: 'Under Review',          minMs: 3000 },
  { id: 'approved',   label: 'Approved',              minMs: 3000 },
  { id: 'routing',    label: 'Routing to Module',     minMs: 3000 },
  { id: 'processing', label: 'Module Processing',     minMs: 3000 },
  { id: 'rendering',  label: 'Preparing Output',      minMs: 3000 },
  { id: 'complete',   label: 'Displayed',             minMs: 3000 }
];

// Active progress trackers: messageId -> { stage, stageStart, timers, sessionId }
const progressTrackers = new Map();

function startProgressTracking(messageId, sessionId) {
  const tracker = {
    messageId,
    sessionId,
    stage: 0,
    stageStart: Date.now(),
    timers: []
  };
  progressTrackers.set(messageId, tracker);
  broadcastProgress(messageId, 0);
}

function advanceProgress(messageId, targetStage) {
  const tracker = progressTrackers.get(messageId);
  if (!tracker) return;
  
  const now = Date.now();
  const currentStage = PROGRESS_STAGES[tracker.stage];
  const elapsed = now - tracker.stageStart;
  const remaining = Math.max(0, currentStage.minMs - elapsed);
  
  // Clear any pending timers
  tracker.timers.forEach(t => clearTimeout(t));
  tracker.timers = [];
  
  if (targetStage <= tracker.stage) return;
  
  // Schedule each intermediate stage with minimum delays
  let delay = remaining;
  for (let s = tracker.stage + 1; s <= targetStage; s++) {
    const stageIdx = s;
    const timer = setTimeout(() => {
      tracker.stage = stageIdx;
      tracker.stageStart = Date.now();
      broadcastProgress(messageId, stageIdx);
      
      // Clean up on completion
      if (stageIdx === PROGRESS_STAGES.length - 1) {
        setTimeout(() => progressTrackers.delete(messageId), 5000);
      }
    }, delay);
    tracker.timers.push(timer);
    delay += PROGRESS_STAGES[s] ? PROGRESS_STAGES[s].minMs : 0;
  }
}

function broadcastProgress(messageId, stageIndex) {
  const stage = PROGRESS_STAGES[stageIndex];
  const tracker = progressTrackers.get(messageId);
  
  const progressData = {
    messageId,
    stage: stageIndex,
    stageId: stage.id,
    stageLabel: stage.label,
    totalStages: PROGRESS_STAGES.length,
    percent: Math.round(((stageIndex + 1) / PROGRESS_STAGES.length) * 100)
  };
  
  // Send to display
  io.to('display').emit('message-progress', progressData);
  
  // Send to the specific audience member if they're connected
  if (tracker && tracker.sessionId) {
    io.to(`session:${tracker.sessionId}`).emit('message-progress', progressData);
  }
  
  console.log(`[PROGRESS] ${messageId.slice(0, 8)}: ${stage.label} (${stageIndex + 1}/${PROGRESS_STAGES.length})`);
}

// Serve static files
app.use('/submit', express.static(path.join(__dirname, '../public/submit')));
app.use('/moderate', express.static(path.join(__dirname, '../public/moderate')));
app.use('/display', express.static(path.join(__dirname, '../public/display')));
app.use('/history', express.static(path.join(__dirname, '../public/history')));

// JSON body parsing
app.use(express.json());

// ============ ARCHIVE LOGGING ============

function logEvent(type, data) {
  const event = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    type, // 'submission', 'approval', 'rejection', 'routing', 'module_response'
    data
  };
  
  state.archive.push(event);
  
  // Write to JSON file (append mode for crash recovery)
  const logFile = path.join(archiveDir, `events_${new Date().toISOString().split('T')[0]}.json`);
  fs.appendFileSync(logFile, JSON.stringify(event) + '\n');
  
  console.log(`[ARCHIVE] ${type.toUpperCase()}: ${event.id.slice(0,8)}`);
}

// ============ MODULE DISCOVERY ============

async function scanForModules() {
  console.log('[HUB] Scanning for modules on ports:', MODULE_PORTS);
  
  const promises = MODULE_PORTS.map(async (port) => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({ port, available: false });
      }, 1000);
      
      socket.connect(port, 'localhost', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ port, available: true });
      });
      
      socket.on('error', () => {
        clearTimeout(timeout);
        resolve({ port, available: false });
      });
    });
  });
  
  const results = await Promise.all(promises);
  const availablePorts = results.filter(r => r.available).map(r => r.port);
  
  console.log(`[HUB] Found potential modules on ports:`, availablePorts);
  return availablePorts;
}

// ============ SUBMISSION API ============

app.get('/api/prompt', (req, res) => {
  res.json({ 
    prompt: state.config.prompts[state.config.currentPromptIndex],
    maxLength: state.config.maxMessageLength
  });
});

app.post('/api/submit', (req, res) => {
  const { message, sessionId } = req.body;
  
  // Validate
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message required' });
  }
  
  if (message.length > state.config.maxMessageLength) {
    return res.status(400).json({ error: `Max ${state.config.maxMessageLength} characters` });
  }
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID required' });
  }
  
  // Rate limit check
  const lastSubmit = rateLimits.get(sessionId);
  const now = Date.now();
  if (lastSubmit && (now - lastSubmit) < state.config.rateLimitMs) {
    const waitSecs = Math.ceil((state.config.rateLimitMs - (now - lastSubmit)) / 1000);
    return res.status(429).json({ error: `Please wait ${waitSecs}s before submitting again` });
  }
  
  // Create submission
  const submission = {
    id: uuidv4(),
    message: message.trim(),
    sessionId,
    timestamp: now,
    status: 'pending' // pending | approved | rejected
  };
  
  state.submissions.unshift(submission);
  rateLimits.set(sessionId, now);
  
  // Archive logging
  logEvent('submission', {
    submissionId: submission.id,
    sessionId: submission.sessionId,
    messageLength: submission.message.length,
    prompt: state.config.prompts[state.config.currentPromptIndex]
  });
  
  // Start progress tracking: stage 0 (received) → stage 1 (queued)
  startProgressTracking(submission.id, sessionId);
  advanceProgress(submission.id, 1); // queued
  
  // Notify moderators
  io.to('moderators').emit('new-submission', submission);
  
  console.log(`[SUBMIT] ${submission.id.slice(0,8)}: "${submission.message.slice(0,50)}..."`);
  
  res.json({ success: true, id: submission.id });
});

// ============ MODERATION API ============

app.get('/api/submissions', (req, res) => {
  res.json(state.submissions.filter(s => s.status === 'pending'));
});

app.get('/api/rejected', (req, res) => {
  res.json(state.rejected);
});

app.get('/api/submissions/approved', (req, res) => {
  res.json(state.approved);
});

app.get('/api/archive', (req, res) => {
  res.json({
    events: state.archive,
    stats: {
      totalSubmissions: state.submissions.length,
      approved: state.approved.length,
      rejected: state.rejected.length,
      routed: state.routed.length,
      activeModules: Array.from(state.modules.values()).filter(m => m.status === 'online').length
    }
  });
});

app.get('/api/modules/status', (req, res) => {
  const moduleStatus = Array.from(state.modules.values()).map(m => ({
    id: m.id,
    name: m.name,
    status: m.status,
    lastSeen: m.lastSeen,
    queueDepth: m.queue.length,
    lastResponse: m.lastResponse || null
  }));
  
  res.json({
    modules: moduleStatus,
    moduleOrder: state.moduleOrder,
    safeMode: state.config.safeMode
  });
});

app.post('/api/modules/reorder', (req, res) => {
  const { newOrder } = req.body;
  if (Array.isArray(newOrder)) {
    state.moduleOrder = newOrder;
    logEvent('module_reorder', { newOrder });
    io.emit('modules-reordered', { moduleOrder: state.moduleOrder });
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid order array' });
  }
});

app.post('/api/local-submit', (req, res) => {
  const { message } = req.body;
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message required' });
  }
  
  if (message.length > state.config.maxMessageLength) {
    return res.status(400).json({ error: `Max ${state.config.maxMessageLength} characters` });
  }
  
  const submission = {
    id: uuidv4(),
    message: message.trim(),
    sessionId: 'local-moderator',
    timestamp: Date.now(),
    status: 'pending',
    source: 'local-fallback'
  };
  
  state.submissions.unshift(submission);
  
  logEvent('submission', {
    submissionId: submission.id,
    sessionId: 'local-moderator',
    messageLength: submission.message.length,
    source: 'local-fallback'
  });
  
  io.to('moderators').emit('new-submission', submission);
  
  console.log(`[LOCAL-SUBMIT] ${submission.id.slice(0,8)}: "${submission.message.slice(0,50)}..."`);
  
  res.json({ success: true, id: submission.id });
});

app.post('/api/config/safe-mode', (req, res) => {
  const { enabled } = req.body;
  state.config.safeMode = Boolean(enabled);
  logEvent('safe_mode_toggle', { enabled: state.config.safeMode });
  console.log(`[HUB] Safe mode ${state.config.safeMode ? 'enabled' : 'disabled'}`);
  res.json({ success: true, safeMode: state.config.safeMode });
});

// ============ DISPLAY CONFIG API ============

app.get('/api/config/display', (req, res) => {
  const d = state.config.display;
  const preset = d.presets[d.resolution];
  res.json({
    resolution: d.resolution,
    width: preset.width,
    height: preset.height,
    framerate: d.framerate,
    messageDisplayMs: d.messageDisplayMs,
    transitionMs: d.transitionMs,
    availableResolutions: Object.keys(d.presets),
    availableFramerates: d.validFramerates
  });
});

app.post('/api/config/display', (req, res) => {
  const { resolution, framerate, messageDisplayMs, transitionMs } = req.body;
  const d = state.config.display;
  
  if (resolution) {
    if (!d.presets[resolution]) {
      return res.status(400).json({ error: `Invalid resolution. Use: ${Object.keys(d.presets).join(', ')}` });
    }
    d.resolution = resolution;
  }
  
  if (framerate !== undefined) {
    const fr = parseInt(framerate);
    if (!d.validFramerates.includes(fr)) {
      return res.status(400).json({ error: `Invalid framerate. Use: ${d.validFramerates.join(', ')}` });
    }
    d.framerate = fr;
  }
  
  if (messageDisplayMs !== undefined) {
    d.messageDisplayMs = Math.max(1000, Math.min(30000, parseInt(messageDisplayMs)));
  }
  
  if (transitionMs !== undefined) {
    d.transitionMs = Math.max(100, Math.min(2000, parseInt(transitionMs)));
  }
  
  const preset = d.presets[d.resolution];
  const config = {
    resolution: d.resolution,
    width: preset.width,
    height: preset.height,
    framerate: d.framerate,
    messageDisplayMs: d.messageDisplayMs,
    transitionMs: d.transitionMs
  };
  
  // Broadcast to all displays
  io.to('display').emit('display-config', config);
  
  logEvent('display_config_changed', config);
  console.log(`[DISPLAY] Config updated: ${d.resolution} @ ${d.framerate}fps`);
  
  res.json({ success: true, ...config });
});

app.post('/api/moderate', (req, res) => {
  const { submissionId, action, reason, editedMessage } = req.body; // action: 'approve' | 'reject'
  
  if (!submissionId || !action) {
    return res.status(400).json({ error: 'submissionId and action required' });
  }
  
  const submission = state.submissions.find(s => s.id === submissionId);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }
  
  if (submission.status !== 'pending') {
    return res.status(400).json({ error: 'Submission already moderated' });
  }
  
  submission.status = action === 'approve' ? 'approved' : 'rejected';
  
  if (action === 'approve') {
    // Handle message editing
    if (editedMessage && editedMessage.trim() !== submission.message) {
      submission.originalMessage = submission.message;
      submission.message = editedMessage.trim();
      submission.edited = true;
    }
    
    state.approved.unshift(submission);
    
    // Progress: reviewed → approved → routing
    advanceProgress(submission.id, 2); // reviewed
    advanceProgress(submission.id, 4); // routing (stages 3+4 will chain with min delays)
    
    // Archive logging
    logEvent('approval', {
      submissionId: submission.id,
      originalMessage: submission.originalMessage || submission.message,
      finalMessage: submission.message,
      edited: submission.edited || false
    });
    
    // Route to modules
    routeToNextModule(submission);
    
    // Notify display
    io.to('display').emit('new-message', submission);
    io.to('history').emit('new-message', submission);
  } else {
    // Handle rejection
    const rejectedEntry = {
      ...submission,
      rejectionReason: reason || 'No reason provided',
      rejectedAt: new Date().toISOString()
    };
    
    state.rejected.unshift(rejectedEntry);
    
    // Archive logging
    logEvent('rejection', {
      submissionId: submission.id,
      message: submission.message,
      reason: rejectedEntry.rejectionReason
    });
  }
  
  console.log(`[MODERATE] ${action.toUpperCase()}: ${submission.id.slice(0,8)} - "${submission.message.slice(0,30)}..."`);
  
  res.json({ success: true, submission });
});

// ============ ROUTING API ============

app.get('/api/modules', (req, res) => {
  const modules = [];
  state.modules.forEach((mod, id) => {
    modules.push({ id, name: mod.name, status: mod.status });
  });
  res.json(modules);
});

app.post('/api/route/:messageId', (req, res) => {
  const { messageId } = req.params;
  const { moduleId } = req.body;
  
  const message = state.approved.find(m => m.id === messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  
  const module = state.modules.get(moduleId);
  if (!module) {
    return res.status(404).json({ error: 'Module not found' });
  }
  
  // Send to module
  message.routedTo = moduleId;
  message.routedAt = Date.now();
  state.routed.push(message);
  
  // Remove from approved queue
  const idx = state.approved.indexOf(message);
  if (idx > -1) state.approved.splice(idx, 1);
  
  // Notify module
  module.socket.emit('process-message', {
    id: message.id,
    message: message.message,
    timestamp: message.timestamp
  });
  
  // Notify display
  io.to('display').emit('message-routed', {
    messageId: message.id,
    moduleId,
    moduleName: module.name
  });
  
  console.log(`[ROUTE] ${message.id.slice(0,8)} → ${module.name}`);
  
  res.json({ success: true });
});

// ============ MODULE MANAGEMENT ============

app.post('/api/modules/retry', (req, res) => {
  const { moduleId } = req.body;
  
  const module = state.modules.get(moduleId);
  if (!module) {
    return res.status(404).json({ error: 'Module not found' });
  }
  
  // Retry failed messages in queue
  const failedMessages = module.queue.filter(m => !m.retried);
  failedMessages.forEach(message => {
    message.retried = true;
    module.socket.emit('process-message', message);
  });
  
  logEvent('module_retry', {
    moduleId,
    moduleName: module.name,
    retriedCount: failedMessages.length
  });
  
  console.log(`[RETRY] ${module.name}: ${failedMessages.length} messages`);
  
  res.json({ success: true, retriedCount: failedMessages.length });
});

app.post('/api/modules/clear-queue', (req, res) => {
  const { moduleId } = req.body;
  
  const module = state.modules.get(moduleId);
  if (!module) {
    return res.status(404).json({ error: 'Module not found' });
  }
  
  const clearedCount = module.queue.length;
  module.queue = [];
  
  logEvent('module_queue_clear', {
    moduleId,
    moduleName: module.name,
    clearedCount
  });
  
  console.log(`[CLEAR] ${module.name}: ${clearedCount} messages cleared`);
  
  res.json({ success: true, clearedCount });
});

// ============ ROUTER FUNCTIONS ============

function routeToNextModule(message) {
  let availableModules = Array.from(state.modules.values())
    .filter(m => m.status === 'online');
  
  // Apply safe mode filtering — only route to modules with recent heartbeat
  if (state.config.safeMode) {
    const now = Date.now();
    availableModules = availableModules.filter(m => 
      m.status === 'online' && (now - m.lastSeen) < HEARTBEAT_INTERVAL * 2
    );
  }
  
  // Use moduleOrder if available, otherwise default order
  if (state.moduleOrder.length > 0) {
    availableModules.sort((a, b) => {
      const aIndex = state.moduleOrder.indexOf(a.id);
      const bIndex = state.moduleOrder.indexOf(b.id);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
  }
  
  if (availableModules.length === 0) {
    console.log('[ROUTE] No available modules');
    return;
  }
  
  // Simple round-robin with available modules
  const targetModule = availableModules[state.routed.length % availableModules.length];
  
  const routedMessage = {
    id: uuidv4(),
    messageId: message.id,
    content: message.message,
    timestamp: Date.now(),
    moduleId: targetModule.id
  };
  
  // Add to module's queue
  targetModule.queue.push(routedMessage);
  state.routed.push(routedMessage);
  
  // Archive logging
  logEvent('routing', {
    routedMessageId: routedMessage.id,
    originalSubmissionId: message.id,
    targetModuleId: targetModule.id,
    targetModuleName: targetModule.name,
    queueDepth: targetModule.queue.length
  });
  
  // Send to module with timeout
  targetModule.socket.emit('process-message', routedMessage);
  targetModule.status = 'processing';
  targetModule.processingMessageId = routedMessage.id;
  
  // Set timeout for module response
  setTimeout(() => {
    if (targetModule.processingMessageId === routedMessage.id) {
      console.log(`[TIMEOUT] Module ${targetModule.name} timed out on message ${routedMessage.id.slice(0,8)}`);
      handleModuleTimeout(targetModule, routedMessage);
    }
  }, MODULE_TIMEOUT);
  
  console.log(`[ROUTE] ${routedMessage.id.slice(0,8)} → ${targetModule.name} (queue: ${targetModule.queue.length})`);
}

function handleModuleTimeout(module, message) {
  module.status = 'timeout';
  module.processingMessageId = null;
  
  // Remove from queue
  module.queue = module.queue.filter(m => m.id !== message.id);
  
  // Return message to pool for redistribution
  const originalSubmission = state.approved.find(s => s.id === message.messageId);
  if (originalSubmission) {
    console.log(`[REDISTRIBUTE] Returning timed out message to queue: ${message.id.slice(0,8)}`);
    // Could implement retry logic here
  }
  
  logEvent('module_timeout', {
    moduleId: module.id,
    moduleName: module.name,
    messageId: message.id
  });
  
  // Notify moderators of timeout
  io.to('moderators').emit('module-timeout', {
    moduleId: module.id,
    moduleName: module.name,
    messageId: message.id
  });
}

// ============ TEST SYSTEM ============

const testState = {
  virtualModules: new Map(),  // id -> { name, delay, outputType }
  testRuns: [],               // history of test runs
  autoRunInterval: null
};

// Serve test page
app.use('/test', express.static(path.join(__dirname, '../public/test')));

// Get test system status
app.get('/api/test/status', (req, res) => {
  res.json({
    virtualModules: Array.from(testState.virtualModules.entries()).map(([id, vm]) => ({
      id,
      name: vm.name,
      delay: vm.delay,
      outputType: vm.outputType,
      registered: state.modules.has(id)
    })),
    testRuns: testState.testRuns.slice(-20),
    autoRunning: !!testState.autoRunInterval,
    hubState: {
      pendingSubmissions: state.submissions.filter(s => s.status === 'pending').length,
      approvedMessages: state.approved.length,
      routedMessages: state.routed.length,
      connectedModules: Array.from(state.modules.values()).filter(m => m.status === 'online').length,
      totalModules: state.modules.size
    }
  });
});

// Create virtual test modules
app.post('/api/test/create-modules', (req, res) => {
  const { count = 3, baseDelay = 2000, outputTypes } = req.body;
  const defaultTypes = ['text', 'text', 'image', 'html', 'text', 'image', 'text', 'html'];
  const created = [];
  
  for (let i = 0; i < Math.min(count, 8); i++) {
    const moduleId = `test-vm-${i + 1}`;
    const moduleName = `Test Module ${i + 1}`;
    const delay = baseDelay + Math.floor(Math.random() * 2000);
    const outputType = (outputTypes && outputTypes[i]) || defaultTypes[i] || 'text';
    
    // Store virtual module config
    testState.virtualModules.set(moduleId, {
      name: moduleName,
      delay,
      outputType
    });
    
    // Register in Hub state as if it connected via WebSocket
    const mockSocket = {
      id: `test-socket-${moduleId}`,
      emit: (event, data) => {
        // Virtual module auto-processes messages
        if (event === 'process-message') {
          handleVirtualModuleMessage(moduleId, data);
        }
      },
      join: () => {}
    };
    
    state.modules.set(moduleId, {
      id: moduleId,
      name: moduleName,
      socket: mockSocket,
      status: 'online',
      connectedAt: Date.now(),
      lastSeen: Date.now(),
      queue: [],
      port: 3001 + i,
      processingMessageId: null,
      lastResponse: null,
      isVirtual: true
    });
    
    if (!state.moduleOrder.includes(moduleId)) {
      state.moduleOrder.push(moduleId);
    }
    
    created.push({ id: moduleId, name: moduleName, delay, outputType });
    
    // Notify displays and moderators
    io.to('display').emit('module-status', { moduleId, name: moduleName, status: 'online' });
    io.to('moderators').emit('module-connected', { moduleId, name: moduleName, port: 3001 + i });
  }
  
  console.log(`[TEST] Created ${created.length} virtual modules`);
  logEvent('test_modules_created', { count: created.length, modules: created.map(c => c.id) });
  
  res.json({ success: true, created });
});

// Virtual module message handler
function handleVirtualModuleMessage(moduleId, message) {
  const vm = testState.virtualModules.get(moduleId);
  const module = state.modules.get(moduleId);
  if (!vm || !module) return;
  
  module.status = 'processing';
  console.log(`[TEST-VM] ${vm.name} processing message ${message.id?.slice(0, 8)}...`);
  
  // Simulate processing delay
  setTimeout(() => {
    const output = generateTestOutput(vm.outputType, message.content || message.message || '');
    const processingTime = vm.delay + Math.floor(Math.random() * 500);
    
    // Update module state (same as real message-processed handler)
    module.lastSeen = Date.now();
    module.status = 'online';
    module.processingMessageId = null;
    module.lastResponse = {
      messageId: message.id,
      timestamp: Date.now(),
      processingTime
    };
    
    // Remove from queue
    module.queue = module.queue.filter(m => m.id !== message.id);
    
    console.log(`[TEST-VM] ${vm.name} completed in ${processingTime}ms → ${output.type}`);
    
    logEvent('module_response', {
      moduleId,
      moduleName: vm.name,
      messageId: message.id,
      outputType: output.type,
      processingTime,
      queueDepth: module.queue.length,
      isVirtualTest: true
    });
    
    // Progress: processing → rendering → complete
    // message.messageId is the original submission ID
    advanceProgress(message.messageId || message.id, 5);
    advanceProgress(message.messageId || message.id, 7);
    
    // Forward to display
    io.to('display').emit('module-output', {
      moduleId,
      messageId: message.id,
      output
    });
    
    // Log test run
    testState.testRuns.push({
      timestamp: Date.now(),
      moduleId,
      moduleName: vm.name,
      messageId: message.id,
      outputType: output.type,
      processingTime
    });
  }, vm.delay);
}

// Generate test output based on type
function generateTestOutput(type, inputText) {
  const shortInput = inputText.slice(0, 50);
  
  switch (type) {
    case 'image':
      // SVG placeholder representing a generated image
      const hue = Math.floor(Math.random() * 360);
      return {
        type: 'html',
        content: `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,hsl(${hue},70%,40%),hsl(${(hue+60)%360},70%,60%));border-radius:8px;color:#fff;font-size:0.8rem;text-align:center;padding:12px;">
          <div><strong>Generated Art</strong><br><em>"${shortInput}"</em></div>
        </div>`
      };
    case 'html':
      return {
        type: 'html',
        content: `<div style="padding:16px;background:#1a1a2e;border-radius:8px;color:#e0e0e0;font-family:monospace;font-size:0.8rem;">
          <div style="color:#f59e0b;margin-bottom:8px;">&#9608; AI Analysis</div>
          <div>${shortInput}</div>
          <div style="margin-top:8px;color:#666;font-size:0.7rem;">Score: ${(Math.random() * 10).toFixed(1)}/10</div>
        </div>`
      };
    case 'text':
    default:
      const responses = [
        `Interpreted: "${shortInput}" as a vision of digital consciousness`,
        `Pattern detected in "${shortInput}" — resonance frequency: ${(Math.random() * 1000).toFixed(0)}Hz`,
        `"${shortInput}" → transformed through neural pathways`,
        `Dream analysis of "${shortInput}": ${['hope', 'wonder', 'curiosity', 'melancholy', 'joy'][Math.floor(Math.random() * 5)]}`
      ];
      return {
        type: 'text',
        content: responses[Math.floor(Math.random() * responses.length)]
      };
  }
}

// Submit a test message (bypasses rate limiting)
app.post('/api/test/submit', (req, res) => {
  const { message } = req.body;
  const text = message || `Test message ${Date.now().toString(36)}`;
  
  const submission = {
    id: uuidv4(),
    message: text.trim().slice(0, state.config.maxMessageLength),
    sessionId: 'test-system',
    timestamp: Date.now(),
    status: 'pending',
    source: 'test'
  };
  
  state.submissions.unshift(submission);
  io.to('moderators').emit('new-submission', submission);
  
  logEvent('submission', {
    submissionId: submission.id,
    sessionId: 'test-system',
    messageLength: submission.message.length,
    source: 'test'
  });
  
  console.log(`[TEST] Submitted: ${submission.id.slice(0, 8)} - "${submission.message.slice(0, 40)}..."`);
  res.json({ success: true, submission });
});

// Auto-approve a test submission (submit + approve in one call)
app.post('/api/test/submit-and-approve', (req, res) => {
  const { message } = req.body;
  const text = message || `Auto-test ${Date.now().toString(36)}`;
  
  const submission = {
    id: uuidv4(),
    message: text.trim().slice(0, state.config.maxMessageLength),
    sessionId: 'test-system',
    timestamp: Date.now(),
    status: 'approved',
    source: 'test'
  };
  
  state.submissions.unshift(submission);
  state.approved.unshift(submission);
  
  logEvent('submission', { submissionId: submission.id, source: 'test-auto' });
  logEvent('approval', { submissionId: submission.id, source: 'test-auto' });
  
  // Progress tracking: fast-forward through received → queued → reviewed → approved → routing
  startProgressTracking(submission.id, 'test-system');
  advanceProgress(submission.id, 4); // routing
  
  // Route to module
  routeToNextModule(submission);
  
  // Notify display
  io.to('display').emit('new-message', submission);
  io.to('moderators').emit('new-submission', submission);
  
  console.log(`[TEST] Auto-approved: ${submission.id.slice(0, 8)} - "${submission.message.slice(0, 40)}..."`);
  res.json({ success: true, submission });
});

// Run full end-to-end auto test (periodic submissions)
app.post('/api/test/auto-run', (req, res) => {
  const { intervalMs = 8000, count = 10 } = req.body;
  
  // Ensure virtual modules exist
  if (testState.virtualModules.size === 0) {
    return res.status(400).json({ error: 'Create virtual modules first: POST /api/test/create-modules' });
  }
  
  // Stop any existing auto-run
  if (testState.autoRunInterval) {
    clearInterval(testState.autoRunInterval);
  }
  
  const testMessages = [
    "I dream of electric gardens growing in the clouds",
    "What if machines could feel the warmth of sunrise?",
    "In the future, art creates itself and we just watch",
    "My hope is that technology brings people closer together",
    "I imagine a world where creativity has no boundaries",
    "The sound of rain on a digital window",
    "What does it mean to be human in an age of AI?",
    "I see colours that haven't been invented yet",
    "A future where every voice is heard and amplified",
    "Dancing with algorithms under neon skies",
    "When the network sleeps, do the machines dream?",
    "I want to send a message to the year 3000",
    "Beauty exists in the space between ones and zeros",
    "The exhibition is alive and breathing with our words",
    "Can art made by everyone belong to no one?"
  ];
  
  let sent = 0;
  
  testState.autoRunInterval = setInterval(() => {
    if (sent >= count) {
      clearInterval(testState.autoRunInterval);
      testState.autoRunInterval = null;
      console.log(`[TEST] Auto-run complete: ${sent} messages sent`);
      return;
    }
    
    const msg = testMessages[sent % testMessages.length];
    const submission = {
      id: uuidv4(),
      message: msg,
      sessionId: 'test-auto-run',
      timestamp: Date.now(),
      status: 'approved',
      source: 'test-auto-run'
    };
    
    state.submissions.unshift(submission);
    state.approved.unshift(submission);
    
    logEvent('submission', { submissionId: submission.id, source: 'test-auto-run' });
    logEvent('approval', { submissionId: submission.id, source: 'test-auto-run' });
    
    routeToNextModule(submission);
    io.to('display').emit('new-message', submission);
    io.to('moderators').emit('new-submission', submission);
    
    sent++;
    console.log(`[TEST] Auto-run ${sent}/${count}: "${msg.slice(0, 40)}..."`);
  }, intervalMs);
  
  console.log(`[TEST] Auto-run started: ${count} messages every ${intervalMs}ms`);
  res.json({ success: true, count, intervalMs });
});

// Stop auto-run
app.post('/api/test/stop', (req, res) => {
  if (testState.autoRunInterval) {
    clearInterval(testState.autoRunInterval);
    testState.autoRunInterval = null;
    console.log('[TEST] Auto-run stopped');
    res.json({ success: true, message: 'Auto-run stopped' });
  } else {
    res.json({ success: true, message: 'No auto-run active' });
  }
});

// Remove all virtual modules
app.post('/api/test/cleanup', (req, res) => {
  // Stop auto-run
  if (testState.autoRunInterval) {
    clearInterval(testState.autoRunInterval);
    testState.autoRunInterval = null;
  }
  
  // Remove virtual modules from state
  for (const moduleId of testState.virtualModules.keys()) {
    state.modules.delete(moduleId);
    state.moduleOrder = state.moduleOrder.filter(id => id !== moduleId);
    
    io.to('display').emit('module-status', { moduleId, name: moduleId, status: 'offline' });
    io.to('moderators').emit('module-disconnected', { moduleId, name: moduleId });
  }
  
  testState.virtualModules.clear();
  testState.testRuns = [];
  
  console.log('[TEST] Cleanup complete — all virtual modules removed');
  res.json({ success: true });
});

// ============ SOCKET.IO ============

io.on('connection', (socket) => {
  // Connection logged only when client identifies with a role
  
  // Handle different client types
  socket.on('identify', (data) => {
    const { role, name, modulePort } = data;
    
    switch (role) {
      case 'moderator':
        socket.join('moderators');
        console.log(`[WS] Moderator joined: ${socket.id}`);
        
        // Send current module status
        const moduleStatus = Array.from(state.modules.values()).map(m => ({
          id: m.id,
          name: m.name,
          status: m.status,
          lastSeen: m.lastSeen,
          queueDepth: m.queue.length
        }));
        
        socket.emit('modules-status', {
          modules: moduleStatus,
          moduleOrder: state.moduleOrder,
          safeMode: state.config.safeMode
        });
        break;
        
      case 'display':
        socket.join('display');
        console.log(`[WS] Display joined: ${socket.id}`);
        break;
        
      case 'history':
        socket.join('history');
        console.log(`[WS] History joined: ${socket.id}`);
        break;
        
      case 'module':
        const moduleId = data.moduleId || `module-${modulePort || socket.id.slice(0,8)}`;
        const module = {
          id: moduleId,
          name: name || `Module-${moduleId.slice(0,8)}`,
          socket,
          status: 'online',
          connectedAt: Date.now(),
          lastSeen: Date.now(),
          queue: [],
          port: modulePort,
          processingMessageId: null,
          lastResponse: null
        };
        
        state.modules.set(moduleId, module);
        socket.join('modules');
        
        // Add to module order if not present
        if (!state.moduleOrder.includes(moduleId)) {
          state.moduleOrder.push(moduleId);
        }
        
        console.log(`[WS] Module registered: ${module.name} (${moduleId}) on port ${modulePort || 'unknown'}`);
        
        logEvent('module_connect', {
          moduleId,
          moduleName: module.name,
          port: modulePort
        });
        
        // Notify displays and moderators of new module
        io.to('display').emit('module-status', {
          moduleId,
          name: module.name,
          status: 'online'
        });
        
        io.to('moderators').emit('module-connected', {
          moduleId,
          name: module.name,
          port: modulePort
        });
        
        // Handle heartbeat
        socket.on('heartbeat', () => {
          module.lastSeen = Date.now();
          if (module.status === 'offline') {
            module.status = 'online';
            io.to('display').emit('module-status', {
              moduleId,
              name: module.name,
              status: 'online'
            });
          }
        });
        
        // Handle module responses
        socket.on('message-processed', (data) => {
          const { messageId, output, processingTime } = data;
          
          module.lastSeen = Date.now();
          module.status = 'online';
          module.processingMessageId = null;
          module.lastResponse = {
            messageId,
            timestamp: Date.now(),
            processingTime
          };
          
          // Remove from queue
          module.queue = module.queue.filter(m => m.id !== messageId);
          
          console.log(`[MODULE] ${module.name} processed ${messageId?.slice(0,8)} in ${processingTime}ms: ${output?.type || 'unknown'}`);
          
          // Archive logging
          logEvent('module_response', {
            moduleId,
            moduleName: module.name,
            messageId,
            outputType: output?.type,
            processingTime,
            queueDepth: module.queue.length
          });
          
          // Progress: processing → rendering → complete
          // Find original submission ID from routed message
          const routedMsg = state.routed.find(r => r.id === messageId);
          const originalId = routedMsg ? routedMsg.messageId : messageId;
          advanceProgress(originalId, 5); // processing done
          advanceProgress(originalId, 7); // rendering → complete (will chain with min delays)
          
          // Forward to display
          io.to('display').emit('module-output', {
            moduleId,
            messageId,
            output
          });
        });
        
        // Handle module errors
        socket.on('processing-error', (data) => {
          const { messageId, error } = data;
          module.lastSeen = Date.now();
          module.processingMessageId = null;
          
          console.log(`[MODULE ERROR] ${module.name}: ${error}`);
          
          logEvent('module_error', {
            moduleId,
            moduleName: module.name,
            messageId,
            error
          });
          
          // Remove from queue
          module.queue = module.queue.filter(m => m.id !== messageId);
          
          // Could implement retry logic here
        });
        
        break;
        
      case 'public_client':
      case 'audience':
        socket.join('audience');
        break;
        
      default:
        // Silently ignore unknown roles to avoid log spam
    }
  });
  
  socket.on('disconnect', () => {
    // Clean up modules on disconnect
    for (const [moduleId, module] of state.modules.entries()) {
      if (module.socket.id === socket.id) {
        module.status = 'offline';
        
        logEvent('module_disconnect', {
          moduleId,
          moduleName: module.name,
          queueDepth: module.queue.length
        });
        
        console.log(`[WS] Module disconnected: ${module.name} (queue: ${module.queue.length})`);
        
        // Notify displays and moderators
        io.to('display').emit('module-status', {
          moduleId,
          name: module.name,
          status: 'offline'
        });
        
        io.to('moderators').emit('module-disconnected', {
          moduleId,
          name: module.name
        });
        
        break;
      }
    }
    
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// ============ MODULE HEARTBEAT SYSTEM ============

function startHeartbeatSystem() {
  setInterval(() => {
    const now = Date.now();
    
    for (const [moduleId, module] of state.modules.entries()) {
      const timeSinceLastSeen = now - module.lastSeen;
      
      if (module.isVirtual) continue; // Virtual modules don't heartbeat
      if (timeSinceLastSeen > MODULE_TIMEOUT && module.status !== 'offline') {
        console.log(`[HEARTBEAT] Module ${module.name} appears offline (last seen ${Math.round(timeSinceLastSeen/1000)}s ago)`);
        module.status = 'offline';
        
        // Notify displays
        io.to('display').emit('module-status', {
          moduleId,
          name: module.name,
          status: 'offline',
          lastSeen: module.lastSeen
        });
      }
    }
  }, HEARTBEAT_INTERVAL);
}

// ============ START ============

const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();

async function startServer() {
  // Start heartbeat system
  startHeartbeatSystem();
  
  // Scan for modules on startup
  try {
    const availablePorts = await scanForModules();
    console.log(`[HUB] Module discovery complete. Found ${availablePorts.length} potential modules.`);
    
    // Log startup event
    logEvent('hub_startup', {
      port: PORT,
      modulePorts: availablePorts,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.log(`[HUB] Module discovery failed:`, error.message);
  }
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[HUB v2] Running on port ${PORT}`);
    console.log(`[HUB v2] Submission: http://localhost:${PORT}/submit`);
    console.log(`[HUB v2] Moderation: http://localhost:${PORT}/moderate`);
    console.log(`[HUB v2] Display: http://localhost:${PORT}/display`);
    console.log(`[HUB v2] History: http://localhost:${PORT}/history`);
    console.log(`[HUB v2] Test Console: http://localhost:${PORT}/test`);
    console.log(`[HUB v2] Archive: ${archiveDir}`);
    
    // Show network information for LAN access
    const lanIP = localIP !== 'localhost' ? localIP : null;
    
    if (lanIP) {
      console.log(`\n[NETWORK] LAN Access:`);
      console.log(`[NETWORK] Hub: http://${lanIP}:${PORT}`);
      console.log(`[NETWORK] Submission: http://${lanIP}:${PORT}/submit`);
      console.log(`[NETWORK] Moderation: http://${lanIP}:${PORT}/moderate`);
      console.log(`[NETWORK] Display: http://${lanIP}:${PORT}/display`);
      console.log(`[NETWORK] History: http://${lanIP}:${PORT}/history`);
      
      // Optional: Generate QR code for submission URL
      try {
        const qrcode = require('qrcode');
        const submissionURL = `http://${lanIP}:${PORT}/submit`;
        qrcode.toString(submissionURL, { type: 'terminal', small: true }, (err, qr) => {
          if (!err) {
            console.log(`\n[QR CODE] Audience Submission:`);
            console.log(qr);
            console.log(`[QR CODE] URL: ${submissionURL}\n`);
          }
        });
      } catch (e) {
        console.log(`[QR CODE] Install 'qrcode' package for QR code generation`);
      }
    }
    
    console.log(`\n[HUB v2] Ready for modules on ports: ${MODULE_PORTS.join(', ')}`);
    console.log(`[HUB v2] WebSocket heartbeat: ${HEARTBEAT_INTERVAL}ms`);
    console.log(`[HUB v2] Module timeout: ${MODULE_TIMEOUT}ms`);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[HUB] Shutting down gracefully...');
  
  logEvent('hub_shutdown', {
    timestamp: new Date().toISOString(),
    activeModules: state.modules.size,
    pendingSubmissions: state.submissions.filter(s => s.status === 'pending').length
  });
  
  // Notify all connected modules of shutdown
  io.to('modules').emit('hub-shutdown');
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

// Start the server
startServer().catch(console.error);

// Export state for debugging and testing
module.exports = { state, io, logEvent };
