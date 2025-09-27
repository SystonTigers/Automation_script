/**
 * @fileoverview Main Entry Points for Football Automation System
 * @version 6.3.0
 * @description Real integration of all advanced components
 */

/**
 * WEBAPP ENTRY POINT - Main webapp handler with full integration
 */
function doGet(e) {
  try {
    // 1. SECURITY CHECK - Use advanced security
    const securityCheck = AdvancedSecurity.validateInput(e.parameter || {}, 'webhook_data', { source: 'webapp' });
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
    ProductionMonitoringManager.collectMetric('webapp', 'request', 1, { action: e.parameter?.action || 'unknown' });

    // 4. ROUTE REQUEST
    let result;
    const action = e.parameter?.action || 'health';

    switch (action) {
      case 'health':
        result = HealthCheck.performHealthCheck();
        break;

      case 'advanced_health':
        result = ProductionMonitoringManager.performAdvancedHealthCheck();
        break;

      case 'dashboard':
        result = ProductionMonitoringManager.getMonitoringDashboard();
        break;

      case 'test':
        result = runPracticalTests();
        break;

      default:
        result = {
          message: 'Football Automation System API',
          version: getConfig('SYSTEM.VERSION', '6.3.0'),
          available_actions: ['health', 'advanced_health', 'dashboard', 'test']
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
    // 1. SECURITY - Advanced validation
    const userEmail = Session.getActiveUser().getEmail() || 'anonymous';
    const rateCheck = AdvancedSecurity.checkAdvancedRateLimit(userEmail, { perMinute: 10 });

    if (!rateCheck.allowed) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Rate limit exceeded'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. PARSE AND VALIDATE DATA
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

    // 4. PROCESS REQUEST
    const result = { received: true, processed: new Date().toISOString() };

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
  try {
    // 1. SECURITY - Validate inputs
    const playerValidation = AdvancedSecurity.validateInput(player, 'player_name', { source: 'goal_processing' });
    if (!playerValidation.valid) {
      throw new Error('Invalid player name');
    }

    const minuteValidation = AdvancedSecurity.validateInput(minute, 'match_event');
    if (!minuteValidation.valid) {
      throw new Error('Invalid minute');
    }

    // 2. PRIVACY - Check consent
    const consent = SimplePrivacy.checkPlayerConsent(playerValidation.sanitized);
    if (!consent.allowed) {
      console.warn(`Goal not posted - no consent for ${player}: ${consent.reason}`);
      return { success: false, blocked: true, reason: consent.reason };
    }

    // 3. PERFORMANCE - Use caching for repeated operations
    const cacheKey = `goal_${player}_${minute}_${Date.now()}`;
    PerformanceOptimizer.set(cacheKey, { player, minute, assist }, 300000); // 5 min cache

    // 4. MONITORING - Track goal processing
    ProductionMonitoringManager.collectMetric('goals', 'processed', 1, {
      player: player,
      minute: minute,
      hasAssist: !!assist
    });

    // 5. PROCESS GOAL - Use existing enhanced events system
    const result = processMatchEvent({
      eventType: 'goal',
      player: playerValidation.sanitized,
      minute: minute,
      additionalData: { assist: assist }
    });

    return result;

  } catch (error) {
    console.error('Goal processing failed:', error);
    ProductionMonitoringManager.triggerAlert('goal_processing_error', 'warning',
      `Goal processing failed: ${error.toString()}`, { player, minute, assist });

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
    // Delete existing triggers to avoid duplicates
    ScriptApp.getProjectTriggers().forEach(trigger => {
      if (trigger.getHandlerFunction().startsWith('scheduled')) {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Health check every hour
    ScriptApp.newTrigger('scheduledHealthCheck')
      .timeBased()
      .everyHours(1)
      .create();

    // Performance cleanup every 30 minutes
    ScriptApp.newTrigger('cleanupExpiredCache')
      .timeBased()
      .everyMinutes(30)
      .create();

    console.log('✅ System triggers installed');
    return { success: true, triggers: ['scheduledHealthCheck', 'cleanupExpiredCache'] };

  } catch (error) {
    console.error('Trigger setup failed:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * QUICK STATUS CHECK - For external monitoring
 */
function getQuickStatus() {
  try {
    const config = getConfig();
    const health = HealthCheck.quickHealthCheck();

    return {
      status: health.status,
      version: config.SYSTEM?.VERSION || '6.3.0',
      timestamp: new Date().toISOString(),
      components: {
        security: typeof AdvancedSecurity !== 'undefined',
        performance: typeof PerformanceOptimizer !== 'undefined',
        monitoring: typeof ProductionMonitoringManager !== 'undefined',
        privacy: typeof SimplePrivacy !== 'undefined'
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