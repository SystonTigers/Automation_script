/**
 * @fileoverview Monthly summaries manager for fixtures and results automation
 * @version 6.2.0
 * @author Senior Software Architect
codex/sort-and-merge-code-into-version-6.2
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

 * @description Generates monthly fixtures/results recaps with Make.com delivery, caching, and sheet logging
 */

// ==================== MONTHLY SUMMARIES MANAGER ====================

/**
 * MonthlySummariesManager orchestrates monthly fixtures/results summaries.
 main
 */
class MonthlySummariesManager {

  constructor() {
    this.logger = logger.scope('MonthlySummaries');
    this.makeIntegration = new MakeIntegration();
codex/sort-and-merge-code-into-version-6.2
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
=======
    this.memoryCache = new Map();
    this.cacheService = CacheService.getScriptCache();
    this.properties = PropertiesService.getScriptProperties();
  }

  // ==================== PUBLIC SUMMARIES ====================

  /**
   * Post monthly fixtures summary (defaults to next month).
   * @param {Date|null} targetMonthDate - Target month (1st day recommended)
   * @returns {Object} Processing result
   */
  postMonthlyFixturesSummary(targetMonthDate = null) {
    this.logger.enterFunction('postMonthlyFixturesSummary', { targetMonthDate });

    try {
      // @testHook(monthly_fixtures_date_calculation)
      const monthDate = this.resolveTargetMonth(targetMonthDate, 1);
      const monthKey = this.formatMonthKey(monthDate);

      // @testHook(monthly_fixtures_idempotency_check)
      if (this.isMonthProcessed('fixtures', monthKey)) {
        const result = {
          success: true,
          skipped: true,
          reason: 'Already processed this month',
          monthKey
        };
        this.logger.exitFunction('postMonthlyFixturesSummary', result);
        return result;
      }

      // @testHook(monthly_fixtures_data_gathering)
      const fixturesData = this.gatherMonthlyFixtures(monthDate);
      if (fixturesData.fixtures.length === 0) {
        const result = {
          success: true,
          count: 0,
          message: 'No fixtures to summarize',
          month: this.formatDisplayMonth(monthDate)
        };
        this.logger.exitFunction('postMonthlyFixturesSummary', result);
        return result;
      }

      // @testHook(monthly_fixtures_statistics_calculation)
      const statistics = this.calculateFixtureStatistics(fixturesData.fixtures, monthDate);

      // @testHook(monthly_fixtures_payload_generation)
      const payloads = this.buildMonthlyFixturesPayload(fixturesData, statistics, monthDate);

      // @testHook(monthly_fixtures_make_posting)
      const postResult = this.dispatchMonthlyPayloads(payloads);

      if (postResult.success) {
        this.markMonthProcessed('fixtures', monthKey, {
          processed: DateUtils.formatISO(DateUtils.now()),
          count: fixturesData.fixtures.length,
          statistics
        });
        this.logMonthlySummary('fixtures', monthKey, fixturesData.fixtures.length, statistics, postResult);
      }

      const result = {
        success: postResult.success,
        month: this.formatDisplayMonth(monthDate),
        monthKey,
        fixtureCount: fixturesData.fixtures.length,
        statistics,
        makePostResult: postResult,
        eventType: getConfig('MAKE.EVENT_TYPES.FIXTURES_THIS_MONTH', 'fixtures_this_month')
      };

      this.logger.exitFunction('postMonthlyFixturesSummary', result);
      return result;

    } catch (error) {
      this.logger.error('Monthly fixtures summary failed', { error: error.toString(), stack: error.stack });
      const failure = { success: false, error: error.toString() };
      this.logger.exitFunction('postMonthlyFixturesSummary', failure);
      return failure;
    }
  }

  /**
   * Post monthly results summary (defaults to previous month).
   * @param {Date|null} targetMonthDate - Target month (1st day recommended)
   * @returns {Object} Processing result
   */
  postMonthlyResultsSummary(targetMonthDate = null) {
    this.logger.enterFunction('postMonthlyResultsSummary', { targetMonthDate });

    try {
      // @testHook(monthly_results_date_calculation)
      const monthDate = this.resolveTargetMonth(targetMonthDate, -1);
      const monthKey = this.formatMonthKey(monthDate);

      // @testHook(monthly_results_idempotency_check)
      if (this.isMonthProcessed('results', monthKey)) {
        const result = {
          success: true,
          skipped: true,
          reason: 'Already processed this month',
          monthKey
        };
        this.logger.exitFunction('postMonthlyResultsSummary', result);
        return result;
      }

      // @testHook(monthly_results_data_gathering)
      const resultsData = this.gatherMonthlyResults(monthDate);
      if (resultsData.results.length === 0) {
        const result = {
          success: true,
          count: 0,
          message: 'No results to summarize',
          month: this.formatDisplayMonth(monthDate)
        };
        this.logger.exitFunction('postMonthlyResultsSummary', result);
        return result;
      }

      // @testHook(monthly_results_performance_calculation)
      const performance = this.calculateResultsPerformance(resultsData.results, monthDate);

      // @testHook(monthly_results_payload_generation)
      const payloads = this.buildMonthlyResultsPayload(resultsData, performance, monthDate);

      // @testHook(monthly_results_make_posting)
      const postResult = this.dispatchMonthlyPayloads(payloads);

      if (postResult.success) {
        this.markMonthProcessed('results', monthKey, {
          processed: DateUtils.formatISO(DateUtils.now()),
          count: resultsData.results.length,
          performance
        });
        this.logMonthlySummary('results', monthKey, resultsData.results.length, performance, postResult);
      }

      const result = {
        success: postResult.success,
        month: this.formatDisplayMonth(monthDate),
        monthKey,
        resultCount: resultsData.results.length,
        performance,
        makePostResult: postResult,
        eventType: getConfig('MAKE.EVENT_TYPES.RESULTS_THIS_MONTH', 'results_this_month')
      };

      this.logger.exitFunction('postMonthlyResultsSummary', result);
      return result;

    } catch (error) {
      this.logger.error('Monthly results summary failed', { error: error.toString(), stack: error.stack });
      const failure = { success: false, error: error.toString() };
      this.logger.exitFunction('postMonthlyResultsSummary', failure);
      return failure;
main
    }
  }

  // ==================== DATA GATHERING ====================

  /**
<<<<< codex/sort-and-merge-code-into-version-6.2
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
=======
   * Gather all fixtures for the month.
   * @param {Date} monthDate - Month anchor date
   * @returns {Object} Fixture data and metadata
   */
  gatherMonthlyFixtures(monthDate) {
    this.logger.enterFunction('gatherMonthlyFixtures', { monthDate });

    try {
      const sheetName = getConfig('SHEETS.TAB_NAMES.FIXTURES');
      const fixturesSheet = SheetUtils.getOrCreateSheet(sheetName, getConfig('SHEETS.REQUIRED_COLUMNS.FIXTURES', []));
      if (!fixturesSheet) {
        throw new Error('Fixtures sheet not available');
      }

      const data = fixturesSheet.getDataRange().getValues();
      const fixtures = [];
      const clubName = String(getConfig('SYSTEM.CLUB_NAME', 'Syston Tigers')).toLowerCase();
      const { monthStart, monthEnd } = this.getMonthBounds(monthDate);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const [dateValue, competition, homeTeam, awayTeam, venue, kickOff] = row;
        const fixtureDate = this.parseSheetDate(dateValue);
        if (!fixtureDate) continue;

        if (fixtureDate < monthStart || fixtureDate > monthEnd) {
          continue;
        }

        const homeLower = String(homeTeam || '').toLowerCase();
        const awayLower = String(awayTeam || '').toLowerCase();
        const involvesClub = homeLower.includes(clubName) || awayLower.includes(clubName);
        if (!involvesClub) continue;

        const isHome = homeLower.includes(clubName);
        const opponent = isHome ? (awayTeam || '').trim() : (homeTeam || '').trim();

        fixtures.push({
          date: fixtureDate,
          dateFormatted: this.formatDate(fixtureDate, 'dd MMM yyyy'),
          dayOfWeek: this.formatDate(fixtureDate, 'EEEE'),
          competition: competition || 'Unknown',
          homeTeam: homeTeam || '',
          awayTeam: awayTeam || '',
          opponent,
          venue: venue || 'TBC',
          kickOff: kickOff || '',
          isHome,
          homeAway: isHome ? 'H' : 'A',
          rowIndex: i + 1
        });
      }

      fixtures.sort((a, b) => a.date - b.date);

      const metadata = {
        monthName: this.formatDisplayMonth(monthDate),
        monthStart,
        monthEnd,
        totalFixtures: fixtures.length
      };

      const result = { fixtures, metadata };
      this.logger.exitFunction('gatherMonthlyFixtures', { count: fixtures.length });
      return result;

    } catch (error) {
      this.logger.error('Monthly fixtures gathering failed', { error: error.toString(), stack: error.stack });
      const failure = { fixtures: [], metadata: {} };
      this.logger.exitFunction('gatherMonthlyFixtures', { count: 0, error: error.toString() });
      return failure;
    }
  }

  /**
   * Gather all results for the month.
   * @param {Date} monthDate - Month anchor date
   * @returns {Object} Result data and metadata
   */
  gatherMonthlyResults(monthDate) {
    this.logger.enterFunction('gatherMonthlyResults', { monthDate });

    try {
      const sheetName = getConfig('SHEETS.TAB_NAMES.RESULTS');
      const resultsSheet = SheetUtils.getOrCreateSheet(sheetName, getConfig('SHEETS.REQUIRED_COLUMNS.RESULTS', []));
      if (!resultsSheet) {
        throw new Error('Results sheet not available');
      }

      const data = resultsSheet.getDataRange().getValues();
      const results = [];
      const clubName = String(getConfig('SYSTEM.CLUB_NAME', 'Syston Tigers')).toLowerCase();
      const { monthStart, monthEnd } = this.getMonthBounds(monthDate);

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const [dateValue, competition, homeTeam, awayTeam, homeScore, awayScore, venue] = row;
        const resultDate = this.parseSheetDate(dateValue);
        if (!resultDate) continue;

        if (resultDate < monthStart || resultDate > monthEnd) {
          continue;
        }

        const homeLower = String(homeTeam || '').toLowerCase();
        const awayLower = String(awayTeam || '').toLowerCase();
        const involvesClub = homeLower.includes(clubName) || awayLower.includes(clubName);
        if (!involvesClub) continue;

        const isHome = homeLower.includes(clubName);
        const opponent = isHome ? (awayTeam || '').trim() : (homeTeam || '').trim();
        const ourScore = isHome ? parseInt(homeScore, 10) || 0 : parseInt(awayScore, 10) || 0;
        const theirScore = isHome ? parseInt(awayScore, 10) || 0 : parseInt(homeScore, 10) || 0;

        let resultType = 'D';
        if (ourScore > theirScore) resultType = 'W';
        if (ourScore < theirScore) resultType = 'L';

        results.push({
          date: resultDate,
          dateFormatted: this.formatDate(resultDate, 'dd MMM yyyy'),
          dayOfWeek: this.formatDate(resultDate, 'EEEE'),
          competition: competition || 'Unknown',
          homeTeam: homeTeam || '',
          awayTeam: awayTeam || '',
          homeScore: parseInt(homeScore, 10) || 0,
          awayScore: parseInt(awayScore, 10) || 0,
          opponent,
          venue: venue || 'TBC',
          isHome,
          homeAway: isHome ? 'H' : 'A',
          ourScore,
          theirScore,
          result: resultType,
          scoreDisplay: `${ourScore}-${theirScore}`,
          fullScoreDisplay: `${parseInt(homeScore, 10) || 0}-${parseInt(awayScore, 10) || 0}`,
          goalDifference: ourScore - theirScore,
          rowIndex: i + 1
        });
      }

      results.sort((a, b) => a.date - b.date);

      const metadata = {
        monthName: this.formatDisplayMonth(monthDate),
        monthStart,
        monthEnd,
        totalResults: results.length
      };

      const result = { results, metadata };
      this.logger.exitFunction('gatherMonthlyResults', { count: results.length });
      return result;

    } catch (error) {
      this.logger.error('Monthly results gathering failed', { error: error.toString(), stack: error.stack });
      const failure = { results: [], metadata: {} };
      this.logger.exitFunction('gatherMonthlyResults', { count: 0, error: error.toString() });
      return failure;
    }
 main
  }

  // ==================== STATISTICS ====================

  /**
<<<< codex/sort-and-merge-code-into-version-6.2
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
=======
   * Calculate fixture statistics.
   * @param {Array<Object>} fixtures - Fixture list
   * @param {Date} monthDate - Month anchor date
   * @returns {Object} Statistics
   */
  calculateFixtureStatistics(fixtures, monthDate) {
    this.logger.enterFunction('calculateFixtureStatistics', { fixtureCount: fixtures.length });

    try {
      const stats = {
        totalFixtures: fixtures.length,
        homeFixtures: 0,
        awayFixtures: 0,
        competitions: new Map(),
        venues: new Map(),
        opponents: [],
        weeklyDistribution: {},
        keyMatches: [],
        monthName: this.formatDisplayMonth(monthDate)
      };

      fixtures.forEach(fixture => {
        if (fixture.isHome) {
          stats.homeFixtures++;
        } else {
          stats.awayFixtures++;
        }

        const competition = fixture.competition || 'Unknown';
        stats.competitions.set(competition, (stats.competitions.get(competition) || 0) + 1);

        const venue = fixture.venue || 'TBC';
        stats.venues.set(venue, (stats.venues.get(venue) || 0) + 1);

        stats.opponents.push({
          name: fixture.opponent,
          date: fixture.dateFormatted,
          homeAway: fixture.homeAway,
          competition: fixture.competition
        });

        const weekNumber = this.getWeekOfMonth(fixture.date);
        const weekKey = `Week ${weekNumber}`;
        stats.weeklyDistribution[weekKey] = (stats.weeklyDistribution[weekKey] || 0) + 1;

        if (this.isKeyMatch(fixture)) {
          stats.keyMatches.push(fixture);
        }
      });

      stats.competitionsBreakdown = Object.fromEntries(stats.competitions);
      stats.venuesBreakdown = Object.fromEntries(stats.venues);
      stats.homeAwayRatio = stats.totalFixtures > 0 ? Math.round((stats.homeFixtures / stats.totalFixtures) * 100) : 0;
      stats.averageFixturesPerWeek = stats.totalFixtures > 0 ? Math.round((stats.totalFixtures / 4) * 10) / 10 : 0;

      const weekKeys = Object.keys(stats.weeklyDistribution);
      stats.busiestWeek = weekKeys.reduce((current, candidate) => {
        if (!current) return candidate;
        return stats.weeklyDistribution[candidate] > stats.weeklyDistribution[current] ? candidate : current;
      }, weekKeys[0] || 'Week 1');

      stats.nextMatchHighlight = fixtures.length > 0 ? {
        opponent: fixtures[0].opponent,
        date: fixtures[0].dateFormatted,
        homeAway: fixtures[0].homeAway,
        competition: fixtures[0].competition,
        venue: fixtures[0].venue
      } : null;

      this.logger.exitFunction('calculateFixtureStatistics', {
        total: stats.totalFixtures,
        home: stats.homeFixtures,
        away: stats.awayFixtures
      });
      return stats;

    } catch (error) {
      this.logger.error('Fixture statistics calculation failed', { error: error.toString(), stack: error.stack });
      const failure = { totalFixtures: fixtures.length, error: error.toString() };
      this.logger.exitFunction('calculateFixtureStatistics', failure);
      return failure;
    }
  }

  /**
   * Calculate results performance metrics.
   * @param {Array<Object>} results - Result list
   * @param {Date} monthDate - Month anchor date
   * @returns {Object} Performance metrics
   */
  calculateResultsPerformance(results, monthDate) {
    this.logger.enterFunction('calculateResultsPerformance', { resultCount: results.length });

    try {
      const performance = {
        totalMatches: results.length,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        cleanSheets: 0,
        homeRecord: { played: 0, wins: 0, draws: 0, losses: 0 },
        awayRecord: { played: 0, wins: 0, draws: 0, losses: 0 },
        competitionBreakdown: new Map(),
        bestResult: null,
        worstResult: null,
        recentForm: [],
        monthName: this.formatDisplayMonth(monthDate)
      };

      let bestGoalDifference = -999;
      let worstGoalDifference = 999;

      results.forEach(result => {
        if (result.result === 'W') performance.wins++;
        if (result.result === 'D') performance.draws++;
        if (result.result === 'L') performance.losses++;

        performance.goalsFor += result.ourScore;
        performance.goalsAgainst += result.theirScore;

        if (result.theirScore === 0) performance.cleanSheets++;

        if (result.isHome) {
          performance.homeRecord.played++;
          if (result.result === 'W') performance.homeRecord.wins++;
          if (result.result === 'D') performance.homeRecord.draws++;
          if (result.result === 'L') performance.homeRecord.losses++;
        } else {
          performance.awayRecord.played++;
          if (result.result === 'W') performance.awayRecord.wins++;
          if (result.result === 'D') performance.awayRecord.draws++;
          if (result.result === 'L') performance.awayRecord.losses++;
        }

        const competition = result.competition || 'Unknown';
        if (!performance.competitionBreakdown.has(competition)) {
          performance.competitionBreakdown.set(competition, { played: 0, wins: 0, draws: 0, losses: 0 });
        }
        const compStats = performance.competitionBreakdown.get(competition);
        compStats.played++;
        if (result.result === 'W') compStats.wins++;
        if (result.result === 'D') compStats.draws++;
        if (result.result === 'L') compStats.losses++;

        if (result.goalDifference > bestGoalDifference) {
          bestGoalDifference = result.goalDifference;
          performance.bestResult = {
            opponent: result.opponent,
            score: result.scoreDisplay,
            date: result.dateFormatted,
            homeAway: result.homeAway,
            competition: result.competition
          };
        }

        if (result.goalDifference < worstGoalDifference) {
          worstGoalDifference = result.goalDifference;
          performance.worstResult = {
            opponent: result.opponent,
            score: result.scoreDisplay,
            date: result.dateFormatted,
            homeAway: result.homeAway,
            competition: result.competition
          };
        }

        performance.recentForm.push(result.result);
      });

      performance.recentForm = performance.recentForm.slice(-5);
      performance.competitionsBreakdown = Object.fromEntries(performance.competitionBreakdown);
      performance.points = (performance.wins * 3) + performance.draws;
      performance.winPercentage = performance.totalMatches > 0 ? Math.round((performance.wins / performance.totalMatches) * 100) : 0;
      performance.goalDifference = performance.goalsFor - performance.goalsAgainst;
      performance.averageGoalsFor = performance.totalMatches > 0 ? Math.round((performance.goalsFor / performance.totalMatches) * 10) / 10 : 0;
      performance.averageGoalsAgainst = performance.totalMatches > 0 ? Math.round((performance.goalsAgainst / performance.totalMatches) * 10) / 10 : 0;
      performance.formString = performance.recentForm.join('');
      performance.record = `W${performance.wins} D${performance.draws} L${performance.losses}`;

      this.logger.exitFunction('calculateResultsPerformance', {
        totalMatches: performance.totalMatches,
        record: performance.record,
        goalDifference: performance.goalDifference
      });
      return performance;

    } catch (error) {
      this.logger.error('Results performance calculation failed', { error: error.toString(), stack: error.stack });
      const failure = { totalMatches: results.length, error: error.toString() };
      this.logger.exitFunction('calculateResultsPerformance', failure);
      return failure;
    }
  }

  // ==================== PAYLOAD BUILDING ====================

  /**
   * Build Make.com payloads for fixtures.
   * @param {Object} fixturesData - Fixture data
   * @param {Object} statistics - Fixture statistics
   * @param {Date} monthDate - Target month
   * @returns {Array<Object>} Payload array
   */
  buildMonthlyFixturesPayload(fixturesData, statistics, monthDate) {
    this.logger.enterFunction('buildMonthlyFixturesPayload', {
      fixtureCount: fixturesData.fixtures.length
    });

    try {
      const eventType = getConfig('MAKE.EVENT_TYPES.FIXTURES_THIS_MONTH', 'fixtures_this_month');
      const maxPerPayload = getConfig('MONTHLY_SUMMARIES.MAX_FIXTURES_PER_PAYLOAD', 10);
      const chunks = this.chunkArray(fixturesData.fixtures, maxPerPayload);
      const monthKey = this.formatMonthKey(monthDate).replace('-', '_');

      const payloads = chunks.map((chunk, index) => ({
        timestamp: DateUtils.formatISO(DateUtils.now()),
        match_id: `monthly_fixtures_${monthKey}_part${index + 1}`,
        event_type: eventType,
        source: 'apps_script_monthly_manager',
        version: getConfig('SYSTEM.VERSION'),
        month_name: this.formatDisplayMonth(monthDate),
        month_key: this.formatMonthKey(monthDate),
        fixture_count: fixturesData.fixtures.length,
        fixtures_batch_count: chunk.length,
        fixtures_list: chunk.map(f => ({
          date: f.dateFormatted,
          opponent: f.opponent,
          homeAway: f.homeAway,
          competition: f.competition,
          venue: f.venue,
          kickOff: f.kickOff
        })),
        key_stats: {
          totalFixtures: statistics.totalFixtures,
          homeFixtures: statistics.homeFixtures,
          awayFixtures: statistics.awayFixtures,
          homeAwayRatio: statistics.homeAwayRatio,
          competitionsBreakdown: statistics.competitionsBreakdown,
          busiestWeek: statistics.busiestWeek,
          averageFixturesPerWeek: statistics.averageFixturesPerWeek
        },
        next_match_highlight: statistics.nextMatchHighlight,
        key_matches: statistics.keyMatches,
        weekly_distribution: statistics.weeklyDistribution,
        club_name: getConfig('SYSTEM.CLUB_NAME'),
        season: getConfig('SYSTEM.SEASON'),
        batch_position: { index: index + 1, total: chunks.length },
        idempotency_key: `monthly_fixtures_${monthKey}_part${index + 1}`
      }));

      this.logger.exitFunction('buildMonthlyFixturesPayload', { payloadCount: payloads.length });
      return payloads;

    } catch (error) {
      this.logger.error('Monthly fixtures payload building failed', { error: error.toString(), stack: error.stack });
      this.logger.exitFunction('buildMonthlyFixturesPayload', { payloadCount: 0, error: error.toString() });
      return [];
    }
  }

  /**
   * Build Make.com payloads for results.
   * @param {Object} resultsData - Results data
   * @param {Object} performance - Performance metrics
   * @param {Date} monthDate - Target month
   * @returns {Array<Object>} Payload array
   */
  buildMonthlyResultsPayload(resultsData, performance, monthDate) {
    this.logger.enterFunction('buildMonthlyResultsPayload', {
      resultCount: resultsData.results.length
    });

    try {
      const eventType = getConfig('MAKE.EVENT_TYPES.RESULTS_THIS_MONTH', 'results_this_month');
      const maxPerPayload = getConfig('MONTHLY_SUMMARIES.MAX_RESULTS_PER_PAYLOAD', 10);
      const chunks = this.chunkArray(resultsData.results, maxPerPayload);
      const monthKey = this.formatMonthKey(monthDate).replace('-', '_');

      const payloads = chunks.map((chunk, index) => ({
        timestamp: DateUtils.formatISO(DateUtils.now()),
        match_id: `monthly_results_${monthKey}_part${index + 1}`,
        event_type: eventType,
        source: 'apps_script_monthly_manager',
        version: getConfig('SYSTEM.VERSION'),
        month_name: this.formatDisplayMonth(monthDate),
        month_key: this.formatMonthKey(monthDate),
        result_count: resultsData.results.length,
        results_batch_count: chunk.length,
        results_list: chunk.map(r => ({
          date: r.dateFormatted,
          opponent: r.opponent,
          score: r.scoreDisplay,
          result: r.result,
          homeAway: r.homeAway,
          competition: r.competition
        })),
        key_stats: {
          totalMatches: performance.totalMatches,
          record: performance.record,
          points: performance.points,
          winPercentage: performance.winPercentage,
          goalDifference: performance.goalDifference,
          goalsFor: performance.goalsFor,
          goalsAgainst: performance.goalsAgainst,
          cleanSheets: performance.cleanSheets,
          averageGoalsFor: performance.averageGoalsFor,
          averageGoalsAgainst: performance.averageGoalsAgainst
        },
        home_record: {
          played: performance.homeRecord.played,
          record: `W${performance.homeRecord.wins} D${performance.homeRecord.draws} L${performance.homeRecord.losses}`
        },
        away_record: {
          played: performance.awayRecord.played,
          record: `W${performance.awayRecord.wins} D${performance.awayRecord.draws} L${performance.awayRecord.losses}`
        },
        best_result: performance.bestResult,
        worst_result: performance.worstResult,
        recent_form: performance.formString,
        goal_stats: {
          for: performance.goalsFor,
          against: performance.goalsAgainst,
          difference: performance.goalDifference,
          cleanSheets: performance.cleanSheets,
          averageFor: performance.averageGoalsFor,
          averageAgainst: performance.averageGoalsAgainst
        },
        club_name: getConfig('SYSTEM.CLUB_NAME'),
        season: getConfig('SYSTEM.SEASON'),
        batch_position: { index: index + 1, total: chunks.length },
        idempotency_key: `monthly_results_${monthKey}_part${index + 1}`
      }));

      this.logger.exitFunction('buildMonthlyResultsPayload', { payloadCount: payloads.length });
      return payloads;

    } catch (error) {
      this.logger.error('Monthly results payload building failed', { error: error.toString(), stack: error.stack });
      this.logger.exitFunction('buildMonthlyResultsPayload', { payloadCount: 0, error: error.toString() });
      return [];
    }
  }

  /**
   * Dispatch payloads to Make.com respecting batching.
   * @param {Array<Object>} payloads - Payloads to send
   * @returns {Object} Dispatch result
   */
  dispatchMonthlyPayloads(payloads) {
    this.logger.enterFunction('dispatchMonthlyPayloads', { payloadCount: payloads.length });

    try {
      if (!Array.isArray(payloads) || payloads.length === 0) {
        return { success: false, error: 'No payloads generated' };
      }

      const results = payloads.map(payload => {
        const options = {
          idempotencyKey: payload.idempotency_key,
          maxRetries: getConfig('MAKE.WEBHOOK_RETRY_ATTEMPTS', 3)
        };
        // @testHook(monthly_payload_send_start)
        const response = this.makeIntegration.sendToMake(payload, options);
        // @testHook(monthly_payload_send_complete)
        return response;
      });

      const success = results.every(res => res.success);
      const result = {
        success,
        payloadCount: payloads.length,
        responses: results
      };
      this.logger.exitFunction('dispatchMonthlyPayloads', { success, payloadCount: payloads.length });
      return result;

    } catch (error) {
      this.logger.error('Monthly payload dispatch failed', { error: error.toString(), stack: error.stack });
      const failure = { success: false, error: error.toString() };
      this.logger.exitFunction('dispatchMonthlyPayloads', failure);
      return failure;
    }
  }

  /**
   * Log monthly summary to Google Sheet.
   * @param {string} type - fixtures|results
   * @param {string} monthKey - Month key (yyyy-MM)
   * @param {number} count - Item count
   * @param {Object} summaryData - Summary statistics
   * @param {Object} postResult - Make.com result data
   * @returns {boolean} Success status
   */
  logMonthlySummary(type, monthKey, count, summaryData, postResult) {
    this.logger.enterFunction('logMonthlySummary', { type, monthKey, count });

    try {
      // @testHook(monthly_summary_logging)
      const sheetName = getConfig('SHEETS.TAB_NAMES.MONTHLY_SUMMARIES', 'Monthly Summaries');
      const columns = getConfig('SHEETS.REQUIRED_COLUMNS.MONTHLY_SUMMARIES', []);
      const summarySheet = SheetUtils.getOrCreateSheet(sheetName, columns);
      if (!summarySheet) {
        throw new Error('Monthly summaries sheet not available');
      }

      const nowIso = DateUtils.formatISO(DateUtils.now());
      const payload = {
        Timestamp: nowIso,
        Month_Key: monthKey,
        Summary_Type: type,
        Item_Count: count,
        Summary_Data: StringUtils.truncate(JSON.stringify(summaryData), 1000),
        Posted: postResult.success ? 'Y' : 'N',
        Responses: StringUtils.truncate(JSON.stringify(postResult.responses || []), 1000),
        Created: nowIso
      };

      const success = SheetUtils.addRowFromObject(summarySheet, payload);
      this.logger.exitFunction('logMonthlySummary', { success });
      return success;

    } catch (error) {
      this.logger.error('Monthly summary logging failed', { error: error.toString(), stack: error.stack });
      this.logger.exitFunction('logMonthlySummary', { success: false, error: error.toString() });
      return false;
    }
  }

  // ==================== SCHEDULING HELPERS ====================

  /**
   * Trigger fixtures summary on 25th or end of month.
   * @returns {Object} Scheduling result
   */
  scheduleMonthlyFixturesSummary() {
    this.logger.enterFunction('scheduleMonthlyFixturesSummary');

    try {
      const now = DateUtils.now();
      const currentDay = now.getDate();
      const isEndWindow = this.isEndOfMonth(now);

      if (currentDay === 25 || isEndWindow) {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const result = this.postMonthlyFixturesSummary(nextMonth);
        this.logger.exitFunction('scheduleMonthlyFixturesSummary', result);
        return result;
      }

      const result = {
        success: true,
        skipped: true,
        reason: 'Not scheduled day',
        currentDay,
        scheduledDay: 25
      };
      this.logger.exitFunction('scheduleMonthlyFixturesSummary', result);
      return result;

    } catch (error) {
      this.logger.error('Monthly fixtures scheduling failed', { error: error.toString(), stack: error.stack });
      const failure = { success: false, error: error.toString() };
      this.logger.exitFunction('scheduleMonthlyFixturesSummary', failure);
      return failure;
    }
  }

  /**
   * Trigger results summary on 2nd of month.
   * @returns {Object} Scheduling result
   */
  scheduleMonthlyResultsSummary() {
    this.logger.enterFunction('scheduleMonthlyResultsSummary');

    try {
      const now = DateUtils.now();
      const currentDay = now.getDate();

      if (currentDay === 2) {
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const result = this.postMonthlyResultsSummary(previousMonth);
        this.logger.exitFunction('scheduleMonthlyResultsSummary', result);
        return result;
      }

      const result = {
        success: true,
        skipped: true,
        reason: 'Not scheduled day',
        currentDay,
        scheduledDay: 2
      };
      this.logger.exitFunction('scheduleMonthlyResultsSummary', result);
      return result;

    } catch (error) {
      this.logger.error('Monthly results scheduling failed', { error: error.toString(), stack: error.stack });
      const failure = { success: false, error: error.toString() };
      this.logger.exitFunction('scheduleMonthlyResultsSummary', failure);
      return failure;
    }
  }

  /**
   * Combined scheduling check for automation triggers.
   * @returns {Object} Combined result
   */
  runMonthlySchedulingCheck() {
    this.logger.enterFunction('runMonthlySchedulingCheck');

    try {
      const fixturesResult = this.scheduleMonthlyFixturesSummary();
      const resultsResult = this.scheduleMonthlyResultsSummary();
      const success = fixturesResult.success && resultsResult.success;

      const result = {
        success,
        fixturesTriggered: !fixturesResult.skipped,
        resultsTriggered: !resultsResult.skipped,
        fixturesResult,
        resultsResult
      };
      this.logger.exitFunction('runMonthlySchedulingCheck', result);
      return result;

    } catch (error) {
      this.logger.error('Monthly scheduling check failed', { error: error.toString(), stack: error.stack });
      const failure = { success: false, error: error.toString() };
      this.logger.exitFunction('runMonthlySchedulingCheck', failure);
      return failure;
    }
  }

  // ==================== CACHE & UTILITIES ====================

  /**
   * Determine if month already processed.
   * @param {string} type - fixtures|results
   * @param {string} monthKey - Month key (yyyy-MM)
   * @returns {boolean} Processed state
   */
  isMonthProcessed(type, monthKey) {
    const cacheKey = this.buildCacheKey(type, monthKey);

    if (this.memoryCache.has(cacheKey)) {
      return true;
    }

    const cached = this.cacheService ? this.cacheService.get(cacheKey) : null;
    if (cached) {
      this.memoryCache.set(cacheKey, true);
      return true;
    }

    const stored = this.properties.getProperty(cacheKey);
    if (stored) {
      this.memoryCache.set(cacheKey, true);
      if (this.cacheService) {
        const ttl = getConfig('MONTHLY_SUMMARIES.CACHE_TTL_SECONDS', 21600);
        this.cacheService.put(cacheKey, '1', ttl);
      }
      return true;
    }

    return false;
  }

  /**
   * Mark month as processed.
   * @param {string} type - fixtures|results
   * @param {string} monthKey - Month key
   * @param {Object} metadata - Metadata to persist
   */
  markMonthProcessed(type, monthKey, metadata) {
    const cacheKey = this.buildCacheKey(type, monthKey);
    const ttl = getConfig('MONTHLY_SUMMARIES.CACHE_TTL_SECONDS', 21600);

    this.memoryCache.set(cacheKey, true);
    if (this.cacheService) {
      this.cacheService.put(cacheKey, '1', ttl);
    }
    this.properties.setProperty(cacheKey, JSON.stringify(metadata));
  }

  /**
   * Build cache key for month/type.
   * @param {string} type - Summary type
   * @param {string} monthKey - Month key
   * @returns {string} Cache key
   */
  buildCacheKey(type, monthKey) {
    return `monthly_summary_${type}_${monthKey}`;
  }

  /**
   * Resolve target month relative to now when not provided.
   * @param {Date|null} targetMonthDate - Provided target
   * @param {number} offsetMonths - Offset to apply when null
   * @returns {Date} Month date (1st of month)
   */
  resolveTargetMonth(targetMonthDate, offsetMonths) {
    if (targetMonthDate instanceof Date) {
      return new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), 1);
    }

    const now = DateUtils.now();
    return new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  }

  /**
   * Compute month bounds for filtering.
   * @param {Date} monthDate - Month anchor
   * @returns {Object} Month bounds
   */
  getMonthBounds(monthDate) {
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
    return { monthStart, monthEnd };
  }

  /**
   * Parse sheet date values.
   * @param {*} value - Sheet cell value
 main
   * @returns {Date|null} Parsed date
   */
  parseSheetDate(value) {
    if (value instanceof Date) {
      return value;
    }
 codex/sort-and-merge-code-into-version-6.2
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
    if (typeof value === 'number') {
      return new Date(value);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;

      const parsed = DateUtils.parseUK ? DateUtils.parseUK(trimmed) : null;
      if (parsed) {
        return parsed;
      }

      const isoDate = new Date(trimmed);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
    }

    return null;
  }

  /**
   * Format month key.
   * @param {Date} monthDate - Month anchor
   * @returns {string} Month key (yyyy-MM)
   */
  formatMonthKey(monthDate) {
    const year = monthDate.getFullYear();
    const month = (monthDate.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Format month for display.
   * @param {Date} monthDate - Month anchor
   * @returns {string} Display string (e.g. March 2025)
   */
  formatDisplayMonth(monthDate) {
    const formatter = Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });
    return formatter.format(monthDate);
  }

  /**
   * Format date with Apps Script Utilities.
   * @param {Date} date - Date to format
   * @param {string} pattern - Format pattern
   * @returns {string} Formatted date string
   */
  formatDate(date, pattern) {
    if (!(date instanceof Date)) {
      return '';
    }
    return Utilities.formatDate(date, getConfig('SYSTEM.TIMEZONE', 'Europe/London'), pattern);
  }

  /**
   * Determine week number in month.
   * @param {Date} date - Date within month
   * @returns {number} Week number (1-5)
   */
  getWeekOfMonth(date) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfMonth = date.getDate();
    const firstDayWeekday = firstDay.getDay();
    return Math.ceil((dayOfMonth + firstDayWeekday) / 7);
  }

  /**
   * Identify key matches (derbies, cups, etc.).
   * @param {Object} fixture - Fixture data
   * @returns {boolean} True if key match
   */
  isKeyMatch(fixture) {
    try {
      const opponent = String(fixture.opponent || '').toLowerCase();
      const competition = String(fixture.competition || '').toLowerCase();

      const localRivals = getConfig('MONTHLY_SUMMARIES.LOCAL_RIVALS', ['leicester', 'melton', 'oadby', 'hinckley', 'coalville']);
      const isLocalDerby = localRivals.some(rival => opponent.includes(rival));
      const isCupMatch = competition.includes('cup') || competition.includes('trophy');
      const importantCompetitions = getConfig('MONTHLY_SUMMARIES.IMPORTANT_COMPETITIONS', ['league cup', 'fa cup', 'county cup']);
      const isImportantComp = importantCompetitions.some(keyword => competition.includes(keyword));

      return isLocalDerby || isCupMatch || isImportantComp;
    } catch (error) {
      this.logger.error('Key match detection failed', { error: error.toString(), stack: error.stack });
      return false;
    }
  }

  /**
   * Check if near end of month window.
   * @param {Date} date - Date to evaluate
   * @returns {boolean} True if within last two days
   */
  isEndOfMonth(date) {
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return date.getDate() >= lastDay - 2;
  }

  /**
   * Chunk array respecting Make.com limits.
   * @param {Array} items - Items to chunk
   * @param {number} chunkSize - Max chunk size
   * @returns {Array<Array>} Chunked array
   */
  chunkArray(items, chunkSize) {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const safeSize = Math.max(1, chunkSize || 10);
    const chunks = [];
    for (let i = 0; i < items.length; i += safeSize) {
      chunks.push(items.slice(i, i + safeSize));
    }
    return chunks;
  }
}

// ==================== INITIALIZATION & PUBLIC API ====================

/**
 * Initialize monthly summaries module.
 * @returns {Object} Initialization result
 */
function initializeMonthlySummaries() {
  logger.enterFunction('MonthlySummaries.initialize');

  try {
    const sheetName = getConfig('SHEETS.TAB_NAMES.MONTHLY_SUMMARIES', 'Monthly Summaries');
    const columns = getConfig('SHEETS.REQUIRED_COLUMNS.MONTHLY_SUMMARIES', []);
    const sheet = SheetUtils.getOrCreateSheet(sheetName, columns);

    const result = {
      success: !!sheet,
      cacheConfigured: true,
      makeEnabled: isFeatureEnabled('MAKE_INTEGRATION'),
      monthlySummariesEnabled: isFeatureEnabled('MONTHLY_SUMMARIES')
    };

    logger.exitFunction('MonthlySummaries.initialize', result);
    return result;

  } catch (error) {
    logger.error('Monthly summaries initialization failed', { error: error.toString(), stack: error.stack });
    const failure = { success: false, error: error.toString() };
    logger.exitFunction('MonthlySummaries.initialize', failure);
    return failure;
  }
}

/**
 * Public API: Post monthly fixtures summary.
 * @param {number|null} month - Month (1-12)
 * @param {number|null} year - Year
 * @returns {Object} Result
 */
function postMonthlyFixturesSummary(month = null, year = null) {
  logger.enterFunction('postMonthlyFixturesSummary', { month, year });

  try {
    const manager = new MonthlySummariesManager();
    const monthDate = month && year ? new Date(year, month - 1, 1) : null;
    const result = manager.postMonthlyFixturesSummary(monthDate);
    logger.exitFunction('postMonthlyFixturesSummary', { success: result.success });
    return result;
  } catch (error) {
    logger.error('Public monthly fixtures summary failed', { error: error.toString(), stack: error.stack });
    const failure = { success: false, error: error.toString() };
    logger.exitFunction('postMonthlyFixturesSummary', failure);
    return failure;
  }
}

/**
 * Public API: Post monthly results summary.
 * @param {number|null} month - Month (1-12)
 * @param {number|null} year - Year
 * @returns {Object} Result
 */
function postMonthlyResultsSummary(month = null, year = null) {
  logger.enterFunction('postMonthlyResultsSummary', { month, year });

  try {
    const manager = new MonthlySummariesManager();
    const monthDate = month && year ? new Date(year, month - 1, 1) : null;
    const result = manager.postMonthlyResultsSummary(monthDate);
    logger.exitFunction('postMonthlyResultsSummary', { success: result.success });
    return result;
  } catch (error) {
    logger.error('Public monthly results summary failed', { error: error.toString(), stack: error.stack });
    const failure = { success: false, error: error.toString() };
    logger.exitFunction('postMonthlyResultsSummary', failure);
    return failure;
  }
}

/**
 * Public API: Run monthly scheduling check.
 * @returns {Object} Result
 */
function runMonthlySchedulingCheck() {
  logger.enterFunction('runMonthlySchedulingCheck');

  try {
    const manager = new MonthlySummariesManager();
    const result = manager.runMonthlySchedulingCheck();
    logger.exitFunction('runMonthlySchedulingCheck', { success: result.success });
    return result;
  } catch (error) {
    logger.error('Monthly scheduling check failed', { error: error.toString(), stack: error.stack });
    const failure = { success: false, error: error.toString() };
    logger.exitFunction('runMonthlySchedulingCheck', failure);
    return failure;
  }
}

// Export globals for Apps Script triggers
globalThis.postMonthlyFixturesSummary = postMonthlyFixturesSummary;
globalThis.postMonthlyResultsSummary = postMonthlyResultsSummary;
globalThis.runMonthlySchedulingCheck = runMonthlySchedulingCheck;
 main
