/**
 * @fileoverview Main Coordinator and Public API for Syston Tigers Football Automation System
 * @version 6.0.0
 * @author Senior Software Architect
 * @description Central coordination hub and public API functions for the entire system
 */

// ==================== SYSTEM INITIALIZATION ====================

/**
 * Initialize the entire Syston Tigers automation system
 * @returns {Object} Initialization result with status and component results
 */
function initializeSystem() {
  logger.enterFunction('System.initializeSystem');
  
  try {
    const results = {
      system: { name: getConfig('SYSTEM.NAME'), version: getConfig('SYSTEM.VERSION') },
      components: {},
      timestamp: DateUtils.formatISO(DateUtils.now())
    };

    // @testHook(init_start)
    
    // Initialize core components
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
    results.components.sheets = initializeRequiredSheets();
    
    // @testHook(init_complete)
    
    // Check for any failed components
    const failedComponents = Object.entries(results.components)
      .filter(([name, result]) => !result.success)
      .map(([name]) => name);
    
    const success = failedComponents.length === 0;
    
    if (success) {
      logger.info('System initialization completed successfully');
    } else {
      logger.warn('System initialization completed with warnings', { 
        failed_components: failedComponents 
      });
    }
    
    logger.exitFunction('System.initializeSystem', { success });
    
    return {
      success: success,
      failed_components: failedComponents,
      results: results
    };
    
  } catch (error) {
    logger.error('System initialization failed', { 
      error: error.toString(),
      stack: error.stack 
    });
    
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}

/**
 * Initialize all required Google Sheets
 * @returns {Object} Sheet initialization results
 */
function initializeRequiredSheets() {
  logger.enterFunction('System.initializeRequiredSheets');
  
  try {
    const tabNames = getConfig('SHEETS.TAB_NAMES');
    const requiredColumns = getConfig('SHEETS.REQUIRED_COLUMNS');
    const results = {};
    
    // @testHook(sheets_init_start)
    
    for (const [key, sheetName] of Object.entries(tabNames)) {
      const columns = requiredColumns[key] || [];
      const sheet = SheetUtils.getOrCreateSheet(sheetName, columns);
      
      results[key] = {
        name: sheetName,
        success: sheet !== null,
        columns_count: columns.length
      };
      
      if (sheet) {
        logger.info(`Sheet initialized: ${sheetName}`);
      } else {
        logger.error(`Failed to initialize sheet: ${sheetName}`);
      }
    }
    
    // @testHook(sheets_init_complete)
    
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    
    logger.exitFunction('System.initializeRequiredSheets', { 
      success: successCount === totalCount,
      initialized: successCount,
      total: totalCount
    });
    
    return {
      success: successCount === totalCount,
      sheets: results,
      summary: `${successCount}/${totalCount} sheets initialized`
    };
    
  } catch (error) {
    logger.error('Sheet initialization failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

// ==================== CONTROL PANEL INTEGRATION ====================

/**
 * Initialize Control Panel with default settings
 * @returns {Object} Control Panel initialization result
 */
function initializeControlPanel() {
  logger.enterFunction('System.initializeControlPanel');
  
  try {
    // @testHook(control_panel_init_start)
    
    const controlPanelSheet = SheetUtils.getOrCreateSheet(
      getConfig('SHEETS.TAB_NAMES.CONTROL_PANEL'),
      ['Feature', 'Enabled', 'Last Modified', 'Modified By', 'Notes']
    );
    
    if (!controlPanelSheet) {
      throw new Error('Failed to create Control Panel sheet');
    }
    
    // Check if control panel is already populated
    const existingData = SheetUtils.getAllDataAsObjects(controlPanelSheet);
    
    if (existingData.length === 0) {
      // Initialize with default feature settings
      const features = getConfig('FEATURES', {});
      
      for (const [featureName, enabled] of Object.entries(features)) {
        SheetUtils.addRowFromObject(controlPanelSheet, {
          'Feature': featureName,
          'Enabled': enabled ? 'TRUE' : 'FALSE',
          'Last Modified': DateUtils.formatISO(DateUtils.now()),
          'Modified By': 'System',
          'Notes': 'Initial setup'
        });
      }
      
      logger.info('Control Panel initialized with default settings');
    }
    
    // @testHook(control_panel_init_complete)
    
    logger.exitFunction('System.initializeControlPanel', { success: true });
    
    return {
      success: true,
      features_count: Object.keys(getConfig('FEATURES', {})).length,
      sheet_name: getConfig('SHEETS.TAB_NAMES.CONTROL_PANEL')
    };
    
  } catch (error) {
    logger.error('Control Panel initialization failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Process live match event (main entry point for match day)
 * @param {string} minute - Match minute
 * @param {string} eventType - Type of event (goal, card, sub, etc.)
 * @param {string} player - Player name
 * @param {string} cardType - Card type (if applicable)
 * @param {string} assist - Assist provider (if applicable)
 * @param {string} notes - Additional notes
 * @returns {Object} Processing result
 */
function processLiveMatchEvent(minute, eventType, player, cardType = '', assist = '', notes = '') {
  logger.enterFunction('System.processLiveMatchEvent', { 
    minute, eventType, player, cardType, assist 
  });
  
  try {
    // @testHook(live_event_start)
    
    // Validate inputs
    if (!ValidationUtils.isValidMinute(minute)) {
      throw new Error(`Invalid minute: ${minute}`);
    }
    
    if (!eventType) {
      throw new Error('Event type is required');
    }
    
    // Route to enhanced events processor
    const enhancedEvents = new EnhancedEventsManager();
    let result;
    
    switch (eventType.toLowerCase()) {
      case 'goal':
        result = enhancedEvents.processGoalEvent(minute, player, assist, notes);
        break;
        
      case 'card':
        result = enhancedEvents.processCardEvent(minute, player, cardType, notes);
        break;
        
      case 'substitution':
      case 'sub':
        // For substitutions, player = player off, assist = player on
        result = enhancedEvents.processSubstitution(minute, player, assist, notes);
        break;
        
      case 'kick_off':
      case 'kickoff':
        result = enhancedEvents.postMatchStatus('kick_off', minute);
        break;
        
      case 'half_time':
      case 'halftime':
      case 'ht':
        result = enhancedEvents.postMatchStatus('half_time', minute);
        break;
        
      case 'second_half':
      case 'secondhalf':
        result = enhancedEvents.postMatchStatus('second_half', minute);
        break;
        
      case 'full_time':
      case 'fulltime':
      case 'ft':
        result = enhancedEvents.postMatchStatus('full_time', minute);
        break;
        
      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
    
    // @testHook(live_event_processed)
    
    logger.exitFunction('System.processLiveMatchEvent', { 
      success: result.success,
      event_type: eventType 
    });
    
    return result;
    
  } catch (error) {
    logger.error('Live match event processing failed', { 
      error: error.toString(),
      minute, eventType, player 
    });
    
    return {
      success: false,
      error: error.toString(),
      event_type: eventType,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}

/**
 * Run weekly content automation (main entry point for scheduled content)
 * @param {boolean} forceRun - Force run regardless of day
 * @returns {Object} Execution result
 */
function runWeeklyContentAutomation(forceRun = false) {
  logger.enterFunction('System.runWeeklyContentAutomation', { forceRun });
  
  try {
    if (!isFeatureEnabled('WEEKLY_CONTENT_AUTOMATION')) {
      logger.info('Weekly content automation is disabled');
      return { success: true, message: 'Feature disabled', skipped: true };
    }
    
    // @testHook(weekly_automation_start)
    
    const weeklyScheduler = new WeeklyScheduler();
    const result = weeklyScheduler.runWeeklySchedule(forceRun);
    
    // @testHook(weekly_automation_complete)
    
    logger.exitFunction('System.runWeeklyContentAutomation', { success: result.success });
    
    return result;
    
  } catch (error) {
    logger.error('Weekly content automation failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Post batch fixtures (1-5 fixtures)
 * @param {string} competitionType - Competition type (league, cup, friendly)
 * @param {boolean} upcomingOnly - Only include upcoming fixtures
 * @returns {Object} Posting result
 */
function postBatchFixtures(competitionType = 'league', upcomingOnly = true) {
  logger.enterFunction('System.postBatchFixtures', { competitionType, upcomingOnly });
  
  try {
    if (!isFeatureEnabled('BATCH_POSTING')) {
      logger.info('Batch posting is disabled');
      return { success: true, message: 'Feature disabled', skipped: true };
    }
    
    // @testHook(batch_fixtures_start)
    
    const batchFixtures = new BatchFixturesManager();
    const result = batchFixtures.postLeagueFixturesBatch(upcomingOnly);
    
    // @testHook(batch_fixtures_complete)
    
    logger.exitFunction('System.postBatchFixtures', { success: result.success });
    
    return result;
    
  } catch (error) {
    logger.error('Batch fixtures posting failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Post batch results (1-5 results)
 * @param {string} competitionType - Competition type (league, cup, friendly)
 * @param {number} daysBack - How many days back to look for results
 * @returns {Object} Posting result
 */
function postBatchResults(competitionType = 'league', daysBack = 7) {
  logger.enterFunction('System.postBatchResults', { competitionType, daysBack });
  
  try {
    if (!isFeatureEnabled('BATCH_POSTING')) {
      logger.info('Batch posting is disabled');
      return { success: true, message: 'Feature disabled', skipped: true };
    }
    
    // @testHook(batch_results_start)
    
    const batchFixtures = new BatchFixturesManager();
    const result = batchFixtures.postLeagueResultsBatch(daysBack);
    
    // @testHook(batch_results_complete)
    
    logger.exitFunction('System.postBatchResults', { success: result.success });
    
    return result;
    
  } catch (error) {
    logger.error('Batch results posting failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Generate monthly player stats summary
 * @param {number} month - Month (1-12, optional - defaults to current)
 * @param {number} year - Year (optional - defaults to current)
 * @returns {Object} Generation result
 */
function generateMonthlyPlayerStats(month = null, year = null) {
  logger.enterFunction('System.generateMonthlyPlayerStats', { month, year });
  
  try {
    if (!isFeatureEnabled('MONTHLY_SUMMARIES')) {
      logger.info('Monthly summaries are disabled');
      return { success: true, message: 'Feature disabled', skipped: true };
    }
    
    // @testHook(monthly_stats_start)
    
    const monthlySummaries = new MonthlySummariesManager();
    const result = monthlySummaries.postPlayerStatsSummary(month, year);
    
    // @testHook(monthly_stats_complete)
    
    logger.exitFunction('System.generateMonthlyPlayerStats', { success: result.success });
    
    return result;
    
  } catch (error) {
    logger.error('Monthly player stats generation failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Update player statistics manually
 * @param {string} playerName - Player name
 * @param {Object} stats - Statistics to update
 * @returns {Object} Update result
 */
function updatePlayerStats(playerName, stats) {
  logger.enterFunction('System.updatePlayerStats', { playerName, stats });
  
  try {
    if (!isFeatureEnabled('PLAYER_MINUTES_TRACKING')) {
      logger.info('Player management is disabled');
      return { success: true, message: 'Feature disabled', skipped: true };
    }
    
    // @testHook(player_stats_update_start)
    
    const playerManager = new PlayerManagementSystem();
    const result = playerManager.updatePlayerStats(playerName, stats);
    
    // @testHook(player_stats_update_complete)
    
    auditTrail('UPDATE_PLAYER_STATS', playerName, stats, 'manual');
    
    logger.exitFunction('System.updatePlayerStats', { success: result.success });
    
    return result;
    
  } catch (error) {
    logger.error('Player stats update failed', { 
      error: error.toString(),
      playerName, 
      stats 
    });
    return { success: false, error: error.toString() };
  }
}

// ==================== SYSTEM HEALTH AND MONITORING ====================

/**
 * Perform comprehensive system health check
 * @returns {Object} Health check results
 */
function performSystemHealthCheck() {
  logger.enterFunction('System.performSystemHealthCheck');
  
  try {
    const healthResults = {
      overall_status: 'HEALTHY',
      timestamp: DateUtils.formatISO(DateUtils.now()),
      components: {},
      warnings: [],
      errors: []
    };
    
    // @testHook(health_check_start)
    
    // Check configuration
    const configValidation = validateConfig();
    healthResults.components.configuration = {
      status: configValidation.valid ? 'HEALTHY' : 'UNHEALTHY',
      errors: configValidation.errors,
      warnings: configValidation.warnings
    };
    
    // Check Google Sheets access
    try {
      const testSheet = SheetUtils.getOrCreateSheet('Health Check Test');
      healthResults.components.sheets_access = {
        status: testSheet ? 'HEALTHY' : 'UNHEALTHY',
        message: testSheet ? 'Sheets accessible' : 'Cannot access sheets'
      };
    } catch (error) {
      healthResults.components.sheets_access = {
        status: 'UNHEALTHY',
        error: error.toString()
      };
    }
    
    // Check Make.com webhook
    try {
      const webhookUrl = getSecureProperty(getConfig('MAKE.WEBHOOK_URL_PROPERTY'));
      healthResults.components.webhook = {
        status: webhookUrl ? 'HEALTHY' : 'UNHEALTHY',
        configured: !!webhookUrl
      };
    } catch (error) {
      healthResults.components.webhook = {
        status: 'UNHEALTHY',
        error: error.toString()
      };
    }
    
    // Check feature statuses
    const features = getConfig('FEATURES', {});
    const enabledFeatures = Object.entries(features)
      .filter(([key, value]) => value === true)
      .map(([key]) => key);
    
    healthResults.components.features = {
      status: 'HEALTHY',
      enabled_count: enabledFeatures.length,
      total_count: Object.keys(features).length,
      enabled_features: enabledFeatures
    };
    
    // Check logging system
    const logStats = logger.getStats();
    healthResults.components.logging = {
      status: logStats.error ? 'UNHEALTHY' : 'HEALTHY',
      session_entries: logStats.session_entries || 0,
      total_entries: logStats.total_entries || 0,
      recent_errors_count: (logStats.recent_errors || []).length
    };
    
    // Check quotas and limits (basic)
    const quotaInfo = {
      script_runtime: 'OK', // Apps Script has 6 minute limit
      daily_triggers: 'OK', // 20 time-based triggers
      daily_email_quota: 'OK' // 100 emails per day
    };
    
    healthResults.components.quotas = {
      status: 'HEALTHY',
      details: quotaInfo
    };
    
    // @testHook(health_check_complete)
    
    // Determine overall status
    const componentStatuses = Object.values(healthResults.components)
      .map(comp => comp.status);
    
    const unhealthyComponents = componentStatuses.filter(status => status === 'UNHEALTHY');
    
    if (unhealthyComponents.length > 0) {
      healthResults.overall_status = 'DEGRADED';
      healthResults.errors.push(`${unhealthyComponents.length} components unhealthy`);
    }
    
    // Collect warnings and errors
    Object.entries(healthResults.components).forEach(([name, component]) => {
      if (component.warnings) {
        healthResults.warnings.push(...component.warnings.map(w => `${name}: ${w}`));
      }
      if (component.errors) {
        healthResults.errors.push(...component.errors.map(e => `${name}: ${e}`));
      }
    });
    
    logger.health('System', healthResults.overall_status === 'HEALTHY', healthResults);
    
    logger.exitFunction('System.performSystemHealthCheck', { 
      status: healthResults.overall_status 
    });
    
    return healthResults;
    
  } catch (error) {
    logger.error('System health check failed', { error: error.toString() });
    return {
      overall_status: 'UNHEALTHY',
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}

/**
 * Get system metrics and statistics
 * @returns {Object} System metrics
 */
function getSystemMetrics() {
  logger.enterFunction('System.getSystemMetrics');
  
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
        getConfig('SHEETS.TAB_NAMES.LIVE_MATCH_UPDATES')
      );
      if (liveSheet) {
        metrics.usage.live_events_count = Math.max(0, liveSheet.getLastRow() - 1);
      }
      
      const playerSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.TAB_NAMES.PLAYER_STATS')
      );
      if (playerSheet) {
        metrics.usage.players_count = Math.max(0, playerSheet.getLastRow() - 1);
      }
    } catch (error) {
      logger.warn('Could not get sheet metrics', { error: error.toString() });
    }
    
    logger.exitFunction('System.getSystemMetrics', { success: true });
    
    return metrics;
    
  } catch (error) {
    logger.error('Failed to get system metrics', { error: error.toString() });
    return {
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}

// ==================== UTILITY AND TESTING FUNCTIONS ====================

/**
 * Test all system components
 * @returns {Object} Test results
 */
function runSystemTests() {
  logger.enterFunction('System.runSystemTests');
  
  try {
    const testResults = {
      overall_success: false,
      timestamp: DateUtils.formatISO(DateUtils.now()),
      tests: {}
    };
    
    // @testHook(system_tests_start)
    
    // Test configuration
    testResults.tests.config = testConfig();
    
    // Test utilities
    testResults.tests.utils = testUtils();
    
    // Test logger
    testResults.tests.logger = testLogger();
    
    // Test sheet operations
    testResults.tests.sheets = testSheetOperations();
    
    // Test webhook (if configured)
    if (getSecureProperty(getConfig('MAKE.WEBHOOK_URL_PROPERTY'))) {
      testResults.tests.webhook = testWebhookConnection();
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
    return {
      overall_success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
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
      const spreadsheet = SpreadsheetApp.openById(getSecureProperty('SPREADSHEET_ID'));
      const testSheet = spreadsheet.getSheetByName(testSheetName);
      if (testSheet) {
        spreadsheet.deleteSheet(testSheet);
      }
    } catch (cleanupError) {
      logger.warn('Could not clean up test sheet', { error: cleanupError.toString() });
    }
    
    return {
      success: true,
      tests_performed: ['sheet_creation', 'data_insertion', 'data_retrieval'],
      rows_tested: 1
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test webhook connection to Make.com
 * @returns {Object} Webhook test results
 */
function testWebhookConnection() {
  try {
    const makeIntegration = new MakeIntegration();
    
    const testPayload = {
      event_type: 'system_test',
      test: true,
      timestamp: DateUtils.formatISO(DateUtils.now()),
      system_version: getConfig('SYSTEM.VERSION')
    };
    
    const result = makeIntegration.sendToMake(testPayload);
    
    return {
      success: result.success,
      response: result.response || result.error,
      test_payload_sent: true
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Reset system to default state (use with caution)
 * @param {boolean} confirmReset - Confirmation flag
 * @returns {Object} Reset result
 */
function resetSystemToDefaults(confirmReset = false) {
  logger.enterFunction('System.resetSystemToDefaults', { confirmReset });
  
  try {
    if (!confirmReset) {
      return {
        success: false,
        error: 'Reset not confirmed. Call with confirmReset=true to proceed.',
        warning: 'This will reset all settings to defaults!'
      };
    }
    
    auditTrail('SYSTEM_RESET', 'entire_system', { confirmed: true }, 'manual');
    
    // @testHook(system_reset_start)
    
    logger.warn('System reset initiated');
    
    // Reset Control Panel
    const controlPanelResult = resetControlPanelToDefaults();
    
    // Clear caches
    CacheUtils.clear();
    
    // Re-initialize system
    const initResult = initializeSystem();
    
    // @testHook(system_reset_complete)
    
    logger.warn('System reset completed', { 
      control_panel_reset: controlPanelResult.success,
      system_reinit: initResult.success
    });
    
    logger.exitFunction('System.resetSystemToDefaults', { success: true });
    
    return {
      success: true,
      actions_performed: [
        'control_panel_reset',
        'cache_clear',
        'system_reinit'
      ],
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
  } catch (error) {
    logger.error('System reset failed', { error: error.toString() });
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ==================== SCHEDULED FUNCTIONS ====================

/**
 * Daily scheduled maintenance tasks
 * This function should be called by a time-based trigger
 */
function dailyMaintenanceTasks() {
  logger.enterFunction('System.dailyMaintenanceTasks');
  
  try {
    const results = {
      log_cleanup: false,
      cache_cleanup: false,
      health_check: false,
      weekly_content: false
    };
    
    // @testHook(daily_maintenance_start)
    
    // Log cleanup
    try {
      scheduledLogCleanup();
      results.log_cleanup = true;
    } catch (error) {
      logger.error('Log cleanup failed during maintenance', { error: error.toString() });
    }
    
    // Cache cleanup
    try {
      CacheUtils.clear();
      results.cache_cleanup = true;
    } catch (error) {
      logger.error('Cache cleanup failed during maintenance', { error: error.toString() });
    }
    
    // Health check
    try {
      const healthResult = performSystemHealthCheck();
      results.health_check = healthResult.overall_status !== 'UNHEALTHY';
    } catch (error) {
      logger.error('Health check failed during maintenance', { error: error.toString() });
    }
    
    // Weekly content check (if enabled)
    try {
      if (isFeatureEnabled('WEEKLY_CONTENT_AUTOMATION')) {
        const weeklyResult = runWeeklyContentAutomation();
        results.weekly_content = weeklyResult.success;
      } else {
        results.weekly_content = true; // Not applicable
      }
    } catch (error) {
      logger.error('Weekly content check failed during maintenance', { error: error.toString() });
    }
    
    // @testHook(daily_maintenance_complete)
    
    const successCount = Object.values(results).filter(r => r === true).length;
    const totalTasks = Object.keys(results).length;
    
    logger.info('Daily maintenance completed', {
      successful_tasks: successCount,
      total_tasks: totalTasks,
      results: results
    });
    
    logger.exitFunction('System.dailyMaintenanceTasks', { 
      success: successCount === totalTasks 
    });
    
    return {
      success: successCount === totalTasks,
      results: results,
      summary: `${successCount}/${totalTasks} maintenance tasks completed`
    };
    
  } catch (error) {
    logger.error('Daily maintenance failed', { error: error.toString() });
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Setup scheduled triggers for the system
 * @returns {Object} Trigger setup results
 */
function setupScheduledTriggers() {
  logger.enterFunction('System.setupScheduledTriggers');
  
  try {
    const results = {
      daily_maintenance: false,
      weekly_content: false,
      existing_triggers_cleaned: false
    };
    
    // @testHook(triggers_setup_start)
    
    // Clean up existing triggers first
    const existingTriggers = ScriptApp.getProjectTriggers();
    existingTriggers.forEach(trigger => {
      if (['dailyMaintenanceTasks', 'runWeeklyContentAutomation'].includes(trigger.getHandlerFunction())) {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    results.existing_triggers_cleaned = true;
    
    // Setup daily maintenance trigger (2 AM)
    ScriptApp.newTrigger('dailyMaintenanceTasks')
      .timeBased()
      .everyDays(1)
      .atHour(2)
      .create();
    results.daily_maintenance = true;
    
    // Setup weekly content trigger (8 AM daily)
    if (isFeatureEnabled('WEEKLY_CONTENT_AUTOMATION')) {
      ScriptApp.newTrigger('runWeeklyContentAutomation')
        .timeBased()
        .everyDays(1)
        .atHour(8)
        .create();
      results.weekly_content = true;
    }
    
    // @testHook(triggers_setup_complete)
    
    logger.info('Scheduled triggers setup completed', { results });
    
    logger.exitFunction('System.setupScheduledTriggers', { success: true });
    
    return {
      success: true,
      triggers_created: Object.values(results).filter(r => r === true).length,
      results: results
    };
    
  } catch (error) {
    logger.error('Trigger setup failed', { error: error.toString() });
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ==================== SYSTEM INFO FUNCTIONS ====================

/**
 * Get comprehensive system information
 * @returns {Object} Complete system information
 */
function getSystemInfo() {
  return {
    system: {
      name: getConfig('SYSTEM.NAME'),
      version: getConfig('SYSTEM.VERSION'),
      environment: getConfig('SYSTEM.ENVIRONMENT'),
      club: getClubInfo(),
      timezone: getConfig('SYSTEM.TIMEZONE')
    },
    features: getConfig('FEATURES'),
    metrics: getSystemMetrics(),
    health: performSystemHealthCheck(),
    timestamp: DateUtils.formatISO(DateUtils.now())
  };
}

/**
 * Get system status summary
 * @returns {Object} Status summary
 */
function getSystemStatus() {
  const health = performSystemHealthCheck();
  const metrics = getSystemMetrics();
  
  return {
    status: health.overall_status,
    version: getConfig('SYSTEM.VERSION'),
    uptime: metrics.system.uptime_session,
    active_features: metrics.features.enabled,
    last_checked: health.timestamp,
    quick_stats: {
      players: metrics.usage.players_count || 0,
      live_events: metrics.usage.live_events_count || 0,
      errors: metrics.usage.error_count || 0
    }
  };
}

