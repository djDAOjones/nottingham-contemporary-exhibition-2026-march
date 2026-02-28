// External Artist Module Template - Base Class
// Reusable template for artists to integrate their creative tools with Hub v2

const io = require('socket.io-client');
const EventEmitter = require('events');

class BaseArtistModule extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Basic module information
      name: config.name || 'Artist Module',
      moduleId: config.moduleId || 'artist-module',
      artistName: config.artistName || 'Unknown Artist',
      version: config.version || '1.0.0',
      
      // Hub connection
      hubUrl: config.hubUrl || 'ws://localhost:3000',
      port: config.port || 3003,
      autoConnect: config.autoConnect !== false,
      
      // Module behavior
      processingMode: config.processingMode || 'reactive', // 'reactive', 'generative', 'hybrid'
      outputFormat: config.outputFormat || 'visual', // 'visual', 'audio', 'mixed', 'data'
      maxProcessingTime: config.maxProcessingTime || 30000, // 30 seconds
      
      // Artist-specific settings
      creativeSettings: config.creativeSettings || {},
      toolIntegration: config.toolIntegration || {},
      
      ...config
    };
    
    this.hubSocket = null;
    this.connected = false;
    this.currentMessage = null;
    this.processingQueue = [];
    this.isProcessing = false;
    
    // Module statistics
    this.stats = {
      messagesProcessed: 0,
      averageProcessingTime: 0,
      lastProcessingTime: 0,
      successfulOutputs: 0,
      failedOutputs: 0,
      uptime: 0,
      startTime: Date.now(),
      artistSpecificStats: {}
    };
    
    console.log(`[${this.config.name}] Initializing artist module for ${this.config.artistName}`);
  }

  // Abstract methods that artists should override
  async processMessage(message) {
    throw new Error('processMessage() must be implemented by artist subclass');
  }

  async initializeArtistTools() {
    throw new Error('initializeArtistTools() must be implemented by artist subclass');
  }

  async shutdownArtistTools() {
    // Optional override - default is no-op
    console.log(`[${this.config.name}] Default shutdown - override for custom cleanup`);
  }

  // Connect to Hub v2
  async connectToHub() {
    if (this.connected) {
      console.log(`[${this.config.name}] Already connected to hub`);
      return;
    }

    try {
      console.log(`[${this.config.name}] Connecting to hub at ${this.config.hubUrl}`);
      
      this.hubSocket = io(this.config.hubUrl);

      this.hubSocket.on('connect', () => {
        console.log(`[${this.config.name}] Connected to Hub v2`);
        this.connected = true;
        
        // Identify as artist module
        this.hubSocket.emit('identify', {
          role: 'module',
          name: this.config.name,
          moduleId: this.config.moduleId,
          modulePort: this.config.port,
          artistName: this.config.artistName,
          version: this.config.version,
          capabilities: this.getCapabilities(),
          processingMode: this.config.processingMode,
          outputFormat: this.config.outputFormat
        });
        
        this.emit('connected');
      });

      this.hubSocket.on('disconnect', () => {
        console.log(`[${this.config.name}] Disconnected from hub`);
        this.connected = false;
        this.emit('disconnected');
      });

      // Handle incoming messages for processing
      this.hubSocket.on('process-message', async (message) => {
        await this.handleIncomingMessage(message);
      });

      // Handle hub shutdown
      this.hubSocket.on('hub-shutdown', () => {
        console.log(`[${this.config.name}] Hub is shutting down`);
        this.shutdown();
      });

      // Send heartbeat
      this.heartbeatInterval = setInterval(() => {
        if (this.connected && this.hubSocket) {
          this.hubSocket.emit('heartbeat', {
            moduleId: this.config.moduleId,
            status: 'online',
            stats: this.getModuleStats(),
            currentlyProcessing: this.isProcessing,
            queueLength: this.processingQueue.length
          });
        }
      }, 30000);

    } catch (error) {
      console.error(`[${this.config.name}] Failed to connect to hub:`, error);
      throw error;
    }
  }

  // Handle incoming message with queue management
  async handleIncomingMessage(message) {
    console.log(`[${this.config.name}] Received message: ${message.id.slice(0, 8)}`);
    
    // Add to processing queue
    this.processingQueue.push(message);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  // Process message queue
  async processQueue() {
    this.isProcessing = true;
    
    while (this.processingQueue.length > 0) {
      const message = this.processingQueue.shift();
      await this.processMessageWithTimeout(message);
    }
    
    this.isProcessing = false;
  }

  // Process message with timeout handling
  async processMessageWithTimeout(message) {
    const startTime = Date.now();
    this.currentMessage = message;
    
    try {
      console.log(`[${this.config.name}] Processing message: ${message.id.slice(0, 8)}`);
      
      // Set up timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Processing timeout after ${this.config.maxProcessingTime}ms`));
        }, this.config.maxProcessingTime);
      });
      
      // Race between processing and timeout
      const result = await Promise.race([
        this.processMessage(message),
        timeoutPromise
      ]);
      
      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime, true);
      
      // Format and send result
      const formattedResult = this.formatOutput(result, message, processingTime);
      
      if (this.hubSocket && this.connected) {
        this.hubSocket.emit('message-processed', {
          messageId: message.id,
          output: formattedResult,
          processingTime: processingTime,
          moduleId: this.config.moduleId,
          artistName: this.config.artistName
        });
      }
      
      console.log(`[${this.config.name}] Completed processing in ${processingTime}ms`);
      this.emit('message-processed', { message, result: formattedResult, processingTime });
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime, false);
      
      console.error(`[${this.config.name}] Processing error:`, error);
      
      // Send error to hub
      if (this.hubSocket && this.connected) {
        this.hubSocket.emit('processing-error', {
          messageId: message.id,
          error: error.message,
          moduleId: this.config.moduleId,
          artistName: this.config.artistName
        });
      }
      
      this.emit('processing-error', { message, error });
      
    } finally {
      this.currentMessage = null;
    }
  }

  // Format output for Hub v2
  formatOutput(artistResult, originalMessage, processingTime) {
    // Base format - artists can override this method
    return {
      type: 'artist_creation',
      content: this.generateDisplayContent(artistResult),
      data: {
        artistName: this.config.artistName,
        moduleName: this.config.name,
        processingMode: this.config.processingMode,
        outputFormat: this.config.outputFormat,
        originalContent: originalMessage.content,
        artistResult: artistResult,
        creativeProcess: this.describeCreativeProcess(artistResult),
        technicalDetails: this.getTechnicalDetails(artistResult)
      },
      metadata: {
        artist: this.config.artistName,
        module: this.config.name,
        version: this.config.version,
        processingTime: processingTime,
        originalMessageId: originalMessage.id,
        timestamp: Date.now()
      },
      style: this.getArtistStyle()
    };
  }

  // Generate display content - override for custom formatting
  generateDisplayContent(artistResult) {
    return `🎨 **${this.config.artistName}** - ${this.config.name}\n\n` +
           `${this.describeCreativeProcess(artistResult)}\n\n` +
           `*Created using ${this.config.outputFormat} techniques*`;
  }

  // Describe creative process - override for artist-specific descriptions
  describeCreativeProcess(artistResult) {
    return `Artist interpretation completed using ${this.config.processingMode} mode.`;
  }

  // Get technical details - override for specific tool details
  getTechnicalDetails(artistResult) {
    return {
      processingMode: this.config.processingMode,
      outputFormat: this.config.outputFormat,
      toolsUsed: Object.keys(this.config.toolIntegration)
    };
  }

  // Get artist-specific visual style
  getArtistStyle() {
    // Override this method to customize the visual appearance
    return {
      backgroundColor: '#f8f9fa',
      color: '#212529',
      border: '2px solid #6f42c1',
      borderRadius: '8px',
      fontFamily: 'Arial, sans-serif'
    };
  }

  // Get module capabilities
  getCapabilities() {
    // Override to specify what your module can do
    return [
      'text_interpretation',
      'creative_output',
      this.config.outputFormat + '_creation'
    ];
  }

  // Update processing statistics
  updateProcessingStats(processingTime, success) {
    this.stats.messagesProcessed++;
    this.stats.lastProcessingTime = processingTime;
    
    if (success) {
      this.stats.successfulOutputs++;
    } else {
      this.stats.failedOutputs++;
    }
    
    // Update rolling average
    if (this.stats.messagesProcessed === 1) {
      this.stats.averageProcessingTime = processingTime;
    } else {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * 0.9) + (processingTime * 0.1);
    }
  }

  // Get module statistics
  getModuleStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      successRate: this.stats.messagesProcessed > 0 ? 
        (this.stats.successfulOutputs / this.stats.messagesProcessed) * 100 : 0,
      currentMessage: this.currentMessage ? this.currentMessage.id.slice(0, 8) : null,
      queueLength: this.processingQueue.length,
      artistName: this.config.artistName,
      processingMode: this.config.processingMode
    };
  }

  // Start the module
  async start() {
    try {
      console.log(`[${this.config.name}] Starting artist module for ${this.config.artistName}...`);
      
      // Initialize artist-specific tools
      await this.initializeArtistTools();
      
      // Connect to hub
      if (this.config.autoConnect) {
        await this.connectToHub();
      }
      
      console.log(`[${this.config.name}] Artist module started successfully`);
      this.emit('started');
      
    } catch (error) {
      console.error(`[${this.config.name}] Failed to start:`, error);
      throw error;
    }
  }

  // Shutdown the module
  async shutdown() {
    try {
      console.log(`[${this.config.name}] Shutting down...`);
      
      // Clear intervals
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      // Disconnect from hub
      if (this.hubSocket) {
        this.hubSocket.disconnect();
        this.hubSocket = null;
      }
      
      // Shutdown artist tools
      await this.shutdownArtistTools();
      
      // Clear processing queue
      this.processingQueue = [];
      this.isProcessing = false;
      this.connected = false;
      
      console.log(`[${this.config.name}] Shutdown complete`);
      this.emit('shutdown');
      
    } catch (error) {
      console.error(`[${this.config.name}] Error during shutdown:`, error);
    }
  }

  // Reconnect to hub
  async reconnect() {
    if (this.connected) {
      await this.shutdown();
    }
    
    setTimeout(async () => {
      await this.connectToHub();
    }, 5000);
  }

  // Utility methods for artists

  // Extract themes from text
  extractThemes(text) {
    const words = text.toLowerCase().split(/\s+/);
    const themes = {
      colors: [],
      emotions: [],
      objects: [],
      actions: []
    };
    
    // Basic theme extraction - artists can enhance this
    const colorWords = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'black', 'white'];
    const emotionWords = ['happy', 'sad', 'angry', 'peaceful', 'excited', 'calm', 'love', 'fear'];
    const actionWords = ['dance', 'fly', 'run', 'swim', 'jump', 'create', 'destroy', 'build'];
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (colorWords.includes(cleanWord)) themes.colors.push(cleanWord);
      if (emotionWords.includes(cleanWord)) themes.emotions.push(cleanWord);
      if (actionWords.includes(cleanWord)) themes.actions.push(cleanWord);
    });
    
    return themes;
  }

  // Calculate sentiment score
  calculateSentiment(text) {
    const positiveWords = ['good', 'great', 'amazing', 'wonderful', 'beautiful', 'happy', 'joy', 'love'];
    const negativeWords = ['bad', 'terrible', 'awful', 'sad', 'angry', 'hate', 'fear', 'dark'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (positiveWords.includes(cleanWord)) score += 1;
      if (negativeWords.includes(cleanWord)) score -= 1;
    });
    
    return Math.max(-1, Math.min(1, score / Math.max(1, words.length)));
  }

  // Generate random seed from text
  generateSeedFromText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Log artist-specific activity
  logActivity(activity, data = {}) {
    const logEntry = {
      timestamp: Date.now(),
      activity: activity,
      artistName: this.config.artistName,
      moduleName: this.config.name,
      data: data
    };
    
    console.log(`[${this.config.name}] Activity: ${activity}`, data);
    this.emit('activity', logEntry);
  }
}

module.exports = BaseArtistModule;
