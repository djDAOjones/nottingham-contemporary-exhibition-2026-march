# External Artist Module Template

A comprehensive template system for integrating external artists and their creative tools with Hub v2. This template provides a standardized framework for artists to create modules that can seamlessly interact with the exhibition system.

## Overview

The External Artist Module Template enables artists to:
- Connect their creative tools and workflows to Hub v2
- Process audience submissions and generate artistic responses
- Maintain their unique creative identity within the system
- Handle both reactive and generative creative modes

## Architecture

```
external-artist-module/
├── base-artist-module.js      # Core template class
├── examples/                  # Example implementations
│   ├── ian-artist-module.js           # Generative art example
│   └── gravity-sketch-artist-module.js # VR/3D example
├── package.json              # Template dependencies
├── README.md                 # This documentation
└── ARTIST_GUIDE.md          # Step-by-step guide for artists
```

## Features

### Core Template (`BaseArtistModule`)

- **Hub v2 Integration**: Seamless connection to the exhibition system
- **Message Processing**: Queue management and timeout handling  
- **Artist Identity**: Maintain unique creative branding and style
- **Flexible Modes**: Support for reactive, generative, and hybrid workflows
- **Error Handling**: Robust error recovery and logging
- **Statistics Tracking**: Performance metrics and creative analytics

### Processing Modes

1. **Reactive**: Responds to each audience submission individually
2. **Generative**: Creates content based on accumulated input patterns
3. **Hybrid**: Combines reactive responses with generative evolution

### Output Formats

- **Visual**: 2D graphics, generative art, digital paintings
- **Audio**: Music, soundscapes, spoken word
- **Mixed**: Combined media experiences
- **Data**: Structured creative information

## Quick Start

### 1. Create Your Artist Module

```javascript
const BaseArtistModule = require('./base-artist-module');

class MyArtistModule extends BaseArtistModule {
  constructor(config = {}) {
    super({
      name: 'My Creative Module',
      artistName: 'Your Name',
      processingMode: 'reactive',
      outputFormat: 'visual',
      ...config
    });
  }

  async initializeArtistTools() {
    // Initialize your creative tools here
    console.log('Setting up creative environment...');
  }

  async processMessage(message) {
    // Your creative interpretation logic
    const analysis = this.extractThemes(message.content);
    const creation = await this.createArtwork(analysis);
    return creation;
  }
}
```

### 2. Configure Your Module

```javascript
const config = {
  hubUrl: 'ws://localhost:3000',
  port: 3004, // Choose unique port
  maxProcessingTime: 45000, // 45 seconds
  
  creativeSettings: {
    style: 'abstract',
    complexity: 'medium',
    colorPalette: 'vibrant'
  },
  
  toolIntegration: {
    photoshop: true,
    blender: false,
    customAPI: true
  }
};

const myModule = new MyArtistModule(config);
await myModule.start();
```

### 3. Launch Your Module

```bash
node my-artist-module.js
```

## Example Implementations

### Ian's Generative Art Module

Demonstrates computational design principles:
- Multiple algorithmic approaches (flow, particles, geometric, organic, data viz)
- Text analysis for visual parameter extraction
- Color theory and composition optimization
- Performance metrics and creative statistics

**Key Features:**
- 5 generation algorithms
- Adaptive color schemes
- Complexity assessment
- Motion and energy analysis

### Gravity Sketch VR Module  

Shows immersive 3D/VR creation:
- Spatial design techniques
- Material and lighting systems
- VR interaction design
- Multi-scale creation (micro to cosmic)

**Key Features:**
- 6 spatial creation techniques
- VR experience design
- 3D material libraries
- Immersive interaction systems

## Configuration Options

### Basic Settings

```javascript
{
  name: 'Your Module Name',
  artistName: 'Your Artist Name',
  moduleId: 'unique-module-id',
  version: '1.0.0',
  hubUrl: 'ws://localhost:3000',
  port: 3004
}
```

### Creative Settings

```javascript
{
  processingMode: 'reactive' | 'generative' | 'hybrid',
  outputFormat: 'visual' | 'audio' | 'mixed' | 'data',
  maxProcessingTime: 30000, // milliseconds
  
  creativeSettings: {
    // Your custom creative parameters
    style: 'abstract',
    complexity: 'high',
    colorScheme: 'warm'
  }
}
```

### Tool Integration

```javascript
{
  toolIntegration: {
    // Specify which tools your module uses
    processingJs: true,
    blender: false,
    customAPI: true,
    externalService: false
  }
}
```

## API Reference

### Core Methods

#### `async initializeArtistTools()`
Initialize your creative tools and setup. Called once during module startup.

#### `async processMessage(message)`
Main creative processing method. Receives audience submissions and returns artistic creations.

**Parameters:**
- `message`: Object containing `{id, content, timestamp, metadata}`

**Returns:**
- Artistic creation object with your custom structure

#### `async shutdownArtistTools()`
Cleanup method called during module shutdown. Override for custom cleanup.

### Utility Methods

#### `extractThemes(text)`
Extract color, emotion, object, and action themes from text.

#### `calculateSentiment(text)` 
Calculate sentiment score (-1 to 1) from text content.

#### `generateSeedFromText(text)`
Generate reproducible random seed from text for consistent results.

#### `logActivity(activity, data)`
Log artist-specific activities with custom data.

### Formatting Methods

Override these to customize your module's visual presentation:

#### `generateDisplayContent(artistResult)`
Generate the main display text for your creation.

#### `describeCreativeProcess(artistResult)`  
Describe how you created the artwork.

#### `getTechnicalDetails(artistResult)`
Provide technical information about your creation process.

#### `getArtistStyle()`
Return CSS-style object for visual customization.

## Message Processing Flow

1. **Receive Message**: Hub v2 sends audience submission
2. **Queue Management**: Message added to processing queue
3. **Analysis Phase**: Extract themes, sentiment, and creative parameters
4. **Creation Phase**: Generate artistic response using your methods
5. **Formatting**: Format output for Hub v2 display system
6. **Response**: Send completed creation back to Hub v2

## Error Handling

The template provides comprehensive error handling:
- **Timeout Protection**: Prevents infinite processing
- **Queue Management**: Handles message backlog gracefully  
- **Recovery Systems**: Automatic reconnection to Hub v2
- **Logging**: Detailed error tracking and statistics

## Performance Monitoring

Built-in metrics tracking:
- Messages processed
- Average processing time
- Success/failure rates
- Artist-specific statistics
- Uptime monitoring

## Integration with Hub v2

### Module Registration

Modules automatically register with Hub v2 on connection:
```javascript
{
  role: 'module',
  name: 'Your Module Name',
  artistName: 'Your Name', 
  capabilities: ['text_interpretation', 'visual_creation'],
  processingMode: 'reactive'
}
```

### Heartbeat System

Modules send regular status updates:
- Online/offline status
- Current processing state
- Performance statistics
- Queue length

### Message Protocol

Standard message format between Hub v2 and artist modules:
```javascript
// Incoming from Hub v2
{
  id: 'unique-message-id',
  content: 'audience submission text',
  timestamp: 1234567890,
  metadata: { /* additional data */ }
}

// Outgoing to Hub v2  
{
  messageId: 'original-message-id',
  output: { /* formatted creation */ },
  processingTime: 5000,
  moduleId: 'your-module-id'
}
```

## Best Practices

### Creative Process
- **Consistent Style**: Maintain your artistic identity
- **Performance**: Optimize for exhibition response times
- **Accessibility**: Consider diverse audience needs
- **Variability**: Ensure diverse outputs for similar inputs

### Technical Implementation
- **Error Handling**: Always wrap creative processes in try/catch
- **Resource Management**: Clean up tools and memory properly
- **Logging**: Use provided logging for debugging
- **Testing**: Test with various input types and edge cases

### Exhibition Context
- **Response Time**: Keep processing under 30 seconds when possible
- **Queue Awareness**: Handle message backlogs gracefully
- **Hub Integration**: Follow Hub v2 protocols exactly
- **Monitoring**: Track your module's performance

## Troubleshooting

### Common Issues

**Module won't connect to Hub v2:**
- Check Hub v2 is running on correct port
- Verify network connectivity
- Check for port conflicts

**Processing timeouts:**
- Reduce complexity in creative algorithms
- Increase `maxProcessingTime` if needed
- Optimize resource-intensive operations

**Memory leaks:**
- Properly cleanup in `shutdownArtistTools()`
- Avoid accumulating large data structures
- Monitor memory usage during development

### Debug Mode

Enable detailed logging:
```javascript
const module = new YourArtistModule({
  logLevel: 'debug',
  enablePerformanceTracking: true
});
```

## Contributing

To contribute improvements to the template:

1. Test with multiple artist implementations
2. Maintain backward compatibility
3. Document new features thoroughly
4. Include example usage

## License

MIT License - Feel free to adapt for your artistic practice.

## Support

For technical support or creative guidance:
- Check the `examples/` directory for reference implementations
- Review the `ARTIST_GUIDE.md` for step-by-step instructions
- Examine Hub v2 documentation for system integration details

---

*Created for the Nottingham Contemporary AI Exhibition - enabling seamless integration between human creativity and AI exhibition systems.*
