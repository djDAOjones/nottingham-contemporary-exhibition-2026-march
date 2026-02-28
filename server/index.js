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
    origin: process.env.VERCEL_URL || "*",
    methods: ["GET", "POST"]
  }
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
    safeMode: false      // Skip offline modules
  }
};

// Rate limit tracking: sessionId -> lastSubmitTime
const rateLimits = new Map();

// Module discovery and management
const discoveredModules = new Map();

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

// ============ SOCKET.IO ============

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  
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
        
      default:
        console.log(`[WS] Unknown role: ${role}`);
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
    console.log(`[HUB v2] Archive: ${archiveDir}`);
    
    // Show network information for LAN access
    const networkInterfaces = require('os').networkInterfaces();
    const lanIP = Object.values(networkInterfaces)
      .flat()
      .find(i => i.family === 'IPv4' && !i.internal && i.address.startsWith('192.168.'))
      ?.address;
    
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
