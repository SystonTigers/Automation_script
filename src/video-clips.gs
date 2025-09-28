/**
 * @fileoverview Video clips management and YouTube automation system
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Complete video integration: goal clips, player folders, match graphics, YouTube
 * 
 * CREATE NEW FILE - This implements the video system from *claude v6
 * 
 * FEATURES:
 * - Auto-create clip metadata when goals are scored
 * - Mark interesting events for video editor 
 * - Organize clips into player folders in Google Drive
 * - Generate match clock overlays and player banners
 * - YouTube upload automation
 * - FFmpeg/CloudConvert processing integration
 */

// ==================== VIDEO CLIPS MANAGER CLASS ====================

/**
 * Video Clips Manager - Complete video processing system
 */
class VideoClipsManager {
  
  constructor() {
    this.loggerName = 'VideoClips';
    this._logger = null;
    this.driveService = DriveApp;
    this.youtubeService = null; // YouTube API integration
    this.processingQueue = [];
    this.makeIntegration = new MakeIntegration();
  }

  get logger() {
    if (!this._logger) {
      try {
        this._logger = logger.scope(this.loggerName);
      } catch (error) {
        this._logger = {
          enterFunction: (fn, data) => console.log(`[${this.loggerName}] → ${fn}`, data || ''),
          exitFunction: (fn, data) => console.log(`[${this.loggerName}] ← ${fn}`, data || ''),
          info: (msg, data) => console.log(`[${this.loggerName}] ${msg}`, data || ''),
          warn: (msg, data) => console.warn(`[${this.loggerName}] ${msg}`, data || ''),
          error: (msg, data) => console.error(`[${this.loggerName}] ${msg}`, data || ''),
          audit: (msg, data) => console.log(`[${this.loggerName}] AUDIT: ${msg}`, data || ''),
          security: (msg, data) => console.log(`[${this.loggerName}] SECURITY: ${msg}`, data || '')
        };
      }
    }
    return this._logger;
  }

  // ==================== GOAL CLIP CREATION ====================

  /**
   * Create goal clip metadata automatically when goal is scored
   * @param {string} minute - Goal minute
   * @param {string} player - Goal scorer
   * @param {string} assist - Assist provider
   * @param {string} opponent - Opposition team
   * @param {string} matchId - Match identifier
   * @returns {Object} Clip creation result
   */
  createGoalClip(minute, player, assist = '', opponent = '', matchId = null) {
    this.logger.enterFunction('createGoalClip', { minute, player, assist, opponent });
    
    try {
      // @testHook(goal_clip_creation_start)
      
      const goalMinute = parseInt(minute, 10);
      if (!ValidationUtils.isValidMinute(goalMinute)) {
        throw new Error(`Invalid minute: ${minute}`);
      }

      if (!player || player.trim() === '') {
        throw new Error('Player name is required');
      }

      const buffers = getConfigValue('VIDEO.CLIP_BUFFERS.GOAL', { preSeconds: 10, postSeconds: 20 });
      const preBuffer = Number(buffers.preSeconds) || 0;
      const postBuffer = Number(buffers.postSeconds) || 0;
      const defaultDuration = getConfigValue('VIDEO.DEFAULT_CLIP_DURATION', 30);
      const startSeconds = Math.max(0, (goalMinute * 60) - preBuffer);
      const durationSeconds = Math.max(preBuffer + postBuffer, defaultDuration);

      const matchInfo = this.getMatchInfo(matchId, { opponent });

      // Generate clip metadata
      const clipId = StringUtils.generateId('clip');
      const clipMetadata = {
        clip_id: clipId,
        match_id: matchId || StringUtils.generateId('match'),
        event_type: 'goal',
        minute: goalMinute,

        // Player information
        player: StringUtils.cleanPlayerName(player),
        assist_by: assist ? StringUtils.cleanPlayerName(assist) : '',
        opponent: opponent,

        // Clip timing (Bible compliance: configurable buffers)
        start_time_seconds: startSeconds,
        duration_seconds: durationSeconds,

        // Clip details
        title: this.generateClipTitle(player, opponent, goalMinute),
        description: this.generateClipDescription(player, assist, opponent, goalMinute),
        tags: this.generateClipTags(player, opponent),

        match_date: matchInfo.date,
        venue: matchInfo.venue,
        competition: matchInfo.competition,

        // Processing status
        status: 'pending_processing',
        processing_service: getConfigValue('VIDEO.PROCESSING_METHOD', 'cloudconvert'),

        // Timestamps
        created_at: DateUtils.formatISO(DateUtils.now()),
        updated_at: DateUtils.formatISO(DateUtils.now())
      };
      
      // Save to Video Clips sheet
      const saveResult = this.saveClipMetadata(clipMetadata);

      if (!saveResult.success) {
        throw new Error(`Failed to save clip metadata: ${saveResult.error}`);
      }

      // Create player folder if it doesn't exist
      const folderResult = this.ensurePlayerFolder(player);

      if (folderResult.success) {
        clipMetadata.player_folder_id = folderResult.folder_id;
        clipMetadata.player_folder_path = folderResult.folder_path || '';
      }

      const matchFolderResult = this.ensureMatchFolder(clipMetadata.match_id, matchInfo);
      if (matchFolderResult.success) {
        clipMetadata.match_folder_id = matchFolderResult.folder_id;
        clipMetadata.match_folder_path = matchFolderResult.folder_path || '';
      }

      // @testHook(goal_clip_metadata_created)

      // Send to Make.com for video processing
      if (getConfigValue('VIDEO.PROCESSING_SERVICE') === 'cloudconvert') {
        const processingResult = this.requestCloudConvertProcessing(clipMetadata);
        clipMetadata.processing_request = processingResult;
      }
      
      // @testHook(goal_clip_creation_complete)
      
      this.logger.exitFunction('createGoalClip', { 
        success: true,
        clip_id: clipId
      });
      
      return {
        success: true,
        clip_metadata: clipMetadata,
        folder_result: folderResult,
        match_folder_result: matchFolderResult,
        clip_id: clipId,
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

  // ==================== VIDEO EVENT MARKING ====================

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
      
      const eventMinute = parseInt(minute, 10);
      if (!ValidationUtils.isValidMinute(eventMinute)) {
        throw new Error(`Invalid minute: ${minute}`);
      }

      const allowedTypes = getConfigValue('VIDEO.NOTE_TYPES', ['big_chance', 'goal', 'skill', 'good_play', 'card', 'other']);
      const normalizedEventType = (eventType || '').toLowerCase();

      if (!allowedTypes.includes(normalizedEventType)) {
        throw new Error(`Invalid event type: ${eventType}`);
      }

      let resolvedPlayer = player ? StringUtils.cleanPlayerName(player) : '';
      if (!resolvedPlayer) {
        resolvedPlayer = this.autoDetectPlayerFromDescription(description);
      }

      // Create video event record
      const eventData = {
        minute: eventMinute,
        event_type: normalizedEventType,
        player: resolvedPlayer,
        description: description,
        marked_for_editor: true,
        marked_at: DateUtils.formatISO(DateUtils.now()),
        status: 'pending_review'
      };

      // Save to Video Events sheet
      const saveResult = this.saveVideoEvent(eventData);
      
      if (!saveResult.success) {
        throw new Error(`Failed to save video event: ${saveResult.error}`);
      }
      
      // @testHook(video_event_marked)
      
      this.logger.exitFunction('markVideoEvent', { success: true });
      
      return {
        success: true,
        event_data: eventData,
        message: 'Event marked for video editor review'
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

  // ==================== PLAYER FOLDER ORGANIZATION ====================

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

  // ==================== MATCH GRAPHICS GENERATION ====================

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
      
      if (!matchId) {
        throw new Error('Match ID is required');
      }
      
      // Get match information
      const fullMatchInfo = this.getMatchInfo(matchId, matchInfo);
      
      // Generate match clock overlay
      const clockOverlay = this.generateMatchClock(fullMatchInfo);
      
      // Generate player banners for key events
      const playerBanners = this.generatePlayerBanners(matchId);
      
      // Generate team logo overlays
      const logoOverlays = this.generateLogoOverlays(fullMatchInfo);
      
      // @testHook(match_graphics_generated)
      
      const graphics = {
        match_clock: clockOverlay,
        player_banners: playerBanners,
        logo_overlays: logoOverlays,
        generated_at: DateUtils.formatISO(DateUtils.now())
      };
      
      // Save graphics metadata
      const saveResult = this.saveMatchGraphics(matchId, graphics);
      
      this.logger.exitFunction('generateMatchGraphics', { success: true });
      
      return {
        success: true,
        match_id: matchId,
        graphics: graphics,
        save_result: saveResult
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

  // ==================== YOUTUBE INTEGRATION ====================

  /**
   * Upload clip to YouTube
   * @param {string} clipId - Clip ID
   * @param {string} filePath - Local file path or Drive file ID
   * @returns {Object} Upload result
   */
  uploadToYouTube(clipId, filePath) {
    this.logger.enterFunction('uploadToYouTube', { clipId, filePath });
    
    try {
      // @testHook(youtube_upload_start)
      
      if (!isFeatureEnabled('YOUTUBE_AUTOMATION')) {
        return { 
          success: false, 
          error: 'YouTube automation not enabled',
          skipped: true 
        };
      }
      
      // Get clip metadata
      const clipData = this.getClipMetadata(clipId);
      if (!clipData) {
        throw new Error(`Clip metadata not found: ${clipId}`);
      }
      
      // Prepare YouTube upload parameters
      const uploadParams = {
        title: clipData.title,
        description: clipData.description,
        tags: clipData.tags,
        privacy: getConfigValue('VIDEO.YOUTUBE_DEFAULT_PRIVACY', 'unlisted'),
        category: 'Sports'
      };
      
      // Upload to YouTube (this would integrate with YouTube API)
      const uploadResult = this.executeYouTubeUpload(filePath, uploadParams);
      
      if (uploadResult.success) {
        // Update clip metadata with YouTube URL
        this.updateClipWithYouTubeInfo(clipId, uploadResult.youtube_url, uploadResult.video_id);
      }
      
      // @testHook(youtube_upload_complete)
      
      this.logger.exitFunction('uploadToYouTube', { 
        success: uploadResult.success,
        video_id: uploadResult.video_id
      });
      
      return uploadResult;
      
    } catch (error) {
      this.logger.error('YouTube upload failed', { 
        error: error.toString(),
        clipId 
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
   * Save clip metadata to Video Clips sheet
   * @param {Object} clipMetadata - Clip metadata
   * @returns {Object} Save result
   */
  saveClipMetadata(clipMetadata) {
    try {
      const videoClipsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.VIDEO_CLIPS'),
        getConfigValue('SHEETS.REQUIRED_COLUMNS.VIDEO_CLIPS')
      );
      
      if (!videoClipsSheet) {
        return { success: false, error: 'Cannot access Video Clips sheet' };
      }
      
      const rowData = {
        'Match ID': clipMetadata.match_id,
        'Player': clipMetadata.player,
        'Event Type': clipMetadata.event_type,
        'Minute': clipMetadata.minute,
        'Start Time': clipMetadata.start_time_seconds,
        'Duration': clipMetadata.duration_seconds,
        'Title': clipMetadata.title,
        'Caption': clipMetadata.description,
        'Status': clipMetadata.status,
        'YouTube URL': '',
        'Folder Path': clipMetadata.match_folder_path || clipMetadata.player_folder_path || '',
        'Created': clipMetadata.created_at,
        'Match Date': clipMetadata.match_date || '',
        'Local Path': clipMetadata.player_folder_path || '',
        'Notes': clipMetadata.notes || ''
      };
      
      const addResult = SheetUtils.addRowFromObject(videoClipsSheet, rowData);
      
      return {
        success: addResult,
        clip_id: clipMetadata.clip_id
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  /**
   * Save video event note for editor
   * @param {Object} eventData - Event data
   * @returns {Object} Save result
   */
  saveVideoEvent(eventData) {
    try {
      const notesSheet = SheetUtils.getOrCreateSheet(
        'Video Notes',
        ['Timestamp', 'Minute', 'Event Type', 'Player', 'Description', 'Status']
      );

      if (!notesSheet) {
        return { success: false, error: 'Cannot access Video Notes sheet' };
      }

      const rowData = {
        'Timestamp': DateUtils.formatISO(DateUtils.now()),
        'Minute': eventData.minute,
        'Event Type': eventData.event_type,
        'Player': eventData.player || '',
        'Description': eventData.description || '',
        'Status': eventData.status || 'pending_review'
      };

      const addResult = SheetUtils.addRowFromObject(notesSheet, rowData);

      return {
        success: !!addResult,
        row: rowData
      };

    } catch (error) {
      this.logger.error('Failed to save video event', { error: error.toString(), eventData });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Generate clip title
   * @param {string} player - Player name
   * @param {string} opponent - Opposition
   * @param {number} minute - Goal minute
   * @returns {string} Generated title
   */
  generateClipTitle(player, opponent, minute) {
    const clubName = getConfigValue('SYSTEM.CLUB_SHORT_NAME', 'FC');
    
    if (opponent) {
      return `${player} Goal vs ${opponent} (${minute}')`;
    } else {
      return `${player} Goal - ${minute}' | ${clubName}`;
    }
  }

  /**
   * Generate clip description
   * @param {string} player - Player name
   * @param {string} assist - Assist provider
   * @param {string} opponent - Opposition
   * @param {number} minute - Goal minute
   * @returns {string} Generated description
   */
  generateClipDescription(player, assist, opponent, minute) {
    const clubName = getConfigValue('SYSTEM.CLUB_NAME', 'Football Club');
    const season = getConfigValue('SYSTEM.SEASON', '2024/25');
    
    let description = `${player} scores in the ${minute}' for ${clubName}`;
    
    if (assist) {
      description += ` with an assist from ${assist}`;
    }
    
    if (opponent) {
      description += ` against ${opponent}`;
    }
    
    description += `.\n\nSeason: ${season}`;
    description += `\n\n#${clubName.replace(/\s+/g, '')} #Football #Goal`;
    
    return description;
  }

  /**
   * Generate clip tags
   * @param {string} player - Player name
   * @param {string} opponent - Opposition
   * @returns {Array} Generated tags
   */
  generateClipTags(player, opponent) {
    const clubName = getConfigValue('SYSTEM.CLUB_NAME', 'Football Club');
    const tags = [
      clubName,
      'Football',
      'Goal',
      'Highlights',
      player
    ];
    
    if (opponent) {
      tags.push(opponent);
    }
    
    return tags;
  }

  /**
   * Ensure player folder exists in Google Drive
   * @param {string} player - Player name
   * @returns {Object} Folder creation result
   */
  ensurePlayerFolder(player) {
    try {
      const mainFolderId = getConfigValue('VIDEO.DRIVE_FOLDER_ID');
      if (!mainFolderId) {
        return { success: false, error: 'Main video folder not configured' };
      }

      const mainFolder = DriveApp.getFolderById(mainFolderId);
      const playerFolder = this.getOrCreatePlayerFolder(player);

      return {
        success: !!playerFolder,
        folder_id: playerFolder ? playerFolder.getId() : null,
        player: player,
        folder_name: playerFolder ? playerFolder.getName() : null,
        folder_path: playerFolder ? `${mainFolder.getName()}/${playerFolder.getName()}` : ''
      };

    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  /**
   * Get or create player folder
   * @param {string} player - Player name
   * @returns {GoogleAppsScript.Drive.Folder|null} Player folder
   */
  getOrCreatePlayerFolder(player) {
    try {
      const mainFolderId = getConfigValue('VIDEO.DRIVE_FOLDER_ID');
      if (!mainFolderId) return null;

      const mainFolder = DriveApp.getFolderById(mainFolderId);
      const safeFolderName = StringUtils.toSafeFilename(player);

      // Check if folder exists
      const existingFolders = mainFolder.getFoldersByName(safeFolderName);

      if (existingFolders.hasNext()) {
        return existingFolders.next();
      } else {
        // Create new folder
        return mainFolder.createFolder(safeFolderName);
      }

    } catch (error) {
      this.logger.error('Failed to get/create player folder', {
        error: error.toString(),
        player
      });
      return null;
    }
  }

  /**
   * Ensure match folder exists for highlights
   * @param {string} matchId - Match identifier
   * @param {Object} matchInfo - Match information
   * @returns {Object} Folder result
   */
  ensureMatchFolder(matchId, matchInfo = {}) {
    try {
      const mainFolderId = getConfigValue('VIDEO.DRIVE_FOLDER_ID');
      if (!mainFolderId) {
        return { success: false, error: 'Main video folder not configured' };
      }

      const mainFolder = DriveApp.getFolderById(mainFolderId);
      const prefix = getConfigValue('VIDEO.MATCH_FOLDER_PREFIX', 'Match Highlights');
      const matchRoot = this.getOrCreateChildFolder(mainFolder, prefix);

      if (!matchRoot) {
        return { success: false, error: 'Unable to create match highlights root folder' };
      }

      const safeDate = (matchInfo.date || DateUtils.formatUK(DateUtils.now()))
        .replace(/\//g, '-');
      const safeOpponent = matchInfo.opponent
        ? StringUtils.toSafeFilename(matchInfo.opponent)
        : 'opposition';
      const matchFolderName = `${safeDate}_${safeOpponent}`;

      const matchFolder = this.getOrCreateChildFolder(matchRoot, matchFolderName);

      return {
        success: !!matchFolder,
        folder_id: matchFolder ? matchFolder.getId() : null,
        folder_path: `${prefix}/${matchFolderName}`,
        match_id: matchId
      };

    } catch (error) {
      this.logger.error('Failed to ensure match folder', {
        error: error.toString(),
        matchId
      });

      return { success: false, error: error.toString(), match_id: matchId };
    }
  }

  /**
   * Helper to get or create child folder by name
   * @param {GoogleAppsScript.Drive.Folder} parentFolder - Parent folder
   * @param {string} folderName - Folder name
   * @returns {GoogleAppsScript.Drive.Folder|null} Folder instance
   */
  getOrCreateChildFolder(parentFolder, folderName) {
    if (!parentFolder || !folderName) {
      return null;
    }

    const existing = parentFolder.getFoldersByName(folderName);
    if (existing.hasNext()) {
      return existing.next();
    }

    return parentFolder.createFolder(folderName);
  }

  /**
   * Request CloudConvert processing
   * @param {Object} clipMetadata - Clip metadata
   * @returns {Object} Processing request result
   */
  requestCloudConvertProcessing(clipMetadata) {
    this.logger.enterFunction('requestCloudConvertProcessing', {
      clip_id: clipMetadata ? clipMetadata.clip_id : null,
      event_type: clipMetadata ? clipMetadata.event_type : null
    });

    try {
      const payload = this.buildClipProcessingPayload(clipMetadata);
      const players = [];
      if (clipMetadata.player && clipMetadata.player !== 'Opposition') {
        players.push({ player: clipMetadata.player });
      }
      const consentContext = {
        module: 'video_clips',
        eventType: payload.event_type,
        platform: 'make_webhook',
        players,
        matchId: clipMetadata.match_id || clipMetadata.matchId || null
      };

      // @testHook(video_clip_consent_start)
      const consentDecision = ConsentGate.evaluatePost(payload, consentContext);
      // @testHook(video_clip_consent_complete)

      if (!consentDecision.allowed) {
        this.logger.warn('Video clip processing blocked by consent gate', {
          clip_id: clipMetadata.clip_id,
          reason: consentDecision.reason
        });
        this.logger.exitFunction('requestCloudConvertProcessing', {
          success: false,
          blocked: true,
          reason: consentDecision.reason
        });
        return {
          success: false,
          blocked: true,
          reason: consentDecision.reason,
          consent: consentDecision
        };
      }

      const enrichedPayload = ConsentGate.applyDecisionToPayload(payload, consentDecision);

      // @testHook(video_clip_make_start)
      const makeResult = this.makeIntegration.sendToMake(enrichedPayload, {
        consentDecision,
        consentContext,
        idempotencyKey: clipMetadata.clip_id
      });
      // @testHook(video_clip_make_complete)

      this.logger.exitFunction('requestCloudConvertProcessing', {
        success: !!makeResult.success,
        blocked: false
      });

      return {
        ...makeResult,
        consent: consentDecision,
        payload: enrichedPayload
      };

    } catch (error) {
      this.logger.error('CloudConvert processing request failed', {
        error: error.toString(),
        clip_id: clipMetadata ? clipMetadata.clip_id : null
      });

      this.logger.exitFunction('requestCloudConvertProcessing', {
        success: false,
        error: error.toString()
      });
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  /**
   * Build payload for clip processing request
   * @param {Object} clipMetadata - Clip metadata
   * @returns {Object} Payload for Make.com
   */
  buildClipProcessingPayload(clipMetadata) {
    return {
      event_type: getConfigValue('MAKE.EVENT_TYPES.VIDEO_CLIP_PROCESSING', 'video_clip_processing'),
      media_type: 'video_highlights',
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),
      clip_id: clipMetadata.clip_id,
      match_id: clipMetadata.match_id,
      player: clipMetadata.player,
      metadata: clipMetadata,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }

  /**
   * Attempt to auto-detect player name from description
   * @param {string} description - Event description
   * @returns {string} Player name or empty string
   */
  autoDetectPlayerFromDescription(description) {
    if (!description || typeof description !== 'string') {
      return '';
    }

    const match = description.match(/([A-Z][a-z]+\s[A-Z][a-z]+)/);
    if (match && match[1]) {
      return StringUtils.cleanPlayerName(match[1]);
    }

    return '';
  }

  /**
   * Get match information for graphics
   * @param {string} matchId - Match ID
   * @param {Object} additionalInfo - Additional match info
   * @returns {Object} Complete match information
   */
  getMatchInfo(matchId, additionalInfo = {}) {
    try {
      // Try to get from Results sheet first
      const resultsSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.RESULTS')
      );
      
      if (resultsSheet) {
        const resultData = SheetUtils.findRowByCriteria(resultsSheet, { 'Match ID': matchId });
        if (resultData) {
          return {
            date: resultData.Date,
            opponent: resultData.Opposition,
            venue: resultData.Venue,
            competition: resultData.Competition,
            home_away: resultData['Home/Away'],
            ...additionalInfo
          };
        }
      }
      
      // Try Fixtures sheet
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfigValue('SHEETS.TAB_NAMES.FIXTURES')
      );
      
      if (fixturesSheet) {
        const fixtureData = SheetUtils.findRowByCriteria(fixturesSheet, { 'Match ID': matchId });
        if (fixtureData) {
          return {
            date: fixtureData.Date,
            opponent: fixtureData.Opposition,
            venue: fixtureData.Venue,
            competition: fixtureData.Competition,
            home_away: fixtureData['Home/Away'],
            ...additionalInfo
          };
        }
      }
      
      // Default match info
      return {
        date: DateUtils.formatUK(DateUtils.now()),
        opponent: 'Unknown',
        venue: 'Unknown',
        competition: 'League',
        home_away: 'Home',
        ...additionalInfo
      };
      
    } catch (error) {
      this.logger.error('Failed to get match info', { error: error.toString() });
      return {
        date: DateUtils.formatUK(DateUtils.now()),
        opponent: 'Unknown',
        venue: 'Unknown',
        competition: 'League',
        home_away: 'Home',
        ...additionalInfo
      };
    }
  }

  /**
   * Generate match clock overlay
   * @param {Object} matchInfo - Match information
   * @returns {Object} Clock overlay data
   */
  generateMatchClock(matchInfo) {
    return {
      type: 'match_clock',
      template: 'standard_clock',
      data: {
        club_name: getConfigValue('SYSTEM.CLUB_SHORT_NAME'),
        opponent: matchInfo.opponent,
        date: matchInfo.date,
        venue: matchInfo.venue
      }
    };
  }

  /**
   * Generate player banners
   * @param {string} matchId - Match ID
   * @returns {Array} Player banners data
   */
  generatePlayerBanners(matchId) {
    // This would generate player-specific banners for goals, cards, etc.
    return [
      {
        type: 'goal_banner',
        template: 'goal_celebration',
        usage: 'goal_clips'
      }
    ];
  }

  /**
   * Generate logo overlays
   * @param {Object} matchInfo - Match information
   * @returns {Object} Logo overlays data
   */
  generateLogoOverlays(matchInfo) {
    return {
      type: 'logo_overlay',
      template: 'corner_logo',
      data: {
        club_logo: 'club_logo.png',
        position: 'bottom_right'
      }
    };
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

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
      getConfigValue('SHEETS.TAB_NAMES.VIDEO_CLIPS')
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
 * Initialize video clips system
 * @returns {Object} Initialization result
 */
function initializeVideoClips() {
  logger.enterFunction('VideoClips.initialize');
  
  try {
    // Check if video integration is enabled
    if (!isFeatureEnabled('VIDEO_INTEGRATION')) {
      return {
        success: true,
        message: 'Video integration disabled',
        enabled: false
      };
    }
    
    // Validate required sheets
    const requiredSheets = ['VIDEO_CLIPS'];
    const results = {};
    
    requiredSheets.forEach(sheetKey => {
      const tabName = getConfigValue(`SHEETS.TAB_NAMES.${sheetKey}`);
      const columns = getConfigValue(`SHEETS.REQUIRED_COLUMNS.${sheetKey}`);
      
      if (tabName && columns) {
        const sheet = SheetUtils.getOrCreateSheet(tabName, columns);
        results[sheetKey] = { success: !!sheet, name: tabName };
      }
    });
    
    // Check Drive folder configuration
    const driveFolderId = getConfigValue('VIDEO.DRIVE_FOLDER_ID');
    const driveConfigured = !!driveFolderId;
    
    logger.exitFunction('VideoClips.initialize', { success: true });
    
    return {
      success: true,
      sheets_created: results,
      drive_configured: driveConfigured,
      features_enabled: {
        video_integration: isFeatureEnabled('VIDEO_INTEGRATION'),
        youtube_automation: isFeatureEnabled('YOUTUBE_AUTOMATION'),
        clip_creation: isFeatureEnabled('VIDEO_CLIP_CREATION')
      },
      version: '6.2.0'
    };
    
  } catch (error) {
    logger.error('Video clips initialization failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}
