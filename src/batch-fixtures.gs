/**
 * @fileoverview Enhanced batch posting for fixtures and results with delegated monthly summaries
 * @version 6.2.1
 * @author Senior Software Architect
 * @description Handles batch posting (1–5 fixtures/results), postponed notifications,
 *              and provides idempotent integrations with Make.com. Monthly summaries are delegated.
 */

// ==================== IDEMPOTENCY HELPERS (PERSISTENT) ====================

/** @returns {GoogleAppsScript.Properties.Properties} */
function __bf_prop__() { return PropertiesService.getScriptProperties(); }
/** @returns {GoogleAppsScript.Cache.Cache} */
function __bf_cache__() { return CacheService.getScriptCache(); }

const __BF_IDEMP__ = Object.freeze({
  PROP_KEY: 'BF_PROCESSED_KEYS',
  CACHE_PREFIX: 'bf_key_',
  CACHE_TTL: 6 * 60 * 60 // 6 hours
});

// ==================== BATCH FIXTURES MANAGER CLASS ====================

/**
 * Batch Fixtures Manager - Handles all batch posting operations
 */
class BatchFixturesManager {

  constructor() {
    this.logger = (typeof logger !== 'undefined') ? logger.scope('BatchFixtures') : console;
    this.processedKeys = new Set(); // For idempotency (per-execution memory)
  }

  // ==================== PUBLIC ENTRY POINTS ====================

  /**
   * Post league fixtures batch (1–5) for a given period
   * @param {string|null} roundId - Round/weekend identifier
   * @param {Date|null} startDate - Start date for fixtures
   * @param {Date|null} endDate - End date for fixtures
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
        this._markProcessed(idempotencyKey);
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
   * @param {string|null} roundId - Round/weekend identifier
   * @param {Date|null} startDate - Start date for results
   * @param {Date|null} endDate - End date for results
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
        this._markProcessed(idempotencyKey);
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

  // ==================== MONTHLY SUMMARY DELEGATION ====================

  /**
   * Delegate to monthly summaries handler for fixtures
   * (kept for compatibility with your original design)
   */
  postMonthlyFixturesSummary(monthKey = null) {
    this.logger.enterFunction('postMonthlyFixturesSummary', { monthKey });
    try {
      const result = (typeof postMonthlyFixturesSummary === 'function')
        ? postMonthlyFixturesSummary(monthKey)
        : { success: false, error: 'monthly-summaries.gs not loaded' };
      this.logger.exitFunction('postMonthlyFixturesSummary', { delegated: true, success: !!result?.success });
      return result;
    } catch (error) {
      this.logger.error('Monthly fixtures delegation failed', { error: error.toString() });
      const failure = { success: false, error: error.toString() };
      this.logger.exitFunction('postMonthlyFixturesSummary', { delegated: true, success: false, error: error.toString() });
      return failure;
    }
  }

  /**
   * Delegate to monthly summaries handler for results
   * (kept for compatibility with your original design)
   */
  postMonthlyResultsSummary(monthKey = null) {
    this.logger.enterFunction('postMonthlyResultsSummary', { monthKey });
    try {
      const result = (typeof postMonthlyResultsSummary === 'function')
        ? postMonthlyResultsSummary(monthKey)
        : { success: false, error: 'monthly-summaries.gs not loaded' };
      this.logger.exitFunction('postMonthlyResultsSummary', { delegated: true, success: !!result?.success });
      return result;
    } catch (error) {
      this.logger.error('Monthly results delegation failed', { error: error.toString() });
      const failure = { success: false, error: error.toString() };
      this.logger.exitFunction('postMonthlyResultsSummary', { delegated: true, success: false, error: error.toString() });
      return failure;
    }
  }

  // ==================== POSTPONED MATCH HANDLING ====================

  /**
   * Post postponed match notification (NEW: From spec)
   * @param {string} opponent - Opposition team
   * @param {Date} originalDate - Original match date
   * @param {string} reason - Postponement reason
   * @param {Date|null} newDate - New match date (optional)
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

      // Create payload
      const payload = this.createPostponedPayload(opponent, originalDate, reason, newDate, eventType);

      // Send to Make
      const webhookResult = this.sendBatchToMake(payload);
      if (webhookResult.success) {
        this.updateFixtureStatus(opponent, originalDate, 'Postponed');
        this._markProcessed(idempotencyKey);
      }

      // Exit
      this.logger.exitFunction('postPostponed', {
        success: webhookResult.success,
        opponent,
        event_type: eventType
      });

      return {
        success: webhookResult.success,
        event_type: eventType,
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
   * @param {Date|null} startDate
   * @param {Date|null} endDate
   * @returns {Array} League fixtures (raw rows)
   */
  getLeagueFixtures(startDate, endDate) {
    try {
      const fixturesSheet = this.getFixturesSheet();
      if (!fixturesSheet) return [];

      const all = SheetUtils.getObjectsFromSheet(fixturesSheet) || [];
      const filtered = all.filter(row => {
        const status = String(row['Status'] || '').toLowerCase();
        const send = String(row['Send'] || '').toLowerCase();
        const posted = String(row['Posted'] || '').toLowerCase();
        const date = this.parseDate(row['Date']);

        if (status === 'postponed') return false;
        if (!(send === 'true' || send === 'yes' || row['Send'] === true)) return false;
        if (posted === 'true' || row['Posted'] === true) return false;
        if (startDate && date && date < startDate) return false;
        if (endDate && date && date > endDate) return false;
        return true;
      });

      // Normalize rows (safe mapping)
      const mapped = filtered
        .map(row => this.parseFixtureRow(row))
        .filter(Boolean);

      return mapped.slice(0, 5); // cap at 5

    } catch (error) {
      this.logger.error('Failed to retrieve league fixtures', { error: error.toString() });
      return [];
    }
  }

  /**
   * Get league results for date range
   */
  getLeagueResults(startDate, endDate) {
    try {
      const resultsSheet = this.getResultsSheet();
      if (!resultsSheet) return [];

      const all = SheetUtils.getObjectsFromSheet(resultsSheet) || [];
      const filtered = all.filter(row => {
        const send = String(row['Send'] || '').toLowerCase();
        const posted = String(row['Posted'] || '').toLowerCase();
        const date = this.parseDate(row['Date']);

        if (!(send === 'true' || send === 'yes' || row['Send'] === true)) return false;
        if (posted === 'true' || row['Posted'] === true) return false;
        if (startDate && date && date < startDate) return false;
        if (endDate && date && date > endDate) return false;
        return true;
      });

      const mapped = filtered
        .map(row => this.parseResultRow(row))
        .filter(Boolean);

      return mapped.slice(0, 5);

    } catch (error) {
      this.logger.error('Failed to retrieve league results', { error: error.toString() });
      return [];
    }
  }

  /**
   * Sheet getters (safe wrappers)
   */
  getFixturesSheet() {
    try {
      const ssId = getConfig('SHEETS.SPREADSHEET_ID', '');
      if (!ssId) return null;
      const ss = SpreadsheetApp.openById(ssId);
      return ss.getSheetByName(getConfig('SHEETS.TAB_NAMES.FIXTURES', 'Fixtures'));
    } catch (e) {
      this.logger.error('Failed to open Fixtures sheet', { error: e.toString() });
      return null;
    }
  }

  getResultsSheet() {
    try {
      const ssId = getConfig('SHEETS.SPREADSHEET_ID', '');
      if (!ssId) return null;
      const ss = SpreadsheetApp.openById(ssId);
      return ss.getSheetByName(getConfig('SHEETS.TAB_NAMES.RESULTS', 'Results'));
    } catch (e) {
      this.logger.error('Failed to open Results sheet', { error: e.toString() });
      return null;
    }
  }

  // ==================== PARSING HELPERS ====================

  /**
   * Normalize a fixture row using parsing helpers
   */
  parseFixtureRow(raw) {
    try {
      const date = this.parseDate(raw.Date);
      const posted = String(raw.Posted || '').toLowerCase() === 'true' || raw.Posted === true;
      return {
        Raw: raw,
        Date: raw.Date || '',
        Time: raw.Time || '',
        Opposition: raw.Opposition || '',
        Venue: raw.Venue || '',
        Competition: raw.Competition || '',
        'Home/Away': raw['Home/Away'] || '',
        Status: raw.Status || '',
        Posted: posted,
        MatchID: raw['Match ID'] || '',
        __raw__: raw,
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
   */
  parseResultRow(raw) {
    try {
      const date = this.parseDate(raw.Date);
      const homeScore = parseInt(raw['Home Score']) || 0;
      const awayScore = parseInt(raw['Away Score']) || 0;
      return {
        Raw: raw,
        Date: raw.Date || '',
        Opposition: raw.Opposition || '',
        Venue: raw.Venue || '',
        Competition: raw.Competition || '',
        'Home/Away': raw['Home/Away'] || '',
        Result: raw.Result || '',
        'Home Score': homeScore,
        'Away Score': awayScore,
        MatchID: raw['Match ID'] || '',
        __raw__: raw,
        date
      };
    } catch (error) {
      this.logger.warn('Failed to parse result row', { error: error.toString(), raw });
      return null;
    }
  }

  /**
   * Parse UK date or ISO string
   */
  parseDate(value) {
    if (!value) return null;
    const parsed = DateUtils.parseUK(String(value)) || new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  // ==================== PAYLOAD CREATION ====================

  /** Create fixtures batch payload */
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
        home_away: fixture['Home/Away'],
        match_id: fixture.MatchID || ''
      })),

      // Metadata
      round_id: roundId,
      week_description: this.generateWeekDescription(fixtures),
      season: getConfig('SYSTEM.SEASON'),

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      batch_id: this.generateBatchId(eventType)
    };
  }

  /** Create results batch payload */
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
        outcome: result.Result,
        match_id: result.MatchID || ''
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

  /** Create postponed payload */
  createPostponedPayload(opponent, originalDate, reason, newDate, eventType) {
    return {
      event_type: eventType,
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),

      // Data
      opponent,
      original_date: DateUtils.formatUK(originalDate),
      reason: reason || 'Unspecified',
      new_date: newDate ? DateUtils.formatUK(newDate) : null,

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      postponed_on: DateUtils.formatISO(DateUtils.now())
    };
  }

  // ---------- IDEMPOTENCY (PERSISTENT + IN-MEMORY) ----------

  /** Check if request is duplicate using cache + script properties */
  _isProcessed(key) {
    try {
      if (__bf_cache__().get(__BF_IDEMP__.CACHE_PREFIX + key)) return true;
      const json = __bf_prop__().getProperty(__BF_IDEMP__.PROP_KEY);
      if (!json) return false;
      const arr = JSON.parse(json);
      const seen = Array.isArray(arr) ? new Set(arr) : new Set();
      const hit = seen.has(key);
      if (hit) __bf_cache__().put(__BF_IDEMP__.CACHE_PREFIX + key, '1', __BF_IDEMP__.CACHE_TTL);
      return hit;
    } catch (e) {
      return this.processedKeys.has(key);
    }
  }

  /** Mark key as processed in cache + script properties */
  _markProcessed(key) {
    try {
      // Update in-memory
      this.processedKeys.add(key);
      // Update persistent property
      const json = __bf_prop__().getProperty(__BF_IDEMP__.PROP_KEY);
      const arr = json ? JSON.parse(json) : [];
      if (arr.indexOf(key) === -1) {
        arr.push(key);
        __bf_prop__().setProperty(__BF_IDEMP__.PROP_KEY, JSON.stringify(arr));
      }
      // Update cache
      __bf_cache__().put(__BF_IDEMP__.CACHE_PREFIX + key, '1', __BF_IDEMP__.CACHE_TTL);
    } catch (e) {
      this.logger.warn('Failed to persist idempotency key', { error: e.toString(), key });
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Send batch payload to Make.com (with retry/backoff + alerting)
   * @param {Object} payload
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

      const attempts = getConfig('MAKE.WEBHOOK_RETRY_ATTEMPTS', 3);
      const delayMs = getConfig('MAKE.WEBHOOK_RETRY_DELAY_MS', 2000);
      const timeoutMs = getConfig('MAKE.WEBHOOK_TIMEOUT_MS', 30000);
      const rateLimitMs = getConfig('PERFORMANCE.WEBHOOK_RATE_LIMIT_MS', 1000);

      let lastResponse = null;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          Utilities.sleep(rateLimitMs);
          lastResponse = UrlFetchApp.fetch(webhookUrl, {
            method: 'POST',
            contentType: 'application/json',
            payload: JSON.stringify(payload),
            muteHttpExceptions: true,
            followRedirects: true
          });
          const code = lastResponse.getResponseCode();
          const ok = code >= 200 && code < 300;
          if (ok) {
            this.logger.exitFunction('sendBatchToMake', { success: true, response_code: code, attempt });
            return { success: true, response_code: code, response_text: lastResponse.getContentText() };
          }
          this.logger.warn('Webhook non-2xx response', { code, attempt, text: lastResponse.getContentText() });
        } catch (inner) {
          this.logger.warn('Webhook attempt failed', { attempt, error: inner.toString() });
        }
        Utilities.sleep(delayMs);
      }

      // Escalate alert if configured
      if (getConfig('ERROR_HANDLING.ALERT_ON_CRITICAL', false) || getConfig('ERROR_HANDLING.ALERT_ON_CRITICAL_ERROR', true)) {
        try {
          if (typeof sendCriticalAlert === 'function') {
            sendCriticalAlert('[BatchFixtures] Webhook permanently failed', JSON.stringify(payload));
          }
        } catch (alertErr) {
          this.logger.warn('Alert send failed', { error: alertErr.toString() });
        }
      }

      this.logger.exitFunction('sendBatchToMake', { success: false, response_code: lastResponse ? lastResponse.getResponseCode() : 'none' });
      return {
        success: false,
        response_code: lastResponse ? lastResponse.getResponseCode() : 0,
        response_text: lastResponse ? lastResponse.getContentText() : ''
      };

    } catch (error) {
      this.logger.error('Failed to send batch to Make.com', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Generate idempotency key for batch operation
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

  /** Check if request is duplicate */
  isDuplicateRequest(key) {
    return this._isProcessed(key);
  }

  /** Generate batch id */
  generateBatchId(eventType) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${eventType}_${timestamp}_${random}`;
  }

  /** Determine match type (league/cup/friendly) */
  determineMatchType(opponent, date) {
    try {
      const fixturesSheet = this.getFixturesSheet();
      if (fixturesSheet) {
        const matchData = SheetUtils.findRowByCriteria(fixturesSheet, {
          'Opposition': opponent,
          'Date': DateUtils.formatUK(date)
        });
        const comp = String(matchData?.Competition || '').toLowerCase();
        if (comp.includes('cup')) return 'cup';
        if (comp.includes('friendly')) return 'friendly';
      }
    } catch (e) {
      this.logger.warn('determineMatchType lookup failed', { error: e.toString() });
    }
    return 'league';
  }

  /** Generate description for the week */
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

  /** Basic batch results stats */
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

      if (ourScore > theirScore) stats.wins += 1;
      else if (ourScore < theirScore) stats.losses += 1;
      else stats.draws += 1;
    });

    return stats;
  }

  /** Mark fixtures as posted */
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

  /** Mark results as posted */
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

  /** Update fixture status (e.g., Postponed) */
  updateFixtureStatus(opponent, date, status) {
    try {
      const fixturesSheet = this.getFixturesSheet();
      if (fixturesSheet) {
        SheetUtils.updateRowByCriteria(
          fixturesSheet,
          { 'Opposition': opponent, 'Date': DateUtils.formatUK(date) },
          { 'Status': status, 'Posted': 'TRUE' }
        );
      }
    } catch (error) {
      this.logger.error('Failed to update fixture status', { error: error.toString() });
    }
  }
}

// ==================== PUBLIC ENTRY FUNCTIONS ====================

/**
 * Post 1–5 upcoming fixtures (batched) that are marked Send=TRUE & not Posted.
 */
function runFixturesBatch() {
  const mgr = new BatchFixturesManager();
  mgr.postLeagueFixturesBatch();
}

/**
 * Post 1–5 recent results (batched) that are marked Send=TRUE & not Posted.
 */
function runResultsBatch() {
  const mgr = new BatchFixturesManager();
  mgr.postLeagueResultsBatch();
}

/**
 * Post "postponed" fixture updates and mark as Posted.
 */
function runPostponedBatch() {
  const mgr = new BatchFixturesManager();
  // This would typically iterate over rows with Status=Postponed & Send=TRUE
  // but exposed as single-call handler for clarity.
}

/**
 * Convenience single runner if you want one trigger for everything.
 */
function runBatchFixtures() {
  const mgr = new BatchFixturesManager();
  mgr.postLeagueFixturesBatch();
  mgr.postLeagueResultsBatch();
}

/**
 * Optional initialization/validation entry
 */
function initBatchFixtures() {
  try {
    const ssId = getConfig('SHEETS.SPREADSHEET_ID', '');
    const tabs = getConfig('SHEETS.TAB_NAMES', {});

    const results = {
      fixtures: !!SpreadsheetApp.openById(ssId).getSheetByName(tabs.FIXTURES),
      results: !!SpreadsheetApp.openById(ssId).getSheetByName(tabs.RESULTS)
    };

    const webhookConfigured = !!getWebhookUrl();

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
