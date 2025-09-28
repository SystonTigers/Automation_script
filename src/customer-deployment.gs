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