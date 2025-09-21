logger.exitFunction(`${this.componentName}.processOppositionCard`, {
        success: true,
        cardType: cardType
      });

      return {
        success: true,
        processed: true,
        eventType: 'opposition_card',
        cardType: cardType,
        minute: minute,
        webhookResult: webhookResult
      };

    } catch (error) {
      logger.error('Opposition card processing failed', { 
        error: error.toString(),
        minute,
        cardType
      });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process team card (our players)
   */
  processTeamCard(minute, playerName, cardType) {
    logger.enterFunction(`${this.componentName}.processTeamCard`, {
      minute,
      playerName,
      cardType,
      matchId: this.currentMatchId
    });

    try {
      // @testHook(team_card_start)
      
      // Check idempotency
      const idempotencyKey = `${this.currentMatchId}_team_card_${playerName}_${cardType}_${minute}`;
      if (this.isAlreadyProcessed(idempotencyKey)) {
        return { success: true, skipped: true, reason: 'Already processed' };
      }

      // Check for second yellow card scenario
      const isSecondYellow = this.isSecondYellowCard(playerName, cardType);
      
      // Update player discipline record
      this.updatePlayerCard(playerName, cardType);
      
      // Record card in match events
      this.recordTeamCard(minute, playerName, cardType);
      
      // Determine event type
      const eventType = isSecondYellow ? 'card_second_yellow' : 'card_shown';
      
      // Create Make.com payload for team card
      const payload = {
        timestamp: new Date().toISOString(),
        match_id: this.currentMatchId,
        event_type: eventType,
        source: 'enhanced_events_manager',
        version: getConfig('SYSTEM.VERSION'),
        
        // Team card data
        minute: minute,
        player_name: playerName,
        card_type: cardType,
        is_second_yellow: isSecondYellow,
        team_type: 'home',
        opponent_name: this.getOpponentName(),
        club_name: getConfig('SYSTEM.CLUB_NAME'),
        incident_description: this.getCardDescription(cardType, isSecondYellow),
        referee_name: this.getRefereeName(),
        match_status: this.getMatchStatus(),
        previous_cards: this.getPlayerPreviousCards(playerName)
      };

      // @testHook(team_card_payload_created)
      
      const webhookResult = this.sendToMakeWebhook(payload);
      
      // @testHook(team_card_webhook_sent)
      
      // Mark as processed
      this.markAsProcessed(idempotencyKey);

      logger.exitFunction(`${this.componentName}.processTeamCard`, {
        success: true,
        player: playerName,
        cardType: cardType,
        isSecondYellow: isSecondYellow
      });

      return {
        success: true,
        processed: true,
        eventType: isSecondYellow ? 'second_yellow' : 'team_card',
        player: playerName,
        cardType: cardType,
        minute: minute,
        isSecondYellow: isSecondYellow,
        webhookResult: webhookResult
      };

    } catch (error) {
      logger.error('Team card processing failed', { 
        error: error.toString(),
        minute,
        playerName,
        cardType
      });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process substitution with real-time minutes calculation
   * Bible requirement: Auto-calculate player minutes and swap players
   */
  processSubstitution(minute, playerOff, playerOn) {
    logger.enterFunction(`${this.componentName}.processSubstitution`, {
      minute,
      playerOff,
      playerOn,
      matchId: this.currentMatchId
    });

    try {
      // @testHook(substitution_start)
      
      // Check idempotency
      const idempotencyKey = `${this.currentMatchId}_substitution_${playerOff}_${playerOn}_${minute}`;
      if (this.isAlreadyProcessed(idempotencyKey)) {
        return { success: true, skipped: true, reason: 'Already processed' };
      }

      // Calculate minutes for player going off
      const playerOffMinutes = this.calculatePlayerMinutes(playerOff, minute);
      
      // Update player minutes
      this.updatePlayerMinutes(playerOff, playerOffMinutes);
      
      // Record substitution in Subs Log
      this.recordSubstitution(minute, playerOff, playerOn);
      
      // Swap players in starting 11 and bench
      this.swapPlayersInFormation(playerOff, playerOn);
      
      // Update player appearance records
      this.updatePlayerAppearance(playerOn, 'substitute');
      
      // Create substitution record
      this.recordMatchEvent('substitution', minute, {
        playerOff: playerOff,
        playerOn: playerOn,
        minutesPlayed: playerOffMinutes
      });

      // @testHook(substitution_completed)
      
      // Mark as processed
      this.markAsProcessed(idempotencyKey);

      logger.exitFunction(`${this.componentName}.processSubstitution`, {
        success: true,
        playerOff: playerOff,
        playerOn: playerOn,
        minutesPlayed: playerOffMinutes
      });

      return {
        success: true,
        processed: true,
        eventType: 'substitution',
        playerOff: playerOff,
        playerOn: playerOn,
        minute: minute,
        minutesPlayed: playerOffMinutes
      };

    } catch (error) {
      logger.error('Substitution processing failed', { 
        error: error.toString(),
        minute,
        playerOff,
        playerOn
      });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process match status updates (kick-off, HT, 2nd half, FT)
   */
  processMatchStatus(status, minute = null) {
    logger.enterFunction(`${this.componentName}.processMatchStatus`, {
      status,
      minute,
      matchId: this.currentMatchId
    });

    try {
      // @testHook(match_status_start)
      
      // Update match timing records
      this.updateMatchTiming(status, minute);
      
      // Handle full-time minutes calculation
      if (status === 'FT') {
        this.calculateFinalMinutes();
      }
      
      // Create status payload
      const payload = {
        timestamp: new Date().toISOString(),
        match_id: this.currentMatchId,
        event_type: this.getStatusEventType(status),
        source: 'enhanced_events_manager',
        version: getConfig('SYSTEM.VERSION'),
        
        // Match status data
        match_status: status,
        minute: minute,
        opponent_name: this.getOpponentName(),
        club_name: getConfig('SYSTEM.CLUB_NAME'),
        venue: this.getMatchVenue(),
        competition: this.getMatchCompetition(),
        attendance: this.getAttendance(),
        referee: this.getRefereeName(),
        current_score: this.getCurrentScores()
      };

      // @testHook(status_payload_created)
      
      const webhookResult = this.sendToMakeWebhook(payload);
      
      // @testHook(status_webhook_sent)

      logger.exitFunction(`${this.componentName}.processMatchStatus`, {
        success: true,
        status: status
      });

      return {
        success: true,
        processed: true,
        eventType: 'match_status',
        status: status,
        minute: minute,
        webhookResult: webhookResult
      };

    } catch (error) {
      logger.error('Match status processing failed', { 
        error: error.toString(),
        status,
        minute
      });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Bible core feature: Detect if player selection indicates opposition goal
   */
  isOppositionGoal(playerName) {
    // Bible requirement: "Goal" from player dropdown = opposition goal
    return playerName === 'Goal' || playerName === 'Opposition Goal' || playerName === 'Opposition';
  }

  /**
   * Bible core feature: Detect if player selection indicates opposition card
   */
  isOppositionCard(playerName) {
    // Bible requirement: "Opposition" selection + card = opposition card
    return playerName === 'Opposition' || playerName === 'Opposition Player';
  }

  /**
   * Update opposition score only (Bible requirement)
   */
  updateOppositionScore() {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet('Live Match Updates', [
        'Minute', 'Event', 'Player', 'Home Score', 'Away Score'
      ]);
      
      if (!liveSheet) {
        throw new Error('Live Match Updates sheet not available');
      }

      // Get current scores
      const scores = this.getCurrentScores();
      
      // Increment opposition score (assuming we are home team)
      scores.away += 1;
      
      // Update scores in sheet (this would be the latest row)
      const lastRow = liveSheet.getLastRow();
      if (lastRow > 1) {
        liveSheet.getRange(lastRow, 4).setValue(scores.home); // Home Score
        liveSheet.getRange(lastRow, 5).setValue(scores.away); // Away Score
      }
      
      return scores;

    } catch (error) {
      logger.error('Failed to update opposition score', { error: error.toString() });
      throw error;
    }
  }

  /**
   * Update team score
   */
  updateTeamScore() {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet('Live Match Updates', [
        'Minute', 'Event', 'Player', 'Home Score', 'Away Score'
      ]);
      
      if (!liveSheet) {
        throw new Error('Live Match Updates sheet not available');
      }

      // Get current scores
      const scores = this.getCurrentScores();
      
      // Increment team score (assuming we are home team)
      scores.home += 1;
      
      // Update scores in sheet
      const lastRow = liveSheet.getLastRow();
      if (lastRow > 1) {
        liveSheet.getRange(lastRow, 4).setValue(scores.home); // Home Score
        liveSheet.getRange(lastRow, 5).setValue(scores.away); // Away Score
      }
      
      return scores;

    } catch (error) {
      logger.error('Failed to update team score', { error: error.toString() });
      throw error;
    }
  }

  /**
   * Bible core feature: Create video clip metadata for goals
   */
  createGoalClipMetadata(minute, playerName, assistBy) {
    try {
      const videoClipsSheet = SheetUtils.getOrCreateSheet('Video Clips', [
        'Match_ID', 'Player', 'Goal_Minute', 'Clip_Start', 'Duration', 
        'Title', 'Caption', 'Status', 'YouTube_URL'
      ]);
      
      if (!videoClipsSheet) {
        logger.warn('Video Clips sheet not available - skipping clip metadata');
        return;
      }

      // Calculate clip start time (goal minute - 3 seconds as per Bible)
      const clipStart = Math.max(0, minute - 0.05); // 3 seconds = 0.05 minutes
      
      // Generate title and caption
      const title = `${playerName} Goal vs ${this.getOpponentName()} - ${minute}'`;
      const caption = assistBy && assistBy !== 'None' 
        ? `${playerName} scores with assist from ${assistBy}!`
        : `${playerName} finds the net!`;
      
      // Add new row
      const newRow = [
        this.currentMatchId,
        playerName,
        minute,
        clipStart,
        30, // Default 30 seconds duration
        title,
        caption,
        'Created',
        '' // YouTube URL to be filled later
      ];
      
      videoClipsSheet.appendRow(newRow);
      
      logger.info('Video clip metadata created', {
        player: playerName,
        minute: minute,
        clipStart: clipStart
      });

    } catch (error) {
      logger.error('Failed to create video clip metadata', { 
        error: error.toString(),
        player: playerName,
        minute: minute
      });
    }
  }

  /**
   * Bible core feature: Calculate player minutes in real-time
   */
  calculatePlayerMinutes(playerName, currentMinute) {
    try {
      // Get match start time and player's time on pitch
      const matchTiming = this.getMatchTiming();
      const playerEntry = this.getPlayerEntryTime(playerName);
      
      // Calculate minutes played
      let minutesPlayed;
      
      if (playerEntry.isStarter) {
        // Started the match
        minutesPlayed = currentMinute;
      } else {
        // Came on as substitute
        minutesPlayed = currentMinute - playerEntry.entryMinute;
      }
      
      return Math.max(0, minutesPlayed);

    } catch (error) {
      logger.error('Failed to calculate player minutes', { 
        error: error.toString(),
        player: playerName,
        currentMinute: currentMinute
      });
      return 0;
    }
  }

  /**
   * Update player minutes in Player Stats sheet
   */
  updatePlayerMinutes(playerName, minutesToAdd) {
    try {
      const playerStatsSheet = SheetUtils.getOrCreateSheet('Player Stats', [
        'Player', 'Apps', 'Goals', 'Assists', 'Minutes', 'Cards', 'MOTM'
      ]);
      
      if (!playerStatsSheet) {
        logger.warn('Player Stats sheet not available');
        return;
      }

      const data = playerStatsSheet.getDataRange().getValues();
      const headers = data[0];
      
      // Find player row
      let playerRowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === playerName) {
          playerRowIndex = i;
          break;
        }
      }
      
      if (playerRowIndex === -1) {
        // Player not found - add new row
        const newRow = [playerName, 0, 0, 0, minutesToAdd, 0, 0];
        playerStatsSheet.appendRow(newRow);
      } else {
        // Update existing player minutes
        const minutesColumnIndex = headers.indexOf('Minutes');
        const currentMinutes = data[playerRowIndex][minutesColumnIndex] || 0;
        const newMinutes = currentMinutes + minutesToAdd;
        
        playerStatsSheet.getRange(playerRowIndex + 1, minutesColumnIndex + 1)
          .setValue(newMinutes);
      }

    } catch (error) {
      logger.error('Failed to update player minutes', { 
        error: error.toString(),
        player: playerName,
        minutes: minutesToAdd
      });
    }
  }

  /**
   * Record substitution in Subs Log sheet (Bible requirement)
   */
  recordSubstitution(minute, playerOff, playerOn) {
    try {
      const subsLogSheet = SheetUtils.getOrCreateSheet('Subs Log', [
        'Match Date', 'Match ID', 'Minute', 'Player Off', 'Player On'
      ]);
      
      if (!subsLogSheet) {
        logger.warn('Subs Log sheet not available');
        return;
      }

      const newRow = [
        new Date().toLocaleDateString('en-GB'),
        this.currentMatchId,
        minute,
        playerOff,
        playerOn
      ];
      
      subsLogSheet.appendRow(newRow);

    } catch (error) {
      logger.error('Failed to record substitution', { 
        error: error.toString(),
        minute: minute,
        playerOff: playerOff,
        playerOn: playerOn
      });
    }
  }

  /**
   * Swap players in formation (starting 11 and bench)
   */
  swapPlayersInFormation(playerOff, playerOn) {
    try {
      // This would update the formation/lineup tracking
      logger.info('Players swapped in formation', {
        playerOff: playerOff,
        playerOn: playerOn
      });

    } catch (error) {
      logger.error('Failed to swap players in formation', { 
        error: error.toString(),
        playerOff: playerOff,
        playerOn: playerOn
      });
    }
  }

  /**
   * Check if this is a second yellow card
   */
  isSecondYellowCard(playerName, cardType) {
    if (cardType !== 'Red' && cardType !== 'Red card (2nd yellow)') {
      return false;
    }
    
    if (cardType === 'Red card (2nd yellow)') {
      return true;
    }
    
    // Check if player already has a yellow card this match
    return this.playerHasYellowCard(playerName);
  }

  /**
   * Check if player already has yellow card this match
   */
  playerHasYellowCard(playerName) {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet('Live Match Updates', [
        'Minute', 'Event', 'Player', 'Home Score', 'Away Score'
      ]);
      
      if (!liveSheet) {
        return false;
      }

      const data = liveSheet.getDataRange().getValues();
      
      // Look for previous yellow card for this player
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[2] === playerName && row[1] && row[1].toString().toLowerCase().includes('yellow')) {
          return true;
        }
      }
      
      return false;

    } catch (error) {
      logger.error('Error checking for previous yellow card', { 
        error: error.toString(),
        player: playerName
      });
      return false;
    }
  }

  /**
   * Get current match ID
   */
  getCurrentMatchId() {
    try {
      // This would be stored in a match setup sheet or generated
      const today = new Date();
      return `MATCH_${today.getFullYear()}_${(today.getMonth() + 1).toString().padStart(2, '0')}_${today.getDate().toString().padStart(2, '0')}`;
    } catch (error) {
      return `MATCH_${Date.now()}`;
    }
  }

  /**
   * Get current scores
   */
  getCurrentScores() {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet('Live Match Updates', [
        'Minute', 'Event', 'Player', 'Home Score', 'Away Score'
      ]);
      
      if (!liveSheet || liveSheet.getLastRow() < 2) {
        return { home: 0, away: 0 };
      }

      const lastRow = liveSheet.getLastRow();
      const homeScore = liveSheet.getRange(lastRow, 4).getValue() || 0;
      const awayScore = liveSheet.getRange(lastRow, 5).getValue() || 0;
      
      return { home: homeScore, away: awayScore };

    } catch (error) {
      logger.error('Error getting current scores', { error: error.toString() });
      return { home: 0, away: 0 };
    }
  }

  /**
   * Get opponent name
   */
  getOpponentName() {
    try {
      // This would be retrieved from match setup or fixtures
      return 'Opposition Team';
    } catch (error) {
      return 'Opposition';
    }
  }

  /**
   * Get match venue
   */
  getMatchVenue() {
    return 'Home Ground'; // This would be dynamic based on fixture
  }

  /**
   * Get match competition
   */
  getMatchCompetition() {
    return 'League'; // This would be dynamic based on fixture
  }

  /**
   * Get match status
   */
  getMatchStatus() {
    return 'In Progress'; // This would track actual match status
  }

  /**
   * Get referee name
   */
  getRefereeName() {
    return 'Match Official'; // This would be from match setup
  }

  /**
   * Determine goal type (first, brace, hat-trick)
   */
  determineGoalType(playerName) {
    try {
      const playerGoalsThisMatch = this.getPlayerGoalsThisMatch(playerName);
      
      switch (playerGoalsThisMatch) {
        case 1:
          return 'first_goal';
        case 2:
          return 'brace';
        case 3:
          return 'hat_trick';
        default:
          return 'goal';
      }

    } catch (error) {
      return 'goal';
    }
  }

  /**
   * Get player goals this match
   */
  getPlayerGoalsThisMatch(playerName) {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet('Live Match Updates', [
        'Minute', 'Event', 'Player', 'Home Score', 'Away Score'
      ]);
      
      if (!liveSheet) {
        return 1;
      }

      const data = liveSheet.getDataRange().getValues();
      let goalCount = 0;
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[2] === playerName && row[1] && row[1].toString().toLowerCase().includes('goal')) {
          goalCount++;
        }
      }
      
      return goalCount;

    } catch (error) {
      return 1;
    }
  }

  /**
   * Get celebration type based on goal type
   */
  getCelebrationType(goalType) {
    const celebrations = {
      'first_goal': 'celebration',
      'brace': 'double_celebration',
      'hat_trick': 'hat_trick_celebration',
      'goal': 'standard_celebration'
    };
    
    return celebrations[goalType] || 'celebration';
  }

  /**
   * Update player goal statistics
   */
  updatePlayerGoal(playerName) {
    try {
      const playerStatsSheet = SheetUtils.getOrCreateSheet('Player Stats', [
        'Player', 'Apps', 'Goals', 'Assists', 'Minutes', 'Cards', 'MOTM'
      ]);
      
      if (!playerStatsSheet) {
        return;
      }

      this.updatePlayerStat(playerStatsSheet, playerName, 'Goals', 1);

    } catch (error) {
      logger.error('Failed to update player goal', { 
        error: error.toString(),
        player: playerName
      });
    }
  }

  /**
   * Update player assist statistics
   */
  updatePlayerAssist(playerName) {
    try {
      const playerStatsSheet = SheetUtils.getOrCreateSheet('Player Stats', [
        'Player', 'Apps', 'Goals', 'Assists', 'Minutes', 'Cards', 'MOTM'
      ]);
      
      if (!playerStatsSheet) {
        return;
      }

      this.updatePlayerStat(playerStatsSheet, playerName, 'Assists', 1);

    } catch (error) {
      logger.error('Failed to update player assist', { 
        error: error.toString(),
        player: playerName
      });
    }
  }

  /**
   * Update player card statistics
   */
  updatePlayerCard(playerName, cardType) {
    try {
      const playerStatsSheet = SheetUtils.getOrCreateSheet('Player Stats', [
        'Player', 'Apps', 'Goals', 'Assists', 'Minutes', 'Cards', 'MOTM'
      ]);
      
      if (!playerStatsSheet) {
        return;
      }

      // Increment card count
      this.updatePlayerStat(playerStatsSheet, playerName, 'Cards', 1);

    } catch (error) {
      logger.error('Failed to update player card', { 
        error: error.toString(),
        player: playerName,
        cardType: cardType
      });
    }
  }

  /**
   * Update player appearance
   */
  updatePlayerAppearance(playerName, appearanceType) {
    try {
      const playerStatsSheet = SheetUtils.getOrCreateSheet('Player Stats', [
        'Player', 'Apps', 'Goals', 'Assists', 'Minutes', 'Cards', 'MOTM'
      ]);
      
      if (!playerStatsSheet) {
        return;
      }

      this.updatePlayerStat(playerStatsSheet, playerName, 'Apps', 1);

    } catch (error) {
      logger.error('Failed to update player appearance', { 
        error: error.toString(),
        player: playerName,
        type: appearanceType
      });
    }
  }

  /**
   * Generic function to update player statistics
   */
  updatePlayerStat(sheet, playerName, statColumn, increment) {
    try {
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      // Find player row
      let playerRowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === playerName) {
          playerRowIndex = i;
          break;
        }
      }
      
      const statColumnIndex = headers.indexOf(statColumn);
      if (statColumnIndex === -1) {
        logger.error('Stat column not found', { column: statColumn });
        return;
      }
      
      if (playerRowIndex === -1) {
        // Player not found - add new row with all zeros except the updated stat
        const newRow = new Array(headers.length).fill(0);
        newRow[0] = playerName; // Player name
        newRow[statColumnIndex] = increment;
        sheet.appendRow(newRow);
      } else {
        // Update existing player stat
        const currentValue = data[playerRowIndex][statColumnIndex] || 0;
        const newValue = currentValue + increment;
        
        sheet.getRange(playerRowIndex + 1, statColumnIndex + 1).setValue(newValue);
      }

    } catch (error) {
      logger.error('Failed to update player stat', { 
        error: error.toString(),
        player: playerName,
        stat: statColumn,
        increment: increment
      });
    }
  }

  /**
   * Record match event in Live Match Updates
   */
  recordMatchEvent(eventType, minute, additionalData = {}) {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet('Live Match Updates', [
        'Minute', 'Event', 'Player', 'Home Score', 'Away Score'
      ]);
      
      if (!liveSheet) {
        return;
      }

      const scores = this.getCurrentScores();
      const eventDescription = this.formatEventDescription(eventType, additionalData);
      const playerName = additionalData.playerName || additionalData.playerOff || '';
      
      const newRow = [
        minute,
        eventDescription,
        playerName,
        scores.home,
        scores.away
      ];
      
      liveSheet.appendRow(newRow);

    } catch (error) {
      logger.error('Failed to record match event', { 
        error: error.toString(),
        eventType: eventType,
        minute: minute
      });
    }
  }

  /**
   * Format event description
   */
  formatEventDescription(eventType, data) {
    switch (eventType) {
      case 'substitution':
        return `SUB: ${data.playerOff} off, ${data.playerOn} on`;
      case 'goal':
        return data.assistBy ? `GOAL: ${data.scorer} (${data.assistBy})` : `GOAL: ${data.scorer}`;
      case 'card':
        return `${data.cardType.toUpperCase()}: ${data.player}`;
      default:
        return eventType.toUpperCase();
    }
  }

  /**
   * Record team goal
   */
  recordTeamGoal(minute, playerName, assistBy, scores) {
    this.recordMatchEvent('goal', minute, {
      scorer: playerName,
      assistBy: assistBy,
      playerName: playerName
    });
  }

  /**
   * Record opposition goal
   */
  recordOppositionGoal(minute, scores) {
    this.recordMatchEvent('opposition_goal', minute, {
      scorer: 'Opposition',
      playerName: 'Opposition'
    });
  }

  /**
   * Record team card
   */
  recordTeamCard(minute, playerName, cardType) {
    this.recordMatchEvent('card', minute, {
      player: playerName,
      cardType: cardType,
      playerName: playerName
    });
  }

  /**
   * Record opposition card
   */
  recordOppositionCard(minute, cardType) {
    this.recordMatchEvent('opposition_card', minute, {
      player: 'Opposition',
      cardType: cardType,
      playerName: 'Opposition'
    });
  }

  /**
   * Check if event already processed (idempotency)
   */
  isAlreadyProcessed(idempotencyKey) {
    return this.processedEvents.has(idempotencyKey);
  }

  /**
   * Mark event as processed
   */
  markAsProcessed(idempotencyKey) {
    this.processedEvents.add(idempotencyKey);
  }

  /**
   * Send payload to Make.com webhook
   */
  sendToMakeWebhook(payload) {
    try {
      const webhookUrl = getConfig('MAKE.WEBHOOK_URL');
      if (!webhookUrl) {
        logger.error('Make.com webhook URL not configured');
        return { success: false, error: 'Webhook URL not configured' };
      }

      const response = UrlFetchApp.fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload)
      });

      const responseData = JSON.parse(response.getContentText());
      
      return {
        success: response.getResponseCode() === 200,
        responseCode: response.getResponseCode(),
        responseData: responseData
      };

    } catch (error) {
      logger.error('Webhook send failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Get status event type for Make.com routing
   */
  getStatusEventType(status) {
    const statusMap = {
      'KO': 'match_kickoff',
      'HT': 'match_halftime',
      '2H': 'match_second_half',
      'FT': 'match_fulltime'
    /**
 * @fileoverview Enhanced Events Manager - Bible Core Implementation
 * Implements opposition goal auto-detection and real-time player minutes tracking
 * @version 6.0.0
 * @author Senior Software Architect
 */

/**
 * Enhanced Events Manager Class
 * Handles live match events with automatic opposition detection and player tracking
 */
class EnhancedEventsManager {
  constructor() {
    this.componentName = 'EnhancedEventsManager';
    this.currentMatchId = this.getCurrentMatchId();
    this.processedEvents = new Set();
  }

  /**
   * Process goal event with automatic opposition detection
   * Bible requirement: "Goal" from player dropdown = opposition goal automatically
   */
  processGoalEvent(minute, playerName, assistBy = null) {
    logger.enterFunction(`${this.componentName}.processGoalEvent`, {
      minute,
      playerName,
      assistBy,
      matchId: this.currentMatchId
    });

    try {
      // @testHook(goal_event_start)
      
      // Bible core feature: Auto-detect opposition goals
      const isOppositionGoal = this.isOppositionGoal(playerName);
      
      if (isOppositionGoal) {
        return this.processOppositionGoal(minute, assistBy);
      } else {
        return this.processTeamGoal(minute, playerName, assistBy);
      }

    } catch (error) {
      logger.error('Goal event processing failed', { 
        error: error.toString(),
        minute,
        playerName
      });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process opposition goal (Bible core feature)
   * Automatically triggered when "Goal" is selected from player dropdown
   */
  processOppositionGoal(minute, context = null) {
    logger.enterFunction(`${this.componentName}.processOppositionGoal`, {
      minute,
      context,
      matchId: this.currentMatchId
    });

    try {
      // @testHook(opposition_goal_start)
      
      // Check idempotency
      const idempotencyKey = `${this.currentMatchId}_opposition_goal_${minute}`;
      if (this.isAlreadyProcessed(idempotencyKey)) {
        return { success: true, skipped: true, reason: 'Already processed' };
      }

      // Update opposition score ONLY
      const scores = this.updateOppositionScore();
      
      // Create opposition goal record
      this.recordOppositionGoal(minute, scores);
      
      // Create Make.com payload for opposition goal
      const payload = {
        timestamp: new Date().toISOString(),
        match_id: this.currentMatchId,
        event_type: 'goal_opposition',
        source: 'enhanced_events_manager',
        version: getConfig('SYSTEM.VERSION'),
        
        // Opposition goal data
        minute: minute,
        scorer: 'Opposition',
        team_type: 'opposition',
        home_score: scores.home,
        away_score: scores.away,
        match_status: this.getMatchStatus(),
        opponent_name: this.getOpponentName(),
        club_name: getConfig('SYSTEM.CLUB_NAME'),
        venue: this.getMatchVenue(),
        competition: this.getMatchCompetition(),
        context: context || 'Opposition goal scored'
      };

      // @testHook(opposition_payload_created)
      
      const webhookResult = this.sendToMakeWebhook(payload);
      
      // @testHook(opposition_webhook_sent)
      
      // Mark as processed
      this.markAsProcessed(idempotencyKey);

      logger.exitFunction(`${this.componentName}.processOppositionGoal`, {
        success: true,
        scores: scores
      });

      return {
        success: true,
        processed: true,
        eventType: 'opposition_goal',
        minute: minute,
        scores: scores,
        webhookResult: webhookResult
      };

    } catch (error) {
      logger.error('Opposition goal processing failed', { 
        error: error.toString(),
        minute
      });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process team goal (our players)
   */
  processTeamGoal(minute, playerName, assistBy = null) {
    logger.enterFunction(`${this.componentName}.processTeamGoal`, {
      minute,
      playerName,
      assistBy,
      matchId: this.currentMatchId
    });

    try {
      // @testHook(team_goal_start)
      
      // Check idempotency
      const idempotencyKey = `${this.currentMatchId}_team_goal_${playerName}_${minute}`;
      if (this.isAlreadyProcessed(idempotencyKey)) {
        return { success: true, skipped: true, reason: 'Already processed' };
      }

      // Update team score
      const scores = this.updateTeamScore();
      
      // Update player statistics
      this.updatePlayerGoal(playerName);
      if (assistBy && assistBy !== 'None') {
        this.updatePlayerAssist(assistBy);
      }
      
      // Create video clip metadata (Bible requirement)
      this.createGoalClipMetadata(minute, playerName, assistBy);
      
      // Record goal in match events
      this.recordTeamGoal(minute, playerName, assistBy, scores);
      
      // Determine goal type for enhanced messaging
      const goalType = this.determineGoalType(playerName);
      
      // Create Make.com payload for team goal
      const payload = {
        timestamp: new Date().toISOString(),
        match_id: this.currentMatchId,
        event_type: 'goal_scored',
        source: 'enhanced_events_manager',
        version: getConfig('SYSTEM.VERSION'),
        
        // Team goal data
        minute: minute,
        player_name: playerName,
        assist_by: assistBy || 'None',
        goal_type: goalType,
        team_type: 'home',
        home_score: scores.home,
        away_score: scores.away,
        match_status: this.getMatchStatus(),
        opponent_name: this.getOpponentName(),
        club_name: getConfig('SYSTEM.CLUB_NAME'),
        venue: this.getMatchVenue(),
        competition: this.getMatchCompetition(),
        celebration_type: this.getCelebrationType(goalType)
      };

      // @testHook(team_payload_created)
      
      const webhookResult = this.sendToMakeWebhook(payload);
      
      // @testHook(team_webhook_sent)
      
      // Mark as processed
      this.markAsProcessed(idempotencyKey);

      logger.exitFunction(`${this.componentName}.processTeamGoal`, {
        success: true,
        player: playerName,
        scores: scores,
        goalType: goalType
      });

      return {
        success: true,
        processed: true,
        eventType: 'team_goal',
        player: playerName,
        minute: minute,
        goalType: goalType,
        scores: scores,
        webhookResult: webhookResult
      };

    } catch (error) {
      logger.error('Team goal processing failed', { 
        error: error.toString(),
        minute,
        playerName
      });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process card event with opposition detection
   */
  processCardEvent(minute, playerName, cardType) {
    logger.enterFunction(`${this.componentName}.processCardEvent`, {
      minute,
      playerName,
      cardType,
      matchId: this.currentMatchId
    });

    try {
      // @testHook(card_event_start)
      
      // Bible core feature: Auto-detect opposition cards
      const isOppositionCard = this.isOppositionCard(playerName);
      
      if (isOppositionCard) {
        return this.processOppositionCard(minute, cardType);
      } else {
        return this.processTeamCard(minute, playerName, cardType);
      }

    } catch (error) {
      logger.error('Card event processing failed', { 
        error: error.toString(),
        minute,
        playerName,
        cardType
      });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Process opposition card
   */
  processOppositionCard(minute, cardType) {
    logger.enterFunction(`${this.componentName}.processOppositionCard`, {
      minute,
      cardType,
      matchId: this.currentMatchId
    });

    try {
      // @testHook(opposition_card_start)
      
      // Check idempotency
      const idempotencyKey = `${this.currentMatchId}_opposition_card_${cardType}_${minute}`;
      if (this.isAlreadyProcessed(idempotencyKey)) {
        return { success: true, skipped: true, reason: 'Already processed' };
      }

      // Record opposition card
      this.recordOppositionCard(minute, cardType);
      
      // Create Make.com payload for opposition card
      const payload = {
        timestamp: new Date().toISOString(),
        match_id: this.currentMatchId,
        event_type: 'card_opposition',
        source: 'enhanced_events_manager',
        version: getConfig('SYSTEM.VERSION'),
        
        // Opposition card data
        minute: minute,
        player_name: 'Opposition',
        card_type: cardType,
        team_type: 'opposition',
        opponent_name: this.getOpponentName(),
        club_name: getConfig('SYSTEM.CLUB_NAME'),
        incident_description: `Opposition player shown ${cardType} card`,
        referee_name: this.getRefereeName(),
        match_status: this.getMatchStatus()
      };

      // @testHook(opposition_card_payload_created)
      
      const webhookResult = this.sendToMakeWebhook(payload);
      
      // @testHook(opposition_card_webhook_sent)
      
      // Mark as processed
      this.markAsProcessed(idempotencyKey);

      logger.exitFunction(`${this.componentName}.processOppositionCard`, {
        success: true,
