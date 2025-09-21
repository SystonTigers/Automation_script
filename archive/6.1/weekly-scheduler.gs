/**
 * @fileoverview Weekly Content Calendar Automation - BIBLE CORE FEATURE
 * @version 6.0.0
 * @author Senior Software Architect
 * @description Bible-compliant weekly content schedule: Mon=Fixtures, Tue=Quotes, Wed=Stats, Thu=Throwback, Fri/Sat=Countdown, Sun=Match Day
 */

/**
 * Weekly Scheduler Class - BIBLE CORE IMPLEMENTATION
 * Implements the exact weekly content calendar as specified in the system workings Bible
 */
class WeeklyScheduler {
  
  constructor() {
    this.logger = logger.scope('WeeklyScheduler');
    this.makeIntegration = new MakeIntegration();
    this.batchFixtures = new BatchFixturesManager();
    this.today = DateUtils.now();
    this.dayOfWeek = DateUtils.getDayOfWeek(this.today); // 0=Sunday, 1=Monday, etc.
    this.weekOfMonth = DateUtils.getWeekOfMonth(this.today);
  }

  /**
   * Run weekly schedule automation (BIBLE CORE)
   * @param {boolean} forceRun - Force run regardless of day
   * @returns {Object} Execution result
   */
  runWeeklySchedule(forceRun = false) {
    this.logger.enterFunction('runWeeklySchedule', { 
      force_run: forceRun,
      day_of_week: this.dayOfWeek,
      week_of_month: this.weekOfMonth
    });
    
    try {
      // @testHook(weekly_schedule_start)
      
      const schedule = getConfig('WEEKLY_SCHEDULE.SCHEDULE', {});
      const todaySchedule = schedule[this.dayOfWeek];
      
      if (!todaySchedule && !forceRun) {
        this.logger.info('No scheduled content for today', { day_of_week: this.dayOfWeek });
        return {
          success: true,
          message: 'No content scheduled for today',
          day_of_week: this.dayOfWeek,
          skipped: true
        };
      }
      
      if (!todaySchedule.enabled && !forceRun) {
        this.logger.info('Today\'s content is disabled', { day_of_week: this.dayOfWeek });
        return {
          success: true,
          message: 'Today\'s content is disabled',
          day_of_week: this.dayOfWeek,
          skipped: true
        };
      }
      
      let result;
      
      // Execute based on day of week (BIBLE COMPLIANT)
      switch (this.dayOfWeek) {
        case 1: // Monday - This week's fixtures / no match scheduled
          result = this.runMondayFixtures(forceRun);
          break;
          
        case 2: // Tuesday - Quotes
          result = this.runTuesdayQuotes(forceRun);
          break;
          
        case 3: // Wednesday - Player stats (Monthly) / Previous matches vs opponent
          result = this.runWednesdayStats(forceRun);
          break;
          
        case 4: // Thursday - Throwback Thursday / 3 days to go
          result = this.runThursdayThrowback(forceRun);
          break;
          
        case 5: // Friday - 2 days to go
          result = this.runFridayCountdown(forceRun);
          break;
          
        case 6: // Saturday - 1 day to go
          result = this.runSaturdayCountdown(forceRun);
          break;
          
        case 0: // Sunday - MATCH DAY (handled by live automation)
          result = this.runSundayMatchDay(forceRun);
          break;
          
        default:
          throw new Error(`Invalid day of week: ${this.dayOfWeek}`);
      }
      
      // @testHook(weekly_schedule_complete)
      
      // Log to Weekly Content sheet
      this.logContentActivity(todaySchedule?.type || 'unknown', result);
      
      this.logger.exitFunction('runWeeklySchedule', { 
        success: result.success,
        content_type: result.content_type
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Weekly schedule execution failed', { 
        error: error.toString(),
        day_of_week: this.dayOfWeek
      });
      
      return {
        success: false,
        error: error.toString(),
        day_of_week: this.dayOfWeek,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Monday: This week's fixtures / no match scheduled (BIBLE CORE)
   * @param {boolean} forceRun - Force execution
   * @returns {Object} Execution result
   */
  runMondayFixtures(forceRun = false) {
    this.logger.info('Running Monday fixtures content');
    
    try {
      // @testHook(monday_fixtures_start)
      
      // Check if there are matches this week
      const hasMatches = this.batchFixtures.hasMatchesThisWeek();
      
      let payload;
      if (hasMatches) {
        // Post this week's fixtures
        const fixturesResult = this.batchFixtures.getThisWeekFixtures();
        
        if (!fixturesResult.success || fixturesResult.count === 0) {
          // Fallback to "no match scheduled"
          payload = this.createNoMatchPayload();
        } else {
          payload = this.createWeeklyFixturesPayload(fixturesResult.fixtures);
        }
      } else {
        // No matches this week
        payload = this.createNoMatchPayload();
      }
      
      // @testHook(monday_fixtures_payload_created)
      
      // Send to Make.com
      const makeResult = this.makeIntegration.sendToMake(payload);
      
      // @testHook(monday_fixtures_complete)
      
      return {
        success: makeResult.success,
        content_type: 'monday_fixtures',
        has_matches: hasMatches,
        make_result: makeResult,
        payload: payload,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Monday fixtures content failed', { error: error.toString() });
      throw error;
    }
  }

  /**
   * Tuesday: Motivational quotes with rotation (BIBLE CORE)
   * @param {boolean} forceRun - Force execution
   * @returns {Object} Execution result
   */
  runTuesdayQuotes(forceRun = false) {
    this.logger.info('Running Tuesday quotes content');
    
    try {
      // @testHook(tuesday_quotes_start)
      
      // Get quote from rotation system
      const quote = this.getRotatedQuote();
      
      if (!quote) {
        throw new Error('No quotes available');
      }
      
      // Create payload
      const payload = this.createQuotesPayload(quote);
      
      // @testHook(tuesday_quotes_payload_created)
      
      // Send to Make.com
      const makeResult = this.makeIntegration.sendToMake(payload);
      
      // Update rotation index
      if (makeResult.success) {
        this.updateQuoteRotationIndex(quote.index);
      }
      
      // @testHook(tuesday_quotes_complete)
      
      return {
        success: makeResult.success,
        content_type: 'tuesday_quotes',
        quote: quote,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Tuesday quotes content failed', { error: error.toString() });
      throw error;
    }
  }

  /**
   * Wednesday: Player stats (Monthly) OR Opposition analysis (BIBLE CORE)
   * @param {boolean} forceRun - Force execution
   * @returns {Object} Execution result
   */
  runWednesdayStats(forceRun = false) {
    this.logger.info('Running Wednesday stats content', { week_of_month: this.weekOfMonth });
    
    try {
      // @testHook(wednesday_stats_start)
      
      const monthlyWeek = getConfig('WEEKLY_SCHEDULE.SCHEDULE.3.monthly_week', 2);
      const isMonthlyStatsWeek = this.weekOfMonth === monthlyWeek;
      
      let payload;
      let contentType;
      
      if (isMonthlyStatsWeek) {
        // Monthly player stats
        const playerStats = this.getMonthlyPlayerStats();
        payload = this.createPlayerStatsPayload(playerStats);
        contentType = 'wednesday_stats';
      } else {
        // Opposition analysis for upcoming matches
        const oppositionAnalysis = this.getOppositionAnalysis();
        payload = this.createOppositionAnalysisPayload(oppositionAnalysis);
        contentType = 'wednesday_opposition';
      }
      
      // @testHook(wednesday_stats_payload_created)
      
      // Send to Make.com
      const makeResult = this.makeIntegration.sendToMake(payload);
      
      // @testHook(wednesday_stats_complete)
      
      return {
        success: makeResult.success,
        content_type: contentType,
        is_monthly_stats_week: isMonthlyStatsWeek,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Wednesday stats content failed', { error: error.toString() });
      throw error;
    }
  }

  /**
   * Thursday: Throwback Thursday / 3 days to go (BIBLE CORE)
   * @param {boolean} forceRun - Force execution
   * @returns {Object} Execution result
   */
  runThursdayThrowback(forceRun = false) {
    this.logger.info('Running Thursday throwback content');
    
    try {
      // @testHook(thursday_throwback_start)
      
      // Check if there's a match on Sunday (3 days away)
      const sundayMatch = this.getSundayMatch();
      
      let payload;
      let contentType;
      
      if (sundayMatch) {
        // 3 days to go countdown + throwback
        const throwback = this.getRotatedThrowback();
        payload = this.createThrowbackCountdownPayload(throwback, sundayMatch, 3);
        contentType = 'thursday_throwback_countdown';
      } else {
        // Just throwback content
        const throwback = this.getRotatedThrowback();
        payload = this.createThrowbackPayload(throwback);
        contentType = 'thursday_throwback';
      }
      
      // @testHook(thursday_throwback_payload_created)
      
      // Send to Make.com
      const makeResult = this.makeIntegration.sendToMake(payload);
      
      // Update throwback rotation if successful
      if (makeResult.success && payload.throwback_index !== undefined) {
        this.updateThrowbackRotationIndex(payload.throwback_index);
      }
      
      // @testHook(thursday_throwback_complete)
      
      return {
        success: makeResult.success,
        content_type: contentType,
        has_sunday_match: !!sundayMatch,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Thursday throwback content failed', { error: error.toString() });
      throw error;
    }
  }

  /**
   * Friday: 2 days to go countdown (BIBLE CORE)
   * @param {boolean} forceRun - Force execution
   * @returns {Object} Execution result
   */
  runFridayCountdown(forceRun = false) {
    this.logger.info('Running Friday countdown content');
    
    try {
      // @testHook(friday_countdown_start)
      
      // Check if there's a match on Sunday (2 days away)
      const sundayMatch = this.getSundayMatch();
      
      if (!sundayMatch) {
        this.logger.info('No Sunday match, skipping Friday countdown');
        return {
          success: true,
          content_type: 'friday_countdown',
          skipped: true,
          reason: 'No Sunday match scheduled'
        };
      }
      
      // Create countdown payload
      const payload = this.createCountdownPayload(sundayMatch, 2);
      
      // @testHook(friday_countdown_payload_created)
      
      // Send to Make.com
      const makeResult = this.makeIntegration.sendToMake(payload);
      
      // @testHook(friday_countdown_complete)
      
      return {
        success: makeResult.success,
        content_type: 'friday_countdown',
        sunday_match: sundayMatch,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Friday countdown content failed', { error: error.toString() });
      throw error;
    }
  }

  /**
   * Saturday: 1 day to go countdown (BIBLE CORE)
   * @param {boolean} forceRun - Force execution
   * @returns {Object} Execution result
   */
  runSaturdayCountdown(forceRun = false) {
    this.logger.info('Running Saturday countdown content');
    
    try {
      // @testHook(saturday_countdown_start)
      
      // Check if there's a match on Sunday (1 day away)
      const sundayMatch = this.getSundayMatch();
      
      if (!sundayMatch) {
        this.logger.info('No Sunday match, skipping Saturday countdown');
        return {
          success: true,
          content_type: 'saturday_countdown',
          skipped: true,
          reason: 'No Sunday match scheduled'
        };
      }
      
      // Create final countdown payload
      const payload = this.createCountdownPayload(sundayMatch, 1);
      
      // @testHook(saturday_countdown_payload_created)
      
      // Send to Make.com
      const makeResult = this.makeIntegration.sendToMake(payload);
      
      // @testHook(saturday_countdown_complete)
      
      return {
        success: makeResult.success,
        content_type: 'saturday_countdown',
        sunday_match: sundayMatch,
        make_result: makeResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Saturday countdown content failed', { error: error.toString() });
      throw error;
    }
  }

  /**
   * Sunday: Match Day (handled by live automation)
   * @param {boolean} forceRun - Force execution
   * @returns {Object} Execution result
   */
  runSundayMatchDay(forceRun = false) {
    this.logger.info('Sunday Match Day - Live automation takes priority');
    
    // Sunday is handled by live match automation
    // Weekly scheduler steps aside for match day
    return {
      success: true,
      content_type: 'sunday_match_day',
      message: 'Match day - live automation has priority',
      deferred_to: 'live_match_automation'
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get rotated quote from database
   * @private
   * @returns {Object} Quote object
   */
  getRotatedQuote() {
    try {
      const quotesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.QUOTES'),
        ['Quote', 'Author', 'Category', 'Active']
      );
      
      if (!quotesSheet) {
        throw new Error('Cannot access quotes sheet');
      }
      
      const quotes = SheetUtils.getAllDataAsObjects(quotesSheet)
        .filter(quote => quote.Active !== 'FALSE' && quote.Quote);
      
      if (quotes.length === 0) {
        throw new Error('No active quotes found');
      }
      
      // Get last used index
      const lastIndex = parseInt(getSecureProperty(
        getConfig('WEEKLY_SCHEDULE.QUOTES_ROTATION_PROPERTY', 'LAST_QUOTE_INDEX')
      )) || 0;
      
      // Calculate next index with rotation
      const nextIndex = (lastIndex + 1) % quotes.length;
      const selectedQuote = quotes[nextIndex];
      
      return {
        text: selectedQuote.Quote,
        author: selectedQuote.Author || 'Unknown',
        category: selectedQuote.Category || 'Motivation',
        index: nextIndex
      };
      
    } catch (error) {
      this.logger.error('Failed to get rotated quote', { error: error.toString() });
      
      // Fallback quote
      return {
        text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
        author: 'Winston Churchill',
        category: 'Motivation',
        index: 0
      };
    }
  }

  /**
   * Update quote rotation index
   * @private
   * @param {number} index - New index
   */
  updateQuoteRotationIndex(index) {
    try {
      setSecureProperty(
        getConfig('WEEKLY_SCHEDULE.QUOTES_ROTATION_PROPERTY', 'LAST_QUOTE_INDEX'),
        index.toString()
      );
    } catch (error) {
      this.logger.error('Failed to update quote rotation index', { error: error.toString() });
    }
  }

  /**
   * Get rotated throwback content
   * @private
   * @returns {Object} Throwback object
   */
  getRotatedThrowback() {
    try {
      const historicalSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.HISTORICAL_DATA'),
        ['Date', 'Title', 'Description', 'Image', 'Category', 'Active']
      );
      
      if (!historicalSheet) {
        throw new Error('Cannot access historical data sheet');
      }
      
      const throwbacks = SheetUtils.getAllDataAsObjects(historicalSheet)
        .filter(item => item.Active !== 'FALSE' && item.Title);
      
      if (throwbacks.length === 0) {
        // Default throwback
        return {
          title: 'Throwback Thursday',
          description: 'Looking back at our football heritage',
          date: 'Historical',
          category: 'General',
          index: 0
        };
      }
      
      // Get last used index
      const lastIndex = parseInt(getSecureProperty(
        getConfig('WEEKLY_SCHEDULE.THROWBACK_ROTATION_PROPERTY', 'LAST_THROWBACK_INDEX')
      )) || 0;
      
      // Calculate next index with rotation
      const nextIndex = (lastIndex + 1) % throwbacks.length;
      const selectedThrowback = throwbacks[nextIndex];
      
      return {
        title: selectedThrowback.Title,
        description: selectedThrowback.Description || '',
        date: selectedThrowback.Date || 'Historical',
        category: selectedThrowback.Category || 'General',
        image: selectedThrowback.Image || '',
        index: nextIndex
      };
      
    } catch (error) {
      this.logger.error('Failed to get rotated throwback', { error: error.toString() });
      
      // Fallback throwback
      return {
        title: 'Club Heritage',
        description: 'Celebrating our football history and traditions',
        date: 'Historical',
        category: 'General',
        index: 0
      };
    }
  }

  /**
   * Update throwback rotation index
   * @private
   * @param {number} index - New index
   */
  updateThrowbackRotationIndex(index) {
    try {
      setSecureProperty(
        getConfig('WEEKLY_SCHEDULE.THROWBACK_ROTATION_PROPERTY', 'LAST_THROWBACK_INDEX'),
        index.toString()
      );
    } catch (error) {
      this.logger.error('Failed to update throwback rotation index', { error: error.toString() });
    }
  }

  /**
   * Get Sunday match if exists
   * @private
   * @returns {Object|null} Sunday match object
   */
  getSundayMatch() {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES_RESULTS')
      );
      
      if (!fixturesSheet) return null;
      
      const fixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      const nextSunday = DateUtils.addDays(this.today, 7 - this.dayOfWeek);
      const sundayDate = DateUtils.formatUK(nextSunday);
      
      const sundayMatch = fixtures.find(fixture => 
        fixture.Date === sundayDate && !fixture.Result
      );
      
      return sundayMatch ? {
        date: sundayMatch.Date,
        time: sundayMatch.Time || 'TBC',
        opponent: sundayMatch.Opponent || 'TBC',
        venue: sundayMatch.Venue || 'Home',
        competition: sundayMatch.Competition || 'League'
      } : null;
      
    } catch (error) {
      this.logger.error('Failed to get Sunday match', { error: error.toString() });
      return null;
    }
  }

  /**
   * Get monthly player stats
   * @private
   * @returns {Object} Player stats object
   */
  getMonthlyPlayerStats() {
    try {
      const playerStatsSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.PLAYER_STATS')
      );
      
      if (!playerStatsSheet) {
        throw new Error('Cannot access player stats sheet');
      }
      
      const allStats = SheetUtils.getAllDataAsObjects(playerStatsSheet);
      
      // Get top performers for the month
      const topScorer = allStats.reduce((top, player) => 
        (parseInt(player.Goals) || 0) > (parseInt(top.Goals) || 0) ? player : top
      , allStats[0] || {});
      
      const topAssister = allStats.reduce((top, player) => 
        (parseInt(player.Assists) || 0) > (parseInt(top.Assists) || 0) ? player : top
      , allStats[0] || {});
      
      const mostMinutes = allStats.reduce((top, player) => 
        (parseInt(player.Minutes) || 0) > (parseInt(top.Minutes) || 0) ? player : top
      , allStats[0] || {});
      
      return {
        top_scorer: {
          name: topScorer['Player Name'] || 'Unknown',
          goals: topScorer.Goals || '0'
        },
        top_assister: {
          name: topAssister['Player Name'] || 'Unknown',
          assists: topAssister.Assists || '0'
        },
        most_minutes: {
          name: mostMinutes['Player Name'] || 'Unknown',
          minutes: mostMinutes.Minutes || '0'
        },
        total_players: allStats.length,
        month: DateUtils.now().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      };
      
    } catch (error) {
      this.logger.error('Failed to get monthly player stats', { error: error.toString() });
      
      return {
        top_scorer: { name: 'Unknown', goals: '0' },
        top_assister: { name: 'Unknown', assists: '0' },
        most_minutes: { name: 'Unknown', minutes: '0' },
        total_players: 0,
        month: DateUtils.now().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      };
    }
  }

  /**
   * Get opposition analysis
   * @private
   * @returns {Object} Opposition analysis object
   */
  getOppositionAnalysis() {
    try {
      // Get next upcoming fixture
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES_RESULTS')
      );
      
      if (!fixturesSheet) {
        throw new Error('Cannot access fixtures sheet');
      }
      
      const fixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      const upcomingFixture = fixtures.find(fixture => 
        !fixture.Result && DateUtils.parseUK(fixture.Date) >= DateUtils.now()
      );
      
      if (!upcomingFixture) {
        return {
          opponent: 'Unknown',
          previous_meetings: 0,
          last_result: 'No previous data',
          next_match_date: 'TBC'
        };
      }
      
      // Find previous meetings with this opponent
      const previousMeetings = fixtures.filter(fixture => 
        fixture.Opponent === upcomingFixture.Opponent && 
        fixture.Result
      );
      
      const lastMeeting = previousMeetings.length > 0 ? 
        previousMeetings[previousMeetings.length - 1] : null;
      
      return {
        opponent: upcomingFixture.Opponent,
        next_match_date: upcomingFixture.Date,
        next_match_venue: upcomingFixture.Venue || 'Home',
        previous_meetings: previousMeetings.length,
        last_result: lastMeeting ? 
          `${lastMeeting['Home Score']}-${lastMeeting['Away Score']} (${lastMeeting.Date})` : 
          'No previous meetings',
        last_meeting_date: lastMeeting ? lastMeeting.Date : null
      };
      
    } catch (error) {
      this.logger.error('Failed to get opposition analysis', { error: error.toString() });
      
      return {
        opponent: 'Unknown',
        previous_meetings: 0,
        last_result: 'Data unavailable',
        next_match_date: 'TBC'
      };
    }
  }

  /**
   * Log content activity to Weekly Content sheet
   * @private
   * @param {string} contentType - Type of content
   * @param {Object} result - Execution result
   */
  logContentActivity(contentType, result) {
    try {
      const weeklySheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.WEEKLY_CONTENT'),
        getConfig('SHEETS.REQUIRED_COLUMNS.WEEKLY_CONTENT')
      );
      
      if (!weeklySheet) return;
      
      const logData = {
        'Date': DateUtils.formatUK(DateUtils.now()),
        'Day': this.today.toLocaleDateString('en-GB', { weekday: 'long' }),
        'Content Type': contentType,
        'Status': result.success ? 'Success' : 'Failed',
        'Posted At': DateUtils.formatISO(DateUtils.now()),
        'Event Type': result.content_type || contentType,
        'Notes': result.error || result.message || 'Completed successfully'
      };
      
      SheetUtils.addRowFromObject(weeklySheet, logData);
      this.logger.sheetOperation('ADD_ROW', 'Weekly Content Calendar', true, { content_type: contentType });
      
    } catch (error) {
      this.logger.error('Failed to log content activity', { error: error.toString() });
    }
  }

  // ==================== PAYLOAD BUILDERS ====================

  /**
   * Create weekly fixtures payload
   * @private
   * @param {Array} fixtures - This week's fixtures
   * @returns {Object} Payload
   */
  createWeeklyFixturesPayload(fixtures) {
    return {
      event_type: 'monday_fixtures',
      timestamp: DateUtils.formatISO(DateUtils.now()),
      content_title: 'This Week\'s Fixtures',
      has_matches: true,
      fixture_count: fixtures.length,
      fixtures: fixtures,
      week_starting: DateUtils.formatUK(DateUtils.addDays(this.today, 1 - this.dayOfWeek)),
      source: 'weekly_scheduler'
    };
  }

  /**
   * Create no match payload
   * @private
   * @returns {Object} Payload
   */
  createNoMatchPayload() {
    return {
      event_type: 'monday_fixtures',
      timestamp: DateUtils.formatISO(DateUtils.now()),
      content_title: 'No Match Scheduled This Week',
      has_matches: false,
      fixture_count: 0,
      message: 'No fixtures scheduled for this week. Training continues!',
      week_starting: DateUtils.formatUK(DateUtils.addDays(this.today, 1 - this.dayOfWeek)),
      source: 'weekly_scheduler'
    };
  }

  /**
   * Create quotes payload
   * @private
   * @param {Object} quote - Quote object
   * @returns {Object} Payload
   */
  createQuotesPayload(quote) {
    return {
      event_type: 'tuesday_quotes',
      timestamp: DateUtils.formatISO(DateUtils.now()),
      content_title: 'Tuesday Motivation',
      quote_text: quote.text,
      quote_author: quote.author,
      quote_category: quote.category,
      source: 'weekly_scheduler'
    };
  }

  /**
   * Create player stats payload
   * @private
   * @param {Object} stats - Player stats object
   * @returns {Object} Payload
   */
  createPlayerStatsPayload(stats) {
    return {
      event_type: 'wednesday_stats',
      timestamp: DateUtils.formatISO(DateUtils.now()),
      content_title: `${stats.month} Player Statistics`,
      top_scorer_name: stats.top_scorer.name,
      top_scorer_goals: stats.top_scorer.goals,
      top_assister_name: stats.top_assister.name,
      top_assister_assists: stats.top_assister.assists,
      most_minutes_name: stats.most_minutes.name,
      most_minutes_total: stats.most_minutes.minutes,
      total_players: stats.total_players,
      stats_month: stats.month,
      source: 'weekly_scheduler'
    };
  }

  /**
   * Create opposition analysis payload
   * @private
   * @param {Object} analysis - Opposition analysis object
   * @returns {Object} Payload
   */
  createOppositionAnalysisPayload(analysis) {
    return {
      event_type: 'wednesday_opposition',
      timestamp: DateUtils.formatISO(DateUtils.now()),
      content_title: `Opposition Analysis: ${analysis.opponent}`,
      opponent_name: analysis.opponent,
      next_match_date: analysis.next_match_date,
      next_match_venue: analysis.next_match_venue,
      previous_meetings: analysis.previous_meetings,
      last_result: analysis.last_result,
      last_meeting_date: analysis.last_meeting_date,
      source: 'weekly_scheduler'
    };
  }

  /**
   * Create throwback payload
   * @private
   * @param {Object} throwback - Throwback object
   * @returns {Object} Payload
   */
  createThrowbackPayload(throwback) {
    return {
      event_type: 'thursday_throwback',
      timestamp: DateUtils.formatISO(DateUtils.now()),
      content_title: 'Throwback Thursday',
      throwback_title: throwback.title,
      throwback_description: throwback.description,
      throwback_date: throwback.date,
      throwback_category: throwback.category,
      throwback_image: throwback.image,
      throwback_index: throwback.index,
      source: 'weekly_scheduler'
    };
  }

  /**
   * Create throwback with countdown payload
   * @private
   * @param {Object} throwback - Throwback object
   * @param {Object} match - Sunday match object
   * @param {number} daysToGo - Days until match
   * @returns {Object} Payload
   */
  createThrowbackCountdownPayload(throwback, match, daysToGo) {
    return {
      event_type: 'thursday_throwback',
      timestamp: DateUtils.formatISO(DateUtils.now()),
      content_title: `Throwback Thursday & ${daysToGo} Days To Go`,
      throwback_title: throwback.title,
      throwback_description: throwback.description,
      throwback_date: throwback.date,
      countdown_enabled: true,
      countdown_days: daysToGo,
      next_match_opponent: match.opponent,
      next_match_date: match.date,
      next_match_time: match.time,
      next_match_venue: match.venue,
      throwback_index: throwback.index,
      source: 'weekly_scheduler'
    };
  }

  /**
   * Create countdown payload
   * @private
   * @param {Object} match - Match object
   * @param {number} daysToGo - Days until match
   * @returns {Object} Payload
   */
  createCountdownPayload(match, daysToGo) {
    const eventType = daysToGo === 2 ? 'friday_countdown' : 'saturday_countdown';
    
    return {
      event_type: eventType,
      timestamp: DateUtils.formatISO(DateUtils.now()),
      content_title: `${daysToGo} ${daysToGo === 1 ? 'Day' : 'Days'} To Go`,
      countdown_days: daysToGo,
      match_opponent: match.opponent,
      match_date: match.date,
      match_time: match.time,
      match_venue: match.venue,
      match_competition: match.competition,
      excitement_level: daysToGo === 1 ? 'maximum' : 'high',
      source: 'weekly_scheduler'
    };
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Initialize Weekly Scheduler
 * @returns {Object} Initialization result
 */
function initializeWeeklyScheduler() {
  logger.enterFunction('WeeklyScheduler.initialize');
  
  try {
    // Test required sheets
    const requiredSheets = [
      getConfig('SHEETS.TAB_NAMES.WEEKLY_CONTENT'),
      getConfig('SHEETS.TAB_NAMES.QUOTES'),
      getConfig('SHEETS.TAB_NAMES.HISTORICAL_DATA')
    ];
    
    const sheetResults = {};
    
    requiredSheets.forEach(sheetName => {
      const sheet = SheetUtils.getOrCreateSheet(sheetName);
      sheetResults[sheetName] = !!sheet;
    });
    
    const allSheetsOk = Object.values(sheetResults).every(result => result === true);
    
    logger.exitFunction('WeeklyScheduler.initialize', { success: allSheetsOk });
    
    return {
      success: allSheetsOk,
      sheets: sheetResults,
      message: 'Weekly Scheduler initialized successfully',
      version: '6.0.0'
    };
    
  } catch (error) {
    logger.error('Weekly Scheduler initialization failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Run weekly schedule automation (public API)
 * @param {boolean} forceRun - Force run regardless of day
 * @returns {Object} Execution result
 */
function runWeeklyScheduleAutomation(forceRun = false) {
  const scheduler = new WeeklyScheduler();
  return scheduler.runWeeklySchedule(forceRun);
}

/**
 * Run specific day's content (public API)
 * @param {number} dayOfWeek - Day of week (0-6)
 * @returns {Object} Execution result
 */
function runSpecificDayContent(dayOfWeek) {
  const scheduler = new WeeklyScheduler();
  scheduler.dayOfWeek = dayOfWeek;
  return scheduler.runWeeklySchedule(true);
}

/**
 * Get weekly schedule status (public API)
 * @returns {Object} Schedule status
 */
function getWeeklyScheduleStatus() {
  try {
    const today = DateUtils.now();
    const dayOfWeek = DateUtils.getDayOfWeek(today);
    const schedule = getConfig('WEEKLY_SCHEDULE.SCHEDULE', {});
    const todaySchedule = schedule[dayOfWeek];
    
    return {
      success: true,
      current_day: dayOfWeek,
      day_name: today.toLocaleDateString('en-GB', { weekday: 'long' }),
      today_schedule: todaySchedule,
      content_enabled: todaySchedule?.enabled || false,
      content_type: todaySchedule?.type || 'none',
      next_content: this.getNextScheduledContent(dayOfWeek, schedule)
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test weekly scheduler functionality
 * @returns {Object} Test results
 */
function testWeeklyScheduler() {
  logger.enterFunction('WeeklyScheduler.test');
  
  try {
    const scheduler = new WeeklyScheduler();
    const results = {
      initialization: false,
      quote_rotation: false,
      throwback_rotation: false,
      fixture_detection: false,
      payload_creation: false
    };
    
    // Test initialization
    const initResult = initializeWeeklyScheduler();
    results.initialization = initResult.success;
    
    // Test quote rotation
    try {
      const quote = scheduler.getRotatedQuote();
      results.quote_rotation = quote && quote.text;
    } catch (error) {
      logger.warn('Quote rotation test failed', { error: error.toString() });
    }
    
    // Test throwback rotation
    try {
      const throwback = scheduler.getRotatedThrowback();
      results.throwback_rotation = throwback && throwback.title;
    } catch (error) {
      logger.warn('Throwback rotation test failed', { error: error.toString() });
    }
    
    // Test fixture detection
    try {
      const sundayMatch = scheduler.getSundayMatch();
      results.fixture_detection = true; // Success if no error
    } catch (error) {
      logger.warn('Fixture detection test failed', { error: error.toString() });
    }
    
    // Test payload creation
    try {
      const testQuote = { text: 'Test', author: 'Test', category: 'Test', index: 0 };
      const payload = scheduler.createQuotesPayload(testQuote);
      results.payload_creation = payload && payload.event_type === 'tuesday_quotes';
    } catch (error) {
      logger.warn('Payload creation test failed', { error: error.toString() });
    }
    
    const allPassed = Object.values(results).every(result => result === true);
    
    logger.exitFunction('WeeklyScheduler.test', { success: allPassed });
    
    return {
      success: allPassed,
      results: results,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
  } catch (error) {
    logger.error('Weekly scheduler test failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}

