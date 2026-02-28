// Adapter Manager
// Centralized management for external module adapters

const EventEmitter = require('events');
const path = require('path');

class AdapterManager extends EventEmitter {
  constructor() {
    super();
    this.adapters = new Map();
    this.adapterClasses = new Map();
    this.runningAdapters = new Set();
    
    // Register built-in adapter types
    this.registerAdapterClass('http', require('./http-adapter'));
    this.registerAdapterClass('websocket', require('./websocket-adapter'));
    this.registerAdapterClass('osc', require('./osc-adapter'));
  }

  // Register an adapter class for a protocol type
  registerAdapterClass(protocolType, AdapterClass) {
    this.adapterClasses.set(protocolType, AdapterClass);
    console.log(`[AdapterManager] Registered adapter type: ${protocolType}`);
  }

  // Create and configure an adapter
  createAdapter(config) {
    const { type, id, ...adapterConfig } = config;
    
    if (!this.adapterClasses.has(type)) {
      throw new Error(`Unknown adapter type: ${type}`);
    }
    
    const AdapterClass = this.adapterClasses.get(type);
    const adapter = new AdapterClass({
      ...adapterConfig,
      moduleId: id || `${type}-${Date.now()}`
    });
    
    // Set up event handling
    adapter.on('hub-connected', () => {
      console.log(`[AdapterManager] Adapter ${adapter.config.name} connected to hub`);
      this.emit('adapter-connected', adapter);
    });
    
    adapter.on('hub-disconnected', () => {
      console.log(`[AdapterManager] Adapter ${adapter.config.name} disconnected from hub`);
      this.emit('adapter-disconnected', adapter);
    });
    
    adapter.on('error', (error) => {
      console.error(`[AdapterManager] Adapter ${adapter.config.name} error:`, error);
      this.emit('adapter-error', adapter, error);
    });
    
    adapter.on('started', () => {
      this.runningAdapters.add(adapter.config.moduleId);
      this.emit('adapter-started', adapter);
    });
    
    adapter.on('stopped', () => {
      this.runningAdapters.delete(adapter.config.moduleId);
      this.emit('adapter-stopped', adapter);
    });
    
    this.adapters.set(adapter.config.moduleId, adapter);
    return adapter;
  }

  // Start an adapter
  async startAdapter(adapterId) {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }
    
    if (this.runningAdapters.has(adapterId)) {
      console.log(`[AdapterManager] Adapter ${adapterId} is already running`);
      return adapter;
    }
    
    console.log(`[AdapterManager] Starting adapter: ${adapterId}`);
    await adapter.start();
    return adapter;
  }

  // Stop an adapter
  async stopAdapter(adapterId) {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterId}`);
    }
    
    if (!this.runningAdapters.has(adapterId)) {
      console.log(`[AdapterManager] Adapter ${adapterId} is not running`);
      return;
    }
    
    console.log(`[AdapterManager] Stopping adapter: ${adapterId}`);
    await adapter.shutdown();
  }

  // Start multiple adapters from configuration
  async startAdapters(adapterConfigs) {
    const results = [];
    
    for (const config of adapterConfigs) {
      try {
        const adapter = this.createAdapter(config);
        await this.startAdapter(adapter.config.moduleId);
        results.push({ success: true, adapter });
      } catch (error) {
        console.error(`[AdapterManager] Failed to start adapter ${config.id || config.type}:`, error);
        results.push({ success: false, error, config });
      }
    }
    
    return results;
  }

  // Stop all running adapters
  async stopAllAdapters() {
    const promises = [];
    
    for (const adapterId of this.runningAdapters) {
      promises.push(this.stopAdapter(adapterId));
    }
    
    await Promise.all(promises);
    console.log(`[AdapterManager] All adapters stopped`);
  }

  // Get adapter statistics
  getAdapterStats() {
    const stats = {
      total: this.adapters.size,
      running: this.runningAdapters.size,
      types: {},
      adapters: []
    };
    
    for (const [id, adapter] of this.adapters) {
      const adapterStats = {
        id: id,
        name: adapter.config.name,
        type: adapter.config.protocol,
        running: this.runningAdapters.has(id),
        config: {
          port: adapter.config.port,
          hubUrl: adapter.config.hubUrl
        }
      };
      
      // Add protocol-specific config info
      if (adapter.config.httpEndpoint) {
        adapterStats.config.endpoint = adapter.config.httpEndpoint;
      }
      if (adapter.config.wsUrl) {
        adapterStats.config.wsUrl = adapter.config.wsUrl;
      }
      if (adapter.config.oscOutHost && adapter.config.oscOutPort) {
        adapterStats.config.oscTarget = `${adapter.config.oscOutHost}:${adapter.config.oscOutPort}`;
      }
      
      // Get runtime stats if adapter is running
      if (this.runningAdapters.has(id) && typeof adapter.getStats === 'function') {
        try {
          adapterStats.runtime = adapter.getStats();
        } catch (error) {
          console.warn(`[AdapterManager] Could not get stats for ${id}:`, error.message);
        }
      }
      
      stats.adapters.push(adapterStats);
      
      // Count by type
      const type = adapter.config.protocol;
      stats.types[type] = (stats.types[type] || 0) + 1;
    }
    
    return stats;
  }

  // Get a specific adapter
  getAdapter(adapterId) {
    return this.adapters.get(adapterId);
  }

  // Get all adapters of a specific type
  getAdaptersByType(type) {
    return Array.from(this.adapters.values()).filter(
      adapter => adapter.config.protocol === type
    );
  }

  // Check if an adapter is running
  isAdapterRunning(adapterId) {
    return this.runningAdapters.has(adapterId);
  }

  // Load adapter configurations from a file or object
  loadConfiguration(config) {
    if (typeof config === 'string') {
      // Load from file
      try {
        const configPath = path.resolve(config);
        delete require.cache[configPath]; // Clear cache for hot reload
        config = require(configPath);
      } catch (error) {
        throw new Error(`Failed to load adapter configuration from ${config}: ${error.message}`);
      }
    }
    
    if (!config || !Array.isArray(config.adapters)) {
      throw new Error('Invalid adapter configuration: missing adapters array');
    }
    
    return config;
  }

  // Hot reload adapters from configuration
  async reloadAdapters(configFile) {
    console.log(`[AdapterManager] Reloading adapters from ${configFile}`);
    
    try {
      const config = this.loadConfiguration(configFile);
      
      // Stop all current adapters
      await this.stopAllAdapters();
      
      // Clear existing adapters
      this.adapters.clear();
      
      // Start new adapters
      const results = await this.startAdapters(config.adapters);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`[AdapterManager] Reload complete: ${successful} started, ${failed} failed`);
      
      return {
        success: true,
        started: successful,
        failed: failed,
        results: results
      };
      
    } catch (error) {
      console.error(`[AdapterManager] Failed to reload adapters:`, error);
      throw error;
    }
  }
}

module.exports = AdapterManager;
