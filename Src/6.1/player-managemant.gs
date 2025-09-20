// Find existing player record
      let existingRow = SheetUtils.findRowByCriteria(playerStatsSheet, { 'Player Name': cleanName });
      
      if (existingRow === -1) {
        // Create new player record
        const newPlayerData = this.createNewPlayerRecord(cleanName, stats);
        const addResult = SheetUtils.addRowFromObject(playerStatsSheet, newPlayerData);
        
        if (!addResult) {
          throw new Error('Failed to add new player record');
        }
        
        this.logger.info('New player record created', { player: cleanName });
        
        // @testHook(new_player_created)
        
      } else {
        // Update existing player record
        const updateResult = this.updateExistingPlayerRecord(playerStatsSheet, existingRow, cleanName, stats);
        
        if (!updateResult.success) {
          throw new Error(`Failed to update player record: ${updateResult.error}`);
        }
        
        this.logger.info('Player record updated', { player: cleanName, stats: stats });
        
        // @testHook(existing_player_updated)
      }
      
      // Update player minutes if provided
      if (stats.minutes !== undefined) {
        this.updatePlayerMinutes(cleanName, stats.minutes);
      }
      
      // @testHook(player_stats_update_complete)
      
      this.logger.exitFunction('updatePlayerStats', { success: true });
      
      return {
        success: true,
        player: cleanName,
        stats_updated: Object.keys(stats),
        new_record: existingRow === -1,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Player stats update failed', { 
        error: error.toString(),
        playerName, 
        stats 
      });
      
      return {
        success: false,
        error: error.toString(),
        player: playerName,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Create new player record with default values
   * @private
   * @param {string} playerName - Player name
   * @param {Object} initialStats - Initial statistics
   * @returns {Object} New player record
   */
  createNewPlayerRecord(playerName, initialStats = {}) {
    return {
      'Player Name': playerName,
      'Appearances': initialStats.appearances || 0,
      'Goals': initialStats.goals || 0,
      'Assists': initialStats.assists || 0,
      'Minutes': initialStats.minutes || 0,
      'Yellow Cards': initialStats.yellow_cards || 0,
      'Red Cards': initialStats.red_cards || 0,
      'MOTM': initialStats.motm || 0,
      'Position': initialStats.position || '',
      'Squad Number': initialStats.squad_number || ''
    };
  }

  /**
   * Update existing player record
   * @private
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Player stats sheet
   * @param {number} rowNumber - Row number to update
   * @param {string} playerName - Player name
   * @param {Object} stats - Statistics to update
   * @returns {Object} Update result
   */
  updateExistingPlayerRecord(sheet, rowNumber, playerName, stats) {
    try {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const currentData = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
      
      // Create object from current row data
      const currentStats = {};
      headers.forEach((header, index) => {
        currentStats[header] = currentData[index];
      });
      
      // Update statistics (additive for most stats)
      const updatedStats = { ...currentStats };
      
      Object.entries(stats).forEach(([key, value]) => {
        const numericValue = parseInt(value) || 0;
        
        switch (key) {
          case 'appearances':
            updatedStats['Appearances'] = Math.max(
              parseInt(updatedStats['Appearances']) || 0,
              numericValue
            );
            break;
            
          case 'goals':
            updatedStats['Goals'] = (parseInt(updatedStats['Goals']) || 0) + numericValue;
            break;
            
          case 'assists':
            updatedStats['Assists'] = (parseInt(updatedStats['Assists']) || 0) + numericValue;
            break;
            
          case 'minutes':
            updatedStats['Minutes'] = (parseInt(updatedStats['Minutes']) || 0) + numericValue;
            break;
            
          case 'yellow_cards':
            updatedStats['Yellow Cards'] = (parseInt(updatedStats['Yellow Cards']) || 0) + numericValue;
            break;
            
          case 'red_cards':
            updatedStats['Red Cards'] = (parseInt(updatedStats['Red Cards']) || 0) + numericValue;
            break;
            
          case 'motm':
            updatedStats['MOTM'] = (parseInt(updatedStats['MOTM']) || 0) + numericValue;
            break;
            
          case 'position':
            if (value && value !== '') {
              updatedStats['Position'] = value;
            }
            break;
            
          case 'squad_number':
            if (value && value !== '') {
              updatedStats['Squad Number'] = value;
            }
            break;
        }
      });
      
      // Write updated data back to sheet
      const updatedRow = headers.map(header => updatedStats[header] || '');
      sheet.getRange(rowNumber, 1, 1, headers.length).setValues([updatedRow]);
      
      return { success: true, updated_stats: updatedStats };
      
    } catch (error) {
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Calculate player minutes from match events (BIBLE CORE)
   * @param {string} playerName - Player name
   * @param {string} matchId - Match ID
   * @returns {Object} Minutes calculation result
   */
  calculatePlayerMinutesFromEvents(playerName, matchId = null) {
    this.logger.enterFunction('calculatePlayerMinutesFromEvents', { playerName, matchId });
    
    try {
      // @testHook(minutes_calculation_start)
      
      const cleanName = StringUtils.cleanPlayerName(playerName);
      
      // Get match events
      const liveSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES')
      );
      
      if (!liveSheet) {
        throw new Error('Cannot access live match updates sheet');
      }
      
      const events = SheetUtils.getAllDataAsObjects(liveSheet);
      
      // Filter events for this player and match
      const playerEvents = events.filter(event => {
        const eventPlayer = event.Player || '';
        const isPlayerEvent = eventPlayer.includes(cleanName) || 
                             (event.Event === 'Substitution' && 
                              (eventPlayer.includes(cleanName) || (event.Assist || '').includes(cleanName)));
        
        return isPlayerEvent && (matchId ? event['Match ID'] === matchId : DateUtils.isToday(new Date(event.Timestamp)));
      });
      
      // Calculate minutes played
      const minutesResult = this.calculateMinutesFromEvents(cleanName, playerEvents);
      
      // @testHook(minutes_calculation_complete)
      
      this.logger.exitFunction('calculatePlayerMinutesFromEvents', { 
        success: true,
        minutes: minutesResult.minutes
      });
      
      return minutesResult;
      
    } catch (error) {
      this.logger.error('Player minutes calculation failed', { 
        error: error.toString(),
        playerName 
      });
      
      return {
        success: false,
        error: error.toString(),
        minutes: 0,
        player: playerName
      };
    }
  }

  /**
   * Calculate minutes from match events
   * @private
   * @param {string} playerName - Player name
   * @param {Array} events - Match events
   * @returns {Object} Minutes calculation
   */
  calculateMinutesFromEvents(playerName, events) {
    try {
      let minutesPlayed = 0;
      let startMinute = null;
      let isOnPitch = false;
      
      // Sort events by minute
      const sortedEvents = events.sort((a, b) => {
        const minuteA = parseInt(a.Minute) || 0;
        const minuteB = parseInt(b.Minute) || 0;
        return minuteA - minuteB;
      });
      
      // Check if player was in starting XI (appears in early events without substitution)
      const kickOffEvent = sortedEvents.find(event => 
        event.Event === 'Kick Off' || parseInt(event.Minute) === 0
      );
      
      if (kickOffEvent) {
        // Assume player started if they have events early in the match
        const earlyEvents = sortedEvents.filter(event => parseInt(event.Minute) <= 10);
        if (earlyEvents.length > 0) {
          startMinute = 0;
          isOnPitch = true;
        }
      }
      
      // Process substitution events
      sortedEvents.forEach(event => {
        if (event.Event === 'Substitution') {
          const playerOff = event.Player ? event.Player.split(' -> ')[0] : '';
          const playerOn = event.Player ? event.Player.split(' -> ')[1] : '';
          const minute = parseInt(event.Minute) || 0;
          
          if (playerOff.includes(playerName) && isOnPitch) {
            // Player was substituted off
            minutesPlayed += minute - (startMinute || 0);
            isOnPitch = false;
          } else if (playerOn.includes(playerName) && !isOnPitch) {
            // Player was substituted on
            startMinute = minute;
            isOnPitch = true;
          }
        }
      });
      
      // If player is still on pitch at end of match, add remaining minutes
      if (isOnPitch) {
        const fullTimeEvent = sortedEvents.find(event => event.Event === 'Full Time');
        const endMinute = fullTimeEvent ? parseInt(fullTimeEvent.Minute) || this.matchDuration : this.matchDuration;
        minutesPlayed += endMinute - (startMinute || 0);
      }
      
      return {
        success: true,
        minutes: Math.max(0, minutesPlayed),
        started: startMinute === 0,
        substitutions: this.getPlayerSubstitutions(playerName, sortedEvents),
        events_analyzed: sortedEvents.length
      };
      
    } catch (error) {
      this.logger.error('Minutes calculation from events failed', { error: error.toString() });
      return {
        success: false,
        minutes: 0,
        error: error.toString()
      };
    }
  }

  /**
   * Get player substitutions from events
   * @private
   * @param {string} playerName - Player name
   * @param {Array} events - Sorted events
   * @returns {Array} Substitution events
   */
  getPlayerSubstitutions(playerName, events) {
    return events
      .filter(event => event.Event === 'Substitution')
      .map(event => {
        const players = event.Player ? event.Player.split(' -> ') : [];
        const playerOff = players[0] || '';
        const playerOn = players[1] || '';
        const minute = parseInt(event.Minute) || 0;
        
        if (playerOff.includes(playerName)) {
          return { type: 'substituted_off', minute, replacement: playerOn };
        } else if (playerOn.includes(playerName)) {
          return { type: 'substituted_on', minute, replacing: playerOff };
        }
        return null;
      })
      .filter(sub => sub !== null);
  }

  /**
   * Update player minutes in dedicated sheet
   * @private
   * @param {string} playerName - Player name
   * @param {number} minutes - Minutes to add
   */
  updatePlayerMinutes(playerName, minutes) {
    try {
      const playerMinutesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.PLAYER_MINUTES'),
        ['Player Name', 'Total Minutes', 'Last Updated', 'Matches Played']
      );
      
      if (!playerMinutesSheet) {
        this.logger.warn('Cannot access player minutes sheet');
        return;
      }
      
      const existingRow = SheetUtils.findRowByCriteria(playerMinutesSheet, { 'Player Name': playerName });
      
      if (existingRow === -1) {
        // Create new record
        const newRecord = {
          'Player Name': playerName,
          'Total Minutes': minutes,
          'Last Updated': DateUtils.formatISO(DateUtils.now()),
          'Matches Played': 1
        };
        
        SheetUtils.addRowFromObject(playerMinutesSheet, newRecord);
      } else {
        // Update existing record
        const currentData = playerMinutesSheet.getRange(existingRow, 1, 1, 4).getValues()[0];
        const currentMinutes = parseInt(currentData[1]) || 0;
        const currentMatches = parseInt(currentData[3]) || 0;
        
        const updatedData = {
          'Total Minutes': currentMinutes + minutes,
          'Last Updated': DateUtils.formatISO(DateUtils.now()),
          'Matches Played': currentMatches + (minutes > 0 ? 1 : 0)
        };
        
        SheetUtils.updateRowByCriteria(playerMinutesSheet, { 'Player Name': playerName }, updatedData);
      }
      
    } catch (error) {
      this.logger.error('Failed to update player minutes', { error: error.toString() });
    }
  }

  /**
   * Process substitution and update minutes (BIBLE CORE)
   * @param {string} minute - Substitution minute
   * @param {string} playerOff - Player leaving
   * @param {string} playerOn - Player entering
   * @param {string} matchId - Match ID
   * @returns {Object} Processing result
   */
  processSubstitution(minute, playerOff, playerOn, matchId = null) {
    this.logger.enterFunction('processSubstitution', { minute, playerOff, playerOn });
    
    try {
      // @testHook(substitution_processing_start)
      
      const cleanPlayerOff = StringUtils.cleanPlayerName(playerOff);
      const cleanPlayerOn = StringUtils.cleanPlayerName(playerOn);
      const subMinute = parseInt(minute) || 0;
      
      // Log substitution in Subs Log
      const subsSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.SUBS_LOG'),
        getConfig('SHEETS.REQUIRED_COLUMNS.SUBS_LOG')
      );
      
      if (subsSheet) {
        const subLogData = {
          'Match Date': DateUtils.formatUK(DateUtils.now()),
          'Minute': minute,
          'Player Off': cleanPlayerOff,
          'Player On': cleanPlayerOn,
          'Match ID': matchId || StringUtils.generateId('match'),
          'Reason': 'Tactical'
        };
        
        SheetUtils.addRowFromObject(subsSheet, subLogData);
        this.logger.sheetOperation('ADD_ROW', 'Subs Log', true, { substitution: `${cleanPlayerOff} -> ${cleanPlayerOn}` });
      }
      
      // Update player statistics
      // Player off: Calculate minutes played and update appearances
      const minutesPlayed = Math.max(0, subMinute);
      this.updatePlayerStats(cleanPlayerOff, {
        minutes: minutesPlayed,
        appearances: 1
      });
      
      // Player on: Update appearances as substitute
      this.updatePlayerStats(cleanPlayerOn, {
        appearances: 1
      });
      
      // @testHook(substitution_processing_complete)
      
      this.logger.exitFunction('processSubstitution', { success: true });
      
      return {
        success: true,
        minute: minute,
        player_off: cleanPlayerOff,
        player_on: cleanPlayerOn,
        minutes_played_off: minutesPlayed,
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
        minute: minute,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Generate monthly player stats summary (BIBLE CORE)
   * @param {number} month - Month (1-12, optional)
   * @param {number} year - Year (optional)
   * @returns {Object} Stats summary result
   */
  postPlayerStatsSummary(month = null, year = null) {
    this.logger.enterFunction('postPlayerStatsSummary', { month, year });
    
    try {
      // @testHook(player_stats_summary_start)
      
      const targetDate = DateUtils.now();
      const targetMonth = month || (targetDate.getMonth() + 1);
      const targetYear = year || targetDate.getFullYear();
      
      // Get all player statistics
      const playerStatsSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.PLAYER_STATS')
      );
      
      if (!playerStatsSheet) {
        throw new Error('Cannot access player stats sheet');
      }
      
      const allPlayers = SheetUtils.getAllDataAsObjects(playerStatsSheet);
      
      // Calculate summary statistics
      const summary = this.calculateStatsSummary(allPlayers, targetMonth, targetYear);
      
      // Create payload for Make.com
      const payload = this.createPlayerStatsSummaryPayload(summary, targetMonth, targetYear);
      
      // @testHook(player_stats_summary_payload_created)
      
      // Send to Make.com
      const makeIntegration = new MakeIntegration();
      const makeResult = makeIntegration.sendToMake(payload);
      
      // @testHook(player_stats_summary_complete)
      
      this.logger.exitFunction('postPlayerStatsSummary', { success: makeResult.success });
      
      return {
        success: makeResult.success,
        summary: summary,
        month: targetMonth,
        year: targetYear,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Player stats summary failed', { 
        error: error.toString(),
        month, year 
      });
      
      return {
        success: false,
        error: error.toString(),
        month: month,
        year: year,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Calculate stats summary
   * @private
   * @param {Array} players - All player data
   * @param {number} month - Target month
   * @param {number} year - Target year
   * @returns {Object} Summary object
   */
  calculateStatsSummary(players, month, year) {
    try {
      const validPlayers = players.filter(player => 
        player['Player Name'] && 
        (parseInt(player.Appearances) || 0) > 0
      );
      
      // Top performers
      const topScorer = validPlayers.reduce((top, player) => {
        const goals = parseInt(player.Goals) || 0;
        const topGoals = parseInt(top.Goals) || 0;
        return goals > topGoals ? player : top;
      }, validPlayers[0] || {});
      
      const topAssister = validPlayers.reduce((top, player) => {
        const assists = parseInt(player.Assists) || 0;
        const topAssists = parseInt(top.Assists) || 0;
        return assists > topAssists ? player : top;
      }, validPlayers[0] || {});
      
      const mostMinutes = validPlayers.reduce((top, player) => {
        const minutes = parseInt(player.Minutes) || 0;
        const topMinutes = parseInt(top.Minutes) || 0;
        return minutes > topMinutes ? player : top;
      }, validPlayers[0] || {});
      
      const mostAppearances = validPlayers.reduce((top, player) => {
        const appearances = parseInt(player.Appearances) || 0;
        const topAppearances = parseInt(top.Appearances) || 0;
        return appearances > topAppearances ? player : top;
      }, validPlayers[0] || {});
      
      // Calculate totals
      const totals = validPlayers.reduce((totals, player) => {
        totals.goals += parseInt(player.Goals) || 0;
        totals.assists += parseInt(player.Assists) || 0;
        totals.minutes += parseInt(player.Minutes) || 0;
        totals.yellowCards += parseInt(player['Yellow Cards']) || 0;
        totals.redCards += parseInt(player['Red Cards']) || 0;
        totals.motm += parseInt(player.MOTM) || 0;
        return totals;
      }, {
        goals: 0,
        assists: 0,
        minutes: 0,
        yellowCards: 0,
        redCards: 0,
        motm: 0
      });
      
      return {
        month_name: new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long' }),
        year: year,
        total_players: validPlayers.length,
        top_scorer: {
          name: topScorer['Player Name'] || 'Unknown',
          goals: parseInt(topScorer.Goals) || 0
        },
        top_assister: {
          name: topAssister['Player Name'] || 'Unknown',
          assists: parseInt(topAssister.Assists) || 0
        },
        most_minutes: {
          name: mostMinutes['Player Name'] || 'Unknown',
          minutes: parseInt(mostMinutes.Minutes) || 0
        },
        most_appearances: {
          name: mostAppearances['Player Name'] || 'Unknown',
          appearances: parseInt(mostAppearances.Appearances) || 0
        },
        totals: totals,
        average_goals_per_player: validPlayers.length > 0 ? (totals.goals / validPlayers.length).toFixed(1) : '0.0',
        average_minutes_per_player: validPlayers.length > 0 ? Math.round(totals.minutes / validPlayers.length) : 0
      };
      
    } catch (error) {
      this.logger.error('Stats summary calculation failed', { error: error.toString() });
      
      return {
        month_name: 'Unknown',
        year: year,
        total_players: 0,
        error: 'Calculation failed'
      };
    }
  }

  /**
   * Create player stats summary payload
   * @private
   * @param {Object} summary - Stats summary
   * @param {number} month - Month
   * @param {number} year - Year
   * @returns {Object} Payload
   */
  createPlayerStatsSummaryPayload(summary, month, year) {
    return {
      event_type: 'player_stats_monthly',
      timestamp: DateUtils.formatISO(DateUtils.now()),
      month: month,
      year: year,
      month_name: summary.month_name,
      total_players: summary.total_players,
      
      // Top performers
      top_scorer_name: summary.top_scorer.name,
      top_scorer_goals: summary.top_scorer.goals,
      top_assister_name: summary.top_assister.name,
      top_assister_assists: summary.top_assister.assists,
      most_minutes_name: summary.most_minutes.name,
      most_minutes_total: summary.most_minutes.minutes,
      most_appearances_name: summary.most_appearances.name,
      most_appearances_total: summary.most_appearances.appearances,
      
      // Team totals
      total_goals: summary.totals.goals,
      total_assists: summary.totals.assists,
      total_minutes: summary.totals.minutes,
      total_yellow_cards: summary.totals.yellowCards,
      total_red_cards: summary.totals.redCards,
      total_motm_awards: summary.totals.motm,
      
      // Averages
      average_goals_per_player: summary.average_goals_per_player,
      average_minutes_per_player: summary.average_minutes_per_player,
      
      source: 'player_management_system'
    };
  }

  /**
   * Get player statistics for specific player
   * @param {string} playerName - Player name
   * @returns {Object} Player statistics
   */
  getPlayerStats(playerName) {
    try {
      const cleanName = StringUtils.cleanPlayerName(playerName);
      const playerStatsSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.PLAYER_STATS')
      );
      
      if (!playerStatsSheet) {
        throw new Error('Cannot access player stats sheet');
      }
      
      const allPlayers = SheetUtils.getAllDataAsObjects(playerStatsSheet);
      const player = allPlayers.find(p => p['Player Name'] === cleanName);
      
      if (!player) {
        return {
          success: false,
          error: 'Player not found',
          player: cleanName
        };
      }
      
      return {
        success: true,
        player: cleanName,
        stats: {
          appearances: parseInt(player.Appearances) || 0,
          goals: parseInt(player.Goals) || 0,
          assists: parseInt(player.Assists) || 0,
          minutes: parseInt(player.Minutes) || 0,
          yellow_cards: parseInt(player['Yellow Cards']) || 0,
          red_cards: parseInt(player['Red Cards']) || 0,
          motm: parseInt(player.MOTM) || 0,
          position: player.Position || '',
          squad_number: player['Squad Number'] || ''
        },
        calculated: {
          goals_per_game: this.calculateGoalsPerGame(player),
          minutes_per_game: this.calculateMinutesPerGame(player),
          cards_total: (parseInt(player['Yellow Cards']) || 0) + (parseInt(player['Red Cards']) || 0)
        }
      };
      
    } catch (error) {
      this.logger.error('Failed to get player stats', { 
        error: error.toString(),
        playerName 
      });
      
      return {
        success: false,
        error: error.toString(),
        player: playerName
      };
    }
  }

  /**
   * Calculate goals per game
   * @private
   * @param {Object} player - Player data
   * @returns {string} Goals per game
   */
  calculateGoalsPerGame(player) {
    const goals = parseInt(player.Goals) || 0;
    const appearances = parseInt(player.Appearances) || 0;
    
    if (appearances === 0) return '0.00';
    return (goals / appearances).toFixed(2);
  }

  /**
   * Calculate minutes per game
   * @private
   * @param {Object} player - Player data
   * @returns {number} Minutes per game
   */
  calculateMinutesPerGame(player) {
    const minutes = parseInt(player.Minutes) || 0;
    const appearances = parseInt(player.Appearances) || 0;
    
    if (appearances === 0) return 0;
    return Math.round(minutes / appearances);
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Initialize Player Management System
 * @returns {Object} Initialization result
 */
function initializePlayerManagement() {
  logger.enterFunction('PlayerManagement.initialize');
  
  try {
    // Test required sheets
    const requiredSheets = [
      getConfig('SHEETS.TAB_NAMES.PLAYER_STATS'),
      getConfig('SHEETS.TAB_NAMES.SUBS_LOG'),
      getConfig('SHEETS.TAB_NAMES.PLAYER_MINUTES')
    ];
    
    const sheetResults = {};
    
    requiredSheets.forEach(sheetName => {
      const columns = getConfig(`SHEETS.REQUIRED_COLUMNS.${sheetName.toUpperCase().replace(/\s/g, '_')}`);
      const sheet = SheetUtils.getOrCreateSheet(sheetName, columns);
      sheetResults[sheetName] = !!sheet;
    });
    
    const allSheetsOk = Object.values(sheetResults).every(result => result === true);
    
    logger.exitFunction('PlayerManagement.initialize', { success: allSheetsOk });
    
    return {
      success: allSheetsOk,
      sheets: sheetResults,
      message: 'Player Management System initialized successfully',
      version: '6.0.0'
    };
    
  } catch (error) {
    logger.error('Player Management initialization failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Update player statistics (public API)
 * @param {string} playerName - Player name
 * @param {Object} stats - Statistics to update
 * @returns {Object} Update result
 */
function updatePlayerStatistics(playerName, stats) {
  const manager = new PlayerManagementSystem();
  return manager.updatePlayerStats(playerName, stats);
}

/**
 * Calculate player minutes from events (public API)
 * @param {string} playerName - Player name
 * @param {string} matchId - Match ID (optional)
 * @returns {Object} Minutes calculation result
 */
function calculatePlayerMinutes(playerName, matchId = null) {
  const manager = new PlayerManagementSystem();
  return manager.calculatePlayerMinutesFromEvents(playerName, matchId);
}

/**
 * Process substitution (public API)
 * @param {string} minute - Substitution minute
 * @param {string} playerOff - Player leaving
 * @param {string} playerOn - Player entering
 * @param {string} matchId - Match ID (optional)
 * @returns {Object} Processing result
 */
function processPlayerSubstitution(minute, playerOff, playerOn, matchId = null) {
  const manager = new PlayerManagementSystem();
  return manager.processSubstitution(minute, playerOff, playerOn, matchId);
}

/**
 * Generate monthly player stats (public API)
 * @param {number} month - Month (optional)
 * @param {number} year - Year (optional)
 * @returns {Object} Stats summary result
 */
function generateMonthlyPlayerStatsSummary(month = null, year = null) {
  const manager = new PlayerManagementSystem();
  return manager.postPlayerStatsSummary(month, year);
}

/**
 * Get player statistics (public API)
 * @param {string} playerName - Player name
 * @returns {Object} Player statistics
 */
function getPlayerStatistics(playerName) {
  const manager = new PlayerManagementSystem();
  return manager.getPlayerStats(playerName);
}

/**
 * Get all players statistics (public API)
 * @returns {Object} All players statistics
 */
function getAllPlayersStatistics() {
  try {
    const playerStatsSheet = SheetUtils.getOrCreateSheet(
      getConfig('SHEETS.TAB_NAMES.PLAYER_STATS')
    );
    
    if (!playerStatsSheet) {
      return {
        success: false,
        error: 'Cannot access player stats sheet'
      };
    }
    
    const allPlayers = SheetUtils.getAllDataAsObjects(playerStatsSheet);
    
    return {
      success: true,
      players: allPlayers,
      count: allPlayers.length,
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
 * Test player management functionality
 * @returns {Object} Test results
 */
function testPlayerManagement() {
  logger.enterFunction('PlayerManagement.test');
  
  try {
    const manager = new PlayerManagementSystem();
    const results = {
      initialization: false,
      player_creation: false,
      stats_update: false,
      minutes_calculation: false,
      substitution_processing: false
    };
    
    // Test initialization
    const initResult = initializePlayerManagement();
    results.initialization = initResult.success;
    
    // Test player creation
    try {
      const testStats = { goals: 1, appearances: 1 };
      const createResult = manager.updatePlayerStats('Test Player', testStats);
      results.player_creation = createResult.success;
    } catch (error) {
      logger.warn('Player creation test failed', { error: error.toString() });
    }
    
    // Test stats update
    try {
      const updateStats = { assists: 1 };
      const updateResult = manager.updatePlayerStats('Test Player', updateStats);
      results.stats_update = updateResult.success;
    } catch (error) {
      logger.warn('Stats update test failed', { error: error.toString() });
    }
    
    // Test minutes calculation
    try {
      const minutesResult = manager.calculatePlayerMinutesFromEvents('Test Player');
      results.minutes_calculation = minutesResult.success !== false; // Allow 0 minutes
    } catch (error) {
      logger.warn('Minutes calculation test failed', { error: error.toString() });
    }
    
    // Test substitution processing
    try {
      const subResult = manager.processSubstitution('70', 'Test Player Off', 'Test Player On');
      results.substitution_processing = subResult.success;
    } catch (error) {
      logger.warn('Substitution processing test failed', { error: error.toString() });
    }
    
    const allPassed = Object.values(results).every(result => result === true);
    
    logger.exitFunction('PlayerManagement.test', { success: allPassed });
    
    return {
      success: allPassed,
      results: results,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
  } catch (error) {
    logger.error('Player management test failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}/**
 * @fileoverview Player Management System - BIBLE CORE FEATURE
 * @version 6.0.0
 * @author Senior Software Architect
 * @description Bible-compliant player statistics, minutes tracking, and substitution management
 */

/**
 * Player Management System Class - BIBLE CORE IMPLEMENTATION
 * Handles real-time player statistics, minutes tracking, and substitution management
 */
class PlayerManagementSystem {
  
  constructor() {
    this.logger = logger.scope('PlayerManagement');
    this.matchDuration = getConfig('PLAYERS.MATCH_DURATION_MINUTES', 90);
    this.halfTimeMark = getConfig('PLAYERS.HALF_TIME_MINUTE', 45);
  }

  /**
   * Update player statistics (BIBLE CORE)
   * @param {string} playerName - Player name
   * @param {Object} stats - Statistics to update
   * @returns {Object} Update result
   */
  updatePlayerStats(playerName, stats) {
    this.logger.enterFunction('updatePlayerStats', { playerName, stats });
    
    try {
      // @testHook(player_stats_update_start)
      
      if (!playerName || typeof stats !== 'object') {
        throw new Error('Invalid player name or stats object');
      }
      
      const cleanName = StringUtils.cleanPlayerName(playerName);
      const playerStatsSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.PLAYER_STATS'),
        getConfig('SHEETS.REQUIRED_COLUMNS.PLAYER_STATS')
      );
      
      if (!playerStatsSheet) {
        throw new Error('Cannot access player stats sheet');
      }
      
      // Find existing player record
      let existingRow = SheetUtils.findRowByCriteria(playerStatsSheet, { 'Player Name': cleanName });
      
      if (existingRow === -1) {
        // Create new player record
        const newPlayerData = this.createNew

