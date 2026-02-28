# External Module Adapters

Protocol translation system for integrating external creative modules with Hub v2.

## Overview

The adapter system allows Hub v2 to communicate with external creative software using various protocols:
- **HTTP REST** - For web APIs and services
- **WebSocket** - For real-time bidirectional communication  
- **OSC** - For creative software like TouchDesigner, Max/MSP, VJ software

## Architecture

```
Hub v2 ←→ Adapter ←→ External Module
        WebSocket    HTTP/WS/OSC
```

Each adapter:
1. Connects to Hub v2 via WebSocket
2. Translates Hub messages to external protocol
3. Sends translated messages to external module
4. Receives responses and translates back to Hub format

## Quick Start

### 1. Install Dependencies

```bash
npm install axios ws node-osc socket.io-client
```

### 2. Create Configuration

Copy `adapter-config.example.json` to `adapter-config.json` and configure for your setup:

```json
{
  "adapters": [
    {
      "id": "vj-touchdesigner",
      "type": "osc", 
      "name": "TouchDesigner VJ",
      "oscOutHost": "192.168.1.100",
      "oscOutPort": 9000,
      "hubUrl": "ws://192.168.1.252:3000"
    }
  ]
}
```

### 3. Start Adapters

```javascript
const AdapterManager = require('./adapter-manager');
const manager = new AdapterManager();

// Load and start from config
const config = require('./adapter-config.json');
await manager.startAdapters(config.adapters);
```

## Adapter Types

### HTTP Adapter

For REST APIs and web services:

```javascript
const HttpAdapter = require('./http-adapter');

const adapter = new HttpAdapter({
  name: 'My API Module',
  httpEndpoint: 'http://localhost:8080/process',
  httpMethod: 'POST',
  hubUrl: 'ws://localhost:3000'
});

await adapter.start();
```

**Message Flow:**
1. Hub message → JSON POST request
2. HTTP response → Hub result format

### WebSocket Adapter

For real-time communication:

```javascript
const WebSocketAdapter = require('./websocket-adapter');

const adapter = new WebSocketAdapter({
  name: 'My WebSocket Module',
  wsUrl: 'ws://localhost:8080',
  hubUrl: 'ws://localhost:3000'
});

await adapter.start();
```

**Message Flow:**
1. Hub message → WebSocket JSON message
2. WebSocket response → Hub result format

### OSC Adapter

For creative software (TouchDesigner, Max/MSP, etc.):

```javascript
const OSCAdapter = require('./osc-adapter');

const adapter = new OSCAdapter({
  name: 'TouchDesigner',
  oscOutHost: 'localhost',
  oscOutPort: 9000,
  oscInPort: 9001,
  oscAddressPrefix: '/td/visual',
  hubUrl: 'ws://localhost:3000'
});

await adapter.start();
```

**Message Flow:**
1. Hub message → Multiple OSC messages with analyzed data
2. Optional OSC response → Hub result format

## Message Translation

### Hub v2 Input Format
```javascript
{
  id: "msg-12345",
  content: "A beautiful sunset over the ocean",
  timestamp: 1640995200000
}
```

### OSC Output Example (TouchDesigner)
```
/td/visual/content "A beautiful sunset over the ocean"
/td/visual/colors [255, 150, 50]  // Extracted colors
/td/visual/energy 0.7             // Energy level 0-1
/td/visual/mood "ethereal"        // Detected mood
/td/visual/trigger 1              // Processing trigger
```

### HTTP Output Example (Gravity Sketch)
```javascript
{
  request_id: "msg-12345",
  text_prompt: "A beautiful sunset over the ocean",
  creation_params: {
    shapes: ["sphere", "organic"],
    materials: "glass",
    scale: "large",
    movement_type: "float",
    style: "realistic"
  }
}
```

## Custom Adapters

Extend `BaseAdapter` for custom protocols:

```javascript
const BaseAdapter = require('./base-adapter');

class CustomAdapter extends BaseAdapter {
  constructor(config) {
    super({
      name: 'Custom Protocol',
      protocol: 'custom',
      ...config
    });
  }

  async sendToExternalModule(message) {
    // Implement your protocol here
    const result = await this.customProtocolSend(message);
    return result;
  }

  translateToExternal(message) {
    // Convert Hub format to your format
    return {
      custom_field: message.content,
      timestamp: message.timestamp
    };
  }

  translateFromExternal(result, originalMessage) {
    // Convert your format back to Hub format
    return {
      type: 'custom',
      content: result.output,
      metadata: {
        adapter: this.config.name,
        originalMessageId: originalMessage.id
      }
    };
  }
}
```

## Examples

### VJ Software (TouchDesigner)

See `examples/vj-adapter-example.js` for a complete TouchDesigner integration that:
- Analyzes text for colors, energy, mood
- Sends comprehensive visual data via OSC
- Maps sentiment to visual parameters

### VR Creation (Gravity Sketch)

See `examples/gravity-sketch-adapter.js` for VR integration that:
- Extracts 3D shapes and materials from text
- Determines scale and movement patterns
- Creates VR sketches via HTTP API

## Network Configuration

### Hub Server
- Default: `192.168.1.252:3000`
- WebSocket endpoint for adapter connections

### External Modules
- Recommended range: `192.168.1.100-150`
- Each module on separate IP for clarity
- Configure firewalls to allow adapter ports

### Port Allocation
- `3001-3008`: Hub module ports (reserved)
- `8000-8100`: External module HTTP/WebSocket
- `9000-9100`: OSC communications

## Monitoring

### Adapter Status
```javascript
const stats = manager.getAdapterStats();
console.log(stats);
```

Output:
```javascript
{
  total: 5,
  running: 3,
  types: { osc: 2, http: 2, websocket: 1 },
  adapters: [
    {
      id: "vj-touchdesigner",
      name: "TouchDesigner VJ", 
      type: "osc",
      running: true,
      runtime: {
        messagesReceived: 45,
        messagesProcessed: 43,
        errors: 2,
        uptime: 120000
      }
    }
  ]
}
```

### Hub v2 Integration

Adapters appear as regular modules in the Hub v2 system:
- Show in module status dashboard
- Support drag-and-drop reordering
- Included in safe mode configuration
- Full heartbeat monitoring

## Troubleshooting

### Connection Issues
1. Check network connectivity to external module
2. Verify firewall settings for adapter ports
3. Confirm external module is running and responsive
4. Check Hub v2 connection status

### Message Processing
1. Enable debug logging in adapter config
2. Monitor external module logs
3. Verify message format compatibility
4. Test with simple messages first

### Performance
1. Monitor processing times in adapter stats
2. Adjust timeout values for slow modules
3. Use connection pooling for HTTP adapters
4. Implement queuing for high-volume scenarios

## Development

### Testing Adapters
1. Use Hub v2 local submission for testing
2. Create mock external modules for development
3. Test network connectivity separately
4. Verify message translations manually

### Adding New Protocols
1. Extend `BaseAdapter` class
2. Implement protocol-specific communication
3. Add translation methods
4. Register with `AdapterManager`
5. Create example configuration

### Contributing
1. Follow existing adapter patterns
2. Include comprehensive error handling
3. Add logging for debugging
4. Document configuration options
5. Provide usage examples
