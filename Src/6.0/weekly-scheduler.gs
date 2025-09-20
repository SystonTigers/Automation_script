/**
 * @fileoverview Weekly Content Scheduler - Bible Core Implementation
 * Implements the exact Monday-Sunday schedule specified in system workings
 * @version 6.0.0
 * @author Senior Software Architect
 */

/**
 * Weekly Content Scheduler Class
 * Manages automated content posting according to Bible schedule
 */
class WeeklyScheduler {
  constructor() {
    this.componentName = 'WeeklyScheduler';
    this.currentDate = new Date();
    this.dayOfWeek = this.currentDate.getDay(); // 0=Sunday, 1=Monday, etc.
  }

  /**
   * Main weekly schedule runner - called by time trigger
   * Implements Bible schedule: Monday-Sunday content calendar
   */
  runWeeklySchedule() {
    logger.enterFunction(`${this.componentName}.runWeeklySchedule`, { 
      dayOfWeek: this.dayOfWeek,
      currentDate: this.currentDate.toISOString() 
    });

    try {
      // Check if control panel allows weekly scheduling
      if (!this.isFeatureEnabled('WEEKLY_SCHEDULE')) {
        logger.info('Weekly schedule disabled via control panel');
        return { success: true, skipped: true, reason: 'Feature disabled' };
      }

      // @testHook(weekly_schedule_start)
      
      // Check for match day override (Sunday takes priority)
      const isMatchDay = this.isMatchDay();
      if (isMatchDay && this.dayOfWeek === 0) { // Sunday
        logger.info('Match day detected - Sunday content handled by match automation');
        return { success: true, skipped: true, reason: 'Match day priority' };
      }

      let result;
      
      // Bible schedule implementation
      switch (this.dayOfWeek) {
        case 1: // Monday
          result = this.postMondayFixtures();
          break;
        case 2: // Tuesday  
          result = this.postTuesdayQuotes();
          break;
        case 3: // Wednesday
          result = this.postWednesdayStats();
          break;
        case 4: // Thursday
          result = this.postThursdayThrowback();
          break;
        case 5: // Friday
          result = this.postFridayCountdown();
          break;
        case 6: // Saturday
          result = this.postSaturdayCountdown();
          break;
        case 0: // Sunday - handled by match automation
        default:
          logger.info('Sunday or invalid day - no scheduled content');
          result = { success: true, skipped: true, reason: 'No scheduled content' };
      }

      // @testHook(weekly_schedule_end)

      logger.exitFunction(`${this.componentName}.runWeeklySchedule`, { 
        success: true, 
        result: result 
      });
      return result;

    } catch (error) {
      logger.error('Weekly schedule execution failed', { 
        error: error.toString(),
        dayOfWeek: this.dayOfWeek 
      });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Monday: This week's fixtures / no match scheduled this week
   * Bible requirement: Show upcoming fixtures or "no match" message
   */
  postMondayFixtures() {
    logger.enterFunction(`${this.componentName}.postMondayFixtures`);

    try {
      // @testHook(monday_fixtures_start)
      
      const weeklyFixtures = this.getThisWeeksFixtures();
      const hasFixtures = weeklyFixtures.length > 0;

      const payload = {
        timestamp: new Date().toISOString(),
        event_type: 'weekly_fixtures',
        source: 'weekly_scheduler',
        version: getConfig('SYSTEM.VERSION'),
        club_name: getConfig('SYSTEM.CLUB_NAME'),
        
        // Content data
        has_fixtures: hasFixtures,
        fixture_count: weeklyFixtures.length,
        fixtures_list: weeklyFixtures,
        week_start_date: this.getWeekStartDate(),
        week_description: this.getWeekDescription(),
        message_type: hasFixtures ? 'fixtures_available' : 'no_matches_scheduled'
      };

      // @testHook(monday_payload_created)
      
      const webhookResult = this.sendToMakeWebhook(payload);
      
      // @testHook(monday_webhook_sent)

      logger.exitFunction(`${this.componentName}.postMondayFixtures`, { 
        success: true,
        fixtureCount: weeklyFixtures.length,
        hasFixtures: hasFixtures
      });

      return { 
        success: true, 
        posted: true,
        contentType: 'monday_fixtures',
        fixtureCount: weeklyFixtures.length,
        webhookResult: webhookResult
      };

    } catch (error) {
      logger.error('Monday fixtures posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Tuesday: Quotes
   * Bible requirement: Motivational quotes for fan engagement
   */
  postTuesdayQuotes() {
    logger.enterFunction(`${this.componentName}.postTuesdayQuotes`);

    try {
      // @testHook(tuesday_quotes_start)
      
      const selectedQuote = this.getRotatedQuote();
      
      const payload = {
        timestamp: new Date().toISOString(),
        event_type: 'weekly_quotes',
        source: 'weekly_scheduler',
        version: getConfig('SYSTEM.VERSION'),
        club_name: getConfig('SYSTEM.CLUB_NAME'),
        
        // Quote data
        quote_text: selectedQuote.text,
        quote_author: selectedQuote.author,
        quote_category: selectedQuote.category,
        date: new Date().toLocaleDateString('en-GB'),
        motivational_theme: selectedQuote.theme
      };

      // @testHook(tuesday_payload_created)
      
      const webhookResult = this.sendToMakeWebhook(payload);
      
      // @testHook(tuesday_webhook_sent)

      logger.exitFunction(`${this.componentName}.postTuesdayQuotes`, { 
        success: true,
        quoteAuthor: selectedQuote.author
      });

      return { 
        success: true, 
        posted: true,
        contentType: 'tuesday_quotes',
        quote: selectedQuote,
        webhookResult: webhookResult
      };

    } catch (error) {
      logger.error('Tuesday quotes posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Wednesday: Player stats (Monthly) / Previous matches against this week's team
   * Bible requirement: Monthly stats OR opposition analysis depending on timing
   */
  postWednesdayStats() {
    logger.enterFunction(`${this.componentName}.postWednesdayStats`);

    try {
      // @testHook(wednesday_stats_start)
      
      const isMonthlyStatsWeek = this.isMonthlyStatsWeek();
      const upcomingOpponent = this.getUpcomingOpponent();
      
      let payload;
      
      if (isMonthlyStatsWeek) {
        // Monthly player statistics
        const playerStats = this.getMonthlyPlayerStats();
        
        payload = {
          timestamp: new Date().toISOString(),
          event_type: 'weekly_player_stats',
          source: 'weekly_scheduler',
          version: getConfig('SYSTEM.VERSION'),
          club_name: getConfig('SYSTEM.CLUB_NAME'),
          
          // Stats data
          stats_type: 'monthly_summary',
          stats_period: this.getCurrentMonth(),
          top_scorer: playerStats.topScorer,
          most_assists: playerStats.mostAssists,
          most_minutes: playerStats.mostMinutes,
          clean_sheets: playerStats.cleanSheets,
          discipline_summary: playerStats.discipline,
          appearance_leaders: playerStats.appearances
        };
        
      } else if (upcomingOpponent) {
        // Opposition analysis
        const oppositionHistory = this.getOppositionHistory(upcomingOpponent);
        
        payload = {
          timestamp: new Date().toISOString(),
          event_type: 'weekly_opposition_analysis',
          source: 'weekly_scheduler',
          version: getConfig('SYSTEM.VERSION'),
          club_name: getConfig('SYSTEM.CLUB_NAME'),
          
          // Opposition data
          stats_type: 'opposition_analysis',
          opponent_name: upcomingOpponent,
          previous_meetings: oppositionHistory.meetings,
          head_to_head_record: oppositionHistory.record,
          last_meeting_result: oppositionHistory.lastResult,
          key_players: oppositionHistory.keyPlayers,
          tactical_notes: oppositionHistory.tactics
        };
        
      } else {
        // Default to general club stats
        payload = {
          timestamp: new Date().toISOString(),
          event_type: 'weekly_general_stats',
          source: 'weekly_scheduler',
          version: getConfig('SYSTEM.VERSION'),
          club_name: getConfig('SYSTEM.CLUB_NAME'),
          
          stats_type: 'general_update',
          message: 'Club update and general statistics'
        };
      }

      // @testHook(wednesday_payload_created)
      
      const webhookResult = this.sendToMakeWebhook(payload);
      
      // @testHook(wednesday_webhook_sent)

      logger.exitFunction(`${this.componentName}.postWednesdayStats`, { 
        success: true,
        statsType: payload.stats_type
      });

      return { 
        success: true, 
        posted: true,
        contentType: 'wednesday_stats',
        statsType: payload.stats_type,
        webhookResult: webhookResult
      };

    } catch (error) {
      logger.error('Wednesday stats posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Thursday: Throwback Thursday / 3 days to go
   * Bible requirement: Historical content + countdown if match in 3 days
   */
  postThursdayThrowback() {
    logger.enterFunction(`${this.componentName}.postThursdayThrowback`);

    try {
      // @testHook(thursday_throwback_start)
      
      const throwbackContent = this.getThrowbackContent();
      const upcomingMatch = this.getMatchInDays(3); // Sunday match
      const hasCountdown = upcomingMatch !== null;
      
      const payload = {
        timestamp: new Date().toISOString(),
        event_type: 'weekly_throwback',
        source: 'weekly_scheduler',
        version: getConfig('SYSTEM.VERSION'),
        club_name: getConfig('SYSTEM.CLUB_NAME'),
        
        // Throwback content
        throwback_content: throwbackContent.content,
        historical_date: throwbackContent.date,
        throwback_category: throwbackContent.category,
        historical_significance: throwbackContent.significance,
        
        // Countdown element (if applicable)
        has_countdown: hasCountdown,
        countdown_days: hasCountdown ? 3 : null,
        upcoming_match: upcomingMatch,
        match_excitement: hasCountdown ? 'building' : null
      };

      // @testHook(thursday_payload_created)
      
      const webhookResult = this.sendToMakeWebhook(payload);
      
      // @testHook(thursday_webhook_sent)

      logger.exitFunction(`${this.componentName}.postThursdayThrowback`, { 
        success: true,
        hasCountdown: hasCountdown,
        throwbackCategory: throwbackContent.category
      });

      return { 
        success: true, 
        posted: true,
        contentType: 'thursday_throwback',
        hasCountdown: hasCountdown,
        throwback: throwbackContent,
        webhookResult: webhookResult
      };

    } catch (error) {
      logger.error('Thursday throwback posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Friday: 2 days to go
   * Bible requirement: Countdown to Sunday match (if applicable)
   */
  postFridayCountdown() {
    logger.enterFunction(`${this.componentName}.postFridayCountdown`);

    try {
      // @testHook(friday_countdown_start)
      
      const upcomingMatch = this.getMatchInDays(2); // Sunday match
      
      if (!upcomingMatch) {
        logger.info('No match in 2 days - skipping Friday countdown');
        return { success: true, skipped: true, reason: 'No upcoming match' };
      }
      
      const payload = {
        timestamp: new Date().toISOString(),
        event_type: 'countdown_2_days',
        source: 'weekly_scheduler',
        version: getConfig('SYSTEM.VERSION'),
        club_name: getConfig('SYSTEM.CLUB_NAME'),
        
        // Countdown data
        days_remaining: 2,
        match_date: upcomingMatch.date,
        match_time: upcomingMatch.time,
        opponent: upcomingMatch.opponent,
        venue: upcomingMatch.venue,
        competition: upcomingMatch.competition,
        match_importance: upcomingMatch.importance,
        team_form: this.getRecentForm(),
        excitement_level: 'high'
      };

      // @testHook(friday_payload_created)
      
      const webhookResult = this.sendToMakeWebhook(payload);
      
      // @testHook(friday_webhook_sent)

      logger.exitFunction(`${this.componentName}.postFridayCountdown`, { 
        success: true,
        opponent: upcomingMatch.opponent
      });

      return { 
        success: true, 
        posted: true,
        contentType: 'friday_countdown',
        match: upcomingMatch,
        webhookResult: webhookResult
      };

    } catch (error) {
      logger.error('Friday countdown posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Saturday: 1 day to go
   * Bible requirement: Final countdown to Sunday match (if applicable)
   */
  postSaturdayCountdown() {
    logger.enterFunction(`${this.componentName}.postSaturdayCountdown`);

    try {
      // @testHook(saturday_countdown_start)
      
      const upcomingMatch = this.getMatchInDays(1); // Sunday match
      
      if (!upcomingMatch) {
        logger.info('No match in 1 day - skipping Saturday countdown');
        return { success: true, skipped: true, reason: 'No upcoming match' };
      }
      
      const payload = {
        timestamp: new Date().toISOString(),
        event_type: 'countdown_1_day',
        source: 'weekly_scheduler',
        version: getConfig('SYSTEM.VERSION'),
        club_name: getConfig('SYSTEM.CLUB_NAME'),
        
        // Final countdown data
        days_remaining: 1,
        match_date: upcomingMatch.date,
        match_time: upcomingMatch.time,
        opponent: upcomingMatch.opponent,
        venue: upcomingMatch.venue,
        competition: upcomingMatch.competition,
        weather_forecast: this.getMatchDayWeather(),
        team_preparation: 'final_preparations',
        excitement_level: 'maximum',
        fan_call_to_action: 'Come and support the Tigers!'
      };

      // @testHook(saturday_payload_created)
      
      const webhookResult = this.sendToMakeWebhook(payload);
      
      // @testHook(saturday_webhook_sent)

      logger.exitFunction(`${this.componentName}.postSaturdayCountdown`, { 
        success: true,
        opponent: upcomingMatch.opponent
      });

      return { 
        success: true, 
        posted: true,
        contentType: 'saturday_countdown',
        match: upcomingMatch,
        webhookResult: webhookResult
      };

    } catch (error) {
      logger.error('Saturday countdown posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Check if feature is enabled in control panel
   */
  isFeatureEnabled(featureName) {
    try {
      const controlPanel = SheetUtils.getOrCreateSheet('Control Panel', [
        'Feature', 'Enabled', 'Description'
      ]);
      
      if (!controlPanel) {
        logger.warn('Control Panel sheet not available - defaulting to enabled');
        return true;
      }

      const data = controlPanel.getDataRange().getValues();
      const featureRow = data.find(row => row[0] === featureName);
      
      if (!featureRow) {
        // Feature not in control panel - default to enabled
        return true;
      }
      
      return featureRow[1] === true || featureRow[1] === 'TRUE' || featureRow[1] === 'Yes';
      
    } catch (error) {
      logger.error('Error checking feature enabled status', { 
        feature: featureName, 
        error: error.toString() 
      });
      return true; // Default to enabled on error
    }
  }

  /**
   * Check if today is a match day
   */
  isMatchDay() {
    try {
      const today = new Date().toDateString();
      const fixtures = this.getFixturesData();
      
      return fixtures.some(fixture => 
        new Date(fixture.date).toDateString() === today
      );
      
    } catch (error) {
      logger.error('Error checking match day status', { error: error.toString() });
      return false;
    }
  }

  /**
   * Get this week's fixtures (Monday to Sunday)
   */
  getThisWeeksFixtures() {
    try {
      const weekStart = this.getWeekStartDate();
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
      
      const fixtures = this.getFixturesData();
      
      return fixtures.filter(fixture => {
        const fixtureDate = new Date(fixture.date);
        return fixtureDate >= weekStart && fixtureDate <= weekEnd;
      }).map(fixture => ({
        date: fixture.date,
        time: fixture.time,
        opponent: fixture.opponent,
        venue: fixture.venue,
        competition: fixture.competition,
        importance: fixture.importance || 'normal'
      }));
      
    } catch (error) {
      logger.error('Error getting weekly fixtures', { error: error.toString() });
      return [];
    }
  }

  /**
   * Get fixtures data from sheet
   */
  getFixturesData() {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet('Fixtures', [
        'Date', 'Time', 'Opponent', 'Venue', 'Competition', 'Importance'
      ]);
      
      if (!fixturesSheet) {
        return [];
      }
      
      const data = fixturesSheet.getDataRange().getValues();
      const headers = data[0];
      
      return data.slice(1).map(row => {
        const fixture = {};
        headers.forEach((header, index) => {
          fixture[header.toLowerCase()] = row[index];
        });
        return fixture;
      }).filter(fixture => fixture.date && fixture.opponent);
      
    } catch (error) {
      logger.error('Error reading fixtures data', { error: error.toString() });
      return [];
    }
  }

  /**
   * Get rotated quote for Tuesday posting
   */
  getRotatedQuote() {
    try {
      const quotesSheet = SheetUtils.getOrCreateSheet('Quotes', [
        'Text', 'Author', 'Category', 'Theme', 'LastUsed'
      ]);
      
      if (!quotesSheet) {
        // Return default quote if sheet doesn't exist
        return {
          text: "Every match is a new opportunity to show what we're made of.",
          author: "Syston Tigers",
          category: "motivation",
          theme: "opportunity"
        };
      }
      
      const data = quotesSheet.getDataRange().getValues();
      const headers = data[0];
      const quotes = data.slice(1).map(row => {
        const quote = {};
        headers.forEach((header, index) => {
          quote[header.toLowerCase().replace(' ', '')] = row[index];
        });
        return quote;
      }).filter(quote => quote.text);
      
      if (quotes.length === 0) {
        return {
          text: "Every match is a new opportunity to show what we're made of.",
          author: "Syston Tigers",
          category: "motivation",
          theme: "opportunity"
        };
      }
      
      // Find least recently used quote
      const sortedQuotes = quotes.sort((a, b) => {
        const dateA = a.lastused ? new Date(a.lastused) : new Date(0);
        const dateB = b.lastused ? new Date(b.lastused) : new Date(0);
        return dateA - dateB;
      });
      
      const selectedQuote = sortedQuotes[0];
      
      // Update last used date
      const quoteIndex = data.findIndex(row => row[0] === selectedQuote.text);
      if (quoteIndex > 0) {
        quotesSheet.getRange(quoteIndex + 1, headers.indexOf('LastUsed') + 1)
          .setValue(new Date());
      }
      
      return {
        text: selectedQuote.text,
        author: selectedQuote.author || "Unknown",
        category: selectedQuote.category || "general",
        theme: selectedQuote.theme || "motivation"
      };
      
    } catch (error) {
      logger.error('Error getting rotated quote', { error: error.toString() });
      return {
        text: "Every match is a new opportunity to show what we're made of.",
        author: "Syston Tigers",
        category: "motivation",
        theme: "opportunity"
      };
    }
  }

  /**
   * Check if this is a monthly stats week (first Wednesday of month)
   */
  isMonthlyStatsWeek() {
    try {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Find first Wednesday of month
      let firstWednesday = new Date(firstDayOfMonth);
      while (firstWednesday.getDay() !== 3) { // 3 = Wednesday
        firstWednesday.setDate(firstWednesday.getDate() + 1);
      }
      
      // Check if today is within 7 days of first Wednesday
      const diffDays = Math.abs(today - firstWednesday) / (1000 * 60 * 60 * 24);
      return diffDays <= 3; // Allow some flexibility
      
    } catch (error) {
      logger.error('Error checking monthly stats week', { error: error.toString() });
      return false;
    }
  }

  /**
   * Get upcoming opponent for opposition analysis
   */
  getUpcomingOpponent() {
    try {
      const upcomingFixtures = this.getThisWeeksFixtures();
      if (upcomingFixtures.length > 0) {
        return upcomingFixtures[0].opponent;
      }
      
      // Look ahead to next week
      const nextWeekStart = new Date(this.getWeekStartDate());
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
      
      const fixtures = this.getFixturesData();
      const nextWeekFixtures = fixtures.filter(fixture => {
        const fixtureDate = new Date(fixture.date);
        return fixtureDate >= nextWeekStart && fixtureDate <= nextWeekEnd;
      });
      
      return nextWeekFixtures.length > 0 ? nextWeekFixtures[0].opponent : null;
      
    } catch (error) {
      logger.error('Error getting upcoming opponent', { error: error.toString() });
      return null;
    }
  }

  /**
   * Get monthly player statistics
   */
  getMonthlyPlayerStats() {
    try {
      // This would integrate with the player management system
      const playerStatsSheet = SheetUtils.getOrCreateSheet('Player Stats', [
        'Player', 'Apps', 'Goals', 'Assists', 'Minutes', 'Cards', 'MOTM'
      ]);
      
      if (!playerStatsSheet) {
        return this.getDefaultPlayerStats();
      }
      
      const data = playerStatsSheet.getDataRange().getValues();
      const headers = data[0];
      const players = data.slice(1).map(row => {
        const player = {};
        headers.forEach((header, index) => {
          player[header.toLowerCase()] = row[index];
        });
        return player;
      }).filter(player => player.player);
      
      // Calculate top performers
      const topScorer = players.reduce((prev, current) => 
        (current.goals > prev.goals) ? current : prev, players[0] || {});
      
      const mostAssists = players.reduce((prev, current) => 
        (current.assists > prev.assists) ? current : prev, players[0] || {});
      
      const mostMinutes = players.reduce((prev, current) => 
        (current.minutes > prev.minutes) ? current : prev, players[0] || {});
      
      return {
        topScorer: topScorer.player || 'N/A',
        topScorerGoals: topScorer.goals || 0,
        mostAssists: mostAssists.player || 'N/A',
        mostAssistsCount: mostAssists.assists || 0,
        mostMinutes: mostMinutes.player || 'N/A',
        mostMinutesCount: mostMinutes.minutes || 0,
        cleanSheets: this.getCleanSheetCount(),
        discipline: this.getDisciplineSummary(),
        appearances: this.getAppearanceLeaders(players)
      };
      
    } catch (error) {
      logger.error('Error getting monthly player stats', { error: error.toString() });
      return this.getDefaultPlayerStats();
    }
  }

  /**
   * Get default player stats when data unavailable
   */
  getDefaultPlayerStats() {
    return {
      topScorer: 'N/A',
      topScorerGoals: 0,
      mostAssists: 'N/A',
      mostAssistsCount: 0,
      mostMinutes: 'N/A',
      mostMinutesCount: 0,
      cleanSheets: 0,
      discipline: 'Good discipline this month',
      appearances: []
    };
  }

  /**
   * Get opposition history for analysis
   */
  getOppositionHistory(opponent) {
    try {
      // This would query historical results
      return {
        meetings: 0,
        record: { wins: 0, draws: 0, losses: 0 },
        lastResult: 'No previous meetings',
        keyPlayers: [],
        tactics: 'Standard approach'
      };
      
    } catch (error) {
      logger.error('Error getting opposition history', { error: error.toString() });
      return {
        meetings: 0,
        record: { wins: 0, draws: 0, losses: 0 },
        lastResult: 'Data unavailable',
        keyPlayers: [],
        tactics: 'Prepare for tough match'
      };
    }
  }

  /**
   * Get throwback content for Thursday
   */
  getThrowbackContent() {
    try {
      const throwbackSheet = SheetUtils.getOrCreateSheet('Throwback Content', [
        'Date', 'Content', 'Category', 'Significance', 'LastUsed'
      ]);
      
      if (!throwbackSheet) {
        return this.getDefaultThrowback();
      }
      
      const data = throwbackSheet.getDataRange().getValues();
      const headers = data[0];
      const throwbacks = data.slice(1).map(row => {
        const throwback = {};
        headers.forEach((header, index) => {
          throwback[header.toLowerCase().replace(' ', '')] = row[index];
        });
        return throwback;
      }).filter(throwback => throwback.content);
      
      if (throwbacks.length === 0) {
        return this.getDefaultThrowback();
      }
      
      // Find least recently used throwback
      const sortedThrowbacks = throwbacks.sort((a, b) => {
        const dateA = a.lastused ? new Date(a.lastused) : new Date(0);
        const dateB = b.lastused ? new Date(b.lastused) : new Date(0);
        return dateA - dateB;
      });
      
      const selectedThrowback = sortedThrowbacks[0];
      
      // Update last used date
      const throwbackIndex = data.findIndex(row => row[1] === selectedThrowback.content);
      if (throwbackIndex > 0) {
        throwbackSheet.getRange(throwbackIndex + 1, headers.indexOf('LastUsed') + 1)
          .setValue(new Date());
      }
      
      return {
        content: selectedThrowback.content,
        date: selectedThrowback.date || 'Historical',
        category: selectedThrowback.category || 'memory',
        significance: selectedThrowback.significance || 'Club history'
      };
      
    } catch (error) {
      logger.error('Error getting throwback content', { error: error.toString() });
      return this.getDefaultThrowback();
    }
  }

  /**
   * Get default throwback when data unavailable
   */
  getDefaultThrowback() {
    return {
      content: "Remember the great matches that brought us together as Tigers fans!",
      date: new Date().getFullYear() - 1,
      category: 'general',
      significance: 'Club spirit and tradition'
    };
  }

  /**
   * Get match in specified number of days
   */
  getMatchInDays(days) {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateString = targetDate.toDateString();
      
      const fixtures = this.getFixturesData();
      const matchingFixture = fixtures.find(fixture => 
        new Date(fixture.date).toDateString() === targetDateString
      );
      
      return matchingFixture ? {
        date: matchingFixture.date,
        time: matchingFixture.time,
        opponent: matchingFixture.opponent,
        venue: matchingFixture.venue,
        competition: matchingFixture.competition,
        importance: matchingFixture.importance || 'normal'
      } : null;
      
    } catch (error) {
      logger.error('Error getting match in days', { days, error: error.toString() });
      return null;
    }
  }

  /**
   * Get week start date (Monday)
   */
  getWeekStartDate() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);
    
    return monday;
  }

  /**
   * Get week description
   */
  getWeekDescription() {
    const weekStart = this.getWeekStartDate();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const startStr = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const endStr = weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    
    return `Week of ${startStr} - ${endStr}`;
  }

  /**
   * Get current month name
   */
  getCurrentMonth() {
    return new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }

  /**
   * Get recent team form
   */
  getRecentForm() {
    try {
      // This would analyze recent results
      return 'Good form going into the match';
    } catch (error) {
      return 'Ready for the challenge';
    }
  }

  /**
   * Get match day weather forecast
   */
  getMatchDayWeather() {
    try {
      // This could integrate with weather API in future
      return 'Check weather forecast';
    } catch (error) {
      return 'Prepare for all conditions';
    }
  }

  /**
   * Get clean sheet count
   */
  getCleanSheetCount() {
    // This would integrate with match results data
    return 0;
  }

  /**
   * Get discipline summary
   */
  getDisciplineSummary() {
    // This would analyze card records
    return 'Good discipline this month';
  }

  /**
   * Get appearance leaders
   */
  getAppearanceLeaders(players) {
    if (!players || players.length === 0) return [];
    
    return players.sort((a, b) => b.apps - a.apps).slice(0, 3);
  }

  /**
   * Send payload to Make.com webhook
   */
  sendToMakeWebhook(payload) {
    try {
      const webhookUrl = getConfig('MAKE.WEBHOOK_URL');
      if (!webhookUrl) {
        logger.error('Make.com webhook URL not configured');
        return { success: false, error: 'Webhook URL not configured' };
      }

      // @testHook(webhook_send_start)
      
      const response = UrlFetchApp.fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload)
      });

      // @testHook(webhook_send_end)

      const responseData = JSON.parse(response.getContentText());
      
      return {
        success: response.getResponseCode() === 200,
        responseCode: response.getResponseCode(),
        responseData: responseData
      };

    } catch (error) {
      logger.error('Webhook send failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Initialize weekly schedule triggers
 * Set up time-based triggers for each day of the week
 */
function initializeWeeklySchedule() {
  logger.enterFunction('initializeWeeklySchedule');
  
  try {
    // Delete existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'runDailyScheduleCheck') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create daily trigger at 9:00 AM
    ScriptApp.newTrigger('runDailyScheduleCheck')
      .timeBased()
      .everyDays(1)
      .atHour(9)
      .create();
    
    logger.exitFunction('initializeWeeklySchedule', { success: true });
    return { success: true, message: 'Weekly schedule triggers initialized' };
    
  } catch (error) {
    logger.error('Failed to initialize weekly schedule', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Daily schedule check function (called by trigger)
 */
function runDailyScheduleCheck() {
  const scheduler = new WeeklyScheduler();
  return scheduler.runWeeklySchedule();
}

/**
 * Manual execution for testing
 */
function testWeeklySchedule() {
  const scheduler = new WeeklyScheduler();
  return scheduler.runWeeklySchedule();
}

/**
 * Test specific day content
 */
function testSpecificDay(dayNumber) {
  const scheduler = new WeeklyScheduler();
  scheduler.dayOfWeek = dayNumber;
  return scheduler.runWeeklySchedule();
}
