/**
 * @fileoverview Syston Tigers Automation - Enhanced Player Management and Stats
 * @version 5.1.0
 * @author Senior Software Architect
 * 
 * Handles player statistics, minutes tracking, substitutions, and bi-monthly stats summaries
 * with enhanced features. Addresses checklist requirements for player stats round-up and sub swapping.
 */


/**
 * Player Management System - Comprehensive player data management with enhanced tracking
 * Per checklist: handles stats, minutes, subs, and bi-monthly summaries with idempotency
 */
class PlayerManagementSystem extends BaseAutomationComponent {
  
  constructor() {
    super('PlayerManagementSystem');
    this.currentPlaying11 = [];
    this.currentBench = [];
    this.currentMatchId = null;
    this.matchStartTime = null;
    this.processedSubs = new Set(); // For idempotency tracking
  }


  /**
   * Initialize player management system
   * @returns {boolean} Success status
   */
  doInitialize() {
    logger.enterFunction('PlayerManagementSystem.doInitialize');
    
    try {
      // Ensure required sheets exist with proper headers
      const requiredSheets = [
        { 
          name: getConfig('SHEETS.PLAYER_STATS'), 
          headers: ['Name', 'Apps', 'Subs', 'Goals', 'Penalties', 'Assists', 'MOTM', 'Minutes', 'Yellow_Cards', 'Red_Cards', 'Season'] 
        },
        { 
          name: getConfig('SHEETS.SUBS_LOG'), 
          headers: ['Match_Date', 'Match_ID', 'Minute', 'Player_Off', 'Player_On', 'Home_Away', 'Timestamp'] 
        },
        { 
          name: getConfig('SHEETS.MINUTES_TRACKER'), 
          headers: ['Match_ID', 'Player', 'Start_Minute', 'End_Minute', 'Total_Minutes', 'Is_Starter', 'Sub_Minute'] 
        },
        {
          name: 'Player_Stats_History',
          headers: ['Date', 'Player', 'Stat_Type', 'Old_Value', 'New_Value', 'Match_ID', 'Reason']
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
      
      logger.exitFunction('PlayerManagementSystem.doInitialize', { success: true });
      return true;
    } catch (error) {
      logger.error('PlayerManagementSystem initialization failed', { error: error.toString() });
      return false;
    }
  }


  /**
   * Load current match context from Live sheet
   */
  loadCurrentMatchContext() {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.LIVE'));
      if (liveSheet) {
        const matchIdCell = getConfig('SHEETS.LIVE_CELLS.MATCH_ID', 'B1');
        this.currentMatchId = SheetUtils.getCellValue(liveSheet, matchIdCell, null);
        
        if (this.currentMatchId) {
          logger.info('Loaded current match context', { matchId: this.currentMatchId });
          this.loadCurrentTeamSelection();
        }
      }
    } catch (error) {
      logger.warn('Failed to load current match context', { error: error.toString() });
    }
  }


  /**
   * Load current team selection (playing 11 and bench)
   */
  loadCurrentTeamSelection() {
    try {
      // Try to load from minutes tracker sheet
      const minutesSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.MINUTES_TRACKER'));
      if (minutesSheet && this.currentMatchId) {
        const data = minutesSheet.getDataRange().getValues();
        
        this.currentPlaying11 = [];
        this.currentBench = [];
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const [matchId, player, startMin, endMin, totalMin, isStarter] = row;
          
          if (matchId === this.currentMatchId) {
            if (isStarter && !endMin) {
              this.currentPlaying11.push(player);
            } else if (!isStarter && !endMin) {
              this.currentPlaying11.push(player); // Currently on pitch as sub
            }
          }
        }
        
        logger.debug('Loaded team selection from minutes tracker', { 
          matchId: this.currentMatchId,
          playing11: this.currentPlaying11.length
        });
      }
    } catch (error) {
      logger.warn('Failed to load team selection', { error: error.toString() });
      this.currentPlaying11 = [];
      this.currentBench = [];
    }
  }


  // ===== PLAYER STATS MANAGEMENT =====


  /**
   * Update player appearance stats with history tracking
   * @param {string} playerName - Player name
   * @param {boolean} isStarter - Whether player started the match
   * @returns {boolean} Success status
   */
  updatePlayerAppearance(playerName, isStarter = true) {
    logger.enterFunction('PlayerManagementSystem.updatePlayerAppearance', {
      playerName, isStarter
    });


    try {
      const statsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.PLAYER_STATS'));
      if (!statsSheet) return false;


      // Find or create player row
      let playerRow = SheetUtils.findRowByValue(statsSheet, 1, playerName);
      if (!playerRow) {
        // Create new player entry
        const values = [
          playerName,     // Name
          0,              // Apps
          0,              // Subs
          0,              // Goals
          0,              // Penalties
          0,              // Assists
          0,              // MOTM
          0,              // Minutes
          0,              // Yellow_Cards
          0,              // Red_Cards
          getConfig('SYSTEM.SEASON') // Season
        ];
        
        statsSheet.appendRow(values);
        playerRow = statsSheet.getLastRow();
        logger.info('Created new player stats entry', { playerName });
      }


      // Get current values for history tracking
      const appsCell = `B${playerRow}`;
      const subsCell = `C${playerRow}`;
      
      let currentApps = SheetUtils.getCellValue(statsSheet, appsCell, 0);
      let currentSubs = SheetUtils.getCellValue(statsSheet, subsCell, 0);
      
      // Update appearances or subs
      if (isStarter) {
        const newApps = parseInt(currentApps) + 1;
        SheetUtils.setCellValue(statsSheet, appsCell, newApps);
        
        // Log history
        this.logPlayerStatHistory(playerName, 'Apps', currentApps, newApps, 'Match Start');
      } else {
        const newSubs = parseInt(currentSubs) + 1;
        SheetUtils.setCellValue(statsSheet, subsCell, newSubs);
        
        // Log history
        this.logPlayerStatHistory(playerName, 'Subs', currentSubs, newSubs, 'Substitution');
      }


      logger.exitFunction('PlayerManagementSystem.updatePlayerAppearance', { 
        success: true, isStarter 
      });
      return true;


    } catch (error) {
      logger.error('Failed to update player appearance', { 
        playerName, error: error.toString() 
      });
      return false;
    }
  }


  /**
   * Update player assist stats with history tracking
   * @param {string} playerName - Player name
   * @returns {boolean} Success status
   */
  updatePlayerAssistStats(playerName) {
    try {
      if (!playerName) return false;


      const statsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.PLAYER_STATS'));
      if (!statsSheet) return false;


      const playerRow = SheetUtils.findRowByValue(statsSheet, 1, playerName);
      if (!playerRow) {
        logger.warn('Player not found in stats sheet for assist update', { playerName });
        return false;
      }


      // Update assists column (column F per config)
      const assistsCell = `F${playerRow}`;
      const currentAssists = SheetUtils.getCellValue(statsSheet, assistsCell, 0);
      const newAssists = parseInt(currentAssists) + 1;


      SheetUtils.setCellValue(statsSheet, assistsCell, newAssists);
      
      // Log history
      this.logPlayerStatHistory(playerName, 'Assists', currentAssists, newAssists, 'Assist');


      return true;
    } catch (error) {
      logger.error('Failed to update player assist stats', { 
        playerName, error: error.toString() 
      });
      return false;
    }
  }


  /**
   * Get player stats summary with enhanced data
   * @param {string} playerName - Player name (optional, gets all if not provided)
   * @returns {Array} Array of player stat objects
   */
  getPlayerStats(playerName = null) {
    logger.enterFunction('PlayerManagementSystem.getPlayerStats', { playerName });


    try {
      const statsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.PLAYER_STATS'));
      if (!statsSheet) return [];


      const data = statsSheet.getDataRange().getValues();
      const players = [];


      // Skip header row
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const [name, apps, subs, goals, penalties, assists, motm, minutes, yellows, reds, season] = row;


        if (!name) continue; // Skip empty rows


        // Filter by player name if specified
        if (playerName && name !== playerName) continue;


        const totalApps = parseInt(apps) || 0;
        const totalSubs = parseInt(subs) || 0;
        const totalGoals = parseInt(goals) || 0;
        const totalMinutes = parseInt(minutes) || 0;


        players.push({
          name: name,
          appearances: totalApps,
          substitutions: totalSubs,
          totalAppearances: totalApps + totalSubs, // Combined appearances
          goals: totalGoals,
          penalties: parseInt(penalties) || 0,
          nonPenaltyGoals: totalGoals - (parseInt(penalties) || 0),
          assists: parseInt(assists) || 0,
          motm: parseInt(motm) || 0,
          minutes: totalMinutes,
          averageMinutesPerGame: totalApps > 0 ? Math.round(totalMinutes / totalApps) : 0,
          yellowCards: parseInt(yellows) || 0,
          redCards: parseInt(reds) || 0,
          season: season || getConfig('SYSTEM.SEASON'),
          
          // Calculated stats
          goalsPerGame: totalApps > 0 ? Math.round((totalGoals / totalApps) * 100) / 100 : 0,
          assistsPerGame: totalApps > 0 ? Math.round((parseInt(assists) || 0 / totalApps) * 100) / 100 : 0
        });
      }


      logger.exitFunction('PlayerManagementSystem.getPlayerStats', { 
        playerCount: players.length 
      });
      return players;


    } catch (error) {
      logger.error('Failed to get player stats', { error: error.toString() });
      return [];
    }
  }


  // ===== SUBSTITUTION MANAGEMENT (Per Checklist) =====


  /**
   * Process substitution with automatic team list swapping and idempotency
   * @param {string} playerOff - Player coming off
   * @param {string} playerOn - Player coming on
   * @param {number} minute - Substitution minute
   * @returns {boolean} Success status
   */
  processSubstitution(playerOff, playerOn, minute) {
    logger.enterFunction('PlayerManagementSystem.processSubstitution', {
      playerOff, playerOn, minute
    });


    return this.withLock(() => {
      try {
        // Generate substitution ID for idempotency
        const subId = this.generateSubstitutionId(playerOff, playerOn, minute);
        if (this.processedSubs.has(subId)) {
          logger.info('Substitution already processed, skipping', { subId });
          return true;
        }


        logger.testHook('substitution_processing_start', { playerOff, playerOn, minute, subId });


        // Validate substitution data
        if (!ValidationUtils.validatePlayerName(playerOff) || 
            !ValidationUtils.validatePlayerName(playerOn) ||
            !ValidationUtils.validateMinute(minute)) {
          logger.error('Invalid substitution data', { playerOff, playerOn, minute });
          return false;
        }


        // Log substitution to subs log sheet
        const subLogged = this.logSubstitution(playerOff, playerOn, minute);
        if (!subLogged) {
          logger.error('Failed to log substitution');
          return false;
        }


        // Update minutes tracking
        const minutesUpdated = this.updateMinutesForSubstitution(playerOff, playerOn, minute);
        if (!minutesUpdated) {
          logger.warn('Failed to update minutes tracking for substitution');
          // Don't fail the whole operation for this
        }


        // Swap players in team lists
        const swapResult = this.swapPlayersInTeamLists(playerOff, playerOn);
        if (!swapResult) {
          logger.warn('Failed to swap players in team lists');
          // Don't fail the whole operation for this
        }


        // Update player stats
        this.updatePlayerAppearance(playerOn, false); // Sub appearance


        // Mark substitution as processed
        this.processedSubs.add(subId);


        logger.testHook('substitution_processing_complete', { 
          playerOff, playerOn, minute, subId 
        });


        logger.exitFunction('PlayerManagementSystem.processSubstitution', { success: true });
        return true;


      } catch (error) {
        logger.error('Substitution processing failed', { error: error.toString() });
        return false;
      }
    });
  }


  /**
   * Generate substitution ID for idempotency
   * @param {string} playerOff - Player coming off
   * @param {string} playerOn - Player coming on
   * @param {number} minute - Substitution minute
   * @returns {string} Substitution ID
   */
  generateSubstitutionId(playerOff, playerOn, minute) {
    const parts = [
      this.currentMatchId || 'no_match',
      playerOff || 'no_player_off',
      playerOn || 'no_player_on',
      minute || 'no_minute'
    ];
    return StringUtils.normalize(parts.join('|'));
  }


  /**
   * Log substitution to subs log sheet
   * @param {string} playerOff - Player coming off
   * @param {string} playerOn - Player coming on
   * @param {number} minute - Substitution minute
   * @returns {boolean} Success status
   */
  logSubstitution(playerOff, playerOn, minute) {
    try {
      const subsSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.SUBS_LOG'),
        ['Match_Date', 'Match_ID', 'Minute', 'Player_Off', 'Player_On', 'Home_Away', 'Timestamp']
      );
      
      if (!subsSheet) return false;


      const values = [
        DateUtils.formatDate(DateUtils.now()),  // Match_Date
        this.currentMatchId || '',              // Match_ID
        minute,                                 // Minute
        playerOff,                             // Player_Off
        playerOn,                              // Player_On
        'HOME',                                // Home_Away (assuming home)
        DateUtils.now().toISOString()          // Timestamp
      ];


      const result = SheetUtils.appendRowSafe(subsSheet, values);
      
      if (result) {
        logger.info('Substitution logged successfully', { playerOff, playerOn, minute });
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to log substitution', { error: error.toString() });
      return false;
    }
  }


  /**
   * Swap players in current playing 11 and bench lists
   * @param {string} playerOff - Player coming off (from playing 11)
   * @param {string} playerOn - Player coming on (from bench)
   * @returns {boolean} Success status
   */
  swapPlayersInTeamLists(playerOff, playerOn) {
    logger.testHook('team_list_swapping', { playerOff, playerOn });


    try {
      // Find player off in playing 11
      const offIndex = this.currentPlaying11.indexOf(playerOff);
      if (offIndex === -1) {
        logger.warn('Player off not found in playing 11', { 
          playerOff, 
          playing11: this.currentPlaying11 
        });
        // Try to add to playing 11 anyway
        this.currentPlaying11.push(playerOff);
      } else {
        // Remove from playing 11
        this.currentPlaying11.splice(offIndex, 1);
      }


      // Find player on in bench
      const onIndex = this.currentBench.indexOf(playerOn);
      if (onIndex === -1) {
        logger.warn('Player on not found in bench', { 
          playerOn, 
          bench: this.currentBench 
        });
        // Try to add to bench anyway
        this.currentBench.push(playerOn);
      } else {
        // Remove from bench
        this.currentBench.splice(onIndex, 1);
      }


      // Make the swap
      this.currentPlaying11.push(playerOn);  // Add sub to playing 11
      this.currentBench.push(playerOff);     // Add substituted player to bench


      logger.info('Players swapped in team lists', {
        playerOff, playerOn,
        newPlaying11Count: this.currentPlaying11.length,
        newBenchCount: this.currentBench.length
      });


      return true;
    } catch (error) {
      logger.error('Failed to swap players in team lists', { error: error.toString() });
      return false;
    }
  }


  // ===== MINUTES TRACKING (Per Checklist) =====


  /**
   * Initialize minutes tracking for match start
   * @param {Array} startingXI - Array of starting 11 player names
   * @param {Array} bench - Array of bench player names
   * @returns {boolean} Success status
   */
  initializeMinutesTracking(startingXI, bench) {
    logger.enterFunction('PlayerManagementSystem.initializeMinutesTracking', {
      startingCount: startingXI.length,
      benchCount: bench.length
    });


    try {
      const minutesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.MINUTES_TRACKER'),
        ['Match_ID', 'Player', 'Start_Minute', 'End_Minute', 'Total_Minutes', 'Is_Starter', 'Sub_Minute']
      );
      
      if (!minutesSheet) return false;


      // Store current team lists
      this.currentPlaying11 = [...startingXI];
      this.currentBench = [...bench];
      this.matchStartTime = DateUtils.now();


      // Initialize minutes tracking for starting 11
      for (const player of startingXI) {
        const values = [
          this.currentMatchId || '',  // Match_ID
          player,                     // Player
          0,                          // Start_Minute (kick off)
          null,                       // End_Minute (will be set when subbed/match ends)
          0,                          // Total_Minutes (calculated later)
          true,                       // Is_Starter
          null                        // Sub_Minute (N/A for starters)
        ];


        SheetUtils.appendRowSafe(minutesSheet, values);
        this.updatePlayerAppearance(player, true); // Record appearance
      }


      logger.exitFunction('PlayerManagementSystem.initializeMinutesTracking', { 
        success: true 
      });
      return true;


    } catch (error) {
      logger.error('Failed to initialize minutes tracking', { error: error.toString() });
      return false;
    }
  }


  /**
   * Update minutes tracking for substitution
   * @param {string} playerOff - Player coming off
   * @param {string} playerOn - Player coming on
   * @param {number} minute - Substitution minute
   * @returns {boolean} Success status
   */
  updateMinutesForSubstitution(playerOff, playerOn, minute) {
    logger.testHook('minutes_tracking_substitution', { playerOff, playerOn, minute });


    try {
      const minutesSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.MINUTES_TRACKER'));
      if (!minutesSheet) return false;


      const data = minutesSheet.getDataRange().getValues();


      // Update player off - set end minute
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const [matchId, player, startMin, endMin] = row;


        if (matchId === this.currentMatchId && player === playerOff && !endMin) {
          // Set end minute for substituted player
          const endMinuteCell = `D${i + 1}`;
          SheetUtils.setCellValue(minutesSheet, endMinuteCell, minute);
          
          // Calculate and set total minutes
          const totalMinutes = minute - (startMin || 0);
          const totalCell = `E${i + 1}`;
          SheetUtils.setCellValue(minutesSheet, totalCell, totalMinutes);
          
          break;
        }
      }


      // Add entry for player on
      const values = [
        this.currentMatchId || '',  // Match_ID
        playerOn,                   // Player
        minute,                     // Start_Minute
        null,                       // End_Minute (will be set at match end)
        0,                          // Total_Minutes (calculated later)
        false,                      // Is_Starter
        minute                      // Sub_Minute
      ];


      SheetUtils.appendRowSafe(minutesSheet, values);


      logger.info('Minutes tracking updated for substitution', { 
        playerOff, playerOn, minute 
      });
      return true;


    } catch (error) {
      logger.error('Failed to update minutes for substitution', { error: error.toString() });
      return false;
    }
  }


  /**
   * Finalize minutes tracking at match end
   * @param {number} matchEndMinute - Final minute of match (default 90)
   * @returns {boolean} Success status
   */
  finalizeMatchMinutes(matchEndMinute = 90) {
    logger.enterFunction('PlayerManagementSystem.finalizeMatchMinutes', { matchEndMinute });


    try {
      const minutesSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.MINUTES_TRACKER'));
      if (!minutesSheet) return false;


      const data = minutesSheet.getDataRange().getValues();
      let playersUpdated = 0;


      // Find all players still on pitch and finalize their minutes
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const [matchId, player, startMin, endMin] = row;


        if (matchId === this.currentMatchId && !endMin) {
          // Player was still on pitch at match end
          const endMinuteCell = `D${i + 1}`;
          SheetUtils.setCellValue(minutesSheet, endMinuteCell, matchEndMinute);
          
          // Calculate and set total minutes
          const totalMinutes = matchEndMinute - (startMin || 0);
          const totalCell = `E${i + 1}`;
          SheetUtils.setCellValue(minutesSheet, totalCell, totalMinutes);
          
          // Update player's total minutes in main stats
          this.updatePlayerTotalMinutes(player, totalMinutes);
          
          playersUpdated++;
        }
      }


      logger.exitFunction('PlayerManagementSystem.finalizeMatchMinutes', { 
        success: true, 
        playersUpdated: playersUpdated
      });
      return true;


    } catch (error) {
      logger.error('Failed to finalize match minutes', { error: error.toString() });
      return false;
    }
  }


  /**
   * Update player's total minutes in player stats sheet
   * @param {string} playerName - Player name
   * @param {number} matchMinutes - Minutes played in this match
   * @returns {boolean} Success status
   */
  updatePlayerTotalMinutes(playerName, matchMinutes) {
    try {
      const statsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.PLAYER_STATS'));
      if (!statsSheet) return false;


      const playerRow = SheetUtils.findRowByValue(statsSheet, 1, playerName);
      if (!playerRow) {
        logger.warn('Player not found in stats sheet for minutes update', { playerName });
        return false;
      }


      // Update total minutes column (column H per config)
      const minutesCell = `H${playerRow}`;
      const currentMinutes = SheetUtils.getCellValue(statsSheet, minutesCell, 0);
      const newTotal = parseInt(currentMinutes) + parseInt(matchMinutes);


      SheetUtils.setCellValue(statsSheet, minutesCell, newTotal);
      
      // Log history
      this.logPlayerStatHistory(playerName, 'Minutes', currentMinutes, newTotal, 'Match Completion');


      return true;
    } catch (error) {
      logger.error('Failed to update player total minutes', { 
        playerName, matchMinutes, error: error.toString() 
      });
      return false;
    }
  }


  // ===== PLAYER STATS SUMMARY (Per Checklist - Every 2nd Week) =====


  /**
   * Post player stats summary (per checklist requirement)
   * Scheduled for every 2nd week of the month
   * @param {string} period - Period description (e.g., "October 2024")
   * @returns {Object} Summary posting result
   */
  postPlayerStatsSummary(period = null) {
    logger.enterFunction('PlayerManagementSystem.postPlayerStatsSummary', { period });


    try {
      if (!period) {
        const now = DateUtils.now();
        period = DateUtils.formatDate(now, 'MMMM yyyy');
      }


      // Get all player stats
      const allPlayerStats = this.getPlayerStats();
      if (allPlayerStats.length === 0) {
        logger.warn('No player stats found for summary');
        return { success: false, error: 'No player stats available' };
      }


      // Calculate summary statistics
      const summary = this.calculateStatsSummary(allPlayerStats);


      // Build payload for Make.com
      const payload = this.buildPlayerStatsSummaryPayload(summary, period);
      
      // Post to Make.com
      const postResult = this.postPlayerSummaryToMake(payload);


      // Log the summary posting
      this.logSummaryPosting(period, summary, postResult);


      const result = {
        success: postResult.success,
        period: period,
        summary: summary,
        response: postResult.response
      };


      logger.exitFunction('PlayerManagementSystem.postPlayerStatsSummary', result);
      return result;


    } catch (error) {
      logger.error('Failed to post player stats summary', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Calculate comprehensive stats summary with enhanced metrics
   * @param {Array} playerStats - Array of player stat objects
   * @returns {Object} Summary statistics
   */
  calculateStatsSummary(playerStats) {
    logger.testHook('stats_summary_calculation', { playerCount: playerStats.length });


    try {
      // Sort players by different metrics
      const byGoals = [...playerStats].sort((a, b) => b.goals - a.goals);
      const byAssists = [...playerStats].sort((a, b) => b.assists - a.assists);
      const byApps = [...playerStats].sort((a, b) => b.totalAppearances - a.totalAppearances);
      const byMotm = [...playerStats].sort((a, b) => b.motm - a.motm);
      const byMinutes = [...playerStats].sort((a, b) => b.minutes - a.minutes);


      // Calculate discipline stats
      const totalYellows = playerStats.reduce((sum, p) => sum + p.yellowCards, 0);
      const totalReds = playerStats.reduce((sum, p) => sum + p.redCards, 0);
      const cleanSheets = playerStats.filter(p => p.yellowCards === 0 && p.redCards === 0).length;


      // Calculate team totals
      const totalGoals = playerStats.reduce((sum, p) => sum + p.goals, 0);
      const totalAssists = playerStats.reduce((sum, p) => sum + p.assists, 0);
      const totalMinutesPlayed = playerStats.reduce((sum, p) => sum + p.minutes, 0);
      const totalApps = playerStats.reduce((sum, p) => sum + p.totalAppearances, 0);


      // Enhanced analytics
      const averageGoalsPerPlayer = totalApps > 0 ? Math.round((totalGoals / (totalApps / playerStats.length)) * 10) / 10 : 0;
      const averageMinutesPerPlayer = Math.round(totalMinutesPlayed / playerStats.length);


      const summary = {
        // Top performers
        topScorer: byGoals[0] ? {
          name: byGoals[0].name,
          goals: byGoals[0].goals,
          penalties: byGoals[0].penalties,
          nonPenGoals: byGoals[0].nonPenaltyGoals,
          goalsPerGame: byGoals[0].goalsPerGame
        } : { name: 'N/A', goals: 0 },


        topAssister: byAssists[0] ? {
          name: byAssists[0].name,
          assists: byAssists[0].assists,
          assistsPerGame: byAssists[0].assistsPerGame
        } : { name: 'N/A', assists: 0 },


        mostApps: byApps[0] ? {
          name: byApps[0].name,
          appearances: byApps[0].totalAppearances,
          starts: byApps[0].appearances,
          subs: byApps[0].substitutions
        } : { name: 'N/A', appearances: 0 },


        motmWinner: byMotm[0] ? {
          name: byMotm[0].name,
          motm: byMotm[0].motm,
          motmPercentage: byMotm[0].totalAppearances > 0 ? 
            Math.round((byMotm[0].motm / byMotm[0].totalAppearances) * 100) : 0
        } : { name: 'N/A', motm: 0 },


        mostMinutes: byMinutes[0] ? {
          name: byMinutes[0].name,
          minutes: byMinutes[0].minutes,
          averagePerGame: byMinutes[0].averageMinutesPerGame
        } : { name: 'N/A', minutes: 0 },


        // Team statistics
        teamStats: {
          totalPlayers: playerStats.length,
          activePlayers: playerStats.filter(p => p.totalAppearances > 0).length,
          totalGoals: totalGoals,
          totalAssists: totalAssists,
          totalMinutesPlayed: totalMinutesPlayed,
          totalAppearances: totalApps,
          averageGoalsPerPlayer: averageGoalsPerPlayer,
          averageMinutesPerPlayer: averageMinutesPerPlayer
        },


        // Discipline statistics
        disciplineStats: {
          totalYellowCards: totalYellows,
          totalRedCards: totalReds,
          playersWithCleanRecord: cleanSheets,
          disciplineRatio: Math.round(((totalYellows + totalReds * 2) / playerStats.length) * 10) / 10,
          mostDisciplined: playerStats.filter(p => p.yellowCards === 0 && p.redCards === 0).length
        },


        // Top 5 in each category
        top5Goals: byGoals.slice(0, 5).map(p => ({ 
          name: p.name, 
          goals: p.goals,
          penalties: p.penalties,
          nonPenGoals: p.nonPenaltyGoals
        })),
        top5Assists: byAssists.slice(0, 5).map(p => ({ 
          name: p.name, 
          assists: p.assists,
          assistsPerGame: p.assistsPerGame
        })),
        top5Apps: byApps.slice(0, 5).map(p => ({ 
          name: p.name, 
          appearances: p.totalAppearances,
          starts: p.appearances,
          subs: p.substitutions
        })),
        top5Minutes: byMinutes.slice(0, 5).map(p => ({ 
          name: p.name, 
          minutes: p.minutes,
          averagePerGame: p.averageMinutesPerGame
        }))
      };


      return summary;


    } catch (error) {
      logger.error('Failed to calculate stats summary', { error: error.toString() });
      return null;
    }
  }


  /**
   * Build payload for player stats summary posting with enhanced data
   * @param {Object} summary - Summary statistics
   * @param {string} period - Period description
   * @returns {Object} Make.com payload
   */
  buildPlayerStatsSummaryPayload(summary, period) {
    logger.testHook('player_summary_payload_building', { period });


    // Build payload with all Canva placeholders per checklist
    const payload = {
      timestamp: DateUtils.now().toISOString(),
      event_type: getConfig('MAKE.EVENT_MAPPINGS.player_stats', 'player_stats'),
      source: 'apps_script_player_management',
      
      // Canva placeholders per checklist requirement
      period: period,
      top_scorer: summary.topScorer,
      top_assists: summary.topAssister,
      most_apps: summary.mostApps,
      motm_winner: summary.motmWinner,
      discipline_stats: summary.disciplineStats,
      
      // Enhanced placeholders for better templates
      most_minutes: summary.mostMinutes,
      team_stats: summary.teamStats,
      top_performers: {
        goals: summary.top5Goals,
        assists: summary.top5Assists,
        appearances: summary.top5Apps,
        minutes: summary.top5Minutes
      },
      
      // Key insights
      key_insights: {
        totalActivePlayers: summary.teamStats.activePlayers,
        averageGoalsPerPlayer: summary.teamStats.averageGoalsPerPlayer,
        disciplineRecord: summary.disciplineStats.playersWithCleanRecord,
        topScorerGoalsPerGame: summary.topScorer.goalsPerGame || 0
      },
      
      // Context
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      summary_id: StringUtils.generateId('player_summary'),
      generated_at: DateUtils.now().toISOString()
    };


    return payload;
  }


  /**
   * Post player summary to Make.com with rate limiting
   * @param {Object} payload - Payload data
   * @returns {Object} Posting result
   */
  postPlayerSummaryToMake(payload) {
    logger.testHook('player_summary_make_posting', { eventType: payload.event_type });
    
    try {
      // Get Make.com webhook URL
      const webhookUrl = PropertiesService.getScriptProperties()
                           .getProperty(getConfig('MAKE.WEBHOOK_URL_PROPERTY'));
      
      if (!webhookUrl) {
        logger.warn('Make.com webhook URL not configured');
        return { success: false, error: 'Webhook URL not configured' };
      }


      // Send to Make.com with rate limiting
      const response = ApiUtils.rateLimitedMakeRequest(webhookUrl, {
        method: 'POST',
        payload: JSON.stringify(payload)
      });


      // Log the summary post
      this.logPlayerSummaryPost(payload, response);


      return {
        success: response.success,
        response: response
      };


    } catch (error) {
      logger.error('Failed to post player summary to Make.com', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  // ===== UTILITY AND LOGGING METHODS =====


  /**
   * Log player stat history for audit trail
   * @param {string} playerName - Player name
   * @param {string} statType - Type of stat changed
   * @param {*} oldValue - Old value
   * @param {*} newValue - New value
   * @param {string} reason - Reason for change
   * @returns {boolean} Success status
   */
  logPlayerStatHistory(playerName, statType, oldValue, newValue, reason) {
    try {
      const historySheet = SheetUtils.getOrCreateSheet(
        'Player_Stats_History',
        ['Date', 'Player', 'Stat_Type', 'Old_Value', 'New_Value', 'Match_ID', 'Reason']
      );
      
      if (!historySheet) return false;


      const values = [
        DateUtils.formatDate(DateUtils.now()),
        playerName,
        statType,
        oldValue,
        newValue,
        this.currentMatchId || '',
        reason
      ];


      return SheetUtils.appendRowSafe(historySheet, values);
    } catch (error) {
      logger.error('Failed to log player stat history', { error: error.toString() });
      return false;
    }
  }


  /**
   * Log summary posting attempt
   * @param {string} period - Period
   * @param {Object} summary - Summary data
   * @param {Object} result - Posting result
   * @returns {boolean} Success status
   */
  logSummaryPosting(period, summary, result) {
    try {
      const summarySheet = SheetUtils.getOrCreateSheet(
        'Player_Summary_Log',
        ['Date', 'Period', 'Players_Count', 'Top_Scorer', 'Status', 'Response']
      );
      
      if (!summarySheet) return false;


      const values = [
        DateUtils.now().toISOString(),
        period,
        summary.teamStats.activePlayers,
        summary.topScorer.name,
        result.success ? 'SUCCESS' : 'FAILED',
        JSON.stringify(result).substr(0, 1000)
      ];


      return SheetUtils.appendRowSafe(summarySheet, values);
    } catch (error) {
      logger.error('Failed to log summary posting', { error: error.toString() });
      return false;
    }
  }


  /**
   * Log player summary post to tracking sheet
   * @param {Object} payload - Payload sent
   * @param {Object} response - API response
   * @returns {boolean} Success status
   */
  logPlayerSummaryPost(payload, response) {
    try {
      const socialSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.SOCIAL_POSTS'),
        ['Timestamp', 'Event_Type', 'Payload', 'Status', 'Response']
      );
      
      if (!socialSheet) return false;


      const values = [
        DateUtils.now().toISOString(),
        'player_stats_summary',
        JSON.stringify(payload).substr(0, 2000),
        response.success ? 'SUCCESS' : 'FAILED',
        JSON.stringify(response).substr(0, 1000)
      ];


      return SheetUtils.appendRowSafe(socialSheet, values);
    } catch (error) {
      logger.error('Failed to log player summary post', { error: error.toString() });
      return false;
    }
  }


  /**
   * Get minutes breakdown for all players in current match
   * @returns {Array} Minutes breakdown
   */
  getMatchMinutesBreakdown() {
    logger.enterFunction('PlayerManagementSystem.getMatchMinutesBreakdown');


    try {
      const minutesSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.MINUTES_TRACKER'));
      if (!minutesSheet) return [];


      const data = minutesSheet.getDataRange().getValues();
      const breakdown = [];


      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const [matchId, player, startMin, endMin, totalMin, isStarter, subMin] = row;


        if (matchId === this.currentMatchId) {
          breakdown.push({
            player: player,
            startMinute: startMin || 0,
            endMinute: endMin || null,
            totalMinutes: totalMin || 0,
            isStarter: isStarter || false,
            subMinute: subMin || null,
            currentlyPlaying: !endMin
          });
        }
      }


      logger.exitFunction('PlayerManagementSystem.getMatchMinutesBreakdown', { 
        playersTracked: breakdown.length 
      });
      return breakdown;


    } catch (error) {
      logger.error('Failed to get match minutes breakdown', { error: error.toString() });
      return [];
    }
  }
}


// Create and export singleton instance
const playerManagementSystem = new PlayerManagementSystem();


// Export for global access
globalThis.PlayerManagementSystem = PlayerManagementSystem;
globalThis.playerManagementSystem = playerManagementSystem;
