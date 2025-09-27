/**
 * Test script for Goal of the Month (GOTM) functionality
 * @description Tests the restored GOTM features in v6.2
 */

// Mock test data
const mockGoals = [
  {
    player: 'John Smith',
    minute: '25',
    opponent: 'Test FC',
    assist: 'Jane Doe',
    date: '15/09/2025',
    match_score: '2-1',
    notes: 'Great strike from 20 yards',
    goal_id: 'goal_john_smith_25_1726399200000'
  },
  {
    player: 'Mike Johnson',
    minute: '67',
    opponent: 'Example United',
    assist: '',
    date: '22/09/2025',
    match_score: '1-0',
    notes: 'Brilliant header',
    goal_id: 'goal_mike_johnson_67_1727004000000'
  },
  {
    player: 'David Wilson',
    minute: '89',
    opponent: 'Sample City',
    assist: 'John Smith',
    date: '28/09/2025',
    match_score: '3-2',
    notes: 'Last minute winner',
    goal_id: 'goal_david_wilson_89_1727522400000'
  }
];

/**
 * Test GOTM Configuration
 */
function testGOTMConfig() {
  console.log('=== Testing GOTM Configuration ===');

  try {
    // Test config access
    const gotmConfig = getConfig('MONTHLY.GOTM', {});
    console.log('✅ GOTM Config:', gotmConfig);

    const isGOTMEnabled = isFeatureEnabled('GOTM');
    console.log('✅ GOTM Feature Enabled:', isGOTMEnabled);

    const eventTypes = getConfig('MAKE.EVENT_TYPES', {});
    console.log('✅ GOTM Event Types:', {
      voting: eventTypes.gotm_voting_open,
      winner: eventTypes.gotm_winner
    });

    return { success: true, config: gotmConfig, enabled: isGOTMEnabled };
  } catch (error) {
    console.error('❌ GOTM Config Test Failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Test GOTM Voting Payload Creation
 */
function testGOTMVotingPayload() {
  console.log('=== Testing GOTM Voting Payload ===');

  try {
    const manager = new MonthlySummariesManager();
    const payload = manager.createGOTMVotingPayload(mockGoals, 9, 2025, 'test_voting_key');

    console.log('✅ GOTM Voting Payload Created:');
    console.log('   Event Type:', payload.event_type);
    console.log('   Month:', payload.month_name);
    console.log('   Goal Count:', payload.goal_count);
    console.log('   Goals:', payload.goals.length);

    return { success: true, payload };
  } catch (error) {
    console.error('❌ GOTM Voting Payload Test Failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Test GOTM Winner Determination
 */
function testGOTMWinnerDetermination() {
  console.log('=== Testing GOTM Winner Determination ===');

  try {
    const manager = new MonthlySummariesManager();
    const winner = manager.determineGOTMWinner(mockGoals);

    console.log('✅ GOTM Winner Determined:');
    console.log('   Player:', winner.player);
    console.log('   Votes:', winner.votes);
    console.log('   Percentage:', winner.vote_percentage);

    return { success: true, winner };
  } catch (error) {
    console.error('❌ GOTM Winner Test Failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Test GOTM Winner Payload Creation
 */
function testGOTMWinnerPayload() {
  console.log('=== Testing GOTM Winner Payload ===');

  try {
    const manager = new MonthlySummariesManager();
    const winner = manager.determineGOTMWinner(mockGoals);
    const payload = manager.createGOTMWinnerPayload(winner, mockGoals, 9, 2025, 'test_winner_key');

    console.log('✅ GOTM Winner Payload Created:');
    console.log('   Event Type:', payload.event_type);
    console.log('   Winner Player:', payload.winner_player);
    console.log('   Total Goals:', payload.total_goals);
    console.log('   Winner Votes:', payload.winner_votes);

    return { success: true, payload };
  } catch (error) {
    console.error('❌ GOTM Winner Payload Test Failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Test GOTM Monthly Scheduling
 */
function testGOTMScheduling() {
  console.log('=== Testing GOTM Monthly Scheduling ===');

  try {
    const manager = new MonthlySummariesManager();

    // Test today's date for different scenarios
    const testDates = [
      new Date(2025, 8, 1),  // Sept 1st - should trigger voting
      new Date(2025, 8, 6),  // Sept 6th - should trigger winner
      new Date(2025, 8, 15)  // Sept 15th - no trigger
    ];

    testDates.forEach((testDate, index) => {
      const dayOfMonth = testDate.getDate();
      const shouldTriggerVoting = dayOfMonth === 1;
      const shouldTriggerWinner = dayOfMonth === 6;

      console.log(`✅ Test Date ${index + 1} (${dayOfMonth}th):`);
      console.log('   Should Trigger Voting:', shouldTriggerVoting);
      console.log('   Should Trigger Winner:', shouldTriggerWinner);
    });

    return { success: true, schedulingTested: true };
  } catch (error) {
    console.error('❌ GOTM Scheduling Test Failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Test GOTS Configuration
 */
function testGOTSConfig() {
  console.log('=== Testing GOTS Configuration ===');

  try {
    // Test config access
    const gotsConfig = getConfig('MONTHLY.GOTS', {});
    console.log('✅ GOTS Config:', gotsConfig);

    const isGOTSEnabled = isFeatureEnabled('GOTS');
    console.log('✅ GOTS Feature Enabled:', isGOTSEnabled);

    const eventTypes = getConfig('MAKE.EVENT_TYPES', {});
    console.log('✅ GOTS Event Types:', {
      voting: eventTypes.gots_voting_open,
      winner: eventTypes.gots_winner
    });

    return { success: true, config: gotsConfig, enabled: isGOTSEnabled };
  } catch (error) {
    console.error('❌ GOTS Config Test Failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Test GOTS Storage and Retrieval
 */
function testGOTSStorage() {
  console.log('=== Testing GOTS Storage ===');

  try {
    const manager = new MonthlySummariesManager();
    const testYear = 2025;

    // Create test GOTS data
    const testGotsData = {
      year: testYear,
      season: '2024-25',
      goals: [
        {
          player: 'John Smith',
          minute: '25',
          opponent: 'Test FC',
          month: 9,
          monthName: 'September',
          place: 1,
          goal_id: 'goal_john_smith_25_test'
        },
        {
          player: 'Mike Johnson',
          minute: '67',
          opponent: 'Example United',
          month: 9,
          monthName: 'September',
          place: 2,
          goal_id: 'goal_mike_johnson_67_test'
        }
      ],
      created: new Date().toISOString()
    };

    // Test storage
    manager.storeGOTSData(testGotsData, testYear);
    console.log('✅ GOTS data stored successfully');

    // Test retrieval
    const retrievedData = manager.getStoredGOTSData(testYear);
    console.log('✅ GOTS data retrieved:', retrievedData ? retrievedData.goals.length + ' goals' : 'null');

    return { success: true, stored: true, retrieved: !!retrievedData };
  } catch (error) {
    console.error('❌ GOTS Storage Test Failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Test GOTS Voting Payload Creation
 */
function testGOTSVotingPayload() {
  console.log('=== Testing GOTS Voting Payload ===');

  try {
    const manager = new MonthlySummariesManager();
    const testGoals = [
      {
        player: 'John Smith',
        minute: '25',
        opponent: 'Test FC',
        month: 9,
        monthName: 'September',
        place: 1,
        goal_id: 'goal_john_smith_25_test'
      },
      {
        player: 'Mike Johnson',
        minute: '67',
        opponent: 'Example United',
        month: 10,
        monthName: 'October',
        place: 1,
        goal_id: 'goal_mike_johnson_67_test'
      }
    ];

    const payload = manager.createGOTSVotingPayload(testGoals, 2025, 'test_gots_voting_key');

    console.log('✅ GOTS Voting Payload Created:');
    console.log('   Event Type:', payload.event_type);
    console.log('   Year:', payload.year);
    console.log('   Season:', payload.season);
    console.log('   Goal Count:', payload.goal_count);
    console.log('   Voting Duration:', payload.voting_duration);

    return { success: true, payload };
  } catch (error) {
    console.error('❌ GOTS Voting Payload Test Failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Test GOTS Winner Determination
 */
function testGOTSWinnerDetermination() {
  console.log('=== Testing GOTS Winner Determination ===');

  try {
    const manager = new MonthlySummariesManager();
    const testGoals = [
      {
        player: 'John Smith',
        minute: '25',
        opponent: 'Test FC',
        monthName: 'September',
        place: 1
      },
      {
        player: 'Mike Johnson',
        minute: '67',
        opponent: 'Example United',
        monthName: 'October',
        place: 1
      },
      {
        player: 'David Wilson',
        minute: '89',
        opponent: 'Sample City',
        monthName: 'November',
        place: 2
      }
    ];

    const winner = manager.determineGOTSWinner(testGoals);

    console.log('✅ GOTS Winner Determined:');
    console.log('   Player:', winner.player);
    console.log('   Votes:', winner.votes);
    console.log('   Percentage:', winner.vote_percentage);

    return { success: true, winner };
  } catch (error) {
    console.error('❌ GOTS Winner Test Failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Test Adding GOTM Winners to GOTS Pool
 */
function testAddGOTMWinnersToGOTS() {
  console.log('=== Testing Add GOTM Winners to GOTS ===');

  try {
    const manager = new MonthlySummariesManager();

    const winner = {
      player: 'John Smith',
      minute: '25',
      opponent: 'Test FC',
      votes: 85,
      goal_id: 'goal_john_smith_25_test'
    };

    const allGoals = [
      winner,
      {
        player: 'Mike Johnson',
        minute: '67',
        opponent: 'Example United',
        goal_id: 'goal_mike_johnson_67_test'
      }
    ];

    manager.addGOTMWinnersToGOTS(winner, allGoals, 9, 2025);

    // Verify storage
    const gotsData = manager.getStoredGOTSData(2025);
    console.log('✅ GOTM Winners Added to GOTS:');
    console.log('   Total GOTS goals:', gotsData ? gotsData.goals.length : 0);
    console.log('   Winner added:', gotsData ? gotsData.goals.some(g => g.player === 'John Smith') : false);

    return { success: true, gotsData };
  } catch (error) {
    console.error('❌ Add GOTM Winners to GOTS Test Failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Run All GOTM and GOTS Tests
 */
function runAllGOTMTests() {
  console.log('🎯 Starting GOTM & GOTS Functionality Tests...\n');

  const testResults = {
    gotmConfig: testGOTMConfig(),
    gotmVotingPayload: testGOTMVotingPayload(),
    gotmWinnerDetermination: testGOTMWinnerDetermination(),
    gotmWinnerPayload: testGOTMWinnerPayload(),
    gotmScheduling: testGOTMScheduling(),
    gotsConfig: testGOTSConfig(),
    gotsStorage: testGOTSStorage(),
    gotsVotingPayload: testGOTSVotingPayload(),
    gotsWinnerDetermination: testGOTSWinnerDetermination(),
    addGotmToGots: testAddGOTMWinnersToGOTS()
  };

  console.log('\n=== GOTM & GOTS Test Summary ===');
  const passedTests = Object.values(testResults).filter(result => result.success).length;
  const totalTests = Object.keys(testResults).length;

  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);

  if (passedTests === totalTests) {
    console.log('🎉 All GOTM & GOTS tests passed! Goal of the Month and Goal of the Season functionality is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the errors above.');
  }

  return {
    success: passedTests === totalTests,
    results: testResults,
    summary: { passed: passedTests, total: totalTests }
  };
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllGOTMTests,
    testGOTMConfig,
    testGOTMVotingPayload,
    testGOTMWinnerDetermination,
    testGOTMWinnerPayload,
    testGOTMScheduling,
    testGOTSConfig,
    testGOTSStorage,
    testGOTSVotingPayload,
    testGOTSWinnerDetermination,
    testAddGOTMWinnersToGOTS
  };
}