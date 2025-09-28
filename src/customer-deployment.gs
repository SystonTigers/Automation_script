/**
 * @fileoverview Customer Deployment System
 * @version 6.2.0
 * @description Handle web app deployment for customers (no GitHub needed)
 */

/**
 * Deploy customer web app (run once after installation)
 * This creates the web app deployment that customers will use
 * @returns {Object} Deployment result
 */
function deployCustomerWebApp() {
  const deployLogger = logger.scope('CustomerDeployment');
  deployLogger.enterFunction('deployCustomerWebApp');

  try {
    console.log('🌐 Deploying customer web app...');

    // Check if customer installation is complete
    const installStatus = getInstallationStatus();
    if (!installStatus.installed) {
      throw new Error('Customer installation not complete. Run installForCustomer() first.');
    }

    // Get customer details
    const properties = PropertiesService.getScriptProperties().getProperties();
    const clubName = properties['SYSTEM.CLUB_NAME'] || 'Unknown Club';
    const version = properties['SYSTEM.VERSION'] || '6.2.0';

    // Create deployment description
    const description = `${clubName} - Football Automation System v${version}`;

    // Check if there's already a deployment
    const existingDeployments = getExistingDeployments();
    let deploymentResult;

    if (existingDeployments.active.length > 0) {
      // Update existing deployment
      const latestDeployment = existingDeployments.active[0];
      console.log(`📝 Updating existing deployment: ${latestDeployment.id}`);

      try {
        // Create new version first
        const versionResult = createNewVersion(description);
        console.log(`✅ Created version: ${versionResult.versionNumber}`);

        // Update the deployment
        deploymentResult = updateWebAppDeployment(latestDeployment.id, versionResult.versionNumber, description);

      } catch (error) {
        console.log('⚠️  Could not update deployment, creating new one...');
        deploymentResult = createNewWebAppDeployment(description);
      }

    } else {
      // Create new deployment
      console.log('🆕 Creating new web app deployment...');
      deploymentResult = createNewWebAppDeployment(description);
    }

    // Store deployment info in properties
    if (deploymentResult.success) {
      PropertiesService.getScriptProperties().setProperties({
        'WEBAPP.DEPLOYMENT_ID': deploymentResult.deploymentId,
        'WEBAPP.URL': deploymentResult.url,
        'WEBAPP.DEPLOYED_AT': new Date().toISOString(),
        'WEBAPP.VERSION': version
      });
    }

    const result = {
      success: deploymentResult.success,
      customer: clubName,
      deployment_id: deploymentResult.deploymentId,
      web_app_url: deploymentResult.url,
      version: version,
      description: description,
      action: existingDeployments.active.length > 0 ? 'updated' : 'created',
      timestamp: new Date().toISOString(),
      instructions: [
        'Save the Web App URL - this is what customers will use',
        'Test the URL to ensure the web app loads correctly',
        'Configure Make.com webhooks to use this URL',
        'Share URL with match officials for live updates'
      ]
    };

    deployLogger.exitFunction('deployCustomerWebApp', { success: true, url: deploymentResult.url });

    console.log('🎉 Web app deployment completed!');
    console.log(`🔗 Web App URL: ${deploymentResult.url}`);

    return result;

  } catch (error) {
    deployLogger.error('Web app deployment failed', { error: error.toString() });
    console.error('❌ Web app deployment failed:', error.toString());

    return {
      success: false,
      error: error.toString(),
      customer: properties?.['SYSTEM.CLUB_NAME'] || 'Unknown',
      timestamp: new Date().toISOString(),
      troubleshooting: [
        'Ensure installForCustomer() has been run successfully',
        'Check that you have deployment permissions in Apps Script',
        'Verify the project has doGet() and doPost() functions',
        'Try deploying manually in Apps Script console'
      ]
    };
  }
}

/**
 * Create a new web app deployment
 * @param {string} description - Deployment description
 * @returns {Object} Deployment result
 */
function createNewWebAppDeployment(description) {
  try {
    // Create new version first
    const versionResult = createNewVersion(description);

    // Deploy as web app
    const deployment = ScriptApp.newDeployment()
      .setDescription(description)
      .setVersion(versionResult.versionNumber)
      .addScope(ScriptApp.AuthorizationStatus.REQUIRED)
      .deploy();

    return {
      success: true,
      deploymentId: deployment.getDeploymentId(),
      url: deployment.getUrl(),
      versionNumber: versionResult.versionNumber
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Update existing web app deployment
 * @param {string} deploymentId - Existing deployment ID
 * @param {string} versionNumber - New version number
 * @param {string} description - Deployment description
 * @returns {Object} Update result
 */
function updateWebAppDeployment(deploymentId, versionNumber, description) {
  try {
    // Get existing deployment
    const deployments = ScriptApp.getProjectDeployments();
    const existingDeployment = deployments.find(d => d.getDeploymentId() === deploymentId);

    if (!existingDeployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    // Update the deployment
    const updatedDeployment = existingDeployment
      .setDescription(description)
      .setVersion(versionNumber)
      .update();

    return {
      success: true,
      deploymentId: updatedDeployment.getDeploymentId(),
      url: updatedDeployment.getUrl(),
      versionNumber: versionNumber
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Create a new version of the script
 * @param {string} description - Version description
 * @returns {Object} Version result
 */
function createNewVersion(description) {
  try {
    const version = ScriptApp.newVersion(description);
    return {
      success: true,
      versionNumber: version.getVersionNumber(),
      description: description
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get existing deployments
 * @returns {Object} Deployment information
 */
function getExistingDeployments() {
  try {
    const deployments = ScriptApp.getProjectDeployments();

    return {
      total: deployments.length,
      active: deployments.map(d => ({
        id: d.getDeploymentId(),
        url: d.getUrl(),
        description: d.getDescription(),
        version: d.getVersionNumber()
      }))
    };

  } catch (error) {
    return {
      total: 0,
      active: [],
      error: error.toString()
    };
  }
}

/**
 * Get current web app status and URL
 * @returns {Object} Web app status
 */
function getWebAppStatus() {
  try {
    const properties = PropertiesService.getScriptProperties().getProperties();
    const deploymentId = properties['WEBAPP.DEPLOYMENT_ID'];
    const url = properties['WEBAPP.URL'];
    const deployedAt = properties['WEBAPP.DEPLOYED_AT'];

    if (!deploymentId || !url) {
      return {
        deployed: false,
        message: 'Web app not deployed. Run deployCustomerWebApp() to deploy.',
        instructions: [
          '1. Ensure installForCustomer() has been run',
          '2. Run deployCustomerWebApp() to create web app',
          '3. Test the generated URL'
        ]
      };
    }

    // Test if the deployment still exists
    const existingDeployments = getExistingDeployments();
    const deploymentExists = existingDeployments.active.some(d => d.id === deploymentId);

    return {
      deployed: true,
      deployment_id: deploymentId,
      url: url,
      deployed_at: deployedAt,
      version: properties['WEBAPP.VERSION'],
      customer: properties['SYSTEM.CLUB_NAME'],
      deployment_exists: deploymentExists,
      status: deploymentExists ? 'active' : 'missing',
      total_deployments: existingDeployments.total
    };

  } catch (error) {
    return {
      deployed: false,
      error: error.toString(),
      message: 'Error checking web app status'
    };
  }
}

/**
 * Clean up old/unused deployments (optional maintenance)
 * @param {number} keepLatest - Number of deployments to keep (default: 2)
 * @returns {Object} Cleanup result
 */
function cleanupOldDeployments(keepLatest = 2) {
  try {
    const deployments = ScriptApp.getProjectDeployments();

    if (deployments.length <= keepLatest) {
      return {
        success: true,
        action: 'none_needed',
        total_deployments: deployments.length,
        message: `Only ${deployments.length} deployments found, cleanup not needed`
      };
    }

    // Sort by version (newest first) and keep the latest ones
    const sortedDeployments = deployments.sort((a, b) => b.getVersionNumber() - a.getVersionNumber());
    const toDelete = sortedDeployments.slice(keepLatest);

    let deletedCount = 0;
    const errors = [];

    for (const deployment of toDelete) {
      try {
        ScriptApp.deleteDeployment(deployment);
        deletedCount++;
        console.log(`🗑️  Deleted deployment: ${deployment.getDeploymentId()}`);
      } catch (error) {
        errors.push({
          deployment_id: deployment.getDeploymentId(),
          error: error.toString()
        });
      }
    }

    return {
      success: true,
      action: 'cleaned',
      total_deployments: deployments.length,
      deleted_count: deletedCount,
      kept_count: keepLatest,
      errors: errors
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      message: 'Failed to cleanup deployments'
    };
  }
}

/**
 * Complete customer setup (installer + web app deployment)
 * Run this for end-to-end customer setup
 * @returns {Object} Complete setup result
 */
function completeCustomerSetup() {
  try {
    console.log('🚀 Starting complete customer setup...');

    // Step 1: Install customer configuration
    const installResult = installForCustomer();
    if (!installResult.success) {
      throw new Error(`Installation failed: ${installResult.error}`);
    }

    console.log('✅ Customer installation completed');

    // Step 2: Deploy web app
    const deployResult = deployCustomerWebApp();
    if (!deployResult.success) {
      throw new Error(`Web app deployment failed: ${deployResult.error}`);
    }

    console.log('✅ Web app deployment completed');

    // Step 3: Final health check
    const healthCheck = performInstallationHealthCheck();

    const result = {
      success: true,
      customer: installResult.customer,
      version: installResult.version,
      web_app_url: deployResult.web_app_url,
      deployment_id: deployResult.deployment_id,
      health_score: healthCheck.score,
      setup_completed_at: new Date().toISOString(),
      next_steps: [
        `📋 Customer: ${installResult.customer}`,
        `🔗 Web App URL: ${deployResult.web_app_url}`,
        `📊 Health Score: ${healthCheck.score}/100 (${healthCheck.grade})`,
        '',
        '🎯 Next Steps:',
        '1. Test the web app URL to ensure it loads',
        '2. Configure Make.com webhooks with the web app URL',
        '3. Test live match updates functionality',
        '4. Train customer on using the system',
        '5. Monitor system health and performance'
      ]
    };

    console.log('🎉 Complete customer setup finished!');
    console.log(`🔗 Customer Web App: ${deployResult.web_app_url}`);

    return result;

  } catch (error) {
    console.error('❌ Complete customer setup failed:', error.toString());

    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString(),
      partial_results: {
        installation: typeof installResult !== 'undefined' ? installResult : null,
        deployment: typeof deployResult !== 'undefined' ? deployResult : null
      }
    };
  }
}

/**
 * AUTOMATIC CUSTOMER SETUP SYSTEM
 * Triggers when customer edits their Config sheet
 * Completely autonomous - no developer intervention needed
 */

/**
 * Auto-setup trigger when customer edits Config sheet
 * This function automatically runs when customers update their configuration
 * @param {Object} e - The edit event object
 */
function onConfigSheetEdit(e) {
  const setupLogger = logger.scope('AutoSetup');
  setupLogger.enterFunction('onConfigSheetEdit');

  try {
    // Only respond to Config sheet edits
    if (!e || e.source.getActiveSheet().getName() !== 'Config') {
      return;
    }

    // Check if this is a setup trigger (customer added SETUP_TRIGGER = TRUE)
    const range = e.range;
    const value = range.getValue();

    if (range.getColumn() === 2 && String(value).toUpperCase() === 'TRUE') {
      const configKey = range.offset(0, -1).getValue();

      if (configKey === 'SETUP_TRIGGER') {
        console.log('🎯 Customer triggered automatic setup!');

        // Mark setup as in progress
        range.setValue('PROCESSING...');

        // Run complete setup automatically
        Utilities.sleep(1000); // Brief pause for UI feedback
        const setupResult = completeCustomerSetup();

        if (setupResult.success) {
          // Update status to completed
          range.setValue('COMPLETED');

          // Add completion timestamp
          const completedRow = findConfigRow('SETUP_COMPLETED');
          if (completedRow) {
            SpreadsheetApp.getActiveSheet().getRange(completedRow, 2).setValue(new Date().toISOString());
          }

          // Show success message
          SpreadsheetApp.getUi().alert(
            'Setup Complete!',
            `🎉 Your football automation system is ready!\n\n` +
            `🔗 Web App URL: ${setupResult.web_app_url}\n\n` +
            `📋 Save this URL - this is what you'll use for live match updates.\n\n` +
            `✅ Health Score: ${setupResult.health_score}/100`,
            SpreadsheetApp.getUi().ButtonSet.OK
          );

        } else {
          // Update status to failed
          range.setValue('FAILED');

          SpreadsheetApp.getUi().alert(
            'Setup Failed',
            `❌ Setup failed: ${setupResult.error}\n\n` +
            `Please check your configuration and try again.`,
            SpreadsheetApp.getUi().ButtonSet.OK
          );
        }

        setupLogger.exitFunction('onConfigSheetEdit', { success: setupResult.success });
      }
    }

  } catch (error) {
    setupLogger.error('Auto-setup failed', { error: error.toString() });
    console.error('❌ Auto-setup failed:', error.toString());

    // Try to update the trigger cell to show error
    try {
      const configSheet = SpreadsheetApp.getActiveSheet();
      const triggerRow = findConfigRow('SETUP_TRIGGER');
      if (triggerRow) {
        configSheet.getRange(triggerRow, 2).setValue('ERROR - Check logs');
      }
    } catch (updateError) {
      console.error('Could not update error status:', updateError.toString());
    }
  }
}

/**
 * Create the automatic setup trigger
 * This installs the onEdit trigger that watches for customer setup requests
 */
function createAutoSetupTrigger() {
  try {
    console.log('🔧 Installing automatic setup trigger...');

    // Delete any existing onEdit triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onConfigSheetEdit') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Create new onEdit trigger
    ScriptApp.newTrigger('onConfigSheetEdit')
      .onEdit()
      .create();

    console.log('✅ Auto-setup trigger installed');

    return { success: true, message: 'Auto-setup trigger created' };

  } catch (error) {
    console.error('❌ Failed to create auto-setup trigger:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Enhanced customer setup with automatic trigger installation
 * Customers can now setup completely autonomously
 * @returns {Object} Setup result with instructions
 */
function setupCustomerAutomation() {
  try {
    console.log('🚀 Setting up customer automation system...');

    // Step 1: Create the auto-setup trigger
    const triggerResult = createAutoSetupTrigger();
    if (!triggerResult.success) {
      throw new Error(`Trigger setup failed: ${triggerResult.error}`);
    }

    // Step 2: Add setup instructions to Config sheet
    const configSheet = SheetUtils.getOrCreateSheet('Config', [
      ['Key', 'Value', 'Description'],
      ['CLUB_NAME', 'Your Club Name', 'Enter your football club name'],
      ['LEAGUE_NAME', 'Your League', 'Enter your league name'],
      ['TEAM_AGE_GROUP', 'Senior', 'Team age group (Senior, U18, U16, etc.)'],
      ['SETUP_TRIGGER', 'FALSE', '⚡ Set to TRUE to start automatic setup'],
      ['SETUP_STATUS', 'Not Started', 'Setup progress status'],
      ['SETUP_COMPLETED', '', 'Timestamp when setup completed'],
      ['WEB_APP_URL', '', 'Your web app URL (generated automatically)']
    ]);

    if (!configSheet) {
      throw new Error('Could not create Config sheet');
    }

    // Step 3: Add helpful instructions
    const instructions = [
      '',
      '📋 CUSTOMER SETUP INSTRUCTIONS:',
      '1. Update CLUB_NAME with your team name',
      '2. Update LEAGUE_NAME with your league',
      '3. Set SETUP_TRIGGER to TRUE to start',
      '4. Wait for automatic setup to complete',
      '5. Save your Web App URL when generated',
      '',
      '🎯 The system will automatically:',
      '• Install all required components',
      '• Create your web app for live updates',
      '• Validate your configuration',
      '• Generate your unique web app URL',
      '',
      '⚡ No developer intervention needed!'
    ];

    // Add instructions starting from row 10
    instructions.forEach((instruction, index) => {
      configSheet.getRange(10 + index, 1, 1, 3).merge().setValue(instruction);
    });

    const result = {
      success: true,
      message: 'Customer automation system ready',
      trigger_installed: true,
      config_sheet_created: true,
      customer_instructions: [
        '✅ Automation system is now ready',
        '📝 Customers edit the Config sheet to setup',
        '⚡ No developer intervention required',
        '🔄 Setup happens automatically when SETUP_TRIGGER = TRUE',
        '🎯 Customers get their web app URL immediately',
        '',
        '💼 Commercial ready: Fully autonomous customer onboarding!'
      ],
      developer_notes: [
        'Customers never need to contact you for setup',
        'They get immediate feedback and their web app URL',
        'Failed setups show clear error messages',
        'All setup activity is logged for support if needed'
      ]
    };

    console.log('🎉 Customer automation system ready!');
    console.log('✅ Customers can now setup completely independently');

    return result;

  } catch (error) {
    console.error('❌ Customer automation setup failed:', error.toString());

    return {
      success: false,
      error: error.toString(),
      troubleshooting: [
        'Ensure you have edit permissions on the spreadsheet',
        'Check that triggers can be created in this project',
        'Verify the Config sheet can be created/edited'
      ]
    };
  }
}

/**
 * Helper function to find a config row by key
 * @param {string} key - The config key to find
 * @returns {number|null} Row number or null if not found
 */
function findConfigRow(key) {
  try {
    const configSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
    if (!configSheet) return null;

    const data = configSheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === key) {
        return i + 1; // Return 1-based row number
      }
    }
    return null;
  } catch (error) {
    console.error('Error finding config row:', error.toString());
    return null;
  }
}