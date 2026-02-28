// Base External Module Adapter
// Provides common interface for translating external protocols to Hub v2 format

const io = require('socket.io-client');
const EventEmitter = require('events');

class BaseAdapter extends EventEmitter {
  constructor(config) {
    super();
    
    this.config = {
      name: 'Unknown Adapter',
      hubUrl: 'ws://localhost:3000',
      moduleId: `adapter-${Date.now()}`,
      port: null,
      protocol: 'unknown',
      reconnectInterval: 5000,
      processingTimeout: 60000,
      ...config
    };
    
    this.hubSocket = null;
    this.connected = false;
    this.currentMessage = null;
    this.stats = {
      messagesReceived: 0,
      messagesProcessed: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  // Connect to Hub v2
  async connectToHub() {
    try {
      console.log(`[${this.config.name}] Connecting to Hub at ${this.config.hubUrl}`);
      
      this.hubSocket = io(this.config.hubUrl);
      
      this.hubSocket.on('connect', () => {
        console.log(`[${this.config.name}] Connected to Hub v2`);
        this.connected = true;
        
        // Identify as module to hub
        this.hubSocket.emit('identify', {
          role: 'module',
          name: this.config.name,
          moduleId: this.config.moduleId,
          modulePort: this.config.port
        });
        
        this.emit('hub-connected');
      });
      
      this.hubSocket.on('disconnect', () => {
        console.log(`[${this.config.name}] Disconnected from Hub`);
        this.connected = false;
        this.emit('hub-disconnected');
        
        // Attempt reconnection
        setTimeout(() => {
          if (!this.connected) {
            this.connectToHub();
          }
        }, this.config.reconnectInterval);
      });
      
      // Handle incoming messages from hub
      this.hubSocket.on('process-message', (message) => {
        this.handleHubMessage(message);
      });
      
      this.hubSocket.on('hub-shutdown', () => {
        console.log(`[${this.config.name}] Hub is shutting down`);
        this.shutdown();
      });
      
      // Send heartbeat every 30 seconds
      setInterval(() => {
        if (this.connected && this.hubSocket) {
          this.hubSocket.emit('heartbeat');
        }
      }, 30000);
      
    } catch (error) {
      console.error(`[${this.config.name}] Failed to connect to hub:`, error);
      this.emit('error', error);
    }
  }

  // Handle message from Hub v2
  async handleHubMessage(message) {
    try {
      console.log(`[${this.config.name}] Processing message: ${message.id.slice(0,8)}`);
      this.stats.messagesReceived++;
      this.currentMessage = message;
      
      const startTime = Date.now();
      
      // Translate hub message to external format
      const externalMessage = this.translateToExternal(message);
      
      // Send to external module
      const result = await this.sendToExternalModule(externalMessage);
      
      // Translate result back to hub format
      const hubResult = this.translateFromExternal(result, message);
      
      const processingTime = Date.now() - startTime;
      this.stats.messagesProcessed++;
      
      // Send result back to hub
      if (this.hubSocket && this.connected) {
        this.hubSocket.emit('message-processed', {
          messageId: message.id,
          output: hubResult,
          processingTime
        });
      }
      
      console.log(`[${this.config.name}] Completed message ${message.id.slice(0,8)} in ${processingTime}ms`);
      this.currentMessage = null;
      
    } catch (error) {
      this.stats.errors++;
      console.error(`[${this.config.name}] Error processing message:`, error);
      
      // Send error to hub
      if (this.hubSocket && this.connected) {
        this.hubSocket.emit('processing-error', {
          messageId: message.id,
          error: error.message
        });
      }
      
      this.currentMessage = null;
    }
  }

  // OVERRIDE: Translate Hub v2 message format to external module format
  translateToExternal(message) {
    // Default: pass through unchanged
    // Override in specific adapters
    return {
      id: message.id,
      content: message.content,
      timestamp: message.timestamp
    };
  }

  // OVERRIDE: Send message to external module via specific protocol
  async sendToExternalModule(message) {
    // Must be implemented by specific adapters
    throw new Error('sendToExternalModule must be implemented by adapter');
  }

  // OVERRIDE: Translate external result to Hub v2 format
  translateFromExternal(result, originalMessage) {
    // Default: standard format
    // Override in specific adapters
    return {
      type: 'text',
      content: result,
      metadata: {
        adapter: this.config.name,
        protocol: this.config.protocol,
        originalMessageId: originalMessage.id
      }
    };
  }

  // OVERRIDE: Start external module connection/server
  async startExternalConnection() {
    // Override in specific adapters
    console.log(`[${this.config.name}] Starting external connection...`);
  }

  // OVERRIDE: Stop external module connection/server  
  async stopExternalConnection() {
    // Override in specific adapters
    console.log(`[${this.config.name}] Stopping external connection...`);
  }

  // Get adapter statistics
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    return {
      ...this.stats,
      uptime,
      avgProcessingTime: this.stats.messagesProcessed > 0 ? 
        uptime / this.stats.messagesProcessed : 0,
      errorRate: this.stats.messagesReceived > 0 ? 
        (this.stats.errors / this.stats.messagesReceived) * 100 : 0
    };
  }

  // Start the adapter
  async start() {
    try {
      console.log(`[${this.config.name}] Starting adapter...`);
      
      // Start external connection first
      await this.startExternalConnection();
      
      // Connect to hub
      await this.connectToHub();
      
      console.log(`[${this.config.name}] Adapter started successfully`);
      this.emit('started');
      
    } catch (error) {
      console.error(`[${this.config.name}] Failed to start adapter:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  // Stop the adapter
  async shutdown() {
    try {
      console.log(`[${this.config.name}] Shutting down adapter...`);
      
      if (this.hubSocket) {
        this.hubSocket.disconnect();
        this.hubSocket = null;
      }
      
      await this.stopExternalConnection();
      
      this.connected = false;
      console.log(`[${this.config.name}] Adapter shut down`);
      this.emit('stopped');
      
    } catch (error) {
      console.error(`[${this.config.name}] Error during shutdown:`, error);
      this.emit('error', error);
    }
  }
}

module.exports = BaseAdapter;
