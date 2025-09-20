/**
 * @fileoverview Syston Tigers Automation - Enhanced 2nd Yellow Card Processing
 * @version 6.0.0
 * @author Senior Software Architect
 * 
 * CRITICAL MILESTONE 1.2 IMPLEMENTATION: Enhanced 2nd Yellow Card Processing
 * 
 * Implements the missing 2nd yellow card processing functions
 * as specified in tasks.md Milestone 1.2 Enhanced 2nd Yellow Card Processing.
 * 
 * Key Requirements:
 * - Detect "Red card (2nd yellow)" selection
 * - Track previous yellow card minute
 * - Generate cardType: 'second_yellow' payload
 * - Update player discipline record correctly
 * - Test complete 2nd yellow workflow
 */


// ===== ENHANCED 2ND YELLOW CARD PROCESSING =====


/**
 * Process enhanced 2nd yellow card (CRITICAL - Milestone 1.2)
 * @param {Object} eventData - 2nd yellow card event data
 * @returns {Object} Processing result
 */
processEnhancedSecondYellow(eventData) {
  logger.enterFunction('EnhancedMatchEventsManager.processEnhancedSecondYellow', {
    player: eventData.player,
    minute: eventData.minute
  });
  
  try {
    // @testHook(second_yellow_detection)
    // Detect 2nd yellow card scenario
    const secondYellowData = this.detectSecondYellowCard(eventData);
    
    if (!secondYellowData.isSecondYellow) {
      logger.warn('Not recognized as 2nd yellow card', eventData);
      return { success: false, error: 'Not a 2nd yellow card event' };
    }


    // @testHook(previous_yellow_lookup)
    // Find previous yellow card minute for this player
    const previousYellow = this.findPreviousYellowCard(eventData.player);
    
    if (!previousYellow) {
      logger.warn('No previous yellow card found for 2nd yellow', {
        player: eventData.player,
        minute: eventData.minute
      });
      // Continue processing but log the inconsistency
    }


    // @testHook(second_yellow_discipline_update)
    // Update player discipline record correctly
    const disciplineUpdated = this.updateSecondYellowDiscipline(eventData, previousYellow);
    
    // @testHook(second_yellow_stats_update)
    // Update player statistics (red card via 2nd yellow)
    const statsUpdated = this.updatePlayerSecondYellowStats(eventData.player);
    
    // @testHook(second_yellow_payload_generation)
    // Generate cardType: 'second_yellow' payload
    const makePayload = this.buildSecondYellowPayload(eventData, previousYellow);
    
    // @testHook(second_yellow_make_posting)
    // Post to Make.com for specialized 2nd yellow template
    const postResult = this.postSecondYellowToMake(makePayload);
    
    // @testHook(second_yellow_match_tracking)
    // Update match events log
    const matchLogged = this.logSecondYellowToMatch(eventData, previousYellow);
    
    // Track idempotency
    const idempotencyKey = `second_yellow_${this.currentMatchId}_${eventData.player}_${eventData.minute}`;
    this.idempotencyManager.markAsProcessed(idempotencyKey, eventData);


    const result = {
      success: disciplineUpdated && statsUpdated && postResult.success && matchLogged,
      disciplineUpdated: disciplineUpdated,
      statsUpdated: statsUpdated,
      makePostResult: postResult,
      matchLogged: matchLogged,
      eventType: 'card_second_yellow',
      previousYellowMinute: previousYellow?.minute || null,
      data: {
        ...eventData,
        cardType: 'second_yellow',
        isSecondYellow: true,
        previousYellowMinute: previousYellow?.minute,
        processed: true
      }
    };


    logger.exitFunction('EnhancedMatchEventsManager.processEnhancedSecondYellow', result);
    return result;


  } catch (error) {
    logger.error('2nd yellow card processing failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Detect if this is a 2nd yellow card event
 * @param {Object} eventData - Event data
 * @returns {Object} Detection result with details
 */
detectSecondYellowCard(eventData) {
  logger.testHook('second_yellow_detection_logic', eventData);
  
  try {
    const detectionResult = {
      isSecondYellow: false,
      detectionMethod: null,
      confidence: 0
    };


    // Method 1: Explicit "Red card (2nd yellow)" selection
    if (eventData.cardType === 'Red card (2nd yellow)' || 
        eventData.cardType === 'red_second_yellow' ||
        eventData.cardType === 'second_yellow') {
      detectionResult.isSecondYellow = true;
      detectionResult.detectionMethod = 'explicit_selection';
      detectionResult.confidence = 100;
      logger.info('2nd yellow detected via explicit selection', eventData);
      return detectionResult;
    }


    // Method 2: Event type indicates 2nd yellow
    if (eventData.eventType === getConfig('EVENTS.SECOND_YELLOW') ||
        eventData.eventType === 'second_yellow') {
      detectionResult.isSecondYellow = true;
      detectionResult.detectionMethod = 'event_type';
      detectionResult.confidence = 95;
      logger.info('2nd yellow detected via event type', eventData);
      return detectionResult;
    }


    // Method 3: Check if player already has yellow card in this match + red card selection
    if (eventData.cardType === 'red' || eventData.cardType === 'Red card') {
      const hasExistingYellow = this.playerHasYellowCardThisMatch(eventData.player);
      if (hasExistingYellow) {
        detectionResult.isSecondYellow = true;
        detectionResult.detectionMethod = 'existing_yellow_plus_red';
        detectionResult.confidence = 90;
        logger.info('2nd yellow detected via existing yellow + red selection', {
          player: eventData.player,
          minute: eventData.minute
        });
        return detectionResult;
      }
    }


    // Method 4: Check if explicitly marked as 2nd yellow
    if (eventData.isSecondYellow === true || eventData.second_yellow === true) {
      detectionResult.isSecondYellow = true;
      detectionResult.detectionMethod = 'explicit_flag';
      detectionResult.confidence = 85;
      logger.info('2nd yellow detected via explicit flag', eventData);
      return detectionResult;
    }


    logger.info('No 2nd yellow card detected', { 
      cardType: eventData.cardType,
      eventType: eventData.eventType,
      player: eventData.player
    });
    
    return detectionResult;
  } catch (error) {
    logger.error('2nd yellow detection failed', { error: error.toString() });
    return { isSecondYellow: false, detectionMethod: 'error', confidence: 0 };
  }
}


/**
 * Check if player already has a yellow card in this match
 * @param {string} playerName - Player name
 * @returns {boolean} True if player has existing yellow
 */
playerHasYellowCardThisMatch(playerName) {
  logger.testHook('existing_yellow_check', { player: playerName });
  
  try {
    const disciplineSheet = SheetUtils.getOrCreateSheet('Discipline_Log');
    if (!disciplineSheet) {
      logger.warn('Discipline sheet not available for yellow card check');
      return false;
    }


    const data = disciplineSheet.getDataRange().getValues();
    const currentMatchId = this.currentMatchId;
    
    // Check for existing yellow card for this player in this match
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const [timestamp, matchId, player, cardType, minute, opposition] = row;
      
      if (matchId === currentMatchId && 
          player === playerName && 
          (cardType === 'yellow' || cardType === 'Yellow card') &&
          !opposition) {
        logger.info('Found existing yellow card', {
          player: playerName,
          yellowMinute: minute,
          matchId: currentMatchId
        });
        return true;
      }
    }


    logger.info('No existing yellow card found', { 
      player: playerName,
      matchId: currentMatchId
    });
    return false;
  } catch (error) {
    logger.error('Yellow card check failed', { error: error.toString() });
    return false;
  }
}


/**
 * Find previous yellow card minute for this player
 * @param {string} playerName - Player name
 * @returns {Object|null} Previous yellow card data or null
 */
findPreviousYellowCard(playerName) {
  logger.testHook('previous_yellow_lookup', { player: playerName });
  
  try {
    const disciplineSheet = SheetUtils.getOrCreateSheet('Discipline_Log');
    if (!disciplineSheet) return null;


    const data = disciplineSheet.getDataRange().getValues();
    const currentMatchId = this.currentMatchId;
    
    // Find the most recent yellow card for this player in this match
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      const [timestamp, matchId, player, cardType, minute, opposition] = row;
      
      if (matchId === currentMatchId && 
          player === playerName && 
          (cardType === 'yellow' || cardType === 'Yellow card') &&
          !opposition) {
        
        const previousYellow = {
          minute: minute,
          timestamp: timestamp,
          rowIndex: i + 1
        };
        
        logger.info('Found previous yellow card', {
          player: playerName,
          yellowMinute: minute,
          timestamp: timestamp
        });
        
        return previousYellow;
      }
    }


    logger.warn('No previous yellow card found for 2nd yellow', {
      player: playerName,
      matchId: currentMatchId
    });
    return null;
  } catch (error) {
    logger.error('Previous yellow lookup failed', { error: error.toString() });
    return null;
  }
}


/**
 * Update player discipline record for 2nd yellow
 * @param {Object} eventData - 2nd yellow event data
 * @param {Object} previousYellow - Previous yellow card data
 * @returns {boolean} Success status
 */
updateSecondYellowDiscipline(eventData, previousYellow) {
  logger.testHook('second_yellow_discipline_update', eventData);
  
  try {
    const disciplineSheet = SheetUtils.getOrCreateSheet(
      'Discipline_Log',
      ['Timestamp', 'Match_ID', 'Player', 'Card_Type', 'Minute', 'Opposition', 'Second_Yellow', 'Previous_Yellow_Minute']
    );
    
    if (!disciplineSheet) {
      logger.error('Discipline log sheet not available');
      return false;
    }


    // Add 2nd yellow card entry
    const values = [
      DateUtils.now().toISOString(),
      this.currentMatchId || 'UNKNOWN',
      eventData.player,
      'second_yellow', // Special card type for 2nd yellow
      eventData.minute,
      false, // Not opposition
      true, // Is second yellow
      previousYellow?.minute || null // Previous yellow minute
    ];


    const success = SheetUtils.appendRowSafe(disciplineSheet, values);
    
    if (success) {
      logger.info('2nd yellow discipline recorded', {
        player: eventData.player,
        minute: eventData.minute,
        previousYellowMinute: previousYellow?.minute
      });
    }
    
    return success;
  } catch (error) {
    logger.error('2nd yellow discipline update failed', { error: error.toString() });
    return false;
  }
}


/**
 * Update player statistics for 2nd yellow (counts as red card)
 * @param {string} playerName - Player name
 * @returns {boolean} Success status
 */
updatePlayerSecondYellowStats(playerName) {
  logger.testHook('second_yellow_stats_update', { player: playerName });
  
  try {
    const statsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.PLAYER_STATS'));
    if (!statsSheet) {
      logger.error('Player stats sheet not available');
      return false;
    }


    const playerRow = SheetUtils.findRowByValue(statsSheet, 1, playerName);
    if (!playerRow) {
      logger.warn('Player not found in stats sheet for 2nd yellow update', { playerName });
      return false;
    }


    // Update red card count (2nd yellow = red card statistically)
    const redCardColumn = getConfig('SHEETS.COLUMNS.PLAYER_STATS.RED_CARDS', 'F');
    const redCardCell = `${redCardColumn}${playerRow}`;
    const currentReds = SheetUtils.getCellValue(statsSheet, redCardCell, 0);
    const newReds = parseInt(currentReds) + 1;


    SheetUtils.setCellValue(statsSheet, redCardCell, newReds);
    
    // Log stats history
    this.logPlayerStatHistory(playerName, 'Red Cards (2nd Yellow)', currentReds, newReds, '2nd Yellow Card');


    logger.info('Player stats updated for 2nd yellow', {
      player: playerName,
      previousReds: currentReds,
      newReds: newReds
    });


    return true;
  } catch (error) {
    logger.error('Player stats update failed for 2nd yellow', {
      playerName, error: error.toString()
    });
    return false;
  }
}


/**
 * Build Make.com payload for 2nd yellow card
 * @param {Object} eventData - 2nd yellow event data
 * @param {Object} previousYellow - Previous yellow card data
 * @returns {Object} Make.com payload
 */
buildSecondYellowPayload(eventData, previousYellow) {
  logger.testHook('second_yellow_payload_building', eventData);
  
  try {
    const matchInfo = this.getEnhancedMatchInfo();
    
    const payload = {
      timestamp: DateUtils.now().toISOString(),
      match_id: this.currentMatchId,
      event_type: getConfig('MAKE.EVENT_MAPPINGS.second_yellow', 'card_second_yellow'),
      source: 'apps_script_enhanced_automation',
      version: getConfig('SYSTEM.VERSION'),
      
      // 2nd yellow specific data
      player_name: eventData.player,
      card_type: 'second_yellow',
      minute: eventData.minute,
      match_info: matchInfo,
      incident_details: eventData.details || `${eventData.player} - Second Yellow Card (Red)`,
      is_second_yellow: true,
      
      // Previous yellow card context
      previous_yellow_minute: previousYellow?.minute || null,
      total_cards_this_match: previousYellow ? 2 : 1,
      
      // Enhanced details for Canva template
      card_sequence: previousYellow ? 
        `Yellow (${previousYellow.minute}') → Red (${eventData.minute}')` : 
        `Second Yellow (${eventData.minute}')`,
      
      // Context for template
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      opponent_name: this.getOpponentName(),
      
      // Idempotency
      idempotency_key: `second_yellow_${this.currentMatchId}_${eventData.player}_${eventData.minute}`
    };


    logger.info('2nd yellow payload built', {
      eventType: payload.event_type,
      player: payload.player_name,
      minute: payload.minute,
      previousYellow: payload.previous_yellow_minute
    });


    return payload;
  } catch (error) {
    logger.error('2nd yellow payload building failed', { error: error.toString() });
    return null;
  }
}


/**
 * Post 2nd yellow to Make.com for specialized template
 * @param {Object} payload - Make.com payload
 * @returns {Object} Posting result
 */
postSecondYellowToMake(payload) {
  logger.testHook('second_yellow_make_posting', { eventType: payload?.event_type });
  
  try {
    if (!payload) {
      return { success: false, error: 'No payload provided' };
    }


    // Get Make.com webhook URL
    const webhookUrl = PropertiesService.getScriptProperties()
                         .getProperty(getConfig('MAKE.WEBHOOK_URL_PROPERTY'));
    
    if (!webhookUrl) {
      logger.warn('Make.com webhook URL not configured for 2nd yellow');
      return { success: false, error: 'Webhook URL not configured' };
    }


    // Send to Make.com with rate limiting
    const response = ApiUtils.rateLimitedMakeRequest(webhookUrl, {
      method: 'POST',
      payload: JSON.stringify(payload)
    });


    logger.info('2nd yellow posted to Make.com', {
      eventType: payload.event_type,
      player: payload.player_name,
      success: response.success,
      responseCode: response.responseCode
    });


    return {
      success: response.success,
      response: response
    };


  } catch (error) {
    logger.error('2nd yellow Make.com posting failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Log 2nd yellow to match events
 * @param {Object} eventData - 2nd yellow event data
 * @param {Object} previousYellow - Previous yellow data
 * @returns {boolean} Success status
 */
logSecondYellowToMatch(eventData, previousYellow) {
  logger.testHook('second_yellow_match_logging', eventData);
  
  try {
    const liveSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.LIVE'));
    if (!liveSheet) {
      logger.error('Live sheet not available for 2nd yellow logging');
      return false;
    }


    // Add to live match log
    const values = [
      eventData.minute,
      'Second Yellow Card',
      eventData.player,
      `2nd Yellow → Red (1st: ${previousYellow?.minute || 'N/A'})`,
      'Y' // Mark as posted
    ];


    const success = SheetUtils.appendRowSafe(liveSheet, values);
    
    if (success) {
      logger.info('2nd yellow logged to match', {
        player: eventData.player,
        minute: eventData.minute,
        previousYellow: previousYellow?.minute
      });
    }
    
    return success;
  } catch (error) {
    logger.error('2nd yellow match logging failed', { error: error.toString() });
    return false;
  }
}


// ===== PUBLIC API FUNCTION FOR MAIN COORDINATOR =====


/**
 * Public function to process 2nd yellow card from main system
 * @param {string} player - Player name
 * @param {string} minute - Card minute
 * @param {string} details - Card details (optional)
 * @returns {Object} Processing result
 */
function processSecondYellow(player, minute, details = '') {
  logger.enterFunction('processSecondYellow', { player, minute, details });


  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const eventData = {
      eventType: getConfig('EVENTS.SECOND_YELLOW'),
      player: player,
      cardType: 'second_yellow',
      minute: minute,
      details: details,
      isSecondYellow: true,
      timestamp: DateUtils.now().toISOString()
    };


    const result = enhancedMatchEventsManager.processEnhancedSecondYellow(eventData);


    logger.exitFunction('processSecondYellow', { success: result.success });
    return result;


  } catch (error) {
    logger.error('2nd yellow processing failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


// Export global function
globalThis.processSecondYellow = processSecondYellow;
