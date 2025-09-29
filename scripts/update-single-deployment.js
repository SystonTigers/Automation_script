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

  // 1) Require WEBAPP_DEPLOYMENT_ID to enforce single deployment policy
  const deploymentId = process.env.WEBAPP_DEPLOYMENT_ID || '';

  if (!deploymentId) {
    console.error('❌ ERROR: WEBAPP_DEPLOYMENT_ID environment variable is required');
    console.error('');
    console.error('To fix this:');
    console.error('1. Go to GitHub → Settings → Actions → Variables');
    console.error('2. Add repository variable WEBAPP_DEPLOYMENT_ID');
    console.error('3. Set value to your existing deployment ID');
    console.error('');
    console.error('To find your deployment ID:');
    console.error('  npx clasp deployments');
    console.error('');
    console.error('If you need to create an initial deployment:');
    console.error('  npx clasp deploy --description "Initial deployment"');
    console.error('  # Then copy the deployment ID to GitHub variables');
    console.error('');
    console.error('This policy prevents accidental deployment multiplication.');
    process.exit(1);
  }

  // 2) Update the specified deployment only
  // Mask deployment ID in logs (show only last 4 chars for verification)
  const maskedId = `***${deploymentId.slice(-4)}`;
  console.log(`✅ Using deployment ID: ${maskedId}`);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  sh(`npx clasp deploy --deploymentId ${deploymentId} --description "CI update ${timestamp}"`);
  console.log('✅ Single deployment updated successfully!');

} catch (error) {
  console.error('❌ Deployment management failed:', error.message);
  process.exit(1);
}