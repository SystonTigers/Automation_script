/**
   * Post league fixtures batch (NEW: From spec)
   * @param {string} roundId - Round/weekend identifier
   * @param {Date} startDate - Start date for fixtures
   * @param {Date} endDate - End date for fixtures
   * @returns {Object} Posting result
   */
  postLeagueFixturesBatch(roundId = null, startDate = null, endDate = null) {
    this.logger.enterFunction('postLeagueFixturesBatch', { roundId, startDate, endDate });
    
    try {
      // @testHook(batch_fixtures_start)
      
      // Generate idempotency key
      const idempotencyKey = this.generateBatchKey('fixtures', roundId, startDate, endDate);
      if (this.isDuplicateRequest(idempotencyKey)) {
        return { success: true, message: 'Already processed', duplicate: true };
      }
      
      // Get league fixtures for the period
      const fixtures = this.getLeagueFixtures(startDate, endDate);
      const fixtureCount = fixtures.length;
      
      if (fixtureCount === 0) {
        this.logger.info('No fixtures found for batch posting');
        return { success: true, count: 0, message: 'No fixtures to post' };
      }
      
      if (fixtureCount > 5) {
        this.logger.warn('Too many fixtures for batch posting', { count: fixtureCount });
        return { success: false, error: 'Maximum 5 fixtures per batch' };
      }
      
      // Create batch payload
      const eventType = `fixtures_${fixtureCount}_league`;
      const payload = this.createFixturesBatchPayload(fixtures, eventType, roundId);
      
      // @testHook(batch_fixtures_webhook)
      const webhookResult = this.sendBatchToMake(payload);
      
      if (webhookResult.success) {
        this.markFixturesAsPosted(fixtures);
        this.processedKeys.add(idempotencyKey);
      }
      
      this.logger.exitFunction('postLeagueFixturesBatch', { 
        success: webhookResult.success, 
        count: fixtureCount 
      });
      
      return {
        success: webhookResult.success,
        count: fixtureCount,
        event_type: eventType,
        fixtures: fixtures,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Batch fixtures posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Post league results batch (NEW: From spec)
   * @param {string} roundId - Round/weekend identifier
   * @param {Date} startDate - Start date for results
   * @param {Date} endDate - End date for results
   * @returns {Object} Posting result
   */
  postLeagueResultsBatch(roundId = null, startDate = null, endDate = null) {
    this.logger.enterFunction('postLeagueResultsBatch', { roundId, startDate, endDate });
    
    try {
      // @testHook(batch_results_start)
      
      // Generate idempotency key
      const idempotencyKey = this.generateBatchKey('results', roundId, startDate, endDate);
      if (this.isDuplicateRequest(idempotencyKey)) {
        return { success: true, message: 'Already processed', duplicate: true };
      }
      
      // Get league results for the period
      const results = this.getLeagueResults(startDate, endDate);
      const resultCount = results.length;
      
      if (resultCount === 0) {
        this.logger.info('No results found for batch posting');
        return { success: true, count: 0, message: 'No results to post' };
      }
      
      if (resultCount > 5) {
        this.logger.warn('Too many results for batch posting', { count: resultCount });
        return { success: false, error: 'Maximum 5 results per batch' };
      }
      
      // Create batch payload
      const eventType = `results_${resultCount}_league`;
      const payload = this.createResultsBatchPayload(results, eventType, roundId);
      
      // @testHook(batch_results_webhook)
      const webhookResult = this.sendBatchToMake(payload);
      
      if (webhookResult.success) {
        this.markResultsAsPosted(results);
        this.processedKeys.add(idempotencyKey);
      }
      
      this.logger.exitFunction('postLeagueResultsBatch', { 
        success: webhookResult.success, 
        count: resultCount 
      });
      
      return {
        success: webhookResult.success,
        count: resultCount,
        event_type: eventType,
        results: results,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Batch results posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== MONTHLY SUMMARIES ====================

  /**
   * Post monthly fixtures summary (NEW: From spec)
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Object} Posting result
   */
  postMonthlyFixturesSummary(month = null, year = null) {
    this.logger.enterFunction('postMonthlyFixturesSummary', { month, year });
    
    try {
      // @testHook(monthly_fixtures_start)
      
      // Default to current month if not specified
      const now = DateUtils.now();
      const targetMonth = month || (now.getMonth() + 1);
      const targetYear = year || now.getFullYear();
      
      // Generate idempotency key
      const idempotencyKey = `monthly_fixtures_${targetYear}_${targetMonth}`;
      if (this.isDuplicateRequest(idempotencyKey)) {
        return { success: true, message: 'Already processed', duplicate: true };
      }
      
      // Get all Syston fixtures for the month
      const fixtures = this.getSystonFixturesForMonth(targetMonth, targetYear);
      
      if (fixtures.length === 0) {
        this.logger.info('No fixtures found for monthly summary');
        return { success: true, count: 0, message: 'No fixtures for this month' };
      }
      
      // Calculate monthly statistics
      const monthlyStats = this.calculateMonthlyFixtureStats(fixtures);
      
      // Create monthly fixtures payload
      const payload = this.createMonthlyFixturesPayload(fixtures, monthlyStats, targetMonth, targetYear);
      
      // @testHook(monthly_fixtures_webhook)
      const webhookResult = this.sendBatchToMake(payload);
      
      if (webhookResult.success) {
        this.processedKeys.add(idempotencyKey);
      }
      
      this.logger.exitFunction('postMonthlyFixturesSummary', { 
        success: webhookResult.success, 
        count: fixtures.length 
      });
      
      return {
        success: webhookResult.success,
        event_type: 'fixtures_this_month',
        month: targetMonth,
        year: targetYear,
        fixture_count: fixtures.length,
        statistics: monthlyStats,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Monthly fixtures summary failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Post monthly results summary (NEW: From spec)
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Object} Posting result
   */
  postMonthlyResultsSummary(month = null, year = null) {
    this.logger.enterFunction('postMonthlyResultsSummary', { month, year });
    
    try {
      // @testHook(monthly_results_start)
      
      // Default to previous month if not specified
      const now = DateUtils.now();
      const targetMonth = month || (now.getMonth() === 0 ? 12 : now.getMonth());
      const targetYear = year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
      
      // Generate idempotency key
      const idempotencyKey = `monthly_results_${targetYear}_${targetMonth}`;
      if (this.isDuplicateRequest(idempotencyKey)) {
        return { success: true, message: 'Already processed', duplicate: true };
      }
      
      // Get all Syston results for the month
      const results = this.getSystonResultsForMonth(targetMonth, targetYear);
      
      if (results.length === 0) {
        this.logger.info('No results found for monthly summary');
        return { success: true, count: 0, message: 'No results for this month' };
      }
      
      // Calculate monthly performance statistics
      const monthlyStats = this.calculateMonthlyResultStats(results);
      
      // Create monthly results payload
      const payload = this.createMonthlyResultsPayload(results, monthlyStats, targetMonth, targetYear);
      
      // @testHook(monthly_results_webhook)
      const webhookResult = this.sendBatchToMake(payload);
      
      if (webhookResult.success) {
        this.processedKeys.add(idempotencyKey);
      }
      
      this.logger.exitFunction('postMonthlyResultsSummary', { 
        success: webhookResult.success, 
        count: results.length 
      });
      
      return {
        success: webhookResult.success,
        event_type: 'results_this_month',
        month: targetMonth,
        year: targetYear,
        result_count: results.length,
        statistics: monthlyStats,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Monthly results summary failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== POSTPONED MATCH HANDLING ====================

  /**
   * Post postponed match notification (NEW: From spec)
   * @param {string} opponent - Opposition team
   * @param {Date} originalDate - Original match date
   * @param {string} reason - Postponement reason
   * @param {Date} newDate - New match date (optional)
   * @returns {Object} Posting result
   */
  postPostponed(opponent, originalDate, reason, newDate = null) {
    this.logger.enterFunction('postPostponed', { opponent, originalDate, reason, newDate });
    
    try {
      // @testHook(postponed_start)
      
      // Generate idempotency key
      const idempotencyKey = `postponed_${opponent}_${DateUtils.formatUK(originalDate)}`;
      if (this.isDuplicateRequest(idempotencyKey)) {
        return { success: true, message: 'Already processed', duplicate: true };
      }
      
      // Determine match type for event naming
      const matchType = this.determineMatchType(opponent, originalDate);
      const eventType = `match_postponed_${matchType}`;
      
      // Create postponed match payload
      const payload = this.createPostponedPayload(opponent, originalDate, reason, newDate, eventType);
      
      // @testHook(postponed_webhook)
      const webhookResult = this.sendBatchToMake(payload);
      
      if (webhookResult.success) {
        this.processedKeys.add(idempotencyKey);
        // Update fixture status in sheet
        this.updateFixtureStatus(opponent, originalDate, 'Postponed');
      }
      
      this.logger.exitFunction('postPostponed', { success: webhookResult.success });
      
      return {
        success: webhookResult.success,
        event_type: eventType,
        opponent: opponent,
        original_date: originalDate,
        new_date: newDate,
        reason: reason,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Postponed match posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== DATA RETRIEVAL METHODS ====================

  /**
   * Get league fixtures for date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} League fixtures
   */
  getLeagueFixtures(startDate, endDate) {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES')
      );
      
      if (!fixturesSheet) return [];
      
      const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      
      return allFixtures.filter(fixture => {
        // Filter by date range
        const fixtureDate = new Date(fixture.Date);
        const inDateRange = (!startDate || fixtureDate >= startDate) && 
                           (!endDate || fixtureDate <= endDate);
        
        // Filter league matches only
        const isLeague = fixture.Competition && 
                        fixture.Competition.toLowerCase().includes('league');
        
        // Filter unsent fixtures
        const notPosted = fixture.Posted !== 'TRUE';
        
        return inDateRange && isLeague && notPosted;
      });
      
    } catch (error) {
      this.logger.error('Failed to get league fixtures', { error: error.toString() });
      return [];
    }
  }

  /**
   * Get league results for date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} League results
   */
  getLeagueResults(startDate, endDate) {
    try {
      const resultsSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.RESULTS')
      );
      
      if (!resultsSheet) return [];
      
      const allResults = SheetUtils.getAllDataAsObjects(resultsSheet);
      
      return allResults.filter(result => {
        // Filter by date range
        const resultDate = new Date(result.Date);
        const inDateRange = (!startDate || resultDate >= startDate) && 
                           (!endDate || resultDate <= endDate);
        
        // Filter league matches only
        const isLeague = result.Competition && 
                        result.Competition.toLowerCase().includes('league');
        
        // Filter unsent results
        const notPosted = result.Posted !== 'TRUE';
        
        return inDateRange && isLeague && notPosted;
      });
      
    } catch (error) {
      this.logger.error('Failed to get league results', { error: error.toString() });
      return [];
    }
  }

  /**
   * Get Syston fixtures for specific month
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Array} Monthly fixtures
   */
  getSystonFixturesForMonth(month, year) {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES')
      );
      
      if (!fixturesSheet) return [];
      
      const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      
      return allFixtures.filter(fixture => {
        const fixtureDate = new Date(fixture.Date);
        return fixtureDate.getMonth() + 1 === month && 
               fixtureDate.getFullYear() === year;
      });
      
    } catch (error) {
      this.logger.error('Failed to get monthly fixtures', { error: error.toString() });
      return [];
    }
  }

  /**
   * Get Syston results for specific month
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Array} Monthly results
   */
  getSystonResultsForMonth(month, year) {
    try {
      const resultsSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.RESULTS')
      );
      
      if (!resultsSheet) return [];
      
      const allResults = SheetUtils.getAllDataAsObjects(resultsSheet);
      
      return allResults.filter(result => {
        const resultDate = new Date(result.Date);
        return resultDate.getMonth() + 1 === month && 
               resultDate.getFullYear() === year;
      });
      
    } catch (error) {
      this.logger.error('Failed to get monthly results', { error: error.toString() });
      return [];
    }
  }

  // ==================== STATISTICS CALCULATION ====================

  /**
   * Calculate monthly fixture statistics
   * @param {Array} fixtures - Monthly fixtures
   * @returns {Object} Statistics object
   */
  calculateMonthlyFixtureStats(fixtures) {
    const stats = {
      total_fixtures: fixtures.length,
      home_fixtures: 0,
      away_fixtures: 0,
      competitions: new Set(),
      key_matches: [],
      next_match_highlight: null
    };
    
    fixtures.forEach(fixture => {
      // Count home/away
      if (fixture['Home/Away'] === 'Home') {
        stats.home_fixtures++;
      } else {
        stats.away_fixtures++;
      }
      
      // Track competitions
      if (fixture.Competition) {
        stats.competitions.add(fixture.Competition);
      }
      
      // Identify key matches (cups, derbies, etc.)
      if (this.isKeyMatch(fixture)) {
        stats.key_matches.push(fixture);
      }
    });
    
    // Convert Set to Array
    stats.competitions = Array.from(stats.competitions);
    
    // Find next match highlight
    const sortedFixtures = fixtures.sort((a, b) => new Date(a.Date) - new Date(b.Date));
    stats.next_match_highlight = sortedFixtures[0] || null;
    
    return stats;
  }

  /**
   * Calculate monthly result statistics
   * @param {Array} results - Monthly results
   * @returns {Object} Statistics object
   */
  calculateMonthlyResultStats(results) {
    const stats = {
      total_results: results.length,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_for: 0,
      goals_against: 0,
      clean_sheets: 0,
      best_result: null,
      worst_result: null,
      goal_difference: 0
    };
    
    let bestGoalDiff = -999;
    let worstGoalDiff = 999;
    
    results.forEach(result => {
      const homeScore = parseInt(result['Home Score']) || 0;
      const awayScore = parseInt(result['Away Score']) || 0;
      const isHome = result['Home/Away'] === 'Home';
      
      const ourScore = isHome ? homeScore : awayScore;
      const theirScore = isHome ? awayScore : homeScore;
      const goalDiff = ourScore - theirScore;
      
      // Count results
      if (goalDiff > 0) {
        stats.wins++;
      } else if (goalDiff === 0) {
        stats.draws++;
      } else {
        stats.losses++;
      }
      
      // Goal statistics
      stats.goals_for += ourScore;
      stats.goals_against += theirScore;
      
      if (theirScore === 0) {
        stats.clean_sheets++;
      }
      
      // Best/worst results
      if (goalDiff > bestGoalDiff) {
        bestGoalDiff = goalDiff;
        stats.best_result = result;
      }
      
      if (goalDiff < worstGoalDiff) {
        worstGoalDiff = goalDiff;
        stats.worst_result = result;
      }
    });
    
    stats.goal_difference = stats.goals_for - stats.goals_against;
    
    return stats;
  }

  // ==================== PAYLOAD CREATION ====================

  /**
   * Create fixtures batch payload
   * @param {Array} fixtures - Fixtures array
   * @param {string} eventType - Event type
   * @param {string} roundId - Round identifier
   * @returns {Object} Payload object
   */
  createFixturesBatchPayload(fixtures, eventType, roundId) {
    return {
      event_type: eventType,
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      
      // Batch data
      fixture_count: fixtures.length,
      fixtures_list: fixtures.map(fixture => ({
        date: fixture.Date,
        time: fixture.Time,
        opponent: fixture.Opposition,
        venue: fixture.Venue,
        competition: fixture.Competition,
        home_away: fixture['Home/Away']
      })),
      
      // Metadata
      round_id: roundId,
      week_description: this.generateWeekDescription(fixtures),
      season: getConfig('SYSTEM.SEASON'),
      
      // Statistics
      home_fixture_count: fixtures.filter(f => f['Home/Away'] === 'Home').length,
      away_fixture_count: fixtures.filter(f => f['Home/Away'] === 'Away').length,
      competition_types: [...new Set(fixtures.map(f => f.Competition))],
      
      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      batch_id: this.generateBatchId(eventType)
    };
  }

  /**
   * Create results batch payload
   * @param {Array} results - Results array
   * @param {string} eventType - Event type
   * @param {string} roundId - Round identifier
   * @returns {Object} Payload object
   */
  createResultsBatchPayload(results, eventType, roundId) {
    const stats = this.calculateBatchResultStats(results);
    
    return {
      event_type: eventType,
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      
      // Batch data
      result_count: results.length,
      results_list: results.map(result => ({
        date: result.Date,
        opponent: result.Opposition,
        home_score: result['Home Score'],
        away_score: result['Away Score'],
        venue: result.Venue,
        competition: result.Competition,
        home_away: result['Home/Away'],
        result: result.Result
      })),
      
      // Statistics
      wins: stats.wins,
      draws: stats.draws,
      losses: stats.losses,
      goals_for: stats.goals_for,
      goals_against: stats.goals_against,
      
      // Metadata
      round_id: roundId,
      week_description: this.generateWeekDescription(results),
      season: getConfig('SYSTEM.SEASON'),
      
      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      batch_id: this.generateBatchId(eventType)
    };
  }

  /**
   * Create monthly fixtures payload
   * @param {Array} fixtures - Monthly fixtures
   * @param {Object} stats - Monthly statistics
   * @param {number} month - Month
   * @param {number} year - Year
   * @returns {Object} Payload object
   */
  createMonthlyFixturesPayload(fixtures, stats, month, year) {
    return {
      event_type: 'fixtures_this_month',
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      
      // Monthly data
      month_name: DateUtils.getMonthName(month),
      month_number: month,
      year: year,
      fixture_count: stats.total_fixtures,
      
      // Fixtures breakdown
      home_fixtures: stats.home_fixtures,
      away_fixtures: stats.away_fixtures,
      competitions: stats.competitions,
      key_matches: stats.key_matches,
      
      // Highlights
      next_match_highlight: stats.next_match_highlight,
      
      // Complete fixtures list
      fixtures_list: fixtures.map(fixture => ({
        date: fixture.Date,
        time: fixture.Time,
        opponent: fixture.Opposition,
        venue: fixture.Venue,
        competition: fixture.Competition,
        home_away: fixture['Home/Away'],
        is_key_match: this.isKeyMatch(fixture)
      })),
      
      // Metadata
      season: getConfig('SYSTEM.SEASON'),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }

  /**
   * Create monthly results payload
   * @param {Array} results - Monthly results
   * @param {Object} stats - Monthly statistics
   * @param {number} month - Month
   * @param {number} year - Year
   * @returns {Object} Payload object
   */
  createMonthlyResultsPayload(results, stats, month, year) {
    return {
      event_type: 'results_this_month',
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      
      // Monthly data
      month_name: DateUtils.getMonthName(month),
      month_number: month,
      year: year,
      result_count: stats.total_results,
      
      // Performance statistics
      wins: stats.wins,
      draws: stats.draws,
      losses: stats.losses,
      goals_for: stats.goals_for,
      goals_against: stats.goals_against,
      goal_difference: stats.goal_difference,
      clean_sheets: stats.clean_sheets,
      
      // Highlights
      best_result: stats.best_result,
      worst_result: stats.worst_result,
      
      // Complete results list
      results_list: results.map(result => ({
        date: result.Date,
        opponent: result.Opposition,
        home_score: result['Home Score'],
        away_score: result['Away Score'],
        venue: result.Venue,
        competition: result.Competition,
        home_away: result['Home/Away'],
        result: result.Result
      })),
      
      // Metadata
      season: getConfig('SYSTEM.SEASON'),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }

  /**
   * Create postponed match payload
   * @param {string} opponent - Opposition team
   * @param {Date} originalDate - Original date
   * @param {string} reason - Postponement reason
   * @param {Date} newDate - New date
   * @param {string} eventType - Event type
   * @returns {Object} Payload object
   */
  createPostponedPayload(opponent, originalDate, reason, newDate, eventType) {
    return {
      event_type: eventType,
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      
      // Postponement data
      opponent_name: opponent,
      original_date: DateUtils.formatUK(originalDate),
      new_date: newDate ? DateUtils.formatUK(newDate) : 'TBC',
      postponement_reason: reason,
      
      // Match context
      season: getConfig('SYSTEM.SEASON'),
      
      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      postponed_on: DateUtils.formatISO(DateUtils.now())
    };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Send batch payload to Make.com
   * @param {Object} payload - Payload to send
   * @returns {Object} Send result
   */
  sendBatchToMake(payload) {
    this.logger.enterFunction('sendBatchToMake', { event_type: payload.event_type });
    
    try {
      // @testHook(batch_webhook_start)
      
      const webhookUrl = getWebhookUrl();
      if (!webhookUrl) {
        throw new Error('Webhook URL not configured');
      }
      
      // Rate limiting
      const rateLimitMs = getConfig('PERFORMANCE.WEBHOOK_RATE_LIMIT_MS', 1000);
      Utilities.sleep(rateLimitMs);
      
      const response = UrlFetchApp.fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      
      const success = response.getResponseCode() === 200;
      
      // @testHook(batch_webhook_complete)
      
      this.logger.exitFunction('sendBatchToMake', { 
        success, 
        response_code: response.getResponseCode() 
      });
      
      return {
        success: success,
        response_code: response.getResponseCode(),
        response_text: response.getContentText()
      };
      
    } catch (error) {
      this.logger.error('Failed to send batch to Make.com', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Generate idempotency key for batch operation
   * @param {string} type - Operation type
   * @param {string} roundId - Round identifier
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {string} Idempotency key
   */
  generateBatchKey(type, roundId, startDate, endDate) {
    const parts = [
      type,
      roundId || 'auto',
      startDate ? DateUtils.formatUK(startDate) : 'none',
      endDate ? DateUtils.formatUK(endDate) : 'none'
    ];
    
    return parts.join('_').replace(/[^a-zA-Z0-9_]/g, '');
  }

  /**
   * Check if request is duplicate
   * @param {string} key - Idempotency key
   * @returns {boolean} True if duplicate
   */
  isDuplicateRequest(key) {
    return this.processedKeys.has(key);
  }

  /**
   * Mark fixtures as posted
   * @param {Array} fixtures - Fixtures to mark
   */
  markFixturesAsPosted(fixtures) {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES')
      );
      
      if (fixturesSheet) {
        fixtures.forEach(fixture => {
          SheetUtils.updateRowByCriteria(
            fixturesSheet,
            { 'Opposition': fixture.Opposition, 'Date': fixture.Date },
            { 'Posted': 'TRUE' }
          );
        });
      }
    } catch (error) {
      this.logger.error('Failed to mark fixtures as posted', { error: error.toString() });
    }
  }

  /**
   * Mark results as posted
   * @param {Array} results - Results to mark
   */
  markResultsAsPosted(results) {
    try {
      const resultsSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.RESULTS')
      );
      
      if (resultsSheet) {
        results.forEach(result => {
          SheetUtils.updateRowByCriteria(
            resultsSheet,
            { 'Opposition': result.Opposition, 'Date': result.Date },
            { 'Posted': 'TRUE' }
          );
        });
      }
    } catch (error) {
      this.logger.error('Failed to mark results as posted', { error: error.toString() });
    }
  }

  /**
   * Update fixture status
   * @param {string} opponent - Opposition team
   * @param {Date} date - Match date
   * @param {string} status - New status
   */
  updateFixtureStatus(opponent, date, status) {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES')
      );
      
      if (fixturesSheet) {
        SheetUtils.updateRowByCriteria(
          fixturesSheet,
          { 'Opposition': opponent, 'Date': DateUtils.formatUK(date) },
          { 'Status': status }
        );
      }
    } catch (error) {
      this.logger.error('Failed to update fixture status', { error: error.toString() });
    }
  }

  /**
   * Determine match type for event naming
   * @param {string} opponent - Opposition team
   * @param {Date} date - Match date
   * @returns {string} Match type
   */
  determineMatchType(opponent, date) {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES')
      );
      
      if (fixturesSheet) {
        const matchData = SheetUtils.findRowByCriteria(fixturesSheet, {
          'Opposition': opponent,
          'Date': DateUtils.formatUK(date)
        });
        
        if (matchData && matchData.Competition) {
          const competition = matchData.Competition.toLowerCase();
          if (competition.includes('league')) return 'league';
          if (competition.includes('cup')) return 'cup';
          if (competition.includes('friendly')) return 'friendly';
        }
      }
      
      return 'general';
    } catch (error) {
      this.logger.error('Failed to determine match type', { error: error.toString() });
      return 'general';
    }
  }

  /**
   * Check if fixture is a key match
   * @param {Object} fixture - Fixture object
   * @returns {boolean} True if key match
   */
  isKeyMatch(fixture) {
    const keyIndicators = [
      'cup', 'final', 'semi', 'derby', 'playoff', 'title',
      'promotion', 'relegation', 'local', 'rival'
    ];
    
    const searchText = `${fixture.Opposition} ${fixture.Competition}`.toLowerCase();
    
    return keyIndicators.some(indicator => searchText.includes(indicator));
  }

  /**
   * Generate week description
   * @param {Array} items - Fixtures or results
   * @returns {string} Week description
   */
  generateWeekDescription(items) {
    if (items.length === 0) return 'No matches';
    if (items.length === 1) return 'Single match';
    
    const hasHome = items.some(item => item['Home/Away'] === 'Home');
    const hasAway = items.some(item => item['Home/Away'] === 'Away');
    
    if (hasHome && hasAway) return 'Mixed home and away';
    if (hasHome) return 'Home matches';
    if (hasAway) return 'Away matches';
    
    return `${items.length} matches`;
  }

  /**
   * Generate unique batch ID
   * @param {string} eventType - Event type
   * @returns {string} Batch ID
   */
  generateBatchId(eventType) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${eventType}_${timestamp}_${random}`;
  }

  /**
   * Calculate batch result statistics
   * @param {Array} results - Results array
   * @returns {Object} Statistics object
   */
  calculateBatchResultStats(results) {
    const stats = {
      wins: 0,
      draws: 0,
      losses: 0,
      goals_for: 0,
      goals_against: 0
    };
    
    results.forEach(result => {
      const homeScore = parseInt(result['Home Score']) || 0;
      const awayScore = parseInt(result['Away Score']) || 0;
      const isHome = result['Home/Away'] === 'Home';
      
      const ourScore = isHome ? homeScore : awayScore;
      const theirScore = isHome ? awayScore : homeScore;
      
      stats.goals_for += ourScore;
      stats.goals_against += theirScore;
      
      if (ourScore > theirScore) {
        stats.wins++;
      } else if (ourScore === theirScore) {
        stats.draws++;
      } else {
        stats.losses++;
      }
    });
    
    return stats;
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Post league fixtures batch (public API)
 * @param {string} roundId - Round identifier
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} Posting result
 */
function postLeagueFixturesBatch(roundId = null, startDate = null, endDate = null) {
  const manager = new BatchFixturesManager();
  return manager.postLeagueFixturesBatch(roundId, startDate, endDate);
}

/**
 * Post league results batch (public API)
 * @param {string} roundId - Round identifier
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Object} Posting result
 */
function postLeagueResultsBatch(roundId = null, startDate = null, endDate = null) {
  const manager = new BatchFixturesManager();
  return manager.postLeagueResultsBatch(roundId, startDate, endDate);
}

/**
 * Post monthly fixtures summary (public API)
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Object} Posting result
 */
function postMonthlyFixturesSummary(month = null, year = null) {
  const manager = new BatchFixturesManager();
  return manager.postMonthlyFixturesSummary(month, year);
}

/**
 * Post monthly results summary (public API)
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Object} Posting result
 */
function postMonthlyResultsSummary(month = null, year = null) {
  const manager = new BatchFixturesManager();
  return manager.postMonthlyResultsSummary(month, year);
}

/**
 * Post postponed match notification (public API)
 * @param {string} opponent - Opposition team
 * @param {Date} originalDate - Original match date
 * @param {string} reason - Postponement reason
 * @param {Date} newDate - New match date (optional)
 * @returns {Object} Posting result
 */
function postPostponed(opponent, originalDate, reason, newDate = null) {
  const manager = new BatchFixturesManager();
  return manager.postPostponed(opponent, originalDate, reason, newDate);
}

/**
 * Initialize batch fixtures system
 * @returns {Object} Initialization result
 */
function initializeBatchFixtures() {
  logger.enterFunction('BatchFixtures.initialize');
  
  try {
    // Validate required sheets exist
    const requiredSheets = ['FIXTURES', 'RESULTS'];
    const results = {};
    
    requiredSheets.forEach(sheetKey => {
      const tabName = getConfig(`SHEETS.TAB_NAMES.${sheetKey}`);
      const columns = getConfig(`SHEETS.REQUIRED_COLUMNS.${sheetKey}`);
      
      if (tabName && columns) {
        const sheet = SheetUtils.getOrCreateSheet(tabName, columns);
        results[sheetKey] = { success: !!sheet, name: tabName };
      }
    });
    
    // Test webhook connectivity
    const webhookUrl = getWebhookUrl();
    const webhookConfigured = !!webhookUrl;
    
    logger.exitFunction('BatchFixtures.initialize', { success: true });
    
    return {
      success: true,
      sheets_validated: results,
      webhook_configured: webhookConfigured,
      features_enabled: {
        batch_posting: isFeatureEnabled('BATCH_POSTING'),
        monthly_summaries: isFeatureEnabled('MONTHLY_SUMMARIES'),
        postponed_handling: isFeatureEnabled('POSTPONED_MATCH_HANDLING')
      }
    };
    
  } catch (error) {
    logger.error('Batch fixtures initialization failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}
  /**
 * @fileoverview Enhanced batch posting for fixtures and results with monthly summaries
 * @version 6.0.0
 * @author Senior Software Architect
 * @description Handles batch posting (1-5 fixtures/results) and monthly summaries
 * 
 * FEATURES IMPLEMENTED:
 * - Batch fixture posting (1-5 league fixtures)
 * - Batch results posting (1-5 league results)
 * - Monthly fixtures summary
 * - Monthly results summary
 * - Postponed match handling
 * - Idempotency and duplicate prevention
 */

// ==================== BATCH FIXTURES MANAGER CLASS ====================

/**
 * Batch Fixtures Manager - Handles all batch posting operations
 */
class BatchFixturesManager {
  
  constructor() {
    this.logger = logger.scope('BatchFixtures');
    this.processedKeys = new Set(); // For idempotency
  }

  // ==================== BATCH FIXTURE POSTING ====================

  /**
   * Post league fixtures batch (NEW: From spec)
   * @param {string} roundId - Round/weekend identifier
   * @param {Date} startDate - Start date for fixtures
   * @param {Date} endDate - End date for fixtures
   * @returns {Object} Posting result
   */
  postLeagueFixturesBatch(roundId = null, startDate = null, endDate = null) {
    this.logger

