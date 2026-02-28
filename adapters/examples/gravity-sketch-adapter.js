// Example: Gravity Sketch VR Adapter
// For connecting to Gravity Sketch via HTTP API or WebSocket

const HttpAdapter = require('../http-adapter');

// Gravity Sketch specific configuration
const gravityAdapter = new HttpAdapter({
  name: 'Gravity Sketch VR',
  moduleId: 'gravity-sketch',
  port: 3004,
  
  // Gravity Sketch API Configuration
  httpEndpoint: 'http://localhost:8080/api/create-sketch',
  httpMethod: 'POST',
  httpTimeout: 45000, // VR creation takes time
  httpHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-GravitySketch-Source': 'hub-v2'
  },
  
  // Hub connection
  hubUrl: 'ws://192.168.1.252:3000'
});

// Override translation for 3D/VR-specific data
gravityAdapter.translateToExternal = function(message) {
  const shapes = this.extractShapes(message.content);
  const materials = this.suggestMaterials(message.content);
  const scale = this.determineScale(message.content);
  const movement = this.analyzeMovement(message.content);
  
  return {
    request_id: message.id,
    text_prompt: message.content,
    creation_params: {
      shapes: shapes,
      materials: materials,
      scale: scale,
      movement_type: movement,
      duration: 30, // seconds for animated sketches
      style: this.determineArtStyle(message.content),
      complexity: this.assessComplexity(message.content)
    },
    metadata: {
      timestamp: message.timestamp,
      source: 'art-installation-hub'
    }
  };
};

// 3D/VR-specific analysis methods
gravityAdapter.extractShapes = function(text) {
  const shapeKeywords = {
    'sphere': ['ball', 'round', 'circle', 'bubble', 'planet', 'orb'],
    'cube': ['box', 'square', 'block', 'building', 'room'],
    'cylinder': ['tube', 'pipe', 'column', 'tower'],
    'pyramid': ['triangle', 'peak', 'mountain', 'point'],
    'torus': ['ring', 'donut', 'loop', 'circle'],
    'organic': ['tree', 'flower', 'cloud', 'wave', 'curve']
  };
  
  const words = text.toLowerCase().split(/\s+/);
  const detectedShapes = [];
  
  for (const [shape, keywords] of Object.entries(shapeKeywords)) {
    if (keywords.some(keyword => words.includes(keyword))) {
      detectedShapes.push(shape);
    }
  }
  
  return detectedShapes.length > 0 ? detectedShapes : ['organic'];
};

gravityAdapter.suggestMaterials = function(text) {
  const materials = {
    'metal': ['steel', 'iron', 'bronze', 'copper', 'gold', 'silver', 'metallic'],
    'glass': ['crystal', 'transparent', 'clear', 'ice', 'water'],
    'wood': ['tree', 'forest', 'natural', 'brown', 'grain'],
    'stone': ['rock', 'marble', 'concrete', 'solid', 'heavy'],
    'fabric': ['soft', 'cloth', 'silk', 'cotton', 'flowing'],
    'energy': ['light', 'glow', 'bright', 'electric', 'plasma']
  };
  
  const words = text.toLowerCase();
  for (const [material, keywords] of Object.entries(materials)) {
    if (keywords.some(keyword => words.includes(keyword))) {
      return material;
    }
  }
  
  return 'mixed';
};

gravityAdapter.determineScale = function(text) {
  if (/tiny|small|miniature|micro/.test(text.toLowerCase())) return 'small';
  if (/huge|giant|massive|enormous|large/.test(text.toLowerCase())) return 'large';
  if (/building|mountain|city|world/.test(text.toLowerCase())) return 'architectural';
  return 'human';
};

gravityAdapter.analyzeMovement = function(text) {
  const movements = {
    'rotate': ['spin', 'turn', 'revolve', 'circle', 'twist'],
    'float': ['hover', 'fly', 'lift', 'rise', 'suspend'],
    'pulse': ['beat', 'throb', 'rhythm', 'heartbeat', 'vibrate'],
    'flow': ['stream', 'river', 'pour', 'liquid', 'wave'],
    'grow': ['expand', 'bloom', 'spread', 'increase', 'evolve']
  };
  
  const words = text.toLowerCase().split(/\s+/);
  for (const [movement, keywords] of Object.entries(movements)) {
    if (keywords.some(keyword => words.includes(keyword))) {
      return movement;
    }
  }
  
  return 'static';
};

gravityAdapter.determineArtStyle = function(text) {
  const styles = {
    'abstract': ['abstract', 'conceptual', 'surreal', 'dream'],
    'realistic': ['real', 'detailed', 'photorealistic', 'accurate'],
    'minimalist': ['simple', 'clean', 'minimal', 'basic'],
    'complex': ['detailed', 'intricate', 'elaborate', 'ornate'],
    'organic': ['natural', 'flowing', 'curved', 'biological'],
    'geometric': ['angular', 'structured', 'precise', 'mathematical']
  };
  
  const words = text.toLowerCase();
  for (const [style, keywords] of Object.entries(styles)) {
    if (keywords.some(keyword => words.includes(keyword))) {
      return style;
    }
  }
  
  return 'mixed';
};

gravityAdapter.assessComplexity = function(text) {
  const wordCount = text.split(/\s+/).length;
  const uniqueWords = new Set(text.toLowerCase().split(/\s+/)).size;
  
  if (wordCount < 10) return 'simple';
  if (wordCount > 50 || uniqueWords > 30) return 'complex';
  return 'medium';
};

// Enhanced response translation for VR output
gravityAdapter.translateFromExternal = function(result, originalMessage) {
  if (result && typeof result === 'object') {
    // Handle VR creation response
    if (result.sketch_id || result.model_url) {
      return {
        type: 'vr_creation',
        content: `3D sketch created: ${result.title || 'Untitled'}`,
        data: {
          sketch_id: result.sketch_id,
          model_url: result.model_url,
          preview_url: result.preview_url,
          creation_time: result.creation_time,
          shapes_used: result.shapes_used,
          material: result.material,
          complexity_score: result.complexity_score
        },
        metadata: {
          adapter: this.config.name,
          protocol: this.config.protocol,
          originalMessageId: originalMessage.id,
          vr_platform: 'gravity_sketch'
        }
      };
    }

    // Handle error responses
    if (result.error) {
      return {
        type: 'error',
        content: `VR creation failed: ${result.error}`,
        data: {
          error_code: result.error_code,
          suggestion: result.suggestion
        },
        metadata: {
          adapter: this.config.name,
          protocol: this.config.protocol,
          originalMessageId: originalMessage.id
        }
      };
    }
  }

  // Fallback to parent implementation
  return HttpAdapter.prototype.translateFromExternal.call(this, result, originalMessage);
};

// Start the adapter
if (require.main === module) {
  gravityAdapter.start().catch(error => {
    console.error('Failed to start Gravity Sketch adapter:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down Gravity Sketch adapter...');
    gravityAdapter.shutdown().then(() => {
      process.exit(0);
    });
  });
}

module.exports = gravityAdapter;
