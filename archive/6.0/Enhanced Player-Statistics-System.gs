/**
 * @fileoverview Syston Tigers Automation - Enhanced Player Statistics System
 * @version 6.0.0
 * @author Senior Software Architect
 * 
 * CRITICAL MILESTONE 1.5 IMPLEMENTATION: Enhanced Player Statistics
 * 
 * Implements the enhanced player statistics system as specified in 
 * tasks.md Milestone 1.5 Enhanced Player Statistics.
 * 
 * Key Requirements:
 * - Complete postPlayerStatsSummary() function
 * - Fix bi-monthly scheduling (every 2nd week)
 * - Enhance statistics calculations (goals per game, etc.)
 * - Add advanced metrics (clean sheet records, etc.)
 * - Improve payload structure for Canva templates
 * - Optimize player minutes tracking
 * - Test comprehensive stats generation
 */


// ===== ENHANCED PLAYER STATISTICS MANAGER =====


/**
 * Enhanced Player Statistics Manager
 * Handles comprehensive player performance tracking and bi-monthly summaries
 */
class EnhancedPlayerStatisticsManager extends BaseAutomationComponent {
  
  constructor() {
    super('EnhancedPlayerStatisticsManager');
    this.statsCache = new Map();
    this.lastSummaryDate = null;
    this.processingLock = false;
  }


  /**
   * Initialize enhanced player statistics manager
   * @returns {boolean} Success status
   */
  doInitialize() {
    logger.enterFunction('EnhancedPlayerStatisticsManager.doInitialize');
    
    try {
      // Ensure required sheets exist with enhanced columns
      const requiredSheets = [
        {
          name: getConfig('SHEETS.PLAYER_STATS'),
          headers: [
            'Name', 'Apps', 'Subs', 'Goals', 'Penalties', 'Assists', 
            'Yellow_Cards', 'Red_Cards', 'MOTM', 'Minutes', 'Clean_Sheets',
            'Goals_Per_Game', 'Minutes_Per_Game', 'Discipline_Points', 
            'Last_Updated', 'Season_Debut', 'Position'
          ]
        },
        {
          name: 'Player_Stats_History',
          headers: [
            'Timestamp', 'Player', 'Stat_Type', 'Old_Value', 'New_Value', 
            'Match_ID', 'Reason', 'Season'
          ]
        },
        {
          name: 'Player_Performance_Summaries',
          headers: [
            'Summary_Date', 'Period_Type', 'Player_Count', 'Top_Scorer',
            'Top_Assists', 'Most_Apps', 'Best_Discipline', 'Summary_Data',
            'Posted', 'Make_Response'
          ]
        }
      ];


      for (const sheetConfig of requiredSheets) {
        const sheet = SheetUtils.getOrCreateSheet(sheetConfig.name, sheetConfig.headers);
        if (!sheet) {
          logger.error(`Failed to create required sheet: ${sheetConfig.name}`);
          return false;
        }
      }


      // Load last summary date from properties
      this.loadLastSummaryDate();


      logger.exitFunction('EnhancedPlayerStatisticsManager.doInitialize', { success: true });
      return true;
    } catch (error) {
      logger.error('EnhancedPlayerStatisticsManager initialization failed', { error: error.toString() });
      return false;
    }
  }


  // ===== ENHANCED PLAYER STATS SUMMARY =====


  /**
   * Complete postPlayerStatsSummary() function (CRITICAL - Milestone 1.5)
   * @param {string} periodType - Period type ("bi-monthly", "monthly", "season")
   * @param {Date} customDate - Custom date for summary (optional)
   * @returns {Object} Summary posting result
   */
  postPlayerStatsSummary(periodType = 'bi-monthly', customDate = null) {
    logger.enterFunction('EnhancedPlayerStatisticsManager.postPlayerStatsSummary', {
      periodType: periodType,
      customDate: customDate
    });


    try {
      // @testHook(player_stats_summary_start)
      // Prevent concurrent processing
      if (this.processingLock) {
        logger.warn('Player stats summary already in progress');
        return { success: false, error: 'Summary already in progress' };
      }


      this.processingLock = true;


      try {
        // @testHook(player_stats_period_validation)
        // Validate and determine summary period
        const periodValidation = this.validateSummaryPeriod(periodType, customDate);
        if (!periodValidation.isValid) {
          return { 
            success: false, 
            error: 'Invalid summary period',
            details: periodValidation.reason
          };
        }


        // @testHook(player_stats_data_gathering)
        // Gather comprehensive player statistics
        const playerStatsData = this.gatherComprehensivePlayerStats();
        if (playerStatsData.players.length === 0) {
          logger.info('No player statistics available for summary');
          return { 
            success: true, 
            count: 0, 
            message: 'No player stats to summarize'
          };
        }


        // @testHook(player_stats_advanced_calculations)
        // Enhanced statistics calculations (goals per game, etc.)
        const enhancedStats = this.calculateEnhancedStatistics(playerStatsData.players);


        // @testHook(player_stats_performance_analysis)
        // Advanced metrics (clean sheet records, etc.)
        const performanceAnalysis = this.analyzePlayerPerformance(playerStatsData.players);


        // @testHook(player_stats_payload_building)
        // Improve payload structure for Canva templates
        const summaryPayload = this.buildEnhancedPlayerStatsPayload(
          enhancedStats, 
          performanceAnalysis, 
          periodType,
          periodValidation.periodData
        );


        // @testHook(player_stats_make_posting)
        // Post to Make.com for player stats template
        const postResult = this.postPlayerStatsToMake(summaryPayload);


        // @testHook(player_stats_summary_logging)
        // Log the summary for tracking
        const summaryLogged = this.logPlayerStatsSummary(
          periodType,
          enhancedStats,
          performanceAnalysis,
          postResult
        );


        // @testHook(player_stats_cache_update)
        // Update summary tracking
        if (postResult.success) {
          this.updateLastSummaryDate(periodValidation.periodData.endDate);
          this.updateStatsCache(enhancedStats, performanceAnalysis);
        }


        const result = {
          success: postResult.success && summaryLogged,
          periodType: periodType,
          periodData: periodValidation.periodData,
          playerCount: playerStatsData.players.length,
          enhancedStats: enhancedStats,
          performanceAnalysis: performanceAnalysis,
          makePostResult: postResult,
          summaryLogged: summaryLogged,
          eventType: 'player_stats_summary'
        };


        logger.exitFunction('EnhancedPlayerStatisticsManager.postPlayerStatsSummary', result);
        return result;


      } finally {
        this.processingLock = false;
      }


    } catch (error) {
      this.processingLock = false;
      logger.error('Player stats summary failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Validate summary period and determine scheduling
   * @param {string} periodType - Period type
   * @param {Date} customDate - Custom date
   * @returns {Object} Validation result
   */
  validateSummaryPeriod(periodType, customDate) {
    logger.testHook('player_stats_period_validation', { periodType, customDate });


    try {
      const validation = {
        isValid: false,
        reason: null,
        periodData: null
      };


      const now = customDate || DateUtils.now();


      if (periodType === 'bi-monthly') {
        // Bi-monthly scheduling: every 2nd week of the month
        const dayOfMonth = now.getDate();
        const weekOfMonth = Math.ceil(dayOfMonth / 7);


        // Check if it's the 2nd week (days 8-14) or forced with custom date
        if (weekOfMonth === 2 || customDate) {
          validation.isValid = true;
          validation.periodData = {
            type: 'bi-monthly',
            startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            endDate: new Date(now.getFullYear(), now.getMonth(), dayOfMonth),
            description: `${DateUtils.formatDate(now, 'MMMM yyyy')} Bi-Monthly Summary`,
            scheduledWeek: 2
          };
        } else {
          validation.reason = `Not scheduled week for bi-monthly summary (current: week ${weekOfMonth}, scheduled: week 2)`;
        }
      } else if (periodType === 'monthly') {
        validation.isValid = true;
        validation.periodData = {
          type: 'monthly',
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: now,
          description: `${DateUtils.formatDate(now, 'MMMM yyyy')} Monthly Summary`,
          scheduledWeek: null
        };
      } else if (periodType === 'season') {
        validation.isValid = true;
        validation.periodData = {
          type: 'season',
          startDate: new Date(now.getFullYear(), 7, 1), // Season starts August 1st
          endDate: now,
          description: `${getConfig('SYSTEM.SEASON', '2024-25')} Season Summary`,
          scheduledWeek: null
        };
      } else {
        validation.reason = `Invalid period type: ${periodType}`;
      }


      logger.info('Summary period validation completed', {
        periodType: periodType,
        isValid: validation.isValid,
        reason: validation.reason
      });


      return validation;
    } catch (error) {
      logger.error('Summary period validation failed', { error: error.toString() });
      return {
        isValid: false,
        reason: `Validation error: ${error.toString()}`,
        periodData: null
      };
    }
  }


  /**
   * Gather comprehensive player statistics
   * @returns {Object} Player statistics data
   */
  gatherComprehensivePlayerStats() {
    logger.testHook('player_stats_comprehensive_gathering');


    try {
      const statsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.PLAYER_STATS'));
      if (!statsSheet) {
        logger.error('Player stats sheet not available');
        return { players: [], metadata: {} };
      }


      const data = statsSheet.getDataRange().getValues();
      const players = [];


      // Process each player row (skip header)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const [name, apps, subs, goals, penalties, assists, yellowCards, redCards, 
               motm, minutes, cleanSheets, goalsPerGame, minutesPerGame, 
               disciplinePoints, lastUpdated, seasonDebut, position] = row;


        if (name && name.trim().length > 0) {
          const playerStats = {
            name: name.trim(),
            apps: this.parseNumericStat(apps),
            subs: this.parseNumericStat(subs),
            goals: this.parseNumericStat(goals),
            penalties: this.parseNumericStat(penalties),
            assists: this.parseNumericStat(assists),
            yellowCards: this.parseNumericStat(yellowCards),
            redCards: this.parseNumericStat(redCards),
            motm: this.parseNumericStat(motm),
            minutes: this.parseNumericStat(minutes),
            cleanSheets: this.parseNumericStat(cleanSheets),
            goalsPerGame: this.parseNumericStat(goalsPerGame, true),
            minutesPerGame: this.parseNumericStat(minutesPerGame, true),
            disciplinePoints: this.parseNumericStat(disciplinePoints),
            lastUpdated: lastUpdated,
            seasonDebut: seasonDebut,
            position: position || 'Unknown',
            rowIndex: i + 1,
            
            // Calculated fields
            totalAppearances: this.parseNumericStat(apps) + this.parseNumericStat(subs),
            nonPenaltyGoals: this.parseNumericStat(goals) - this.parseNumericStat(penalties),
            disciplineRecord: this.parseNumericStat(yellowCards) + (this.parseNumericStat(redCards) * 2)
          };


          players.push(playerStats);
        }
      }


      const metadata = {
        totalPlayers: players.length,
        activePlayersCutoff: 1, // Minimum 1 appearance
        activePlayers: players.filter(p => p.totalAppearances >= 1).length,
        dataGatheredAt: DateUtils.now().toISOString(),
        season: getConfig('SYSTEM.SEASON', '2024-25')
      };


      logger.info('Comprehensive player stats gathered', {
        totalPlayers: metadata.totalPlayers,
        activePlayers: metadata.activePlayers,
        topScorer: players.length > 0 ? players.sort((a, b) => b.goals - a.goals)[0].name : 'None'
      });


      return { players, metadata };
    } catch (error) {
      logger.error('Comprehensive player stats gathering failed', { error: error.toString() });
      return { players: [], metadata: {} };
    }
  }


  /**
   * Enhanced statistics calculations (goals per game, etc.)
   * @param {Array} players - Array of player objects
   * @returns {Object} Enhanced statistics
   */
  calculateEnhancedStatistics(players) {
    logger.testHook('player_stats_enhanced_calculations', { playerCount: players.length });


    try {
      // Filter active players (minimum 1 appearance)
      const activePlayers = players.filter(p => p.totalAppearances >= 1);


      const enhancedStats = {
        // Top performers
        topScorer: this.findTopPerformer(activePlayers, 'goals'),
        topAssist: this.findTopPerformer(activePlayers, 'assists'),
        mostApps: this.findTopPerformer(activePlayers, 'totalAppearances'),
        mostMotm: this.findTopPerformer(activePlayers, 'motm'),
        mostMinutes: this.findTopPerformer(activePlayers, 'minutes'),
        
        // Enhanced goal metrics
        topGoalsPerGame: this.findTopPerformer(activePlayers, 'goalsPerGame', 3), // Min 3 apps
        topNonPenaltyGoals: this.findTopPerformer(activePlayers, 'nonPenaltyGoals'),
        topPenaltyTaker: this.findTopPerformer(activePlayers, 'penalties'),
        
        // Team totals
        teamStats: {
          totalGoals: activePlayers.reduce((sum, p) => sum + p.goals, 0),
          totalAssists: activePlayers.reduce((sum, p) => sum + p.assists, 0),
          totalCards: activePlayers.reduce((sum, p) => sum + p.yellowCards + p.redCards, 0),
          totalMinutes: activePlayers.reduce((sum, p) => sum + p.minutes, 0),
          totalAppearances: activePlayers.reduce((sum, p) => sum + p.totalAppearances, 0),
          cleanSheetTotal: activePlayers.reduce((sum, p) => sum + p.cleanSheets, 0)
        },
        
        // Averages and ratios
        averages: {
          goalsPerPlayer: activePlayers.length > 0 ? 
            Math.round((activePlayers.reduce((sum, p) => sum + p.goals, 0) / activePlayers.length) * 10) / 10 : 0,
          assistsPerPlayer: activePlayers.length > 0 ? 
            Math.round((activePlayers.reduce((sum, p) => sum + p.assists, 0) / activePlayers.length) * 10) / 10 : 0,
          minutesPerPlayer: activePlayers.length > 0 ? 
            Math.round(activePlayers.reduce((sum, p) => sum + p.minutes, 0) / activePlayers.length) : 0,
          appsPerPlayer: activePlayers.length > 0 ? 
            Math.round((activePlayers.reduce((sum, p) => sum + p.totalAppearances, 0) / activePlayers.length) * 10) / 10 : 0
        },
        
        // Position-based stats if available
        positionBreakdown: this.calculatePositionStats(activePlayers),
        
        // Performance categories
        categories: {
          goalMachines: activePlayers.filter(p => p.goals >= 5),
          assistKings: activePlayers.filter(p => p.assists >= 3),
          everPresent: activePlayers.filter(p => p.totalAppearances >= 10),
          disciplineProblems: activePlayers.filter(p => p.disciplineRecord >= 5),
          cleanSlate: activePlayers.filter(p => p.disciplineRecord === 0)
        }
      };


      // Calculate derived statistics
      enhancedStats.teamStats.averageGoalsPerGame = enhancedStats.teamStats.totalAppearances > 0 ?
        Math.round((enhancedStats.teamStats.totalGoals / (enhancedStats.teamStats.totalAppearances / activePlayers.length)) * 10) / 10 : 0;


      enhancedStats.teamStats.goalContributionRatio = enhancedStats.teamStats.totalGoals > 0 ?
        Math.round(((enhancedStats.teamStats.totalGoals + enhancedStats.teamStats.totalAssists) / enhancedStats.teamStats.totalGoals) * 100) : 0;


      logger.info('Enhanced statistics calculated', {
        activePlayers: activePlayers.length,
        topScorer: enhancedStats.topScorer?.name,
        totalGoals: enhancedStats.teamStats.totalGoals,
        totalAssists: enhancedStats.teamStats.totalAssists
      });


      return enhancedStats;
    } catch (error) {
      logger.error('Enhanced statistics calculation failed', { error: error.toString() });
      return { 
        teamStats: { totalGoals: 0, totalAssists: 0 },
        averages: {},
        categories: {}
      };
    }
  }


  /**
   * Advanced metrics analysis (clean sheet records, etc.)
   * @param {Array} players - Array of player objects
   * @returns {Object} Performance analysis
   */
  analyzePlayerPerformance(players) {
    logger.testHook('player_stats_performance_analysis', { playerCount: players.length });


    try {
      const activePlayers = players.filter(p => p.totalAppearances >= 1);


      const performanceAnalysis = {
        // Discipline analysis
        disciplineStats: {
          cleanestPlayer: this.findCleanestPlayer(activePlayers),
          mostDisciplined: this.findMostDisciplinedPlayer(activePlayers),
          totalYellows: activePlayers.reduce((sum, p) => sum + p.yellowCards, 0),
          totalReds: activePlayers.reduce((sum, p) => sum + p.redCards, 0),
          playersWithCleanRecord: activePlayers.filter(p => p.yellowCards === 0 && p.redCards === 0).length,
          disciplineLeague: this.createDisciplineLeague(activePlayers)
        },


        // Efficiency metrics
        efficiencyStats: {
          mostEfficient: this.findMostEfficientPlayer(activePlayers),
          bestGoalsPerMinute: this.findBestGoalsPerMinute(activePlayers),
          bestAssistsPerGame: this.findBestAssistsPerGame(activePlayers),
          supersubs: this.findSupersubs(activePlayers),
          versatilityIndex: this.calculateVersatilityIndex(activePlayers)
        },


        // Consistency metrics
        consistencyStats: {
          mostConsistent: this.findMostConsistentPlayer(activePlayers),
          reliabilityIndex: this.calculateReliabilityIndex(activePlayers),
          streakAnalysis: this.analyzePlayerStreaks(activePlayers)
        },


        // Recognition and awards
        recognitionStats: {
          motmLeader: this.findTopPerformer(activePlayers, 'motm'),
          emergingTalent: this.findEmergingTalent(activePlayers),
          veteranPerformance: this.findVeteranPerformance(activePlayers),
          breakoutPlayer: this.findBreakoutPlayer(activePlayers)
        },


        // Season highlights
        seasonHighlights: {
          biggestImprovement: this.findBiggestImprovement(activePlayers),
          momentOfSeason: this.findMomentOfSeason(activePlayers),
          unsung heroes: this.findUnsungHeroes(activePlayers),
          futureStars: this.findFutureStars(activePlayers)
        }
      };


      logger.info('Performance analysis completed', {
        cleanestPlayer: performanceAnalysis.disciplineStats.cleanestPlayer?.name,
        mostEfficient: performanceAnalysis.efficiencyStats.mostEfficient?.name,
        motmLeader: performanceAnalysis.recognitionStats.motmLeader?.name
      });


      return performanceAnalysis;
    } catch (error) {
      logger.error('Player performance analysis failed', { error: error.toString() });
      return {
        disciplineStats: {},
        efficiencyStats: {},
        consistencyStats: {},
        recognitionStats: {},
        seasonHighlights: {}
      };
    }
  }


  // ===== UTILITY METHODS FOR STATISTICS =====


  /**
   * Parse numeric statistic with fallback
   * @param {*} value - Value to parse
   * @param {boolean} allowDecimals - Allow decimal values
   * @returns {number} Parsed number
   */
  parseNumericStat(value, allowDecimals = false) {
    try {
      if (value === null || value === undefined || value === '') return 0;
      
      const parsed = allowDecimals ? parseFloat(value) : parseInt(value);
      return isNaN(parsed) ? 0 : parsed;
    } catch (error) {
      return 0;
    }
  }


  /**
   * Find top performer for a specific statistic
   * @param {Array} players - Players array
   * @param {string} statField - Statistic field name
   * @param {number} minApps - Minimum appearances required
   * @returns {Object} Top performer
   */
  findTopPerformer(players, statField, minApps = 1) {
    try {
      const eligiblePlayers = players.filter(p => p.totalAppearances >= minApps);
      if (eligiblePlayers.length === 0) return null;


      const topPlayer = eligiblePlayers.reduce((top, current) => {
        return current[statField] > top[statField] ? current : top;
      });


      return {
        name: topPlayer.name,
        value: topPlayer[statField],
        totalApps: topPlayer.totalAppearances,
        statField: statField
      };
    } catch (error) {
      logger.error('Top performer finding failed', { error: error.toString() });
      return null;
    }
  }


  /**
   * Find unsung heroes (players with high contribution but low recognition)
   * @param {Array} players - Players array
   * @returns {Array} Unsung heroes
   */
  findUnsungHeroes(players) {
    try {
      // High contribution, low MOTM ratio
      return players.filter(player => {
        const contributions = player.goals + player.assists;
        const motmRatio = player.totalAppearances > 0 ? player.motm / player.totalAppearances : 0;
        
        return contributions >= 3 && // Minimum contribution
               player.totalAppearances >= 5 && // Minimum appearances
               motmRatio < 0.2; // Low MOTM ratio
      }).map(player => ({
        name: player.name,
        goals: player.goals,
        assists: player.assists,
        totalContributions: player.goals + player.assists,
        motm: player.motm,
        totalApps: player.totalAppearances,
        contributionRatio: Math.round(((player.goals + player.assists) / player.totalAppearances) * 100) / 100
      })).sort((a, b) => b.contributionRatio - a.contributionRatio);
    } catch (error) {
      logger.error('Unsung heroes finding failed', { error: error.toString() });
      return [];
    }
  }


  // ===== PAYLOAD BUILDING AND MAKE.COM INTEGRATION =====


  /**
   * Build enhanced player stats payload for Canva templates
   * @param {Object} enhancedStats - Enhanced statistics
   * @param {Object} performanceAnalysis - Performance analysis
   * @param {string} periodType - Period type
   * @param {Object} periodData - Period data
   * @returns {Object} Make.com payload
   */
  buildEnhancedPlayerStatsPayload(enhancedStats, performanceAnalysis, periodType, periodData) {
    logger.testHook('player_stats_payload_building', { 
      periodType: periodType,
      playerCount: enhancedStats.teamStats?.totalAppearances || 0
    });


    try {
      const payload = {
        timestamp: DateUtils.now().toISOString(),
        match_id: `player_stats_${periodType}_${DateUtils.formatDate(DateUtils.now(), 'yyyy_MM_dd')}`,
        event_type: getConfig('MAKE.EVENT_MAPPINGS.player_stats', 'player_stats_summary'),
        source: 'apps_script_enhanced_automation',
        version: getConfig('SYSTEM.VERSION'),


        // Period information
        period_type: periodType,
        period_description: periodData.description,
        period_start: DateUtils.formatDate(periodData.startDate, 'dd MMM yyyy'),
        period_end: DateUtils.formatDate(periodData.endDate, 'dd MMM yyyy'),


        // Top performers (main highlights)
        top_performers: {
          top_scorer: {
            name: enhancedStats.topScorer?.name || 'N/A',
            goals: enhancedStats.topScorer?.value || 0,
            apps: enhancedStats.topScorer?.totalApps || 0,
            goals_per_game: enhancedStats.topScorer?.totalApps > 0 ? 
              Math.round((enhancedStats.topScorer?.value / enhancedStats.topScorer?.totalApps) * 100) / 100 : 0
          },
          top_assist: {
            name: enhancedStats.topAssist?.name || 'N/A',
            assists: enhancedStats.topAssist?.value || 0,
            apps: enhancedStats.topAssist?.totalApps || 0,
            assists_per_game: enhancedStats.topAssist?.totalApps > 0 ? 
              Math.round((enhancedStats.topAssist?.value / enhancedStats.topAssist?.totalApps) * 100) / 100 : 0
          },
          most_apps: {
            name: enhancedStats.mostApps?.name || 'N/A',
            appearances: enhancedStats.mostApps?.value || 0,
            reliability_score: enhancedStats.mostApps?.value || 0
          },
          motm_leader: {
            name: enhancedStats.mostMotm?.name || 'N/A',
            motm_awards: enhancedStats.mostMotm?.value || 0,
            apps: enhancedStats.mostMotm?.totalApps || 0,
            motm_ratio: enhancedStats.mostMotm?.totalApps > 0 ? 
              Math.round((enhancedStats.mostMotm?.value / enhancedStats.mostMotm?.totalApps) * 100) : 0
          }
        },


        // Team statistics summary
        team_stats: {
          total_goals: enhancedStats.teamStats?.totalGoals || 0,
          total_assists: enhancedStats.teamStats?.totalAssists || 0,
          total_cards: enhancedStats.teamStats?.totalCards || 0,
          total_appearances: enhancedStats.teamStats?.totalAppearances || 0,
          total_minutes: enhancedStats.teamStats?.totalMinutes || 0,
          average_goals_per_game: enhancedStats.teamStats?.averageGoalsPerGame || 0,
          goal_contribution_ratio: enhancedStats.teamStats?.goalContributionRatio || 0
        },


        // Advanced performance metrics
        performance_highlights: {
          most_efficient: {
            name: performanceAnalysis.efficiencyStats?.mostEfficient?.name || 'N/A',
            efficiency_score: performanceAnalysis.efficiencyStats?.mostEfficient?.efficiency || 0,
            contributions_per_game: performanceAnalysis.efficiencyStats?.mostEfficient?.contributionsPerGame || 0
          },
          cleanest_player: {
            name: performanceAnalysis.disciplineStats?.cleanestPlayer?.name || 'N/A',
            yellow_cards: performanceAnalysis.disciplineStats?.cleanestPlayer?.yellowCards || 0,
            red_cards: performanceAnalysis.disciplineStats?.cleanestPlayer?.redCards || 0,
            discipline_ratio: performanceAnalysis.disciplineStats?.cleanestPlayer?.disciplineRatio || 0
          },
          emerging_talent: {
            name: performanceAnalysis.recognitionStats?.emergingTalent?.name || 'N/A',
            apps: performanceAnalysis.recognitionStats?.emergingTalent?.totalApps || 0,
            contribution_ratio: performanceAnalysis.recognitionStats?.emergingTalent?.contributionRatio || 0,
            potential: performanceAnalysis.recognitionStats?.emergingTalent?.potential || 'Unknown'
          }
        },


        // Discipline breakdown
        discipline_stats: {
          total_yellows: performanceAnalysis.disciplineStats?.totalYellows || 0,
          total_reds: performanceAnalysis.disciplineStats?.totalReds || 0,
          clean_record_players: performanceAnalysis.disciplineStats?.playersWithCleanRecord || 0,
          discipline_average: enhancedStats.averages?.cardsPerPlayer || 0
        },


        // Categories and achievements
        player_categories: {
          goal_machines: enhancedStats.categories?.goalMachines?.length || 0,
          assist_kings: enhancedStats.categories?.assistKings?.length || 0,
          ever_present: enhancedStats.categories?.everPresent?.length || 0,
          clean_slate: enhancedStats.categories?.cleanSlate?.length || 0,
          supersubs: performanceAnalysis.efficiencyStats?.supersubs?.length || 0
        },


        // Special recognitions
        special_awards: {
          supersub_of_period: performanceAnalysis.efficiencyStats?.supersubs?.[0]?.name || 'N/A',
          unsung_hero: performanceAnalysis.seasonHighlights?.['unsung heroes']?.[0]?.name || 'N/A',
          most_improved: performanceAnalysis.seasonHighlights?.biggestImprovement?.name || 'N/A',
          future_star: performanceAnalysis.seasonHighlights?.futureStars?.[0]?.name || 'N/A'
        },


        // Context and metadata
        club_name: getConfig('SYSTEM.CLUB_NAME'),
        season: getConfig('SYSTEM.SEASON'),
        summary_generated_at: DateUtils.now().toISOString(),


        // Social media optimized content
        social_highlights: this.buildSocialHighlights(enhancedStats, performanceAnalysis, periodType),
        
        // Idempotency
        idempotency_key: `player_stats_${periodType}_${DateUtils.formatDate(DateUtils.now(), 'yyyy_MM_dd')}`
      };


      logger.info('Enhanced player stats payload built', {
        eventType: payload.event_type,
        periodType: payload.period_type,
        topScorer: payload.top_performers.top_scorer.name,
        totalGoals: payload.team_stats.total_goals
      });


      return payload;
    } catch (error) {
      logger.error('Player stats payload building failed', { error: error.toString() });
      return null;
    }
  }


  /**
   * Build social media highlights
   * @param {Object} enhancedStats - Enhanced statistics
   * @param {Object} performanceAnalysis - Performance analysis
   * @param {string} periodType - Period type
   * @returns {Object} Social media content
   */
  buildSocialHighlights(enhancedStats, performanceAnalysis, periodType) {
    try {
      const topScorer = enhancedStats.topScorer?.name || 'N/A';
      const topScorerGoals = enhancedStats.topScorer?.value || 0;
      const topAssist = enhancedStats.topAssist?.name || 'N/A';
      const topAssistCount = enhancedStats.topAssist?.value || 0;
      const totalGoals = enhancedStats.teamStats?.totalGoals || 0;


      return {
        main_headline: `${periodType.charAt(0).toUpperCase() + periodType.slice(1)} Player Stats: ${topScorer} leads with ${topScorerGoals} goals!`,
        
        key_stats_text: `⚽ Top Scorer: ${topScorer} (${topScorerGoals} goals)\n🎯 Top Assists: ${topAssist} (${topAssistCount} assists)\n📊 Team Total: ${totalGoals} goals`,
        
        hashtags: [
          '#SystonTigers', '#PlayerStats', '#NonLeagueFootball', 
          `#${topScorer.replace(/\s+/g, '')}`, '#TeamPerformance'
        ],
        
        performance_summary: `${getConfig('SYSTEM.CLUB_NAME')} ${periodType} stats: ${topScorer} on fire with ${topScorerGoals} goals, ${topAssist} creating chances with ${topAssistCount} assists. Total team effort: ${totalGoals} goals scored!`,
        
        call_to_action: `Come support our goal machines! Next fixture details on our website. #SystonTigers`
      };
    } catch (error) {
      logger.error('Social highlights building failed', { error: error.toString() });
      return {
        main_headline: `${periodType.charAt(0).toUpperCase() + periodType.slice(1)} Player Statistics Summary`,
        key_stats_text: 'Comprehensive player performance analysis available',
        hashtags: ['#SystonTigers', '#PlayerStats'],
        performance_summary: 'Player statistics summary for the current period',
        call_to_action: 'Support the team!'
      };
    }
  }


  /**
   * Post player stats to Make.com
   * @param {Object} payload - Stats payload
   * @returns {Object} Posting result
   */
  postPlayerStatsToMake(payload) {
    logger.testHook('player_stats_make_posting', { eventType: payload?.event_type });


    try {
      if (!payload) {
        return { success: false, error: 'No payload provided' };
      }


      // Get Make.com webhook URL
      const webhookUrl = PropertiesService.getScriptProperties()
                           .getProperty(getConfig('MAKE.WEBHOOK_URL_PROPERTY'));


      if (!webhookUrl) {
        logger.warn('Make.com webhook URL not configured for player stats');
        return { success: false, error: 'Webhook URL not configured' };
      }


      // Send to Make.com with rate limiting
      const response = ApiUtils.rateLimitedMakeRequest(webhookUrl, {
        method: 'POST',
        payload: JSON.stringify(payload)
      });


      logger.info('Player stats posted to Make.com', {
        eventType: payload.event_type,
        periodType: payload.period_type,
        success: response.success,
        responseCode: response.responseCode
      });


      return {
        success: response.success,
        response: response
      };


    } catch (error) {
      logger.error('Player stats Make.com posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Log player stats summary for tracking
   * @param {string} periodType - Period type
   * @param {Object} enhancedStats - Enhanced statistics
   * @param {Object} performanceAnalysis - Performance analysis
   * @param {Object} postResult - Make.com post result
   * @returns {boolean} Success status
   */
  logPlayerStatsSummary(periodType, enhancedStats, performanceAnalysis, postResult) {
    logger.testHook('player_stats_summary_logging', { periodType });


    try {
      const summarySheet = SheetUtils.getOrCreateSheet(
        'Player_Performance_Summaries',
        ['Summary_Date', 'Period_Type', 'Player_Count', 'Top_Scorer',
         'Top_Assists', 'Most_Apps', 'Best_Discipline', 'Summary_Data',
         'Posted', 'Make_Response']
      );


      if (!summarySheet) {
        logger.error('Player performance summaries sheet not available');
        return false;
      }


      const summaryData = {
        topScorer: enhancedStats.topScorer,
        topAssist: enhancedStats.topAssist,
        teamStats: enhancedStats.teamStats,
        disciplineStats: performanceAnalysis.disciplineStats
      };


      const values = [
        DateUtils.now().toISOString().split('T')[0], // Date
        periodType,
        enhancedStats.teamStats?.totalAppearances || 0,
        enhancedStats.topScorer?.name || 'N/A',
        enhancedStats.topAssist?.name || 'N/A',
        enhancedStats.mostApps?.name || 'N/A',
        performanceAnalysis.disciplineStats?.cleanestPlayer?.name || 'N/A',
        JSON.stringify(summaryData).substr(0, 1000), // Truncate long data
        postResult.success ? 'Y' : 'N',
        postResult.success ? 'SUCCESS' : (postResult.error || 'FAILED')
      ];


      const success = SheetUtils.appendRowSafe(summarySheet, values);


      if (success) {
        logger.info('Player stats summary logged', {
          periodType: periodType,
          topScorer: enhancedStats.topScorer?.name,
          posted: postResult.success
        });
      }


      return success;
    } catch (error) {
      logger.error('Player stats summary logging failed', { error: error.toString() });
      return false;
    }
  }


  // ===== SCHEDULING AND AUTOMATION =====


  /**
   * Check if bi-monthly summary should run
   * @returns {Object} Scheduling check result
   */
  checkBiMonthlySummarySchedule() {
    logger.enterFunction('EnhancedPlayerStatisticsManager.checkBiMonthlySummarySchedule');


    try {
      const now = DateUtils.now();
      const dayOfMonth = now.getDate();
      const weekOfMonth = Math.ceil(dayOfMonth / 7);


      // Check if it's the 2nd week (days 8-14)
      if (weekOfMonth === 2) {
        // Check if we haven't run this month already
        const lastSummary = this.getLastSummaryDate();
        const currentMonth = DateUtils.formatDate(now, 'yyyy-MM');
        
        if (!lastSummary || !lastSummary.includes(currentMonth)) {
          logger.info('Bi-monthly summary scheduled to run', {
            currentDay: dayOfMonth,
            weekOfMonth: weekOfMonth,
            lastSummary: lastSummary
          });


          // Run the summary
          const result = this.postPlayerStatsSummary('bi-monthly');
          
          logger.exitFunction('EnhancedPlayerStatisticsManager.checkBiMonthlySummarySchedule', result);
          return result;
        } else {
          logger.info('Bi-monthly summary already run this month', {
            currentMonth: currentMonth,
            lastSummary: lastSummary
          });
          return { 
            success: true, 
            skipped: true, 
            reason: 'Already run this month',
            lastSummary: lastSummary
          };
        }
      } else {
        logger.info('Not scheduled week for bi-monthly summary', {
          currentWeek: weekOfMonth,
          scheduledWeek: 2
        });
        return { 
          success: true, 
          skipped: true, 
          reason: 'Not scheduled week',
          currentWeek: weekOfMonth,
          scheduledWeek: 2
        };
      }
    } catch (error) {
      logger.error('Bi-monthly summary schedule check failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Load last summary date from properties
   */
  loadLastSummaryDate() {
    try {
      const lastSummary = PropertiesService.getScriptProperties()
                           .getProperty('LAST_PLAYER_STATS_SUMMARY');
      this.lastSummaryDate = lastSummary;
      
      logger.info('Last summary date loaded', { lastSummary: lastSummary });
    } catch (error) {
      logger.error('Failed to load last summary date', { error: error.toString() });
      this.lastSummaryDate = null;
    }
  }


  /**
   * Update last summary date
   * @param {Date} summaryDate - Summary date
   */
  updateLastSummaryDate(summaryDate) {
    try {
      const dateKey = DateUtils.formatDate(summaryDate, 'yyyy-MM-dd');
      PropertiesService.getScriptProperties()
                      .setProperty('LAST_PLAYER_STATS_SUMMARY', dateKey);
      this.lastSummaryDate = dateKey;
      
      logger.info('Last summary date updated', { dateKey: dateKey });
    } catch (error) {
      logger.error('Failed to update last summary date', { error: error.toString() });
    }
  }


  /**
   * Get last summary date
   * @returns {string} Last summary date
   */
  getLastSummaryDate() {
    return this.lastSummaryDate;
  }


  /**
   * Update stats cache
   * @param {Object} enhancedStats - Enhanced statistics
   * @param {Object} performanceAnalysis - Performance analysis
   */
  updateStatsCache(enhancedStats, performanceAnalysis) {
    try {
      const cacheKey = DateUtils.formatDate(DateUtils.now(), 'yyyy-MM');
      this.statsCache.set(cacheKey, {
        enhancedStats: enhancedStats,
        performanceAnalysis: performanceAnalysis,
        cached: DateUtils.now().toISOString()
      });


      // Keep only last 3 months in cache
      if (this.statsCache.size > 3) {
        const oldestKey = Array.from(this.statsCache.keys())[0];
        this.statsCache.delete(oldestKey);
      }


      logger.info('Stats cache updated', { cacheKey: cacheKey });
    } catch (error) {
      logger.error('Stats cache update failed', { error: error.toString() });
    }
  }


  // Add placeholder methods for other analysis functions
  findMostDisciplinedPlayer(players) { return this.findCleanestPlayer(players); }
  createDisciplineLeague(players) { return []; }
  findBestGoalsPerMinute(players) { return null; }
  findBestAssistsPerGame(players) { return null; }
  calculateVersatilityIndex(players) { return null; }
  findMostConsistentPlayer(players) { return null; }
  calculateReliabilityIndex(players) { return null; }
  analyzePlayerStreaks(players) { return null; }
  findVeteranPerformance(players) { return null; }
  findBreakoutPlayer(players) { return null; }
  findBiggestImprovement(players) { return null; }
  findMomentOfSeason(players) { return null; }
  findFutureStars(players) { return []; }
}


// ===== PUBLIC API FUNCTIONS FOR MAIN COORDINATOR =====


/**
 * Public function to post player stats summary
 * @param {string} periodType - Period type ("bi-monthly", "monthly", "season")
 * @param {Date} customDate - Custom date (optional)
 * @returns {Object} Processing result
 */
function postPlayerStatsSummary(periodType = 'bi-monthly', customDate = null) {
  logger.enterFunction('postPlayerStatsSummary', { periodType, customDate });


  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const statsManager = coordinator.components.get('EnhancedPlayerStatisticsManager');
    if (!statsManager) {
      logger.error('EnhancedPlayerStatisticsManager not available');
      return { success: false, error: 'Player statistics manager not available' };
    }


    const result = statsManager.postPlayerStatsSummary(periodType, customDate);


    logger.exitFunction('postPlayerStatsSummary', { success: result.success });
    return result;


  } catch (error) {
    logger.error('Player stats summary failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Public function to check bi-monthly summary schedule
 * @returns {Object} Schedule check result
 */
function checkPlayerStatsSummarySchedule() {
  logger.enterFunction('checkPlayerStatsSummarySchedule');


  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const statsManager = coordinator.components.get('EnhancedPlayerStatisticsManager');
    if (!statsManager) {
      logger.error('EnhancedPlayerStatisticsManager not available for scheduling');
      return { success: false, error: 'Player statistics manager not available' };
    }


    const result = statsManager.checkBiMonthlySummarySchedule();


    logger.exitFunction('checkPlayerStatsSummarySchedule', { 
      success: result.success,
      triggered: !result.skipped
    });
    return result;


  } catch (error) {
    logger.error('Player stats summary schedule check failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


// Create and export singleton instance
const enhancedPlayerStatisticsManager = new EnhancedPlayerStatisticsManager();


// Export for global access
globalThis.EnhancedPlayerStatisticsManager = EnhancedPlayerStatisticsManager;
globalThis.enhancedPlayerStatisticsManager = enhancedPlayerStatisticsManager;
globalThis.postPlayerStatsSummary = postPlayerStatsSummary;
globalThis.checkPlayerStatsSummarySchedule = checkPlayerStatsSummarySchedule;
    }
  }


  /**
   * Find cleanest player (best disciplinary record)
   * @param {Array} players - Players array
   * @returns {Object} Cleanest player
   */
  findCleanestPlayer(players) {
    try {
      const eligiblePlayers = players.filter(p => p.totalAppearances >= 3); // Min 3 appearances
      if (eligiblePlayers.length === 0) return null;


      const cleanest = eligiblePlayers.reduce((cleanest, current) => {
        const currentRecord = current.yellowCards + (current.redCards * 2);
        const cleanestRecord = cleanest.yellowCards + (cleanest.redCards * 2);
        
        // Lower is better for discipline, but factor in appearances
        const currentRatio = currentRecord / current.totalAppearances;
        const cleanestRatio = cleanestRecord / cleanest.totalAppearances;
        
        return currentRatio < cleanestRatio ? current : cleanest;
      });


      return {
        name: cleanest.name,
        yellowCards: cleanest.yellowCards,
        redCards: cleanest.redCards,
        totalApps: cleanest.totalAppearances,
        disciplineRatio: Math.round(((cleanest.yellowCards + (cleanest.redCards * 2)) / cleanest.totalAppearances) * 100) / 100
      };
    } catch (error) {
      logger.error('Cleanest player finding failed', { error: error.toString() });
      return null;
    }
  }


  /**
   * Find most efficient player (goals + assists per appearance)
   * @param {Array} players - Players array
   * @returns {Object} Most efficient player
   */
  findMostEfficientPlayer(players) {
    try {
      const eligiblePlayers = players.filter(p => p.totalAppearances >= 3);
      if (eligiblePlayers.length === 0) return null;


      const mostEfficient = eligiblePlayers.reduce((efficient, current) => {
        const currentEfficiency = (current.goals + current.assists) / current.totalAppearances;
        const efficientEfficiency = (efficient.goals + efficient.assists) / efficient.totalAppearances;
        
        return currentEfficiency > efficientEfficiency ? current : efficient;
      });


      const efficiency = (mostEfficient.goals + mostEfficient.assists) / mostEfficient.totalAppearances;


      return {
        name: mostEfficient.name,
        goals: mostEfficient.goals,
        assists: mostEfficient.assists,
        totalApps: mostEfficient.totalAppearances,
        efficiency: Math.round(efficiency * 100) / 100,
        contributionsPerGame: Math.round(efficiency * 10) / 10
      };
    } catch (error) {
      logger.error('Most efficient player finding failed', { error: error.toString() });
      return null;
    }
  }


  /**
   * Calculate position-based statistics
   * @param {Array} players - Players array
   * @returns {Object} Position breakdown
   */
  calculatePositionStats(players) {
    try {
      const positionStats = {};


      players.forEach(player => {
        const position = player.position || 'Unknown';
        if (!positionStats[position]) {
          positionStats[position] = {
            playerCount: 0,
            totalGoals: 0,
            totalAssists: 0,
            totalApps: 0,
            averageGoals: 0,
            topPlayer: null
          };
        }


        const posData = positionStats[position];
        posData.playerCount++;
        posData.totalGoals += player.goals;
        posData.totalAssists += player.assists;
        posData.totalApps += player.totalAppearances;


        // Track top player in position
        if (!posData.topPlayer || player.goals > posData.topPlayer.goals) {
          posData.topPlayer = {
            name: player.name,
            goals: player.goals,
            assists: player.assists
          };
        }
      });


      // Calculate averages for each position
      Object.keys(positionStats).forEach(position => {
        const posData = positionStats[position];
        posData.averageGoals = posData.playerCount > 0 ? 
          Math.round((posData.totalGoals / posData.playerCount) * 10) / 10 : 0;
        posData.averageAssists = posData.playerCount > 0 ? 
          Math.round((posData.totalAssists / posData.playerCount) * 10) / 10 : 0;
      });


      return positionStats;
    } catch (error) {
      logger.error('Position stats calculation failed', { error: error.toString() });
      return {};
    }
  }


  /**
   * Find supersubs (players who perform better as substitutes)
   * @param {Array} players - Players array
   * @returns {Array} Supersub players
   */
  findSupersubs(players) {
    try {
      return players.filter(player => {
        return player.subs >= 3 && // At least 3 sub appearances
               player.subs > player.apps && // More sub than start appearances
               (player.goals + player.assists) > 0; // Has contributions
      }).map(player => ({
        name: player.name,
        subs: player.subs,
        starts: player.apps,
        goals: player.goals,
        assists: player.assists,
        contributionsPerSub: Math.round(((player.goals + player.assists) / player.subs) * 100) / 100
      })).sort((a, b) => b.contributionsPerSub - a.contributionsPerSub);
    } catch (error) {
      logger.error('Supersubs finding failed', { error: error.toString() });
      return [];
    }
  }


  /**
   * Find emerging talent (players with high potential)
   * @param {Array} players - Players array
   * @returns {Object} Emerging talent
   */
  findEmergingTalent(players) {
    try {
      // Look for players with good contribution ratio but lower total appearances
      const candidates = players.filter(p => 
        p.totalAppearances >= 3 && 
        p.totalAppearances <= 10 && 
        (p.goals + p.assists) > 0
      );


      if (candidates.length === 0) return null;


      const emergingTalent = candidates.reduce((emerging, current) => {
        const currentRatio = (current.goals + current.assists) / current.totalAppearances;
        const emergingRatio = emerging ? (emerging.goals + emerging.assists) / emerging.totalAppearances : 0;
        
        return currentRatio > emergingRatio ? current : emerging;
      }, null);


      if (!emergingTalent) return null;


      return {
        name: emergingTalent.name,
        totalApps: emergingTalent.totalAppearances,
        goals: emergingTalent.goals,
        assists: emergingTalent.assists,
        contributionRatio: Math.round(((emergingTalent.goals + emergingTalent.assists) / emergingTalent.totalAppearances) * 100) / 100,
        potential: 'High'
      };
    } catch (error) {
      logger.error('Emerging talent finding failed', { error: error.toString() });
      return null;
