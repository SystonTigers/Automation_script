/**
 * Quick Setup Functions
 * Helps configure script properties and initial setup
 * @version 6.2.0
 */

/**
 * Quick setup function - Run this once to configure your system
 * This will prompt you for the required information
 */
function runQuickSetup() {
  const ui = SpreadsheetApp.getUi();

  try {
    // Welcome message
    const welcome = ui.alert(
      '🏈 Syston Tigers Setup',
      'Welcome to the Syston Tigers Football Automation Setup!\n\n' +
      'This will configure your system with the required settings.\n\n' +
      'Ready to start?',
      ui.ButtonSet.YES_NO
    );

    if (welcome !== ui.Button.YES) {
      ui.alert('Setup cancelled. You can run this again anytime.');
      return;
    }

    // Get Spreadsheet ID
    const spreadsheetResponse = ui.prompt(
      'Step 1: Google Sheets Setup',
      'Please enter your Google Sheets ID:\n\n' +
      '(Find this in your sheet URL: docs.google.com/spreadsheets/d/[ID]/edit)',
      ui.ButtonSet.OK_CANCEL
    );

    if (spreadsheetResponse.getSelectedButton() !== ui.Button.OK) {
      ui.alert('Setup cancelled.');
      return;
    }

    const spreadsheetId = spreadsheetResponse.getResponseText();

    // Validate spreadsheet ID
    if (!spreadsheetId || spreadsheetId.length < 20) {
      ui.alert('Invalid Spreadsheet ID. Please try again.');
      return;
    }

    // Test spreadsheet access
    try {
      const testSheet = SpreadsheetApp.openById(spreadsheetId);
      const sheetName = testSheet.getName();
      ui.alert('✅ Spreadsheet Connected', `Successfully connected to: "${sheetName}"`, ui.ButtonSet.OK);
    } catch (error) {
      ui.alert('❌ Spreadsheet Error', `Cannot access spreadsheet. Please check the ID and permissions.\n\nError: ${error.toString()}`, ui.ButtonSet.OK);
      return;
    }

    // Get Make.com webhook (optional)
    const webhookResponse = ui.prompt(
      'Step 2: Make.com Webhook (Optional)',
      'Enter your Make.com webhook URL (or leave blank to skip):\n\n' +
      'Example: https://hook.integromat.com/abc123...',
      ui.ButtonSet.OK_CANCEL
    );

    let webhookUrl = '';
    if (webhookResponse.getSelectedButton() === ui.Button.OK) {
      webhookUrl = webhookResponse.getResponseText();
    }

    // Save properties
    const properties = PropertiesService.getScriptProperties();
    properties.setProperties({
      'SPREADSHEET_ID': spreadsheetId,
      'MAKE_WEBHOOK_URL': webhookUrl || '',
      'SETUP_COMPLETED': 'true',
      'SETUP_DATE': new Date().toISOString(),
      'CLUB_NAME': 'Syston Tigers'
    });

    // Success message
    ui.alert(
      '🎉 Setup Complete!',
      'Your Syston Tigers automation is now configured!\n\n' +
      '✅ Google Sheets: Connected\n' +
      `${webhookUrl ? '✅' : '⏭️'} Make.com: ${webhookUrl ? 'Connected' : 'Skipped'}\n\n` +
      'Your web app should now work correctly.',
      ui.ButtonSet.OK
    );

    return {
      success: true,
      spreadsheetId: spreadsheetId,
      webhookUrl: webhookUrl,
      message: 'Setup completed successfully'
    };

  } catch (error) {
    ui.alert('Setup Error', `Setup failed: ${error.toString()}`, ui.ButtonSet.OK);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Check current configuration
 */
function checkConfiguration() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const config = {
      spreadsheetId: properties.getProperty('SPREADSHEET_ID'),
      webhookUrl: properties.getProperty('MAKE_WEBHOOK_URL'),
      setupCompleted: properties.getProperty('SETUP_COMPLETED'),
      setupDate: properties.getProperty('SETUP_DATE'),
      clubName: properties.getProperty('CLUB_NAME')
    };

    console.log('Current Configuration:', JSON.stringify(config, null, 2));

    // Test spreadsheet access
    if (config.spreadsheetId) {
      try {
        const sheet = SpreadsheetApp.openById(config.spreadsheetId);
        config.spreadsheetStatus = `✅ Connected to "${sheet.getName()}"`;
      } catch (error) {
        config.spreadsheetStatus = `❌ Error: ${error.toString()}`;
      }
    } else {
      config.spreadsheetStatus = '❌ Not configured';
    }

    return config;

  } catch (error) {
    console.error('Configuration check failed:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Manual property setter (for advanced users)
 */
function setScriptProperty(key, value) {
  try {
    PropertiesService.getScriptProperties().setProperty(key, value);
    console.log(`✅ Set ${key} = ${value}`);
    return { success: true, key: key, value: value };
  } catch (error) {
    console.error(`❌ Failed to set ${key}:`, error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get all script properties
 */
function getAllScriptProperties() {
  try {
    const properties = PropertiesService.getScriptProperties().getProperties();
    console.log('All Script Properties:', JSON.stringify(properties, null, 2));
    return properties;
  } catch (error) {
    console.error('Failed to get properties:', error.toString());
    return { error: error.toString() };
  }
}

/**
 * Clear all script properties (reset)
 */
function clearAllScriptProperties() {
  try {
    PropertiesService.getScriptProperties().deleteAll();
    console.log('✅ All script properties cleared');
    return { success: true, message: 'All properties cleared' };
  } catch (error) {
    console.error('❌ Failed to clear properties:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Quick fix for web app - set minimum required properties
 */
function quickFixWebApp(spreadsheetId) {
  if (!spreadsheetId) {
    console.error('❌ Please provide a spreadsheet ID');
    return { success: false, error: 'Spreadsheet ID required' };
  }

  try {
    // Test the spreadsheet ID
    const sheet = SpreadsheetApp.openById(spreadsheetId);

    // Set minimum properties
    PropertiesService.getScriptProperties().setProperties({
      'SPREADSHEET_ID': spreadsheetId,
      'SETUP_COMPLETED': 'true',
      'CLUB_NAME': 'Syston Tigers'
    });

    console.log('✅ Quick fix completed - Web app should now work');
    console.log(`✅ Connected to spreadsheet: "${sheet.getName()}"`);

    return {
      success: true,
      spreadsheetId: spreadsheetId,
      spreadsheetName: sheet.getName(),
      message: 'Quick fix completed successfully'
    };

  } catch (error) {
    console.error('❌ Quick fix failed:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}