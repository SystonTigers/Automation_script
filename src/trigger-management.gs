/**
 * @fileoverview Idempotent trigger management system
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Safe trigger creation, cleanup, and management to prevent duplicates
 */

/**
 * Idempotent trigger management class
 */
class TriggerManager {
  constructor() {
    this.loggerName = 'TriggerManager';
    this._logger = null;
    this.triggerPrefix = 'SystonTigers_';
    this.maxTriggersPerFunction = 1; // Prevent duplicate triggers
    this.registryKey = 'TRIGGER_REGISTRY';
  }

  get logger() {
    if (!this._logger) {
      try {
        this._logger = logger.scope(this.loggerName);
      } catch (error) {
        this._logger = {
          enterFunction: (fn, data) => console.log(`[${this.loggerName}] → ${fn}`, data || ''),
          exitFunction: (fn, data) => console.log(`[${this.loggerName}] ← ${fn}`, data || ''),
          info: (msg, data) => console.log(`[${this.loggerName}] ${msg}`, data || ''),
          warn: (msg, data) => console.warn(`[${this.loggerName}] ${msg}`, data || ''),
          error: (msg, data) => console.error(`[${this.loggerName}] ${msg}`, data || ''),
          security: (msg, data) => console.log(`[${this.loggerName}] SECURITY: ${msg}`, data || '')
        };
      }
    }
    return this._logger;
  }

  /**
   * Create or update a time-based trigger idempotently
   * @param {string} functionName - Function to trigger
   * @param {Object} schedule - Schedule configuration
   * @param {Object} options - Additional options
   * @returns {Object} Creation result
   */
  createTimeTrigger(functionName, schedule, options = {}) {
    this.logger.enterFunction('createTimeTrigger', {
      function_name: functionName,
      schedule_type: schedule.type
    });

    try {
      // Validate function exists
      if (!this.validateFunction(functionName)) {
        throw new Error(`Function ${functionName} does not exist`);
      }

      // Get existing triggers for this function
      const existingTriggers = this.getTriggersForFunction(functionName);

      // Check if compatible trigger already exists
      const compatibleTrigger = this.findCompatibleTrigger(existingTriggers, schedule);
      if (compatibleTrigger) {
        this.logger.info('Compatible trigger already exists', {
          function_name: functionName,
          trigger_id: compatibleTrigger.getUniqueId()
        });

        return {
          success: true,
          action: 'found_existing',
          trigger_id: compatibleTrigger.getUniqueId(),
          function_name: functionName,
          schedule: schedule
        };
      }

      // Clean up existing triggers if needed
      if (existingTriggers.length >= this.maxTriggersPerFunction) {
        this.cleanupTriggersForFunction(functionName);
      }

      // Create new trigger
      const trigger = this.buildTimeTrigger(functionName, schedule, options);

      // Register trigger in our tracking system
      this.registerTrigger(trigger, functionName, schedule, options);

      this.logger.exitFunction('createTimeTrigger', {
        success: true,
        trigger_id: trigger.getUniqueId()
      });

      return {
        success: true,
        action: 'created_new',
        trigger_id: trigger.getUniqueId(),
        function_name: functionName,
        schedule: schedule
      };

    } catch (error) {
      this.logger.error('Failed to create time trigger', {
        error: error.toString(),
        function_name: functionName,
        schedule: schedule
      });

      return {
        success: false,
        error: error.toString(),
        function_name: functionName,
        schedule: schedule
      };
    }
  }

  /**
   * Create or update a form submit trigger idempotently
   * @param {string} functionName - Function to trigger
   * @param {string} formId - Form ID
   * @param {Object} options - Additional options
   * @returns {Object} Creation result
   */
  createFormTrigger(functionName, formId, options = {}) {
    this.logger.enterFunction('createFormTrigger', {
      function_name: functionName,
      form_id: formId
    });

    try {
      // Validate function exists
      if (!this.validateFunction(functionName)) {
        throw new Error(`Function ${functionName} does not exist`);
      }

      // Check for existing form triggers
      const existingTriggers = this.getTriggersForFunction(functionName);
      const existingFormTrigger = existingTriggers.find(trigger =>
        trigger.getTriggerSource() === ScriptApp.TriggerSource.FORM &&
        trigger.getTriggerSourceId() === formId
      );

      if (existingFormTrigger) {
        this.logger.info('Form trigger already exists', {
          function_name: functionName,
          form_id: formId,
          trigger_id: existingFormTrigger.getUniqueId()
        });

        return {
          success: true,
          action: 'found_existing',
          trigger_id: existingFormTrigger.getUniqueId(),
          function_name: functionName,
          form_id: formId
        };
      }

      // Create new form trigger
      const trigger = ScriptApp.newTrigger(functionName)
        .onFormSubmit()
        .create();

      // Register trigger
      this.registerTrigger(trigger, functionName, { type: 'form', form_id: formId }, options);

      this.logger.exitFunction('createFormTrigger', {
        success: true,
        trigger_id: trigger.getUniqueId()
      });

      return {
        success: true,
        action: 'created_new',
        trigger_id: trigger.getUniqueId(),
        function_name: functionName,
        form_id: formId
      };

    } catch (error) {
      this.logger.error('Failed to create form trigger', {
        error: error.toString(),
        function_name: functionName,
        form_id: formId
      });

      return {
        success: false,
        error: error.toString(),
        function_name: functionName,
        form_id: formId
      };
    }
  }

  /**
   * Build time-based trigger from schedule configuration
   * @param {string} functionName - Function to trigger
   * @param {Object} schedule - Schedule configuration
   * @param {Object} options - Additional options
   * @returns {Trigger} Created trigger
   */
  buildTimeTrigger(functionName, schedule, options = {}) {
    let triggerBuilder = ScriptApp.newTrigger(functionName);

    switch (schedule.type) {
      case 'minutes':
        if (!schedule.interval || schedule.interval < 1 || schedule.interval > 30) {
          throw new Error('Minutes interval must be between 1 and 30');
        }
        triggerBuilder = triggerBuilder.timeBased().everyMinutes(schedule.interval);
        break;

      case 'hours':
        if (!schedule.interval || schedule.interval < 1 || schedule.interval > 12) {
          throw new Error('Hours interval must be between 1 and 12');
        }
        triggerBuilder = triggerBuilder.timeBased().everyHours(schedule.interval);
        break;

      case 'daily':
        triggerBuilder = triggerBuilder.timeBased().everyDays(1);
        if (schedule.time) {
          const [hour, minute] = schedule.time.split(':').map(Number);
          triggerBuilder = triggerBuilder.atHour(hour);
          if (minute) {
            triggerBuilder = triggerBuilder.nearMinute(minute);
          }
        }
        break;

      case 'weekly':
        triggerBuilder = triggerBuilder.timeBased().everyWeeks(1);
        if (schedule.day) {
          const dayMap = {
            'monday': ScriptApp.WeekDay.MONDAY,
            'tuesday': ScriptApp.WeekDay.TUESDAY,
            'wednesday': ScriptApp.WeekDay.WEDNESDAY,
            'thursday': ScriptApp.WeekDay.THURSDAY,
            'friday': ScriptApp.WeekDay.FRIDAY,
            'saturday': ScriptApp.WeekDay.SATURDAY,
            'sunday': ScriptApp.WeekDay.SUNDAY
          };
          triggerBuilder = triggerBuilder.onWeekDay(dayMap[schedule.day.toLowerCase()]);
        }
        if (schedule.time) {
          const [hour, minute] = schedule.time.split(':').map(Number);
          triggerBuilder = triggerBuilder.atHour(hour);
          if (minute) {
            triggerBuilder = triggerBuilder.nearMinute(minute);
          }
        }
        break;

      case 'monthly':
        triggerBuilder = triggerBuilder.timeBased().onMonthDay(schedule.day || 1);
        if (schedule.time) {
          const [hour, minute] = schedule.time.split(':').map(Number);
          triggerBuilder = triggerBuilder.atHour(hour);
          if (minute) {
            triggerBuilder = triggerBuilder.nearMinute(minute);
          }
        }
        break;

      default:
        throw new Error(`Unsupported schedule type: ${schedule.type}`);
    }

    return triggerBuilder.create();
  }

  /**
   * Find compatible existing trigger
   * @param {Array} triggers - Existing triggers
   * @param {Object} schedule - Desired schedule
   * @returns {Trigger|null} Compatible trigger or null
   */
  findCompatibleTrigger(triggers, schedule) {
    return triggers.find(trigger => {
      if (trigger.getTriggerSource() !== ScriptApp.TriggerSource.CLOCK) {
        return false;
      }

      // For simplicity, consider triggers compatible if they're the same type
      // In a more sophisticated implementation, you could compare exact schedules
      return this.getScheduleTypeFromTrigger(trigger) === schedule.type;
    });
  }

  /**
   * Get schedule type from existing trigger
   * @param {Trigger} trigger - Trigger to analyze
   * @returns {string} Schedule type
   */
  getScheduleTypeFromTrigger(trigger) {
    const eventType = trigger.getEventType();

    if (eventType === ScriptApp.EventType.CLOCK) {
      // This is a simplification - in reality you'd need to inspect trigger details
      return 'time_based';
    }

    return 'unknown';
  }

  /**
   * Get all triggers for a specific function
   * @param {string} functionName - Function name
   * @returns {Array} Array of triggers
   */
  getTriggersForFunction(functionName) {
    return ScriptApp.getProjectTriggers().filter(trigger =>
      trigger.getHandlerFunction() === functionName
    );
  }

  /**
   * Clean up triggers for a specific function
   * @param {string} functionName - Function name
   * @returns {Object} Cleanup result
   */
  cleanupTriggersForFunction(functionName) {
    this.logger.enterFunction('cleanupTriggersForFunction', { function_name: functionName });

    try {
      const triggers = this.getTriggersForFunction(functionName);
      let deletedCount = 0;

      triggers.forEach(trigger => {
        try {
          ScriptApp.deleteTrigger(trigger);
          this.unregisterTrigger(trigger.getUniqueId());
          deletedCount++;

          this.logger.info('Deleted trigger', {
            function_name: functionName,
            trigger_id: trigger.getUniqueId()
          });
        } catch (error) {
          this.logger.warn('Failed to delete trigger', {
            error: error.toString(),
            trigger_id: trigger.getUniqueId()
          });
        }
      });

      this.logger.exitFunction('cleanupTriggersForFunction', {
        function_name: functionName,
        deleted_count: deletedCount
      });

      return {
        success: true,
        deleted_count: deletedCount,
        function_name: functionName
      };

    } catch (error) {
      this.logger.error('Trigger cleanup failed', {
        error: error.toString(),
        function_name: functionName
      });

      return {
        success: false,
        error: error.toString(),
        function_name: functionName
      };
    }
  }

  /**
   * Clean up all orphaned triggers
   * @returns {Object} Cleanup result
   */
  cleanupOrphanedTriggers() {
    this.logger.enterFunction('cleanupOrphanedTriggers');

    try {
      const allTriggers = ScriptApp.getProjectTriggers();
      const orphanedTriggers = [];
      const validFunctions = this.getValidFunctionNames();

      allTriggers.forEach(trigger => {
        const functionName = trigger.getHandlerFunction();
        if (!validFunctions.includes(functionName)) {
          orphanedTriggers.push(trigger);
        }
      });

      let deletedCount = 0;
      orphanedTriggers.forEach(trigger => {
        try {
          ScriptApp.deleteTrigger(trigger);
          this.unregisterTrigger(trigger.getUniqueId());
          deletedCount++;

          this.logger.info('Deleted orphaned trigger', {
            function_name: trigger.getHandlerFunction(),
            trigger_id: trigger.getUniqueId()
          });
        } catch (error) {
          this.logger.warn('Failed to delete orphaned trigger', {
            error: error.toString(),
            trigger_id: trigger.getUniqueId()
          });
        }
      });

      this.logger.exitFunction('cleanupOrphanedTriggers', { deleted_count: deletedCount });

      return {
        success: true,
        total_triggers: allTriggers.length,
        orphaned_found: orphanedTriggers.length,
        deleted_count: deletedCount
      };

    } catch (error) {
      this.logger.error('Orphaned trigger cleanup failed', { error: error.toString() });
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  /**
   * Validate that function exists in the script
   * @param {string} functionName - Function name to validate
   * @returns {boolean} True if function exists
   */
  validateFunction(functionName) {
    const validFunctions = this.getValidFunctionNames();
    return validFunctions.includes(functionName);
  }

  /**
   * Get list of valid function names in the script
   * @returns {Array} Array of function names
   */
  getValidFunctionNames() {
    // This is a simplified version - in reality you'd need to parse the script
    // or maintain a registry of valid functions
    return [
      'scheduledHealthCheck',
      'cleanupExpiredCache',
      'runWeeklySchedule',
      'runMonthlySchedule',
      'performBackup',
      'generateDailyReport',
      'checkSystemHealth',
      'updatePlayerStats',
      'processDelayedEvents'
    ];
  }

  /**
   * Register trigger in tracking system
   * @param {Trigger} trigger - Created trigger
   * @param {string} functionName - Function name
   * @param {Object} schedule - Schedule configuration
   * @param {Object} options - Additional options
   */
  registerTrigger(trigger, functionName, schedule, options = {}) {
    try {
      const registry = this.getTriggerRegistry();
      const triggerInfo = {
        trigger_id: trigger.getUniqueId(),
        function_name: functionName,
        schedule: schedule,
        created_at: new Date().toISOString(),
        created_by: Session.getActiveUser().getEmail(),
        options: options
      };

      registry[trigger.getUniqueId()] = triggerInfo;
      this.saveTriggerRegistry(registry);

      this.logger.info('Trigger registered', {
        trigger_id: trigger.getUniqueId(),
        function_name: functionName
      });

    } catch (error) {
      this.logger.warn('Failed to register trigger', {
        error: error.toString(),
        trigger_id: trigger.getUniqueId()
      });
    }
  }

  /**
   * Unregister trigger from tracking system
   * @param {string} triggerId - Trigger ID to unregister
   */
  unregisterTrigger(triggerId) {
    try {
      const registry = this.getTriggerRegistry();
      delete registry[triggerId];
      this.saveTriggerRegistry(registry);

      this.logger.info('Trigger unregistered', { trigger_id: triggerId });

    } catch (error) {
      this.logger.warn('Failed to unregister trigger', {
        error: error.toString(),
        trigger_id: triggerId
      });
    }
  }

  /**
   * Get trigger registry from properties
   * @returns {Object} Trigger registry
   */
  getTriggerRegistry() {
    try {
      const stored = PropertiesService.getScriptProperties().getProperty(this.registryKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      this.logger.warn('Failed to load trigger registry', { error: error.toString() });
      return {};
    }
  }

  /**
   * Save trigger registry to properties
   * @param {Object} registry - Registry to save
   */
  saveTriggerRegistry(registry) {
    try {
      PropertiesService.getScriptProperties().setProperty(
        this.registryKey,
        JSON.stringify(registry)
      );
    } catch (error) {
      this.logger.warn('Failed to save trigger registry', { error: error.toString() });
    }
  }

  /**
   * Get trigger status and registry information
   * @returns {Object} Status information
   */
  getTriggerStatus() {
    this.logger.enterFunction('getTriggerStatus');

    try {
      const allTriggers = ScriptApp.getProjectTriggers();
      const registry = this.getTriggerRegistry();
      const validFunctions = this.getValidFunctionNames();

      const triggersByFunction = {};
      const orphanedTriggers = [];
      const unregisteredTriggers = [];

      allTriggers.forEach(trigger => {
        const functionName = trigger.getHandlerFunction();
        const triggerId = trigger.getUniqueId();

        if (!validFunctions.includes(functionName)) {
          orphanedTriggers.push({
            trigger_id: triggerId,
            function_name: functionName,
            source: trigger.getTriggerSource().toString()
          });
          return;
        }

        if (!registry[triggerId]) {
          unregisteredTriggers.push({
            trigger_id: triggerId,
            function_name: functionName,
            source: trigger.getTriggerSource().toString()
          });
        }

        if (!triggersByFunction[functionName]) {
          triggersByFunction[functionName] = [];
        }

        triggersByFunction[functionName].push({
          trigger_id: triggerId,
          source: trigger.getTriggerSource().toString(),
          registered: !!registry[triggerId]
        });
      });

      const status = {
        total_triggers: allTriggers.length,
        triggers_by_function: triggersByFunction,
        orphaned_triggers: orphanedTriggers,
        unregistered_triggers: unregisteredTriggers,
        registry_entries: Object.keys(registry).length,
        valid_functions: validFunctions.length,
        timestamp: new Date().toISOString()
      };

      this.logger.exitFunction('getTriggerStatus', {
        total_triggers: status.total_triggers,
        orphaned_count: orphanedTriggers.length
      });

      return status;

    } catch (error) {
      this.logger.error('Failed to get trigger status', { error: error.toString() });
      return {
        success: false,
        error: error.toString(),
        timestamp: new Date().toISOString()
      };
    }
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/** @type {TriggerManager|null} */
let __triggerManagerInstance = null;

/**
 * Get shared trigger manager instance
 * @returns {TriggerManager} Trigger manager instance
 */
function getTriggerManager() {
  if (!__triggerManagerInstance) {
    __triggerManagerInstance = new TriggerManager();
  }
  return __triggerManagerInstance;
}

/**
 * Create time-based trigger idempotently
 * @param {string} functionName - Function to trigger
 * @param {Object} schedule - Schedule configuration
 * @param {Object} options - Additional options
 * @returns {Object} Creation result
 */
function createTimeTrigger(functionName, schedule, options = {}) {
  const manager = getTriggerManager();
  return manager.createTimeTrigger(functionName, schedule, options);
}

/**
 * Create form submit trigger idempotently
 * @param {string} functionName - Function to trigger
 * @param {string} formId - Form ID
 * @param {Object} options - Additional options
 * @returns {Object} Creation result
 */
function createFormTrigger(functionName, formId, options = {}) {
  const manager = getTriggerManager();
  return manager.createFormTrigger(functionName, formId, options);
}

/**
 * Clean up triggers for specific function
 * @param {string} functionName - Function name
 * @returns {Object} Cleanup result
 */
function cleanupTriggersForFunction(functionName) {
  const manager = getTriggerManager();
  return manager.cleanupTriggersForFunction(functionName);
}

/**
 * Clean up all orphaned triggers
 * @returns {Object} Cleanup result
 */
function cleanupOrphanedTriggers() {
  const manager = getTriggerManager();
  return manager.cleanupOrphanedTriggers();
}

/**
 * Get trigger status and information
 * @returns {Object} Status information
 */
function getTriggerStatus() {
  const manager = getTriggerManager();
  return manager.getTriggerStatus();
}

/**
 * Setup standard system triggers
 * @returns {Object} Setup result
 */
function setupSystemTriggers() {
  const triggerLogger = logger.scope('SystemTriggerSetup');
  triggerLogger.enterFunction('setupSystemTriggers');

  try {
    const results = [];

    // Health check trigger (every hour)
    const healthResult = createTimeTrigger('scheduledHealthCheck', {
      type: 'hours',
      interval: 1
    }, { description: 'System health monitoring' });
    results.push({ name: 'Health Check', ...healthResult });

    // Cache cleanup trigger (every 30 minutes)
    const cacheResult = createTimeTrigger('cleanupExpiredCache', {
      type: 'minutes',
      interval: 30
    }, { description: 'Cache cleanup' });
    results.push({ name: 'Cache Cleanup', ...cacheResult });

    // Weekly schedule trigger (Monday at 9 AM)
    const weeklyResult = createTimeTrigger('runWeeklySchedule', {
      type: 'weekly',
      day: 'monday',
      time: '09:00'
    }, { description: 'Weekly content scheduling' });
    results.push({ name: 'Weekly Schedule', ...weeklyResult });

    // Monthly schedule trigger (1st day at 8 AM)
    const monthlyResult = createTimeTrigger('runMonthlySchedule', {
      type: 'monthly',
      day: 1,
      time: '08:00'
    }, { description: 'Monthly content scheduling' });
    results.push({ name: 'Monthly Schedule', ...monthlyResult });

    const successCount = results.filter(r => r.success).length;
    const overallSuccess = successCount === results.length;

    triggerLogger.exitFunction('setupSystemTriggers', {
      success: overallSuccess,
      setup_count: successCount,
      total_count: results.length
    });

    return {
      success: overallSuccess,
      results: results,
      setup_count: successCount,
      total_count: results.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    triggerLogger.error('System trigger setup failed', { error: error.toString() });
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}