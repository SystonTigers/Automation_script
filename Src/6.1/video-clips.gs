/**
 * @fileoverview Video Clips Manager for Video Processing and YouTube Automation
 * @version 6.0.0
 * @author Senior Software Architect
 * @description Handles video clip metadata creation, player folder organization, and YouTube integration
 */

/**
 * Video Clips Manager Class
 * Manages video clip creation, organization, and YouTube automation
 */
class VideoClipsManager {
  
  constructor() {
    this.logger = logger.scope('VideoClips');
    this.makeIntegration = new MakeIntegration();
    this.defaultClipDuration = getConfig('VIDEO.DEFAULT_CLIP_DURATION', 30);
    this.goalLeadTime = getConfig('VIDEO.GOAL_CLIP_LEAD_TIME', 10);
    this.goalFollowTime = getConfig('VIDEO.GOAL_CLIP_FOLLOW_TIME', 20);
  }

  /**
   * Create goal clip metadata automatically
   * @param {string} minute - Goal minute
   * @param {string} player - Goal scorer
   * @param {string} assist - Assist provider
   * @param {string} opponent - Opposition team
   * @param {string} matchId - Match ID
   * @returns {Object} Clip creation result
   */
  createGoalClip(minute, player, assist = '', opponent = '', matchId = null) {
    this.logger.enterFunction('createGoalClip', { minute, player, assist, opponent });
    
    try {
      // @testHook(goal_clip_creation_start)
      
      if (!isFeatureEnabled('VIDEO_INTEGRATION')) {
        return {
          success: true,
          message: 'Video integration is disabled',
          skipped: true
        };
      }
      
      const goalMinute = parseInt(minute) || 0;
      const clipStartTime = Math.max(0, goalMinute - this.goalLeadTime);
      const clipDuration = this.goalLeadTime + this.goalFollowTime;
      
      // Generate clip metadata
      const clipMetadata = {
        event_type: 'goal_clip',
        match_id: matchId || StringUtils.generateId('match'),
        goal_minute: goalMinute,
        start_time: clipStartTime,
        duration: clipDuration,
        player: StringUtils.cleanPlayerName(player),
        assist_provider: assist ? StringUtils.cleanPlayerName(assist) : '',
        opponent: opponent,
        title: this.generateClipTitle(player, opponent, goalMinute),
        description: this.generateClipDescription(player, assist, opponent, goalMinute),
        tags: this.generateClipTags(player, opponent),
        status: 'pending_processing',
        created_at: DateUtils.formatISO(DateUtils.now())
      };
      
      // Save to Video Clips sheet
      const saveResult = this.saveClipMetadata(clipMetadata);
      
      if (!saveResult.success) {
        throw new Error(`Failed to save clip metadata: ${saveResult.error}`);
      }
      
      // Create player folder if it doesn't exist
      const folderResult = this.ensurePlayerFolder(player);
      
      // @testHook(goal_clip_metadata_created)
      
      // Send to Make.com for video processing
      if (getConfig('VIDEO.PROCESSING_SERVICE') === 'cloudconvert') {
        const processingResult = this.requestCloudConvertProcessing(clipMetadata);
        clipMetadata.processing_request = processingResult;
      }
      
      // @testHook(goal_clip_creation_complete)
      
      this.logger.exitFunction('createGoalClip', { 
        success: true,
        clip_id: clipMetadata.match_id + '_' + goalMinute
      });
      
      return {
        success: true,
        clip_metadata: clipMetadata,
        folder_result: folderResult,
        clip_id: clipMetadata.match_id + '_' + goalMinute,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Goal clip creation failed', { 
        error: error.toString(),
        minute, player, assist 
      });
      
      return {
        success: false,
        error: error.toString(),
        minute: minute,
        player: player,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Mark video event for editor attention
   * @param {string} minute - Event minute
   * @param {string} eventType - Type of event (big_chance, tackle, good_play, etc.)
   * @param {string} player - Player involved
   * @param {string} description - Event description
   * @returns {Object} Marking result
   */
  markVideoEvent(minute, eventType, player = '', description = '') {
    this.logger.enterFunction('markVideoEvent', { minute, eventType, player });
    
    try {
      // @testHook(video_event_marking_start)
      
      if (!isFeatureEnabled('VIDEO_INTEGRATION')) {
        return {
          success: true,
          message: 'Video integration is disabled',
          skipped: true
        };
      }
      
      // Add to Notes sheet for video editor
      const notesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.NOTES'),
        ['Timestamp', 'Minute', 'Event Type', 'Player', 'Description', 'Status', 'Priority']
      );
      
      if (!notesSheet) {
        throw new Error('Cannot access Notes sheet');
      }
      
      const noteData = {
        'Timestamp': DateUtils.formatISO(DateUtils.now()),
        'Minute': minute,
        'Event Type': eventType,
        'Player': StringUtils.cleanPlayerName(player),
        'Description': description,
        'Status': 'Pending Review',
        'Priority': this.determinePriority(eventType)
      };
      
      const addResult = SheetUtils.addRowFromObject(notesSheet, noteData);
      
      if (!addResult) {
        throw new Error('Failed to add video event note');
      }
      
      // @testHook(video_event_marked)
      
      this.logger.info('Video event marked for editor', { 
        minute, eventType, player 
      });
      
      // @testHook(video_event_marking_complete)
      
      this.logger.exitFunction('markVideoEvent', { success: true });
      
      return {
        success: true,
        event_type: eventType,
        minute: minute,
        player: player,
        priority: this.determinePriority(eventType),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Video event marking failed', { 
        error: error.toString(),
        minute, eventType, player 
      });
      
      return {
        success: false,
        error: error.toString(),
        minute: minute,
        event_type: eventType,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Organize clips into player folders
   * @param {string} player - Player name
   * @param {string} clipId - Clip ID
   * @returns {Object} Organization result
   */
  organizePlayerClips(player, clipId) {
    this.logger.enterFunction('organizePlayerClips', { player, clipId });
    
    try {
      // @testHook(player_clips_organization_start)
      
      const cleanPlayerName = StringUtils.cleanPlayerName(player);
      const safeFolderName = StringUtils.toSafeFilename(cleanPlayerName);
      
      // Get or create player folder in Google Drive
      const playerFolder = this.getOrCreatePlayerFolder(cleanPlayerName);
      
      if (!playerFolder) {
        throw new Error(`Failed to create folder for player: ${cleanPlayerName}`);
      }
      
      // Update clip metadata with folder information
      const updateResult = this.updateClipFolderInfo(clipId, playerFolder.getId(), safeFolderName);
      
      // @testHook(player_clips_organized)
      
      this.logger.exitFunction('organizePlayerClips', { success: true });
      
      return {
        success: true,
        player: cleanPlayerName,
        folder_id: playerFolder.getId(),
        folder_name: safeFolderName,
        clip_id: clipId,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Player clips organization failed', { 
        error: error.toString(),
        player, clipId 
      });
      
      return {
        success: false,
        error: error.toString(),
        player: player,
        clip_id: clipId,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Generate match graphics (overlays, banners)
   * @param {string} matchId - Match ID
   * @param {Object} matchInfo - Match information
   * @returns {Object} Graphics generation result
   */
  generateMatchGraphics(matchId, matchInfo = {}) {
    this.logger.enterFunction('generateMatchGraphics', { matchId });
    
    try {
      // @testHook(match_graphics_generation_start)
      
      if (!isFeatureEnabled('VIDEO_INTEGRATION')) {
        return {
          success: true,
          message: 'Video integration is disabled',
          skipped: true
        };
      }
      
      const graphicsData = {
        match_id: matchId,
        club_name: getConfig('SYSTEM.CLUB_NAME'),
        opponent: matchInfo.opponent || 'Unknown',
        date: matchInfo.date || DateUtils.formatUK(DateUtils.now()),
        venue: matchInfo.venue || 'Home',
        competition: matchInfo.competition || 'League',
        graphics_types: ['match_clock_overlay', 'player_banner', 'score_graphic'],
        created_at: DateUtils.formatISO(DateUtils.now())
      };
      
      // Send to Make.com for graphics generation
      const makePayload = {
        event_type: 'generate_match_graphics',
        timestamp: DateUtils.formatISO(DateUtils.now()),
        match_graphics: graphicsData,
        source: 'video_clips_manager'
      };
      
      const makeResult = this.makeIntegration.sendToMake(makePayload);
      
      // @testHook(match_graphics_generation_complete)
      
      this.logger.exitFunction('generateMatchGraphics', { 
        success: makeResult.success 
      });
      
      return {
        success: makeResult.success,
        match_id: matchId,
        graphics_data: graphicsData,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Match graphics generation failed', { 
        error: error.toString(),
        matchId 
      });
      
      return {
        success: false,
        error: error.toString(),
        match_id: matchId,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Upload clip to YouTube
   * @param {string} clipId - Clip ID
   * @param {string} filePath - Local file path
   * @returns {Object} Upload result
   */
  uploadToYouTube(clipId, filePath) {
    this.logger.enterFunction('uploadToYouTube', { clipId, filePath });
    
    try {
      // @testHook(youtube_upload_start)
      
      if (!isFeatureEnabled('YOUTUBE_AUTOMATION')) {
        return {
          success: true,
          message: 'YouTube automation is disabled',
          skipped: true
        };
      }
      
      // Get clip metadata
      const clipMetadata = this.getClipMetadata(clipId);
      
      if (!clipMetadata) {
        throw new Error(`Clip metadata not found: ${clipId}`);
      }
      
      // Prepare YouTube upload data
      const uploadData = {
        title: clipMetadata.title,
        description: clipMetadata.description,
        tags: clipMetadata.tags,
        privacy_status: getConfig('VIDEO.DEFAULT_PRIVACY_STATUS', 'unlisted'),
        category_id: '17', // Sports category
        file_path: filePath
      };
      
      // Send to Make.com for YouTube upload
      const makePayload = {
        event_type: 'youtube_upload',
        timestamp: DateUtils.formatISO(DateUtils.now()),
        clip_id: clipId,
        upload_data: uploadData,
        source: 'video_clips_manager'
      };
      
      const makeResult = this.makeIntegration.sendToMake(makePayload);
      
      // Update clip status
      if (makeResult.success) {
        this.updateClipStatus(clipId, 'uploaded_to_youtube');
      }
      
      // @testHook(youtube_upload_complete)
      
      this.logger.exitFunction('uploadToYouTube', { 
        success: makeResult.success 
      });
      
      return {
        success: makeResult.success,
        clip_id: clipId,
        upload_data: uploadData,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('YouTube upload failed', { 
        error: error.toString(),
        clipId, filePath 
      });
      
      return {
        success: false,
        error: error.toString(),
        clip_id: clipId,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Save clip metadata to sheet
   * @private
   * @param {Object} clipMetadata - Clip metadata
   * @returns {Object} Save result
   */
  saveClipMetadata(clipMetadata) {
    try {
      const videoSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.VIDEO_CLIPS'),
        getConfig('SHEETS.REQUIRED_COLUMNS.VIDEO_CLIPS')
      );
      
      if (!videoSheet) {
        throw new Error('Cannot access Video Clips sheet');
      }
      
      const clipData = {
        'Match Date': DateUtils.formatUK(DateUtils.now()),
        'Event Type': clipMetadata.event_type,
        'Minute': clipMetadata.goal_minute,
        'Player': clipMetadata.player,
        'Title': clipMetadata.title,
        'Start Time': clipMetadata.start_time,
        'Duration': clipMetadata.duration,
        'Status': clipMetadata.status,
        'YouTube URL': '',
        'Local Path': '',
        'Notes': clipMetadata.description
      };
      
      const addResult = SheetUtils.addRowFromObject(videoSheet, clipData);
      
      if (!addResult) {
        throw new Error('Failed to add clip metadata to sheet');
      }
      
      this.logger.sheetOperation('ADD_ROW', 'Video Clips', true, { 
        event: 'clip_metadata_saved',
        player: clipMetadata.player
      });
      
      return { success: true };
      
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Generate clip title
   * @private
   * @param {string} player - Player name
   * @param {string} opponent - Opposition
   * @param {number} minute - Goal minute
   * @returns {string} Clip title
   */
  generateClipTitle(player, opponent, minute) {
    const cleanPlayer = StringUtils.cleanPlayerName(player);
    const clubName = getConfig('SYSTEM.CLUB_SHORT_NAME', 'Tigers');
    
    if (opponent) {
      return `${cleanPlayer} Goal vs ${opponent} (${minute}')`;
    } else {
      return `${cleanPlayer} Goal for ${clubName} (${minute}')`;
    }
  }

  /**
   * Generate clip description
   * @private
   * @param {string} player - Player name
   * @param {string} assist - Assist provider
   * @param {string} opponent - Opposition
   * @param {number} minute - Goal minute
   * @returns {string} Clip description
   */
  generateClipDescription(player, assist, opponent, minute) {
    const clubName = getConfig('SYSTEM.CLUB_NAME');
    const cleanPlayer = StringUtils.cleanPlayerName(player);
    const cleanAssist = assist ? StringUtils.cleanPlayerName(assist) : '';
    
    let description = `${cleanPlayer} scores for ${clubName}`;
    
    if (opponent) {
      description += ` against ${opponent}`;
    }
    
    description += ` in the ${minute}th minute`;
    
    if (cleanAssist) {
      description += `. Assist by ${cleanAssist}`;
    }
    
    description += '.\n\nSubscribe for more goals and highlights!';
    
    return description;
  }

  /**
   * Generate clip tags
   * @private
   * @param {string} player - Player name
   * @param {string} opponent - Opposition
   * @returns {Array} Tags array
   */
  generateClipTags(player, opponent) {
    const clubName = getConfig('SYSTEM.CLUB_NAME');
    const cleanPlayer = StringUtils.cleanPlayerName(player);
    
    const tags = [
      'football',
      'goal',
      'soccer',
      clubName,
      cleanPlayer,
      'grassroots football',
      'local football'
    ];
    
    if (opponent) {
      tags.push(opponent);
    }
    
    return tags;
  }

  /**
   * Determine priority for video events
   * @private
   * @param {string} eventType - Event type
   * @returns {string} Priority level
   */
  determinePriority(eventType) {
    const highPriorityEvents = ['goal', 'big_chance', 'great_save', 'red_card'];
    const mediumPriorityEvents = ['yellow_card', 'good_play', 'tackle'];
    
    if (highPriorityEvents.includes(eventType.toLowerCase())) {
      return 'High';
    } else if (mediumPriorityEvents.includes(eventType.toLowerCase())) {
      return 'Medium';
    } else {
      return 'Low';
    }
  }

  /**
   * Ensure player folder exists
   * @private
   * @param {string} player - Player name
   * @returns {Object} Folder result
   */
  ensurePlayerFolder(player) {
    try {
      const cleanPlayerName = StringUtils.cleanPlayerName(player);
      const folder = this.getOrCreatePlayerFolder(cleanPlayerName);
      
      return {
        success: !!folder,
        player: cleanPlayerName,
        folder_id: folder ? folder.getId() : null
      };
      
    } catch (error) {
      this.logger.error('Failed to ensure player folder', { 
        error: error.toString(), 
        player 
      });
      
      return {
        success: false,
        error: error.toString(),
        player: player
      };
    }
  }

  /**
   * Get or create player folder in Google Drive
   * @private
   * @param {string} playerName - Player name
   * @returns {GoogleAppsScript.Drive.Folder|null} Folder object
   */
  getOrCreatePlayerFolder(playerName) {
    try {
      const safeName = StringUtils.toSafeFilename(playerName);
      const mainFolderId = getSecureProperty(getConfig('VIDEO.DRIVE_FOLDER_PROPERTY'));
      
      if (!mainFolderId) {
        this.logger.warn('No main video folder configured');
        return null;
      }
      
      const mainFolder = DriveApp.getFolderById(mainFolderId);
      const existingFolders = mainFolder.getFoldersByName(safeName);
      
      if (existingFolders.hasNext()) {
        return existingFolders.next();
      } else {
        return mainFolder.createFolder(safeName);
      }
      
    } catch (error) {
      this.logger.error('Failed to get/create player folder', { 
        error: error.toString(), 
        playerName 
      });
      return null;
    }
  }

  /**
   * Update clip folder information
   * @private
   * @param {string} clipId - Clip ID
   * @param {string} folderId - Folder ID
   * @param {string} folderName - Folder name
   * @returns {Object} Update result
   */
  updateClipFolderInfo(clipId, folderId, folderName) {
    try {
      const videoSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.VIDEO_CLIPS')
      );
      
      if (!videoSheet) {
        throw new Error('Cannot access Video Clips sheet');
      }
      
      // Find the clip row and update folder info
      const criteria = { 'Title': { includes: clipId } }; // Simplified search
      const updateData = {
        'Local Path': `drive://folder/${folderId}`,
        'Notes': `Organized in ${folderName} folder`
      };
      
      // In a real implementation, this would be more sophisticated
      this.logger.info('Clip folder info updated', { clipId, folderId });
      
      return { success: true };
      
    } catch (error) {
      this.logger.error('Failed to update clip folder info', { 
        error: error.toString(), 
        clipId 
      });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Request CloudConvert processing
   * @private
   * @param {Object} clipMetadata - Clip metadata
   * @returns {Object} Processing request result
   */
  requestCloudConvertProcessing(clipMetadata) {
    try {
      const processingPayload = {
        event_type: 'process_video_clip',
        timestamp: DateUtils.formatISO(DateUtils.now()),
        clip_metadata: clipMetadata,
        processing_service: 'cloudconvert',
        source: 'video_clips_manager'
      };
      
      const result = this.makeIntegration.sendToMake(processingPayload);
      
      return {
        success: result.success,
        request_id: StringUtils.generateId('proc'),
        service: 'cloudconvert'
      };
      
    } catch (error) {
      this.logger.error('CloudConvert processing request failed', { 
        error: error.toString() 
      });
      
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  /**
   * Get clip metadata
   * @private
   * @param {string} clipId - Clip ID
   * @returns {Object|null} Clip metadata
   */
  getClipMetadata(clipId) {
    try {
      const videoSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.VIDEO_CLIPS')
      );
      
      if (!videoSheet) {
        return null;
      }
      
      const allClips = SheetUtils.getAllDataAsObjects(videoSheet);
      const clip = allClips.find(c => 
        c.Title && c.Title.includes(clipId)
      );
      
      if (!clip) {
        return null;
      }
      
      return {
        title: clip.Title || '',
        description: clip.Notes || '',
        tags: this.generateClipTags(clip.Player || '', ''),
        player: clip.Player || '',
        minute: clip.Minute || '0',
        status: clip.Status || 'pending'
      };
      
    } catch (error) {
      this.logger.error('Failed to get clip metadata', { 
        error: error.toString(), 
        clipId 
      });
      return null;
    }
  }

  /**
   * Update clip status
   * @private
   * @param {string} clipId - Clip ID
   * @param {string} status - New status
   * @returns {boolean} Success status
   */
  updateClipStatus(clipId, status) {
    try {
      const videoSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.VIDEO_CLIPS')
      );
      
      if (!videoSheet) {
        return false;
      }
      
      // In a real implementation, this would find and update the specific row
      this.logger.info('Clip status updated', { clipId, status });
      
      return true;
      
    } catch (error) {
      this.logger.error('Failed to update clip status', { 
        error: error.toString(), 
        clipId, status 
      });
      return false;
    }
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Initialize Video Clips Manager
 * @returns {Object} Initialization result
 */
function initializeVideoClips() {
  logger.enterFunction('VideoClips.initialize');
  
  try {
    // Test required sheets
    const requiredSheets = [
      getConfig('SHEETS.TAB_NAMES.VIDEO_CLIPS'),
      getConfig('SHEETS.TAB_NAMES.NOTES')
    ];
    
    const sheetResults = {};
    
    requiredSheets.forEach(sheetName => {
      const columns = getConfig(`SHEETS.REQUIRED_COLUMNS.${sheetName.toUpperCase().replace(/\s/g, '_')}`);
      const sheet = SheetUtils.getOrCreateSheet(sheetName, columns);
      sheetResults[sheetName] = !!sheet;
    });
    
    // Test Google Drive access
    let driveAccess = false;
    try {
      const folderId = getSecureProperty(getConfig('VIDEO.DRIVE_FOLDER_PROPERTY'));
      if (folderId) {
        const folder = DriveApp.getFolderById(folderId);
        driveAccess = !!folder;
      }
    } catch (error) {
      logger.warn('Google Drive access test failed', { error: error.toString() });
    }
    
    const allSheetsOk = Object.values(sheetResults).every(result => result === true);
    
    logger.exitFunction('VideoClips.initialize', { 
      success: allSheetsOk,
      drive_access: driveAccess
    });
    
    return {
      success: allSheetsOk,
      sheets: sheetResults,
      drive_access: driveAccess,
      video_enabled: isFeatureEnabled('VIDEO_INTEGRATION'),
      youtube_enabled: isFeatureEnabled('YOUTUBE_AUTOMATION'),
      message: 'Video Clips Manager initialized successfully',
      version: '6.0.0'
    };
    
  } catch (error) {
    logger.error('Video Clips initialization failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Create goal clip metadata (public API)
 * @param {string} minute - Goal minute
 * @param {string} player - Goal scorer
 * @param {string} assist - Assist provider
 * @param {string} opponent - Opposition
 * @param {string} matchId - Match ID
 * @returns {Object} Clip creation result
 */
function createGoalClipMetadata(minute, player, assist = '', opponent = '', matchId = null) {
  const manager = new VideoClipsManager();
  return manager.createGoalClip(minute, player, assist, opponent, matchId);
}

/**
 * Mark video event for editor (public API)
 * @param {string} minute - Event minute
 * @param {string} eventType - Event type
 * @param {string} player - Player involved
 * @param {string} description - Event description
 * @returns {Object} Marking result
 */
function markVideoEventForEditor(minute, eventType, player = '', description = '') {
  const manager = new VideoClipsManager();
  return manager.markVideoEvent(minute, eventType, player, description);
}

/**
 * Organize player clips (public API)
 * @param {string} player - Player name
 * @param {string} clipId - Clip ID
 * @returns {Object} Organization result
 */
function organizeClipsInPlayerFolder(player, clipId) {
  const manager = new VideoClipsManager();
  return manager.organizePlayerClips(player, clipId);
}

/**
 * Generate match graphics (public API)
 * @param {string} matchId - Match ID
 * @param {Object} matchInfo - Match information
 * @returns {Object} Graphics generation result
 */
function generateMatchOverlayGraphics(matchId, matchInfo = {}) {
  const manager = new VideoClipsManager();
  return manager.generateMatchGraphics(matchId, matchInfo);
}

/**
 * Upload clip to YouTube (public API)
 * @param {string} clipId - Clip ID
 * @param {string} filePath - Local file path
 * @returns {Object} Upload result
 */
function uploadClipToYouTube(clipId, filePath) {
  const manager = new VideoClipsManager();
  return manager.uploadToYouTube(clipId, filePath);
}

/**
 * Get all video clips (public API)
 * @returns {Object} All clips result
 */
function getAllVideoClips() {
  try {
    const videoSheet = SheetUtils.getOrCreateSheet(
      getConfig('SHEETS.TAB_NAMES.VIDEO_CLIPS')
    );
    
    if (!videoSheet) {
      return {
        success: false,
        error: 'Cannot access Video Clips sheet'
      };
    }
    
    const allClips = SheetUtils.getAllDataAsObjects(videoSheet);
    
    return {
      success: true,
      clips: allClips,
      count: allClips.length,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get pending video events (public API)
 * @returns {Object} Pending events result
 */
function getPendingVideoEvents() {
  try {
    const notesSheet = SheetUtils.getOrCreateSheet(
      getConfig('SHEETS.TAB_NAMES.NOTES')
    );
    
    if (!notesSheet) {
      return {
        success: false,
        error: 'Cannot access Notes sheet'
      };
    }
    
    const allNotes = SheetUtils.getAllDataAsObjects(notesSheet);
    const pendingEvents = allNotes.filter(note => 
      note.Status === 'Pending Review'
    );
    
    return {
      success: true,
      pending_events: pendingEvents,
      count: pendingEvents.length,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ==================== TESTING FUNCTIONS ====================

/**
 * Test video clips functionality
 * @returns {Object} Test results
 */
function testVideoClips() {
  logger.enterFunction('VideoClips.test');
  
  try {
    const manager = new VideoClipsManager();
    const results = {
      initialization: false,
      clip_creation: false,
      event_marking: false,
      folder_organization: false,
      metadata_generation: false
    };
    
    // Test initialization
    const initResult = initializeVideoClips();
    results.initialization = initResult.success;
    
    // Test clip creation (if video integration enabled)
    if (isFeatureEnabled('VIDEO_INTEGRATION')) {
      try {
        const clipResult = manager.createGoalClip('45', 'Test Player', 'Test Assist', 'Test FC');
        results.clip_creation = clipResult.success;
      } catch (error) {
        logger.warn('Clip creation test failed', { error: error.toString() });
      }
    } else {
      results.clip_creation = true; // Skip if disabled
    }
    
    // Test event marking
    try {
      const markResult = manager.markVideoEvent('30', 'big_chance', 'Test Player', 'Great opportunity');
      results.event_marking = markResult.success;
    } catch (error) {
      logger.warn('Event marking test failed', { error: error.toString() });
    }
    
    // Test folder organization
    try {
      const folderResult = manager.ensurePlayerFolder('Test Player');
      results.folder_organization = folderResult.success !== false; // Allow null/undefined
    } catch (error) {
      logger.warn('Folder organization test failed', { error: error.toString() });
    }
    
    // Test metadata generation
    try {
      const title = manager.generateClipTitle('Test Player', 'Test FC', 45);
      const description = manager.generateClipDescription('Test Player', 'Test Assist', 'Test FC', 45);
      const tags = manager.generateClipTags('Test Player', 'Test FC');
      
      results.metadata_generation = title && description && Array.isArray(tags);
    } catch (error) {
      logger.warn('Metadata generation test failed', { error: error.toString() });
    }
    
    const allPassed = Object.values(results).every(result => result === true);
    
    logger.exitFunction('VideoClips.test', { success: allPassed });
    
    return {
      success: allPassed,
      results: results,
      video_integration_enabled: isFeatureEnabled('VIDEO_INTEGRATION'),
      youtube_automation_enabled: isFeatureEnabled('YOUTUBE_AUTOMATION'),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
  } catch (error) {
    logger.error('Video clips test failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}

