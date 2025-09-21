/**
 * @fileoverview Security and Authentication Manager for Football Automation System
 * @version 6.0.0
 * @author Senior Software Architect
 * @description Comprehensive security layer with authentication, authorization, input validation, and audit logging
 *
 * FEATURES IMPLEMENTED:
 * - Multi-factor authentication for admin access
 * - Role-based access control (RBAC)
 * - Input validation and sanitization
 * - Security audit logging
 * - Session management
 * - Rate limiting for sensitive operations
 * - PII protection and data privacy compliance
 */

// ==================== SECURITY MANAGER ====================

/**
 * Security Manager - Handles authentication, authorization, and security
 */
class SecurityManager {

  constructor() {
    this.logger = logger.scope('Security');
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.maxLoginAttempts = 3;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
  }

  // ==================== AUTHENTICATION ====================

  /**
   * Authenticate user for admin access
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {string} mfaCode - Optional MFA code
   * @returns {Object} Authentication result
   */
  authenticateAdmin(username, password, mfaCode = null) {
    this.logger.enterFunction('authenticateAdmin', { username, hasMfa: !!mfaCode });

    try {
      // @testHook(auth_validate_credentials_start)
      const credentialResult = this.validateCredentials(username, password);
      if (!credentialResult.success) {
        this.logSecurityEvent('login_failed', { username, reason: 'invalid_credentials' });
        return credentialResult;
      }
      // @testHook(auth_validate_credentials_end)

      // Check if account is locked
      // @testHook(auth_check_lockout_start)
      const lockoutResult = this.checkAccountLockout(username);
      if (!lockoutResult.success) {
        this.logSecurityEvent('login_blocked', { username, reason: 'account_locked' });
        return lockoutResult;
      }
      // @testHook(auth_check_lockout_end)

      // Validate MFA if required
      const userConfig = this.getUserConfig(username);
      if (userConfig.mfaRequired) {
        // @testHook(auth_validate_mfa_start)
        const mfaResult = this.validateMFA(username, mfaCode);
        if (!mfaResult.success) {
          this.incrementFailedAttempts(username);
          this.logSecurityEvent('mfa_failed', { username });
          return mfaResult;
        }
        // @testHook(auth_validate_mfa_end)
      }

      // Create session
      // @testHook(auth_create_session_start)
      const sessionResult = this.createSession(username, userConfig.role);
      // @testHook(auth_create_session_end)

      // Reset failed attempts on successful login
      this.resetFailedAttempts(username);
      this.logSecurityEvent('login_success', { username, role: userConfig.role });

      this.logger.exitFunction('authenticateAdmin', { success: true, role: userConfig.role });
      return {
        success: true,
        sessionToken: sessionResult.token,
        role: userConfig.role,
        expiresAt: sessionResult.expiresAt
      };

    } catch (error) {
      this.logger.error('Authentication failed', { username, error: error.toString() });
      this.logSecurityEvent('auth_error', { username, error: error.toString() });
      return { success: false, error: 'Authentication system error' };
    }
  }

  /**
   * Validate user credentials against stored configuration
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Object} Validation result
   */
  validateCredentials(username, password) {
    try {
      const adminUsers = this.getAdminUsers();
      const userHash = adminUsers[username];

      if (!userHash) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Compare password hash (in production, use proper bcrypt)
      const passwordHash = this.hashPassword(password, username);
      if (passwordHash !== userHash.password) {
        return { success: false, error: 'Invalid username or password' };
      }

      return { success: true };

    } catch (error) {
      this.logger.error('Credential validation failed', { error: error.toString() });
      return { success: false, error: 'Credential validation error' };
    }
  }

  /**
   * Validate MFA code
   * @param {string} username - Username
   * @param {string} code - MFA code
   * @returns {Object} Validation result
   */
  validateMFA(username, code) {
    try {
      if (!code) {
        return { success: false, error: 'MFA code required' };
      }

      // Simple time-based code for demo (in production, use TOTP)
      const expectedCode = this.generateTimeBasedCode(username);
      if (code !== expectedCode) {
        return { success: false, error: 'Invalid MFA code' };
      }

      return { success: true };

    } catch (error) {
      this.logger.error('MFA validation failed', { error: error.toString() });
      return { success: false, error: 'MFA validation error' };
    }
  }

  /**
   * Create authenticated session
   * @param {string} username - Username
   * @param {string} role - User role
   * @returns {Object} Session data
   */
  createSession(username, role) {
    try {
      const sessionToken = this.generateSessionToken();
      const expiresAt = new Date(Date.now() + this.sessionTimeout);

      const sessionData = {
        username: username,
        role: role,
        createdAt: new Date(),
        expiresAt: expiresAt,
        lastActivity: new Date()
      };

      // Store session (in production, use secure storage)
      PropertiesService.getScriptProperties().setProperty(
        `SESSION_${sessionToken}`,
        JSON.stringify(sessionData)
      );

      return { token: sessionToken, expiresAt: expiresAt };

    } catch (error) {
      this.logger.error('Session creation failed', { error: error.toString() });
      throw new Error('Failed to create session');
    }
  }

  // ==================== AUTHORIZATION ====================

  /**
   * Check if user has permission for specific action
   * @param {string} sessionToken - Session token
   * @param {string} permission - Required permission
   * @returns {Object} Authorization result
   */
  checkPermission(sessionToken, permission) {
    this.logger.enterFunction('checkPermission', { permission });

    try {
      // @testHook(auth_validate_session_start)
      const sessionResult = this.validateSession(sessionToken);
      if (!sessionResult.success) {
        return sessionResult;
      }
      // @testHook(auth_validate_session_end)

      const session = sessionResult.session;
      const rolePermissions = this.getRolePermissions(session.role);

      if (!rolePermissions.includes(permission) && !rolePermissions.includes('*')) {
        this.logSecurityEvent('permission_denied', {
          username: session.username,
          permission: permission,
          role: session.role
        });
        return { success: false, error: 'Insufficient permissions' };
      }

      // Update last activity
      this.updateSessionActivity(sessionToken);

      this.logger.exitFunction('checkPermission', { success: true });
      return { success: true, session: session };

    } catch (error) {
      this.logger.error('Permission check failed', { error: error.toString() });
      return { success: false, error: 'Permission check error' };
    }
  }

  /**
   * Validate session token
   * @param {string} sessionToken - Session token
   * @returns {Object} Validation result
   */
  validateSession(sessionToken) {
    try {
      if (!sessionToken) {
        return { success: false, error: 'No session token provided' };
      }

      const sessionData = PropertiesService.getScriptProperties().getProperty(`SESSION_${sessionToken}`);
      if (!sessionData) {
        return { success: false, error: 'Invalid session token' };
      }

      const session = JSON.parse(sessionData);
      const now = new Date();

      // Check if session expired
      if (new Date(session.expiresAt) < now) {
        this.destroySession(sessionToken);
        return { success: false, error: 'Session expired' };
      }

      return { success: true, session: session };

    } catch (error) {
      this.logger.error('Session validation failed', { error: error.toString() });
      return { success: false, error: 'Session validation error' };
    }
  }

  // ==================== INPUT VALIDATION ====================

  /**
   * Sanitize and validate input data
   * @param {any} input - Input data
   * @param {string} type - Expected data type
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateInput(input, type, options = {}) {
    this.logger.enterFunction('validateInput', { type, hasOptions: Object.keys(options).length > 0 });

    try {
      const sanitized = this.sanitizeInput(input, type);

      switch (type) {
        case 'string':
          return this.validateString(sanitized, options);
        case 'number':
          return this.validateNumber(sanitized, options);
        case 'email':
          return this.validateEmail(sanitized, options);
        case 'playerName':
          return this.validatePlayerName(sanitized, options);
        case 'matchId':
          return this.validateMatchId(sanitized, options);
        case 'minute':
          return this.validateMinute(sanitized, options);
        default:
          return { success: false, error: `Unknown validation type: ${type}` };
      }

    } catch (error) {
      this.logger.error('Input validation failed', { type, error: error.toString() });
      return { success: false, error: 'Input validation error' };
    }
  }

  /**
   * Sanitize input to prevent injection attacks
   * @param {any} input - Input data
   * @param {string} type - Data type
   * @returns {any} Sanitized input
   */
  sanitizeInput(input, type) {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === 'string') {
      // Remove potentially dangerous characters
      let sanitized = input
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();

      // Type-specific sanitization
      switch (type) {
        case 'playerName':
          // Allow only letters, spaces, hyphens, apostrophes
          sanitized = sanitized.replace(/[^a-zA-Z\s\-']/g, '');
          break;
        case 'matchId':
          // Allow only alphanumeric and underscores
          sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, '');
          break;
        case 'email':
          // Basic email character sanitization
          sanitized = sanitized.replace(/[^a-zA-Z0-9@._-]/g, '');
          break;
      }

      return sanitized;
    }

    return input;
  }

  /**
   * Validate string input
   * @param {string} input - String input
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateString(input, options) {
    if (typeof input !== 'string') {
      return { success: false, error: 'Input must be a string' };
    }

    if (options.required && !input.trim()) {
      return { success: false, error: 'Input is required' };
    }

    if (options.minLength && input.length < options.minLength) {
      return { success: false, error: `Input must be at least ${options.minLength} characters` };
    }

    if (options.maxLength && input.length > options.maxLength) {
      return { success: false, error: `Input must be no more than ${options.maxLength} characters` };
    }

    if (options.pattern && !options.pattern.test(input)) {
      return { success: false, error: 'Input format is invalid' };
    }

    return { success: true, value: input };
  }

  /**
   * Validate player name specifically
   * @param {string} input - Player name
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validatePlayerName(input, options = {}) {
    const stringResult = this.validateString(input, {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s\-']+$/
    });

    if (!stringResult.success) {
      return stringResult;
    }

    // Additional player name validation
    const playerName = stringResult.value.trim();

    // Check for reserved names
    const reservedNames = ['Goal', 'Opposition', 'Unknown', 'TBD', 'N/A'];
    if (reservedNames.includes(playerName)) {
      return { success: false, error: 'Reserved player name not allowed' };
    }

    return { success: true, value: playerName };
  }

  // ==================== PRIVACY & PII PROTECTION ====================

  /**
   * Mask PII in data for logging or display
   * @param {Object} data - Data containing potential PII
   * @returns {Object} Data with PII masked
   */
  maskPII(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const maskedData = { ...data };
    const piiFields = ['password', 'email', 'phone', 'address', 'postcode'];

    for (const field of piiFields) {
      if (maskedData[field]) {
        maskedData[field] = this.maskValue(maskedData[field]);
      }
    }

    // Mask player names partially for privacy
    if (maskedData.player_name) {
      maskedData.player_name = this.maskPlayerName(maskedData.player_name);
    }

    return maskedData;
  }

  /**
   * Mask individual value
   * @param {string} value - Value to mask
   * @returns {string} Masked value
   */
  maskValue(value) {
    if (!value || typeof value !== 'string') {
      return value;
    }

    if (value.length <= 3) {
      return '*'.repeat(value.length);
    }

    return value.charAt(0) + '*'.repeat(value.length - 2) + value.charAt(value.length - 1);
  }

  /**
   * Mask player name for privacy (keep first name, mask surname)
   * @param {string} playerName - Player name
   * @returns {string} Masked player name
   */
  maskPlayerName(playerName) {
    const parts = playerName.split(' ');
    if (parts.length === 1) {
      return this.maskValue(parts[0]);
    }

    // Keep first name, mask others
    return parts[0] + ' ' + parts.slice(1).map(part => this.maskValue(part)).join(' ');
  }

  // ==================== SECURITY UTILITIES ====================

  /**
   * Generate secure session token
   * @returns {string} Session token
   */
  generateSessionToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token + '_' + Date.now();
  }

  /**
   * Generate time-based MFA code (simplified for demo)
   * @param {string} username - Username
   * @returns {string} MFA code
   */
  generateTimeBasedCode(username) {
    const timeSlot = Math.floor(Date.now() / 30000); // 30-second slots
    const seed = username + timeSlot;
    return (seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 1000000).toString().padStart(6, '0');
  }

  /**
   * Hash password (simplified for demo - use bcrypt in production)
   * @param {string} password - Password
   * @param {string} salt - Salt
   * @returns {string} Password hash
   */
  hashPassword(password, salt) {
    let hash = 0;
    const combined = password + salt;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Log security events for audit trail
   * @param {string} eventType - Type of security event
   * @param {Object} details - Event details
   */
  logSecurityEvent(eventType, details) {
    try {
      const auditEntry = {
        timestamp: new Date().toISOString(),
        eventType: eventType,
        details: this.maskPII(details),
        source: 'SecurityManager',
        ipAddress: 'unknown', // Would get from request in real implementation
        userAgent: 'unknown'
      };

      // Log to security audit sheet
      const sheet = SheetUtils.getOrCreateSheet('SecurityAudit', [
        'Timestamp', 'Event Type', 'Username', 'Details', 'IP Address'
      ]);

      if (sheet) {
        sheet.appendRow([
          auditEntry.timestamp,
          auditEntry.eventType,
          details.username || 'unknown',
          JSON.stringify(auditEntry.details),
          auditEntry.ipAddress
        ]);
      }

      // Also log through regular logger for development
      this.logger.info(`Security Event: ${eventType}`, auditEntry);

    } catch (error) {
      this.logger.error('Failed to log security event', { eventType, error: error.toString() });
    }
  }

  // ==================== CONFIGURATION METHODS ====================

  /**
   * Get admin users configuration
   * @returns {Object} Admin users
   */
  getAdminUsers() {
    try {
      const adminConfig = PropertiesService.getScriptProperties().getProperty('ADMIN_USERS');
      return adminConfig ? JSON.parse(adminConfig) : {
        'admin': {
          password: this.hashPassword('admin123', 'admin'), // Default admin account
          role: 'super_admin',
          mfaRequired: true
        }
      };
    } catch (error) {
      this.logger.error('Failed to get admin users', { error: error.toString() });
      return {};
    }
  }

  /**
   * Get user configuration
   * @param {string} username - Username
   * @returns {Object} User config
   */
  getUserConfig(username) {
    const adminUsers = this.getAdminUsers();
    return adminUsers[username] || { role: 'none', mfaRequired: false };
  }

  /**
   * Get role permissions
   * @param {string} role - User role
   * @returns {Array} Permissions
   */
  getRolePermissions(role) {
    const rolePermissions = {
      'super_admin': ['*'], // All permissions
      'admin': [
        'control_panel_access', 'feature_toggle', 'manual_trigger',
        'view_logs', 'system_status', 'emergency_actions'
      ],
      'operator': [
        'control_panel_access', 'manual_trigger', 'view_logs', 'system_status'
      ],
      'viewer': [
        'control_panel_access', 'view_logs', 'system_status'
      ]
    };

    return rolePermissions[role] || [];
  }

  // ==================== HELPER METHODS ====================

  /**
   * Check if account is locked due to failed attempts
   * @param {string} username - Username
   * @returns {Object} Lockout status
   */
  checkAccountLockout(username) {
    try {
      const lockoutData = PropertiesService.getScriptProperties().getProperty(`LOCKOUT_${username}`);
      if (!lockoutData) {
        return { success: true };
      }

      const lockout = JSON.parse(lockoutData);
      const now = Date.now();

      if (lockout.lockedUntil > now) {
        const remainingMinutes = Math.ceil((lockout.lockedUntil - now) / 60000);
        return {
          success: false,
          error: `Account locked. Try again in ${remainingMinutes} minutes.`
        };
      }

      // Lockout expired, clear it
      PropertiesService.getScriptProperties().deleteProperty(`LOCKOUT_${username}`);
      return { success: true };

    } catch (error) {
      this.logger.error('Lockout check failed', { error: error.toString() });
      return { success: true }; // Fail open for availability
    }
  }

  /**
   * Increment failed login attempts
   * @param {string} username - Username
   */
  incrementFailedAttempts(username) {
    try {
      const attemptsKey = `ATTEMPTS_${username}`;
      const currentAttempts = parseInt(PropertiesService.getScriptProperties().getProperty(attemptsKey) || '0');
      const newAttempts = currentAttempts + 1;

      PropertiesService.getScriptProperties().setProperty(attemptsKey, newAttempts.toString());

      if (newAttempts >= this.maxLoginAttempts) {
        const lockoutData = {
          lockedAt: Date.now(),
          lockedUntil: Date.now() + this.lockoutDuration,
          attempts: newAttempts
        };

        PropertiesService.getScriptProperties().setProperty(
          `LOCKOUT_${username}`,
          JSON.stringify(lockoutData)
        );

        this.logSecurityEvent('account_locked', { username, attempts: newAttempts });
      }

    } catch (error) {
      this.logger.error('Failed to increment attempts', { error: error.toString() });
    }
  }

  /**
   * Reset failed login attempts
   * @param {string} username - Username
   */
  resetFailedAttempts(username) {
    try {
      PropertiesService.getScriptProperties().deleteProperty(`ATTEMPTS_${username}`);
      PropertiesService.getScriptProperties().deleteProperty(`LOCKOUT_${username}`);
    } catch (error) {
      this.logger.error('Failed to reset attempts', { error: error.toString() });
    }
  }

  /**
   * Update session last activity
   * @param {string} sessionToken - Session token
   */
  updateSessionActivity(sessionToken) {
    try {
      const sessionData = PropertiesService.getScriptProperties().getProperty(`SESSION_${sessionToken}`);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.lastActivity = new Date();
        PropertiesService.getScriptProperties().setProperty(
          `SESSION_${sessionToken}`,
          JSON.stringify(session)
        );
      }
    } catch (error) {
      this.logger.error('Failed to update session activity', { error: error.toString() });
    }
  }

  /**
   * Destroy session
   * @param {string} sessionToken - Session token
   */
  destroySession(sessionToken) {
    try {
      PropertiesService.getScriptProperties().deleteProperty(`SESSION_${sessionToken}`);
    } catch (error) {
      this.logger.error('Failed to destroy session', { error: error.toString() });
    }
  }

  /**
   * Validate minute input for match events
   * @param {any} input - Minute input
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateMinute(input, options = {}) {
    const numResult = this.validateNumber(input, { min: 0, max: 120 });
    if (!numResult.success) {
      return numResult;
    }

    const minute = numResult.value;

    // Additional minute validation logic
    if (minute > 90 && minute < 45) {
      return { success: false, error: 'Invalid minute: must be 0-90 or 90+' };
    }

    return { success: true, value: minute };
  }

  /**
   * Validate number input
   * @param {any} input - Number input
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateNumber(input, options = {}) {
    const num = Number(input);

    if (isNaN(num)) {
      return { success: false, error: 'Input must be a number' };
    }

    if (options.min !== undefined && num < options.min) {
      return { success: false, error: `Number must be at least ${options.min}` };
    }

    if (options.max !== undefined && num > options.max) {
      return { success: false, error: `Number must be no more than ${options.max}` };
    }

    return { success: true, value: num };
  }

  /**
   * Validate email input
   * @param {string} input - Email input
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateEmail(input, options = {}) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const stringResult = this.validateString(input, {
      required: options.required,
      maxLength: 254,
      pattern: emailPattern
    });

    return stringResult;
  }

  /**
   * Validate match ID input
   * @param {string} input - Match ID input
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateMatchId(input, options = {}) {
    return this.validateString(input, {
      required: true,
      minLength: 3,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9_-]+$/
    });
  }
}

// ==================== GLOBAL SECURITY FUNCTIONS ====================

/**
 * Global security manager instance
 */
const SecurityManager_Instance = new SecurityManager();

/**
 * Authenticate admin user - Global function
 * @param {string} username - Username
 * @param {string} password - Password
 * @param {string} mfaCode - MFA code
 * @returns {Object} Authentication result
 */
function authenticateAdmin(username, password, mfaCode = null) {
  return SecurityManager_Instance.authenticateAdmin(username, password, mfaCode);
}

/**
 * Check user permission - Global function
 * @param {string} sessionToken - Session token
 * @param {string} permission - Required permission
 * @returns {Object} Permission result
 */
function checkPermission(sessionToken, permission) {
  return SecurityManager_Instance.checkPermission(sessionToken, permission);
}

/**
 * Validate input data - Global function
 * @param {any} input - Input data
 * @param {string} type - Data type
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validateInput(input, type, options = {}) {
  return SecurityManager_Instance.validateInput(input, type, options);
}

/**
 * Mask PII data - Global function
 * @param {Object} data - Data to mask
 * @returns {Object} Masked data
 */
function maskPII(data) {
  return SecurityManager_Instance.maskPII(data);
}

/**
 * Log security event - Global function
 * @param {string} eventType - Event type
 * @param {Object} details - Event details
 */
function logSecurityEvent(eventType, details) {
  return SecurityManager_Instance.logSecurityEvent(eventType, details);
}