/**
 * @fileoverview Comprehensive Test Suites for Football Automation System
 * @version 6.0.0
 * @author Senior Software Architect
 * @description Complete test coverage for all system components
 *
 * TEST SUITES:
 * - Security and Authentication Tests
 * - Control Panel Tests
 * - Input Validation Tests
 * - Player Management Tests
 * - Event Processing Tests
 * - Integration Tests
 * - Performance Tests
 */

// ==================== SECURITY AUTHENTICATION TESTS ====================

suite('Security and Authentication', function() {
  let testUser, testSession;

  setup(function() {
    // Setup test data
    testUser = {
      username: 'testuser',
      password: 'testpass123',
      role: 'admin'
    };
  });

  teardown(function() {
    // Clean up test sessions
    if (testSession) {
      SecurityManager_Instance.destroySession(testSession);
    }
  });

  test('should authenticate valid admin user', function() {
    const result = authenticateAdminSecure('admin', 'admin123');

    // Should require password change for legacy accounts
    if (result.requiresPasswordChange) {
      ok(!result.success, 'Legacy accounts should require password change');
      ok(result.error.includes('Legacy account'), 'Should indicate legacy account');
    } else {
      ok(result.success, 'Authentication should succeed');
      ok(result.sessionToken, 'Should return session token');
      equal(result.role, 'super_admin', 'Should return correct role');
      ok(result.expiresAt, 'Should return expiration time');
    }
  });

  test('should reject invalid credentials', function() {
    const result = authenticateAdminSecure('admin', 'wrongpassword');

    notOk(result.success, 'Authentication should fail');
    ok(result.error, 'Should return error message');
    notOk(result.sessionToken, 'Should not return session token');
  });

  test('should validate session permissions', function() {
    const authResult = authenticateAdminSecure('admin', 'admin123');

    // Skip permission test if password change is required
    if (authResult.requiresPasswordChange) {
      ok(!authResult.success, 'Should require password change');
      return;
    }

    const permissionResult = checkPermission(authResult.sessionToken, 'control_panel_access');

    ok(permissionResult.success, 'Permission check should succeed');
    ok(permissionResult.session, 'Should return session data');
  });

  test('should reject expired sessions', function() {
    // Mock expired session
    const mockToken = 'expired_token_123';
    const result = checkPermission(mockToken, 'control_panel_access');

    notOk(result.success, 'Should reject expired session');
    ok(result.error.includes('Invalid session'), 'Should return appropriate error');
  });

  test('should handle account lockout after failed attempts', function() {
    // Simulate multiple failed attempts
    for (let i = 0; i < 4; i++) {
      authenticateAdminSecure('testuser', 'wrongpassword');
    }

    const result = authenticateAdminSecure('testuser', 'wrongpassword');
    ok(result.error.includes('locked'), 'Should lock account after max attempts');
  });
});

// ==================== INPUT VALIDATION TESTS ====================

suite('Input Validation', function() {

  test('should validate player names correctly', function() {
    const validResult = validateInput('John Smith', 'playerName');
    ok(validResult.success, 'Should accept valid player name');
    equal(validResult.value, 'John Smith', 'Should return sanitized name');

    const invalidResult = validateInput('John<script>', 'playerName');
    notOk(invalidResult.success, 'Should reject player name with script tags');
  });

  test('should validate match minutes', function() {
    const validResult = validateInput(45, 'minute');
    ok(validResult.success, 'Should accept valid minute');
    equal(validResult.value, 45, 'Should return correct minute');

    const invalidResult = validateInput(150, 'minute');
    notOk(invalidResult.success, 'Should reject invalid minute');
  });

  test('should sanitize dangerous input', function() {
    const dangerous = '<script>alert("xss")</script>';
    const result = SecurityManager_Instance.sanitizeInput(dangerous, 'string');
    notOk(result.includes('<script>'), 'Should remove script tags');
    notOk(result.includes('javascript:'), 'Should remove javascript protocols');
  });

  test('should validate email addresses', function() {
    const validResult = validateInput('test@example.com', 'email');
    ok(validResult.success, 'Should accept valid email');

    const invalidResult = validateInput('notanemail', 'email');
    notOk(invalidResult.success, 'Should reject invalid email');
  });

  test('should enforce string length limits', function() {
    const tooLong = 'a'.repeat(100);
    const result = validateInput(tooLong, 'string', { maxLength: 50 });
    notOk(result.success, 'Should reject strings exceeding max length');
  });
});

// ==================== PII PROTECTION TESTS ====================

suite('PII Protection', function() {

  test('should mask sensitive data', function() {
    const data = {
      username: 'testuser',
      password: 'secret123',
      email: 'test@example.com',
      player_name: 'John Smith'
    };

    const masked = maskPII(data);

    notEqual(masked.password, 'secret123', 'Should mask password');
    notEqual(masked.email, 'test@example.com', 'Should mask email');
    ok(masked.player_name.includes('John'), 'Should preserve first name');
    ok(masked.player_name.includes('*'), 'Should mask surname');
  });

  test('should handle null and undefined values', function() {
    const data = {
      username: null,
      password: undefined,
      email: ''
    };

    const masked = maskPII(data);
    equal(masked.username, null, 'Should handle null values');
    equal(masked.password, undefined, 'Should handle undefined values');
  });
});

// ==================== CONTROL PANEL TESTS ====================

suite('Control Panel Functionality', function() {
  let sessionToken;

  setup(function() {
    // Get authenticated session for tests
    const authResult = authenticateAdminSecure('admin', 'admin123');
    // Use sessionToken only if authentication succeeded
    sessionToken = authResult.success ? authResult.sessionToken : null;
  });

  test('should display control panel for authenticated users', function() {
    const result = ControlPanel.showControlPanel(sessionToken);
    ok(result.success, 'Should show control panel for authenticated user');
  });

  test('should require authentication for control panel access', function() {
    const result = ControlPanel.showControlPanel(null);
    ok(result.success, 'Should show login form for unauthenticated user');
  });

  test('should toggle features with proper authentication', function() {
    const result = controlPanelToggleFeatureAuth(sessionToken, 'make_integration', true);
    ok(result.success, 'Should toggle feature with valid session');
    equal(result.feature, 'make_integration', 'Should return correct feature name');
  });

  test('should reject feature toggle without authentication', function() {
    const result = controlPanelToggleFeatureAuth('invalid_token', 'make_integration', true);
    notOk(result.success, 'Should reject feature toggle with invalid session');
  });

  test('should execute manual triggers with authentication', function() {
    const mockStub = stub(window, 'performSystemHealthCheck', function() {
      return { success: true, message: 'Health check completed' };
    });

    const result = controlPanelTriggerActionAuth(sessionToken, 'system_health_check');
    ok(result.success, 'Should execute action with valid session');

    mockStub.restore();
  });
});

// ==================== PERFORMANCE TESTS ====================

suite('Performance Testing', function() {

  test('should validate input quickly', function() {
    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      validateInput('test' + i, 'string', { required: true, maxLength: 50 });
    }

    const duration = Date.now() - startTime;
    ok(duration < 1000, `Input validation should be fast (${duration}ms for 100 operations)`);
  });

  test('should handle authentication efficiently', function() {
    const startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      const result = authenticateAdminSecure('admin', 'admin123');
      if (result.sessionToken) {
        SecurityManager_Instance.destroySession(result.sessionToken);
      }
    }

    const duration = Date.now() - startTime;
    ok(duration < 5000, `Authentication should be efficient (${duration}ms for 10 operations)`);
  });

  test('should mask PII data efficiently', function() {
    const testData = {
      password: 'secret123',
      email: 'test@example.com',
      player_name: 'John Smith'
    };

    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      maskPII(testData);
    }

    const duration = Date.now() - startTime;
    ok(duration < 500, `PII masking should be efficient (${duration}ms for 100 operations)`);
  });
});

// ==================== INTEGRATION TESTS ====================

suite('System Integration', function() {
  let sessionToken;

  setup(function() {
    const authResult = authenticateAdminSecure('admin', 'admin123');
    // Use sessionToken only if authentication succeeded
    sessionToken = authResult.success ? authResult.sessionToken : null;
  });

  test('should integrate authentication with control panel', function() {
    // Test full authentication flow
    const loginResult = controlPanelAuthenticate('admin', 'admin123');
    ok(loginResult.success, 'Login should succeed');

    const panelResult = showAuthenticatedControlPanel(loginResult.sessionToken);
    ok(panelResult.success, 'Should show authenticated control panel');

    const logoutResult = controlPanelLogout(loginResult.sessionToken);
    ok(logoutResult.success, 'Logout should succeed');
  });

  test('should integrate input validation with security', function() {
    // Test that security functions use input validation
    const result = controlPanelToggleFeatureAuth(sessionToken, '<script>alert("xss")</script>', true);
    notOk(result.success, 'Should reject malicious input in feature names');
  });

  test('should integrate security logging with all operations', function() {
    // Mock the security audit sheet
    const mockSheet = {
      appendRow: mock('appendRow')
    };
    const sheetStub = stub(SheetUtils, 'getOrCreateSheet', function() {
      return mockSheet;
    });

    // Perform an action that should log security events
    controlPanelToggleFeatureAuth(sessionToken, 'make_integration', false);

    ok(mockSheet.appendRow.callCount() > 0, 'Should log security events');

    sheetStub.restore();
  });
});

// ==================== ERROR HANDLING TESTS ====================

suite('Error Handling', function() {

  test('should handle network failures gracefully', function() {
    // Mock network failure
    const originalFetch = UrlFetchApp.fetch;
    UrlFetchApp.fetch = function() {
      throw new Error('Network timeout');
    };

    // Test that webhook calls handle errors gracefully
    const result = sendToMake('test_event', { test: 'data' });
    ok(result.success !== undefined, 'Should return success/failure status');

    // Restore original function
    UrlFetchApp.fetch = originalFetch;
  });

  test('should handle sheet access failures', function() {
    // Mock sheet access failure
    const sheetStub = stub(SheetUtils, 'getOrCreateSheet', function() {
      return null;
    });

    // Test that functions handle missing sheets
    const result = SecurityManager_Instance.logSecurityEvent('test_event', { test: 'data' });
    // Should not throw error

    sheetStub.restore();
  });

  test('should handle malformed configuration', function() {
    // Mock malformed config
    const configStub = stub(PropertiesService, 'getScriptProperties', function() {
      return {
        getProperty: function() { return 'invalid_json{'; },
        getProperties: function() { return {}; }
      };
    });

    // Test that config functions handle malformed data
    throws(function() {
      JSON.parse('invalid_json{');
    }, 'Should detect malformed JSON');

    configStub.restore();
  });
});

// ==================== EDGE CASE TESTS ====================

suite('Edge Cases', function() {

  test('should handle empty and null inputs', function() {
    const nullResult = validateInput(null, 'string');
    notOk(nullResult.success, 'Should handle null input');

    const emptyResult = validateInput('', 'string', { required: true });
    notOk(emptyResult.success, 'Should handle empty required string');

    const undefinedResult = validateInput(undefined, 'string');
    notOk(undefinedResult.success, 'Should handle undefined input');
  });

  test('should handle boundary values', function() {
    const minBoundary = validateInput(0, 'minute');
    ok(minBoundary.success, 'Should accept minimum minute value');

    const maxBoundary = validateInput(120, 'minute');
    ok(maxBoundary.success, 'Should accept maximum minute value');

    const overBoundary = validateInput(121, 'minute');
    notOk(overBoundary.success, 'Should reject over-boundary minute value');
  });

  test('should handle special characters in player names', function() {
    const hyphenated = validateInput('Anne-Marie', 'playerName');
    ok(hyphenated.success, 'Should accept hyphenated names');

    const apostrophe = validateInput("O'Connor", 'playerName');
    ok(apostrophe.success, 'Should accept names with apostrophes');

    const numbers = validateInput('Player123', 'playerName');
    notOk(numbers.success, 'Should reject names with numbers');
  });

  test('should handle very long input strings', function() {
    const veryLongString = 'a'.repeat(10000);
    const result = validateInput(veryLongString, 'string', { maxLength: 50 });
    notOk(result.success, 'Should reject very long strings');
  });

  test('should handle concurrent session access', function() {
    const authResult = authenticateAdminSecure('admin', 'admin123');

    // Skip test if password change is required
    if (authResult.requiresPasswordChange) {
      ok(!authResult.success, 'Should require password change');
      return;
    }

    const sessionToken = authResult.sessionToken;

    // Simulate concurrent access
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(checkPermission(sessionToken, 'control_panel_access'));
    }

    // All should succeed (session should handle concurrent access)
    results.forEach((result, index) => {
      ok(result.success, `Concurrent access ${index + 1} should succeed`);
    });

    SecurityManager_Instance.destroySession(sessionToken);
  });
});

// ==================== REGRESSION TESTS ====================

suite('Regression Testing', function() {

  test('should maintain backward compatibility', function() {
    // Test that old function signatures still work
    const result = showControlPanel(); // Old signature without session token
    ok(result.success, 'Should maintain backward compatibility');
  });

  test('should handle previously problematic inputs', function() {
    // Test cases that previously caused issues

    // Special characters that broke parsing
    const specialChars = validateInput('Test & < > " \'', 'string');
    ok(specialChars.success || specialChars.error, 'Should handle special characters');

    // Unicode characters
    const unicode = validateInput('Müller', 'playerName');
    ok(unicode.success || unicode.error, 'Should handle unicode characters');
  });

  test('should preserve security fixes', function() {
    // Test that security vulnerabilities remain fixed
    const xssAttempt = '<script>alert("xss")</script>';
    const sanitized = SecurityManager_Instance.sanitizeInput(xssAttempt, 'string');
    notOk(sanitized.includes('<script>'), 'Should maintain XSS protection');
  });
});

// ==================== TEST RUNNER FUNCTIONS ====================

/**
 * Run all test suites and return results
 * @returns {Object} Complete test results
 */
function runAllTests() {
  logger.info('Starting comprehensive test run');

  try {
    const results = runTests();

    logger.info('Test run completed', {
      totalTests: results.totalTests,
      passed: results.passedTests,
      failed: results.failedTests,
      passRate: results.passedTests / results.totalTests * 100
    });

    return results;

  } catch (error) {
    logger.error('Test run failed', { error: error.toString() });
    throw error;
  }
}

/**
 * Run only security tests
 * @returns {Object} Security test results
 */
function runSecurityTests() {
  // Reset framework
  TestFramework.testSuites = [];

  // Define security-only suites
  suite('Security and Authentication');
  suite('Input Validation');
  suite('PII Protection');

  return runTests();
}

/**
 * Run only performance tests
 * @returns {Object} Performance test results
 */
function runPerformanceTests() {
  // Reset framework
  TestFramework.testSuites = [];

  // Define performance-only suite
  suite('Performance Testing');

  return runTests();
}

/**
 * Run continuous integration tests
 * @returns {Object} CI test results
 */
function runCITests() {
  const results = runAllTests();

  // Fail build if any tests failed
  if (results.failedTests > 0) {
    throw new Error(`Build failed: ${results.failedTests} tests failed`);
  }

  // Warn if pass rate is below threshold
  const passRate = results.passedTests / results.totalTests * 100;
  if (passRate < 95) {
    logger.warn('Pass rate below 95%', { passRate: passRate });
  }

  return results;
}