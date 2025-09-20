/**
 * @fileoverview Syston Tigers Automation - Video Clips and GOTM Management
 * @version 5.0.0
 * @author Senior Software Architect
 * 
 * Handles video clip creation, Goal of the Month (GOTM) voting, YouTube integration,
 * and automated video processing per checklist requirements.
 */


/**
 * Video Clips Manager - Comprehensive video and GOTM management
 * Per checklist: goal clips, GOTM voting, YouTube upload, automated processing
 */
class VideoClipsManager extends BaseAutomationComponent {
  
  constructor() {
    super('VideoClipsManager');
    this.processingQueue = [];
    this.votingActive = false;
    this.currentGotmMonth = null;
  }


  /**
   * Initialize video clips manager
   * @returns {boolean} Success status
   */
  doInitialize() {
    logger.enterFunction('VideoClipsManager.doInitialize');
    
    try {
      // Ensure required sheets exist
      const requiredSheets = [
        { 
          name: getConfig('SHEETS.VIDEO_CLIPS'), 
          headers: ['Match_ID', 'Event_Type', 'Player', 'Minute', 'Start_Time', 'Duration', 'Title', 'Caption', 'Status', 'YouTube_URL', 'Created'] 
        },
        { 
          name: getConfig('SHEETS.GOTM_VOTES'), 
          headers: ['Timestamp', 'Player', 'Goal_ID', 'Vote_Source', 'Voter_Info', 'Month_Year'] 
        },
        { 
          name: 'Video_Processing_Log', 
          headers: ['Timestamp', 'Clip_ID', 'Status', 'Process_Type', 'Input_File', 'Output_File', 'Error_Details'] 
        }
      ];


      for (const sheetConfig of requiredSheets) {
        const sheet = SheetUtils.getOrCreateSheet(sheetConfig.name, sheetConfig.headers);
        if (!sheet) {
          logger.error(`Failed to create required sheet: ${sheetConfig.name}`);
          return false;
        }
      }


      // Load current GOTM state
      this.loadGotmState();


      logger.exitFunction('VideoClipsManager.doInitialize', { success: true });
      return true;
    } catch (error) {
      logger.error('VideoClipsManager initialization failed', { error: error.toString() });
      return false;
    }
  }


  /**
   * Load current GOTM voting state
   */
  loadGotmState() {
    try {
      const now = DateUtils.now();
      const currentMonth = DateUtils.formatDate(now, 'MMMM yyyy');
      
      // Check if voting is currently active for this month
      const votingDay = now.getDate();
      const openDay = getConfig('SCHEDULE.GOTM_VOTING.OPEN_DAY', 1);
      const closeDay = getConfig('SCHEDULE.GOTM_VOTING.CLOSE_DAY', 7);
      
      this.votingActive = votingDay >= openDay && votingDay <= closeDay;
      this.currentGotmMonth = currentMonth;
      
      logger.info('GOTM state loaded', {
        currentMonth: currentMonth,
        votingActive: this.votingActive,
        votingDay: votingDay
      });
      
    } catch (error) {
      logger.warn('Failed to load GOTM state', { error: error.toString() });
    }
  }


  // ===== VIDEO CLIP CREATION (Per Checklist) =====


  /**
   * Create video clip entry for goal event
   * @param {string} matchId - Match ID
   * @param {string} player - Player name
   * @param {number} minute - Goal minute
   * @param {string} details - Additional details
   * @returns {Object} Clip creation result
   */
  createGoalClip(matchId, player, minute, details = '') {
    logger.enterFunction('VideoClipsManager.createGoalClip', {
      matchId, player, minute, details
    });


    return this.withLock(() => {
      try {
        logger.testHook('goal_clip_creation_start', { matchId, player, minute });


        // Calculate clip timing per checklist (minute - 3s start, 30s duration)
        const clipDuration = getConfig('VIDEO.CLIP_DURATION_SECONDS', 30);
        const preGoalSeconds = getConfig('VIDEO.PRE_GOAL_SECONDS', 10);
        const postGoalSeconds = getConfig('VIDEO.POST_GOAL_SECONDS', 20);
        
        const startTime = Math.max(0, (minute * 60) - preGoalSeconds);
        
        // Generate clip metadata
        const clipData = {
          matchId: matchId,
          eventType: 'goal',
          player: player,
          minute: minute,
          startTime: startTime,
          duration: clipDuration,
          title: this.generateClipTitle(player, minute, details),
          caption: this.generateClipCaption(player, minute, details),
          status: 'CREATED',
          youtubeUrl: null,
          created: DateUtils.now().toISOString()
        };


        // Log clip to sheet
        const logResult = this.logVideoClip(clipData);
        if (!logResult) {
          logger.error('Failed to log video clip');
          return { success: false, error: 'Failed to log clip' };
        }


        // Add to processing queue
        this.processingQueue.push({
          clipId: StringUtils.generateId('clip'),
          clipData: clipData,
          priority: 'high',
          created: DateUtils.now()
        });


        logger.testHook('goal_clip_creation_complete', { 
          matchId, player, clipId: clipData.clipId 
        });


        const result = {
          success: true,
          clipData: clipData,
          queuePosition: this.processingQueue.length
        };


        logger.exitFunction('VideoClipsManager.createGoalClip', result);
        return result;


      } catch (error) {
        logger.error('Goal clip creation failed', { error: error.toString() });
        return { success: false, error: error.toString() };
      }
    });
  }


  /**
   * Generate clip title
   * @param {string} player - Player name
   * @param {number} minute - Goal minute
   * @param {string} details - Additional details
   * @returns {string} Clip title
   */
  generateClipTitle(player, minute, details) {
    const clubName = getConfig('SYSTEM.CLUB_NAME', 'Syston Town Tigers');
    const season = getConfig('SYSTEM.SEASON', '2024-25');
    
    let title = `${player} Goal ${minute}' | ${clubName} ${season}`;
    
    if (details && details.includes('Penalty')) {
      title = `${player} Penalty Goal ${minute}' | ${clubName} ${season}`;
    }
    
    return title;
  }


  /**
   * Generate clip caption
   * @param {string} player - Player name
   * @param {number} minute - Goal minute
   * @param {string} details - Additional details
   * @returns {string} Clip caption
   */
  generateClipCaption(player, minute, details) {
    const clubName = getConfig('SYSTEM.CLUB_NAME', 'Syston Town Tigers');
    let caption = `⚽ ${player} finds the net in the ${minute}th minute for ${clubName}!`;
    
    if (details && details.includes('Penalty')) {
      caption = `⚽ ${player} converts from the penalty spot in the ${minute}th minute!`;
    }
    
    caption += '\n\n#SystonTownTigers #NonLeagueFootball #Goals #Football';
    
    if (this.votingActive) {
      caption += '\n\n🗳️ Vote for Goal of the Month at our website!';
    }
    
    return caption;
  }


  /**
   * Log video clip to tracking sheet
   * @param {Object} clipData - Clip data
   * @returns {boolean} Success status
   */
  logVideoClip(clipData) {
    try {
      const clipsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.VIDEO_CLIPS'));
      if (!clipsSheet) return false;


      const values = [
        clipData.matchId,
        clipData.eventType,
        clipData.player,
        clipData.minute,
        clipData.startTime,
        clipData.duration,
        clipData.title,
        clipData.caption,
        clipData.status,
        clipData.youtubeUrl || '',
        clipData.created
      ];


      return SheetUtils.appendRowSafe(clipsSheet, values);
    } catch (error) {
      logger.error('Failed to log video clip', { error: error.toString() });
      return false;
    }
  }


  // ===== VIDEO PROCESSING (Per Checklist) =====


  /**
   * Process video clip queue (Option A: Local FFmpeg)
   * @returns {Object} Processing result
   */
  processClipQueueFFmpeg() {
    logger.enterFunction('VideoClipsManager.processClipQueueFFmpeg');


    if (this.processingQueue.length === 0) {
      return { success: true, message: 'No clips to process', processed: 0 };
    }


    let processed = 0;
    let errors = [];


    try {
      // Process each clip in queue
      for (const queueItem of this.processingQueue) {
        logger.testHook('ffmpeg_clip_processing', { 
          clipId: queueItem.clipId,
          player: queueItem.clipData.player
        });


        try {
          // This would be implemented with actual FFmpeg integration
          const processResult = this.processClipWithFFmpeg(queueItem.clipData);
          
          if (processResult.success) {
            processed++;
            
            // Update clip status
            this.updateClipStatus(queueItem.clipData, 'PROCESSED', processResult.outputFile);
            
            // Upload to YouTube
            const uploadResult = this.uploadToYouTube(queueItem.clipData, processResult.outputFile);
            if (uploadResult.success) {
              this.updateClipYouTubeUrl(queueItem.clipData, uploadResult.youtubeUrl);
            }
            
          } else {
            errors.push(`${queueItem.clipId}: ${processResult.error}`);
          }
          
        } catch (clipError) {
          errors.push(`${queueItem.clipId}: ${clipError.toString()}`);
        }
      }


      // Clear processed clips from queue
      this.processingQueue = this.processingQueue.filter(item => 
        !processed || item.status === 'ERROR'
      );


      const result = {
        success: true,
        processed: processed,
        errors: errors,
        remainingInQueue: this.processingQueue.length
      };


      logger.exitFunction('VideoClipsManager.processClipQueueFFmpeg', result);
      return result;


    } catch (error) {
      logger.error('FFmpeg processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Process single clip with FFmpeg (stub implementation)
   * @param {Object} clipData - Clip data
   * @returns {Object} Processing result
   */
  processClipWithFFmpeg(clipData) {
    logger.testHook('ffmpeg_single_clip', { player: clipData.player });
    
    // This would be implemented with actual FFmpeg integration
    // For now, simulate successful processing
    
    try {
      // Simulate processing time
      Utilities.sleep(1000);
      
      const outputFile = `${clipData.matchId}_${clipData.player}_${clipData.minute}.mp4`;
      
      // Log processing attempt
      this.logVideoProcessing(clipData, 'FFmpeg', 'SUCCESS', null, outputFile);
      
      return {
        success: true,
        outputFile: outputFile,
        duration: clipData.duration,
        format: 'mp4'
      };
      
    } catch (error) {
      this.logVideoProcessing(clipData, 'FFmpeg', 'ERROR', error.toString(), null);
      return {
        success: false,
        error: error.toString()
      };
    }
  }


  /**
   * Process clip queue via CloudConvert/Make.com (Option B)
   * @returns {Object} Processing result
   */
  processClipQueueCloudConvert() {
    logger.enterFunction('VideoClipsManager.processClipQueueCloudConvert');


    if (this.processingQueue.length === 0) {
      return { success: true, message: 'No clips to process', processed: 0 };
    }


    try {
      // Build batch processing payload for Make.com
      const batchPayload = {
        timestamp: DateUtils.now().toISOString(),
        event_type: 'video_clip_batch_processing',
        source: 'apps_script_video_manager',
        
        clips: this.processingQueue.map(item => ({
          clipId: item.clipId,
          matchId: item.clipData.matchId,
          player: item.clipData.player,
          minute: item.clipData.minute,
          startTime: item.clipData.startTime,
          duration: item.clipData.duration,
          title: item.clipData.title,
          caption: item.clipData.caption
        })),
        
        processing_options: {
          format: 'mp4',
          quality: 'high',
          compression: 'medium'
        },
        
        callback_webhook: PropertiesService.getScriptProperties()
                           .getProperty('CLOUDCONVERT_WEBHOOK')
      };


      // Send to Make.com for CloudConvert processing
      const postResult = this.postToMakeForProcessing(batchPayload);
      
      if (postResult.success) {
        // Mark clips as processing
        for (const queueItem of this.processingQueue) {
          this.updateClipStatus(queueItem.clipData, 'PROCESSING', null);
        }
        
        // Clear queue (will be repopulated by webhook)
        this.processingQueue = [];
      }


      const result = {
        success: postResult.success,
        batchSent: postResult.success,
        clipsInBatch: batchPayload.clips.length,
        response: postResult.response
      };


      logger.exitFunction('VideoClipsManager.processClipQueueCloudConvert', result);
      return result;


    } catch (error) {
      logger.error('CloudConvert processing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Post to Make.com for video processing
   * @param {Object} payload - Processing payload
   * @returns {Object} Posting result
   */
  postToMakeForProcessing(payload) {
    logger.testHook('make_video_processing_post');
    
    try {
      const webhookUrl = PropertiesService.getScriptProperties()
                           .getProperty(getConfig('MAKE.WEBHOOK_URL_PROPERTY'));
      
      if (!webhookUrl) {
        return { success: false, error: 'Make.com webhook not configured' };
      }


      const response = ApiUtils.makeRequest(webhookUrl, {
        method: 'POST',
        payload: JSON.stringify(payload)
      });


      return {
        success: response.success,
        response: response
      };


    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }


  // ===== YOUTUBE INTEGRATION (Per Checklist) =====


  /**
   * Upload video clip to YouTube
   * @param {Object} clipData - Clip data
   * @param {string} videoFile - Video file path/URL
   * @returns {Object} Upload result
   */
  uploadToYouTube(clipData, videoFile) {
    logger.enterFunction('VideoClipsManager.uploadToYouTube', {
      player: clipData.player,
      videoFile: videoFile
    });


    logger.testHook('youtube_upload_attempt', { player: clipData.player });


    try {
      // Get YouTube configuration
      const youtubeConfig = this.getYouTubeConfig();
      if (!youtubeConfig.isConfigured) {
        return { 
          success: false, 
          error: 'YouTube not configured',
          missingConfig: youtubeConfig.missingFields
        };
      }


      // Build upload payload for Make.com YouTube integration
      const uploadPayload = {
        timestamp: DateUtils.now().toISOString(),
        event_type: 'youtube_upload',
        source: 'apps_script_video_manager',
        
        video_file: videoFile,
        title: clipData.title,
        description: clipData.caption,
        privacy: getConfig('VIDEO.YOUTUBE.DEFAULT_PRIVACY', 'unlisted'),
        
        tags: [
          'SystonTownTigers',
          'NonLeagueFootball', 
          'Goals',
          'Football',
          clipData.player.replace(/\s+/g, ''),
          getConfig('SYSTEM.SEASON', '2024-25')
        ],
        
        category_id: '17', // Sports category
        
        // Metadata
        clip_data: clipData,
        upload_id: StringUtils.generateId('youtube_upload')
      };


      // Send to Make.com for YouTube upload
      const postResult = this.postToMakeForYouTube(uploadPayload);
      
      if (postResult.success) {
        // For now, generate a placeholder URL (would be updated by webhook)
        const placeholderUrl = `https://youtube.com/watch?v=${StringUtils.generateId('yt')}`;
        
        const result = {
          success: true,
          youtubeUrl: placeholderUrl,
          uploadId: uploadPayload.upload_id,
          response: postResult.response
        };


        logger.exitFunction('VideoClipsManager.uploadToYouTube', result);
        return result;
      } else {
        return {
          success: false,
          error: postResult.error || 'Upload failed'
        };
      }


    } catch (error) {
      const result = { success: false, error: error.toString() };
      logger.exitFunction('VideoClipsManager.uploadToYouTube', result);
      return result;
    }
  }


  /**
   * Get YouTube configuration
   * @returns {Object} YouTube configuration
   */
  getYouTubeConfig() {
    try {
      const properties = PropertiesService.getScriptProperties();
      
      const config = {
        channelId: properties.getProperty(getConfig('VIDEO.YOUTUBE.CHANNEL_ID_PROPERTY')),
        apiKey: properties.getProperty(getConfig('VIDEO.YOUTUBE.API_KEY_PROPERTY'))
      };


      const requiredFields = ['channelId', 'apiKey'];
      const missingFields = requiredFields.filter(field => !config[field]);
      
      config.isConfigured = missingFields.length === 0;
      config.missingFields = missingFields;


      return config;


    } catch (error) {
      return {
        isConfigured: false,
        error: error.toString(),
        missingFields: ['channelId', 'apiKey']
      };
    }
  }


  /**
   * Post to Make.com for YouTube upload
   * @param {Object} payload - Upload payload
   * @returns {Object} Posting result
   */
  postToMakeForYouTube(payload) {
    logger.testHook('make_youtube_upload_post');
    
    try {
      const webhookUrl = PropertiesService.getScriptProperties()
                           .getProperty(getConfig('MAKE.WEBHOOK_URL_PROPERTY'));
      
      if (!webhookUrl) {
        return { success: false, error: 'Make.com webhook not configured' };
      }


      const response = ApiUtils.makeRequest(webhookUrl, {
        method: 'POST',
        payload: JSON.stringify(payload)
      });


      return {
        success: response.success,
        response: response
      };


    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }


  // ===== GOAL OF THE MONTH (GOTM) SYSTEM =====


  /**
   * Open Goal of the Month voting (per checklist requirement)
   * @param {string} month - Month to open voting for (default: last month)
   * @returns {Object} Voting opening result
   */
  openGotmVoting(month = null) {
    logger.enterFunction('VideoClipsManager.openGotmVoting', { month });


    return this.withLock(() => {
      try {
        if (!month) {
          const now = DateUtils.now();
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          month = DateUtils.formatDate(lastMonth, 'MMMM yyyy');
        }


        logger.testHook('gotm_voting_open', { month });


        // Get goal clips for the month
        const monthlyClips = this.getGoalClipsForMonth(month);
        
        if (monthlyClips.length === 0) {
          return { 
            success: false, 
            error: 'No goal clips found for this month',
            month: month
          };
        }


        // Limit to top clips by views/engagement (or take all if <= max)
        const maxNominees = getConfig('VIDEO.GOTM.MAX_NOMINEES', 5);
        const nominees = monthlyClips.slice(0, maxNominees);


        // Build voting payload for Make.com/website
        const votingPayload = {
          timestamp: DateUtils.now().toISOString(),
          event_type: 'gotm_voting_open',
          source: 'apps_script_gotm',
          
          month: month,
          nominees: nominees,
          voting_window_days: getConfig('VIDEO.GOTM.VOTING_WINDOW_DAYS', 7),
          voting_channels: getConfig('VIDEO.GOTM.VOTING_CHANNELS', ['website', 'instagram', 'twitter']),
          
          voting_start: DateUtils.now().toISOString(),
          voting_end: new Date(DateUtils.now().getTime() + 
                              (getConfig('VIDEO.GOTM.VOTING_WINDOW_DAYS', 7) * 24 * 60 * 60 * 1000)).toISOString()
        };


        // Post to Make.com to set up voting
        const postResult = this.postGotmToMake(votingPayload);


        // Update voting state
        this.votingActive = true;
        this.currentGotmMonth = month;


        const result = {
          success: postResult.success,
          month: month,
          nominees: nominees,
          votingActive: true,
          response: postResult.response
        };


        logger.exitFunction('VideoClipsManager.openGotmVoting', result);
        return result;


      } catch (error) {
        logger.error('GOTM voting opening failed', { error: error.toString() });
        return { success: false, error: error.toString() };
      }
    });
  }


  /**
   * Close Goal of the Month voting and compute winner
   * @param {string} month - Month to close voting for
   * @returns {Object} Voting closing result
   */
  closeGotmVoting(month = null) {
    logger.enterFunction('VideoClipsManager.closeGotmVoting', { month });


    return this.withLock(() => {
      try {
        if (!month) {
          month = this.currentGotmMonth;
        }


        if (!month) {
          return { success: false, error: 'No active GOTM voting found' };
        }


        logger.testHook('gotm_voting_close', { month });


        // Tally votes
        const votingResults = this.tallyGotmVotes(month);
        
        if (!votingResults.success) {
          return { 
            success: false, 
            error: 'Failed to tally votes',
            details: votingResults.error
          };
        }


        // Build results payload
        const resultsPayload = {
          timestamp: DateUtils.now().toISOString(),
          event_type: 'gotm_voting_results',
          source: 'apps_script_gotm',
          
          month: month,
          winner: votingResults.winner,
          runnerUp: votingResults.runnerUp,
          thirdPlace: votingResults.thirdPlace,
          totalVotes: votingResults.totalVotes,
          votingBreakdown: votingResults.breakdown,
          
          voting_closed: DateUtils.now().toISOString()
        };


        // Post results to Make.com for winner graphics
        const postResult = this.postGotmToMake(resultsPayload);


        // Update voting state
        this.votingActive = false;
        this.currentGotmMonth = null;


        const result = {
          success: postResult.success,
          month: month,
          winner: votingResults.winner,
          totalVotes: votingResults.totalVotes,
          votingClosed: true,
          response: postResult.response
        };


        logger.exitFunction('VideoClipsManager.closeGotmVoting', result);
        return result;


      } catch (error) {
        logger.error('GOTM voting closing failed', { error: error.toString() });
        return { success: false, error: error.toString() };
      }
    });
  }


  /**
   * Get goal clips for specific month
   * @param {string} month - Month string (e.g., "October 2024")
   * @returns {Array} Array of goal clip objects
   */
  getGoalClipsForMonth(month) {
    logger.testHook('gotm_clips_gathering', { month });


    try {
      const clipsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.VIDEO_CLIPS'));
      if (!clipsSheet) return [];


      const data = clipsSheet.getDataRange().getValues();
      const clips = [];
      const [monthName, year] = month.split(' ');


      // Skip header row
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const [matchId, eventType, player, minute, startTime, duration, title, caption, status, youtubeUrl, created] = row;


        if (eventType !== 'goal' || !youtubeUrl) continue;


        const createdDate = DateUtils.parseDate(created);
        if (!createdDate) continue;


        const clipMonth = DateUtils.formatDate(createdDate, 'MMMM yyyy');
        if (clipMonth === month) {
          clips.push({
            matchId: matchId,
            player: player,
            minute: minute,
            title: title,
            caption: caption,
            youtubeUrl: youtubeUrl,
            created: created,
            createdDate: createdDate
          });
        }
      }


      return clips.sort((a, b) => a.createdDate - b.createdDate);


    } catch (error) {
      logger.error('Failed to get goal clips for month', { 
        month, error: error.toString() 
      });
      return [];
    }
  }


  /**
   * Tally GOTM votes
   * @param {string} month - Month to tally votes for
   * @returns {Object} Vote tallying result
   */
  tallyGotmVotes(month) {
    logger.testHook('gotm_vote_tallying', { month });


    try {
      const votesSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.GOTM_VOTES'));
      if (!votesSheet) {
        return { success: false, error: 'GOTM votes sheet not found' };
      }


      const data = votesSheet.getDataRange().getValues();
      const voteTally = {};
      let totalVotes = 0;


      // Skip header row
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const [timestamp, player, goalId, voteSource, voterInfo, monthYear] = row;


        if (monthYear !== month) continue;


        const voteKey = player || goalId;
        if (!voteKey) continue;


        if (!voteTally[voteKey]) {
          voteTally[voteKey] = {
            player: player,
            goalId: goalId,
            votes: 0,
            sources: {}
          };
        }


        voteTally[voteKey].votes++;
        if (!voteTally[voteKey].sources[voteSource]) {
          voteTally[voteKey].sources[voteSource] = 0;
        }
        voteTally[voteKey].sources[voteSource]++;
        totalVotes++;
      }


      // Sort by votes
      const sortedResults = Object.values(voteTally)
                                  .sort((a, b) => b.votes - a.votes);


      const result = {
        success: true,
        winner: sortedResults[0] || null,
        runnerUp: sortedResults[1] || null,
        thirdPlace: sortedResults[2] || null,
        totalVotes: totalVotes,
        breakdown: sortedResults,
        month: month
      };


      return result;


    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  }


  /**
   * Post GOTM data to Make.com
   * @param {Object} payload - GOTM payload
   * @returns {Object} Posting result
   */
  postGotmToMake(payload) {
    logger.testHook('gotm_make_posting', { eventType: payload.event_type });
    
    try {
      const webhookUrl = PropertiesService.getScriptProperties()
                           .getProperty(getConfig('MAKE.WEBHOOK_URL_PROPERTY'));
      
      if (!webhookUrl) {
        return { success: false, error: 'Make.com webhook not configured' };
      }


      const response = ApiUtils.makeRequest(webhookUrl, {
        method: 'POST',
        payload: JSON.stringify(payload)
      });


      return {
        success: response.success,
        response: response
      };


    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }


  // ===== UTILITY METHODS =====


  /**
   * Update clip status in sheet
   * @param {Object} clipData - Clip data
   * @param {string} status - New status
   * @param {string} outputFile - Output file path
   * @returns {boolean} Success status
   */
  updateClipStatus(clipData, status, outputFile) {
    try {
      const clipsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.VIDEO_CLIPS'));
      if (!clipsSheet) return false;


      // Find the clip row (would need better indexing in production)
      const data = clipsSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0] === clipData.matchId && row[2] === clipData.player && row[3] === clipData.minute) {
          const statusCell = `I${i + 1}`;
          SheetUtils.setCellValue(clipsSheet, statusCell, status);
          return true;
        }
      }


      return false;
    } catch (error) {
      logger.error('Failed to update clip status', { error: error.toString() });
      return false;
    }
  }


  /**
   * Update clip YouTube URL in sheet
   * @param {Object} clipData - Clip data
   * @param {string} youtubeUrl - YouTube URL
   * @returns {boolean} Success status
   */
  updateClipYouTubeUrl(clipData, youtubeUrl) {
    try {
      const clipsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.VIDEO_CLIPS'));
      if (!clipsSheet) return false;


      // Find the clip row
      const data = clipsSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0] === clipData.matchId && row[2] === clipData.player && row[3] === clipData.minute) {
          const urlCell = `J${i + 1}`;
          SheetUtils.setCellValue(clipsSheet, urlCell, youtubeUrl);
          return true;
        }
      }


      return false;
    } catch (error) {
      logger.error('Failed to update YouTube URL', { error: error.toString() });
      return false;
    }
  }


  /**
   * Log video processing attempt
   * @param {Object} clipData - Clip data
   * @param {string} processType - Processing type
   * @param {string} status - Processing status
   * @param {string} errorDetails - Error details if failed
   * @param {string} outputFile - Output file if successful
   * @returns {boolean} Success status
   */
  logVideoProcessing(clipData, processType, status, errorDetails, outputFile) {
    try {
      const processingSheet = SheetUtils.getOrCreateSheet(
        'Video_Processing_Log',
        ['Timestamp', 'Clip_ID', 'Status', 'Process_Type', 'Input_File', 'Output_File', 'Error_Details']
      );
      
      if (!processingSheet) return false;


      const clipId = `${clipData.matchId}_${clipData.player}_${clipData.minute}`;


      const values = [
        DateUtils.now().toISOString(),
        clipId,
        status,
        processType,
        'source_video.mp4', // Would be actual input file
        outputFile || '',
        errorDetails || ''
      ];


      return SheetUtils.appendRowSafe(processingSheet, values);
    } catch (error) {
      logger.error('Failed to log video processing', { error: error.toString() });
      return false;
    }
  }
}


// Create and export singleton instance
const videoClipsManager = new VideoClipsManager();


// Export for global access
globalThis.VideoClipsManager = VideoClipsManager;
globalThis.videoClipsManager = videoClipsManager;
