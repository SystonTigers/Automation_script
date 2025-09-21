/**
 * @fileoverview Syston Tigers Automation - Enhanced Match Events System
 * @version 5.1.0
 * @author Senior Software Architect
 * 
 * Enhanced match event handling with proper 2nd yellow cards, opposition events,
 * and robust idempotency per checklist requirements.
 */


/**
 * Enhanced Match Events Manager with comprehensive event handling
 */
class EnhancedMatchEventsManager extends BaseAutomationComponent {
  
  constructor() {
    super('EnhancedMatchEventsManager');
    this.currentMatchId = null;
    this.eventQueue = [];
    this.idempotencyManager = new IdempotencyManager();
    this.oppositionTracker = new Map(); // Track opposition events
    this.cardTracker = new Map(); // Track player cards for 2nd yellow detection
  }


  /**
   * Enhanced initialization with additional sheets
   * @returns {boolean} Success status
   */
  doInitialize() {
    logger.enterFunction('EnhancedMatchEventsManager.doInitialize');
    
    try {
      // Ensure all required sheets exist with proper headers
      const requiredSheets = [
        { 
          name: getConfig('SHEETS.LIVE'), 
          headers: ['Minute', 'Event', 'Player', 'Details', 'Posted', 'Idempotency_Key'] 
        },
        { 
          name: getConfig('SHEETS.DISCIPLINE_LOG'), 
          headers: ['Date', 'Match_ID', 'Player', 'Card_Type', 'Minute', 'Previous_Cards', 'Posted', 'Timestamp'] 
        },
        { 
          name: getConfig('SHEETS.OPPOSITION_LOG'), 
          headers: ['Match_ID', 'Event_Type', 'Minute', 'Details', 'Opponent_Name', 'Posted', 'Timestamp'] 
        },
        { 
          name: getConfig('SHEETS.SOCIAL_POSTS'), 
          headers: ['Timestamp', 'Event_Type', 'Payload', 'Status', 'Response'] 
        }
      ];


      for (const sheetConfig of requiredSheets) {
        const sheet = SheetUtils.getOrCreateSheet(sheetConfig.name, sheetConfig.headers);
        if (!sheet) {
          logger.error(`Failed to create required sheet: ${sheetConfig.name}`);
          return false;
        }
      }


      // Load current match context
      this.loadCurrentMatchContext();
      
      // Initialize card tracking for current match
      this.initializeCardTracking();
      
      logger.exitFunction('EnhancedMatchEventsManager.doInitialize', { success: true });
      return true;
    } catch (error) {
      logger.error('EnhancedMatchEventsManager initialization failed', { error: error.toString() });
      return false;
    }
  }


  /**
   * Load current match context and state
   */
  loadCurrentMatchContext() {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.LIVE'));
      if (liveSheet) {
        const matchIdCell = getConfig('SHEETS.LIVE_CELLS.MATCH_ID', 'B1');
        this.currentMatchId = SheetUtils.getCellValue(liveSheet, matchIdCell, null);
        
        if (this.currentMatchId) {
          logger.info('Loaded current match context', { matchId: this.currentMatchId });
        }
      }
    } catch (error) {
      logger.warn('Failed to load current match context', { error: error.toString() });
    }
  }


  /**
   * Initialize card tracking for the current match
   */
  initializeCardTracking() {
    logger.testHook('card_tracking_initialization', { matchId: this.currentMatchId });
    
    try {
      this.cardTracker.clear();
      
      if (!this.currentMatchId) return;
      
      // Load existing cards from discipline log for this match
      const disciplineSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.DISCIPLINE_LOG'));
      if (!disciplineSheet) return;
      
      const data = disciplineSheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        const [date, matchId, player, cardType, minute] = data[i];
        
        if (matchId === this.currentMatchId && player && player !== 'Opposition') {
          if (!this.cardTracker.has(player)) {
            this.cardTracker.set(player, []);
          }
          this.cardTracker.get(player).push({
            type: cardType,
            minute: minute,
            timestamp: date
          });
        }
      }
      
      logger.info('Card tracking initialized', { 
        playersTracked: this.cardTracker.size,
        matchId: this.currentMatchId
      });
      
    } catch (error) {
      logger.error('Failed to initialize card tracking', { error: error.toString() });
    }
  }


  // ===== ENHANCED EVENT PROCESSING =====


  /**
   * Process enhanced event with comprehensive validation and idempotency
   * @param {Object} eventData - Event data object
   * @returns {Object} Processing result with detailed feedback
   */
  processEnhancedEvent(eventData) {
    logger.enterFunction('EnhancedMatchEventsManager.processEnhancedEvent', eventData);
    
    const result = {
      success: false,
      eventProcessed: false,
      idempotencySkipped: false,
      validationErrors: [],
      warnings: [],
      eventKey: null
    };


    return this.withLock(() => {
      try {
        logger.testHook('enhanced_event_processing_start', { 
          eventType: eventData.eventType,
          player: eventData.player
        });


        // Enhanced validation
        const validation = ValidationUtils.validateEventData(eventData);
        if (!validation.valid) {
          result.validationErrors = validation.errors;
          logger.error('Event validation failed', validation);
          return result;
        }
        
        result.warnings = validation.warnings;
        const sanitizedData = validation.sanitizedData;


        // Generate idempotency key
        const idempotencyKey = this.idempotencyManager.generateKey(sanitizedData);
        result.eventKey = idempotencyKey;


        // Check idempotency
        if (idempotencyKey && this.idempotencyManager.isAlreadyProcessed(idempotencyKey)) {
          result.idempotencySkipped = true;
          result.success = true;
          logger.info('Event skipped due to idempotency', { 
            eventKey: idempotencyKey,
            eventType: sanitizedData.eventType
          });
          return result;
        }


        // Process event by type with enhanced handling
        const processResult = this.processEventByTypeEnhanced(sanitizedData);
        if (!processResult.success) {
          result.validationErrors.push(processResult.error || 'Event processing failed');
          logger.error('Enhanced event processing failed', processResult);
          return result;
        }


        // Log to appropriate sheets
        const logResult = this.logEnhancedEvent(sanitizedData, idempotencyKey);
        if (!logResult.success) {
          result.warnings.push('Failed to log event to sheet');
        }


        // Post to Make.com if applicable
        const postResult = this.postEnhancedEventToMake(sanitizedData);
        if (!postResult.success) {
          result.warnings.push('Failed to post to Make.com');
        }


        // Mark as processed for idempotency
        if (idempotencyKey) {
          this.idempotencyManager.markAsProcessed(idempotencyKey, sanitizedData);
        }


        result.success = true;
        result.eventProcessed = true;
        
        logger.testHook('enhanced_event_processing_complete', { 
          eventType: sanitizedData.eventType,
          success: true
        });


        logger.exitFunction('EnhancedMatchEventsManager.processEnhancedEvent', result);
        return result;


      } catch (error) {
        result.validationErrors.push(`Processing exception: ${error.toString()}`);
        logger.error('Enhanced event processing exception', { error: error.toString() });
        return result;
      }
    });
  }


  /**
   * Enhanced event type processing with 2nd yellow and opposition handling
   * @param {Object} eventData - Validated event data
   * @returns {Object} Processing result
   */
  processEventByTypeEnhanced(eventData) {
    logger.testHook('enhanced_event_type_routing', { eventType: eventData.eventType });
    
    try {
      const eventType = eventData.eventType;


      // Enhanced goal processing
      if (eventType === getConfig('EVENTS.GOAL')) {
        return this.processEnhancedGoal(eventData);
      }
      
      if (eventType === getConfig('EVENTS.GOAL_OPPOSITION')) {
        return this.processEnhancedOppositionGoal(eventData);
      }


      // Enhanced card processing with 2nd yellow detection
      if (eventType === getConfig('EVENTS.CARD')) {
        return this.processEnhancedCard(eventData);
      }
      
      if (eventType === getConfig('EVENTS.CARD_OPPOSITION')) {
        return this.processEnhancedOppositionCard(eventData);
      }


      // Other enhanced event types
      if (eventType === getConfig('EVENTS.SUBSTITUTION')) {
        return this.processEnhancedSubstitution(eventData);
      }


      if (eventType === getConfig('EVENTS.SECOND_HALF_KICK_OFF')) {
        return this.processEnhancedSecondHalfKickOff(eventData);
      }


      if (eventType === getConfig('EVENTS.MOTM')) {
        return this.processEnhancedMotm(eventData);
      }


      // Default processing for other types
      return { 
        success: true, 
        data: eventData,
        processed: true
      };


    } catch (error) {
      return { 
        success: false, 
        error: `Enhanced event processing failed: ${error.toString()}` 
      };
    }
  }


  // ===== ENHANCED GOAL PROCESSING =====


  /**
   * Process enhanced goal with assist tracking and statistics
   * @param {Object} eventData - Goal event data
   * @returns {Object} Processing result
   */
  processEnhancedGoal(eventData) {
    logger.testHook('enhanced_goal_processing', eventData);
    
    try {
      // Determine if this is a special goal type
      const goalType = this.determineGoalType(eventData);
      
      // Update match score
      const scoreUpdated = this.updateMatchScore('home');
      
      // Update player statistics
      const playerStatsUpdated = this.updatePlayerGoalStats(eventData.player, goalType);
      
      // Process assist if provided
      let assistProcessed = true;
      if (eventData.assistBy && eventData.assistBy !== eventData.player) {
        assistProcessed = this.updatePlayerAssistStats(eventData.assistBy);
      }


      return {
        success: scoreUpdated && playerStatsUpdated && assistProcessed,
        data: {
          ...eventData,
          goalType: goalType,
          scoreUpdated: scoreUpdated,
          playerStatsUpdated: playerStatsUpdated,
          assistProcessed: assistProcessed
        }
      };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Process enhanced opposition goal (per checklist)
   * @param {Object} eventData - Opposition goal event data
   * @returns {Object} Processing result
   */
  processEnhancedOppositionGoal(eventData) {
    logger.testHook('enhanced_opposition_goal_processing', eventData);
    
    try {
      // Update opposition score only
      const scoreUpdated = this.updateMatchScore('away');
      
      // Log to opposition tracking
      const oppositionLogged = this.logOppositionEvent(eventData);
      
      // Track for statistics (but not as our goal)
      this.oppositionTracker.set(`goal_${eventData.minute}`, {
        type: 'goal',
        minute: eventData.minute,
        details: eventData.details,
        timestamp: new Date().toISOString()
      });


      return {
        success: scoreUpdated && oppositionLogged,
        data: {
          ...eventData,
          scoreUpdated: scoreUpdated,
          oppositionLogged: oppositionLogged,
          isOpposition: true
        }
      };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }


  // ===== ENHANCED CARD PROCESSING WITH 2ND YELLOW DETECTION =====


  /**
   * Process enhanced card with automatic 2nd yellow detection (per checklist)
   * @param {Object} eventData - Card event data
   * @returns {Object} Processing result
   */
  processEnhancedCard(eventData) {
    logger.testHook('enhanced_card_processing', { 
      player: eventData.player,
      cardType: eventData.cardType
    });
    
    try {
      const player = eventData.player;
      const cardType = eventData.cardType;
      
      // Check for 2nd yellow card scenario
      const cardHistory = this.cardTracker.get(player) || [];
      const previousYellows = cardHistory.filter(card => card.type === getConfig('CARDS.YELLOW'));
      
      let actualCardType = cardType;
      let isSecondYellow = false;
      
      // Auto-detect 2nd yellow (per checklist requirement)
      if (cardType === getConfig('CARDS.YELLOW') && previousYellows.length >= 1) {
        actualCardType = getConfig('CARDS.SECOND_YELLOW');
        isSecondYellow = true;
        logger.info('2nd yellow card detected automatically', { 
          player: player,
          previousYellows: previousYellows.length
        });
      }
      
      // Explicit 2nd yellow handling (per checklist)
      if (cardType === getConfig('CARDS.SECOND_YELLOW')) {
        isSecondYellow = true;
        actualCardType = getConfig('CARDS.SECOND_YELLOW');
      }


      // Update card tracking
      this.updateCardTracking(player, actualCardType, eventData.minute);


      // Log to discipline sheet with enhanced data
      const disciplineLogged = this.logEnhancedDisciplineEvent({
        ...eventData,
        cardType: actualCardType,
        isSecondYellow: isSecondYellow,
        previousCards: cardHistory
      });


      // Update player statistics
      const finalCardForStats = isSecondYellow ? getConfig('CARDS.RED') : actualCardType;
      const playerStatsUpdated = this.updatePlayerCardStats(player, finalCardForStats);


      return {
        success: disciplineLogged && playerStatsUpdated,
        data: {
          ...eventData,
          actualCardType: actualCardType,
          isSecondYellow: isSecondYellow,
          previousCards: cardHistory.length,
          disciplineLogged: disciplineLogged,
          playerStatsUpdated: playerStatsUpdated
        }
      };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Process enhanced opposition card (per checklist)
   * @param {Object} eventData - Opposition card event data
   * @returns {Object} Processing result
   */
  processEnhancedOppositionCard(eventData) {
    logger.testHook('enhanced_opposition_card_processing', eventData);
    
    try {
      // Log to discipline sheet with "Opposition" as player
      const disciplineLogged = this.logEnhancedDisciplineEvent({
        ...eventData,
        player: 'Opposition',
        isOpposition: true
      });


      // Log to opposition tracking
      const oppositionLogged = this.logOppositionEvent({
        ...eventData,
        eventType: 'card'
      });


      return {
        success: disciplineLogged && oppositionLogged,
        data: {
          ...eventData,
          isOpposition: true,
          disciplineLogged: disciplineLogged,
          oppositionLogged: oppositionLogged
        }
      };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Enhanced 2nd half kick off processing (per checklist)
   * @param {Object} eventData - 2nd half kick off event data
   * @returns {Object} Processing result
   */
  processEnhancedSecondHalfKickOff(eventData) {
    logger.testHook('enhanced_second_half_kickoff_processing', eventData);
    
    try {
      // Update match status
      const liveSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.LIVE'));
      let statusUpdated = false;
      
      if (liveSheet) {
        const statusCell = getConfig('SHEETS.LIVE_CELLS.MATCH_STATUS', 'B4');
        const currentMinuteCell = getConfig('SHEETS.LIVE_CELLS.CURRENT_MINUTE', 'B9');
        
        statusUpdated = SheetUtils.setCellValue(liveSheet, statusCell, '2nd Half');
        SheetUtils.setCellValue(liveSheet, currentMinuteCell, 45);
      }


      // Get current scores for payload
      const currentScores = this.getCurrentScores();


      return {
        success: statusUpdated,
        data: {
          ...eventData,
          statusUpdated: statusUpdated,
          halfTimeScore: currentScores,
          matchStatus: '2nd Half'
        }
      };
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }


  // ===== UTILITY METHODS =====


  /**
   * Determine goal type from event data
   * @param {Object} eventData - Goal event data
   * @returns {string} Goal type
   */
  determineGoalType(eventData) {
    const details = (eventData.details || '').toLowerCase();
    
    if (details.includes('penalty')) return 'penalty';
    if (details.includes('free kick')) return 'free_kick';
    if (details.includes('header')) return 'header';
    if (details.includes('volley')) return 'volley';
    if (details.includes('own goal')) return 'own_goal';
    
    return 'open_play';
  }


  /**
   * Update card tracking for a player
   * @param {string} player - Player name
   * @param {string} cardType - Card type
   * @param {number} minute - Card minute
   */
  updateCardTracking(player, cardType, minute) {
    if (!this.cardTracker.has(player)) {
      this.cardTracker.set(player, []);
    }
    
    this.cardTracker.get(player).push({
      type: cardType,
      minute: minute,
      timestamp: new Date().toISOString()
    });
    
    logger.testHook('card_tracking_updated', { 
      player, 
      cardType, 
      totalCards: this.cardTracker.get(player).length 
    });
  }


  /**
   * Log enhanced discipline event with previous card history
   * @param {Object} eventData - Enhanced event data
   * @returns {boolean} Success status
   */
  logEnhancedDisciplineEvent(eventData) {
    try {
      const disciplineSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.DISCIPLINE_LOG'),
        ['Date', 'Match_ID', 'Player', 'Card_Type', 'Minute', 'Previous_Cards', 'Posted', 'Timestamp']
      );
      
      if (!disciplineSheet) return false;


      const previousCardsInfo = eventData.previousCards ? 
        `${eventData.previousCards.length} previous cards` : 'No previous cards';


      const values = [
        DateUtils.formatDate(DateUtils.now()),
        this.currentMatchId || '',
        eventData.player || '',
        eventData.cardType || '',
        eventData.minute || '',
        previousCardsInfo,
        'N',
        DateUtils.now().toISOString()
      ];


      return SheetUtils.appendRowSafe(disciplineSheet, values);
    } catch (error) {
      logger.error('Failed to log enhanced discipline event', { error: error.toString() });
      return false;
    }
  }


  /**
   * Log opposition event to tracking sheet
   * @param {Object} eventData - Opposition event data
   * @returns {boolean} Success status
   */
  logOppositionEvent(eventData) {
    try {
      const oppositionSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.OPPOSITION_LOG'),
        ['Match_ID', 'Event_Type', 'Minute', 'Details', 'Opponent_Name', 'Posted', 'Timestamp']
      );
      
      if (!oppositionSheet) return false;


      const values = [
        this.currentMatchId || '',
        eventData.eventType || '',
        eventData.minute || '',
        eventData.details || '',
        this.getOpponentName(),
        'N',
        DateUtils.now().toISOString()
      ];


      return SheetUtils.appendRowSafe(oppositionSheet, values);
    } catch (error) {
      logger.error('Failed to log opposition event', { error: error.toString() });
      return false;
    }
  }


  /**
   * Get current opponent name
   * @returns {string} Opponent name
   */
  getOpponentName() {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.LIVE'));
      if (!liveSheet) return 'Unknown Opponent';


      const homeTeam = SheetUtils.getCellValue(liveSheet, 
        getConfig('SHEETS.LIVE_CELLS.HOME_TEAM', 'B2'), 'Home');
      const awayTeam = SheetUtils.getCellValue(liveSheet, 
        getConfig('SHEETS.LIVE_CELLS.AWAY_TEAM', 'B3'), 'Away');


      // Determine opponent based on our club name
      const clubName = getConfig('SYSTEM.CLUB_NAME', 'Syston');
      if (homeTeam.includes(clubName) || homeTeam.includes('Tigers')) {
        return awayTeam;
      } else {
        return homeTeam;
      }
    } catch (error) {
      return 'Unknown Opponent';
    }
  }


  /**
   * Get current scores for payload building
   * @returns {Object} Current scores
   */
  getCurrentScores() {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.LIVE'));
      if (!liveSheet) return { home: 0, away: 0 };


      const homeScore = SheetUtils.getCellValue(liveSheet, 
        getConfig('SHEETS.LIVE_CELLS.HOME_SCORE', 'C2'), 0);
      const awayScore = SheetUtils.getCellValue(liveSheet, 
        getConfig('SHEETS.LIVE_CELLS.AWAY_SCORE', 'D2'), 0);


      return {
        home: parseInt(homeScore) || 0,
        away: parseInt(awayScore) || 0
      };
    } catch (error) {
      return { home: 0, away: 0 };
    }
  }


  /**
   * Log enhanced event to Live sheet with idempotency
   * @param {Object} eventData - Event data
   * @param {string} idempotencyKey - Idempotency key
   * @returns {Object} Log result
   */
  logEnhancedEvent(eventData, idempotencyKey) {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.LIVE'));
      if (!liveSheet) return { success: false, error: 'Live sheet not found' };


      const values = [
        eventData.minute || '',
        eventData.eventType || '',
        eventData.player || '',
        eventData.details || '',
        'N', // Posted status
        idempotencyKey || '' // Idempotency key for tracking
      ];


      const success = SheetUtils.appendRowSafe(liveSheet, values, null, idempotencyKey);
      return { success: success };
    } catch (error) {
      logger.error('Failed to log enhanced event', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Post enhanced event to Make.com with improved payload
   * @param {Object} eventData - Event data
   * @returns {Object} Post result
   */
  postEnhancedEventToMake(eventData) {
    logger.testHook('enhanced_make_posting_attempt', { eventType: eventData.eventType });
    
    try {
      // Check if this event type should be posted
      const enabledEvents = getConfig('SOCIAL.ENABLED_EVENTS', []);
      if (!enabledEvents.includes(eventData.eventType)) {
        logger.info('Event type not enabled for social posting', { 
          eventType: eventData.eventType 
        });
        return { success: true, skipped: true };
      }


      // Get Make.com webhook URL
      const webhookUrl = PropertiesService.getScriptProperties()
                           .getProperty(getConfig('MAKE.WEBHOOK_URL_PROPERTY'));
      
      if (!webhookUrl) {
        logger.warn('Make.com webhook URL not configured');
        return { success: false, error: 'Webhook URL not configured' };
      }


      // Build enhanced payload
      const payload = this.buildEnhancedMakePayload(eventData);
      
      // Send to Make.com
      const response = ApiUtils.makeRequest(webhookUrl, {
        method: 'POST',
        payload: JSON.stringify(payload)
      });


      // Log the post attempt
      this.logSocialPost(eventData, response);


      return {
        success: response.success,
        response: response,
        error: response.error
      };


    } catch (error) {
      logger.error('Failed to post enhanced event to Make.com', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Build enhanced Make.com payload with all required placeholders
   * @param {Object} eventData - Event data
   * @returns {Object} Enhanced Make.com payload
   */
  buildEnhancedMakePayload(eventData) {
    const currentScores = this.getCurrentScores();
    const matchInfo = this.getEnhancedMatchInfo();
    
    const basePayload = {
      timestamp: DateUtils.now().toISOString(),
      match_id: this.currentMatchId,
      event_type: getConfig(`MAKE.EVENT_MAPPINGS.${eventData.eventType}`, eventData.eventType),
      source: 'apps_script_enhanced_automation',
      version: getConfig('SYSTEM.VERSION')
    };


    // Enhanced event-specific payloads per checklist requirements
    if (eventData.eventType === getConfig('EVENTS.GOAL')) {
      Object.assign(basePayload, {
        player_name: eventData.player,
        minute: eventData.minute,
        home_score: currentScores.home,
        away_score: currentScores.away,
        match_info: matchInfo,
        goal_type: eventData.goalType || 'open_play',
        assist_by: eventData.assistBy || ''
      });
    }


    if (eventData.eventType === getConfig('EVENTS.GOAL_OPPOSITION')) {
      Object.assign(basePayload, {
        opponent_name: this.getOpponentName(),
        minute: eventData.minute,
        home_score: currentScores.home,
        away_score: currentScores.away,
        match_info: matchInfo,
        match_status: 'LIVE'
      });
    }


    // Enhanced card payloads including 2nd yellow
    if (eventData.eventType === getConfig('EVENTS.CARD') || 
        eventData.cardType === getConfig('CARDS.SECOND_YELLOW')) {
      Object.assign(basePayload, {
        player_name: eventData.player,
        card_type: eventData.actualCardType || eventData.cardType,
        minute: eventData.minute,
        match_info: matchInfo,
        incident_details: eventData.details || '',
        is_second_yellow: eventData.isSecondYellow || false,
        previous_yellow_minute: eventData.isSecondYellow ? 
          this.getPreviousYellowMinute(eventData.player) : null
      });
      
      // Override event type for 2nd yellow
      if (eventData.isSecondYellow) {
        basePayload.event_type = 'card_second_yellow';
      }
    }


    if (eventData.eventType === getConfig('EVENTS.SECOND_HALF_KICK_OFF')) {
      Object.assign(basePayload, {
        home_team: matchInfo.homeTeam,
        away_team: matchInfo.awayTeam,
        half_time_score: `${currentScores.home}-${currentScores.away}`,
        match_info: matchInfo.display
      });
    }


    return basePayload;
  }


  /**
   * Get enhanced match info for payloads
   * @returns {Object} Enhanced match info
   */
  getEnhancedMatchInfo() {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.LIVE'));
      if (!liveSheet) return { display: '', homeTeam: 'Home', awayTeam: 'Away' };


      const homeTeam = SheetUtils.getCellValue(liveSheet, 
        getConfig('SHEETS.LIVE_CELLS.HOME_TEAM', 'B2'), 'Home');
      const awayTeam = SheetUtils.getCellValue(liveSheet, 
        getConfig('SHEETS.LIVE_CELLS.AWAY_TEAM', 'B3'), 'Away');
      const venue = SheetUtils.getCellValue(liveSheet, 
        getConfig('SHEETS.LIVE_CELLS.VENUE', 'B6'), '');
      const competition = SheetUtils.getCellValue(liveSheet, 
        getConfig('SHEETS.LIVE_CELLS.COMPETITION', 'B7'), 'League');


      return {
        display: `${homeTeam} vs ${awayTeam}${venue ? ' at ' + venue : ''}`,
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        venue: venue,
        competition: competition
      };
    } catch (error) {
      return { display: '', homeTeam: 'Home', awayTeam: 'Away' };
    }
  }


  /**
   * Get previous yellow card minute for 2nd yellow display
   * @param {string} player - Player name
   * @returns {number|null} Previous yellow minute
   */
  getPreviousYellowMinute(player) {
    try {
      const cardHistory = this.cardTracker.get(player) || [];
      const previousYellow = cardHistory.find(card => card.type === getConfig('CARDS.YELLOW'));
      return previousYellow ? previousYellow.minute : null;
    } catch (error) {
      return null;
    }
  }


  // ===== PUBLIC API METHODS =====


  /**
   * Public method to process goal (enhanced)
   * @param {string} player - Player name
   * @param {number} minute - Goal minute  
   * @param {string} details - Goal details
   * @param {string} assistBy - Assist provider
   * @returns {Object} Processing result
   */
  processGoal(player, minute, details = '', assistBy = '') {
    return this.processEnhancedEvent({
      eventType: getConfig('EVENTS.GOAL'),
      player: player,
      minute: minute,
      details: details,
      assistBy: assistBy,
      timestamp: DateUtils.now().toISOString()
    });
  }


  /**
   * Public method to process opposition goal (per checklist)
   * @param {number} minute - Goal minute
   * @param {string} details - Goal details
   * @returns {Object} Processing result
   */
  processOppositionGoal(minute, details = '') {
    return this.processEnhancedEvent({
      eventType: getConfig('EVENTS.GOAL_OPPOSITION'),
      player: 'Opposition',
      minute: minute,
      details: details,
      timestamp: DateUtils.now().toISOString()
    });
  }


  /**
   * Public method to process card with auto 2nd yellow detection
   * @param {string} player - Player name
   * @param {string} cardType - Card type
   * @param {number} minute - Card minute
   * @param {string} details - Card details
   * @returns {Object} Processing result
   */
  processCard(player, cardType, minute, details = '') {
    return this.processEnhancedEvent({
      eventType: getConfig('EVENTS.CARD'),
      player: player,
      cardType: cardType,
      minute: minute,
      details: details,
      timestamp: DateUtils.now().toISOString()
    });
  }


  /**
   * Public method to process opposition card (per checklist)
   * @param {string} cardType - Card type
   * @param {number} minute - Card minute
   * @param {string} details - Card details
   * @returns {Object} Processing result
   */
  processOppositionCard(cardType, minute, details = '') {
    return this.processEnhancedEvent({
      eventType: getConfig('EVENTS.CARD_OPPOSITION'),
      player: 'Opposition',
      cardType: cardType,
      minute: minute,
      details: details,
      timestamp: DateUtils.now().toISOString()
    });
  }


  /**
   * Public method to process 2nd half kick off (per checklist)
   * @returns {Object} Processing result
   */
  processSecondHalfKickOff() {
    return this.processEnhancedEvent({
      eventType: getConfig('EVENTS.SECOND_HALF_KICK_OFF'),
      minute: 45,
      details: '2nd Half Started',
      timestamp: DateUtils.now().toISOString()
    });
  }
}


// Create and export singleton instance
const enhancedMatchEventsManager = new EnhancedMatchEventsManager();


// Export for global access
globalThis.EnhancedMatchEventsManager = EnhancedMatchEventsManager;
globalThis.enhancedMatchEventsManager = enhancedMatchEventsManager;
