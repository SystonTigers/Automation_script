/**
 * @fileoverview Syston Tigers Automation - Enhanced Event Types and Monthly Summaries
 * @version 5.1.0
 * @author Senior Software Architect
 * 
 * Handles postponed matches, monthly summaries, and other enhanced event types per checklist
 * with rate limiting and idempotency. Includes Make.com router branches and Canva placeholders.
 */


/**
 * Enhanced Events Manager - Handles specialized event types and monthly summaries with idempotency
 * Per checklist: postponed posts, monthly fixtures/results summaries, and other enhanced events
 */
class EnhancedEventsManager extends BaseAutomationComponent {
  
  constructor() {
    super('EnhancedEventsManager');
    this.monthlyCache = new Map();
    this.processedEvents = new Set(); // For idempotency tracking
  }


  /**
   * Initialize enhanced events manager
   * @returns {boolean} Success status
   */
  doInitialize() {
    logger.enterFunction('EnhancedEventsManager.doInitialize');
    
    try {
      // Ensure required sheets exist
      const requiredSheets = [
        { 
          name: 'Enhanced_Events_Log', 
          headers: ['Timestamp', 'Event_Type', 'Details', 'Status', 'Posted'] 
        },
        { 
          name: 'Monthly_Summaries', 
          headers: ['Month_Year', 'Type', 'Count', 'Data', 'Posted', 'Created'] 
        },
        {
          name: 'Postponed_Matches',
          headers: ['Date', 'Opponent', 'Original_Date', 'Reason', 'New_Date', 'Posted', 'Timestamp']
        }
      ];


      for (const sheetConfig of requiredSheets) {
        const sheet = SheetUtils.getOrCreateSheet(sheetConfig.name, sheetConfig.headers);
        if (!sheet) {
          logger.error(`Failed to create required sheet: ${sheetConfig.name}`);
          return false;
        }
      }


      logger.exitFunction('EnhancedEventsManager.doInitialize', { success: true });
      return true;
    } catch (error) {
      logger.error('EnhancedEventsManager initialization failed', { error: error.toString() });
      return false;
    }
  }


  // ===== POSTPONED MATCHES (Per Checklist) =====


  /**
   * Post postponed match notification (per checklist requirement) with idempotency
   * @param {string} opponent - Opponent name
   * @param {Date} originalDate - Original match date
   * @param {string} reason - Postponement reason
   * @param {Date} newDate - New date if known (optional)
   * @param {string} competition - Competition type
   * @returns {Object} Posting result
   */
  postPostponed(opponent, originalDate, reason = '', newDate = null, competition = 'League') {
    logger.enterFunction('EnhancedEventsManager.postPostponed', {
      opponent, originalDate, reason, newDate, competition
    });


    return this.withLock(() => {
      try {
        // Generate event ID for idempotency
        const eventId = this.generateEventId('postponed', opponent, originalDate);
        if (this.processedEvents.has(eventId)) {
          logger.info('Postponed event already processed, skipping', { eventId });
          return { success: true, skipped: true, eventId };
        }


        logger.testHook('postponed_processing_start', { opponent, reason, eventId });


        // Validate input data
        const sanitizedData = this.validateAndSanitizePostponedData(
          opponent, originalDate, reason, newDate, competition
        );


        if (!sanitizedData.valid) {
          logger.error('Invalid postponed match data', sanitizedData.errors);
          return { success: false, error: 'Invalid data: ' + sanitizedData.errors.join(', ') };
        }


        // Build postponed event data
        const postponedData = {
          eventType: getConfig('EVENTS.POSTPONED'),
          opponent: sanitizedData.opponent,
          originalDate: sanitizedData.originalDate,
          originalDateFormatted: DateUtils.formatDate(sanitizedData.originalDate, 'EEEE dd MMMM yyyy'),
          reason: sanitizedData.reason,
          newDate: sanitizedData.newDate,
          newDateFormatted: sanitizedData.newDate ? 
            DateUtils.formatDate(sanitizedData.newDate, 'EEEE dd MMMM yyyy') : 'TBC',
          competition: sanitizedData.competition,
          timestamp: DateUtils.now().toISOString(),
          eventId: eventId
        };


        // Log the postponement
        const logResult = this.logPostponedMatch(postponedData);
        if (!logResult) {
          logger.error('Failed to log postponed event');
          return { success: false, error: 'Failed to log event' };
        }


        // Build payload for Make.com
        const payload = this.buildPostponedPayload(postponedData);
        
        // Post to Make.com with rate limiting
        const postResult = this.postEnhancedEventToMake(payload);


        // Mark as processed if successful
        if (postResult.success) {
          this.processedEvents.add(eventId);
        }


        const result = {
          success: postResult.success,
          eventType: 'match_postponed',
          eventId: eventId,
          opponent: sanitizedData.opponent,
          originalDate: postponedData.originalDateFormatted,
          reason: sanitizedData.reason,
          response: postResult.response
        };


        logger.exitFunction('EnhancedEventsManager.postPostponed', result);
        return result;


      } catch (error) {
        logger.error('Postponed posting failed', { error: error.toString() });
        return { success: false, error: error.toString() };
      }
    });
  }


  /**
   * Validate and sanitize postponed match data
   * @param {string} opponent - Opponent name
   * @param {Date} originalDate - Original match date
   * @param {string} reason - Postponement reason
   * @param {Date} newDate - New date if known
   * @param {string} competition - Competition type
   * @returns {Object} Validation result
   */
  validateAndSanitizePostponedData(opponent, originalDate, reason, newDate, competition) {
    const errors = [];
    const sanitized = {};


    // Validate opponent
    if (!opponent || typeof opponent !== 'string') {
      errors.push('Invalid opponent name');
      sanitized.opponent = 'Unknown Opponent';
    } else {
      sanitized.opponent = StringUtils.truncate(opponent.trim(), 50);
    }


    // Validate original date
    if (!originalDate || !(originalDate instanceof Date) || isNaN(originalDate.getTime())) {
      errors.push('Invalid original date');
      sanitized.originalDate = DateUtils.now();
    } else {
      sanitized.originalDate = originalDate;
    }


    // Validate reason
    sanitized.reason = reason ? StringUtils.truncate(reason.trim(), 200) : 'Weather conditions';


    // Validate new date (optional)
    if (newDate && (!(newDate instanceof Date) || isNaN(newDate.getTime()))) {
      errors.push('Invalid new date');
      sanitized.newDate = null;
    } else {
      sanitized.newDate = newDate;
    }


    // Validate competition
    sanitized.competition = competition && typeof competition === 'string' ? 
      StringUtils.truncate(competition.trim(), 30) : 'League';


    return {
      valid: errors.length === 0,
      errors: errors,
      ...sanitized
    };
  }


  /**
   * Build Make.com payload for postponed match with enhanced data
   * @param {Object} postponedData - Postponed event data
   * @returns {Object} Make.com payload
   */
  buildPostponedPayload(postponedData) {
    logger.testHook('postponed_payload_building', { opponent: postponedData.opponent });


    // Build payload with Canva placeholders per checklist
    const payload = {
      timestamp: DateUtils.now().toISOString(),
      event_type: getConfig(`MAKE.EVENT_MAPPINGS.match_postponed`, 'match_postponed_league'),
      source: 'apps_script_enhanced_events',
      event_id: postponedData.eventId,
      
      // Canva placeholders for postponed template
      opponent: postponedData.opponent,
      original_date: postponedData.originalDateFormatted,
      reason: postponedData.reason,
      new_date: postponedData.newDateFormatted,
      competition: postponedData.competition,
      
      // Enhanced data
      is_rearranged: !!postponedData.newDate,
      postponement_type: postponedData.newDate ? 'REARRANGED' : 'POSTPONED',
      days_notice: this.calculateDaysNotice(postponedData.originalDate),
      
      // Additional context
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      postponed_id: postponedData.eventId
    };


    return payload;
  }


  /**
   * Calculate days notice for postponement
   * @param {Date} originalDate - Original match date
   * @returns {number} Days of notice
   */
  calculateDaysNotice(originalDate) {
    try {
      const now = DateUtils.now();
      const timeDiff = originalDate.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      return Math.max(0, daysDiff);
    } catch (error) {
      return 0;
    }
  }


  // ===== MONTHLY SUMMARIES (Per Checklist) =====


  /**
   * Post monthly fixtures summary (per checklist requirement) with caching
   * @param {Date} monthDate - Month to summarize (default: next month)
   * @returns {Object} Summary result
   */
  postMonthlyFixturesSummary(monthDate = null) {
    logger.enterFunction('EnhancedEventsManager.postMonthlyFixturesSummary', { monthDate });


    try {
      if (!monthDate) {
        // Default to next month for fixtures
        const now = DateUtils.now();
        monthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }


      const monthStart = DateUtils.startOfMonth(monthDate);
      const monthEnd = DateUtils.endOfMonth(monthDate);
      const monthName = DateUtils.formatDate(monthDate, 'MMMM yyyy');


      // Check cache first
      const cacheKey = `fixtures_${monthName}`;
      if (this.monthlyCache.has(cacheKey)) {
        const cached = this.monthlyCache.get(cacheKey);
        if (DateUtils.now().getTime() - cached.timestamp < 3600000) { // 1 hour cache
          logger.info('Using cached fixtures summary', { monthName });
          return cached.result;
        }
      }


      logger.testHook('monthly_fixtures_gathering', { monthName });


      // Gather fixtures for the month
      const fixtures = this.gatherFixturesForPeriod(monthStart, monthEnd);
      
      if (fixtures.length === 0) {
        logger.info('No fixtures found for monthly summary', { monthName });
        return { success: true, count: 0, message: 'No fixtures for this month' };
      }


      // Generate summary ID for idempotency
      const summaryId = this.generateSummaryId('fixtures', monthName, fixtures);
      if (this.processedEvents.has(summaryId)) {
        logger.info('Monthly fixtures summary already processed', { summaryId });
        return { success: true, skipped: true, summaryId };
      }


      // Build summary data
      const summaryData = this.buildFixturesSummaryData(fixtures, monthName, monthDate);
      
      // Build payload for Make.com
      const payload = this.buildMonthlyFixturesPayload(summaryData, summaryId);
      
      // Post to Make.com with rate limiting
      const postResult = this.postEnhancedEventToMake(payload);


      // Log the monthly summary
      this.logMonthlySummary('fixtures', monthName, fixtures.length, summaryData, postResult);


      // Mark as processed if successful
      if (postResult.success) {
        this.processedEvents.add(summaryId);
      }


      const result = {
        success: postResult.success,
        type: 'fixtures_monthly',
        month: monthName,
        count: fixtures.length,
        summaryId: summaryId,
        fixtures: fixtures,
        response: postResult.response
      };


      // Cache the result
      this.monthlyCache.set(cacheKey, {
        result: result,
        timestamp: DateUtils.now().getTime()
      });


      logger.exitFunction('EnhancedEventsManager.postMonthlyFixturesSummary', result);
      return result;


    } catch (error) {
      logger.error('Monthly fixtures summary failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Post monthly results summary (per checklist requirement) with caching
   * @param {Date} monthDate - Month to summarize (default: previous month)
   * @returns {Object} Summary result
   */
  postMonthlyResultsSummary(monthDate = null) {
    logger.enterFunction('EnhancedEventsManager.postMonthlyResultsSummary', { monthDate });


    try {
      if (!monthDate) {
        // Default to previous month for results
        const now = DateUtils.now();
        monthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      }


      const monthStart = DateUtils.startOfMonth(monthDate);
      const monthEnd = DateUtils.endOfMonth(monthDate);
      const monthName = DateUtils.formatDate(monthDate, 'MMMM yyyy');


      // Check cache first
      const cacheKey = `results_${monthName}`;
      if (this.monthlyCache.has(cacheKey)) {
        const cached = this.monthlyCache.get(cacheKey);
        if (DateUtils.now().getTime() - cached.timestamp < 3600000) { // 1 hour cache
          logger.info('Using cached results summary', { monthName });
          return cached.result;
        }
      }


      logger.testHook('monthly_results_gathering', { monthName });


      // Gather results for the month
      const results = this.gatherResultsForPeriod(monthStart, monthEnd);
      
      if (results.length === 0) {
        logger.info('No results found for monthly summary', { monthName });
        return { success: true, count: 0, message: 'No results for this month' };
      }


      // Generate summary ID for idempotency
      const summaryId = this.generateSummaryId('results', monthName, results);
      if (this.processedEvents.has(summaryId)) {
        logger.info('Monthly results summary already processed', { summaryId });
        return { success: true, skipped: true, summaryId };
      }


      // Build summary data with statistics
      const summaryData = this.buildResultsSummaryData(results, monthName, monthDate);
      
      // Build payload for Make.com
      const payload = this.buildMonthlyResultsPayload(summaryData, summaryId);
      
      // Post to Make.com with rate limiting
      const postResult = this.postEnhancedEventToMake(payload);


      // Log the monthly summary
      this.logMonthlySummary('results', monthName, results.length, summaryData, postResult);


      // Mark as processed if successful
      if (postResult.success) {
        this.processedEvents.add(summaryId);
      }


      const result = {
        success: postResult.success,
        type: 'results_monthly',
        month: monthName,
        count: results.length,
        summaryId: summaryId,
        results: results,
        summary: summaryData,
        response: postResult.response
      };


      // Cache the result
      this.monthlyCache.set(cacheKey, {
        result: result,
        timestamp: DateUtils.now().getTime()
      });


      logger.exitFunction('EnhancedEventsManager.postMonthlyResultsSummary', result);
      return result;


    } catch (error) {
      logger.error('Monthly results summary failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  // ===== DATA GATHERING FOR SUMMARIES =====


  /**
   * Gather fixtures for a specific period with enhanced filtering
   * @param {Date} startDate - Period start
   * @param {Date} endDate - Period end
   * @returns {Array} Array of fixture objects
   */
  gatherFixturesForPeriod(startDate, endDate) {
    logger.testHook('period_fixtures_gathering', { startDate, endDate });


    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.FIXTURES'));
      if (!fixturesSheet) {
        logger.error('Fixtures sheet not found');
        return [];
      }


      const data = fixturesSheet.getDataRange().getValues();
      const fixtures = [];


      // Skip header row
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const [date, competition, homeTeam, awayTeam, venue, kickOff] = row;


        if (!date) continue;


        const fixtureDate = DateUtils.parseDate(date);
        if (!fixtureDate) continue;


        if (fixtureDate >= startDate && fixtureDate <= endDate) {
          const opponent = this.getOpponentName(homeTeam, awayTeam);
          const homeAway = this.isHomeGame(homeTeam, awayTeam) ? 'HOME' : 'AWAY';


          fixtures.push({
            date: fixtureDate,
            dateFormatted: DateUtils.formatDate(fixtureDate, 'dd MMM'),
            dayOfWeek: DateUtils.formatDate(fixtureDate, 'EEE'),
            fullDateFormatted: DateUtils.formatDate(fixtureDate, 'EEEE dd MMMM yyyy'),
            competition: competition || 'League',
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            venue: venue || 'TBC',
            kickOff: kickOff || '15:00',
            opponent: opponent,
            homeAway: homeAway,
            isHomeGame: homeAway === 'HOME'
          });
        }
      }


      // Sort by date
      fixtures.sort((a, b) => a.date - b.date);


      return fixtures;


    } catch (error) {
      logger.error('Failed to gather fixtures for period', { error: error.toString() });
      return [];
    }
  }


  /**
   * Gather results for a specific period with enhanced data
   * @param {Date} startDate - Period start
   * @param {Date} endDate - Period end
   * @returns {Array} Array of result objects
   */
  gatherResultsForPeriod(startDate, endDate) {
    logger.testHook('period_results_gathering', { startDate, endDate });


    try {
      const resultsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.RESULTS'));
      if (!resultsSheet) {
        logger.error('Results sheet not found');
        return [];
      }


      const data = resultsSheet.getDataRange().getValues();
      const results = [];


      // Skip header row
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const [date, competition, homeTeam, awayTeam, homeScore, awayScore, venue] = row;


        if (!date) continue;


        const resultDate = DateUtils.parseDate(date);
        if (!resultDate) continue;


        if (resultDate >= startDate && resultDate <= endDate) {
          const opponent = this.getOpponentName(homeTeam, awayTeam);
          const homeAway = this.isHomeGame(homeTeam, awayTeam) ? 'HOME' : 'AWAY';
          const result = this.calculateMatchResult(homeTeam, awayTeam, homeScore, awayScore);


          results.push({
            date: resultDate,
            dateFormatted: DateUtils.formatDate(resultDate, 'dd MMM'),
            dayOfWeek: DateUtils.formatDate(resultDate, 'EEE'),
            fullDateFormatted: DateUtils.formatDate(resultDate, 'EEEE dd MMMM yyyy'),
            competition: competition || 'League',
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            homeScore: parseInt(homeScore) || 0,
            awayScore: parseInt(awayScore) || 0,
            venue: venue || '',
            opponent: opponent,
            homeAway: homeAway,
            result: result,
            scoreString: `${homeScore}-${awayScore}`,
            isHomeGame: homeAway === 'HOME'
          });
        }
      }


      // Sort by date
      results.sort((a, b) => a.date - b.date);


      return results;


    } catch (error) {
      logger.error('Failed to gather results for period', { error: error.toString() });
      return [];
    }
  }


  // ===== SUMMARY DATA BUILDING =====


  /**
   * Build fixtures summary data with enhanced analytics
   * @param {Array} fixtures - Fixtures array
   * @param {string} monthName - Month name
   * @param {Date} monthDate - Month date
   * @returns {Object} Summary data
   */
  buildFixturesSummaryData(fixtures, monthName, monthDate) {
    logger.testHook('fixtures_summary_building', { 
      fixtureCount: fixtures.length, 
      monthName 
    });


    try {
      // Group fixtures by competition
      const byCompetition = fixtures.reduce((acc, fixture) => {
        const comp = fixture.competition;
        if (!acc[comp]) acc[comp] = [];
        acc[comp].push(fixture);
        return acc;
      }, {});


      // Count home vs away
      const homeGames = fixtures.filter(f => f.homeAway === 'HOME').length;
      const awayGames = fixtures.filter(f => f.homeAway === 'AWAY').length;


      // Analyze fixture distribution
      const weekdays = fixtures.filter(f => f.date.getDay() >= 1 && f.date.getDay() <= 5).length;
      const weekends = fixtures.filter(f => f.date.getDay() === 0 || f.date.getDay() === 6).length;


      // Key dates (first and last fixture)
      const keyDates = [];
      if (fixtures.length > 0) {
        keyDates.push({
          type: 'First fixture',
          date: fixtures[0].dateFormatted,
          fullDate: fixtures[0].fullDateFormatted,
          opponent: fixtures[0].opponent,
          homeAway: fixtures[0].homeAway
        });
        
        if (fixtures.length > 1) {
          const last = fixtures[fixtures.length - 1];
          keyDates.push({
            type: 'Last fixture',
            date: last.dateFormatted,
            fullDate: last.fullDateFormatted,
            opponent: last.opponent,
            homeAway: last.homeAway
          });
        }
      }


      // Busiest period analysis
      const weekCounts = {};
      fixtures.forEach(fixture => {
        const weekStart = new Date(fixture.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = DateUtils.formatDate(weekStart, 'dd MMM');
        weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1;
      });


      const busiestWeek = Object.keys(weekCounts).reduce((a, b) => 
        weekCounts[a] > weekCounts[b] ? a : b, Object.keys(weekCounts)[0]);


      return {
        month: monthName,
        totalFixtures: fixtures.length,
        homeGames: homeGames,
        awayGames: awayGames,
        competitions: Object.keys(byCompetition),
        competitionBreakdown: byCompetition,
        keyDates: keyDates,
        fixtureDistribution: {
          weekdays: weekdays,
          weekends: weekends,
          busiestWeek: busiestWeek,
          busiestWeekCount: weekCounts[busiestWeek] || 0
        },
        fixtures: fixtures,
        generatedAt: DateUtils.now().toISOString()
      };


    } catch (error) {
      logger.error('Failed to build fixtures summary', { error: error.toString() });
      return null;
    }
  }


  /**
   * Build results summary data with comprehensive statistics
   * @param {Array} results - Results array
   * @param {string} monthName - Month name
   * @param {Date} monthDate - Month date
   * @returns {Object} Summary data
   */
  buildResultsSummaryData(results, monthName, monthDate) {
    logger.testHook('results_summary_building', { 
      resultCount: results.length, 
      monthName 
    });


    try {
      // Calculate basic statistics
      const wins = results.filter(r => r.result === 'W').length;
      const draws = results.filter(r => r.result === 'D').length;
      const losses = results.filter(r => r.result === 'L').length;


      // Goal statistics
      const goalsScored = results.reduce((total, r) => {
        return total + (r.homeAway === 'HOME' ? r.homeScore : r.awayScore);
      }, 0);
      
      const goalsConceded = results.reduce((total, r) => {
        return total + (r.homeAway === 'HOME' ? r.awayScore : r.homeScore);
      }, 0);


      // Home vs Away record
      const homeResults = results.filter(r => r.homeAway === 'HOME');
      const awayResults = results.filter(r => r.homeAway === 'AWAY');


      const homeRecord = {
        played: homeResults.length,
        won: homeResults.filter(r => r.result === 'W').length,
        drawn: homeResults.filter(r => r.result === 'D').length,
        lost: homeResults.filter(r => r.result === 'L').length
      };


      const awayRecord = {
        played: awayResults.length,
        won: awayResults.filter(r => r.result === 'W').length,
        drawn: awayResults.filter(r => r.result === 'D').length,
        lost: awayResults.filter(r => r.result === 'L').length
      };


      // Form analysis (last 5 games)
      const recentForm = results.slice(-5).map(r => r.result).join('');
      const formPoints = results.slice(-5).reduce((total, r) => {
        if (r.result === 'W') return total + 3;
        if (r.result === 'D') return total + 1;
        return total;
      }, 0);


      // Best and worst results
      const sortedResults = [...results].sort((a, b) => {
        const aGoalDiff = (a.homeAway === 'HOME' ? a.homeScore - a.awayScore : a.awayScore - a.homeScore);
        const bGoalDiff = (b.homeAway === 'HOME' ? b.homeScore - b.awayScore : b.awayScore - b.homeScore);
        return bGoalDiff - aGoalDiff;
      });


      const bestResult = sortedResults[0] || null;
      const worstResult = sortedResults[sortedResults.length - 1] || null;


      // Clean sheets and scoring streaks
      const cleanSheets = results.filter(r => {
        const conceded = r.homeAway === 'HOME' ? r.awayScore : r.homeScore;
        return conceded === 0;
      }).length;


      const scoringGames = results.filter(r => {
        const scored = r.homeAway === 'HOME' ? r.homeScore : r.awayScore;
        return scored > 0;
      }).length;


      return {
        month: monthName,
        totalGames: results.length,
        record: { wins, draws, losses },
        winPercentage: Math.round((wins / results.length) * 100),
        pointsEarned: (wins * 3) + draws,
        averagePointsPerGame: Math.round(((wins * 3 + draws) / results.length) * 10) / 10,
        
        goals: {
          scored: goalsScored,
          conceded: goalsConceded,
          difference: goalsScored - goalsConceded,
          averageScored: Math.round((goalsScored / results.length) * 10) / 10,
          averageConceded: Math.round((goalsConceded / results.length) * 10) / 10
        },


        homeRecord: homeRecord,
        awayRecord: awayRecord,
        
        form: {
          recent: recentForm,
          recentPoints: formPoints,
          recentPercentage: Math.round((formPoints / 15) * 100) // Out of max 15 points
        },


        highlights: {
          bestResult: bestResult,
          worstResult: worstResult,
          cleanSheets: cleanSheets,
          scoringGames: scoringGames,
          scoringPercentage: Math.round((scoringGames / results.length) * 100)
        },


        results: results,
        generatedAt: DateUtils.now().toISOString()
      };


    } catch (error) {
      logger.error('Failed to build results summary', { error: error.toString() });
      return null;
    }
  }


  // ===== PAYLOAD BUILDING FOR MAKE.COM =====


  /**
   * Build monthly fixtures payload with comprehensive Canva placeholders
   * @param {Object} summaryData - Summary data
   * @param {string} summaryId - Summary ID
   * @returns {Object} Make.com payload
   */
  buildMonthlyFixturesPayload(summaryData, summaryId) {
    logger.testHook('monthly_fixtures_payload_building', { 
      month: summaryData.month,
      count: summaryData.totalFixtures
    });


    // Build payload with all Canva placeholders per checklist
    const payload = {
      timestamp: DateUtils.now().toISOString(),
      event_type: getConfig('MAKE.EVENT_MAPPINGS.fixtures_this_month', 'fixtures_monthly'),
      source: 'apps_script_monthly_summary',
      summary_id: summaryId,
      
      // Core Canva placeholders per checklist requirement
      month_name: summaryData.month,
      fixture_count: summaryData.totalFixtures,
      fixtures_list: summaryData.fixtures,
      key_dates: summaryData.keyDates,
      
      // Enhanced placeholders for comprehensive templates
      home_games: summaryData.homeGames,
      away_games: summaryData.awayGames,
      competitions: summaryData.competitions,
      competition_breakdown: summaryData.competitionBreakdown,
      fixture_distribution: summaryData.fixtureDistribution,
      
      // Context and metadata
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      generated_at: summaryData.generatedAt
    };


    return payload;
  }


  /**
   * Build monthly results payload with comprehensive Canva placeholders
   * @param {Object} summaryData - Summary data
   * @param {string} summaryId - Summary ID
   * @returns {Object} Make.com payload
   */
  buildMonthlyResultsPayload(summaryData, summaryId) {
    logger.testHook('monthly_results_payload_building', { 
      month: summaryData.month,
      count: summaryData.totalGames
    });


    // Build payload with all Canva placeholders per checklist
    const payload = {
      timestamp: DateUtils.now().toISOString(),
      event_type: getConfig('MAKE.EVENT_MAPPINGS.results_this_month', 'results_monthly'),
      source: 'apps_script_monthly_summary',
      summary_id: summaryId,
      
      // Core Canva placeholders per checklist requirement
      month_name: summaryData.month,
      result_count: summaryData.totalGames,
      results_summary: summaryData,
      key_stats: {
        wins: summaryData.record.wins,
        draws: summaryData.record.draws,
        losses: summaryData.record.losses,
        goals_scored: summaryData.goals.scored,
        goals_conceded: summaryData.goals.conceded,
        win_percentage: summaryData.winPercentage,
        points_earned: summaryData.pointsEarned
      },
      
      // Enhanced data for comprehensive templates
      home_record: summaryData.homeRecord,
      away_record: summaryData.awayRecord,
      best_result: summaryData.highlights.bestResult,
      worst_result: summaryData.highlights.worstResult,
      clean_sheets: summaryData.highlights.cleanSheets,
      recent_form: summaryData.form,
      goal_stats: summaryData.goals,
      results_list: summaryData.results,
      
      // Context and metadata
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      generated_at: summaryData.generatedAt
    };


    return payload;
  }


  // ===== UTILITY METHODS =====


  /**
   * Generate unique event ID for idempotency
   * @param {string} eventType - Event type
   * @param {string} key - Key identifier
   * @param {Date} date - Associated date
   * @returns {string} Unique event ID
   */
  generateEventId(eventType, key, date) {
    const datePart = DateUtils.formatDate(date, 'yyyyMMdd');
    const keyPart = StringUtils.normalize(key);
    return `${eventType}_${keyPart}_${datePart}`;
  }


  /**
   * Generate unique summary ID for idempotency
   * @param {string} type - Summary type
   * @param {string} monthName - Month name
   * @param {Array} items - Items in summary
   * @returns {string} Unique summary ID
   */
  generateSummaryId(type, monthName, items) {
    const monthPart = StringUtils.normalize(monthName.replace(' ', ''));
    const countPart = items.length;
    return `${type}_${monthPart}_${countPart}`;
  }


  /**
   * Get opponent name from match data
   * @param {string} homeTeam - Home team
   * @param {string} awayTeam - Away team
   * @returns {string} Opponent name
   */
  getOpponentName(homeTeam, awayTeam) {
    const clubName = getConfig('SYSTEM.CLUB_NAME', 'Syston');
    if (homeTeam.includes('Syston') || homeTeam.includes('Tigers')) {
      return awayTeam;
    } else {
      return homeTeam;
    }
  }


  /**
   * Check if this is a home game
   * @param {string} homeTeam - Home team
   * @param {string} awayTeam - Away team
   * @returns {boolean} Is home game
   */
  isHomeGame(homeTeam, awayTeam) {
    return homeTeam.includes('Syston') || homeTeam.includes('Tigers');
  }


  /**
   * Calculate match result from our perspective
   * @param {string} homeTeam - Home team
   * @param {string} awayTeam - Away team
   * @param {number} homeScore - Home score
   * @param {number} awayScore - Away score
   * @returns {string} W/L/D result
   */
  calculateMatchResult(homeTeam, awayTeam, homeScore, awayScore) {
    const isHome = this.isHomeGame(homeTeam, awayTeam);
    const ourScore = isHome ? parseInt(homeScore) : parseInt(awayScore);
    const theirScore = isHome ? parseInt(awayScore) : parseInt(homeScore);


    if (ourScore > theirScore) return 'W';
    if (ourScore < theirScore) return 'L';
    return 'D';
  }


  /**
   * Log postponed match to tracking sheet
   * @param {Object} postponedData - Postponed data
   * @returns {boolean} Success status
   */
  logPostponedMatch(postponedData) {
    try {
      const postponedSheet = SheetUtils.getOrCreateSheet(
        'Postponed_Matches',
        ['Date', 'Opponent', 'Original_Date', 'Reason', 'New_Date', 'Posted', 'Timestamp']
      );
      
      if (!postponedSheet) return false;


      const values = [
        DateUtils.formatDate(DateUtils.now()),
        postponedData.opponent,
        postponedData.originalDateFormatted,
        postponedData.reason,
        postponedData.newDateFormatted,
        'N',
        postponedData.timestamp
      ];


      return SheetUtils.appendRowSafe(postponedSheet, values);
    } catch (error) {
      logger.error('Failed to log postponed match', { error: error.toString() });
      return false;
    }
  }


  /**
   * Log enhanced event to tracking sheet
   * @param {Object} eventData - Event data
   * @returns {boolean} Success status
   */
  logEnhancedEvent(eventData) {
    try {
      const enhancedSheet = SheetUtils.getOrCreateSheet(
        'Enhanced_Events_Log',
        ['Timestamp', 'Event_Type', 'Details', 'Status', 'Posted']
      );
      
      if (!enhancedSheet) return false;


      const values = [
        DateUtils.now().toISOString(),
        eventData.eventType,
        JSON.stringify(eventData).substr(0, 1000),
        'PROCESSED',
        'N'
      ];


      return SheetUtils.appendRowSafe(enhancedSheet, values);
    } catch (error) {
      logger.error('Failed to log enhanced event', { error: error.toString() });
      return false;
    }
  }


  /**
   * Log monthly summary to tracking sheet with enhanced data
   * @param {string} type - Summary type (fixtures/results)
   * @param {string} monthName - Month name
   * @param {number} count - Item count
   * @param {Object} data - Summary data
   * @param {Object} postResult - Posting result
   * @returns {boolean} Success status
   */
  logMonthlySummary(type, monthName, count, data, postResult) {
    try {
      const summarySheet = SheetUtils.getOrCreateSheet(
        'Monthly_Summaries',
        ['Month_Year', 'Type', 'Count', 'Data', 'Posted', 'Created', 'Status', 'Response']
      );
      
      if (!summarySheet) return false;


      const values = [
        monthName,
        type,
        count,
        JSON.stringify(data).substr(0, 2000),
        postResult.success ? 'Y' : 'N',
        DateUtils.now().toISOString(),
        postResult.success ? 'SUCCESS' : 'FAILED',
        JSON.stringify(postResult).substr(0, 1000)
      ];


      return SheetUtils.appendRowSafe(summarySheet, values);
    } catch (error) {
      logger.error('Failed to log monthly summary', { error: error.toString() });
      return false;
    }
  }


  /**
   * Post enhanced event to Make.com with rate limiting
   * @param {Object} payload - Payload data
   * @returns {Object} Posting result
   */
  postEnhancedEventToMake(payload) {
    logger.testHook('enhanced_event_make_posting', { eventType: payload.event_type });
    
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


      // Log the enhanced event post
      this.logEnhancedEventPost(payload, response);


      return {
        success: response.success,
        response: response
      };


    } catch (error) {
      logger.error('Failed to post enhanced event to Make.com', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Log enhanced event post to tracking sheet
   * @param {Object} payload - Payload sent
   * @param {Object} response - API response
   * @returns {boolean} Success status
   */
  logEnhancedEventPost(payload, response) {
    try {
      const socialSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.SOCIAL_POSTS'),
        ['Timestamp', 'Event_Type', 'Payload', 'Status', 'Response']
      );
      
      if (!socialSheet) return false;


      const values = [
        DateUtils.now().toISOString(),
        payload.event_type,
        JSON.stringify(payload).substr(0, 2000),
        response.success ? 'SUCCESS' : 'FAILED',
        JSON.stringify(response).substr(0, 1000)
      ];


      return SheetUtils.appendRowSafe(socialSheet, values);
    } catch (error) {
      logger.error('Failed to log enhanced event post', { error: error.toString() });
      return false;
    }
  }


  /**
   * Clear monthly cache (useful for testing or manual refresh)
   */
  clearMonthlyCache() {
    this.monthlyCache.clear();
    logger.info('Monthly summary cache cleared');
  }
}


// ===== MAKE.COM ROUTER BRANCHES FOR ENHANCED EVENTS =====


/**
 * Make.com Router Branch Configurations for Enhanced Events
 */
const ENHANCED_EVENTS_ROUTER_BRANCHES = {
  
  // Postponed match branch
  MATCH_POSTPONED: {
    "filter": {
      "condition": "AND",
      "rules": [
        {
          "field": "event_type",
          "operator": "equal",
          "value": "match_postponed_league"
        }
      ]
    },
    "modules": [
      {
        "name": "Canva - Create design",
        "template_id": "MATCH_POSTPONED_TEMPLATE_ID",
        "placeholders": [
          "opponent", "original_date", "reason", "new_date", "competition", "club_name"
        ]
      }
    ]
  },


  // 2nd half kick off branch  
  SECOND_HALF_KICKOFF: {
    "filter": {
      "condition": "AND",
      "rules": [
        {
          "field": "event_type",
          "operator": "equal",
          "value": "second_half_start"
        }
      ]
    },
    "modules": [
      {
        "name": "Canva - Create design",
        "template_id": "SECOND_HALF_TEMPLATE_ID",
        "placeholders": [
          "match_info", "home_score", "away_score", "club_name"
        ]
      }
    ]
  },


  // Monthly fixtures summary branch
  MONTHLY_FIXTURES: {
    "filter": {
      "condition": "AND",
      "rules": [
        {
          "field": "event_type",
          "operator": "equal",
          "value": "fixtures_monthly"
        }
      ]
    },
    "modules": [
      {
        "name": "Canva - Create design",
        "template_id": "MONTHLY_FIXTURES_TEMPLATE_ID",
        "placeholders": [
          "month_name", "fixture_count", "fixtures_list", "key_dates", "home_games", "away_games", "competitions", "club_name"
        ]
      }
    ]
  },


  // Monthly results summary branch
  MONTHLY_RESULTS: {
    "filter": {
      "condition": "AND",
      "rules": [
        {
          "field": "event_type",
          "operator": "equal",
          "value": "results_monthly"
        }
      ]
    },
    "modules": [
      {
        "name": "Canva - Create design",
        "template_id": "MONTHLY_RESULTS_TEMPLATE_ID",
        "placeholders": [
          "month_name", "result_count", "key_stats", "home_record", "away_record", "best_result", "clean_sheets", "club_name"
        ]
      }
    ]
  }
};


// ===== CANVA PLACEHOLDERS FOR ENHANCED EVENTS =====


/**
 * Required Canva placeholders for enhanced event templates
 */
const ENHANCED_EVENTS_CANVA_PLACEHOLDERS = {
  
  // Postponed match placeholders
  POSTPONED: [
    'opponent',           // Opponent name
    'original_date',      // Original date formatted
    'reason',             // Postponement reason
    'new_date',           // New date or 'TBC'
    'competition',        // Competition name
    'club_name',          // Club name
    'season',             // Season
    'is_rearranged',      // Boolean - has new date
    'days_notice'         // Days of notice given
  ],


  // 2nd half kick off placeholders
  SECOND_HALF: [
    'match_info',         // Match info string
    'home_score',         // Current home score
    'away_score',         // Current away score
    'club_name'           // Club name
  ],


  // Monthly fixtures placeholders
  MONTHLY_FIXTURES: [
    'month_name',         // Month and year
    'fixture_count',      // Total fixtures
    'fixtures_list',      // Array of fixtures
    'key_dates',          // Important dates array
    'home_games',         // Home games count
    'away_games',         // Away games count
    'competitions',       // Competitions array
    'fixture_distribution', // Weekday/weekend breakdown
    'club_name',          // Club name
    'season'              // Season
  ],


  // Monthly results placeholders
  MONTHLY_RESULTS: [
    'month_name',         // Month and year
    'result_count',       // Total results
    'key_stats',          // Statistics object
    'home_record',        // Home record object
    'away_record',        // Away record object
    'best_result',        // Best result object
    'worst_result',       // Worst result object
    'clean_sheets',       // Clean sheets count
    'recent_form',        // Form analysis
    'goal_stats',         // Goal statistics
    'results_list',       // Array of results
    'club_name',          // Club name
    'season'              // Season
  ]
};


// Create and export singleton instance
const enhancedEventsManager = new EnhancedEventsManager();


// Export for global access
globalThis.EnhancedEventsManager = EnhancedEventsManager;
globalThis.enhancedEventsManager = enhancedEventsManager;
globalThis.ENHANCED_EVENTS_ROUTER_BRANCHES = ENHANCED_EVENTS_ROUTER_BRANCHES;
globalThis.ENHANCED_EVENTS_CANVA_PLACEHOLDERS = ENHANCED_EVENTS_CANVA_PLACEHOLDERS;
