
/**
 * @fileoverview Main coordinator and public API functions
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Central coordination hub for all system components and public API
 * 
 * CREATE NEW FILE - This is the main entry point missing from Script 6.1
 */

// ==================== SYSTEM COORDINATOR CLASS ====================

/**
 * System Coordinator - Central management hub
 */
class SystemCoordinator {
  
  constructor() {
    this.logger = logger.scope('SystemCoordinator');
    this.initialized = false;
    this.components = new Map();
    this.healthStatus = 'unknown';
  }

  // ==================== SYSTEM INITIALIZATION ====================

  /**
   * Initialize complete system
   * @param {boolean} forceReinit - Force reinitialization
   * @returns {Object} Initialization result
   */
  initializeSystem(forceReinit = false) {
    this.logger.enterFunction('initializeSystem', { forceReinit });
    
    try {
      if (this.initialized && !forceReinit) {
        const alreadyInitializedResult = {
          success: true,
          message: 'System already initialized'
        };
        this.logger.exitFunction('initializeSystem', {
          success: true,
          already_initialized: true
        });
        return alreadyInitializedResult;
      }
      
      // @testHook(system_init_start)
      
      const results = {
        overall_success: false,
        components: {},
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
      // Initialize core components in order
      results.components.config = initializeConfig();
      results.components.utils = initializeUtils();
      results.components.logger = initializeLogger();
      
      // Initialize feature components
      if (isFeatureEnabled('WEEKLY_CONTENT_AUTOMATION')) {
        results.components.weeklyScheduler = initializeWeeklyScheduler();
      }
      
      if (isFeatureEnabled('BATCH_POSTING')) {
        results.components.batchFixtures = initializeBatchFixtures();
      }

      if (isFeatureEnabled('MONTHLY_SUMMARIES')) {
        results.components.monthlySummaries = initializeMonthlySummaries();
      }

      if (isFeatureEnabled('PLAYER_MINUTES_TRACKING')) {
        results.components.playerManagement = initializePlayerManagement();
      }
      
      if (isFeatureEnabled('VIDEO_INTEGRATION')) {
        results.components.videoClips = initializeVideoClips();
      }
      
      if (isFeatureEnabled('XBOTGO_INTEGRATION')) {
        results.components.xbotgo = initializeXbotGo();
      }
      
      // Initialize sheets with required structure
      results.components.sheets = this.initializeRequiredSheets();
      
      // @testHook(init_complete)
      
      // Check for any failed components
      const failedComponents = Object.entries(results.components)
        .filter(([name, result]) => !result.success)
        .map(([name]) => name);
      
      const success = failedComponents.length === 0;
      
      if (success) {
        this.initialized = true;
        this.healthStatus = 'healthy';
        this.logger.info('System initialization completed successfully');
      } else {
        this.healthStatus = 'degraded';
        this.logger.warn('System initialization completed with warnings', { 
          failed_components: failedComponents 
        });
      }
      
      const response = {
        success: success,
        failed_components: failedComponents,
        results: results
      };

      this.logger.exitFunction('initializeSystem', { success });

      return response;

    } catch (error) {
      this.healthStatus = 'unhealthy';
      this.logger.error('System initialization failed', {
        error: error.toString(),
        stack: error.stack
      });
      const failureResponse = {
        success: false,
        error: error.toString(),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      this.logger.exitFunction('initializeSystem', {
        success: false,
        error: error.toString()
      });
      return failureResponse;
    }
  }

  /**
   * Initialize all required Google Sheets
   * @returns {Object} Sheet initialization results
   */
  initializeRequiredSheets() {
    this.logger.enterFunction('initializeRequiredSheets');
    
    try {
      const tabNames = getConfig('SHEETS.TAB_NAMES');
      const requiredColumns = getConfig('SHEETS.REQUIRED_COLUMNS');
      const results = {};
      
      // @testHook(sheets_init_start)
      
      Object.keys(tabNames).forEach(sheetKey => {
        const tabName = tabNames[sheetKey];
        const columns = requiredColumns[sheetKey] || [];
        
        try {
          const sheet = SheetUtils.getOrCreateSheet(tabName, columns);
          results[sheetKey] = {
            success: !!sheet,
            name: tabName,
            columns_count: columns.length
          };
        } catch (error) {
          results[sheetKey] = {
            success: false,
            name: tabName,
            error: error.toString()
          };
        }
      });
      
      // @testHook(sheets_init_complete)
      
      const successCount = Object.values(results).filter(r => r.success).length;
      const totalCount = Object.keys(results).length;
      
      this.logger.exitFunction('initializeRequiredSheets', { 
        success: successCount === totalCount,
        success_count: successCount,
        total_count: totalCount
      });
      
      return {
        success: successCount === totalCount,
        sheets: results,
        success_count: successCount,
        total_count: totalCount
      };
      
    } catch (error) {
      this.logger.error('Sheet initialization failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  // ==================== SYSTEM HEALTH MONITORING ====================

  /**
   * Check system health
   * @returns {Object} Health check result
   */
  checkSystemHealth() {
    this.logger.enterFunction('checkSystemHealth');
    
    try {
      // @testHook(health_check_start)
      
      const healthReport = {
        overall_status: 'healthy',
        components: {},
        metrics: {},
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
      // Check core components
      healthReport.components.config = this.checkConfigHealth();
      healthReport.components.sheets = this.checkSheetsHealth();
      healthReport.components.logging = this.checkLoggingHealth();
      healthReport.components.webhooks = this.checkWebhookHealth();
      
      // Check optional components
      if (isFeatureEnabled('WEEKLY_CONTENT_AUTOMATION')) {
        healthReport.components.weekly_scheduler = this.checkWeeklySchedulerHealth();
      }
      
      if (isFeatureEnabled('VIDEO_INTEGRATION')) {
        healthReport.components.video_clips = this.checkVideoClipsHealth();
      }
      
      // Calculate overall health
      const componentStatuses = Object.values(healthReport.components);
      const unhealthyCount = componentStatuses.filter(status => status !== 'healthy').length;
      
      if (unhealthyCount === 0) {
        healthReport.overall_status = 'healthy';
      } else if (unhealthyCount <= componentStatuses.length / 2) {
        healthReport.overall_status = 'degraded';
      } else {
        healthReport.overall_status = 'unhealthy';
      }
      
      // Add metrics
      healthReport.metrics = this.getSystemMetrics();
      
      // @testHook(health_check_complete)
      
      this.healthStatus = healthReport.overall_status;
      this.logger.exitFunction('checkSystemHealth', { status: healthReport.overall_status });
      
      return healthReport;
      
    } catch (error) {
      this.logger.error('Health check failed', { error: error.toString() });
      return {
        overall_status: 'unhealthy',
        error: error.toString(),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Check configuration health
   * @returns {string} Health status
   */
  checkConfigHealth() {
    try {
      const validation = validateConfiguration();
      return validation.valid ? 'healthy' : 'degraded';
    } catch (error) {
      return 'unhealthy';
    }
  }

  /**
   * Check sheets health
   * @returns {string} Health status
   */
  checkSheetsHealth() {
    try {
      const tabNames = getConfig('SHEETS.TAB_NAMES');
      const testSheet = SheetUtils.getOrCreateSheet(tabNames.LIVE_MATCH);
      return testSheet ? 'healthy' : 'unhealthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  /**
   * Check logging health
   * @returns {string} Health status
   */
  checkLoggingHealth() {
    try {
      const stats = logger.getStats();
      return stats.error ? 'unhealthy' : 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  /**
   * Check webhook health
   * @returns {string} Health status
   */
  checkWebhookHealth() {
    try {
      const webhookUrl = getWebhookUrl();
      return webhookUrl ? 'healthy' : 'degraded';
    } catch (error) {
      return 'unhealthy';
    }
  }

  /**
   * Check weekly scheduler health
   * @returns {string} Health status
   */
  checkWeeklySchedulerHealth() {
    try {
      const status = getWeeklyScheduleStatus();
      return status.success ? 'healthy' : 'degraded';
    } catch (error) {
      return 'unhealthy';
    }
  }

  /**
   * Check video clips health
   * @returns {string} Health status
   */
  checkVideoClipsHealth() {
    try {
      const clips = getAllVideoClips();
      return clips.success ? 'healthy' : 'degraded';
    } catch (error) {
      return 'unhealthy';
    }
  }

  /**
   * Get system metrics and statistics
   * @returns {Object} System metrics
   */
  getSystemMetrics() {
    try {
      const metrics = {
        system: {
          version: getConfig('SYSTEM.VERSION'),
          uptime_session: logger.getStats().uptime_ms,
          environment: getConfig('SYSTEM.ENVIRONMENT')
        },
        features: {},
        performance: {},
        usage: {},
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
      // Feature metrics
      const features = getConfig('FEATURES', {});
      metrics.features = {
        total: Object.keys(features).length,
        enabled: Object.values(features).filter(v => v === true).length,
        disabled: Object.values(features).filter(v => v === false).length
      };
      
      // Performance metrics (basic)
      metrics.performance = {
        cache_enabled: getConfig('PERFORMANCE.CACHE_ENABLED'),
        batch_size: getConfig('PERFORMANCE.BATCH_SIZE'),
        rate_limit_ms: getConfig('PERFORMANCE.WEBHOOK_RATE_LIMIT_MS')
      };
      
      // Usage metrics from logs
      const logStats = logger.getStats();
      metrics.usage = {
        log_entries_session: logStats.session_entries || 0,
        log_entries_total: logStats.total_entries || 0,
        error_count: logStats.levels?.ERROR || 0,
        warning_count: logStats.levels?.WARN || 0
      };
      
      // Sheet metrics
      try {
        const liveSheet = SheetUtils.getOrCreateSheet(
          getConfig('SHEETS.TAB_NAMES.LIVE_MATCH')
        );
        if (liveSheet) {
          metrics.usage.live_events_count = liveSheet.getLastRow() - 1;
        }
      } catch (error) {
        // Ignore sheet access errors for metrics
      }
      
      return metrics;
      
    } catch (error) {
      this.logger.error('Failed to get system metrics', { error: error.toString() });
      return { error: 'Failed to collect metrics' };
    }
  }
}

// ==================== GLOBAL SYSTEM INSTANCE ====================

/**
 * Global system coordinator instance
 */
const systemCoordinator = new SystemCoordinator();

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Initialize the complete system (public API)
 * @param {boolean} forceReinit - Force reinitialization
 * @returns {Object} Initialization result
 */
function initializeSystem(forceReinit = false) {
  return systemCoordinator.initializeSystem(forceReinit);
}

/**
 * Run weekly content automation (public API wrapper)
 * @param {boolean} forceRun - Force execution regardless of day
 * @returns {Object} Weekly automation result
 */
function runWeeklyContentAutomation(forceRun = false) {
  logger.enterFunction('System.runWeeklyContentAutomation', { forceRun });

  try {
    if (!isFeatureEnabled('WEEKLY_CONTENT_AUTOMATION')) {
      logger.info('Weekly content automation disabled');
      const disabledResult = { success: true, skipped: true, message: 'Feature disabled' };
      logger.exitFunction('System.runWeeklyContentAutomation', {
        success: true,
        skipped: true,
        reason: 'feature_disabled'
      });
      return disabledResult;
    }

    const initResult = autoInitializeIfNeeded();
    if (initResult?.success === false) {
      logger.error('Initialization failed for weekly content automation wrapper', { details: initResult });
      const failureResult = {
        success: false,
        error: 'Initialization failed',
        details: initResult
      };
      logger.exitFunction('System.runWeeklyContentAutomation', {
        success: false,
        reason: 'initialization_failed'
      });
      return failureResult;
    }

    const result = runWeeklyScheduleAutomation(forceRun);

    logger.exitFunction('System.runWeeklyContentAutomation', { success: result.success });
    return result;

  } catch (error) {
    logger.error('Weekly content automation failed', { error: error.toString() });
    const failureResult = { success: false, error: error.toString() };
    logger.exitFunction('System.runWeeklyContentAutomation', {
      success: false,
      error: error.toString()
    });
    return failureResult;
  }
}

/**
 * Post batch fixtures using compatibility wrapper
 * @param {string} competitionType - Competition type (legacy parameter)
 * @param {boolean} upcomingOnly - Only include upcoming fixtures
 * @param {number} daysAhead - Days ahead to include
 * @returns {Object} Posting result
 */
function postBatchFixtures(competitionType = 'league', upcomingOnly = true, daysAhead = 14) {
  logger.enterFunction('System.postBatchFixtures', { competitionType, upcomingOnly, daysAhead });

  try {
    if (!isFeatureEnabled('BATCH_POSTING')) {
      logger.info('Batch posting disabled');
      const disabledResult = { success: true, skipped: true, message: 'Feature disabled' };
      logger.exitFunction('System.postBatchFixtures', {
        success: true,
        skipped: true,
        reason: 'feature_disabled'
      });
      return disabledResult;
    }

    const initResult = autoInitializeIfNeeded();
    if (initResult?.success === false) {
      logger.error('Initialization failed for batch fixtures wrapper', { details: initResult });
      const failureResult = {
        success: false,
        error: 'Initialization failed',
        details: initResult
      };
      logger.exitFunction('System.postBatchFixtures', {
        success: false,
        reason: 'initialization_failed'
      });
      return failureResult;
    }

    const manager = new BatchFixturesManager();
    const now = DateUtils.now();
    const startDate = upcomingOnly ? now : DateUtils.addDays(now, -Math.abs(daysAhead));
    const endDate = DateUtils.addDays(now, Math.abs(daysAhead));

    const result = manager.postLeagueFixturesBatch(null, startDate, endDate);

    logger.exitFunction('System.postBatchFixtures', { success: result.success, count: result.count });
    return result;

  } catch (error) {
    logger.error('Batch fixtures posting failed', { error: error.toString() });
    const failureResult = { success: false, error: error.toString() };
    logger.exitFunction('System.postBatchFixtures', {
      success: false,
      error: error.toString()
    });
    return failureResult;
  }
}

/**
 * Post batch results using compatibility wrapper
 * @param {string} competitionType - Competition type (legacy parameter)
 * @param {number} daysBack - Days back to include results
 * @returns {Object} Posting result
 */
function postBatchResults(competitionType = 'league', daysBack = 7) {
  logger.enterFunction('System.postBatchResults', { competitionType, daysBack });

  try {
    if (!isFeatureEnabled('BATCH_POSTING')) {
      logger.info('Batch posting disabled');
      const disabledResult = { success: true, skipped: true, message: 'Feature disabled' };
      logger.exitFunction('System.postBatchResults', {
        success: true,
        skipped: true,
        reason: 'feature_disabled'
      });
      return disabledResult;
    }

    const initResult = autoInitializeIfNeeded();
    if (initResult?.success === false) {
      logger.error('Initialization failed for batch results wrapper', { details: initResult });
      const failureResult = {
        success: false,
        error: 'Initialization failed',
        details: initResult
      };
      logger.exitFunction('System.postBatchResults', {
        success: false,
        reason: 'initialization_failed'
      });
      return failureResult;
    }

    const manager = new BatchFixturesManager();
    const now = DateUtils.now();
    const startDate = DateUtils.addDays(now, -Math.abs(daysBack));

    const result = manager.postLeagueResultsBatch(null, startDate, now);

    logger.exitFunction('System.postBatchResults', { success: result.success, count: result.count });
    return result;

  } catch (error) {
    logger.error('Batch results posting failed', { error: error.toString() });
    const failureResult = { success: false, error: error.toString() };
    logger.exitFunction('System.postBatchResults', {
      success: false,
      error: error.toString()
    });
    return failureResult;
  }
}

/**
 * Generate monthly player statistics summary wrapper
 * @param {number|null} month - Month (1-12)
 * @param {number|null} year - Year (e.g. 2024)
 * @returns {Object} Summary result
 */
function generateMonthlyPlayerStats(month = null, year = null) {
  logger.enterFunction('System.generateMonthlyPlayerStats', { month, year });

  try {
    if (!isFeatureEnabled('MONTHLY_SUMMARIES')) {
      logger.info('Monthly summaries disabled');
      const disabledResult = { success: true, skipped: true, message: 'Feature disabled' };
      logger.exitFunction('System.generateMonthlyPlayerStats', {
        success: true,
        skipped: true,
        reason: 'feature_disabled'
      });
      return disabledResult;
    }

    const initResult = autoInitializeIfNeeded();
    if (initResult?.success === false) {
      logger.error('Initialization failed for monthly player stats wrapper', { details: initResult });
      const failureResult = {
        success: false,
        error: 'Initialization failed',
        details: initResult
      };
      logger.exitFunction('System.generateMonthlyPlayerStats', {
        success: false,
        reason: 'initialization_failed'
      });
      return failureResult;
    }

    let reportingPeriod = null;
    if (month !== null || year !== null) {
      const today = DateUtils.now();
      const targetYear = year !== null ? year : today.getFullYear();
      const targetMonth = month !== null ? month : (today.getMonth() + 1);
      const normalized = new Date(targetYear, targetMonth - 1, 1);
      const monthPart = ('0' + (normalized.getMonth() + 1)).slice(-2);
      reportingPeriod = `${normalized.getFullYear()}-${monthPart}`;
    }

    const result = postPlayerStatsSummary(reportingPeriod);

    logger.exitFunction('System.generateMonthlyPlayerStats', { success: result.success });
    return result;

  } catch (error) {
    logger.error('Monthly player stats generation failed', { error: error.toString() });
    const failureResult = { success: false, error: error.toString() };
    logger.exitFunction('System.generateMonthlyPlayerStats', {
      success: false,
      error: error.toString()
    });
    return failureResult;
  }
}

/**
 * Perform system health check (public API wrapper)
 * @returns {Object} Health check result
 */
function performSystemHealthCheck() {
  logger.enterFunction('System.performSystemHealthCheck');

  try {
    const initResult = autoInitializeIfNeeded();
    if (initResult?.success === false) {
      logger.error('Initialization failed for system health check wrapper', { details: initResult });
      const failureResult = {
        success: false,
        error: 'Initialization failed',
        details: initResult
      };
      logger.exitFunction('System.performSystemHealthCheck', {
        success: false,
        reason: 'initialization_failed'
      });
      return failureResult;
    }
    const health = systemCoordinator.checkSystemHealth();
    logger.exitFunction('System.performSystemHealthCheck', { status: health.overall_status });
    return health;

  } catch (error) {
    logger.error('System health check failed', { error: error.toString() });
    const failureResult = { overall_status: 'unhealthy', error: error.toString() };
    logger.exitFunction('System.performSystemHealthCheck', {
      success: false,
      error: error.toString()
    });
    return failureResult;
  }
}

/**
 * Check system health (public API)
 * @returns {Object} Health check result
 */
function checkSystemHealth() {
  return performSystemHealthCheck();
}

/**
 * Get system metrics (public API wrapper)
 * @returns {Object} System metrics
 */
function getSystemMetrics() {
  logger.enterFunction('System.getSystemMetrics');

  try {
    const initResult = autoInitializeIfNeeded();
    if (initResult?.success === false) {
      logger.error('Initialization failed for system metrics wrapper', { details: initResult });
      const failureResult = {
        success: false,
        error: 'Initialization failed',
        details: initResult
      };
      logger.exitFunction('System.getSystemMetrics', {
        success: false,
        reason: 'initialization_failed'
      });
      return failureResult;
    }
    const metrics = systemCoordinator.getSystemMetrics();
    logger.exitFunction('System.getSystemMetrics', { success: !metrics.error });
    return metrics;

  } catch (error) {
    logger.error('Failed to get system metrics', { error: error.toString() });
    const failureResult = { error: error.toString() };
    logger.exitFunction('System.getSystemMetrics', {
      success: false,
      error: error.toString()
    });
    return failureResult;
  }
}

/**
 * Get system status (public API)
 * @returns {Object} System status
 */
function getSystemStatus() {
  logger.enterFunction('System.getSystemStatus');
  
  try {
    const health = performSystemHealthCheck();
    const metrics = getSystemMetrics();
    
    const status = {
      system_health: health.overall_status,
      initialized: systemCoordinator.initialized,
      version: getConfig('SYSTEM.VERSION'),
      environment: getConfig('SYSTEM.ENVIRONMENT'),
      
      components: health.components,
      metrics: metrics,
      
      features_enabled: Object.entries(getConfig('FEATURES', {}))
        .filter(([key, value]) => value === true)
        .map(([key]) => key),
      
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
    logger.exitFunction('System.getSystemStatus', { success: true });
    return status;

  } catch (error) {
    logger.error('Failed to get system status', { error: error.toString() });
    const failureResult = {
      system_health: 'unhealthy',
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    logger.exitFunction('System.getSystemStatus', {
      success: false,
      error: error.toString()
    });
    return failureResult;
  }
}

// ==================== BUYER INTAKE CONTROLLER ====================

/**
 * Buyer intake controller handles onboarding and persistence
 */
class BuyerIntakeController {

  constructor() {
    this.logger = logger.scope('BuyerIntakeController');
  }

  /**
   * Render intake form with prefilled data
   * @returns {GoogleAppsScript.HTML.HtmlOutput} Html output
   */
  showForm() {
    this.logger.enterFunction('showForm');

    try {
      const profile = getBuyerProfile(true) || {};
      const template = HtmlService.createTemplateFromFile('buyerIntake');
      template.prefillData = profile;

      // @testHook(buyer_intake_template_start)
      const output = template.evaluate();
      // @testHook(buyer_intake_template_complete)

      output.setTitle('Buyer Intake Onboarding');
      output.setWidth(780);

      this.logger.exitFunction('showForm', { success: true });
      return output;

    } catch (error) {
      this.logger.error('Failed to render buyer intake form', {
        error: error.toString(),
        stack: error.stack
      });
      this.logger.exitFunction('showForm', { success: false, error: error.toString() });
      throw error;
    }
  }

  /**
   * Sanitize roster entries
   * @param {Array<Object>} rosterEntries - Roster entries from client
   * @returns {Array<Object>} Sanitized roster
   */
  sanitizeRoster(rosterEntries) {
    if (!Array.isArray(rosterEntries)) {
      return [];
    }

    const uniqueMap = new Map();

    rosterEntries.forEach(entry => {
      if (!entry) return;

      const cleanedName = StringUtils.cleanPlayerName(entry.playerName || '');

      if (!cleanedName) {
        return;
      }

      const rosterKey = cleanedName.toLowerCase();
      const sanitizedEntry = {
        playerName: cleanedName,
        position: StringUtils.toTitleCase((entry.position || '').trim()),
        squadNumber: (entry.squadNumber || '').trim()
      };

      if (sanitizedEntry.squadNumber && !/^\d{1,3}$/.test(sanitizedEntry.squadNumber)) {
        sanitizedEntry.squadNumber = sanitizedEntry.squadNumber.replace(/[^0-9]/g, '').slice(0, 3);
      }

      if (!uniqueMap.has(rosterKey)) {
        uniqueMap.set(rosterKey, sanitizedEntry);
      } else {
        const existing = uniqueMap.get(rosterKey);
        uniqueMap.set(rosterKey, {
          playerName: sanitizedEntry.playerName,
          position: sanitizedEntry.position || existing.position,
          squadNumber: sanitizedEntry.squadNumber || existing.squadNumber
        });
      }
    });

    return Array.from(uniqueMap.values());
  }

  /**
   * Build sanitized profile payload
   * @param {Object} formData - Raw form data
   * @returns {Object} Sanitized profile
   */
  buildProfile(formData) {
    const rosterEntries = this.sanitizeRoster(formData.rosterEntries);

    return {
      buyerId: ensureBuyerProfileId(),
      clubName: StringUtils.toTitleCase((formData.clubName || '').trim()),
      clubShortName: StringUtils.toTitleCase((formData.clubShortName || '').trim()),
      league: StringUtils.toTitleCase((formData.league || '').trim()),
      ageGroup: StringUtils.toTitleCase((formData.ageGroup || '').trim()),
      primaryColor: (formData.primaryColor || '').trim(),
      secondaryColor: (formData.secondaryColor || '').trim(),
      badgeUrl: (formData.badgeUrl || '').trim(),
      badgeBase64: (formData.badgeBase64 || '').trim(),
      rosterEntries: rosterEntries
    };
  }

  /**
   * Handle intake submission
   * @param {Object} formData - Submitted data
   * @returns {Object} Response payload
   */
  submitForm(formData) {
    this.logger.enterFunction('submitForm', { hasFormData: !!formData });

    try {
      if (!formData || typeof formData !== 'object') {
        throw new Error('No form data received');
      }

      const profile = this.buildProfile(formData);

      const validation = ValidationUtils.validateRequiredFields(profile, [
        'clubName',
        'league',
        'ageGroup',
        'primaryColor'
      ]);

      if (!validation.isValid) {
        throw new Error(`Missing required fields: ${validation.missingFields.join(', ')}`);
      }

      if (!profile.badgeUrl && !profile.badgeBase64) {
        throw new Error('Provide either a badge URL or an uploaded badge image.');
      }

      const hexPattern = /^#([0-9a-f]{3}){1,2}$/i;
      if (profile.primaryColor && !hexPattern.test(profile.primaryColor)) {
        throw new Error('Primary colour must be a valid hex code.');
      }

      if (profile.secondaryColor && !hexPattern.test(profile.secondaryColor)) {
        throw new Error('Secondary colour must be a valid hex code.');
      }

      if (!Array.isArray(profile.rosterEntries) || profile.rosterEntries.length === 0) {
        throw new Error('Add at least one player to the roster.');
      }

      if (profile.badgeBase64 && profile.badgeBase64.length > 2000000) {
        throw new Error('Badge upload exceeds the maximum allowed size.');
      }

      // @testHook(buyer_profile_save_start)
      const saveResult = saveBuyerProfile(profile);
      // @testHook(buyer_profile_save_complete)

      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save buyer profile.');
      }

      const responseProfile = Object.assign({}, saveResult.profile);
      delete responseProfile.badgeBase64;

      const response = {
        success: true,
        message: 'Buyer profile saved successfully and configuration updated.',
        profile: responseProfile
      };

      this.logger.exitFunction('submitForm', { success: true });
      return response;

    } catch (error) {
      this.logger.error('Buyer intake submission failed', {
        error: error.toString(),
        stack: error.stack
      });
      this.logger.exitFunction('submitForm', { success: false, error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }
}

/**
 * Expose buyer intake form
 * @returns {GoogleAppsScript.HTML.HtmlOutput} Html output
 */
function showBuyerIntake() {
  const controller = new BuyerIntakeController();
  return controller.showForm();
}

/**
 * Handle buyer intake submission
 * @param {Object} formData - Submitted data
 * @returns {Object} Response payload
 */
function submitBuyerIntake(formData) {
  const controller = new BuyerIntakeController();
  return controller.submitForm(formData);
}

/**
 * Run system tests (public API)
 * @returns {Object} Test results
 */
function runSystemTests() {
  logger.enterFunction('System.runSystemTests');
  
  try {
    // @testHook(system_tests_start)
    
    const testResults = {
      overall_success: false,
      tests: {},
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
    // Test core components
    testResults.tests.config = testConfiguration();
    testResults.tests.utils = testUtilities();
    testResults.tests.logging = testLogging();
    testResults.tests.sheets = testSheetOperations();
    
    // Test optional components
    if (isFeatureEnabled('WEEKLY_CONTENT_AUTOMATION')) {
      testResults.tests.weekly_scheduler = testWeeklyScheduler();
    }
    
    if (isFeatureEnabled('BATCH_POSTING')) {
      testResults.tests.batch_fixtures = testBatchFixtures();
    }
    
    if (isFeatureEnabled('PLAYER_MINUTES_TRACKING')) {
      testResults.tests.player_management = testPlayerManagement();
    }
    
    if (isFeatureEnabled('VIDEO_INTEGRATION')) {
      testResults.tests.video_clips = testVideoClips();
    }
    
    // @testHook(system_tests_complete)
    
    // Determine overall success
    const allTestsPassed = Object.values(testResults.tests)
      .every(test => test.success === true);
    
    testResults.overall_success = allTestsPassed;
    
    logger.exitFunction('System.runSystemTests', {
      success: allTestsPassed,
      tests_run: Object.keys(testResults.tests).length
    });

    return testResults;

  } catch (error) {
    logger.error('System tests failed', { error: error.toString() });
    const failureResult = {
      overall_success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    logger.exitFunction('System.runSystemTests', {
      success: false,
      error: error.toString()
    });
    return failureResult;
  }
}

// ==================== TESTING FUNCTIONS ====================

/**
 * Test configuration functionality
 * @returns {Object} Test result
 */
function testConfiguration() {
  try {
    const version = getConfig('SYSTEM.VERSION');
    const clubName = getConfig('SYSTEM.CLUB_NAME');
    const testSet = setConfig('TEST.VALUE', 'test');
    const testGet = getConfig('TEST.VALUE');
    
    return {
      success: version && clubName && testSet && testGet === 'test',
      details: { version, clubName, testValueSet: testSet, testValueRetrieved: testGet }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Test utilities functionality
 * @returns {Object} Test result
 */
function testUtilities() {
  try {
    const dateTest = DateUtils.formatUK(DateUtils.now());
    const stringTest = StringUtils.cleanPlayerName(' john  SMITH ');
    const validationTest = ValidationUtils.isValidMinute(45);
    
    return {
      success: dateTest && stringTest === 'John Smith' && validationTest === true,
      details: { dateTest, stringTest, validationTest }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Test logging functionality
 * @returns {Object} Test result
 */
function testLogging() {
  try {
    logger.info('Test log entry', { test: true });
    const stats = logger.getStats();
    
    return {
      success: !stats.error && typeof stats.session_entries === 'number',
      details: { session_id: stats.session_id, entries: stats.session_entries }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Test sheet operations
 * @returns {Object} Sheet test results
 */
function testSheetOperations() {
  try {
    const testSheetName = 'System Test Sheet';
    const testColumns = ['Test Column 1', 'Test Column 2', 'Test Column 3'];
    
    // Test sheet creation
    const sheet = SheetUtils.getOrCreateSheet(testSheetName, testColumns);
    if (!sheet) {
      return { success: false, error: 'Could not create test sheet' };
    }
    
    // Test data operations
    const testData = {
      'Test Column 1': 'Test Value 1',
      'Test Column 2': 'Test Value 2',
      'Test Column 3': 'Test Value 3'
    };
    
    const addResult = SheetUtils.addRowFromObject(sheet, testData);
    if (!addResult) {
      return { success: false, error: 'Could not add test row' };
    }
    
    // Test data retrieval
    const retrievedData = SheetUtils.getAllDataAsObjects(sheet);
    if (retrievedData.length === 0) {
      return { success: false, error: 'Could not retrieve test data' };
    }
    
    // Clean up test sheet
    try {
      SpreadsheetApp.getActiveSpreadsheet().deleteSheet(sheet);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    return {
      success: true,
      details: {
        sheet_created: true,
        data_added: true,
        data_retrieved: retrievedData.length > 0
      }
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Test batch fixtures functionality
 * @returns {Object} Test result
 */
function testBatchFixtures() {
  try {
    const result = initializeBatchFixtures();
    return {
      success: result.success,
      details: result
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Test player management functionality
 * @returns {Object} Test result
 */
function testPlayerManagement() {
  try {
    const result = initializePlayerManagement();
    return {
      success: result.success,
      details: result
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Test video clips functionality
 * @returns {Object} Test result
 */
function testVideoClips() {
  try {
    const result = initializeVideoClips();
    return {
      success: result.success,
      details: result
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Test weekly scheduler functionality
 * @returns {Object} Test result
 */
function testWeeklyScheduler() {
  try {
    const result = initializeWeeklyScheduler();
    return {
      success: result.success,
      details: result
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Test initialization guard handling for weekly automation wrapper
 * @returns {Object} Test result summarizing success and failure paths
 */
function testInitializationGuardForWeeklyAutomation() {
  const originalAutoInitializeIfNeeded = autoInitializeIfNeeded;
  const originalRunWeeklyScheduleAutomation = typeof runWeeklyScheduleAutomation === 'function'
    ? runWeeklyScheduleAutomation
    : null;
  const originalIsFeatureEnabled = isFeatureEnabled;

  let successAutomationExecuted = false;
  let failureAutomationExecuted = false;

  try {
    isFeatureEnabled = () => true;

    autoInitializeIfNeeded = () => ({ success: true });
    runWeeklyScheduleAutomation = forceRun => {
      successAutomationExecuted = true;
      return { success: true, forceRun };
    };

    const successResult = runWeeklyContentAutomation(true);

    autoInitializeIfNeeded = () => ({ success: false, error: 'Simulated initialization failure' });
    runWeeklyScheduleAutomation = () => {
      failureAutomationExecuted = true;
      return { success: true };
    };

    const failureResult = runWeeklyContentAutomation(true);

    const successCheck = successResult.success === true && successAutomationExecuted === true;
    const failureCheck = failureResult.success === false && failureResult.error === 'Initialization failed'
      && failureResult.details?.error === 'Simulated initialization failure'
      && failureAutomationExecuted === false;

    return {
      success: successCheck && failureCheck,
      details: {
        successResult,
        failureResult,
        successAutomationExecuted,
        failureAutomationExecuted
      }
    };

  } catch (error) {
    return { success: false, error: error.toString() };

  } finally {
    autoInitializeIfNeeded = originalAutoInitializeIfNeeded;
    if (originalRunWeeklyScheduleAutomation) {
      runWeeklyScheduleAutomation = originalRunWeeklyScheduleAutomation;
    } else {
      delete runWeeklyScheduleAutomation;
    }
    isFeatureEnabled = originalIsFeatureEnabled;
  }
}

/**
 * Test initialization guard handling for system health wrapper
 * @returns {Object} Test result summarizing guard behaviour
 */
function testInitializationGuardForSystemHealth() {
  const originalAutoInitializeIfNeeded = autoInitializeIfNeeded;
  const originalCheckSystemHealth = systemCoordinator.checkSystemHealth;

  let failureHealthCalled = false;
  let successHealthCalled = false;

  try {
    autoInitializeIfNeeded = () => ({ success: false, error: 'Simulated initialization failure' });
    systemCoordinator.checkSystemHealth = () => {
      failureHealthCalled = true;
      return { overall_status: 'healthy' };
    };

    const failureResult = performSystemHealthCheck();

    autoInitializeIfNeeded = () => ({ success: true });
    systemCoordinator.checkSystemHealth = () => {
      successHealthCalled = true;
      return { overall_status: 'healthy' };
    };

    const successResult = performSystemHealthCheck();

    const failureCheck = failureResult.success === false
      && failureResult.error === 'Initialization failed'
      && failureResult.details?.error === 'Simulated initialization failure'
      && failureHealthCalled === false;

    const successCheck = successResult.overall_status === 'healthy'
      && successHealthCalled === true;

    return {
      success: failureCheck && successCheck,
      details: {
        failureResult,
        successResult,
        failureHealthCalled,
        successHealthCalled
      }
    };

  } catch (error) {
    return { success: false, error: error.toString() };

  } finally {
    autoInitializeIfNeeded = originalAutoInitializeIfNeeded;
    systemCoordinator.checkSystemHealth = originalCheckSystemHealth;
  }
}

/**
 * Daily maintenance trigger handler
 * @returns {Object} Maintenance summary
 */
function dailyMaintenanceTasks() {
  logger.enterFunction('System.dailyMaintenanceTasks');

  try {
    const initResult = autoInitializeIfNeeded();
    if (initResult?.success === false) {
      logger.error('Initialization failed for daily maintenance wrapper', { details: initResult });
      const failureResult = {
        success: false,
        error: 'Initialization failed',
        details: initResult
      };
      logger.exitFunction('System.dailyMaintenanceTasks', {
        success: false,
        reason: 'initialization_failed'
      });
      return failureResult;
    }

    const maintenance = performSystemMaintenance();
    let weeklyResult = { success: true, skipped: true };

    if (isFeatureEnabled('WEEKLY_CONTENT_AUTOMATION')) {
      weeklyResult = runWeeklyContentAutomation();
    }

    const success = maintenance.success && (weeklyResult.success || weeklyResult.skipped);

    logger.exitFunction('System.dailyMaintenanceTasks', { success });

    return {
      success,
      maintenance,
      weekly_content: weeklyResult,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };

  } catch (error) {
    logger.error('Daily maintenance failed', { error: error.toString() });
    const failureResult = { success: false, error: error.toString() };
    logger.exitFunction('System.dailyMaintenanceTasks', {
      success: false,
      error: error.toString()
    });
    return failureResult;
  }
}

/**
 * Setup scheduled triggers for automation routines
 * @returns {Object} Trigger setup results
 */
function setupScheduledTriggers() {
  logger.enterFunction('System.setupScheduledTriggers');

  try {
    const initResult = autoInitializeIfNeeded();
    if (initResult?.success === false) {
      logger.error('Initialization failed for scheduled trigger setup wrapper', { details: initResult });
      const failureResult = {
        success: false,
        error: 'Initialization failed',
        details: initResult
      };
      logger.exitFunction('System.setupScheduledTriggers', {
        success: false,
        reason: 'initialization_failed'
      });
      return failureResult;
    }

    const results = {
      daily_maintenance: false,
      weekly_content: false,
      monthly_fixtures: false,
      monthly_results: false,
      player_stats: false,
      existing_triggers_cleaned: false
    };

    const handlersToManage = [
      'dailyMaintenanceTasks',
      'runWeeklyContentAutomation',
      'postMonthlyFixturesSummary',
      'postMonthlyResultsSummary',
      'postPlayerStatsSummary'
    ];

    ScriptApp.getProjectTriggers()
      .filter(trigger => handlersToManage.includes(trigger.getHandlerFunction()))
      .forEach(trigger => {
        ScriptApp.deleteTrigger(trigger);
      });
    results.existing_triggers_cleaned = true;

    ScriptApp.newTrigger('dailyMaintenanceTasks')
      .timeBased()
      .everyDays(1)
      .atHour(2)
      .create();
    results.daily_maintenance = true;

    if (isFeatureEnabled('WEEKLY_CONTENT_AUTOMATION')) {
      ScriptApp.newTrigger('runWeeklyContentAutomation')
        .timeBased()
        .everyDays(1)
        .atHour(8)
        .create();
      results.weekly_content = true;
    }

    if (isFeatureEnabled('MONTHLY_SUMMARIES')) {
      const fixturesConfig = getConfig('MONTHLY_CONTENT.FIXTURES_SUMMARY', {});
      const fixturesDay = (fixturesConfig && typeof fixturesConfig.post_date === 'number')
        ? fixturesConfig.post_date
        : 1;
      ScriptApp.newTrigger('postMonthlyFixturesSummary')
        .timeBased()
        .onMonthDay(Math.min(Math.max(fixturesDay, 1), 28))
        .atHour(9)
        .create();
      results.monthly_fixtures = true;

      const resultsConfig = getConfig('MONTHLY_CONTENT.RESULTS_SUMMARY', {});
      const resultsDay = (resultsConfig && typeof resultsConfig.post_date === 'number')
        ? resultsConfig.post_date
        : 28;
      ScriptApp.newTrigger('postMonthlyResultsSummary')
        .timeBased()
        .onMonthDay(Math.min(Math.max(resultsDay, 1), 28))
        .atHour(20)
        .create();
      results.monthly_results = true;
    }

    const statsConfig = getConfig('MONTHLY_CONTENT.PLAYER_STATS', {});
    if (!statsConfig || statsConfig.enabled !== false) {
      const statsDay = (statsConfig && typeof statsConfig.post_date === 'number')
        ? statsConfig.post_date
        : 14;
      ScriptApp.newTrigger('postPlayerStatsSummary')
        .timeBased()
        .onMonthDay(Math.min(Math.max(statsDay, 1), 28))
        .atHour(10)
        .create();
      results.player_stats = true;
    }

    logger.exitFunction('System.setupScheduledTriggers', { success: true });
    return { success: true, results };

  } catch (error) {
    logger.error('Trigger setup failed', { error: error.toString() });
    const failureResult = { success: false, error: error.toString() };
    logger.exitFunction('System.setupScheduledTriggers', {
      success: false,
      error: error.toString()
    });
    return failureResult;
  }
}

// ==================== MAINTENANCE FUNCTIONS ====================

/**
 * Perform system maintenance
 * @returns {Object} Maintenance result
 */
function performSystemMaintenance() {
  logger.enterFunction('System.performSystemMaintenance');
  
  try {
    const maintenanceResult = {
      success: true,
      tasks_completed: [],
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
    // Clean old logs
    try {
      scheduledLogCleanup();
      maintenanceResult.tasks_completed.push('log_cleanup');
    } catch (error) {
      logger.warn('Log cleanup failed during maintenance', { error: error.toString() });
    }
    
    // Health check
    try {
      const health = systemCoordinator.checkSystemHealth();
      maintenanceResult.system_health = health.overall_status;
      maintenanceResult.tasks_completed.push('health_check');
    } catch (error) {
      logger.warn('Health check failed during maintenance', { error: error.toString() });
    }
    
    // Update metrics
    try {
      const metrics = systemCoordinator.getSystemMetrics();
      maintenanceResult.current_metrics = metrics;
      maintenanceResult.tasks_completed.push('metrics_update');
    } catch (error) {
      logger.warn('Metrics update failed during maintenance', { error: error.toString() });
    }
    
    logger.exitFunction('System.performSystemMaintenance', { 
      success: true,
      tasks: maintenanceResult.tasks_completed.length
    });
    
    return maintenanceResult;
    
  } catch (error) {
    logger.error('System maintenance failed', { error: error.toString() });
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}

/**
 * Emergency system reset
 * @returns {Object} Reset result
 */
function emergencySystemReset() {
  logger.enterFunction('System.emergencySystemReset');
  
  try {
    logger.warn('Emergency system reset initiated');
    
    // Reset system state
    systemCoordinator.initialized = false;
    systemCoordinator.healthStatus = 'unknown';
    systemCoordinator.components.clear();
    
    // Reinitialize system
    const initResult = systemCoordinator.initializeSystem(true);
    
    logger.exitFunction('System.emergencySystemReset', { 
      success: initResult.success 
    });
    
    return {
      success: initResult.success,
      message: 'Emergency reset completed',
      init_result: initResult,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
  } catch (error) {
    logger.error('Emergency reset failed', { error: error.toString() });
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}

// ==================== STARTUP SEQUENCE ====================

/**
 * Auto-initialize system on first function call
 */
function autoInitializeIfNeeded() {
  if (!systemCoordinator.initialized) {
    logger.info('Auto-initializing system on first use');
    return systemCoordinator.initializeSystem();
  }
  return { success: true, message: 'System already initialized' };
}

// ==================== EXPORT FOR TESTING ====================

/**
 * Export system coordinator for testing (testing only)
 * @returns {SystemCoordinator} System coordinator instance
 */
function getSystemCoordinator() {
  return systemCoordinator;
}
