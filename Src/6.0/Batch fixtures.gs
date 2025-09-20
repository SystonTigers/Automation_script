/**
 * @fileoverview Syston Tigers Automation - Enhanced Batch Fixture & Results Posting
 * @version 5.1.0
 * @author Senior Software Architect
 * 
 * Handles batch posting of fixtures and results (1-5 per batch per checklist) with rate limiting.
 * Includes Make.com router branches and Canva placeholder requirements.
 */


/**
 * Batch Posting Manager - Handles bulk fixture and result posting with enhanced features
 * Per checklist: triggers fixtures_N_league and results_N_league payloads with rate limiting
 */
class BatchPostingManager extends BaseAutomationComponent {
  
  constructor() {
    super('BatchPostingManager');
    this.maxBatchSize = 5; // Per checklist: 1-5 fixtures/results
    this.processedBatches = new Set(); // For idempotency tracking
  }


  /**
   * Initialize batch posting manager
   * @returns {boolean} Success status
   */
  doInitialize() {
    logger.enterFunction('BatchPostingManager.doInitialize');
    
    try {
      // Ensure required sheets exist
      const requiredSheets = [
        { name: getConfig('SHEETS.FIXTURES'), headers: ['Date', 'Competition', 'Home_Team', 'Away_Team', 'Venue', 'Kick_Off', 'Posted'] },
        { name: getConfig('SHEETS.RESULTS'), headers: ['Date', 'Competition', 'Home_Team', 'Away_Team', 'Home_Score', 'Away_Score', 'Venue', 'Posted'] },
        { name: 'Batch_Processing_Log', headers: ['Timestamp', 'Batch_Type', 'Count', 'Items', 'Status', 'Response'] }
      ];


      for (const sheetConfig of requiredSheets) {
        const sheet = SheetUtils.getOrCreateSheet(sheetConfig.name, sheetConfig.headers);
        if (!sheet) {
          logger.error(`Failed to create required sheet: ${sheetConfig.name}`);
          return false;
        }
      }


      logger.exitFunction('BatchPostingManager.doInitialize', { success: true });
      return true;
    } catch (error) {
      logger.error('BatchPostingManager initialization failed', { error: error.toString() });
      return false;
    }
  }


  // ===== BATCH FIXTURE POSTING =====


  /**
   * Post league fixtures batch (per checklist requirement)
   * @param {Date} startDate - Start date for fixture search
   * @param {Date} endDate - End date for fixture search
   * @param {string} competition - Competition type (default: 'League')
   * @returns {Object} Posting result
   */
  postLeagueFixturesBatch(startDate = null, endDate = null, competition = 'League') {
    logger.enterFunction('BatchPostingManager.postLeagueFixturesBatch', {
      startDate, endDate, competition
    });


    return this.withLock(() => {
      try {
        // Default to current weekend if no dates provided
        if (!startDate || !endDate) {
          const weekend = this.getCurrentWeekend();
          startDate = weekend.start;
          endDate = weekend.end;
        }


        logger.testHook('fixture_batch_date_range', { startDate, endDate });


        // Gather fixtures from sheet
        const fixtures = this.gatherFixtures(startDate, endDate, competition);
        
        if (fixtures.length === 0) {
          logger.info('No fixtures found for batch posting', { startDate, endDate });
          return { success: true, count: 0, message: 'No fixtures to post' };
        }


        // Limit to max batch size per checklist
        const batchFixtures = fixtures.slice(0, this.maxBatchSize);
        const fixtureCount = batchFixtures.length;


        // Generate batch ID for idempotency
        const batchId = this.generateBatchId('fixtures', batchFixtures);
        if (this.processedBatches.has(batchId)) {
          logger.info('Batch already processed, skipping', { batchId });
          return { success: true, count: fixtureCount, skipped: true, batchId };
        }


        logger.testHook('fixture_batch_size', { 
          totalFound: fixtures.length,
          batchSize: fixtureCount,
          batchId: batchId
        });


        // Build payload for Make.com
        const payload = this.buildFixtureBatchPayload(batchFixtures, competition, batchId);
        
        // Post to Make.com with specific event type (fixtures_N_league)
        const eventType = `fixtures_${fixtureCount}_league`;
        const postResult = this.postBatchToMake(eventType, payload);


        // Mark fixtures as posted if successful
        if (postResult.success) {
          this.markFixturesAsPosted(batchFixtures);
          this.processedBatches.add(batchId);
        }


        // Log batch processing
        this.logBatchProcessing('fixtures', fixtureCount, batchFixtures, postResult);


        const result = {
          success: postResult.success,
          count: fixtureCount,
          eventType: eventType,
          batchId: batchId,
          fixtures: batchFixtures,
          response: postResult.response
        };


        logger.exitFunction('BatchPostingManager.postLeagueFixturesBatch', result);
        return result;


      } catch (error) {
        logger.error('Batch fixture posting failed', { error: error.toString() });
        return { success: false, error: error.toString() };
      }
    });
  }


  /**
   * Post league results batch (per checklist requirement)
   * @param {Date} startDate - Start date for results search
   * @param {Date} endDate - End date for results search
   * @param {string} competition - Competition type (default: 'League')
   * @returns {Object} Posting result
   */
  postLeagueResultsBatch(startDate = null, endDate = null, competition = 'League') {
    logger.enterFunction('BatchPostingManager.postLeagueResultsBatch', {
      startDate, endDate, competition
    });


    return this.withLock(() => {
      try {
        // Default to previous weekend if no dates provided
        if (!startDate || !endDate) {
          const weekend = this.getPreviousWeekend();
          startDate = weekend.start;
          endDate = weekend.end;
        }


        logger.testHook('result_batch_date_range', { startDate, endDate });


        // Gather results from sheet
        const results = this.gatherResults(startDate, endDate, competition);
        
        if (results.length === 0) {
          logger.info('No results found for batch posting', { startDate, endDate });
          return { success: true, count: 0, message: 'No results to post' };
        }


        // Limit to max batch size per checklist
        const batchResults = results.slice(0, this.maxBatchSize);
        const resultCount = batchResults.length;


        // Generate batch ID for idempotency
        const batchId = this.generateBatchId('results', batchResults);
        if (this.processedBatches.has(batchId)) {
          logger.info('Batch already processed, skipping', { batchId });
          return { success: true, count: resultCount, skipped: true, batchId };
        }


        logger.testHook('result_batch_size', { 
          totalFound: results.length,
          batchSize: resultCount,
          batchId: batchId
        });


        // Build payload for Make.com
        const payload = this.buildResultBatchPayload(batchResults, competition, batchId);
        
        // Post to Make.com with specific event type (results_N_league)
        const eventType = `results_${resultCount}_league`;
        const postResult = this.postBatchToMake(eventType, payload);


        // Mark results as posted if successful
        if (postResult.success) {
          this.markResultsAsPosted(batchResults);
          this.processedBatches.add(batchId);
        }


        // Log batch processing
        this.logBatchProcessing('results', resultCount, batchResults, postResult);


        const result = {
          success: postResult.success,
          count: resultCount,
          eventType: eventType,
          batchId: batchId,
          results: batchResults,
          response: postResult.response
        };


        logger.exitFunction('BatchPostingManager.postLeagueResultsBatch', result);
        return result;


      } catch (error) {
        logger.error('Batch result posting failed', { error: error.toString() });
        return { success: false, error: error.toString() };
      }
    });
  }


  // ===== CUP AND FRIENDLY BATCH POSTING (EXTENSION) =====


  /**
   * Post cup fixtures batch (extension beyond checklist)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Posting result
   */
  postCupFixturesBatch(startDate = null, endDate = null) {
    return this.postLeagueFixturesBatch(startDate, endDate, 'Cup');
  }


  /**
   * Post friendly fixtures batch (extension beyond checklist)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Posting result
   */
  postFriendlyFixturesBatch(startDate = null, endDate = null) {
    return this.postLeagueFixturesBatch(startDate, endDate, 'Friendly');
  }


  // ===== DATA GATHERING METHODS =====


  /**
   * Gather fixtures from sheet within date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} competition - Competition type
   * @returns {Array} Array of fixture objects
   */
  gatherFixtures(startDate, endDate, competition) {
    logger.testHook('fixture_gathering_start', { startDate, endDate, competition });
    
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
        const [date, comp, homeTeam, awayTeam, venue, kickOff, posted] = row;


        // Skip if already posted
        if (posted === 'Y' || posted === true) {
          continue;
        }


        // Filter by competition
        if (competition && comp !== competition) {
          continue;
        }


        // Parse and filter by date
        const fixtureDate = DateUtils.parseDate(date);
        if (!fixtureDate) continue;


        if (fixtureDate >= startDate && fixtureDate <= endDate) {
          fixtures.push({
            rowIndex: i + 1, // 1-based row index
            date: fixtureDate,
            competition: comp,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            venue: venue,
            kickOff: kickOff,
            dateFormatted: DateUtils.formatDate(fixtureDate, 'dd MMM yyyy'),
            dayOfWeek: DateUtils.formatDate(fixtureDate, 'EEEE'),
            opponent: this.getOpponentName(homeTeam, awayTeam),
            homeAway: this.isHomeGame(homeTeam, awayTeam) ? 'HOME' : 'AWAY'
          });
        }
      }


      // Sort by date
      fixtures.sort((a, b) => a.date - b.date);


      logger.testHook('fixture_gathering_complete', { 
        fixturesFound: fixtures.length,
        competition: competition
      });


      return fixtures;


    } catch (error) {
      logger.error('Failed to gather fixtures', { error: error.toString() });
      return [];
    }
  }


  /**
   * Gather results from sheet within date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} competition - Competition type
   * @returns {Array} Array of result objects
   */
  gatherResults(startDate, endDate, competition) {
    logger.testHook('result_gathering_start', { startDate, endDate, competition });
    
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
        const [date, comp, homeTeam, awayTeam, homeScore, awayScore, venue, posted] = row;


        // Skip if already posted
        if (posted === 'Y' || posted === true) {
          continue;
        }


        // Filter by competition
        if (competition && comp !== competition) {
          continue;
        }


        // Parse and filter by date
        const resultDate = DateUtils.parseDate(date);
        if (!resultDate) continue;


        if (resultDate >= startDate && resultDate <= endDate) {
          const opponent = this.getOpponentName(homeTeam, awayTeam);
          const homeAway = this.isHomeGame(homeTeam, awayTeam) ? 'HOME' : 'AWAY';
          const result = this.calculateResult(homeTeam, awayTeam, homeScore, awayScore);


          results.push({
            rowIndex: i + 1, // 1-based row index
            date: resultDate,
            competition: comp,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            homeScore: parseInt(homeScore) || 0,
            awayScore: parseInt(awayScore) || 0,
            venue: venue,
            dateFormatted: DateUtils.formatDate(resultDate, 'dd MMM yyyy'),
            dayOfWeek: DateUtils.formatDate(resultDate, 'EEEE'),
            opponent: opponent,
            homeAway: homeAway,
            result: result,
            scoreString: `${homeScore}-${awayScore}`,
            goalDifference: this.calculateGoalDifference(homeTeam, awayTeam, homeScore, awayScore)
          });
        }
      }


      // Sort by date
      results.sort((a, b) => a.date - b.date);


      logger.testHook('result_gathering_complete', { 
        resultsFound: results.length,
        competition: competition
      });


      return results;


    } catch (error) {
      logger.error('Failed to gather results', { error: error.toString() });
      return [];
    }
  }


  /**
   * Calculate match result (W/L/D)
   * @param {string} homeTeam - Home team name
   * @param {string} awayTeam - Away team name
   * @param {number} homeScore - Home score
   * @param {number} awayScore - Away score
   * @returns {string} Result from our perspective
   */
  calculateResult(homeTeam, awayTeam, homeScore, awayScore) {
    const clubName = getConfig('SYSTEM.CLUB_NAME', 'Syston Town Tigers');
    const isHomeGame = homeTeam.includes('Syston') || homeTeam.includes('Tigers');
    
    let ourScore, theirScore;
    if (isHomeGame) {
      ourScore = parseInt(homeScore) || 0;
      theirScore = parseInt(awayScore) || 0;
    } else {
      ourScore = parseInt(awayScore) || 0;
      theirScore = parseInt(homeScore) || 0;
    }


    if (ourScore > theirScore) return 'W';
    if (ourScore < theirScore) return 'L';
    return 'D';
  }


  /**
   * Calculate goal difference from our perspective
   * @param {string} homeTeam - Home team name
   * @param {string} awayTeam - Away team name
   * @param {number} homeScore - Home score
   * @param {number} awayScore - Away score
   * @returns {number} Goal difference
   */
  calculateGoalDifference(homeTeam, awayTeam, homeScore, awayScore) {
    const isHomeGame = this.isHomeGame(homeTeam, awayTeam);
    
    let ourScore, theirScore;
    if (isHomeGame) {
      ourScore = parseInt(homeScore) || 0;
      theirScore = parseInt(awayScore) || 0;
    } else {
      ourScore = parseInt(awayScore) || 0;
      theirScore = parseInt(homeScore) || 0;
    }


    return ourScore - theirScore;
  }


  // ===== PAYLOAD BUILDING =====


  /**
   * Build Make.com payload for fixture batch (with Canva placeholders)
   * @param {Array} fixtures - Array of fixture objects
   * @param {string} competition - Competition type
   * @param {string} batchId - Unique batch ID
   * @returns {Object} Make.com payload
   */
  buildFixtureBatchPayload(fixtures, competition, batchId) {
    logger.testHook('fixture_payload_building', { 
      fixtureCount: fixtures.length,
      competition: competition,
      batchId: batchId
    });


    // Build fixtures list for Canva template
    const fixturesList = fixtures.map(fixture => ({
      date: fixture.dateFormatted,
      day: fixture.dayOfWeek,
      opponent: fixture.opponent,
      venue: fixture.venue || 'TBC',
      kickOff: fixture.kickOff || '15:00',
      homeAway: fixture.homeAway,
      competition: fixture.competition
    }));


    // Get weekend date range
    const weekendDate = fixtures.length > 0 ? 
      this.getDateRange(fixtures[0].date, fixtures[fixtures.length - 1].date) : 
      'This Weekend';


    // Build payload with all Canva placeholders per checklist
    const payload = {
      timestamp: DateUtils.now().toISOString(),
      event_type: `fixtures_${fixtures.length}_${competition.toLowerCase()}`,
      source: 'apps_script_batch_posting',
      batch_id: batchId,
      
      // Canva placeholders per checklist requirement
      fixture_count: fixtures.length,
      fixtures_list: fixturesList,
      weekend_date: weekendDate,
      competition: competition,
      
      // Enhanced data for better templates
      home_fixtures: fixturesList.filter(f => f.homeAway === 'HOME').length,
      away_fixtures: fixturesList.filter(f => f.homeAway === 'AWAY').length,
      competitions_involved: [...new Set(fixtures.map(f => f.competition))],
      
      // Additional context
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      generated_at: DateUtils.now().toISOString()
    };


    return payload;
  }


  /**
   * Build Make.com payload for result batch (with Canva placeholders)
   * @param {Array} results - Array of result objects
   * @param {string} competition - Competition type
   * @param {string} batchId - Unique batch ID
   * @returns {Object} Make.com payload
   */
  buildResultBatchPayload(results, competition, batchId) {
    logger.testHook('result_payload_building', { 
      resultCount: results.length,
      competition: competition,
      batchId: batchId
    });


    // Build results list for Canva template
    const resultsList = results.map(result => ({
      date: result.dateFormatted,
      day: result.dayOfWeek,
      opponent: result.opponent,
      score: result.scoreString,
      venue: result.venue || '',
      result: result.result,
      homeAway: result.homeAway,
      competition: result.competition,
      goalDifference: result.goalDifference
    }));


    // Calculate summary stats
    const wins = results.filter(r => r.result === 'W').length;
    const draws = results.filter(r => r.result === 'D').length;
    const losses = results.filter(r => r.result === 'L').length;
    
    const goalsScored = results.reduce((total, r) => {
      return total + (r.homeAway === 'HOME' ? r.homeScore : r.awayScore);
    }, 0);
    
    const goalsConceded = results.reduce((total, r) => {
      return total + (r.homeAway === 'HOME' ? r.awayScore : r.homeScore);
    }, 0);


    // Get weekend date range
    const weekendDate = results.length > 0 ? 
      this.getDateRange(results[0].date, results[results.length - 1].date) : 
      'Last Weekend';


    // Build payload with all Canva placeholders per checklist
    const payload = {
      timestamp: DateUtils.now().toISOString(),
      event_type: `results_${results.length}_${competition.toLowerCase()}`,
      source: 'apps_script_batch_posting',
      batch_id: batchId,
      
      // Canva placeholders per checklist requirement
      result_count: results.length,
      results_list: resultsList,
      weekend_date: weekendDate,
      competition: competition,
      
      // Results summary statistics
      wins: wins,
      draws: draws,
      losses: losses,
      goals_scored: goalsScored,
      goals_conceded: goalsConceded,
      goal_difference: goalsScored - goalsConceded,
      win_percentage: Math.round((wins / results.length) * 100),
      
      // Enhanced breakdown
      home_results: resultsList.filter(r => r.homeAway === 'HOME').length,
      away_results: resultsList.filter(r => r.homeAway === 'AWAY').length,
      competitions_involved: [...new Set(results.map(r => r.competition))],
      
      // Additional context
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      generated_at: DateUtils.now().toISOString()
    };


    return payload;
  }


  // ===== UTILITY METHODS =====


  /**
   * Generate unique batch ID for idempotency
   * @param {string} type - Batch type ('fixtures' or 'results')
   * @param {Array} items - Items in the batch
   * @returns {string} Unique batch ID
   */
  generateBatchId(type, items) {
    const itemKeys = items.map(item => {
      return `${item.date.getTime()}-${item.homeTeam}-${item.awayTeam}`;
    }).sort().join('|');
    
    const hash = StringUtils.normalize(`${type}-${itemKeys}`);
    return `batch_${type}_${hash.substr(0, 16)}`;
  }


  /**
   * Get current weekend date range
   * @returns {Object} Weekend start and end dates
   */
  getCurrentWeekend() {
    const now = DateUtils.now();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Calculate Saturday of current week
    const daysToSaturday = (6 - dayOfWeek) % 7;
    const saturday = new Date(now);
    saturday.setDate(now.getDate() + daysToSaturday);
    saturday.setHours(0, 0, 0, 0);
    
    // Sunday is the day after Saturday
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    sunday.setHours(23, 59, 59, 999);
    
    return {
      start: saturday,
      end: sunday
    };
  }


  /**
   * Get previous weekend date range
   * @returns {Object} Weekend start and end dates
   */
  getPreviousWeekend() {
    const currentWeekend = this.getCurrentWeekend();
    const prevSaturday = new Date(currentWeekend.start);
    prevSaturday.setDate(prevSaturday.getDate() - 7);
    
    const prevSunday = new Date(currentWeekend.end);
    prevSunday.setDate(prevSunday.getDate() - 7);
    
    return {
      start: prevSaturday,
      end: prevSunday
    };
  }


  /**
   * Get formatted date range string
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {string} Formatted date range
   */
  getDateRange(startDate, endDate) {
    if (!startDate && !endDate) return '';
    if (!endDate || startDate.getTime() === endDate.getTime()) {
      return DateUtils.formatDate(startDate, 'dd MMM yyyy');
    }
    
    const start = DateUtils.formatDate(startDate, 'dd MMM');
    const end = DateUtils.formatDate(endDate, 'dd MMM yyyy');
    return `${start} - ${end}`;
  }


  /**
   * Determine if this is a home game
   * @param {string} homeTeam - Home team name
   * @param {string} awayTeam - Away team name
   * @returns {boolean} Is home game
   */
  isHomeGame(homeTeam, awayTeam) {
    const clubName = getConfig('SYSTEM.CLUB_NAME', 'Syston');
    return homeTeam.includes('Syston') || homeTeam.includes('Tigers');
  }


  /**
   * Get opponent name from fixture/result
   * @param {string} homeTeam - Home team name
   * @param {string} awayTeam - Away team name
   * @returns {string} Opponent name
   */
  getOpponentName(homeTeam, awayTeam) {
    if (this.isHomeGame(homeTeam, awayTeam)) {
      return awayTeam;
    } else {
      return homeTeam;
    }
  }


  /**
   * Post batch data to Make.com with rate limiting
   * @param {string} eventType - Event type for routing
   * @param {Object} payload - Payload data
   * @returns {Object} Posting result
   */
  postBatchToMake(eventType, payload) {
    logger.testHook('batch_make_posting', { eventType });
    
    try {
      // Get Make.com webhook URL
      const webhookUrl = PropertiesService.getScriptProperties()
                           .getProperty(getConfig('MAKE.WEBHOOK_URL_PROPERTY'));
      
      if (!webhookUrl) {
        logger.warn('Make.com webhook URL not configured');
        return { success: false, error: 'Webhook URL not configured' };
      }


      // Add event type to payload
      payload.event_type = getConfig(`MAKE.EVENT_MAPPINGS.${eventType}`, eventType);


      // Send to Make.com with rate limiting
      const response = ApiUtils.rateLimitedMakeRequest(webhookUrl, {
        method: 'POST',
        payload: JSON.stringify(payload)
      });


      // Log the batch post
      this.logBatchPost(eventType, payload, response);


      return {
        success: response.success,
        response: response
      };


    } catch (error) {
      logger.error('Failed to post batch to Make.com', { 
        eventType, 
        error: error.toString() 
      });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Mark fixtures as posted in sheet
   * @param {Array} fixtures - Fixtures to mark as posted
   * @returns {boolean} Success status
   */
  markFixturesAsPosted(fixtures) {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.FIXTURES'));
      if (!fixturesSheet) return false;


      for (const fixture of fixtures) {
        const postedCell = `G${fixture.rowIndex}`; // Posted column
        SheetUtils.setCellValue(fixturesSheet, postedCell, 'Y');
      }


      logger.info(`Marked ${fixtures.length} fixtures as posted`);
      return true;
    } catch (error) {
      logger.error('Failed to mark fixtures as posted', { error: error.toString() });
      return false;
    }
  }


  /**
   * Mark results as posted in sheet
   * @param {Array} results - Results to mark as posted
   * @returns {boolean} Success status
   */
  markResultsAsPosted(results) {
    try {
      const resultsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.RESULTS'));
      if (!resultsSheet) return false;


      for (const result of results) {
        const postedCell = `H${result.rowIndex}`; // Posted column
        SheetUtils.setCellValue(resultsSheet, postedCell, 'Y');
      }


      logger.info(`Marked ${results.length} results as posted`);
      return true;
    } catch (error) {
      logger.error('Failed to mark results as posted', { error: error.toString() });
      return false;
    }
  }


  /**
   * Log batch processing attempt to tracking sheet
   * @param {string} batchType - Batch type
   * @param {number} count - Item count
   * @param {Array} items - Items processed
   * @param {Object} result - Processing result
   * @returns {boolean} Success status
   */
  logBatchProcessing(batchType, count, items, result) {
    try {
      const batchSheet = SheetUtils.getOrCreateSheet(
        'Batch_Processing_Log',
        ['Timestamp', 'Batch_Type', 'Count', 'Items', 'Status', 'Response']
      );
      
      if (!batchSheet) return false;


      const values = [
        DateUtils.now().toISOString(),
        batchType,
        count,
        JSON.stringify(items.map(item => ({
          date: item.dateFormatted,
          opponent: item.opponent,
          homeAway: item.homeAway
        }))).substr(0, 2000), // Truncate long item lists
        result.success ? 'SUCCESS' : 'FAILED',
        JSON.stringify(result).substr(0, 1000)
      ];


      return SheetUtils.appendRowSafe(batchSheet, values);
    } catch (error) {
      logger.error('Failed to log batch processing', { error: error.toString() });
      return false;
    }
  }


  /**
   * Log batch post to tracking sheet
   * @param {string} eventType - Event type
   * @param {Object} payload - Payload sent
   * @param {Object} response - API response
   * @returns {boolean} Success status
   */
  logBatchPost(eventType, payload, response) {
    try {
      const socialSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.SOCIAL_POSTS'),
        ['Timestamp', 'Event_Type', 'Payload', 'Status', 'Response']
      );
      
      if (!socialSheet) return false;


      const values = [
        DateUtils.now().toISOString(),
        eventType,
        JSON.stringify(payload).substr(0, 2000), // Truncate long payloads
        response.success ? 'SUCCESS' : 'FAILED',
        JSON.stringify(response).substr(0, 1000)
      ];


      return SheetUtils.appendRowSafe(socialSheet, values);
    } catch (error) {
      logger.error('Failed to log batch post', { error: error.toString() });
      return false;
    }
  }
}


// ===== MAKE.COM ROUTER BRANCHES (Per Checklist Requirement) =====


/**
 * Make.com Router Branch Configurations
 * These JSON configurations should be used in Make.com scenario setup
 */
const MAKE_ROUTER_BRANCHES = {
  
  // Fixture batch branches (1-5 fixtures per checklist)
  FIXTURES_1_LEAGUE: {
    "filter": {
      "condition": "AND",
      "rules": [
        {
          "field": "event_type", 
          "operator": "equal",
          "value": "fixtures_1_league"
        }
      ]
    },
    "modules": [
      {
        "name": "Canva - Create design",
        "template_id": "FIXTURE_SINGLE_TEMPLATE_ID",
        "placeholders": [
          "fixture_count", "fixtures_list", "weekend_date", "competition", "club_name"
        ]
      }
    ]
  },


  FIXTURES_2_LEAGUE: {
    "filter": {
      "condition": "AND", 
      "rules": [
        {
          "field": "event_type",
          "operator": "equal", 
          "value": "fixtures_2_league"
        }
      ]
    },
    "modules": [
      {
        "name": "Canva - Create design",
        "template_id": "FIXTURE_DOUBLE_TEMPLATE_ID", 
        "placeholders": [
          "fixture_count", "fixtures_list", "weekend_date", "competition", "club_name"
        ]
      }
    ]
  },


  FIXTURES_3_LEAGUE: {
    "filter": {
      "condition": "AND",
      "rules": [
        {
          "field": "event_type",
          "operator": "equal",
          "value": "fixtures_3_league"
        }
      ]
    },
    "modules": [
      {
        "name": "Canva - Create design", 
        "template_id": "FIXTURE_TRIPLE_TEMPLATE_ID",
        "placeholders": [
          "fixture_count", "fixtures_list", "weekend_date", "competition", "club_name"
        ]
      }
    ]
  },


  FIXTURES_4_LEAGUE: {
    "filter": {
      "condition": "AND",
      "rules": [
        {
          "field": "event_type",
          "operator": "equal", 
          "value": "fixtures_4_league"
        }
      ]
    },
    "modules": [
      {
        "name": "Canva - Create design",
        "template_id": "FIXTURE_QUAD_TEMPLATE_ID",
        "placeholders": [
          "fixture_count", "fixtures_list", "weekend_date", "competition", "club_name"
        ]
      }
    ]
  },


  FIXTURES_5_LEAGUE: {
    "filter": {
      "condition": "AND",
      "rules": [
        {
          "field": "event_type", 
          "operator": "equal",
          "value": "fixtures_5_league"
        }
      ]
    },
    "modules": [
      {
        "name": "Canva - Create design",
        "template_id": "FIXTURE_FIVE_TEMPLATE_ID",
        "placeholders": [
          "fixture_count", "fixtures_list", "weekend_date", "competition", "club_name"
        ]
      }
    ]
  },


  // Result batch branches (1-5 results per checklist)
  RESULTS_1_LEAGUE: {
    "filter": {
      "condition": "AND",
      "rules": [
        {
          "field": "event_type",
          "operator": "equal",
          "value": "results_1_league"
        }
      ]
    },
    "modules": [
      {
        "name": "Canva - Create design", 
        "template_id": "RESULT_SINGLE_TEMPLATE_ID",
        "placeholders": [
          "result_count", "results_list", "weekend_date", "competition", "wins", "draws", "losses", "club_name"
        ]
      }
    ]
  },


  RESULTS_2_LEAGUE: {
    "filter": {
      "condition": "AND",
      "rules": [
        {
          "field": "event_type",
          "operator": "equal",
          "value": "results_2_league" 
        }
      ]
    },
    "modules": [
      {
        "name": "Canva - Create design",
        "template_id": "RESULT_DOUBLE_TEMPLATE_ID",
        "placeholders": [
          "result_count", "results_list", "weekend_date", "competition", "wins", "draws", "losses", "club_name"
        ]
      }
    ]
  },


  RESULTS_3_LEAGUE: {
    "filter": {
      "condition": "AND", 
      "rules": [
        {
          "field": "event_type",
          "operator": "equal",
          "value": "results_3_league"
        }
      ]
    },
    "modules": [
      {
        "name": "Canva - Create design",
        "template_id": "RESULT_TRIPLE_TEMPLATE_ID", 
        "placeholders": [
          "result_count", "results_list", "weekend_date", "competition", "wins", "draws", "losses", "club_name"
        ]
      }
    ]
  },


  RESULTS_4_LEAGUE: {
    "filter": {
      "condition": "AND",
      "rules": [
        {
          "field": "event_type",
          "operator": "equal",
          "value": "results_4_league"
        }
      ]
    },
    "modules": [
      {
        "name": "Canva - Create design",
        "template_id": "RESULT_QUAD_TEMPLATE_ID",
        "placeholders": [
          "result_count", "results_list", "weekend_date", "competition", "wins", "draws", "losses", "club_name"
        ]
      }
    ]
  },


  RESULTS_5_LEAGUE: {
    "filter": {
      "condition": "AND",
      "rules": [
        {
          "field": "event_type", 
          "operator": "equal",
          "value": "results_5_league"
        }
      ]
    },
    "modules": [
      {
        "name": "Canva - Create design",
        "template_id": "RESULT_FIVE_TEMPLATE_ID",
        "placeholders": [
          "result_count", "results_list", "weekend_date", "competition", "wins", "draws", "losses", "club_name"
        ]
      }
    ]
  }
};


// ===== CANVA PLACEHOLDERS (Per Checklist Requirement) =====


/**
 * Required Canva placeholders for each template type
 * Use these when creating Canva templates in Make.com
 */
const CANVA_PLACEHOLDERS = {
  
  // Fixture batch placeholders
  FIXTURE_BATCH: [
    'fixture_count',      // Number of fixtures (1-5)
    'fixtures_list',      // Array of fixture objects
    'weekend_date',       // Date range string
    'competition',        // Competition type
    'club_name',          // Club name
    'season',             // Season string
    'home_fixtures',      // Number of home fixtures
    'away_fixtures'       // Number of away fixtures
  ],


  // Individual fixture placeholders within fixtures_list
  FIXTURE_ITEM: [
    'date',               // Formatted date
    'day',                // Day of week
    'opponent',           // Opponent name
    'venue',              // Venue name
    'kickOff',            // Kick off time
    'homeAway',           // HOME or AWAY
    'competition'         // Competition type
  ],


  // Result batch placeholders
  RESULT_BATCH: [
    'result_count',       // Number of results (1-5)
    'results_list',       // Array of result objects
    'weekend_date',       // Date range string  
    'competition',        // Competition type
    'wins',               // Number of wins
    'draws',              // Number of draws
    'losses',             // Number of losses
    'goals_scored',       // Total goals scored
    'goals_conceded',     // Total goals conceded
    'goal_difference',    // Goal difference
    'win_percentage',     // Win percentage
    'club_name',          // Club name
    'season'              // Season string
  ],


  // Individual result placeholders within results_list
  RESULT_ITEM: [
    'date',               // Formatted date
    'day',                // Day of week
    'opponent',           // Opponent name
    'score',              // Score string (e.g., "2-1")
    'venue',              // Venue name
    'result',             // W/L/D
    'homeAway',           // HOME or AWAY
    'competition',        // Competition type
    'goalDifference'      // Goal difference for this match
  ]
};


// Create and export singleton instance
const batchPostingManager = new BatchPostingManager();


// Export for global access
globalThis.BatchPostingManager = BatchPostingManager;
globalThis.batchPostingManager = batchPostingManager;
globalThis.MAKE_ROUTER_BRANCHES = MAKE_ROUTER_BRANCHES;
globalThis.CANVA_PLACEHOLDERS = CANVA_PLACEHOLDERS;
