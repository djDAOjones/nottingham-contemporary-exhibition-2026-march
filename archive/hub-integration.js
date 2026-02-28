// Hub v2 Archive Integration
// Integrates archive system with Hub v2 server

const ArchiveManager = require('./archive-manager');
const VideoRecorder = require('./video-recorder');
const path = require('path');

class HubArchiveIntegration {
  constructor(hubServer, config = {}) {
    this.hubServer = hubServer;
    this.config = {
      archiveDir: config.archiveDir || path.resolve('./archives'),
      enableVideoRecording: config.enableVideoRecording || true,
      videoQuality: config.videoQuality || '4K',
      autoStartVideoRecording: config.autoStartVideoRecording || false,
      logAllEvents: config.logAllEvents !== false,
      ...config
    };
    
    this.archiveManager = null;
    this.videoRecorder = null;
    this.currentVideoRecording = null;
    this.isInitialized = false;
  }

  // Initialize archive integration
  async initialize() {
    try {
      console.log('[HubArchive] Initializing archive integration...');
      
      // Initialize archive manager
      this.archiveManager = new ArchiveManager({
        archiveDir: this.config.archiveDir,
        enableVideoRecording: this.config.enableVideoRecording,
        videoQuality: this.config.videoQuality,
        enableScreenshots: true,
        screenshotInterval: 300000 // 5 minutes
      });
      
      await this.archiveManager.initialize();
      
      // Initialize video recorder if enabled
      if (this.config.enableVideoRecording) {
        this.videoRecorder = new VideoRecorder({
          quality: this.config.videoQuality,
          outputDir: path.join(this.config.archiveDir, 'videos'),
          frameRate: 30,
          audioEnabled: true
        });
        
        const hasFfmpeg = await this.videoRecorder.checkDependencies();
        if (!hasFfmpeg) {
          console.warn('[HubArchive] FFmpeg not available, video recording disabled');
          this.config.enableVideoRecording = false;
        }
      }
      
      // Setup Hub v2 event listeners
      this.setupHubEventListeners();
      
      // Auto-start video recording if configured
      if (this.config.autoStartVideoRecording && this.config.enableVideoRecording) {
        await this.startVideoRecording();
      }
      
      this.isInitialized = true;
      console.log('[HubArchive] Archive integration initialized successfully');
      
    } catch (error) {
      console.error('[HubArchive] Failed to initialize archive integration:', error);
      throw error;
    }
  }

  // Setup event listeners for Hub v2 events
  setupHubEventListeners() {
    const { io } = this.hubServer;
    
    // Listen for new submissions
    this.hubServer.on('submission-received', async (submission, metadata) => {
      await this.archiveManager.logSubmission(submission, {
        source: 'hub_v2',
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        timestamp: Date.now()
      });
    });
    
    // Listen for moderation events
    this.hubServer.on('moderation-completed', async (moderationData) => {
      await this.archiveManager.logModeration(moderationData, {
        source: 'hub_v2_moderation'
      });
    });
    
    // Listen for module processing events
    this.hubServer.on('module-processing-started', async (moduleData) => {
      await this.archiveManager.logModuleProcessing({
        ...moduleData,
        status: 'started'
      });
    });
    
    this.hubServer.on('module-processing-completed', async (moduleData) => {
      await this.archiveManager.logModuleProcessing({
        ...moduleData,
        status: 'completed'
      });
    });
    
    this.hubServer.on('module-processing-failed', async (moduleData) => {
      await this.archiveManager.logModuleProcessing({
        ...moduleData,
        status: 'failed'
      });
    });
    
    // Listen for module status changes
    this.hubServer.on('module-connected', async (moduleInfo) => {
      await this.archiveManager.logSystemEvent('module_connected', {
        moduleId: moduleInfo.moduleId,
        moduleName: moduleInfo.name,
        modulePort: moduleInfo.port
      });
    });
    
    this.hubServer.on('module-disconnected', async (moduleInfo) => {
      await this.archiveManager.logSystemEvent('module_disconnected', {
        moduleId: moduleInfo.moduleId,
        moduleName: moduleInfo.name,
        reason: moduleInfo.reason
      });
    });
    
    this.hubServer.on('module-timeout', async (moduleInfo) => {
      await this.archiveManager.logSystemEvent('module_timeout', {
        moduleId: moduleInfo.moduleId,
        moduleName: moduleInfo.name,
        timeoutDuration: moduleInfo.timeoutDuration
      });
    });
    
    // Listen for system events
    this.hubServer.on('server-started', async () => {
      await this.archiveManager.logSystemEvent('hub_server_started', {
        port: this.hubServer.port,
        timestamp: Date.now()
      });
    });
    
    this.hubServer.on('server-stopping', async () => {
      await this.archiveManager.logSystemEvent('hub_server_stopping', {
        timestamp: Date.now()
      });
      
      // Stop any active video recording
      if (this.currentVideoRecording) {
        await this.stopVideoRecording();
      }
    });
    
    // Socket.IO events
    io.on('connection', async (socket) => {
      await this.archiveManager.logSystemEvent('client_connected', {
        socketId: socket.id,
        clientIP: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent']
      });
      
      socket.on('disconnect', async (reason) => {
        await this.archiveManager.logSystemEvent('client_disconnected', {
          socketId: socket.id,
          reason: reason
        });
      });
    });
    
    // Error logging
    process.on('uncaughtException', async (error) => {
      await this.archiveManager.logError(error, {
        context: 'uncaught_exception',
        type: 'critical'
      });
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
      await this.archiveManager.logError(new Error(`Unhandled rejection: ${reason}`), {
        context: 'unhandled_rejection',
        promise: promise.toString()
      });
    });
  }

  // Start video recording
  async startVideoRecording(options = {}) {
    if (!this.config.enableVideoRecording || !this.videoRecorder) {
      console.log('[HubArchive] Video recording not available');
      return null;
    }
    
    if (this.currentVideoRecording) {
      console.log('[HubArchive] Video recording already active');
      return this.currentVideoRecording;
    }
    
    try {
      console.log('[HubArchive] Starting video recording...');
      
      const recording = await this.videoRecorder.startRecording({
        quality: this.config.videoQuality,
        ...options
      });
      
      this.currentVideoRecording = recording;
      
      // Log video recording start
      await this.archiveManager.logSystemEvent('video_recording_started', {
        recordingId: recording.id,
        filename: recording.filename,
        quality: this.config.videoQuality
      });
      
      // Setup video recording event handlers
      this.videoRecorder.on('recording-completed', async (completedRecording) => {
        if (completedRecording.id === recording.id) {
          await this.archiveManager.logSystemEvent('video_recording_completed', {
            recordingId: completedRecording.id,
            filename: completedRecording.filename,
            duration: completedRecording.duration,
            fileSize: completedRecording.fileSize
          });
          
          this.currentVideoRecording = null;
        }
      });
      
      this.videoRecorder.on('recording-failed', async (recordingId, code, signal) => {
        if (recordingId === recording.id) {
          await this.archiveManager.logSystemEvent('video_recording_failed', {
            recordingId: recordingId,
            exitCode: code,
            signal: signal
          });
          
          this.currentVideoRecording = null;
        }
      });
      
      console.log(`[HubArchive] Video recording started: ${recording.id}`);
      return recording;
      
    } catch (error) {
      console.error('[HubArchive] Failed to start video recording:', error);
      await this.archiveManager.logError(error, {
        context: 'video_recording_start'
      });
      return null;
    }
  }

  // Stop video recording
  async stopVideoRecording() {
    if (!this.currentVideoRecording || !this.videoRecorder) {
      console.log('[HubArchive] No active video recording to stop');
      return;
    }
    
    try {
      console.log(`[HubArchive] Stopping video recording: ${this.currentVideoRecording.id}`);
      
      await this.videoRecorder.stopRecording(this.currentVideoRecording.id);
      
      await this.archiveManager.logSystemEvent('video_recording_stopped', {
        recordingId: this.currentVideoRecording.id,
        duration: Date.now() - this.currentVideoRecording.startTime
      });
      
      this.currentVideoRecording = null;
      
    } catch (error) {
      console.error('[HubArchive] Failed to stop video recording:', error);
      await this.archiveManager.logError(error, {
        context: 'video_recording_stop'
      });
    }
  }

  // Take screenshot on demand
  async takeScreenshot(metadata = {}) {
    if (!this.archiveManager) {
      throw new Error('Archive manager not initialized');
    }
    
    try {
      const screenshot = await this.archiveManager.takeScreenshot(metadata);
      
      if (screenshot) {
        await this.archiveManager.logSystemEvent('screenshot_taken_manual', {
          filename: screenshot.fileName,
          path: screenshot.path,
          metadata: metadata
        });
      }
      
      return screenshot;
      
    } catch (error) {
      console.error('[HubArchive] Failed to take screenshot:', error);
      await this.archiveManager.logError(error, {
        context: 'manual_screenshot'
      });
      throw error;
    }
  }

  // Get archive statistics
  getArchiveStats() {
    if (!this.archiveManager) {
      return null;
    }
    
    const archiveStats = this.archiveManager.getStats();
    const videoStats = this.currentVideoRecording ? 
      this.videoRecorder.getRecordingStatus(this.currentVideoRecording.id) : null;
    
    return {
      archive: archiveStats,
      video: videoStats,
      integration: {
        initialized: this.isInitialized,
        videoRecordingEnabled: this.config.enableVideoRecording,
        autoVideoRecording: this.config.autoStartVideoRecording
      }
    };
  }

  // Export archive data
  async exportArchive(options = {}) {
    if (!this.archiveManager) {
      throw new Error('Archive manager not initialized');
    }
    
    try {
      const exportResult = await this.archiveManager.exportArchive(options);
      
      await this.archiveManager.logSystemEvent('archive_exported', {
        filename: exportResult.fileName,
        options: options
      });
      
      return exportResult;
      
    } catch (error) {
      console.error('[HubArchive] Archive export failed:', error);
      await this.archiveManager.logError(error, {
        context: 'archive_export'
      });
      throw error;
    }
  }

  // Generate comprehensive exhibition report
  async generateExhibitionReport(options = {}) {
    if (!this.archiveManager) {
      throw new Error('Archive manager not initialized');
    }
    
    try {
      const stats = this.getArchiveStats();
      const metricsReport = await this.archiveManager.generateMetricsReport();
      
      const exhibitionReport = {
        timestamp: Date.now(),
        sessionId: this.archiveManager.sessionId,
        exhibition: {
          startTime: this.archiveManager.startTime,
          duration: Date.now() - this.archiveManager.startTime,
          totalSubmissions: stats.archive.metrics.submissionsLogged,
          totalModerations: stats.archive.metrics.moderationsLogged,
          totalErrors: stats.archive.metrics.errorsLogged
        },
        technical: {
          videosRecorded: stats.archive.metrics.videosRecorded,
          screenshotsTaken: stats.archive.metrics.screenshotsTaken,
          dataArchived: stats.archive.metrics.totalDataSize,
          systemUptime: process.uptime()
        },
        configuration: {
          videoQuality: this.config.videoQuality,
          archiveDirectory: this.config.archiveDir,
          videoRecordingEnabled: this.config.enableVideoRecording
        },
        metrics: metricsReport
      };
      
      // Save report
      const reportPath = path.join(
        this.config.archiveDir, 
        'reports', 
        `exhibition-report-${Date.now()}.json`
      );
      
      const fs = require('fs').promises;
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(exhibitionReport, null, 2));
      
      await this.archiveManager.logSystemEvent('exhibition_report_generated', {
        reportPath: reportPath,
        options: options
      });
      
      return {
        report: exhibitionReport,
        path: reportPath
      };
      
    } catch (error) {
      console.error('[HubArchive] Failed to generate exhibition report:', error);
      await this.archiveManager.logError(error, {
        context: 'exhibition_report'
      });
      throw error;
    }
  }

  // Shutdown archive system
  async shutdown() {
    try {
      console.log('[HubArchive] Shutting down archive integration...');
      
      // Stop video recording if active
      if (this.currentVideoRecording && this.videoRecorder) {
        await this.stopVideoRecording();
      }
      
      // Cleanup video recorder
      if (this.videoRecorder) {
        await this.videoRecorder.cleanup();
      }
      
      // Generate final exhibition report
      try {
        await this.generateExhibitionReport();
      } catch (error) {
        console.error('[HubArchive] Failed to generate final report:', error);
      }
      
      // Shutdown archive manager
      if (this.archiveManager) {
        await this.archiveManager.shutdown();
      }
      
      console.log('[HubArchive] Archive integration shutdown complete');
      
    } catch (error) {
      console.error('[HubArchive] Error during archive shutdown:', error);
      throw error;
    }
  }
}

module.exports = HubArchiveIntegration;
