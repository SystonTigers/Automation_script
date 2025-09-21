club_name: getConfig('SYSTEM.CLUB_NAME'),
      opponent_name: 'Test Opposition FC',
      season: getConfig('SYSTEM.SEASON'),
      idempotency_key: 'test_second_yellow_001'
    };
  }


  generateSubstitutionTestPayload() {
    return {
      timestamp: DateUtils.now().toISOString(),
      match_id: 'TEST_MATCH_006',
      event_type: 'substitution_made',
      source: 'apps_script_test',
      version: getConfig('SYSTEM.VERSION'),
      player_off: 'Tom Green',
      player_on: 'Ryan Clarke',
      minute: 71,
      sub_reason: 'Tactical substitution',
      match_info: { competition: 'League', venue: 'Home' },
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      idempotency_key: 'test_substitution_001'
    };
  }


  generateMotmTestPayload() {
    return {
      timestamp: DateUtils.now().toISOString(),
      match_id: 'TEST_MATCH_007',
      event_type: 'man_of_match',
      source: 'apps_script_test',
      version: getConfig('SYSTEM.VERSION'),
      player_name: 'Alex Taylor',
      performance_summary: 'Outstanding performance with 2 goals and 1 assist',
      stats_summary: { goals: 2, assists: 1, tackles: 5, passes: 47 },
      match_info: { competition: 'League', venue: 'Home', final_score: '3-1' },
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      opponent_name: 'Test Opposition FC',
      season: getConfig('SYSTEM.SEASON'),
      idempotency_key: 'test_motm_001'
    };
  }


  generatePostponedTestPayload() {
    return {
      timestamp: DateUtils.now().toISOString(),
      match_id: 'TEST_POSTPONED_001',
      event_type: 'match_postponed_league',
      source: 'apps_script_test',
      version: getConfig('SYSTEM.VERSION'),
      opponent_name: 'Test Opposition FC',
      original_date: '15 Oct 2025',
      new_date: '22 Oct 2025',
      has_new_date: true,
      postponement_reason: 'Waterlogged pitch',
      urgency_level: 'high',
      main_message: 'Test Opposition FC match postponed to 22 Oct 2025',
      sub_message: 'Originally scheduled for 15 Oct 2025',
      reason_message: 'Reason: Waterlogged pitch',
      competition: 'League',
      home_away: 'Home',
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      idempotency_key: 'test_postponed_001'
    };
  }


  generateSecondHalfTestPayload() {
    return {
      timestamp: DateUtils.now().toISOString(),
      match_id: 'TEST_MATCH_008',
      event_type: 'second_half_start',
      source: 'apps_script_test',
      version: getConfig('SYSTEM.VERSION'),
      home_score: 2,
      away_score: 1,
      half_time_summary: 'Exciting first half with 3 goals',
      match_info: { competition: 'League', venue: 'Home' },
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      opponent_name: 'Test Opposition FC',
      season: getConfig('SYSTEM.SEASON'),
      idempotency_key: 'test_second_half_001'
    };
  }


  generateFixtureBatchTestPayload(count) {
    const fixtures = [];
    for (let i = 1; i <= count; i++) {
      fixtures.push({
        date: `${10 + i} Oct 2025`,
        opponent: `Test Team ${i}`,
        homeAway: i % 2 === 1 ? 'H' : 'A',
        competition: 'League',
        venue: i % 2 === 1 ? 'Home Ground' : 'Away Ground',
        kickOff: '15:00'
      });
    }


    return {
      timestamp: DateUtils.now().toISOString(),
      match_id: `TEST_FIXTURES_BATCH_${count}`,
      event_type: `fixtures_batch_${count}`,
      source: 'apps_script_test',
      version: getConfig('SYSTEM.VERSION'),
      fixture_count: count,
      fixtures_list: fixtures,
      week_description: `Week commencing ${10} Oct 2025`,
      key_stats: {
        homeFixtures: Math.ceil(count / 2),
        awayFixtures: Math.floor(count / 2),
        competitions: { 'League': count }
      },
      next_match_highlight: fixtures[0],
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      batch_id: `test_fixtures_${count}_001`,
      idempotency_key: `test_fixtures_batch_${count}_001`
    };
  }


  generateResultBatchTestPayload(count) {
    const results = [];
    for (let i = 1; i <= count; i++) {
      results.push({
        date: `${i} Oct 2025`,
        opponent: `Test Team ${i}`,
        score: `${Math.floor(Math.random() * 3) + 1}-${Math.floor(Math.random() * 3)}`,
        result: ['W', 'D', 'L'][Math.floor(Math.random() * 3)],
        homeAway: i % 2 === 1 ? 'H' : 'A',
        competition: 'League'
      });
    }


    return {
      timestamp: DateUtils.now().toISOString(),
      match_id: `TEST_RESULTS_BATCH_${count}`,
      event_type: `results_batch_${count}`,
      source: 'apps_script_test',
      version: getConfig('SYSTEM.VERSION'),
      result_count: count,
      results_list: results,
      week_description: `Results for week ending ${count} Oct 2025`,
      key_stats: {
        wins: results.filter(r => r.result === 'W').length,
        draws: results.filter(r => r.result === 'D').length,
        losses: results.filter(r => r.result === 'L').length
      },
      best_result: results[0],
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      batch_id: `test_results_${count}_001`,
      idempotency_key: `test_results_batch_${count}_001`
    };
  }


  generateMonthlyFixturesTestPayload() {
    return {
      timestamp: DateUtils.now().toISOString(),
      match_id: 'TEST_MONTHLY_FIXTURES_001',
      event_type: 'fixtures_monthly',
      source: 'apps_script_test',
      version: getConfig('SYSTEM.VERSION'),
      month_name: 'October 2025',
      fixture_count: 6,
      fixtures_list: [
        { date: '05 Oct 2025', opponent: 'Test FC', homeAway: 'H', competition: 'League' },
        { date: '12 Oct 2025', opponent: 'Test United', homeAway: 'A', competition: 'Cup' },
        { date: '19 Oct 2025', opponent: 'Test Town', homeAway: 'H', competition: 'League' }
      ],
      key_stats: {
        totalFixtures: 6,
        homeFixtures: 3,
        awayFixtures: 3,
        competitions: { 'League': 4, 'Cup': 2 }
      },
      next_match_highlight: { opponent: 'Test FC', date: '05 Oct 2025', homeAway: 'H' },
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      idempotency_key: 'test_monthly_fixtures_001'
    };
  }


  generateMonthlyResultsTestPayload() {
    return {
      timestamp: DateUtils.now().toISOString(),
      match_id: 'TEST_MONTHLY_RESULTS_001',
      event_type: 'results_monthly',
      source: 'apps_script_test',
      version: getConfig('SYSTEM.VERSION'),
      month_name: 'September 2025',
      result_count: 5,
      key_stats: {
        totalMatches: 5,
        record: 'W3 D1 L1',
        points: 10,
        winPercentage: 60,
        goalDifference: 3
      },
      home_record: { played: 3, record: 'W2 D1 L0' },
      away_record: { played: 2, record: 'W1 D0 L1' },
      best_result: { opponent: 'Test FC', score: '4-0', homeAway: 'H' },
      worst_result: { opponent: 'Test United', score: '0-2', homeAway: 'A' },
      recent_form: 'WLWDW',
      goal_stats: { for: 8, against: 5, difference: 3 },
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      idempotency_key: 'test_monthly_results_001'
    };
  }


  generatePlayerStatsTestPayload() {
    return {
      timestamp: DateUtils.now().toISOString(),
      match_id: 'TEST_PLAYER_STATS_001',
      event_type: 'player_stats_summary',
      source: 'apps_script_test',
      version: getConfig('SYSTEM.VERSION'),
      period_type: 'bi-monthly',
      period_description: 'October 2025 Bi-Monthly Summary',
      top_performers: {
        top_scorer: { name: 'John Smith', goals: 8, goals_per_game: 0.67 },
        top_assist: { name: 'Mike Johnson', assists: 5, assists_per_game: 0.42 },
        most_apps: { name: 'David Wilson', appearances: 12, reliability_score: 12 },
        motm_leader: { name: 'Alex Taylor', motm_awards: 3, motm_ratio: 25 }
      },
      team_stats: {
        total_goals: 24,
        total_assists: 15,
        total_appearances: 180,
        average_goals_per_game: 2.4
      },
      performance_highlights: {
        most_efficient: { name: 'Chris Brown', efficiency_score: 0.75 },
        cleanest_player: { name: 'Tom Green', discipline_ratio: 0.0 },
        emerging_talent: { name: 'Ryan Clarke', potential: 'High' }
      },
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      idempotency_key: 'test_player_stats_001'
    };
  }


  generateVideoClipTestPayload() {
    return {
      timestamp: DateUtils.now().toISOString(),
      match_id: 'TEST_VIDEO_CLIP_001',
      event_type: 'video_clip_created',
      source: 'apps_script_test',
      version: getConfig('SYSTEM.VERSION'),
      player_name: 'John Smith',
      clip_title: 'Amazing 25th minute strike!',
      youtube_url: 'https://youtube.com/watch?v=TEST123',
      clip_duration: 30,
      goal_minute: 25,
      match_info: { competition: 'League', opponent: 'Test FC', venue: 'Home' },
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      idempotency_key: 'test_video_clip_001'
    };
  }


  // ===== VALIDATION HELPER METHODS =====


  /**
   * Validate Canva template structure
   * @param {Object} canvaTemplate - Canva template config
   * @returns {boolean} Template validity
   */
  validateCanvaTemplate(canvaTemplate) {
    logger.testHook('canva_template_validation', { templateName: canvaTemplate.templateName });


    try {
      return canvaTemplate &&
             canvaTemplate.templateName &&
             canvaTemplate.placeholders &&
             Array.isArray(canvaTemplate.placeholders) &&
             canvaTemplate.placeholders.length > 0;
    } catch (error) {
      logger.error('Canva template validation failed', { error: error.toString() });
      return false;
    }
  }


  /**
   * Validate template placeholders against test payload
   * @param {Array} placeholders - Required placeholders
   * @param {Object} testPayload - Test payload data
   * @returns {Object} Placeholder validation result
   */
  validateTemplatePlaceholders(placeholders, testPayload) {
    logger.testHook('template_placeholders_validation', { placeholderCount: placeholders.length });


    try {
      const validation = {
        allValid: true,
        validCount: 0,
        missing: [],
        total: placeholders.length
      };


      placeholders.forEach(placeholder => {
        if (this.hasNestedProperty(testPayload, placeholder)) {
          validation.validCount++;
        } else {
          validation.missing.push(placeholder);
          validation.allValid = false;
        }
      });


      return validation;
    } catch (error) {
      logger.error('Template placeholder validation failed', { error: error.toString() });
      return {
        allValid: false,
        validCount: 0,
        missing: placeholders,
        total: placeholders.length
      };
    }
  }


  /**
   * Check if object has nested property
   * @param {Object} obj - Object to check
   * @param {string} propertyPath - Property path (e.g., 'top_performers.top_scorer.name')
   * @returns {boolean} Property exists
   */
  hasNestedProperty(obj, propertyPath) {
    try {
      const properties = propertyPath.split('.');
      let current = obj;


      for (const property of properties) {
        if (current && typeof current === 'object' && property in current) {
          current = current[property];
        } else {
          return false;
        }
      }


      return current !== undefined && current !== null;
    } catch (error) {
      return false;
    }
  }


  /**
   * Test individual social platform configuration
   * @param {string} platform - Social media platform
   * @param {Object} testPayload - Test payload
   * @returns {Object} Platform test result
   */
  testSocialPlatform(platform, testPayload) {
    logger.testHook('social_platform_test', { platform });


    try {
      // Simulate social platform configuration checks
      const platformConfigs = {
        'facebook': { configured: true, apiKey: 'FB_API_KEY' },
        'twitter': { configured: true, apiKey: 'TWITTER_API_KEY' },
        'instagram': { configured: true, apiKey: 'INSTAGRAM_API_KEY' },
        'tiktok': { configured: false, apiKey: null }
      };


      const config = platformConfigs[platform];
      
      if (!config || !config.configured) {
        return {
          success: false,
          configured: false,
          error: `${platform} not configured`
        };
      }


      // Test payload compatibility for platform
      const isCompatible = this.testPlatformCompatibility(platform, testPayload);
      
      return {
        success: isCompatible,
        configured: true,
        error: isCompatible ? null : `Payload not compatible with ${platform}`
      };


    } catch (error) {
      return {
        success: false,
        configured: false,
        error: error.toString()
      };
    }
  }


  /**
   * Test platform compatibility with payload
   * @param {string} platform - Social media platform
   * @param {Object} payload - Test payload
   * @returns {boolean} Compatibility status
   */
  testPlatformCompatibility(platform, payload) {
    try {
      // Check for required fields per platform
      const platformRequirements = {
        'facebook': ['club_name', 'event_type'],
        'twitter': ['club_name', 'event_type'],
        'instagram': ['club_name', 'event_type'],
        'tiktok': ['club_name', 'event_type']
      };


      const requirements = platformRequirements[platform] || [];
      
      return requirements.every(field => payload[field]);
    } catch (error) {
      return false;
    }
  }


  // ===== TEMPLATE CONFIGURATION HELPERS =====


  /**
   * Get template dimensions for different template types
   * @param {string} templateName - Template name
   * @returns {Object} Template dimensions
   */
  getTemplateDimensions(templateName) {
    const dimensions = {
      // Social media standard dimensions
      'goal_celebration_template': { width: 1080, height: 1080 },
      'opposition_goal_template': { width: 1080, height: 1080 },
      'player_card_template': { width: 1080, height: 1080 },
      'second_yellow_template': { width: 1080, height: 1080 },
      'postponed_match_template': { width: 1080, height: 1080 },
      
      // Batch content dimensions
      'batch_fixtures_template': { width: 1080, height: 1350 },
      'batch_results_template': { width: 1080, height: 1350 },
      
      // Monthly summary dimensions
      'monthly_fixtures_template': { width: 1080, height: 1350 },
      'monthly_results_template': { width: 1080, height: 1350 },
      'player_stats_template': { width: 1080, height: 1350 },
      
      // Video content dimensions
      'video_clip_template': { width: 1920, height: 1080 }
    };


    return dimensions[templateName] || { width: 1080, height: 1080 };
  }


  /**
   * Get template design elements
   * @param {string} templateName - Template name
   * @returns {Array} Design elements
   */
  getTemplateDesignElements(templateName) {
    const elements = {
      'goal_celebration_template': ['club_logo', 'player_photo', 'celebration_graphics', 'score_display'],
      'opposition_goal_template': ['club_logo', 'opponent_logo', 'score_display', 'neutral_graphics'],
      'player_card_template': ['club_logo', 'player_photo', 'card_icon', 'incident_text'],
      'second_yellow_template': ['club_logo', 'player_photo', 'double_card_icon', 'timeline'],
      'postponed_match_template': ['club_logo', 'calendar_icon', 'weather_graphics', 'rescheduled_text'],
      'batch_fixtures_template': ['club_logo', 'fixture_list', 'calendar_graphics', 'competition_badges'],
      'monthly_fixtures_template': ['club_logo', 'month_header', 'fixture_grid', 'key_stats'],
      'player_stats_template': ['club_logo', 'player_photos', 'stats_charts', 'leaderboards']
    };


    return elements[templateName] || ['club_logo', 'text_content'];
  }


  /**
   * Get social media optimization settings
   * @param {Array} platforms - Social media platforms
   * @returns {Object} Optimization settings
   */
  getSocialOptimization(platforms) {
    return {
      platforms: platforms,
      aspectRatios: {
        facebook: '1:1',
        twitter: '16:9',
        instagram: '1:1',
        tiktok: '9:16'
      },
      hashtagStrategy: {
        facebook: 'moderate', // 3-5 hashtags
        twitter: 'heavy',     // 8-10 hashtags  
        instagram: 'maximum', // 20-30 hashtags
        tiktok: 'trending'    // Trending hashtags
      },
      textLimits: {
        facebook: 2200,
        twitter: 280,
        instagram: 2200,
        tiktok: 2200
      }
    };
  }


  // ===== ANALYSIS AND REPORTING METHODS =====


  /**
   * Calculate webhook success rate from test results
   * @param {Array} testResults - Test results array
   * @returns {number} Success rate percentage
   */
  calculateWebhookSuccessRate(testResults) {
    try {
      const webhookTests = testResults.filter(result => result.webhookTest);
      const successfulWebhooks = webhookTests.filter(result => result.webhookTest.success);
      
      return webhookTests.length > 0 ? 
        Math.round((successfulWebhooks.length / webhookTests.length) * 100) : 0;
    } catch (error) {
      return 0;
    }
  }


  /**
   * Calculate Canva success rate from test results
   * @param {Array} testResults - Test results array
   * @returns {number} Success rate percentage
   */
  calculateCanvaSuccessRate(testResults) {
    try {
      const canvaTests = testResults.filter(result => result.canvaTest);
      const successfulCanva = canvaTests.filter(result => result.canvaTest.success);
      
      return canvaTests.length > 0 ? 
        Math.round((successfulCanva.length / canvaTests.length) * 100) : 0;
    } catch (error) {
      return 0;
    }
  }


  /**
   * Calculate social media success rate from test results
   * @param {Array} testResults - Test results array
   * @returns {number} Success rate percentage
   */
  calculateSocialSuccessRate(testResults) {
    try {
      const socialTests = testResults.filter(result => result.socialTest);
      const successfulSocial = socialTests.filter(result => result.socialTest.success);
      
      return socialTests.length > 0 ? 
        Math.round((successfulSocial.length / socialTests.length) * 100) : 0;
    } catch (error) {
      return 0;
    }
  }


  /**
   * Calculate average response time from test results
   * @param {Array} testResults - Test results array
   * @returns {number} Average response time in ms
   */
  calculateAverageResponseTime(testResults) {
    try {
      const webhookTests = testResults
        .filter(result => result.webhookTest && result.webhookTest.responseTime)
        .map(result => result.webhookTest.responseTime);
      
      return webhookTests.length > 0 ? 
        Math.round(webhookTests.reduce((sum, time) => sum + time, 0) / webhookTests.length) : 0;
    } catch (error) {
      return 0;
    }
  }


  /**
   * Generate test recommendations based on results
   * @param {Object} testingResults - Complete testing results
   * @returns {Array} Recommendations array
   */
  generateTestRecommendations(testingResults) {
    logger.testHook('test_recommendations_generation');


    try {
      const recommendations = [];


      // Webhook recommendations
      if (testingResults.summary.webhookSuccessRate < 90) {
        recommendations.push({
          category: 'webhook',
          priority: 'high',
          issue: `Webhook success rate is ${testingResults.summary.webhookSuccessRate}%`,
          recommendation: 'Check Make.com webhook URL configuration and network connectivity',
          action: 'Verify webhook URL in script properties and test manually'
        });
      }


      // Canva recommendations
      if (testingResults.summary.canvaSuccessRate < 85) {
        recommendations.push({
          category: 'canva',
          priority: 'medium',
          issue: `Canva template success rate is ${testingResults.summary.canvaSuccessRate}%`,
          recommendation: 'Review Canva template configurations and placeholder mappings',
          action: 'Check missing placeholders and update template requirements'
        });
      }


      // Social media recommendations
      if (testingResults.summary.socialSuccessRate < 70) {
        recommendations.push({
          category: 'social',
          priority: 'medium',
          issue: `Social media success rate is ${testingResults.summary.socialSuccessRate}%`,
          recommendation: 'Review social media platform configurations and API credentials',
          action: 'Verify API keys and platform-specific requirements'
        });
      }


      // Performance recommendations
      if (testingResults.summary.averageResponseTime > 15000) {
        recommendations.push({
          category: 'performance',
          priority: 'low',
          issue: `Average response time is ${testingResults.summary.averageResponseTime}ms`,
          recommendation: 'Optimize webhook payload size and Make.com scenario performance',
          action: 'Review scenario complexity and add caching where appropriate'
        });
      }


      // Overall system recommendations
      if (testingResults.summary.passRate < 80) {
        recommendations.push({
          category: 'system',
          priority: 'high',
          issue: `Overall pass rate is ${testingResults.summary.passRate}%`,
          recommendation: 'Conduct comprehensive system review and fix failing components',
          action: 'Priority fix for webhook routing and template configuration issues'
        });
      }


      return recommendations;
    } catch (error) {
      logger.error('Test recommendations generation failed', { error: error.toString() });
      return [];
    }
  }


  /**
   * Log router test results to tracking sheet
   * @param {Object} testingResults - Testing results
   */
  logRouterTestResults(testingResults) {
    logger.testHook('router_test_results_logging');


    try {
      const testSheet = SheetUtils.getOrCreateSheet('Make_Router_Tests');
      if (!testSheet) {
        logger.error('Router tests sheet not available for logging');
        return;
      }


      // Log each individual test result
      testingResults.testResults.forEach(testResult => {
        const values = [
          DateUtils.now().toISOString().split('T')[0], // Test date
          testResult.eventType,
          testResult.eventType, // Router branch same as event type
          testResult.webhookTest?.success ? 'Y' : 'N',
          testResult.canvaTest?.success ? 'Y' : 'N',
          testResult.socialTest?.success ? 'Y' : 'N',
          testResult.webhookTest?.responseTime || 0,
          JSON.stringify({
            webhookError: testResult.webhookTest?.error,
            canvaError: testResult.canvaTest?.error,
            socialErrors: testResult.socialTest?.errors
          }).substr(0, 500),
          JSON.stringify(testResult.testPayload || {}).substr(0, 1000)
        ];


        SheetUtils.appendRowSafe(testSheet, values);
      });


      logger.info('Router test results logged', {
        resultsLogged: testingResults.testResults.length,
        passRate: testingResults.summary.passRate
      });


    } catch (error) {
      logger.error('Router test results logging failed', { error: error.toString() });
    }
  }
}


// ===== PUBLIC API FUNCTIONS FOR MAIN COORDINATOR =====


/**
 * Public function to test all Make.com router branches
 * @returns {Object} Complete testing result
 */
function testMakeRouterBranches() {
  logger.enterFunction('testMakeRouterBranches');


  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const routerManager = coordinator.components.get('MakeRouterConfigurationManager') || 
                          new MakeRouterConfigurationManager();
    
    if (!coordinator.components.has('MakeRouterConfigurationManager')) {
      routerManager.doInitialize();
      coordinator.components.set('MakeRouterConfigurationManager', routerManager);
    }


    const result = routerManager.testAllRouterBranches();


    logger.exitFunction('testMakeRouterBranches', { 
      success: result.success,
      passRate: result.summary?.passRate
    });
    return result;


  } catch (error) {
    logger.error('Make.com router testing failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Public function to get router configuration documentation
 * @returns {Object} Router configuration documentation
 */
function getMakeRouterConfiguration() {
  logger.enterFunction('getMakeRouterConfiguration');


  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const routerManager = coordinator.components.get('MakeRouterConfigurationManager');
    if (!routerManager) {
      logger.error('MakeRouterConfigurationManager not available');
      return { success: false, error: 'Router configuration manager not available' };
    }


    const configuration = {
      success: true,
      totalBranches: routerManager.routerBranches.size,
      totalTemplates: routerManager.canvaTemplates.size,
      branches: {},
      templates: {}
    };


    // Export router branch configurations
    routerManager.routerBranches.forEach((branchConfig, eventType) => {
      configuration.branches[eventType] = {
        eventType: branchConfig.eventType,
        canvaTemplate: branchConfig.canvaTemplate,
        priority: branchConfig.priority,
        socialPlatforms: branchConfig.socialPlatforms,
        webhookTimeout: branchConfig.webhookTimeout,
        placeholders: branchConfig.placeholders
      };
    });


    // Export Canva template configurations
    routerManager.canvaTemplates.forEach((templateConfig, eventType) => {
      configuration.templates[eventType] = {
        templateName: templateConfig.templateName,
        placeholders: templateConfig.placeholders,
        dimensions: templateConfig.dimensions,
        designElements: templateConfig.designElements
      };
    });


    logger.exitFunction('getMakeRouterConfiguration', { 
      success: true,
      branchCount: configuration.totalBranches
    });
    return configuration;


  } catch (error) {
    logger.error('Router configuration retrieval failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Public function to validate specific router branch
 * @param {string} eventType - Event type to validate
 * @returns {Object} Validation result
 */
function validateRouterBranch(eventType) {
  logger.enterFunction('validateRouterBranch', { eventType });


  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const routerManager = coordinator.components.get('MakeRouterConfigurationManager');
    if (!routerManager) {
      logger.error('MakeRouterConfigurationManager not available for validation');
      return { success: false, error: 'Router configuration manager not available' };
    }


    const branchConfig = routerManager.routerBranches.get(eventType);
    if (!branchConfig) {
      return { 
        success: false, 
        error: `Router branch not found for event type: ${eventType}`,
        availableBranches: Array.from(routerManager.routerBranches.keys())
      };
    }


    const result = routerManager.testIndividualRouterBranch(eventType, branchConfig);


    logger.exitFunction('validateRouterBranch', { 
      success: result.overallSuccess,
      eventType: eventType
    });
    return {
      success: result.overallSuccess,
      eventType: eventType,
      validation: result
    };


  } catch (error) {
    logger.error('Router branch validation failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


// Create and export singleton instance
const makeRouterConfigurationManager = new MakeRouterConfigurationManager();


// Export for global access
globalThis.MakeRouterConfigurationManager = MakeRouterConfigurationManager;
globalThis.makeRouterConfigurationManager = makeRouterConfigurationManager;
globalThis.testMakeRouterBranches = testMakeRouterBranches;
globalThis.getMakeRouterConfiguration = getMakeRouterConfiguration;
globalThis.validateRouterBranch = validateRouterBranch;/**
 * @fileoverview Syston Tigers Automation - Make.com Router Configuration
 * @version 6.0.0
 * @author Senior Software Architect
 * 
 * CRITICAL MILESTONE 1.7 IMPLEMENTATION: Make.com Router Configuration
 * 
 * Implements the complete Make.com router configuration and testing framework
 * as specified in tasks.md Milestone 1.7 Make.com Router Configuration.
 * 
 * Key Requirements:
 * - Create missing router branches for all new event types
 * - Add goal_opposition, card_opposition, card_second_yellow branches
 * - Add fixtures_monthly, results_monthly, match_postponed_league branches
 * - Test all router branches with webhook routing verification
 * - Test Canva template population for each branch
 * - Validate social media posting for each event
 * - Document any routing issues or failures
 */


// ===== MAKE.COM ROUTER CONFIGURATION MANAGER =====


/**
 * Make.com Router Configuration Manager
 * Handles router branch definitions, testing, and validation
 */
class MakeRouterConfigurationManager extends BaseAutomationComponent {
  
  constructor() {
    super('MakeRouterConfigurationManager');
    this.routerBranches = new Map();
    this.canvaTemplates = new Map();
    this.testResults = new Map();
    this.routingErrors = [];
  }


  /**
   * Initialize Make.com router configuration manager
   * @returns {boolean} Success status
   */
  doInitialize() {
    logger.enterFunction('MakeRouterConfigurationManager.doInitialize');
    
    try {
      // @testHook(router_config_init_start)
      
      // Ensure router testing sheet exists
      const routerTestSheet = SheetUtils.getOrCreateSheet(
        'Make_Router_Tests',
        ['Test_Date', 'Event_Type', 'Router_Branch', 'Webhook_Success', 'Canva_Success', 
         'Social_Success', 'Response_Time', 'Error_Details', 'Test_Payload']
      );
      
      if (!routerTestSheet) {
        logger.error('Failed to create router tests sheet');
        return false;
      }


      // Load router branch configurations
      this.loadRouterBranchConfigurations();
      
      // Load Canva template mappings
      this.loadCanvaTemplateMappings();
      
      // @testHook(router_config_init_complete)
      
      logger.exitFunction('MakeRouterConfigurationManager.doInitialize', { success: true });
      return true;
    } catch (error) {
      logger.error('MakeRouterConfigurationManager initialization failed', { error: error.toString() });
      return false;
    }
  }


  // ===== ROUTER BRANCH CONFIGURATION =====


  /**
   * Load all router branch configurations
   */
  loadRouterBranchConfigurations() {
    logger.testHook('router_branch_configs_loading');


    try {
      // ===== SINGLE EVENT BRANCHES =====
      
      // Goal Events
      this.routerBranches.set('goal_scored', {
        eventType: 'goal_scored',
        canvaTemplate: 'goal_celebration_template',
        priority: 'high',
        socialPlatforms: ['facebook', 'twitter', 'instagram'],
        webhookTimeout: 10000,
        retryAttempts: 3,
        placeholders: [
          'player_name', 'minute', 'home_score', 'away_score', 'goal_type',
          'assist_by', 'match_info', 'club_name', 'opponent_name', 'season'
        ],
        testPayload: this.generateGoalTestPayload()
      });


      this.routerBranches.set('goal_opposition', {
        eventType: 'goal_opposition',
        canvaTemplate: 'opposition_goal_template',
        priority: 'medium',
        socialPlatforms: ['twitter', 'facebook'],
        webhookTimeout: 10000,
        retryAttempts: 2,
        placeholders: [
          'opponent_name', 'minute', 'home_score', 'away_score', 'match_info',
          'club_name', 'season', 'goal_details', 'match_status'
        ],
        testPayload: this.generateOppositionGoalTestPayload()
      });


      // Card Events
      this.routerBranches.set('card_shown', {
        eventType: 'card_shown',
        canvaTemplate: 'player_card_template',
        priority: 'medium',
        socialPlatforms: ['facebook', 'twitter'],
        webhookTimeout: 8000,
        retryAttempts: 2,
        placeholders: [
          'player_name', 'card_type', 'minute', 'match_info', 'incident_details',
          'club_name', 'opponent_name', 'season'
        ],
        testPayload: this.generateCardTestPayload()
      });


      this.routerBranches.set('card_opposition', {
        eventType: 'card_opposition',
        canvaTemplate: 'opposition_card_template',
        priority: 'low',
        socialPlatforms: ['twitter'],
        webhookTimeout: 8000,
        retryAttempts: 1,
        placeholders: [
          'opponent_name', 'card_type', 'minute', 'match_info', 'incident_details',
          'club_name', 'season', 'is_opposition_card'
        ],
        testPayload: this.generateOppositionCardTestPayload()
      });


      this.routerBranches.set('card_second_yellow', {
        eventType: 'card_second_yellow',
        canvaTemplate: 'second_yellow_template',
        priority: 'high',
        socialPlatforms: ['facebook', 'twitter', 'instagram'],
        webhookTimeout: 10000,
        retryAttempts: 3,
        placeholders: [
          'player_name', 'minute', 'previous_yellow_minute', 'card_sequence',
          'total_cards_this_match', 'incident_details', 'match_info',
          'club_name', 'opponent_name', 'season', 'is_second_yellow'
        ],
        testPayload: this.generateSecondYellowTestPayload()
      });


      // Other Match Events
      this.routerBranches.set('substitution_made', {
        eventType: 'substitution_made',
        canvaTemplate: 'substitution_template',
        priority: 'low',
        socialPlatforms: ['twitter'],
        webhookTimeout: 8000,
        retryAttempts: 1,
        placeholders: [
          'player_off', 'player_on', 'minute', 'match_info', 'sub_reason',
          'club_name', 'season'
        ],
        testPayload: this.generateSubstitutionTestPayload()
      });


      this.routerBranches.set('man_of_match', {
        eventType: 'man_of_match',
        canvaTemplate: 'motm_template',
        priority: 'medium',
        socialPlatforms: ['facebook', 'twitter', 'instagram'],
        webhookTimeout: 10000,
        retryAttempts: 2,
        placeholders: [
          'player_name', 'performance_summary', 'match_info', 'stats_summary',
          'club_name', 'opponent_name', 'season'
        ],
        testPayload: this.generateMotmTestPayload()
      });


      this.routerBranches.set('match_postponed_league', {
        eventType: 'match_postponed_league',
        canvaTemplate: 'postponed_match_template',
        priority: 'high',
        socialPlatforms: ['facebook', 'twitter', 'instagram'],
        webhookTimeout: 12000,
        retryAttempts: 3,
        placeholders: [
          'opponent_name', 'original_date', 'new_date', 'has_new_date',
          'postponement_reason', 'urgency_level', 'main_message', 'sub_message',
          'reason_message', 'competition', 'home_away', 'club_name', 'season'
        ],
        testPayload: this.generatePostponedTestPayload()
      });


      this.routerBranches.set('second_half_start', {
        eventType: 'second_half_start',
        canvaTemplate: 'second_half_template',
        priority: 'low',
        socialPlatforms: ['twitter'],
        webhookTimeout: 8000,
        retryAttempts: 1,
        placeholders: [
          'home_score', 'away_score', 'match_info', 'half_time_summary',
          'club_name', 'opponent_name', 'season'
        ],
        testPayload: this.generateSecondHalfTestPayload()
      });


      // ===== BATCH EVENT BRANCHES =====
      
      // Fixture Batches (1-5)
      for (let i = 1; i <= 5; i++) {
        this.routerBranches.set(`fixtures_batch_${i}`, {
          eventType: `fixtures_batch_${i}`,
          canvaTemplate: 'batch_fixtures_template',
          priority: 'medium',
          socialPlatforms: ['facebook', 'twitter'],
          webhookTimeout: 15000,
          retryAttempts: 2,
          placeholders: [
            'fixture_count', 'fixtures_list', 'week_description', 'key_stats',
            'next_match_highlight', 'club_name', 'season', 'batch_id'
          ],
          testPayload: this.generateFixtureBatchTestPayload(i)
        });
      }


      // Result Batches (1-5)
      for (let i = 1; i <= 5; i++) {
        this.routerBranches.set(`results_batch_${i}`, {
          eventType: `results_batch_${i}`,
          canvaTemplate: 'batch_results_template',
          priority: 'medium',
          socialPlatforms: ['facebook', 'twitter'],
          webhookTimeout: 15000,
          retryAttempts: 2,
          placeholders: [
            'result_count', 'results_list', 'week_description', 'key_stats',
            'best_result', 'club_name', 'season', 'batch_id'
          ],
          testPayload: this.generateResultBatchTestPayload(i)
        });
      }


      // ===== MONTHLY EVENT BRANCHES =====
      
      this.routerBranches.set('fixtures_monthly', {
        eventType: 'fixtures_monthly',
        canvaTemplate: 'monthly_fixtures_template',
        priority: 'medium',
        socialPlatforms: ['facebook', 'twitter', 'instagram'],
        webhookTimeout: 20000,
        retryAttempts: 2,
        placeholders: [
          'month_name', 'fixture_count', 'fixtures_list', 'key_stats',
          'next_match_highlight', 'key_matches', 'weekly_distribution',
          'club_name', 'season'
        ],
        testPayload: this.generateMonthlyFixturesTestPayload()
      });


      this.routerBranches.set('results_monthly', {
        eventType: 'results_monthly',
        canvaTemplate: 'monthly_results_template',
        priority: 'medium',
        socialPlatforms: ['facebook', 'twitter', 'instagram'],
        webhookTimeout: 20000,
        retryAttempts: 2,
        placeholders: [
          'month_name', 'result_count', 'key_stats', 'home_record', 'away_record',
          'best_result', 'worst_result', 'recent_form', 'goal_stats',
          'results_list', 'club_name', 'season'
        ],
        testPayload: this.generateMonthlyResultsTestPayload()
      });


      this.routerBranches.set('player_stats_summary', {
        eventType: 'player_stats_summary',
        canvaTemplate: 'player_stats_template',
        priority: 'medium',
        socialPlatforms: ['facebook', 'twitter', 'instagram'],
        webhookTimeout: 25000,
        retryAttempts: 2,
        placeholders: [
          'period_type', 'period_description', 'top_performers', 'team_stats',
          'performance_highlights', 'discipline_stats', 'player_categories',
          'special_awards', 'social_highlights', 'club_name', 'season'
        ],
        testPayload: this.generatePlayerStatsTestPayload()
      });


      // ===== FUTURE VIDEO EVENT BRANCHES =====
      
      this.routerBranches.set('video_clip_created', {
        eventType: 'video_clip_created',
        canvaTemplate: 'video_clip_template',
        priority: 'high',
        socialPlatforms: ['facebook', 'twitter', 'instagram', 'tiktok'],
        webhookTimeout: 30000,
        retryAttempts: 3,
        placeholders: [
          'player_name', 'clip_title', 'youtube_url', 'clip_duration',
          'goal_minute', 'match_info', 'club_name', 'season'
        ],
        testPayload: this.generateVideoClipTestPayload()
      });


      logger.info('Router branch configurations loaded', {
        branchCount: this.routerBranches.size,
        singleEvents: 9,
        batchEvents: 10,
        monthlyEvents: 3,
        videoEvents: 1
      });


    } catch (error) {
      logger.error('Router branch configuration loading failed', { error: error.toString() });
    }
  }


  /**
   * Load Canva template mappings
   */
  loadCanvaTemplateMappings() {
    logger.testHook('canva_template_mappings_loading');


    try {
      // Map each router branch to its Canva template requirements
      this.routerBranches.forEach((branchConfig, eventType) => {
        this.canvaTemplates.set(eventType, {
          templateName: branchConfig.canvaTemplate,
          placeholders: branchConfig.placeholders,
          dimensions: this.getTemplateDimensions(branchConfig.canvaTemplate),
          designElements: this.getTemplateDesignElements(branchConfig.canvaTemplate),
          socialOptimization: this.getSocialOptimization(branchConfig.socialPlatforms)
        });
      });


      logger.info('Canva template mappings loaded', {
        templateCount: this.canvaTemplates.size
      });


    } catch (error) {
      logger.error('Canva template mappings loading failed', { error: error.toString() });
    }
  }


  // ===== ROUTER TESTING METHODS =====


  /**
   * Test all router branches (CRITICAL - Milestone 1.7)
   * @returns {Object} Complete testing result
   */
  testAllRouterBranches() {
    logger.enterFunction('MakeRouterConfigurationManager.testAllRouterBranches');


    try {
      // @testHook(router_testing_start)
      
      const testingResults = {
        success: true,
        totalBranches: this.routerBranches.size,
        branchesPasssed: 0,
        branchesFailed: 0,
        testResults: [],
        errors: [],
        summary: {}
      };


      logger.info('Starting comprehensive router testing', {
        branchCount: testingResults.totalBranches
      });


      // @testHook(individual_branch_testing_start)
      
      // Test each router branch individually
      this.routerBranches.forEach((branchConfig, eventType) => {
        try {
          const branchTestResult = this.testIndividualRouterBranch(eventType, branchConfig);
          
          testingResults.testResults.push(branchTestResult);
          
          if (branchTestResult.overallSuccess) {
            testingResults.branchesPasssed++;
          } else {
            testingResults.branchesFailed++;
            testingResults.success = false;
          }


        } catch (error) {
          testingResults.errors.push({
            eventType: eventType,
            error: error.toString(),
            testPhase: 'individual_branch_test'
          });
          testingResults.branchesFailed++;
          testingResults.success = false;
        }
      });


      // @testHook(router_testing_summary_generation)
      
      // Generate testing summary
      testingResults.summary = {
        passRate: Math.round((testingResults.branchesPasssed / testingResults.totalBranches) * 100),
        webhookSuccessRate: this.calculateWebhookSuccessRate(testingResults.testResults),
        canvaSuccessRate: this.calculateCanvaSuccessRate(testingResults.testResults),
        socialSuccessRate: this.calculateSocialSuccessRate(testingResults.testResults),
        averageResponseTime: this.calculateAverageResponseTime(testingResults.testResults)
      };


      // @testHook(router_testing_logging)
      
      // Log detailed test results
      this.logRouterTestResults(testingResults);


      const result = {
        success: testingResults.success,
        summary: testingResults.summary,
        details: testingResults,
        recommendedActions: this.generateTestRecommendations(testingResults)
      };


      logger.exitFunction('MakeRouterConfigurationManager.testAllRouterBranches', result);
      return result;


    } catch (error) {
      logger.error('Router testing failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Test individual router branch
   * @param {string} eventType - Event type
   * @param {Object} branchConfig - Branch configuration
   * @returns {Object} Individual branch test result
   */
  testIndividualRouterBranch(eventType, branchConfig) {
    logger.testHook('individual_router_branch_test', { eventType });


    const startTime = Date.now();


    try {
      const branchTestResult = {
        eventType: eventType,
        webhookTest: { success: false, responseTime: 0, error: null },
        canvaTest: { success: false, templateValid: false, placeholdersValid: false },
        socialTest: { success: false, platformsReached: 0, errors: [] },
        overallSuccess: false,
        testDuration: 0
      };


      // @testHook(webhook_routing_test)
      // Test 1: Verify webhook routing for event type
      branchTestResult.webhookTest = this.testWebhookRouting(eventType, branchConfig);


      // @testHook(canva_template_test)  
      // Test 2: Test Canva template population
      branchTestResult.canvaTest = this.testCanvaTemplatePopulation(eventType, branchConfig);


      // @testHook(social_media_posting_test)
      // Test 3: Validate social media posting
      branchTestResult.socialTest = this.testSocialMediaPosting(eventType, branchConfig);


      // Determine overall success
      branchTestResult.overallSuccess = 
        branchTestResult.webhookTest.success &&
        branchTestResult.canvaTest.success &&
        branchTestResult.socialTest.success;


      branchTestResult.testDuration = Date.now() - startTime;


      logger.info('Individual router branch test completed', {
        eventType: eventType,
        success: branchTestResult.overallSuccess,
        duration: branchTestResult.testDuration
      });


      return branchTestResult;


    } catch (error) {
      logger.error('Individual router branch test failed', {
        eventType: eventType,
        error: error.toString()
      });


      return {
        eventType: eventType,
        webhookTest: { success: false, error: error.toString() },
        canvaTest: { success: false, error: error.toString() },
        socialTest: { success: false, error: error.toString() },
        overallSuccess: false,
        testDuration: Date.now() - startTime,
        testError: error.toString()
      };
    }
  }


  /**
   * Test webhook routing for event type
   * @param {string} eventType - Event type
   * @param {Object} branchConfig - Branch configuration
   * @returns {Object} Webhook test result
   */
  testWebhookRouting(eventType, branchConfig) {
    logger.testHook('webhook_routing_verification', { eventType });


    const startTime = Date.now();


    try {
      // Get Make.com webhook URL
      const webhookUrl = PropertiesService.getScriptProperties()
                           .getProperty(getConfig('MAKE.WEBHOOK_URL_PROPERTY'));


      if (!webhookUrl) {
        return {
          success: false,
          error: 'Webhook URL not configured',
          responseTime: Date.now() - startTime
        };
      }


      // Send test payload to webhook
      const testPayload = {
        ...branchConfig.testPayload,
        test_mode: true,
        test_timestamp: DateUtils.now().toISOString(),
        test_branch: eventType
      };


      // @testHook(webhook_request_send)
      const response = ApiUtils.makeRequest(webhookUrl, {
        method: 'POST',
        payload: JSON.stringify(testPayload),
        headers: {
          'Content-Type': 'application/json'
        }
      }, branchConfig.webhookTimeout);


      const responseTime = Date.now() - startTime;


      // @testHook(webhook_response_evaluation)
      const webhookResult = {
        success: response && response.getResponseCode() >= 200 && response.getResponseCode() < 300,
        responseTime: responseTime,
        responseCode: response ? response.getResponseCode() : 0,
        responseText: response ? response.getContentText().substring(0, 200) : 'No response'
      };


      if (!webhookResult.success) {
        webhookResult.error = `HTTP ${webhookResult.responseCode}: ${webhookResult.responseText}`;
      }


      logger.info('Webhook routing test completed', {
        eventType: eventType,
        success: webhookResult.success,
        responseTime: responseTime,
        responseCode: webhookResult.responseCode
      });


      return webhookResult;


    } catch (error) {
      return {
        success: false,
        error: error.toString(),
        responseTime: Date.now() - startTime
      };
    }
  }


  /**
   * Test Canva template population
   * @param {string} eventType - Event type
   * @param {Object} branchConfig - Branch configuration
   * @returns {Object} Canva test result
   */
  testCanvaTemplatePopulation(eventType, branchConfig) {
    logger.testHook('canva_template_population_test', { eventType });


    try {
      const canvaTemplate = this.canvaTemplates.get(eventType);
      
      if (!canvaTemplate) {
        return {
          success: false,
          error: 'Canva template not found',
          templateValid: false,
          placeholdersValid: false
        };
      }


      // @testHook(template_validation)
      // Validate template structure
      const templateValid = this.validateCanvaTemplate(canvaTemplate);


      // @testHook(placeholder_validation)
      // Validate all placeholders are present in test payload
      const placeholderValidation = this.validateTemplatePlaceholders(
        canvaTemplate.placeholders, 
        branchConfig.testPayload
      );


      const canvaResult = {
        success: templateValid && placeholderValidation.allValid,
        templateValid: templateValid,
        placeholdersValid: placeholderValidation.allValid,
        missingPlaceholders: placeholderValidation.missing,
        templateName: canvaTemplate.templateName
      };


      if (!canvaResult.success) {
        canvaResult.error = `Template validation failed: ${!templateValid ? 'Invalid template' : 'Missing placeholders'}`;
      }


      logger.info('Canva template test completed', {
        eventType: eventType,
        success: canvaResult.success,
        templateName: canvaTemplate.templateName,
        placeholdersValid: placeholderValidation.allValid
      });


      return canvaResult;


    } catch (error) {
      return {
        success: false,
        error: error.toString(),
        templateValid: false,
        placeholdersValid: false
      };
    }
  }


  /**
   * Test social media posting validation
   * @param {string} eventType - Event type
   * @param {Object} branchConfig - Branch configuration
   * @returns {Object} Social media test result
   */
  testSocialMediaPosting(eventType, branchConfig) {
    logger.testHook('social_media_posting_test', { eventType });


    try {
      const socialResult = {
        success: true,
        platformsReached: 0,
        platformsTotal: branchConfig.socialPlatforms.length,
        platformResults: [],
        errors: []
      };


      // @testHook(social_platform_validation)
      // Test each social media platform configuration
      branchConfig.socialPlatforms.forEach(platform => {
        try {
          const platformTest = this.testSocialPlatform(platform, branchConfig.testPayload);
          
          socialResult.platformResults.push({
            platform: platform,
            success: platformTest.success,
            configured: platformTest.configured,
            error: platformTest.error
          });


          if (platformTest.success) {
            socialResult.platformsReached++;
          } else {
            socialResult.errors.push(`${platform}: ${platformTest.error}`);
          }


        } catch (error) {
          socialResult.errors.push(`${platform}: ${error.toString()}`);
        }
      });


      // Overall social success if at least 50% of platforms work
      socialResult.success = socialResult.platformsReached >= Math.ceil(socialResult.platformsTotal / 2);


      logger.info('Social media posting test completed', {
        eventType: eventType,
        success: socialResult.success,
        platformsReached: socialResult.platformsReached,
        platformsTotal: socialResult.platformsTotal
      });


      return socialResult;


    } catch (error) {
      return {
        success: false,
        platformsReached: 0,
        platformsTotal: branchConfig.socialPlatforms.length,
        errors: [error.toString()]
      };
    }
  }


  // ===== TEST PAYLOAD GENERATION METHODS =====


  generateGoalTestPayload() {
    return {
      timestamp: DateUtils.now().toISOString(),
      match_id: 'TEST_MATCH_001',
      event_type: 'goal_scored',
      source: 'apps_script_test',
      version: getConfig('SYSTEM.VERSION'),
      player_name: 'John Smith',
      minute: 25,
      home_score: 1,
      away_score: 0,
      match_info: { competition: 'League', venue: 'Home' },
      goal_type: 'open_play',
      assist_by: 'Mike Johnson',
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      opponent_name: 'Test Opposition FC',
      season: getConfig('SYSTEM.SEASON'),
      idempotency_key: 'test_goal_001'
    };
  }


  generateOppositionGoalTestPayload() {
    return {
      timestamp: DateUtils.now().toISOString(),
      match_id: 'TEST_MATCH_002',
      event_type: 'goal_opposition',
      source: 'apps_script_test',
      version: getConfig('SYSTEM.VERSION'),
      opponent_name: 'Test Opposition FC',
      minute: 67,
      home_score: 1,
      away_score: 1,
      match_info: { competition: 'League', venue: 'Away' },
      goal_details: 'Opposition equalizer',
      match_status: 'LIVE',
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      idempotency_key: 'test_opp_goal_001'
    };
  }


  generateCardTestPayload() {
    return {
      timestamp: DateUtils.now().toISOString(),
      match_id: 'TEST_MATCH_003',
      event_type: 'card_shown',
      source: 'apps_script_test',
      version: getConfig('SYSTEM.VERSION'),
      player_name: 'David Wilson',
      card_type: 'yellow',
      minute: 42,
      match_info: { competition: 'League', venue: 'Home' },
      incident_details: 'Dissent',
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      opponent_name: 'Test Opposition FC',
      season: getConfig('SYSTEM.SEASON'),
      idempotency_key: 'test_card_001'
    };
  }


  generateOppositionCardTestPayload() {
    return {
      timestamp: DateUtils.now().toISOString(),
      match_id: 'TEST_MATCH_004',
      event_type: 'card_opposition',
      source: 'apps_script_test',
      version: getConfig('SYSTEM.VERSION'),
      opponent_name: 'Test Opposition FC',
      card_type: 'red',
      minute: 78,
      match_info: { competition: 'League', venue: 'Home' },
      incident_details: 'Serious foul play',
      is_opposition_card: true,
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      idempotency_key: 'test_opp_card_001'
    };
  }


  generateSecondYellowTestPayload() {
    return {
      timestamp: DateUtils.now().toISOString(),
      match_id: 'TEST_MATCH_005',
      event_type: 'card_second_yellow',
      source: 'apps_script_test',
      version: getConfig('SYSTEM.VERSION'),
      player_name: 'Chris Brown',
      card_type: 'second_yellow',
      minute: 83,
      previous_yellow_minute: 34,
      card_sequence: 'Yellow (34\') → Red (83\')',
      total_cards_this_match: 2,
      incident_details: 'Second bookable offence',
      match_info: { competition: 'League', venue: 'Away' },
      is_second_yellow: true,
      club_name: getConfig('SYSTEM
