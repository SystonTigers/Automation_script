/**
   * Process our team's goal
   * @private
   * @param {string} minute - Match minute
   * @param {string} player - Goal scorer
   * @param {string} assist - Assist provider
   * @param {string} notes - Additional notes
   * @returns {Object} Processing result
   */
  processOurGoal(minute, player, assist = '', notes = '') {
    this.logger.info('Our goal detected', { minute, player, assist });
    
    try {
      // @testHook(our_goal_start)
      
      // Update our score
      const scoreUpdate = this.updateOurScore(minute);
      
      // Update player statistics
      const playerManager = new PlayerManagementSystem();
      playerManager.updatePlayerStats(player, { 
        goals: 1,
        appearances: 1 // Ensure player gets appearance credit
      });
      
      // Update assist if provided
      if (assist && assist !== player) {
        playerManager.updatePlayerStats(assist, { 
          assists: 1,
          appearances: 1
        });
      }
      
      // Log to Live Match Updates sheet
      const liveSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES'),
        getConfig('SHEETS.REQUIRED_COLUMNS.LIVE_MATCH_UPDATES')
      );
      
      if (liveSheet) {
        const eventData = {
          'Timestamp': DateUtils.formatISO(DateUtils.now()),
          'Minute': minute,
          'Event': 'Goal',
          'Player': player,
          'Opponent': this.getCurrentOpponent(),
          'Home Score': scoreUpdate.homeScore,
          'Away Score': scoreUpdate.awayScore,
          'Assist': assist,
          'Notes': notes,
          'Send': 'TRUE',
          'Status': 'Processed'
        };
        
        SheetUtils.addRowFromObject(liveSheet, eventData);
        this.logger.sheetOperation('ADD_ROW', 'Live Match Updates', true, { event: 'our_goal' });
      }
      
      // Create video clip metadata if feature enabled
      if (isFeatureEnabled('VIDEO_INTEGRATION')) {
        this.createGoalClipMetadata(minute, player, assist);
      }
      
      // Send to Make.com for social media posting
      const makePayload = this.createGoalPayload(minute, player, assist, scoreUpdate, notes);
      const makeResult = this.sendToMake(makePayload);
      
      // Update XbotGo scoreboard if enabled
      if (isFeatureEnabled('XBOTGO_INTEGRATION')) {
        this.updateXbotGoScore(scoreUpdate);
      }
      
      // @testHook(our_goal_complete)
      
      return {
        success: true,
        event_type: 'goal',
        minute: minute,
        player: player,
        assist: assist,
        score_update: scoreUpdate,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Our goal processing failed', { error: error.toString() });
      throw error;
    }
  }

  /**
   * Process card event with opposition detection
   * @param {string} minute - Match minute
   * @param {string} player - Player name or "Opposition"
   * @param {string} cardType - Type of card
   * @param {string} notes - Additional notes
   * @returns {Object} Processing result
   */
  processCardEvent(minute, player, cardType, notes = '') {
    this.logger.enterFunction('processCardEvent', { minute, player, cardType });
    
    try {
      // @testHook(card_processing_start)
      
      // Validate inputs
      if (!ValidationUtils.isValidMinute(minute)) {
        throw new Error(`Invalid minute: ${minute}`);
      }
      
      if (!ValidationUtils.isValidCardType(cardType)) {
        throw new Error(`Invalid card type: ${cardType}`);
      }
      
      const cleanPlayer = StringUtils.cleanPlayerName(player);
      
      // Check if this is an opposition card
      const isOppositionCard = ValidationUtils.isOppositionPlayer(cleanPlayer);
      
      let result;
      if (isOppositionCard) {
        result = this.processOppositionCard(minute, cardType, notes);
      } else {
        result = this.processOurCard(minute, cleanPlayer, cardType, notes);
      }
      
      // @testHook(card_processing_complete)
      
      this.logger.exitFunction('processCardEvent', { 
        success: result.success, 
        opposition: isOppositionCard 
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Card event processing failed', { 
        error: error.toString(),
        minute, player, cardType 
      });
      
      return {
        success: false,
        error: error.toString(),
        event_type: 'card',
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Process opposition card
   * @private
   * @param {string} minute - Match minute
   * @param {string} cardType - Card type
   * @param {string} notes - Additional notes
   * @returns {Object} Processing result
   */
  processOppositionCard(minute, cardType, notes = '') {
    this.logger.info('Opposition card detected', { minute, cardType });
    
    try {
      // @testHook(opposition_card_start)
      
      // Log to Live Match Updates sheet
      const liveSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES'),
        getConfig('SHEETS.REQUIRED_COLUMNS.LIVE_MATCH_UPDATES')
      );
      
      if (liveSheet) {
        const eventData = {
          'Timestamp': DateUtils.formatISO(DateUtils.now()),
          'Minute': minute,
          'Event': 'Card (Opposition)',
          'Player': 'Opposition',
          'Opponent': this.getCurrentOpponent(),
          'Card Type': cardType,
          'Notes': notes,
          'Send': 'TRUE',
          'Status': 'Processed'
        };
        
        SheetUtils.addRowFromObject(liveSheet, eventData);
        this.logger.sheetOperation('ADD_ROW', 'Live Match Updates', true, { event: 'opposition_card' });
      }
      
      // Send to Make.com for social media posting
      const makePayload = this.createOppositionCardPayload(minute, cardType, notes);
      const makeResult = this.sendToMake(makePayload);
      
      // @testHook(opposition_card_complete)
      
      return {
        success: true,
        event_type: 'card_opposition',
        minute: minute,
        card_type: cardType,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Opposition card processing failed', { error: error.toString() });
      throw error;
    }
  }

  /**
   * Process our team's card
   * @private
   * @param {string} minute - Match minute
   * @param {string} player - Player receiving card
   * @param {string} cardType - Card type
   * @param {string} notes - Additional notes
   * @returns {Object} Processing result
   */
  processOurCard(minute, player, cardType, notes = '') {
    this.logger.info('Our card detected', { minute, player, cardType });
    
    try {
      // @testHook(our_card_start)
      
      // Update player statistics
      const playerManager = new PlayerManagementSystem();
      const cardStats = {};
      
      if (cardType.toLowerCase().includes('yellow')) {
        cardStats.yellow_cards = 1;
      } else if (cardType.toLowerCase().includes('red')) {
        cardStats.red_cards = 1;
      }
      
      // Ensure player gets appearance credit
      cardStats.appearances = 1;
      
      playerManager.updatePlayerStats(player, cardStats);
      
      // Log to Live Match Updates sheet
      const liveSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES'),
        getConfig('SHEETS.REQUIRED_COLUMNS.LIVE_MATCH_UPDATES')
      );
      
      if (liveSheet) {
        const eventData = {
          'Timestamp': DateUtils.formatISO(DateUtils.now()),
          'Minute': minute,
          'Event': 'Card',
          'Player': player,
          'Opponent': this.getCurrentOpponent(),
          'Card Type': cardType,
          'Notes': notes,
          'Send': 'TRUE',
          'Status': 'Processed'
        };
        
        SheetUtils.addRowFromObject(liveSheet, eventData);
        this.logger.sheetOperation('ADD_ROW', 'Live Match Updates', true, { event: 'our_card' });
      }
      
      // Determine event type for Make.com
      let eventType = 'card';
      if (cardType === '2nd Yellow (Red)') {
        eventType = 'second_yellow';
      }
      
      // Send to Make.com for social media posting
      const makePayload = this.createCardPayload(minute, player, cardType, notes, eventType);
      const makeResult = this.sendToMake(makePayload);
      
      // @testHook(our_card_complete)
      
      return {
        success: true,
        event_type: eventType,
        minute: minute,
        player: player,
        card_type: cardType,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Our card processing failed', { error: error.toString() });
      throw error;
    }
  }

  /**
   * Process substitution with automatic player minutes tracking
   * @param {string} minute - Match minute
   * @param {string} playerOff - Player being substituted
   * @param {string} playerOn - Player coming on
   * @param {string} notes - Additional notes
   * @returns {Object} Processing result
   */
  processSubstitution(minute, playerOff, playerOn, notes = '') {
    this.logger.enterFunction('processSubstitution', { minute, playerOff, playerOn });
    
    try {
      // @testHook(substitution_start)
      
      // Validate inputs
      if (!ValidationUtils.isValidMinute(minute)) {
        throw new Error(`Invalid minute: ${minute}`);
      }
      
      const cleanPlayerOff = StringUtils.cleanPlayerName(playerOff);
      const cleanPlayerOn = StringUtils.cleanPlayerName(playerOn);
      
      if (!cleanPlayerOff || !cleanPlayerOn) {
        throw new Error('Both players must be specified for substitution');
      }
      
      // Update player minutes
      this.updatePlayerMinutesForSubstitution(minute, cleanPlayerOff, cleanPlayerOn);
      
      // Log substitution
      const subsSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.SUBS_LOG'),
        getConfig('SHEETS.REQUIRED_COLUMNS.SUBS_LOG')
      );
      
      if (subsSheet) {
        const subData = {
          'Match Date': DateUtils.formatUK(DateUtils.now()),
          'Minute': minute,
          'Player Off': cleanPlayerOff,
          'Player On': cleanPlayerOn,
          'Match ID': this.currentMatchId,
          'Reason': notes || 'Tactical'
        };
        
        SheetUtils.addRowFromObject(subsSheet, subData);
        this.logger.sheetOperation('ADD_ROW', 'Subs Log', true, { sub: `${cleanPlayerOff} -> ${cleanPlayerOn}` });
      }
      
      // Log to Live Match Updates sheet
      const liveSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES'),
        getConfig('SHEETS.REQUIRED_COLUMNS.LIVE_MATCH_UPDATES')
      );
      
      if (liveSheet) {
        const eventData = {
          'Timestamp': DateUtils.formatISO(DateUtils.now()),
          'Minute': minute,
          'Event': 'Substitution',
          'Player': `${cleanPlayerOff} -> ${cleanPlayerOn}`,
          'Opponent': this.getCurrentOpponent(),
          'Notes': notes,
          'Send': 'TRUE',
          'Status': 'Processed'
        };
        
        SheetUtils.addRowFromObject(liveSheet, eventData);
        this.logger.sheetOperation('ADD_ROW', 'Live Match Updates', true, { event: 'substitution' });
      }
      
      // Update player statistics
      const playerManager = new PlayerManagementSystem();
      
      // Player coming off gets minutes played
      const minutesPlayed = this.calculatePlayerMinutes(cleanPlayerOff, minute);
      playerManager.updatePlayerStats(cleanPlayerOff, { 
        minutes: minutesPlayed,
        appearances: 1
      });
      
      // Player coming on gets appearance credit as substitute
      playerManager.updatePlayerStats(cleanPlayerOn, { 
        appearances: 1
      });
      
      // Send to Make.com for social media posting
      const makePayload = this.createSubstitutionPayload(minute, cleanPlayerOff, cleanPlayerOn, notes);
      const makeResult = this.sendToMake(makePayload);
      
      // @testHook(substitution_complete)
      
      this.logger.exitFunction('processSubstitution', { success: true });
      
      return {
        success: true,
        event_type: 'substitution',
        minute: minute,
        player_off: cleanPlayerOff,
        player_on: cleanPlayerOn,
        minutes_played: minutesPlayed,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Substitution processing failed', { 
        error: error.toString(),
        minute, playerOff, playerOn 
      });
      
      return {
        success: false,
        error: error.toString(),
        event_type: 'substitution',
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Process match status updates (kick-off, HT, 2nd half, FT)
   * @param {string} statusType - Status type
   * @param {string} minute - Match minute
   * @returns {Object} Processing result
   */
  postMatchStatus(statusType, minute = '') {
    this.logger.enterFunction('postMatchStatus', { statusType, minute });
    
    try {
      // @testHook(match_status_start)
      
      let result;
      
      switch (statusType.toLowerCase()) {
        case 'kick_off':
        case 'kickoff':
          result = this.processKickOff(minute);
          break;
          
        case 'half_time':
        case 'halftime':
        case 'ht':
          result = this.processHalfTime(minute);
          break;
          
        case 'second_half':
        case 'secondhalf':
          result = this.processSecondHalfKickOff(minute);
          break;
          
        case 'full_time':
        case 'fulltime':
        case 'ft':
          result = this.processFullTime(minute);
          break;
          
        default:
          throw new Error(`Unknown status type: ${statusType}`);
      }
      
      // @testHook(match_status_complete)
      
      this.logger.exitFunction('postMatchStatus', { success: result.success });
      
      return result;
      
    } catch (error) {
      this.logger.error('Match status processing failed', { 
        error: error.toString(),
        statusType, minute 
      });
      
      return {
        success: false,
        error: error.toString(),
        status_type: statusType,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Process kick-off
   * @private
   * @param {string} minute - Should be "0" or "1"
   * @returns {Object} Processing result
   */
  processKickOff(minute = '0') {
    this.logger.info('Processing kick-off', { minute });
    
    try {
      // @testHook(kickoff_start)
      
      // Initialize match tracking
      this.matchStartTime = DateUtils.now();
      this.currentMatchId = this.generateMatchId();
      
      // Initialize player minutes tracking for starting XI
      this.initializeStartingXIMinutes();
      
      // Log to Live Match Updates sheet
      const liveSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES'),
        getConfig('SHEETS.REQUIRED_COLUMNS.LIVE_MATCH_UPDATES')
      );
      
      if (liveSheet) {
        const eventData = {
          'Timestamp': DateUtils.formatISO(DateUtils.now()),
          'Minute': minute,
          'Event': 'Kick Off',
          'Player': '',
          'Opponent': this.getCurrentOpponent(),
          'Home Score': '0',
          'Away Score': '0',
          'Notes': 'Match started',
          'Send': 'TRUE',
          'Status': 'Processed'
        };
        
        SheetUtils.addRowFromObject(liveSheet, eventData);
        this.logger.sheetOperation('ADD_ROW', 'Live Match Updates', true, { event: 'kickoff' });
      }
      
      // Send to Make.com
      const makePayload = this.createKickOffPayload(minute);
      const makeResult = this.sendToMake(makePayload);
      
      // @testHook(kickoff_complete)
      
      return {
        success: true,
        event_type: 'kick_off',
        match_id: this.currentMatchId,
        minute: minute,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Kick-off processing failed', { error: error.toString() });
      throw error;
    }
  }

  /**
   * Process half-time
   * @private
   * @param {string} minute - Should be around "45"
   * @returns {Object} Processing result
   */
  processHalfTime(minute = '45') {
    this.logger.info('Processing half-time', { minute });
    
    try {
      // @testHook(halftime_start)
      
      const currentScore = this.getCurrentScore();
      
      // Log to Live Match Updates sheet
      const liveSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES'),
        getConfig('SHEETS.REQUIRED_COLUMNS.LIVE_MATCH_UPDATES')
      );
      
      if (liveSheet) {
        const eventData = {
          'Timestamp': DateUtils.formatISO(DateUtils.now()),
          'Minute': minute,
          'Event': 'Half Time',
          'Player': '',
          'Opponent': this.getCurrentOpponent(),
          'Home Score': currentScore.home,
          'Away Score': currentScore.away,
          'Notes': 'Half-time break',
          'Send': 'TRUE',
          'Status': 'Processed'
        };
        
        SheetUtils.addRowFromObject(liveSheet, eventData);
        this.logger.sheetOperation('ADD_ROW', 'Live Match Updates', true, { event: 'halftime' });
      }
      
      // Send to Make.com
      const makePayload = this.createHalfTimePayload(minute, currentScore);
      const makeResult = this.sendToMake(makePayload);
      
      // @testHook(halftime_complete)
      
      return {
        success: true,
        event_type: 'half_time',
        minute: minute,
        score: currentScore,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Half-time processing failed', { error: error.toString() });
      throw error;
    }
  }

  /**
   * Process second half kick-off
   * @private
   * @param {string} minute - Should be around "46"
   * @returns {Object} Processing result
   */
  processSecondHalfKickOff(minute = '46') {
    this.logger.info('Processing second half kick-off', { minute });
    
    try {
      // @testHook(second_half_start)
      
      const currentScore = this.getCurrentScore();
      
      // Log to Live Match Updates sheet
      const liveSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES'),
        getConfig('SHEETS.REQUIRED_COLUMNS.LIVE_MATCH_UPDATES')
      );
      
      if (liveSheet) {
        const eventData = {
          'Timestamp': DateUtils.formatISO(DateUtils.now()),
          'Minute': minute,
          'Event': 'Second Half Kick Off',
          'Player': '',
          'Opponent': this.getCurrentOpponent(),
          'Home Score': currentScore.home,
          'Away Score': currentScore.away,
          'Notes': 'Second half started',
          'Send': 'TRUE',
          'Status': 'Processed'
        };
        
        SheetUtils.addRowFromObject(liveSheet, eventData);
        this.logger.sheetOperation('ADD_ROW', 'Live Match Updates', true, { event: 'second_half' });
      }
      
      // Send to Make.com
      const makePayload = this.createSecondHalfPayload(minute, currentScore);
      const makeResult = this.sendToMake(makePayload);
      
      // @testHook(second_half_complete)
      
      return {
        success: true,
        event_type: 'second_half',
        minute: minute,
        score: currentScore,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Second half processing failed', { error: error.toString() });
      throw error;
    }
  }

  /**
   * Process full-time
   * @private
   * @param {string} minute - Should be around "90+"
   * @returns {Object} Processing result
   */
  processFullTime(minute = '90') {
    this.logger.info('Processing full-time', { minute });
    
    try {
      // @testHook(fulltime_start)
      
      const finalScore = this.getCurrentScore();
      
      // Finalize all player minutes
      this.finalizeAllPlayerMinutes(minute);
      
      // Log to Live Match Updates sheet
      const liveSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES'),
        getConfig('SHEETS.REQUIRED_COLUMNS.LIVE_MATCH_UPDATES')
      );
      
      if (liveSheet) {
        const eventData = {
          'Timestamp': DateUtils.formatISO(DateUtils.now()),
          'Minute': minute,
          'Event': 'Full Time',
          'Player': '',
          'Opponent': this.getCurrentOpponent(),
          'Home Score': finalScore.home,
          'Away Score': finalScore.away,
          'Notes': 'Match ended',
          'Send': 'TRUE',
          'Status': 'Processed'
        };
        
        SheetUtils.addRowFromObject(liveSheet, eventData);
        this.logger.sheetOperation('ADD_ROW', 'Live Match Updates', true, { event: 'fulltime' });
      }
      
      // Send to Make.com
      const makePayload = this.createFullTimePayload(minute, finalScore);
      const makeResult = this.sendToMake(makePayload);
      
      // Update XbotGo final score if enabled
      if (isFeatureEnabled('XBOTGO_INTEGRATION')) {
        this.updateXbotGoFinalScore(finalScore);
      }
      
      // @testHook(fulltime_complete)
      
      return {
        success: true,
        event_type: 'full_time',
        minute: minute,
        final_score: finalScore,
        match_id: this.currentMatchId,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Full-time processing failed', { error: error.toString() });
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate unique match ID
   * @private
   * @returns {string} Match ID
   */
  generateMatchId() {
    const today = DateUtils.formatUK(DateUtils.now()).replace(/\//g, '');
    const time = DateUtils.formatTime(DateUtils.now()).replace(':', '');
    return `MATCH_${today}_${time}`;
  }

  /**
   * Get current opponent from fixtures
   * @private
   * @returns {string} Opponent name
   */
  getCurrentOpponent() {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES_RESULTS')
      );
      
      if (!fixturesSheet) return 'Unknown Opponent';
      
      const today = DateUtils.formatUK(DateUtils.now());
      const fixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      
      const todaysFixture = fixtures.find(fixture => 
        DateUtils.formatUK(DateUtils.parseUK(fixture.Date)) === today
      );
      
      return todaysFixture ? todaysFixture.Opponent : 'Unknown Opponent';
      
    } catch (error) {
      this.logger.warn('Could not determine current opponent', { error: error.toString() });
      return 'Unknown Opponent';
    }
  }

  /**
   * Get current score from recent events
   * @private
   * @returns {Object} Score object
   */
  getCurrentScore() {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES')
      );
      
      if (!liveSheet) return { home: '0', away: '0' };
      
      const data = SheetUtils.getAllDataAsObjects(liveSheet);
      const recentEvents = data.filter(event => 
        event['Match ID'] === this.currentMatchId || 
        DateUtils.isToday(new Date(event.Timestamp))
      );
      
      if (recentEvents.length === 0) return { home: '0', away: '0' };
      
      // Get most recent score
      const lastEvent = recentEvents[recentEvents.length - 1];
      return {
        home: lastEvent['Home Score'] || '0',
        away: lastEvent['Away Score'] || '0'
      };
      
    } catch (error) {
      this.logger.warn('Could not get current score', { error: error.toString() });
      return { home: '0', away: '0' };
    }
  }

  /**
   * Update our score
   * @private
   * @param {string} minute - Goal minute
   * @returns {Object} Updated score
   */
  updateOurScore(minute) {
    const currentScore = this.getCurrentScore();
    const newHomeScore = (parseInt(currentScore.home) + 1).toString();
    
    return {
      homeScore: newHomeScore,
      awayScore: currentScore.away,
      isHome: true
    };
  }

  /**
   * Update opposition score
   * @private
   * @param {string} minute - Goal minute
   * @returns {Object} Updated score
   */
  updateOppositionScore(minute) {
    const currentScore = this.getCurrentScore();
    const newAwayScore = (parseInt(currentScore.away) + 1).toString();
    
    return {
      homeScore: currentScore.home,
      awayScore: newAwayScore,
      isHome: false
    };
  }

  /**
   * Initialize starting XI minutes tracking
   * @private
   */
  initializeStartingXIMinutes() {
    try {
      // This would typically read from a team sheet or be set manually
      // For now, we'll track as players are mentioned in events
      this.playerMinutes.clear();
      this.playersOnPitch.clear();
      
      this.logger.info('Player minutes tracking initialized');
    } catch (error) {
      this.logger.error('Failed to initialize player minutes', { error: error.toString() });
    }
  }

  /**
   * Update player minutes for substitution
   * @private
   * @param {string} minute - Substitution minute
   * @param {string} playerOff - Player leaving
   * @param {string} playerOn - Player entering
   */
  updatePlayerMinutesForSubstitution(minute, playerOff, playerOn) {
    try {
      const subMinute = parseInt(minute);
      
      // Player going off gets minutes played from start or last sub
      if (this.playersOnPitch.has(playerOff)) {
        const existingMinutes = this.playerMinutes.get(playerOff) || 0;
        const additionalMinutes = subMinute - (this.getPlayerStartMinute(playerOff) || 0);
        this.playerMinutes.set(playerOff, existingMinutes + additionalMinutes);
        this.playersOnPitch.delete(playerOff);
      }
      
      // Player coming on starts their minute counter
      this.playersOnPitch.add(playerOn);
      this.setPlayerStartMinute(playerOn, subMinute);
      
      this.logger.info('Player minutes updated for substitution', { 
        playerOff, playerOn, minute 
      });
      
    } catch (error) {
      this.logger.error('Failed to update player minutes for substitution', { 
        error: error.toString() 
      });
    }
  }

  /**
   * Calculate player minutes played
   * @private
   * @param {string} player - Player name
   * @param {string} endMinute - End minute
   * @returns {number} Minutes played
   */
  calculatePlayerMinutes(player, endMinute) {
    try {
      const startMinute = this.getPlayerStartMinute(player) || 0;
      const end = parseInt(endMinute) || 90;
      return Math.max(0, end - startMinute);
    } catch (error) {
      this.logger.error('Failed to calculate player minutes', { error: error.toString() });
      return 0;
    }
  }

  /**
   * Get player start minute
   * @private/**
 * @fileoverview Enhanced Events Manager for Live Match Processing
 * @version 6.0.0
 * @author Senior Software Architect
 * @description Bible-compliant live match event processing with opposition detection and player minutes
 */

/**
 * Enhanced Events Manager Class
 * Handles all live match events with automatic opposition detection and real-time player tracking
 */
class EnhancedEventsManager {
  
  constructor() {
    this.logger = logger.scope('EnhancedEvents');
    this.currentMatchId = this.generateMatchId();
    this.matchStartTime = null;
    this.playersOnPitch = new Set();
    this.playerMinutes = new Map();
  }

  /**
   * Process goal event with automatic opposition detection
   * @param {string} minute - Match minute
   * @param {string} player - Player name or "Goal" for opposition
   * @param {string} assist - Assist provider (optional)
   * @param {string} notes - Additional notes
   * @returns {Object} Processing result
   */
  processGoalEvent(minute, player, assist = '', notes = '') {
    this.logger.enterFunction('processGoalEvent', { minute, player, assist });
    
    try {
      // @testHook(goal_processing_start)
      
      // Validate inputs
      if (!ValidationUtils.isValidMinute(minute)) {
        throw new Error(`Invalid minute: ${minute}`);
      }
      
      const cleanPlayer = StringUtils.cleanPlayerName(player);
      const cleanAssist = StringUtils.cleanPlayerName(assist);
      
      // Check if this is an opposition goal (Bible compliance)
      const isOppositionGoal = ValidationUtils.isOppositionPlayer(cleanPlayer);
      
      let result;
      if (isOppositionGoal) {
        result = this.processOppositionGoal(minute, notes);
      } else {
        result = this.processOurGoal(minute, cleanPlayer, cleanAssist, notes);
      }
      
      // @testHook(goal_processing_complete)
      
      this.logger.exitFunction('processGoalEvent', { 
        success: result.success, 
        opposition: isOppositionGoal 
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Goal event processing failed', { 
        error: error.toString(),
        minute, player, assist 
      });
      
      return {
        success: false,
        error: error.toString(),
        event_type: 'goal',
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Process opposition goal (automatic detection)
   * @private
   * @param {string} minute - Match minute
   * @param {string} notes - Additional notes
   * @returns {Object} Processing result
   */
  processOppositionGoal(minute, notes = '') {
    this.logger.info('Opposition goal detected', { minute });
    
    try {
      // @testHook(opposition_goal_start)
      
      // Update opposition score only
      const scoreUpdate = this.updateOppositionScore(minute);
      
      // Log to Live Match Updates sheet
      const liveSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES'),
        getConfig('SHEETS.REQUIRED_COLUMNS.LIVE_MATCH_UPDATES')
      );
      
      if (liveSheet) {
        const eventData = {
          'Timestamp': DateUtils.formatISO(DateUtils.now()),
          'Minute': minute,
          'Event': 'Goal (Opposition)',
          'Player': 'Opposition',
          'Opponent': this.getCurrentOpponent(),
          'Home Score': scoreUpdate.homeScore,
          'Away Score': scoreUpdate.awayScore,
          'Notes': notes,
          'Send': 'TRUE',
          'Status': 'Processed'
        };
        
        SheetUtils.addRowFromObject(liveSheet, eventData);
        this.logger.sheetOperation('ADD_ROW', 'Live Match Updates', true, { event: 'opposition_goal' });
      }
      
      // Send to Make.com for social media posting
      const makePayload = this.createOppositionGoalPayload(minute, scoreUpdate, notes);
      const makeResult = this.sendToMake(makePayload);
      
      // @testHook(opposition_goal_complete)
      
      return {
        success: true,
        event_type: 'goal_opposition',
        minute: minute,
        score_update: scoreUpdate,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Opposition goal processing failed', { error: error.toString() });
      throw error;
    }
  }

  /**
   * Process our team's goal
   * @private
   * @param {string} minute - Match minute
   * @param {string} player - Goal scorer
   * @param {string} assist - Assist provider
   * @param {string} notes - Additional notes

