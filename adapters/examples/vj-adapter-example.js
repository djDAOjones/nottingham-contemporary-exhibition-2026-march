// Example: VJ Software Adapter using OSC
// For connecting to TouchDesigner, Resolume, MadMapper, etc.

const OSCAdapter = require('../osc-adapter');

// VJ-specific configuration
const vjAdapter = new OSCAdapter({
  name: 'TouchDesigner VJ',
  moduleId: 'vj-touchdesigner',
  port: 3003,
  
  // OSC Configuration for TouchDesigner
  oscOutHost: 'localhost',
  oscOutPort: 9000,        // TouchDesigner input port
  oscInPort: 9001,         // TouchDesigner output port
  oscAddressPrefix: '/td/visual',
  
  // Hub connection
  hubUrl: 'ws://192.168.1.252:3000'
});

// Override translation for VJ-specific data
vjAdapter.translateToExternal = function(message) {
  const baseTranslation = OSCAdapter.prototype.translateToExternal.call(this, message);
  
  // Add VJ-specific data analysis
  const colors = this.extractColors(message.content);
  const energy = this.calculateEnergy(message.content);
  const mood = this.analyzeMood(message.content);
  
  return {
    ...baseTranslation,
    colors: colors,       // RGB values for color mapping
    energy: energy,       // 0-1 for brightness/intensity
    mood: mood,          // emotional mapping
    bpm: this.suggestBPM(message.content), // rhythm suggestion
    visual_style: this.determineStyle(message.content)
  };
};

// VJ-specific analysis methods
vjAdapter.extractColors = function(text) {
  const colorMappings = {
    'fire': [255, 100, 0],
    'ocean': [0, 150, 255],
    'forest': [50, 200, 50],
    'sunset': [255, 150, 50],
    'night': [20, 20, 100],
    'gold': [255, 215, 0]
  };
  
  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (colorMappings[word]) {
      return colorMappings[word];
    }
  }
  
  // Default: map sentiment to color
  const sentiment = this.analyzeSentiment(text);
  if (sentiment > 0.3) return [255, 200, 100]; // Warm
  if (sentiment < -0.3) return [100, 100, 255]; // Cool
  return [150, 150, 150]; // Neutral
};

vjAdapter.calculateEnergy = function(text) {
  const energyWords = ['explosion', 'fast', 'rush', 'burst', 'lightning', 'thunder'];
  const calmWords = ['gentle', 'soft', 'whisper', 'calm', 'peaceful', 'still'];
  
  const words = text.toLowerCase().split(/\s+/);
  let energy = 0.5; // Base energy
  
  words.forEach(word => {
    if (energyWords.includes(word)) energy += 0.1;
    if (calmWords.includes(word)) energy -= 0.1;
  });
  
  return Math.max(0, Math.min(1, energy));
};

vjAdapter.analyzeMood = function(text) {
  const moods = {
    'ethereal': ['dream', 'float', 'cloud', 'sky', 'heaven'],
    'dramatic': ['storm', 'thunder', 'clash', 'intense', 'powerful'],
    'organic': ['grow', 'bloom', 'nature', 'tree', 'flower'],
    'geometric': ['sharp', 'angle', 'structure', 'pattern', 'grid'],
    'fluid': ['water', 'flow', 'wave', 'liquid', 'stream']
  };
  
  const words = text.toLowerCase().split(/\s+/);
  for (const [mood, keywords] of Object.entries(moods)) {
    if (keywords.some(keyword => words.includes(keyword))) {
      return mood;
    }
  }
  
  return 'abstract';
};

vjAdapter.suggestBPM = function(text) {
  const fastWords = ['fast', 'quick', 'rush', 'race', 'speed'];
  const slowWords = ['slow', 'gentle', 'calm', 'peaceful', 'rest'];
  
  const words = text.toLowerCase();
  if (fastWords.some(word => words.includes(word))) return 140;
  if (slowWords.some(word => words.includes(word))) return 60;
  return 120; // Default BPM
};

vjAdapter.determineStyle = function(text) {
  const styles = {
    'particle': ['star', 'dust', 'spark', 'dot', 'point'],
    'fractal': ['pattern', 'repeat', 'infinite', 'spiral', 'branch'],
    'fluid': ['water', 'wave', 'flow', 'liquid', 'pour'],
    'geometric': ['cube', 'triangle', 'square', 'angle', 'sharp'],
    'organic': ['grow', 'cell', 'life', 'breath', 'pulse']
  };
  
  const words = text.toLowerCase().split(/\s+/);
  for (const [style, keywords] of Object.entries(styles)) {
    if (keywords.some(keyword => words.includes(keyword))) {
      return style;
    }
  }
  
  return 'abstract';
};

// Enhanced OSC message sending for VJ
vjAdapter.sendToExternalModule = async function(message) {
  if (!this.oscClient) {
    throw new Error('OSC client not initialized');
  }

  // Send comprehensive VJ data
  this.oscClient.send('/td/visual/text', message.content);
  this.oscClient.send('/td/visual/colors', ...message.colors);
  this.oscClient.send('/td/visual/energy', message.energy);
  this.oscClient.send('/td/visual/mood', message.mood);
  this.oscClient.send('/td/visual/bpm', message.bpm);
  this.oscClient.send('/td/visual/style', message.visual_style);
  this.oscClient.send('/td/visual/sentiment', message.sentiment);
  this.oscClient.send('/td/visual/trigger', 1);
  
  console.log(`[${this.config.name}] Sent VJ data: energy=${message.energy}, mood=${message.mood}, style=${message.visual_style}`);
  
  return {
    type: 'vj_visual',
    message: 'Visual data sent to TouchDesigner',
    data: {
      colors: message.colors,
      energy: message.energy,
      mood: message.mood,
      style: message.visual_style
    }
  };
};

// Start the adapter
if (require.main === module) {
  vjAdapter.start().catch(error => {
    console.error('Failed to start VJ adapter:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down VJ adapter...');
    vjAdapter.shutdown().then(() => {
      process.exit(0);
    });
  });
}

module.exports = vjAdapter;
