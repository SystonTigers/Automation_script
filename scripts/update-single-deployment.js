/**
 * Ensures a single web app deployment is updated (not multiplied).
 * Logic:
 * 1) Try to read deploymentId from Script Properties via Apps Script API (Execution).
 * 2) If not set, create one deployment and write it back to Script Properties.
 * 3) If set, update that deployment only.
 */
const { execSync } = require('node:child_process');

function sh(cmd) {
  try {
    return execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Command failed: ${cmd}`);
    throw error;
  }
}

try {
  console.log('🔄 Managing single web app deployment...');

  // 1) Try update known deployment id from environment variable
  const deploymentId = process.env.WEBAPP_DEPLOYMENT_ID || '';

  if (deploymentId) {
    console.log(`✅ Using stored deployment ID: ${deploymentId}`);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    sh(`npx clasp deploy --deploymentId ${deploymentId} --description "CI update ${timestamp}"`);
    console.log('✅ Single deployment updated successfully!');
    process.exit(0);
  }

  // 2) No stored deployment ID - check existing deployments
  console.log('🔍 Checking existing deployments...');
  const deployments = execSync('npx clasp deployments', { encoding: 'utf8' });
  console.log('Current deployments:', deployments);

  // 3) Create first deployment if none exist, or update the first one found
  const deploymentMatch = deployments.match(/- (\w+) @/);

  if (deploymentMatch) {
    const existingId = deploymentMatch[1];
    console.log(`🔄 Found existing deployment: ${existingId}, updating it...`);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    sh(`npx clasp deploy --deploymentId ${existingId} --description "CI update ${timestamp}"`);
    console.log(`✅ Updated existing deployment: ${existingId}`);
    console.log(`💡 TIP: Set WEBAPP_DEPLOYMENT_ID=${existingId} in GitHub repository variables for consistency`);
  } else {
    console.log('📦 Creating initial deployment...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const result = execSync(`npx clasp deploy --description "Initial single deployment ${timestamp}"`, { encoding: 'utf8' });
    console.log('Deployment result:', result);

    // Extract deployment ID from result
    const newIdMatch = result.match(/- (\w+) @/);
    if (newIdMatch) {
      const newId = newIdMatch[1];
      console.log(`✅ Created new deployment: ${newId}`);
      console.log(`🔧 IMPORTANT: Set WEBAPP_DEPLOYMENT_ID=${newId} in GitHub repository variables`);
    }
  }

} catch (error) {
  console.error('❌ Deployment management failed:', error.message);
  process.exit(1);
}