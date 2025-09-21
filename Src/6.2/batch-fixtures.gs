/**
 * @fileoverview Enhanced batch posting for fixtures and results with monthly summaries
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Handles batch posting (1-5 fixtures/results), postponed notifications,
 *              and provides idempotent integrations with Make.com.
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
      const fixturesSheet = this.getFixturesSheet();
      if (!fixturesSheet) return [];

      const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);

      return allFixtures
        .map(fixture => this.parseFixtureRow(fixture))
        .filter(entry => {
          if (!entry) return false;

          const inDateRange = (!startDate || entry.date >= startDate) &&
                             (!endDate || entry.date <= endDate);
          const isLeague = entry.competition && entry.competition.toLowerCase().includes('league');
          const notPosted = entry.posted !== true && entry.posted !== 'TRUE';

          return inDateRange && isLeague && notPosted;
        })
        .map(entry => entry.raw);

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
      const resultsSheet = this.getResultsSheet();
      if (!resultsSheet) return [];

      const allResults = SheetUtils.getAllDataAsObjects(resultsSheet);

      return allResults
        .map(result => this.parseResultRow(result))
        .filter(entry => {
          if (!entry) return false;

          const inDateRange = (!startDate || entry.date >= startDate) &&
                             (!endDate || entry.date <= endDate);
          const isLeague = entry.competition && entry.competition.toLowerCase().includes('league');
          const notPosted = entry.posted !== true && entry.posted !== 'TRUE';

          return inDateRange && isLeague && notPosted;
        })
        .map(entry => entry.raw);

    } catch (error) {
      this.logger.error('Failed to get league results', { error: error.toString() });
      return [];
    }
  }

  /**
   * Retrieve fixtures sheet safely
   * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} Sheet instance
   */
  getFixturesSheet() {
    try {
      return SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES'),
        getConfig('SHEETS.REQUIRED_COLUMNS.FIXTURES', [])
      );
    } catch (error) {
      this.logger.error('Unable to access fixtures sheet', { error: error.toString() });
      return null;
    }
  }

  /**
   * Retrieve results sheet safely
   * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} Sheet instance
   */
  getResultsSheet() {
    try {
      return SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.RESULTS'),
        getConfig('SHEETS.REQUIRED_COLUMNS.RESULTS', [])
      );
    } catch (error) {
      this.logger.error('Unable to access results sheet', { error: error.toString() });
      return null;
    }
  }

  /**
   * Normalize a fixture row using parsing helpers
   * @param {Object} raw - Raw fixture object from sheet
   * @returns {{ raw: Object, date: Date, competition: string, posted: boolean }} Normalized entry
   */
  parseFixtureRow(raw) {
    if (!raw) return null;

    try {
      const date = this.parseDate(raw.Date);
      if (!date) return null;

      const posted = raw.Posted === true || String(raw.Posted).toUpperCase() === 'TRUE';

      return {
        raw,
        date,
        competition: raw.Competition || '',
        posted
      };
    } catch (error) {
      this.logger.warn('Failed to parse fixture row', { error: error.toString(), raw });
      return null;
    }
  }

  /**
   * Normalize a result row using parsing helpers
   * @param {Object} raw - Raw result object from sheet
   * @returns {{ raw: Object, date: Date, competition: string, posted: boolean }} Normalized entry
   */
  parseResultRow(raw) {
    if (!raw) return null;

    try {
      const date = this.parseDate(raw.Date);
      if (!date) return null;

      const posted = raw.Posted === true || String(raw.Posted).toUpperCase() === 'TRUE';

      return {
        raw,
        date,
        competition: raw.Competition || '',
        posted
      };
    } catch (error) {
      this.logger.warn('Failed to parse result row', { error: error.toString(), raw });
      return null;
    }
  }

  /**
   * Parse a UK formatted date or fallback
   * @param {string|Date} value - Date input
   * @returns {Date|null} Parsed date
   */
  parseDate(value) {
    if (!value) return null;
    const parsed = DateUtils.parseUK(String(value)) || new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

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

      // Rate limiting / backoff protection
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
      const fixturesSheet = this.getFixturesSheet();

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
      const resultsSheet = this.getResultsSheet();

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
      const fixturesSheet = this.getFixturesSheet();

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
      const fixturesSheet = this.getFixturesSheet();

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
    const manager = new BatchFixturesManager();
    const fixturesSheet = manager.getFixturesSheet();
    const resultsSheet = manager.getResultsSheet();

    const results = {
      FIXTURES: { success: !!fixturesSheet, name: getConfig('SHEETS.TAB_NAMES.FIXTURES') },
      RESULTS: { success: !!resultsSheet, name: getConfig('SHEETS.TAB_NAMES.RESULTS') }
    };

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
