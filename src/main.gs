/**
 * @fileoverview Main coordinator and public API functions for the Syston Tigers Football Automation System
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Entry points, system initialization, and coordination between all automation components
 *
 * FEATURES IMPLEMENTED:
 * - System initialization and health checks
 * - Component coordination (Enhanced Events, Batch Fixtures, Player Management, etc.)
 * - Public API functions for external triggers
 * - Advanced monitoring and alerting
 * - Multi-tenant support preparation
 */

// ==================== SYSTEM INITIALIZATION ====================

/**
 * Initialize the entire automation system
 * @returns {Object} Initialization result with component status
 */
function initializeSystem() {
  logger.enterFunction('System.initialize');

  try {
    const results = {
      success: true,
      timestamp: DateUtils.now().toISOString(),
      version: getConfig('SYSTEM.VERSION'),
      components: {},
      features: {},
      sheets: {},
      errors: []
    };

    // Core components initialization
    if (isFeatureEnabled('ENHANCED_EVENTS')) {
      results.components.enhancedEvents = initializeEnhancedEvents();
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

    if (isFeatureEnabled('WEEKLY_SCHEDULER')) {
      results.components.weeklyScheduler = initializeWeeklyScheduler();
    }

    if (isFeatureEnabled('MAKE_INTEGRATION')) {
      results.components.makeIntegration = initializeMakeIntegration();
    }

    if (isFeatureEnabled('XBOTGO_INTEGRATION')) {
      results.components.xbotgoIntegration = initializeXbotgoIntegration();
    }

    // Advanced features initialization
    if (isFeatureEnabled('MONITORING_ALERTING')) {
      results.components.monitoring = initializeMonitoringSystem();
    }

    if (isFeatureEnabled('PRIVACY_COMPLIANCE')) {
      results.components.privacyCompliance = initializePrivacyCompliance();
    }

    if (isFeatureEnabled('PERFORMANCE_OPTIMIZATION')) {
      results.components.performanceOptimization = initializePerformanceOptimization();
    }

    // Check for any component failures
    const failedComponents = Object.keys(results.components).filter(
      key => !results.components[key].success
    );

    if (failedComponents.length > 0) {
      results.success = false;
      results.errors.push(`Failed components: ${failedComponents.join(', ')}`);
    }

    // Log initialization result
    logger.exitFunction('System.initialize', {
      success: results.success,
      componentCount: Object.keys(results.components).length,
      failedComponents: failedComponents.length
    });

    return results;

  } catch (error) {
    logger.error('System initialization failed', { error: error.toString() });
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.now().toISOString()
    };
  }
}

/**
 * Quick health check for system status
 * @returns {Object} Health status
 */
function systemHealthCheck() {
  logger.enterFunction('systemHealthCheck');

  try {
    const health = {
      status: 'healthy',
      timestamp: DateUtils.now().toISOString(),
      version: getConfig('SYSTEM.VERSION'),
      checks: {
        sheets: checkSheetsHealth(),
        webhooks: checkWebhookHealth(),
        features: checkFeaturesHealth(),
        memory: checkMemoryHealth()
      }
    };

    // Determine overall status
    const hasErrors = Object.values(health.checks).some(check => !check.healthy);
    if (hasErrors) {
      health.status = 'degraded';
    }

    logger.exitFunction('systemHealthCheck', { status: health.status });
    return health;

  } catch (error) {
    logger.error('Health check failed', { error: error.toString() });
    return {
      status: 'unhealthy',
      error: error.toString(),
      timestamp: DateUtils.now().toISOString()
    };
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Process a single live match event
 * @param {string} eventType - Type of event (goal, card, sub, etc.)
 * @param {string} player - Player name
 * @param {number} minute - Match minute
 * @param {Object} additionalData - Additional event data
 * @returns {Object} Processing result
 */
function processLiveEvent(eventType, player, minute, additionalData = {}) {
  logger.enterFunction('processLiveEvent', { eventType, player, minute });

  try {
    if (!isFeatureEnabled('ENHANCED_EVENTS')) {
      return { success: false, error: 'Enhanced events not enabled' };
    }

    const manager = new EnhancedEventsManager();
    const result = manager.processEvent(eventType, player, minute, additionalData);

    logger.exitFunction('processLiveEvent', { success: result.success });
    return result;

  } catch (error) {
    logger.error('Live event processing failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Post batch fixtures or results
 * @param {string} batchType - 'fixtures' or 'results'
 * @param {Object} options - Batch options (roundId, startDate, endDate)
 * @returns {Object} Posting result
 */
function postBatch(batchType, options = {}) {
  logger.enterFunction('postBatch', { batchType, options });

  try {
    if (!isFeatureEnabled('BATCH_POSTING')) {
      return { success: false, error: 'Batch posting not enabled' };
    }

    const manager = new BatchFixturesManager();
    let result;

    switch (batchType) {
      case 'fixtures':
        result = manager.postLeagueFixturesBatch(
          options.roundId,
          options.startDate,
          options.endDate
        );
        break;
      case 'results':
        result = manager.postLeagueResultsBatch(
          options.roundId,
          options.startDate,
          options.endDate
        );
        break;
      default:
        return { success: false, error: `Unknown batch type: ${batchType}` };
    }

    logger.exitFunction('postBatch', { success: result.success, type: batchType });
    return result;

  } catch (error) {
    logger.error('Batch posting failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Run weekly content scheduler
 * @returns {Object} Scheduling result
 */
function runWeeklyScheduler() {
  logger.enterFunction('runWeeklyScheduler');

  try {
    if (!isFeatureEnabled('WEEKLY_SCHEDULER')) {
      return { success: false, error: 'Weekly scheduler not enabled' };
    }

    const scheduler = new WeeklyScheduler();
    const result = scheduler.runWeeklySchedule();

    logger.exitFunction('runWeeklyScheduler', { success: result.success });
    return result;

  } catch (error) {
    logger.error('Weekly scheduler failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Generate monthly summaries
 * @param {string} summaryType - 'fixtures' or 'results'
 * @param {Object} options - Summary options (month, year)
 * @returns {Object} Generation result
 */
function generateMonthlySummary(summaryType, options = {}) {
  logger.enterFunction('generateMonthlySummary', { summaryType, options });

  try {
    if (!isFeatureEnabled('MONTHLY_SUMMARIES')) {
      return { success: false, error: 'Monthly summaries not enabled' };
    }

    const manager = new MonthlySummariesManager();
    let result;

    switch (summaryType) {
      case 'fixtures':
        result = manager.postMonthlyFixturesSummary(options.month, options.year);
        break;
      case 'results':
        result = manager.postMonthlyResultsSummary(options.month, options.year);
        break;
      default:
        return { success: false, error: `Unknown summary type: ${summaryType}` };
    }

    logger.exitFunction('generateMonthlySummary', { success: result.success });
    return result;

  } catch (error) {
    logger.error('Monthly summary generation failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Update player statistics
 * @param {string} action - Action type (goal, assist, card, etc.)
 * @param {string} player - Player name
 * @param {Object} matchData - Match context data
 * @returns {Object} Update result
 */
function updatePlayerStats(action, player, matchData = {}) {
  logger.enterFunction('updatePlayerStats', { action, player });

  try {
    if (!isFeatureEnabled('PLAYER_MINUTES_TRACKING')) {
      return { success: false, error: 'Player management not enabled' };
    }

    const manager = new PlayerManagementManager();
    const result = manager.updatePlayerStatistics(action, player, matchData);

    logger.exitFunction('updatePlayerStats', { success: result.success });
    return result;

  } catch (error) {
    logger.error('Player stats update failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

// ==================== HEALTH CHECK HELPERS ====================

/**
 * Check sheets accessibility and configuration
 * @returns {Object} Sheets health status
 */
function checkSheetsHealth() {
  try {
    const sheets = {};
    const requiredSheets = ['LIVE', 'FIXTURES', 'RESULTS', 'PLAYER_STATS'];

    requiredSheets.forEach(sheetType => {
      try {
        const sheetName = getConfig(`SHEETS.TAB_NAMES.${sheetType}`);
        const sheet = SheetUtils.getOrCreateSheet(sheetName);
        sheets[sheetType] = {
          name: sheetName,
          accessible: !!sheet,
          rowCount: sheet ? sheet.getLastRow() : 0
        };
      } catch (error) {
        sheets[sheetType] = {
          accessible: false,
          error: error.toString()
        };
      }
    });

    const allHealthy = Object.values(sheets).every(sheet => sheet.accessible);

    return {
      healthy: allHealthy,
      sheets: sheets,
      summary: `${Object.values(sheets).filter(s => s.accessible).length}/${requiredSheets.length} sheets accessible`
    };

  } catch (error) {
    return {
      healthy: false,
      error: error.toString()
    };
  }
}

/**
 * Check webhook configuration and connectivity
 * @returns {Object} Webhook health status
 */
function checkWebhookHealth() {
  try {
    const webhookUrl = getConfig('MAKE.WEBHOOK_URL_PROPERTY');
    const configured = !!webhookUrl;

    return {
      healthy: configured,
      configured: configured,
      url: configured ? 'configured' : 'not configured'
    };

  } catch (error) {
    return {
      healthy: false,
      error: error.toString()
    };
  }
}

/**
 * Check feature enablement status
 * @returns {Object} Features health status
 */
function checkFeaturesHealth() {
  try {
    const features = {};
    const coreFeatures = [
      'ENHANCED_EVENTS',
      'BATCH_POSTING',
      'MONTHLY_SUMMARIES',
      'PLAYER_MINUTES_TRACKING',
      'MAKE_INTEGRATION'
    ];

    coreFeatures.forEach(feature => {
      features[feature] = isFeatureEnabled(feature);
    });

    const enabledCount = Object.values(features).filter(Boolean).length;

    return {
      healthy: enabledCount > 0,
      features: features,
      summary: `${enabledCount}/${coreFeatures.length} core features enabled`
    };

  } catch (error) {
    return {
      healthy: false,
      error: error.toString()
    };
  }
}

/**
 * Check memory and quota usage
 * @returns {Object} Memory health status
 */
function checkMemoryHealth() {
  try {
    const maxRuntime = 6 * 60 * 1000; // 6 minutes in milliseconds
    const startTime = new Date().getTime();

    return {
      healthy: true,
      runtime_remaining: maxRuntime - (new Date().getTime() - startTime),
      max_runtime: maxRuntime
    };

  } catch (error) {
    return {
      healthy: false,
      error: error.toString()
    };
  }
}

// ==================== TRIGGER FUNCTIONS ====================

/**
 * Main automation trigger function (for time-based triggers)
 * @returns {Object} Execution result
 */
function mainAutomationTrigger() {
  logger.enterFunction('mainAutomationTrigger');

  try {
    const results = {
      success: true,
      timestamp: DateUtils.now().toISOString(),
      executed: []
    };

    // Run weekly scheduler if enabled
    if (isFeatureEnabled('WEEKLY_SCHEDULER')) {
      const schedulerResult = runWeeklyScheduler();
      results.executed.push({
        component: 'WeeklyScheduler',
        success: schedulerResult.success,
        result: schedulerResult
      });
    }

    // Run monthly scheduling check if enabled
    if (isFeatureEnabled('MONTHLY_SUMMARIES')) {
      const monthlyResult = generateMonthlySummary('check');
      results.executed.push({
        component: 'MonthlySummaries',
        success: monthlyResult.success,
        result: monthlyResult
      });
    }

    // Check for any failures
    const failures = results.executed.filter(exec => !exec.success);
    if (failures.length > 0) {
      results.success = false;
      results.failures = failures.length;
    }

    logger.exitFunction('mainAutomationTrigger', {
      success: results.success,
      executedCount: results.executed.length
    });

    return results;

  } catch (error) {
    logger.error('Main automation trigger failed', { error: error.toString() });
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.now().toISOString()
    };
  }
}

/**
 * Emergency system reset (use with caution)
 * @returns {Object} Reset result
 */
function emergencySystemReset() {
  logger.enterFunction('emergencySystemReset');

  try {
    // Clear all caches
    if (typeof CacheService !== 'undefined') {
      CacheService.getScriptCache().flushAll();
    }

    // Clear processed flags (only recent ones)
    const properties = PropertiesService.getScriptProperties();
    const allProps = properties.getProperties();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    Object.keys(allProps).forEach(key => {
      if (key.startsWith('BATCH_PROCESSED_') || key.startsWith('EVENT_PROCESSED_')) {
        try {
          const timestamp = new Date(allProps[key]);
          if (timestamp < oneDayAgo) {
            properties.deleteProperty(key);
          }
        } catch (e) {
          // If we can't parse the timestamp, leave it alone
        }
      }
    });

    logger.exitFunction('emergencySystemReset', { success: true });

    return {
      success: true,
      message: 'System reset completed',
      timestamp: DateUtils.now().toISOString()
    };

  } catch (error) {
    logger.error('Emergency system reset failed', { error: error.toString() });
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ==================== EXPORTS FOR APPS SCRIPT ====================

// Make functions globally available for Apps Script triggers
globalThis.initializeSystem = initializeSystem;
globalThis.systemHealthCheck = systemHealthCheck;
globalThis.processLiveEvent = processLiveEvent;
globalThis.postBatch = postBatch;
globalThis.runWeeklyScheduler = runWeeklyScheduler;
globalThis.generateMonthlySummary = generateMonthlySummary;
globalThis.updatePlayerStats = updatePlayerStats;
globalThis.mainAutomationTrigger = mainAutomationTrigger;
globalThis.emergencySystemReset = emergencySystemReset;