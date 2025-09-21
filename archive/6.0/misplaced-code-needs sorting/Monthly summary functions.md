/**
 * @fileoverview Syston Tigers Automation - Monthly Summary Functions
 * @version 6.0.0
 * @author Senior Software Architect
 * 
 * CRITICAL MILESTONE 1.3 IMPLEMENTATION: Monthly Summary Functions
 * 
 * Implements the missing monthly summary functions as specified in 
 * tasks.md Milestone 1.3 Monthly Summary Functions.
 * 
 * Key Requirements:
 * - postMonthlyFixturesSummary() - Gather all Syston fixtures for current month
 * - postMonthlyResultsSummary() - Gather all Syston results for current month
 * - Calculate key statistics (home/away, competitions, performance metrics)
 * - Create payloads with event_type: 'fixtures_this_month' / 'results_this_month'
 * - Add intelligent scheduling (25th and 2nd of each month)
 * - Test with real fixture/result data
 */


// ===== MONTHLY FIXTURES SUMMARY =====


/**
 * Post monthly fixtures summary (CRITICAL - Milestone 1.3)
 * Scheduled for 25th of each month for next month preview
 * @param {Date} targetMonth - Target month (optional, defaults to next month)
 * @returns {Object} Processing result
 */
postMonthlyFixturesSummary(targetMonth = null) {
  logger.enterFunction('EnhancedEventsManager.postMonthlyFixturesSummary', {
    targetMonth: targetMonth
  });
  
  try {
    // @testHook(monthly_fixtures_date_calculation)
    // Default to next month if no target specified
    if (!targetMonth) {
      const now = DateUtils.now();
      targetMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
    
    const monthKey = DateUtils.formatDate(targetMonth, 'yyyy-MM');
    
    // @testHook(monthly_fixtures_idempotency_check)
    // Check if already processed this month
    if (this.monthlyCache.has(`fixtures_${monthKey}`)) {
      logger.info('Monthly fixtures summary already processed', { monthKey });
      return { 
        success: true, 
        skipped: true, 
        reason: 'Already processed this month',
        monthKey: monthKey
      };
    }


    // @testHook(monthly_fixtures_data_gathering)
    // Gather all Syston fixtures for target month
    const fixturesData = this.gatherMonthlyFixtures(targetMonth);
    
    if (fixturesData.fixtures.length === 0) {
      logger.info('No fixtures found for monthly summary', { 
        month: DateUtils.formatDate(targetMonth, 'MMMM yyyy')
      });
      return { 
        success: true, 
        count: 0, 
        message: 'No fixtures to summarize',
        month: DateUtils.formatDate(targetMonth, 'MMMM yyyy')
      };
    }


    // @testHook(monthly_fixtures_statistics_calculation)
    // Calculate key statistics
    const statistics = this.calculateFixtureStatistics(fixturesData.fixtures, targetMonth);
    
    // @testHook(monthly_fixtures_payload_generation)
    // Create payload with event_type: 'fixtures_this_month'
    const makePayload = this.buildMonthlyFixturesPayload(fixturesData, statistics, targetMonth);
    
    // @testHook(monthly_fixtures_make_posting)
    // Post to Make.com for monthly fixtures template
    const postResult = this.postMonthlyContentToMake(makePayload);
    
    // @testHook(monthly_fixtures_caching)
    // Cache to prevent duplicate processing
    if (postResult.success) {
      this.monthlyCache.set(`fixtures_${monthKey}`, {
        processed: DateUtils.now(),
        count: fixturesData.fixtures.length,
        statistics: statistics
      });
      
      // Log to monthly summaries sheet
      this.logMonthlySummary('fixtures', monthKey, fixturesData.fixtures.length, statistics);
    }


    const result = {
      success: postResult.success,
      month: DateUtils.formatDate(targetMonth, 'MMMM yyyy'),
      monthKey: monthKey,
      fixtureCount: fixturesData.fixtures.length,
      statistics: statistics,
      makePostResult: postResult,
      eventType: 'fixtures_this_month'
    };


    logger.exitFunction('EnhancedEventsManager.postMonthlyFixturesSummary', result);
    return result;


  } catch (error) {
    logger.error('Monthly fixtures summary failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Gather all Syston fixtures for specified month
 * @param {Date} targetMonth - Target month
 * @returns {Object} Fixtures data and metadata
 */
gatherMonthlyFixtures(targetMonth) {
  logger.testHook('monthly_fixtures_gathering', { targetMonth });
  
  try {
    const fixturesSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.FIXTURES'));
    if (!fixturesSheet) {
      logger.error('Fixtures sheet not available');
      return { fixtures: [], metadata: {} };
    }


    const data = fixturesSheet.getDataRange().getValues();
    const fixtures = [];
    const clubName = getConfig('SYSTEM.CLUB_NAME', 'Syston Tigers');
    
    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);


    // Process each fixture row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const [date, competition, homeTeam, awayTeam, venue, kickOff, posted] = row;


      // Parse fixture date
      const fixtureDate = DateUtils.parseDate(date);
      if (!fixtureDate) continue;


      // Check if fixture is in target month and involves our club
      if (fixtureDate >= monthStart && fixtureDate <= monthEnd) {
        const isOurFixture = homeTeam.toLowerCase().includes(clubName.toLowerCase()) ||
                           awayTeam.toLowerCase().includes(clubName.toLowerCase());
        
        if (isOurFixture) {
          const isHome = homeTeam.toLowerCase().includes(clubName.toLowerCase());
          const opponent = isHome ? awayTeam : homeTeam;
          
          fixtures.push({
            date: fixtureDate,
            dateFormatted: DateUtils.formatDate(fixtureDate, 'dd MMM yyyy'),
            dayOfWeek: DateUtils.formatDate(fixtureDate, 'EEEE'),
            competition: competition,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            opponent: opponent,
            venue: venue,
            kickOff: kickOff,
            isHome: isHome,
            homeAway: isHome ? 'H' : 'A',
            rowIndex: i + 1
          });
        }
      }
    }


    // Sort fixtures by date
    fixtures.sort((a, b) => a.date - b.date);


    const metadata = {
      monthName: DateUtils.formatDate(targetMonth, 'MMMM yyyy'),
      monthStart: monthStart,
      monthEnd: monthEnd,
      totalFixtures: fixtures.length,
      clubName: clubName
    };


    logger.info('Monthly fixtures gathered', {
      month: metadata.monthName,
      count: fixtures.length,
      firstFixture: fixtures[0]?.dateFormatted,
      lastFixture: fixtures[fixtures.length - 1]?.dateFormatted
    });


    return { fixtures, metadata };
  } catch (error) {
    logger.error('Monthly fixtures gathering failed', { error: error.toString() });
    return { fixtures: [], metadata: {} };
  }
}


/**
 * Calculate fixture statistics for the month
 * @param {Array} fixtures - Array of fixture objects
 * @param {Date} targetMonth - Target month
 * @returns {Object} Calculated statistics
 */
calculateFixtureStatistics(fixtures, targetMonth) {
  logger.testHook('monthly_fixtures_statistics', { fixtureCount: fixtures.length });
  
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
      monthName: DateUtils.formatDate(targetMonth, 'MMMM yyyy')
    };


    fixtures.forEach(fixture => {
      // Home/Away count
      if (fixture.isHome) {
        stats.homeFixtures++;
      } else {
        stats.awayFixtures++;
      }


      // Competition breakdown
      const comp = fixture.competition || 'Unknown';
      stats.competitions.set(comp, (stats.competitions.get(comp) || 0) + 1);


      // Venue tracking
      const venue = fixture.venue || 'TBC';
      stats.venues.set(venue, (stats.venues.get(venue) || 0) + 1);


      // Opponent list
      stats.opponents.push({
        name: fixture.opponent,
        date: fixture.dateFormatted,
        homeAway: fixture.homeAway,
        competition: fixture.competition
      });


      // Weekly distribution
      const weekNumber = this.getWeekOfMonth(fixture.date);
      const weekKey = `Week ${weekNumber}`;
      stats.weeklyDistribution[weekKey] = (stats.weeklyDistribution[weekKey] || 0) + 1;


      // Identify key matches (local derbies, cup matches, etc.)
      if (this.isKeyMatch(fixture)) {
        stats.keyMatches.push(fixture);
      }
    });


    // Convert maps to objects for JSON serialization
    stats.competitionsBreakdown = Object.fromEntries(stats.competitions);
    stats.venuesBreakdown = Object.fromEntries(stats.venues);


    // Calculate derived statistics
    stats.homeAwayRatio = stats.totalFixtures > 0 ? 
      Math.round((stats.homeFixtures / stats.totalFixtures) * 100) : 0;
    
    stats.averageFixturesPerWeek = stats.totalFixtures > 0 ? 
      Math.round((stats.totalFixtures / 4) * 10) / 10 : 0;


    // Find busiest week
    stats.busiestWeek = Object.keys(stats.weeklyDistribution).reduce((a, b) => 
      stats.weeklyDistribution[a] > stats.weeklyDistribution[b] ? a : b, 'Week 1');


    // Next match highlight
    stats.nextMatchHighlight = fixtures.length > 0 ? {
      opponent: fixtures[0].opponent,
      date: fixtures[0].dateFormatted,
      homeAway: fixtures[0].homeAway,
      competition: fixtures[0].competition,
      venue: fixtures[0].venue
    } : null;


    logger.info('Fixture statistics calculated', {
      total: stats.totalFixtures,
      home: stats.homeFixtures,
      away: stats.awayFixtures,
      competitions: stats.competitionsBreakdown
    });


    return stats;
  } catch (error) {
    logger.error('Fixture statistics calculation failed', { error: error.toString() });
    return { totalFixtures: fixtures.length, error: error.toString() };
  }
}


// ===== MONTHLY RESULTS SUMMARY =====


/**
 * Post monthly results summary (CRITICAL - Milestone 1.3)
 * Scheduled for 2nd of each month for previous month review
 * @param {Date} targetMonth - Target month (optional, defaults to previous month)
 * @returns {Object} Processing result
 */
postMonthlyResultsSummary(targetMonth = null) {
  logger.enterFunction('EnhancedEventsManager.postMonthlyResultsSummary', {
    targetMonth: targetMonth
  });
  
  try {
    // @testHook(monthly_results_date_calculation)
    // Default to previous month if no target specified
    if (!targetMonth) {
      const now = DateUtils.now();
      targetMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }
    
    const monthKey = DateUtils.formatDate(targetMonth, 'yyyy-MM');
    
    // @testHook(monthly_results_idempotency_check)
    // Check if already processed this month
    if (this.monthlyCache.has(`results_${monthKey}`)) {
      logger.info('Monthly results summary already processed', { monthKey });
      return { 
        success: true, 
        skipped: true, 
        reason: 'Already processed this month',
        monthKey: monthKey
      };
    }


    // @testHook(monthly_results_data_gathering)
    // Gather all Syston results for target month
    const resultsData = this.gatherMonthlyResults(targetMonth);
    
    if (resultsData.results.length === 0) {
      logger.info('No results found for monthly summary', { 
        month: DateUtils.formatDate(targetMonth, 'MMMM yyyy')
      });
      return { 
        success: true, 
        count: 0, 
        message: 'No results to summarize',
        month: DateUtils.formatDate(targetMonth, 'MMMM yyyy')
      };
    }


    // @testHook(monthly_results_performance_calculation)
    // Calculate performance metrics
    const performance = this.calculateResultsPerformance(resultsData.results, targetMonth);
    
    // @testHook(monthly_results_payload_generation)
    // Create payload with event_type: 'results_this_month'
    const makePayload = this.buildMonthlyResultsPayload(resultsData, performance, targetMonth);
    
    // @testHook(monthly_results_make_posting)
    // Post to Make.com for monthly results template
    const postResult = this.postMonthlyContentToMake(makePayload);
    
    // @testHook(monthly_results_caching)
    // Cache to prevent duplicate processing
    if (postResult.success) {
      this.monthlyCache.set(`results_${monthKey}`, {
        processed: DateUtils.now(),
        count: resultsData.results.length,
        performance: performance
      });
      
      // Log to monthly summaries sheet
      this.logMonthlySummary('results', monthKey, resultsData.results.length, performance);
    }


    const result = {
      success: postResult.success,
      month: DateUtils.formatDate(targetMonth, 'MMMM yyyy'),
      monthKey: monthKey,
      resultCount: resultsData.results.length,
      performance: performance,
      makePostResult: postResult,
      eventType: 'results_this_month'
    };


    logger.exitFunction('EnhancedEventsManager.postMonthlyResultsSummary', result);
    return result;


  } catch (error) {
    logger.error('Monthly results summary failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Gather all Syston results for specified month
 * @param {Date} targetMonth - Target month
 * @returns {Object} Results data and metadata
 */
gatherMonthlyResults(targetMonth) {
  logger.testHook('monthly_results_gathering', { targetMonth });
  
  try {
    const resultsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.RESULTS'));
    if (!resultsSheet) {
      logger.error('Results sheet not available');
      return { results: [], metadata: {} };
    }


    const data = resultsSheet.getDataRange().getValues();
    const results = [];
    const clubName = getConfig('SYSTEM.CLUB_NAME', 'Syston Tigers');
    
    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);


    // Process each result row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const [date, competition, homeTeam, awayTeam, homeScore, awayScore, venue, posted] = row;


      // Parse result date
      const resultDate = DateUtils.parseDate(date);
      if (!resultDate) continue;


      // Check if result is in target month and involves our club
      if (resultDate >= monthStart && resultDate <= monthEnd) {
        const isOurResult = homeTeam.toLowerCase().includes(clubName.toLowerCase()) ||
                           awayTeam.toLowerCase().includes(clubName.toLowerCase());
        
        if (isOurResult) {
          const isHome = homeTeam.toLowerCase().includes(clubName.toLowerCase());
          const opponent = isHome ? awayTeam : homeTeam;
          const ourScore = isHome ? parseInt(homeScore) : parseInt(awayScore);
          const theirScore = isHome ? parseInt(awayScore) : parseInt(homeScore);
          
          // Determine result
          let resultType = 'D'; // Draw
          if (ourScore > theirScore) resultType = 'W'; // Win
          if (ourScore < theirScore) resultType = 'L'; // Loss
          
          results.push({
            date: resultDate,
            dateFormatted: DateUtils.formatDate(resultDate, 'dd MMM yyyy'),
            dayOfWeek: DateUtils.formatDate(resultDate, 'EEEE'),
            competition: competition,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            homeScore: parseInt(homeScore),
            awayScore: parseInt(awayScore),
            opponent: opponent,
            venue: venue,
            isHome: isHome,
            homeAway: isHome ? 'H' : 'A',
            ourScore: ourScore,
            theirScore: theirScore,
            result: resultType,
            scoreDisplay: `${ourScore}-${theirScore}`,
            fullScoreDisplay: `${homeScore}-${awayScore}`,
            goalDifference: ourScore - theirScore,
            rowIndex: i + 1
          });
        }
      }
    }


    // Sort results by date
    results.sort((a, b) => a.date - b.date);


    const metadata = {
      monthName: DateUtils.formatDate(targetMonth, 'MMMM yyyy'),
      monthStart: monthStart,
      monthEnd: monthEnd,
      totalResults: results.length,
      clubName: clubName
    };


    logger.info('Monthly results gathered', {
      month: metadata.monthName,
      count: results.length,
      firstResult: results[0]?.dateFormatted,
      lastResult: results[results.length - 1]?.dateFormatted
    });


    return { results, metadata };
  } catch (error) {
    logger.error('Monthly results gathering failed', { error: error.toString() });
    return { results: [], metadata: {} };
  }
}


/**
 * Calculate performance metrics for results
 * @param {Array} results - Array of result objects
 * @param {Date} targetMonth - Target month
 * @returns {Object} Performance metrics
 */
calculateResultsPerformance(results, targetMonth) {
  logger.testHook('monthly_results_performance', { resultCount: results.length });
  
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
      monthName: DateUtils.formatDate(targetMonth, 'MMMM yyyy')
    };


    let bestGoalDifference = -999;
    let worstGoalDifference = 999;


    results.forEach(result => {
      // Basic W/D/L stats
      if (result.result === 'W') performance.wins++;
      if (result.result === 'D') performance.draws++;
      if (result.result === 'L') performance.losses++;


      // Goals
      performance.goalsFor += result.ourScore;
      performance.goalsAgainst += result.theirScore;


      // Clean sheets
      if (result.theirScore === 0) performance.cleanSheets++;


      // Home/Away breakdown
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


      // Competition breakdown
      const comp = result.competition || 'Unknown';
      if (!performance.competitionBreakdown.has(comp)) {
        performance.competitionBreakdown.set(comp, { played: 0, wins: 0, draws: 0, losses: 0 });
      }
      const compStats = performance.competitionBreakdown.get(comp);
      compStats.played++;
      if (result.result === 'W') compStats.wins++;
      if (result.result === 'D') compStats.draws++;
      if (result.result === 'L') compStats.losses++;


      // Best/Worst results
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


      // Recent form (last 5 games)
      performance.recentForm.push(result.result);
    });


    // Keep only last 5 for form
    performance.recentForm = performance.recentForm.slice(-5);


    // Convert competition map to object
    performance.competitionsBreakdown = {};
    performance.competitionBreakdown.forEach((stats, comp) => {
      performance.competitionsBreakdown[comp] = stats;
    });


    // Calculate derived statistics
    performance.points = (performance.wins * 3) + performance.draws;
    performance.winPercentage = performance.totalMatches > 0 ? 
      Math.round((performance.wins / performance.totalMatches) * 100) : 0;
    
    performance.goalDifference = performance.goalsFor - performance.goalsAgainst;
    performance.averageGoalsFor = performance.totalMatches > 0 ? 
      Math.round((performance.goalsFor / performance.totalMatches) * 10) / 10 : 0;
    performance.averageGoalsAgainst = performance.totalMatches > 0 ? 
      Math.round((performance.goalsAgainst / performance.totalMatches) * 10) / 10 : 0;


    performance.formString = performance.recentForm.join('');
    performance.record = `W${performance.wins} D${performance.draws} L${performance.losses}`;


    logger.info('Results performance calculated', {
      totalMatches: performance.totalMatches,
      record: performance.record,
      goalDifference: performance.goalDifference,
      winPercentage: performance.winPercentage
    });


    return performance;
  } catch (error) {
    logger.error('Results performance calculation failed', { error: error.toString() });
    return { totalMatches: results.length, error: error.toString() };
  }
}


// ===== PAYLOAD BUILDING FUNCTIONS =====


/**
 * Build Make.com payload for monthly fixtures
 * @param {Object} fixturesData - Fixtures data
 * @param {Object} statistics - Calculated statistics
 * @param {Date} targetMonth - Target month
 * @returns {Object} Make.com payload
 */
buildMonthlyFixturesPayload(fixturesData, statistics, targetMonth) {
  logger.testHook('monthly_fixtures_payload_building', { 
    fixtureCount: fixturesData.fixtures.length 
  });
  
  try {
    const payload = {
      timestamp: DateUtils.now().toISOString(),
      match_id: `monthly_fixtures_${DateUtils.formatDate(targetMonth, 'yyyy_MM')}`,
      event_type: getConfig('MAKE.EVENT_MAPPINGS.fixtures_this_month', 'fixtures_monthly'),
      source: 'apps_script_enhanced_automation',
      version: getConfig('SYSTEM.VERSION'),
      
      // Monthly fixtures specific data
      month_name: DateUtils.formatDate(targetMonth, 'MMMM yyyy'),
      fixture_count: fixturesData.fixtures.length,
      fixtures_list: fixturesData.fixtures.map(f => ({
        date: f.dateFormatted,
        opponent: f.opponent,
        homeAway: f.homeAway,
        competition: f.competition,
        venue: f.venue,
        kickOff: f.kickOff
      })),
      
      // Key statistics for template
      key_stats: {
        totalFixtures: statistics.totalFixtures,
        homeFixtures: statistics.homeFixtures,
        awayFixtures: statistics.awayFixtures,
        homeAwayRatio: statistics.homeAwayRatio,
        competitionsBreakdown: statistics.competitionsBreakdown,
        busiestWeek: statistics.busiestWeek,
        averageFixturesPerWeek: statistics.averageFixturesPerWeek
      },
      
      // Highlights for template
      next_match_highlight: statistics.nextMatchHighlight,
      key_matches: statistics.keyMatches,
      weekly_distribution: statistics.weeklyDistribution,
      
      // Context
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      
      // Idempotency
      idempotency_key: `monthly_fixtures_${DateUtils.formatDate(targetMonth, 'yyyy_MM')}`
    };


    logger.info('Monthly fixtures payload built', {
      eventType: payload.event_type,
      month: payload.month_name,
      fixtureCount: payload.fixture_count
    });


    return payload;
  } catch (error) {
    logger.error('Monthly fixtures payload building failed', { error: error.toString() });
    return null;
  }
}


/**
 * Build Make.com payload for monthly results
 * @param {Object} resultsData - Results data
 * @param {Object} performance - Performance metrics
 * @param {Date} targetMonth - Target month
 * @returns {Object} Make.com payload
 */
buildMonthlyResultsPayload(resultsData, performance, targetMonth) {
  logger.testHook('monthly_results_payload_building', { 
    resultCount: resultsData.results.length 
  });
  
  try {
    const payload = {
      timestamp: DateUtils.now().toISOString(),
      match_id: `monthly_results_${DateUtils.formatDate(targetMonth, 'yyyy_MM')}`,
      event_type: getConfig('MAKE.EVENT_MAPPINGS.results_this_month', 'results_monthly'),
      source: 'apps_script_enhanced_automation',
      version: getConfig('SYSTEM.VERSION'),
      
      // Monthly results specific data
      month_name: DateUtils.formatDate(targetMonth, 'MMMM yyyy'),
      result_count: resultsData.results.length,
      results_list: resultsData.results.map(r => ({
        date: r.dateFormatted,
        opponent: r.opponent,
        score: r.scoreDisplay,
        result: r.result,
        homeAway: r.homeAway,
        competition: r.competition
      })),
      
      // Performance statistics for template
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
      
      // Record breakdowns
      home_record: {
        played: performance.homeRecord.played,
        record: `W${performance.homeRecord.wins} D${performance.homeRecord.draws} L${performance.homeRecord.losses}`
      },
      away_record: {
        played: performance.awayRecord.played,
        record: `W${performance.awayRecord.wins} D${performance.awayRecord.draws} L${performance.awayRecord.losses}`
      },
      
      // Highlights
      best_result: performance.bestResult,
      worst_result: performance.worstResult,
      recent_form: performance.formString,
      
      // Goal statistics
      goal_stats: {
        for: performance.goalsFor,
        against: performance.goalsAgainst,
        difference: performance.goalDifference,
        cleanSheets: performance.cleanSheets,
        averageFor: performance.averageGoalsFor,
        averageAgainst: performance.averageGoalsAgainst
      },
      
      // Context
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      
      // Idempotency
      idempotency_key: `monthly_results_${DateUtils.formatDate(targetMonth, 'yyyy_MM')}`
    };


    logger.info('Monthly results payload built', {
      eventType: payload.event_type,
      month: payload.month_name,
      resultCount: payload.result_count,
      record: payload.key_stats.record
    });


    return payload;
  } catch (error) {
    logger.error('Monthly results payload building failed', { error: error.toString() });
    return null;
  }
}


// ===== UTILITY AND SUPPORT FUNCTIONS =====


/**
 * Post monthly content to Make.com
 * @param {Object} payload - Make.com payload
 * @returns {Object} Posting result
 */
postMonthlyContentToMake(payload) {
  logger.testHook('monthly_content_make_posting', { eventType: payload?.event_type });
  
  try {
    if (!payload) {
      return { success: false, error: 'No payload provided' };
    }


    // Get Make.com webhook URL
    const webhookUrl = PropertiesService.getScriptProperties()
                         .getProperty(getConfig('MAKE.WEBHOOK_URL_PROPERTY'));
    
    if (!webhookUrl) {
      logger.warn('Make.com webhook URL not configured for monthly content');
      return { success: false, error: 'Webhook URL not configured' };
    }


    // Send to Make.com with rate limiting
    const response = ApiUtils.rateLimitedMakeRequest(webhookUrl, {
      method: 'POST',
      payload: JSON.stringify(payload)
    });


    logger.info('Monthly content posted to Make.com', {
      eventType: payload.event_type,
      month: payload.month_name,
      success: response.success,
      responseCode: response.responseCode
    });


    return {
      success: response.success,
      response: response
    };


  } catch (error) {
    logger.error('Monthly content Make.com posting failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Log monthly summary to tracking sheet
 * @param {string} type - Summary type (fixtures/results)
 * @param {string} monthKey - Month key (YYYY-MM)
 * @param {number} count - Item count
 * @param {Object} data - Summary data
 * @returns {boolean} Success status
 */
logMonthlySummary(type, monthKey, count, data) {
  logger.testHook('monthly_summary_logging', { type, monthKey, count });
  
  try {
    const summarySheet = SheetUtils.getOrCreateSheet(
      'Monthly_Summaries',
      ['Timestamp', 'Month_Year', 'Type', 'Count', 'Data', 'Posted', 'Created']
    );
    
    if (!summarySheet) {
      logger.error('Monthly summaries sheet not available');
      return false;
    }


    const values = [
      DateUtils.now().toISOString(),
      monthKey,
      type,
      count,
      JSON.stringify(data).substr(0, 1000), // Truncate long data
      'Y', // Posted
      DateUtils.now().toISOString()
    ];


    const success = SheetUtils.appendRowSafe(summarySheet, values);
    
    if (success) {
      logger.info('Monthly summary logged', {
        type: type,
        month: monthKey,
        count: count
      });
    }
    
    return success;
  } catch (error) {
    logger.error('Monthly summary logging failed', { error: error.toString() });
    return false;
  }
}


/**
 * Get week number within month
 * @param {Date} date - Date to check
 * @returns {number} Week number (1-5)
 */
getWeekOfMonth(date) {
  try {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfMonth = date.getDate();
    const firstDayOfWeek = firstDay.getDay();
    
    return Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
  } catch (error) {
    logger.error('Week of month calculation failed', { error: error.toString() });
    return 1;
  }
}


/**
 * Determine if fixture is a key match
 * @param {Object} fixture - Fixture object
 * @returns {boolean} True if key match
 */
isKeyMatch(fixture) {
  try {
    const opponent = fixture.opponent.toLowerCase();
    const competition = fixture.competition.toLowerCase();
    
    // Local derbies (common local rivals)
    const localRivals = ['leicester', 'melton', 'oadby', 'hinckley', 'coalville'];
    const isLocalDerby = localRivals.some(rival => opponent.includes(rival));
    
    // Cup matches
    const isCupMatch = competition.includes('cup') || competition.includes('trophy');
    
    // Important competitions
    const isImportantComp = competition.includes('league cup') || 
                           competition.includes('fa cup') || 
                           competition.includes('county cup');
    
    return isLocalDerby || isCupMatch || isImportantComp;
  } catch (error) {
    logger.error('Key match detection failed', { error: error.toString() });
    return false;
  }
}


// ===== INTELLIGENT SCHEDULING FUNCTIONS =====


/**
 * Schedule monthly fixtures summary (25th of each month)
 * @returns {Object} Scheduling result
 */
scheduleMonthlyFixturesSummary() {
  logger.enterFunction('EnhancedEventsManager.scheduleMonthlyFixturesSummary');
  
  try {
    const now = DateUtils.now();
    const currentDay = now.getDate();
    
    // Check if today is the 25th (or close to it for end-of-month edge cases)
    if (currentDay === 25 || (currentDay >= 25 && this.isEndOfMonth(now))) {
      logger.info('Triggering scheduled monthly fixtures summary');
      
      // Post summary for next month
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const result = this.postMonthlyFixturesSummary(nextMonth);
      
      logger.exitFunction('EnhancedEventsManager.scheduleMonthlyFixturesSummary', result);
      return result;
    } else {
      logger.info('Not scheduled day for monthly fixtures summary', { 
        currentDay: currentDay,
        scheduledDay: 25
      });
      return { 
        success: true, 
        skipped: true, 
        reason: 'Not scheduled day',
        currentDay: currentDay,
        scheduledDay: 25
      };
    }
  } catch (error) {
    logger.error('Monthly fixtures summary scheduling failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Schedule monthly results summary (2nd of each month)
 * @returns {Object} Scheduling result
 */
scheduleMonthlyResultsSummary() {
  logger.enterFunction('EnhancedEventsManager.scheduleMonthlyResultsSummary');
  
  try {
    const now = DateUtils.now();
    const currentDay = now.getDate();
    
    // Check if today is the 2nd
    if (currentDay === 2) {
      logger.info('Triggering scheduled monthly results summary');
      
      // Post summary for previous month
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const result = this.postMonthlyResultsSummary(previousMonth);
      
      logger.exitFunction('EnhancedEventsManager.scheduleMonthlyResultsSummary', result);
      return result;
    } else {
      logger.info('Not scheduled day for monthly results summary', { 
        currentDay: currentDay,
        scheduledDay: 2
      });
      return { 
        success: true, 
        skipped: true, 
        reason: 'Not scheduled day',
        currentDay: currentDay,
        scheduledDay: 2
      };
    }
  } catch (error) {
    logger.error('Monthly results summary scheduling failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Check if date is end of month
 * @param {Date} date - Date to check
 * @returns {boolean} True if end of month
 */
isEndOfMonth(date) {
  try {
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return date.getDate() >= lastDayOfMonth - 2; // Within 2 days of end
  } catch (error) {
    logger.error('End of month check failed', { error: error.toString() });
    return false;
  }
}


// ===== PUBLIC API FUNCTIONS FOR MAIN COORDINATOR =====


/**
 * Public function to post monthly fixtures summary
 * @param {Date} targetMonth - Target month (optional)
 * @returns {Object} Processing result
 */
function postMonthlyFixturesSummary(targetMonth = null) {
  logger.enterFunction('postMonthlyFixturesSummary', { targetMonth });


  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const enhancedManager = coordinator.components.get('EnhancedEventsManager');
    if (!enhancedManager) {
      logger.error('EnhancedEventsManager not available');
      return { success: false, error: 'Enhanced events manager not available' };
    }


    const result = enhancedManager.postMonthlyFixturesSummary(targetMonth);


    logger.exitFunction('postMonthlyFixturesSummary', { success: result.success });
    return result;


  } catch (error) {
    logger.error('Monthly fixtures summary failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Public function to post monthly results summary
 * @param {Date} targetMonth - Target month (optional)
 * @returns {Object} Processing result
 */
function postMonthlyResultsSummary(targetMonth = null) {
  logger.enterFunction('postMonthlyResultsSummary', { targetMonth });


  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const enhancedManager = coordinator.components.get('EnhancedEventsManager');
    if (!enhancedManager) {
      logger.error('EnhancedEventsManager not available');
      return { success: false, error: 'Enhanced events manager not available' };
    }


    const result = enhancedManager.postMonthlyResultsSummary(targetMonth);


    logger.exitFunction('postMonthlyResultsSummary', { success: result.success });
    return result;


  } catch (error) {
    logger.error('Monthly results summary failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Public function to run monthly scheduling check
 * @returns {Object} Scheduling result
 */
function runMonthlySchedulingCheck() {
  logger.enterFunction('runMonthlySchedulingCheck');


  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const enhancedManager = coordinator.components.get('EnhancedEventsManager');
    if (!enhancedManager) {
      logger.error('EnhancedEventsManager not available for scheduling');
      return { success: false, error: 'Enhanced events manager not available' };
    }


    const results = {
      fixturesCheck: enhancedManager.scheduleMonthlyFixturesSummary(),
      resultsCheck: enhancedManager.scheduleMonthlyResultsSummary()
    };


    const overallSuccess = results.fixturesCheck.success && results.resultsCheck.success;


    logger.exitFunction('runMonthlySchedulingCheck', { 
      success: overallSuccess,
      fixturesTriggered: !results.fixturesCheck.skipped,
      resultsTriggered: !results.resultsCheck.skipped
    });


    return {
      success: overallSuccess,
      results: results
    };


  } catch (error) {
    logger.error('Monthly scheduling check failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


// Export global functions
globalThis.postMonthlyFixturesSummary = postMonthlyFixturesSummary;
globalThis.postMonthlyResultsSummary = postMonthlyResultsSummary;
globalThis.runMonthlySchedulingCheck = runMonthlySchedulingCheck;
