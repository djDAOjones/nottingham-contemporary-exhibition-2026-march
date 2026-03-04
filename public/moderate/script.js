// Hub v2 Moderation Panel - Complete JavaScript Implementation
let socket;
let isConnected = false;

// State
let submissions = [];
let modules = new Map();
let moduleOrder = [];
let safeMode = false;
let draggedModule = null;

// UI Elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const totalSubmissions = document.getElementById('totalSubmissions');
const pendingCount = document.getElementById('pendingCount');
const approvedCount = document.getElementById('approvedCount');
const rejectedCount = document.getElementById('rejectedCount');
const queueInfo = document.getElementById('queueInfo');
const queue = document.getElementById('queue');
const emptyState = document.getElementById('emptyState');
const notification = document.getElementById('notification');
const moduleGrid = document.getElementById('moduleGrid');
const moduleStatus = document.getElementById('moduleStatus');
const localMessage = document.getElementById('localMessage');
const safeModeToggle = document.getElementById('safeModeToggle');
const safeModeContainer = document.getElementById('safeModeContainer');

// Connect to server
HubConnection.ready.then(() => {
  socket = HubConnection.connectSocket();

  socket.on('connect', () => {
    console.log('[MODERATOR] Connected to Hub v2');
    isConnected = true;
    updateStatus();
    
    // Identify as moderator
    socket.emit('identify', { role: 'moderator' });
    
    // Load initial data
    loadSubmissions();
    loadModuleStatus();
  });

  socket.on('disconnect', () => {
    console.log('[MODERATOR] Disconnected from Hub v2');
    isConnected = false;
    updateStatus();
  });

  // Handle real-time updates
  socket.on('new-submission', (submission) => {
    console.log('[MODERATOR] New submission:', submission);
    submissions.unshift(submission);
    renderQueue();
    showNotification('New submission received', 'success');
  });

  socket.on('modules-status', (data) => {
    console.log('[MODERATOR] Module status update:', data);
    updateModuleStatus(data);
  });

  socket.on('module-connected', (data) => {
    showNotification(`Module connected: ${data.name}`, 'success');
    loadModuleStatus();
  });

  socket.on('module-disconnected', (data) => {
    showNotification(`Module disconnected: ${data.name}`, 'warning');
    loadModuleStatus();
  });

  socket.on('module-timeout', (data) => {
    showNotification(`Module timeout: ${data.moduleName}`, 'error');
    loadModuleStatus();
  });
}); // end HubConnection.ready

function updateStatus() {
  if (isConnected) {
    statusDot.classList.add('connected');
    statusText.textContent = 'Hub Online';
  } else {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Hub Offline';
  }
}

async function loadSubmissions() {
  try {
    const response = await HubConnection.fetch('/api/submissions');
    if (response.ok) {
      submissions = await response.json();
      await loadStats();
      renderQueue();
    }
  } catch (error) {
    console.error('[MODERATOR] Failed to load submissions:', error);
    showNotification('Failed to load submissions', 'error');
  }
}

async function loadStats() {
  try {
    const [approved, rejected] = await Promise.all([
      HubConnection.fetch('/api/submissions/approved').then(r => r.json()),
      HubConnection.fetch('/api/rejected').then(r => r.json())
    ]);
    
    approvedCount.textContent = approved.length;
    rejectedCount.textContent = rejected.length;
    document.getElementById('rejectedCountBadge').textContent = rejected.length;
    
  } catch (error) {
    console.error('[MODERATOR] Failed to load stats:', error);
  }
}

async function loadModuleStatus() {
  try {
    const response = await HubConnection.fetch('/api/modules/status');
    if (response.ok) {
      const data = await response.json();
      updateModuleStatus(data);
    }
  } catch (error) {
    console.error('[MODERATOR] Failed to load module status:', error);
  }
}

function updateModuleStatus(data) {
  modules.clear();
  data.modules.forEach(module => {
    modules.set(module.id, module);
  });
  
  moduleOrder = data.moduleOrder || [];
  safeMode = data.safeMode || false;
  
  renderModuleGrid();
  renderModuleStatus();
  updateSafeModeUI();
  updateSystemInfo();
}

function renderModuleGrid() {
  moduleGrid.innerHTML = '';
  
  // Create 3x3 grid (9 slots)
  for (let i = 0; i < 9; i++) {
    const slot = document.createElement('div');
    slot.className = 'module-slot';
    slot.dataset.position = i;
    
    // Center position (index 4)
    if (i === 4) {
      slot.classList.add('center');
      slot.innerHTML = `
        <div class="module-info">
          <div class="module-name">Incoming Messages</div>
          <div class="empty-slot">Center Display</div>
        </div>
      `;
    } else {
      // Find module for this position
      let moduleId = null;
      if (moduleOrder.length > 0) {
        const gridIndex = i < 4 ? i : i - 1; // Skip center position
        moduleId = moduleOrder[gridIndex];
      }
      
      const module = moduleId ? modules.get(moduleId) : null;
      
      if (module) {
        slot.classList.add('filled');
        slot.draggable = true;
        slot.dataset.moduleId = moduleId;
        
        const lastSeen = module.lastSeen ? 
          `${Math.round((Date.now() - module.lastSeen) / 1000)}s ago` : 'Never';
        
        slot.innerHTML = `
          <div class="module-actions">
            <button class="module-btn" onclick="retryModule('${moduleId}')" title="Retry">↻</button>
            <button class="module-btn" onclick="clearQueue('${moduleId}')" title="Clear Queue">✕</button>
          </div>
          <div class="module-info">
            <div class="module-name">${module.name}</div>
            <div class="module-status ${module.status}">${module.status.toUpperCase()}</div>
            <div class="module-stats">
              <span>Q: ${module.queueDepth || 0}</span>
              <span>${lastSeen}</span>
            </div>
          </div>
        `;
        
        // Drag and drop handlers
        slot.addEventListener('dragstart', handleDragStart);
        slot.addEventListener('dragend', handleDragEnd);
      } else {
        slot.innerHTML = `
          <div class="empty-slot">Empty Slot</div>
        `;
      }
      
      // Drop handlers for all non-center slots
      slot.addEventListener('dragover', handleDragOver);
      slot.addEventListener('drop', handleDrop);
    }
    
    moduleGrid.appendChild(slot);
  }
}

function renderModuleStatus() {
  if (modules.size === 0) {
    moduleStatus.innerHTML = '<div class="empty-state">No modules detected</div>';
    return;
  }
  
  let html = '';
  modules.forEach(module => {
    const statusColor = {
      online: '#10b981',
      offline: '#ef4444',
      processing: '#f59e0b',
      timeout: '#8b5cf6'
    }[module.status] || '#666';
    
    html += `
      <div style="margin-bottom: 12px; padding: 8px; background: #1a1a1a; border-radius: 6px; border: 1px solid #333;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong>${module.name}</strong>
          <span style="color: ${statusColor}; font-size: 0.8rem;">${module.status}</span>
        </div>
        <div style="font-size: 0.75rem; color: #888; margin-top: 4px;">
          Queue: ${module.queueDepth || 0} | 
          Port: ${module.port || 'Unknown'}
        </div>
      </div>
    `;
  });
  
  moduleStatus.innerHTML = html;
}

function updateSystemInfo() {
  document.getElementById('activeModules').textContent = 
    Array.from(modules.values()).filter(m => m.status === 'online').length;
  
  const totalQueue = Array.from(modules.values())
    .reduce((sum, m) => sum + (m.queueDepth || 0), 0);
  document.getElementById('totalQueueDepth').textContent = totalQueue;
}

function updateSafeModeUI() {
  if (safeMode) {
    safeModeToggle.classList.add('active');
    safeModeContainer.classList.add('active');
  } else {
    safeModeToggle.classList.remove('active');
    safeModeContainer.classList.remove('active');
  }
}

function renderQueue() {
  // Update stats
  totalSubmissions.textContent = submissions.length;
  const pending = submissions.filter(s => s.status === 'pending');
  pendingCount.textContent = pending.length;
  
  // Show/hide empty state
  if (pending.length === 0) {
    emptyState.style.display = 'block';
    queueInfo.textContent = 'No pending submissions';
    return;
  } else {
    emptyState.style.display = 'none';
    queueInfo.textContent = `${pending.length} pending submission${pending.length === 1 ? '' : 's'}`;
  }
  
  // Clear and populate queue
  queue.innerHTML = '';
  
  pending.forEach(submission => {
    const submissionEl = createSubmissionElement(submission);
    queue.appendChild(submissionEl);
  });
}

function createSubmissionElement(submission) {
  const div = document.createElement('div');
  div.className = 'submission';
  div.dataset.id = submission.id;
  
  const timeStr = new Date(submission.timestamp).toLocaleTimeString();
  const source = submission.source === 'local-fallback' ? ' (Local)' : '';
  
  div.innerHTML = `
    <div class="submission-header">
      <span class="submission-id">${submission.id.slice(0, 8)}${source}</span>
      <span class="submission-time">${timeStr}</span>
    </div>
    <div class="submission-message">${escapeHtml(submission.message)}</div>
    <div class="submission-actions">
      <button class="btn warning" onclick="toggleEdit('${submission.id}')">✏️ Edit</button>
      <button class="btn success" onclick="approveSubmission('${submission.id}')">✅ Approve</button>
      <button class="btn danger" onclick="toggleReject('${submission.id}')">❌ Reject</button>
    </div>
    
    <div class="edit-form" id="edit-${submission.id}">
      <textarea class="input textarea" id="textarea-${submission.id}">${escapeHtml(submission.message)}</textarea>
      <div class="edit-actions">
        <button class="btn" onclick="toggleEdit('${submission.id}')">Cancel</button>
        <button class="btn success" onclick="saveEdit('${submission.id}')">Save & Approve</button>
      </div>
    </div>
    
    <div class="rejection-form" id="reject-${submission.id}">
      <textarea class="input" id="reason-${submission.id}" placeholder="Rejection reason (optional)..."></textarea>
      <div class="edit-actions">
        <button class="btn" onclick="toggleReject('${submission.id}')">Cancel</button>
        <button class="btn danger" onclick="rejectSubmission('${submission.id}')">Confirm Reject</button>
      </div>
    </div>
  `;
  
  return div;
}

// Drag and Drop Handlers
function handleDragStart(e) {
  draggedModule = {
    id: e.target.dataset.moduleId,
    element: e.target
  };
  e.target.style.opacity = '0.5';
}

function handleDragEnd(e) {
  e.target.style.opacity = '1';
  draggedModule = null;
  
  // Remove all drag-over classes
  document.querySelectorAll('.module-slot').forEach(slot => {
    slot.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  e.preventDefault();
  if (!draggedModule) return;
  
  const slot = e.currentTarget;
  if (!slot.classList.contains('center')) {
    slot.classList.add('drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  if (!draggedModule) return;
  
  const targetSlot = e.currentTarget;
  if (targetSlot.classList.contains('center')) return;
  
  const targetPosition = parseInt(targetSlot.dataset.position);
  const gridIndex = targetPosition < 4 ? targetPosition : targetPosition - 1;
  
  // Update module order
  const newOrder = [...moduleOrder];
  const draggedIndex = newOrder.indexOf(draggedModule.id);
  
  if (draggedIndex !== -1) {
    newOrder.splice(draggedIndex, 1);
  }
  
  // Insert at new position
  if (gridIndex < newOrder.length) {
    newOrder.splice(gridIndex, 0, draggedModule.id);
  } else {
    newOrder.push(draggedModule.id);
  }
  
  // Send to server
  updateModuleOrder(newOrder);
}

async function updateModuleOrder(newOrder) {
  try {
    const response = await HubConnection.fetch('/api/modules/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newOrder })
    });
    
    if (response.ok) {
      moduleOrder = newOrder;
      renderModuleGrid();
      showNotification('Module order updated', 'success');
    } else {
      showNotification('Failed to update module order', 'error');
    }
  } catch (error) {
    console.error('[MODERATOR] Failed to update module order:', error);
    showNotification('Failed to update module order', 'error');
  }
}

// Form Handlers
function toggleEdit(submissionId) {
  const form = document.getElementById(`edit-${submissionId}`);
  form.classList.toggle('active');
  
  // Close reject form if open
  const rejectForm = document.getElementById(`reject-${submissionId}`);
  rejectForm.classList.remove('active');
}

function toggleReject(submissionId) {
  const form = document.getElementById(`reject-${submissionId}`);
  form.classList.toggle('active');
  
  // Close edit form if open
  const editForm = document.getElementById(`edit-${submissionId}`);
  editForm.classList.remove('active');
}

function saveEdit(submissionId) {
  const textarea = document.getElementById(`textarea-${submissionId}`);
  const newMessage = textarea.value.trim();
  
  if (!newMessage) {
    showNotification('Message cannot be empty', 'error');
    return;
  }
  
  moderateSubmission(submissionId, 'approve', { editedMessage: newMessage });
}

function approveSubmission(submissionId) {
  moderateSubmission(submissionId, 'approve');
}

function rejectSubmission(submissionId) {
  const reasonField = document.getElementById(`reason-${submissionId}`);
  const reason = reasonField.value.trim();
  
  moderateSubmission(submissionId, 'reject', { reason });
}

async function moderateSubmission(submissionId, action, options = {}) {
  try {
    const body = { submissionId, action, ...options };
    
    const response = await HubConnection.fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (response.ok) {
      // Remove from local state
      submissions = submissions.filter(s => s.id !== submissionId);
      renderQueue();
      loadStats();
      
      const actionText = action === 'approve' ? 'approved' : 'rejected';
      showNotification(`Submission ${actionText}`, 'success');
    } else {
      const error = await response.text();
      showNotification(`Failed to ${action}: ${error}`, 'error');
    }
  } catch (error) {
    console.error(`[MODERATOR] Failed to ${action}:`, error);
    showNotification(`Failed to ${action} submission`, 'error');
  }
}

// Module Actions
async function retryModule(moduleId) {
  try {
    const response = await HubConnection.fetch('/api/modules/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId })
    });
    
    if (response.ok) {
      const result = await response.json();
      showNotification(`Retried ${result.retriedCount} messages`, 'success');
      loadModuleStatus();
    } else {
      showNotification('Failed to retry module', 'error');
    }
  } catch (error) {
    console.error('[MODERATOR] Failed to retry module:', error);
    showNotification('Failed to retry module', 'error');
  }
}

async function clearQueue(moduleId) {
  if (!confirm('Clear all queued messages for this module?')) return;
  
  try {
    const response = await HubConnection.fetch('/api/modules/clear-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId })
    });
    
    if (response.ok) {
      const result = await response.json();
      showNotification(`Cleared ${result.clearedCount} messages`, 'success');
      loadModuleStatus();
    } else {
      showNotification('Failed to clear queue', 'error');
    }
  } catch (error) {
    console.error('[MODERATOR] Failed to clear queue:', error);
    showNotification('Failed to clear queue', 'error');
  }
}

async function toggleSafeMode() {
  try {
    const response = await HubConnection.fetch('/api/config/safe-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !safeMode })
    });
    
    if (response.ok) {
      const result = await response.json();
      safeMode = result.safeMode;
      updateSafeModeUI();
      showNotification(`Safe mode ${safeMode ? 'enabled' : 'disabled'}`, 'success');
    } else {
      showNotification('Failed to toggle safe mode', 'error');
    }
  } catch (error) {
    console.error('[MODERATOR] Failed to toggle safe mode:', error);
    showNotification('Failed to toggle safe mode', 'error');
  }
}

async function submitLocal() {
  const message = localMessage.value.trim();
  if (!message) {
    showNotification('Please enter a message', 'error');
    return;
  }
  
  try {
    const response = await HubConnection.fetch('/api/local-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    
    if (response.ok) {
      localMessage.value = '';
      showNotification('Local submission sent', 'success');
      loadSubmissions();
    } else {
      const error = await response.json();
      showNotification(`Failed to submit: ${error.error}`, 'error');
    }
  } catch (error) {
    console.error('[MODERATOR] Failed to submit locally:', error);
    showNotification('Failed to submit locally', 'error');
  }
}

function refreshModules() {
  loadModuleStatus();
  showNotification('Refreshing modules...', 'success');
}

function toggleArchive() {
  window.open('/api/archive', '_blank');
}

function showRejected() {
  // Could implement a modal or new page for rejected messages
  window.open('/api/rejected', '_blank');
}

function showNotification(message, type = 'success') {
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 'r':
        e.preventDefault();
        loadSubmissions();
        loadModuleStatus();
        break;
      case 'l':
        e.preventDefault();
        localMessage.focus();
        break;
    }
  }
});

// Auto-refresh every 30 seconds
setInterval(() => {
  if (isConnected) {
    loadModuleStatus();
  }
}, 30000);

// ---- DISCONNECTED FALLBACK ----

function showDisconnectedGrid() {
  console.log('[MODERATOR] Hub not reachable — showing disconnected state');
  moduleGrid.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const slot = document.createElement('div');
    slot.className = 'module-slot' + (i === 4 ? ' center' : '');
    if (i === 4) {
      slot.innerHTML = '<div class="empty-slot" style="color:#888;">Hub not connected</div>';
    } else {
      slot.innerHTML = '<div class="empty-slot">—</div>';
    }
    moduleGrid.appendChild(slot);
  }
  moduleStatus.innerHTML = '<div class="empty-state">Unable to reach Hub</div>';
}

// Initialize on load
window.addEventListener('load', () => {
  loadSubmissions();
  loadModuleStatus();

  // If not connected after 8s, show disconnected grid
  setTimeout(() => {
    if (!isConnected && modules.size === 0) showDisconnectedGrid();
  }, 8000);
});
