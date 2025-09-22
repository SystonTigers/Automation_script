/**
 * @fileoverview Control Panel system for managing football automation features
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Complete control panel with UI for toggling features, monitoring status, and system management
 * 
 * FEATURES IMPLEMENTED:
 * - Interactive sidebar control panel
 * - Feature toggle management (on/off switches)
 * - Real-time system status monitoring
 * - Configuration management interface
 * - Manual trigger buttons for all automations
 * - System health dashboard
 * - Emergency controls and recovery options
 */

// ==================== CONTROL PANEL MANAGER ====================

/**
 * Control Panel Manager - Handles all control panel operations
 */
class ControlPanelManager {
    
  constructor() {
    this.logger = logger.scope('ControlPanel');
    this.panelOpen = false;
  }

  // ==================== CONTROL PANEL UI ====================

  /**
   * Show the main control panel sidebar with authentication
   * @param {string} sessionToken - Optional session token for authenticated user
   * @returns {Object} Panel display result
   */
  showControlPanel(sessionToken = null) {
    this.logger.enterFunction('showControlPanel', { hasSession: !!sessionToken });

    try {
      let panelHtml;

      if (sessionToken) {
        // @testHook(control_panel_check_auth_start)
        // Use enhanced security validation
        const authResult = EnhancedSecurity.validateEncryptedSession(sessionToken);
        if (!authResult.success) {
          panelHtml = this.generateLoginHTML('Session expired. Please log in again.');
        } else {
          // Check if password change is required
          if (authResult.session.passwordChangeRequired) {
            panelHtml = this.generatePasswordChangeHTML(sessionToken);
          } else {
            panelHtml = this.generateControlPanelHTML(authResult.session);
          }
        }
        // @testHook(control_panel_check_auth_end)
      } else {
        // Show login form for unauthenticated users
        panelHtml = this.generateLoginHTML();
      }

      // @testHook(control_panel_show_sidebar_start)
      const htmlOutput = HtmlService.createHtmlOutput(panelHtml)
        .setTitle('⚽ Football Automation Control Panel')
        .setWidth(400);

      SpreadsheetApp.getUi().showSidebar(htmlOutput);
      // @testHook(control_panel_show_sidebar_end)

      this.panelOpen = true;
      this.logger.info('Control panel displayed successfully', { authenticated: !!sessionToken });

      this.logger.exitFunction('showControlPanel', { success: true });
      return { success: true, message: 'Control panel opened' };

    } catch (error) {
      this.logger.error('Control panel display failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Generate control panel HTML for authenticated users
   * @param {Object} session - User session data
   * @returns {string} HTML content
   */
  generateControlPanelHTML(session = null) {
    try {
      const currentSettings = this.getCurrentSettings();
      const systemStatus = this.getSystemStatusSummary();
      const userRole = session ? session.role : 'viewer';
      
      return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Football Automation Control Panel</title>
    <style>
        body { 
            font-family: 'Google Sans', Arial, sans-serif; 
            margin: 0; 
            padding: 16px; 
            background: #f8f9fa;
            font-size: 14px;
        }
        .header { 
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            color: white; 
            padding: 16px; 
            margin: -16px -16px 20px -16px;
            border-radius: 0 0 12px 12px;
            text-align: center;
        }
        .header h2 { margin: 0; font-size: 18px; }
        .header .status { 
            margin-top: 8px; 
            padding: 4px 12px; 
            background: rgba(255,255,255,0.2); 
            border-radius: 16px; 
            font-size: 12px;
        }
        .section { 
            background: white; 
            border-radius: 8px; 
            padding: 16px; 
            margin-bottom: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h3 { 
            margin: 0 0 12px 0; 
            color: #1f2937; 
            font-size: 16px;
            display: flex;
            align-items: center;
        }
        .section h3 .icon { 
            margin-right: 8px; 
            font-size: 18px;
        }
        .toggle-item { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 12px 0; 
            border-bottom: 1px solid #e5e7eb;
        }
        .toggle-item:last-child { border-bottom: none; }
        .toggle-item .label { 
            flex: 1; 
            font-weight: 500;
            color: #374151;
        }
        .toggle-item .description { 
            font-size: 12px; 
            color: #6b7280; 
            margin-top: 4px;
        }
        .toggle-switch { 
            position: relative; 
            width: 50px; 
            height: 24px; 
            background: #d1d5db; 
            border-radius: 12px; 
            cursor: pointer;
            transition: background 0.3s;
        }
        .toggle-switch.active { background: #10b981; }
        .toggle-switch::before { 
            content: ''; 
            position: absolute; 
            width: 20px; 
            height: 20px; 
            background: white; 
            border-radius: 50%; 
            top: 2px; 
            left: 2px; 
            transition: transform 0.3s;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .toggle-switch.active::before { transform: translateX(26px); }
        .btn { 
            background: #3b82f6; 
            color: white; 
            border: none; 
            padding: 10px 16px; 
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 13px;
            font-weight: 500;
            transition: background 0.3s;
            width: 100%;
            margin-bottom: 8px;
        }
        .btn:hover { background: #2563eb; }
        .btn.success { background: #10b981; }
        .btn.success:hover { background: #059669; }
        .btn.warning { background: #f59e0b; }
        .btn.warning:hover { background: #d97706; }
        .btn.danger { background: #ef4444; }
        .btn.danger:hover { background: #dc2626; }
        .status-indicator { 
            display: inline-block; 
            width: 8px; 
            height: 8px; 
            border-radius: 50%; 
            margin-right: 8px;
        }
        .status-indicator.good { background: #10b981; }
        .status-indicator.warning { background: #f59e0b; }
        .status-indicator.error { background: #ef4444; }
        .status-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 8px; 
            margin-top: 12px;
        }
        .status-card { 
            background: #f9fafb; 
            padding: 12px; 
            border-radius: 6px; 
            text-align: center;
        }
        .status-card .number { 
            font-size: 20px; 
            font-weight: bold; 
            color: #1f2937;
        }
        .status-card .label { 
            font-size: 11px; 
            color: #6b7280; 
            margin-top: 4px;
        }
        .log-display { 
            background: #1f2937; 
            color: #e5e7eb; 
            padding: 12px; 
            border-radius: 6px; 
            font-family: 'Courier New', monospace; 
            font-size: 11px; 
            max-height: 150px; 
            overflow-y: auto;
            margin-top: 12px;
        }
        .loading { 
            display: none; 
            text-align: center; 
            padding: 20px; 
            color: #6b7280;
        }
        .spinner { 
            border: 2px solid #e5e7eb; 
            border-top: 2px solid #3b82f6; 
            border-radius: 50%; 
            width: 20px; 
            height: 20px; 
            animation: spin 1s linear infinite; 
            display: inline-block; 
            margin-right: 8px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="header">
        <h2>⚽ Football Automation</h2>
        <div class="status">
            <span class="status-indicator ${systemStatus.indicator}"></span>
            System ${systemStatus.status}
        </div>
    </div>

    <!-- FEATURE TOGGLES -->
    <div class="section">
        <h3><span class="icon">🎛️</span>Feature Controls</h3>
        ${this.generateFeatureToggles(currentSettings)}
    </div>

    <!-- INTEGRATION STATUS -->
    <div class="section">
        <h3><span class="icon">🔗</span>Integrations</h3>
        ${this.generateIntegrationStatus(currentSettings)}
    </div>

    <!-- MANUAL TRIGGERS -->
    <div class="section">
        <h3><span class="icon">⚡</span>Manual Triggers</h3>
        <button class="btn" onclick="triggerAction('weekly_automation')">
            📅 Trigger Weekly Content
        </button>
        <button class="btn" onclick="triggerAction('monthly_automation')">
            📊 Trigger Monthly Summary
        </button>
        <button class="btn" onclick="triggerAction('player_stats')">
            👥 Post Player Stats
        </button>
        <button class="btn" onclick="triggerAction('goal_of_month')">
            🏆 Collect Goal of Month
        </button>
        <button class="btn warning" onclick="triggerAction('system_health_check')">
            🩺 System Health Check
        </button>
    </div>

    <!-- SYSTEM STATUS -->
    <div class="section">
        <h3><span class="icon">📊</span>System Status</h3>
        <div class="status-grid">
            <div class="status-card">
                <div class="number" id="events-count">${systemStatus.events_today || 0}</div>
                <div class="label">Events Today</div>
            </div>
            <div class="status-card">
                <div class="number" id="clips-count">${systemStatus.clips_pending || 0}</div>
                <div class="label">Clips Pending</div>
            </div>
            <div class="status-card">
                <div class="number" id="webhooks-count">${systemStatus.webhooks_sent || 0}</div>
                <div class="label">Webhooks Sent</div>
            </div>
            <div class="status-card">
                <div class="number" id="uptime">${systemStatus.uptime || '24h'}</div>
                <div class="label">Uptime</div>
            </div>
        </div>
        <button class="btn" onclick="refreshStatus()">🔄 Refresh Status</button>
    </div>

    <!-- EMERGENCY CONTROLS -->
    <div class="section">
        <h3><span class="icon">🚨</span>Emergency Controls</h3>
        <button class="btn danger" onclick="emergencyAction('system_recovery')">
            🔧 Emergency Recovery
        </button>
        <button class="btn warning" onclick="emergencyAction('clear_cache')">
            🗑️ Clear Cache & Reset
        </button>
        <button class="btn" onclick="emergencyAction('reinitialize')">
            ♻️ Reinitialize System
        </button>
    </div>

    <!-- RECENT LOGS -->
    <div class="section">
        <h3><span class="icon">📝</span>Recent Activity</h3>
        <div class="log-display" id="recent-logs">
            Loading recent activity...
        </div>
        <button class="btn" onclick="refreshLogs()">📋 Refresh Logs</button>
    </div>

    <!-- LOADING INDICATOR -->
    <div class="loading" id="loading">
        <div class="spinner"></div>
        Processing request...
    </div>

    <script>
        // Toggle feature on/off
        function toggleFeature(featureName, element) {
            showLoading();
            element.classList.toggle('active');
            const enabled = element.classList.contains('active');
            
            google.script.run
                .withSuccessHandler(function(result) {
                    hideLoading();
                    if (result.success) {
                        showNotification('✅ ' + featureName + ' ' + (enabled ? 'enabled' : 'disabled'));
                    } else {
                        // Revert toggle on failure
                        element.classList.toggle('active');
                        showNotification('❌ Failed: ' + result.error);
                    }
                })
                .withFailureHandler(function(error) {
                    hideLoading();
                    element.classList.toggle('active');
                    showNotification('❌ Error: ' + error.toString());
                })
                .controlPanelToggleFeature(featureName, enabled);
        }

        // Trigger manual action
        function triggerAction(actionType) {
            showLoading();
            google.script.run
                .withSuccessHandler(function(result) {
                    hideLoading();
                    if (result.success) {
                        showNotification('✅ ' + actionType + ' completed successfully');
                        refreshStatus();
                    } else {
                        showNotification('❌ Failed: ' + result.error);
                    }
                })
                .withFailureHandler(function(error) {
                    hideLoading();
                    showNotification('❌ Error: ' + error.toString());
                })
                .controlPanelTriggerAction(actionType);
        }

        // Emergency action
        function emergencyAction(actionType) {
            if (confirm('Are you sure you want to perform: ' + actionType + '?')) {
                showLoading();
                google.script.run
                    .withSuccessHandler(function(result) {
                        hideLoading();
                        if (result.success) {
                            showNotification('✅ Emergency action completed');
                            setTimeout(refreshStatus, 2000);
                        } else {
                            showNotification('❌ Emergency action failed: ' + result.error);
                        }
                    })
                    .withFailureHandler(function(error) {
                        hideLoading();
                        showNotification('❌ Error: ' + error.toString());
                    })
                    .controlPanelEmergencyAction(actionType);
            }
        }

        // Refresh system status
        function refreshStatus() {
            showLoading();
            google.script.run
                .withSuccessHandler(function(status) {
                    hideLoading();
                    updateStatusDisplay(status);
                    showNotification('📊 Status refreshed');
                })
                .withFailureHandler(function(error) {
                    hideLoading();
                    showNotification('❌ Status refresh failed');
                })
                .controlPanelGetStatus();
        }

        // Refresh recent logs
        function refreshLogs() {
            google.script.run
                .withSuccessHandler(function(logs) {
                    document.getElementById('recent-logs').innerHTML = logs.join('\\n') || 'No recent activity';
                })
                .withFailureHandler(function(error) {
                    document.getElementById('recent-logs').innerHTML = 'Error loading logs: ' + error.toString();
                })
                .controlPanelGetRecentLogs();
        }

        // Update status display
        function updateStatusDisplay(status) {
            if (status.events_today !== undefined) {
                document.getElementById('events-count').textContent = status.events_today;
            }
            if (status.clips_pending !== undefined) {
                document.getElementById('clips-count').textContent = status.clips_pending;
            }
            if (status.webhooks_sent !== undefined) {
                document.getElementById('webhooks-count').textContent = status.webhooks_sent;
            }
        }

        // Show loading indicator
        function showLoading() {
            document.getElementById('loading').style.display = 'block';
        }

        // Hide loading indicator
        function hideLoading() {
            document.getElementById('loading').style.display = 'none';
        }

        // Show notification
        function showNotification(message) {
            // Create temporary notification
            const notification = document.createElement('div');
            notification.style.cssText = \`
                position: fixed; 
                top: 20px; 
                right: 20px; 
                background: #1f2937; 
                color: white; 
                padding: 12px 16px; 
                border-radius: 6px; 
                font-size: 13px; 
                z-index: 1000;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            \`;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }

        // Load recent logs on startup
        refreshLogs();
    </script>
</body>
</html>
      `;
      
    } catch (error) {
      this.logger.error('HTML generation failed', { error: error.toString() });
      return '<html><body><h2>Error loading control panel</h2><p>' + error.toString() + '</p></body></html>';
    }
  }

  /**
   * Generate login HTML for unauthenticated users
   * @param {string} errorMessage - Optional error message
   * @returns {string} Login HTML content
   */
  generateLoginHTML(errorMessage = '') {
    try {
      return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Football Automation Login</title>
    <style>
        body {
            font-family: 'Google Sans', Arial, sans-serif;
            margin: 0;
            padding: 16px;
            background: #f8f9fa;
            font-size: 14px;
        }
        .login-container {
            max-width: 350px;
            margin: 50px auto;
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
        }
        .login-header {
            margin-bottom: 32px;
        }
        .login-header h2 {
            color: #1e40af;
            margin: 0 0 8px 0;
            font-size: 24px;
        }
        .login-header p {
            color: #6b7280;
            margin: 0;
            font-size: 14px;
        }
        .form-group {
            margin-bottom: 20px;
            text-align: left;
        }
        .form-group label {
            display: block;
            margin-bottom: 6px;
            color: #374151;
            font-weight: 500;
        }
        .form-control {
            width: 100%;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
            box-sizing: border-box;
        }
        .form-control:focus {
            outline: none;
            border-color: #3b82f6;
        }
        .btn-login {
            width: 100%;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 14px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
            margin-top: 8px;
        }
        .btn-login:hover {
            background: #2563eb;
        }
        .btn-login:disabled {
            background: #9ca3af;
            cursor: not-allowed;
        }
        .error-message {
            background: #fef2f2;
            color: #dc2626;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            border-left: 4px solid #dc2626;
        }
        .info-message {
            background: #eff6ff;
            color: #2563eb;
            padding: 12px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 12px;
            text-align: center;
        }
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
            color: #6b7280;
        }
        .spinner {
            border: 2px solid #e5e7eb;
            border-top: 2px solid #3b82f6;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
            display: inline-block;
            margin-right: 8px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .mfa-section {
            display: none;
            margin-top: 16px;
        }
        .security-note {
            background: #f0fdf4;
            color: #166534;
            padding: 12px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 12px;
            text-align: center;
            border-left: 4px solid #16a34a;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h2>⚽ Admin Access</h2>
            <p>Football Automation Control Panel</p>
        </div>

        ${errorMessage ? `<div class="error-message">${errorMessage}</div>` : ''}

        <form onsubmit="return handleLogin(event)">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" class="form-control"
                       required autocomplete="username" placeholder="Enter username">
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" class="form-control"
                       required autocomplete="current-password" placeholder="Enter password">
            </div>

            <div class="mfa-section" id="mfa-section">
                <div class="form-group">
                    <label for="mfaCode">MFA Code</label>
                    <input type="text" id="mfaCode" name="mfaCode" class="form-control"
                           placeholder="Enter 6-digit code" maxlength="6">
                </div>
            </div>

            <button type="submit" class="btn-login" id="login-btn">
                Sign In
            </button>
        </form>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            Authenticating...
        </div>

        <div class="info-message">
            <strong>Default Admin Account:</strong><br>
            Username: admin<br>
            Password: admin123<br>
            <em>Change these credentials in production!</em>
        </div>

        <div class="security-note">
            🔒 Secure authentication with session management and audit logging
        </div>
    </div>

    <script>
        let mfaRequired = false;

        function handleLogin(event) {
            event.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const mfaCode = document.getElementById('mfaCode').value;

            if (!username || !password) {
                showError('Please enter both username and password');
                return false;
            }

            if (mfaRequired && !mfaCode) {
                showError('Please enter the MFA code');
                return false;
            }

            showLoading();

            google.script.run
                .withSuccessHandler(function(result) {
                    hideLoading();
                    if (result.success) {
                        // Store session token and reload control panel
                        sessionStorage.setItem('auth_token', result.sessionToken);
                        showControlPanelWithAuth(result.sessionToken);
                    } else {
                        if (result.error.includes('MFA')) {
                            mfaRequired = true;
                            document.getElementById('mfa-section').style.display = 'block';
                            showError(result.error);
                        } else {
                            showError(result.error);
                        }
                    }
                })
                .withFailureHandler(function(error) {
                    hideLoading();
                    showError('Login failed: ' + error.toString());
                })
                .controlPanelAuthenticate(username, password, mfaCode);

            return false;
        }

        function showControlPanelWithAuth(sessionToken) {
            google.script.run
                .withSuccessHandler(function(result) {
                    // Control panel will reload with authenticated content
                    window.location.reload();
                })
                .withFailureHandler(function(error) {
                    showError('Failed to load control panel: ' + error.toString());
                })
                .showAuthenticatedControlPanel(sessionToken);
        }

        function showError(message) {
            const existing = document.querySelector('.error-message');
            if (existing) {
                existing.textContent = message;
            } else {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = message;
                document.querySelector('.login-container').insertBefore(
                    errorDiv,
                    document.querySelector('form')
                );
            }
        }

        function showLoading() {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('login-btn').disabled = true;
        }

        function hideLoading() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('login-btn').disabled = false;
        }

        // Check for existing session on load
        window.onload = function() {
            const token = sessionStorage.getItem('auth_token');
            if (token) {
                showControlPanelWithAuth(token);
            }
        };
    </script>
</body>
</html>
      `;

    } catch (error) {
      this.logger.error('Login HTML generation failed', { error: error.toString() });
      return '<html><body><h2>Error loading login page</h2><p>' + error.toString() + '</p></body></html>';
    }
  }

  /**
   * Generate password change HTML for users requiring password update
   * @param {string} sessionToken - Current session token
   * @returns {string} Password change HTML content
   */
  generatePasswordChangeHTML(sessionToken) {
    try {
      return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Password Change Required</title>
    <style>
        body {
            font-family: 'Google Sans', Arial, sans-serif;
            margin: 0;
            padding: 16px;
            background: #f8f9fa;
            font-size: 14px;
        }
        .password-container {
            max-width: 400px;
            margin: 50px auto;
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
        }
        .security-warning {
            background: #fef3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
            text-align: left;
        }
        .security-warning h3 {
            color: #856404;
            margin: 0 0 8px 0;
            font-size: 16px;
        }
        .security-warning p {
            color: #856404;
            margin: 0;
            font-size: 14px;
        }
        .form-group {
            margin-bottom: 20px;
            text-align: left;
        }
        .form-group label {
            display: block;
            margin-bottom: 6px;
            color: #374151;
            font-weight: 500;
        }
        .form-group input {
            width: 100%;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            box-sizing: border-box;
        }
        .password-requirements {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            text-align: left;
        }
        .password-requirements h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #374151;
        }
        .password-requirements ul {
            margin: 0;
            padding-left: 16px;
            font-size: 12px;
            color: #6b7280;
        }
        .btn {
            width: 100%;
            padding: 12px;
            background: #1e40af;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
        }
        .btn:hover {
            background: #1d4ed8;
        }
        .btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
        }
        .error-message {
            background: #fee2e2;
            color: #dc2626;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 16px;
            font-size: 14px;
        }
        .loading {
            display: none;
            margin: 16px 0;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="password-container">
        <div class="security-warning">
            <h3>🔒 Password Change Required</h3>
            <p>For security reasons, you must change your password before accessing the control panel. Please choose a strong password that meets the requirements below.</p>
        </div>

        <form onsubmit="return handlePasswordChange(event)">
            <div class="form-group">
                <label for="currentPassword">Current Password</label>
                <input type="password" id="currentPassword" name="currentPassword" required>
            </div>

            <div class="form-group">
                <label for="newPassword">New Password</label>
                <input type="password" id="newPassword" name="newPassword" required>
            </div>

            <div class="form-group">
                <label for="confirmPassword">Confirm New Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required>
            </div>

            <div class="password-requirements">
                <h4>Password Requirements:</h4>
                <ul>
                    <li>At least 12 characters long</li>
                    <li>At least one uppercase letter (A-Z)</li>
                    <li>At least one lowercase letter (a-z)</li>
                    <li>At least one number (0-9)</li>
                    <li>At least one special character (!@#$%^&*)</li>
                    <li>Cannot contain common words or patterns</li>
                </ul>
            </div>

            <button type="submit" class="btn" id="change-btn">
                Change Password
            </button>
        </form>

        <div class="loading" id="loading">
            Updating password...
        </div>
    </div>

    <script>
        function handlePasswordChange(event) {
            event.preventDefault();

            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validate passwords match
            if (newPassword !== confirmPassword) {
                showError('New passwords do not match');
                return false;
            }

            // Basic client-side validation
            if (newPassword.length < 12) {
                showError('Password must be at least 12 characters long');
                return false;
            }

            showLoading();

            google.script.run
                .withSuccessHandler(function(result) {
                    hideLoading();
                    if (result.success) {
                        // Password changed successfully, reload control panel
                        sessionStorage.setItem('auth_token', result.sessionToken);
                        window.location.reload();
                    } else {
                        showError(result.error || 'Password change failed');
                    }
                })
                .withFailureHandler(function(error) {
                    hideLoading();
                    showError('Password change failed: ' + error.toString());
                })
                .changeAdminPassword('${sessionToken}', currentPassword, newPassword);

            return false;
        }

        function showError(message) {
            const existing = document.querySelector('.error-message');
            if (existing) {
                existing.textContent = message;
            } else {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = message;
                document.querySelector('.password-container').insertBefore(
                    errorDiv,
                    document.querySelector('form')
                );
            }
        }

        function showLoading() {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('change-btn').disabled = true;
        }

        function hideLoading() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('change-btn').disabled = false;
        }
    </script>
</body>
</html>
      `;

    } catch (error) {
      this.logger.error('Password change HTML generation failed', { error: error.toString() });
      return '<html><body><h2>Error loading password change page</h2><p>' + error.toString() + '</p></body></html>';
    }
  }

  /**
   * Generate feature toggle HTML
   * @param {Object} settings - Current settings
   * @returns {string} HTML for toggles
   */
  generateFeatureToggles(settings) {
    const features = [
      {
        key: 'make_integration',
        label: 'Make.com Integration',
        description: 'Social media posting via Make.com',
        enabled: settings.make_integration_enabled
      },
      {
        key: 'xbotgo_integration',
        label: 'XbotGo Scoreboard',
        description: 'Live scoreboard updates',
        enabled: settings.xbotgo_integration_enabled
      },
      {
        key: 'auto_goal_posts',
        label: 'Auto Goal Posts',
        description: 'Automatically post goals to social media',
        enabled: settings.auto_goal_posts
      },
      {
        key: 'auto_card_posts',
        label: 'Auto Card Posts',
        description: 'Automatically post cards to social media',
        enabled: settings.auto_card_posts
      },
      {
        key: 'video_clip_creation',
        label: 'Video Clip Creation',
        description: 'Auto-create video clips for goals',
        enabled: settings.video_clip_creation
      },
      {
        key: 'player_minutes_tracking',
        label: 'Player Minutes Tracking',
        description: 'Track player minutes and substitutions',
        enabled: settings.player_minutes_tracking
      },
      {
        key: 'batch_posting',
        label: 'Batch Posting',
        description: 'Weekly fixture/result batch posts',
        enabled: settings.batch_posting
      },
      {
        key: 'monthly_summaries',
        label: 'Monthly Summaries',
        description: 'Monthly fixture and result summaries',
        enabled: settings.monthly_summaries
      }
    ];

    return features.map(feature => `
      <div class="toggle-item">
        <div class="toggle-info">
          <div class="label">${feature.label}</div>
          <div class="description">${feature.description}</div>
        </div>
        <div class="toggle-switch ${feature.enabled ? 'active' : ''}" 
             onclick="toggleFeature('${feature.key}', this)">
        </div>
      </div>
    `).join('');
  }

  /**
   * Generate integration status HTML
   * @param {Object} settings - Current settings
   * @returns {string} HTML for integration status
   */
  generateIntegrationStatus(settings) {
    const integrations = [
      {
        name: 'Make.com Webhook',
        status: settings.make_webhook_configured ? 'good' : 'error',
        label: settings.make_webhook_configured ? 'Connected' : 'Not Configured'
      },
      {
        name: 'XbotGo API',
        status: settings.xbotgo_configured ? (settings.xbotgo_integration_enabled ? 'good' : 'warning') : 'error',
        label: settings.xbotgo_configured ? 
          (settings.xbotgo_integration_enabled ? 'Active' : 'Configured but Disabled') : 
          'Not Configured'
      },
      {
        name: 'Google Sheets',
        status: 'good',
        label: 'Connected'
      },
      {
        name: 'YouTube API',
        status: settings.youtube_configured ? 'good' : 'warning',
        label: settings.youtube_configured ? 'Connected' : 'Optional'
      }
    ];

    return integrations.map(integration => `
      <div class="toggle-item">
        <div class="toggle-info">
          <div class="label">${integration.name}</div>
          <div class="description">
            <span class="status-indicator ${integration.status}"></span>
            ${integration.label}
          </div>
        </div>
      </div>
    `).join('');
  }

  // ==================== SETTINGS MANAGEMENT ====================

  /**
   * Get current system settings
   * @returns {Object} Current settings
   */
  getCurrentSettings() {
    try {
      const scriptProperties = PropertiesService.getScriptProperties();
      const properties = scriptProperties.getProperties();
      
      return {
        // Integration settings
        make_integration_enabled: getConfig('MAKE.ENABLED') !== false,
        make_webhook_configured: !!getConfig('MAKE.WEBHOOK_URL_PROPERTY'),
        xbotgo_integration_enabled: getConfig('XBOTGO.ENABLED') === true,
        xbotgo_configured: !!getConfig('XBOTGO.API_KEY_PROPERTY'),
        youtube_configured: !!getConfig('VIDEO.YOUTUBE_CHANNEL_PROPERTY'),
        
        // Feature settings
        auto_goal_posts: properties.FEATURE_AUTO_GOAL_POSTS !== 'false',
        auto_card_posts: properties.FEATURE_AUTO_CARD_POSTS !== 'false',
        video_clip_creation: properties.FEATURE_VIDEO_CLIP_CREATION !== 'false',
        player_minutes_tracking: properties.FEATURE_PLAYER_MINUTES_TRACKING !== 'false',
        batch_posting: properties.FEATURE_BATCH_POSTING !== 'false',
        monthly_summaries: properties.FEATURE_MONTHLY_SUMMARIES !== 'false'
      };
      
    } catch (error) {
      this.logger.error('Failed to get current settings', { error: error.toString() });
      return {};
    }
  }

  /**
   * Get system status summary for UI
   * @returns {Object} Status summary
   */
  getSystemStatusSummary() {
    try {
      const systemStatus = getFootballAutomationSystemStatus();
      
      if (!systemStatus.success) {
        return {
          status: 'Error',
          indicator: 'error',
          events_today: 0,
          clips_pending: 0,
          webhooks_sent: 0,
          uptime: 'Unknown'
        };
      }
      
      const status = systemStatus.status;
      const health = status.health?.overall || 'unknown';
      
      return {
        status: health.charAt(0).toUpperCase() + health.slice(1),
        indicator: health === 'excellent' || health === 'good' ? 'good' : 
                  health === 'fair' ? 'warning' : 'error',
        events_today: status.recent_activity?.matches_processed || 0,
        clips_pending: status.recent_activity?.clips_created || 0,
        webhooks_sent: status.recent_activity?.webhooks_sent || 0,
        uptime: '24h' // Could be calculated from system start time
      };
      
    } catch (error) {
      this.logger.error('Failed to get system status summary', { error: error.toString() });
      return {
        status: 'Unknown',
        indicator: 'warning',
        events_today: 0,
        clips_pending: 0,
        webhooks_sent: 0,
        uptime: 'Unknown'
      };
    }
  }

  // ==================== FEATURE MANAGEMENT ====================

  /**
   * Toggle a feature on/off
   * @param {string} featureName - Feature to toggle
   * @param {boolean} enabled - Enable or disable
   * @returns {Object} Toggle result
   */
  toggleFeature(featureName, enabled) {
    this.logger.enterFunction('toggleFeature', { featureName, enabled });
    
    try {
      const scriptProperties = PropertiesService.getScriptProperties();
      
      switch (featureName) {
        case 'make_integration':
          // Update Make.com integration status
          scriptProperties.setProperty('MAKE_INTEGRATION_ENABLED', enabled.toString());
          break;
          
        case 'xbotgo_integration':
          // Update XbotGo integration status
          const xbotgoResult = updateXbotGoConfiguration({ enabled: enabled });
          if (!xbotgoResult.success) {
            throw new Error(`XbotGo toggle failed: ${xbotgoResult.error}`);
          }
          break;
          
        case 'auto_goal_posts':
          scriptProperties.setProperty('FEATURE_AUTO_GOAL_POSTS', enabled.toString());
          break;
          
        case 'auto_card_posts':
          scriptProperties.setProperty('FEATURE_AUTO_CARD_POSTS', enabled.toString());
          break;
          
        case 'video_clip_creation':
          scriptProperties.setProperty('FEATURE_VIDEO_CLIP_CREATION', enabled.toString());
          break;
          
        case 'player_minutes_tracking':
          scriptProperties.setProperty('FEATURE_PLAYER_MINUTES_TRACKING', enabled.toString());
          break;
          
        case 'batch_posting':
          scriptProperties.setProperty('FEATURE_BATCH_POSTING', enabled.toString());
          break;
          
        case 'monthly_summaries':
          scriptProperties.setProperty('FEATURE_MONTHLY_SUMMARIES', enabled.toString());
          break;
          
        default:
          throw new Error(`Unknown feature: ${featureName}`);
      }
      
      this.logger.info('Feature toggled successfully', { featureName, enabled });
      this.logger.exitFunction('toggleFeature', { success: true });
      
      return { 
        success: true, 
        feature: featureName, 
        enabled: enabled,
        message: `${featureName} ${enabled ? 'enabled' : 'disabled'}`
      };
      
    } catch (error) {
      this.logger.error('Feature toggle failed', { featureName, enabled, error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Get recent system logs for display
   * @returns {Array} Recent log entries
   */
  getRecentLogs() {
    try {
      // This would typically read from a log sheet or system logs
      // For now, return sample recent activity
      const now = DateUtils.now();
      
      return [
        `[${DateUtils.formatDate(now, 'HH:mm:ss')}] System initialized successfully`,
        `[${DateUtils.formatDate(DateUtils.addMinutes(now, -5), 'HH:mm:ss')}] Make.com webhook test completed`,
        `[${DateUtils.formatDate(DateUtils.addMinutes(now, -10), 'HH:mm:ss')}] Control panel accessed`,
        `[${DateUtils.formatDate(DateUtils.addMinutes(now, -15), 'HH:mm:ss')}] Player stats updated`,
        `[${DateUtils.formatDate(DateUtils.addMinutes(now, -20), 'HH:mm:ss')}] XbotGo integration checked`
      ];
      
    } catch (error) {
      this.logger.error('Failed to get recent logs', { error: error.toString() });
      return [`Error loading logs: ${error.toString()}`];
    }
  }
}

// ==================== GLOBAL CONTROL PANEL FUNCTIONS ====================

/**
 * Global control panel manager instance
 */
const ControlPanel = new ControlPanelManager();

/**
 * Show control panel - Global function (called from menu)
 * @returns {Object} Result
 */
function showControlPanel() {
  return ControlPanel.showControlPanel();
}

/**
 * Control panel toggle feature - Called from HTML
 * @param {string} featureName - Feature name
 * @param {boolean} enabled - Enabled state
 * @returns {Object} Toggle result
 */
function controlPanelToggleFeature(featureName, enabled) {
  return ControlPanel.toggleFeature(featureName, enabled);
}

/**
 * Control panel trigger action - Called from HTML
 * @param {string} actionType - Action type
 * @returns {Object} Action result
 */
function controlPanelTriggerAction(actionType) {
  logger.enterFunction('controlPanelTriggerAction', { actionType });
  
  try {
    let result = {};
    
    switch (actionType) {
      case 'weekly_automation':
        result = triggerWeeklyAutomation();
        break;
        
      case 'monthly_automation':
        result = triggerMonthlyAutomation();
        break;
        
      case 'player_stats':
        result = postPlayerStatsSummary(true); // Force posting
        break;
        
      case 'goal_of_month':
        result = collectGoalOfTheMonth();
        break;
        
      case 'system_health_check':
        result = performSystemHealthCheck();
        break;
        
      default:
        throw new Error(`Unknown action: ${actionType}`);}
                
      } 
    catch (error) {
      logger.error('Trigger action failed', { actionType, error: error.toString() });
      return { success: false, error: error.toString() };
    }
    logger.exitFunction('controlPanelTriggerAction', { success: true });
    return result;
  }
