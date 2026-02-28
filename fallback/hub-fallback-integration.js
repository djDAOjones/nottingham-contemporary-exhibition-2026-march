// Hub Fallback Integration - Integrates FallbackManager with Hub v2
// Provides automatic failure detection, retry queues, and graceful degradation

const FallbackManager = require('./fallback-manager');

class HubFallbackIntegration {
  constructor(hubServer, config = {}) {
    this.hubServer = hubServer;
    this.config = {
      enableSafeMode: config.enableSafeMode !== false,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 5000,
      fallbackTimeout: config.fallbackTimeout || 30000,
      ...config
    };
    
    this.fallbackManager = new FallbackManager(this.config);
    this.originalMethods = new Map();
    this.isInitialized = false;
    
    console.log('[HubFallbackIntegration] Initialized with Hub v2 server');
  }

  // Initialize fallback integration
  async initialize() {
    try {
      console.log('[HubFallbackIntegration] Integrating fallback systems with Hub v2...');
      
      // Initialize fallback manager
      await this.fallbackManager.initialize();
      
      // Hook into Hub server events
      this.setupHubEventHandlers();
      
      // Wrap critical Hub methods
      this.wrapHubMethods();
      
      // Register known modules
      this.registerKnownModules();
      
      // Setup fallback event handlers
      this.setupFallbackEventHandlers();
      
      this.isInitialized = true;
      console.log('[HubFallbackIntegration] Integration complete');
      
    } catch (error) {
      console.error('[HubFallbackIntegration] Integration failed:', error);
      throw error;
    }
  }

  // Setup Hub server event handlers
  setupHubEventHandlers() {
    if (!this.hubServer) return;
    
    // Monitor module connections
    this.hubServer.on('module-connected', (moduleInfo) => {
      this.fallbackManager.registerModule(moduleInfo.moduleId, {
        name: moduleInfo.name,
        critical: this.isCriticalModule(moduleInfo.moduleId),
        timeout: 30000
      });
      
      this.fallbackManager.updateModuleStatus(moduleInfo.moduleId, 'online');
      console.log(`[HubFallbackIntegration] Registered module: ${moduleInfo.moduleId}`);
    });
    
    // Monitor module disconnections
    this.hubServer.on('module-disconnected', (moduleInfo) => {
      this.fallbackManager.updateModuleStatus(moduleInfo.moduleId, 'offline');
      console.log(`[HubFallbackIntegration] Module disconnected: ${moduleInfo.moduleId}`);
    });
    
    // Monitor message processing
    this.hubServer.on('message-processing-started', (data) => {
      const startTime = Date.now();
      this.hubServer.processingStartTimes = this.hubServer.processingStartTimes || new Map();
      this.hubServer.processingStartTimes.set(data.messageId, startTime);
    });
    
    this.hubServer.on('message-processed', (data) => {
      const startTime = this.hubServer.processingStartTimes?.get(data.messageId);
      const processingTime = startTime ? Date.now() - startTime : 0;
      
      this.fallbackManager.updateModuleStatus(data.moduleId, 'success', processingTime);
      this.fallbackManager.recordOperation(true);
      
      if (this.hubServer.processingStartTimes) {
        this.hubServer.processingStartTimes.delete(data.messageId);
      }
    });
    
    this.hubServer.on('processing-error', (data) => {
      this.fallbackManager.updateModuleStatus(data.moduleId, 'error');
      this.fallbackManager.recordOperation(false);
      
      // Add to retry queue if it's a retryable error
      if (this.isRetryableError(data.error)) {
        this.fallbackManager.addToRetryQueue({
          type: 'module-message',
          data: {
            moduleId: data.moduleId,
            message: data.message,
            socket: this.getModuleSocket(data.moduleId)
          },
          priority: this.isCriticalModule(data.moduleId) ? 'high' : 'normal'
        });
      }
    });
    
    // Monitor submission processing
    this.hubServer.on('submission-received', (submission) => {
      // Track successful submissions
      this.fallbackManager.recordOperation(true);
    });
    
    console.log('[HubFallbackIntegration] Hub event handlers configured');
  }

  // Wrap critical Hub methods with fallback logic
  wrapHubMethods() {
    if (!this.hubServer) return;
    
    // Wrap message broadcasting
    this.wrapMethod('broadcastToModules', async (originalMethod, message) => {
      const modules = this.getConnectedModules();
      const results = [];
      
      for (const moduleId of modules) {
        if (!this.fallbackManager.isModuleAvailable(moduleId)) {
          console.log(`[HubFallbackIntegration] Skipping unavailable module: ${moduleId}`);
          
          // Use fallback response immediately
          const fallbackResponse = this.fallbackManager.getFallbackResponse(moduleId, message);
          this.hubServer.emit('message-processed', {
            messageId: message.id,
            output: fallbackResponse,
            processingTime: 0,
            moduleId: moduleId,
            fallback: true
          });
          
          continue;
        }
        
        try {
          const result = await this.sendToModuleWithTimeout(moduleId, message);
          results.push(result);
        } catch (error) {
          console.error(`[HubFallbackIntegration] Failed to send to module ${moduleId}:`, error);
          
          // Add to retry queue
          this.fallbackManager.addToRetryQueue({
            type: 'module-message',
            data: {
              moduleId: moduleId,
              message: message,
              socket: this.getModuleSocket(moduleId)
            },
            priority: this.isCriticalModule(moduleId) ? 'high' : 'normal'
          });
        }
      }
      
      return results;
    });
    
    // Wrap submission processing
    this.wrapMethod('processSubmission', async (originalMethod, submission) => {
      try {
        const result = await originalMethod.call(this.hubServer, submission);
        this.fallbackManager.recordOperation(true);
        return result;
      } catch (error) {
        console.error('[HubFallbackIntegration] Submission processing failed:', error);
        this.fallbackManager.recordOperation(false);
        
        // Add to retry queue
        this.fallbackManager.addToRetryQueue({
          type: 'submission',
          data: { submission },
          priority: 'normal'
        });
        
        throw error;
      }
    });
    
    console.log('[HubFallbackIntegration] Hub methods wrapped with fallback logic');
  }

  // Wrap a method with fallback logic
  wrapMethod(methodName, wrapperFunction) {
    if (!this.hubServer[methodName]) {
      console.warn(`[HubFallbackIntegration] Method ${methodName} not found on hub server`);
      return;
    }
    
    const originalMethod = this.hubServer[methodName];
    this.originalMethods.set(methodName, originalMethod);
    
    this.hubServer[methodName] = (...args) => {
      return wrapperFunction(originalMethod, ...args);
    };
  }

  // Send message to module with timeout
  async sendToModuleWithTimeout(moduleId, message) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Module response timeout'));
      }, this.config.fallbackTimeout);
      
      try {
        const socket = this.getModuleSocket(moduleId);
        if (!socket || !socket.connected) {
          clearTimeout(timeout);
          reject(new Error('Module not connected'));
          return;
        }
        
        // Listen for response
        const responseHandler = (response) => {
          if (response.messageId === message.id) {
            clearTimeout(timeout);
            socket.off('message-processed', responseHandler);
            resolve(response);
          }
        };
        
        socket.on('message-processed', responseHandler);
        socket.emit('process-message', message);
        
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  // Register known modules with their configurations
  registerKnownModules() {
    const knownModules = [
      {
        id: 'terminal-critic',
        name: 'Terminal Critic v2',
        critical: false,
        port: 3001
      },
      {
        id: 'music-prompt-llm',
        name: 'Music Prompt LLM',
        critical: false,
        port: 3002
      },
      {
        id: 'ian-artist-module',
        name: 'Ian Generative Art',
        critical: false,
        port: 3003
      },
      {
        id: 'gravity-sketch-artist-module',
        name: 'Gravity Sketch VR',
        critical: false,
        port: 3004
      }
    ];
    
    for (const module of knownModules) {
      this.fallbackManager.registerModule(module.id, {
        name: module.name,
        critical: module.critical,
        timeout: this.config.fallbackTimeout,
        port: module.port
      });
    }
    
    console.log('[HubFallbackIntegration] Known modules registered');
  }

  // Setup fallback event handlers
  setupFallbackEventHandlers() {
    // Handle fallback responses
    this.fallbackManager.on('fallback-response', (data) => {
      console.log(`[HubFallbackIntegration] Using fallback response for ${data.moduleId}`);
      
      // Emit as if it came from the module
      this.hubServer.emit('message-processed', {
        messageId: data.messageId,
        output: data.output,
        processingTime: 0,
        moduleId: data.moduleId,
        fallback: true
      });
    });
    
    // Handle safe mode changes
    this.fallbackManager.on('safe-mode-entered', (data) => {
      console.warn(`[HubFallbackIntegration] SAFE MODE ENTERED: ${data.reason}`);
      
      // Broadcast safe mode to moderator UI
      this.hubServer.io?.to('moderators').emit('safe-mode-changed', {
        safeMode: true,
        reason: data.reason,
        timestamp: data.timestamp
      });
    });
    
    this.fallbackManager.on('safe-mode-exited', (data) => {
      console.log(`[HubFallbackIntegration] SAFE MODE EXITED: ${data.reason}`);
      
      // Broadcast safe mode exit to moderator UI
      this.hubServer.io?.to('moderators').emit('safe-mode-changed', {
        safeMode: false,
        reason: data.reason,
        timestamp: data.timestamp
      });
    });
    
    // Handle circuit breaker events
    this.fallbackManager.on('circuit-breaker-open', (data) => {
      console.warn(`[HubFallbackIntegration] Circuit breaker opened for ${data.moduleId}`);
      
      // Notify moderator UI
      this.hubServer.io?.to('moderators').emit('module-circuit-breaker', {
        moduleId: data.moduleId,
        state: 'open'
      });
    });
    
    // Handle retry events
    this.fallbackManager.on('retry-success', (data) => {
      console.log(`[HubFallbackIntegration] Retry successful: ${data.item.id}`);
    });
    
    this.fallbackManager.on('retry-failed', (data) => {
      console.error(`[HubFallbackIntegration] Retry failed permanently: ${data.item.id}`);
    });
    
    console.log('[HubFallbackIntegration] Fallback event handlers configured');
  }

  // Check if module is critical
  isCriticalModule(moduleId) {
    // Define which modules are critical for exhibition operation
    const criticalModules = ['terminal-critic']; // Add more as needed
    return criticalModules.includes(moduleId);
  }

  // Check if error is retryable
  isRetryableError(error) {
    const retryableErrors = [
      'timeout',
      'connection refused',
      'socket hang up',
      'network error',
      'temporary failure'
    ];
    
    const errorMessage = (error?.message || error || '').toLowerCase();
    return retryableErrors.some(retryable => errorMessage.includes(retryable));
  }

  // Get connected modules
  getConnectedModules() {
    if (!this.hubServer.connectedModules) {
      return [];
    }
    
    return Array.from(this.hubServer.connectedModules.keys());
  }

  // Get module socket
  getModuleSocket(moduleId) {
    if (!this.hubServer.connectedModules) {
      return null;
    }
    
    return this.hubServer.connectedModules.get(moduleId)?.socket;
  }

  // Get fallback system status
  getStatus() {
    return {
      initialized: this.isInitialized,
      fallbackManager: this.fallbackManager.getSystemStatus(),
      config: this.config
    };
  }

  // Enable/disable safe mode manually
  setSafeMode(enabled, reason = 'Manual override') {
    if (enabled) {
      this.fallbackManager.enterSafeMode(reason);
    } else {
      this.fallbackManager.exitSafeMode(reason);
    }
  }

  // Force retry of failed operations
  forceRetry() {
    console.log('[HubFallbackIntegration] Forcing retry of queued operations...');
    this.fallbackManager.processRetryQueue();
  }

  // Add custom fallback response
  addCustomFallback(moduleId, fallbackResponse) {
    this.fallbackManager.offlinePlaceholders.set(moduleId, fallbackResponse);
    console.log(`[HubFallbackIntegration] Added custom fallback for ${moduleId}`);
  }

  // Remove module from fallback system
  removeModule(moduleId) {
    this.fallbackManager.systemStatus.moduleStatus.delete(moduleId);
    this.fallbackManager.circuitBreakers.delete(moduleId);
    console.log(`[HubFallbackIntegration] Removed module from fallback system: ${moduleId}`);
  }

  // Reset module circuit breaker
  resetCircuitBreaker(moduleId) {
    const circuitBreaker = this.fallbackManager.circuitBreakers.get(moduleId);
    if (circuitBreaker) {
      circuitBreaker.state = 'closed';
      circuitBreaker.failures = 0;
      circuitBreaker.nextRetryTime = 0;
      circuitBreaker.successCount = 0;
      console.log(`[HubFallbackIntegration] Reset circuit breaker for ${moduleId}`);
    }
  }

  // Get retry queue status
  getRetryQueueStatus() {
    return {
      queueSize: this.fallbackManager.retryQueue.items.length,
      processing: this.fallbackManager.retryQueue.processing,
      items: this.fallbackManager.retryQueue.items.map(item => ({
        id: item.id,
        type: item.operation.type,
        attempts: item.attempts,
        maxAttempts: item.maxAttempts,
        nextRetry: item.nextRetry,
        priority: item.priority,
        createdAt: item.createdAt
      }))
    };
  }

  // Clear retry queue
  clearRetryQueue() {
    this.fallbackManager.retryQueue.items = [];
    console.log('[HubFallbackIntegration] Retry queue cleared');
  }

  // Shutdown fallback integration
  async shutdown() {
    try {
      console.log('[HubFallbackIntegration] Shutting down...');
      
      // Restore original methods
      for (const [methodName, originalMethod] of this.originalMethods) {
        this.hubServer[methodName] = originalMethod;
      }
      
      // Shutdown fallback manager
      await this.fallbackManager.shutdown();
      
      this.isInitialized = false;
      console.log('[HubFallbackIntegration] Shutdown complete');
      
    } catch (error) {
      console.error('[HubFallbackIntegration] Shutdown error:', error);
    }
  }
}

module.exports = HubFallbackIntegration;
