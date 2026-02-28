// HTTP REST API Adapter
// For external modules that expose REST endpoints

const BaseAdapter = require('./base-adapter');
const axios = require('axios');

class HttpAdapter extends BaseAdapter {
  constructor(config) {
    super({
      name: 'HTTP REST Adapter',
      protocol: 'http',
      port: 3001,
      ...config,
      httpEndpoint: config.httpEndpoint || 'http://localhost:8080/process',
      httpMethod: config.httpMethod || 'POST',
      httpTimeout: config.httpTimeout || 55000, // Slightly less than module timeout
      httpHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...config.httpHeaders
      }
    });
  }

  // Translate Hub message to HTTP request format
  translateToExternal(message) {
    return {
      message_id: message.id,
      content: message.content,
      timestamp: message.timestamp,
      metadata: {
        source: 'hub-v2',
        adapter: this.config.name
      }
    };
  }

  // Send message to external HTTP endpoint
  async sendToExternalModule(message) {
    try {
      console.log(`[${this.config.name}] Sending HTTP request to ${this.config.httpEndpoint}`);
      
      const response = await axios({
        method: this.config.httpMethod,
        url: this.config.httpEndpoint,
        data: message,
        headers: this.config.httpHeaders,
        timeout: this.config.httpTimeout
      });

      console.log(`[${this.config.name}] HTTP response status: ${response.status}`);
      return response.data;
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`External module not responding at ${this.config.httpEndpoint}`);
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error(`External module timed out after ${this.config.httpTimeout}ms`);
      } else if (error.response) {
        throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      } else {
        throw new Error(`Network error: ${error.message}`);
      }
    }
  }

  // Translate HTTP response to Hub format
  translateFromExternal(result, originalMessage) {
    // Handle different response formats
    if (typeof result === 'string') {
      return {
        type: 'text',
        content: result,
        metadata: {
          adapter: this.config.name,
          protocol: this.config.protocol,
          originalMessageId: originalMessage.id,
          endpoint: this.config.httpEndpoint
        }
      };
    }

    if (result && typeof result === 'object') {
      // Standard format with type and content
      if (result.type && result.content) {
        return {
          type: result.type,
          content: result.content,
          data: result.data || null,
          metadata: {
            adapter: this.config.name,
            protocol: this.config.protocol,
            originalMessageId: originalMessage.id,
            endpoint: this.config.httpEndpoint,
            ...result.metadata
          }
        };
      }

      // Image/media response
      if (result.image_url || result.video_url || result.audio_url) {
        return {
          type: 'media',
          content: result.description || 'Generated media',
          data: {
            image_url: result.image_url,
            video_url: result.video_url,
            audio_url: result.audio_url,
            width: result.width,
            height: result.height,
            duration: result.duration
          },
          metadata: {
            adapter: this.config.name,
            protocol: this.config.protocol,
            originalMessageId: originalMessage.id,
            endpoint: this.config.httpEndpoint
          }
        };
      }

      // Generic object response
      return {
        type: 'data',
        content: result.message || JSON.stringify(result),
        data: result,
        metadata: {
          adapter: this.config.name,
          protocol: this.config.protocol,
          originalMessageId: originalMessage.id,
          endpoint: this.config.httpEndpoint
        }
      };
    }

    // Fallback
    return {
      type: 'unknown',
      content: String(result),
      metadata: {
        adapter: this.config.name,
        protocol: this.config.protocol,
        originalMessageId: originalMessage.id,
        endpoint: this.config.httpEndpoint
      }
    };
  }

  async startExternalConnection() {
    // Test connection to external endpoint
    try {
      console.log(`[${this.config.name}] Testing connection to ${this.config.httpEndpoint}`);
      
      const testMessage = {
        message_id: 'test-connection',
        content: 'Connection test',
        timestamp: Date.now(),
        metadata: { test: true }
      };

      await axios({
        method: this.config.httpMethod,
        url: this.config.httpEndpoint,
        data: testMessage,
        headers: this.config.httpHeaders,
        timeout: 5000
      });

      console.log(`[${this.config.name}] External HTTP endpoint is responsive`);
      
    } catch (error) {
      console.warn(`[${this.config.name}] Warning: Could not reach external endpoint:`, error.message);
      console.warn(`[${this.config.name}] Will continue and retry on actual messages`);
    }
  }

  async stopExternalConnection() {
    // Nothing to stop for HTTP adapter
    console.log(`[${this.config.name}] HTTP adapter stopped`);
  }
}

module.exports = HttpAdapter;
