// Terminal Critic v2 - Main Entry Point
// Standalone launcher for the Terminal Critic module

const TerminalCriticModule = require('./critic-module');

// Default configuration
const defaultConfig = {
  name: 'Terminal Critic v2',
  moduleId: 'terminal-critic-v2', 
  port: 3001,
  hubUrl: 'ws://localhost:3000',
  webPort: 8001,
  enableWebInterface: true,
  autoConnect: true,
  
  // Engine configuration
  engineConfig: {
    strictMode: false,
    enableProfanityFilter: true,
    enableSentimentAnalysis: true,
    enableLengthAnalysis: true,
    enableContentAnalysis: true,
    customRules: [
      {
        name: 'emergency_override',
        pattern: /\b(emergency|urgent|help|fire|medical)\b/i,
        type: 'emergency',
        message: 'Emergency content detected',
        severity: 'override'
      }
    ]
  }
};

// Load config from command line arguments or environment
function loadConfig() {
  const config = { ...defaultConfig };
  
  // Override from environment variables
  if (process.env.HUB_URL) {
    config.hubUrl = process.env.HUB_URL;
  }
  
  if (process.env.CRITIC_PORT) {
    config.port = parseInt(process.env.CRITIC_PORT);
  }
  
  if (process.env.CRITIC_WEB_PORT) {
    config.webPort = parseInt(process.env.CRITIC_WEB_PORT);
  }
  
  if (process.env.STRICT_MODE === 'true') {
    config.engineConfig.strictMode = true;
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
    } else if (arg === '--web-port' && i + 1 < args.length) {
      config.webPort = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--strict') {
      config.engineConfig.strictMode = true;
    } else if (arg === '--no-web') {
      config.enableWebInterface = false;
    } else if (arg === '--no-connect') {
      config.autoConnect = false;
    }
  }
  
  return config;
}

// Main function
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('Terminal Critic v2 - Content Analysis Module');
    console.log('='.repeat(60));
    
    const config = loadConfig();
    
    console.log(`Configuration:`);
    console.log(`  Hub URL: ${config.hubUrl}`);
    console.log(`  Module Port: ${config.port}`);
    console.log(`  Web Port: ${config.webPort}`);
    console.log(`  Web Interface: ${config.enableWebInterface ? 'Enabled' : 'Disabled'}`);
    console.log(`  Strict Mode: ${config.engineConfig.strictMode ? 'Enabled' : 'Disabled'}`);
    console.log(`  Auto Connect: ${config.autoConnect ? 'Enabled' : 'Disabled'}`);
    console.log();
    
    // Create and start the module
    const criticModule = new TerminalCriticModule(config);
    
    // Setup graceful shutdown
    const shutdown = async () => {
      console.log('\nInitiating graceful shutdown...');
      await criticModule.shutdown();
      console.log('Terminal Critic v2 stopped');
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
    await criticModule.start();
    
    console.log('Terminal Critic v2 is running');
    console.log(`Web Control Panel: http://localhost:${config.webPort}`);
    console.log('Press Ctrl+C to stop');
    console.log();
    
  } catch (error) {
    console.error('Failed to start Terminal Critic v2:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { TerminalCriticModule, main };
