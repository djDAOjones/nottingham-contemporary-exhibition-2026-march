// WebSocket Adapter
// For external modules that use WebSocket connections

const BaseAdapter = require('./base-adapter');
const WebSocket = require('ws');

class WebSocketAdapter extends BaseAdapter {
  constructor(config) {
    super({
      name: 'WebSocket Adapter',
      protocol: 'websocket',
      port: 3002,
      ...config,
      wsUrl: config.wsUrl || 'ws://localhost:8080',
      wsProtocol: config.wsProtocol || null,
      wsHeaders: config.wsHeaders || {},
      pingInterval: config.pingInterval || 30000,
      reconnectDelay: config.reconnectDelay || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10
    });
    
    this.ws = null;
    this.wsConnected = false;
    this.reconnectAttempts = 0;
    this.pendingMessages = new Map(); // messageId -> resolve/reject functions
  }

  // Translate Hub message to WebSocket format
  translateToExternal(message) {
    return {
      type: 'process_message',
      id: message.id,
      data: {
        content: message.content,
        timestamp: message.timestamp,
        source: 'hub-v2'
      }
    };
  }

  // Send message to external WebSocket
  async sendToExternalModule(message) {
    return new Promise((resolve, reject) => {
      if (!this.ws || !this.wsConnected) {
        reject(new Error('WebSocket not connected to external module'));
        return;
      }

      // Store promise handlers for this message
      this.pendingMessages.set(message.id, { resolve, reject });

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(message.id);
        reject(new Error(`WebSocket message timeout: ${message.id}`));
      }, this.config.processingTimeout);

      // Store timeout reference for cleanup
      this.pendingMessages.get(message.id).timeout = timeout;

      try {
        this.ws.send(JSON.stringify(message));
        console.log(`[${this.config.name}] Sent WebSocket message: ${message.id}`);
      } catch (error) {
        this.pendingMessages.delete(message.id);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  // Translate WebSocket response to Hub format
  translateFromExternal(result, originalMessage) {
    // Handle different WebSocket response formats
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch (e) {
        // Plain text response
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
    }

    if (result && typeof result === 'object') {
      // Standard response format
      if (result.type && result.content !== undefined) {
        return {
          type: result.type,
          content: result.content,
          data: result.data || null,
          metadata: {
            adapter: this.config.name,
            protocol: this.config.protocol,
            originalMessageId: originalMessage.id,
            wsUrl: this.config.wsUrl,
            ...result.metadata
          }
        };
      }

      // Visual/media response
      if (result.visual || result.media) {
        return {
          type: 'visual',
          content: result.description || 'Generated visual content',
          data: result.visual || result.media,
          metadata: {
            adapter: this.config.name,
            protocol: this.config.protocol,
            originalMessageId: originalMessage.id,
            wsUrl: this.config.wsUrl
          }
        };
      }

      // Generic data response
      return {
        type: 'data',
        content: result.message || JSON.stringify(result),
        data: result,
        metadata: {
          adapter: this.config.name,
          protocol: this.config.protocol,
          originalMessageId: originalMessage.id,
          wsUrl: this.config.wsUrl
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
        wsUrl: this.config.wsUrl
      }
    };
  }

  // Start WebSocket connection to external module
  async startExternalConnection() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[${this.config.name}] Connecting to ${this.config.wsUrl}`);
        
        const wsOptions = {};
        if (this.config.wsProtocol) {
          wsOptions.protocol = this.config.wsProtocol;
        }
        if (this.config.wsHeaders && Object.keys(this.config.wsHeaders).length > 0) {
          wsOptions.headers = this.config.wsHeaders;
        }

        this.ws = new WebSocket(this.config.wsUrl, wsOptions);

        this.ws.on('open', () => {
          console.log(`[${this.config.name}] WebSocket connected to external module`);
          this.wsConnected = true;
          this.reconnectAttempts = 0;
          
          // Send identification
          this.ws.send(JSON.stringify({
            type: 'identify',
            source: 'hub-v2-adapter',
            adapter: this.config.name
          }));
          
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleWebSocketMessage(data);
        });

        this.ws.on('close', (code, reason) => {
          console.log(`[${this.config.name}] WebSocket closed: ${code} ${reason}`);
          this.wsConnected = false;
          this.handleWebSocketDisconnect();
        });

        this.ws.on('error', (error) => {
          console.error(`[${this.config.name}] WebSocket error:`, error);
          this.wsConnected = false;
          
          if (!this.wsConnected && this.reconnectAttempts === 0) {
            reject(error);
          }
        });

        // Setup ping/pong for keepalive
        this.ws.on('pong', () => {
          console.log(`[${this.config.name}] Received pong from external module`);
        });

        // Start ping interval
        this.pingIntervalId = setInterval(() => {
          if (this.ws && this.wsConnected) {
            this.ws.ping();
          }
        }, this.config.pingInterval);

      } catch (error) {
        reject(error);
      }
    });
  }

  // Handle incoming WebSocket messages from external module
  handleWebSocketMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle response to our request
      if (message.type === 'response' && message.id) {
        const pending = this.pendingMessages.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingMessages.delete(message.id);
          pending.resolve(message);
          return;
        }
      }

      // Handle status updates or other messages
      if (message.type === 'status') {
        console.log(`[${this.config.name}] External module status:`, message.status);
        return;
      }

      console.log(`[${this.config.name}] Received unhandled WebSocket message:`, message);
      
    } catch (error) {
      console.error(`[${this.config.name}] Error parsing WebSocket message:`, error);
    }
  }

  // Handle WebSocket disconnection
  handleWebSocketDisconnect() {
    // Reject all pending messages
    for (const [messageId, pending] of this.pendingMessages.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('WebSocket disconnected'));
    }
    this.pendingMessages.clear();

    // Attempt reconnection
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[${this.config.name}] Attempting reconnection ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.startExternalConnection().catch(error => {
          console.error(`[${this.config.name}] Reconnection attempt failed:`, error);
        });
      }, this.config.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error(`[${this.config.name}] Max reconnection attempts reached`);
      this.emit('error', new Error('WebSocket connection failed permanently'));
    }
  }

  // Stop WebSocket connection
  async stopExternalConnection() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }

    // Reject all pending messages
    for (const [messageId, pending] of this.pendingMessages.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Adapter shutting down'));
    }
    this.pendingMessages.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.wsConnected = false;
    console.log(`[${this.config.name}] WebSocket connection stopped`);
  }
}

module.exports = WebSocketAdapter;
