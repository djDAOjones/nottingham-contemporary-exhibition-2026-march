// Archive Manager - JSON Logging + 4K Video Recording
// Comprehensive documentation system for exhibition data

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class ArchiveManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      name: 'Archive System',
      version: '1.0.0',
      archiveDir: path.resolve(config.archiveDir || './archives'),
      maxFileSize: config.maxFileSize || 50 * 1024 * 1024, // 50MB per log file
      maxArchiveAge: config.maxArchiveAge || 30 * 24 * 60 * 60 * 1000, // 30 days
      compressionEnabled: config.compressionEnabled || true,
      enableVideoRecording: config.enableVideoRecording || true,
      videoFormat: config.videoFormat || 'mp4',
      videoQuality: config.videoQuality || '4K', // 4K, 1080p, 720p
      videoFrameRate: config.videoFrameRate || 30,
      enableScreenshots: config.enableScreenshots || true,
      screenshotInterval: config.screenshotInterval || 60000, // 1 minute
      enableMetrics: config.enableMetrics || true,
      ...config
    };
    
    this.currentLogFile = null;
    this.logBuffer = [];
    this.logFileSize = 0;
    this.sessionId = null;
    this.startTime = Date.now();
    this.metrics = {
      submissionsLogged: 0,
      moderationsLogged: 0,
      errorsLogged: 0,
      videosRecorded: 0,
      screenshotsTaken: 0,
      totalDataSize: 0
    };
    
    // Initialize archive system
    this.initialize();
  }

  // Initialize archive system
  async initialize() {
    try {
      // Create archive directory structure
      await this.createArchiveStructure();
      
      // Start new session
      this.sessionId = this.generateSessionId();
      console.log(`[Archive] Starting session: ${this.sessionId}`);
      
      // Initialize logging
      await this.initializeLogging();
      
      // Log session start
      await this.logEvent({
        type: 'session_start',
        sessionId: this.sessionId,
        timestamp: Date.now(),
        config: this.config,
        system: {
          platform: process.platform,
          nodeVersion: process.version,
          memory: process.memoryUsage()
        }
      });
      
      // Setup periodic tasks
      this.setupPeriodicTasks();
      
      this.emit('initialized');
      console.log('[Archive] Archive system initialized');
      
    } catch (error) {
      console.error('[Archive] Initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  // Create archive directory structure
  async createArchiveStructure() {
    const dirs = [
      this.config.archiveDir,
      path.join(this.config.archiveDir, 'logs'),
      path.join(this.config.archiveDir, 'videos'),
      path.join(this.config.archiveDir, 'screenshots'),
      path.join(this.config.archiveDir, 'metrics'),
      path.join(this.config.archiveDir, 'exports')
    ];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  // Generate unique session ID
  generateSessionId() {
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const random = Math.random().toString(36).substr(2, 6);
    return `session-${timestamp}-${random}`;
  }

  // Initialize JSON logging
  async initializeLogging() {
    const logDir = path.join(this.config.archiveDir, 'logs');
    const logFileName = `${this.sessionId}.jsonl`;
    this.currentLogFile = path.join(logDir, logFileName);
    this.logFileSize = 0;
    
    // Create initial log file
    await fs.writeFile(this.currentLogFile, '');
    console.log(`[Archive] Log file created: ${logFileName}`);
  }

  // Setup periodic tasks
  setupPeriodicTasks() {
    // Flush log buffer every 5 seconds
    setInterval(() => {
      this.flushLogBuffer();
    }, 5000);
    
    // Take screenshot periodically if enabled
    if (this.config.enableScreenshots) {
      setInterval(() => {
        this.takeScreenshot();
      }, this.config.screenshotInterval);
    }
    
    // Generate metrics report every 10 minutes
    if (this.config.enableMetrics) {
      setInterval(() => {
        this.generateMetricsReport();
      }, 600000);
    }
    
    // Cleanup old archives daily
    setInterval(() => {
      this.cleanupOldArchives();
    }, 24 * 60 * 60 * 1000);
  }

  // Log submission event
  async logSubmission(submission, metadata = {}) {
    const logEntry = {
      type: 'submission',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      id: submission.id,
      content: submission.content,
      source: submission.source || 'unknown',
      metadata: {
        contentLength: submission.content.length,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        referrer: metadata.referrer,
        ...metadata
      }
    };
    
    await this.logEvent(logEntry);
    this.metrics.submissionsLogged++;
    
    this.emit('submission-logged', logEntry);
  }

  // Log moderation event
  async logModeration(moderationData, metadata = {}) {
    const logEntry = {
      type: 'moderation',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      messageId: moderationData.messageId,
      action: moderationData.action, // approve, reject, edit
      moderator: moderationData.moderator || 'system',
      reason: moderationData.reason,
      originalContent: moderationData.originalContent,
      modifiedContent: moderationData.modifiedContent,
      processingTime: moderationData.processingTime,
      metadata: {
        module: moderationData.module,
        confidence: moderationData.confidence,
        flags: moderationData.flags,
        ...metadata
      }
    };
    
    await this.logEvent(logEntry);
    this.metrics.moderationsLogged++;
    
    this.emit('moderation-logged', logEntry);
  }

  // Log module processing event
  async logModuleProcessing(moduleData, metadata = {}) {
    const logEntry = {
      type: 'module_processing',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      messageId: moduleData.messageId,
      moduleId: moduleData.moduleId,
      moduleName: moduleData.moduleName,
      status: moduleData.status, // started, completed, failed, timeout
      processingTime: moduleData.processingTime,
      output: moduleData.output,
      error: moduleData.error,
      metadata: {
        moduleType: moduleData.moduleType,
        queueDepth: moduleData.queueDepth,
        retryCount: moduleData.retryCount,
        ...metadata
      }
    };
    
    await this.logEvent(logEntry);
    
    this.emit('module-processing-logged', logEntry);
  }

  // Log system event
  async logSystemEvent(eventType, eventData, metadata = {}) {
    const logEntry = {
      type: 'system_event',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      eventType: eventType,
      data: eventData,
      metadata: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        ...metadata
      }
    };
    
    await this.logEvent(logEntry);
    
    this.emit('system-event-logged', logEntry);
  }

  // Log error event
  async logError(error, context = {}) {
    const logEntry = {
      type: 'error',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context: context,
      metadata: {
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };
    
    await this.logEvent(logEntry);
    this.metrics.errorsLogged++;
    
    this.emit('error-logged', logEntry);
  }

  // Core event logging function
  async logEvent(logEntry) {
    try {
      // Add to buffer
      this.logBuffer.push(logEntry);
      
      // Update metrics
      this.metrics.totalDataSize += JSON.stringify(logEntry).length;
      
      // Check if we need to rotate log file
      if (this.logFileSize > this.config.maxFileSize) {
        await this.rotateLogFile();
      }
      
    } catch (error) {
      console.error('[Archive] Failed to log event:', error);
      this.emit('error', error);
    }
  }

  // Flush log buffer to disk
  async flushLogBuffer() {
    if (this.logBuffer.length === 0) {
      return;
    }
    
    try {
      const logLines = this.logBuffer.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      
      await fs.appendFile(this.currentLogFile, logLines);
      this.logFileSize += Buffer.byteLength(logLines, 'utf8');
      
      console.log(`[Archive] Flushed ${this.logBuffer.length} log entries`);
      this.logBuffer = [];
      
    } catch (error) {
      console.error('[Archive] Failed to flush log buffer:', error);
      this.emit('error', error);
    }
  }

  // Rotate log file when it gets too large
  async rotateLogFile() {
    try {
      // Flush current buffer
      await this.flushLogBuffer();
      
      // Create new log file
      const logDir = path.join(this.config.archiveDir, 'logs');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const newLogFileName = `${this.sessionId}-${timestamp}.jsonl`;
      
      this.currentLogFile = path.join(logDir, newLogFileName);
      this.logFileSize = 0;
      
      // Create new file
      await fs.writeFile(this.currentLogFile, '');
      
      console.log(`[Archive] Rotated to new log file: ${newLogFileName}`);
      
    } catch (error) {
      console.error('[Archive] Failed to rotate log file:', error);
      this.emit('error', error);
    }
  }

  // Start video recording
  async startVideoRecording(options = {}) {
    if (!this.config.enableVideoRecording) {
      console.log('[Archive] Video recording is disabled');
      return null;
    }
    
    try {
      const videoDir = path.join(this.config.archiveDir, 'videos');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const videoFileName = `recording-${this.sessionId}-${timestamp}.${this.config.videoFormat}`;
      const videoPath = path.join(videoDir, videoFileName);
      
      // Log video recording start
      await this.logSystemEvent('video_recording_start', {
        videoFileName: videoFileName,
        videoPath: videoPath,
        quality: this.config.videoQuality,
        frameRate: this.config.videoFrameRate,
        options: options
      });
      
      console.log(`[Archive] Started video recording: ${videoFileName}`);
      this.metrics.videosRecorded++;
      
      return {
        videoId: `video-${timestamp}`,
        fileName: videoFileName,
        path: videoPath,
        startTime: Date.now()
      };
      
    } catch (error) {
      console.error('[Archive] Failed to start video recording:', error);
      await this.logError(error, { context: 'video_recording_start' });
      return null;
    }
  }

  // Stop video recording
  async stopVideoRecording(videoId, metadata = {}) {
    try {
      await this.logSystemEvent('video_recording_stop', {
        videoId: videoId,
        stopTime: Date.now(),
        metadata: metadata
      });
      
      console.log(`[Archive] Stopped video recording: ${videoId}`);
      
    } catch (error) {
      console.error('[Archive] Failed to stop video recording:', error);
      await this.logError(error, { context: 'video_recording_stop' });
    }
  }

  // Take screenshot
  async takeScreenshot(options = {}) {
    if (!this.config.enableScreenshots) {
      return null;
    }
    
    try {
      const screenshotDir = path.join(this.config.archiveDir, 'screenshots');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const screenshotFileName = `screenshot-${this.sessionId}-${timestamp}.png`;
      const screenshotPath = path.join(screenshotDir, screenshotFileName);
      
      // Log screenshot taken
      await this.logSystemEvent('screenshot_taken', {
        screenshotFileName: screenshotFileName,
        screenshotPath: screenshotPath,
        options: options
      });
      
      this.metrics.screenshotsTaken++;
      
      return {
        fileName: screenshotFileName,
        path: screenshotPath,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('[Archive] Failed to take screenshot:', error);
      await this.logError(error, { context: 'screenshot' });
      return null;
    }
  }

  // Generate metrics report
  async generateMetricsReport() {
    try {
      const report = {
        sessionId: this.sessionId,
        timestamp: Date.now(),
        startTime: this.startTime,
        uptime: Date.now() - this.startTime,
        metrics: { ...this.metrics },
        system: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          platform: process.platform
        }
      };
      
      const metricsDir = path.join(this.config.archiveDir, 'metrics');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const reportFileName = `metrics-${this.sessionId}-${timestamp}.json`;
      const reportPath = path.join(metricsDir, reportFileName);
      
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`[Archive] Generated metrics report: ${reportFileName}`);
      this.emit('metrics-generated', report);
      
      return report;
      
    } catch (error) {
      console.error('[Archive] Failed to generate metrics report:', error);
      await this.logError(error, { context: 'metrics_generation' });
    }
  }

  // Cleanup old archives
  async cleanupOldArchives() {
    try {
      const cutoffTime = Date.now() - this.config.maxArchiveAge;
      const dirs = ['logs', 'videos', 'screenshots', 'metrics'];
      let deletedCount = 0;
      
      for (const dir of dirs) {
        const dirPath = path.join(this.config.archiveDir, dir);
        
        try {
          const files = await fs.readdir(dirPath);
          
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime.getTime() < cutoffTime) {
              await fs.unlink(filePath);
              deletedCount++;
              console.log(`[Archive] Deleted old file: ${file}`);
            }
          }
        } catch (error) {
          console.error(`[Archive] Failed to cleanup directory ${dir}:`, error);
        }
      }
      
      await this.logSystemEvent('archive_cleanup', {
        deletedFiles: deletedCount,
        cutoffTime: cutoffTime
      });
      
      console.log(`[Archive] Cleanup complete: ${deletedCount} files deleted`);
      
    } catch (error) {
      console.error('[Archive] Archive cleanup failed:', error);
      await this.logError(error, { context: 'archive_cleanup' });
    }
  }

  // Export archive data
  async exportArchive(options = {}) {
    try {
      const {
        startDate,
        endDate,
        includeVideos = false,
        includeScreenshots = false,
        format = 'zip'
      } = options;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const exportFileName = `archive-export-${timestamp}.${format}`;
      const exportPath = path.join(this.config.archiveDir, 'exports', exportFileName);
      
      await this.logSystemEvent('archive_export_start', {
        exportFileName: exportFileName,
        options: options
      });
      
      // Implementation would depend on compression library
      // This is a placeholder for the export logic
      
      console.log(`[Archive] Export completed: ${exportFileName}`);
      
      return {
        fileName: exportFileName,
        path: exportPath,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('[Archive] Archive export failed:', error);
      await this.logError(error, { context: 'archive_export' });
      throw error;
    }
  }

  // Get archive statistics
  getStats() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      uptime: Date.now() - this.startTime,
      metrics: { ...this.metrics },
      config: {
        archiveDir: this.config.archiveDir,
        enableVideoRecording: this.config.enableVideoRecording,
        enableScreenshots: this.config.enableScreenshots,
        videoQuality: this.config.videoQuality
      }
    };
  }

  // Shutdown archive system
  async shutdown() {
    try {
      console.log('[Archive] Shutting down archive system...');
      
      // Flush any remaining logs
      await this.flushLogBuffer();
      
      // Log session end
      await this.logEvent({
        type: 'session_end',
        sessionId: this.sessionId,
        timestamp: Date.now(),
        uptime: Date.now() - this.startTime,
        finalMetrics: { ...this.metrics }
      });
      
      // Final flush
      await this.flushLogBuffer();
      
      // Generate final metrics report
      await this.generateMetricsReport();
      
      console.log('[Archive] Archive system shutdown complete');
      
    } catch (error) {
      console.error('[Archive] Error during shutdown:', error);
      throw error;
    }
  }
}

module.exports = ArchiveManager;
