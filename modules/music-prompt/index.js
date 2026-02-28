// Music Prompt LLM - Main Entry Point
// Standalone launcher for the Music Prompt module

const MusicPromptModule = require('./music-module');

// Default configuration
const defaultConfig = {
  name: 'Music Prompt LLM',
  moduleId: 'music-prompt-llm',
  port: 3002,
  hubUrl: 'ws://localhost:3000',
  autoConnect: true,
  enableAdvancedAnalysis: true,
  generateMIDI: false
};

// Load config from command line arguments or environment
function loadConfig() {
  const config = { ...defaultConfig };
  
  // Override from environment variables
  if (process.env.HUB_URL) {
    config.hubUrl = process.env.HUB_URL;
  }
  
  if (process.env.MUSIC_PORT) {
    config.port = parseInt(process.env.MUSIC_PORT);
  }
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--hub-url' && i + 1 < args.length) {
      config.hubUrl = args[i + 1];
      i++;
    } else if (arg === '--port' && i + 1 < args.length) {
      config.port = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--no-connect') {
      config.autoConnect = false;
    } else if (arg === '--enable-midi') {
      config.generateMIDI = true;
    }
  }
  
  return config;
}

// Main function
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('Music Prompt LLM - Musical Analysis Module');
    console.log('='.repeat(60));
    
    const config = loadConfig();
    
    console.log(`Configuration:`);
    console.log(`  Hub URL: ${config.hubUrl}`);
    console.log(`  Module Port: ${config.port}`);
    console.log(`  Advanced Analysis: ${config.enableAdvancedAnalysis ? 'Enabled' : 'Disabled'}`);
    console.log(`  MIDI Generation: ${config.generateMIDI ? 'Enabled' : 'Disabled'}`);
    console.log(`  Auto Connect: ${config.autoConnect ? 'Enabled' : 'Disabled'}`);
    console.log();
    
    // Create and start the module
    const musicModule = new MusicPromptModule(config);
    
    // Setup graceful shutdown
    const shutdown = async () => {
      console.log('\nInitiating graceful shutdown...');
      await musicModule.shutdown();
      console.log('Music Prompt LLM stopped');
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      shutdown();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown();
    });
    
    // Start the module
    await musicModule.start();
    
    console.log('Music Prompt LLM is running');
    console.log('Ready to analyze text and generate musical suggestions');
    console.log('Press Ctrl+C to stop');
    console.log();
    
    // Demo functionality
    if (args.includes('--demo')) {
      console.log('Running demo analysis...');
      const demoResults = await runDemo(musicModule);
      console.log('Demo Results:', JSON.stringify(demoResults, null, 2));
    }
    
  } catch (error) {
    console.error('Failed to start Music Prompt LLM:', error);
    process.exit(1);
  }
}

// Demo function
async function runDemo(musicModule) {
  const testTexts = [
    "I feel so happy and excited about this beautiful sunny day!",
    "The storm clouds gather ominously as darkness falls.",
    "Peaceful meditation by the quiet lake brings inner calm.",
    "Electric energy pulses through the crowded dance floor!"
  ];
  
  const results = [];
  
  for (const text of testTexts) {
    console.log(`\nAnalyzing: "${text}"`);
    const result = await musicModule.analyzeText(text);
    const key = result.analysis.musical_suggestions.key.key;
    const mode = result.analysis.musical_suggestions.mode.mode;
    const tempo = result.analysis.musical_suggestions.tempo.bpm;
    
    console.log(`  Key: ${key} | Mode: ${mode} | Tempo: ${tempo} BPM`);
    results.push({ text, key, mode, tempo, processingTime: result.processingTime });
  }
  
  return results;
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { MusicPromptModule, main };
