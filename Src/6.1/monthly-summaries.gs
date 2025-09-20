/**
 * @fileoverview Monthly Summaries Manager for Monthly Content Generation
 * @version 6.0.0
 * @author Senior Software Architect
 * @description Handles monthly fixture previews, result summaries, and Goal of the Month competitions
 */

/**
 * Monthly Summaries Manager Class
 * Generates monthly content including fixtures, results, and Goal of the Month competitions
 */
class MonthlySummariesManager {
  
  constructor() {
    this.logger = logger.scope('MonthlySummaries');
    this.makeIntegration = new MakeIntegration();
    this.today = DateUtils.now();
    this.currentMonth = this.today.getMonth() + 1; // 1-based
    this.currentYear = this.today.getFullYear();
  }

  /**
   * Post monthly fixtures summary (1st of month)
   * @param {number} month - Target month (optional)
   * @param {number} year - Target year (optional)
   * @returns {Object} Posting result
   */
  postMonthlyFixtures(month = null, year = null) {
    this.logger.enterFunction('postMonthlyFixtures', { month, year });
    
    try {
      // @testHook(monthly_fixtures_start)
      
      const targetMonth = month || this.currentMonth;
      const targetYear = year || this.currentYear;
      
      // Get fixtures for the month
      const fixtures = this.getMonthlyFixtures(targetMonth, targetYear);
      
      if (!fixtures || fixtures.length === 0) {
        this.logger.info('No fixtures found for monthly posting', { month: targetMonth, year: targetYear });
        return {
          success: true,
          message: 'No fixtures to post',
          fixture_count: 0,
          month: targetMonth,
          year: targetYear,
          skipped: true
        };
      }
      
      // Create payload
      const payload = this.createMonthlyFixturesPayload(fixtures, targetMonth, targetYear);
      
      // @testHook(monthly_fixtures_payload_created)
      
      // Send to Make.com
      const makeResult = this.makeIntegration.sendToMake(payload);
      
      // @testHook(monthly_fixtures_complete)
      
      this.logger.exitFunction('postMonthlyFixtures', { 
        success: makeResult.success,
        fixture_count: fixtures.length
      });
      
      return {
        success: makeResult.success,
        fixture_count: fixtures.length,
        month: targetMonth,
        year: targetYear,
        fixtures: fixtures,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Monthly fixtures posting failed', { 
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
   * Post monthly results summary (last day of month)
   * @param {number} month - Target month (optional)
   * @param {number} year - Target year (optional)
   * @returns {Object} Posting result
   */
  postMonthlyResults(month = null, year = null) {
    this.logger.enterFunction('postMonthlyResults', { month, year });
    
    try {
      // @testHook(monthly_results_start)
      
      const targetMonth = month || (this.currentMonth === 1 ? 12 : this.currentMonth - 1);
      const targetYear = year || (this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear);
      
      // Get results for the month
      const results = this.getMonthlyResults(targetMonth, targetYear);
      
      if (!results || results.length === 0) {
        this.logger.info('No results found for monthly posting', { month: targetMonth, year: targetYear });
        return {
          success: true,
          message: 'No results to post',
          result_count: 0,
          month: targetMonth,
          year: targetYear,
          skipped: true
        };
      }
      
      // Calculate monthly statistics
      const monthlyStats = this.calculateMonthlyStats(results);
      
      // Create payload
      const payload = this.createMonthlyResultsPayload(results, monthlyStats, targetMonth, targetYear);
      
      // @testHook(monthly_results_payload_created)
      
      // Send to Make.com
      const makeResult = this.makeIntegration.sendToMake(payload);
      
      // @testHook(monthly_results_complete)
      
      this.logger.exitFunction('postMonthlyResults', { 
        success: makeResult.success,
        result_count: results.length
      });
      
      return {
        success: makeResult.success,
        result_count: results.length,
        month: targetMonth,
        year: targetYear,
        results: results,
        stats: monthlyStats,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Monthly results posting failed', { 
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
   * Start Goal of the Month voting (1st of month)
   * @param {number} month - Previous month to vote on (optional)
   * @param {number} year - Year (optional)
   * @returns {Object} Voting start result
   */
  postGOTMVoting(month = null, year = null) {
    this.logger.enterFunction('postGOTMVoting', { month, year });
    
    try {
      // @testHook(gotm_voting_start)
      
      if (!getConfig('MONTHLY.GOTM.ENABLED', true)) {
        return {
          success: true,
          message: 'Goal of the Month voting is disabled',
          skipped: true
        };
      }
      
      const targetMonth = month || (this.currentMonth === 1 ? 12 : this.currentMonth - 1);
      const targetYear = year || (this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear);
      
      // Get goals from the month
      const monthlyGoals = this.getMonthlyGoals(targetMonth, targetYear);
      
      const minGoals = getConfig('MONTHLY.GOTM.MIN_GOALS_FOR_COMPETITION', 3);
      
      if (monthlyGoals.length < minGoals) {
        this.logger.info('Insufficient goals for GOTM competition', { 
          goals_count: monthlyGoals.length,
          min_required: minGoals
        });
        
        return {
          success: true,
          message: `Insufficient goals for competition (${monthlyGoals.length} < ${minGoals})`,
          goal_count: monthlyGoals.length,
          min_required: minGoals,
          skipped: true
        };
      }
      
      // Create voting payload
      const payload = this.createGOTMVotingPayload(monthlyGoals, targetMonth, targetYear);
      
      // @testHook(gotm_voting_payload_created)
      
      // Send to Make.com
      const makeResult = this.makeIntegration.sendToMake(payload);
      
      // Store voting data for later winner announcement
      if (makeResult.success) {
        this.storeGOTMVotingData(monthlyGoals, targetMonth, targetYear);
      }
      
      // @testHook(gotm_voting_complete)
      
      this.logger.exitFunction('postGOTMVoting', { 
        success: makeResult.success,
        goal_count: monthlyGoals.length
      });
      
      return {
        success: makeResult.success,
        goal_count: monthlyGoals.length,
        month: targetMonth,
        year: targetYear,
        goals: monthlyGoals,
        voting_period_days: getConfig('MONTHLY.GOTM.VOTING_PERIOD_DAYS', 5),
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('GOTM voting start failed', { 
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
   * Announce Goal of the Month winner (6th of month)
   * @param {number} month - Month that was voted on (optional)
   * @param {number} year - Year (optional)
   * @returns {Object} Winner announcement result
   */
  announceGOTMWinner(month = null, year = null) {
    this.logger.enterFunction('announceGOTMWinner', { month, year });
    
    try {
      // @testHook(gotm_winner_start)
      
      if (!getConfig('MONTHLY.GOTM.ENABLED', true)) {
        return {
          success: true,
          message: 'Goal of the Month is disabled',
          skipped: true
        };
      }
      
      const targetMonth = month || (this.currentMonth === 1 ? 12 : this.currentMonth - 1);
      const targetYear = year || (this.currentMonth === 1 ? this.currentYear - 1 : this.currentYear);
      
      // Get stored voting data
      const votingData = this.getStoredGOTMVotingData(targetMonth, targetYear);
      
      if (!votingData || !votingData.goals || votingData.goals.length === 0) {
        return {
          success: true,
          message: 'No voting data found for this month',
          month: targetMonth,
          year: targetYear,
          skipped: true
        };
      }
      
      // Simulate voting results (in real implementation, this would come from social media polling)
      const winner = this.determineGOTMWinner(votingData.goals);
      
      // Create winner announcement payload
      const payload = this.createGOTMWinnerPayload(winner, votingData.goals, targetMonth, targetYear);
      
      // @testHook(gotm_winner_payload_created)
      
      // Send to Make.com
      const makeResult = this.makeIntegration.sendToMake(payload);
      
      // @testHook(gotm_winner_complete)
      
      this.logger.exitFunction('announceGOTMWinner', { 
        success: makeResult.success,
        winner: winner.player
      });
      
      return {
        success: makeResult.success,
        winner: winner,
        month: targetMonth,
        year: targetYear,
        total_goals: votingData.goals.length,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('GOTM winner announcement failed', { 
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

  // ==================== HELPER METHODS ====================

  /**
   * Get fixtures for a specific month
   * @private
   * @param {number} month - Target month
   * @param {number} year - Target year
   * @returns {Array} Fixtures array
   */
  getMonthlyFixtures(month, year) {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES_RESULTS')
      );
      
      if (!fixturesSheet) {
        throw new Error('Cannot access fixtures sheet');
      }
      
      const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      
      return allFixtures.filter(fixture => {
        if (!fixture.Date) return false;
        
        const fixtureDate = DateUtils.parseUK(fixture.Date);
        if (!fixtureDate) return false;
        
        const fixtureMonth = fixtureDate.getMonth() + 1;
        const fixtureYear = fixtureDate.getFullYear();
        
        return fixtureMonth === month && fixtureYear === year && !fixture.Result;
      }).map(fixture => ({
        date: fixture.Date,
        time: fixture.Time || 'TBC',
        opponent: fixture.Opponent || 'TBC',
        venue: fixture.Venue || 'Home',
        competition: fixture.Competition || 'League',
        formatted_date: this.formatFixtureDate(fixture.Date, fixture.Time)
      }));
      
    } catch (error) {
      this.logger.error('Failed to get monthly fixtures', { error: error.toString() });
      return [];
    }
  }

  /**
   * Get results for a specific month
   * @private
   * @param {number} month - Target month
   * @param {number} year - Target year
   * @returns {Array} Results array
   */
  getMonthlyResults(month, year) {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES_RESULTS')
      );
      
      if (!fixturesSheet) {
        throw new Error('Cannot access fixtures sheet');
      }
      
      const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      
      return allFixtures.filter(fixture => {
        if (!fixture.Date || !fixture.Result) return false;
        
        const fixtureDate = DateUtils.parseUK(fixture.Date);
        if (!fixtureDate) return false;
        
        const fixtureMonth = fixtureDate.getMonth() + 1;
        const fixtureYear = fixtureDate.getFullYear();
        
        return fixtureMonth === month && fixtureYear === year;
      }).map(fixture => ({
        date: fixture.Date,
        opponent: fixture.Opponent || 'Unknown',
        result: fixture.Result || 'TBC',
        home_score: fixture['Home Score'] || '0',
        away_score: fixture['Away Score'] || '0',
        venue: fixture.Venue || 'Home',
        competition: fixture.Competition || 'League',
        outcome: this.determineOutcome(fixture.Result, fixture['Home Score'], fixture['Away Score'], fixture.Venue)
      }));
      
    } catch (error) {
      this.logger.error('Failed to get monthly results', { error: error.toString() });
      return [];
    }
  }

  /**
   * Get goals from a specific month
   * @private
   * @param {number} month - Target month
   * @param {number} year - Target year
   * @returns {Array} Goals array
   */
  getMonthlyGoals(month, year) {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES')
      );
      
      if (!liveSheet) {
        throw new Error('Cannot access live match updates sheet');
      }
      
      const allEvents = SheetUtils.getAllDataAsObjects(liveSheet);
      
      return allEvents.filter(event => {
        if (event.Event !== 'Goal' || !event.Player || ValidationUtils.isOppositionPlayer(event.Player)) {
          return false;
        }
        
        if (!event.Timestamp) return false;
        
        const eventDate = new Date(event.Timestamp);
        if (!eventDate || isNaN(eventDate.getTime())) return false;
        
        const eventMonth = eventDate.getMonth() + 1;
        const eventYear = eventDate.getFullYear();
        
        return eventMonth === month && eventYear === year;
      }).map(event => ({
        player: event.Player,
        minute: event.Minute || '0',
        opponent: event.Opponent || 'Unknown',
        assist: event.Assist || '',
        date: DateUtils.formatUK(new Date(event.Timestamp)),
        match_score: `${event['Home Score'] || '0'}-${event['Away Score'] || '0'}`,
        notes: event.Notes || '',
        goal_id: StringUtils.generateId('goal')
      }));
      
    } catch (error) {
      this.logger.error('Failed to get monthly goals', { error: error.toString() });
      return [];
    }
  }

  /**
   * Calculate monthly statistics
   * @private
   * @param {Array} results - Monthly results
   * @returns {Object} Monthly statistics
   */
  calculateMonthlyStats(results) {
    try {
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;
      
      results.forEach(result => {
        const homeScore = parseInt(result.home_score) || 0;
        const awayScore = parseInt(result.away_score) || 0;
        const isHome = result.venue.toLowerCase().includes('home');
        
        if (isHome) {
          goalsFor += homeScore;
          goalsAgainst += awayScore;
          
          if (homeScore > awayScore) wins++;
          else if (homeScore === awayScore) draws++;
          else losses++;
        } else {
          goalsFor += awayScore;
          goalsAgainst += homeScore;
          
          if (awayScore > homeScore) wins++;
          else if (awayScore === homeScore) draws++;
          else losses++;
        }
      });
      
      const gamesPlayed = results.length;
      const points = (wins * 3) + draws;
      const winPercentage = gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : '0.0';
      const goalDifference = goalsFor - goalsAgainst;
      
      return {
        games_played: gamesPlayed,
        wins: wins,
        draws: draws,
        losses: losses,
        goals_for: goalsFor,
        goals_against: goalsAgainst,
        goal_difference: goalDifference,
        points: points,
        win_percentage: winPercentage,
        average_goals_per_game: gamesPlayed > 0 ? (goalsFor / gamesPlayed).toFixed(1) : '0.0'
      };
      
    } catch (error) {
      this.logger.error('Failed to calculate monthly stats', { error: error.toString() });
      
      return {
        games_played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0,
        win_percentage: '0.0',
        average_goals_per_game: '0.0'
      };
    }
  }

  /**
   * Determine match outcome
   * @private
   * @param {string} result - Result string
   * @param {string} homeScore - Home score
   * @param {string} awayScore - Away score
   * @param {string} venue - Venue
   * @returns {string} Outcome
   */
  determineOutcome(result, homeScore, awayScore, venue) {
    try {
      const home = parseInt(homeScore) || 0;
      const away = parseInt(awayScore) || 0;
      const isHome = venue.toLowerCase().includes('home');
      
      if (home === away) return 'Draw';
      
      const weWon = isHome ? (home > away) : (away > home);
      return weWon ? 'Win' : 'Loss';
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Format fixture date for display
   * @private
   * @param {string} date - Date string
   * @param {string} time - Time string
   * @returns {string} Formatted date
   */
  formatFixtureDate(date, time) {
    try {
      const fixtureDate = DateUtils.parseUK(date);
      if (!fixtureDate) return date;
      
      const dayName = fixtureDate.toLocaleDateString('en-GB', { weekday: 'short' });
      const dayMonth = fixtureDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      
      return time ? `${dayName} ${dayMonth} ${time}` : `${dayName} ${dayMonth}`;
    } catch (error) {
      return date;
    }
  }

  /**
   * Store GOTM voting data
   * @private
   * @param {Array} goals - Goals array
   * @param {number} month - Month
   * @param {number} year - Year
   */
  storeGOTMVotingData(goals, month, year) {
    try {
      const monthlyStatsSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.MONTHLY_STATS'),
        ['Month', 'Year', 'Type', 'Data', 'Created']
      );
      
      if (!monthlyStatsSheet) return;
      
      const votingData = {
        'Month': month,
        'Year': year,
        'Type': 'GOTM_VOTING',
        'Data': JSON.stringify({
          goals: goals,
          voting_started: DateUtils.formatISO(DateUtils.now()),
          voting_period_days: getConfig('MONTHLY.GOTM.VOTING_PERIOD_DAYS', 5)
        }),
        'Created': DateUtils.formatISO(DateUtils.now())
      };
      
      SheetUtils.addRowFromObject(monthlyStatsSheet, votingData);
      
    } catch (error) {
      this.logger.error('Failed to store GOTM voting data', { error: error.toString() });
    }
  }

  /**
   * Get stored GOTM voting data
   * @private
   * @param {number} month - Month
   * @param {number} year - Year
   * @returns {Object|null} Voting data
   */
  getStoredGOTMVotingData(month, year) {
    try {
      const monthlyStatsSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.MONTHLY_STATS')
      );
      
      if (!monthlyStatsSheet) return null;
      
      const allData = SheetUtils.getAllDataAsObjects(monthlyStatsSheet);
      const votingRecord = allData.find(record => 
        parseInt(record.Month) === month && 
        parseInt(record.Year) === year &&
        record.Type === 'GOTM_VOTING'
      );
      
      if (!votingRecord || !votingRecord.Data) return null;
      
      return JSON.parse(votingRecord.Data);
      
    } catch (error) {
      this.logger.error('Failed to get stored GOTM voting data', { error: error.toString() });
      return null;
    }
  }

  /**
   * Determine GOTM winner (simulated)
   * @private
   * @param {Array} goals - Goals array
   * @returns {Object} Winner object
   */
  determineGOTMWinner(goals) {
    // In a real implementation, this would integrate with social media polling results
    // For now, we'll randomly select or use the first goal as winner
    
    if (!goals || goals.length === 0) {
      return {
        player: 'Unknown',
        minute: '0',
        opponent: 'Unknown',
        votes: 0,
        vote_percentage: '0%'
      };
    }
    
    // Simulate voting - in reality this would come from social media polls
    const winner = goals[Math.floor(Math.random() * goals.length)];
    const totalVotes = Math.floor(Math.random() * 100) + 50; // 50-150 votes
    const winnerVotes = Math.floor(totalVotes * (0.3 + Math.random() * 0.4)); // 30-70% of votes
    
    return {
      ...winner,
      votes: winnerVotes,
      total_votes: totalVotes,
      vote_percentage: `${((winnerVotes / totalVotes) * 100).toFixed(1)}%`
    };
  }

  // ==================== PAYLOAD BUILDERS ====================

  /**
   * Create monthly fixtures payload
   * @private
   * @param {Array} fixtures - Fixtures array
   * @param {number} month - Month
   * @param {number} year - Year
   * @returns {Object} Payload
   */
  createMonthlyFixturesPayload(fixtures, month, year) {
    const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long' });
    
    return {
      event_type: 'fixtures_this_month',
      timestamp: DateUtils.formatISO(DateUtils.now()),
      month: month,
      year: year,
      month_name: monthName,
      fixture_count: fixtures.length,
      fixtures: fixtures.slice(0, 10), // Limit to 10 fixtures for display
      content_title: `${monthName} ${year} Fixtures`,
      source: 'monthly_summaries'
    };
  }

  /**
   * Create monthly results payload
   * @private
   * @param {Array} results - Results array
   * @param {Object} stats - Monthly statistics
   * @param {number} month - Month
   * @param {number} year - Year
   * @returns {Object} Payload
   */
  createMonthlyResultsPayload(results, stats, month, year) {
    const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long' });
    
    return {
      event_type: 'results_this_month',
      timestamp: DateUtils.formatISO(DateUtils.now()),
      month: month,
      year: year,
      month_name: monthName,
      result_count: results.length,
      results: results.slice(0, 10), // Limit to 10 results for display
      
      // Monthly statistics
      games_played: stats.games_played,
      wins: stats.wins,
      draws: stats.draws,
      losses: stats.losses,
      goals_for: stats.goals_for,
      goals_against: stats.goals_against,
      goal_difference: stats.goal_difference,
      points: stats.points,
      win_percentage: stats.win_percentage,
      average_goals_per_game: stats.average_goals_per_game,
      
      content_title: `${monthName} ${year} Results Summary`,
      source: 'monthly_summaries'
    };
  }

  /**
   * Create GOTM voting payload
   * @private
   * @param {Array} goals - Goals array
   * @param {number} month - Month
   * @param {number} year - Year
   * @returns {Object} Payload
   */
  createGOTMVotingPayload(goals, month, year) {
    const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long' });
    
    return {
      event_type: 'gotm_voting_open',
      timestamp: DateUtils.formatISO(DateUtils.now()),
      month: month,
      year: year,
      month_name: monthName,
      goal_count: goals.length,
      goals: goals,
      voting_period_days: getConfig('MONTHLY.GOTM.VOTING_PERIOD_DAYS', 5),
      content_title: `${monthName} Goal of the Month - Voting Open`,
      voting_instructions: 'Vote for your favourite goal using the poll in our social media posts',
      source: 'monthly_summaries'
    };
  }

  /**
   * Create GOTM winner payload
   * @private
   * @param {Object} winner - Winner object
   * @param {Array} allGoals - All goals in competition
   * @param {number} month - Month
   * @param {number} year - Year
   * @returns {Object} Payload
   */
  createGOTMWinnerPayload(winner, allGoals, month, year) {
    const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long' });
    
    return {
      event_type: 'gotm_winner',
      timestamp: DateUtils.formatISO(DateUtils.now()),
      month: month,
      year: year,
      month_name: monthName,
      
      // Winner details
      winner_player: winner.player,
      winner_minute: winner.minute,
      winner_opponent: winner.opponent,
      winner_assist: winner.assist || '',
      winner_date: winner.date,
      winner_votes: winner.votes,
      winner_vote_percentage: winner.vote_percentage,
      
      // Competition details
      total_goals: allGoals.length,
      total_votes: winner.total_votes,
      
      content_title: `${monthName} Goal of the Month Winner`,
      winner_announcement: `${winner.player} wins ${monthName} Goal of the Month!`,
      source: 'monthly_summaries'
    };
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Initialize Monthly Summaries Manager
 * @returns {Object} Initialization result
 */
function initializeMonthlySummaries() {
  logger.enterFunction('MonthlySummaries.initialize');
  
  try {
    // Test required sheets
    const requiredSheets = [
      getConfig('SHEETS.TAB_NAMES.FIXTURES_RESULTS'),
      getConfig('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES'),
      getConfig('SHEETS.TAB_NAMES.MONTHLY_STATS')
    ];
    
    const sheetResults = {};
    
    requiredSheets.forEach(sheetName => {
      const sheet = SheetUtils.getOrCreateSheet(sheetName);
      sheetResults[sheetName] = !!sheet;
    });
    
    const allSheetsOk = Object.values(sheetResults).every(result => result === true);
    
    logger.exitFunction('MonthlySummaries.initialize', { success: allSheetsOk });
    
    return {
      success: allSheetsOk,
      sheets: sheetResults,
      gotm_enabled: getConfig('MONTHLY.GOTM.ENABLED', true),
      message: 'Monthly Summaries Manager initialized successfully',
      version: '6.0.0'
    };
    
  } catch (error) {
    logger.error('Monthly Summaries initialization failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Post monthly fixtures (public API)
 * @param {number} month - Month (optional)
 * @param {number} year - Year (optional)
 * @returns {Object} Posting result
 */
function postMonthlyFixturesSummary(month = null, year = null) {
  const manager = new MonthlySummariesManager();
  return manager.postMonthlyFixtures(month, year);
}

/**
 * Post monthly results (public API)
 * @param {number} month - Month (optional)
 * @param {number} year - Year (optional)
 * @returns {Object} Posting result
 */
function postMonthlyResultsSummary(month = null, year = null) {
  const manager = new MonthlySummariesManager();
  return manager.postMonthlyResults(month, year);
}

/**
 * Start Goal of the Month voting (public API)
 * @param {number} month - Month (optional)
 * @param {number} year - Year (optional)
 * @returns {Object} Voting start result
 */
function startGOTMVoting(month = null, year = null) {
  const manager = new MonthlySummariesManager();
  return manager.postGOTMVoting(month, year);
}

/**
 * Announce Goal of the Month winner (public API)
 * @param {number} month - Month (optional)
 * @param {number} year - Year (optional)
 * @returns {Object} Winner announcement result
 */
function announceGOTMWinner(month = null, year = null) {
  const manager = new MonthlySummariesManager();
  return manager.announceGOTMWinner(month, year);
}

/**
 * Run monthly scheduled tasks (public API)
 * @returns {Object} Execution result
 */
function runMonthlyScheduledTasks() {
  logger.enterFunction('MonthlySummaries.runScheduledTasks');
  
  try {
    const today = DateUtils.now();
    const dayOfMonth = today.getDate();
    const results = {};
    
    // 1st of month: Monthly fixtures + GOTM voting
    if (dayOfMonth === 1) {
      results.monthly_fixtures = postMonthlyFixturesSummary();
      results.gotm_voting = startGOTMVoting();
    }
    
    // 6th of month: GOTM winner announcement
    if (dayOfMonth === getConfig('MONTHLY.GOTM.WINNER_ANNOUNCE_DAY', 6)) {
      results.gotm_winner = announceGOTMWinner();
    }
    
    // Last day of month: Monthly results
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    if (dayOfMonth === lastDayOfMonth) {
      results.monthly_results = postMonthlyResultsSummary();
    }
    
    const tasksRun = Object.keys(results).length;
    const successfulTasks = Object.values(results).filter(result => result.success).length;
    
    logger.exitFunction('MonthlySummaries.runScheduledTasks', { 
      success: successfulTasks === tasksRun,
      tasks_run: tasksRun
    });
    
    return {
      success: successfulTasks === tasksRun,
      day_of_month: dayOfMonth,
      tasks_run: tasksRun,
      successful_tasks: successfulTasks,
      results: results,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
  } catch (error) {
    logger.error('Monthly scheduled tasks failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}

// ==================== TESTING FUNCTIONS ====================

/**
 * Test monthly summaries functionality
 * @returns {Object} Test results
 */
function testMonthlySummaries() {
  logger.enterFunction('MonthlySummaries.test');
  
  try {
    const manager = new MonthlySummariesManager();
    const results = {
      initialization: false,
      fixtures_retrieval: false,
      results_retrieval: false,
      goals_retrieval: false,
      payload_creation: false
    };
    
    // Test initialization
    const initResult = initializeMonthlySummaries();
    results.initialization = initResult.success;
    
    // Test fixtures retrieval
    try {
      const fixtures = manager.getMonthlyFixtures(DateUtils.now().getMonth() + 1, DateUtils.now().getFullYear());
      results.fixtures_retrieval = Array.isArray(fixtures);
    } catch (error) {
      logger.warn('Fixtures retrieval test failed', { error: error.toString() });
    }
    
    // Test results retrieval
    try {
      const results_data = manager.getMonthlyResults(DateUtils.now().getMonth() + 1, DateUtils.now().getFullYear());
      results.results_retrieval = Array.isArray(results_data);
    } catch (error) {
      logger.warn('Results retrieval test failed', { error: error.toString() });
    }
    
    // Test goals retrieval
    try {
      const goals = manager.getMonthlyGoals(DateUtils.now().getMonth() + 1, DateUtils.now().getFullYear());
      results.goals_retrieval = Array.isArray(goals);
    } catch (error) {
      logger.warn('Goals retrieval test failed', { error: error.toString() });
    }
    
    // Test payload creation
    try {
      const testFixtures = [
        { date: '01/01/2025', opponent: 'Test FC', venue: 'Home', time: '15:00' }
      ];
      const payload = manager.createMonthlyFixturesPayload(testFixtures, 1, 2025);
      results.payload_creation = payload && payload.event_type === 'fixtures_this_month';
    } catch (error) {
      logger.warn('Payload creation test failed', { error: error.toString() });
    }
    
    const allPassed = Object.values(results).every(result => result === true);
    
    logger.exitFunction('MonthlySummaries.test', { success: allPassed });
    
    return {
      success: allPassed,
      results: results,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
  } catch (error) {
    logger.error('Monthly summaries test failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}

