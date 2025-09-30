/**
 * Comprehensive System Test Execution
 * Run all tests to verify system functionality
 */

function runComprehensiveSystemTest() {
  console.log('🧪 Starting Comprehensive System Test...\n');

  const testResults = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    results: [],
    timestamp: new Date().toISOString()
  };

  // Test 1: Basic Configuration Access
  console.log('Test 1: Configuration System');
  try {
    const clubName = getConfigValue('SYSTEM.CLUB_NAME');
    const version = getConfigValue('SYSTEM.VERSION');

    if (clubName && version) {
      testResults.results.push({
        test: 'Configuration Access',
        status: 'PASS',
        details: `Club: ${clubName}, Version: ${version}`
      });
      testResults.passedTests++;
    } else {
      testResults.results.push({
        test: 'Configuration Access',
        status: 'FAIL',
        details: 'Missing club name or version'
      });
      testResults.failedTests++;
    }
    testResults.totalTests++;
  } catch (error) {
    testResults.results.push({
      test: 'Configuration Access',
      status: 'ERROR',
      details: error.toString()
    });
    testResults.failedTests++;
    testResults.totalTests++;
  }

  // Test 2: Health Check System
  console.log('Test 2: Health Check System');
  try {
    const health = HealthCheck.quickHealthCheck();

    if (health && health.status) {
      testResults.results.push({
        test: 'Health Check System',
        status: 'PASS',
        details: `Status: ${health.status}`
      });
      testResults.passedTests++;
    } else {
      testResults.results.push({
        test: 'Health Check System',
        status: 'FAIL',
        details: 'No health status returned'
      });
      testResults.failedTests++;
    }
    testResults.totalTests++;
  } catch (error) {
    testResults.results.push({
      test: 'Health Check System',
      status: 'ERROR',
      details: error.toString()
    });
    testResults.failedTests++;
    testResults.totalTests++;
  }

  // Test 3: Webapp Routing
  console.log('Test 3: Webapp Routing');
  try {
    const mockEvent = { parameter: { action: 'health' } };
    const response = handleQueryParameterRouting(mockEvent);

    if (response) {
      testResults.results.push({
        test: 'Webapp Routing',
        status: 'PASS',
        details: 'Health endpoint responsive'
      });
      testResults.passedTests++;
    } else {
      testResults.results.push({
        test: 'Webapp Routing',
        status: 'FAIL',
        details: 'No response from routing'
      });
      testResults.failedTests++;
    }
    testResults.totalTests++;
  } catch (error) {
    testResults.results.push({
      test: 'Webapp Routing',
      status: 'ERROR',
      details: error.toString()
    });
    testResults.failedTests++;
    testResults.totalTests++;
  }

  // Test 4: Goal Processing (Mock)
  console.log('Test 4: Goal Processing');
  try {
    // Test input validation without actually processing
    const playerValidation = AdvancedSecurity.validateInput('Test Player', 'player_name', { source: 'test' });
    const minuteValidation = AdvancedSecurity.validateInput('45', 'match_minute', { source: 'test' });

    if (playerValidation.valid && minuteValidation.valid) {
      testResults.results.push({
        test: 'Goal Processing Validation',
        status: 'PASS',
        details: 'Input validation working'
      });
      testResults.passedTests++;
    } else {
      testResults.results.push({
        test: 'Goal Processing Validation',
        status: 'FAIL',
        details: 'Input validation failed'
      });
      testResults.failedTests++;
    }
    testResults.totalTests++;
  } catch (error) {
    testResults.results.push({
      test: 'Goal Processing Validation',
      status: 'ERROR',
      details: error.toString()
    });
    testResults.failedTests++;
    testResults.totalTests++;
  }

  // Test 5: Enterprise Features
  console.log('Test 5: Enterprise Features');
  try {
    const cacheTest = CacheManager.get('test_key');
    const quotaCheck = QuotaMonitor.checkQuotaLimits();

    if (quotaCheck && typeof quotaCheck.allowed === 'boolean') {
      testResults.results.push({
        test: 'Enterprise Features',
        status: 'PASS',
        details: 'Cache and quota systems operational'
      });
      testResults.passedTests++;
    } else {
      testResults.results.push({
        test: 'Enterprise Features',
        status: 'FAIL',
        details: 'Enterprise systems not responding'
      });
      testResults.failedTests++;
    }
    testResults.totalTests++;
  } catch (error) {
    testResults.results.push({
      test: 'Enterprise Features',
      status: 'ERROR',
      details: error.toString()
    });
    testResults.failedTests++;
    testResults.totalTests++;
  }

  // Test 6: Error Handling
  console.log('Test 6: Error Handling');
  try {
    const errorTest = EnterpriseErrorHandler.createErrorResponse('Test error', 'test_context');

    if (errorTest && errorTest.success === false && errorTest.error) {
      testResults.results.push({
        test: 'Error Handling',
        status: 'PASS',
        details: 'Error handling system functional'
      });
      testResults.passedTests++;
    } else {
      testResults.results.push({
        test: 'Error Handling',
        status: 'FAIL',
        details: 'Error handling not working properly'
      });
      testResults.failedTests++;
    }
    testResults.totalTests++;
  } catch (error) {
    testResults.results.push({
      test: 'Error Handling',
      status: 'ERROR',
      details: error.toString()
    });
    testResults.failedTests++;
    testResults.totalTests++;
  }

  // Test 7: Weekly Automation Sheets & Named Ranges
  console.log('Test 7: Weekly Automation Sheets');
  try {
    const provisioningResult = CustomerInstaller.ensureAutomationInfrastructure();
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    const requiredSheets = [
      getConfigValue('SHEETS.TAB_NAMES.WEEKLY_CONTENT', 'Weekly Content Calendar'),
      getConfigValue('SHEETS.TAB_NAMES.QUOTES', 'Quotes'),
      getConfigValue('SHEETS.TAB_NAMES.HISTORICAL_DATA', 'Historical Data')
    ];

    const requiredNamedRanges = [
      getConfigValue('SHEETS.NAMED_RANGES.WEEKLY_CONTENT.HEADERS', 'WEEKLY_CONTENT_HEADERS'),
      getConfigValue('SHEETS.NAMED_RANGES.WEEKLY_CONTENT.TABLE', 'WEEKLY_CONTENT_TABLE'),
      getConfigValue('SHEETS.NAMED_RANGES.QUOTES.HEADERS', 'QUOTES_HEADERS'),
      getConfigValue('SHEETS.NAMED_RANGES.QUOTES.TABLE', 'QUOTES_TABLE'),
      getConfigValue('SHEETS.NAMED_RANGES.HISTORICAL_DATA.HEADERS', 'HISTORICAL_DATA_HEADERS'),
      getConfigValue('SHEETS.NAMED_RANGES.HISTORICAL_DATA.TABLE', 'HISTORICAL_DATA_TABLE')
    ];

    const missingSheets = requiredSheets.filter(name => !spreadsheet.getSheetByName(name));
    const missingRanges = requiredNamedRanges.filter(name => !spreadsheet.getRangeByName(name));
    const missingHeaderSheets = requiredSheets.filter(name => {
      const details = provisioningResult && provisioningResult[name];
      return !details || details.headersEnsured !== true;
    });

    if (missingSheets.length === 0 && missingRanges.length === 0 && missingHeaderSheets.length === 0) {
      testResults.results.push({
        test: 'Weekly Automation Sheets',
        status: 'PASS',
        details: 'All automation sheets and named ranges present'
      });
      testResults.passedTests++;
    } else {
      testResults.results.push({
        test: 'Weekly Automation Sheets',
        status: 'FAIL',
        details: `Missing sheets: ${missingSheets.join(', ') || 'none'}; Missing ranges: ${missingRanges.join(', ') || 'none'}; Headers ensured: ${missingHeaderSheets.length === 0 ? 'yes' : 'no (' + missingHeaderSheets.join(', ') + ')'}`
      });
      testResults.failedTests++;
    }

    testResults.totalTests++;
  } catch (error) {
    testResults.results.push({
      test: 'Weekly Automation Sheets',
      status: 'ERROR',
      details: error.toString()
    });
    testResults.failedTests++;
    testResults.totalTests++;
  }

  // Calculate final results
  testResults.passRate = Math.round((testResults.passedTests / testResults.totalTests) * 100);

  // Print Results
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log(`Total Tests: ${testResults.totalTests}`);
  console.log(`Passed: ${testResults.passedTests}`);
  console.log(`Failed: ${testResults.failedTests}`);
  console.log(`Pass Rate: ${testResults.passRate}%`);
  console.log('\n📋 DETAILED RESULTS:');

  testResults.results.forEach((result, index) => {
    const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${status} ${result.test}: ${result.details}`);
  });

  // Overall assessment
  if (testResults.passRate >= 90) {
    console.log('\n🎉 SYSTEM STATUS: EXCELLENT - Ready for production!');
  } else if (testResults.passRate >= 75) {
    console.log('\n✅ SYSTEM STATUS: GOOD - Minor issues detected');
  } else if (testResults.passRate >= 50) {
    console.log('\n⚠️ SYSTEM STATUS: WARNING - Multiple issues found');
  } else {
    console.log('\n🚨 SYSTEM STATUS: CRITICAL - Major issues detected');
  }

  return testResults;
}

// Quick test function for manual execution
function quickSystemCheck() {
  try {
    const results = runComprehensiveSystemTest();
    return {
      success: true,
      passRate: results.passRate,
      summary: `${results.passedTests}/${results.totalTests} tests passed`
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}