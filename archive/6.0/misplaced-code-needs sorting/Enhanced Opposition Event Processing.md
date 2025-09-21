/**
 * @fileoverview Syston Tigers Automation - Enhanced Opposition Event Processing
 * @version 6.0.0
 * @author Senior Software Architect
 * 
 * CRITICAL MILESTONE 1.1 IMPLEMENTATION: Opposition Event Handling
 * 
 * Implements the missing opposition goal and card processing functions
 * as specified in tasks.md Milestone 1.1 Opposition Event Handling.
 * 
 * Key Requirements:
 * - Detect "Goal" selection from player dropdown = opposition goal
 * - Update opposition score only (not our player stats)
 * - Create Make.com payload with event_type: 'goal_opposition'
 * - Handle opposition cards separately from player cards
 */


// ===== ENHANCED OPPOSITION GOAL PROCESSING =====


/**
 * Process enhanced opposition goal (CRITICAL - Milestone 1.1)
 * @param {Object} eventData - Opposition goal event data
 * @returns {Object} Processing result
 */
processEnhancedOppositionGoal(eventData) {
  logger.enterFunction('EnhancedMatchEventsManager.processEnhancedOppositionGoal', {
    minute: eventData.minute,
    details: eventData.details
  });
  
  try {
    // @testHook(opposition_goal_detection)
    // Detect opposition goal scenario:
    // - "Goal" selected from player dropdown when opposition scores
    // - OR explicit opposition goal event
    const isOppositionGoal = this.detectOppositionGoal(eventData);
    
    if (!isOppositionGoal) {
      logger.warn('Not recognized as opposition goal', eventData);
      return { success: false, error: 'Not an opposition goal event' };
    }


    // @testHook(opposition_score_update)
    // Update ONLY opposition score (not our player stats)
    const scoreUpdated = this.updateOppositionScore(eventData);
    
    // @testHook(opposition_event_logging)
    // Log to opposition tracking (not player stats)
    const oppositionLogged = this.logOppositionEvent(eventData);
    
    // @testHook(opposition_payload_generation)
    // Create Make.com payload with 'goal_opposition' event type
    const makePayload = this.buildOppositionGoalPayload(eventData);
    
    // @testHook(opposition_make_posting)
    // Post to Make.com for Canva template generation
    const postResult = this.postOppositionEventToMake(makePayload);
    
    // Track idempotency
    const idempotencyKey = `opposition_goal_${this.currentMatchId}_${eventData.minute}`;
    this.idempotencyManager.markAsProcessed(idempotencyKey, eventData);


    const result = {
      success: scoreUpdated && oppositionLogged && postResult.success,
      scoreUpdated: scoreUpdated,
      oppositionLogged: oppositionLogged,
      makePostResult: postResult,
      eventType: 'goal_opposition',
      data: {
        ...eventData,
        processed: true,
        oppositionScore: this.getCurrentOppositionScore()
      }
    };


    logger.exitFunction('EnhancedMatchEventsManager.processEnhancedOppositionGoal', result);
    return result;


  } catch (error) {
    logger.error('Opposition goal processing failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Detect if this is an opposition goal event
 * @param {Object} eventData - Event data
 * @returns {boolean} True if opposition goal
 */
detectOppositionGoal(eventData) {
  logger.testHook('opposition_goal_detection_logic', eventData);
  
  try {
    // Method 1: "Goal" selected from player dropdown when opposition scores
    // (This happens when match official selects "Goal" instead of a player name)
    if (eventData.player === 'Goal' || eventData.player === 'goal') {
      logger.info('Opposition goal detected via Goal selection', eventData);
      return true;
    }
    
    // Method 2: Explicit opposition goal event type
    if (eventData.eventType === getConfig('EVENTS.GOAL_OPPOSITION')) {
      logger.info('Opposition goal detected via event type', eventData);
      return true;
    }
    
    // Method 3: Check if this is marked as opposition event
    if (eventData.isOpposition === true || eventData.opposition === true) {
      logger.info('Opposition goal detected via opposition flag', eventData);
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Opposition goal detection failed', { error: error.toString() });
    return false;
  }
}


/**
 * Update opposition score only (not our team stats)
 * @param {Object} eventData - Goal event data
 * @returns {boolean} Success status
 */
updateOppositionScore(eventData) {
  logger.testHook('opposition_score_update', eventData);
  
  try {
    const liveSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.LIVE'));
    if (!liveSheet) {
      logger.error('Live sheet not available for score update');
      return false;
    }


    // Get current scores
    const homeScore = SheetUtils.getCellValue(
      liveSheet, 
      getConfig('SHEETS.LIVE_CELLS.HOME_SCORE', 'C2'), 
      0
    );
    const awayScore = SheetUtils.getCellValue(
      liveSheet, 
      getConfig('SHEETS.LIVE_CELLS.AWAY_SCORE', 'D2'), 
      0
    );


    // Determine if we're home or away to update correct opposition score
    const homeTeam = SheetUtils.getCellValue(
      liveSheet, 
      getConfig('SHEETS.LIVE_CELLS.HOME_TEAM', 'B2'), 
      'HOME'
    );
    const clubName = getConfig('SYSTEM.CLUB_NAME', 'Syston Tigers');
    
    // If we're the home team, update away score (opposition)
    // If we're the away team, update home score (opposition)
    const isHomeTeam = homeTeam.toLowerCase().includes(clubName.toLowerCase());
    
    if (isHomeTeam) {
      // We're home, so opposition is away - update away score
      const newAwayScore = parseInt(awayScore) + 1;
      SheetUtils.setCellValue(
        liveSheet, 
        getConfig('SHEETS.LIVE_CELLS.AWAY_SCORE', 'D2'), 
        newAwayScore
      );
      logger.info('Opposition score updated (away)', { 
        oldScore: awayScore, 
        newScore: newAwayScore 
      });
    } else {
      // We're away, so opposition is home - update home score
      const newHomeScore = parseInt(homeScore) + 1;
      SheetUtils.setCellValue(
        liveSheet, 
        getConfig('SHEETS.LIVE_CELLS.HOME_SCORE', 'C2'), 
        newHomeScore
      );
      logger.info('Opposition score updated (home)', { 
        oldScore: homeScore, 
        newScore: newHomeScore 
      });
    }


    return true;
  } catch (error) {
    logger.error('Opposition score update failed', { error: error.toString() });
    return false;
  }
}


/**
 * Log opposition event to tracking sheet (not player stats)
 * @param {Object} eventData - Event data
 * @returns {boolean} Success status
 */
logOppositionEvent(eventData) {
  logger.testHook('opposition_event_logging', eventData);
  
  try {
    const oppositionSheet = SheetUtils.getOrCreateSheet(
      'Opposition_Log',
      ['Timestamp', 'Match_ID', 'Event_Type', 'Minute', 'Details', 'Opposition_Score']
    );
    
    if (!oppositionSheet) {
      logger.error('Opposition log sheet not available');
      return false;
    }


    const values = [
      DateUtils.now().toISOString(),
      this.currentMatchId || 'UNKNOWN',
      'goal',
      eventData.minute,
      eventData.details || 'Opposition Goal',
      this.getCurrentOppositionScore()
    ];


    const success = SheetUtils.appendRowSafe(oppositionSheet, values);
    
    if (success) {
      logger.info('Opposition event logged successfully', { 
        minute: eventData.minute,
        type: 'goal'
      });
    }
    
    return success;
  } catch (error) {
    logger.error('Opposition event logging failed', { error: error.toString() });
    return false;
  }
}


/**
 * Build Make.com payload for opposition goal
 * @param {Object} eventData - Goal event data  
 * @returns {Object} Make.com payload
 */
buildOppositionGoalPayload(eventData) {
  logger.testHook('opposition_goal_payload_building', eventData);
  
  try {
    const currentScores = this.getCurrentScores();
    const matchInfo = this.getEnhancedMatchInfo();
    
    const payload = {
      timestamp: DateUtils.now().toISOString(),
      match_id: this.currentMatchId,
      event_type: getConfig('MAKE.EVENT_MAPPINGS.goal_opposition', 'goal_opposition'),
      source: 'apps_script_enhanced_automation',
      version: getConfig('SYSTEM.VERSION'),
      
      // Opposition-specific data
      opponent_name: this.getOpponentName(),
      minute: eventData.minute,
      home_score: currentScores.home,
      away_score: currentScores.away,
      match_info: matchInfo,
      match_status: 'LIVE',
      
      // Event details
      goal_details: eventData.details || 'Opposition Goal',
      is_opposition_goal: true,
      
      // Context for Canva template
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      
      // Idempotency
      idempotency_key: `opposition_goal_${this.currentMatchId}_${eventData.minute}`
    };


    logger.info('Opposition goal payload built', { 
      eventType: payload.event_type,
      minute: payload.minute,
      scores: `${payload.home_score}-${payload.away_score}`
    });


    return payload;
  } catch (error) {
    logger.error('Opposition goal payload building failed', { error: error.toString() });
    return null;
  }
}


// ===== ENHANCED OPPOSITION CARD PROCESSING =====


/**
 * Process enhanced opposition card (CRITICAL - Milestone 1.1)
 * @param {Object} eventData - Opposition card event data
 * @returns {Object} Processing result
 */
processEnhancedOppositionCard(eventData) {
  logger.enterFunction('EnhancedMatchEventsManager.processEnhancedOppositionCard', {
    cardType: eventData.cardType,
    minute: eventData.minute
  });
  
  try {
    // @testHook(opposition_card_detection)
    // Detect opposition card scenario:
    // - "Opposition" selected from player dropdown + card selection
    const isOppositionCard = this.detectOppositionCard(eventData);
    
    if (!isOppositionCard) {
      logger.warn('Not recognized as opposition card', eventData);
      return { success: false, error: 'Not an opposition card event' };
    }


    // @testHook(opposition_card_logging)
    // Log card against "Opposition" not individual player
    const cardLogged = this.logOppositionCard(eventData);
    
    // @testHook(opposition_card_discipline_tracking)
    // Update opposition discipline tracking
    const disciplineTracked = this.updateOppositionDiscipline(eventData);
    
    // @testHook(opposition_card_payload_generation)
    // Create Make.com payload for opposition card
    const makePayload = this.buildOppositionCardPayload(eventData);
    
    // @testHook(opposition_card_make_posting)
    // Post to Make.com for Canva template if enabled
    const postResult = this.postOppositionEventToMake(makePayload);
    
    // Track idempotency
    const idempotencyKey = `opposition_card_${this.currentMatchId}_${eventData.cardType}_${eventData.minute}`;
    this.idempotencyManager.markAsProcessed(idempotencyKey, eventData);


    const result = {
      success: cardLogged && disciplineTracked && postResult.success,
      cardLogged: cardLogged,
      disciplineTracked: disciplineTracked,
      makePostResult: postResult,
      eventType: 'card_opposition',
      data: {
        ...eventData,
        processed: true,
        logged_against: 'Opposition'
      }
    };


    logger.exitFunction('EnhancedMatchEventsManager.processEnhancedOppositionCard', result);
    return result;


  } catch (error) {
    logger.error('Opposition card processing failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Detect if this is an opposition card event
 * @param {Object} eventData - Event data
 * @returns {boolean} True if opposition card
 */
detectOppositionCard(eventData) {
  logger.testHook('opposition_card_detection_logic', eventData);
  
  try {
    // Method 1: "Opposition" selected from player dropdown + card
    if (eventData.player === 'Opposition' || eventData.player === 'opposition') {
      logger.info('Opposition card detected via Opposition selection', eventData);
      return true;
    }
    
    // Method 2: Explicit opposition card event type
    if (eventData.eventType === getConfig('EVENTS.CARD_OPPOSITION')) {
      logger.info('Opposition card detected via event type', eventData);
      return true;
    }
    
    // Method 3: Check if this is marked as opposition event
    if (eventData.isOpposition === true || eventData.opposition === true) {
      logger.info('Opposition card detected via opposition flag', eventData);
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Opposition card detection failed', { error: error.toString() });
    return false;
  }
}


/**
 * Log opposition card to tracking sheet
 * @param {Object} eventData - Card event data
 * @returns {boolean} Success status
 */
logOppositionCard(eventData) {
  logger.testHook('opposition_card_logging', eventData);
  
  try {
    const oppositionSheet = SheetUtils.getOrCreateSheet(
      'Opposition_Log',
      ['Timestamp', 'Match_ID', 'Event_Type', 'Minute', 'Details', 'Card_Type']
    );
    
    if (!oppositionSheet) {
      logger.error('Opposition log sheet not available');
      return false;
    }


    const values = [
      DateUtils.now().toISOString(),
      this.currentMatchId || 'UNKNOWN',
      'card',
      eventData.minute,
      `Opposition ${eventData.cardType} card`,
      eventData.cardType
    ];


    const success = SheetUtils.appendRowSafe(oppositionSheet, values);
    
    if (success) {
      logger.info('Opposition card logged successfully', { 
        minute: eventData.minute,
        cardType: eventData.cardType
      });
    }
    
    return success;
  } catch (error) {
    logger.error('Opposition card logging failed', { error: error.toString() });
    return false;
  }
}


/**
 * Update opposition discipline tracking
 * @param {Object} eventData - Card event data
 * @returns {boolean} Success status
 */
updateOppositionDiscipline(eventData) {
  logger.testHook('opposition_discipline_tracking', eventData);
  
  try {
    const disciplineSheet = SheetUtils.getOrCreateSheet(
      'Discipline_Log',
      ['Timestamp', 'Match_ID', 'Player', 'Card_Type', 'Minute', 'Opposition']
    );
    
    if (!disciplineSheet) {
      logger.error('Discipline log sheet not available');
      return false;
    }


    const values = [
      DateUtils.now().toISOString(),
      this.currentMatchId || 'UNKNOWN',
      'Opposition Team', // Not a specific player
      eventData.cardType,
      eventData.minute,
      true // Mark as opposition
    ];


    const success = SheetUtils.appendRowSafe(disciplineSheet, values);
    
    if (success) {
      logger.info('Opposition discipline tracked successfully', { 
        minute: eventData.minute,
        cardType: eventData.cardType
      });
    }
    
    return success;
  } catch (error) {
    logger.error('Opposition discipline tracking failed', { error: error.toString() });
    return false;
  }
}


/**
 * Build Make.com payload for opposition card
 * @param {Object} eventData - Card event data  
 * @returns {Object} Make.com payload
 */
buildOppositionCardPayload(eventData) {
  logger.testHook('opposition_card_payload_building', eventData);
  
  try {
    const matchInfo = this.getEnhancedMatchInfo();
    
    const payload = {
      timestamp: DateUtils.now().toISOString(),
      match_id: this.currentMatchId,
      event_type: getConfig('MAKE.EVENT_MAPPINGS.card_opposition', 'card_opposition'),
      source: 'apps_script_enhanced_automation',
      version: getConfig('SYSTEM.VERSION'),
      
      // Opposition card specific data
      player_name: 'Opposition',
      opponent_name: this.getOpponentName(),
      card_type: eventData.cardType,
      minute: eventData.minute,
      match_info: matchInfo,
      incident_details: eventData.details || `Opposition ${eventData.cardType} card`,
      is_opposition_card: true,
      
      // Context for Canva template
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      
      // Idempotency
      idempotency_key: `opposition_card_${this.currentMatchId}_${eventData.cardType}_${eventData.minute}`
    };


    logger.info('Opposition card payload built', { 
      eventType: payload.event_type,
      cardType: payload.card_type,
      minute: payload.minute
    });


    return payload;
  } catch (error) {
    logger.error('Opposition card payload building failed', { error: error.toString() });
    return null;
  }
}


/**
 * Post opposition event to Make.com
 * @param {Object} payload - Make.com payload
 * @returns {Object} Posting result
 */
postOppositionEventToMake(payload) {
  logger.testHook('opposition_event_make_posting', { eventType: payload?.event_type });
  
  try {
    if (!payload) {
      return { success: false, error: 'No payload provided' };
    }


    // Get Make.com webhook URL
    const webhookUrl = PropertiesService.getScriptProperties()
                         .getProperty(getConfig('MAKE.WEBHOOK_URL_PROPERTY'));
    
    if (!webhookUrl) {
      logger.warn('Make.com webhook URL not configured for opposition events');
      return { success: false, error: 'Webhook URL not configured' };
    }


    // Send to Make.com with rate limiting
    const response = ApiUtils.rateLimitedMakeRequest(webhookUrl, {
      method: 'POST',
      payload: JSON.stringify(payload)
    });


    logger.info('Opposition event posted to Make.com', {
      eventType: payload.event_type,
      success: response.success,
      responseCode: response.responseCode
    });


    return {
      success: response.success,
      response: response
    };


  } catch (error) {
    logger.error('Opposition event Make.com posting failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


// ===== UTILITY METHODS =====


/**
 * Get current opposition score
 * @returns {number} Opposition score
 */
getCurrentOppositionScore() {
  try {
    const liveSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.LIVE'));
    if (!liveSheet) return 0;


    const homeScore = SheetUtils.getCellValue(
      liveSheet, 
      getConfig('SHEETS.LIVE_CELLS.HOME_SCORE', 'C2'), 
      0
    );
    const awayScore = SheetUtils.getCellValue(
      liveSheet, 
      getConfig('SHEETS.LIVE_CELLS.AWAY_SCORE', 'D2'), 
      0
    );


    // Determine if we're home or away
    const homeTeam = SheetUtils.getCellValue(
      liveSheet, 
      getConfig('SHEETS.LIVE_CELLS.HOME_TEAM', 'B2'), 
      'HOME'
    );
    const clubName = getConfig('SYSTEM.CLUB_NAME', 'Syston Tigers');
    const isHomeTeam = homeTeam.toLowerCase().includes(clubName.toLowerCase());
    
    // Return opposition score
    return isHomeTeam ? parseInt(awayScore) : parseInt(homeScore);
  } catch (error) {
    logger.error('Failed to get opposition score', { error: error.toString() });
    return 0;
  }
}


/**
 * Get opponent team name
 * @returns {string} Opponent name
 */
getOpponentName() {
  try {
    const liveSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.LIVE'));
    if (!liveSheet) return 'Opposition';


    const homeTeam = SheetUtils.getCellValue(
      liveSheet, 
      getConfig('SHEETS.LIVE_CELLS.HOME_TEAM', 'B2'), 
      'HOME'
    );
    const awayTeam = SheetUtils.getCellValue(
      liveSheet, 
      getConfig('SHEETS.LIVE_CELLS.AWAY_TEAM', 'B3'), 
      'AWAY'
    );


    const clubName = getConfig('SYSTEM.CLUB_NAME', 'Syston Tigers');
    
    // Return the team that isn't us
    if (homeTeam.toLowerCase().includes(clubName.toLowerCase())) {
      return awayTeam;
    } else {
      return homeTeam;
    }
  } catch (error) {
    logger.error('Failed to get opponent name', { error: error.toString() });
    return 'Opposition';
  }
}


// ===== PUBLIC API FUNCTIONS FOR MAIN COORDINATOR =====


/**
 * Public function to process opposition goal from main system
 * @param {string} minute - Goal minute
 * @param {string} details - Goal details (optional)
 * @returns {Object} Processing result
 */
function processOppositionGoal(minute, details = '') {
  logger.enterFunction('processOppositionGoal', { minute, details });


  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const eventData = {
      eventType: getConfig('EVENTS.GOAL_OPPOSITION'),
      player: 'Goal', // Indicates opposition goal
      minute: minute,
      details: details,
      isOpposition: true,
      timestamp: DateUtils.now().toISOString()
    };


    const result = enhancedMatchEventsManager.processEnhancedOppositionGoal(eventData);


    logger.exitFunction('processOppositionGoal', { success: result.success });
    return result;


  } catch (error) {
    logger.error('Opposition goal processing failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Public function to process opposition card from main system
 * @param {string} cardType - Card type (yellow/red/sin_bin)
 * @param {string} minute - Card minute
 * @param {string} details - Card details (optional)
 * @returns {Object} Processing result
 */
function processOppositionCard(cardType, minute, details = '') {
  logger.enterFunction('processOppositionCard', { cardType, minute, details });


  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const eventData = {
      eventType: getConfig('EVENTS.CARD_OPPOSITION'),
      player: 'Opposition', // Indicates opposition card
      cardType: cardType,
      minute: minute,
      details: details,
      isOpposition: true,
      timestamp: DateUtils.now().toISOString()
    };


    const result = enhancedMatchEventsManager.processEnhancedOppositionCard(eventData);


    logger.exitFunction('processOppositionCard', { success: result.success });
    return result;


  } catch (error) {
    logger.error('Opposition card processing failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


// Export global functions
globalThis.processOppositionGoal = processOppositionGoal;
globalThis.processOppositionCard = processOppositionCard;
