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
        return { success: true, message: 'System already initialized' };
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
      results.components.sheets = initializeRequiredSheets();
      
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
      
      this.logger.exitFunction('initializeSystem', { success });
      
      return {
        success: success,
        failed_components: failedComponents,
        results: results
      };
      
    } catch (error) {
      this.healthStatus = 'unhealthy';
      this.logger.error('System initialization failed', { 
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
 * Check system health (public API)
 * @returns {Object} Health check result
 */
function checkSystemHealth() {
  return systemCoordinator.checkSystemHealth();
}

/**
 * Get system status (public API)
 * @returns {Object} System status
 */
function getSystemStatus() {
  logger.enterFunction('System.getSystemStatus');
  
  try {
    const health = systemCoordinator.checkSystemHealth();
    const metrics = systemCoordinator.getSystemMetrics();
    
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
    return {
      system_health: 'unhealthy',
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
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
    return {
      overall_success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
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

