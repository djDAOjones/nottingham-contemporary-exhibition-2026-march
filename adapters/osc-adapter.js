// OSC (Open Sound Control) Adapter
// For VJ software, audio software, and creative coding environments like TouchDesigner, Max/MSP, etc.

const BaseAdapter = require('./base-adapter');
const osc = require('node-osc');

class OSCAdapter extends BaseAdapter {
  constructor(config) {
    super({
      name: 'OSC Adapter',
      protocol: 'osc',
      port: 3003,
      ...config,
      oscOutHost: config.oscOutHost || 'localhost',
      oscOutPort: config.oscOutPort || 8001,
      oscInPort: config.oscInPort || 8002,
      oscAddressPrefix: config.oscAddressPrefix || '/hub/message'
    });
    
    this.oscClient = null;
    this.oscServer = null;
    this.pendingMessages = new Map();
  }

  // Translate Hub message to OSC format
  translateToExternal(message) {
    // Extract key information for OSC
    const words = message.content.toLowerCase().split(/\s+/).slice(0, 10); // First 10 words
    const sentiment = this.analyzeSentiment(message.content); // Basic sentiment
    
    return {
      id: message.id,
      content: message.content,
      words: words,
      sentiment: sentiment,
      timestamp: message.timestamp,
      length: message.content.length
    };
  }

  // Send message via OSC
  async sendToExternalModule(message) {
    return new Promise((resolve, reject) => {
      if (!this.oscClient) {
        reject(new Error('OSC client not initialized'));
        return;
      }

      // Store promise for response handling
      this.pendingMessages.set(message.id, { resolve, reject });

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(message.id);
        // OSC is often fire-and-forget, so we'll resolve with a default response
        resolve({
          type: 'osc_sent',
          message: 'OSC message transmitted',
          osc_address: `${this.config.oscAddressPrefix}`,
          timestamp: Date.now()
        });
      }, 5000); // Shorter timeout for OSC

      this.pendingMessages.get(message.id).timeout = timeout;

      try {
        // Send main message data
        this.oscClient.send(`${this.config.oscAddressPrefix}/content`, message.content);
        
        // Send structured data for creative use
        this.oscClient.send(`${this.config.oscAddressPrefix}/id`, message.id);
        this.oscClient.send(`${this.config.oscAddressPrefix}/timestamp`, message.timestamp);
        this.oscClient.send(`${this.config.oscAddressPrefix}/length`, message.length);
        this.oscClient.send(`${this.config.oscAddressPrefix}/sentiment`, message.sentiment);
        
        // Send individual words as array
        message.words.forEach((word, index) => {
          this.oscClient.send(`${this.config.oscAddressPrefix}/word/${index}`, word);
        });
        
        // Send trigger for processing
        this.oscClient.send(`${this.config.oscAddressPrefix}/trigger`, 1);
        
        console.log(`[${this.config.name}] Sent OSC messages for ${message.id} to ${this.config.oscOutHost}:${this.config.oscOutPort}`);
        
      } catch (error) {
        this.pendingMessages.delete(message.id);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  // Simple sentiment analysis for creative purposes
  analyzeSentiment(text) {
    const positiveWords = ['happy', 'joy', 'love', 'beautiful', 'wonderful', 'amazing', 'great', 'good', 'best', 'fantastic'];
    const negativeWords = ['sad', 'angry', 'hate', 'terrible', 'awful', 'bad', 'worst', 'horrible', 'disgusting'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });
    
    // Normalize to -1.0 to 1.0 range
    return Math.max(-1, Math.min(1, score / Math.max(1, words.length / 10)));
  }

  // Translate OSC response to Hub format
  translateFromExternal(result, originalMessage) {
    return {
      type: 'osc',
      content: result.message || 'OSC message processed',
      data: {
        osc_address: result.osc_address,
        response_time: result.timestamp,
        original_sentiment: result.sentiment
      },
      metadata: {
        adapter: this.config.name,
        protocol: this.config.protocol,
        originalMessageId: originalMessage.id,
        oscHost: this.config.oscOutHost,
        oscPort: this.config.oscOutPort
      }
    };
  }

  // Start OSC client and server
  async startExternalConnection() {
    return new Promise((resolve, reject) => {
      try {
        // Create OSC client for sending
        this.oscClient = new osc.Client(this.config.oscOutHost, this.config.oscOutPort);
        console.log(`[${this.config.name}] OSC client initialized for ${this.config.oscOutHost}:${this.config.oscOutPort}`);

        // Create OSC server for receiving responses (optional)
        this.oscServer = new osc.Server(this.config.oscInPort, '0.0.0.0', () => {
          console.log(`[${this.config.name}] OSC server listening on port ${this.config.oscInPort}`);
        });

        // Handle incoming OSC messages (responses or status updates)
        this.oscServer.on('message', (msg) => {
          this.handleOSCMessage(msg);
        });

        this.oscServer.on('error', (error) => {
          console.error(`[${this.config.name}] OSC server error:`, error);
        });

        // Test connectivity by sending a ping
        setTimeout(() => {
          try {
            this.oscClient.send(`${this.config.oscAddressPrefix}/ping`, 'adapter_connected');
            console.log(`[${this.config.name}] Sent OSC ping to external module`);
            resolve();
          } catch (error) {
            console.warn(`[${this.config.name}] Could not send OSC ping:`, error.message);
            resolve(); // Continue anyway, as OSC is often one-way
          }
        }, 1000);

      } catch (error) {
        reject(error);
      }
    });
  }

  // Handle incoming OSC messages
  handleOSCMessage(msg) {
    try {
      const [address, ...args] = msg;
      console.log(`[${this.config.name}] Received OSC: ${address} ${args.join(' ')}`);

      // Handle response messages
      if (address.includes('/response/') || address.includes('/status/')) {
        const messageId = args[0]; // Assuming first arg is message ID
        const pending = this.pendingMessages.get(messageId);
        
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingMessages.delete(messageId);
          
          pending.resolve({
            type: 'osc_response',
            message: `Response from ${address}`,
            osc_address: address,
            args: args,
            timestamp: Date.now()
          });
        }
      }

      // Handle status updates
      if (address.includes('/status')) {
        console.log(`[${this.config.name}] External module status: ${args.join(' ')}`);
      }

    } catch (error) {
      console.error(`[${this.config.name}] Error handling OSC message:`, error);
    }
  }

  // Stop OSC connections
  async stopExternalConnection() {
    if (this.oscServer) {
      this.oscServer.close();
      this.oscServer = null;
      console.log(`[${this.config.name}] OSC server stopped`);
    }

    if (this.oscClient) {
      // Send disconnect signal
      try {
        this.oscClient.send(`${this.config.oscAddressPrefix}/disconnect`, 'adapter_stopping');
      } catch (e) {
        // Ignore errors during shutdown
      }
      this.oscClient = null;
      console.log(`[${this.config.name}] OSC client stopped`);
    }

    // Clear pending messages
    for (const [messageId, pending] of this.pendingMessages.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('OSC adapter shutting down'));
    }
    this.pendingMessages.clear();
  }
}

module.exports = OSCAdapter;
