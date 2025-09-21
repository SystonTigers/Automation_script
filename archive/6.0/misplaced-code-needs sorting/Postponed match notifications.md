/**
 * Post postponed match to Make.com
 * @param {Object} payload - Make.com payload
 * @returns {Object} Posting result
 */
postPostponedToMake(payload) {
  logger.testHook('postponed_make_posting', { eventType: payload?.event_type });
  
  try {
    if (!payload) {
      return { success: false, error: error.toString() };
  }
}


// ===== POSTPONEMENT DETECTION AND AUTOMATION =====


/**
 * Automatically detect postponed matches from email notifications
 * @param {string} emailSubject - Email subject line
 * @param {string} emailBody - Email body content
 * @returns {Object} Detection result
 */
detectPostponementFromEmail(emailSubject, emailBody) {
  logger.enterFunction('EnhancedEventsManager.detectPostponementFromEmail', {
    hasSubject: !!emailSubject,
    hasBody: !!emailBody
  });
  
  try {
    // @testHook(postponement_email_detection)
    const postponementData = this.parsePostponementEmail(emailSubject, emailBody);
    
    if (postponementData.isPostponement) {
      logger.info('Postponement detected from email', {
        opponent: postponementData.opponent,
        reason: postponementData.reason,
        confidence: postponementData.confidence
      });
      
      // Automatically post postponement if confidence is high enough
      if (postponementData.confidence >= 80) {
        const result = this.postPostponed(
          postponementData.opponent,
          postponementData.originalDate,
          postponementData.reason,
          postponementData.newDate
        );
        
        return {
          success: true,
          autoPosted: result.success,
          postponementData: postponementData,
          postResult: result
        };
      } else {
        return {
          success: true,
          autoPosted: false,
          reason: 'Low confidence - manual review required',
          postponementData: postponementData
        };
      }
    } else {
      return {
        success: true,
        autoPosted: false,
        reason: 'No postponement detected',
        postponementData: postponementData
      };
    }
  } catch (error) {
    logger.error('Email postponement detection failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Parse postponement information from email content
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @returns {Object} Parsed postponement data
 */
parsePostponementEmail(subject, body) {
  logger.testHook('postponement_email_parsing', { hasSubject: !!subject, hasBody: !!body });
  
  try {
    const result = {
      isPostponement: false,
      confidence: 0,
      opponent: null,
      originalDate: null,
      newDate: null,
      reason: null
    };


    const combinedText = `${subject} ${body}`.toLowerCase();
    
    // Check for postponement keywords
    const postponementKeywords = [
      'postponed', 'cancelled', 'called off', 'abandoned', 'delayed',
      'fixture postponed', 'match postponed', 'game off', 'match off'
    ];
    
    const hasPostponementKeyword = postponementKeywords.some(keyword => 
      combinedText.includes(keyword.toLowerCase())
    );
    
    if (!hasPostponementKeyword) {
      return result;
    }
    
    result.isPostponement = true;
    result.confidence = 30; // Base confidence for keyword match
    
    // Extract opponent name using common patterns
    const opponentPatterns = [
      /vs\.?\s+([A-Za-z\s]+?)(?:\s+(?:postponed|cancelled|called off))/i,
      /against\s+([A-Za-z\s]+?)(?:\s+(?:postponed|cancelled|called off))/i,
      /([A-Za-z\s]+?)\s+(?:vs|v)\s+syston/i,
      /syston\s+(?:vs|v)\s+([A-Za-z\s]+)/i,
      /([A-Za-z\s]+?)\s+match\s+postponed/i
    ];
    
    for (const pattern of opponentPatterns) {
      const match = combinedText.match(pattern);
      if (match && match[1]) {
        result.opponent = this.cleanOpponentName(match[1]);
        result.confidence += 25;
        break;
      }
    }
    
    // Extract original date
    const datePatterns = [
      /(?:scheduled for|on)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(?:postponed|cancelled)/i,
      /(?:saturday|sunday|monday|tuesday|wednesday|thursday|friday)\s+(\d{1,2}\/\d{1,2})/i
    ];
    
    for (const pattern of datePatterns) {
      const match = combinedText.match(pattern);
      if (match && match[1]) {
        result.originalDate = match[1];
        result.confidence += 20;
        break;
      }
    }
    
    // Extract reason
    const reasonPatterns = [
      /due to\s+([^.]+)/i,
      /because of\s+([^.]+)/i,
      /postponed\s+([^.]+)/i,
      /(weather|pitch|waterlogged|frozen|covid|player|referee|transport)/i
    ];
    
    for (const pattern of reasonPatterns) {
      const match = combinedText.match(pattern);
      if (match && match[1]) {
        result.reason = this.cleanPostponementReason(match[1]);
        result.confidence += 15;
        break;
      }
    }
    
    // Extract new date if mentioned
    const newDatePatterns = [
      /rescheduled for\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /new date\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /moved to\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i
    ];
    
    for (const pattern of newDatePatterns) {
      const match = combinedText.match(pattern);
      if (match && match[1]) {
        result.newDate = match[1];
        result.confidence += 10;
        break;
      }
    }
    
    // Set default reason if not found
    if (!result.reason) {
      result.reason = 'Unknown';
    }
    
    logger.info('Email postponement parsed', {
      isPostponement: result.isPostponement,
      confidence: result.confidence,
      opponent: result.opponent,
      reason: result.reason
    });
    
    return result;
  } catch (error) {
    logger.error('Email postponement parsing failed', { error: error.toString() });
    return {
      isPostponement: false,
      confidence: 0,
      opponent: null,
      originalDate: null,
      newDate: null,
      reason: null
    };
  }
}


/**
 * Clean and normalize opponent name
 * @param {string} rawOpponent - Raw opponent name from email
 * @returns {string} Cleaned opponent name
 */
cleanOpponentName(rawOpponent) {
  try {
    return rawOpponent
      .trim()
      .replace(/\b(fc|town|united|city|rovers|athletic|football club)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  } catch (error) {
    logger.error('Opponent name cleaning failed', { error: error.toString() });
    return rawOpponent || 'Unknown';
  }
}


/**
 * Clean and normalize postponement reason
 * @param {string} rawReason - Raw reason from email
 * @returns {string} Cleaned reason
 */
cleanPostponementReason(rawReason) {
  try {
    const cleanReason = rawReason
      .trim()
      .replace(/[.,!?]+$/, '')
      .toLowerCase();
    
    // Map common reasons to standard terms
    const reasonMappings = {
      'bad weather': 'Weather',
      'poor weather': 'Weather',
      'rain': 'Weather',
      'waterlogged': 'Waterlogged pitch',
      'pitch waterlogged': 'Waterlogged pitch',
      'frozen pitch': 'Frozen pitch',
      'pitch conditions': 'Pitch conditions',
      'covid': 'COVID-19',
      'coronavirus': 'COVID-19',
      'player unavailability': 'Player unavailability',
      'no referee': 'Referee unavailable',
      'referee unavailable': 'Referee unavailable'
    };
    
    for (const [pattern, standard] of Object.entries(reasonMappings)) {
      if (cleanReason.includes(pattern)) {
        return standard;
      }
    }
    
    // Capitalize first letter if no mapping found
    return cleanReason.charAt(0).toUpperCase() + cleanReason.slice(1);
  } catch (error) {
    logger.error('Reason cleaning failed', { error: error.toString() });
    return rawReason || 'Unknown';
  }
}


// ===== BULK POSTPONEMENT MANAGEMENT =====


/**
 * Process multiple postponements from a batch email or update
 * @param {Array} postponements - Array of postponement objects
 * @returns {Object} Batch processing result
 */
processBulkPostponements(postponements) {
  logger.enterFunction('EnhancedEventsManager.processBulkPostponements', {
    count: postponements?.length || 0
  });
  
  try {
    if (!postponements || !Array.isArray(postponements) || postponements.length === 0) {
      return { success: true, processed: 0, message: 'No postponements to process' };
    }


    const results = [];
    let successCount = 0;
    let errorCount = 0;


    for (const postponement of postponements) {
      try {
        const result = this.postPostponed(
          postponement.opponent,
          postponement.originalDate,
          postponement.reason,
          postponement.newDate
        );
        
        results.push({
          opponent: postponement.opponent,
          success: result.success,
          error: result.error
        });
        
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
        
        // Small delay between processing to avoid rate limits
        Utilities.sleep(1000);
        
      } catch (error) {
        logger.error('Individual postponement processing failed', {
          opponent: postponement.opponent,
          error: error.toString()
        });
        
        results.push({
          opponent: postponement.opponent,
          success: false,
          error: error.toString()
        });
        
        errorCount++;
      }
    }


    const overallResult = {
      success: errorCount === 0,
      totalProcessed: postponements.length,
      successCount: successCount,
      errorCount: errorCount,
      results: results
    };


    logger.exitFunction('EnhancedEventsManager.processBulkPostponements', overallResult);
    return overallResult;


  } catch (error) {
    logger.error('Bulk postponement processing failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


// ===== PUBLIC API FUNCTIONS FOR MAIN COORDINATOR =====


/**
 * Public function to post postponed match notification
 * @param {string} opponent - Opponent team name
 * @param {Date|string} originalDate - Original match date
 * @param {string} reason - Postponement reason
 * @param {Date|string} newDate - New match date (optional)
 * @returns {Object} Processing result
 */
function postPostponed(opponent, originalDate, reason, newDate = null) {
  logger.enterFunction('postPostponed', { opponent, originalDate, reason, newDate });


  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const enhancedManager = coordinator.components.get('EnhancedEventsManager');
    if (!enhancedManager) {
      logger.error('EnhancedEventsManager not available');
      return { success: false, error: 'Enhanced events manager not available' };
    }


    const result = enhancedManager.postPostponed(opponent, originalDate, reason, newDate);


    logger.exitFunction('postPostponed', { success: result.success });
    return result;


  } catch (error) {
    logger.error('Postponed match posting failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Public function to detect and process postponements from email
 * @param {string} emailSubject - Email subject line
 * @param {string} emailBody - Email body content
 * @returns {Object} Detection and processing result
 */
function processPostponementEmail(emailSubject, emailBody) {
  logger.enterFunction('processPostponementEmail', { hasSubject: !!emailSubject, hasBody: !!emailBody });


  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const enhancedManager = coordinator.components.get('EnhancedEventsManager');
    if (!enhancedManager) {
      logger.error('EnhancedEventsManager not available for email processing');
      return { success: false, error: 'Enhanced events manager not available' };
    }


    const result = enhancedManager.detectPostponementFromEmail(emailSubject, emailBody);


    logger.exitFunction('processPostponementEmail', { 
      success: result.success,
      autoPosted: result.autoPosted
    });
    return result;


  } catch (error) {
    logger.error('Postponement email processing failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


/**
 * Public function to process multiple postponements
 * @param {Array} postponements - Array of postponement objects
 * @returns {Object} Batch processing result
 */
function processBulkPostponements(postponements) {
  logger.enterFunction('processBulkPostponements', { count: postponements?.length || 0 });


  try {
    if (!coordinator.isSystemReady()) {
      initializeSystonAutomation();
    }


    const enhancedManager = coordinator.components.get('EnhancedEventsManager');
    if (!enhancedManager) {
      logger.error('EnhancedEventsManager not available for bulk processing');
      return { success: false, error: 'Enhanced events manager not available' };
    }


    const result = enhancedManager.processBulkPostponements(postponements);


    logger.exitFunction('processBulkPostponements', { 
      success: result.success,
      processed: result.successCount
    });
    return result;


  } catch (error) {
    logger.error('Bulk postponement processing failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  } finally {
    logger.flush();
  }
}


// Export global functions
globalThis.postPostponed = postPostponed;
globalThis.processPostponementEmail = processPostponementEmail;
globalThis.processBulkPostponements = processBulkPostponements;, error: 'No payload provided' };
    }


    // Get Make.com webhook URL
    const webhookUrl = PropertiesService.getScriptProperties()
                         .getProperty(getConfig('MAKE.WEBHOOK_URL_PROPERTY'));
    
    if (!webhookUrl) {
      logger.warn('Make.com webhook URL not configured for postponed matches');
      return { success: false, error: 'Webhook URL not configured' };
    }


    // Send to Make.com with rate limiting
    const response = ApiUtils.rateLimitedMakeRequest(webhookUrl, {
      method: 'POST',
      payload: JSON.stringify(payload)
    });


    logger.info('Postponed match posted to Make.com', {
      eventType: payload.event_type,
      opponent: payload.opponent_name,
      originalDate: payload.original_date,
      success: response.success,
      responseCode: response.responseCode
    });


    return {
      success: response.success,
      response: response
    };


  } catch (error) {
    logger.error('Postponed match Make.com posting failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Send additional postponed match notifications
 * @param {Object} payload - Postponement payload
 * @returns {Object} Notification result
 */
sendPostponedNotifications(payload) {
  logger.testHook('postponed_additional_notifications', { 
    urgency: payload?.urgency_level 
  });
  
  try {
    const notifications = {
      email: false,
      sms: false,
      webhook: false,
      social: true // Social media via Make.com
    };


    // High urgency postponements might need additional notifications
    if (payload?.urgency_level === 'high') {
      // Could add email notifications here
      // notifications.email = this.sendPostponedEmail(payload);
      
      // Could add SMS notifications here
      // notifications.sms = this.sendPostponedSMS(payload);
      
      logger.info('High urgency postponement - additional notifications considered', {
        opponent: payload?.opponent_name,
        reason: payload?.postponement_reason
      });
    }


    return {
      success: true,
      notifications: notifications,
      urgencyLevel: payload?.urgency_level
    };
  } catch (error) {
    logger.error('Additional postponed notifications failed', { error: error.toString() });
    return { success: false/**
 * @fileoverview Syston Tigers Automation - Postponed Match Notifications
 * @version 6.0.0
 * @author Senior Software Architect
 * 
 * CRITICAL MILESTONE 1.4 IMPLEMENTATION: Postponed Match Notifications
 * 
 * Implements the missing postponed match notification functions
 * as specified in tasks.md Milestone 1.4 Postponed Match Notifications.
 * 
 * Key Requirements:
 * - postPostponed() function with opponent, originalDate, reason, newDate parameters
 * - Create postponed match detection logic
 * - Generate payload with event_type: 'match_postponed_league'
 * - Add to postponed matches tracking sheet
 * - Test postponement workflow
 * - Create postponed match Canva template
 */


// ===== POSTPONED MATCH PROCESSING =====


/**
 * Post postponed match notification (CRITICAL - Milestone 1.4)
 * @param {string} opponent - Opponent team name
 * @param {Date|string} originalDate - Original match date
 * @param {string} reason - Postponement reason
 * @param {Date|string} newDate - New match date (optional)
 * @returns {Object} Processing result
 */
postPostponed(opponent, originalDate, reason, newDate = null) {
  logger.enterFunction('EnhancedEventsManager.postPostponed', {
    opponent: opponent,
    originalDate: originalDate,
    reason: reason,
    newDate: newDate
  });
  
  try {
    // @testHook(postponed_input_validation)
    // Validate input parameters
    const validationResult = this.validatePostponedInput(opponent, originalDate, reason, newDate);
    if (!validationResult.isValid) {
      logger.warn('Invalid postponed match input', validationResult.errors);
      return { 
        success: false, 
        error: 'Invalid input parameters',
        validationErrors: validationResult.errors
      };
    }


    // @testHook(postponed_date_parsing)
    // Parse and normalize dates
    const dateData = this.parsePostponedDates(originalDate, newDate);
    if (!dateData.originalDateParsed) {
      logger.error('Failed to parse original date', { originalDate });
      return { success: false, error: 'Invalid original date format' };
    }


    // @testHook(postponed_duplicate_check)
    // Check for duplicate postponement notifications
    const isDuplicate = this.checkDuplicatePostponement(opponent, dateData.originalDateParsed);
    if (isDuplicate) {
      logger.info('Postponement already processed', { 
        opponent: opponent,
        originalDate: dateData.originalDateFormatted
      });
      return { 
        success: true, 
        skipped: true, 
        reason: 'Already processed',
        opponent: opponent,
        originalDate: dateData.originalDateFormatted
      };
    }


    // @testHook(postponed_match_detection)
    // Detect and validate the postponed match in fixtures
    const matchData = this.detectPostponedMatch(opponent, dateData.originalDateParsed);
    
    // @testHook(postponed_tracking_update)
    // Add to postponed matches tracking sheet
    const trackingLogged = this.logPostponedMatch(
      opponent, 
      dateData, 
      reason, 
      matchData
    );


    // @testHook(postponed_fixtures_update)
    // Update fixtures sheet if match found
    const fixtureUpdated = matchData.found ? 
      this.updatePostponedFixture(matchData, dateData.newDateParsed) : true;


    // @testHook(postponed_payload_generation)
    // Generate payload with event_type: 'match_postponed_league'
    const makePayload = this.buildPostponedPayload(
      opponent, 
      dateData, 
      reason, 
      matchData
    );


    // @testHook(postponed_make_posting)
    // Post to Make.com for postponed match template
    const postResult = this.postPostponedToMake(makePayload);


    // @testHook(postponed_notifications)
    // Send additional notifications if configured
    const notificationsSent = this.sendPostponedNotifications(makePayload);


    // Track idempotency
    const idempotencyKey = `postponed_${StringUtils.sanitizeForKey(opponent)}_${dateData.originalDateKey}`;
    this.processedEvents.add(idempotencyKey);


    const result = {
      success: trackingLogged && fixtureUpdated && postResult.success,
      opponent: opponent,
      originalDate: dateData.originalDateFormatted,
      newDate: dateData.newDateFormatted,
      reason: reason,
      matchFound: matchData.found,
      trackingLogged: trackingLogged,
      fixtureUpdated: fixtureUpdated,
      makePostResult: postResult,
      notificationsSent: notificationsSent,
      eventType: 'match_postponed_league',
      idempotencyKey: idempotencyKey
    };


    logger.exitFunction('EnhancedEventsManager.postPostponed', result);
    return result;


  } catch (error) {
    logger.error('Postponed match processing failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


/**
 * Validate postponed match input parameters
 * @param {string} opponent - Opponent name
 * @param {Date|string} originalDate - Original date
 * @param {string} reason - Postponement reason
 * @param {Date|string} newDate - New date
 * @returns {Object} Validation result
 */
validatePostponedInput(opponent, originalDate, reason, newDate) {
  logger.testHook('postponed_input_validation', { opponent, originalDate, reason, newDate });
  
  const validation = {
    isValid: true,
    errors: []
  };


  try {
    // Validate opponent
    if (!opponent || typeof opponent !== 'string' || opponent.trim().length === 0) {
      validation.errors.push('Opponent name is required and must be a non-empty string');
      validation.isValid = false;
    }


    // Validate original date
    if (!originalDate) {
      validation.errors.push('Original date is required');
      validation.isValid = false;
    }


    // Validate reason
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      validation.errors.push('Postponement reason is required and must be a non-empty string');
      validation.isValid = false;
    }


    // Validate reason is from allowed list
    const allowedReasons = [
      'Weather', 'Pitch conditions', 'Waterlogged pitch', 'Frozen pitch',
      'Player unavailability', 'COVID-19', 'Fixture clash', 'Ground unavailable',
      'Referee unavailable', 'Transport issues', 'Safety concerns', 'Other'
    ];
    
    if (reason && !allowedReasons.some(allowed => 
        reason.toLowerCase().includes(allowed.toLowerCase()))) {
      validation.errors.push(`Reason should be one of: ${allowedReasons.join(', ')}`);
      // Don't mark as invalid - just warn
    }


    // Validate new date format if provided
    if (newDate) {
      const parsedNewDate = DateUtils.parseDate(newDate);
      if (!parsedNewDate) {
        validation.errors.push('New date format is invalid');
        validation.isValid = false;
      } else {
        // Check new date is in the future
        const now = DateUtils.now();
        if (parsedNewDate <= now) {
          validation.errors.push('New date should be in the future');
          // Don't mark as invalid - just warn
        }
      }
    }


    logger.info('Postponed input validation completed', {
      isValid: validation.isValid,
      errorCount: validation.errors.length
    });


    return validation;
  } catch (error) {
    logger.error('Postponed input validation failed', { error: error.toString() });
    return {
      isValid: false,
      errors: ['Validation process failed: ' + error.toString()]
    };
  }
}


/**
 * Parse and normalize postponed match dates
 * @param {Date|string} originalDate - Original match date
 * @param {Date|string} newDate - New match date
 * @returns {Object} Parsed date data
 */
parsePostponedDates(originalDate, newDate) {
  logger.testHook('postponed_date_parsing', { originalDate, newDate });
  
  try {
    const dateData = {
      originalDateParsed: null,
      originalDateFormatted: null,
      originalDateKey: null,
      newDateParsed: null,
      newDateFormatted: null,
      hasNewDate: false
    };


    // Parse original date
    dateData.originalDateParsed = DateUtils.parseDate(originalDate);
    if (dateData.originalDateParsed) {
      dateData.originalDateFormatted = DateUtils.formatDate(
        dateData.originalDateParsed, 'dd MMM yyyy'
      );
      dateData.originalDateKey = DateUtils.formatDate(
        dateData.originalDateParsed, 'yyyy-MM-dd'
      );
    }


    // Parse new date if provided
    if (newDate) {
      dateData.newDateParsed = DateUtils.parseDate(newDate);
      if (dateData.newDateParsed) {
        dateData.newDateFormatted = DateUtils.formatDate(
          dateData.newDateParsed, 'dd MMM yyyy'
        );
        dateData.hasNewDate = true;
      }
    }


    // Set default "TBC" if no new date
    if (!dateData.hasNewDate) {
      dateData.newDateFormatted = 'TBC';
    }


    logger.info('Postponed dates parsed', {
      originalFormatted: dateData.originalDateFormatted,
      newFormatted: dateData.newDateFormatted,
      hasNewDate: dateData.hasNewDate
    });


    return dateData;
  } catch (error) {
    logger.error('Postponed date parsing failed', { error: error.toString() });
    return {
      originalDateParsed: null,
      originalDateFormatted: null,
      originalDateKey: null,
      newDateParsed: null,
      newDateFormatted: 'TBC',
      hasNewDate: false
    };
  }
}


/**
 * Check for duplicate postponement notifications
 * @param {string} opponent - Opponent name
 * @param {Date} originalDate - Original date
 * @returns {boolean} True if duplicate
 */
checkDuplicatePostponement(opponent, originalDate) {
  logger.testHook('postponed_duplicate_check', { opponent, originalDate });
  
  try {
    const postponedSheet = SheetUtils.getOrCreateSheet('Postponed_Matches');
    if (!postponedSheet) {
      logger.warn('Postponed matches sheet not available for duplicate check');
      return false;
    }


    const data = postponedSheet.getDataRange().getValues();
    const originalDateKey = DateUtils.formatDate(originalDate, 'yyyy-MM-dd');
    
    // Check for existing postponement with same opponent and date
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const [date, existingOpponent, existingOriginalDate] = row;
      
      const existingDateKey = DateUtils.formatDate(
        DateUtils.parseDate(existingOriginalDate), 'yyyy-MM-dd'
      );
      
      if (existingOpponent.toLowerCase().trim() === opponent.toLowerCase().trim() &&
          existingDateKey === originalDateKey) {
        logger.info('Duplicate postponement found', {
          opponent: opponent,
          originalDate: originalDateKey,
          existingRow: i + 1
        });
        return true;
      }
    }


    logger.info('No duplicate postponement found', {
      opponent: opponent,
      originalDate: originalDateKey
    });
    return false;
  } catch (error) {
    logger.error('Duplicate postponement check failed', { error: error.toString() });
    return false; // Assume not duplicate on error
  }
}


/**
 * Detect postponed match in fixtures sheet
 * @param {string} opponent - Opponent name
 * @param {Date} originalDate - Original date
 * @returns {Object} Match detection result
 */
detectPostponedMatch(opponent, originalDate) {
  logger.testHook('postponed_match_detection', { opponent, originalDate });
  
  try {
    const fixturesSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.FIXTURES'));
    if (!fixturesSheet) {
      logger.warn('Fixtures sheet not available for postponed match detection');
      return { found: false, matchData: null };
    }


    const data = fixturesSheet.getDataRange().getValues();
    const clubName = getConfig('SYSTEM.CLUB_NAME', 'Syston Tigers');
    const originalDateKey = DateUtils.formatDate(originalDate, 'yyyy-MM-dd');
    
    // Search for matching fixture
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const [date, competition, homeTeam, awayTeam, venue, kickOff, posted] = row;
      
      const fixtureDate = DateUtils.parseDate(date);
      if (!fixtureDate) continue;
      
      const fixtureDateKey = DateUtils.formatDate(fixtureDate, 'yyyy-MM-dd');
      
      // Check if this fixture matches our postponed match
      if (fixtureDateKey === originalDateKey) {
        const isOurFixture = homeTeam.toLowerCase().includes(clubName.toLowerCase()) ||
                           awayTeam.toLowerCase().includes(clubName.toLowerCase());
        
        const fixtureOpponent = homeTeam.toLowerCase().includes(clubName.toLowerCase()) ? 
                              awayTeam : homeTeam;
        
        const opponentMatches = fixtureOpponent.toLowerCase().trim()
                               .includes(opponent.toLowerCase().trim()) ||
                               opponent.toLowerCase().trim()
                               .includes(fixtureOpponent.toLowerCase().trim());
        
        if (isOurFixture && opponentMatches) {
          const matchData = {
            rowIndex: i + 1,
            date: fixtureDate,
            competition: competition,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            venue: venue,
            kickOff: kickOff,
            isHome: homeTeam.toLowerCase().includes(clubName.toLowerCase()),
            opponent: fixtureOpponent
          };
          
          logger.info('Postponed match found in fixtures', {
            opponent: opponent,
            originalDate: originalDateKey,
            competition: competition,
            rowIndex: matchData.rowIndex
          });
          
          return { found: true, matchData: matchData };
        }
      }
    }


    logger.info('Postponed match not found in fixtures', {
      opponent: opponent,
      originalDate: originalDateKey
    });
    
    return { found: false, matchData: null };
  } catch (error) {
    logger.error('Postponed match detection failed', { error: error.toString() });
    return { found: false, matchData: null };
  }
}


/**
 * Log postponed match to tracking sheet
 * @param {string} opponent - Opponent name
 * @param {Object} dateData - Date information
 * @param {string} reason - Postponement reason
 * @param {Object} matchData - Match detection result
 * @returns {boolean} Success status
 */
logPostponedMatch(opponent, dateData, reason, matchData) {
  logger.testHook('postponed_tracking_logging', { opponent, reason });
  
  try {
    const postponedSheet = SheetUtils.getOrCreateSheet(
      'Postponed_Matches',
      ['Date', 'Opponent', 'Original_Date', 'Reason', 'New_Date', 'Posted', 'Timestamp', 
       'Competition', 'Home_Away', 'Match_Found']
    );
    
    if (!postponedSheet) {
      logger.error('Postponed matches sheet not available');
      return false;
    }


    const values = [
      DateUtils.now().toISOString().split('T')[0], // Date posted
      opponent,
      dateData.originalDateFormatted,
      reason,
      dateData.newDateFormatted,
      'Y', // Posted
      DateUtils.now().toISOString(), // Full timestamp
      matchData.found ? matchData.matchData.competition : 'Unknown',
      matchData.found ? (matchData.matchData.isHome ? 'H' : 'A') : 'Unknown',
      matchData.found ? 'Y' : 'N'
    ];


    const success = SheetUtils.appendRowSafe(postponedSheet, values);
    
    if (success) {
      logger.info('Postponed match logged to tracking sheet', {
        opponent: opponent,
        originalDate: dateData.originalDateFormatted,
        reason: reason,
        matchFound: matchData.found
      });
    }
    
    return success;
  } catch (error) {
    logger.error('Postponed match logging failed', { error: error.toString() });
    return false;
  }
}


/**
 * Update fixtures sheet for postponed match
 * @param {Object} matchData - Match detection result
 * @param {Date} newDate - New match date
 * @returns {boolean} Success status
 */
updatePostponedFixture(matchData, newDate) {
  logger.testHook('postponed_fixture_update', { 
    rowIndex: matchData.matchData?.rowIndex,
    hasNewDate: !!newDate
  });
  
  try {
    if (!matchData.found || !matchData.matchData) {
      logger.info('No fixture to update - match not found in fixtures sheet');
      return true; // Not an error condition
    }


    const fixturesSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.FIXTURES'));
    if (!fixturesSheet) {
      logger.error('Fixtures sheet not available for postponed update');
      return false;
    }


    const rowIndex = matchData.matchData.rowIndex;
    
    if (newDate) {
      // Update the date to the new date
      const newDateFormatted = DateUtils.formatDate(newDate, 'dd/MM/yyyy');
      SheetUtils.setCellValue(fixturesSheet, `A${rowIndex}`, newDateFormatted);
      
      logger.info('Fixture date updated to new date', {
        rowIndex: rowIndex,
        newDate: newDateFormatted
      });
    } else {
      // Mark as postponed in a notes column or similar
      // For now, we'll add "(POSTPONED)" to the venue field
      const currentVenue = matchData.matchData.venue || '';
      const postponedVenue = currentVenue.includes('POSTPONED') ? 
                           currentVenue : `${currentVenue} (POSTPONED)`;
      
      SheetUtils.setCellValue(fixturesSheet, `E${rowIndex}`, postponedVenue);
      
      logger.info('Fixture marked as postponed', {
        rowIndex: rowIndex,
        venue: postponedVenue
      });
    }


    return true;
  } catch (error) {
    logger.error('Postponed fixture update failed', { error: error.toString() });
    return false;
  }
}


/**
 * Build Make.com payload for postponed match
 * @param {string} opponent - Opponent name
 * @param {Object} dateData - Date information
 * @param {string} reason - Postponement reason
 * @param {Object} matchData - Match detection result
 * @returns {Object} Make.com payload
 */
buildPostponedPayload(opponent, dateData, reason, matchData) {
  logger.testHook('postponed_payload_building', { opponent, reason });
  
  try {
    const payload = {
      timestamp: DateUtils.now().toISOString(),
      match_id: `postponed_${StringUtils.sanitizeForKey(opponent)}_${dateData.originalDateKey}`,
      event_type: getConfig('MAKE.EVENT_MAPPINGS.match_postponed', 'match_postponed_league'),
      source: 'apps_script_enhanced_automation',
      version: getConfig('SYSTEM.VERSION'),
      
      // Postponed match specific data
      opponent_name: opponent,
      original_date: dateData.originalDateFormatted,
      original_date_key: dateData.originalDateKey,
      new_date: dateData.newDateFormatted,
      has_new_date: dateData.hasNewDate,
      postponement_reason: reason,
      
      // Match context if found
      match_found: matchData.found,
      competition: matchData.found ? matchData.matchData.competition : 'Unknown',
      home_away: matchData.found ? (matchData.matchData.isHome ? 'Home' : 'Away') : 'Unknown',
      venue: matchData.found ? matchData.matchData.venue : 'TBC',
      original_kick_off: matchData.found ? matchData.matchData.kickOff : 'TBC',
      
      // Enhanced details for Canva template
      postponement_details: this.buildPostponementDetails(reason, dateData, matchData),
      urgency_level: this.determineUrgencyLevel(reason, dateData.originalDateParsed),
      
      // Messaging for different scenarios
      main_message: dateData.hasNewDate ? 
        `${opponent} match postponed to ${dateData.newDateFormatted}` :
        `${opponent} match postponed - new date TBC`,
      
      sub_message: `Originally scheduled for ${dateData.originalDateFormatted}`,
      reason_message: `Reason: ${reason}`,
      
      // Context for template
      club_name: getConfig('SYSTEM.CLUB_NAME'),
      season: getConfig('SYSTEM.SEASON'),
      
      // Social media optimized text
      social_text: this.buildSocialText(opponent, dateData, reason),
      hashtags: this.buildPostponementHashtags(reason, matchData),
      
      // Idempotency
      idempotency_key: `postponed_${StringUtils.sanitizeForKey(opponent)}_${dateData.originalDateKey}`
    };


    logger.info('Postponed match payload built', {
      eventType: payload.event_type,
      opponent: payload.opponent_name,
      originalDate: payload.original_date,
      newDate: payload.new_date,
      reason: payload.postponement_reason
    });


    return payload;
  } catch (error) {
    logger.error('Postponed payload building failed', { error: error.toString() });
    return null;
  }
}


/**
 * Build postponement details for template
 * @param {string} reason - Postponement reason
 * @param {Object} dateData - Date data
 * @param {Object} matchData - Match data
 * @returns {string} Formatted details
 */
buildPostponementDetails(reason, dateData, matchData) {
  try {
    const details = [];
    
    // Reason with context
    details.push(`Postponed due to ${reason.toLowerCase()}`);
    
    // Competition context if available
    if (matchData.found && matchData.matchData.competition) {
      details.push(`${matchData.matchData.competition} fixture`);
    }
    
    // Venue information if home game
    if (matchData.found && matchData.matchData.isHome) {
      details.push(`Home fixture at ${matchData.matchData.venue || 'home ground'}`);
    }
    
    // New date information
    if (dateData.hasNewDate) {
      details.push(`Rescheduled for ${dateData.newDateFormatted}`);
    } else {
      details.push('New date to be confirmed');
    }
    
    return details.join(' • ');
  } catch (error) {
    logger.error('Postponement details building failed', { error: error.toString() });
    return `Postponed due to ${reason}`;
  }
}


/**
 * Determine urgency level for postponement
 * @param {string} reason - Postponement reason
 * @param {Date} originalDate - Original date
 * @returns {string} Urgency level
 */
determineUrgencyLevel(reason, originalDate) {
  try {
    const now = DateUtils.now();
    const daysUntilMatch = Math.ceil((originalDate - now) / (1000 * 60 * 60 * 24));
    
    // High urgency for safety/weather reasons or short notice
    if (reason.toLowerCase().includes('safety') || 
        reason.toLowerCase().includes('weather') ||
        reason.toLowerCase().includes('waterlogged') ||
        reason.toLowerCase().includes('frozen') ||
        daysUntilMatch <= 1) {
      return 'high';
    }
    
    // Medium urgency for COVID/player issues or medium notice
    if (reason.toLowerCase().includes('covid') ||
        reason.toLowerCase().includes('player') ||
        daysUntilMatch <= 3) {
      return 'medium';
    }
    
    // Low urgency for administrative reasons or long notice
    return 'low';
  } catch (error) {
    logger.error('Urgency level determination failed', { error: error.toString() });
    return 'medium';
  }
}


/**
 * Build social media optimized text
 * @param {string} opponent - Opponent name
 * @param {Object} dateData - Date data
 * @param {string} reason - Postponement reason
 * @returns {string} Social media text
 */
buildSocialText(opponent, dateData, reason) {
  try {
    const clubName = getConfig('SYSTEM.CLUB_NAME', 'Syston Tigers');
    
    if (dateData.hasNewDate) {
      return `📅 FIXTURE UPDATE: Our match against ${opponent} on ${dateData.originalDateFormatted} has been postponed to ${dateData.newDateFormatted} due to ${reason.toLowerCase()}. #SystonTigers #FixtureUpdate`;
    } else {
      return `⚠️ POSTPONED: Our match against ${opponent} scheduled for ${dateData.originalDateFormatted} has been postponed due to ${reason.toLowerCase()}. New date TBC. #SystonTigers #Postponed`;
    }
  } catch (error) {
    logger.error('Social text building failed', { error: error.toString() });
    return `Match against ${opponent} postponed due to ${reason}`;
  }
}


/**
 * Build hashtags for postponement
 * @param {string} reason - Postponement reason
 * @param {Object} matchData - Match data
 * @returns {Array} Hashtag array
 */
buildPostponementHashtags(reason, matchData) {
  try {
    const hashtags = ['#SystonTigers'];
    
    // Add reason-specific hashtags
    if (reason.toLowerCase().includes('weather') || 
        reason.toLowerCase().includes('pitch')) {
      hashtags.push('#Weather');
    }
    
    if (reason.toLowerCase().includes('covid')) {
      hashtags.push('#COVID19');
    }
    
    // Add competition hashtag if available
    if (matchData.found && matchData.matchData.competition) {
      const comp = matchData.matchData.competition.replace(/\s+/g, '');
      hashtags.push(`#${comp}`);
    }
    
    hashtags.push('#FixtureUpdate', '#NonLeagueFootball');
    
    return hashtags;
  } catch (error) {
    logger.error('Hashtag building failed', { error: error.toString() });
    return ['#SystonTigers', '#FixtureUpdate'];
  }
}


//
