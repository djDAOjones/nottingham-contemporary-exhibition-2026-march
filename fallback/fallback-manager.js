// Fallback Manager - Handles system failures and provides graceful degradation
// Ensures exhibition continues operating even when components fail

const EventEmitter = require('events');

class FallbackManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 5000, // 5 seconds
      queueMaxSize: config.queueMaxSize || 1000,
      safeMode: config.safeMode || false,
      fallbackTimeout: config.fallbackTimeout || 30000, // 30 seconds
      heartbeatInterval: config.heartbeatInterval || 15000, // 15 seconds
      ...config
    };
    
    // System state tracking
    this.systemStatus = {
      safeMode: false,
      moduleStatus: new Map(),
      failedOperations: 0,
      totalOperations: 0,
      lastHealthCheck: Date.now()
    };
    
    // Retry queue for failed operations
    this.retryQueue = {
      items: [],
      processing: false,
      maxSize: this.config.queueMaxSize
    };
    
    // Offline placeholders
    this.offlinePlaceholders = new Map();
    
    // Circuit breakers for modules
    this.circuitBreakers = new Map();
    
    // Health monitoring
    this.healthMonitor = {
      checks: new Map(),
      interval: null,
      thresholds: {
        errorRate: 0.5, // 50% error rate triggers safe mode
        responseTime: 10000, // 10 second response time limit
        consecutiveFailures: 5
      }
    };
    
    console.log('[FallbackManager] Initialized with retry queue and safe mode capabilities');
  }

  // Initialize fallback system
  async initialize() {
    try {
      console.log('[FallbackManager] Initializing fallback systems...');
      
      // Setup health monitoring
      this.startHealthMonitoring();
      
      // Initialize offline placeholders
      this.initializeOfflinePlaceholders();
      
      // Setup circuit breakers
      this.initializeCircuitBreakers();
      
      // Start retry queue processor
      this.startRetryProcessor();
      
      console.log('[FallbackManager] Fallback systems ready');
      this.emit('initialized');
      
    } catch (error) {
      console.error('[FallbackManager] Initialization failed:', error);
      throw error;
    }
  }

  // Register a module for monitoring
  registerModule(moduleId, config = {}) {
    const moduleConfig = {
      name: config.name || moduleId,
      critical: config.critical || false,
      timeout: config.timeout || this.config.fallbackTimeout,
      maxFailures: config.maxFailures || 5,
      fallbackResponse: config.fallbackResponse || null,
      ...config
    };
    
    this.systemStatus.moduleStatus.set(moduleId, {
      status: 'unknown',
      lastSeen: 0,
      consecutiveFailures: 0,
      totalRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      config: moduleConfig
    });
    
    // Initialize circuit breaker
    this.circuitBreakers.set(moduleId, {
      state: 'closed', // closed, open, half-open
      failures: 0,
      lastFailureTime: 0,
      nextRetryTime: 0,
      successCount: 0
    });
    
    console.log(`[FallbackManager] Registered module: ${moduleId}`);
  }

  // Update module status
  updateModuleStatus(moduleId, status, responseTime = 0) {
    if (!this.systemStatus.moduleStatus.has(moduleId)) {
      this.registerModule(moduleId);
    }
    
    const moduleStatus = this.systemStatus.moduleStatus.get(moduleId);
    const circuitBreaker = this.circuitBreakers.get(moduleId);
    
    moduleStatus.lastSeen = Date.now();
    moduleStatus.totalRequests++;
    
    // Update response time
    if (responseTime > 0) {
      moduleStatus.avgResponseTime = 
        (moduleStatus.avgResponseTime * 0.8) + (responseTime * 0.2);
    }
    
    if (status === 'online' || status === 'success') {
      moduleStatus.status = 'online';
      moduleStatus.consecutiveFailures = 0;
      
      // Reset circuit breaker on success
      if (circuitBreaker.state === 'half-open') {
        circuitBreaker.successCount++;
        if (circuitBreaker.successCount >= 3) {
          circuitBreaker.state = 'closed';
          circuitBreaker.failures = 0;
          console.log(`[FallbackManager] Circuit breaker closed for ${moduleId}`);
        }
      }
      
    } else {
      moduleStatus.status = 'offline';
      moduleStatus.consecutiveFailures++;
      moduleStatus.failedRequests++;
      
      // Update circuit breaker
      circuitBreaker.failures++;
      circuitBreaker.lastFailureTime = Date.now();
      
      if (circuitBreaker.failures >= 5 && circuitBreaker.state === 'closed') {
        circuitBreaker.state = 'open';
        circuitBreaker.nextRetryTime = Date.now() + (this.config.retryDelay * 2);
        console.log(`[FallbackManager] Circuit breaker opened for ${moduleId}`);
        this.emit('circuit-breaker-open', { moduleId });
      }
    }
    
    this.emit('module-status-updated', { moduleId, status: moduleStatus });
    this.checkSystemHealth();
  }

  // Check if module is available via circuit breaker
  isModuleAvailable(moduleId) {
    const circuitBreaker = this.circuitBreakers.get(moduleId);
    if (!circuitBreaker) return true;
    
    const now = Date.now();
    
    switch (circuitBreaker.state) {
      case 'closed':
        return true;
        
      case 'open':
        if (now >= circuitBreaker.nextRetryTime) {
          circuitBreaker.state = 'half-open';
          circuitBreaker.successCount = 0;
          console.log(`[FallbackManager] Circuit breaker half-open for ${moduleId}`);
          return true;
        }
        return false;
        
      case 'half-open':
        return true;
        
      default:
        return true;
    }
  }

  // Add operation to retry queue
  addToRetryQueue(operation) {
    if (this.retryQueue.items.length >= this.retryQueue.maxSize) {
      console.warn('[FallbackManager] Retry queue full, dropping oldest operation');
      this.retryQueue.items.shift();
    }
    
    const queueItem = {
      id: `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation: operation,
      attempts: 0,
      maxAttempts: this.config.retryAttempts,
      nextRetry: Date.now() + this.config.retryDelay,
      priority: operation.priority || 'normal',
      createdAt: Date.now()
    };
    
    // Insert based on priority
    if (queueItem.priority === 'high') {
      this.retryQueue.items.unshift(queueItem);
    } else {
      this.retryQueue.items.push(queueItem);
    }
    
    console.log(`[FallbackManager] Added operation to retry queue: ${queueItem.id}`);
    this.emit('retry-queued', queueItem);
  }

  // Process retry queue
  async processRetryQueue() {
    if (this.retryQueue.processing || this.retryQueue.items.length === 0) {
      return;
    }
    
    this.retryQueue.processing = true;
    
    try {
      const now = Date.now();
      const readyItems = this.retryQueue.items.filter(item => item.nextRetry <= now);
      
      for (const item of readyItems.slice(0, 5)) { // Process max 5 items per cycle
        await this.processRetryItem(item);
      }
      
    } catch (error) {
      console.error('[FallbackManager] Error processing retry queue:', error);
    } finally {
      this.retryQueue.processing = false;
    }
  }

  // Process individual retry item
  async processRetryItem(item) {
    try {
      console.log(`[FallbackManager] Retrying operation: ${item.id}, attempt ${item.attempts + 1}`);
      
      item.attempts++;
      
      // Execute the retry operation
      const result = await this.executeRetryOperation(item.operation);
      
      if (result.success) {
        // Success - remove from queue
        this.retryQueue.items = this.retryQueue.items.filter(i => i.id !== item.id);
        console.log(`[FallbackManager] Retry successful: ${item.id}`);
        this.emit('retry-success', { item, result });
        
      } else {
        // Failed - check if we should retry again
        if (item.attempts >= item.maxAttempts) {
          // Max attempts reached
          this.retryQueue.items = this.retryQueue.items.filter(i => i.id !== item.id);
          console.log(`[FallbackManager] Retry failed permanently: ${item.id}`);
          this.emit('retry-failed', { item, result });
          
          // Use fallback if available
          await this.useFallbackResponse(item.operation);
          
        } else {
          // Schedule next retry
          item.nextRetry = Date.now() + (this.config.retryDelay * Math.pow(2, item.attempts));
          console.log(`[FallbackManager] Retry failed, will retry again: ${item.id}`);
        }
      }
      
    } catch (error) {
      console.error(`[FallbackManager] Error retrying operation ${item.id}:`, error);
      
      // Schedule next retry if attempts remaining
      if (item.attempts < item.maxAttempts) {
        item.nextRetry = Date.now() + (this.config.retryDelay * Math.pow(2, item.attempts));
      } else {
        // Remove from queue
        this.retryQueue.items = this.retryQueue.items.filter(i => i.id !== item.id);
        this.emit('retry-failed', { item, error });
      }
    }
  }

  // Execute retry operation
  async executeRetryOperation(operation) {
    try {
      switch (operation.type) {
        case 'module-message':
          return await this.retryModuleMessage(operation);
        case 'submission':
          return await this.retrySubmission(operation);
        case 'hub-communication':
          return await this.retryHubCommunication(operation);
        default:
          throw new Error(`Unknown retry operation type: ${operation.type}`);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Retry module message
  async retryModuleMessage(operation) {
    const { moduleId, message, socket } = operation.data;
    
    if (!this.isModuleAvailable(moduleId)) {
      return { success: false, error: 'Module circuit breaker open' };
    }
    
    try {
      // Attempt to send message to module
      if (socket && socket.connected) {
        socket.emit('process-message', message);
        return { success: true };
      } else {
        return { success: false, error: 'Socket not connected' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Retry submission
  async retrySubmission(operation) {
    const { submission } = operation.data;
    
    try {
      // Attempt to process submission again
      // This would integrate with your main submission processing logic
      console.log(`[FallbackManager] Retrying submission: ${submission.id}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Retry hub communication
  async retryHubCommunication(operation) {
    const { endpoint, data } = operation.data;
    
    try {
      // Attempt hub communication
      console.log(`[FallbackManager] Retrying hub communication: ${endpoint}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Initialize offline placeholders
  initializeOfflinePlaceholders() {
    // Terminal Critic fallback
    this.offlinePlaceholders.set('terminal-critic', {
      type: 'content_analysis',
      content: '📝 **Content Review**\n\n*Analysis temporarily unavailable*\n\nYour submission has been received and will be processed when the content analysis system comes back online.',
      data: {
        analysis: 'offline',
        scores: { overall: 0.5, sentiment: 0.0 },
        suggestions: ['Content analysis system offline', 'Your submission is queued for processing']
      },
      metadata: {
        analyzer: 'Offline Placeholder',
        confidence: 0,
        processingTime: 0
      }
    });
    
    // Music Prompt LLM fallback
    this.offlinePlaceholders.set('music-prompt-llm', {
      type: 'musical_analysis',
      content: '🎵 **Musical Interpretation**\n\n*Music analysis temporarily unavailable*\n\nYour text will be analyzed for musical qualities when the system returns.',
      data: {
        key: 'C_major',
        keyData: { mood: 'neutral', confidence: 0 },
        mode: 'ionian',
        tempo: { bpm: 120, category: 'moderate' },
        offline: true
      },
      metadata: {
        analyzer: 'Music Offline Placeholder',
        confidence: 0
      }
    });
    
    // Generic module fallback
    this.offlinePlaceholders.set('generic', {
      type: 'system_message',
      content: '⚠️ **Service Temporarily Unavailable**\n\nThis creative module is currently offline. Your submission has been saved and will be processed when the service returns.',
      data: {
        offline: true,
        queuedForProcessing: true
      },
      metadata: {
        source: 'Fallback System',
        timestamp: Date.now()
      }
    });
    
    console.log('[FallbackManager] Offline placeholders initialized');
  }

  // Get fallback response for module
  getFallbackResponse(moduleId, originalMessage = null) {
    let placeholder = this.offlinePlaceholders.get(moduleId) || 
                     this.offlinePlaceholders.get('generic');
    
    // Customize placeholder with original message info if available
    if (originalMessage) {
      placeholder = {
        ...placeholder,
        metadata: {
          ...placeholder.metadata,
          originalMessageId: originalMessage.id,
          timestamp: Date.now(),
          fallbackReason: 'Module offline'
        }
      };
    }
    
    return placeholder;
  }

  // Use fallback response
  async useFallbackResponse(operation) {
    try {
      const fallbackResponse = this.getFallbackResponse(
        operation.data.moduleId, 
        operation.data.message
      );
      
      console.log(`[FallbackManager] Using fallback response for ${operation.data.moduleId}`);
      
      // Emit fallback response as if it came from the module
      this.emit('fallback-response', {
        moduleId: operation.data.moduleId,
        messageId: operation.data.message?.id,
        output: fallbackResponse,
        fallback: true
      });
      
    } catch (error) {
      console.error('[FallbackManager] Error using fallback response:', error);
    }
  }

  // Initialize circuit breakers
  initializeCircuitBreakers() {
    // Circuit breakers are initialized when modules are registered
    console.log('[FallbackManager] Circuit breaker system ready');
  }

  // Start health monitoring
  startHealthMonitoring() {
    this.healthMonitor.interval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.heartbeatInterval);
    
    console.log('[FallbackManager] Health monitoring started');
  }

  // Perform health check
  performHealthCheck() {
    const now = Date.now();
    let criticalModulesOffline = 0;
    let totalModules = this.systemStatus.moduleStatus.size;
    
    // Check each module
    for (const [moduleId, status] of this.systemStatus.moduleStatus) {
      const timeSinceLastSeen = now - status.lastSeen;
      const isStale = timeSinceLastSeen > (this.config.heartbeatInterval * 2);
      
      if (isStale && status.status === 'online') {
        this.updateModuleStatus(moduleId, 'timeout');
      }
      
      if (status.config.critical && status.status !== 'online') {
        criticalModulesOffline++;
      }
      
      // Calculate error rate
      const errorRate = status.totalRequests > 0 ? 
        status.failedRequests / status.totalRequests : 0;
      
      if (errorRate > this.healthMonitor.thresholds.errorRate) {
        console.warn(`[FallbackManager] High error rate for ${moduleId}: ${(errorRate * 100).toFixed(1)}%`);
      }
    }
    
    // Check if we should enter safe mode
    const shouldEnterSafeMode = 
      (criticalModulesOffline > 0) ||
      (totalModules > 0 && criticalModulesOffline / totalModules > 0.5);
    
    if (shouldEnterSafeMode && !this.systemStatus.safeMode) {
      this.enterSafeMode('Critical modules offline');
    } else if (!shouldEnterSafeMode && this.systemStatus.safeMode) {
      this.exitSafeMode('System health restored');
    }
    
    this.systemStatus.lastHealthCheck = now;
    this.emit('health-check', {
      totalModules,
      criticalModulesOffline,
      safeMode: this.systemStatus.safeMode
    });
  }

  // Check system health and decide on safe mode
  checkSystemHealth() {
    const totalOperations = this.systemStatus.totalOperations;
    const failedOperations = this.systemStatus.failedOperations;
    
    if (totalOperations > 10) {
      const errorRate = failedOperations / totalOperations;
      
      if (errorRate > this.healthMonitor.thresholds.errorRate && !this.systemStatus.safeMode) {
        this.enterSafeMode('High system error rate');
      }
    }
  }

  // Enter safe mode
  enterSafeMode(reason) {
    if (this.systemStatus.safeMode) return;
    
    this.systemStatus.safeMode = true;
    console.warn(`[FallbackManager] ENTERING SAFE MODE: ${reason}`);
    
    this.emit('safe-mode-entered', { reason, timestamp: Date.now() });
    
    // In safe mode, we use more fallbacks and disable non-essential features
    this.config.retryAttempts = Math.max(1, this.config.retryAttempts - 1);
    this.config.retryDelay = this.config.retryDelay * 1.5;
  }

  // Exit safe mode
  exitSafeMode(reason) {
    if (!this.systemStatus.safeMode) return;
    
    this.systemStatus.safeMode = false;
    console.log(`[FallbackManager] EXITING SAFE MODE: ${reason}`);
    
    this.emit('safe-mode-exited', { reason, timestamp: Date.now() });
    
    // Restore normal operation parameters
    this.config.retryAttempts = this.config.retryAttempts || 3;
    this.config.retryDelay = this.config.retryDelay || 5000;
  }

  // Start retry queue processor
  startRetryProcessor() {
    setInterval(() => {
      this.processRetryQueue();
    }, this.config.retryDelay / 2);
    
    console.log('[FallbackManager] Retry queue processor started');
  }

  // Record operation result
  recordOperation(success) {
    this.systemStatus.totalOperations++;
    if (!success) {
      this.systemStatus.failedOperations++;
    }
  }

  // Get system status
  getSystemStatus() {
    const moduleStatusArray = Array.from(this.systemStatus.moduleStatus.entries()).map(([id, status]) => ({
      id,
      ...status,
      circuitBreakerState: this.circuitBreakers.get(id)?.state || 'unknown'
    }));
    
    return {
      safeMode: this.systemStatus.safeMode,
      modules: moduleStatusArray,
      retryQueue: {
        size: this.retryQueue.items.length,
        processing: this.retryQueue.processing
      },
      healthCheck: {
        lastCheck: this.systemStatus.lastHealthCheck,
        totalOperations: this.systemStatus.totalOperations,
        failedOperations: this.systemStatus.failedOperations,
        errorRate: this.systemStatus.totalOperations > 0 ? 
          this.systemStatus.failedOperations / this.systemStatus.totalOperations : 0
      }
    };
  }

  // Shutdown fallback manager
  async shutdown() {
    console.log('[FallbackManager] Shutting down...');
    
    // Clear intervals
    if (this.healthMonitor.interval) {
      clearInterval(this.healthMonitor.interval);
    }
    
    // Process remaining retry queue items
    await this.processRetryQueue();
    
    this.emit('shutdown');
    console.log('[FallbackManager] Shutdown complete');
  }
}

module.exports = FallbackManager;
