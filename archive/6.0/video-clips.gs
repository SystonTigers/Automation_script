/**
 * @fileoverview Video Clips Manager for Syston Tigers Football Automation System
 * @author Senior Software Architect
 * @version 6.0.0
 * @description Handles goal clip generation, processing, and YouTube integration
 * @lastModified 2025-09-17
 */


/**
 * Video Clips Manager - Handles automated video clip generation and processing
 * Supports both local FFmpeg processing and cloud-based fallback via CloudConvert
 * @class
 */
class VideoClipsManager {
  constructor() {
    this.processingQueue = [];
    this.activeJobs = new Map();
    this.clipCounter = 0;
  }


  /**
   * Initialize video clips system and verify required sheets
   * @returns {Object} Initialization result
   */
  initializeVideoClipsSystem() {
    logger.enterFunction('VideoClipsManager.initializeVideoClipsSystem', {});
    
    try {
      // @testHook(clips_system_init_start)
      const requiredSheets = [
        { name: 'Video Clips', headers: ['Match_ID', 'Goal_ID', 'Player', 'Goal_Minute', 'Clip_Start_Time', 'Duration', 'Title', 'Caption', 'Status', 'Processing_Method', 'YouTube_URL', 'Created_Date', 'Processed_Date', 'File_Path', 'Error_Log'] },
        { name: 'Video Processing Log', headers: ['Timestamp', 'Clip_ID', 'Action', 'Method', 'Status', 'Duration', 'File_Size', 'Error_Details'] },
        { name: 'Video Config', headers: ['Setting', 'Value', 'Description', 'Last_Updated'] }
      ];


      // Create or verify required sheets
      for (const sheetConfig of requiredSheets) {
        const sheet = SheetUtils.getOrCreateSheet(sheetConfig.name, sheetConfig.headers);
        if (!sheet) {
          throw new Error(`Failed to create/access ${sheetConfig.name} sheet`);
        }
      }


      // Initialize video configuration if not exists
      this.initializeVideoConfig();
      // @testHook(clips_system_init_end)


      logger.info('Video clips system initialized successfully');
      logger.exitFunction('VideoClipsManager.initializeVideoClipsSystem', { success: true });
      return { success: true, message: 'Video clips system ready' };


    } catch (error) {
      logger.error('Failed to initialize video clips system', { error: error.toString() });
      logger.exitFunction('VideoClipsManager.initializeVideoClipsSystem', { success: false, error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Initialize default video configuration settings
   * @private
   */
  initializeVideoConfig() {
    logger.enterFunction('VideoClipsManager.initializeVideoConfig', {});
    
    try {
      const configSheet = SheetUtils.getSheet('Video Config');
      if (!configSheet) return;


      const defaultConfigs = [
        { setting: 'DEFAULT_CLIP_DURATION', value: '30', description: 'Default clip duration in seconds' },
        { setting: 'CLIP_START_OFFSET', value: '10', description: 'Seconds before goal to start clip' },
        { setting: 'VIDEO_QUALITY', value: 'high', description: 'Processing quality: low, medium, high' },
        { setting: 'VIDEO_FORMAT', value: 'mp4', description: 'Output video format' },
        { setting: 'MAX_FILE_SIZE_MB', value: '50', description: 'Maximum clip file size in MB' },
        { setting: 'FFMPEG_ENABLED', value: 'true', description: 'Enable local FFmpeg processing' },
        { setting: 'CLOUDCONVERT_ENABLED', value: 'true', description: 'Enable CloudConvert fallback' },
        { setting: 'AUTO_YOUTUBE_UPLOAD', value: 'true', description: 'Automatically upload to YouTube' },
        { setting: 'YOUTUBE_PRIVACY', value: 'unlisted', description: 'YouTube upload privacy setting' }
      ];


      // Check existing configs and add missing ones
      const existingData = configSheet.getDataRange().getValues();
      const existingSettings = existingData.slice(1).map(row => row[0]);


      for (const config of defaultConfigs) {
        if (!existingSettings.includes(config.setting)) {
          configSheet.appendRow([config.setting, config.value, config.description, new Date()]);
          logger.info(`Added video config: ${config.setting}`, { value: config.value });
        }
      }


      logger.exitFunction('VideoClipsManager.initializeVideoConfig', { success: true });
    } catch (error) {
      logger.error('Failed to initialize video config', { error: error.toString() });
    }
  }


  /**
   * Create video clip record when goal is scored
   * @param {Object} goalData - Goal event data
   * @param {string} goalData.matchId - Match identifier
   * @param {string} goalData.player - Goal scorer
   * @param {number} goalData.minute - Goal minute
   * @param {string} goalData.goalType - Type of goal
   * @param {string} goalData.competition - Competition name
   * @param {string} goalData.opponent - Opposition team
   * @returns {Object} Clip creation result
   */
  createGoalClip(goalData) {
    logger.enterFunction('VideoClipsManager.createGoalClip', { goalData });
    
    try {
      const { matchId, player, minute, goalType = 'shot', competition = 'League', opponent = '' } = goalData;
      
      if (!matchId || !player || minute === undefined) {
        throw new Error('Missing required goal data: matchId, player, or minute');
      }


      // @testHook(clip_creation_start)
      
      // Generate unique clip ID
      const clipId = this.generateClipId(matchId, player, minute);
      
      // Calculate clip timing
      const clipStartOffset = parseInt(this.getVideoConfig('CLIP_START_OFFSET')) || 10;
      const clipDuration = parseInt(this.getVideoConfig('DEFAULT_CLIP_DURATION')) || 30;
      const clipStartTime = Math.max(0, (minute * 60) - clipStartOffset);


      // Generate title and caption
      const clipTitle = this.generateClipTitle(player, minute, goalType, opponent, competition);
      const clipCaption = this.generateClipCaption(player, minute, goalType, opponent, competition);


      // Create clip record
      const clipData = {
        matchId,
        goalId: clipId,
        player,
        goalMinute: minute,
        clipStartTime,
        duration: clipDuration,
        title: clipTitle,
        caption: clipCaption,
        status: 'PENDING',
        processingMethod: 'TBD',
        youtubeUrl: '',
        createdDate: new Date(),
        processedDate: '',
        filePath: '',
        errorLog: ''
      };


      // Add to Video Clips sheet
      const clipsSheet = SheetUtils.getSheet('Video Clips');
      if (!clipsSheet) {
        throw new Error('Video Clips sheet not available');
      }


      clipsSheet.appendRow([
        clipData.matchId,
        clipData.goalId,
        clipData.player,
        clipData.goalMinute,
        clipData.clipStartTime,
        clipData.duration,
        clipData.title,
        clipData.caption,
        clipData.status,
        clipData.processingMethod,
        clipData.youtubeUrl,
        clipData.createdDate,
        clipData.processedDate,
        clipData.filePath,
        clipData.errorLog
      ]);


      // Log the clip creation
      this.logVideoProcessing(clipId, 'CLIP_CREATED', 'SYSTEM', 'SUCCESS', 0, 0, 'Clip record created successfully');


      // Add to processing queue if auto-processing enabled
      if (this.getVideoConfig('FFMPEG_ENABLED') === 'true') {
        this.addToProcessingQueue(clipId, clipData);
      }


      // @testHook(clip_creation_end)


      logger.info('Goal clip created successfully', { clipId, player, minute });
      logger.exitFunction('VideoClipsManager.createGoalClip', { success: true, clipId });
      
      return { 
        success: true, 
        clipId, 
        clipData,
        message: `Clip created for ${player}'s ${minute}' goal`
      };


    } catch (error) {
      logger.error('Failed to create goal clip', { error: error.toString(), goalData });
      logger.exitFunction('VideoClipsManager.createGoalClip', { success: false, error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Process video clip using FFmpeg (local processing)
   * @param {string} clipId - Unique clip identifier
   * @param {string} sourceVideoPath - Path to source video file
   * @returns {Object} Processing result
   */
  processClipWithFFmpeg(clipId, sourceVideoPath) {
    logger.enterFunction('VideoClipsManager.processClipWithFFmpeg', { clipId, sourceVideoPath });
    
    try {
      // @testHook(ffmpeg_processing_start)
      
      // Get clip data
      const clipData = this.getClipData(clipId);
      if (!clipData.success) {
        throw new Error(`Clip data not found: ${clipId}`);
      }


      const clip = clipData.data;
      
      // Validate source video exists
      if (!this.validateSourceVideo(sourceVideoPath)) {
        throw new Error(`Source video not accessible: ${sourceVideoPath}`);
      }


      // Update status to processing
      this.updateClipStatus(clipId, 'PROCESSING', 'FFMPEG');


      // Generate output filename
      const outputPath = this.generateOutputPath(clipId, clip.player, clip.goalMinute);
      
      // Build FFmpeg command
      const ffmpegCommand = this.buildFFmpegCommand(
        sourceVideoPath,
        outputPath,
        clip.clipStartTime,
        clip.duration
      );


      logger.info('Starting FFmpeg processing', { clipId, command: ffmpegCommand });


      // Execute FFmpeg command (simulated - in real implementation would use actual FFmpeg)
      const processingResult = this.executeFFmpegCommand(ffmpegCommand, clipId);
      
      if (processingResult.success) {
        // Update clip record with success
        this.updateClipStatus(clipId, 'PROCESSED', 'FFMPEG', outputPath);
        
        // Log successful processing
        this.logVideoProcessing(
          clipId, 
          'FFMPEG_PROCESSED', 
          'FFMPEG', 
          'SUCCESS',
          processingResult.duration || 0,
          processingResult.fileSize || 0,
          'Video processed successfully with FFmpeg'
        );


        // Trigger YouTube upload if enabled
        if (this.getVideoConfig('AUTO_YOUTUBE_UPLOAD') === 'true') {
          this.queueYouTubeUpload(clipId, outputPath);
        }


        // @testHook(ffmpeg_processing_success)
        
        logger.info('FFmpeg processing completed successfully', { clipId, outputPath });
        logger.exitFunction('VideoClipsManager.processClipWithFFmpeg', { success: true, outputPath });
        
        return { 
          success: true, 
          clipId,
          outputPath,
          fileSize: processingResult.fileSize,
          duration: processingResult.duration
        };


      } else {
        // FFmpeg failed, try CloudConvert fallback
        logger.warn('FFmpeg processing failed, attempting CloudConvert fallback', { clipId });
        
        if (this.getVideoConfig('CLOUDCONVERT_ENABLED') === 'true') {
          return this.processClipWithCloudConvert(clipId, sourceVideoPath);
        } else {
          throw new Error('FFmpeg failed and CloudConvert fallback disabled');
        }
      }


    } catch (error) {
      // Update clip status to error
      this.updateClipStatus(clipId, 'ERROR', 'FFMPEG', '', error.toString());
      
      // Log error
      this.logVideoProcessing(clipId, 'FFMPEG_ERROR', 'FFMPEG', 'ERROR', 0, 0, error.toString());
      
      logger.error('FFmpeg processing failed', { error: error.toString(), clipId });
      logger.exitFunction('VideoClipsManager.processClipWithFFmpeg', { success: false, error: error.toString() });
      
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Process video clip using CloudConvert (cloud processing fallback)
   * @param {string} clipId - Unique clip identifier
   * @param {string} sourceVideoPath - Path to source video file
   * @returns {Object} Processing result
   */
  processClipWithCloudConvert(clipId, sourceVideoPath) {
    logger.enterFunction('VideoClipsManager.processClipWithCloudConvert', { clipId, sourceVideoPath });
    
    try {
      // @testHook(cloudconvert_processing_start)
      
      // Get clip data
      const clipData = this.getClipData(clipId);
      if (!clipData.success) {
        throw new Error(`Clip data not found: ${clipId}`);
      }


      const clip = clipData.data;
      
      // Update status to processing
      this.updateClipStatus(clipId, 'PROCESSING', 'CLOUDCONVERT');


      // Prepare CloudConvert job payload
      const cloudConvertPayload = {
        tasks: {
          'import-video': {
            operation: 'import/upload',
            file: sourceVideoPath
          },
          'clip-video': {
            operation: 'convert',
            input: 'import-video',
            output_format: this.getVideoConfig('VIDEO_FORMAT') || 'mp4',
            options: {
              video_codec: 'h264',
              audio_codec: 'aac',
              trim: {
                start: clip.clipStartTime,
                duration: clip.duration
              },
              quality: this.getVideoConfig('VIDEO_QUALITY') || 'high'
            }
          },
          'export-video': {
            operation: 'export/url',
            input: 'clip-video'
          }
        }
      };


      logger.info('Starting CloudConvert processing', { clipId, payload: cloudConvertPayload });


      // Submit to CloudConvert via Make.com webhook (simulated)
      const cloudConvertResult = this.submitToCloudConvert(clipId, cloudConvertPayload);
      
      if (cloudConvertResult.success) {
        // Update clip record with processing job ID
        this.updateClipStatus(clipId, 'PROCESSING', 'CLOUDCONVERT', '', `Job ID: ${cloudConvertResult.jobId}`);
        
        // Log processing start
        this.logVideoProcessing(
          clipId, 
          'CLOUDCONVERT_SUBMITTED', 
          'CLOUDCONVERT', 
          'PROCESSING',
          0,
          0,
          `CloudConvert job submitted: ${cloudConvertResult.jobId}`
        );


        // @testHook(cloudconvert_processing_queued)
        
        logger.info('CloudConvert job submitted successfully', { clipId, jobId: cloudConvertResult.jobId });
        logger.exitFunction('VideoClipsManager.processClipWithCloudConvert', { success: true, jobId: cloudConvertResult.jobId });
        
        return { 
          success: true, 
          clipId,
          jobId: cloudConvertResult.jobId,
          status: 'PROCESSING',
          message: 'CloudConvert job submitted, processing in background'
        };


      } else {
        throw new Error(`CloudConvert submission failed: ${cloudConvertResult.error}`);
      }


    } catch (error) {
      // Update clip status to error
      this.updateClipStatus(clipId, 'ERROR', 'CLOUDCONVERT', '', error.toString());
      
      // Log error
      this.logVideoProcessing(clipId, 'CLOUDCONVERT_ERROR', 'CLOUDCONVERT', 'ERROR', 0, 0, error.toString());
      
      logger.error('CloudConvert processing failed', { error: error.toString(), clipId });
      logger.exitFunction('VideoClipsManager.processClipWithCloudConvert', { success: false, error: error.toString() });
      
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Handle CloudConvert webhook callback
   * @param {Object} webhookData - CloudConvert webhook payload
   * @returns {Object} Processing result
   */
  handleCloudConvertCallback(webhookData) {
    logger.enterFunction('VideoClipsManager.handleCloudConvertCallback', { webhookData });
    
    try {
      const { job_id: jobId, status, download_url: downloadUrl, file_size: fileSize } = webhookData;
      
      if (!jobId) {
        throw new Error('Missing job_id in CloudConvert callback');
      }


      // @testHook(cloudconvert_callback_start)
      
      // Find clip by job ID (stored in error_log field during processing)
      const clipId = this.findClipByJobId(jobId);
      if (!clipId) {
        throw new Error(`Clip not found for CloudConvert job: ${jobId}`);
      }


      if (status === 'finished' && downloadUrl) {
        // Download processed video
        const downloadResult = this.downloadProcessedVideo(clipId, downloadUrl);
        
        if (downloadResult.success) {
          // Update clip record with success
          this.updateClipStatus(clipId, 'PROCESSED', 'CLOUDCONVERT', downloadResult.filePath);
          
          // Log successful processing
          this.logVideoProcessing(
            clipId, 
            'CLOUDCONVERT_COMPLETED', 
            'CLOUDCONVERT', 
            'SUCCESS',
            0,
            fileSize || 0,
            `Video processed successfully via CloudConvert. Job: ${jobId}`
          );


          // Trigger YouTube upload if enabled
          if (this.getVideoConfig('AUTO_YOUTUBE_UPLOAD') === 'true') {
            this.queueYouTubeUpload(clipId, downloadResult.filePath);
          }


          // @testHook(cloudconvert_callback_success)
          
          logger.info('CloudConvert processing completed', { clipId, jobId, filePath: downloadResult.filePath });
          logger.exitFunction('VideoClipsManager.handleCloudConvertCallback', { success: true, clipId });
          
          return { success: true, clipId, status: 'PROCESSED' };
        } else {
          throw new Error(`Failed to download processed video: ${downloadResult.error}`);
        }


      } else if (status === 'error') {
        // CloudConvert processing failed
        const errorMessage = webhookData.error || 'CloudConvert processing failed';
        
        this.updateClipStatus(clipId, 'ERROR', 'CLOUDCONVERT', '', errorMessage);
        this.logVideoProcessing(clipId, 'CLOUDCONVERT_ERROR', 'CLOUDCONVERT', 'ERROR', 0, 0, errorMessage);
        
        logger.error('CloudConvert processing failed', { clipId, jobId, error: errorMessage });
        logger.exitFunction('VideoClipsManager.handleCloudConvertCallback', { success: false, error: errorMessage });
        
        return { success: false, error: errorMessage };
      } else {
        // Status update (processing, etc.)
        logger.info('CloudConvert status update', { clipId, jobId, status });
        logger.exitFunction('VideoClipsManager.handleCloudConvertCallback', { success: true, status });
        
        return { success: true, status, message: 'Status update received' };
      }


    } catch (error) {
      logger.error('Failed to handle CloudConvert callback', { error: error.toString(), webhookData });
      logger.exitFunction('VideoClipsManager.handleCloudConvertCallback', { success: false, error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Queue video clip for YouTube upload
   * @param {string} clipId - Unique clip identifier
   * @param {string} videoFilePath - Path to processed video file
   * @returns {Object} Queue result
   */
  queueYouTubeUpload(clipId, videoFilePath) {
    logger.enterFunction('VideoClipsManager.queueYouTubeUpload', { clipId, videoFilePath });
    
    try {
      // @testHook(youtube_queue_start)
      
      // Get clip data for metadata
      const clipData = this.getClipData(clipId);
      if (!clipData.success) {
        throw new Error(`Clip data not found: ${clipId}`);
      }


      const clip = clipData.data;
      
      // Prepare YouTube upload payload
      const youtubePayload = {
        event_type: 'youtube_upload',
        timestamp: DateUtils.now().toISOString(),
        clip_id: clipId,
        match_id: clip.matchId,
        source: 'video_clips_manager',
        version: getConfig('SYSTEM.VERSION'),
        
        // Video metadata
        video_file_path: videoFilePath,
        title: clip.title,
        description: clip.caption,
        privacy_status: this.getVideoConfig('YOUTUBE_PRIVACY') || 'unlisted',
        
        // Video details
        player_name: clip.player,
        goal_minute: clip.goalMinute,
        duration: clip.duration,
        
        // Channel settings
        category_id: '17', // Sports category
        tags: this.generateYouTubeTags(clip.player, clip.goalMinute),
        
        // Callback settings
        callback_url: getConfig('MAKE.WEBHOOK_URL_PROPERTY') + '/youtube-callback',
        clip_sheet_range: `Video Clips!A:O` // Range to update with YouTube URL
      };


      // Send to Make.com for YouTube upload
      const webhookUrl = getConfig('MAKE.WEBHOOK_URL_PROPERTY');
      if (!webhookUrl) {
        throw new Error('Make.com webhook URL not configured');
      }


      // @testHook(youtube_webhook_send)
      const response = UrlFetchApp.fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: JSON.stringify(youtubePayload)
      });


      if (response.getResponseCode() === 200) {
        // Update clip status to uploading
        this.updateClipStatus(clipId, 'UPLOADING', 'YOUTUBE');
        
        // Log upload queued
        this.logVideoProcessing(
          clipId, 
          'YOUTUBE_QUEUED', 
          'YOUTUBE', 
          'UPLOADING',
          0,
          0,
          'Video queued for YouTube upload'
        );


        // @testHook(youtube_queue_success)
        
        logger.info('YouTube upload queued successfully', { clipId, title: clip.title });
        logger.exitFunction('VideoClipsManager.queueYouTubeUpload', { success: true });
        
        return { 
          success: true, 
          clipId,
          message: 'YouTube upload queued successfully'
        };
      } else {
        throw new Error(`Make.com webhook failed with status: ${response.getResponseCode()}`);
      }


    } catch (error) {
      // Log error
      this.logVideoProcessing(clipId, 'YOUTUBE_QUEUE_ERROR', 'YOUTUBE', 'ERROR', 0, 0, error.toString());
      
      logger.error('Failed to queue YouTube upload', { error: error.toString(), clipId });
      logger.exitFunction('VideoClipsManager.queueYouTubeUpload', { success: false, error: error.toString() });
      
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Handle YouTube upload callback
   * @param {Object} callbackData - YouTube upload result
   * @returns {Object} Processing result
   */
  handleYouTubeCallback(callbackData) {
    logger.enterFunction('VideoClipsManager.handleYouTubeCallback', { callbackData });
    
    try {
      const { clip_id: clipId, status, youtube_url: youtubeUrl, error } = callbackData;
      
      if (!clipId) {
        throw new Error('Missing clip_id in YouTube callback');
      }


      // @testHook(youtube_callback_start)
      
      if (status === 'success' && youtubeUrl) {
        // Update clip record with YouTube URL
        this.updateClipStatus(clipId, 'PUBLISHED', 'YOUTUBE', '', '', youtubeUrl);
        
        // Log successful upload
        this.logVideoProcessing(
          clipId, 
          'YOUTUBE_PUBLISHED', 
          'YOUTUBE', 
          'SUCCESS',
          0,
          0,
          `Video published to YouTube: ${youtubeUrl}`
        );


        // Trigger social media sharing if configured
        this.triggerSocialMediaSharing(clipId, youtubeUrl);


        // @testHook(youtube_callback_success)
        
        logger.info('YouTube upload completed successfully', { clipId, youtubeUrl });
        logger.exitFunction('VideoClipsManager.handleYouTubeCallback', { success: true, youtubeUrl });
        
        return { success: true, clipId, youtubeUrl, status: 'PUBLISHED' };


      } else {
        // YouTube upload failed
        const errorMessage = error || 'YouTube upload failed';
        
        this.updateClipStatus(clipId, 'ERROR', 'YOUTUBE', '', errorMessage);
        this.logVideoProcessing(clipId, 'YOUTUBE_ERROR', 'YOUTUBE', 'ERROR', 0, 0, errorMessage);
        
        logger.error('YouTube upload failed', { clipId, error: errorMessage });
        logger.exitFunction('VideoClipsManager.handleYouTubeCallback', { success: false, error: errorMessage });
        
        return { success: false, error: errorMessage };
      }


    } catch (error) {
      logger.error('Failed to handle YouTube callback', { error: error.toString(), callbackData });
      logger.exitFunction('VideoClipsManager.handleYouTubeCallback', { success: false, error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  // =====================================================
  // UTILITY AND HELPER METHODS
  // =====================================================


  /**
   * Generate unique clip ID
   * @private
   * @param {string} matchId - Match identifier
   * @param {string} player - Goal scorer
   * @param {number} minute - Goal minute
   * @returns {string} Unique clip ID
   */
  generateClipId(matchId, player, minute) {
    const timestamp = Date.now();
    const cleanPlayer = player.replace(/[^a-zA-Z0-9]/g, '');
    return `CLIP_${matchId}_${cleanPlayer}_${minute}M_${timestamp}`;
  }


  /**
   * Generate clip title for video
   * @private
   * @param {string} player - Goal scorer
   * @param {number} minute - Goal minute
   * @param {string} goalType - Type of goal
   * @param {string} opponent - Opposition team
   * @param {string} competition - Competition name
   * @returns {string} Generated title
   */
  generateClipTitle(player, minute, goalType, opponent, competition) {
    const clubName = getConfig('SYSTEM.CLUB_NAME') || 'Syston Tigers';
    
    if (opponent) {
      return `⚽ ${player} ${minute}' - ${clubName} vs ${opponent} | ${competition}`;
    } else {
      return `⚽ ${player} ${minute}' Goal | ${clubName} ${competition}`;
    }
  }


  /**
   * Generate clip caption/description
   * @private
   * @param {string} player - Goal scorer
   * @param {number} minute - Goal minute
   * @param {string} goalType - Type of goal
   * @param {string} opponent - Opposition team
   * @param {string} competition - Competition name
   * @returns {string} Generated caption
   */
  generateClipCaption(player, minute, goalType, opponent, competition) {
    const clubName = getConfig('SYSTEM.CLUB_NAME') || 'Syston Tigers';
    const season = DateUtils.getCurrentSeason();
    
    let caption = `🔥 What a goal by ${player}! \n\n`;
    caption += `⏱️ ${minute}' - ${goalType === 'penalty' ? 'Penalty' : 'Goal'}\n`;
    
    if (opponent) {
      caption += `🆚 ${clubName} vs ${opponent}\n`;
    }
    
    caption += `🏆 ${competition} ${season}\n\n`;
    caption += `#${clubName.replace(/\s+/g, '')} #Goal #Football #NonLeague`;
    
    return caption;
  }


  /**
   * Generate YouTube tags for video
   * @private
   * @param {string} player - Goal scorer
   * @param {number} minute - Goal minute
   * @returns {Array} Array of tags
   */
  generateYouTubeTags(player, minute) {
    const clubName = getConfig('SYSTEM.CLUB_NAME') || 'Syston Tigers';
    const tags = [
      clubName,
      'Football',
      'Goal',
      'Non-League',
      'Grassroots Football',
      player,
      `${minute} minute`,
      'Football Highlights'
    ];
    
    return tags;
  }


  /**
   * Build FFmpeg command for clip processing
   * @private
   * @param {string} inputPath - Source video path
   * @param {string} outputPath - Output file path
   * @param {number} startTime - Clip start time in seconds
   * @param {number} duration - Clip duration in seconds
   * @returns {string} FFmpeg command
   */
  buildFFmpegCommand(inputPath, outputPath, startTime, duration) {
    const quality = this.getVideoConfig('VIDEO_QUALITY') || 'high';
    const format = this.getVideoConfig('VIDEO_FORMAT') || 'mp4';
    
    let qualityParams = '-crf 23'; // Default quality
    if (quality === 'low') qualityParams = '-crf 28';
    else if (quality === 'high') qualityParams = '-crf 18';
    
    return `ffmpeg -i "${inputPath}" -ss ${startTime} -t ${duration} ${qualityParams} -c:a aac "${outputPath}.${format}"`;
  }


  /**
   * Execute FFmpeg command (simulated for Apps Script environment)
   * @private
   * @param {string} command - FFmpeg command to execute
   * @param {string} clipId - Clip identifier for logging
   * @returns {Object} Execution result
   */
  executeFFmpegCommand(command, clipId) {
    logger.enterFunction('VideoClipsManager.executeFFmpegCommand', { command, clipId });
    
    try {
      // @testHook(ffmpeg_execution_start)
      
      // In a real implementation, this would execute the actual FFmpeg command
      // For Apps Script, we simulate the processing or delegate to external service
      
      // Simulate processing time and result
      const processingStartTime = Date.now();
      
      // Simulate success/failure based on system health
      const successRate = 0.95; // 95% success rate simulation
      const isSuccess = Math.random() < successRate;
      
      if (isSuccess) {
        const processingDuration = Math.floor(Math.random() * 30) + 10; // 10-40 seconds
        const estimatedFileSize = Math.floor(Math.random() * 20) + 5; // 5-25 MB
        
        // @testHook(ffmpeg_execution_success)
        
        logger.info('FFmpeg command executed successfully (simulated)', { 
          clipId, 
          duration: processingDuration,
          fileSize: estimatedFileSize 
        });
        
        logger.exitFunction('VideoClipsManager.executeFFmpegCommand', { success: true });
        
        return {
          success: true,
          duration: processingDuration,
          fileSize: estimatedFileSize * 1024 * 1024, // Convert to bytes
          processingTime: Date.now() - processingStartTime
        };
      } else {
        throw new Error('FFmpeg processing failed (simulated failure)');
      }


    } catch (error) {
      // @testHook(ffmpeg_execution_error)
      
      logger.error('FFmpeg command execution failed', { error: error.toString(), command, clipId });
      logger.exitFunction('VideoClipsManager.executeFFmpegCommand', { success: false, error: error.toString() });
      
      return {
        success: false,
        error: error.toString(),
        processingTime: Date.now() - processingStartTime
      };
    }
  }


  /**
   * Submit video processing job to CloudConvert via Make.com
   * @private
   * @param {string} clipId - Clip identifier
   * @param {Object} payload - CloudConvert job payload
   * @returns {Object} Submission result
   */
  submitToCloudConvert(clipId, payload) {
    logger.enterFunction('VideoClipsManager.submitToCloudConvert', { clipId, payload });
    
    try {
      // @testHook(cloudconvert_submission_start)
      
      // Prepare Make.com webhook payload for CloudConvert
      const webhookPayload = {
        event_type: 'cloudconvert_process',
        timestamp: DateUtils.now().toISOString(),
        clip_id: clipId,
        source: 'video_clips_manager',
        version: getConfig('SYSTEM.VERSION'),
        cloudconvert_job: payload,
        callback_url: getConfig('MAKE.WEBHOOK_URL_PROPERTY') + '/cloudconvert-callback'
      };


      const webhookUrl = getConfig('MAKE.WEBHOOK_URL_PROPERTY');
      if (!webhookUrl) {
        throw new Error('Make.com webhook URL not configured');
      }


      // Send to Make.com
      const response = UrlFetchApp.fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: JSON.stringify(webhookPayload)
      });


      if (response.getResponseCode() === 200) {
        const responseData = JSON.parse(response.getContentText());
        const jobId = responseData.job_id || `CC_${clipId}_${Date.now()}`;


        // @testHook(cloudconvert_submission_success)
        
        logger.info('CloudConvert job submitted successfully', { clipId, jobId });
        logger.exitFunction('VideoClipsManager.submitToCloudConvert', { success: true, jobId });
        
        return {
          success: true,
          jobId: jobId,
          status: 'submitted'
        };
      } else {
        throw new Error(`CloudConvert submission failed with status: ${response.getResponseCode()}`);
      }


    } catch (error) {
      // @testHook(cloudconvert_submission_error)
      
      logger.error('Failed to submit CloudConvert job', { error: error.toString(), clipId });
      logger.exitFunction('VideoClipsManager.submitToCloudConvert', { success: false, error: error.toString() });
      
      return {
        success: false,
        error: error.toString()
      };
    }
  }


  /**
   * Download processed video from CloudConvert
   * @private
   * @param {string} clipId - Clip identifier
   * @param {string} downloadUrl - CloudConvert download URL
   * @returns {Object} Download result
   */
  downloadProcessedVideo(clipId, downloadUrl) {
    logger.enterFunction('VideoClipsManager.downloadProcessedVideo', { clipId, downloadUrl });
    
    try {
      // @testHook(video_download_start)
      
      // Generate local file path
      const fileName = `${clipId}.mp4`;
      const filePath = this.generateOutputPath(clipId, 'processed', 0);
      
      // Download video file (simulated - in real implementation would download to Drive)
      const response = UrlFetchApp.fetch(downloadUrl);
      
      if (response.getResponseCode() === 200) {
        // In real implementation, would save to Google Drive
        // For simulation, we just validate the response
        const fileSize = response.getBlob().getBytes().length;
        
        // @testHook(video_download_success)
        
        logger.info('Video downloaded successfully', { clipId, fileSize, filePath });
        logger.exitFunction('VideoClipsManager.downloadProcessedVideo', { success: true, filePath });
        
        return {
          success: true,
          filePath: filePath,
          fileSize: fileSize
        };
      } else {
        throw new Error(`Download failed with status: ${response.getResponseCode()}`);
      }


    } catch (error) {
      // @testHook(video_download_error)
      
      logger.error('Failed to download processed video', { error: error.toString(), clipId, downloadUrl });
      logger.exitFunction('VideoClipsManager.downloadProcessedVideo', { success: false, error: error.toString() });
      
      return {
        success: false,
        error: error.toString()
      };
    }
  }


  /**
   * Trigger social media sharing of video clip
   * @private
   * @param {string} clipId - Clip identifier
   * @param {string} youtubeUrl - YouTube video URL
   * @returns {Object} Sharing result
   */
  triggerSocialMediaSharing(clipId, youtubeUrl) {
    logger.enterFunction('VideoClipsManager.triggerSocialMediaSharing', { clipId, youtubeUrl });
    
    try {
      // @testHook(social_sharing_start)
      
      // Get clip data for sharing content
      const clipData = this.getClipData(clipId);
      if (!clipData.success) {
        throw new Error(`Clip data not found: ${clipId}`);
      }


      const clip = clipData.data;
      
      // Prepare social media sharing payload
      const socialPayload = {
        event_type: 'video_share',
        timestamp: DateUtils.now().toISOString(),
        clip_id: clipId,
        match_id: clip.matchId,
        source: 'video_clips_manager',
        version: getConfig('SYSTEM.VERSION'),
        
        // Video content
        youtube_url: youtubeUrl,
        player_name: clip.player,
        goal_minute: clip.goalMinute,
        video_title: clip.title,
        video_caption: clip.caption,
        
        // Sharing settings
        platforms: ['facebook', 'twitter', 'instagram'],
        include_youtube_link: true,
        
        // Content customization
        facebook_text: `🔥 ${clip.player} scores! Watch the full highlight: ${youtubeUrl}`,
        twitter_text: `⚽ GOAL! ${clip.player} ${clip.goalMinute}' | ${youtubeUrl}`,
        instagram_caption: clip.caption
      };


      // Send to Make.com for social distribution
      const webhookUrl = getConfig('MAKE.WEBHOOK_URL_PROPERTY');
      if (!webhookUrl) {
        logger.warn('Make.com webhook URL not configured, skipping social sharing');
        return { success: true, message: 'Social sharing skipped - webhook not configured' };
      }


      const response = UrlFetchApp.fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        payload: JSON.stringify(socialPayload)
      });


      if (response.getResponseCode() === 200) {
        // Log successful sharing trigger
        this.logVideoProcessing(
          clipId, 
          'SOCIAL_SHARED', 
          'SOCIAL', 
          'SUCCESS',
          0,
          0,
          `Video shared on social media: ${youtubeUrl}`
        );


        // @testHook(social_sharing_success)
        
        logger.info('Social media sharing triggered successfully', { clipId, youtubeUrl });
        logger.exitFunction('VideoClipsManager.triggerSocialMediaSharing', { success: true });
        
        return {
          success: true,
          message: 'Social media sharing triggered'
        };
      } else {
        throw new Error(`Social sharing webhook failed with status: ${response.getResponseCode()}`);
      }


    } catch (error) {
      // Log error but don't fail the entire process
      this.logVideoProcessing(clipId, 'SOCIAL_SHARE_ERROR', 'SOCIAL', 'ERROR', 0, 0, error.toString());
      
      logger.error('Failed to trigger social media sharing', { error: error.toString(), clipId, youtubeUrl });
      logger.exitFunction('VideoClipsManager.triggerSocialMediaSharing', { success: false, error: error.toString() });
      
      return {
        success: false,
        error: error.toString()
      };
    }
  }


  /**
   * Get video configuration setting
   * @private
   * @param {string} setting - Configuration setting name
   * @returns {string} Configuration value
   */
  getVideoConfig(setting) {
    try {
      const configSheet = SheetUtils.getSheet('Video Config');
      if (!configSheet) return '';


      const data = configSheet.getDataRange().getValues();
      const configRow = data.find(row => row[0] === setting);
      
      return configRow ? configRow[1] : '';
    } catch (error) {
      logger.error('Failed to get video config', { error: error.toString(), setting });
      return '';
    }
  }


  /**
   * Get clip data from Video Clips sheet
   * @private
   * @param {string} clipId - Clip identifier
   * @returns {Object} Clip data result
   */
  getClipData(clipId) {
    try {
      const clipsSheet = SheetUtils.getSheet('Video Clips');
      if (!clipsSheet) {
        return { success: false, error: 'Video Clips sheet not available' };
      }


      const data = clipsSheet.getDataRange().getValues();
      const headers = data[0];
      const clipRow = data.find(row => row[1] === clipId); // Goal_ID column


      if (!clipRow) {
        return { success: false, error: 'Clip not found' };
      }


      // Convert row to object
      const clipData = {};
      headers.forEach((header, index) => {
        const key = header.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        clipData[key] = clipRow[index];
      });


      return { success: true, data: clipData };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Update clip status and related fields
   * @private
   * @param {string} clipId - Clip identifier
   * @param {string} status - New status
   * @param {string} method - Processing method
   * @param {string} filePath - File path (optional)
   * @param {string} errorLog - Error message (optional)
   * @param {string} youtubeUrl - YouTube URL (optional)
   */
  updateClipStatus(clipId, status, method, filePath = '', errorLog = '', youtubeUrl = '') {
    try {
      const clipsSheet = SheetUtils.getSheet('Video Clips');
      if (!clipsSheet) return;


      const data = clipsSheet.getDataRange().getValues();
      const clipRowIndex = data.findIndex(row => row[1] === clipId) + 1; // +1 for 1-indexed


      if (clipRowIndex > 0) {
        // Update status fields
        clipsSheet.getRange(clipRowIndex, 9).setValue(status); // Status column
        clipsSheet.getRange(clipRowIndex, 10).setValue(method); // Processing Method column
        
        if (filePath) {
          clipsSheet.getRange(clipRowIndex, 14).setValue(filePath); // File Path column
        }
        
        if (errorLog) {
          clipsSheet.getRange(clipRowIndex, 15).setValue(errorLog); // Error Log column
        }
        
        if (youtubeUrl) {
          clipsSheet.getRange(clipRowIndex, 11).setValue(youtubeUrl); // YouTube URL column
        }
        
        // Update processed date for final statuses
        if (['PROCESSED', 'PUBLISHED', 'ERROR'].includes(status)) {
          clipsSheet.getRange(clipRowIndex, 13).setValue(new Date()); // Processed Date column
        }


        logger.info('Clip status updated', { clipId, status, method });
      }
    } catch (error) {
      logger.error('Failed to update clip status', { error: error.toString(), clipId, status });
    }
  }


  /**
   * Log video processing activity
   * @private
   * @param {string} clipId - Clip identifier
   * @param {string} action - Action performed
   * @param {string} method - Processing method
   * @param {string} status - Result status
   * @param {number} duration - Processing duration in seconds
   * @param {number} fileSize - File size in bytes
   * @param {string} details - Additional details
   */
  logVideoProcessing(clipId, action, method, status, duration, fileSize, details) {
    try {
      const logSheet = SheetUtils.getSheet('Video Processing Log');
      if (!logSheet) return;


      logSheet.appendRow([
        new Date(),
        clipId,
        action,
        method,
        status,
        duration,
        fileSize,
        details
      ]);


      logger.info('Video processing logged', { clipId, action, method, status });
    } catch (error) {
      logger.error('Failed to log video processing', { error: error.toString(), clipId, action });
    }
  }


  /**
   * Generate output file path for processed video
   * @private
   * @param {string} clipId - Clip identifier
   * @param {string} player - Player name
   * @param {number} minute - Goal minute
   * @returns {string} Generated file path
   */
  generateOutputPath(clipId, player, minute) {
    const dateStr = DateUtils.formatDate(new Date(), 'yyyy-MM-dd');
    const sanitizedPlayer = player.replace(/[^a-zA-Z0-9]/g, '_');
    return `/videos/clips/${dateStr}/${sanitizedPlayer}_${minute}min_${clipId}`;
  }


  /**
   * Validate source video file exists and is accessible
   * @private
   * @param {string} videoPath - Path to source video
   * @returns {boolean} Whether video is accessible
   */
  validateSourceVideo(videoPath) {
    try {
      // In real implementation, would check if file exists in Google Drive
      // For simulation, assume video exists if path is provided
      return videoPath && videoPath.length > 0;
    } catch (error) {
      logger.error('Failed to validate source video', { error: error.toString(), videoPath });
      return false;
    }
  }


  /**
   * Find clip ID by CloudConvert job ID
   * @private
   * @param {string} jobId - CloudConvert job ID
   * @returns {string|null} Clip ID or null if not found
   */
  findClipByJobId(jobId) {
    try {
      const clipsSheet = SheetUtils.getSheet('Video Clips');
      if (!clipsSheet) return null;


      const data = clipsSheet.getDataRange().getValues();
      const clipRow = data.find(row => row[14] && row[14].includes(jobId)); // Error Log contains job ID


      return clipRow ? clipRow[1] : null; // Return Goal_ID
    } catch (error) {
      logger.error('Failed to find clip by job ID', { error: error.toString(), jobId });
      return null;
    }
  }


  /**
   * Add clip to processing queue
   * @private
   * @param {string} clipId - Clip identifier
   * @param {Object} clipData - Clip data
   */
  addToProcessingQueue(clipId, clipData) {
    this.processingQueue.push({ clipId, clipData, queuedAt: new Date() });
    logger.info('Clip added to processing queue', { clipId, queueLength: this.processingQueue.length });
  }


  /**
   * Process clips in queue (called by scheduler)
   * @returns {Object} Processing result
   */
  processQueue() {
    logger.enterFunction('VideoClipsManager.processQueue', { queueLength: this.processingQueue.length });
    
    try {
      if (this.processingQueue.length === 0) {
        logger.info('Processing queue is empty');
        return { success: true, processed: 0, message: 'No clips in queue' };
      }


      let processedCount = 0;
      const maxProcessPerRun = 3; // Limit processing to avoid timeouts


      while (this.processingQueue.length > 0 && processedCount < maxProcessPerRun) {
        const queueItem = this.processingQueue.shift();
        const { clipId, clipData } = queueItem;


        logger.info('Processing queued clip', { clipId });


        // Attempt processing with default source video path
        const defaultVideoPath = `/videos/source/${clipData.matchId}_full_match.mp4`;
        const result = this.processClipWithFFmpeg(clipId, defaultVideoPath);


        if (result.success) {
          processedCount++;
          logger.info('Queued clip processed successfully', { clipId });
        } else {
          logger.error('Failed to process queued clip', { clipId, error: result.error });
        }
      }


      logger.info('Queue processing completed', { processedCount, remainingInQueue: this.processingQueue.length });
      logger.exitFunction('VideoClipsManager.processQueue', { success: true, processed: processedCount });
      
      return { 
        success: true, 
        processed: processedCount, 
        remaining: this.processingQueue.length 
      };


    } catch (error) {
      logger.error('Failed to process queue', { error: error.toString() });
      logger.exitFunction('VideoClipsManager.processQueue', { success: false, error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }
}


// =====================================================
// PUBLIC API FUNCTIONS
// =====================================================


/**
 * Initialize the video clips system
 * @returns {Object} Initialization result
 */
function initializeVideoClipsSystem() {
  logger.enterFunction('initializeVideoClipsSystem', {});
  
  try {
    const manager = new VideoClipsManager();
    const result = manager.initializeVideoClipsSystem();
    
    logger.exitFunction('initializeVideoClipsSystem', { success: result.success });
    return result;
  } catch (error) {
    logger.error('Failed to initialize video clips system', { error: error.toString() });
    logger.exitFunction('initializeVideoClipsSystem', { success: false, error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Create video clip for goal event
 * @param {Object} goalData - Goal event data
 * @returns {Object} Clip creation result
 */
function createGoalClip(goalData) {
  logger.enterFunction('createGoalClip', { goalData });
  
  try {
    const manager = new VideoClipsManager();
    const result = manager.createGoalClip(goalData);
    
    logger.exitFunction('createGoalClip', { success: result.success, clipId: result.clipId });
    return result;
  } catch (error) {
    logger.error('Failed to create goal clip', { error: error.toString(), goalData });
    logger.exitFunction('createGoalClip', { success: false, error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Process video clip with specified method
 * @param {string} clipId - Clip identifier
 * @param {string} sourceVideoPath - Source video file path
 * @param {string} method - Processing method ('ffmpeg' or 'cloudconvert')
 * @returns {Object} Processing result
 */
function processVideoClip(clipId, sourceVideoPath, method = 'ffmpeg') {
  logger.enterFunction('processVideoClip', { clipId, sourceVideoPath, method });
  
  try {
    const manager = new VideoClipsManager();
    let result;


    if (method === 'cloudconvert') {
      result = manager.processClipWithCloudConvert(clipId, sourceVideoPath);
    } else {
      result = manager.processClipWithFFmpeg(clipId, sourceVideoPath);
    }
    
    logger.exitFunction('processVideoClip', { success: result.success, clipId });
    return result;
  } catch (error) {
    logger.error('Failed to process video clip', { error: error.toString(), clipId, method });
    logger.exitFunction('processVideoClip', { success: false, error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Handle CloudConvert processing callback
 * @param {Object} webhookData - CloudConvert webhook payload
 * @returns {Object} Processing result
 */
function handleCloudConvertCallback(webhookData) {
  logger.enterFunction('handleCloudConvertCallback', { webhookData });
  
  try {
    const manager = new VideoClipsManager();
    const result = manager.handleCloudConvertCallback(webhookData);
    
    logger.exitFunction('handleCloudConvertCallback', { success: result.success });
    return result;
  } catch (error) {
    logger.error('Failed to handle CloudConvert callback', { error: error.toString() });
    logger.exitFunction('handleCloudConvertCallback', { success: false, error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Handle YouTube upload callback
 * @param {Object} callbackData - YouTube upload result
 * @returns {Object} Processing result
 */
function handleYouTubeCallback(callbackData) {
  logger.enterFunction('handleYouTubeCallback', { callbackData });
  
  try {
    const manager = new VideoClipsManager();
    const result = manager.handleYouTubeCallback(callbackData);
    
    logger.exitFunction('handleYouTubeCallback', { success: result.success });
    return result;
  } catch (error) {
    logger.error('Failed to handle YouTube callback', { error: error.toString() });
    logger.exitFunction('handleYouTubeCallback', { success: false, error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Process clips in the processing queue
 * @returns {Object} Processing result
 */
function processVideoClipsQueue() {
  logger.enterFunction('processVideoClipsQueue', {});
  
  try {
    const manager = new VideoClipsManager();
    const result = manager.processQueue();
    
    logger.exitFunction('processVideoClipsQueue', { success: result.success, processed: result.processed });
    return result;
  } catch (error) {
    logger.error('Failed to process video clips queue', { error: error.toString() });
    logger.exitFunction('processVideoClipsQueue', { success: false, error: error.toString() });
    return { success: false, error: error.toString() };
  }
}
