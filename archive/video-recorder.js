// Video Recorder - 4K Video Recording Integration
// Cross-platform screen recording with ffmpeg

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');

class VideoRecorder extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      quality: config.quality || '4K', // 4K, 1080p, 720p, 480p
      frameRate: config.frameRate || 30,
      format: config.format || 'mp4',
      codec: config.codec || 'h264',
      audioEnabled: config.audioEnabled !== false,
      display: config.display || ':0.0', // For Linux
      outputDir: config.outputDir || './recordings',
      maxDuration: config.maxDuration || 3600, // 1 hour max
      maxFileSize: config.maxFileSize || 2 * 1024 * 1024 * 1024, // 2GB max
      ...config
    };
    
    this.activeRecordings = new Map();
    this.platform = process.platform;
    this.ffmpegPath = config.ffmpegPath || 'ffmpeg';
    
    // Quality settings
    this.qualitySettings = {
      '4K': { width: 3840, height: 2160, bitrate: '20000k' },
      '1080p': { width: 1920, height: 1080, bitrate: '8000k' },
      '720p': { width: 1280, height: 720, bitrate: '4000k' },
      '480p': { width: 854, height: 480, bitrate: '2000k' }
    };
  }

  // Check if ffmpeg is available
  async checkDependencies() {
    return new Promise((resolve) => {
      exec(`${this.ffmpegPath} -version`, (error) => {
        if (error) {
          console.error('[VideoRecorder] FFmpeg not found:', error.message);
          resolve(false);
        } else {
          console.log('[VideoRecorder] FFmpeg available');
          resolve(true);
        }
      });
    });
  }

  // Start screen recording
  async startRecording(options = {}) {
    try {
      const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `recording_${timestamp}.${this.config.format}`;
      const outputPath = path.join(this.config.outputDir, filename);
      
      // Ensure output directory exists
      await fs.mkdir(this.config.outputDir, { recursive: true });
      
      console.log(`[VideoRecorder] Starting recording: ${recordingId}`);
      console.log(`[VideoRecorder] Output: ${filename}`);
      
      const ffmpegArgs = this.buildFFmpegArgs(outputPath, options);
      console.log(`[VideoRecorder] FFmpeg command: ${this.ffmpegPath} ${ffmpegArgs.join(' ')}`);
      
      const ffmpegProcess = spawn(this.ffmpegPath, ffmpegArgs);
      
      const recording = {
        id: recordingId,
        filename: filename,
        path: outputPath,
        startTime: Date.now(),
        process: ffmpegProcess,
        status: 'starting',
        duration: 0,
        fileSize: 0
      };
      
      this.activeRecordings.set(recordingId, recording);
      
      // Handle ffmpeg events
      ffmpegProcess.stdout.on('data', (data) => {
        console.log(`[VideoRecorder] FFmpeg stdout: ${data.toString().trim()}`);
      });
      
      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();
        // Parse duration and file size from ffmpeg output
        this.parseFFmpegOutput(recordingId, output);
      });
      
      ffmpegProcess.on('spawn', () => {
        recording.status = 'recording';
        console.log(`[VideoRecorder] Recording started: ${recordingId}`);
        this.emit('recording-started', recording);
      });
      
      ffmpegProcess.on('error', (error) => {
        recording.status = 'error';
        recording.error = error.message;
        console.error(`[VideoRecorder] FFmpeg error:`, error);
        this.emit('recording-error', recordingId, error);
        this.activeRecordings.delete(recordingId);
      });
      
      ffmpegProcess.on('exit', (code, signal) => {
        recording.status = code === 0 ? 'completed' : 'failed';
        recording.endTime = Date.now();
        recording.duration = recording.endTime - recording.startTime;
        
        console.log(`[VideoRecorder] Recording ${recordingId} ended with code ${code}`);
        
        if (code === 0) {
          this.emit('recording-completed', recording);
        } else {
          this.emit('recording-failed', recordingId, code, signal);
        }
        
        this.activeRecordings.delete(recordingId);
      });
      
      // Set up auto-stop timer if maxDuration specified
      if (this.config.maxDuration > 0) {
        setTimeout(() => {
          if (this.activeRecordings.has(recordingId)) {
            this.stopRecording(recordingId);
          }
        }, this.config.maxDuration * 1000);
      }
      
      return recording;
      
    } catch (error) {
      console.error('[VideoRecorder] Failed to start recording:', error);
      throw error;
    }
  }

  // Build ffmpeg arguments for different platforms
  buildFFmpegArgs(outputPath, options = {}) {
    const quality = this.qualitySettings[this.config.quality];
    const args = [];
    
    // Platform-specific input configuration
    switch (this.platform) {
      case 'darwin': // macOS
        args.push('-f', 'avfoundation');
        args.push('-r', this.config.frameRate.toString());
        
        if (this.config.audioEnabled) {
          args.push('-i', '1:0'); // Screen:Audio
        } else {
          args.push('-i', '1'); // Screen only
        }
        break;
        
      case 'win32': // Windows
        args.push('-f', 'gdigrab');
        args.push('-r', this.config.frameRate.toString());
        args.push('-i', 'desktop');
        
        if (this.config.audioEnabled) {
          args.push('-f', 'dshow');
          args.push('-i', 'audio="virtual-audio-capturer"');
        }
        break;
        
      case 'linux': // Linux
        args.push('-f', 'x11grab');
        args.push('-r', this.config.frameRate.toString());
        args.push('-s', `${quality.width}x${quality.height}`);
        args.push('-i', this.config.display);
        
        if (this.config.audioEnabled) {
          args.push('-f', 'pulse');
          args.push('-i', 'default');
        }
        break;
    }
    
    // Video encoding settings
    args.push('-c:v', this.config.codec);
    args.push('-b:v', quality.bitrate);
    args.push('-preset', 'medium'); // Balance between speed and quality
    args.push('-crf', '18'); // High quality
    
    // Audio encoding (if enabled)
    if (this.config.audioEnabled) {
      args.push('-c:a', 'aac');
      args.push('-b:a', '128k');
    }
    
    // Output format
    args.push('-pix_fmt', 'yuv420p'); // Compatibility
    args.push('-movflags', '+faststart'); // Web streaming optimization
    
    // Override options
    if (options.customArgs) {
      args.push(...options.customArgs);
    }
    
    args.push(outputPath);
    
    return args;
  }

  // Parse ffmpeg output for progress information
  parseFFmpegOutput(recordingId, output) {
    const recording = this.activeRecordings.get(recordingId);
    if (!recording) return;
    
    // Parse duration: frame=  123 fps=30 q=23.0 size=    1024kB time=00:00:04.10 bitrate=2048.0kbits/s
    const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
    if (timeMatch) {
      const [, hours, minutes, seconds, centiseconds] = timeMatch;
      const totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(centiseconds) / 100;
      recording.recordedDuration = totalSeconds;
    }
    
    // Parse file size: size=    1024kB
    const sizeMatch = output.match(/size=\s*(\d+)kB/);
    if (sizeMatch) {
      recording.fileSize = parseInt(sizeMatch[1]) * 1024;
    }
    
    // Check if file size exceeds limit
    if (this.config.maxFileSize > 0 && recording.fileSize > this.config.maxFileSize) {
      console.log(`[VideoRecorder] Recording ${recordingId} exceeded size limit, stopping`);
      this.stopRecording(recordingId);
    }
    
    this.emit('recording-progress', recordingId, {
      duration: recording.recordedDuration,
      fileSize: recording.fileSize
    });
  }

  // Stop recording
  async stopRecording(recordingId) {
    const recording = this.activeRecordings.get(recordingId);
    if (!recording) {
      throw new Error(`Recording ${recordingId} not found`);
    }
    
    if (recording.status !== 'recording') {
      console.log(`[VideoRecorder] Recording ${recordingId} is not active (${recording.status})`);
      return;
    }
    
    console.log(`[VideoRecorder] Stopping recording: ${recordingId}`);
    
    // Send SIGINT to gracefully stop ffmpeg
    recording.process.kill('SIGINT');
    recording.status = 'stopping';
    
    // Wait for process to exit
    return new Promise((resolve) => {
      recording.process.on('exit', () => {
        resolve();
      });
      
      // Force kill after 10 seconds if not stopped
      setTimeout(() => {
        if (recording.process && !recording.process.killed) {
          recording.process.kill('SIGKILL');
          resolve();
        }
      }, 10000);
    });
  }

  // Stop all recordings
  async stopAllRecordings() {
    const promises = [];
    for (const recordingId of this.activeRecordings.keys()) {
      promises.push(this.stopRecording(recordingId));
    }
    await Promise.all(promises);
  }

  // Get recording status
  getRecordingStatus(recordingId) {
    const recording = this.activeRecordings.get(recordingId);
    if (!recording) {
      return null;
    }
    
    return {
      id: recording.id,
      filename: recording.filename,
      status: recording.status,
      startTime: recording.startTime,
      duration: Date.now() - recording.startTime,
      recordedDuration: recording.recordedDuration || 0,
      fileSize: recording.fileSize || 0,
      error: recording.error
    };
  }

  // List all active recordings
  getActiveRecordings() {
    return Array.from(this.activeRecordings.keys()).map(id => 
      this.getRecordingStatus(id)
    );
  }

  // Get platform-specific recording capabilities
  getCapabilities() {
    const capabilities = {
      platform: this.platform,
      videoFormats: ['mp4', 'mkv', 'avi'],
      videoCodecs: ['h264', 'h265', 'vp9'],
      audioSupport: this.config.audioEnabled,
      qualities: Object.keys(this.qualitySettings)
    };
    
    // Platform-specific capabilities
    switch (this.platform) {
      case 'darwin':
        capabilities.inputSources = ['Screen', 'Camera', 'Audio'];
        break;
      case 'win32':
        capabilities.inputSources = ['Desktop', 'Window', 'Audio'];
        break;
      case 'linux':
        capabilities.inputSources = ['X11', 'Wayland', 'Audio'];
        break;
    }
    
    return capabilities;
  }

  // Convert video to different format/quality
  async convertVideo(inputPath, outputPath, options = {}) {
    const {
      quality = this.config.quality,
      format = this.config.format,
      codec = this.config.codec
    } = options;
    
    const qualitySettings = this.qualitySettings[quality];
    
    const args = [
      '-i', inputPath,
      '-c:v', codec,
      '-b:v', qualitySettings.bitrate,
      '-s', `${qualitySettings.width}x${qualitySettings.height}`,
      '-preset', 'medium',
      '-y', // Overwrite output
      outputPath
    ];
    
    console.log(`[VideoRecorder] Converting video: ${inputPath} -> ${outputPath}`);
    
    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn(this.ffmpegPath, args);
      
      ffmpegProcess.on('exit', (code) => {
        if (code === 0) {
          console.log('[VideoRecorder] Video conversion completed');
          resolve(outputPath);
        } else {
          reject(new Error(`Video conversion failed with code ${code}`));
        }
      });
      
      ffmpegProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  // Generate video thumbnail
  async generateThumbnail(videoPath, thumbnailPath, timeOffset = '00:00:01') {
    const args = [
      '-i', videoPath,
      '-ss', timeOffset,
      '-vframes', '1',
      '-q:v', '2',
      '-y',
      thumbnailPath
    ];
    
    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn(this.ffmpegPath, args);
      
      ffmpegProcess.on('exit', (code) => {
        if (code === 0) {
          resolve(thumbnailPath);
        } else {
          reject(new Error(`Thumbnail generation failed with code ${code}`));
        }
      });
      
      ffmpegProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  // Cleanup - stop all recordings and clean up resources
  async cleanup() {
    console.log('[VideoRecorder] Cleaning up video recorder...');
    await this.stopAllRecordings();
    console.log('[VideoRecorder] Video recorder cleanup complete');
  }
}

module.exports = VideoRecorder;
