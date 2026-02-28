// Terminal Critic v2 - Local Module Implementation
// Integrates with Hub v2 as a standard module

const io = require('socket.io-client');
const { CriticEngine } = require('./critic-engine');
const express = require('express');
const path = require('path');

class TerminalCriticModule {
  constructor(config = {}) {
    this.config = {
      name: 'Terminal Critic v2',
      moduleId: 'terminal-critic-v2',
      port: 3001,
      hubUrl: 'ws://localhost:3000',
      webPort: 8001,
      enableWebInterface: true,
      autoConnect: true,
      ...config
    };
    
    this.hubSocket = null;
    this.connected = false;
    this.webServer = null;
    this.currentMessage = null;
    
    // Initialize criticism engine
    this.engine = new CriticEngine(config.engineConfig || {});
    
    // Statistics
    this.stats = {
      messagesProcessed: 0,
      averageProcessingTime: 0,
      lastProcessingTime: 0,
      uptime: 0,
      startTime: Date.now()
    };
    
    // Setup engine event handlers
    this.setupEngineHandlers();
  }

  // Setup criticism engine event handlers
  setupEngineHandlers() {
    this.engine.on('analysis-complete', (analysis) => {
      console.log(`[CriticModule] Analysis complete: ${analysis.recommendation} (${analysis.score.toFixed(2)})`);
      
      if (analysis.issues.length > 0) {
        console.log(`[CriticModule] Issues found: ${analysis.issues.map(i => i.message).join(', ')}`);
      }
    });

    this.engine.on('config-updated', (config) => {
      console.log('[CriticModule] Engine configuration updated');
    });
  }

  // Connect to Hub v2
  async connectToHub() {
    if (this.connected) {
      console.log('[CriticModule] Already connected to hub');
      return;
    }

    try {
      console.log(`[CriticModule] Connecting to hub at ${this.config.hubUrl}`);
      
      this.hubSocket = io(this.config.hubUrl);

      this.hubSocket.on('connect', () => {
        console.log('[CriticModule] Connected to Hub v2');
        this.connected = true;
        
        // Identify as module
        this.hubSocket.emit('identify', {
          role: 'module',
          name: this.config.name,
          moduleId: this.config.moduleId,
          modulePort: this.config.port,
          capabilities: ['text_analysis', 'content_moderation', 'sentiment_analysis']
        });
      });

      this.hubSocket.on('disconnect', () => {
        console.log('[CriticModule] Disconnected from hub');
        this.connected = false;
      });

      // Handle incoming messages for processing
      this.hubSocket.on('process-message', async (message) => {
        await this.processMessage(message);
      });

      // Handle hub shutdown
      this.hubSocket.on('hub-shutdown', () => {
        console.log('[CriticModule] Hub is shutting down');
        this.shutdown();
      });

      // Send heartbeat
      setInterval(() => {
        if (this.connected && this.hubSocket) {
          this.hubSocket.emit('heartbeat', {
            moduleId: this.config.moduleId,
            status: 'online',
            stats: this.getModuleStats()
          });
        }
      }, 30000);

    } catch (error) {
      console.error('[CriticModule] Failed to connect to hub:', error);
      throw error;
    }
  }

  // Process incoming message from hub
  async processMessage(message) {
    const startTime = Date.now();
    this.currentMessage = message;
    
    try {
      console.log(`[CriticModule] Processing message: ${message.id.slice(0, 8)}`);
      
      // Run analysis through criticism engine
      const analysis = await this.engine.analyzeMessage(message);
      
      // Format result for hub
      const result = this.formatAnalysisResult(analysis, message);
      
      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime);
      
      // Send result back to hub
      if (this.hubSocket && this.connected) {
        this.hubSocket.emit('message-processed', {
          messageId: message.id,
          output: result,
          processingTime: processingTime,
          moduleId: this.config.moduleId
        });
      }
      
      console.log(`[CriticModule] Completed analysis in ${processingTime}ms: ${analysis.recommendation}`);
      
    } catch (error) {
      console.error('[CriticModule] Processing error:', error);
      
      // Send error to hub
      if (this.hubSocket && this.connected) {
        this.hubSocket.emit('processing-error', {
          messageId: message.id,
          error: error.message,
          moduleId: this.config.moduleId
        });
      }
    } finally {
      this.currentMessage = null;
    }
  }

  // Format analysis result for hub consumption
  formatAnalysisResult(analysis, originalMessage) {
    const result = {
      type: 'criticism_analysis',
      content: this.generateCriticismText(analysis),
      data: {
        recommendation: analysis.recommendation,
        reason: analysis.reason,
        score: analysis.score,
        issueCount: analysis.issues.length,
        warningCount: analysis.warnings.length,
        modules: Object.keys(analysis.modules),
        details: analysis.modules,
        overrideApplied: analysis.overrideApplied
      },
      metadata: {
        analyzer: this.config.name,
        version: '2.0.0',
        processingTime: Date.now() - analysis.timestamp,
        originalMessageId: originalMessage.id
      }
    };

    // Add visual indicators based on recommendation
    switch (analysis.recommendation) {
      case 'approve':
        result.style = {
          backgroundColor: '#10b981',
          color: '#ffffff',
          border: '2px solid #059669'
        };
        break;
      case 'warning':
        result.style = {
          backgroundColor: '#f59e0b', 
          color: '#000000',
          border: '2px solid #d97706'
        };
        break;
      case 'reject':
        result.style = {
          backgroundColor: '#ef4444',
          color: '#ffffff',
          border: '2px solid #dc2626'
        };
        break;
    }

    return result;
  }

  // Generate human-readable criticism text
  generateCriticismText(analysis) {
    const { recommendation, reason, score } = analysis;
    
    let criticismText = '';
    
    switch (recommendation) {
      case 'approve':
        criticismText = `✅ APPROVED (${Math.round(score * 100)}%)\n${reason}`;
        if (analysis.warnings.length > 0) {
          criticismText += `\nMinor notes: ${analysis.warnings.slice(0, 2).map(w => w.message).join(', ')}`;
        }
        break;
        
      case 'warning':
        criticismText = `⚠️ REVIEW RECOMMENDED (${Math.round(score * 100)}%)\n${reason}`;
        if (analysis.issues.length > 0) {
          criticismText += `\nConcerns: ${analysis.issues.slice(0, 2).map(i => i.message).join(', ')}`;
        }
        break;
        
      case 'reject':
        criticismText = `❌ REJECTED (${Math.round(score * 100)}%)\n${reason}`;
        if (analysis.issues.length > 0) {
          criticismText += `\nIssues: ${analysis.issues.slice(0, 3).map(i => i.message).join(', ')}`;
        }
        break;
    }
    
    // Add override information
    if (analysis.overrideApplied) {
      criticismText += `\n(${analysis.overrideApplied} override applied)`;
    }
    
    return criticismText;
  }

  // Start web interface for control panel
  async startWebInterface() {
    if (!this.config.enableWebInterface) {
      return;
    }

    const app = express();
    
    // Serve static files
    app.use(express.static(path.join(__dirname, 'web')));
    app.use(express.json());
    
    // API endpoints
    app.get('/api/status', (req, res) => {
      res.json({
        connected: this.connected,
        stats: this.getModuleStats(),
        engineStats: this.engine.getStats(),
        config: {
          name: this.config.name,
          moduleId: this.config.moduleId,
          hubUrl: this.config.hubUrl
        }
      });
    });
    
    app.get('/api/engine/config', (req, res) => {
      res.json(this.engine.config);
    });
    
    app.post('/api/engine/config', (req, res) => {
      try {
        this.engine.updateConfig(req.body);
        res.json({ success: true, config: this.engine.config });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });
    
    app.post('/api/test-analysis', async (req, res) => {
      try {
        const { content } = req.body;
        if (!content) {
          return res.status(400).json({ error: 'Content required' });
        }
        
        const testMessage = {
          id: `test-${Date.now()}`,
          content: content,
          timestamp: Date.now()
        };
        
        const analysis = await this.engine.analyzeMessage(testMessage);
        const result = this.formatAnalysisResult(analysis, testMessage);
        
        res.json({ success: true, analysis, result });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    app.get('/api/modules', (req, res) => {
      res.json({
        modules: Array.from(this.engine.analysisModules.keys()),
        moduleDetails: Object.fromEntries(
          Array.from(this.engine.analysisModules.entries()).map(([name, module]) => [
            name,
            {
              name: name,
              type: module.constructor.name,
              config: module.config || {}
            }
          ])
        )
      });
    });

    return new Promise((resolve, reject) => {
      this.webServer = app.listen(this.config.webPort, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`[CriticModule] Web interface running on port ${this.config.webPort}`);
          console.log(`[CriticModule] Control panel: http://localhost:${this.config.webPort}`);
          resolve();
        }
      });
    });
  }

  // Update processing statistics
  updateProcessingStats(processingTime) {
    this.stats.messagesProcessed++;
    this.stats.lastProcessingTime = processingTime;
    
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
      currentMessage: this.currentMessage ? this.currentMessage.id.slice(0, 8) : null,
      engineStats: this.engine.getStats()
    };
  }

  // Start the module
  async start() {
    try {
      console.log('[CriticModule] Starting Terminal Critic v2...');
      
      // Start web interface first
      if (this.config.enableWebInterface) {
        await this.startWebInterface();
      }
      
      // Connect to hub
      if (this.config.autoConnect) {
        await this.connectToHub();
      }
      
      console.log('[CriticModule] Terminal Critic v2 started successfully');
      
    } catch (error) {
      console.error('[CriticModule] Failed to start:', error);
      throw error;
    }
  }

  // Shutdown the module
  async shutdown() {
    try {
      console.log('[CriticModule] Shutting down...');
      
      if (this.hubSocket) {
        this.hubSocket.disconnect();
        this.hubSocket = null;
      }
      
      if (this.webServer) {
        this.webServer.close();
        this.webServer = null;
      }
      
      this.connected = false;
      console.log('[CriticModule] Shutdown complete');
      
    } catch (error) {
      console.error('[CriticModule] Error during shutdown:', error);
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
}

module.exports = TerminalCriticModule;
