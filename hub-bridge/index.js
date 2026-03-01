// Hub Bridge — connects local artist tools to Hub v2
// Sits on the artist's laptop, receives messages from the Hub,
// forwards to local creative tools (OSC, HTTP, WebSocket),
// captures output (screenshots, text, video URL), and sends it back.

const io = require('socket.io-client');
const express = require('express');
const path = require('path');
const { EventEmitter } = require('events');

// ============ CONFIGURATION ============

const config = {
  // Hub connection
  hubUrl: process.env.HUB_URL || 'ws://localhost:3000',
  moduleName: process.env.MODULE_NAME || 'Artist Bridge',
  moduleId: process.env.MODULE_ID || `bridge-${Date.now().toString(36)}`,

  // Local web server for config UI + receiving output from tools
  localPort: parseInt(process.env.BRIDGE_PORT) || 4000,

  // Output capture mode: 'screenshot' | 'http-poll' | 'webhook' | 'manual'
  captureMode: process.env.CAPTURE_MODE || 'webhook',

  // OSC forwarding (for TouchDesigner, Max/MSP, etc.)
  oscEnabled: process.env.OSC_ENABLED === 'true',
  oscOutHost: process.env.OSC_OUT_HOST || '127.0.0.1',
  oscOutPort: parseInt(process.env.OSC_OUT_PORT) || 9000,
  oscInPort: parseInt(process.env.OSC_IN_PORT) || 9001,

  // Processing
  processingTimeoutMs: parseInt(process.env.TIMEOUT_MS) || 30000,
  screenshotDelayMs: parseInt(process.env.SCREENSHOT_DELAY_MS) || 5000,

  // Verbose logging
  verbose: process.argv.includes('--verbose')
};

// ============ HUB BRIDGE CLASS ============

class HubBridge extends EventEmitter {
  constructor(cfg) {
    super();
    this.config = cfg;
    this.hubSocket = null;
    this.connected = false;
    this.processing = false;
    this.currentMessage = null;
    this.oscClient = null;
    this.oscServer = null;
    this.stats = {
      messagesReceived: 0,
      outputsSent: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  // ---- HUB CONNECTION ----

  connectToHub() {
    console.log(`[BRIDGE] Connecting to Hub at ${this.config.hubUrl}`);

    this.hubSocket = io(this.config.hubUrl, {
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
      timeout: 10000
    });

    this.hubSocket.on('connect', () => {
      this.connected = true;
      console.log(`[BRIDGE] Connected to Hub`);

      this.hubSocket.emit('identify', {
        role: 'module',
        moduleId: this.config.moduleId,
        name: this.config.moduleName,
        modulePort: this.config.localPort
      });
    });

    this.hubSocket.on('disconnect', () => {
      this.connected = false;
      console.log('[BRIDGE] Disconnected from Hub');
    });

    this.hubSocket.on('process-message', (data) => {
      this.handleIncomingMessage(data);
    });

    // Heartbeat
    this.heartbeatInterval = setInterval(() => {
      if (this.connected && this.hubSocket) {
        this.hubSocket.emit('heartbeat');
      }
    }, 30000);
  }

  // ---- MESSAGE HANDLING ----

  async handleIncomingMessage(data) {
    const { id, content, messageId } = data;
    this.stats.messagesReceived++;
    this.processing = true;
    this.currentMessage = data;

    console.log(`[BRIDGE] Received message ${id?.slice(0, 8)}: "${(content || '').slice(0, 60)}"`);

    const startTime = Date.now();

    try {
      // Forward to local tools
      if (this.config.oscEnabled && this.oscClient) {
        this.forwardViaOSC(data);
      }

      // Emit locally for any webhook/HTTP listeners
      this.emit('message', data);

      // Wait for output based on capture mode
      const output = await this.waitForOutput(data);

      const processingTime = Date.now() - startTime;

      // Send result back to Hub
      this.hubSocket.emit('message-processed', {
        messageId: id,
        output,
        processingTime
      });

      this.stats.outputsSent++;
      this.processing = false;
      this.currentMessage = null;

      console.log(`[BRIDGE] Output sent (${output.type}) in ${processingTime}ms`);
    } catch (err) {
      this.stats.errors++;
      this.processing = false;
      this.currentMessage = null;

      console.error(`[BRIDGE] Processing error:`, err.message);

      this.hubSocket.emit('processing-error', {
        messageId: id,
        error: err.message
      });
    }
  }

  // ---- OUTPUT CAPTURE ----

  waitForOutput(message) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Output capture timed out'));
      }, this.config.processingTimeoutMs);

      const cleanup = () => {
        clearTimeout(timeout);
        this.removeAllListeners('output-ready');
      };

      switch (this.config.captureMode) {
        case 'webhook':
          // Wait for POST /api/output from the creative tool
          this.once('output-ready', (output) => {
            cleanup();
            resolve(output);
          });
          break;

        case 'screenshot':
          // Take a screenshot after a delay
          setTimeout(async () => {
            try {
              const output = await this.captureScreenshot();
              cleanup();
              resolve(output);
            } catch (e) {
              cleanup();
              reject(e);
            }
          }, this.config.screenshotDelayMs);
          break;

        case 'manual':
          // Wait for manual trigger via local web UI
          this.once('output-ready', (output) => {
            cleanup();
            resolve(output);
          });
          break;

        default:
          cleanup();
          resolve({ type: 'text', content: `Bridge received: "${(message.content || '').slice(0, 100)}"` });
      }
    });
  }

  async captureScreenshot() {
    try {
      const screenshot = require('screenshot-desktop');
      const imgBuffer = await screenshot({ format: 'png' });
      const base64 = imgBuffer.toString('base64');
      return {
        type: 'image',
        url: `data:image/png;base64,${base64}`,
        content: 'Screenshot capture'
      };
    } catch (e) {
      console.warn('[BRIDGE] Screenshot failed, falling back to text:', e.message);
      return { type: 'text', content: 'Screenshot capture unavailable' };
    }
  }

  // ---- OSC FORWARDING ----

  setupOSC() {
    if (!this.config.oscEnabled) return;

    try {
      const { Client, Server } = require('node-osc');

      // Send messages to creative tool
      this.oscClient = new Client(this.config.oscOutHost, this.config.oscOutPort);
      console.log(`[OSC] Sending to ${this.config.oscOutHost}:${this.config.oscOutPort}`);

      // Receive responses from creative tool
      this.oscServer = new Server(this.config.oscInPort, '0.0.0.0');
      this.oscServer.on('message', (msg) => {
        if (this.config.verbose) console.log('[OSC] Received:', msg);
        this.handleOSCResponse(msg);
      });
      console.log(`[OSC] Listening on port ${this.config.oscInPort}`);
    } catch (e) {
      console.warn('[OSC] Failed to initialize:', e.message);
      console.warn('[OSC] Install node-osc: npm install node-osc');
    }
  }

  forwardViaOSC(data) {
    if (!this.oscClient) return;

    const text = data.content || data.message || '';
    const words = text.split(/\s+/).filter(Boolean);

    this.oscClient.send('/hub/message/id', data.id || '');
    this.oscClient.send('/hub/message/text', text);
    this.oscClient.send('/hub/message/length', text.length);
    this.oscClient.send('/hub/message/words', words.length);
    this.oscClient.send('/hub/trigger', 1);

    if (this.config.verbose) {
      console.log(`[OSC] Forwarded message: "${text.slice(0, 40)}..."`);
    }
  }

  handleOSCResponse(msg) {
    const [address, ...args] = msg;

    if (address === '/hub/output/text') {
      this.emit('output-ready', { type: 'text', content: args.join(' ') });
    } else if (address === '/hub/output/image') {
      this.emit('output-ready', { type: 'image', url: args[0] });
    } else if (address === '/hub/output/html') {
      this.emit('output-ready', { type: 'html', content: args.join(' ') });
    } else if (address === '/hub/output/video') {
      this.emit('output-ready', { type: 'video', url: args[0] });
    }
  }

  // ---- SHUTDOWN ----

  async shutdown() {
    console.log('[BRIDGE] Shutting down...');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.oscServer) {
      this.oscServer.close();
    }

    if (this.hubSocket) {
      this.hubSocket.disconnect();
    }

    console.log('[BRIDGE] Shutdown complete');
  }
}

// ============ LOCAL WEB SERVER ============

function startLocalServer(bridge) {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Serve local config UI
  app.use(express.static(path.join(__dirname, 'public')));

  // Status endpoint
  app.get('/api/status', (req, res) => {
    res.json({
      connected: bridge.connected,
      processing: bridge.processing,
      currentMessage: bridge.currentMessage ? {
        id: bridge.currentMessage.id,
        content: (bridge.currentMessage.content || '').slice(0, 100)
      } : null,
      config: {
        hubUrl: bridge.config.hubUrl,
        moduleName: bridge.config.moduleName,
        moduleId: bridge.config.moduleId,
        captureMode: bridge.config.captureMode,
        oscEnabled: bridge.config.oscEnabled
      },
      stats: bridge.stats,
      uptime: Math.round((Date.now() - bridge.stats.startTime) / 1000)
    });
  });

  // Webhook endpoint — creative tools POST output here
  app.post('/api/output', (req, res) => {
    const { type, content, url } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Output type required (text, image, html, video)' });
    }

    const output = { type };
    if (content) output.content = content;
    if (url) output.url = url;

    bridge.emit('output-ready', output);

    console.log(`[WEBHOOK] Received ${type} output from creative tool`);
    res.json({ success: true, received: type });
  });

  // Image upload endpoint (base64 or multipart)
  app.post('/api/output/image', (req, res) => {
    const { base64, url, caption } = req.body;

    if (!base64 && !url) {
      return res.status(400).json({ error: 'Provide base64 or url' });
    }

    const output = {
      type: 'image',
      url: url || `data:image/png;base64,${base64}`,
      content: caption || ''
    };

    bridge.emit('output-ready', output);
    console.log('[WEBHOOK] Received image output');
    res.json({ success: true });
  });

  // Manual trigger from local UI
  app.post('/api/trigger', (req, res) => {
    const { type, content, url } = req.body;
    bridge.emit('output-ready', { type: type || 'text', content, url });
    res.json({ success: true });
  });

  // Get current message being processed
  app.get('/api/current-message', (req, res) => {
    if (bridge.currentMessage) {
      res.json(bridge.currentMessage);
    } else {
      res.json({ message: null });
    }
  });

  app.listen(bridge.config.localPort, () => {
    console.log(`[BRIDGE] Local server: http://localhost:${bridge.config.localPort}`);
    console.log(`[BRIDGE] Webhook endpoint: POST http://localhost:${bridge.config.localPort}/api/output`);
  });

  return app;
}

// ============ LOCAL CONFIG UI ============

function createLocalUI(bridge) {
  const publicDir = path.join(__dirname, 'public');
  const fs = require('fs');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const htmlPath = path.join(publicDir, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    fs.writeFileSync(htmlPath, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hub Bridge</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0a0a0a;color:#e0e0e0;padding:24px}
    h1{font-size:1.3rem;color:#10b981;margin-bottom:4px}
    .sub{font-size:0.8rem;color:#555;margin-bottom:20px}
    .card{background:#111;border:1px solid #333;border-radius:10px;padding:16px;margin-bottom:16px}
    .card h2{font-size:0.9rem;margin-bottom:12px;color:#888}
    .stat{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1a1a1a;font-size:0.85rem}
    .stat .val{color:#f59e0b;font-weight:600}
    .dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px}
    .dot.on{background:#10b981} .dot.off{background:#ef4444}
    .msg{background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:12px;font-size:0.85rem;margin-top:8px;min-height:40px;color:#ccc}
    .btn{padding:8px 16px;border-radius:6px;border:1px solid #555;background:#333;color:#fff;cursor:pointer;font-size:0.8rem;margin-right:8px}
    .btn:hover{background:#444} .btn.primary{background:#3b82f6;border-color:#3b82f6}
    input,textarea{width:100%;padding:8px;background:#1a1a1a;border:1px solid #444;border-radius:6px;color:#fff;font-size:0.85rem;margin-bottom:8px}
  </style>
</head>
<body>
  <h1>Hub Bridge</h1>
  <p class="sub" id="moduleName">Connecting...</p>

  <div class="card">
    <h2>Connection</h2>
    <div class="stat"><span><span class="dot" id="hubDot"></span>Hub</span><span class="val" id="hubStatus">...</span></div>
    <div class="stat"><span>Module ID</span><span class="val" id="moduleId">...</span></div>
    <div class="stat"><span>Capture Mode</span><span class="val" id="captureMode">...</span></div>
    <div class="stat"><span>Messages</span><span class="val" id="msgCount">0</span></div>
    <div class="stat"><span>Outputs Sent</span><span class="val" id="outCount">0</span></div>
    <div class="stat"><span>Uptime</span><span class="val" id="uptime">0s</span></div>
  </div>

  <div class="card">
    <h2>Current Message</h2>
    <div class="msg" id="currentMsg">Waiting for message...</div>
  </div>

  <div class="card">
    <h2>Manual Output</h2>
    <textarea id="manualText" rows="3" placeholder="Type output text..."></textarea>
    <button class="btn primary" onclick="sendManual()">Send Text Output</button>
    <button class="btn" onclick="sendManual('html')">Send as HTML</button>
  </div>

  <script>
    async function refresh(){
      try{
        const r=await fetch('/api/status');const d=await r.json();
        document.getElementById('hubDot').className='dot '+(d.connected?'on':'off');
        document.getElementById('hubStatus').textContent=d.connected?'Connected':'Disconnected';
        document.getElementById('moduleName').textContent=d.config.moduleName+' — '+d.config.hubUrl;
        document.getElementById('moduleId').textContent=d.config.moduleId;
        document.getElementById('captureMode').textContent=d.config.captureMode;
        document.getElementById('msgCount').textContent=d.stats.messagesReceived;
        document.getElementById('outCount').textContent=d.stats.outputsSent;
        document.getElementById('uptime').textContent=d.uptime+'s';
        if(d.currentMessage){
          document.getElementById('currentMsg').textContent=d.currentMessage.content;
        }else{
          document.getElementById('currentMsg').textContent='Waiting for message...';
        }
      }catch(e){}
    }
    async function sendManual(type){
      const text=document.getElementById('manualText').value;
      if(!text)return;
      await fetch('/api/trigger',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:type||'text',content:text})});
      document.getElementById('manualText').value='';
      refresh();
    }
    setInterval(refresh,2000);
    refresh();
  </script>
</body>
</html>`);
  }
}

// ============ MAIN ============

async function main() {
  console.log('=== Hub Bridge v1.0 ===');
  console.log(`Module: ${config.moduleName} (${config.moduleId})`);
  console.log(`Hub: ${config.hubUrl}`);
  console.log(`Capture: ${config.captureMode}`);
  console.log(`OSC: ${config.oscEnabled ? `${config.oscOutHost}:${config.oscOutPort}` : 'disabled'}`);
  console.log('');

  const bridge = new HubBridge(config);

  // Create local UI files if needed
  createLocalUI(bridge);

  // Start local web server
  startLocalServer(bridge);

  // Setup OSC if enabled
  bridge.setupOSC();

  // Connect to Hub
  bridge.connectToHub();

  // Graceful shutdown
  const shutdown = async () => {
    await bridge.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(console.error);
