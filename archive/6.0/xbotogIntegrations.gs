/**
 * @fileoverview Syston Tigers Automation - Enhanced XbotGo Scoreboard Integration
 * @version 5.1.0
 * @author Senior Software Architect
 * 
 * Complete XbotGo scoreboard integration with API calls, retry logic, score change detection,
 * and fallback options. Addresses ChatGPT feedback about incomplete XbotGo implementation.
 */


/**
 * XbotGo Integration Manager - Handles scoreboard updates with intelligent change detection
 * Per checklist: pushes scores to XbotGo with retry/backoff, error logging, and throttling
 */
class XbotGoIntegrationManager extends BaseAutomationComponent {
  
  constructor() {
    super('XbotGoIntegrationManager');
    this.apiConfig = null;
    this.deviceStatus = null;
    this.lastUpdateTime = null;
  }


  /**
   * Initialize XbotGo integration
   * @returns {boolean} Success status
   */
  doInitialize() {
    logger.enterFunction('XbotGoIntegrationManager.doInitialize');
    
    try {
      // Load XbotGo configuration
      this.apiConfig = this.getXbotGoConfig();
      
      if (!this.apiConfig.isConfigured) {
        logger.warn('XbotGo not configured - integration disabled', {
          missingConfig: this.apiConfig.missingFields
        });
        // Don't fail initialization, just disable functionality
        return true;
      }


      // Test connection to XbotGo device
      const connectionTest = this.testConnection();
      if (!connectionTest.success) {
        logger.warn('XbotGo connection test failed', connectionTest.error);
        // Don't fail initialization, will retry during actual operations
      }


      logger.exitFunction('XbotGoIntegrationManager.doInitialize', { 
        success: true,
        configured: this.apiConfig.isConfigured
      });
      return true;


    } catch (error) {
      logger.error('XbotGoIntegrationManager initialization failed', { error: error.toString() });
      return false;
    }
  }


  /**
   * Get XbotGo configuration from Script Properties
   * @returns {Object} Configuration object with validation
   */
  getXbotGoConfig() {
    logger.testHook('xbotgo_config_loading');
    
    try {
      const properties = PropertiesService.getScriptProperties();
      
      const config = {
        apiUrl: properties.getProperty(getConfig('XBOTGO.API_URL_PROPERTY', 'XBOTGO_API_URL')),
        apiKey: properties.getProperty(getConfig('XBOTGO.API_KEY_PROPERTY', 'XBOTGO_API_KEY')),
        deviceId: properties.getProperty(getConfig('XBOTGO.DEVICE_ID_PROPERTY', 'XBOTGO_DEVICE_ID')),
        
        // Configuration from SYSTEM_CONFIG
        timeout: getConfig('XBOTGO.TIMEOUT_MS', 15000),
        maxRetries: getConfig('XBOTGO.MAX_RETRIES', 3),
        retryDelay: getConfig('XBOTGO.RETRY_DELAY_MS', 2000),
        minUpdateInterval: getConfig('XBOTGO.MIN_UPDATE_INTERVAL_MS', 10000),
        
        endpoints: getConfig('XBOTGO.ENDPOINTS', {
          updateScore: '/api/v1/scoreboard/update',
          getStatus: '/api/v1/device/status',
          resetBoard: '/api/v1/scoreboard/reset'
        })
      };


      // Validate required fields
      const requiredFields = ['apiUrl', 'apiKey', 'deviceId'];
      const missingFields = requiredFields.filter(field => !config[field]);
      
      config.isConfigured = missingFields.length === 0;
      config.missingFields = missingFields;


      logger.info('XbotGo configuration loaded', {
        configured: config.isConfigured,
        missingFields: missingFields,
        hasUrl: !!config.apiUrl,
        hasKey: !!config.apiKey,
        hasDevice: !!config.deviceId
      });


      return config;


    } catch (error) {
      logger.error('Failed to load XbotGo configuration', { error: error.toString() });
      return {
        isConfigured: false,
        error: error.toString(),
        missingFields: ['apiUrl', 'apiKey', 'deviceId']
      };
    }
  }


  // ===== SCORE CHANGE DETECTION (Enhanced Feature) =====


  /**
   * Check if score has changed since last push
   * @param {number} homeScore - Current home score
   * @param {number} awayScore - Current away score
   * @param {string} matchId - Match ID
   * @returns {boolean} Score has changed
   */
  isScoreChanged(homeScore, awayScore, matchId = 'current') {
    logger.testHook('xbotgo_score_change_check', { homeScore, awayScore, matchId });
    
    try {
      const scoreKey = `XBOTGO_LAST_SCORE_${matchId}`;
      const timestampKey = `XBOTGO_LAST_TIMESTAMP_${matchId}`;
      const currentScore = `${homeScore}-${awayScore}`;
      
      const properties = PropertiesService.getScriptProperties();
      const lastScore = properties.getProperty(scoreKey);
      const lastTimestamp = properties.getProperty(timestampKey);
      
      // Always update on first push for a match
      if (!lastScore) {
        properties.setProperties({
          [scoreKey]: currentScore,
          [timestampKey]: DateUtils.now().toISOString()
        });
        return true;
      }
      
      // Check if score changed
      const scoreChanged = lastScore !== currentScore;
      
      if (scoreChanged) {
        properties.setProperties({
          [scoreKey]: currentScore,
          [timestampKey]: DateUtils.now().toISOString()
        });
        
        logger.info('Score change detected for XbotGo push', {
          matchId: matchId,
          previousScore: lastScore,
          currentScore: currentScore
        });
      } else {
        logger.debug('No score change detected, skipping XbotGo push', {
          matchId: matchId,
          currentScore: currentScore,
          lastUpdated: lastTimestamp
        });
      }
      
      return scoreChanged;
    } catch (error) {
      logger.error('Failed to check score change', { error: error.toString() });
      return true; // Default to allowing push if check fails
    }
  }


  /**
   * Check minimum time interval between pushes
   * @param {string} matchId - Match ID
   * @param {number} minIntervalMs - Minimum interval in milliseconds
   * @returns {boolean} Enough time has passed
   */
  hasEnoughTimePassed(matchId = 'current', minIntervalMs = null) {
    minIntervalMs = minIntervalMs || this.apiConfig.minUpdateInterval || 10000;
    
    try {
      const timestampKey = `XBOTGO_LAST_TIMESTAMP_${matchId}`;
      const lastTimestamp = PropertiesService.getScriptProperties().getProperty(timestampKey);
      
      if (!lastTimestamp) return true;
      
      const lastTime = new Date(lastTimestamp).getTime();
      const now = Date.now();
      const timePassed = now - lastTime;
      
      const enoughTime = timePassed >= minIntervalMs;
      
      if (!enoughTime) {
        logger.debug('XbotGo push throttled', {
          matchId: matchId,
          timeSinceLastPush: `${Math.round(timePassed/1000)}s`,
          minimumInterval: `${Math.round(minIntervalMs/1000)}s`
        });
      }
      
      return enoughTime;
    } catch (error) {
      logger.error('Failed to check time interval', { error: error.toString() });
      return true; // Default to allowing push if check fails
    }
  }


  // ===== CONNECTION TESTING =====


  /**
   * Test connection to XbotGo device
   * @returns {Object} Connection test result
   */
  testConnection() {
    logger.enterFunction('XbotGoIntegrationManager.testConnection');
    
    if (!this.apiConfig.isConfigured) {
      return { 
        success: false, 
        error: 'XbotGo not configured',
        missingFields: this.apiConfig.missingFields 
      };
    }


    logger.testHook('xbotgo_connection_test');
    
    try {
      const statusResult = this.getDeviceStatus();
      
      const result = {
        success: statusResult.success,
        deviceStatus: statusResult.data,
        error: statusResult.error,
        connectionTime: DateUtils.now().toISOString()
      };


      logger.exitFunction('XbotGoIntegrationManager.testConnection', result);
      return result;


    } catch (error) {
      const result = { 
        success: false, 
        error: error.toString(),
        connectionTime: DateUtils.now().toISOString()
      };
      
      logger.exitFunction('XbotGoIntegrationManager.testConnection', result);
      return result;
    }
  }


  /**
   * Get device status from XbotGo API
   * @returns {Object} API response with device status
   */
  getDeviceStatus() {
    logger.testHook('xbotgo_status_request');
    
    if (!this.apiConfig.isConfigured) {
      return { 
        success: false, 
        error: 'XbotGo not configured' 
      };
    }


    const url = `${this.apiConfig.apiUrl}${this.apiConfig.endpoints.getStatus}`;
    const headers = {
      'Authorization': `Bearer ${this.apiConfig.apiKey}`,
      'Content-Type': 'application/json',
      'X-Device-ID': this.apiConfig.deviceId
    };


    try {
      const response = ApiUtils.makeRequest(url, {
        method: 'GET',
        headers: headers,
        timeout: this.apiConfig.timeout
      });


      if (response.success && response.json) {
        this.deviceStatus = response.json;
        
        return {
          success: true,
          data: response.json,
          timestamp: DateUtils.now().toISOString()
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.data}`,
          timestamp: DateUtils.now().toISOString()
        };
      }


    } catch (error) {
      return {
        success: false,
        error: error.toString(),
        timestamp: DateUtils.now().toISOString()
      };
    }
  }


  // ===== CORE SCORE PUSHING FUNCTIONALITY =====


  /**
   * Push score to XbotGo scoreboard with change detection (per checklist requirement)
   * @param {string} matchId - Match ID
   * @param {number} homeScore - Home team score
   * @param {number} awayScore - Away team score
   * @param {Object} additionalData - Additional match data
   * @returns {Object} Push result
   */
  pushScoreToXbotGo(matchId, homeScore, awayScore, additionalData = {}) {
    logger.enterFunction('XbotGoIntegrationManager.pushScoreToXbotGo', {
      matchId, homeScore, awayScore, additionalData
    });


    if (!this.apiConfig.isConfigured) {
      logger.warn('XbotGo not configured, skipping score push');
      return { 
        success: false, 
        error: 'XbotGo not configured',
        skipped: true 
      };
    }


    // Validate scores
    if (!ValidationUtils.validateScore(homeScore) || !ValidationUtils.validateScore(awayScore)) {
      return { 
        success: false, 
        error: 'Invalid score values' 
      };
    }


    // Check if score has changed
    if (!this.isScoreChanged(homeScore, awayScore, matchId)) {
      return {
        success: true,
        skipped: true,
        reason: 'no_score_change',
        currentScore: `${homeScore}-${awayScore}`
      };
    }


    // Check minimum time interval (configurable, default 10 seconds)
    if (!this.hasEnoughTimePassed(matchId, this.apiConfig.minUpdateInterval)) {
      return {
        success: true,
        skipped: true,
        reason: 'throttled',
        currentScore: `${homeScore}-${awayScore}`
      };
    }


    // Proceed with actual push
    return this.withRetry(() => {
      return this.performScorePush(matchId, homeScore, awayScore, additionalData);
    }, this.apiConfig.maxRetries, this.apiConfig.retryDelay);
  }


  /**
   * Perform the actual score push with full API call
   * @param {string} matchId - Match ID
   * @param {number} homeScore - Home team score
   * @param {number} awayScore - Away team score
   * @param {Object} additionalData - Additional match data
   * @returns {Object} Push result
   */
  performScorePush(matchId, homeScore, awayScore, additionalData) {
    logger.testHook('xbotgo_score_push_attempt', { matchId, homeScore, awayScore });


    try {
      const url = `${this.apiConfig.apiUrl}${this.apiConfig.endpoints.updateScore}`;
      
      // Build the payload for XbotGo API
      const payload = {
        deviceId: this.apiConfig.deviceId,
        matchId: matchId,
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        timestamp: DateUtils.now().toISOString(),
        
        // Additional data if provided
        homeTeam: additionalData.homeTeam || 'HOME',
        awayTeam: additionalData.awayTeam || 'AWAY',
        matchTime: additionalData.matchTime || '90',
        status: additionalData.status || 'LIVE',
        
        // Metadata
        source: 'syston_automation',
        version: getConfig('SYSTEM.VERSION', '5.1.0')
      };


      const headers = {
        'Authorization': `Bearer ${this.apiConfig.apiKey}`,
        'Content-Type': 'application/json',
        'X-Device-ID': this.apiConfig.deviceId,
        'X-Match-ID': matchId
      };


      logger.apiCall('XbotGo', url, payload);


      const response = ApiUtils.makeRequest(url, {
        method: 'POST',
        headers: headers,
        payload: JSON.stringify(payload),
        timeout: this.apiConfig.timeout
      });


      logger.apiResponse('XbotGo', response.status, response.data);


      const result = {
        success: response.success,
        matchId: matchId,
        homeScore: homeScore,
        awayScore: awayScore,
        response: response,
        timestamp: DateUtils.now().toISOString()
      };


      if (response.success) {
        this.lastUpdateTime = DateUtils.now();
        logger.info('Score successfully pushed to XbotGo', result);
        
        // Log successful push
        this.logXbotGoPush(matchId, homeScore, awayScore, 'SUCCESS', response);
      } else {
        logger.error('Failed to push score to XbotGo', result);
        
        // Log failed push
        this.logXbotGoPush(matchId, homeScore, awayScore, 'FAILED', response);
      }


      logger.testHook('xbotgo_score_push_complete', result);
      return result;


    } catch (error) {
      const result = {
        success: false,
        matchId: matchId,
        error: error.toString(),
        timestamp: DateUtils.now().toISOString()
      };
      
      logger.error('XbotGo score push exception', result);
      this.logXbotGoPush(matchId, homeScore, awayScore, 'ERROR', { error: error.toString() });
      
      return result;
    }
  }


  /**
   * Reset XbotGo scoreboard (utility function)
   * @param {string} matchId - Match ID
   * @returns {Object} Reset result
   */
  resetScoreboard(matchId) {
    logger.enterFunction('XbotGoIntegrationManager.resetScoreboard', { matchId });


    if (!this.apiConfig.isConfigured) {
      return { success: false, error: 'XbotGo not configured' };
    }


    return this.withRetry(() => {
      return this.performScoreboardReset(matchId);
    }, this.apiConfig.maxRetries, this.apiConfig.retryDelay);
  }


  /**
   * Perform scoreboard reset
   * @param {string} matchId - Match ID
   * @returns {Object} Reset result
   */
  performScoreboardReset(matchId) {
    logger.testHook('xbotgo_reset_attempt', { matchId });


    try {
      const url = `${this.apiConfig.apiUrl}${this.apiConfig.endpoints.resetBoard}`;
      
      const payload = {
        deviceId: this.apiConfig.deviceId,
        matchId: matchId,
        action: 'reset',
        timestamp: DateUtils.now().toISOString()
      };


      const headers = {
        'Authorization': `Bearer ${this.apiConfig.apiKey}`,
        'Content-Type': 'application/json',
        'X-Device-ID': this.apiConfig.deviceId
      };


      const response = ApiUtils.makeRequest(url, {
        method: 'POST',
        headers: headers,
        payload: JSON.stringify(payload),
        timeout: this.apiConfig.timeout
      });


      const result = {
        success: response.success,
        matchId: matchId,
        response: response,
        timestamp: DateUtils.now().toISOString()
      };


      logger.exitFunction('XbotGoIntegrationManager.resetScoreboard', result);
      return result;


    } catch (error) {
      const result = {
        success: false,
        matchId: matchId,
        error: error.toString(),
        timestamp: DateUtils.now().toISOString()
      };
      
      logger.exitFunction('XbotGoIntegrationManager.resetScoreboard', result);
      return result;
    }
  }


  // ===== INTEGRATION WITH MATCH EVENTS =====


  /**
   * Handle goal event and push updated score to XbotGo
   * @param {Object} goalEvent - Goal event data
   * @returns {Object} Push result
   */
  handleGoalEvent(goalEvent) {
    logger.enterFunction('XbotGoIntegrationManager.handleGoalEvent', goalEvent);


    try {
      // Get current scores from Live sheet
      const scores = this.getCurrentScores();
      if (!scores.success) {
        return { success: false, error: 'Failed to get current scores' };
      }


      // Get match context
      const matchContext = this.getMatchContext();


      // Push updated score to XbotGo
      const pushResult = this.pushScoreToXbotGo(
        matchContext.matchId,
        scores.homeScore,
        scores.awayScore,
        {
          homeTeam: matchContext.homeTeam,
          awayTeam: matchContext.awayTeam,
          matchTime: goalEvent.minute,
          status: 'LIVE'
        }
      );


      logger.exitFunction('XbotGoIntegrationManager.handleGoalEvent', pushResult);
      return pushResult;


    } catch (error) {
      const result = { success: false, error: error.toString() };
      logger.exitFunction('XbotGoIntegrationManager.handleGoalEvent', result);
      return result;
    }
  }


  /**
   * Handle full time event and push final score
   * @param {Object} fullTimeEvent - Full time event data
   * @returns {Object} Push result
   */
  handleFullTimeEvent(fullTimeEvent) {
    logger.enterFunction('XbotGoIntegrationManager.handleFullTimeEvent', fullTimeEvent);


    try {
      const scores = this.getCurrentScores();
      if (!scores.success) {
        return { success: false, error: 'Failed to get current scores' };
      }


      const matchContext = this.getMatchContext();


      const pushResult = this.pushScoreToXbotGo(
        matchContext.matchId,
        scores.homeScore,
        scores.awayScore,
        {
          homeTeam: matchContext.homeTeam,
          awayTeam: matchContext.awayTeam,
          matchTime: '90',
          status: 'FULL_TIME'
        }
      );


      logger.exitFunction('XbotGoIntegrationManager.handleFullTimeEvent', pushResult);
      return pushResult;


    } catch (error) {
      const result = { success: false, error: error.toString() };
      logger.exitFunction('XbotGoIntegrationManager.handleFullTimeEvent', result);
      return result;
    }
  }


  // ===== UTILITY METHODS =====


  /**
   * Get current scores from Live sheet
   * @returns {Object} Current scores
   */
  getCurrentScores() {
    logger.testHook('xbotgo_score_reading');


    try {
      const liveSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.LIVE'));
      if (!liveSheet) {
        return { success: false, error: 'Live sheet not found' };
      }


      const homeScoreCell = getConfig('SHEETS.LIVE_CELLS.HOME_SCORE', 'C2');
      const awayScoreCell = getConfig('SHEETS.LIVE_CELLS.AWAY_SCORE', 'D2');


      const homeScore = SheetUtils.getCellValue(liveSheet, homeScoreCell, 0);
      const awayScore = SheetUtils.getCellValue(liveSheet, awayScoreCell, 0);


      return {
        success: true,
        homeScore: parseInt(homeScore) || 0,
        awayScore: parseInt(awayScore) || 0
      };


    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  }


  /**
   * Get current match context from Live sheet
   * @returns {Object} Match context data
   */
  getMatchContext() {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.LIVE'));
      if (!liveSheet) {
        return { matchId: null, homeTeam: 'HOME', awayTeam: 'AWAY' };
      }


      const matchId = SheetUtils.getCellValue(liveSheet, 
        getConfig('SHEETS.LIVE_CELLS.MATCH_ID', 'B1'), null);
      const homeTeam = SheetUtils.getCellValue(liveSheet, 
        getConfig('SHEETS.LIVE_CELLS.HOME_TEAM', 'B2'), 'HOME');
      const awayTeam = SheetUtils.getCellValue(liveSheet, 
        getConfig('SHEETS.LIVE_CELLS.AWAY_TEAM', 'B3'), 'AWAY');


      return {
        matchId: matchId,
        homeTeam: homeTeam,
        awayTeam: awayTeam
      };


    } catch (error) {
      logger.error('Failed to get match context', { error: error.toString() });
      return { matchId: null, homeTeam: 'HOME', awayTeam: 'AWAY' };
    }
  }


  /**
   * Log XbotGo push attempt to tracking sheet
   * @param {string} matchId - Match ID
   * @param {number} homeScore - Home score
   * @param {number} awayScore - Away score
   * @param {string} status - Push status
   * @param {Object} response - API response
   * @returns {boolean} Success status
   */
  logXbotGoPush(matchId, homeScore, awayScore, status, response) {
    try {
      const xbotgoSheet = SheetUtils.getOrCreateSheet(
        'XbotGo_Log',
        ['Timestamp', 'Match_ID', 'Home_Score', 'Away_Score', 'Status', 'Response']
      );
      
      if (!xbotgoSheet) return false;


      const values = [
        DateUtils.now().toISOString(),
        matchId || '',
        homeScore,
        awayScore,
        status,
        JSON.stringify(response).substr(0, 1000) // Truncate long responses
      ];


      return SheetUtils.appendRowSafe(xbotgoSheet, values);
    } catch (error) {
      logger.error('Failed to log XbotGo push', { error: error.toString() });
      return false;
    }
  }


  // ===== MAKE.COM FALLBACK (Per Checklist Note) =====


  /**
   * Fallback: Use Make.com browser automation if API fails
   * @param {string} matchId - Match ID
   * @param {number} homeScore - Home score
   * @param {number} awayScore - Away score
   * @returns {Object} Fallback result
   */
  pushScoreViaMakeFallback(matchId, homeScore, awayScore) {
    logger.enterFunction('XbotGoIntegrationManager.pushScoreViaMakeFallback', {
      matchId, homeScore, awayScore
    });


    logger.testHook('xbotgo_make_fallback', { matchId });


    try {
      // Build payload for Make.com browser automation
      const payload = {
        timestamp: DateUtils.now().toISOString(),
        event_type: 'xbotgo_score_update',
        source: 'apps_script_fallback',
        
        match_id: matchId,
        home_score: homeScore,
        away_score: awayScore,
        
        // XbotGo device info for Make.com automation
        device_id: this.apiConfig.deviceId,
        fallback_method: 'browser_automation',
        
        // Additional context
        club_name: getConfig('SYSTEM.CLUB_NAME'),
        update_method: 'fallback'
      };


      // Get Make.com webhook URL
      const webhookUrl = PropertiesService.getScriptProperties()
                           .getProperty(getConfig('MAKE.WEBHOOK_URL_PROPERTY'));
      
      if (!webhookUrl) {
        return { success: false, error: 'Make.com webhook not configured' };
      }


      // Send to Make.com with rate limiting
      const response = ApiUtils.rateLimitedMakeRequest(webhookUrl, {
        method: 'POST',
        payload: JSON.stringify(payload)
      });


      const result = {
        success: response.success,
        method: 'make_fallback',
        matchId: matchId,
        response: response
      };


      logger.exitFunction('XbotGoIntegrationManager.pushScoreViaMakeFallback', result);
      return result;


    } catch (error) {
      const result = { success: false, error: error.toString() };
      logger.exitFunction('XbotGoIntegrationManager.pushScoreViaMakeFallback', result);
      return result;
    }
  }


  /**
   * Smart push with automatic fallback to Make.com if API fails
   * @param {string} matchId - Match ID
   * @param {number} homeScore - Home score
   * @param {number} awayScore - Away score
   * @param {Object} additionalData - Additional data
   * @returns {Object} Push result with fallback info
   */
  smartPushScore(matchId, homeScore, awayScore, additionalData = {}) {
    logger.enterFunction('XbotGoIntegrationManager.smartPushScore', {
      matchId, homeScore, awayScore
    });


    // Try API first
    const apiResult = this.pushScoreToXbotGo(matchId, homeScore, awayScore, additionalData);
    
    if (apiResult.success) {
      logger.exitFunction('XbotGoIntegrationManager.smartPushScore', { 
        success: true, method: 'api' 
      });
      return { ...apiResult, method: 'api' };
    }


    // If API fails but was skipped (no change/throttled), don't use fallback
    if (apiResult.skipped) {
      logger.exitFunction('XbotGoIntegrationManager.smartPushScore', { 
        success: true, method: 'skipped', reason: apiResult.reason 
      });
      return { ...apiResult, method: 'skipped' };
    }


    // If API fails, try Make.com fallback
    logger.warn('XbotGo API failed, attempting Make.com fallback', apiResult.error);
    
    const fallbackResult = this.pushScoreViaMakeFallback(matchId, homeScore, awayScore);
    
    const result = {
      success: fallbackResult.success,
      method: fallbackResult.success ? 'make_fallback' : 'both_failed',
      apiResult: apiResult,
      fallbackResult: fallbackResult,
      finalError: fallbackResult.success ? null : fallbackResult.error
    };


    logger.exitFunction('XbotGoIntegrationManager.smartPushScore', result);
    return result;
  }
}


// ===== MAKE.COM ROUTER BRANCH FOR XBOTGO FALLBACK =====


/**
 * Make.com Router Branch for XbotGo browser automation fallback
 */
const XBOTGO_MAKE_ROUTER_BRANCH = {
  "filter": {
    "condition": "AND",
    "rules": [
      {
        "field": "event_type",
        "operator": "equal",
        "value": "xbotgo_score_update"
      }
    ]
  },
  "modules": [
    {
      "name": "Browser - Navigate to page",
      "url": "{{xbotgo_web_interface_url}}"
    },
    {
      "name": "Browser - Fill form",
      "selectors": {
        "home_score_input": "#home-score",
        "away_score_input": "#away-score",
        "update_button": "#update-scores"
      },
      "values": {
        "home_score_input": "{{home_score}}",
        "away_score_input": "{{away_score}}"
      }
    },
    {
      "name": "Browser - Click button",
      "selector": "#update-scores"
    },
    {
      "name": "Browser - Screenshot",
      "description": "Capture confirmation screenshot"
    }
  ]
};


// Create and export singleton instance
const xbotGoIntegrationManager = new XbotGoIntegrationManager();


// Export for global access
globalThis.XbotGoIntegrationManager = XbotGoIntegrationManager;
globalThis.xbotGoIntegrationManager = xbotGoIntegrationManager;
globalThis.XBOTGO_MAKE_ROUTER_BRANCH = XBOTGO_MAKE_ROUTER_BRANCH;
