/**
 * @fileoverview Bible-Compliant Weekly Content Calendar Automation
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Implements the exact Monday-Sunday content schedule from the system workings Bible
 * 
 * CREATE NEW FILE - This is the core Bible-compliant weekly scheduler
 * 
 * WEEKLY SCHEDULE (BIBLE COMPLIANCE):
 * Monday: This week's fixtures / no match scheduled
 * Tuesday: Quotes 
 * Wednesday: Player stats (Monthly) / Previous matches vs opponent
 * Thursday: Throwback Thursday / 3 days to go
 * Friday: 2 days to go
 * Saturday: 1 day to go  
 * Sunday: MATCH DAY
 */

// ==================== WEEKLY SCHEDULER CLASS ====================

/**
 * Weekly Scheduler Class - Bible-compliant implementation
 */
class WeeklyScheduler {
  
  constructor() {
    this.logger = logger.scope('WeeklyScheduler');
    this.makeIntegration = new MakeIntegration();
    this.today = DateUtils.now();
    this.dayOfWeek = DateUtils.getDayOfWeek(this.today); // 0=Sunday, 1=Monday, etc.
    this.variantBuilderAvailable = typeof buildTemplateVariantCollection === 'function';
  }

  // ==================== MAIN SCHEDULE RUNNER ====================

  /**
   * Run weekly schedule automation (Bible compliance)
   * @param {boolean} forceRun - Force run regardless of day
   * @returns {Object} Execution result
   */
  runWeeklySchedule(forceRun = false) {
    this.logger.enterFunction('runWeeklySchedule', { forceRun, dayOfWeek: this.dayOfWeek });
    
    try {
      // @testHook(weekly_schedule_start)
      
      // Check if weekly schedule is enabled
      if (!getConfig('WEEKLY_SCHEDULE.ENABLED', true)) {
        return { success: true, message: 'Weekly schedule disabled', skipped: true };
      }
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = dayNames[this.dayOfWeek];
      
      this.logger.info(`Running weekly schedule for ${todayName}`, { 
        day_of_week: this.dayOfWeek,
        force_run: forceRun
      });
      
      let result;
      
      // Bible-compliant weekly schedule
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
        case 0: // Sunday
          result = this.handleMatchDay();
          break;
        default:
          result = { success: false, error: 'Invalid day of week' };
      }
      
      // @testHook(weekly_schedule_complete)
      
      this.logger.exitFunction('runWeeklySchedule', { 
        success: result.success,
        day: todayName
      });
      
      return {
        ...result,
        day_of_week: this.dayOfWeek,
        day_name: todayName,
        executed_at: DateUtils.formatISO(this.today)
      };
      
    } catch (error) {
      this.logger.error('Weekly schedule execution failed', { error: error.toString() });
      return {
        success: false,
        error: error.toString(),
        day_of_week: this.dayOfWeek
      };
    }
  }

  // ==================== MONDAY: FIXTURES OR NO MATCH ====================

  /**
   * Post Monday fixtures or "no match scheduled" (Bible compliance)
   * @returns {Object} Posting result
   */
  postMondayFixtures() {
    this.logger.enterFunction('postMondayFixtures');
    
    try {
      // @testHook(monday_fixtures_start)
      
      // Get this week's fixtures
      const thisWeekFixtures = this.getThisWeekFixtures();
      
      let payload;
      if (thisWeekFixtures.length > 0) {
        // We have fixtures this week
        payload = this.createWeeklyFixturesPayload(thisWeekFixtures);
      } else {
        // No matches this week
        payload = this.createNoMatchPayload();
      }
      
      // @testHook(monday_fixtures_webhook)
      const webhookResult = this.sendToMake(payload);
      
      this.logger.exitFunction('postMondayFixtures', { 
        success: webhookResult.success,
        fixture_count: thisWeekFixtures.length
      });
      
      return {
        success: webhookResult.success,
        content_type: thisWeekFixtures.length > 0 ? 'weekly_fixtures' : 'weekly_no_match',
        fixture_count: thisWeekFixtures.length,
        fixtures: thisWeekFixtures,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Monday fixtures posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== TUESDAY: QUOTES ====================

  /**
   * Post Tuesday motivational quotes (Bible compliance)
   * @returns {Object} Posting result
   */
  postTuesdayQuotes() {
    this.logger.enterFunction('postTuesdayQuotes');
    
    try {
      // @testHook(tuesday_quotes_start)
      
      // Get rotated quote
      const selectedQuote = this.getRotatedQuote();
      
      if (!selectedQuote) {
        throw new Error('No quotes available');
      }
      
      // Create quotes payload
      const payload = this.createQuotesPayload(selectedQuote);
      
      // @testHook(tuesday_quotes_webhook)
      const webhookResult = this.sendToMake(payload);
      
      this.logger.exitFunction('postTuesdayQuotes', { success: webhookResult.success });
      
      return {
        success: webhookResult.success,
        content_type: 'weekly_quotes',
        quote: selectedQuote,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Tuesday quotes posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== WEDNESDAY: STATS OR OPPOSITION ====================

  /**
   * Post Wednesday stats or opposition analysis (Bible compliance)
   * @returns {Object} Posting result
   */
  postWednesdayStats() {
    this.logger.enterFunction('postWednesdayStats');
    
    try {
      // @testHook(wednesday_stats_start)
      
      // Check if it's monthly stats time (1st Wednesday of month)
      const isMonthlyStatsTime = this.isFirstWednesdayOfMonth();
      
      let payload;
      if (isMonthlyStatsTime) {
        // Post monthly player stats
        payload = this.createMonthlyStatsPayload();
      } else {
        // Post opposition analysis for this week's match
        const sundayMatch = this.getSundayMatch();
        if (sundayMatch) {
          payload = this.createOppositionAnalysisPayload(sundayMatch);
        } else {
          // Fallback to general stats
          payload = this.createGeneralStatsPayload();
        }
      }
      
      // @testHook(wednesday_stats_webhook)
      const webhookResult = this.sendToMake(payload);
      
      this.logger.exitFunction('postWednesdayStats', { 
        success: webhookResult.success,
        content_type: payload.event_type
      });
      
      return {
        success: webhookResult.success,
        content_type: payload.event_type,
        is_monthly_stats: isMonthlyStatsTime,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Wednesday stats posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== THURSDAY: THROWBACK OR COUNTDOWN ====================

  /**
   * Post Thursday throwback or countdown (Bible compliance)
   * @returns {Object} Posting result
   */
  postThursdayThrowback() {
    this.logger.enterFunction('postThursdayThrowback');
    
    try {
      // @testHook(thursday_throwback_start)
      
      const countdownState = this.getCountdownState(3);

      if (countdownState.suppressed) {
        this.logger.info('Countdown suppressed due to postponed fixture', {
          days_before: 3,
          fixture: countdownState.fixture
        });
      }

      let payload;
      if (countdownState.due) {
        payload = this.createCountdownPayload(countdownState.fixture, 3);
      } else {
        const throwback = this.getRotatedThrowback();
        payload = this.createThrowbackPayload(throwback);
      }

      // @testHook(thursday_throwback_webhook)
      const webhookResult = this.sendToMake(payload);

      this.logger.exitFunction('postThursdayThrowback', {
        success: webhookResult.success,
        has_match: countdownState.due,
        suppressed: countdownState.suppressed
      });

      return {
        success: webhookResult.success,
        content_type: countdownState.due ? 'weekly_countdown_3' : 'weekly_throwback',
        has_sunday_match: countdownState.due,
        suppressed_due_to_postponement: countdownState.suppressed,
        countdown_fixture: countdownState.fixture || null,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Thursday throwback posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== FRIDAY: 2 DAYS TO GO ====================

  /**
   * Post Friday countdown - 2 days to go (Bible compliance)
   * @returns {Object} Posting result
   */
  postFridayCountdown() {
    this.logger.enterFunction('postFridayCountdown');
    
    try {
      // @testHook(friday_countdown_start)
      
      const countdownState = this.getCountdownState(2);

      if (countdownState.suppressed) {
        return {
          success: true,
          message: 'Fixture postponed - countdown suppressed',
          skipped: true,
          suppressed_due_to_postponement: true,
          countdown_fixture: countdownState.fixture
        };
      }

      if (!countdownState.due) {
        return {
          success: true,
          message: 'Countdown not scheduled for today',
          skipped: true
        };
      }

      const payload = this.createCountdownPayload(countdownState.fixture, 2);

      // @testHook(friday_countdown_webhook)
      const webhookResult = this.sendToMake(payload);

      this.logger.exitFunction('postFridayCountdown', { success: webhookResult.success });

      return {
        success: webhookResult.success,
        content_type: 'weekly_countdown_2',
        countdown_fixture: countdownState.fixture,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Friday countdown posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== SATURDAY: 1 DAY TO GO ====================

  /**
   * Post Saturday countdown - 1 day to go (Bible compliance)
   * @returns {Object} Posting result
   */
  postSaturdayCountdown() {
    this.logger.enterFunction('postSaturdayCountdown');
    
    try {
      // @testHook(saturday_countdown_start)
      
      const countdownState = this.getCountdownState(1);

      if (countdownState.suppressed) {
        return {
          success: true,
          message: 'Fixture postponed - countdown suppressed',
          skipped: true,
          suppressed_due_to_postponement: true,
          countdown_fixture: countdownState.fixture
        };
      }

      if (!countdownState.due) {
        return {
          success: true,
          message: 'Countdown not scheduled for today',
          skipped: true
        };
      }

      const payload = this.createCountdownPayload(countdownState.fixture, 1);

      // @testHook(saturday_countdown_webhook)
      const webhookResult = this.sendToMake(payload);
      
      this.logger.exitFunction('postSaturdayCountdown', { success: webhookResult.success });
      
      return {
        success: webhookResult.success,
        content_type: 'weekly_countdown_1',
        countdown_fixture: countdownState.fixture,
        webhook_sent: webhookResult.success
      };
      
    } catch (error) {
      this.logger.error('Saturday countdown posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== SUNDAY: MATCH DAY ====================

  /**
   * Handle Sunday match day (Bible compliance)
   * @returns {Object} Handling result
   */
  handleMatchDay() {
    this.logger.enterFunction('handleMatchDay');
    
    try {
      // @testHook(match_day_start)
      
      const sundayMatch = this.getSundayMatch();
      
      if (!sundayMatch) {
        return { 
          success: true, 
          message: 'No match today - Sunday rest day',
          is_rest_day: true
        };
      }
      
      // Match day is handled by live match processing
      // Weekly scheduler just acknowledges it's match day
      this.logger.info('Match day detected - live processing will handle events', {
        match: sundayMatch
      });
      
      this.logger.exitFunction('handleMatchDay', { success: true });
      
      return {
        success: true,
        content_type: 'match_day',
        is_match_day: true,
        match: sundayMatch,
        message: 'Match day - live processing active'
      };
      
    } catch (error) {
      this.logger.error('Match day handling failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== DATA RETRIEVAL METHODS ====================

  /**
   * Get this week's fixtures
   * @returns {Array} This week's fixtures
   */
  getThisWeekFixtures() {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES')
      );
      
      if (!fixturesSheet) return [];
      
      const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      const weekStart = DateUtils.getWeekStart(this.today);
      const weekEnd = DateUtils.getWeekEnd(this.today);
      
      return allFixtures.filter(fixture => {
        const fixtureDate = DateUtils.parseUK(fixture.Date);
        return fixtureDate && fixtureDate >= weekStart && fixtureDate <= weekEnd;
      });
      
    } catch (error) {
      this.logger.error('Failed to get this week fixtures', { error: error.toString() });
      return [];
    }
  }

  /**
   * Get Sunday's match if it exists
   * @returns {Object|null} Sunday match or null
   */
  getSundayMatch() {
    try {
      const thisWeekFixtures = this.getThisWeekFixtures();

      const sundayFixture = thisWeekFixtures.find(fixture => {
        const fixtureDate = DateUtils.parseUK(fixture.Date);
        if (!fixtureDate || fixtureDate.getDay() !== 0) {
          return false;
        }

        return !this.isFixturePostponed(fixture);
      });

      return sundayFixture || null;

    } catch (error) {
      this.logger.error('Failed to get Sunday match', { error: error.toString() });
      return null;
    }
  }

  /**
   * Get upcoming fixtures within lookahead window
   * @param {number} lookAheadDays - Days to look ahead
   * @returns {Array} Upcoming fixtures
   */
  getUpcomingFixturesWithin(lookAheadDays) {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES')
      );

      if (!fixturesSheet) return [];

      const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      const today = this.normalizeDate(this.today);
      const msPerDay = 24 * 60 * 60 * 1000;

      return allFixtures
        .filter(fixture => {
          const fixtureDate = DateUtils.parseUK(fixture.Date);
          if (!fixtureDate) return false;

          const normalizedFixture = this.normalizeDate(fixtureDate);
          const diffDays = Math.round((normalizedFixture.getTime() - today.getTime()) / msPerDay);

          return diffDays >= 0 && diffDays <= lookAheadDays;
        })
        .sort((a, b) => {
          const dateA = this.normalizeDate(DateUtils.parseUK(a.Date));
          const dateB = this.normalizeDate(DateUtils.parseUK(b.Date));

          if (isNaN(dateA)) return 1;
          if (isNaN(dateB)) return -1;

          return dateA - dateB;
        });

    } catch (error) {
      this.logger.error('Failed to get upcoming fixtures', { error: error.toString() });
      return [];
    }
  }

  /**
   * Determine countdown state for a given days-before window
   * @param {number} daysBefore - Days before match
   * @returns {Object} Countdown state
   */
  getCountdownState(daysBefore) {
    try {
      const countdownConfig = getConfig('WEEKLY_SCHEDULE.COUNTDOWN', {});
      const lookAhead = countdownConfig.LOOKAHEAD_DAYS || 10;
      const fixtures = this.getUpcomingFixturesWithin(lookAhead);
      const today = this.normalizeDate(this.today);
      const msPerDay = 24 * 60 * 60 * 1000;

      for (let i = 0; i < fixtures.length; i += 1) {
        const fixture = fixtures[i];
        const fixtureDate = DateUtils.parseUK(fixture.Date);
        if (!fixtureDate) continue;

        const normalizedFixture = this.normalizeDate(fixtureDate);
        const diffDays = Math.round((normalizedFixture.getTime() - today.getTime()) / msPerDay);

        if (diffDays === daysBefore) {
          if (countdownConfig.SUPPRESS_ON_POSTPONED && this.isFixturePostponed(fixture)) {
            return {
              due: false,
              suppressed: true,
              fixture
            };
          }

          return {
            due: true,
            suppressed: false,
            fixture
          };
        }
      }

      return {
        due: false,
        suppressed: false
      };

    } catch (error) {
      this.logger.error('Failed to evaluate countdown state', {
        error: error.toString(),
        days_before: daysBefore
      });

      return {
        due: false,
        suppressed: false,
        error: error.toString()
      };
    }
  }

  /**
   * Normalize date to midnight
   * @param {Date} date - Date to normalize
   * @returns {Date} Normalized date
   */
  normalizeDate(date) {
    if (!(date instanceof Date)) {
      return new Date(NaN);
    }

    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  /**
   * Determine if fixture is postponed
   * @param {Object} fixture - Fixture row
   * @returns {boolean} True if postponed
   */
  isFixturePostponed(fixture) {
    if (!fixture || typeof fixture !== 'object') {
      return false;
    }

    const statusFields = ['Status', 'Match Status', 'Fixture Status', 'Postponed', 'Postponement'];

    return statusFields.some(field => {
      const value = fixture[field];

      if (value === undefined || value === null) {
        return false;
      }

      if (typeof value === 'boolean') {
        return value;
      }

      const text = String(value).toLowerCase();
      return text === 'yes' || text === 'true' || text.includes('postpon');
    });
  }

  /**
   * Get rotated motivational quote
   * @returns {Object} Selected quote
   */
  getRotatedQuote() {
    try {
      const defaultQuotes = [
        {
          text: "The harder you work for something, the greater you'll feel when you achieve it.",
          author: "Unknown",
          category: "motivation"
        },
        {
          text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
          author: "Winston Churchill",
          category: "perseverance"
        },
        {
          text: "It's not whether you get knocked down; it's whether you get up.",
          author: "Vince Lombardi",
          category: "resilience"
        },
        {
          text: "Champions train, losers complain.",
          author: "Unknown",
          category: "training"
        },
        {
          text: "The difference between ordinary and extraordinary is that little extra.",
          author: "Jimmy Johnson",
          category: "excellence"
        }
      ];

      const quotesPool = [];

      try {
        const quotesSheet = SheetUtils.getOrCreateSheet('Quotes', ['Quote', 'Author', 'Category']);
        const customQuotes = SheetUtils.getAllDataAsObjects(quotesSheet);

        customQuotes.forEach(quote => {
          if (quote && quote.Quote) {
            quotesPool.push({
              text: quote.Quote,
              author: quote.Author || 'Unknown',
              category: quote.Category || 'motivation'
            });
          }
        });
      } catch (sheetError) {
        this.logger.warn('Could not access quotes sheet, using defaults', { error: sheetError.toString() });
      }

      if (quotesPool.length === 0) {
        quotesPool.push(...defaultQuotes);
      }

      const rotationKey = this.getRotationPropertyKey('quotes');
      const selectedQuote = this.getRandomUnusedRotationItem(
        quotesPool,
        quote => `${quote.text}||${quote.author}`,
        rotationKey
      );

      if (selectedQuote) {
        return selectedQuote;
      }

      return quotesPool[0];
      
    } catch (error) {
      this.logger.error('Failed to get rotated quote', { error: error.toString() });
      return {
        text: "Every match is a new opportunity to show what we're made of.",
        author: "Syston Tigers",
        category: "motivation"
      };
    }
  }

  /**
   * Get rotated throwback content
   * @returns {Object} Selected throwback
   */
  getRotatedThrowback() {
    try {
      const defaultThrowbacks = [
        {
          title: "Great Goal from Last Season",
          description: "Remember this fantastic strike that put us ahead in a crucial match!",
          year: "2023",
          category: "goals"
        },
        {
          title: "Epic Team Performance",
          description: "Looking back at one of our most dominant displays on the pitch.",
          year: "2023",
          category: "team"
        },
        {
          title: "Memorable Victory",
          description: "This win will be remembered for years to come - what a match!",
          year: "2022",
          category: "victories"
        }
      ];

      const throwbacksPool = [];

      try {
        const throwbackSheet = SheetUtils.getOrCreateSheet(
          'Historical Data',
          ['Title', 'Description', 'Year', 'Category', 'Image URL']
        );
        const customThrowbacks = SheetUtils.getAllDataAsObjects(throwbackSheet);

        customThrowbacks.forEach(item => {
          if (item && item.Title) {
            throwbacksPool.push({
              title: item.Title,
              description: item.Description,
              year: item.Year,
              category: item.Category || 'general',
              image_url: item['Image URL'] || ''
            });
          }
        });
      } catch (sheetError) {
        this.logger.warn('Could not access historical data sheet, using defaults', { error: sheetError.toString() });
      }

      if (throwbacksPool.length === 0) {
        throwbacksPool.push(...defaultThrowbacks);
      }

      const rotationKey = this.getRotationPropertyKey('throwbacks');
      const selectedThrowback = this.getRandomUnusedRotationItem(
        throwbacksPool,
        item => `${item.title}||${item.year || ''}`,
        rotationKey
      );

      if (selectedThrowback) {
        return selectedThrowback;
      }

      return throwbacksPool[0];

    } catch (error) {
      this.logger.error('Failed to get rotated throwback', { error: error.toString() });
      return {
        title: "Tigers Memories",
        description: "Every Thursday we remember the great moments that made us who we are today.",
        year: new Date().getFullYear().toString(),
        category: "general"
      };
    }
  }

  /**
   * Get rotation property key
   * @param {string} type - Rotation type (quotes|throwbacks)
   * @returns {string|null} Property key
   */
  getRotationPropertyKey(type) {
    const rotationConfig = getConfig('WEEKLY_SCHEDULE.ROTATION', {});

    if (type === 'quotes') {
      return rotationConfig.QUOTES_PROPERTY_KEY || 'WEEKLY_QUOTES_ROTATION';
    }

    if (type === 'throwbacks') {
      return rotationConfig.THROWBACK_PROPERTY_KEY || 'WEEKLY_THROWBACK_ROTATION';
    }

    return null;
  }

  /**
   * Select random unused item for rotation
   * @param {Array} items - Array of items
   * @param {Function} idSelector - Function returning unique id string
   * @param {string} propertyKey - Script property key
   * @returns {Object|null} Selected item
   */
  getRandomUnusedRotationItem(items, idSelector, propertyKey) {
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }

    if (!propertyKey) {
      const randomIndex = Math.floor(Math.random() * items.length);
      return items[randomIndex];
    }

    try {
      const scriptProperties = PropertiesService.getScriptProperties();
      const stored = scriptProperties.getProperty(propertyKey);
      const usedIds = stored ? JSON.parse(stored) : [];
      const usedSet = new Set(Array.isArray(usedIds) ? usedIds : []);

      let unusedItems = items.filter(item => {
        try {
          const itemId = idSelector(item);
          return itemId && !usedSet.has(itemId);
        } catch (innerError) {
          this.logger.warn('Rotation id selector failed', { error: innerError.toString() });
          return false;
        }
      });

      if (unusedItems.length === 0) {
        unusedItems = items.slice();
        usedSet.clear();
      }

      const randomIndex = Math.floor(Math.random() * unusedItems.length);
      const selectedItem = unusedItems[randomIndex];
      const selectedId = idSelector(selectedItem);

      if (selectedId) {
        usedSet.add(selectedId);
        scriptProperties.setProperty(propertyKey, JSON.stringify(Array.from(usedSet)));
      }

      return selectedItem;

    } catch (error) {
      this.logger.warn('Rotation state handling failed', { error: error.toString(), propertyKey });
      const randomIndex = Math.floor(Math.random() * items.length);
      return items[randomIndex];
    }
  }

  /**
   * Check if today is first Wednesday of month
   * @returns {boolean} True if first Wednesday
   */
  isFirstWednesdayOfMonth() {
    if (this.dayOfWeek !== 3) return false; // Not Wednesday
    
    const currentDate = this.today.getDate();
    return currentDate <= 7; // First week of month
  }

  // ==================== PAYLOAD CREATION METHODS ====================

  /**
   * Build template variant collection for a post type.
   * @param {string} postType - Post type identifier.
   * @param {Object} context - Context data for placeholders.
   * @returns {Object} Variant collection.
   */
  buildTemplateVariants(postType, context = {}) {
    if (!this.variantBuilderAvailable) {
      return {};
    }

    try {
      return buildTemplateVariantCollection(postType, context);
    } catch (error) {
      this.logger.warn('Template variant generation failed', {
        error: error.toString(),
        post_type: postType
      });
      return {};
    }
  }

  /**
   * Create weekly fixtures payload
   * @param {Array} fixtures - This week's fixtures
   * @returns {Object} Payload object
   */
  createWeeklyFixturesPayload(fixtures) {
    const fixturesList = fixtures.map(fixture => ({
      date: fixture.Date,
      time: fixture.Time,
      opponent: fixture.Opposition,
      venue: fixture.Venue,
      competition: fixture.Competition,
      home_away: fixture['Home/Away']
    }));

    const weekDescription = this.generateWeekDescription(fixtures);
    const weekStart = DateUtils.formatUK(DateUtils.getWeekStart(this.today));
    const variantContext = {
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      fixture_count: fixtures.length,
      fixtures_list: fixturesList,
      primary_fixture: fixturesList[0] || null,
      week_description: weekDescription,
      week_start_date: weekStart,
      generated_for_date: DateUtils.formatUK(this.today)
    };

    const templateVariants = this.buildTemplateVariants('fixtures', variantContext);

    return {
      event_type: 'weekly_fixtures',
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),

      // Weekly fixtures data
      week_start_date: weekStart,
      fixture_count: fixtures.length,
      fixtures_list: fixturesList,

      // Content metadata
      content_title: `This Week's Fixtures`,
      week_description: weekDescription,
      season: getConfig('SYSTEM.SEASON'),

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  /**
   * Create no match payload
   * @returns {Object} Payload object
   */
  createNoMatchPayload() {
    const nextFixture = this.getNextFixture();
    const normalizedNextFixture = nextFixture
      ? {
          opponent: nextFixture.Opposition,
          date: nextFixture.Date,
          time: nextFixture.Time,
          venue: nextFixture.Venue
        }
      : null;

    const variantContext = {
      content_title: 'Rest Week',
      message: 'No match scheduled this week',
      next_fixture: normalizedNextFixture
    };

    const templateVariants = this.buildTemplateVariants('rest_week', variantContext);

    return {
      event_type: 'weekly_no_match',
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),

      // No match data
      week_start_date: DateUtils.formatUK(DateUtils.getWeekStart(this.today)),
      message: 'No match scheduled this week',
      content_title: 'Rest Week',
      
      // Alternative content
      training_focus: 'Use this week to focus on training and preparation',
      next_fixture: normalizedNextFixture,

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  /**
   * Create quotes payload
   * @param {Object} quote - Selected quote
   * @returns {Object} Payload object
   */
  createQuotesPayload(quote) {
    const inspirationTheme = this.getInspirationalTheme();
    const variantContext = {
      content_title: 'Tuesday Motivation',
      quote_text: quote.text,
      quote_author: quote.author,
      inspiration_theme: inspirationTheme,
      generated_for_date: DateUtils.formatUK(this.today)
    };

    const templateVariants = this.buildTemplateVariants('quotes', variantContext);

    return {
      event_type: 'weekly_quotes',
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),

      // Quote data
      quote_text: quote.text,
      quote_author: quote.author,
      quote_category: quote.category,
      content_title: 'Tuesday Motivation',

      // Metadata
      inspiration_theme: inspirationTheme,

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  /**
   * Create monthly stats payload
   * @returns {Object} Payload object
   */
  createMonthlyStatsPayload() {
    const reportingPeriod = DateUtils.getMonthName(this.today.getMonth() + 1);
    const variantContext = {
      content_title: 'Monthly Player Statistics',
      reporting_period: reportingPeriod,
      stats_summary: 'Detailed player statistics for this month',
      generated_for_date: DateUtils.formatUK(this.today)
    };

    const templateVariants = this.buildTemplateVariants('stats', variantContext);

    return {
      event_type: 'weekly_stats',
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),

      // Stats data
      stats_type: 'monthly_summary',
      content_title: 'Monthly Player Statistics',
      reporting_period: reportingPeriod,

      // Note: Actual stats would be pulled from player management
      stats_summary: 'Detailed player statistics for this month',

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  /**
   * Create opposition analysis payload
   * @param {Object} match - Sunday match
   * @returns {Object} Payload object
   */
  createOppositionAnalysisPayload(match) {
    const previousMeetings = this.getPreviousMeetings(match.Opposition);
    const keyPlayers = 'Opposition key players to watch';
    const variantContext = {
      content_title: `Facing ${match.Opposition}`,
      opponent_name: match.Opposition,
      match_date: match.Date,
      previous_meetings: previousMeetings,
      opposition_form: 'Recent form analysis',
      key_players: keyPlayers
    };

    const templateVariants = this.buildTemplateVariants('stats', variantContext);

    return {
      event_type: 'weekly_stats',
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),

      // Opposition analysis
      stats_type: 'opposition_analysis',
      content_title: `Facing ${match.Opposition}`,
      opponent_name: match.Opposition,
      match_date: match.Date,
      
      // Analysis data
      previous_meetings: previousMeetings,
      opposition_form: 'Recent form analysis',
      key_players: keyPlayers,

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  /**
   * Create general stats payload
   * @returns {Object} Payload object
   */
  createGeneralStatsPayload() {
    const variantContext = {
      content_title: 'Team Statistics Update',
      stats_summary: 'Current season statistics',
      season_progress: 'Current season statistics',
      team_form: 'Recent team performance'
    };

    const templateVariants = this.buildTemplateVariants('stats', variantContext);

    return {
      event_type: 'weekly_stats',
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),

      // General stats
      stats_type: 'general_update',
      content_title: 'Team Statistics Update',
      
      // Basic stats
      season_progress: 'Current season statistics',
      team_form: 'Recent team performance',

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  /**
   * Create throwback payload
   * @param {Object} throwback - Selected throwback
   * @returns {Object} Payload object
   */
  createThrowbackPayload(throwback) {
    const variantContext = {
      content_title: 'Throwback Thursday',
      throwback_year: throwback.year,
      throwback_description: throwback.description,
      image_url: throwback.image_url || ''
    };

    const templateVariants = this.buildTemplateVariants('throwback', variantContext);

    return {
      event_type: 'weekly_throwback',
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),

      // Throwback data
      throwback_title: throwback.title,
      throwback_description: throwback.description,
      throwback_year: throwback.year,
      throwback_category: throwback.category,
      image_url: throwback.image_url || '',
      
      // Content metadata
      content_title: 'Throwback Thursday',
      nostalgia_factor: 'high',

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  /**
   * Create countdown payload
   * @param {Object} match - Upcoming match
   * @param {number} daysToGo - Days until match
   * @returns {Object} Payload object
   */
  createCountdownPayload(match, daysToGo) {
    const eventType = daysToGo === 2 ? 'weekly_countdown_2' :
                     daysToGo === 1 ? 'weekly_countdown_1' :
                     'weekly_countdown_3';

    const anticipationMessage = this.getAnticipationMessage(daysToGo);
    const variantContext = {
      content_title: `${daysToGo} ${daysToGo === 1 ? 'Day' : 'Days'} To Go`,
      countdown_days: daysToGo,
      match_opponent: match.Opposition,
      match_date: match.Date,
      match_time: match.Time,
      match_competition: match.Competition,
      anticipation_message: anticipationMessage
    };

    const templateVariants = this.buildTemplateVariants('countdown', variantContext);

    return {
      event_type: eventType,
      system_version: getConfig('SYSTEM.VERSION'),
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      
      // Countdown data
      countdown_days: daysToGo,
      content_title: `${daysToGo} ${daysToGo === 1 ? 'Day' : 'Days'} To Go`,
      
      // Match data
      match_opponent: match.Opposition,
      match_date: match.Date,
      match_time: match.Time,
      match_venue: match.Venue,
      match_competition: match.Competition,
      home_away: match['Home/Away'],
      
      // Excitement metadata
      excitement_level: daysToGo === 1 ? 'maximum' : 'high',
      anticipation_message: anticipationMessage,

      // Timestamps
      timestamp: DateUtils.formatISO(DateUtils.now()),
      generated_for_date: DateUtils.formatUK(this.today),

      // Template variants
      template_variants: templateVariants
    };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Send payload to Make.com
   * @param {Object} payload - Payload to send
   * @returns {Object} Send result
   */
  sendToMake(payload) {
    try {
      const webhookUrl = getWebhookUrl();
      if (!webhookUrl) {
        throw new Error('Webhook URL not configured');
      }
      
      const response = UrlFetchApp.fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      
      const success = response.getResponseCode() === 200;
      
      return {
        success: success,
        response_code: response.getResponseCode(),
        response_text: response.getContentText()
      };
      
    } catch (error) {
      this.logger.error('Failed to send to Make.com', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Generate week description
   * @param {Array} fixtures - Week's fixtures
   * @returns {string} Week description
   */
  generateWeekDescription(fixtures) {
    if (fixtures.length === 0) return 'Rest week';
    if (fixtures.length === 1) return 'Single fixture week';
    
    const homeCount = fixtures.filter(f => f['Home/Away'] === 'Home').length;
    const awayCount = fixtures.length - homeCount;
    
    if (homeCount > 0 && awayCount > 0) {
      return 'Mixed home and away week';
    } else if (homeCount > 0) {
      return `${homeCount} home fixture${homeCount > 1 ? 's' : ''}`;
    } else {
      return `${awayCount} away fixture${awayCount > 1 ? 's' : ''}`;
    }
  }

  /**
   * Get next fixture after this week
   * @returns {Object|null} Next fixture or null
   */
  getNextFixture() {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.FIXTURES')
      );
      
      if (!fixturesSheet) return null;
      
      const allFixtures = SheetUtils.getAllDataAsObjects(fixturesSheet);
      const weekEnd = DateUtils.getWeekEnd(this.today);
      
      const futureFixtures = allFixtures.filter(fixture => {
        const fixtureDate = DateUtils.parseUK(fixture.Date);
        return fixtureDate && fixtureDate > weekEnd;
      }).sort((a, b) => {
        const dateA = DateUtils.parseUK(a.Date);
        const dateB = DateUtils.parseUK(b.Date);
        return dateA - dateB;
      });
      
      return futureFixtures.length > 0 ? futureFixtures[0] : null;
      
    } catch (error) {
      this.logger.error('Failed to get next fixture', { error: error.toString() });
      return null;
    }
  }

  /**
   * Get inspirational theme
   * @returns {string} Theme for the week
   */
  getInspirationalTheme() {
    const themes = [
      'perseverance', 'teamwork', 'excellence', 'dedication', 
      'improvement', 'unity', 'determination', 'passion'
    ];
    const randomIndex = Math.floor(Math.random() * themes.length);
    return themes[randomIndex];
  }

  /**
   * Get previous meetings with opponent
   * @param {string} opponent - Opposition team
   * @returns {string} Previous meetings summary
   */
  getPreviousMeetings(opponent) {
    try {
      const resultsSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.RESULTS')
      );
      
      if (!resultsSheet) return 'No previous meeting data available';
      
      const allResults = SheetUtils.getAllDataAsObjects(resultsSheet);
      const previousMeetings = allResults.filter(result => 
        result.Opposition === opponent
      );
      
      if (previousMeetings.length === 0) {
        return 'First time facing this opponent';
      }
      
      const recentMeetings = previousMeetings.slice(-3); // Last 3 meetings
      return `Last ${recentMeetings.length} meeting${recentMeetings.length > 1 ? 's' : ''} recorded`;
      
    } catch (error) {
      this.logger.error('Failed to get previous meetings', { error: error.toString() });
      return 'Previous meeting data unavailable';
    }
  }

  /**
   * Get anticipation message for countdown
   * @param {number} daysToGo - Days until match
   * @returns {string} Anticipation message
   */
  getAnticipationMessage(daysToGo) {
    switch (daysToGo) {
      case 3:
        return 'The excitement is building - preparation time!';
      case 2:
        return 'Almost there - final preparations underway!';
      case 1:
        return 'It\'s almost time - let\'s show them what we\'re made of!';
      default:
        return 'Get ready for an amazing match!';
    }
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
      'Quotes',
      'Historical Data'
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
      version: '6.2.0'
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
      bible_compliant: getConfig('WEEKLY_SCHEDULE.ENABLED', true)
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
      const testPayload = scheduler.createNoMatchPayload();
      results.payload_creation = testPayload && testPayload.event_type;
    } catch (error) {
      logger.warn('Payload creation test failed', { error: error.toString() });
    }
    
    const overallSuccess = Object.values(results).every(result => result === true);
    
    logger.exitFunction('WeeklyScheduler.test', { success: overallSuccess });
    
    return {
      success: overallSuccess,
      test_results: results,
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

