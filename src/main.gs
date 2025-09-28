/**
 * @fileoverview Main Entry Points for Football Automation System
 * @version 6.2.0
 * @description Real integration of all advanced components
 */

// System version - visible in Apps Script UI
const SYSTEM_VERSION = '6.2.0-live';

/**
 * Get system version and deployment info
 * @returns {string} Current system version
 */
function SA_Version() {
  return {
    version: SYSTEM_VERSION,
    deployedAt: new Date().toISOString(),
    status: 'operational',
    fileCount: 79,
    buildTag: 'v6.2.0-live'
  };
}

/**
 * Enumerates the whitelisted actions the webapp endpoint supports.
 * Declared at file scope so both security validation and default
 * responses reference the same canonical list during conflict
 * resolution merges.
 * @const {!Array<string>}
 */
const WEBAPP_ALLOWED_ACTIONS = Object.freeze([
  'health',
  'advanced_health',
  'dashboard',
  'monitoring',
  'test',
  'gdpr_init',
  'gdpr_dashboard'
]);

/**
 * WEBAPP ENTRY POINT - Consolidated webapp handler with full integration
 * Handles all routing - replaces conflicting doGet functions in other files
 */
function doGet(e) {
  try {
    // Handle path-based routing (from Code.gs)
    const path = (e && e.pathInfo) ? e.pathInfo : '';

    if (path) {
      return handlePathRouting(path, e);
    }

    // Handle query parameter routing (original main.gs logic)
    return handleQueryParameterRouting(e);

  } catch (error) {
    logger.error('Main doGet handler failed', { error: error.toString(), path: e?.pathInfo, params: e?.parameter });
    return HtmlService.createHtmlOutput(`
      <div style="text-align: center; padding: 50px; font-family: Arial;">
        <h2>⚠️ Web App Error</h2>
        <p>Error: ${error.toString()}</p>
        <p><a href="?">Try again</a></p>
      </div>
    `);
  }
}

/**
 * Handle path-based routing (consolidated from Code.gs)
 */
function handlePathRouting(path, e) {
  switch (path) {
    case 'players':
      return createPlayerManagementInterface();
    case 'fixtures':
      return createFixtureManagementInterface();
    case 'season':
      return createSeasonSetupInterface();
    case 'historical':
      return createHistoricalDataInterface();
    case 'live':
      return createEnhancedLiveMatchInterface();
    case 'stats':
      return createStatisticsInterface();
    case 'admin':
      return createMainDashboard();
    case 'control':
      return showControlPanel();
    case 'simple':
      return createMainInterface(); // from simple-webapp.gs
    case 'health':
      return createHealthResponse();
    case 'test':
      return createTestResponse();
    default:
      return createMainDashboard();
  }
}

/**
 * Handle query parameter routing (original main.gs logic)
 */
function handleQueryParameterRouting(e) {
  // 1. SECURITY CHECK - Use advanced security
  const allowedActions = WEBAPP_ALLOWED_ACTIONS;
  const securityCheck = AdvancedSecurity.validateInput(e.parameter || {}, 'webhook_data', {
    source: 'webapp',
    allowQueryParameters: true,
    allowedActions: allowedActions
  });
  if (!securityCheck.valid) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Security validation failed'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. RATE LIMITING - Check advanced rate limits
  const userEmail = Session.getActiveUser().getEmail() || 'anonymous';
  const rateCheck = AdvancedSecurity.checkAdvancedRateLimit(userEmail, { perMinute: 30 });
  if (!rateCheck.allowed) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Rate limit exceeded'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 3. MONITORING - Start performance tracking
  const startTime = Date.now();
  const queryParams = securityCheck.sanitized || {};
  ProductionMonitoringManager.collectMetric('webapp', 'request', 1, { action: queryParams.action || 'unknown' });

  // 4. ROUTE REQUEST
  let result;
  const action = queryParams.action || 'health';

  switch (action) {
    case 'health':
      result = HealthCheck.performHealthCheck();
      break;

    case 'advanced_health':
      result = ProductionMonitoringManager.performAdvancedHealthCheck();
      break;

    case 'dashboard':
      result = getWorkingMonitoringDashboard();
      break;

    case 'monitoring':
      result = runSystemMonitoring();
      break;

    case 'test':
      result = runPracticalTests();
      break;

      case 'gdpr_init':
        result = initializeGDPRCompliance();
        break;

      case 'gdpr_dashboard':
        result = getGDPRComplianceDashboard();
        break;

      default:
        result = {
          message: 'Football Automation System API',
          version: getConfigValue('SYSTEM.VERSION', '6.3.0'),
          available_actions: allowedActions
        };
    }

    // 5. PERFORMANCE TRACKING - Record response time
    const responseTime = Date.now() - startTime;
    ProductionMonitoringManager.collectMetric('webapp', 'response_time', responseTime, { action: action });

    // 6. RETURN SECURE RESPONSE
    return AdvancedSecurity.addSecurityHeaders(
      ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }))
    );

  } catch (error) {
    console.error('Webapp error:', error);

    // MONITORING - Record error
    ProductionMonitoringManager.triggerAlert('webapp_error', 'warning',
      `Webapp error: ${error.toString()}`, { error: error.toString() });

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * WEBAPP ENTRY POINT - POST handler with security integration
 */
function doPost(e) {
  try {
    // 1. QUOTA CHECK - Prevent quota exhaustion
    const quotaCheck = QuotaMonitor.checkQuotaLimits();
    if (!quotaCheck.allowed) {
      QuotaMonitor.recordUsage('URL_FETCH', 1); // Count this request
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'System quota limits exceeded',
        violations: quotaCheck.violations
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. SECURITY - Advanced validation
    const userEmail = Session.getActiveUser().getEmail() || 'anonymous';
    const rateCheck = AdvancedSecurity.checkAdvancedRateLimit(userEmail, { perMinute: 10 });

    if (!rateCheck.allowed) {
      QuotaMonitor.recordUsage('URL_FETCH', 1);
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Rate limit exceeded'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. PARSE AND VALIDATE DATA
    let requestData = {};
    if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    }

    const validation = AdvancedSecurity.validateInput(requestData, 'webhook_data', { source: 'webapp_post' });
    if (!validation.valid) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid input data'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. PRIVACY CHECK - If posting content with player names
    if (requestData.content && requestData.content.includes) {
      const privacyCheck = SimplePrivacy.evaluatePostContent(requestData.content);
      if (!privacyCheck.allowed) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Privacy validation failed',
          reason: privacyCheck.warnings
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 4. PROCESS REQUEST - Route to appropriate handler with enhanced validation
    const params = e.parameter || requestData;
    const action = params.action || 'unknown';

    // Enhanced action validation
    const allowedActions = ['add_player', 'add_fixture', 'season_setup', 'add_historical_match', 'live_event'];
    if (!allowedActions.includes(action)) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid action: ' + action,
        allowedActions: allowedActions
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Action-specific input validation
    const validationResult = validateActionParams(action, params);
    if (!validationResult.valid) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Validation failed',
        details: validationResult.errors
      })).setMimeType(ContentService.MimeType.JSON);
    }

    let result;
    switch (action) {
      case 'add_player':
        result = handleAddPlayer(validationResult.sanitized);
        break;
      case 'add_fixture':
        result = handleAddFixture(validationResult.sanitized);
        break;
      case 'season_setup':
        result = handleSeasonSetup(validationResult.sanitized);
        break;
      case 'add_historical_match':
        result = handleHistoricalMatch(validationResult.sanitized);
        break;
      case 'live_event':
        result = handleLiveEvent(validationResult.sanitized);
        break;
      default:
        result = {
          success: false,
          error: 'Unknown action: ' + action,
          received: true,
          processed: new Date().toISOString()
        };
    }

    // Record successful request usage
    QuotaMonitor.recordUsage('URL_FETCH', 1);
    QuotaMonitor.recordUsage('PROPERTIES_READ', 3); // Estimate for typical request
    QuotaMonitor.recordUsage('PROPERTIES_WRITE', 1);

    return AdvancedSecurity.addSecurityHeaders(
      ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: result
      }))
    );

  } catch (error) {
    console.error('POST handler error:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Internal server error'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GOAL PROCESSING - With full privacy and security integration
 */
function processGoal(player, minute, assist = null) {
  let sanitizedMinute = null;
  try {
    // 1. SECURITY - Validate inputs
    const playerValidation = AdvancedSecurity.validateInput(player, 'player_name', { source: 'goal_processing' });
    if (!playerValidation.valid) {
      throw new Error('Invalid player name');
    }

    sanitizedMinute = AdvancedSecurity.validateMinute(minute);

    // 2. PRIVACY - Check consent
    const consent = SimplePrivacy.checkPlayerConsent(playerValidation.sanitized);
    if (!consent.allowed) {
      console.warn(`Goal not posted - no consent for ${player}: ${consent.reason}`);
      return { success: false, blocked: true, reason: consent.reason };
    }

    // 3. PERFORMANCE - Use caching for repeated operations
    const cacheKey = `goal_${player}_${sanitizedMinute}_${Date.now()}`;
    PerformanceOptimizer.set(cacheKey, { player, minute: sanitizedMinute, assist }, 300000); // 5 min cache

    // 4. MONITORING - Track goal processing
    ProductionMonitoringManager.collectMetric('goals', 'processed', 1, {
      player: player,
      minute: sanitizedMinute,
      hasAssist: !!assist
    });

    // 5. PROCESS GOAL - Use existing enhanced events system
    const result = processMatchEvent({
      eventType: 'goal',
      player: playerValidation.sanitized,
      minute: sanitizedMinute,
      additionalData: { assist: assist }
    });

    return result;

  } catch (error) {
    console.error('Goal processing failed:', error);
    ProductionMonitoringManager.triggerAlert('goal_processing_error', 'warning',
      `Goal processing failed: ${error.toString()}`, { player, minute: sanitizedMinute !== null ? sanitizedMinute : minute, assist });

    return { success: false, error: error.toString() };
  }
}

/**
 * HEALTH CHECK - Integrated monitoring
 */
function performSystemHealthCheck() {
  return ProductionMonitoringManager.performAdvancedHealthCheck();
}

/**
 * INITIALIZE SYSTEM - Startup integration
 */
function initializeSystem() {
  try {
    console.log('🚀 Initializing integrated system...');

    // 1. Start monitoring
    const monitoring = ProductionMonitoringManager.startComprehensiveMonitoring();

    // 2. Initialize architecture
    const architecture = ArchitectureBootstrap.initialize();

    // 3. Setup privacy sheets
    const privacy = setupPrivacySheets();

    // 4. Performance optimization
    setupPerformanceMonitoring();

    console.log('✅ System initialization complete');

    return {
      success: true,
      monitoring: monitoring,
      architecture: architecture,
      privacy: privacy,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('System initialization failed:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * RUN TESTS - Integrated test execution
 */
function runPracticalTests() {
  try {
    console.log('🧪 Running integrated test suite...');

    // Run the practical tests
    const testResults = runAllPracticalTests();

    // Also run quick comprehensive check
    const comprehensiveCheck = quickComprehensiveTest();

    return {
      practicalTests: testResults,
      comprehensiveCheck: comprehensiveCheck,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Test execution failed:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * SCHEDULED HEALTH CHECK - For time-based triggers
 */
function scheduledHealthCheck() {
  try {
    const health = ProductionMonitoringManager.performAdvancedHealthCheck();

    if (health.overall === 'critical' || health.overall === 'error') {
      ProductionMonitoringManager.triggerAlert('system_health', 'critical',
        `System health critical: ${health.overall}`, health);
    }

    // Log health metrics
    ProductionMonitoringManager.collectMetric('health', 'check_score', health.score, {
      overall: health.overall
    });

    return health;

  } catch (error) {
    console.error('Scheduled health check failed:', error);
    ProductionMonitoringManager.triggerAlert('health_check_error', 'critical',
      `Health check failed: ${error.toString()}`, { error: error.toString() });
  }
}

/**
 * PRIVACY REQUEST HANDLER - GDPR compliance
 */
function handlePrivacyRequest(playerName, requestType) {
  try {
    // Validate request
    const validation = AdvancedSecurity.validateInput(playerName, 'player_name', { source: 'privacy_request' });
    if (!validation.valid) {
      throw new Error('Invalid player name');
    }

    const sanitizedName = validation.sanitized;

    // Log privacy request
    SimplePrivacy.logPrivacyAction('privacy_request', sanitizedName, {
      requestType: requestType,
      requestedBy: Session.getActiveUser().getEmail()
    });

    let result;
    switch (requestType) {
      case 'export':
        result = SimplePrivacy.exportPlayerData(sanitizedName);
        break;

      case 'delete':
        result = SimplePrivacy.deletePlayerData(sanitizedName, 'User request');
        break;

      case 'consent_status':
        result = SimplePrivacy.checkPlayerConsent(sanitizedName);
        break;

      default:
        throw new Error(`Unknown privacy request type: ${requestType}`);
    }

    return result;

  } catch (error) {
    console.error('Privacy request failed:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * PERFORMANCE DASHBOARD - Real metrics
 */
function getPerformanceDashboard() {
  try {
    const performance = PerformanceOptimizer.getPerformanceAnalytics();
    const monitoring = ProductionMonitoringManager.getMonitoringDashboard();
    const health = HealthCheck.quickHealthCheck();

    return {
      performance: performance,
      monitoring: monitoring,
      health: health,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Performance dashboard failed:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * SETUP TRIGGERS - Install system triggers
 */
function setupSystemTriggers() {
  try {
    const requiredTriggers = [
      {
        functionName: 'scheduledHealthCheck',
        schedule: { everyHours: 1 },
        description: 'Hourly system health check'
      },
      {
        functionName: 'cleanupExpiredCache',
        schedule: { everyMinutes: 30 },
        description: 'Cache cleanup every 30 minutes'
      }
    ];

    const results = requiredTriggers.map(triggerConfig => {
      const ensureResult = ensureTimeTrigger(
        triggerConfig.functionName,
        triggerConfig.schedule,
        triggerConfig.description
      );

      return {
        functionName: triggerConfig.functionName,
        created: ensureResult.created,
        existed: ensureResult.existing,
        schedule: triggerConfig.schedule,
        description: triggerConfig.description
      };
    });

    const response = {
      success: true,
      ensured: results,
      timestamp: new Date().toISOString()
    };

    console.log('✅ System triggers verified', response);
    return response;

  } catch (error) {
    console.error('Trigger setup failed:', error);
    return { success: false, error: error.toString() };
  }
}

function verifyScheduledTriggerIntegrity() {
  try {
    const functionsToVerify = [
      { functionName: 'scheduledHealthCheck', required: true },
      { functionName: 'cleanupExpiredCache', required: true },
      { functionName: 'scheduledSystemMonitoring', required: true },
      { functionName: 'scheduledLogCleanup', required: true }
    ];

    const triggers = ScriptApp.getProjectTriggers();
    const details = functionsToVerify.map(entry => {
      const matchingTriggers = triggers.filter(trigger =>
        trigger.getHandlerFunction() === entry.functionName &&
        trigger.getTriggerSource() === ScriptApp.TriggerSource.CLOCK
      );

      return {
        functionName: entry.functionName,
        required: entry.required,
        exists: matchingTriggers.length > 0,
        triggerCount: matchingTriggers.length
      };
    });

    const response = {
      success: details.every(detail => !detail.required || detail.exists),
      details: details,
      timestamp: new Date().toISOString()
    };

    console.log('ℹ️ Scheduled trigger integrity check', response);
    return response;

  } catch (error) {
    console.error('Trigger integrity verification failed:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * QUICK STATUS CHECK - For external monitoring
 */
function getQuickStatus() {
  try {
    const dynamicConfig = getDynamicConfig();
    const version = getConfigValue('SYSTEM.VERSION', '6.3.0');
    const health = HealthCheck.quickHealthCheck();

    return {
      status: health.status,
      version: version,
      timestamp: new Date().toISOString(),
      components: {
        security: typeof AdvancedSecurity !== 'undefined',
        performance: typeof PerformanceOptimizer !== 'undefined',
        monitoring: typeof ProductionMonitoringManager !== 'undefined',
        privacy: typeof SimplePrivacy !== 'undefined'
      },
      config: {
        teamName: dynamicConfig?.TEAM_NAME || null
      }
    };

  } catch (error) {
    return {
      status: 'error',
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Enhanced input validation for different actions
 * @param {string} action - The action being performed
 * @param {Object} params - The parameters to validate
 * @returns {Object} Validation result with sanitized data
 */
function validateActionParams(action, params) {
  const errors = [];
  const sanitized = {};

  try {
    switch (action) {
      case 'add_player':
        // Validate player name
        if (!params.name || typeof params.name !== 'string') {
          errors.push('Player name is required');
        } else {
          sanitized.name = params.name.replace(/[<>\"'&]/g, '').substring(0, 100);
        }

        // Validate position
        if (params.position) {
          sanitized.position = params.position.replace(/[<>\"'&]/g, '').substring(0, 50);
        }

        // Validate age
        if (params.age) {
          const age = parseInt(params.age);
          if (isNaN(age) || age < 13 || age > 50) {
            errors.push('Age must be between 13 and 50');
          } else {
            sanitized.age = age;
          }
        }
        break;

      case 'add_fixture':
        // Validate opponent
        if (!params.opponent || typeof params.opponent !== 'string') {
          errors.push('Opponent is required');
        } else {
          sanitized.opponent = params.opponent.replace(/[<>\"'&]/g, '').substring(0, 100);
        }

        // Validate date
        if (!params.date) {
          errors.push('Date is required');
        } else {
          const date = new Date(params.date);
          if (isNaN(date.getTime())) {
            errors.push('Invalid date format');
          } else {
            sanitized.date = date.toISOString().split('T')[0];
          }
        }

        // Validate venue
        if (params.venue) {
          sanitized.venue = params.venue.replace(/[<>\"'&]/g, '').substring(0, 200);
        }
        break;

      case 'live_event':
        // Validate event type
        const allowedEvents = ['goal', 'card', 'substitution', 'kick_off', 'half_time', 'full_time'];
        if (!params.eventType || !allowedEvents.includes(params.eventType)) {
          errors.push('Invalid event type');
        } else {
          sanitized.eventType = params.eventType;
        }

        // Validate minute
        if (params.minute !== undefined) {
          const minute = parseInt(params.minute);
          if (isNaN(minute) || minute < 0 || minute > 120) {
            errors.push('Minute must be between 0 and 120');
          } else {
            sanitized.minute = minute;
          }
        }

        // Validate player name
        if (params.player) {
          sanitized.player = params.player.replace(/[<>\"'&]/g, '').substring(0, 100);
        }
        break;

      case 'season_setup':
        // Validate season year
        if (!params.season) {
          errors.push('Season is required');
        } else {
          sanitized.season = params.season.replace(/[<>\"'&]/g, '').substring(0, 20);
        }
        break;

      case 'add_historical_match':
        // Similar validation to add_fixture but for historical data
        if (!params.opponent) {
          errors.push('Opponent is required');
        } else {
          sanitized.opponent = params.opponent.replace(/[<>\"'&]/g, '').substring(0, 100);
        }

        if (!params.date) {
          errors.push('Date is required');
        } else {
          const date = new Date(params.date);
          if (isNaN(date.getTime()) || date > new Date()) {
            errors.push('Invalid date or future date not allowed');
          } else {
            sanitized.date = date.toISOString().split('T')[0];
          }
        }

        // Validate scores
        if (params.homeScore !== undefined) {
          const score = parseInt(params.homeScore);
          if (isNaN(score) || score < 0 || score > 20) {
            errors.push('Home score must be between 0 and 20');
          } else {
            sanitized.homeScore = score;
          }
        }

        if (params.awayScore !== undefined) {
          const score = parseInt(params.awayScore);
          if (isNaN(score) || score < 0 || score > 20) {
            errors.push('Away score must be between 0 and 20');
          } else {
            sanitized.awayScore = score;
          }
        }
        break;

      default:
        errors.push('Unknown action type');
    }

    // Copy over the action
    sanitized.action = action;

    return {
      valid: errors.length === 0,
      errors: errors,
      sanitized: sanitized
    };

  } catch (error) {
    return {
      valid: false,
      errors: ['Validation error: ' + error.toString()],
      sanitized: {}
    };
  }
}

/**
 * Quota monitoring and rate limiting system
 */
class QuotaMonitor {
  static DAILY_LIMITS = {
    SCRIPT_RUNTIME: 360, // 6 hours in minutes
    URL_FETCH: 20000,
    EMAIL_QUOTA: 100,
    PROPERTIES_READ: 50000,
    PROPERTIES_WRITE: 50000
  };

  static WARNING_THRESHOLDS = {
    SCRIPT_RUNTIME: 300, // 5 hours warning
    URL_FETCH: 18000, // 90% warning
    EMAIL_QUOTA: 90,
    PROPERTIES_READ: 45000,
    PROPERTIES_WRITE: 45000
  };

  /**
   * Check current quota usage and enforce limits
   */
  static checkQuotaLimits() {
    try {
      const usage = this.getCurrentUsage();
      const violations = [];

      // Check each quota type
      Object.keys(this.DAILY_LIMITS).forEach(quotaType => {
        const current = usage[quotaType] || 0;
        const limit = this.DAILY_LIMITS[quotaType];
        const warning = this.WARNING_THRESHOLDS[quotaType];

        if (current >= limit) {
          violations.push({
            type: quotaType,
            current: current,
            limit: limit,
            severity: 'critical'
          });
        } else if (current >= warning) {
          violations.push({
            type: quotaType,
            current: current,
            limit: limit,
            severity: 'warning'
          });
        }
      });

      // Log violations
      if (violations.length > 0) {
        const critical = violations.filter(v => v.severity === 'critical');
        if (critical.length > 0) {
          logger.error('Quota limits exceeded', { violations: critical });
          return { allowed: false, violations: violations };
        } else {
          logger.warn('Quota warning thresholds reached', { violations: violations });
        }
      }

      return { allowed: true, violations: violations, usage: usage };

    } catch (error) {
      logger.error('Quota check failed', { error: error.toString() });
      return { allowed: true, error: 'Quota check unavailable' };
    }
  }

  /**
   * Get current quota usage (estimated)
   */
  static getCurrentUsage() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const today = new Date().toISOString().split('T')[0];
      const usageKey = `quota_usage_${today}`;

      const storedUsage = properties.getProperty(usageKey);
      return storedUsage ? JSON.parse(storedUsage) : {
        SCRIPT_RUNTIME: 0,
        URL_FETCH: 0,
        EMAIL_QUOTA: 0,
        PROPERTIES_READ: 0,
        PROPERTIES_WRITE: 0
      };

    } catch (error) {
      logger.warn('Could not retrieve quota usage', { error: error.toString() });
      return {};
    }
  }

  /**
   * Record quota usage
   */
  static recordUsage(quotaType, amount = 1) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const today = new Date().toISOString().split('T')[0];
      const usageKey = `quota_usage_${today}`;

      let usage = this.getCurrentUsage();
      usage[quotaType] = (usage[quotaType] || 0) + amount;

      properties.setProperty(usageKey, JSON.stringify(usage));

      // Check if we're approaching limits
      const limit = this.DAILY_LIMITS[quotaType];
      const warning = this.WARNING_THRESHOLDS[quotaType];

      if (usage[quotaType] >= warning && usage[quotaType] < warning + amount) {
        logger.warn(`Quota warning: ${quotaType} usage ${usage[quotaType]}/${limit}`);
      }

    } catch (error) {
      logger.error('Failed to record quota usage', {
        quotaType: quotaType,
        amount: amount,
        error: error.toString()
      });
    }
  }

  /**
   * Rate limiting for webhook calls
   */
  static checkWebhookRateLimit() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const now = Date.now();
      const windowStart = now - (60 * 1000); // 1 minute window

      // Get recent webhook calls
      const recentCallsKey = 'webhook_rate_limit';
      const recentCallsData = properties.getProperty(recentCallsKey);
      let recentCalls = recentCallsData ? JSON.parse(recentCallsData) : [];

      // Clean old calls
      recentCalls = recentCalls.filter(timestamp => timestamp > windowStart);

      // Check rate limit (max 30 per minute)
      if (recentCalls.length >= 30) {
        logger.warn('Webhook rate limit exceeded', {
          recentCalls: recentCalls.length,
          limit: 30
        });
        return false;
      }

      // Record this call
      recentCalls.push(now);
      properties.setProperty(recentCallsKey, JSON.stringify(recentCalls));

      return true;

    } catch (error) {
      logger.error('Rate limit check failed', { error: error.toString() });
      return true; // Allow on error to prevent system lockup
    }
  }
}