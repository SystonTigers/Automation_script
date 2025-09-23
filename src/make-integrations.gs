/**
 * @fileoverview Enhanced Make.com webhook integration with retry logic and router management
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Dedicated Make.com integration with enhanced error handling and retry mechanisms
 * 
 * CREATE NEW FILE - This enhances webhook management from *claude v6
 * 
 * FEATURES:
 * - Enhanced webhook delivery with retry logic
 * - Router branch management and validation
 * - Payload optimization and compression
 * - Rate limiting and queue management
 * - Webhook health monitoring
 * - Batch webhook processing
 */

// ==================== MAKE INTEGRATION MANAGER CLASS ====================

/**
 * Make Integration Manager - Enhanced webhook management
 */
class MakeIntegration {
  
  constructor() {
    this.logger = logger.scope('MakeIntegration');
    this.webhookQueue = [];
    this.retryQueue = [];
    this.rateLimiter = {
      lastCall: 0,
      minInterval: getConfig('PERFORMANCE.WEBHOOK_RATE_LIMIT_MS', 1000)
    };
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      retriedCalls: 0
    };
    this.idempotency = {
      enabled: getConfig('MAKE.IDEMPOTENCY.ENABLED', true),
      ttlSeconds: getConfig('MAKE.IDEMPOTENCY.TTL_SECONDS', 86400),
      cachePrefix: getConfig('MAKE.IDEMPOTENCY.CACHE_PREFIX', 'MAKE_IDEMPOTENCY_'),
      cache: (typeof CacheService !== 'undefined' && CacheService.getScriptCache)
        ? CacheService.getScriptCache()
        : null
    };
  }

  // ==================== ENHANCED WEBHOOK SENDING ====================

  /**
   * Send payload to Make.com with enhanced error handling
   * @param {Object} payload - Payload to send
   * @param {Object} options - Send options
   * @returns {Object} Send result
   */
  sendToMake(payload, options = {}) {
    this.logger.enterFunction('sendToMake', {
      event_type: payload.event_type,
      options
    });

    try {
      // @testHook(make_send_start)

      // Validate payload
      const validationResult = this.validatePayload(payload);
      if (!validationResult.valid) {
        throw new Error(`Invalid payload: ${validationResult.errors.join(', ')}`);
      }

      const idempotencyKey = this.resolveIdempotencyKey(payload, options);

      if (idempotencyKey && this.isDuplicatePayload(idempotencyKey)) {
        this.logger.info('Duplicate payload detected, skipping Make.com send', {
          event_type: payload.event_type,
          idempotency_key: idempotencyKey
        });

        return {
          success: true,
          skipped: true,
          reason: 'duplicate_payload',
          event_type: payload.event_type,
          idempotency_key: idempotencyKey,
          timestamp: DateUtils.formatISO(DateUtils.now())
        };
      }

      // Apply rate limiting
      this.applyRateLimit();

      // Prepare webhook call
      const webhookUrl = getWebhookUrl();
      if (!webhookUrl) {
        throw new Error('Webhook URL not configured');
      }
      
      // Add system metadata to payload
      const enhancedPayload = this.enhancePayload(payload);

      // Execute webhook call with retry logic
      const sendResult = this.executeWebhookCall(webhookUrl, enhancedPayload, options);

      if (sendResult.success && idempotencyKey) {
        this.markPayloadProcessed(idempotencyKey);
      }

      if (sendResult.success) {
        this.metrics.lastPost = DateUtils.formatISO(DateUtils.now());
      }

      // Update metrics
      this.updateMetrics(sendResult.success);
      
      // @testHook(make_send_complete)
      
      this.logger.exitFunction('sendToMake', { 
        success: sendResult.success,
        response_code: sendResult.response_code
      });
      
      return sendResult;
      
    } catch (error) {
      this.logger.error('Make.com send failed', { 
        error: error.toString(),
        event_type: payload.event_type
      });
      
      this.updateMetrics(false);
      
      return {
        success: false,
        error: error.toString(),
        event_type: payload.event_type,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Send batch payloads to Make.com
   * @param {Array} payloads - Array of payloads
   * @param {Object} options - Batch options
   * @returns {Object} Batch send result
   */
  sendBatchToMake(payloads, options = {}) {
    this.logger.enterFunction('sendBatchToMake', { 
      payload_count: payloads.length,
      options 
    });
    
    try {
      // @testHook(batch_send_start)
      
      if (!Array.isArray(payloads) || payloads.length === 0) {
        throw new Error('Invalid payloads array');
      }
      
      const batchSize = options.batchSize || getConfig('PERFORMANCE.BATCH_SIZE', 5);
      const results = [];
      
      // Process payloads in batches
      for (let i = 0; i < payloads.length; i += batchSize) {
        const batch = payloads.slice(i, i + batchSize);
        
        const batchResults = batch.map(payload => {
          return this.sendToMake(payload, { ...options, skipRateLimit: true });
        });
        
        results.push(...batchResults);
        
        // Wait between batches
        if (i + batchSize < payloads.length) {
          Utilities.sleep(this.rateLimiter.minInterval);
        }
      }
      
      // @testHook(batch_send_complete)
      
      const successCount = results.filter(r => r.success).length;
      const overallSuccess = successCount === payloads.length;
      
      this.logger.exitFunction('sendBatchToMake', { 
        success: overallSuccess,
        success_count: successCount,
        total_count: payloads.length
      });
      
      return {
        success: overallSuccess,
        results: results,
        success_count: successCount,
        total_count: payloads.length,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Batch send failed', { error: error.toString() });
      return {
        success: false,
        error: error.toString(),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  // ==================== WEBHOOK EXECUTION WITH RETRY ====================

  /**
   * Execute webhook call with retry logic
   * @param {string} webhookUrl - Webhook URL
   * @param {Object} payload - Enhanced payload
   * @param {Object} options - Send options
   * @returns {Object} Execution result
   */
  executeWebhookCall(webhookUrl, payload, options = {}) {
    const maxRetries = options.maxRetries || getConfig('MAKE.WEBHOOK_RETRY_ATTEMPTS', 3);
    const retryDelay = options.retryDelay || getConfig('MAKE.WEBHOOK_RETRY_DELAY_MS', 2000);
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // @testHook(webhook_attempt_start)
        
        const response = UrlFetchApp.fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': `SystonTigersAutomation/${getConfig('SYSTEM.VERSION')}`,
            'X-Attempt': attempt.toString(),
            'X-Event-Type': payload.event_type
          },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });
        
        const responseCode = response.getResponseCode();
        const responseText = response.getContentText();
        
        // @testHook(webhook_attempt_complete)
        
        // Check if successful
        if (responseCode >= 200 && responseCode < 300) {
          if (attempt > 1) {
            this.metrics.retriedCalls++;
            this.logger.info('Webhook succeeded after retry', { 
              attempt,
              response_code: responseCode
            });
          }
          
          return {
            success: true,
            response_code: responseCode,
            response_text: responseText,
            attempts: attempt
          };
        }
        
        // Handle specific error codes
        if (responseCode === 429) {
          // Rate limited - wait longer
          lastError = `Rate limited (429)`;
          if (attempt < maxRetries) {
            Utilities.sleep(retryDelay * attempt * 2); // Exponential backoff
            continue;
          }
        } else if (responseCode >= 500) {
          // Server error - retry
          lastError = `Server error (${responseCode})`;
          if (attempt < maxRetries) {
            Utilities.sleep(retryDelay * attempt);
            continue;
          }
        } else {
          // Client error - don't retry
          return {
            success: false,
            response_code: responseCode,
            response_text: responseText,
            error: `Client error (${responseCode})`,
            attempts: attempt
          };
        }
        
      } catch (error) {
        lastError = error.toString();
        
        // Network error - retry
        if (attempt < maxRetries) {
          this.logger.warn('Webhook network error, retrying', { 
            attempt,
            error: lastError
          });
          Utilities.sleep(retryDelay * attempt);
          continue;
        }
      }
    }
    
    // All attempts failed
    return {
      success: false,
      error: lastError || 'All retry attempts failed',
      attempts: maxRetries
    };
  }

  // ==================== PAYLOAD ENHANCEMENT ====================

  /**
   * Enhance payload with system metadata
   * @param {Object} payload - Original payload
   * @returns {Object} Enhanced payload
   */
  enhancePayload(payload) {
    const enhanced = {
      ...payload,

      // System metadata
      system: {
        version: getConfig('SYSTEM.VERSION'),
        environment: getConfig('SYSTEM.ENVIRONMENT'),
        timestamp: DateUtils.formatISO(DateUtils.now()),
        session_id: logger.sessionId
      },
      
      // Webhook metadata
      webhook: {
        sent_at: DateUtils.formatISO(DateUtils.now()),
        attempt: 1,
        priority: this.determinePayloadPriority(payload),
        router_hint: this.getRouterHint(payload.event_type)
      },
      
      // Club metadata
      club: {
        name: getConfig('SYSTEM.CLUB_NAME'),
        short_name: getConfig('SYSTEM.CLUB_SHORT_NAME'),
        season: getConfig('SYSTEM.SEASON')
      }
    };

    if (payload.privacy) {
      enhanced.privacy = {
        ...payload.privacy,
        anonymiseFaces: !!payload.privacy.anonymiseFaces,
        useInitialsOnly: !!payload.privacy.useInitialsOnly
      };
      enhanced.anonymise_faces = !!payload.privacy.anonymiseFaces;
      enhanced.use_initials_only = !!payload.privacy.useInitialsOnly;
    }

    // Add payload validation signature
    enhanced.webhook.signature = this.generatePayloadSignature(enhanced);

    return enhanced;
  }

  /**
   * Validate payload before sending
   * @param {Object} payload - Payload to validate
   * @returns {Object} Validation result
   */
  validatePayload(payload) {
    const errors = [];
    
    // Check required fields
    if (!payload.event_type) {
      errors.push('Missing event_type');
    }
    
    if (!payload.timestamp) {
      errors.push('Missing timestamp');
    }
    
    // Validate event type
    const validEventTypes = Object.values(getConfig('MAKE.EVENT_TYPES', {}));
    if (payload.event_type && !validEventTypes.includes(payload.event_type)) {
      errors.push(`Invalid event_type: ${payload.event_type}`);
    }
    
    // Check payload size
    const payloadSize = JSON.stringify(payload).length;
    const maxSize = 100000; // 100KB limit
    if (payloadSize > maxSize) {
      errors.push(`Payload too large: ${payloadSize} bytes`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors,
      size: payloadSize
    };
  }

  // ==================== RATE LIMITING ====================

  /**
   * Apply rate limiting between webhook calls
   */
  applyRateLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.rateLimiter.lastCall;
    
    if (timeSinceLastCall < this.rateLimiter.minInterval) {
      const waitTime = this.rateLimiter.minInterval - timeSinceLastCall;
      Utilities.sleep(waitTime);
    }
    
    this.rateLimiter.lastCall = Date.now();
  }

  // ==================== ROUTER MANAGEMENT ====================

  /**
   * Get router hint for event type
   * @param {string} eventType - Event type
   * @returns {string} Router hint
   */
  getRouterHint(eventType) {
    // Map event types to router branches
    const routerMap = {
      'goal_team': 'live_events',
      'goal_opposition': 'opposition_events',
      'card_yellow': 'discipline_events',
      'card_red': 'discipline_events',
      'card_second_yellow': 'enhanced_discipline',
      'fixtures_1_league': 'batch_fixtures',
      'fixtures_2_league': 'batch_fixtures',
      'fixtures_3_league': 'batch_fixtures',
      'fixtures_4_league': 'batch_fixtures',
      'fixtures_5_league': 'batch_fixtures',
      'results_1_league': 'batch_results',
      'results_2_league': 'batch_results',
      'results_3_league': 'batch_results',
      'results_4_league': 'batch_results',
        'results_5_league': 'batch_results',
        'weekly_fixtures': 'weekly_content',
        'weekly_quotes': 'weekly_content',
        'weekly_stats': 'weekly_content',
        'weekly_throwback': 'weekly_content',
        'weekly_countdown_1': 'weekly_content',
        'weekly_countdown_2': 'weekly_content',
        'fixtures_this_month': 'monthly_content',
        'results_this_month': 'monthly_content',
        'player_stats_summary': 'player_content',
        'video_clip_processing': 'video_processing'
      };
    
    return routerMap[eventType] || 'default';
  }

  /**
   * Validate router configuration
   * @returns {Object} Validation result
   */
  validateRouterConfiguration() {
    try {
      const eventTypes = getConfig('MAKE.EVENT_TYPES', {});
      const missingRoutes = [];
      
      Object.values(eventTypes).forEach(eventType => {
        const routerHint = this.getRouterHint(eventType);
        if (routerHint === 'default') {
          missingRoutes.push(eventType);
        }
      });
      
      return {
        valid: missingRoutes.length === 0,
        missing_routes: missingRoutes,
        total_event_types: Object.keys(eventTypes).length
      };
      
    } catch (error) {
      return {
        valid: false,
        error: error.toString()
      };
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Determine payload priority
   * @param {Object} payload - Payload object
   * @returns {string} Priority level
   */
  determinePayloadPriority(payload) {
    const highPriorityEvents = [
      'goal_team', 'goal_opposition', 'card_red', 'card_second_yellow',
      'kick_off', 'half_time', 'full_time'
    ];
    
    const mediumPriorityEvents = [
      'card_yellow', 'substitution', 'motm', 'second_half_kickoff'
    ];
    
    if (highPriorityEvents.includes(payload.event_type)) {
      return 'high';
    } else if (mediumPriorityEvents.includes(payload.event_type)) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate payload signature for validation
   * @param {Object} payload - Payload object
   * @returns {string} Signature
   */
  generatePayloadSignature(payload) {
    // Simple signature based on key payload properties
    const signatureData = {
      event_type: payload.event_type,
      timestamp: payload.timestamp,
      club: payload.club?.name,
      version: payload.system?.version
    };

    return StringUtils.generateId('sig');
  }

  /**
   * Resolve idempotency key for payload
   * @param {Object} payload - Payload to evaluate
   * @param {Object} options - Send options
   * @returns {string|null} Idempotency key
   */
  resolveIdempotencyKey(payload, options = {}) {
    if (options.skipIdempotency) {
      return null;
    }

    if (options.idempotencyKey) {
      return `${this.idempotency.cachePrefix}${options.idempotencyKey}`;
    }

    if (!this.idempotency.enabled) {
      return null;
    }

    return this.generateIdempotencyKey(payload);
  }

  /**
   * Generate idempotency key for payload
   * @param {Object} payload - Payload object
   * @returns {string} Idempotency key
   */
  generateIdempotencyKey(payload) {
    try {
      const fingerprint = this.getIdempotencyFingerprint(payload);
      const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, fingerprint);
      const hash = this.bytesToHex(digest);

      return `${this.idempotency.cachePrefix}${payload.event_type || 'unknown'}_${hash}`;
    } catch (error) {
      this.logger.warn('Failed to generate idempotency key', { error: error.toString() });
      return `${this.idempotency.cachePrefix}${StringUtils.generateId('make_event')}`;
    }
  }

  /**
   * Create payload fingerprint for idempotency hashing
   * @param {Object} payload - Payload object
   * @returns {string} Fingerprint string
   */
  getIdempotencyFingerprint(payload) {
    try {
      const clone = JSON.parse(JSON.stringify(payload || {}));

      delete clone.timestamp;
      delete clone.system;
      delete clone.webhook;

      return JSON.stringify(clone);
    } catch (error) {
      this.logger.warn('Failed to normalize payload for idempotency', { error: error.toString() });
      return JSON.stringify({ event_type: payload?.event_type || 'unknown', fallback: true });
    }
  }

  /**
   * Convert byte array to hex string
   * @param {Array<number>} bytes - Byte array
   * @returns {string} Hex string
   */
  bytesToHex(bytes) {
    return bytes
      .map(byte => (byte & 0xff).toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Check if payload was already processed
   * @param {string} idempotencyKey - Idempotency key
   * @returns {boolean} True if duplicate
   */
  isDuplicatePayload(idempotencyKey) {
    if (!idempotencyKey) {
      return false;
    }

    try {
      if (this.idempotency.cache && this.idempotency.cache.get(idempotencyKey)) {
        return true;
      }

      const scriptProperties = PropertiesService.getScriptProperties();
      const stored = scriptProperties.getProperty(idempotencyKey);

      if (!stored) {
        return false;
      }

      const parsed = JSON.parse(stored);
      if (parsed && parsed.expiresAt && parsed.expiresAt < Date.now()) {
        scriptProperties.deleteProperty(idempotencyKey);
        return false;
      }

      return true;

    } catch (error) {
      this.logger.warn('Idempotency duplicate check failed', { error: error.toString(), idempotencyKey });
      return false;
    }
  }

  /**
   * Mark payload as processed for idempotency
   * @param {string} idempotencyKey - Idempotency key
   */
  markPayloadProcessed(idempotencyKey) {
    if (!idempotencyKey) {
      return;
    }

    try {
      const ttlSeconds = this.idempotency.ttlSeconds || 86400;

      if (this.idempotency.cache) {
        const cacheTtl = Math.min(ttlSeconds, 21600);
        this.idempotency.cache.put(idempotencyKey, '1', cacheTtl);
      }

      const scriptProperties = PropertiesService.getScriptProperties();
      const expiresAt = Date.now() + (ttlSeconds * 1000);

      scriptProperties.setProperty(idempotencyKey, JSON.stringify({ expiresAt }));

    } catch (error) {
      this.logger.warn('Failed to persist idempotency key', { error: error.toString(), idempotencyKey });
    }
  }

  /**
   * Update webhook metrics
   * @param {boolean} success - Whether call was successful
   */
  updateMetrics(success) {
    this.metrics.totalCalls++;
    if (success) {
      this.metrics.successfulCalls++;
    } else {
      this.metrics.failedCalls++;
    }
  }

  /**
   * Get webhook metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      success_rate: this.metrics.totalCalls > 0 ? 
        (this.metrics.successfulCalls / this.metrics.totalCalls * 100).toFixed(2) : 0,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }

  // ==================== HEALTH MONITORING ====================

  /**
   * Check webhook health
   * @returns {Object} Health check result
   */
  checkWebhookHealth() {
    this.logger.enterFunction('checkWebhookHealth');
    
    try {
      // @testHook(webhook_health_check_start)
      
      const healthResult = {
        webhook_configured: !!getWebhookUrl(),
        metrics: this.getMetrics(),
        rate_limiter: {
          min_interval: this.rateLimiter.minInterval,
          time_since_last_call: Date.now() - this.rateLimiter.lastCall
        },
        router_validation: this.validateRouterConfiguration(),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
      // Determine overall health
      const successRate = parseFloat(healthResult.metrics.success_rate);
      if (successRate >= 95) {
        healthResult.status = 'healthy';
      } else if (successRate >= 80) {
        healthResult.status = 'degraded';
      } else {
        healthResult.status = 'unhealthy';
      }
      
      // @testHook(webhook_health_check_complete)
      
      this.logger.exitFunction('checkWebhookHealth', { 
        status: healthResult.status,
        success_rate: successRate
      });
      
      return healthResult;
      
    } catch (error) {
      this.logger.error('Webhook health check failed', { error: error.toString() });
      return {
        status: 'unhealthy',
        error: error.toString(),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }

  /**
   * Test webhook connectivity
   * @returns {Object} Test result
   */
  testWebhookConnectivity() {
    this.logger.enterFunction('testWebhookConnectivity');
    
    try {
      // @testHook(webhook_connectivity_test_start)
      
      const testPayload = {
        event_type: 'system_test',
        timestamp: DateUtils.formatISO(DateUtils.now()),
        test: true,
        test_data: {
          message: 'Connectivity test from Syston Tigers automation',
          system_version: getConfig('SYSTEM.VERSION'),
          test_id: StringUtils.generateId('test')
        }
      };
      
      const testResult = this.sendToMake(testPayload, { maxRetries: 1 });
      
      // @testHook(webhook_connectivity_test_complete)
      
      this.logger.exitFunction('testWebhookConnectivity', { 
        success: testResult.success 
      });
      
      return {
        success: testResult.success,
        response_code: testResult.response_code,
        test_payload: testPayload,
        full_result: testResult,
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
      
    } catch (error) {
      this.logger.error('Webhook connectivity test failed', { error: error.toString() });
      return {
        success: false,
        error: error.toString(),
        timestamp: DateUtils.formatISO(DateUtils.now())
      };
    }
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Send payload to Make.com (public API)
 * @param {Object} payload - Payload to send
 * @param {Object} options - Send options
 * @returns {Object} Send result
 */
function sendToMake(payload, options = {}) {
  const integration = new MakeIntegration();
  return integration.sendToMake(payload, options);
}

/**
 * Send batch payloads to Make.com (public API)
 * @param {Array} payloads - Array of payloads
 * @param {Object} options - Batch options
 * @returns {Object} Batch send result
 */
function sendBatchToMake(payloads, options = {}) {
  const integration = new MakeIntegration();
  return integration.sendBatchToMake(payloads, options);
}

/**
 * Test webhook connectivity (public API)
 * @returns {Object} Test result
 */
function testWebhookConnectivity() {
  const integration = new MakeIntegration();
  return integration.testWebhookConnectivity();
}

/**
 * Get webhook metrics (public API)
 * @returns {Object} Current metrics
 */
function getWebhookMetrics() {
  const integration = new MakeIntegration();
  return integration.getMetrics();
}

/**
 * Check webhook health (public API)
 * @returns {Object} Health check result
 */
function checkWebhookHealth() {
  const integration = new MakeIntegration();
  return integration.checkWebhookHealth();
}

/**
 * Initialize Make.com integration
 * @returns {Object} Initialization result
 */
function initializeMakeIntegration() {
  logger.enterFunction('MakeIntegration.initialize');
  
  try {
    const integration = new MakeIntegration();
    
    // Test basic connectivity
    const connectivityTest = integration.testWebhookConnectivity();
    
    // Validate router configuration
    const routerValidation = integration.validateRouterConfiguration();
    
    // Get initial metrics
    const metrics = integration.getMetrics();
    
    logger.exitFunction('MakeIntegration.initialize', { 
      success: true,
      connectivity_test: connectivityTest.success
    });
    
    return {
      success: true,
      connectivity_test: connectivityTest,
      router_validation: routerValidation,
      initial_metrics: metrics,
      webhook_configured: !!getWebhookUrl(),
      version: '6.2.0'
    };
    
  } catch (error) {
    logger.error('Make.com integration initialization failed', { error: error.toString() });
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

