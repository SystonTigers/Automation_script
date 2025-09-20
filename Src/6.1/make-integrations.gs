/**
 * @fileoverview Make.com Webhook Integration for Syston Tigers Football Automation
 * @version 6.0.0
 * @author Senior Software Architect
 * @description Reliable webhook integration with retry logic and comprehensive error handling
 */

/**
 * Make.com Integration Class
 * Handles all webhook communications to Make.com with retry logic and fallback support
 */
class MakeIntegration {
  
  constructor() {
    this.logger = logger.scope('MakeIntegration');
    this.webhookUrl = this.getWebhookUrl();
    this.fallbackUrl = this.getFallbackUrl();
    this.maxRetries = getConfig('MAKE.MAX_RETRIES', 3);
    this.retryDelay = getConfig('MAKE.RETRY_DELAY_MS', 2000);
    this.timeout = getConfig('MAKE.TIMEOUT_MS', 30000);
  }

  /**
   * Send payload to Make.com with retry logic
   * @param {Object} payload - Data to send
   * @param {boolean} useFallback - Use fallback URL if primary fails
   * @returns {Object} Send result
   */
  sendToMake(payload, useFallback = true) {
    this.logger.enterFunction('sendToMake', { 
      event_type: payload.event_type,
      has_fallback: useFallback && !!this.fallbackUrl
    });
    
    try {
      // @testHook(make_send_start)
      
      // Validate payload
      const validationResult = this.validatePayload(payload);
      if (!validationResult.valid) {
        throw new Error(`Invalid payload: ${validationResult.errors.join(', ')}`);
      }
      
      // Check if simulation mode is enabled
      if (getConfig('DEVELOPMENT.SIMULATION_MODE', false)) {
        return this.simulateWebhookCall(payload);
      }
      
      // Enhance payload with system metadata
      const enhancedPayload = this.enhancePayload(payload);
      
      // Attempt to send to primary webhook
      let result = this.attemptWebhookSend(this.webhookUrl, enhancedPayload, 'primary');
      
      // Try fallback if primary failed and fallback is available
      if (!result.success && useFallback && this.fallbackUrl) {
        this.logger.warn('Primary webhook failed, trying fallback', { 
          primary_error: result.error 
        });
        
        result = this.attemptWebhookSend(this.fallbackUrl, enhancedPayload, 'fallback');
      }
      
      // @testHook(make_send_complete)
      
      // Log the webhook call
      this.logger.webhookCall(
        payload.event_type || 'unknown',
        enhancedPayload,
        result.success
      );
      
      this.logger.exitFunction('sendToMake', { 
        success: result.success,
        attempts: result.attempts || 1
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Make.com send failed', { 
        error: error.toString(),
        event_type: payload.event_type
      });
      
      return {
        success: false,
        error: error.toString(),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Attempt webhook send with retry logic
   * @private
   * @param {string} url - Webhook URL
   * @param {Object} payload - Payload to send
   * @param {string} type - URL type (primary/fallback)
   * @returns {Object} Send result
   */
  attemptWebhookSend(url, payload, type = 'primary') {
    if (!url) {
      return {
        success: false,
        error: `No ${type} webhook URL configured`,
        type: type
      };
    }
    
    let lastError;
    let attempts = 0;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      attempts++;
      
      try {
        // @testHook(webhook_attempt_start)
        
        this.logger.debug(`Webhook attempt ${attempt + 1}/${this.maxRetries + 1}`, {
          type: type,
          url: this.maskUrl(url)
        });
        
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': `${getConfig('SYSTEM.NAME')} v${getConfig('SYSTEM.VERSION')}`,
            'X-Source': 'google-apps-script',
            'X-Timestamp': DateUtils.formatISO(DateUtils.now())
          },
          payload: JSON.stringify(payload)
        };
        
        // Add rate limiting delay
        if (attempt > 0) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          Utilities.sleep(delay);
        }
        
        const response = UrlFetchApp.fetch(url, options);
        const responseCode = response.getResponseCode();
        const responseText = response.getContentText();
        
        // @testHook(webhook_attempt_complete)
        
        if (responseCode >= 200 && responseCode < 300) {
          this.logger.info(`Webhook ${type} success`, {
            response_code: responseCode,
            attempts: attempts,
            payload_size: JSON.stringify(payload).length
          });
          
          return {
            success: true,
            response_code: responseCode,
            response: responseText,
            attempts: attempts,
            type: type,
            timestamp: DateUtils.formatISO(DateUtils.now())
          };
        } else {
          lastError = `HTTP ${responseCode}: ${responseText}`;
          this.logger.warn(`Webhook ${type} attempt ${attempt + 1} failed`, {
            response_code: responseCode,
            response: responseText.substring(0, 200)
          });
        }
        
      } catch (error) {
        lastError = error.toString();
        this.logger.warn(`Webhook ${type} attempt ${attempt + 1} error`, {
          error: error.toString()
        });
      }
    }
    
    return {
      success: false,
      error: lastError || 'Unknown error',
      attempts: attempts,
      type: type,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }

  /**
   * Validate payload structure
   * @private
   * @param {Object} payload - Payload to validate
   * @returns {Object} Validation result
   */
  validatePayload(payload) {
    const errors = [];
    
    if (!payload || typeof payload !== 'object') {
      errors.push('Payload must be an object');
      return { valid: false, errors };
    }
    
    // Required fields
    const requiredFields = ['event_type', 'timestamp'];
    requiredFields.forEach(field => {
      if (!payload[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate event_type mapping
    if (payload.event_type) {
      const mappedType = getConfig(`MAKE.EVENT_MAPPINGS.${payload.event_type}`);
      if (!mappedType && !payload.event_type.includes('_batch_') && !payload.event_type.includes('_monthly')) {
        errors.push(`Unknown event type: ${payload.event_type}`);
      }
    }
    
    // Check payload size (Make.com has limits)
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > 1000000) { // 1MB limit
      errors.push(`Payload too large: ${payloadSize} bytes`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors,
      payload_size: payloadSize
    };
  }

  /**
   * Enhance payload with system metadata
   * @private
   * @param {Object} payload - Original payload
   * @returns {Object} Enhanced payload
   */
  enhancePayload(payload) {
    const enhanced = { ...payload };
    
    // Add system metadata if not present
    enhanced.timestamp = enhanced.timestamp || DateUtils.formatISO(DateUtils.now());
    enhanced.source = enhanced.source || 'apps_script_automation';
    enhanced.version = enhanced.version || getConfig('SYSTEM.VERSION');
    enhanced.club_name = enhanced.club_name || getConfig('SYSTEM.CLUB_NAME');
    enhanced.environment = getConfig('SYSTEM.ENVIRONMENT');
    
    // Map event type if needed
    if (enhanced.event_type) {
      const mappedType = getConfig(`MAKE.EVENT_MAPPINGS.${enhanced.event_type}`);
      if (mappedType) {
        enhanced.event_type = mappedType;
      }
    }
    
    // Add unique request ID for deduplication
    enhanced.request_id = StringUtils.generateId('req');
    
    return enhanced;
  }

  /**
   * Simulate webhook call for testing
   * @private
   * @param {Object} payload - Payload to simulate
   * @returns {Object} Simulation result
   */
  simulateWebhookCall(payload) {
    this.logger.info('Simulating webhook call', { 
      event_type: payload.event_type,
      simulation: true
    });
    
    if (getConfig('DEVELOPMENT.SIMULATION_LOG_PAYLOADS', true)) {
      this.logger.debug('Simulated payload', { payload: payload });
    }
    
    return {
      success: true,
      simulated: true,
      response_code: 200,
      response: 'Simulated response',
      payload: payload,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }

  /**
   * Get primary webhook URL
   * @private
   * @returns {string} Webhook URL
   */
  getWebhookUrl() {
    const property = getConfig('MAKE.WEBHOOK_URL_PROPERTY');
    return getSecureProperty(property);
  }

  /**
   * Get fallback webhook URL
   * @private
   * @returns {string} Fallback URL
   */
  getFallbackUrl() {
    const property = getConfig('MAKE.WEBHOOK_URL_FALLBACK');
    return getSecureProperty(property);
  }

  /**
   * Mask URL for logging (hide sensitive parts)
   * @private
   * @param {string} url - URL to mask
   * @returns {string} Masked URL
   */
  maskUrl(url) {
    if (!url) return 'No URL';
    try {
      const parsed = new URL(url);
      return `${parsed.origin}/.../${parsed.pathname.split('/').pop()}`;
    } catch (error) {
      return 'Invalid URL';
    }
  }

  /**
   * Test webhook connection
   * @returns {Object} Test result
   */
  testConnection() {
    this.logger.enterFunction('testConnection');
    
    try {
      const testPayload = {
        event_type: 'system_test',
        timestamp: DateUtils.formatISO(DateUtils.now()),
        test: true,
        source: 'connection_test'
      };
      
      const result = this.sendToMake(testPayload, false); // Don't use fallback for test
      
      this.logger.exitFunction('testConnection', { success: result.success });
      
      return {
        success: result.success,
        primary_url_configured: !!this.webhookUrl,
        fallback_url_configured: !!this.fallbackUrl,
        result: result,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Connection test failed', { error: error.toString() });
      
      return {
        success: false,
        error: error.toString(),
        primary_url_configured: !!this.webhookUrl,
        fallback_url_configured: !!this.fallbackUrl
      };
    }
  }

  /**
   * Get webhook statistics
   * @returns {Object} Webhook statistics
   */
  getStats() {
    try {
      // Get stats from logs (last 24 hours)
      const logs = logger.exportLogs(1);
      const webhookLogs = logs.filter(log => 
        log.Context && typeof log.Context === 'string' && 
        log.Context.includes('webhook_call')
      );
      
      const stats = {
        total_calls_24h: webhookLogs.length,
        successful_calls: 0,
        failed_calls: 0,
        average_response_time: 0,
        event_types: {},
        last_call: null
      };
      
      webhookLogs.forEach(log => {
        try {
          const context = JSON.parse(log.Context);
          if (context.success) {
            stats.successful_calls++;
          } else {
            stats.failed_calls++;
          }
          
          if (context.event_type) {
            stats.event_types[context.event_type] = 
              (stats.event_types[context.event_type] || 0) + 1;
          }
          
          if (!stats.last_call || log.Timestamp > stats.last_call) {
            stats.last_call = log.Timestamp;
          }
        } catch (parseError) {
          // Skip malformed log entries
        }
      });
      
      stats.success_rate = stats.total_calls_24h > 0 ? 
        (stats.successful_calls / stats.total_calls_24h * 100).toFixed(1) + '%' : 
        'No calls';
      
      return stats;
      
    } catch (error) {
      this.logger.error('Failed to get webhook stats', { error: error.toString() });
      return {
        error: 'Failed to get statistics',
        total_calls_24h: 0
      };
    }
  }
}

// ==================== PAYLOAD BUILDERS ====================

/**
 * Create goal payload for Make.com
 * @param {string} minute - Goal minute
 * @param {string} player - Goal scorer
 * @param {string} assist - Assist provider
 * @param {Object} scoreUpdate - Score update object
 * @param {string} notes - Additional notes
 * @returns {Object} Goal payload
 */
function createGoalPayload(minute, player, assist, scoreUpdate, notes = '') {
  return {
    event_type: 'goal',
    timestamp: DateUtils.formatISO(DateUtils.now()),
    minute: minute,
    goal_scorer: player,
    assist_provider: assist || '',
    home_score: scoreUpdate.homeScore,
    away_score: scoreUpdate.awayScore,
    match_score: `${scoreUpdate.homeScore}-${scoreUpdate.awayScore}`,
    notes: notes,
    celebration_text: assist ? `${player} (${assist})` : player,
    goal_number: scoreUpdate.homeScore, // Assuming we're home team
    source: 'live_match_automation'
  };
}

/**
 * Create opposition goal payload for Make.com
 * @param {string} minute - Goal minute
 * @param {Object} scoreUpdate - Score update object
 * @param {string} notes - Additional notes
 * @returns {Object} Opposition goal payload
 */
function createOppositionGoalPayload(minute, scoreUpdate, notes = '') {
  return {
    event_type: 'goal_opposition',
    timestamp: DateUtils.formatISO(DateUtils.now()),
    minute: minute,
    home_score: scoreUpdate.homeScore,
    away_score: scoreUpdate.awayScore,
    match_score: `${scoreUpdate.homeScore}-${scoreUpdate.awayScore}`,
    notes: notes,
    opposition_goal_number: scoreUpdate.awayScore, // Assuming opposition is away
    source: 'live_match_automation'
  };
}

/**
 * Create card payload for Make.com
 * @param {string} minute - Card minute
 * @param {string} player - Player receiving card
 * @param {string} cardType - Card type
 * @param {string} notes - Additional notes
 * @param {string} eventType - Event type override
 * @returns {Object} Card payload
 */
function createCardPayload(minute, player, cardType, notes = '', eventType = 'card') {
  return {
    event_type: eventType,
    timestamp: DateUtils.formatISO(DateUtils.now()),
    minute: minute,
    player_name: player,
    card_type: cardType,
    card_color: cardType.toLowerCase().includes('yellow') ? 'yellow' : 'red',
    is_second_yellow: cardType === '2nd Yellow (Red)',
    notes: notes,
    source: 'live_match_automation'
  };
}

/**
 * Create opposition card payload for Make.com
 * @param {string} minute - Card minute
 * @param {string} cardType - Card type
 * @param {string} notes - Additional notes
 * @returns {Object} Opposition card payload
 */
function createOppositionCardPayload(minute, cardType, notes = '') {
  return {
    event_type: 'card_opposition',
    timestamp: DateUtils.formatISO(DateUtils.now()),
    minute: minute,
    player_name: 'Opposition',
    card_type: cardType,
    card_color: cardType.toLowerCase().includes('yellow') ? 'yellow' : 'red',
    notes: notes,
    source: 'live_match_automation'
  };
}

/**
 * Create substitution payload for Make.com
 * @param {string} minute - Substitution minute
 * @param {string} playerOff - Player leaving
 * @param {string} playerOn - Player entering
 * @param {string} notes - Additional notes
 * @returns {Object} Substitution payload
 */
function createSubstitutionPayload(minute, playerOff, playerOn, notes = '') {
  return {
    event_type: 'substitution',
    timestamp: DateUtils.formatISO(DateUtils.now()),
    minute: minute,
    player_off: playerOff,
    player_on: playerOn,
    substitution_text: `${playerOff} → ${playerOn}`,
    notes: notes,
    source: 'live_match_automation'
  };
}

/**
 * Create kick-off payload for Make.com
 * @param {string} minute - Kick-off minute
 * @returns {Object} Kick-off payload
 */
function createKickOffPayload(minute = '0') {
  return {
    event_type: 'kick_off',
    timestamp: DateUtils.formatISO(DateUtils.now()),
    minute: minute,
    match_status: 'started',
    source: 'live_match_automation'
  };
}

/**
 * Create half-time payload for Make.com
 * @param {string} minute - Half-time minute
 * @param {Object} score - Current score
 * @returns {Object} Half-time payload
 */
function createHalfTimePayload(minute, score) {
  return {
    event_type: 'half_time',
    timestamp: DateUtils.formatISO(DateUtils.now()),
    minute: minute,
    home_score: score.home,
    away_score: score.away,
    match_score: `${score.home}-${score.away}`,
    match_status: 'half_time',
    source: 'live_match_automation'
  };
}

/**
 * Create second half payload for Make.com
 * @param {string} minute - Second half minute
 * @param {Object} score - Current score
 * @returns {Object} Second half payload
 */
function createSecondHalfPayload(minute, score) {
  return {
    event_type: 'second_half',
    timestamp: DateUtils.formatISO(DateUtils.now()),
    minute: minute,
    home_score: score.home,
    away_score: score.away,
    match_score: `${score.home}-${score.away}`,
    match_status: 'second_half',
    source: 'live_match_automation'
  };
}

/**
 * Create full-time payload for Make.com
 * @param {string} minute - Full-time minute
 * @param {Object} finalScore - Final score
 * @returns {Object} Full-time payload
 */
function createFullTimePayload(minute, finalScore) {
  const home = parseInt(finalScore.home) || 0;
  const away = parseInt(finalScore.away) || 0;
  
  let result = 'Draw';
  if (home > away) result = 'Win';
  else if (away > home) result = 'Loss';
  
  return {
    event_type: 'full_time',
    timestamp: DateUtils.formatISO(DateUtils.now()),
    minute: minute,
    home_score: finalScore.home,
    away_score: finalScore.away,
    final_score: `${finalScore.home}-${finalScore.away}`,
    result: result,
    match_status: 'finished',
    source: 'live_match_automation'
  };
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Send data to Make.com (public API)
 * @param {Object} payload - Data to send
 * @returns {Object} Send result
 */
function sendToMake(payload) {
  const makeIntegration = new MakeIntegration();
  return makeIntegration.sendToMake(payload);
}

/**
 * Test Make.com connection (public API)
 * @returns {Object} Test result
 */
function testMakeConnection() {
  const makeIntegration = new MakeIntegration();
  return makeIntegration.testConnection();
}

/**
 * Get Make.com webhook statistics (public API)
 * @returns {Object} Webhook statistics
 */
function getMakeWebhookStats() {
  const makeIntegration = new MakeIntegration();
  return makeIntegration.getStats();
}

/**
 * Initialize Make.com integration
 * @returns {Object} Initialization result
 */
function initializeMakeIntegration() {
  logger.enterFunction('MakeIntegration.initialize');
  
  try {
    const makeIntegration = new MakeIntegration();
    
    // Test basic configuration
    const hasWebhookUrl = !!makeIntegration.getWebhookUrl();
    const hasFallbackUrl = !!makeIntegration.getFallbackUrl();
    
    if (!hasWebhookUrl) {
      logger.warn('No primary webhook URL configured');
    }
    
    logger.exitFunction('MakeIntegration.initialize', { 
      success: true,
      has_webhook: hasWebhookUrl
    });
    
    return {
      success: true,
      webhook_configured: hasWebhookUrl,
      fallback_configured: hasFallbackUrl,
      simulation_mode: getConfig('DEVELOPMENT.SIMULATION_MODE', false),
      version: '6.0.0'
    };
    
  } catch (error) {
    logger.error('Make.com integration initialization failed', { 
      error: error.toString() 
    });
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ==================== TESTING FUNCTIONS ====================

/**
 * Test Make.com integration functionality
 * @returns {Object} Test results
 */
function testMakeIntegration() {
  logger.enterFunction('MakeIntegration.test');
  
  try {
    const makeIntegration = new MakeIntegration();
    const results = {
      configuration: false,
      payload_validation: false,
      payload_enhancement: false,
      connection_test: false
    };
    
    // Test configuration
    results.configuration = !!makeIntegration.getWebhookUrl();
    
    // Test payload validation
    try {
      const testPayload = { event_type: 'test', timestamp: DateUtils.formatISO(DateUtils.now()) };
      const validation = makeIntegration.validatePayload(testPayload);
      results.payload_validation = validation.valid;
    } catch (error) {
      logger.warn('Payload validation test failed', { error: error.toString() });
    }
    
    // Test payload enhancement
    try {
      const testPayload = { event_type: 'test' };
      const enhanced = makeIntegration.enhancePayload(testPayload);
      results.payload_enhancement = enhanced.timestamp && enhanced.version;
    } catch (error) {
      logger.warn('Payload enhancement test failed', { error: error.toString() });
    }
    
    // Test connection (only if not in simulation mode)
    if (!getConfig('DEVELOPMENT.SIMULATION_MODE', false)) {
      try {
        const connectionTest = makeIntegration.testConnection();
        results.connection_test = connectionTest.success;
      } catch (error) {
        logger.warn('Connection test failed', { error: error.toString() });
      }
    } else {
      results.connection_test = true; // Skip in simulation mode
    }
    
    const allPassed = Object.values(results).every(result => result === true);
    
    logger.exitFunction('MakeIntegration.test', { success: allPassed });
    
    return {
      success: allPassed,
      results: results,
      simulation_mode: getConfig('DEVELOPMENT.SIMULATION_MODE', false),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
    
  } catch (error) {
    logger.error('Make.com integration test failed', { error: error.toString() });
    
    return {
      success: false,
      error: error.toString(),
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
}

/**
 * Send test event to Make.com
 * @param {string} eventType - Event type to test
 * @returns {Object} Test result
 */
function sendTestEvent(eventType = 'system_test') {
  const testPayload = {
    event_type: eventType,
    timestamp: DateUtils.formatISO(DateUtils.now()),
    test: true,
    test_data: {
      message: 'This is a test event from Syston Tigers automation',
      system_version: getConfig('SYSTEM.VERSION'),
      test_id: StringUtils.generateId('test')
    }
  };
  
  return sendToMake(testPayload);
}

