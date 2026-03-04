# Fallback Systems - Robust Exhibition Operation

Comprehensive fallback and resilience system for Hub v2 that ensures the exhibition continues operating even when individual components fail. Provides automatic failure detection, retry queues, circuit breakers, safe mode, and offline placeholders.

## Architecture

```
fallback/
├── fallback-manager.js           # Core fallback management system
├── hub-fallback-integration.js   # Integration with Hub v2 server
└── README.md                     # This documentation
```

## Features

### Core Resilience
- **Circuit Breakers**: Prevent cascade failures by isolating unhealthy modules
- **Retry Queue**: Automatic retry of failed operations with exponential backoff
- **Safe Mode**: Graceful degradation when system health deteriorates
- **Health Monitoring**: Continuous monitoring of module status and system health

### Failure Handling
- **Offline Placeholders**: Pre-configured responses when modules are unavailable
- **Timeout Protection**: Prevents operations from hanging indefinitely
- **Error Classification**: Distinguishes between retryable and permanent failures
- **Priority Queuing**: Critical operations are prioritized for retry

### Module Management
- **Status Tracking**: Real-time monitoring of module health and performance
- **Performance Metrics**: Response times, error rates, and success rates
- **Auto-discovery**: Automatic registration of connecting modules
- **Configurable Thresholds**: Customizable failure detection criteria

## Quick Start

### Basic Integration

```javascript
const HubFallbackIntegration = require('./fallback/hub-fallback-integration');

// Initialize with Hub v2 server
const fallbackIntegration = new HubFallbackIntegration(hubServer, {
  retryAttempts: 3,
  retryDelay: 5000,
  fallbackTimeout: 30000,
  enableSafeMode: true
});

// Initialize fallback systems
await fallbackIntegration.initialize();

// Hub v2 now has automatic fallback protection
```

### Module Registration

```javascript
// Modules are automatically registered when they connect
// Manual registration is also possible:
fallbackManager.registerModule('my-custom-module', {
  name: 'My Custom Module',
  critical: false,
  timeout: 30000,
  maxFailures: 5,
  fallbackResponse: {
    type: 'custom_response',
    content: 'Custom module temporarily unavailable'
  }
});
```

## System Components

### FallbackManager

Core system that handles:
- Module status tracking
- Circuit breaker management
- Retry queue processing
- Health monitoring
- Safe mode transitions

**Key Methods:**
- `registerModule(moduleId, config)` - Register a module for monitoring
- `updateModuleStatus(moduleId, status)` - Update module health status
- `addToRetryQueue(operation)` - Queue failed operation for retry
- `getFallbackResponse(moduleId)` - Get offline placeholder response

### HubFallbackIntegration

Integration layer that:
- Hooks into Hub v2 events
- Wraps critical Hub methods
- Provides automatic failure detection
- Manages fallback responses

**Integration Features:**
- Transparent method wrapping
- Automatic event monitoring
- Seamless fallback activation
- Real-time status broadcasting

## Configuration

### FallbackManager Options

```javascript
const config = {
  retryAttempts: 3,           // Number of retry attempts
  retryDelay: 5000,          // Base delay between retries (ms)
  queueMaxSize: 1000,        // Maximum retry queue size
  safeMode: false,           // Start in safe mode
  fallbackTimeout: 30000,    // Operation timeout (ms)
  heartbeatInterval: 15000   // Health check interval (ms)
};
```

### Module Configuration

```javascript
const moduleConfig = {
  name: 'Module Display Name',
  critical: false,           // Is this module critical?
  timeout: 30000,           // Module operation timeout
  maxFailures: 5,           // Failures before circuit breaker opens
  fallbackResponse: { ... } // Custom offline response
};
```

## Circuit Breaker States

### Closed (Normal Operation)
- All requests pass through to the module
- Failures are tracked but don't block requests
- Module is considered healthy

### Open (Module Isolated)
- All requests are blocked from reaching the module
- Fallback responses are used immediately
- Module is given time to recover

### Half-Open (Testing Recovery)
- Limited requests are allowed through
- Success resets the circuit breaker to closed
- Failure returns to open state

## Safe Mode Operation

Safe mode is automatically triggered when:
- Critical modules are offline
- System error rate exceeds threshold
- Multiple consecutive module failures occur

**Safe Mode Changes:**
- Reduced retry attempts
- Increased retry delays
- More aggressive use of fallbacks
- Enhanced logging and monitoring

## Offline Placeholders

Pre-configured responses for when modules are unavailable:

### Terminal Critic Fallback
```javascript
{
  type: 'content_analysis',
  content: '📝 **Content Review**\n\n*Analysis temporarily unavailable*\n\nYour submission has been received...',
  data: { analysis: 'offline', scores: { overall: 0.5 } }
}
```

### Music Prompt LLM Fallback
```javascript
{
  type: 'musical_analysis',
  content: '🎵 **Musical Interpretation**\n\n*Music analysis temporarily unavailable*...',
  data: { key: 'C_major', offline: true }
}
```

### Generic Fallback
```javascript
{
  type: 'system_message',
  content: '⚠️ **Service Temporarily Unavailable**\n\nThis creative module is currently offline...',
  data: { offline: true, queuedForProcessing: true }
}
```

## Retry Queue Management

### Operation Types
- **module-message**: Failed module communications
- **submission**: Failed submission processing
- **hub-communication**: Failed internal Hub operations

### Priority Levels
- **high**: Critical operations, processed first
- **normal**: Standard operations, processed in order

### Retry Strategy
- Exponential backoff: `baseDelay * 2^(attempts-1)`
- Maximum attempts configurable per operation
- Failed operations use fallback responses

## Health Monitoring

### Metrics Tracked
- **Response Time**: Average module response times
- **Error Rate**: Percentage of failed operations
- **Consecutive Failures**: Count of back-to-back failures
- **Uptime**: Module availability percentage

### Health Thresholds
```javascript
const thresholds = {
  errorRate: 0.5,           // 50% error rate triggers action
  responseTime: 10000,      // 10 second response limit
  consecutiveFailures: 5    // 5 failures opens circuit breaker
};
```

### Health Check Actions
- Update module status
- Trigger safe mode if needed
- Open circuit breakers
- Clear stale connections

## Event System

### FallbackManager Events

```javascript
// Safe mode changes
fallbackManager.on('safe-mode-entered', ({ reason, timestamp }) => {
  console.log('Entering safe mode:', reason);
});

fallbackManager.on('safe-mode-exited', ({ reason, timestamp }) => {
  console.log('Exiting safe mode:', reason);
});

// Circuit breaker events
fallbackManager.on('circuit-breaker-open', ({ moduleId }) => {
  console.log('Circuit breaker opened for:', moduleId);
});

// Retry events
fallbackManager.on('retry-success', ({ item, result }) => {
  console.log('Retry succeeded:', item.id);
});

fallbackManager.on('retry-failed', ({ item, error }) => {
  console.log('Retry failed permanently:', item.id);
});
```

## Integration with Hub v2

### Automatic Features
- **Module Detection**: Automatically registers connecting modules
- **Event Monitoring**: Hooks into Hub events for failure detection
- **Method Wrapping**: Transparent addition of fallback logic
- **Status Broadcasting**: Updates Moderation Panel with system status

### Manual Control
```javascript
// Enable/disable safe mode
fallbackIntegration.setSafeMode(true, 'Manual override');

// Force retry of queued operations
fallbackIntegration.forceRetry();

// Reset circuit breaker
fallbackIntegration.resetCircuitBreaker('module-id');

// Get system status
const status = fallbackIntegration.getStatus();
```

## Moderation Panel Integration

The fallback system integrates with the Moderation Panel to provide:

### Status Dashboard
- **Safe Mode Indicator**: Visual warning when in safe mode
- **Module Health**: Real-time status of all modules
- **Circuit Breaker States**: Visual indicators for module availability
- **Retry Queue Status**: Number of queued operations

### Controls
- **Manual Safe Mode**: Toggle safe mode on/off
- **Circuit Breaker Reset**: Manually reset module circuit breakers
- **Retry Queue Management**: View and clear retry queue
- **System Health**: View detailed health metrics

## Performance Considerations

### Memory Usage
- Retry queue size is limited to prevent memory exhaustion
- Old health metrics are periodically cleaned up
- Circuit breaker state is lightweight

### CPU Impact
- Health checks run at configurable intervals
- Retry processing is throttled to prevent overload
- Event handlers are optimized for minimal overhead

### Network Efficiency
- Failed operations are queued locally to reduce network traffic
- Circuit breakers prevent unnecessary network attempts
- Batch processing of retry operations where possible

## Troubleshooting

### Common Issues

**Modules stuck in circuit breaker open state:**
```javascript
// Check module status
const status = fallbackIntegration.getStatus();
console.log(status.fallbackManager.modules);

// Reset circuit breaker
fallbackIntegration.resetCircuitBreaker('module-id');
```

**Safe mode triggered unexpectedly:**
```javascript
// Check health thresholds
const healthThresholds = fallbackManager.healthMonitor.thresholds;
console.log('Current thresholds:', healthThresholds);

// Adjust thresholds if needed
healthThresholds.errorRate = 0.7; // Increase tolerance
```

**Retry queue growing too large:**
```javascript
// Check queue status
const queueStatus = fallbackIntegration.getRetryQueueStatus();
console.log('Queue size:', queueStatus.queueSize);

// Clear queue if needed
fallbackIntegration.clearRetryQueue();
```

### Debug Mode

Enable detailed logging:
```javascript
const fallbackIntegration = new HubFallbackIntegration(hubServer, {
  debugMode: true,
  logLevel: 'debug'
});
```

## Best Practices

### Module Development
- **Graceful Degradation**: Design modules to handle partial failures
- **Timeout Handling**: Implement proper timeout handling in modules
- **Health Endpoints**: Provide health check endpoints for monitoring
- **Error Reporting**: Use descriptive error messages for better retry logic

### System Configuration
- **Conservative Thresholds**: Start with conservative failure thresholds
- **Monitor Performance**: Regularly review health metrics and adjust
- **Test Failures**: Periodically test failure scenarios
- **Update Placeholders**: Keep offline placeholders relevant and helpful

### Exhibition Operation
- **Pre-event Testing**: Test all failure scenarios before the event
- **Monitoring Setup**: Have monitoring dashboards ready
- **Recovery Procedures**: Document manual recovery procedures
- **Backup Plans**: Have manual backup procedures for critical failures

## Future Enhancements

### Planned Features
- **Predictive Failure Detection**: Use metrics to predict failures
- **Dynamic Threshold Adjustment**: Auto-adjust thresholds based on patterns
- **Advanced Retry Strategies**: Priority-based and dependency-aware retries
- **Distributed Fallback**: Multi-node fallback coordination

### Integration Possibilities
- **External Monitoring**: Integration with monitoring services
- **Alert Systems**: SMS/email alerts for critical failures
- **Metrics Export**: Export metrics to analytics platforms
- **Automated Recovery**: Self-healing capabilities

## License

MIT License - Part of the Nottingham Contemporary AI Exhibition system.

---

**Critical for Exhibition Success**: This fallback system ensures the exhibition continues operating even when individual components fail, providing a seamless experience for both artists and audience.
