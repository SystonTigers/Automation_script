/**
 * @fileoverview Smart Logging System for Syston Tigers Football Automation
 * @version 6.0.0
 * @author Senior Software Architect
 * @description Comprehensive logging with sheet persistence, levels, and performance tracking
 */

/**
 * Logger class for centralized logging
 */
class Logger {
  
  constructor() {
    this.config = {
      levels: getConfig('LOGGING.LEVELS', {ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3}),
      currentLevel: getConfig('LOGGING.CURRENT_LEVEL', 2),
      logToSheet: getConfig('LOGGING.LOG_TO_SHEET', true),
      maxEntries: getConfig('LOGGING.MAX_LOG_ENTRIES', 1000),
      cleanupDays: getConfig('LOGGING.LOG_CLEANUP_DAYS', 30)
    };
    
    this.sessionId = StringUtils.generateId('session');
    this.initTime = Date.now();
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Object} context - Additional context
   */
  error(message, context = {}) {
    this._log('ERROR', message, context);
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} context - Additional context
   */
  warn(message, context = {}) {
    this._log('WARN', message, context);
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {Object} context - Additional context
   */
  info(message, context = {}) {
    this._log('INFO', message, context);
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {Object} context - Additional context
   */
  debug(message, context = {}) {
    this._log('DEBUG', message, context);
  }

  /**
   * Log function entry
   * @param {string} functionName - Function name
   * @param {Object} params - Function parameters
   */
  enterFunction(functionName, params = {}) {
    this.info(`ENTER: ${functionName}`, { 
      type: 'function_entry', 
      function: functionName, 
      params: this._sanitizeParams(params) 
    });
  }

  /**
   * Log function exit
   * @param {string} functionName - Function name
   * @param {Object} result - Function result
   */
  exitFunction(functionName, result = {}) {
    this.info(`EXIT: ${functionName}`, { 
      type: 'function_exit', 
      function: functionName, 
      result: this._sanitizeParams(result) 
    });
  }

  /**
   * Log Make.com webhook call
   * @param {string} eventType - Event type
   * @param {Object} payload - Webhook payload
   * @param {boolean} success - Success status
   */
  webhookCall(eventType, payload, success = true) {
    const level = success ? 'INFO' : 'ERROR';
    const message = `WEBHOOK: ${eventType} - ${success ? 'SUCCESS' : 'FAILED'}`;
    
    this._log(level, message, {
      type: 'webhook_call',
      event_type: eventType,
      payload_size: JSON.stringify(payload).length,
      success: success,
      payload: this._sanitizeParams(payload)
    });
  }

  /**
   * Log sheet operation
   * @param {string} operation - Operation type
   * @param {string} sheetName - Sheet name
   * @param {boolean} success - Success status
   * @param {Object} details - Operation details
   */
  sheetOperation(operation, sheetName, success = true, details = {}) {
    const level = success ? 'INFO' : 'ERROR';
    const message = `SHEET: ${operation} on ${sheetName} - ${success ? 'SUCCESS' : 'FAILED'}`;
    
    this._log(level, message, {
      type: 'sheet_operation',
      operation: operation,
      sheet: sheetName,
      success: success,
      details: details
    });
  }

  /**
   * Log performance metric
   * @param {string} operation - Operation name
   * @param {number} durationMs - Duration in milliseconds
   * @param {Object} metadata - Additional metadata
   */
  performance(operation, durationMs, metadata = {}) {
    this.info(`PERF: ${operation} took ${durationMs}ms`, {
      type: 'performance_metric',
      operation: operation,
      duration_ms: durationMs,
      duration_readable: this._formatDuration(durationMs),
      metadata: metadata
    });
  }

  /**
   * Log system health check
   * @param {string} component - Component name
   * @param {boolean} healthy - Health status
   * @param {Object} metrics - Health metrics
   */
  health(component, healthy, metrics = {}) {
    const level = healthy ? 'INFO' : 'WARN';
    const message = `HEALTH: ${component} - ${healthy ? 'HEALTHY' : 'UNHEALTHY'}`;
    
    this._log(level, message, {
      type: 'health_check',
      component: component,
      healthy: healthy,
      metrics: metrics,
      timestamp: DateUtils.formatISO(DateUtils.now())
    });
  }

  /**
   * Core logging method
   * @private
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  _log(level, message, context = {}) {
    try {
      const levelValue = this.config.levels[level] || 999;
      
      // Check if we should log this level
      if (levelValue > this.config.currentLevel) {
        return;
      }

      const logEntry = {
        timestamp: DateUtils.formatISO(DateUtils.now()),
        level: level,
        message: message,
        context: context,
        session_id: this.sessionId,
        system_version: getConfig('SYSTEM.VERSION'),
        execution_time_ms: Date.now() - this.initTime
      };

      // Console logging
      this._logToConsole(level, message, context);

      // Sheet logging (if enabled)
      if (this.config.logToSheet) {
        this._logToSheet(logEntry);
      }

      // Critical error handling
      if (level === 'ERROR' && context.critical) {
        ErrorUtils.notifyIfCritical({
          code: context.error_code || 'UNKNOWN_ERROR',
          message: message,
          context: context,
          timestamp: logEntry.timestamp
        });
      }

    } catch (error) {
      // Fallback console logging if main logging fails
      console.error('Logger failed:', error);
      console.log(`[${level}] ${message}`, context);
    }
  }

  /**
   * Log to console with appropriate method
   * @private
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {Object} context - Context
   */
  _logToConsole(level, message, context) {
    const timestamp = DateUtils.formatTime(DateUtils.now());
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    switch (level) {
      case 'ERROR':
        console.error(logMessage, context);
        break;
      case 'WARN':
        console.warn(logMessage, context);
        break;
      case 'DEBUG':
        if (getConfig('DEVELOPMENT.DEBUG_MODE', false)) {
          console.log(logMessage, context);
        }
        break;
      default:
        console.log(logMessage, context);
    }
  }

  /**
   * Log to Google Sheets
   * @private
   * @param {Object} logEntry - Log entry object
   */
  _logToSheet(logEntry) {
    try {
      const logSheet = SheetUtils.getOrCreateSheet(
        getConfig('LOGGING.LOG_SHEET_NAME', 'Logs'),
        ['Timestamp', 'Level', 'Message', 'Context', 'Session ID', 'Version', 'Execution Time']
      );

      if (!logSheet) {
        console.warn('Could not access log sheet');
        return;
      }

      // Prepare row data
      const rowData = {
        'Timestamp': logEntry.timestamp,
        'Level': logEntry.level,
        'Message': logEntry.message,
        'Context': JSON.stringify(logEntry.context),
        'Session ID': logEntry.session_id,
        'Version': logEntry.system_version,
        'Execution Time': logEntry.execution_time_ms
      };

      // Add the row
      SheetUtils.addRowFromObject(logSheet, rowData);

      // Periodic cleanup
      if (Math.random() < 0.1) { // 10% chance
        this._cleanupOldLogs(logSheet);
      }

    } catch (error) {
      console.error('Failed to log to sheet:', error);
    }
  }

  /**
   * Clean up old log entries
   * @private
   * @param {GoogleAppsScript.Spreadsheet.Sheet} logSheet - Log sheet
   */
  _cleanupOldLogs(logSheet) {
    try {
      const maxEntries = this.config.maxEntries;
      const lastRow = logSheet.getLastRow();
      
      if (lastRow <= maxEntries + 1) return; // +1 for header

      const rowsToDelete = lastRow - maxEntries - 1;
      logSheet.deleteRows(2, rowsToDelete); // Keep header row

      this.info('Log cleanup completed', {
        type: 'log_cleanup',
        rows_deleted: rowsToDelete,
        remaining_rows: lastRow - rowsToDelete
      });

    } catch (error) {
      console.error('Failed to cleanup logs:', error);
    }
  }

  /**
   * Sanitize parameters for logging
   * @private
   * @param {Object} params - Parameters to sanitize
   * @returns {Object} Sanitized parameters
   */
  _sanitizeParams(params) {
    if (!params || typeof params !== 'object') {
      return params;
    }

    const sanitized = {};
    const maxStringLength = 500;
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'api_key'];

    for (const [key, value] of Object.entries(params)) {
      const lowerKey = key.toLowerCase();
      
      // Hide sensitive data
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '***HIDDEN***';
        continue;
      }

      // Truncate long strings
      if (typeof value === 'string' && value.length > maxStringLength) {
        sanitized[key] = value.substring(0, maxStringLength) + '...[TRUNCATED]';
        continue;
      }

      // Handle objects recursively (but limit depth)
      if (typeof value === 'object' && value !== null) {
        try {
          const jsonString = JSON.stringify(value);
          if (jsonString.length > maxStringLength) {
            sanitized[key] = '[OBJECT_TOO_LARGE]';
          } else {
            sanitized[key] = value;
          }
        } catch (error) {
          sanitized[key] = '[OBJECT_CIRCULAR_REF]';
        }
        continue;
      }

      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Format duration for human readability
   * @private
   * @param {number} ms - Milliseconds
   * @returns {string} Formatted duration
   */
  _formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * Get performance timer
   * @param {string} operation - Operation name
   * @returns {Object} Timer object with stop method
   */
  startTimer(operation) {
    const startTime = Date.now();
    
    return {
      stop: (metadata = {}) => {
        const duration = Date.now() - startTime;
        this.performance(operation, duration, metadata);
        return duration;
      }
    };
  }

  /**
   * Create scoped logger for component
   * @param {string} component - Component name
   * @returns {Object} Scoped logger
   */
  scope(component) {
    const parentLogger = this;
    
    return {
      error: (message, context = {}) => {
        parentLogger.error(`[${component}] ${message}`, { ...context, component });
      },
      warn: (message, context = {}) => {
        parentLogger.warn(`[${component}] ${message}`, { ...context, component });
      },
      info: (message, context = {}) => {
        parentLogger.info(`[${component}] ${message}`, { ...context, component });
      },
      debug: (message, context = {}) => {
        parentLogger.debug(`[${component}] ${message}`, { ...context, component });
      },
      enterFunction: (functionName, params = {}) => {
        parentLogger.enterFunction(`${component}.${functionName}`, params);
      },
      exitFunction: (functionName, result = {}) => {
        parentLogger.exitFunction(`${component}.${functionName}`, result);
      },
      startTimer: (operation) => {
        return parentLogger.startTimer(`${component}.${operation}`);
      }
    };
  }

  /**
   * Get logging statistics
   * @returns {Object} Logging statistics
   */
  getStats() {
    try {
      const logSheet = SheetUtils.getOrCreateSheet(
        getConfig('LOGGING.LOG_SHEET_NAME', 'Logs')
      );

      if (!logSheet) {
        return { error: 'Cannot access log sheet' };
      }

      const lastRow = logSheet.getLastRow();
      const data = logSheet.getRange(2, 1, Math.max(0, lastRow - 1), 7).getValues();

      const stats = {
        total_entries: data.length,
        session_entries: data.filter(row => row[4] === this.sessionId).length,
        levels: {},
        recent_errors: [],
        session_id: this.sessionId,
        uptime_ms: Date.now() - this.initTime
      };

      // Count by levels
      data.forEach(row => {
        const level = row[1];
        stats.levels[level] = (stats.levels[level] || 0) + 1;
        
        // Collect recent errors
        if (level === 'ERROR' && stats.recent_errors.length < 5) {
          stats.recent_errors.push({
            timestamp: row[0],
            message: row[2],
            context: row[3]
          });
        }
      });

      return stats;
    } catch (error) {
      return {
        error: 'Failed to get logging stats',
        details: error.toString()
      };
    }
  }

  /**
   * Set log level
   * @param {string|number} level - New log level
   * @returns {boolean} Success status
   */
  setLevel(level) {
    try {
      if (typeof level === 'string') {
        level = this.config.levels[level.toUpperCase()];
      }
      
      if (typeof level === 'number' && level >= 0 && level <= 3) {
        this.config.currentLevel = level;
        this.info('Log level changed', { new_level: level });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to set log level:', error);
      return false;
    }
  }

  /**
   * Export logs for external analysis
   * @param {number} days - Number of days to export
   * @returns {Array} Log entries
   */
  exportLogs(days = 7) {
    try {
      const logSheet = SheetUtils.getOrCreateSheet(
        getConfig('LOGGING.LOG_SHEET_NAME', 'Logs')
      );

      if (!logSheet) {
        return [];
      }

      const cutoffDate = DateUtils.addDays(DateUtils.now(), -days);
      const data = SheetUtils.getAllDataAsObjects(logSheet);

      return data.filter(entry => {
        const entryDate = new Date(entry.Timestamp);
        return entryDate >= cutoffDate;
      });
    } catch (error) {
      console.error('Failed to export logs:', error);
      return [];
    }
  }
}

// ==================== GLOBAL LOGGER INSTANCE ====================

/**
 * Global logger instance
 */
const logger = new Logger();

// ==================== FUNCTION DECORATORS ====================

/**
 * Decorator for automatic function logging
 * @param {string} componentName - Component name
 * @returns {Function} Decorator function
 */
function withLogging(componentName) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args) {
      const functionName = `${componentName}.${propertyKey}`;
      const scopedLogger = logger.scope(componentName);
      const timer = scopedLogger.startTimer(propertyKey);
      
      scopedLogger.enterFunction(propertyKey, { args: args.length });
      
      try {
        const result = originalMethod.apply(this, args);
        timer.stop({ success: true });
        scopedLogger.exitFunction(propertyKey, { success: true });
        return result;
      } catch (error) {
        timer.stop({ success: false, error: error.message });
        scopedLogger.error(`Function ${propertyKey} failed`, {
          error: error.toString(),
          stack: error.stack
        });
        scopedLogger.exitFunction(propertyKey, { success: false });
        throw error;
      }
    };
    
    return descriptor;
  };
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Log system startup
 */
function logSystemStartup() {
  logger.info('System startup', {
    type: 'system_startup',
    version: getConfig('SYSTEM.VERSION'),
    environment: getConfig('SYSTEM.ENVIRONMENT'),
    timezone: getConfig('SYSTEM.TIMEZONE'),
    features_enabled: Object.entries(getConfig('FEATURES', {}))
      .filter(([key, value]) => value === true)
      .map(([key]) => key)
  });
}

/**
 * Log system shutdown
 */
function logSystemShutdown() {
  const stats = logger.getStats();
  logger.info('System shutdown', {
    type: 'system_shutdown',
    session_duration_ms: stats.uptime_ms,
    session_duration_readable: logger._formatDuration(stats.uptime_ms),
    logs_generated: stats.session_entries
  });
}

/**
 * Create audit trail entry
 * @param {string} action - Action performed
 * @param {string} entity - Entity affected
 * @param {Object} changes - Changes made
 * @param {string} userId - User ID (optional)
 */
function auditTrail(action, entity, changes = {}, userId = 'system') {
  logger.info(`AUDIT: ${action} on ${entity}`, {
    type: 'audit_trail',
    action: action,
    entity: entity,
    changes: changes,
    user_id: userId,
    timestamp: DateUtils.formatISO(DateUtils.now())
  });
}

/**
 * Log security event
 * @param {string} event - Security event type
 * @param {Object} details - Event details
 */
function securityLog(event, details = {}) {
  logger.warn(`SECURITY: ${event}`, {
    type: 'security_event',
    event: event,
    details: details,
    timestamp: DateUtils.formatISO(DateUtils.now())
  });
}

// ==================== PUBLIC API ====================

/**
 * Initialize logging system
 * @returns {Object} Initialization result
 */
function initializeLogger() {
  try {
    logSystemStartup();
    
    // Setup cleanup schedule
    const cleanupTrigger = ScriptApp.getProjectTriggers()
      .find(trigger => trigger.getHandlerFunction() === 'scheduledLogCleanup');
    
    if (!cleanupTrigger) {
      ScriptApp.newTrigger('scheduledLogCleanup')
        .timeBased()
        .everyDays(1)
        .atHour(2) // 2 AM cleanup
        .create();
    }
    
    return {
      success: true,
      session_id: logger.sessionId,
      log_level: logger.config.currentLevel,
      log_to_sheet: logger.config.logToSheet,
      version: '6.0.0'
    };
  } catch (error) {
    console.error('Failed to initialize logger:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Scheduled log cleanup function
 */
function scheduledLogCleanup() {
  try {
    const logSheet = SheetUtils.getOrCreateSheet(
      getConfig('LOGGING.LOG_SHEET_NAME', 'Logs')
    );
    
    if (logSheet) {
      logger._cleanupOldLogs(logSheet);
    }
  } catch (error) {
    console.error('Scheduled log cleanup failed:', error);
  }
}

/**
 * Get logger instance
 * @returns {Logger} Logger instance
 */
function getLogger() {
  return logger;
}

/**
 * Test logging system
 * @returns {Object} Test results
 */
function testLogger() {
  try {
    const testLogger = logger.scope('TEST');
    
    testLogger.info('Test info message');
    testLogger.warn('Test warning message');
    testLogger.error('Test error message');
    
    const timer = testLogger.startTimer('test_operation');
    
    // Simulate some work
    Utilities.sleep(100);
    
    timer.stop({ test: true });
    
    const stats = logger.getStats();
    
    return {
      success: true,
      stats: stats,
      session_id: logger.sessionId
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

