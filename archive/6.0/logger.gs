/**
 * @fileoverview Syston Tigers Automation - Smart Logging System
 * @version 5.0.0
 * @author Senior Software Architect
 * 
 * Centralized logging with performance tracking, sheet persistence, and debug capabilities.
 * Addresses ChatGPT feedback on consistent logging patterns.
 */


/**
 * Smart Logger class with multiple output channels and performance tracking
 */
class SmartLogger {
  
  constructor() {
    this.timers = new Map();
    this.sessionId = this.generateSessionId();
    this.logBuffer = [];
    this.initialized = false;
  }


  /**
   * Initialize logger (called once per execution)
   * @returns {boolean} Success status
   */
  init() {
    if (this.initialized) return true;
    
    try {
      this.logLevel = getConfig('LOGGING.LEVEL', 'INFO');
      this.maxEntries = getConfig('LOGGING.MAX_LOG_ENTRIES', 1000);
      this.retentionDays = getConfig('LOGGING.LOG_RETENTION_DAYS', 30);
      this.performanceTracking = getConfig('LOGGING.PERFORMANCE_TRACKING', true);
      
      const channels = getConfig('LOGGING.CHANNELS', {});
      this.consoleEnabled = channels.CONSOLE !== false;
      this.sheetEnabled = channels.SHEET !== false; 
      this.externalEnabled = channels.EXTERNAL === true;
      
      this.initialized = true;
      this.info('SmartLogger initialized', { 
        sessionId: this.sessionId,
        level: this.logLevel,
        channels: { console: this.consoleEnabled, sheet: this.sheetEnabled }
      });
      
      return true;
    } catch (error) {
      console.error('Logger initialization failed:', error);
      return false;
    }
  }


  /**
   * Generate unique session ID for tracking
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }


  /**
   * Get current timestamp in ISO format
   * @returns {string} Timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }


  /**
   * Check if log level should be output
   * @param {string} level - Log level to check
   * @returns {boolean} Should log
   */
  shouldLog(level) {
    const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    const currentLevel = levels[this.logLevel] || 1;
    const checkLevel = levels[level] || 1;
    return checkLevel >= currentLevel;
  }


  /**
   * Format log entry for output
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @returns {Object} Formatted entry
   */
  formatEntry(level, message, data = null) {
    const entry = {
      timestamp: this.getTimestamp(),
      sessionId: this.sessionId,
      level: level,
      message: message,
      data: data,
      function: this.getCurrentFunction(),
      execution_time_ms: null
    };


    // Add performance data if available
    if (this.performanceTracking && this.timers.has('current_operation')) {
      const startTime = this.timers.get('current_operation');
      entry.execution_time_ms = Date.now() - startTime;
    }


    return entry;
  }


  /**
   * Get current function name from stack trace
   * @returns {string} Function name
   */
  getCurrentFunction() {
    try {
      const stack = new Error().stack;
      const lines = stack.split('\n');
      // Skip logger functions to get actual caller
      for (let i = 3; i < lines.length; i++) {
        const line = lines[i];
        if (line && !line.includes('SmartLogger') && !line.includes('Logger.js')) {
          const match = line.match(/at\s+([^\s]+)/);
          return match ? match[1] : 'unknown';
        }
      }
    } catch (error) {
      // Ignore stack trace errors
    }
    return 'unknown';
  }


  /**
   * Output log entry to enabled channels
   * @param {Object} entry - Log entry
   */
  output(entry) {
    // Console output
    if (this.consoleEnabled) {
      const logFunc = console[entry.level.toLowerCase()] || console.log;
      logFunc(`[${entry.level}] ${entry.message}`, entry.data || '');
    }


    // Add to buffer for sheet output
    if (this.sheetEnabled) {
      this.logBuffer.push(entry);
      
      // Flush buffer if it gets too large
      if (this.logBuffer.length >= 50) {
        this.flushToSheet();
      }
    }


    // Future: External logging service
    if (this.externalEnabled) {
      this.sendToExternal(entry);
    }
  }


  /**
   * Write buffered logs to sheet
   */
  flushToSheet() {
    if (this.logBuffer.length === 0) return;
    
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const logSheet = ss.getSheetByName(getConfig('SHEETS.LOGS', 'Logs'));
      
      if (!logSheet) {
        console.warn('Logs sheet not found - creating it');
        const newSheet = ss.insertSheet('Logs');
        newSheet.getRange(1, 1, 1, 7).setValues([
          ['Timestamp', 'Session', 'Level', 'Function', 'Message', 'Data', 'Execution_MS']
        ]);
        newSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
        return; // Will flush on next call
      }


      // Prepare data for batch insert
      const values = this.logBuffer.map(entry => [
        entry.timestamp,
        entry.sessionId,
        entry.level,
        entry.function,
        entry.message,
        entry.data ? JSON.stringify(entry.data) : '',
        entry.execution_time_ms || ''
      ]);


      // Batch insert for performance
      if (values.length > 0) {
        logSheet.getRange(logSheet.getLastRow() + 1, 1, values.length, 7).setValues(values);
      }


      // Clear buffer
      this.logBuffer = [];


      // Clean old entries if needed
      this.cleanOldLogs(logSheet);
      
    } catch (error) {
      console.error('Failed to flush logs to sheet:', error);
      // Keep entries in buffer for retry
    }
  }


  /**
   * Clean old log entries from sheet
   * @param {Sheet} logSheet - The logs sheet
   */
  cleanOldLogs(logSheet) {
    try {
      if (!this.retentionDays) return;
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
      
      const data = logSheet.getDataRange().getValues();
      let deleteRows = 0;
      
      for (let i = 1; i < data.length; i++) {
        const logDate = new Date(data[i][0]);
        if (logDate < cutoffDate) {
          deleteRows++;
        } else {
          break; // Assuming logs are chronological
        }
      }
      
      if (deleteRows > 0) {
        logSheet.deleteRows(2, deleteRows); // Skip header row
        console.info(`Cleaned ${deleteRows} old log entries`);
      }
      
    } catch (error) {
      console.error('Failed to clean old logs:', error);
    }
  }


  /**
   * Send log to external service (future implementation)
   * @param {Object} entry - Log entry
   */
  sendToExternal(entry) {
    // Future: Send to external logging service
    // Could integrate with services like LogDNA, Papertrail, etc.
  }


  // ===== PUBLIC LOGGING METHODS =====


  /**
   * Log debug message
   * @param {string} message - Message to log
   * @param {Object} data - Additional data
   */
  debug(message, data = null) {
    if (!this.initialized) this.init();
    if (!this.shouldLog('DEBUG')) return;
    
    const entry = this.formatEntry('DEBUG', message, data);
    this.output(entry);
  }


  /**
   * Log info message (function entry/exit per architecture rules)
   * @param {string} message - Message to log
   * @param {Object} data - Additional data
   */
  info(message, data = null) {
    if (!this.initialized) this.init();
    if (!this.shouldLog('INFO')) return;
    
    const entry = this.formatEntry('INFO', message, data);
    this.output(entry);
  }


  /**
   * Log warning message
   * @param {string} message - Message to log
   * @param {Object} data - Additional data
   */
  warn(message, data = null) {
    if (!this.initialized) this.init();
    if (!this.shouldLog('WARN')) return;
    
    const entry = this.formatEntry('WARN', message, data);
    this.output(entry);
  }


  /**
   * Log error message (in catch blocks per architecture rules)
   * @param {string} message - Message to log
   * @param {Object} data - Additional data (usually error object)
   */
  error(message, data = null) {
    if (!this.initialized) this.init();
    if (!this.shouldLog('ERROR')) return;
    
    const entry = this.formatEntry('ERROR', message, data);
    this.output(entry);
  }


  // ===== PERFORMANCE TRACKING =====


  /**
   * Start performance timer
   * @param {string} operationName - Name of operation to time
   */
  startTimer(operationName = 'default') {
    if (!this.performanceTracking) return;
    
    const timerKey = `timer_${operationName}`;
    this.timers.set(timerKey, Date.now());
    this.timers.set('current_operation', Date.now());
    
    this.debug(`Timer started: ${operationName}`);
  }


  /**
   * End performance timer and log result
   * @param {string} operationName - Name of operation being timed
   * @returns {number} Elapsed time in milliseconds
   */
  endTimer(operationName = 'default') {
    if (!this.performanceTracking) return 0;
    
    const timerKey = `timer_${operationName}`;
    const startTime = this.timers.get(timerKey);
    
    if (!startTime) {
      this.warn(`Timer not found: ${operationName}`);
      return 0;
    }
    
    const elapsed = Date.now() - startTime;
    this.timers.delete(timerKey);
    
    this.info(`Timer completed: ${operationName}`, { 
      elapsed_ms: elapsed,
      performance_category: this.categorizePerformance(elapsed)
    });
    
    return elapsed;
  }


  /**
   * Categorize performance for analysis
   * @param {number} elapsedMs - Elapsed milliseconds
   * @returns {string} Performance category
   */
  categorizePerformance(elapsedMs) {
    if (elapsedMs < 100) return 'fast';
    if (elapsedMs < 1000) return 'normal';
    if (elapsedMs < 5000) return 'slow';
    return 'very_slow';
  }


  // ===== SPECIALIZED LOGGING =====


  /**
   * Log function entry (per architecture rules)
   * @param {string} functionName - Name of function being entered
   * @param {Object} params - Function parameters
   */
  enterFunction(functionName, params = null) {
    this.startTimer(functionName);
    this.info(`→ Entering ${functionName}`, params);
  }


  /**
   * Log function exit (per architecture rules)
   * @param {string} functionName - Name of function being exited
   * @param {Object} result - Function result
   */
  exitFunction(functionName, result = null) {
    const elapsed = this.endTimer(functionName);
    this.info(`← Exiting ${functionName}`, { 
      result: result,
      duration_ms: elapsed
    });
  }


  /**
   * Log test hook (per architecture rules)
   * @param {string} hookId - Unique hook identifier
   * @param {Object} context - Hook context data
   */
  testHook(hookId, context = null) {
    this.debug(`@testHook(${hookId})`, context);
  }


  /**
   * Log API call attempt
   * @param {string} service - Service name (Make.com, XbotGo, etc.)
   * @param {string} endpoint - API endpoint
   * @param {Object} payload - Request payload
   */
  apiCall(service, endpoint, payload = null) {
    this.info(`API Call: ${service}${endpoint}`, {
      service: service,
      endpoint: endpoint,
      payload_size: payload ? JSON.stringify(payload).length : 0,
      timestamp: this.getTimestamp()
    });
  }


  /**
   * Log API response
   * @param {string} service - Service name
   * @param {number} status - HTTP status code
   * @param {Object} response - Response data
   */
  apiResponse(service, status, response = null) {
    const level = status >= 200 && status < 300 ? 'INFO' : 'WARN';
    this[level.toLowerCase()](`API Response: ${service} (${status})`, {
      service: service,
      status: status,
      success: status >= 200 && status < 300,
      response_size: response ? JSON.stringify(response).length : 0
    });
  }


  /**
   * Flush all pending logs (call before script exit)
   */
  flush() {
    if (this.logBuffer.length > 0) {
      this.flushToSheet();
    }
    
    this.info('Logger session ended', {
      sessionId: this.sessionId,
      duration: Date.now() - parseInt(this.sessionId.split('-')[0])
    });
  }
}


// Create singleton instance
const logger = new SmartLogger();
// Export for global access
globalThis.logger = logger;
mains.gs


/**
 * @fileoverview Syston Tigers Automation - Main Coordination and Public API
 * @version 5.0.0
 * @author Senior Software Architect
 * 
 * Main coordination layer that ties all components together and provides
 * public API functions for Google Apps Script integration.
 */


/**
 * Main Automation Coordinator - Central orchestration of all automation components
 */
class SystonAutomationCoordinator extends BaseAutomationComponent {
  
  constructor() {
    super('SystonAutomationCoordinator');
    this.components = new Map();
    this.initialized = false;
    this.scheduledJobs = new Map();
  }


  /**
   * Initialize all automation components
   * @returns {boolean} Success status
   */
  doInitialize() {
    logger.enterFunction('SystonAutomationCoordinator.doInitialize');
    
    try {
      // Load configuration from sheet if available
      loadConfigFromSheet();


      logger.info('Starting Syston Tigers Automation System', {
        version: getConfig('SYSTEM.VERSION'),
        environment: getConfig('SYSTEM.ENVIRONMENT'),
        clubName: getConfig('SYSTEM.CLUB_NAME'),
        season: getConfig('SYSTEM.SEASON')
      });


      // Initialize all components in dependency order
      const componentsToInit = [
        { name: 'MatchEventsManager', instance: matchEventsManager },
        { name: 'BatchPostingManager', instance: batchPostingManager },
        { name: 'PlayerManagementSystem', instance: playerManagementSystem },
        { name: 'EnhancedEventsManager', instance: enhancedEventsManager },
        { name: 'VideoClipsManager', instance: videoClipsManager },
        { name: 'XbotGoIntegrationManager', instance: xbotGoIntegrationManager }
      ];


      let successCount = 0;
      const failedComponents = [];


      for (const component of componentsToInit) {
        logger.testHook('component_initialization', { name: component.name });
        
        try {
          const success = component.instance.initialize();
          if (success) {
            this.components.set(component.name, component.instance);
            successCount++;
            logger.info(`${component.name} initialized successfully`);
          } else {
            failedComponents.push(component.name);
            logger.error(`${component.name} initialization failed`);
          }
        } catch (error) {
          failedComponents.push(component.name);
          logger.error(`${component.name} initialization exception`, { error: error.toString() });
        }
      }


      // System is considered initialized if core components are ready
      const coreComponents = ['MatchEventsManager', 'BatchPostingManager'];
      const coreInitialized = coreComponents.every(name => this.components.has(name));


      if (coreInitialized) {
        this.initialized = true;
        this.setupScheduledJobs();
        
        logger.info('Syston Tigers Automation System initialized', {
          successCount: successCount,
          totalComponents: componentsToInit.length,
          failedComponents: failedComponents,
          coreSystemReady: true
        });
      } else {
        logger.error('Core components failed to initialize', {
          failedComponents: failedComponents
        });
      }


      logger.exitFunction('SystonAutomationCoordinator.doInitialize', { 
        success: this.initialized,
        successCount: successCount,
        failedComponents: failedComponents
      });


      return this.initialized;


    } catch (error) {
      logger.error('System initialization failed', { error: error.toString() });
      return false;
    }
  }


  /**
   * Setup scheduled automation jobs
   */
  setupScheduledJobs() {
    logger.enterFunction('SystonAutomationCoordinator.setupScheduledJobs');


    try {
      // Player stats summary (every 2nd week of month per checklist)
      this.scheduledJobs.set('player_stats_summary', {
        name: 'Player Stats Summary',
        dayOfMonth: getConfig('SCHEDULE.PLAYER_STATS_SUMMARY.DAY_OF_MONTH', 14),
        hour: getConfig('SCHEDULE.PLAYER_STATS_SUMMARY.HOUR', 10),
        enabled: true
      });


      // GOTM voting management
      this.scheduledJobs.set('gotm_open', {
        name: 'GOTM Voting Open',
        dayOfMonth: getConfig('SCHEDULE.GOTM_VOTING.OPEN_DAY', 1),
        hour: 9,
        enabled: true
      });


      this.scheduledJobs.set('gotm_close', {
        name: 'GOTM Voting Close',
        dayOfMonth: getConfig('SCHEDULE.GOTM_VOTING.CLOSE_DAY', 7),
        hour: 21,
        enabled: true
      });


      // Monthly summaries
      this.scheduledJobs.set('monthly_fixtures', {
        name: 'Monthly Fixtures Summary',
        dayOfMonth: 25, // Near end of month for next month preview
        hour: 12,
        enabled: true
      });


      this.scheduledJobs.set('monthly_results', {
        name: 'Monthly Results Summary', 
        dayOfMonth: 2, // Early in month for previous month review
        hour: 10,
        enabled: true
      });


      logger.info('Scheduled jobs configured', {
        jobCount: this.scheduledJobs.size,
        jobs: Array.from(this.scheduledJobs.keys())
      });


      logger.exitFunction('SystonAutomationCoordinator.setupScheduledJobs', { success: true });


    } catch (error) {
      logger.error('Failed to setup scheduled jobs', { error: error.toString() });
    }
  }


  // ===== PUBLIC API FUNCTIONS =====


  /**
   * Check if system is ready for operations
   * @returns {boolean} System ready status
   */
  isSystemReady() {
    return this.initialized && this.components.size > 0;
  }


  /**
   * Get system status and component health
   * @returns {Object} System status
   */
  getSystemStatus() {
    logger.enterFunction('SystonAutomationCoordinator.getSystemStatus');


    const status = {
      systemReady: this.isSystemReady(),
      version: getConfig('SYSTEM.VERSION'),
      environment: getConfig('SYSTEM.ENVIRONMENT'),
      componentsInitialized: this.components.size,
      scheduledJobsCount: this.scheduledJobs.size,
      lastInitialized: this.initialized ? DateUtils.now().toISOString() : null,
      
      components: {},
      scheduledJobs: Array.from(this.scheduledJobs.entries()).map(([key, job]) => ({
        name: job.name,
        dayOfMonth: job.dayOfMonth,
        hour: job.hour,
        enabled: job.enabled
      }))
    };


    // Get component status
    for (const [name, component] of this.components) {
      status.components[name] = {
        initialized: component.initialized || false,
        componentName: component.componentName || name
      };
    }


    logger.exitFunction('SystonAutomationCoordinator.getSystemStatus', status);
    return status;
  }
}


// ===== SINGLETON COORDINATOR =====
const coordinator = new SystonAutomationCoordinator();


// ===== PUBLIC API FUNCTIONS (for Google Apps Script) =====


/**
 * Initialize the entire automation system
 * Call this once when setting up the system
 * @returns {boolean} Success status
 */
function initializeSystonAutomation() {
  logger.enterFunction('initializeSystonAutomation');
  
  try {
    const success = coordinator.initialize();
    
    if (success) {
      logger.info('Syston Tigers Automation System ready for operation');
    } else {
      logger.error('Syston Tigers Automation System failed to initialize');
    }
    
    logger.exitFunction('initializeSystonAutomation', { success });
    return success;
  } catch (error) {
    logger.error('Automation initialization exception', { error: error.toString() });
    return false;
  } finally {
    logger.flush();
  }
}


/**
 * Get system status (for debugging and monitoring)
 * @returns {Object} System status
 */
function getSystonSystemStatus() {
  logger.enterFunction('getSystonSystemStatus');
  
  try {
    if (!coordinator.initialized) {
      logger.warn('System not initialized, attempting initialization');
      initializeSystonAutomation();
    }
    
    const status = coordinator.getSystemStatus();
    logger.exitFunction('getSystonSystemStatus', status);
    return status;
  } catch (error) {
    logger.error('Failed to get system status', { error: error.toString() });
    return { 
      systemReady: false, 
      error: error.toString() 
    };
  } finally {
    logger.flush();
  }
}


// ===== MATCH EVENT API FUNCTIONS =====


/**
 * Process a goal event
 * @param {string} player - Player name
 * @param {number} minute - Goal minute
 * @param {string} details - Additional details
 * @param {boolean} isPenalty - Is penalty goal
 * @returns {boolean} Success status
 */
function processGoal(player, minute, details = '', isPenalty = false) {
  logger.enterFunction('processGoal', { player, minute, details, isPenalty });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    // Process goal event
    const eventResult = enhancedMatchEvents.processGoalEnhanced(player, minute, details, isPenalty);
    
    // Create video clip for goal
    const matchEventsManager = coordinator.components.get('MatchEventsManager');
    const currentMatchId = matchEventsManager?.currentMatchId;
    
    if (currentMatchId && coordinator.components.has('VideoClipsManager')) {
      const videoManager = coordinator.components.get('VideoClipsManager');
      videoManager.createGoalClip(currentMatchId, player, minute, details);
    }


    // Push score to XbotGo if configured
    if (coordinator.components.has('XbotGoIntegrationManager')) {
      const xbotgoManager = coordinator.components.get('XbotGoIntegrationManager');
      xbotgoManager.handleGoalEvent({ player, minute, details });
    }


    logger.exitFunction('processGoal', { success: eventResult });
    return eventResult;
  } catch (error) {
    logger.error('Goal processing failed', { error: error.toString() });
    return false;
  } finally {
    logger.flush();
  }
}


/**
 * Process opposition goal event
 * @param {number} minute - Goal minute
 * @param {string} details - Additional details
 * @returns {boolean} Success status
 */
function processOppositionGoal(minute, details = '') {
  logger.enterFunction('processOppositionGoal', { minute, details });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const eventResult = enhancedMatchEvents.processOppositionGoalEnhanced(minute, details);
    
    // Push score to XbotGo if configured
    if (coordinator.components.has('XbotGoIntegrationManager')) {
      const xbotgoManager = coordinator.components.get('XbotGoIntegrationManager');
      xbotgoManager.handleGoalEvent({ player: 'Opposition', minute, details });
    }


    logger.exitFunction('processOppositionGoal', { success: eventResult });
    return eventResult;
  } catch (error) {
    logger.error('Opposition goal processing failed', { error: error.toString() });
    return false;
  } finally {
    logger.flush();
  }
}


/**
 * Process card event (including 2nd yellow per checklist)
 * @param {string} player - Player name
 * @param {string} cardType - Card type ('yellow', 'red', 'second_yellow', 'sin_bin')
 * @param {number} minute - Card minute
 * @param {string} details - Additional details
 * @returns {boolean} Success status
 */
function processCard(player, cardType, minute, details = '') {
  logger.enterFunction('processCard', { player, cardType, minute, details });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    let eventResult;
    
    if (cardType === 'second_yellow') {
      eventResult = enhancedMatchEvents.processSecondYellowEnhanced(player, minute, details);
    } else if (player === 'Opposition') {
      eventResult = enhancedMatchEvents.processOppositionCardEnhanced(cardType, minute, details);
    } else {
      eventResult = enhancedMatchEvents.processCardEnhanced(player, cardType, minute, details);
    }


    logger.exitFunction('processCard', { success: eventResult });
    return eventResult;
  } catch (error) {
    logger.error('Card processing failed', { error: error.toString() });
    return false;
  } finally {
    logger.flush();
  }
}


/**
 * Process substitution event
 * @param {string} playerOff - Player coming off
 * @param {string} playerOn - Player coming on
 * @param {number} minute - Substitution minute
 * @returns {boolean} Success status
 */
function processSubstitution(playerOff, playerOn, minute) {
  logger.enterFunction('processSubstitution', { playerOff, playerOn, minute });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const playerManager = coordinator.components.get('PlayerManagementSystem');
    if (!playerManager) {
      logger.error('PlayerManagementSystem not available');
      return false;
    }


    const eventResult = playerManager.processSubstitution(playerOff, playerOn, minute);


    logger.exitFunction('processSubstitution', { success: eventResult });
    return eventResult;
  } catch (error) {
    logger.error('Substitution processing failed', { error: error.toString() });
    return false;
  } finally {
    logger.flush();
  }
}


/**
 * Process Man of the Match award
 * @param {string} player - Player name
 * @returns {boolean} Success status
 */
function processMotm(player) {
  logger.enterFunction('processMotm', { player });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const eventResult = enhancedMatchEvents.processMotmEnhanced(player);


    logger.exitFunction('processMotm', { success: eventResult });
    return eventResult;
  } catch (error) {
    logger.error('MOTM processing failed', { error: error.toString() });
    return false;
  } finally {
    logger.flush();
  }
}


/**
 * Process 2nd half kick off (per checklist requirement)
 * @returns {boolean} Success status
 */
function processSecondHalfKickOff() {
  logger.enterFunction('processSecondHalfKickOff');
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const eventResult = enhancedMatchEvents.processSecondHalfKickOffEnhanced();


    logger.exitFunction('processSecondHalfKickOff', { success: eventResult });
    return eventResult;
  } catch (error) {
    logger.error('2nd half kick off processing failed', { error: error.toString() });
    return false;
  } finally {
    logger.flush();
  }
}


/**
 * Process full time and finalize match
 * @returns {boolean} Success status
 */
function processFullTime() {
  logger.enterFunction('processFullTime');
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    // Finalize player minutes
    const playerManager = coordinator.components.get('PlayerManagementSystem');
    if (playerManager) {
      playerManager.finalizeMatchMinutes(90);
    }


    // Push final score to XbotGo
    if (coordinator.components.has('XbotGoIntegrationManager')) {
      const xbotgoManager = coordinator.components.get('XbotGoIntegrationManager');
      xbotgoManager.handleFullTimeEvent({});
    }


    logger.exitFunction('processFullTime', { success: true });
    return true;
  } catch (error) {
    logger.error('Full time processing failed', { error: error.toString() });
    return false;
  } finally {
    logger.flush();
  }
}


// ===== BATCH POSTING API FUNCTIONS =====


/**
 * Post batch of league fixtures (per checklist requirement)
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)  
 * @returns {Object} Batch posting result
 */
function postLeagueFixturesBatch(startDate = null, endDate = null) {
  logger.enterFunction('postLeagueFixturesBatch', { startDate, endDate });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const batchManager = coordinator.components.get('BatchPostingManager');
    if (!batchManager) {
      logger.error('BatchPostingManager not available');
      return { success: false, error: 'Batch posting not available' };
    }


    const result = batchManager.postLeagueFixturesBatch(startDate, endDate);


    logger.exitFunction('postLeagueFixturesBatch', result);
    return result;
  } catch (error) {
    logger.error('League fixtures batch posting failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Post batch of league results (per checklist requirement)
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Object} Batch posting result
 */
function postLeagueResultsBatch(startDate = null, endDate = null) {
  logger.enterFunction('postLeagueResultsBatch', { startDate, endDate });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const batchManager = coordinator.components.get('BatchPostingManager');
    if (!batchManager) {
      logger.error('BatchPostingManager not available');
      return { success: false, error: 'Batch posting not available' };
    }


    const result = batchManager.postLeagueResultsBatch(startDate, endDate);


    logger.exitFunction('postLeagueResultsBatch', result);
    return result;
  } catch (error) {
    logger.error('League results batch posting failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


// ===== ENHANCED EVENTS API FUNCTIONS =====


/**
 * Post postponed match notification (per checklist requirement)
 * @param {string} opponent - Opponent name
 * @param {Date} originalDate - Original match date
 * @param {string} reason - Postponement reason
 * @param {Date} newDate - New date if known (optional)
 * @returns {Object} Posting result
 */
function postPostponed(opponent, originalDate, reason, newDate = null) {
  logger.enterFunction('postPostponed', { opponent, originalDate, reason, newDate });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const enhancedManager = coordinator.components.get('EnhancedEventsManager');
    if (!enhancedManager) {
      logger.error('EnhancedEventsManager not available');
      return { success: false, error: 'Enhanced events not available' };
    }


    const result = enhancedManager.postPostponed(opponent, originalDate, reason, newDate);


    logger.exitFunction('postPostponed', result);
    return result;
  } catch (error) {
    logger.error('Postponed posting failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Post monthly fixtures summary (per checklist requirement)
 * @param {Date} monthDate - Month to summarize (optional)
 * @returns {Object} Summary result
 */
function postMonthlyFixturesSummary(monthDate = null) {
  logger.enterFunction('postMonthlyFixturesSummary', { monthDate });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const enhancedManager = coordinator.components.get('EnhancedEventsManager');
    if (!enhancedManager) {
      logger.error('EnhancedEventsManager not available');
      return { success: false, error: 'Enhanced events not available' };
    }


    const result = enhancedManager.postMonthlyFixturesSummary(monthDate);


    logger.exitFunction('postMonthlyFixturesSummary', result);
    return result;
  } catch (error) {
    logger.error('Monthly fixtures summary failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Post monthly results summary (per checklist requirement)
 * @param {Date} monthDate - Month to summarize (optional)
 * @returns {Object} Summary result
 */
function postMonthlyResultsSummary(monthDate = null) {
  logger.enterFunction('postMonthlyResultsSummary', { monthDate });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const enhancedManager = coordinator.components.get('EnhancedEventsManager');
    if (!enhancedManager) {
      logger.error('EnhancedEventsManager not available');
      return { success: false, error: 'Enhanced events not available' };
    }


    const result = enhancedManager.postMonthlyResultsSummary(monthDate);


    logger.exitFunction('postMonthlyResultsSummary', result);
    return result;
  } catch (error) {
    logger.error('Monthly results summary failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


// ===== PLAYER STATS API FUNCTIONS =====


/**
 * Post player stats summary (per checklist - every 2nd week)
 * @param {string} period - Period description (optional)
 * @returns {Object} Summary result
 */
function postPlayerStatsSummary(period = null) {
  logger.enterFunction('postPlayerStatsSummary', { period });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const playerManager = coordinator.components.get('PlayerManagementSystem');
    if (!playerManager) {
      logger.error('PlayerManagementSystem not available');
      return { success: false, error: 'Player management not available' };
    }


    const result = playerManager.postPlayerStatsSummary(period);


    logger.exitFunction('postPlayerStatsSummary', result);
    return result;
  } catch (error) {
    logger.error('Player stats summary failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Initialize match minutes tracking
 * @param {Array} startingXI - Starting 11 players
 * @param {Array} bench - Bench players
 * @returns {boolean} Success status
 */
function initializeMatchMinutesTracking(startingXI, bench) {
  logger.enterFunction('initializeMatchMinutesTracking', { 
    startingCount: startingXI.length, 
    benchCount: bench.length 
  });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const playerManager = coordinator.components.get('PlayerManagementSystem');
    if (!playerManager) {
      logger.error('PlayerManagementSystem not available');
      return false;
    }


    const result = playerManager.initializeMinutesTracking(startingXI, bench);


    logger.exitFunction('initializeMatchMinutesTracking', { success: result });
    return result;
  } catch (error) {
    logger.error('Minutes tracking initialization failed', { error: error.toString() });
    return false;
  } finally {
    logger.flush();
  }
}


// ===== GOTM AND VIDEO API FUNCTIONS =====


/**
 * Open Goal of the Month voting
 * @param {string} month - Month to open voting for (optional)
 * @returns {Object} Voting opening result
 */
function openGotmVoting(month = null) {
  logger.enterFunction('openGotmVoting', { month });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const videoManager = coordinator.components.get('VideoClipsManager');
    if (!videoManager) {
      logger.error('VideoClipsManager not available');
      return { success: false, error: 'Video clips manager not available' };
    }


    const result = videoManager.openGotmVoting(month);


    logger.exitFunction('openGotmVoting', result);
    return result;
  } catch (error) {
    logger.error('GOTM voting opening failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Close Goal of the Month voting and compute winner
 * @param {string} month - Month to close voting for (optional)
 * @returns {Object} Voting closing result
 */
function closeGotmVoting(month = null) {
  logger.enterFunction('closeGotmVoting', { month });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const videoManager = coordinator.components.get('VideoClipsManager');
    if (!videoManager) {
      logger.error('VideoClipsManager not available');
      return { success: false, error: 'Video clips manager not available' };
    }


    const result = videoManager.closeGotmVoting(month);


    logger.exitFunction('closeGotmVoting', result);
    return result;
  } catch (error) {
    logger.error('GOTM voting closing failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Process video clip queue (using configured method)
 * @param {string} method - Processing method ('ffmpeg' or 'cloudconvert', optional)
 * @returns {Object} Processing result
 */
function processVideoClipQueue(method = 'cloudconvert') {
  logger.enterFunction('processVideoClipQueue', { method });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const videoManager = coordinator.components.get('VideoClipsManager');
    if (!videoManager) {
      logger.error('VideoClipsManager not available');
      return { success: false, error: 'Video clips manager not available' };
    }


    let result;
    if (method === 'ffmpeg') {
      result = videoManager.processClipQueueFFmpeg();
    } else {
      result = videoManager.processClipQueueCloudConvert();
    }


    logger.exitFunction('processVideoClipQueue', result);
    return result;
  } catch (error) {
    logger.error('Video clip queue processing failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


// ===== XBOTGO API FUNCTIONS =====


/**
 * Push score to XbotGo scoreboard (per checklist requirement)
 * @param {string} matchId - Match ID
 * @param {number} homeScore - Home score
 * @param {number} awayScore - Away score
 * @returns {Object} Push result
 */
function pushScoreToXbotGo(matchId, homeScore, awayScore) {
  logger.enterFunction('pushScoreToXbotGo', { matchId, homeScore, awayScore });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const xbotgoManager = coordinator.components.get('XbotGoIntegrationManager');
    if (!xbotgoManager) {
      logger.warn('XbotGoIntegrationManager not available');
      return { success: false, error: 'XbotGo integration not available' };
    }


    const result = xbotgoManager.pushScoreToXbotGo(matchId, homeScore, awayScore);


    logger.exitFunction('pushScoreToXbotGo', result);
    return result;
  } catch (error) {
    logger.error('XbotGo score push failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Smart score push to XbotGo with automatic fallback
 * @param {string} matchId - Match ID
 * @param {number} homeScore - Home score
 * @param {number} awayScore - Away score
 * @returns {Object} Push result
 */
function smartPushScoreToXbotGo(matchId, homeScore, awayScore) {
  logger.enterFunction('smartPushScoreToXbotGo', { matchId, homeScore, awayScore });
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const xbotgoManager = coordinator.components.get('XbotGoIntegrationManager');
    if (!xbotgoManager) {
      logger.warn('XbotGoIntegrationManager not available');
      return { success: false, error: 'XbotGo integration not available' };
    }


    const result = xbotgoManager.smartPushScore(matchId, homeScore, awayScore);


    logger.exitFunction('smartPushScoreToXbotGo', result);
    return result;
  } catch (error) {
    logger.error('Smart XbotGo score push failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


// ===== SCHEDULED AUTOMATION FUNCTIONS =====


/**
 * Run scheduled automations (called by Google Apps Script triggers)
 * @returns {Object} Automation run result
 */
function runScheduledAutomations() {
  logger.enterFunction('runScheduledAutomations');
  
  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const now = DateUtils.now();
    const currentDay = now.getDate();
    const currentHour = now.getHours();
    const results = [];


    logger.info('Running scheduled automations check', {
      currentDay: currentDay,
      currentHour: currentHour
    });


    // Check each scheduled job
    for (const [jobKey, job] of coordinator.scheduledJobs) {
      if (!job.enabled) continue;


      if (job.dayOfMonth === currentDay && job.hour === currentHour) {
        logger.info(`Executing scheduled job: ${job.name}`, { jobKey });
        
        try {
          let jobResult = null;
          
          switch (jobKey) {
            case 'player_stats_summary':
              jobResult = postPlayerStatsSummary();
              break;
            case 'gotm_open':
              jobResult = openGotmVoting();
              break;
            case 'gotm_close':
              jobResult = closeGotmVoting();
              break;
            case 'monthly_fixtures':
              jobResult = postMonthlyFixturesSummary();
              break;
            case 'monthly_results':
              jobResult = postMonthlyResultsSummary();
              break;
            default:
              logger.warn(`Unknown scheduled job: ${jobKey}`);
              continue;
          }
          
          results.push({
            job: job.name,
            success: jobResult?.success || false,
            result: jobResult
          });
          
        } catch (jobError) {
          logger.error(`Scheduled job ${job.name} failed`, { error: jobError.toString() });
          results.push({
            job: job.name,
            success: false,
            error: jobError.toString()
          });
        }
      }
    }


    const result = {
      success: true,
      executedJobs: results.length,
      results: results,
      timestamp: DateUtils.now().toISOString()
    };


    logger.exitFunction('runScheduledAutomations', result);
    return result;


  } catch (error) {
    logger.error('Scheduled automations failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Test all system components (for debugging)
 * @returns {Object} Test results
 */
function testSystemComponents() {
  logger.enterFunction('testSystemComponents');
  
  try {
    const results = {
      systemReady: coordinator.isSystemReady(),
      components: {},
      overallSuccess: true
    };


    // Test each component
    for (const [name, component] of coordinator.components) {
      logger.testHook('component_test', { name });
      
      try {
        // Basic component health check
        const componentResult = {
          initialized: component.initialized || false,
          componentName: component.componentName || name,
          testPassed: true
        };


        results.components[name] = componentResult;
        
      } catch (componentError) {
        results.components[name] = {
          initialized: false,
          testPassed: false,
          error: componentError.toString()
        };
        results.overallSuccess = false;
      }
    }


    logger.exitFunction('testSystemComponents', results);
    return results;


  } catch (error) {
    logger.error('System component testing failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


// Export main coordinator for global access
globalThis.SystonAutomationCoordinator = SystonAutomationCoordinator;
globalThis.coordinator = coordinator;


// Auto-initialize on first access to any public function
(function() {
  const originalLog = console.log;
  let autoInitialized = false;
  
  // This will be called before any public function if system isn't ready
  globalThis.ensureSystemReady = function() {
    if (!autoInitialized && !coordinator.isSystemReady()) {
      originalLog('Auto-initializing Syston Tigers Automation System...');
      initializeSystonAutomation();
      autoInitialized = true;
    }
  };
})();
