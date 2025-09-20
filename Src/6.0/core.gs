/**
 * @fileoverview Syston Tigers Automation - Enhanced Core Utilities
 * @version 5.1.0
 * @author Senior Software Architect
 * 
 * Enhanced core utilities with idempotency, improved validation, and robust error handling.
 * Addresses checklist requirements for duplicate prevention and edge case handling.
 */


/**
 * Enhanced base class with idempotency and advanced error handling
 */
class BaseAutomationComponent {
  
  constructor(componentName) {
    this.componentName = componentName;
    this.initialized = false;
    this.lockService = LockService.getScriptLock();
    this.errorCount = 0;
    this.lastError = null;
  }


  /**
   * Enhanced initialization with configuration validation
   * @returns {boolean} Success status
   */
  initialize() {
    logger.enterFunction(`${this.componentName}.initialize`);
    
    try {
      // Validate system configuration first
      const configValidation = validateSystemConfig();
      if (!configValidation.valid) {
        logger.error(`${this.componentName}: Invalid system configuration`, {
          errors: configValidation.errors
        });
        return false;
      }
      
      if (configValidation.warnings.length > 0) {
        logger.warn(`${this.componentName}: Configuration warnings`, {
          warnings: configValidation.warnings
        });
      }


      const success = this.doInitialize();
      this.initialized = success;
      
      if (success) {
        this.errorCount = 0;
        this.lastError = null;
      }


      logger.exitFunction(`${this.componentName}.initialize`, { success });
      return success;
    } catch (error) {
      this.errorCount++;
      this.lastError = error;
      logger.error(`${this.componentName} initialization failed`, { 
        error: error.toString(),
        errorCount: this.errorCount
      });
      return false;
    }
  }


  /**
   * Override in subclasses for specific initialization
   * @returns {boolean} Success status
   */
  doInitialize() {
    return true;
  }


  /**
   * Enhanced lock execution with timeout and retry
   * @param {Function} operation - Operation to execute
   * @param {number} timeoutMs - Lock timeout
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {*} Operation result
   */
  withLock(operation, timeoutMs = null, maxRetries = 3) {
    timeoutMs = timeoutMs || getConfig('SYSTEM.LOCK_TIMEOUT_MS', 30000);
    
    logger.testHook('pre_lock_acquire', { 
      component: this.componentName,
      timeout: timeoutMs,
      maxRetries: maxRetries
    });
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const acquired = this.lockService.tryLock(timeoutMs);
        if (!acquired) {
          throw new Error(`Failed to acquire lock within ${timeoutMs}ms (attempt ${attempt})`);
        }


        logger.debug(`Lock acquired for ${this.componentName} (attempt ${attempt})`);
        
        try {
          const result = operation();
          return result;
        } finally {
          this.lockService.releaseLock();
          logger.debug(`Lock released for ${this.componentName}`);
        }
        
      } catch (error) {
        lastError = error;
        logger.warn(`Lock operation attempt ${attempt} failed for ${this.componentName}`, { 
          error: error.toString(),
          willRetry: attempt < maxRetries
        });
        
        if (attempt < maxRetries) {
          Utilities.sleep(1000 * attempt); // Exponential backoff
        }
      }
    }
    
    logger.error(`Lock operation failed after ${maxRetries} attempts for ${this.componentName}`, { 
      finalError: lastError.toString()
    });
    throw lastError;
  }


  /**
   * Enhanced retry logic with different strategies
   * @param {Function} operation - Operation to execute
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} delayMs - Initial delay between retries
   * @param {string} strategy - Retry strategy ('exponential', 'linear', 'fixed')
   * @returns {*} Operation result
   */
  withRetry(operation, maxRetries = null, delayMs = null, strategy = 'exponential') {
    maxRetries = maxRetries || getConfig('SYSTEM.MAX_RETRIES', 3);
    delayMs = delayMs || getConfig('SYSTEM.RETRY_DELAY_MS', 1000);
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.testHook('retry_attempt', { 
        component: this.componentName,
        attempt: attempt,
        maxRetries: maxRetries,
        strategy: strategy
      });
      
      try {
        const result = operation();
        
        if (attempt > 1) {
          logger.info(`${this.componentName} succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          logger.error(`${this.componentName}: Non-retryable error encountered`, {
            error: error.toString(),
            attempt: attempt
          });
          throw error;
        }
        
        logger.warn(`${this.componentName} attempt ${attempt} failed`, { 
          error: error.toString(),
          willRetry: attempt < maxRetries
        });
        
        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(delayMs, attempt, strategy);
          Utilities.sleep(delay);
        }
      }
    }
    
    this.errorCount++;
    this.lastError = lastError;
    
    logger.error(`${this.componentName} failed after ${maxRetries} attempts`, { 
      finalError: lastError.toString(),
      totalErrors: this.errorCount
    });
    throw lastError;
  }


  /**
   * Determine if an error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} Is retryable
   */
  isRetryableError(error) {
    const retryableEvents = getConfig('ERRORS.RETRY_EVENTS', []);
    const errorString = error.toString().toUpperCase();
    
    return retryableEvents.some(event => errorString.includes(event));
  }


  /**
   * Calculate retry delay based on strategy
   * @param {number} baseDelay - Base delay in milliseconds
   * @param {number} attempt - Current attempt number
   * @param {string} strategy - Retry strategy
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay(baseDelay, attempt, strategy) {
    switch (strategy) {
      case 'exponential':
        return baseDelay * Math.pow(2, attempt - 1);
      case 'linear':
        return baseDelay * attempt;
      case 'fixed':
      default:
        return baseDelay;
    }
  }


  /**
   * Get component health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    return {
      componentName: this.componentName,
      initialized: this.initialized,
      errorCount: this.errorCount,
      lastError: this.lastError?.toString() || null,
      healthy: this.initialized && this.errorCount < 5
    };
  }
}


/**
 * Enhanced idempotency manager for duplicate prevention
 */
class IdempotencyManager {
  
  constructor() {
    this.enabled = getConfig('IDEMPOTENCY.ENABLED', true);
    this.keyFormat = getConfig('IDEMPOTENCY.KEY_FORMAT');
    this.cacheDurationHours = getConfig('IDEMPOTENCY.CACHE_DURATION_HOURS', 24);
  }


  /**
   * Generate idempotency key from event data
   * @param {Object} eventData - Event data
   * @returns {string} Idempotency key
   */
  generateKey(eventData) {
    if (!this.enabled) return null;
    
    try {
      const components = [
        eventData.matchId || 'no_match',
        eventData.eventType || 'no_type', 
        eventData.player || 'no_player',
        eventData.minute || 'no_minute',
        (eventData.details || '').replace(/[^a-zA-Z0-9]/g, '')
      ];
      
      const rawKey = components.join('_').toLowerCase();
      
      // Generate shorter hash for storage efficiency
      return Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_1,
        rawKey,
        Utilities.Charset.UTF_8
      ).map(byte => (byte & 0xFF).toString(16).padStart(2, '0')).join('').substring(0, 12);
      
    } catch (error) {
      logger.error('Failed to generate idempotency key', { error: error.toString() });
      return null;
    }
  }


  /**
   * Check if operation has already been performed
   * @param {string} idempotencyKey - Idempotency key
   * @returns {boolean} Already performed
   */
  isAlreadyProcessed(idempotencyKey) {
    if (!this.enabled || !idempotencyKey) return false;
    
    logger.testHook('idempotency_check', { key: idempotencyKey });
    
    try {
      const trackerSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.IDEMPOTENCY_TRACKER'),
        ['Key', 'Timestamp', 'Event_Data', 'Status']
      );
      
      if (!trackerSheet) return false;
      
      const data = trackerSheet.getDataRange().getValues();
      const cutoffTime = new Date(Date.now() - (this.cacheDurationHours * 60 * 60 * 1000));
      
      // Check for existing key and cleanup old entries
      let found = false;
      const rowsToDelete = [];
      
      for (let i = 1; i < data.length; i++) {
        const [key, timestamp, eventData, status] = data[i];
        const recordTime = new Date(timestamp);
        
        if (recordTime < cutoffTime) {
          rowsToDelete.push(i + 1);
        } else if (key === idempotencyKey && status === 'COMPLETED') {
          found = true;
        }
      }
      
      // Cleanup old entries (batch delete for efficiency)
      if (rowsToDelete.length > 0) {
        this.cleanupOldEntries(trackerSheet, rowsToDelete);
      }
      
      logger.testHook('idempotency_check_result', { 
        key: idempotencyKey, 
        alreadyProcessed: found 
      });
      
      return found;
      
    } catch (error) {
      logger.error('Idempotency check failed', { error: error.toString() });
      return false; // Fail safe - allow operation to proceed
    }
  }


  /**
   * Mark operation as processed
   * @param {string} idempotencyKey - Idempotency key
   * @param {Object} eventData - Event data
   * @returns {boolean} Success status
   */
  markAsProcessed(idempotencyKey, eventData) {
    if (!this.enabled || !idempotencyKey) return true;
    
    logger.testHook('idempotency_mark_processed', { key: idempotencyKey });
    
    try {
      const trackerSheet = SheetUtils.getOrCreateSheet(
        getConfig('SHEETS.IDEMPOTENCY_TRACKER'),
        ['Key', 'Timestamp', 'Event_Data', 'Status']
      );
      
      if (!trackerSheet) return false;
      
      const values = [
        idempotencyKey,
        new Date().toISOString(),
        JSON.stringify(eventData).substring(0, 500), // Truncate long data
        'COMPLETED'
      ];
      
      return SheetUtils.appendRowSafe(trackerSheet, values);
      
    } catch (error) {
      logger.error('Failed to mark as processed', { error: error.toString() });
      return false;
    }
  }


  /**
   * Cleanup old idempotency entries
   * @param {Sheet} sheet - Tracker sheet
   * @param {Array} rowsToDelete - Row numbers to delete
   */
  cleanupOldEntries(sheet, rowsToDelete) {
    try {
      // Delete from bottom to top to maintain row numbers
      rowsToDelete.sort((a, b) => b - a);
      
      for (const rowNum of rowsToDelete.slice(0, 50)) { // Limit batch size
        sheet.deleteRow(rowNum);
      }
      
      logger.info(`Cleaned up ${Math.min(rowsToDelete.length, 50)} old idempotency entries`);
      
    } catch (error) {
      logger.error('Failed to cleanup old idempotency entries', { error: error.toString() });
    }
  }
}


/**
 * Enhanced validation utilities with more comprehensive checks
 */
class ValidationUtils {
  
  /**
   * Enhanced player name validation with reserved names
   * @param {string} playerName - Player name to validate
   * @returns {Object} Validation result with details
   */
  static validatePlayerName(playerName) {
    const result = {
      valid: false,
      sanitized: null,
      warnings: [],
      errors: []
    };
    
    if (!playerName || typeof playerName !== 'string') {
      result.errors.push('Player name must be a non-empty string');
      return result;
    }
    
    const trimmed = playerName.trim();
    const minLength = getConfig('VALIDATION.PLAYER_NAME.MIN_LENGTH', 2);
    const maxLength = getConfig('VALIDATION.PLAYER_NAME.MAX_LENGTH', 50);
    const allowedChars = getConfig('VALIDATION.PLAYER_NAME.ALLOWED_CHARS', /^[a-zA-Z\s\-'\.]+$/);
    const reservedNames = getConfig('VALIDATION.PLAYER_NAME.RESERVED_NAMES', []);
    
    if (trimmed.length < minLength) {
      result.errors.push(`Player name too short (minimum ${minLength} characters)`);
      return result;
    }
    
    if (trimmed.length > maxLength) {
      result.errors.push(`Player name too long (maximum ${maxLength} characters)`);
      return result;
    }
    
    if (!allowedChars.test(trimmed)) {
      result.errors.push('Player name contains invalid characters');
      return result;
    }
    
    // Check for reserved names (case insensitive)
    const lowerName = trimmed.toLowerCase();
    if (reservedNames.some(reserved => reserved.toLowerCase() === lowerName)) {
      // Reserved names are actually valid for system use
      result.warnings.push('Using reserved system name');
    }
    
    result.valid = true;
    result.sanitized = trimmed;
    
    return result;
  }


  /**
   * Enhanced minute validation with injury time support
   * @param {number} minute - Minute to validate
   * @returns {Object} Validation result
   */
  static validateMinute(minute) {
    const result = {
      valid: false,
      sanitized: null,
      warnings: [],
      errors: []
    };
    
    if (typeof minute !== 'number' && typeof minute !== 'string') {
      result.errors.push('Minute must be a number or numeric string');
      return result;
    }
    
    const num = typeof minute === 'string' ? parseInt(minute, 10) : minute;
    
    if (isNaN(num)) {
      result.errors.push('Minute must be a valid number');
      return result;
    }
    
    const min = getConfig('VALIDATION.MINUTE.MIN', 0);
    const max = getConfig('VALIDATION.MINUTE.MAX', 120);
    const injuryTimeMax = getConfig('VALIDATION.MINUTE.INJURY_TIME_MAX', 150);
    
    if (num < min) {
      result.errors.push(`Minute cannot be negative`);
      return result;
    }
    
    if (num > injuryTimeMax) {
      result.errors.push(`Minute exceeds maximum allowed (${injuryTimeMax})`);
      return result;
    }
    
    if (num > max) {
      result.warnings.push('Minute indicates extended injury time');
    }
    
    result.valid = true;
    result.sanitized = num;
    
    return result;
  }


  /**
   * Enhanced batch size validation per checklist
   * @param {number} batchSize - Batch size to validate
   * @returns {Object} Validation result
   */
  static validateBatchSize(batchSize) {
    const result = {
      valid: false,
      sanitized: null,
      warnings: [],
      errors: []
    };
    
    const num = parseInt(batchSize, 10);
    if (isNaN(num)) {
      result.errors.push('Batch size must be a number');
      return result;
    }
    
    const min = getConfig('VALIDATION.BATCH_SIZE.MIN', 1);
    const max = getConfig('VALIDATION.BATCH_SIZE.MAX', 5); // Per checklist
    
    if (num < min || num > max) {
      result.errors.push(`Batch size must be between ${min} and ${max} (per checklist requirement)`);
      return result;
    }
    
    result.valid = true;
    result.sanitized = num;
    
    return result;
  }


  /**
   * Validate event data comprehensively
   * @param {Object} eventData - Event data to validate
   * @returns {Object} Validation result
   */
  static validateEventData(eventData) {
    const result = {
      valid: true,
      sanitizedData: { ...eventData },
      warnings: [],
      errors: []
    };
    
    if (!eventData || typeof eventData !== 'object') {
      result.valid = false;
      result.errors.push('Event data must be an object');
      return result;
    }
    
    // Required fields validation
    if (!eventData.eventType) {
      result.valid = false;
      result.errors.push('Missing eventType');
    }
    
    // Validate player name if present
    if (eventData.player) {
      const playerValidation = ValidationUtils.validatePlayerName(eventData.player);
      if (!playerValidation.valid) {
        result.valid = false;
        result.errors.push(...playerValidation.errors);
      } else {
        result.sanitizedData.player = playerValidation.sanitized;
        result.warnings.push(...playerValidation.warnings);
      }
    }
    
    // Validate minute if present
    if (eventData.minute !== undefined) {
      const minuteValidation = ValidationUtils.validateMinute(eventData.minute);
      if (!minuteValidation.valid) {
        result.valid = false;
        result.errors.push(...minuteValidation.errors);
      } else {
        result.sanitizedData.minute = minuteValidation.sanitized;
        result.warnings.push(...minuteValidation.warnings);
      }
    }
    
    // Validate card type if present
    if (eventData.cardType && !ValidationUtils.validateCardType(eventData.cardType)) {
      result.valid = false;
      result.errors.push(`Invalid card type: ${eventData.cardType}`);
    }
    
    return result;
  }


  /**
   * Enhanced card type validation including 2nd yellow
   * @param {string} cardType - Card type to validate
   * @returns {boolean} Is valid
   */
  static validateCardType(cardType) {
    if (!cardType || typeof cardType !== 'string') {
      return false;
    }
    
    const validCards = Object.values(getConfig('CARDS', {}));
    const normalized = cardType.toLowerCase().replace(/[^a-z_]/g, '');
    
    return validCards.includes(normalized) || 
           validCards.includes(cardType) ||
           cardType === 'second_yellow'; // Explicit support per checklist
  }
}


/**
 * Enhanced sheet utilities with better error recovery
 */
class SheetUtils {
  
  /**
   * Enhanced sheet getter with automatic repair
   * @param {string} sheetName - Name of sheet
   * @param {Array} headers - Headers if creating new sheet
   * @param {boolean} autoRepair - Automatically repair corrupted sheets
   * @returns {Sheet|null} Sheet object or null
   */
  static getOrCreateSheet(sheetName, headers = null, autoRepair = true) {
    logger.testHook('sheet_access_attempt', { sheetName, autoRepair });
    
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = ss.getSheetByName(sheetName);
      
      if (!sheet && headers) {
        logger.info(`Creating missing sheet: ${sheetName}`, { headers });
        sheet = ss.insertSheet(sheetName);
        
        if (headers && headers.length > 0) {
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
          sheet.setFrozenRows(1);
          
          // Apply basic formatting
          sheet.setColumnWidth(1, 150); // First column wider for timestamps
          sheet.getRange(1, 1, 1, headers.length).setBackground('#f0f0f0');
        }
      } else if (sheet && autoRepair) {
        // Check if sheet needs repair
        const repairResult = SheetUtils.repairSheetIfNeeded(sheet, headers);
        if (repairResult.repaired) {
          logger.info(`Repaired sheet: ${sheetName}`, repairResult);
        }
      }
      
      logger.testHook('sheet_access_success', { 
        sheetName,
        exists: !!sheet,
        created: !ss.getSheetByName(sheetName) && !!sheet
      });
      
      return sheet;
    } catch (error) {
      logger.error(`Failed to access sheet: ${sheetName}`, { error: error.toString() });
      return null;
    }
  }


  /**
   * Repair sheet if headers are missing or corrupted
   * @param {Sheet} sheet - Sheet to repair
   * @param {Array} expectedHeaders - Expected headers
   * @returns {Object} Repair result
   */
  static repairSheetIfNeeded(sheet, expectedHeaders) {
    const result = {
      repaired: false,
      actions: []
    };
    
    if (!sheet || !expectedHeaders) {
      return result;
    }
    
    try {
      const existingHeaders = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
      
      for (let i = 0; i < expectedHeaders.length; i++) {
        if (!existingHeaders[i] || existingHeaders[i] !== expectedHeaders[i]) {
          sheet.getRange(1, i + 1).setValue(expectedHeaders[i]);
          result.repaired = true;
          result.actions.push(`Fixed header column ${i + 1}: ${expectedHeaders[i]}`);
        }
      }
      
      if (result.repaired) {
        sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
        sheet.getRange(1, 1, 1, expectedHeaders.length).setBackground('#f0f0f0');
        sheet.setFrozenRows(1);
      }
      
    } catch (error) {
      logger.error('Failed to repair sheet', { error: error.toString() });
    }
    
    return result;
  }


  /**
   * Enhanced row append with better duplicate detection
   * @param {Sheet} sheet - Sheet object
   * @param {Array} values - Values to append
   * @param {number} keyColumn - Column to check for duplicates (1-based)
   * @param {string} idempotencyKey - Optional idempotency key
   * @returns {boolean} Success status
   */
  static appendRowSafe(sheet, values, keyColumn = null, idempotencyKey = null) {
    try {
      if (!sheet || !values || values.length === 0) {
        return false;
      }


      // Check idempotency if key provided
      if (idempotencyKey) {
        const idempotencyManager = new IdempotencyManager();
        if (idempotencyManager.isAlreadyProcessed(idempotencyKey)) {
          logger.info('Skipping duplicate row due to idempotency', { idempotencyKey });
          return true; // Not an error, just idempotent
        }
      }


      // Check for duplicates if keyColumn specified
      if (keyColumn && values[keyColumn - 1]) {
        const existingRow = SheetUtils.findRowByValue(sheet, keyColumn, values[keyColumn - 1]);
        if (existingRow) {
          logger.info('Duplicate row detected, skipping', { 
            keyColumn, 
            keyValue: values[keyColumn - 1]
          });
          return true; // Not an error, just idempotent
        }
      }


      sheet.appendRow(values);
      
      // Mark as processed if idempotency key provided
      if (idempotencyKey) {
        const idempotencyManager = new IdempotencyManager();
        idempotencyManager.markAsProcessed(idempotencyKey, { values });
      }


      logger.debug('Row appended successfully', { valueCount: values.length });
      return true;


    } catch (error) {
      logger.error('Failed to append row', { 
        error: error.toString(),
        values: values
      });
      return false;
    }
  }


  /**
   * Batch update multiple rows efficiently
   * @param {Sheet} sheet - Sheet object
   * @param {Array} rowsData - Array of row data arrays
   * @param {number} startRow - Starting row (1-based)
   * @returns {boolean} Success status
   */
  static batchUpdateRows(sheet, rowsData, startRow = null) {
    try {
      if (!sheet || !rowsData || rowsData.length === 0) {
        return false;
      }


      const numRows = rowsData.length;
      const numCols = Math.max(...rowsData.map(row => row.length));
      const actualStartRow = startRow || sheet.getLastRow() + 1;


      // Prepare data matrix
      const dataMatrix = rowsData.map(row => {
        // Pad row to consistent length
        const paddedRow = [...row];
        while (paddedRow.length < numCols) {
          paddedRow.push('');
        }
        return paddedRow;
      });


      sheet.getRange(actualStartRow, 1, numRows, numCols).setValues(dataMatrix);


      logger.debug('Batch update completed', { 
        rows: numRows, 
        columns: numCols,
        startRow: actualStartRow
      });
      
      return true;


    } catch (error) {
      logger.error('Batch update failed', { error: error.toString() });
      return false;
    }
  }
}


// Create singleton instances
const idempotencyManager = new IdempotencyManager();


// Export enhanced classes for global access
globalThis.BaseAutomationComponent = BaseAutomationComponent;
globalThis.IdempotencyManager = IdempotencyManager;
globalThis.ValidationUtils = ValidationUtils;
globalThis.SheetUtils = SheetUtils;
globalThis.idempotencyManager = idempotencyManager;

