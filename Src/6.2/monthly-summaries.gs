/**
 * @fileoverview Monthly summaries manager for fixtures and results automation
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Ports the full monthly summary engine from the 6.0 misplaced code specification
 *
 * FEATURES IMPLEMENTED:
 * - Monthly fixtures preview with statistics and Make.com payload
 * - Monthly results recap with win/draw/loss breakdown
 * - Idempotency guard using sheet-backed cache to remain Make.com free tier compliant
 * - Logging to dedicated Monthly Content sheet for auditability
 */

// ==================== MONTHLY SUMMARIES MANAGER CLASS ====================

/**
 * Monthly Summaries Manager - Handles monthly fixtures and results payloads
 */
class MonthlySummariesManager {

  constructor() {
    this.logger = logger.scope('MonthlySummaries');
    this.makeIntegration = new MakeIntegration();
    this.monthlyCache = new Map();
    this.monthlySheetName = getConfig('SHEETS.TAB_NAMES.MONTHLY_CONTENT');
    this.monthlySheetColumns = getConfig('SHEETS.REQUIRED_COLUMNS.MONTHLY_CONTENT', []);
    this.monthlySheet = null;
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Post monthly fixtures summary (preview for upcoming month)
   * @param {number|null} month - Optional month override (1-12)
   * @param {number|null} year - Optional year override
   * @returns {Object} Posting result
   */
  postMonthlyFixturesSummary(month = null, year = null) {
    this.logger.enterFunction('postMonthlyFixturesSummary', { month, year });

    try {
      const { targetDate, monthNumber, yearNumber } = this.resolveMonthParameters(month, year, 'fixtures');
      const monthKey = this.buildMonthKey(yearNumber, monthNumber);

      if (this.isDuplicateRequest('fixtures', monthKey)) {
        return {
          success: true,
          duplicate: true,
          month_key: monthKey,
          message: 'Fixtures summary already processed'
        };
      }

      const fixturesData = this.gatherMonthlyFixtures(targetDate);

      if (fixturesData.fixtures.length === 0) {
        this.logger.info('No fixtures found for monthly summary', { month_key: monthKey });
        return {
          success: true,
          count: 0,
          month: monthNumber,
          year: yearNumber,
          month_key: monthKey,
          message: 'No fixtures scheduled for this month'
        };
      }

      const statistics = this.calculateFixtureStatistics(fixturesData.fixtures, targetDate);
      const idempotencyKey = this.buildIdempotencyKey('fixtures', monthKey);
      const payload = this.buildMonthlyFixturesPayload(fixturesData, statistics, monthKey, idempotencyKey);

      // @testHook(monthly_fixtures_webhook_start)
      const makeResult = this.makeIntegration.sendToMake(payload, { idempotencyKey });
      // @testHook(monthly_fixtures_webhook_complete)

      if (makeResult.success) {
        this.markProcessed('fixtures', monthKey, {
          count: fixturesData.fixtures.length,
          statistics,
          payload,
          makeResult
        });
      }

      const response = {
        success: makeResult.success,
        month: monthNumber,
        year: yearNumber,
        month_key: monthKey,
        count: fixturesData.fixtures.length,
        statistics,
        payload,
        make_result: makeResult,
        idempotency_key: idempotencyKey
      };

      this.logger.exitFunction('postMonthlyFixturesSummary', response);
      return response;

    } catch (error) {
      this.logger.error('Monthly fixtures summary failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Post monthly results summary (recap for previous month)
   * @param {number|null} month - Optional month override (1-12)
   * @param {number|null} year - Optional year override
   * @returns {Object} Posting result
   */
  postMonthlyResultsSummary(month = null, year = null) {
    this.logger.enterFunction('postMonthlyResultsSummary', { month, year });

    try {
      const { targetDate, monthNumber, yearNumber } = this.resolveMonthParameters(month, year, 'results');
      const monthKey = this.buildMonthKey(yearNumber, monthNumber);

      if (this.isDuplicateRequest('results', monthKey)) {
        return {
          success: true,
          duplicate: true,
          month_key: monthKey,
          message: 'Results summary already processed'
        };
      }

      const resultsData = this.gatherMonthlyResults(targetDate);

      if (resultsData.results.length === 0) {
        this.logger.info('No results found for monthly summary', { month_key: monthKey });
        return {
          success: true,
          count: 0,
          month: monthNumber,
          year: yearNumber,
          month_key: monthKey,
          message: 'No results recorded for this month'
        };
      }

      const statistics = this.calculateResultStatistics(resultsData.results);
      const idempotencyKey = this.buildIdempotencyKey('results', monthKey);
      const payload = this.buildMonthlyResultsPayload(resultsData, statistics, monthKey, idempotencyKey);

      // @testHook(monthly_results_webhook_start)
      const makeResult = this.makeIntegration.sendToMake(payload, { idempotencyKey });
      // @testHook(monthly_results_webhook_complete)

      if (makeResult.success) {
        this.markProcessed('results', monthKey, {
          count: resultsData.results.length,
          statistics,
          payload,
          makeResult
        });
      }

      const response = {
        success: makeResult.success,
        month: monthNumber,
        year: yearNumber,
        month_key: monthKey,
        count: resultsData.results.length,
        statistics,
        payload,
        make_result: makeResult,
        idempotency_key: idempotencyKey
      };

      this.logger.exitFunction('postMonthlyResultsSummary', response);
      return response;

    } catch (error) {
      this.logger.error('Monthly results summary failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== DATA GATHERING ====================

  /**
   * Gather fixtures for the target month
   * @param {Date} targetDate - Date within the target month
   * @returns {Object} Fixtures array and metadata
   */
  gatherMonthlyFixtures(targetDate) {
    const fixturesSheet = this.getFixturesSheet();

    if (!fixturesSheet) {
      return { fixtures: [], metadata: {} };
    }

    const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    const fixtures = allFixtures
      .map(fixture => this.normalizeFixtureRow(fixture))
      .filter(entry => entry && entry.date >= monthStart && entry.date <= monthEnd)
      .sort((a, b) => a.date - b.date);

    const metadata = {
      month_key: this.buildMonthKey(targetDate.getFullYear(), targetDate.getMonth() + 1),
      month_name: DateUtils.getMonthName(targetDate.getMonth() + 1),
      fixtures_count: fixtures.length
    };

    return { fixtures, metadata };
  }

  /**
   * Gather results for the target month
   * @param {Date} targetDate - Date within the target month
   * @returns {Object} Results array and metadata
   */
  gatherMonthlyResults(targetDate) {
    const resultsSheet = this.getResultsSheet();

    if (!resultsSheet) {
      return { results: [], metadata: {} };
    }

    const allResults = SheetUtils.getAllDataAsObjects(resultsSheet);
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    const results = allResults
      .map(result => this.normalizeResultRow(result))
      .filter(entry => entry && entry.date >= monthStart && entry.date <= monthEnd)
      .sort((a, b) => a.date - b.date);

    const metadata = {
      month_key: this.buildMonthKey(targetDate.getFullYear(), targetDate.getMonth() + 1),
      month_name: DateUtils.getMonthName(targetDate.getMonth() + 1),
      results_count: results.length
    };

    return { results, metadata };
  }

  // ==================== STATISTICS ====================

  /**
   * Calculate fixture statistics for month
   * @param {Array<Object>} fixtures - Normalized fixtures
   * @param {Date} targetDate - Date within target month
   * @returns {Object} Statistics summary
   */
  calculateFixtureStatistics(fixtures, targetDate) {
    const stats = {
      total_fixtures: fixtures.length,
      home_fixtures: 0,
      away_fixtures: 0,
      competitions: {},
      venues: {},
      opponents: [],
      weekly_distribution: {},
      key_matches: [],
      next_match_highlight: null,
      month_name: DateUtils.getMonthName(targetDate.getMonth() + 1)
    };

    fixtures.forEach(fixture => {
      if (fixture.homeAway === 'Home') {
        stats.home_fixtures += 1;
      } else {
        stats.away_fixtures += 1;
      }

      const competition = fixture.competition || 'Unknown';
      stats.competitions[competition] = (stats.competitions[competition] || 0) + 1;

      const venue = fixture.venue || 'TBC';
      stats.venues[venue] = (stats.venues[venue] || 0) + 1;

      stats.opponents.push({
        opponent: fixture.opponent,
        date: fixture.dateFormatted,
        home_away: fixture.homeAway,
        competition: fixture.competition
      });

      const weekKey = `Week ${this.getWeekOfMonth(fixture.date)}`;
      stats.weekly_distribution[weekKey] = (stats.weekly_distribution[weekKey] || 0) + 1;

      if (fixture.isKeyMatch) {
        stats.key_matches.push(fixture);
      }
    });

    stats.next_match_highlight = fixtures[0] || null;
    stats.home_away_ratio = stats.total_fixtures > 0 ? Math.round((stats.home_fixtures / stats.total_fixtures) * 100) : 0;

    return stats;
  }

  /**
   * Calculate result statistics for month
   * @param {Array<Object>} results - Normalized results
   * @returns {Object} Statistics summary
   */
  calculateResultStatistics(results) {
    const stats = {
      total_results: results.length,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      clean_sheets: 0,
      best_result: null,
      worst_result: null
    };

    let bestGoalDiff = -999;
    let worstGoalDiff = 999;

    results.forEach(result => {
      stats.goals_for += result.our_score;
      stats.goals_against += result.opposition_score;

      if (result.opposition_score === 0) {
        stats.clean_sheets += 1;
      }

      if (result.goal_difference > 0) {
        stats.wins += 1;
      } else if (result.goal_difference === 0) {
        stats.draws += 1;
      } else {
        stats.losses += 1;
      }

      if (result.goal_difference > bestGoalDiff) {
        bestGoalDiff = result.goal_difference;
        stats.best_result = result;
      }

      if (result.goal_difference < worstGoalDiff) {
        worstGoalDiff = result.goal_difference;
        stats.worst_result = result;
      }
    });

    stats.goal_difference = stats.goals_for - stats.goals_against;
    return stats;
  }

  // ==================== PAYLOAD BUILDERS ====================

  /**
   * Build fixtures payload for Make.com
   * @param {Object} fixturesData - Fixtures data and metadata
   * @param {Object} statistics - Calculated statistics
   * @param {string} monthKey - Month identifier
   * @param {string} idempotencyKey - Idempotency key
   * @returns {Object} Payload object
   */
  buildMonthlyFixturesPayload(fixturesData, statistics, monthKey, idempotencyKey) {
    const eventType = getConfig('MAKE.EVENT_TYPES.FIXTURES_THIS_MONTH', 'fixtures_this_month');
    const monthNumber = parseInt(monthKey.split('-')[1], 10);
    const yearNumber = parseInt(monthKey.split('-')[0], 10);

    return {
      event_type: eventType,
      idempotency_key: idempotencyKey,
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      month_key: monthKey,
      month_name: DateUtils.getMonthName(monthNumber),
      month_number: monthNumber,
      year: yearNumber,
      fixtures_count: fixturesData.fixtures.length,
      fixtures: fixturesData.fixtures,
      statistics,
      metadata: {
        posted_at: DateUtils.formatISO(DateUtils.now()),
        week_distribution: statistics.weekly_distribution,
        venues_breakdown: statistics.venues,
        competitions_breakdown: statistics.competitions
      }
    };
  }

  /**
   * Build results payload for Make.com
   * @param {Object} resultsData - Results data and metadata
   * @param {Object} statistics - Calculated statistics
   * @param {string} monthKey - Month identifier
   * @param {string} idempotencyKey - Idempotency key
   * @returns {Object} Payload object
   */
  buildMonthlyResultsPayload(resultsData, statistics, monthKey, idempotencyKey) {
    const eventType = getConfig('MAKE.EVENT_TYPES.RESULTS_THIS_MONTH', 'results_this_month');
    const monthNumber = parseInt(monthKey.split('-')[1], 10);
    const yearNumber = parseInt(monthKey.split('-')[0], 10);

    return {
      event_type: eventType,
      idempotency_key: idempotencyKey,
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      month_key: monthKey,
      month_name: DateUtils.getMonthName(monthNumber),
      month_number: monthNumber,
      year: yearNumber,
      results_count: resultsData.results.length,
      results: resultsData.results,
      statistics,
      metadata: {
        posted_at: DateUtils.formatISO(DateUtils.now()),
        goal_difference: statistics.goal_difference
      }
    };
  }

  // ==================== IDEMPOTENCY & LOGGING ====================

  /**
   * Determine if summary already processed
   * @param {string} type - Summary type (fixtures/results)
   * @param {string} monthKey - Month identifier
   * @returns {boolean} Duplicate flag
   */
  isDuplicateRequest(type, monthKey) {
    const idempotencyKey = this.buildIdempotencyKey(type, monthKey);

    if (this.monthlyCache.has(idempotencyKey)) {
      return true;
    }

    const sheet = this.getMonthlySheet();
    if (!sheet) {
      return false;
    }

    const existing = SheetUtils.findRowByCriteria(sheet, {
      'Month Key': monthKey,
      'Type': type
    });

    if (existing && existing['Processed At']) {
      this.monthlyCache.set(idempotencyKey, existing);
      return true;
    }

    return false;
  }

  /**
   * Record successful summary for idempotency and auditing
   * @param {string} type - Summary type
   * @param {string} monthKey - Month identifier
   * @param {Object} context - Summary context
   */
  markProcessed(type, monthKey, context) {
    const idempotencyKey = this.buildIdempotencyKey(type, monthKey);
    this.monthlyCache.set(idempotencyKey, context);

    const sheet = this.getMonthlySheet();
    if (!sheet) {
      return;
    }

    const summaryRow = {
      'Month Key': monthKey,
      'Type': type,
      'Event Type': context.payload?.event_type || '',
      'Count': context.count || 0,
      'Statistics JSON': JSON.stringify(context.statistics || {}),
      'Payload Preview': this.truncate(JSON.stringify(context.payload || {})),
      'Processed At': DateUtils.formatISO(DateUtils.now()),
      'Idempotency Key': idempotencyKey,
      'Make Result': context.makeResult?.success ? 'Success' : `Error: ${context.makeResult?.error || 'Unknown'}`
    };

    const existing = SheetUtils.findRowByCriteria(sheet, {
      'Month Key': monthKey,
      'Type': type
    });

    if (existing) {
      SheetUtils.updateRowByCriteria(sheet, { 'Month Key': monthKey, 'Type': type }, summaryRow);
    } else {
      SheetUtils.addRowFromObject(sheet, summaryRow);
    }
  }

  // ==================== NORMALIZATION HELPERS ====================

  /**
   * Normalize fixture row from sheet
   * @param {Object} row - Raw sheet row
   * @returns {Object|null} Normalized fixture
   */
  normalizeFixtureRow(row) {
    if (!row || !row.Date || !row.Opposition) {
      return null;
    }

    const date = this.parseSheetDate(row.Date);
    if (!date) {
      return null;
    }

    return {
      date,
      dateFormatted: DateUtils.formatUK(date),
      time: row.Time || '',
      opponent: row.Opposition,
      competition: row.Competition || 'Friendly',
      venue: row.Venue || 'TBC',
      homeAway: row['Home/Away'] || '',
      isKeyMatch: this.isKeyMatch(row)
    };
  }

  /**
   * Normalize result row from sheet
   * @param {Object} row - Raw sheet row
   * @returns {Object|null} Normalized result
   */
  normalizeResultRow(row) {
    if (!row || !row.Date || !row.Opposition) {
      return null;
    }

    const date = this.parseSheetDate(row.Date);
    if (!date) {
      return null;
    }

    const ourScore = this.resolveClubScore(row);
    const oppositionScore = this.resolveOppositionScore(row);

    return {
      date,
      dateFormatted: DateUtils.formatUK(date),
      opponent: row.Opposition,
      competition: row.Competition || 'Friendly',
      homeAway: row['Home/Away'] || '',
      our_score: ourScore,
      opposition_score: oppositionScore,
      goal_difference: ourScore - oppositionScore,
      scoreline: `${ourScore}-${oppositionScore}`
    };
  }

  // ==================== UTILITY HELPERS ====================

  /**
   * Resolve month parameters and defaulting rules
   * @param {number|null} month - Provided month
   * @param {number|null} year - Provided year
   * @param {string} mode - fixtures | results
   * @returns {Object} Target date and numbers
   */
  resolveMonthParameters(month, year, mode) {
    const now = DateUtils.now();
    let targetMonth = month;
    let targetYear = year;

    if (!targetMonth || targetMonth < 1 || targetMonth > 12) {
      if (mode === 'fixtures') {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        targetMonth = nextMonth.getMonth() + 1;
        targetYear = targetYear || nextMonth.getFullYear();
      } else {
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        targetMonth = previousMonth.getMonth() + 1;
        targetYear = targetYear || previousMonth.getFullYear();
      }
    }

    if (!targetYear) {
      targetYear = now.getFullYear();
    }

    const targetDate = new Date(targetYear, targetMonth - 1, 1);
    return { targetDate, monthNumber: targetMonth, yearNumber: targetYear };
  }

  /**
   * Build month key string
   * @param {number} year - Year value
   * @param {number} month - Month value (1-12)
   * @returns {string} Month key string
   */
  buildMonthKey(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  /**
   * Build idempotency key for monthly summary
   * @param {string} type - Summary type
   * @param {string} monthKey - Month identifier
   * @returns {string} Idempotency key
   */
  buildIdempotencyKey(type, monthKey) {
    return `monthly_${type}_${monthKey}`;
  }

  /**
   * Parse sheet date value (Date or string)
   * @param {Date|string} value - Sheet date value
   * @returns {Date|null} Parsed date
   */
  parseSheetDate(value) {
    if (value instanceof Date) {
      return value;
    }

    return DateUtils.parseUK(String(value)) || new Date(value);
  }

  /**
   * Determine if fixture is key match based on competition keywords
   * @param {Object} fixture - Fixture row
   * @returns {boolean} Key match flag
   */
  isKeyMatch(fixture) {
    const competition = (fixture.Competition || '').toLowerCase();
    const keywords = ['cup', 'final', 'semi', 'derby', 'playoff'];
    return keywords.some(keyword => competition.includes(keyword));
  }

  /**
   * Resolve home score for Syston Tigers
   * @param {Object} resultRow - Result row
   * @returns {number} Our score
   */
  resolveClubScore(resultRow) {
    if (resultRow['Home/Away'] === 'Home') {
      return parseInt(resultRow['Home Score'], 10) || 0;
    }
    return parseInt(resultRow['Away Score'], 10) || 0;
  }

  /**
   * Resolve opposition score for Syston Tigers
   * @param {Object} resultRow - Result row
   * @returns {number} Opposition score
   */
  resolveOppositionScore(resultRow) {
    if (resultRow['Home/Away'] === 'Home') {
      return parseInt(resultRow['Away Score'], 10) || 0;
    }
    return parseInt(resultRow['Home Score'], 10) || 0;
  }

  /**
   * Determine week of month for given date
   * @param {Date} date - Target date
   * @returns {number} Week number
   */
  getWeekOfMonth(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const offset = start.getDay() === 0 ? 7 : start.getDay();
    return Math.ceil((date.getDate() + offset - 1) / 7);
  }

  /**
   * Truncate strings to avoid exceeding Make.com limits
   * @param {string} value - String value
   * @param {number} length - Maximum length
   * @returns {string} Truncated string
   */
  truncate(value, length = 500) {
    if (!value) return '';
    return value.length > length ? `${value.substring(0, length)}…` : value;
  }

  /**
   * Lazy getter for fixtures sheet
   * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} Fixtures sheet
   */
  getFixturesSheet() {
    return SheetUtils.getOrCreateSheet(
      getConfig('SHEETS.TAB_NAMES.FIXTURES'),
      getConfig('SHEETS.REQUIRED_COLUMNS.FIXTURES')
    );
  }

  /**
   * Lazy getter for results sheet
   * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} Results sheet
   */
  getResultsSheet() {
    return SheetUtils.getOrCreateSheet(
      getConfig('SHEETS.TAB_NAMES.RESULTS'),
      getConfig('SHEETS.REQUIRED_COLUMNS.RESULTS')
    );
  }

  /**
   * Lazy getter for monthly sheet
   * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} Monthly sheet
   */
  getMonthlySheet() {
    if (!this.monthlySheetName) {
      return null;
    }

    if (!this.monthlySheet) {
      this.monthlySheet = SheetUtils.getOrCreateSheet(this.monthlySheetName, this.monthlySheetColumns);
    }

    return this.monthlySheet;
  }
}

// ==================== PUBLIC API WRAPPERS ====================

/**
 * Post monthly fixtures summary (public API)
 * @param {number|null} month - Optional month override
 * @param {number|null} year - Optional year override
 * @returns {Object} Posting result
 */
function postMonthlyFixturesSummary(month = null, year = null) {
  const manager = new MonthlySummariesManager();
  return manager.postMonthlyFixturesSummary(month, year);
}

/**
 * Post monthly results summary (public API)
 * @param {number|null} month - Optional month override
 * @param {number|null} year - Optional year override
 * @returns {Object} Posting result
 */
function postMonthlyResultsSummary(month = null, year = null) {
  const manager = new MonthlySummariesManager();
  return manager.postMonthlyResultsSummary(month, year);
}

/**
 * Initialize monthly summaries component
 * @returns {Object} Initialization result
 */
function initializeMonthlySummaries() {
  logger.enterFunction('MonthlySummaries.initialize');

  try {
    const manager = new MonthlySummariesManager();
    const fixturesSheet = manager.getFixturesSheet();
    const resultsSheet = manager.getResultsSheet();
    const monthlySheet = manager.getMonthlySheet();

    const initialization = {
      fixtures_sheet_ready: !!fixturesSheet,
      results_sheet_ready: !!resultsSheet,
      monthly_log_ready: !!monthlySheet
    };

    logger.exitFunction('MonthlySummaries.initialize', { success: true, initialization });
    return { success: true, initialization };

  } catch (error) {
    logger.error('Monthly summaries initialization failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}
