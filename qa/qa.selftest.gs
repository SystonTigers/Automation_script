/**
 * @fileoverview Lightweight self-test harness for the Make integration.
 *
 * How to execute the self-tests:
 * 1. Open the Apps Script editor for this project.
 * 2. Add/refresh this file (`qa/qa.selftest.gs`) in the script editor if needed.
 * 3. From the "Run" menu, execute the `runMakeIntegrationSelfTests` function.
 * 4. Inspect the execution logs for individual test outcomes and hook counters.
 *
 * The harness attaches observers to `globalThis.__testHooks` so Make integration
 * instrumentation (`@testHook(...)`) increments in-memory counters that the
 * assertions below verify.
 */

/**
 * Minimal assertion helper.
 * @param {boolean} condition Condition that must be truthy
 * @param {string} message Message to display when assertion fails
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Assertion helper for equality checks.
 * @param {*} actual Actual value
 * @param {*} expected Expected value
 * @param {string} message Message to display when assertion fails
 */
function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    const detail = message ? `${message}. ` : '';
    throw new Error(`${detail}Expected ${expected}, received ${actual}`);
  }
}

/**
 * Global hook harness that records invocation counts and payloads for
 * Make integration test hooks.
 */
const SelfTestHooks = (function() {
  const counters = {};
  const payloads = {};
  const handlers = {};
  const globalScope = typeof globalThis !== 'undefined' ? globalThis : this;

  function ensureHook(name) {
    if (!name) {
      return;
    }

    if (!handlers[name]) {
      counters[name] = 0;
      payloads[name] = [];
      handlers[name] = function(payload) {
        counters[name] = (counters[name] || 0) + 1;
        payloads[name].push(payload);
        return undefined;
      };
    }

    const existing = globalScope.__testHooks || {};
    if (existing[name] !== handlers[name]) {
      globalScope.__testHooks = { ...existing, [name]: handlers[name] };
    }
  }

  function ensureHooks(hooks) {
    (Array.isArray(hooks) ? hooks : [hooks]).forEach(ensureHook);
  }

  function reset(hooks) {
    const list = hooks ? (Array.isArray(hooks) ? hooks : [hooks]) : Object.keys(handlers);
    list.forEach(function(name) {
      ensureHook(name);
      counters[name] = 0;
      payloads[name] = [];
    });
  }

  return {
    ensure: ensureHooks,
    reset: reset,
    counters: counters,
    payloads: payloads
  };
})();

/**
 * Install a deterministic Apps Script-like environment for testing.
 * @param {Object} options Environment options
 * @param {Object=} options.properties Initial script property values
 * @param {Object=} options.config Overrides for getConfigValue lookups
 * @returns {Object} Environment controller with restore + telemetry handles
 */
function installSelfTestEnvironment(options) {
  const settings = options || {};
  const propertyValues = { ...(settings.properties || {}) };
  const configOverrides = { ...(settings.config || {}) };
  const globalScope = typeof globalThis !== 'undefined' ? globalThis : this;

  const original = {
    PropertiesService: globalScope.PropertiesService,
    Utilities: globalScope.Utilities,
    DateUtils: globalScope.DateUtils,
    logger: globalScope.logger,
    StringUtils: globalScope.StringUtils,
    UrlFetchApp: globalScope.UrlFetchApp,
    getConfigValue: globalScope.getConfigValue
  };

  globalScope.PropertiesService = {
    getScriptProperties: function() {
      return {
        getProperty: function(key) {
          return Object.prototype.hasOwnProperty.call(propertyValues, key)
            ? propertyValues[key]
            : null;
        },
        setProperty: function(key, value) {
          propertyValues[key] = value;
        },
        deleteProperty: function(key) {
          delete propertyValues[key];
        },
        getProperties: function() {
          return { ...propertyValues };
        },
        setProperties: function(values) {
          Object.assign(propertyValues, values || {});
        }
      };
    }
  };

  const sleepCalls = [];

  globalScope.Utilities = {
    sleep: function(milliseconds) {
      sleepCalls.push(milliseconds);
    },
    formatDate: function() {
      return 'formatted';
    },
    computeDigest: function() {
      return [0];
    },
    computeHmacSha256Signature: function() {
      return [0];
    },
    DigestAlgorithm: {
      SHA_256: 'sha256'
    }
  };

  const fixedNow = new Date('2024-01-01T00:00:00Z');

  globalScope.DateUtils = {
    now: function() {
      return new Date(fixedNow.getTime());
    },
    formatISO: function(date) {
      const value = date instanceof Date ? date : new Date(date);
      return value.toISOString();
    },
    formatUK: function() {
      return '01/01/2024';
    },
    formatTime: function() {
      return '00:00';
    }
  };

  globalScope.logger = {
    sessionId: 'selftest-session',
    scope: function() {
      return {
        enterFunction: function() {},
        exitFunction: function() {},
        info: function() {},
        warn: function() {},
        error: function() {},
        audit: function() {},
        security: function() {}
      };
    }
  };

  globalScope.StringUtils = {
    generateId: function(prefix) {
      return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 8);
    }
  };

  const configDefaults = {
    'PERFORMANCE.WEBHOOK_RATE_LIMIT_MS': 0,
    'MAKE.IDEMPOTENCY.ENABLED': false,
    'SYSTEM.VERSION': 'self-test',
    'SYSTEM.ENVIRONMENT': 'test',
    'SYSTEM.CLUB_NAME': 'Self Test FC',
    'SYSTEM.CLUB_SHORT_NAME': 'STFC',
    'SYSTEM.SEASON': '2024/25',
    'SYSTEM.TIMEZONE': 'Europe/London',
    'MAKE.WEBHOOK_RETRY_ATTEMPTS': 3,
    'MAKE.WEBHOOK_RETRY_DELAY_MS': 100,
    'MAKE.WEBHOOK_SECRET': null,
    'WEBHOOKS.MAKE_URL': 'https://make.example/webhook',
    'MAKE.EVENT_TYPES': {
      fixtures_this_month: 'fixtures_this_month',
      goal_team: 'goal_team'
    }
  };

  globalScope.getConfigValue = function(path, fallback) {
    if (Object.prototype.hasOwnProperty.call(configOverrides, path)) {
      return configOverrides[path];
    }
    if (Object.prototype.hasOwnProperty.call(configDefaults, path)) {
      return configDefaults[path];
    }
    return typeof fallback !== 'undefined' ? fallback : null;
  };

  const urlFetchCalls = [];

  globalScope.UrlFetchApp = {
    fetch: function(url, options) {
      urlFetchCalls.push({ url: url, options: options });
      return {
        getResponseCode: function() {
          return 200;
        },
        getContentText: function() {
          return JSON.stringify({ ok: true });
        }
      };
    }
  };

  return {
    sleepCalls: sleepCalls,
    propertyStore: propertyValues,
    urlFetchCalls: urlFetchCalls,
    restore: function() {
      if (typeof original.PropertiesService === 'undefined') {
        delete globalScope.PropertiesService;
      } else {
        globalScope.PropertiesService = original.PropertiesService;
      }

      if (typeof original.Utilities === 'undefined') {
        delete globalScope.Utilities;
      } else {
        globalScope.Utilities = original.Utilities;
      }

      if (typeof original.DateUtils === 'undefined') {
        delete globalScope.DateUtils;
      } else {
        globalScope.DateUtils = original.DateUtils;
      }

      if (typeof original.logger === 'undefined') {
        delete globalScope.logger;
      } else {
        globalScope.logger = original.logger;
      }

      if (typeof original.StringUtils === 'undefined') {
        delete globalScope.StringUtils;
      } else {
        globalScope.StringUtils = original.StringUtils;
      }

      if (typeof original.UrlFetchApp === 'undefined') {
        delete globalScope.UrlFetchApp;
      } else {
        globalScope.UrlFetchApp = original.UrlFetchApp;
      }

      if (typeof original.getConfigValue === 'undefined') {
        delete globalScope.getConfigValue;
      } else {
        globalScope.getConfigValue = original.getConfigValue;
      }
    }
  };
}

/**
 * Utility to create a mock UrlFetchApp response.
 * @param {number} status HTTP status code
 * @param {string|Object} body Response body
 * @returns {Object} Mock response
 */
function createMockResponse(status, body) {
  return {
    getResponseCode: function() {
      return status;
    },
    getContentText: function() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    }
  };
}

/**
 * Ensure MakeIntegration payload validation succeeds without external state.
 * @param {MakeIntegration} integration Instance to patch
 */
function stubValidation(integration) {
  integration.validatePayload = function() {
    return { valid: true, errors: [] };
  };
}

/**
 * Test: backend properties configured → backend route used, webhook hooks idle.
 * @returns {Object} Test result
 */
function test_backend_enabled_route() {
  SelfTestHooks.reset([
    'backend_post_attempt_start',
    'backend_post_attempt_complete',
    'webhook_attempt_start',
    'webhook_attempt_complete'
  ]);

  const env = installSelfTestEnvironment({
    properties: {
      BACKEND_API_URL: 'https://backend.example',
      AUTOMATION_JWT: 'jwt-token',
      TENANT_ID: 'tenant-123'
    }
  });

  const backendCalls = [];

  try {
    const integration = new MakeIntegration();
    stubValidation(integration);

    const fetchStub = function(url, options) {
      backendCalls.push({ url: url, options: options });
      return createMockResponse(200, { job_id: 'job-123' });
    };

    const payload = {
      event_type: 'goal_team',
      timestamp: '2024-01-01T00:00:00Z'
    };

    const result = integration.sendToMake(payload, {
      fetchImpl: fetchStub
    });

    assert(result && result.success === true, 'Backend send should succeed');
    assertEqual(result.attempts, 1, 'Backend send should complete in a single attempt');
    assertEqual(backendCalls.length, 1, 'Expected a single backend fetch invocation');
    assertEqual(SelfTestHooks.counters.backend_post_attempt_start, 1, 'Backend start hook count mismatch');
    assertEqual(SelfTestHooks.counters.backend_post_attempt_complete, 1, 'Backend complete hook count mismatch');
    assertEqual(SelfTestHooks.counters.webhook_attempt_start || 0, 0, 'Webhook start hook should remain untouched');
    assertEqual(SelfTestHooks.counters.webhook_attempt_complete || 0, 0, 'Webhook complete hook should remain untouched');

    console.log('✅ test_backend_enabled_route passed');
    return {
      success: true,
      attempts: result.attempts,
      hooks: { ...SelfTestHooks.counters }
    };

  } catch (error) {
    console.error('❌ test_backend_enabled_route failed', error);
    return {
      success: false,
      error: error.toString()
    };
  } finally {
    env.restore();
  }
}

/**
 * Test: backend retries with exponential backoff before succeeding.
 * @returns {Object} Test result
 */
function test_backend_retry_backoff() {
  SelfTestHooks.reset([
    'backend_post_attempt_start',
    'backend_post_attempt_complete'
  ]);

  const env = installSelfTestEnvironment({
    properties: {
      BACKEND_API_URL: 'https://backend.example',
      AUTOMATION_JWT: 'jwt-token',
      TENANT_ID: 'tenant-123'
    }
  });

  try {
    const integration = new MakeIntegration();
    stubValidation(integration);

    let attempt = 0;
    const fetchStub = function() {
      attempt++;
      if (attempt < 3) {
        return createMockResponse(500, 'error');
      }
      return createMockResponse(200, { job_id: 'job-789' });
    };

    const payload = {
      event_type: 'goal_team',
      timestamp: '2024-01-01T00:00:00Z'
    };

    const result = integration.sendToMake(payload, {
      fetchImpl: fetchStub,
      retryDelay: 100,
      maxRetries: 3
    });

    assert(result && result.success === true, 'Backend send should eventually succeed');
    assertEqual(result.attempts, 3, 'Expected three backend attempts');
    assertEqual(SelfTestHooks.counters.backend_post_attempt_start, 3, 'Hook should record three attempt starts');
    assertEqual(SelfTestHooks.counters.backend_post_attempt_complete, 3, 'Hook should record three attempt completions');
    assertEqual(env.sleepCalls.length, 2, 'Two backoff sleeps expected before success');
    assertEqual(env.sleepCalls[0], 100, 'First backoff should wait base delay');
    assertEqual(env.sleepCalls[1], 200, 'Second backoff should double the delay');

    console.log('✅ test_backend_retry_backoff passed');
    return {
      success: true,
      attempts: result.attempts,
      sleeps: env.sleepCalls.slice()
    };

  } catch (error) {
    console.error('❌ test_backend_retry_backoff failed', error);
    return {
      success: false,
      error: error.toString()
    };
  } finally {
    env.restore();
  }
}

/**
 * Test: without backend config the Make webhook fallback executes exactly once.
 * @returns {Object} Test result
 */
function test_make_fallback_path() {
  SelfTestHooks.reset([
    'backend_post_attempt_start',
    'backend_post_attempt_complete',
    'webhook_attempt_start',
    'webhook_attempt_complete'
  ]);

  const env = installSelfTestEnvironment({
    properties: {}
  });

  try {
    const integration = new MakeIntegration();
    stubValidation(integration);

    integration.applyRateLimit = function() {};
    integration.enhancePayload = function(payload) {
      return payload;
    };
    integration.executeWebhookCall = function(url, payload, options) {
      invokeTestHook_('webhook_attempt_start', { url: url, payload: payload }, options ? options.testHooks : undefined);
      invokeTestHook_('webhook_attempt_complete', {
        url: url,
        response_code: 202
      }, options ? options.testHooks : undefined);
      return {
        success: true,
        response_code: 202,
        attempts: 1
      };
    };

    const payload = {
      event_type: 'fixtures_this_month',
      timestamp: '2024-01-01T00:00:00Z'
    };

    const result = integration.sendToMake(payload, {});

    assert(result && result.success === true, 'Fallback webhook send should succeed');
    assertEqual(SelfTestHooks.counters.backend_post_attempt_start || 0, 0, 'Backend attempts should not occur');
    assertEqual(SelfTestHooks.counters.webhook_attempt_start, 1, 'Webhook should run exactly once');
    assertEqual(SelfTestHooks.counters.webhook_attempt_complete, 1, 'Webhook completion should be recorded once');

    console.log('✅ test_make_fallback_path passed');
    return {
      success: true,
      hooks: { ...SelfTestHooks.counters }
    };

  } catch (error) {
    console.error('❌ test_make_fallback_path failed', error);
    return {
      success: false,
      error: error.toString()
    };
  } finally {
    env.restore();
  }
}

/**
 * Run all Make integration self-tests.
 * @returns {Object} Aggregated test summary
 */
function runMakeIntegrationSelfTests() {
  const tests = [
    { name: 'test_backend_enabled_route', fn: test_backend_enabled_route },
    { name: 'test_backend_retry_backoff', fn: test_backend_retry_backoff },
    { name: 'test_make_fallback_path', fn: test_make_fallback_path }
  ];

  const results = [];
  let passed = 0;

  tests.forEach(function(entry) {
    const result = entry.fn();
    results.push({ name: entry.name, ...result });
    if (result && result.success) {
      passed++;
    }
  });

  const summary = {
    success: passed === tests.length,
    passed: passed,
    failed: tests.length - passed,
    results: results
  };

  if (summary.success) {
    console.log(`✅ Make integration self-tests passed (${passed}/${tests.length})`);
  } else {
    console.error(`❌ Make integration self-tests failed (${summary.failed} failing)`);
  }

  return summary;
}
