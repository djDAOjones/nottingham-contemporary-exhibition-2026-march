// Music Prompt Module - Hub v2 Integration
// Integrates music analysis with Hub v2 as a processing module

const io = require('socket.io-client');
const MusicAnalyzer = require('./music-analyzer');

class MusicPromptModule {
  constructor(config = {}) {
    this.config = {
      name: 'Music Prompt LLM',
      moduleId: 'music-prompt-llm',
      port: 3002,
      hubUrl: 'ws://localhost:3000',
      autoConnect: true,
      enableAdvancedAnalysis: true,
      generateMIDI: false, // Future feature
      ...config
    };
    
    this.hubSocket = null;
    this.connected = false;
    this.musicAnalyzer = new MusicAnalyzer();
    
    // Statistics
    this.stats = {
      analysesGenerated: 0,
      averageProcessingTime: 0,
      lastProcessingTime: 0,
      popularKeys: {},
      popularModes: {},
      uptime: 0,
      startTime: Date.now()
    };
  }

  // Connect to Hub v2
  async connectToHub() {
    if (this.connected) {
      console.log('[MusicModule] Already connected to hub');
      return;
    }

    try {
      console.log(`[MusicModule] Connecting to hub at ${this.config.hubUrl}`);
      
      this.hubSocket = io(this.config.hubUrl);

      this.hubSocket.on('connect', () => {
        console.log('[MusicModule] Connected to Hub v2');
        this.connected = true;
        
        // Identify as module
        this.hubSocket.emit('identify', {
          role: 'module',
          name: this.config.name,
          moduleId: this.config.moduleId,
          modulePort: this.config.port,
          capabilities: ['music_analysis', 'key_detection', 'mood_analysis', 'tempo_suggestion']
        });
      });

      this.hubSocket.on('disconnect', () => {
        console.log('[MusicModule] Disconnected from hub');
        this.connected = false;
      });

      // Handle incoming messages for processing
      this.hubSocket.on('process-message', async (message) => {
        await this.processMessage(message);
      });

      // Handle hub shutdown
      this.hubSocket.on('hub-shutdown', () => {
        console.log('[MusicModule] Hub is shutting down');
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
      console.error('[MusicModule] Failed to connect to hub:', error);
      throw error;
    }
  }

  // Process incoming message from hub
  async processMessage(message) {
    const startTime = Date.now();
    
    try {
      console.log(`[MusicModule] Processing message: ${message.id.slice(0, 8)}`);
      
      // Run musical analysis
      const analysis = await this.musicAnalyzer.analyzeText(message.content);
      
      // Generate musical output
      const result = this.formatMusicalOutput(analysis, message);
      
      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime, analysis);
      
      // Send result back to hub
      if (this.hubSocket && this.connected) {
        this.hubSocket.emit('message-processed', {
          messageId: message.id,
          output: result,
          processingTime: processingTime,
          moduleId: this.config.moduleId
        });
      }
      
      console.log(`[MusicModule] Completed analysis in ${processingTime}ms: ${analysis.musical_suggestions.key.key} ${analysis.musical_suggestions.mode.mode}`);
      
    } catch (error) {
      console.error('[MusicModule] Processing error:', error);
      
      // Send error to hub
      if (this.hubSocket && this.connected) {
        this.hubSocket.emit('processing-error', {
          messageId: message.id,
          error: error.message,
          moduleId: this.config.moduleId
        });
      }
    }
  }

  // Format musical output for display
  formatMusicalOutput(analysis, originalMessage) {
    const { key, mode, tempo, chord_progression, instruments } = analysis.musical_suggestions;
    
    // Create main display content
    let content = `🎵 **Musical Analysis**\n\n`;
    
    // Key and mode
    content += `**Key:** ${key.key.replace('_', ' ').toUpperCase()}\n`;
    content += `*${key.data.mood}*\n\n`;
    
    content += `**Mode:** ${mode.mode.charAt(0).toUpperCase() + mode.mode.slice(1)}\n`;
    content += `*${mode.character}*\n\n`;
    
    // Tempo
    content += `**Tempo:** ${tempo.bpm} BPM (${tempo.category.replace('_', ' ')})\n`;
    content += `*${tempo.mood}*\n\n`;
    
    // Chord progression
    content += `**Chord Progression:** ${chord_progression.chords.join(' → ')}\n`;
    content += `*${chord_progression.description}*\n\n`;
    
    // Instruments
    if (instruments.length > 0) {
      content += `**Suggested Instruments:** ${instruments.slice(0, 4).join(', ')}\n\n`;
    }
    
    // Creative direction
    const creative = analysis.creative_direction;
    content += `**Creative Direction:**\n`;
    content += `${creative.overall_concept}\n\n`;
    
    // Emotional mapping
    if (analysis.analysis.emotions.length > 0) {
      const primaryEmotion = analysis.analysis.emotions[0];
      content += `**Primary Emotion:** ${primaryEmotion.emotion} (${Math.round(primaryEmotion.intensity * 100)}%)\n`;
    }
    
    return {
      type: 'musical_analysis',
      content: content,
      data: {
        key: key.key,
        keyData: key.data,
        mode: mode.mode,
        modeData: mode,
        tempo: tempo,
        chordProgression: chord_progression,
        instruments: instruments,
        analysis: analysis.analysis,
        technicalSpecs: analysis.technical_specs,
        creativeDirection: analysis.creative_direction
      },
      metadata: {
        analyzer: this.config.name,
        version: '1.0.0',
        processingTime: Date.now() - originalMessage.timestamp,
        originalMessageId: originalMessage.id,
        confidence: key.confidence
      },
      style: {
        backgroundColor: this.getKeyColor(key.key),
        color: this.getContrastColor(key.key),
        border: `3px solid ${this.getModeColor(mode.mode)}`,
        borderRadius: '12px',
        fontFamily: 'Georgia, serif'
      }
    };
  }

  // Get color associated with musical key
  getKeyColor(keyName) {
    const keyColorMap = {
      'C_major': '#ffffff', 'A_minor': '#f0f0f0',
      'G_major': '#90ee90', 'E_minor': '#87ceeb',
      'D_major': '#ffd700', 'B_minor': '#4169e1',
      'A_major': '#ffa500', 'F#_minor': '#8b0000',
      'E_major': '#87cefa', 'C#_minor': '#8b008b',
      'B_major': '#0000ff', 'G#_minor': '#696969',
      'F#_major': '#c0c0c0', 'D#_minor': '#2f4f4f',
      'C#_major': '#f0f8ff', 'Bb_minor': '#483d8b',
      'F_major': '#98fb98', 'F_minor': '#000000',
      'Bb_major': '#ffff00', 'C_minor': '#8b0000',
      'Eb_major': '#9932cc', 'G_minor': '#8b4513',
      'Ab_major': '#ffc0cb', 'D_minor': '#a0522d'
    };
    
    return keyColorMap[keyName] || '#e6e6fa';
  }

  // Get contrasting text color
  getContrastColor(keyName) {
    const darkKeys = ['F_minor', 'Bb_minor', 'C_minor', 'D_minor', 'B_major', 'F#_minor', 'C#_minor', 'G#_minor', 'D#_minor'];
    return darkKeys.includes(keyName) ? '#ffffff' : '#000000';
  }

  // Get color for musical mode
  getModeColor(modeName) {
    const modeColorMap = {
      'ionian': '#ffd700',    // Gold - bright and major
      'dorian': '#dda0dd',    // Plum - bittersweet
      'phrygian': '#8b0000',  // Dark red - dark and exotic
      'lydian': '#e6e6fa',    // Lavender - dreamy
      'mixolydian': '#ff4500', // Orange red - groovy
      'aeolian': '#696969',   // Dim gray - natural minor
      'locrian': '#2f4f4f'    // Dark slate gray - unstable
    };
    
    return modeColorMap[modeName] || '#cccccc';
  }

  // Update processing statistics
  updateProcessingStats(processingTime, analysis) {
    this.stats.analysesGenerated++;
    this.stats.lastProcessingTime = processingTime;
    
    // Update rolling average
    if (this.stats.analysesGenerated === 1) {
      this.stats.averageProcessingTime = processingTime;
    } else {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * 0.9) + (processingTime * 0.1);
    }
    
    // Track popular keys and modes
    const keyName = analysis.musical_suggestions.key.key;
    const modeName = analysis.musical_suggestions.mode.mode;
    
    this.stats.popularKeys[keyName] = (this.stats.popularKeys[keyName] || 0) + 1;
    this.stats.popularModes[modeName] = (this.stats.popularModes[modeName] || 0) + 1;
  }

  // Get module statistics
  getModuleStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      mostPopularKey: this.getMostPopular(this.stats.popularKeys),
      mostPopularMode: this.getMostPopular(this.stats.popularModes),
      averageConfidence: this.calculateAverageConfidence()
    };
  }

  // Get most popular item from stats object
  getMostPopular(statsObj) {
    if (Object.keys(statsObj).length === 0) return null;
    
    return Object.entries(statsObj).reduce((a, b) => 
      statsObj[a[0]] > statsObj[b[0]] ? a : b
    )[0];
  }

  // Calculate average confidence (placeholder - would track in real implementation)
  calculateAverageConfidence() {
    return 0.75; // Placeholder
  }

  // Analyze text directly (for testing)
  async analyzeText(text) {
    const startTime = Date.now();
    
    try {
      const analysis = await this.musicAnalyzer.analyzeText(text);
      const processingTime = Date.now() - startTime;
      
      this.updateProcessingStats(processingTime, analysis);
      
      return {
        analysis: analysis,
        processingTime: processingTime,
        formatted: this.formatMusicalOutput(analysis, {
          id: 'test',
          content: text,
          timestamp: startTime
        })
      };
      
    } catch (error) {
      console.error('[MusicModule] Analysis error:', error);
      throw error;
    }
  }

  // Generate musical suggestions for a theme
  generateThematicSuggestions(theme) {
    const thematicTexts = {
      'sunrise': 'Golden light breaks across the horizon, painting the sky in brilliant oranges and yellows. A new day begins with hope and energy.',
      'storm': 'Dark clouds gather overhead, lightning flashes across the turbulent sky. Thunder rolls as rain pounds the earth with fierce intensity.',
      'love': 'Hearts beating in perfect harmony, two souls dancing together in eternal bliss. Gentle whispers and tender embraces fill the air.',
      'mystery': 'Shadows move in the moonlight, secrets whisper through ancient corridors. Unknown forces stir in the darkness beyond.',
      'celebration': 'Joyful music fills the air as people dance with abandon. Laughter and cheers echo through the festive atmosphere.',
      'melancholy': 'Autumn leaves fall like tears, carrying memories of summers past. A gentle sadness settles over the quiet landscape.',
      'adventure': 'Bold explorers venture into uncharted territories, their hearts racing with excitement and anticipation of discovery.',
      'peace': 'Still waters reflect the calm sky, while gentle breezes whisper through fields of soft grass. All is serene and tranquil.'
    };
    
    const text = thematicTexts[theme.toLowerCase()] || theme;
    return this.analyzeText(text);
  }

  // Start the module
  async start() {
    try {
      console.log('[MusicModule] Starting Music Prompt LLM...');
      
      // Connect to hub
      if (this.config.autoConnect) {
        await this.connectToHub();
      }
      
      console.log('[MusicModule] Music Prompt LLM started successfully');
      console.log(`[MusicModule] Capabilities: ${this.config.name} ready for musical analysis`);
      
    } catch (error) {
      console.error('[MusicModule] Failed to start:', error);
      throw error;
    }
  }

  // Shutdown the module
  async shutdown() {
    try {
      console.log('[MusicModule] Shutting down...');
      
      if (this.hubSocket) {
        this.hubSocket.disconnect();
        this.hubSocket = null;
      }
      
      this.connected = false;
      console.log('[MusicModule] Shutdown complete');
      
    } catch (error) {
      console.error('[MusicModule] Error during shutdown:', error);
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

  // Get analysis for specific musical elements
  getKeyAnalysis(keyName) {
    const musicAnalyzer = new MusicAnalyzer();
    return musicAnalyzer.keyMappings[keyName] || null;
  }

  getModeAnalysis(modeName) {
    const musicAnalyzer = new MusicAnalyzer();
    return musicAnalyzer.modes[modeName] || null;
  }

  // Generate chord progression in specific key
  generateChordProgression(keyName, progressionType = 'happy') {
    const musicAnalyzer = new MusicAnalyzer();
    const baseProgression = musicAnalyzer.chordProgressions[progressionType];
    
    // This would normally transpose the progression to the specified key
    // For now, return the Roman numeral progression with key context
    return {
      key: keyName,
      progression: baseProgression,
      description: `${progressionType} progression in ${keyName.replace('_', ' ')}`
    };
  }

  // Export analysis data
  exportAnalysisData() {
    return {
      stats: this.getModuleStats(),
      config: this.config,
      capabilities: [
        'Text-to-music analysis',
        'Key and mode detection', 
        'Tempo and rhythm suggestions',
        'Chord progression generation',
        'Instrument recommendations',
        'Emotional mapping',
        'Creative direction guidance'
      ]
    };
  }
}

module.exports = MusicPromptModule;
