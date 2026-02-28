// Music Prompt LLM - Key/Mode Generation Engine
// Analyzes text content and suggests musical keys, modes, and characteristics

class MusicAnalyzer {
  constructor() {
    this.initializeMusicalMappings();
  }

  // Initialize musical theory mappings
  initializeMusicalMappings() {
    // Musical keys and their emotional associations
    this.keyMappings = {
      // Major keys - generally brighter, happier
      'C_major': { 
        mood: 'pure, simple, innocent',
        energy: 0.6,
        color: 'white, clear',
        emotions: ['joy', 'peace', 'simplicity']
      },
      'G_major': {
        mood: 'rustic, cheerful, pastoral', 
        energy: 0.7,
        color: 'green, natural',
        emotions: ['happiness', 'nature', 'contentment']
      },
      'D_major': {
        mood: 'triumphant, joyous, brilliant',
        energy: 0.8,
        color: 'gold, bright yellow',
        emotions: ['triumph', 'celebration', 'glory']
      },
      'A_major': {
        mood: 'bright, cheerful, optimistic',
        energy: 0.75,
        color: 'orange, warm',
        emotions: ['optimism', 'warmth', 'confidence']
      },
      'E_major': {
        mood: 'bright, joyful, confident',
        energy: 0.8,
        color: 'bright blue',
        emotions: ['confidence', 'brightness', 'clarity']
      },
      'B_major': {
        mood: 'strongly colored, harsh, wild',
        energy: 0.9,
        color: 'electric blue, intense',
        emotions: ['intensity', 'wildness', 'passion']
      },
      'F#_major': {
        mood: 'conquering, sharp, bright',
        energy: 0.85,
        color: 'sharp silver',
        emotions: ['determination', 'sharpness', 'focus']
      },
      'C#_major': {
        mood: 'pure, sublime, celestial',
        energy: 0.7,
        color: 'crystal, ethereal',
        emotions: ['transcendence', 'purity', 'spirituality']
      },
      'F_major': {
        mood: 'pastoral, calm, graceful',
        energy: 0.5,
        color: 'soft green',
        emotions: ['grace', 'peace', 'gentleness']
      },
      'Bb_major': {
        mood: 'cheerful, brilliant, vivacious',
        energy: 0.75,
        color: 'warm yellow',
        emotions: ['cheerfulness', 'brilliance', 'liveliness']
      },
      'Eb_major': {
        mood: 'noble, heroic, sublime',
        energy: 0.8,
        color: 'royal purple',
        emotions: ['nobility', 'heroism', 'grandeur']
      },
      'Ab_major': {
        mood: 'tender, soft, gentle',
        energy: 0.4,
        color: 'soft pink',
        emotions: ['tenderness', 'gentleness', 'love']
      },

      // Minor keys - generally darker, more complex
      'A_minor': {
        mood: 'natural, pure, simple sadness',
        energy: 0.4,
        color: 'grey, natural',
        emotions: ['melancholy', 'purity', 'simplicity']
      },
      'E_minor': {
        mood: 'naive, womanly, graceful',
        energy: 0.3,
        color: 'soft blue',
        emotions: ['grace', 'femininity', 'gentleness']
      },
      'B_minor': {
        mood: 'patient, calm, awaiting',
        energy: 0.35,
        color: 'deep blue',
        emotions: ['patience', 'contemplation', 'waiting']
      },
      'F#_minor': {
        mood: 'passionate, resentful, discontented',
        energy: 0.7,
        color: 'dark red',
        emotions: ['passion', 'resentment', 'intensity']
      },
      'C#_minor': {
        mood: 'despair, wailing, weeping',
        energy: 0.2,
        color: 'deep purple',
        emotions: ['despair', 'sorrow', 'grief']
      },
      'G#_minor': {
        mood: 'grumbling, discontent, uneasiness',
        energy: 0.25,
        color: 'dark grey',
        emotions: ['unease', 'discontent', 'anxiety']
      },
      'D#_minor': {
        mood: 'feelings of anxiety, depressed',
        energy: 0.2,
        color: 'black, dark',
        emotions: ['anxiety', 'depression', 'darkness']
      },
      'Bb_minor': {
        mood: 'terrible, night, mocking',
        energy: 0.15,
        color: 'black purple',
        emotions: ['terror', 'mockery', 'darkness']
      },
      'F_minor': {
        mood: 'deep depression, funeral',
        energy: 0.1,
        color: 'black',
        emotions: ['depression', 'death', 'finality']
      },
      'C_minor': {
        mood: 'pathetic, sad, yearning',
        energy: 0.3,
        color: 'dark red',
        emotions: ['sadness', 'yearning', 'pathos']
      },
      'G_minor': {
        mood: 'discontent, uneasiness, worry',
        energy: 0.4,
        color: 'brown, earthy',
        emotions: ['worry', 'unease', 'concern']
      },
      'D_minor': {
        mood: 'melancholy, serious, pious',
        energy: 0.35,
        color: 'deep brown',
        emotions: ['melancholy', 'seriousness', 'devotion']
      }
    };

    // Modal characteristics for advanced harmonic suggestions
    this.modes = {
      'ionian': { 
        character: 'bright, major, stable',
        intervals: [0, 2, 4, 5, 7, 9, 11],
        feeling: 'happy, resolved'
      },
      'dorian': {
        character: 'minor but hopeful, folk-like',
        intervals: [0, 2, 3, 5, 7, 9, 10], 
        feeling: 'bittersweet, nostalgic'
      },
      'phrygian': {
        character: 'dark, spanish, exotic',
        intervals: [0, 1, 3, 5, 7, 8, 10],
        feeling: 'mysterious, dark'
      },
      'lydian': {
        character: 'dreamy, floating, ethereal',
        intervals: [0, 2, 4, 6, 7, 9, 11],
        feeling: 'dreamy, otherworldly'
      },
      'mixolydian': {
        character: 'bluesy, rock, dominant',
        intervals: [0, 2, 4, 5, 7, 9, 10],
        feeling: 'groovy, relaxed'
      },
      'aeolian': {
        character: 'natural minor, sad, pure',
        intervals: [0, 2, 3, 5, 7, 8, 10],
        feeling: 'sad, pure, natural'
      },
      'locrian': {
        character: 'unstable, tense, diminished',
        intervals: [0, 1, 3, 5, 6, 8, 10],
        feeling: 'unstable, anxious'
      }
    };

    // Tempo suggestions based on content energy
    this.tempoRanges = {
      'very_slow': { bpm: [40, 60], mood: 'funeral, meditative, deep' },
      'slow': { bpm: [60, 76], mood: 'ballad, romantic, contemplative' },
      'moderate_slow': { bpm: [76, 108], mood: 'walking, comfortable, steady' },
      'moderate': { bpm: [108, 120], mood: 'moderate, standard, balanced' },
      'moderate_fast': { bpm: [120, 168], mood: 'upbeat, energetic, dance' },
      'fast': { bpm: [168, 200], mood: 'fast, exciting, intense' },
      'very_fast': { bpm: [200, 240], mood: 'extremely fast, frantic, virtuosic' }
    };

    // Chord progressions for different moods
    this.chordProgressions = {
      'happy': ['I', 'V', 'vi', 'IV'], // Classic pop progression
      'sad': ['vi', 'IV', 'I', 'V'],   // Sad variant
      'mysterious': ['i', 'bVII', 'bVI', 'bVII'], // Minor modal
      'triumphant': ['I', 'IV', 'V', 'I'], // Traditional cadence
      'dreamy': ['I', 'iii', 'vi', 'V'], // Ethereal progression
      'dark': ['i', 'bII', 'bVII', 'i'], // Phrygian elements
      'nostalgic': ['vi', 'ii', 'V', 'I'], // Circle of fifths
      'energetic': ['I', 'bVII', 'IV', 'I'] // Rock progression
    };

    // Instrument suggestions based on content
    this.instrumentSuggestions = {
      'peaceful': ['piano', 'strings', 'flute', 'harp'],
      'energetic': ['electric guitar', 'drums', 'brass', 'synthesizer'],
      'mysterious': ['theremin', 'ambient pads', 'minor strings', 'bells'],
      'natural': ['acoustic guitar', 'woodwinds', 'nature sounds', 'folk instruments'],
      'electronic': ['synthesizer', 'electronic drums', 'digital effects', 'sequencers'],
      'classical': ['orchestra', 'piano', 'string quartet', 'chamber ensemble'],
      'dark': ['low strings', 'minor chords', 'distortion', 'reverb'],
      'ethereal': ['choir', 'ambient pads', 'reverb', 'crystal sounds']
    };
  }

  // Main analysis function
  analyzeText(text) {
    // Extract various characteristics from text
    const sentiment = this.analyzeSentiment(text);
    const energy = this.analyzeEnergy(text);
    const themes = this.extractThemes(text);
    const colors = this.extractColors(text);
    const emotions = this.extractEmotions(text);
    const tempo = this.suggestTempo(energy, themes);
    
    // Determine the best musical key
    const suggestedKey = this.selectOptimalKey(sentiment, energy, emotions, themes);
    
    // Suggest mode based on sentiment and themes
    const suggestedMode = this.selectOptimalMode(sentiment, themes, emotions);
    
    // Generate chord progression
    const chordProgression = this.generateChordProgression(sentiment, energy);
    
    // Suggest instruments
    const instruments = this.suggestInstruments(themes, energy, sentiment);
    
    // Create comprehensive musical response
    return {
      analysis: {
        sentiment: sentiment,
        energy: energy,
        themes: themes,
        colors: colors,
        emotions: emotions
      },
      musical_suggestions: {
        key: suggestedKey,
        mode: suggestedMode,
        tempo: tempo,
        chord_progression: chordProgression,
        instruments: instruments,
        dynamics: this.suggestDynamics(energy, emotions),
        rhythm: this.suggestRhythm(energy, themes)
      },
      creative_direction: this.generateCreativeDirection(text, suggestedKey, suggestedMode),
      technical_specs: this.generateTechnicalSpecs(suggestedKey, tempo, chordProgression)
    };
  }

  // Analyze sentiment of text (-1 to 1)
  analyzeSentiment(text) {
    const positiveWords = [
      'happy', 'joy', 'love', 'beautiful', 'wonderful', 'amazing', 'bright', 
      'light', 'hope', 'peace', 'calm', 'gentle', 'warm', 'sweet', 'kind',
      'celebrate', 'triumph', 'success', 'win', 'good', 'great', 'excellent',
      'smile', 'laugh', 'dance', 'sing', 'play', 'free', 'open', 'clear'
    ];
    
    const negativeWords = [
      'sad', 'dark', 'death', 'pain', 'hurt', 'anger', 'hate', 'fear',
      'worry', 'anxiety', 'depression', 'lonely', 'lost', 'broken', 'cold',
      'harsh', 'terrible', 'awful', 'bad', 'wrong', 'fail', 'defeat',
      'cry', 'weep', 'scream', 'fight', 'war', 'violence', 'destroy'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    let totalWords = 0;
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (positiveWords.includes(cleanWord)) {
        score += 1;
        totalWords++;
      } else if (negativeWords.includes(cleanWord)) {
        score -= 1;
        totalWords++;
      }
    });
    
    return totalWords > 0 ? Math.max(-1, Math.min(1, score / totalWords)) : 0;
  }

  // Analyze energy level (0 to 1)
  analyzeEnergy(text) {
    const highEnergyWords = [
      'fast', 'quick', 'run', 'jump', 'dance', 'party', 'celebration', 'festival',
      'electric', 'lightning', 'thunder', 'explosive', 'powerful', 'strong',
      'loud', 'bright', 'intense', 'extreme', 'wild', 'crazy', 'mad',
      'rush', 'speed', 'race', 'competition', 'fight', 'battle', 'energy'
    ];
    
    const lowEnergyWords = [
      'slow', 'quiet', 'calm', 'peaceful', 'still', 'rest', 'sleep', 'dream',
      'gentle', 'soft', 'whisper', 'silence', 'meditation', 'tranquil',
      'serene', 'placid', 'smooth', 'flowing', 'drift', 'float', 'fade'
    ];
    
    const words = text.toLowerCase().split(/\s+/);
    let energyScore = 0.5; // Default middle energy
    let energyWords = 0;
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (highEnergyWords.includes(cleanWord)) {
        energyScore += 0.1;
        energyWords++;
      } else if (lowEnergyWords.includes(cleanWord)) {
        energyScore -= 0.1;
        energyWords++;
      }
    });
    
    // Factor in sentence structure (exclamation marks = more energy)
    const exclamations = (text.match(/!/g) || []).length;
    energyScore += exclamations * 0.05;
    
    // Factor in capitalization
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    energyScore += capsRatio * 0.2;
    
    return Math.max(0, Math.min(1, energyScore));
  }

  // Extract thematic content
  extractThemes(text) {
    const themeKeywords = {
      'nature': ['tree', 'forest', 'river', 'mountain', 'sky', 'ocean', 'flower', 'grass', 'wind', 'rain'],
      'urban': ['city', 'street', 'building', 'car', 'traffic', 'neon', 'concrete', 'metal', 'glass'],
      'spiritual': ['soul', 'spirit', 'divine', 'sacred', 'prayer', 'meditation', 'transcend', 'enlighten'],
      'technology': ['digital', 'computer', 'robot', 'cyber', 'virtual', 'code', 'data', 'network'],
      'love': ['love', 'heart', 'romance', 'kiss', 'embrace', 'together', 'forever', 'devotion'],
      'war': ['battle', 'fight', 'war', 'soldier', 'weapon', 'conflict', 'struggle', 'victory'],
      'time': ['past', 'future', 'memory', 'nostalgia', 'ancient', 'eternal', 'moment', 'forever'],
      'space': ['star', 'planet', 'universe', 'galaxy', 'cosmos', 'infinite', 'void', 'celestial']
    };
    
    const detectedThemes = [];
    const words = text.toLowerCase().split(/\s+/);
    
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      const matches = keywords.filter(keyword => 
        words.some(word => word.includes(keyword))
      );
      if (matches.length > 0) {
        detectedThemes.push({
          theme: theme,
          strength: matches.length / keywords.length,
          matches: matches
        });
      }
    });
    
    return detectedThemes.sort((a, b) => b.strength - a.strength);
  }

  // Extract color references
  extractColors(text) {
    const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 
                   'black', 'white', 'grey', 'gray', 'brown', 'gold', 'silver',
                   'violet', 'indigo', 'turquoise', 'magenta', 'crimson', 'emerald'];
    
    const foundColors = [];
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (colors.includes(cleanWord)) {
        foundColors.push(cleanWord);
      }
    });
    
    return [...new Set(foundColors)]; // Remove duplicates
  }

  // Extract emotional content
  extractEmotions(text) {
    const emotionKeywords = {
      'joy': ['happy', 'joyful', 'elated', 'cheerful', 'delighted', 'ecstatic'],
      'sadness': ['sad', 'sorrowful', 'melancholy', 'dejected', 'mournful', 'grief'],
      'anger': ['angry', 'furious', 'rage', 'mad', 'irritated', 'annoyed'],
      'fear': ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'nervous'],
      'love': ['love', 'affection', 'adoration', 'passion', 'romance', 'devotion'],
      'peace': ['peaceful', 'calm', 'serene', 'tranquil', 'relaxed', 'content'],
      'excitement': ['excited', 'thrilled', 'energetic', 'enthusiastic', 'animated'],
      'mystery': ['mysterious', 'enigmatic', 'puzzling', 'secretive', 'unknown']
    };
    
    const detectedEmotions = [];
    const words = text.toLowerCase().split(/\s+/);
    
    Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
      const matches = keywords.filter(keyword => 
        words.some(word => word.includes(keyword))
      );
      if (matches.length > 0) {
        detectedEmotions.push({
          emotion: emotion,
          intensity: matches.length / keywords.length,
          keywords: matches
        });
      }
    });
    
    return detectedEmotions.sort((a, b) => b.intensity - a.intensity);
  }

  // Select optimal musical key based on analysis
  selectOptimalKey(sentiment, energy, emotions, themes) {
    let bestKey = 'C_major';
    let bestScore = 0;
    
    Object.entries(this.keyMappings).forEach(([key, keyData]) => {
      let score = 0;
      
      // Match sentiment to key energy
      const sentimentMatch = 1 - Math.abs(sentiment - (keyData.energy - 0.5));
      score += sentimentMatch * 2;
      
      // Match emotions to key emotions
      emotions.forEach(emotionData => {
        if (keyData.emotions.includes(emotionData.emotion)) {
          score += emotionData.intensity * 1.5;
        }
      });
      
      // Match themes to key characteristics
      themes.forEach(themeData => {
        if (keyData.mood.toLowerCase().includes(themeData.theme)) {
          score += themeData.strength;
        }
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    });
    
    return {
      key: bestKey,
      data: this.keyMappings[bestKey],
      confidence: Math.min(1, bestScore / 3)
    };
  }

  // Select optimal mode
  selectOptimalMode(sentiment, themes, emotions) {
    if (sentiment < -0.3) {
      return { mode: 'aeolian', ...this.modes.aeolian };
    } else if (sentiment > 0.3) {
      return { mode: 'ionian', ...this.modes.ionian };
    } else {
      // Check for specific themes that suggest modes
      const primaryTheme = themes.length > 0 ? themes[0].theme : null;
      
      switch (primaryTheme) {
        case 'nature':
          return { mode: 'dorian', ...this.modes.dorian };
        case 'spiritual':
          return { mode: 'lydian', ...this.modes.lydian };
        case 'technology':
          return { mode: 'phrygian', ...this.modes.phrygian };
        case 'space':
          return { mode: 'lydian', ...this.modes.lydian };
        default:
          return { mode: 'ionian', ...this.modes.ionian };
      }
    }
  }

  // Suggest tempo based on energy and themes
  suggestTempo(energy, themes) {
    let baseTempoCategory;
    
    if (energy < 0.2) {
      baseTempoCategory = 'very_slow';
    } else if (energy < 0.4) {
      baseTempoCategory = 'slow';
    } else if (energy < 0.6) {
      baseTempoCategory = 'moderate_slow';
    } else if (energy < 0.8) {
      baseTempoCategory = 'moderate_fast';
    } else {
      baseTempoCategory = 'fast';
    }
    
    // Adjust based on themes
    const primaryTheme = themes.length > 0 ? themes[0].theme : null;
    
    if (primaryTheme === 'spiritual' || primaryTheme === 'space') {
      // Slow down for contemplative themes
      const tempoCategories = Object.keys(this.tempoRanges);
      const currentIndex = tempoCategories.indexOf(baseTempoCategory);
      if (currentIndex > 0) {
        baseTempoCategory = tempoCategories[currentIndex - 1];
      }
    }
    
    const tempoRange = this.tempoRanges[baseTempoCategory];
    const suggestedBPM = Math.floor(
      tempoRange.bpm[0] + (tempoRange.bpm[1] - tempoRange.bpm[0]) * Math.random()
    );
    
    return {
      category: baseTempoCategory,
      bpm: suggestedBPM,
      range: tempoRange.bpm,
      mood: tempoRange.mood
    };
  }

  // Generate chord progression
  generateChordProgression(sentiment, energy) {
    let progressionType;
    
    if (sentiment > 0.3) {
      progressionType = energy > 0.6 ? 'energetic' : 'happy';
    } else if (sentiment < -0.3) {
      progressionType = 'sad';
    } else {
      progressionType = energy > 0.7 ? 'energetic' : 'mysterious';
    }
    
    return {
      type: progressionType,
      chords: this.chordProgressions[progressionType],
      description: this.getProgressionDescription(progressionType)
    };
  }

  // Get progression description
  getProgressionDescription(type) {
    const descriptions = {
      'happy': 'Classic uplifting progression that resolves beautifully',
      'sad': 'Melancholic progression that tugs at the heartstrings',
      'mysterious': 'Dark, modal progression with unresolved tension',
      'triumphant': 'Bold, classical progression perfect for victories',
      'dreamy': 'Ethereal progression that floats and suspends',
      'energetic': 'Driving rock progression with strong forward motion'
    };
    
    return descriptions[type] || 'Emotionally appropriate chord progression';
  }

  // Suggest instruments
  suggestInstruments(themes, energy, sentiment) {
    const suggestions = [];
    
    // Base on primary theme
    const primaryTheme = themes.length > 0 ? themes[0].theme : null;
    
    if (primaryTheme && this.instrumentSuggestions[primaryTheme]) {
      suggestions.push(...this.instrumentSuggestions[primaryTheme]);
    }
    
    // Add based on sentiment
    if (sentiment > 0.3) {
      suggestions.push(...this.instrumentSuggestions.peaceful);
    } else if (sentiment < -0.3) {
      suggestions.push(...this.instrumentSuggestions.dark);
    }
    
    // Add based on energy
    if (energy > 0.7) {
      suggestions.push(...this.instrumentSuggestions.energetic);
    } else if (energy < 0.3) {
      suggestions.push(...this.instrumentSuggestions.ethereal);
    }
    
    // Remove duplicates and return top 6
    const uniqueSuggestions = [...new Set(suggestions)];
    return uniqueSuggestions.slice(0, 6);
  }

  // Suggest dynamics
  suggestDynamics(energy, emotions) {
    let dynamicLevel;
    
    if (energy > 0.8) {
      dynamicLevel = 'fortissimo (ff) - very loud, powerful';
    } else if (energy > 0.6) {
      dynamicLevel = 'forte (f) - loud, strong';
    } else if (energy > 0.4) {
      dynamicLevel = 'mezzo-forte (mf) - moderately loud';
    } else if (energy > 0.2) {
      dynamicLevel = 'mezzo-piano (mp) - moderately soft';
    } else {
      dynamicLevel = 'pianissimo (pp) - very soft, delicate';
    }
    
    // Suggest dynamic changes based on emotions
    const dynamicChanges = [];
    emotions.forEach(emotion => {
      switch (emotion.emotion) {
        case 'excitement':
          dynamicChanges.push('crescendo - building intensity');
          break;
        case 'sadness':
          dynamicChanges.push('diminuendo - fading away');
          break;
        case 'anger':
          dynamicChanges.push('sforzando - sudden accent');
          break;
      }
    });
    
    return {
      base_level: dynamicLevel,
      suggested_changes: dynamicChanges
    };
  }

  // Suggest rhythm
  suggestRhythm(energy, themes) {
    let rhythmStyle;
    
    if (energy > 0.8) {
      rhythmStyle = 'driving, syncopated, complex polyrhythms';
    } else if (energy > 0.6) {
      rhythmStyle = 'steady, strong beat, clear pulse';
    } else if (energy > 0.4) {
      rhythmStyle = 'flowing, moderate pace, gentle pulse';
    } else {
      rhythmStyle = 'free-flowing, rubato, flexible timing';
    }
    
    // Modify based on themes
    const primaryTheme = themes.length > 0 ? themes[0].theme : null;
    
    switch (primaryTheme) {
      case 'nature':
        rhythmStyle += ', organic, breathing-like';
        break;
      case 'technology':
        rhythmStyle += ', mechanical, precise';
        break;
      case 'spiritual':
        rhythmStyle += ', meditative, cyclical';
        break;
    }
    
    return {
      style: rhythmStyle,
      time_signature: energy > 0.6 ? '4/4 (common time)' : '3/4 (waltz time)',
      feel: energy > 0.5 ? 'straight' : 'swing/rubato'
    };
  }

  // Generate creative direction
  generateCreativeDirection(text, key, mode) {
    const keyName = key.key.replace('_', ' ');
    const modeName = mode.mode;
    
    return {
      overall_concept: `Create a ${modeName} composition in ${keyName} that captures the essence of: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`,
      musical_mood: `${key.data.mood} with ${mode.character} characteristics`,
      color_palette: `Musical colors should evoke ${key.data.color} with ${mode.feeling} undertones`,
      arrangement_notes: `Begin with sparse arrangement, building to match the ${key.data.energy > 0.5 ? 'energetic' : 'contemplative'} nature of the text`,
      performance_style: `${key.data.energy > 0.7 ? 'Bold and expressive' : 'Subtle and nuanced'} performance with attention to ${mode.character} modal characteristics`
    };
  }

  // Generate technical specifications
  generateTechnicalSpecs(key, tempo, chordProgression) {
    const keyRoot = key.key.split('_')[0];
    const keyType = key.key.split('_')[1];
    
    return {
      key_signature: `${keyRoot} ${keyType}`,
      tempo_marking: `${tempo.category.replace('_', ' ')} (${tempo.bpm} BPM)`,
      chord_progression: chordProgression.chords.join(' - '),
      suggested_structure: 'Intro - Verse - Chorus - Verse - Chorus - Bridge - Chorus - Outro',
      production_notes: {
        reverb: key.data.energy < 0.5 ? 'Long, atmospheric reverb' : 'Short, punchy reverb',
        eq: `Emphasize ${key.data.energy > 0.6 ? 'high frequencies for brightness' : 'mid frequencies for warmth'}`,
        compression: tempo.bpm > 120 ? 'Moderate compression for energy' : 'Light compression for dynamics'
      }
    };
  }
}

module.exports = MusicAnalyzer;
