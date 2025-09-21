/**
 * @fileoverview Authentication Extensions for Control Panel
 * @version 6.0.0
 * @author Senior Software Architect
 * @description Authentication functions for secure control panel access
 */

// ==================== AUTHENTICATION FUNCTIONS ====================

/**
 * Control panel authenticate - Called from HTML login form
 * @param {string} username - Username
 * @param {string} password - Password
 * @param {string} mfaCode - MFA code
 * @returns {Object} Authentication result
 */
function controlPanelAuthenticate(username, password, mfaCode = null) {
  logger.enterFunction('controlPanelAuthenticate', { username });

  try {
    // Validate inputs
    const usernameValidation = validateInput(username, 'string', { required: true, minLength: 3, maxLength: 50 });
    if (!usernameValidation.success) {
      return { success: false, error: 'Invalid username format' };
    }

    const passwordValidation = validateInput(password, 'string', { required: true, minLength: 6 });
    if (!passwordValidation.success) {
      return { success: false, error: 'Invalid password format' };
    }

    // Authenticate with security manager
    const authResult = authenticateAdmin(username, password, mfaCode);

    if (authResult.success) {
      logger.info('Control panel authentication successful', { username });
      logSecurityEvent('control_panel_login', { username, success: true });

      return {
        success: true,
        sessionToken: authResult.sessionToken,
        role: authResult.role,
        expiresAt: authResult.expiresAt
      };
    } else {
      logger.warn('Control panel authentication failed', { username, error: authResult.error });
      logSecurityEvent('control_panel_login', { username, success: false, error: authResult.error });

      return { success: false, error: authResult.error };
    }

  } catch (error) {
    logger.error('Control panel authentication error', { username, error: error.toString() });
    logSecurityEvent('control_panel_auth_error', { username, error: error.toString() });
    return { success: false, error: 'Authentication system error' };
  }
}

/**
 * Show authenticated control panel - Called after successful login
 * @param {string} sessionToken - Session token
 * @returns {Object} Result
 */
function showAuthenticatedControlPanel(sessionToken) {
  logger.enterFunction('showAuthenticatedControlPanel');

  try {
    // Verify session and permissions
    const authResult = checkPermission(sessionToken, 'control_panel_access');
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    // Show control panel with session
    return ControlPanel.showControlPanel(sessionToken);

  } catch (error) {
    logger.error('Authenticated control panel display failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Enhanced control panel toggle feature with authentication
 * @param {string} sessionToken - Session token
 * @param {string} featureName - Feature name
 * @param {boolean} enabled - Enabled state
 * @returns {Object} Toggle result
 */
function controlPanelToggleFeatureAuth(sessionToken, featureName, enabled) {
  logger.enterFunction('controlPanelToggleFeatureAuth', { featureName, enabled });

  try {
    // Check permissions
    const authResult = checkPermission(sessionToken, 'feature_toggle');
    if (!authResult.success) {
      return authResult;
    }

    // Validate inputs
    const featureValidation = validateInput(featureName, 'string', { required: true, minLength: 3, maxLength: 50 });
    if (!featureValidation.success) {
      return { success: false, error: 'Invalid feature name' };
    }

    // Log the action
    logSecurityEvent('feature_toggle', {
      username: authResult.session.username,
      feature: featureName,
      enabled: enabled
    });

    // Perform the toggle
    return ControlPanel.toggleFeature(featureName, enabled);

  } catch (error) {
    logger.error('Authenticated feature toggle failed', { featureName, error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Enhanced control panel trigger action with authentication
 * @param {string} sessionToken - Session token
 * @param {string} actionType - Action type
 * @returns {Object} Action result
 */
function controlPanelTriggerActionAuth(sessionToken, actionType) {
  logger.enterFunction('controlPanelTriggerActionAuth', { actionType });

  try {
    // Check permissions
    const authResult = checkPermission(sessionToken, 'manual_trigger');
    if (!authResult.success) {
      return authResult;
    }

    // Validate input
    const actionValidation = validateInput(actionType, 'string', { required: true, minLength: 3, maxLength: 50 });
    if (!actionValidation.success) {
      return { success: false, error: 'Invalid action type' };
    }

    // Log the action
    logSecurityEvent('manual_trigger', {
      username: authResult.session.username,
      action: actionType
    });

    // Perform the action
    let result = {};

    switch (actionType) {
      case 'weekly_automation':
        result = triggerWeeklyAutomation();
        break;

      case 'monthly_automation':
        result = triggerMonthlyAutomation();
        break;

      case 'player_stats':
        result = postPlayerStatsSummary(true);
        break;

      case 'goal_of_month':
        result = collectGoalOfTheMonth();
        break;

      case 'system_health_check':
        result = performSystemHealthCheck();
        break;

      default:
        return { success: false, error: `Unknown action: ${actionType}` };
    }

    logger.exitFunction('controlPanelTriggerActionAuth', { success: result.success });
    return result;

  } catch (error) {
    logger.error('Authenticated action trigger failed', { actionType, error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Enhanced emergency action with authentication
 * @param {string} sessionToken - Session token
 * @param {string} actionType - Emergency action type
 * @returns {Object} Action result
 */
function controlPanelEmergencyActionAuth(sessionToken, actionType) {
  logger.enterFunction('controlPanelEmergencyActionAuth', { actionType });

  try {
    // Check permissions (emergency actions require higher privileges)
    const authResult = checkPermission(sessionToken, 'emergency_actions');
    if (!authResult.success) {
      return authResult;
    }

    // Validate input
    const actionValidation = validateInput(actionType, 'string', { required: true, minLength: 3, maxLength: 50 });
    if (!actionValidation.success) {
      return { success: false, error: 'Invalid emergency action type' };
    }

    // Log the emergency action
    logSecurityEvent('emergency_action', {
      username: authResult.session.username,
      action: actionType,
      severity: 'high'
    });

    // Perform emergency action
    let result = {};

    switch (actionType) {
      case 'system_recovery':
        result = performEmergencySystemRecovery();
        break;

      case 'clear_cache':
        result = clearSystemCacheAndReset();
        break;

      case 'reinitialize':
        result = reinitializeSystem();
        break;

      default:
        return { success: false, error: `Unknown emergency action: ${actionType}` };
    }

    logger.exitFunction('controlPanelEmergencyActionAuth', { success: result.success });
    return result;

  } catch (error) {
    logger.error('Authenticated emergency action failed', { actionType, error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Get control panel status with authentication
 * @param {string} sessionToken - Session token
 * @returns {Object} Status result
 */
function controlPanelGetStatusAuth(sessionToken) {
  logger.enterFunction('controlPanelGetStatusAuth');

  try {
    // Check permissions
    const authResult = checkPermission(sessionToken, 'system_status');
    if (!authResult.success) {
      return authResult;
    }

    // Get system status
    const status = ControlPanel.getSystemStatusSummary();

    logger.exitFunction('controlPanelGetStatusAuth', { success: true });
    return { success: true, status: status };

  } catch (error) {
    logger.error('Authenticated status retrieval failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Get control panel logs with authentication
 * @param {string} sessionToken - Session token
 * @returns {Object} Logs result
 */
function controlPanelGetRecentLogsAuth(sessionToken) {
  logger.enterFunction('controlPanelGetRecentLogsAuth');

  try {
    // Check permissions
    const authResult = checkPermission(sessionToken, 'view_logs');
    if (!authResult.success) {
      return authResult;
    }

    // Get recent logs
    const logs = ControlPanel.getRecentLogs();

    logger.exitFunction('controlPanelGetRecentLogsAuth', { success: true });
    return { success: true, logs: logs };

  } catch (error) {
    logger.error('Authenticated logs retrieval failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Logout and destroy session
 * @param {string} sessionToken - Session token
 * @returns {Object} Logout result
 */
function controlPanelLogout(sessionToken) {
  logger.enterFunction('controlPanelLogout');

  try {
    if (sessionToken) {
      // Validate session first to get user info
      const authResult = checkPermission(sessionToken, 'control_panel_access');
      if (authResult.success) {
        logSecurityEvent('control_panel_logout', {
          username: authResult.session.username
        });
      }

      // Destroy session
      SecurityManager_Instance.destroySession(sessionToken);
    }

    logger.exitFunction('controlPanelLogout', { success: true });
    return { success: true, message: 'Logged out successfully' };

  } catch (error) {
    logger.error('Logout failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

// ==================== EMERGENCY FUNCTIONS ====================

/**
 * Perform emergency system recovery
 * @returns {Object} Recovery result
 */
function performEmergencySystemRecovery() {
  logger.enterFunction('performEmergencySystemRecovery');

  try {
    // Clear problematic caches
    CacheService.getScriptCache().removeAll(['SYSTEM_ERROR', 'FAILED_WEBHOOKS']);

    // Reset failed operation counters
    PropertiesService.getScriptProperties().setProperties({
      'LAST_ERROR_COUNT': '0',
      'WEBHOOK_FAILURE_COUNT': '0',
      'SYSTEM_RECOVERY_TIME': new Date().toISOString()
    });

    // Run system health check
    const healthCheck = performSystemHealthCheck();

    logger.exitFunction('performEmergencySystemRecovery', { success: true });
    return {
      success: true,
      message: 'Emergency recovery completed',
      healthStatus: healthCheck
    };

  } catch (error) {
    logger.error('Emergency recovery failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Clear system cache and reset
 * @returns {Object} Reset result
 */
function clearSystemCacheAndReset() {
  logger.enterFunction('clearSystemCacheAndReset');

  try {
    // Clear all caches
    CacheService.getScriptCache().removeAll();
    CacheService.getDocumentCache().removeAll();

    // Clear temporary properties
    const properties = PropertiesService.getScriptProperties();
    const tempKeys = ['TEMP_', 'CACHE_', 'SESSION_'];

    const allProperties = properties.getProperties();
    for (const key in allProperties) {
      if (tempKeys.some(prefix => key.startsWith(prefix))) {
        properties.deleteProperty(key);
      }
    }

    logger.exitFunction('clearSystemCacheAndReset', { success: true });
    return { success: true, message: 'Cache cleared and system reset' };

  } catch (error) {
    logger.error('Cache clear failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}

/**
 * Reinitialize system
 * @returns {Object} Initialization result
 */
function reinitializeSystem() {
  logger.enterFunction('reinitializeSystem');

  try {
    // Perform system initialization
    const initResult = initializeFootballAutomationSystem();

    if (initResult.success) {
      logger.exitFunction('reinitializeSystem', { success: true });
      return { success: true, message: 'System reinitialized successfully' };
    } else {
      return { success: false, error: 'System initialization failed: ' + initResult.error };
    }

  } catch (error) {
    logger.error('System reinitialize failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}