/**
 * @fileoverview Customer Configuration Installer Service
 * @version 6.2.0
 * @description Safe customer setup that only uses Google Sheets Config tab
 */

/**
 * Customer Configuration Installer
 * Customers only edit the Sheet CONFIG tab - no code editing required
 */
class CustomerInstaller {

  static getConfigKeys() {
    return {
      // Non-secret values that customers set in CONFIG sheet tab
      nonSecrets: [
        'TEAM_NAME',
        'LEAGUE_NAME',
        'BADGE_URL',
        'HOME_COLOUR',
        'AWAY_COLOUR',
        'SEASON',
        'AGE_GROUP',
        'HOME_VENUE',
        'CONTACT_EMAIL'
      ],
      // Secret values set via admin interface only (never in sheets)
      secrets: [
        'MAKE_WEBHOOK_URL_LIVE_EVENTS',
        'MAKE_WEBHOOK_URL_BATCH_CONTENT',
        'MAKE_WEBHOOK_URL_FIXTURES',
        'MAKE_WEBHOOK_URL_RESULTS',
        'CANVA_API_KEY',
        'YOUTUBE_API_KEY'
      ]
    };
  }

  /**
   * Main installer function - reads CONFIG sheet and sets up system
   * Safe to run multiple times (idempotent)
   */
  static installFromSheet() {
    try {
      console.log('🚀 Starting customer configuration install...');

      // 1. Validate CONFIG sheet exists
      const configSheet = this.getConfigSheet();
      if (!configSheet) {
        throw new Error('CONFIG sheet tab not found. Please create a CONFIG tab in your spreadsheet.');
      }

      // 2. Read configuration from sheet
      const configMap = this.readConfigFromSheet(configSheet);
      console.log('✅ Configuration read from sheet');

      // 3. Validate required values
      this.validateConfiguration(configMap);
      console.log('✅ Configuration validated');

      // 4. Install non-secret properties
      this.installNonSecrets(configMap);
      console.log('✅ Non-secret configuration installed');

      // 5. Check secret properties
      this.checkSecrets();
      console.log('✅ Secret configuration checked');

      // 6. Initialize system
      this.initializeSystem();
      console.log('✅ System initialized');

      // 7. Mark installation complete
      const properties = PropertiesService.getScriptProperties();
      properties.setProperties({
        'SA_INSTALLED_AT': new Date().toISOString(),
        'SA_INSTALLED_VERSION': getConfigValue('SYSTEM.VERSION', '6.2.0'),
        'SA_INSTALLATION_STATUS': 'COMPLETE'
      });

      console.log('🎉 Customer installation completed successfully!');

      return {
        success: true,
        message: 'System installed successfully from CONFIG sheet',
        timestamp: new Date().toISOString(),
        configKeys: this.getConfigKeys().nonSecrets.length,
        secretsFound: this.countExistingSecrets()
      };

    } catch (error) {
      console.error('❌ Customer installation failed:', error);

      // Mark installation as failed
      PropertiesService.getScriptProperties().setProperty('SA_INSTALLATION_STATUS', 'FAILED');

      return {
        success: false,
        error: error.toString(),
        timestamp: new Date().toISOString(),
        help: 'Please check your CONFIG sheet has all required values'
      };
    }
  }

  /**
   * Get or create CONFIG sheet
   */
  static getConfigSheet() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let configSheet = spreadsheet.getSheetByName('CONFIG');

    if (!configSheet) {
      console.log('📋 Creating CONFIG sheet template...');
      configSheet = spreadsheet.insertSheet('CONFIG');

      // Create template with headers and example values
      const templateData = [
        ['Configuration Key', 'Value', 'Description'],
        ['TEAM_NAME', 'Your Team Name', 'Full name of your football team'],
        ['LEAGUE_NAME', 'Your League Name', 'Name of the league you play in'],
        ['SEASON', '2024/25', 'Current season (e.g. 2024/25)'],
        ['AGE_GROUP', 'Senior', 'Age group (Senior, U18, U16, etc.)'],
        ['HOME_COLOUR', '#FF0000', 'Primary team colour (hex code)'],
        ['AWAY_COLOUR', '#FFFFFF', 'Away kit colour (hex code)'],
        ['HOME_VENUE', 'Your Ground Name', 'Name of your home ground'],
        ['BADGE_URL', 'https://example.com/badge.png', 'URL to your club badge (optional)'],
        ['CONTACT_EMAIL', 'admin@yourclub.com', 'Admin contact email'],
        ['', '', ''],
        ['INSTRUCTIONS:', '', ''],
        ['1. Fill in the Value column with your club details', '', ''],
        ['2. Do not edit the Configuration Key column', '', ''],
        ['3. Run the installer from Apps Script menu', '', ''],
        ['4. Secrets (webhooks, API keys) are set separately', '', '']
      ];

      configSheet.getRange(1, 1, templateData.length, 3).setValues(templateData);

      // Format the sheet nicely
      const headerRange = configSheet.getRange(1, 1, 1, 3);
      headerRange.setBackground('#4285F4');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');

      configSheet.autoResizeColumns(1, 3);

      console.log('✅ CONFIG sheet template created');
    }

    return configSheet;
  }

  /**
   * Read configuration from sheet into a map
   */
  static readConfigFromSheet(configSheet) {
    const data = configSheet.getDataRange().getValues();
    const configMap = {};

    // Skip header row, process remaining rows
    for (let i = 1; i < data.length; i++) {
      const [key, value, description] = data[i];

      if (key && value && typeof key === 'string' && key.trim() !== '') {
        configMap[key.trim()] = String(value).trim();
      }
    }

    return configMap;
  }

  /**
   * Validate required configuration exists
   */
  static validateConfiguration(configMap) {
    const missing = [];

    this.getConfigKeys().nonSecrets.forEach(key => {
      if (!configMap[key] || configMap[key] === '' || configMap[key].startsWith('Your ')) {
        missing.push(key);
      }
    });

    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}. Please complete your CONFIG sheet.`);
    }

    // Validate email format
    const email = configMap['CONTACT_EMAIL'];
    if (email && !email.includes('@')) {
      throw new Error('CONTACT_EMAIL must be a valid email address');
    }

    // Validate colour codes
    const homeColour = configMap['HOME_COLOUR'];
    const awayColour = configMap['AWAY_COLOUR'];

    if (homeColour && !homeColour.match(/^#[0-9A-Fa-f]{6}$/)) {
      throw new Error('HOME_COLOUR must be a valid hex colour code (e.g. #FF0000)');
    }

    if (awayColour && !awayColour.match(/^#[0-9A-Fa-f]{6}$/)) {
      throw new Error('AWAY_COLOUR must be a valid hex colour code (e.g. #FFFFFF)');
    }
  }

  /**
   * Install non-secret properties to Script Properties
   */
  static installNonSecrets(configMap) {
    const properties = PropertiesService.getScriptProperties();
    const propertiesToSet = {};

    this.getConfigKeys().nonSecrets.forEach(key => {
      if (configMap[key]) {
        propertiesToSet[`CUSTOMER.${key}`] = configMap[key];
      }
    });

    // Add system properties
    propertiesToSet['SPREADSHEET_ID'] = SpreadsheetApp.getActiveSpreadsheet().getId();
    propertiesToSet['SYSTEM.CLUB_NAME'] = configMap['TEAM_NAME'] || 'Football Club';

    properties.setProperties(propertiesToSet);
    console.log(`✅ Installed ${Object.keys(propertiesToSet).length} configuration properties`);
  }

  /**
   * Check if secrets are configured (don't show them for security)
   */
  static checkSecrets() {
    const properties = PropertiesService.getScriptProperties();
    const secretStatus = {};
    let configuredCount = 0;

    this.getConfigKeys().secrets.forEach(key => {
      const value = properties.getProperty(key);
      secretStatus[key] = value ? '✅ Configured' : '❌ Not Set';
      if (value) configuredCount++;
    });

    console.log('🔐 Secret configuration status:');
    Object.entries(secretStatus).forEach(([key, status]) => {
      console.log(`  ${key}: ${status}`);
    });

    if (configuredCount === 0) {
      console.warn('⚠️  No secrets configured - system will not post to social media');
      console.warn('   Use the Admin panel to configure webhook URLs and API keys');
    }

    return { secretStatus, configuredCount };
  }

  /**
   * Count existing secrets (without exposing values)
   */
  static countExistingSecrets() {
    const properties = PropertiesService.getScriptProperties();
    return this.getConfigKeys().secrets.filter(key =>
      properties.getProperty(key) !== null
    ).length;
  }

  /**
   * Initialize system components
   */
  static initializeSystem() {
    try {
      // Initialize basic health check
      if (typeof HealthCheck !== 'undefined') {
        HealthCheck.quickHealthCheck();
      }

      // Initialize monitoring if available
      if (typeof ProductionMonitoringManager !== 'undefined') {
        ProductionMonitoringManager.initializeMonitoring();
      }

      console.log('✅ System components initialized');
    } catch (error) {
      console.warn('⚠️  Some system components could not be initialized:', error.message);
    }
  }

  /**
   * Get installation status
   */
  static getInstallationStatus() {
    const properties = PropertiesService.getScriptProperties();

    return {
      status: properties.getProperty('SA_INSTALLATION_STATUS') || 'NOT_STARTED',
      installedAt: properties.getProperty('SA_INSTALLED_AT'),
      version: properties.getProperty('SA_INSTALLED_VERSION'),
      spreadsheetId: properties.getProperty('SPREADSHEET_ID'),
      clubName: properties.getProperty('SYSTEM.CLUB_NAME'),
      secretsConfigured: this.countExistingSecrets()
    };
  }

  /**
   * Show simple admin interface for setting secrets
   * This creates a sidebar UI for admins to set webhook URLs safely
   */
  static showAdminPanel() {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <base target="_top">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .form-group { margin: 15px 0; }
          label { display: block; font-weight: bold; margin-bottom: 5px; }
          input { width: 100%; padding: 8px; margin-bottom: 10px; }
          button { background: #4285F4; color: white; padding: 10px 20px; border: none; cursor: pointer; }
          .warning { background: #fff3cd; padding: 10px; margin: 10px 0; border-left: 4px solid #ffc107; }
        </style>
      </head>
      <body>
        <h2>🔐 Admin Secret Configuration</h2>
        <div class="warning">
          <strong>Security Notice:</strong> Only authorized administrators should access this panel.
          These values are sensitive and should not be shared.
        </div>

        <form id="secretForm">
          <div class="form-group">
            <label>Make.com Live Events Webhook:</label>
            <input type="password" id="liveWebhook" placeholder="https://hook.integromat.com/...">
          </div>

          <div class="form-group">
            <label>Make.com Batch Content Webhook:</label>
            <input type="password" id="batchWebhook" placeholder="https://hook.integromat.com/...">
          </div>

          <button type="submit">💾 Save Secrets</button>
        </form>

        <script>
          document.getElementById('secretForm').onsubmit = function(e) {
            e.preventDefault();
            const liveWebhook = document.getElementById('liveWebhook').value;
            const batchWebhook = document.getElementById('batchWebhook').value;

            if (liveWebhook || batchWebhook) {
              google.script.run
                .withSuccessHandler(() => {
                  alert('✅ Secrets saved successfully!');
                  google.script.host.close();
                })
                .withFailureHandler(error => alert('❌ Error: ' + error))
                .saveSecrets({
                  MAKE_WEBHOOK_URL_LIVE_EVENTS: liveWebhook,
                  MAKE_WEBHOOK_URL_BATCH_CONTENT: batchWebhook
                });
            } else {
              alert('Please enter at least one webhook URL');
            }
          };
        </script>
      </body>
      </html>
    `;

    const htmlOutput = HtmlService.createHtmlOutput(html)
      .setTitle('Admin Secret Configuration')
      .setWidth(400)
      .setHeight(300);

    SpreadsheetApp.getUi().showSidebar(htmlOutput);
  }

  /**
   * Save secrets from admin panel (server-side function)
   */
  static saveSecrets(secretData) {
    try {
      const properties = PropertiesService.getScriptProperties();
      const propertiesToSet = {};

      // Only save non-empty values
      Object.entries(secretData).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          propertiesToSet[key] = value.trim();
        }
      });

      if (Object.keys(propertiesToSet).length > 0) {
        properties.setProperties(propertiesToSet);
        console.log(`✅ Saved ${Object.keys(propertiesToSet).length} secret properties`);
        return { success: true, count: Object.keys(propertiesToSet).length };
      } else {
        throw new Error('No valid secret values provided');
      }

    } catch (error) {
      console.error('❌ Failed to save secrets:', error);
      throw error;
    }
  }
}

// Export for global use
globalThis.CustomerInstaller = CustomerInstaller;

/**
 * Menu function for easy access
 */
function installCustomerConfig() {
  return CustomerInstaller.installFromSheet();
}

/**
 * Menu function for admin panel
 */
function showAdminSecretPanel() {
  return CustomerInstaller.showAdminPanel();
}

/**
 * Menu function to check installation status
 */
function checkInstallationStatus() {
  const status = CustomerInstaller.getInstallationStatus();
  console.log('📊 Installation Status:', status);
  return status;
}