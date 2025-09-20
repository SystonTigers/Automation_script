/**
 * @fileoverview Batch Fixtures Manager for Weekly Batch Posting (1-5 fixtures/results)
 * @version 6.0.0
 * @author Senior Software Architect
 * @description Handles batch posting of fixtures and results with Make.com router integration
 */

/**
 * Batch Fixtures Manager Class
 * Handles gathering and posting of 1-5 fixtures or results to Make.com with appropriate routing
 */
class BatchFixturesManager {
  
  constructor() {
    this.logger = logger.scope('BatchFixtures');
    this.makeIntegration = new MakeIntegration();
  }

  /**
   * Post league fixtures batch (1-5 fixtures)
   * @param {boolean} upcomingOnly - Only include upcoming fixtures
   * @param {number} daysAhead - How many days ahead to look
   * @returns {Object} Posting result
   */
  postLeagueFixturesBatch(upcomingOnly = true, daysAhead = 14) {
    this.logger.enterFunction('postLeagueFixturesBatch', { upcomingOnly, daysAhead });
    
    try {
      // @testHook(batch_fixtures_start)
      
      // Get fixtures data
      const fixtures = this.getFixturesData(upcomingOnly, daysAhead);
      
      if (!fixtures || fixtures.length === 0) {
        this.logger.info('No fixtures found for batch posting');
        return {
          success: true,
          message: 'No fixtures to post',
          fixture_count: 0,
          skipped: true
        };
      }
      
      // Limit to maximum 5 fixtures
      const limitedFixtures = fixtures.slice(0, 5);
      const fixtureCount = limitedFixtures.length;
      
      // Create event type based on count
      const eventType = `fixtures_${fixtureCount}_league`;
      
      // Build payload for Make.com
      const payload = this.buildFixturesPayload(limitedFixtures, eventType);
      
      // @testHook(batch_fixtures_payload_created)
      
      // Send to Make.com
      const makeResult = this.makeIntegration.sendToMake(payload);
      
      if (makeResult.success) {
        this.logger.info(`Batch fixtures posted successfully`, { 
          fixture_count: fixtureCount,
          event_type: eventType
        });
      } else {
        this.logger.error('Batch fixtures posting failed', { 
          error: makeResult.error,
          fixture_count: fixtureCount
        });
      }
      
      // @testHook(batch_fixtures_complete)
      
      this.logger.exitFunction('postLeagueFixturesBatch', { 
        success: makeResult.success,
        fixture_count: fixtureCount
      });
      
      return {
        success: makeResult.success,
        fixture_count: fixtureCount,
        event_type: eventType,
        fixtures: limitedFixtures,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Batch fixtures posting failed', { 
        error: error.toString() 
      });
      
      return {
        success: false,
        error: error.toString(),
        fixture_count: 0,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Post league results batch (1-5 results)
   * @param {number} daysBack - How many days back to look for results
   * @returns {Object} Posting result
   */
  postLeagueResultsBatch(daysBack = 7) {
    this.logger.enterFunction('postLeagueResultsBatch', { daysBack });
    
    try {
      // @testHook(batch_results_start)
      
      // Get results data
      const results = this.getResultsData(daysBack);
      
      if (!results || results.length === 0) {
        this.logger.info('No results found for batch posting');
        return {
          success: true,
          message: 'No results to post',
          result_count: 0,
          skipped: true
        };
      }
      
      // Limit to maximum 5 results
      const limitedResults = results.slice(0, 5);
      const resultCount = limitedResults.length;
      
      // Create event type based on count
      const eventType = `results_${resultCount}_league`;
      
      // Build payload for Make.com
      const payload = this.buildResultsPayload(limitedResults, eventType);
      
      // @testHook(batch_results_payload_created)
      
      // Send to Make.com
      const makeResult = this.makeIntegration.sendToMake(payload);
      
      if (makeResult.success) {
        this.logger.info(`Batch results posted successfully`, { 
          result_count: resultCount,
          event_type: eventType
        });
      } else {
        this.logger.error('Batch results posting failed', { 
          error: makeResult.error,
          result_count: resultCount
        });
      }
      
      // @testHook(batch_results_complete)
      
      this.logger.exitFunction('postLeagueResultsBatch', { 
        success: makeResult.success,
        result_count: resultCount
      });
      
      return {
        success: makeResult.success,
        result_count: resultCount,
        event_type: eventType,
        results: limitedResults,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Batch results posting failed', { 
        error: error.toString() 
      });
      
      return {
        success: false,
        error: error.toString(),
        result_count: 0,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Get fixtures data from sheets
   * @private
   * @param {boolean} upcomingOnly - Only upcoming fixtures
   * @param {number} daysAhead - Days to look ahead
   * @returns {Array} Fixtures array
   */
  getFixturesData(upcomingOnly = true, daysAhead = 14) {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES_RESULTS'),
        ['Date', 'Time', 'Opponent', 'Venue', 'Competition', 'Result', 'Home Score', 'Away Score']
      );
      
      if (!fixturesSheet) {
        throw new Error('Cannot access fixtures sheet');
      }
      
      const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      const now = DateUtils.now();
      const cutoffDate = DateUtils.addDays(now, daysAhead);
      
      return allFixtures.filter(fixture => {
        if (!fixture.Date) return false;
        
        const fixtureDate = DateUtils.parseUK(fixture.Date);
        if (!fixtureDate) return false;
        
        // Only include fixtures without results (upcoming)
        if (upcomingOnly && fixture.Result) return false;
        
        // Only include fixtures within the date range
        return fixtureDate >= now && fixtureDate <= cutoffDate;
      }).map(fixture => ({
        date: fixture.Date,
        time: fixture.Time || 'TBC',
        opponent: fixture.Opponent || 'TBC',
        venue: fixture.Venue || 'Home',
        competition: fixture.Competition || 'League',
        formatted_date: this.formatFixtureDate(fixture.Date, fixture.Time)
      }));
      
    } catch (error) {
      this.logger.error('Failed to get fixtures data', { error: error.toString() });
      return [];
    }
  }

  /**
   * Get results data from sheets
   * @private
   * @param {number} daysBack - Days to look back
   * @returns {Array} Results array
   */
  getResultsData(daysBack = 7) {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES_RESULTS')
      );
      
      if (!fixturesSheet) {
        throw new Error('Cannot access fixtures sheet');
      }
      
      const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      const now = DateUtils.now();
      const cutoffDate = DateUtils.addDays(now, -daysBack);
      
      return allFixtures.filter(fixture => {
        if (!fixture.Date || !fixture.Result) return false;
        
        const fixtureDate = DateUtils.parseUK(fixture.Date);
        if (!fixtureDate) return false;
        
        // Only include fixtures with results within the date range
        return fixtureDate >= cutoffDate && fixtureDate <= now;
      }).map(fixture => ({
        date: fixture.Date,
        opponent: fixture.Opponent || 'Unknown',
        result: fixture.Result || 'TBC',
        home_score: fixture['Home Score'] || '0',
        away_score: fixture['Away Score'] || '0',
        venue: fixture.Venue || 'Home',
        competition: fixture.Competition || 'League',
        outcome: this.determineOutcome(fixture.Result, fixture['Home Score'], fixture['Away Score'], fixture.Venue),
        formatted_date: this.formatResultDate(fixture.Date)
      }));
      
    } catch (error) {
      this.logger.error('Failed to get results data', { error: error.toString() });
      return [];
    }
  }

  /**
   * Build fixtures payload for Make.com
   * @private
   * @param {Array} fixtures - Fixtures array
   * @param {string} eventType - Event type
   * @returns {Object} Payload object
   */
  buildFixturesPayload(fixtures, eventType) {
    const payload = {
      timestamp: DateUtils.formatISO(DateUtils.now()),
      event_type: getConfig(`MAKE.EVENT_MAPPINGS.${eventType}`, eventType),
      source: 'apps_script_batch_fixtures',
      version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      fixture_count: fixtures.length
    };
    
    // Add individual fixture data (up to 5)
    fixtures.forEach((fixture, index) => {
      const num = index + 1;
      payload[`fixture_${num}_date`] = fixture.date;
      payload[`fixture_${num}_time`] = fixture.time;
      payload[`fixture_${num}_opponent`] = fixture.opponent;
      payload[`fixture_${num}_venue`] = fixture.venue;
      payload[`fixture_${num}_competition`] = fixture.competition;
      payload[`fixture_${num}_formatted`] = fixture.formatted_date;
    });
    
    // Fill empty slots with empty strings for consistent Canva template
    for (let i = fixtures.length + 1; i <= 5; i++) {
      payload[`fixture_${i}_date`] = '';
      payload[`fixture_${i}_time`] = '';
      payload[`fixture_${i}_opponent`] = '';
      payload[`fixture_${i}_venue`] = '';
      payload[`fixture_${i}_competition`] = '';
      payload[`fixture_${i}_formatted`] = '';
    }
    
    return payload;
  }

  /**
   * Build results payload for Make.com
   * @private
   * @param {Array} results - Results array
   * @param {string} eventType - Event type
   * @returns {Object} Payload object
   */
  buildResultsPayload(results, eventType) {
    const payload = {
      timestamp: DateUtils.formatISO(DateUtils.now()),
      event_type: getConfig(`MAKE.EVENT_MAPPINGS.${eventType}`, eventType),
      source: 'apps_script_batch_results',
      version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      result_count: results.length
    };
    
    // Add individual result data (up to 5)
    results.forEach((result, index) => {
      const num = index + 1;
      payload[`result_${num}_date`] = result.date;
      payload[`result_${num}_opponent`] = result.opponent;
      payload[`result_${num}_score`] = `${result.home_score}-${result.away_score}`;
      payload[`result_${num}_outcome`] = result.outcome;
      payload[`result_${num}_venue`] = result.venue;
      payload[`result_${num}_competition`] = result.competition;
      payload[`result_${num}_formatted`] = result.formatted_date;
    });
    
    // Fill empty slots with empty strings for consistent Canva template
    for (let i = results.length + 1; i <= 5; i++) {
      payload[`result_${i}_date`] = '';
      payload[`result_${i}_opponent`] = '';
      payload[`result_${i}_score`] = '';
      payload[`result_${i}_outcome`] = '';
      payload[`result_${i}_venue`] = '';
      payload[`result_${i}_competition`] = '';
      payload[`result_${i}_formatted`] = '';
    }
    
    return payload;
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
   * Format result date for display
   * @private
   * @param {string} date - Date string
   * @returns {string} Formatted date
   */
  formatResultDate(date) {
    try {
      const resultDate = DateUtils.parseUK(date);
      if (!resultDate) return date;
      
      const dayName = resultDate.toLocaleDateString('en-GB', { weekday: 'short' });
      const dayMonth = resultDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      
      return `${dayName} ${dayMonth}`;
    } catch (error) {
      return date;
    }
  }

  /**
   * Determine match outcome (Win/Draw/Loss)
   * @private
   * @param {string} result - Result string
   * @param {string} homeScore - Home score
   * @param {string} awayScore - Away score
   * @param {string} venue - Venue (Home/Away)
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
   * Get fixtures for this week
   * @returns {Object} This week's fixtures result
   */
  getThisWeekFixtures() {
    this.logger.enterFunction('getThisWeekFixtures');
    
    try {
      const fixtures = this.getFixturesData(true, 7);
      const thisWeekFixtures = fixtures.filter(fixture => {
        const fixtureDate = DateUtils.parseUK(fixture.date);
        return fixtureDate && DateUtils.isThisWeek(fixtureDate);
      });
      
      this.logger.exitFunction('getThisWeekFixtures', { 
        fixture_count: thisWeekFixtures.length 
      });
      
      return {
        success: true,
        fixtures: thisWeekFixtures,
        count: thisWeekFixtures.length
      };
      
    } catch (error) {
      this.logger.error('Failed to get this week fixtures', { error: error.toString() });
      return {
        success: false,
        error: error.toString(),
        fixtures: [],
        count: 0
      };
    }
  }

  /**
   * Check if there are matches scheduled this week
   * @returns {boolean} Has matches this week
   */
  hasMatchesThisWeek() {
    const weekFixtures = this.getThisWeekFixtures();
    return weekFixtures.success && weekFixtures.count > 0;
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Initialize Batch Fixtures Manager
 * @returns {Object} Initialization result
 */
function initializeBatchFixtures() {
  logger.enterFunction('BatchFixtures.initialize');
  
  try {
    // Test sheet access
    const fixturesSheet = SheetUtils.getOrCreateSheet(
      getConfig('SHEETS.TAB_NAMES.FIXTURES_RESULTS'),
      ['Date', 'Time', 'Opponent', 'Venue', 'Competition', 'Result', 'Home Score', 'Away Score']
    );
    
    if (!fixturesSheet) {
      throw new Error('Cannot access fixtures sheet');
    }
    
    logger.exitFunction('BatchFixtures.initialize', { success: true });
    
    return {
      success: true,
      message: 'Batch Fixtures Manager initialized successfully',
      version: '6.0.0'
    };
    
  } catch (error) {
    logger.error('Batch Fixtures initialization failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Post weekly fixtures batch (public API)
 * @param {boolean} upcomingOnly - Only upcoming fixtures
 * @returns {Object} Posting result
 */
function postWeeklyFixturesBatch(upcomingOnly = true) {
  const manager = new BatchFixturesManager();
  return manager.postLeagueFixturesBatch(upcomingOnly, 7);
}

/**
 * Post weekly results batch (public API)
 * @returns {Object} Posting result
 */
function postWeeklyResultsBatch() {
  const manager = new BatchFixturesManager();
  return manager.postLeagueResultsBatch(7);
}

/**
 * Get this week's fixtures (public API)
 * @returns {Object} Fixtures result
 */
function getThisWeekFixtures() {
  const manager = new BatchFixturesManager();
  return manager.getThisWeekFixtures();
}

/**
 * Check if there are matches this week (public API)
 * @returns {boolean} Has matches
 */
function hasMatchesThisWeek() {
  const manager = new BatchFixturesManager();
  return manager.hasMatchesThisWeek();
}

// ==================== TESTING FUNCTIONS ====================

/**
 * Test batch fixtures functionality
 * @returns {Object} Test results
 */
function testBatchFixtures() {
  logger.enterFunction('BatchFixtures.test');
  
  try {
    const manager = new BatchFixturesManager();
    const results = {
      sheet_access: false,
      fixtures_retrieval: false,
      results_retrieval: false,
      payload_creation: false
    };
    
    // Test sheet access
    try {
      const fixtures = manager.getFixturesData(false, 30);
      results.sheet_access = true;
      results.fixtures_retrieval = Array.isArray(fixtures);
    } catch (error) {
      logger.warn('Sheet access test failed', { error: error.toString() });
    }
    
    // Test results retrieval
    try {
      const results_data = manager.getResultsData(30);
      results.results_retrieval = Array.isArray(results_data);
    } catch (error) {
      logger.warn('Results retrieval test failed', { error: error.toString() });
    }
    
    // Test payload creation
    try {
      const testFixtures = [
        { date: '01/01/2025', opponent: 'Test FC', venue: 'Home', time: '15:00' }
      ];
      const payload = manager.buildFixturesPayload(testFixtures, 'fixtures_1_league');
      results.payload_creation = payload && payload.fixture_count === 1;
    } catch (error) {
      logger.warn('Payload creation test failed', { error: error.toString() });
    }
    
    const allPassed = Object.values(results).every(result => result === true);
    
    logger.exitFunction('BatchFixtures.test', { success: allPassed });
    
    return {
      success: allPassed,
      results: results,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
  } catch (error) {
    logger.error('Batch fixtures test failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}

