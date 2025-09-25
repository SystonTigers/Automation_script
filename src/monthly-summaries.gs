/**
 * @fileoverview Monthly summaries manager for fixtures and results automation
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Generates monthly fixtures/results recaps with Make.com delivery, caching, and sheet logging
 */

// ==================== MONTHLY SUMMARIES MANAGER ====================

/**
 * MonthlySummariesManager orchestrates monthly fixtures/results summaries.
 */
class MonthlySummariesManager {

  constructor() {
    this.loggerName = 'MonthlySummaries';
    this._logger = null;
    this.makeIntegration = new MakeIntegration();
    this.summaryConfig = getConfig('MONTHLY_SUMMARIES', {});
    this.monthlyContentSheetName = getConfig('SHEETS.TAB_NAMES.MONTHLY_CONTENT');
    this.monthlyContentColumns = getConfig('SHEETS.REQUIRED_COLUMNS.MONTHLY_CONTENT', []);
    this.properties = (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties)
      ? PropertiesService.getScriptProperties()
      : null;
    this.cache = new Map();
    this.maxFixturesPerPayload = this.summaryConfig.MAX_FIXTURES_PER_PAYLOAD || 10;
    this.maxResultsPerPayload = this.summaryConfig.MAX_RESULTS_PER_PAYLOAD || 10;
    this.cacheTtlSeconds = this.summaryConfig.CACHE_TTL_SECONDS || 21600;
    this.monthlySheet = null;
    this.variantBuilderAvailable = typeof buildTemplateVariantCollection === 'function';
  }

  get logger() {
    if (!this._logger) {
      try {
        this._logger = logger.scope(this.loggerName);
      } catch (error) {
        this._logger = {
          enterFunction: (fn, data) => console.log(`[${this.loggerName}] → ${fn}`, data || ''),
          exitFunction: (fn, data) => console.log(`[${this.loggerName}] ← ${fn}`, data || ''),
          info: (msg, data) => console.log(`[${this.loggerName}] ${msg}`, data || ''),
          warn: (msg, data) => console.warn(`[${this.loggerName}] ${msg}`, data || ''),
          error: (msg, data) => console.error(`[${this.loggerName}] ${msg}`, data || ''),
          audit: (msg, data) => console.log(`[${this.loggerName}] AUDIT: ${msg}`, data || ''),
          security: (msg, data) => console.log(`[${this.loggerName}] SECURITY: ${msg}`, data || '')
        };
      }
    }
    return this._logger;
  }

  // ==================== PUBLIC SUMMARIES ====================

  /**
   * Post monthly fixtures summary (preview for upcoming fixtures).
   * @param {number|null} month - Optional month override (1-12)
   * @param {number|null} year - Optional year override
   * @returns {Object} Posting result
   */
  postMonthlyFixturesSummary(month = null, year = null) {
    this.logger.enterFunction('postMonthlyFixturesSummary', { month, year });

    try {
      if (!isFeatureEnabled('MONTHLY_SUMMARIES')) {
        const disabled = {
          success: true,
          skipped: true,
          reason: 'MONTHLY_SUMMARIES feature disabled'
        };
        this.logger.exitFunction('postMonthlyFixturesSummary', disabled);
        return disabled;
      }

      const fixturesConfig = getConfig('MONTHLY_CONTENT.FIXTURES_SUMMARY', {});
      if (fixturesConfig && fixturesConfig.enabled === false) {
        const disabled = {
          success: true,
          skipped: true,
          reason: 'Monthly fixtures summary disabled in config'
        };
        this.logger.exitFunction('postMonthlyFixturesSummary', disabled);
        return disabled;
      }

      const { targetDate, monthNumber, yearNumber } = this.resolveMonthParameters(month, year, 'fixtures');
      const monthKey = this.buildMonthKey(yearNumber, monthNumber);

      if (this.isDuplicateRequest('fixtures', monthKey)) {
        const duplicate = {
          success: true,
          skipped: true,
          duplicate: true,
          month_key: monthKey,
          message: 'Fixtures summary already processed'
        };
        this.logger.exitFunction('postMonthlyFixturesSummary', duplicate);
        return duplicate;
      }

      const fixturesData = this.gatherMonthlyFixtures(targetDate);

      if (fixturesData.fixtures.length === 0) {
        const empty = {
          success: true,
          count: 0,
          month: monthNumber,
          year: yearNumber,
          month_key: monthKey,
          message: 'No fixtures scheduled for this month'
        };
        this.logger.exitFunction('postMonthlyFixturesSummary', empty);
        return empty;
      }

      const statistics = this.calculateFixtureStatistics(fixturesData.fixtures, targetDate);
      const idempotencyKey = this.buildIdempotencyKey('fixtures', monthKey);
      const payload = this.buildMonthlyFixturesPayload(fixturesData, statistics, monthKey, idempotencyKey);

      const consentContext = {
        module: 'monthly_summaries',
        eventType: payload.event_type,
        platform: 'make_webhook',
        players: []
      };

      // @testHook(monthly_fixtures_consent_start)
      const consentDecision = ConsentGate.evaluatePost(payload, consentContext);
      // @testHook(monthly_fixtures_consent_complete)

      if (!consentDecision.allowed) {
        this.logger.warn('Monthly fixtures summary blocked by consent gate', {
          month_key: monthKey,
          reason: consentDecision.reason
        });
        this.logger.exitFunction('postMonthlyFixturesSummary', {
          success: false,
          blocked: true,
          reason: consentDecision.reason
        });
        return {
          success: false,
          blocked: true,
          reason: consentDecision.reason,
          consent: consentDecision
        };
      }

      const enrichedPayload = ConsentGate.applyDecisionToPayload(payload, consentDecision);

      // @testHook(monthly_fixtures_make_dispatch_start)
      const makeResult = this.makeIntegration.sendToMake(enrichedPayload, {
        idempotencyKey,
        consentDecision,
        consentContext
      });
      // @testHook(monthly_fixtures_make_dispatch_complete)

      if (makeResult.success) {
        this.markProcessed('fixtures', monthKey, {
          count: fixturesData.fixtures.length,
          statistics,
          payload,
          makeResult,
          idempotencyKey
        });
      }

      const result = {
        success: makeResult.success,
        month: monthNumber,
        year: yearNumber,
        month_key: monthKey,
        count: fixturesData.fixtures.length,
        statistics,
        make_result: makeResult,
        idempotency_key: idempotencyKey,
        consent: consentDecision
      };

      this.logger.exitFunction('postMonthlyFixturesSummary', result);
      return result;

    } catch (error) {
      this.logger.error('Monthly fixtures summary failed', { error: error.toString(), stack: error.stack });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Post monthly results summary (recap for recently completed fixtures).
   * @param {number|null} month - Optional month override (1-12)
   * @param {number|null} year - Optional year override
   * @returns {Object} Posting result
   */
  postMonthlyResultsSummary(month = null, year = null) {
    this.logger.enterFunction('postMonthlyResultsSummary', { month, year });

    try {
      if (!isFeatureEnabled('MONTHLY_SUMMARIES')) {
        const disabled = {
          success: true,
          skipped: true,
          reason: 'MONTHLY_SUMMARIES feature disabled'
        };
        this.logger.exitFunction('postMonthlyResultsSummary', disabled);
        return disabled;
      }

      const resultsConfig = getConfig('MONTHLY_CONTENT.RESULTS_SUMMARY', {});
      if (resultsConfig && resultsConfig.enabled === false) {
        const disabled = {
          success: true,
          skipped: true,
          reason: 'Monthly results summary disabled in config'
        };
        this.logger.exitFunction('postMonthlyResultsSummary', disabled);
        return disabled;
      }

      const { targetDate, monthNumber, yearNumber } = this.resolveMonthParameters(month, year, 'results');
      const monthKey = this.buildMonthKey(yearNumber, monthNumber);

      if (this.isDuplicateRequest('results', monthKey)) {
        const duplicate = {
          success: true,
          skipped: true,
          duplicate: true,
          month_key: monthKey,
          message: 'Results summary already processed'
        };
        this.logger.exitFunction('postMonthlyResultsSummary', duplicate);
        return duplicate;
      }

      const resultsData = this.gatherMonthlyResults(targetDate);

      if (resultsData.results.length === 0) {
        const empty = {
          success: true,
          count: 0,
          month: monthNumber,
          year: yearNumber,
          month_key: monthKey,
          message: 'No results recorded for this month'
        };
        this.logger.exitFunction('postMonthlyResultsSummary', empty);
        return empty;
      }

      const statistics = this.calculateResultStatistics(resultsData.results, targetDate);
      const idempotencyKey = this.buildIdempotencyKey('results', monthKey);
      const payload = this.buildMonthlyResultsPayload(resultsData, statistics, monthKey, idempotencyKey);

      const consentContext = {
        module: 'monthly_summaries',
        eventType: payload.event_type,
        platform: 'make_webhook',
        players: []
      };

      // @testHook(monthly_results_consent_start)
      const consentDecision = ConsentGate.evaluatePost(payload, consentContext);
      // @testHook(monthly_results_consent_complete)

      if (!consentDecision.allowed) {
        this.logger.warn('Monthly results summary blocked by consent gate', {
          month_key: monthKey,
          reason: consentDecision.reason
        });
        this.logger.exitFunction('postMonthlyResultsSummary', {
          success: false,
          blocked: true,
          reason: consentDecision.reason
        });
        return {
          success: false,
          blocked: true,
          reason: consentDecision.reason,
          consent: consentDecision
        };
      }

      const enrichedPayload = ConsentGate.applyDecisionToPayload(payload, consentDecision);

      // @testHook(monthly_results_make_dispatch_start)
      const makeResult = this.makeIntegration.sendToMake(enrichedPayload, {
        idempotencyKey,
        consentDecision,
        consentContext
      });
      // @testHook(monthly_results_make_dispatch_complete)

      if (makeResult.success) {
        this.markProcessed('results', monthKey, {
          count: resultsData.results.length,
          statistics,
          payload,
          makeResult,
          idempotencyKey
        });
      }

      const result = {
        success: makeResult.success,
        month: monthNumber,
        year: yearNumber,
        month_key: monthKey,
        count: resultsData.results.length,
        statistics,
        make_result: makeResult,
        idempotency_key: idempotencyKey,
        consent: consentDecision
      };

      this.logger.exitFunction('postMonthlyResultsSummary', result);
      return result;

    } catch (error) {
      this.logger.error('Monthly results summary failed', { error: error.toString(), stack: error.stack });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Evaluate monthly scheduling rules and trigger summaries when needed.
   * @returns {Object} Scheduling result
   */
  runMonthlySchedulingCheck() {
    this.logger.enterFunction('runMonthlySchedulingCheck');

    try {
      if (!isFeatureEnabled('MONTHLY_SUMMARIES')) {
        const disabled = {
          success: true,
          skipped: true,
          reason: 'MONTHLY_SUMMARIES feature disabled'
        };
        this.logger.exitFunction('runMonthlySchedulingCheck', disabled);
        return disabled;
      }

      const today = DateUtils.now();
      const triggers = [];

      const fixturesConfig = getConfig('MONTHLY_CONTENT.FIXTURES_SUMMARY', {});
      if (fixturesConfig && fixturesConfig.enabled !== false && this.shouldTriggerOnDay(today, fixturesConfig.post_date || 1)) {
        triggers.push({
          type: 'fixtures',
          result: this.postMonthlyFixturesSummary()
        });
      }

      const resultsConfig = getConfig('MONTHLY_CONTENT.RESULTS_SUMMARY', {});
      if (resultsConfig && resultsConfig.enabled !== false && this.shouldTriggerOnDay(today, resultsConfig.post_date || 'last_day')) {
        triggers.push({
          type: 'results',
          result: this.postMonthlyResultsSummary()
        });
      }

      const outcome = {
        success: true,
        trigger_count: triggers.length,
        triggers
      };

      this.logger.exitFunction('runMonthlySchedulingCheck', outcome);
      return outcome;

    } catch (error) {
      this.logger.error('Monthly scheduling check failed', { error: error.toString(), stack: error.stack });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== DATA GATHERING ====================

  /**
   * Gather fixtures for the target month.
   * @param {Date} targetDate - Date within the target month
   * @returns {Object} Fixtures array and metadata
   */
  gatherMonthlyFixtures(targetDate) {
    this.logger.enterFunction('gatherMonthlyFixtures', { month: targetDate.getMonth() + 1, year: targetDate.getFullYear() });

    try {
      // @testHook(monthly_fixtures_sheet_prepare_start)
      const sheet = this.getFixturesSheet();
      // @testHook(monthly_fixtures_sheet_prepare_complete)

      if (!sheet) {
        this.logger.warn('Fixtures sheet unavailable');
        const fallback = { fixtures: [], metadata: {} };
        this.logger.exitFunction('gatherMonthlyFixtures', fallback);
        return fallback;
      }

      const rows = SheetUtils.getAllDataAsObjects(sheet);
      const { monthStart, monthEnd } = this.getMonthBounds(targetDate);

      const fixtures = rows
        .map(row => this.normalizeFixtureRow(row))
        .filter(entry => entry && entry.date >= monthStart && entry.date <= monthEnd)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      const metadata = {
        month_key: this.buildMonthKey(targetDate.getFullYear(), targetDate.getMonth() + 1),
        month_name: DateUtils.getMonthName(targetDate.getMonth() + 1),
        fixtures_count: fixtures.length
      };

      const result = { fixtures, metadata };
      this.logger.exitFunction('gatherMonthlyFixtures', { count: fixtures.length });
      return result;

    } catch (error) {
      this.logger.error('Monthly fixtures gathering failed', { error: error.toString(), stack: error.stack });
      return { fixtures: [], metadata: {} };
    }
  }

  /**
   * Gather results for the target month.
   * @param {Date} targetDate - Date within the target month
   * @returns {Object} Results array and metadata
   */
  gatherMonthlyResults(targetDate) {
    this.logger.enterFunction('gatherMonthlyResults', { month: targetDate.getMonth() + 1, year: targetDate.getFullYear() });

    try {
      // @testHook(monthly_results_sheet_prepare_start)
      const sheet = this.getResultsSheet();
      // @testHook(monthly_results_sheet_prepare_complete)

      if (!sheet) {
        this.logger.warn('Results sheet unavailable');
        const fallback = { results: [], metadata: {} };
        this.logger.exitFunction('gatherMonthlyResults', fallback);
        return fallback;
      }

      const rows = SheetUtils.getAllDataAsObjects(sheet);
      const { monthStart, monthEnd } = this.getMonthBounds(targetDate);

      const results = rows
        .map(row => this.normalizeResultRow(row))
        .filter(entry => entry && entry.date >= monthStart && entry.date <= monthEnd)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      const metadata = {
        month_key: this.buildMonthKey(targetDate.getFullYear(), targetDate.getMonth() + 1),
        month_name: DateUtils.getMonthName(targetDate.getMonth() + 1),
        results_count: results.length
      };

      const result = { results, metadata };
      this.logger.exitFunction('gatherMonthlyResults', { count: results.length });
      return result;

    } catch (error) {
      this.logger.error('Monthly results gathering failed', { error: error.toString(), stack: error.stack });
      return { results: [], metadata: {} };
    }
  }

  // ==================== STATISTICS BUILDERS ====================

  /**
   * Calculate fixture statistics.
   * @param {Array<Object>} fixtures - Fixture list
   * @param {Date} targetDate - Month anchor
   * @returns {Object} Statistics
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
      month_name: DateUtils.getMonthName(targetDate.getMonth() + 1)
    };

    fixtures.forEach(fixture => {
      if (fixture.isHome) {
        stats.home_fixtures += 1;
      } else {
        stats.away_fixtures += 1;
      }

      const competitionKey = fixture.competition || 'Unknown';
      stats.competitions[competitionKey] = (stats.competitions[competitionKey] || 0) + 1;

      const venueKey = fixture.venue || 'TBC';
      stats.venues[venueKey] = (stats.venues[venueKey] || 0) + 1;

      stats.opponents.push({
        opponent: fixture.opponent,
        date: fixture.dateFormatted,
        home_away: fixture.homeAway,
        competition: fixture.competition,
        venue: fixture.venue
      });

      const weekNumber = this.getWeekOfMonth(fixture.date);
      const weekKey = `Week ${weekNumber}`;
      stats.weekly_distribution[weekKey] = (stats.weekly_distribution[weekKey] || 0) + 1;

      if (this.isKeyMatch(fixture)) {
        stats.key_matches.push(fixture);
      }
    });

    stats.away_fixtures = fixtures.length - stats.home_fixtures;
    stats.home_ratio = fixtures.length > 0 ? Math.round((stats.home_fixtures / fixtures.length) * 100) : 0;
    stats.away_ratio = fixtures.length > 0 ? 100 - stats.home_ratio : 0;

    if (stats.key_matches.length > 3) {
      stats.key_matches = stats.key_matches.slice(0, 3);
    }

    return stats;
  }

  /**
   * Calculate result statistics.
   * @param {Array<Object>} results - Result list
   * @param {Date} targetDate - Month anchor
   * @returns {Object} Statistics
   */
  calculateResultStatistics(results, targetDate) {
    const stats = {
      total_results: results.length,
      wins: 0,
      draws: 0,
      losses: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      clean_sheets: 0,
      competitions: {},
      weekly_distribution: {},
      best_result: null,
      worst_result: null,
      month_name: DateUtils.getMonthName(targetDate.getMonth() + 1)
    };

    let bestGoalDifference = -Infinity;
    let worstGoalDifference = Infinity;

    results.forEach(result => {
      stats.goals_for += result.our_score;
      stats.goals_against += result.opposition_score;

      if (result.our_score > result.opposition_score) {
        stats.wins += 1;
      } else if (result.our_score === result.opposition_score) {
        stats.draws += 1;
      } else {
        stats.losses += 1;
      }

      if (result.opposition_score === 0) {
        stats.clean_sheets += 1;
      }

      const competitionKey = result.competition || 'Unknown';
      stats.competitions[competitionKey] = (stats.competitions[competitionKey] || 0) + 1;

      const weekNumber = this.getWeekOfMonth(result.date);
      const weekKey = `Week ${weekNumber}`;
      stats.weekly_distribution[weekKey] = (stats.weekly_distribution[weekKey] || 0) + 1;

      if (result.goal_difference > bestGoalDifference) {
        bestGoalDifference = result.goal_difference;
        stats.best_result = result;
      }

      if (result.goal_difference < worstGoalDifference) {
        worstGoalDifference = result.goal_difference;
        stats.worst_result = result;
      }
    });

    stats.goal_difference = stats.goals_for - stats.goals_against;
    return stats;
  }

  // ==================== PAYLOAD BUILDERS ====================

  /**
   * Build template variant collection for a post type.
   * @param {string} postType - Post type identifier.
   * @param {Object} context - Context data for placeholder bindings.
   * @returns {Object} Variant collection map.
   */
  buildTemplateVariants(postType, context = {}) {
    if (!this.variantBuilderAvailable) {
      return {};
    }

    try {
      return buildTemplateVariantCollection(postType, context);
    } catch (error) {
      this.logger.warn('Monthly template variant build failed', {
        error: error.toString(),
        post_type: postType
      });
      return {};
    }
  }

  /**
   * Build fixtures payload for Make.com.
   * @param {Object} fixturesData - Fixtures data and metadata
   * @param {Object} statistics - Calculated statistics
   * @param {string} monthKey - Month identifier
   * @param {string} idempotencyKey - Idempotency key
   * @returns {Object} Payload object
   */
  buildMonthlyFixturesPayload(fixturesData, statistics, monthKey, idempotencyKey) {
    const eventType = getConfig('MAKE.EVENT_TYPES.FIXTURES_THIS_MONTH', 'fixtures_this_month');
    const [yearString, monthString] = monthKey.split('-');
    const monthNumber = parseInt(monthString, 10);
    const yearNumber = parseInt(yearString, 10);

    const limitedFixtures = fixturesData.fixtures.slice(0, this.maxFixturesPerPayload);
    const normalizedFixtures = limitedFixtures.map(fixture => ({
      opponent: fixture.opponent,
      date: fixture.dateFormatted || DateUtils.formatUK(fixture.date),
      time: fixture.time,
      venue: fixture.venue,
      competition: fixture.competition
    }));

    const variantContext = {
      month_name: DateUtils.getMonthName(monthNumber),
      fixtures_count: fixturesData.fixtures.length,
      fixtures: normalizedFixtures,
      statistics,
      standout_fixture: normalizedFixtures[0] || null
    };

    const templateVariants = this.buildTemplateVariants('monthly_fixtures', variantContext);

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
      fixtures: limitedFixtures,
      statistics,
      metadata: {
        posted_at: DateUtils.formatISO(DateUtils.now()),
        truncated: fixturesData.fixtures.length > limitedFixtures.length
      },

      // Template variants
      template_variants: templateVariants
    };
  }

  /**
   * Build results payload for Make.com.
   * @param {Object} resultsData - Results data and metadata
   * @param {Object} statistics - Calculated statistics
   * @param {string} monthKey - Month identifier
   * @param {string} idempotencyKey - Idempotency key
   * @returns {Object} Payload object
   */
  buildMonthlyResultsPayload(resultsData, statistics, monthKey, idempotencyKey) {
    const eventType = getConfig('MAKE.EVENT_TYPES.RESULTS_THIS_MONTH', 'results_this_month');
    const [yearString, monthString] = monthKey.split('-');
    const monthNumber = parseInt(monthString, 10);
    const yearNumber = parseInt(yearString, 10);

    const limitedResults = resultsData.results.slice(0, this.maxResultsPerPayload);
    const normalizedResults = limitedResults.map(result => ({
      opponent: result.opponent,
      date: result.dateFormatted || DateUtils.formatUK(result.date),
      scoreline: result.scoreline,
      competition: result.competition,
      venue: result.venue
    }));

    const statisticsSummary = `Wins ${statistics.wins} • Draws ${statistics.draws} • Losses ${statistics.losses}`;

    const variantContext = {
      month_name: DateUtils.getMonthName(monthNumber),
      results_count: resultsData.results.length,
      results: normalizedResults,
      statistics,
      top_result: normalizedResults[0] || null,
      statistics_summary: statisticsSummary
    };

    const templateVariants = this.buildTemplateVariants('monthly_results', variantContext);

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
      results: limitedResults,
      statistics,
      metadata: {
        posted_at: DateUtils.formatISO(DateUtils.now()),
        truncated: resultsData.results.length > limitedResults.length
      },
      statistics_summary: statisticsSummary,

      // Template variants
      template_variants: templateVariants
    };
  }

  // ==================== IDEMPOTENCY & LOGGING ====================

  /**
   * Determine if summary already processed recently.
   * @param {string} type - Summary type (fixtures/results)
   * @param {string} monthKey - Month identifier
   * @returns {boolean} Duplicate flag
   */
  isDuplicateRequest(type, monthKey) {
    const cacheKey = this.buildIdempotencyKey(type, monthKey);

    if (this.cache.has(cacheKey)) {
      return true;
    }

    if (!this.properties || !this.properties.getProperty) {
      return false;
    }

    try {
      // @testHook(monthly_summary_properties_read_start)
      const raw = this.properties.getProperty(cacheKey);
      // @testHook(monthly_summary_properties_read_complete)

      if (!raw) {
        return false;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.timestamp) {
        return false;
      }

      const timestamp = new Date(parsed.timestamp);
      const ageSeconds = (DateUtils.now().getTime() - timestamp.getTime()) / 1000;

      if (ageSeconds <= this.cacheTtlSeconds) {
        this.cache.set(cacheKey, parsed);
        return true;
      }

      return false;

    } catch (error) {
      this.logger.warn('Failed to parse monthly summary cache', { error: error.toString() });
      return false;
    }
  }

  /**
   * Record successful summary for idempotency and auditing.
   * @param {string} type - Summary type
   * @param {string} monthKey - Month identifier
   * @param {Object} context - Summary context
   */
  markProcessed(type, monthKey, context) {
    const cacheKey = this.buildIdempotencyKey(type, monthKey);
    const record = {
      timestamp: DateUtils.formatISO(DateUtils.now()),
      type,
      month_key: monthKey,
      count: context.count,
      idempotency_key: context.idempotencyKey
    };

    this.cache.set(cacheKey, record);

    if (this.properties && this.properties.setProperty) {
      try {
        // @testHook(monthly_summary_properties_write_start)
        this.properties.setProperty(cacheKey, JSON.stringify(record));
        // @testHook(monthly_summary_properties_write_complete)
      } catch (error) {
        this.logger.warn('Failed to persist monthly summary cache', { error: error.toString() });
      }
    }

    this.writeMonthlyLog(type, monthKey, context);
  }

  /**
   * Write monthly summary log entry.
   * @param {string} type - Summary type
   * @param {string} monthKey - Month identifier
   * @param {Object} context - Context data
   */
  writeMonthlyLog(type, monthKey, context) {
    const sheet = this.getMonthlySheet();
    if (!sheet) {
      return;
    }

    const row = {
      'Month Key': monthKey,
      'Type': type,
      'Event Type': context.payload ? context.payload.event_type : '',
      'Count': context.count || 0,
      'Statistics JSON': JSON.stringify(context.statistics || {}),
      'Payload Preview': JSON.stringify(context.payload || {}),
      'Processed At': DateUtils.formatISO(DateUtils.now()),
      'Idempotency Key': context.idempotencyKey || this.buildIdempotencyKey(type, monthKey),
      'Make Result': JSON.stringify(context.makeResult || {})
    };

    try {
      // @testHook(monthly_summary_sheet_log_start)
      SheetUtils.addRowFromObject(sheet, row);
      // @testHook(monthly_summary_sheet_log_complete)
    } catch (error) {
      this.logger.warn('Failed to log monthly summary row', { error: error.toString() });
    }
  }

  // ==================== HELPERS ====================

  /**
   * Resolve month parameters and defaulting rules.
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
   * Build month key string.
   * @param {number} year - Year value
   * @param {number} month - Month value (1-12)
   * @returns {string} Month key string
   */
  buildMonthKey(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  /**
   * Build idempotency key for monthly summary.
   * @param {string} type - Summary type
   * @param {string} monthKey - Month identifier
   * @returns {string} Idempotency key
   */
  buildIdempotencyKey(type, monthKey) {
    return `monthly_${type}_${monthKey}`;
  }

  /**
   * Normalize fixture row from sheet data.
   * @param {Object} row - Sheet row object
   * @returns {Object|null} Normalized fixture
   */
  normalizeFixtureRow(row) {
    const parsedDate = this.parseDateValue(row.Date);
    if (!parsedDate) {
      return null;
    }

    const status = (row.Status || '').toString().toLowerCase();
    if (['postponed', 'cancelled'].includes(status)) {
      return null;
    }

    const homeAwayRaw = (row['Home/Away'] || '').toString();
    const homeAway = homeAwayRaw.length <= 1 ? homeAwayRaw.toUpperCase() : homeAwayRaw;
    const isHome = ['H', 'HOME'].includes(homeAway.toUpperCase());

    return {
      date: parsedDate,
      dateFormatted: DateUtils.formatUK(parsedDate),
      time: row.Time || '',
      opponent: (row.Opposition || '').toString().trim(),
      competition: (row.Competition || 'Friendly').toString().trim(),
      venue: (row.Venue || 'TBC').toString().trim(),
      homeAway,
      isHome,
      status
    };
  }

  /**
   * Normalize result row from sheet data.
   * @param {Object} row - Sheet row object
   * @returns {Object|null} Normalized result
   */
  normalizeResultRow(row) {
    const parsedDate = this.parseDateValue(row.Date);
    if (!parsedDate) {
      return null;
    }

    const homeScore = parseInt(row['Home Score'], 10) || 0;
    const awayScore = parseInt(row['Away Score'], 10) || 0;
    const homeAwayRaw = (row['Home/Away'] || '').toString();
    const homeAway = homeAwayRaw.length <= 1 ? homeAwayRaw.toUpperCase() : homeAwayRaw;
    const isHome = ['H', 'HOME'].includes(homeAway.toUpperCase());
    const ourScore = isHome ? homeScore : awayScore;
    const oppositionScore = isHome ? awayScore : homeScore;

    return {
      date: parsedDate,
      dateFormatted: DateUtils.formatUK(parsedDate),
      opponent: (row.Opposition || '').toString().trim(),
      competition: (row.Competition || '').toString().trim(),
      venue: (row.Venue || '').toString().trim(),
      homeAway,
      our_score: ourScore,
      opposition_score: oppositionScore,
      goal_difference: ourScore - oppositionScore,
      scoreline: `${ourScore}-${oppositionScore}`
    };
  }

  /**
   * Parse sheet date value (Date or string).
   * @param {Date|string} value - Sheet date value
   * @returns {Date|null} Parsed date
   */
  parseDateValue(value) {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = DateUtils.parseUK(value.trim());
      if (parsed) {
        return parsed;
      }
    }

    return null;
  }

  /**
   * Determine week of month for given date.
   * @param {Date} date - Target date
   * @returns {number} Week number
   */
  getWeekOfMonth(date) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const offset = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
    return Math.ceil((date.getDate() + offset - 1) / 7);
  }

  /**
   * Determine if fixture qualifies as key match.
   * @param {Object} fixture - Fixture data
   * @returns {boolean} True if key match
   */
  isKeyMatch(fixture) {
    const importantCompetitions = getConfig('MONTHLY_SUMMARIES.IMPORTANT_COMPETITIONS', []);
    const localRivals = getConfig('MONTHLY_SUMMARIES.LOCAL_RIVALS', []);

    const competition = (fixture.competition || '').toLowerCase();
    const opponent = (fixture.opponent || '').toLowerCase();

    const competitionMatch = importantCompetitions.some(keyword => competition.includes(keyword));
    const rivalMatch = localRivals.some(keyword => opponent.includes(keyword));

    return competitionMatch || rivalMatch;
  }

  /**
   * Compute month bounds.
   * @param {Date} date - Anchor date
   * @returns {Object} Month bounds
   */
  getMonthBounds(date) {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { monthStart, monthEnd };
  }

  /**
   * Determine if today matches trigger rule.
   * @param {Date} today - Current date
   * @param {number|string} rule - Trigger rule (day number or 'last_day')
   * @returns {boolean} Trigger flag
   */
  shouldTriggerOnDay(today, rule) {
    if (rule === 'last_day') {
      return today.getDate() === this.getLastDayOfMonth(today);
    }

    if (typeof rule === 'number') {
      return today.getDate() === rule;
    }

    return false;
  }

  /**
   * Get last day number of month.
   * @param {Date} date - Target date
   * @returns {number} Last day number
   */
  getLastDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  /**
   * Lazy getter for fixtures sheet.
   * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} Fixtures sheet
   */
  getFixturesSheet() {
    return SheetUtils.getOrCreateSheet(
      getConfig('SHEETS.TAB_NAMES.FIXTURES'),
      getConfig('SHEETS.REQUIRED_COLUMNS.FIXTURES', [])
    );
  }

  /**
   * Lazy getter for results sheet.
   * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} Results sheet
   */
  getResultsSheet() {
    return SheetUtils.getOrCreateSheet(
      getConfig('SHEETS.TAB_NAMES.RESULTS'),
      getConfig('SHEETS.REQUIRED_COLUMNS.RESULTS', [])
    );
  }

  /**
   * Lazy getter for monthly content sheet.
   * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} Monthly content sheet
   */
  getMonthlySheet() {
    if (!this.monthlyContentSheetName) {
      return null;
    }

    if (!this.monthlySheet) {
      this.monthlySheet = SheetUtils.getOrCreateSheet(this.monthlyContentSheetName, this.monthlyContentColumns);
    }

    return this.monthlySheet;
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
    const manager = new MonthlySummariesManager();
    const sheet = manager.getMonthlySheet();

    const result = {
      success: !!sheet,
      sheet_ready: !!sheet,
      cache_configured: true,
      make_enabled: isFeatureEnabled('MAKE_INTEGRATION'),
      monthly_summaries_enabled: isFeatureEnabled('MONTHLY_SUMMARIES')
    };

    logger.exitFunction('MonthlySummaries.initialize', result);
    return result;

  } catch (error) {
    logger.error('Monthly summaries initialization failed', { error: error.toString(), stack: error.stack });
    return { success: false, error: error.toString() };
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
    const result = manager.postMonthlyFixturesSummary(month, year);
    logger.exitFunction('postMonthlyFixturesSummary', { success: result.success });
    return result;
  } catch (error) {
    logger.error('Public monthly fixtures summary failed', { error: error.toString(), stack: error.stack });
    return { success: false, error: error.toString() };
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
    const result = manager.postMonthlyResultsSummary(month, year);
    logger.exitFunction('postMonthlyResultsSummary', { success: result.success });
    return result;
  } catch (error) {
    logger.error('Public monthly results summary failed', { error: error.toString(), stack: error.stack });
    return { success: false, error: error.toString() };
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
    return { success: false, error: error.toString() };
  }
}

// Export globals for Apps Script triggers
// eslint-disable-next-line no-undef
globalThis.initializeMonthlySummaries = initializeMonthlySummaries;
// eslint-disable-next-line no-undef
globalThis.postMonthlyFixturesSummary = postMonthlyFixturesSummary;
// eslint-disable-next-line no-undef
globalThis.postMonthlyResultsSummary = postMonthlyResultsSummary;
// eslint-disable-next-line no-undef
globalThis.runMonthlySchedulingCheck = runMonthlySchedulingCheck;

/**
 * Public API: Post postponed match notification.
 * @param {Object} matchData - Match information
 * @returns {Object} Result
 */
function postPostponed(matchData) {
  logger.enterFunction('postPostponed', { matchId: matchData?.id });

  try {
    // @testHook(postponed_start)

    // Create postponed match payload
    const payload = {
      event_type: 'match_postponed',
      match_id: matchData.id || null,
      opposition: matchData.opposition || 'Unknown',
      original_date: matchData.date || null,
      venue: matchData.venue || null,
      competition: matchData.competition || getConfig('SYSTEM.LEAGUE'),
      club_info: {
        name: getConfig('SYSTEM.CLUB_NAME'),
        season: getConfig('SYSTEM.SEASON')
      },
      timestamp: DateUtils.formatISO(DateUtils.now()),
      system_version: getConfig('SYSTEM.VERSION')
    };

    // @testHook(postponed_webhook)
    const webhookResult = sendToMake(payload);

    logger.exitFunction('postPostponed', { success: true });
    return {
      success: true,
      event_type: 'match_postponed',
      match_id: matchData.id,
      webhook_sent: webhookResult.success
    };

  } catch (error) {
    logger.error('Postponed match posting failed', { error: error.toString() });
    logger.exitFunction('postPostponed', { success: false });
    return { success: false, error: error.toString() };
  }
}

/**
 * Public API: Post second half kickoff notification.
 * @param {Object} matchData - Match information
 * @returns {Object} Result
 */
function postSecondHalfKickoff(matchData) {
  logger.enterFunction('postSecondHalfKickoff', { matchId: matchData?.id });

  try {
    // @testHook(second_half_start)

    // Create second half kickoff payload
    const payload = {
      event_type: 'second_half_kickoff',
      match_id: matchData.id || null,
      opposition: matchData.opposition || 'Unknown',
      current_score: matchData.halftimeScore || { home: 0, away: 0 },
      venue: matchData.venue || null,
      competition: matchData.competition || getConfig('SYSTEM.LEAGUE'),
      club_info: {
        name: getConfig('SYSTEM.CLUB_NAME'),
        season: getConfig('SYSTEM.SEASON')
      },
      timestamp: DateUtils.formatISO(DateUtils.now()),
      system_version: getConfig('SYSTEM.VERSION')
    };

    // @testHook(second_half_webhook)
    const webhookResult = sendToMake(payload);

    logger.exitFunction('postSecondHalfKickoff', { success: true });
    return {
      success: true,
      event_type: 'second_half_kickoff',
      match_id: matchData.id,
      webhook_sent: webhookResult.success
    };

  } catch (error) {
    logger.error('Second half kickoff posting failed', { error: error.toString() });
    logger.exitFunction('postSecondHalfKickoff', { success: false });
    return { success: false, error: error.toString() };
  }
}

// Export new functions for Apps Script triggers
// eslint-disable-next-line no-undef
globalThis.postPostponed = postPostponed;
// eslint-disable-next-line no-undef
globalThis.postSecondHalfKickoff = postSecondHalfKickoff;
