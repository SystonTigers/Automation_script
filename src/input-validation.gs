/**
 * @fileoverview Basic Input Validation for Football Automation System
 * @version 6.2.0
 * @description Practical input sanitization and validation
 */

/**
 * Input Validator - Basic security for user inputs
 */
class InputValidator {

  /**
   * Sanitize player name input
   */
  static sanitizePlayerName(input) {
    if (!input || typeof input !== 'string') return '';

    // Remove HTML/script tags and limit length
    return input
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>&"'/]/g, '') // Remove dangerous characters
      .trim()
      .substring(0, 50); // Limit length
  }

  /**
   * Validate and sanitize minute input
   */
  static validateMinute(input) {
    const minute = parseInt(input);
    if (isNaN(minute) || minute < 0 || minute > 120) {
      throw new Error('Invalid minute: must be between 0 and 120');
    }
    return minute;
  }

  /**
   * Validate score input
   */
  static validateScore(input) {
    const score = parseInt(input);
    if (isNaN(score) || score < 0 || score > 99) {
      throw new Error('Invalid score: must be between 0 and 99');
    }
    return score;
  }

  /**
   * Sanitize text input for sheets
   */
  static sanitizeText(input) {
    if (!input || typeof input !== 'string') return '';

    return input
      .replace(/[<>&"']/g, '') // Remove dangerous characters
      .trim()
      .substring(0, 500); // Reasonable length limit
  }

  /**
   * Validate email format
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if user has permission for action
   */
  static checkPermission(action) {
    try {
      const userEmail = Session.getActiveUser().getEmail();

      // Simple permission check - only authenticated users can perform actions
      if (!userEmail) {
        throw new Error('User not authenticated');
      }

      // Log security-relevant actions
      console.log(`Security check: ${userEmail} performing ${action}`);

      return { allowed: true, user: userEmail };

    } catch (error) {
      console.error('Permission check failed:', error);
      return { allowed: false, error: error.toString() };
    }
  }

  /**
   * Generate simple CSRF token
   */
  static generateCSRFToken() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `${timestamp}-${random}`;
  }

  /**
   * Validate CSRF token (basic implementation)
   */
  static validateCSRFToken(token, maxAge = 3600000) { // 1 hour default
    if (!token || typeof token !== 'string') return false;

    const parts = token.split('-');
    if (parts.length !== 2) return false;

    const timestamp = parseInt(parts[0]);
    if (isNaN(timestamp)) return false;

    const age = Date.now() - timestamp;
    return age <= maxAge;
  }
}

/**
 * Security helper functions for webapp endpoints
 */

/**
 * Validate and sanitize match event data
 */
function validateMatchEventData(eventData) {
  try {
    const validated = {
      eventType: InputValidator.sanitizeText(eventData.eventType),
      player: InputValidator.sanitizePlayerName(eventData.player),
      minute: InputValidator.validateMinute(eventData.minute),
      additionalData: {}
    };

    // Validate event type
    const validEventTypes = ['goal', 'card', 'substitution', 'half_time', 'full_time'];
    if (!validEventTypes.includes(validated.eventType)) {
      throw new Error(`Invalid event type: ${validated.eventType}`);
    }

    // Sanitize additional data if present
    if (eventData.additionalData && typeof eventData.additionalData === 'object') {
      Object.keys(eventData.additionalData).forEach(key => {
        const value = eventData.additionalData[key];
        if (typeof value === 'string') {
          validated.additionalData[key] = InputValidator.sanitizeText(value);
        } else if (typeof value === 'number') {
          validated.additionalData[key] = value;
        }
      });
    }

    return { valid: true, data: validated };

  } catch (error) {
    console.error('Event data validation failed:', error);
    return { valid: false, error: error.toString() };
  }
}

/**
 * Secure wrapper for webapp responses
 */
function createSecureResponse(data, success = true) {
  const response = {
    success: success,
    timestamp: new Date().toISOString(),
    data: data
  };

  if (!success) {
    response.error = data;
    delete response.data;
  }

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Rate limiting helper (basic implementation)
 */
class RateLimiter {
  static limits = new Map();

  static checkLimit(identifier, maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    this.limits.forEach((requests, key) => {
      this.limits.set(key, requests.filter(time => time > windowStart));
    });

    // Check current identifier
    const requests = this.limits.get(identifier) || [];

    if (requests.length >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: requests[0] + windowMs };
    }

    // Add current request
    requests.push(now);
    this.limits.set(identifier, requests);

    return {
      allowed: true,
      remaining: maxRequests - requests.length,
      resetTime: now + windowMs
    };
  }
}

/**
 * Secure webhook handler wrapper
 */
function secureWebhookHandler(handlerFunction, requireAuth = true) {
  return function(e) {
    try {
      // Basic rate limiting
      const userEmail = Session.getActiveUser().getEmail();
      const rateLimit = RateLimiter.checkLimit(userEmail || 'anonymous', 20, 60000);

      if (!rateLimit.allowed) {
        return createSecureResponse('Rate limit exceeded', false);
      }

      // Authentication check
      if (requireAuth) {
        const permission = InputValidator.checkPermission('webhook_access');
        if (!permission.allowed) {
          return createSecureResponse('Access denied', false);
        }
      }

      // Input validation
      let requestData = {};
      if (e.postData && e.postData.contents) {
        try {
          requestData = JSON.parse(e.postData.contents);
        } catch (parseError) {
          return createSecureResponse('Invalid JSON data', false);
        }
      }

      // Call the actual handler
      const result = handlerFunction(requestData, e);
      return createSecureResponse(result);

    } catch (error) {
      console.error('Secure webhook handler error:', error);
      return createSecureResponse(error.toString(), false);
    }
  };
}