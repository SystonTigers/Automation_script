/**
 * @fileoverview User Menu Functions for Syston Tigers Football Automation
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Simple user menu functions to add to main.gs
 */

// ==================== USER MENU FUNCTIONS ====================

/**
 * Create custom menu when spreadsheet opens
 */
function onOpen() {
  logger.enterFunction('onOpen');

  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('⚽ Football Automation')
      .addItem('🥅 Record Goal', 'processGoalQuick')
      .addItem('📟 Record Card', 'processCardQuick')
      .addItem('🔄 Record Substitution', 'processSubstitutionQuick')
      .addSeparator()
      .addItem('📅 Post Weekly Fixtures', 'postWeeklyFixtures')
      .addItem('📊 Post Weekly Results', 'postWeeklyResults')
      .addSeparator()
      .addItem('🔧 Test System', 'testSystemQuick')
      .addToUi();

    logger.exitFunction('onOpen', { success: true });

  } catch (error) {
    logger.error('Menu creation failed', { error: error.toString() });
  }
}

/**
 * Quick goal entry with opposition detection
 */
function processGoalQuick() {
  logger.enterFunction('processGoalQuick');

  try {
    const ui = SpreadsheetApp.getUi();

    // Get goal details from user
    const minuteResponse = ui.prompt(
      'Record Goal',
      'Enter the minute the goal was scored:',
      ui.ButtonSet.OK_CANCEL
    );

    if (minuteResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Goal recording cancelled' };
    }

    const minute = minuteResponse.getResponseText().trim();

    // Get player name (or "Goal" for opposition)
    const playerResponse = ui.prompt(
      'Record Goal',
      'Enter player name (or "Goal" for opposition goal):',
      ui.ButtonSet.OK_CANCEL
    );

    if (playerResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Goal recording cancelled' };
    }

    const player = playerResponse.getResponseText().trim();

    // Get assist (optional)
    const assistResponse = ui.prompt(
      'Record Goal',
      'Enter assist player (or leave blank):',
      ui.ButtonSet.OK_CANCEL
    );

    const assist = assistResponse.getSelectedButton() === ui.Button.OK
      ? assistResponse.getResponseText().trim()
      : '';

    // Process the goal using enhanced events
    if (typeof EnhancedEventsManager !== 'undefined') {
      const eventsManager = new EnhancedEventsManager();
      const result = eventsManager.processGoalEvent(minute, player, assist);

      // Show result to user
      if (result.success) {
        const goalType = player.toLowerCase() === 'goal' ? 'opposition' : 'team';
        ui.alert('Goal Recorded', `${goalType.toUpperCase()} goal recorded successfully!`, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', `Failed to record goal: ${result.error}`, ui.ButtonSet.OK);
      }

      logger.exitFunction('processGoalQuick', { success: result.success });
      return result;

    } else {
      const errorMsg = 'Enhanced Events Manager not available';
      ui.alert('Error', errorMsg, ui.ButtonSet.OK);
      logger.exitFunction('processGoalQuick', { success: false });
      return { success: false, error: errorMsg };
    }

  } catch (error) {
    logger.error('Quick goal processing failed', { error: error.toString() });
    logger.exitFunction('processGoalQuick', { success: false });
    return { success: false, error: error.toString() };
  }
}

/**
 * Quick card entry
 */
function processCardQuick() {
  logger.enterFunction('processCardQuick');

  try {
    const ui = SpreadsheetApp.getUi();

    // Get card details from user
    const minuteResponse = ui.prompt(
      'Record Card',
      'Enter the minute the card was shown:',
      ui.ButtonSet.OK_CANCEL
    );

    if (minuteResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Card recording cancelled' };
    }

    const minute = minuteResponse.getResponseText().trim();

    // Get player name (or "Opposition")
    const playerResponse = ui.prompt(
      'Record Card',
      'Enter player name (or "Opposition" for opposition card):',
      ui.ButtonSet.OK_CANCEL
    );

    if (playerResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Card recording cancelled' };
    }

    const player = playerResponse.getResponseText().trim();

    // Get card type
    const cardTypeResponse = ui.prompt(
      'Record Card',
      'Enter card type (yellow, red, sin_bin):',
      ui.ButtonSet.OK_CANCEL
    );

    if (cardTypeResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Card recording cancelled' };
    }

    const cardType = cardTypeResponse.getResponseText().trim();

    // Process the card using enhanced events
    if (typeof EnhancedEventsManager !== 'undefined') {
      const eventsManager = new EnhancedEventsManager();
      const result = eventsManager.processCardEvent(minute, player, cardType);

      // Show result to user
      if (result.success) {
        ui.alert('Card Recorded', `${cardType.toUpperCase()} card recorded successfully!`, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', `Failed to record card: ${result.error}`, ui.ButtonSet.OK);
      }

      logger.exitFunction('processCardQuick', { success: result.success });
      return result;

    } else {
      const errorMsg = 'Enhanced Events Manager not available';
      ui.alert('Error', errorMsg, ui.ButtonSet.OK);
      logger.exitFunction('processCardQuick', { success: false });
      return { success: false, error: errorMsg };
    }

  } catch (error) {
    logger.error('Quick card processing failed', { error: error.toString() });
    logger.exitFunction('processCardQuick', { success: false });
    return { success: false, error: error.toString() };
  }
}

/**
 * Quick substitution entry
 */
function processSubstitutionQuick() {
  logger.enterFunction('processSubstitutionQuick');

  try {
    const ui = SpreadsheetApp.getUi();

    // Get substitution details from user
    const minuteResponse = ui.prompt(
      'Record Substitution',
      'Enter the minute of substitution:',
      ui.ButtonSet.OK_CANCEL
    );

    if (minuteResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Substitution recording cancelled' };
    }

    const minute = minuteResponse.getResponseText().trim();

    // Get player off
    const playerOffResponse = ui.prompt(
      'Record Substitution',
      'Enter player coming OFF:',
      ui.ButtonSet.OK_CANCEL
    );

    if (playerOffResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Substitution recording cancelled' };
    }

    const playerOff = playerOffResponse.getResponseText().trim();

    // Get player on
    const playerOnResponse = ui.prompt(
      'Record Substitution',
      'Enter player coming ON:',
      ui.ButtonSet.OK_CANCEL
    );

    if (playerOnResponse.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Substitution recording cancelled' };
    }

    const playerOn = playerOnResponse.getResponseText().trim();

    // Process the substitution
    if (typeof handleSubstitution !== 'undefined') {
      const subData = {
        matchId: 'Quick Entry',
        playerOff: playerOff,
        playerOn: playerOn,
        minute: parseInt(minute)
      };

      const result = handleSubstitution(subData);

      // Show result to user
      if (result.success) {
        ui.alert('Substitution Recorded', `Substitution recorded successfully!\n${playerOff} ➡️ ${playerOn}`, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', `Failed to record substitution: ${result.error}`, ui.ButtonSet.OK);
      }

      logger.exitFunction('processSubstitutionQuick', { success: result.success });
      return result;

    } else {
      const errorMsg = 'Substitution handler not available';
      ui.alert('Error', errorMsg, ui.ButtonSet.OK);
      logger.exitFunction('processSubstitutionQuick', { success: false });
      return { success: false, error: errorMsg };
    }

  } catch (error) {
    logger.error('Quick substitution processing failed', { error: error.toString() });
    logger.exitFunction('processSubstitutionQuick', { success: false });
    return { success: false, error: error.toString() };
  }
}

/**
 * Post weekly fixtures via batch posting
 */
function postWeeklyFixtures() {
  logger.enterFunction('postWeeklyFixtures');

  try {
    if (typeof BatchFixturesManager !== 'undefined') {
      const batchManager = new BatchFixturesManager();
      const result = batchManager.postLeagueFixturesBatch();

      const ui = SpreadsheetApp.getUi();
      if (result.success) {
        ui.alert('Fixtures Posted', `${result.count} fixtures posted successfully!`, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', `Failed to post fixtures: ${result.error}`, ui.ButtonSet.OK);
      }

      logger.exitFunction('postWeeklyFixtures', { success: result.success });
      return result;

    } else {
      const errorMsg = 'Batch Fixtures Manager not available';
      SpreadsheetApp.getUi().alert('Error', errorMsg, SpreadsheetApp.getUi().ButtonSet.OK);
      logger.exitFunction('postWeeklyFixtures', { success: false });
      return { success: false, error: errorMsg };
    }

  } catch (error) {
    logger.error('Weekly fixtures posting failed', { error: error.toString() });
    logger.exitFunction('postWeeklyFixtures', { success: false });
    return { success: false, error: error.toString() };
  }
}

/**
 * Post weekly results via batch posting
 */
function postWeeklyResults() {
  logger.enterFunction('postWeeklyResults');

  try {
    if (typeof BatchFixturesManager !== 'undefined') {
      const batchManager = new BatchFixturesManager();
      const result = batchManager.postLeagueResultsBatch();

      const ui = SpreadsheetApp.getUi();
      if (result.success) {
        ui.alert('Results Posted', `${result.count} results posted successfully!`, ui.ButtonSet.OK);
      } else {
        ui.alert('Error', `Failed to post results: ${result.error}`, ui.ButtonSet.OK);
      }

      logger.exitFunction('postWeeklyResults', { success: result.success });
      return result;

    } else {
      const errorMsg = 'Batch Fixtures Manager not available';
      SpreadsheetApp.getUi().alert('Error', errorMsg, SpreadsheetApp.getUi().ButtonSet.OK);
      logger.exitFunction('postWeeklyResults', { success: false });
      return { success: false, error: errorMsg };
    }

  } catch (error) {
    logger.error('Weekly results posting failed', { error: error.toString() });
    logger.exitFunction('postWeeklyResults', { success: false });
    return { success: false, error: error.toString() };
  }
}

/**
 * Test system functionality
 */
function testSystemQuick() {
  logger.enterFunction('testSystemQuick');

  try {
    const tests = {
      logger: typeof logger !== 'undefined',
      config: typeof getConfig !== 'undefined',
      sheetUtils: typeof SheetUtils !== 'undefined',
      eventsManager: typeof EnhancedEventsManager !== 'undefined',
      batchManager: typeof BatchFixturesManager !== 'undefined',
      makeIntegration: typeof sendToMake !== 'undefined'
    };

    const passedTests = Object.values(tests).filter(Boolean).length;
    const totalTests = Object.keys(tests).length;

    const ui = SpreadsheetApp.getUi();
    ui.alert(
      'System Test',
      `System Test Results:\n\n${passedTests}/${totalTests} components available\n\nLogger: ${tests.logger ? '✅' : '❌'}\nConfig: ${tests.config ? '✅' : '❌'}\nSheet Utils: ${tests.sheetUtils ? '✅' : '❌'}\nEvents Manager: ${tests.eventsManager ? '✅' : '❌'}\nBatch Manager: ${tests.batchManager ? '✅' : '❌'}\nMake Integration: ${tests.makeIntegration ? '✅' : '❌'}`,
      ui.ButtonSet.OK
    );

    logger.exitFunction('testSystemQuick', { success: true, passedTests, totalTests });
    return { success: true, tests, passedTests, totalTests };

  } catch (error) {
    logger.error('System test failed', { error: error.toString() });
    logger.exitFunction('testSystemQuick', { success: false });
    return { success: false, error: error.toString() };
  }
}