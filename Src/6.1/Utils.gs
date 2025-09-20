/**
 * @fileoverview Utility Functions for Syston Tigers Football Automation System
 * @version 6.0.0
 * @author Senior Software Architect
 * @description Core utility functions for sheet operations, date handling, and common tasks
 */

// ==================== SHEET UTILITIES ====================

/**
 * Sheet utilities for safe Google Sheets operations
 */
const SheetUtils = {
  
  /**
   * Get or create a sheet with required columns
   * @param {string} sheetName - Name of the sheet
   * @param {Array<string>} requiredColumns - Required column headers
   * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} Sheet object or null if failed
   */
  getOrCreateSheet(sheetName, requiredColumns = []) {
    try {
      const spreadsheetId = getSecureProperty('SPREADSHEET_ID');
      if (!spreadsheetId) {
        throw new Error('SPREADSHEET_ID not configured');
      }
      
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      let sheet = spreadsheet.getSheetByName(sheetName);
      
      if (!sheet) {
        console.log(`Creating new sheet: ${sheetName}`);
        sheet = spreadsheet.insertSheet(sheetName);
        
        // Add required columns if specified
        if (requiredColumns.length > 0) {
          const headerRange = sheet.getRange(1, 1, 1, requiredColumns.length);
          headerRange.setValues([requiredColumns]);
          headerRange.setFontWeight('bold');
          headerRange.setBackground('#f0f0f0');
        }
      }
      
      // Validate existing columns
      if (requiredColumns.length > 0) {
        this.validateColumns(sheet, requiredColumns);
      }
      
      return sheet;
    } catch (error) {
      console.error(`Failed to get/create sheet ${sheetName}:`, error);
      return null;
    }
  },

  /**
   * Validate that sheet has required columns
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet to validate
   * @param {Array<string>} requiredColumns - Required columns
   * @returns {boolean} Validation success
   */
  validateColumns(sheet, requiredColumns) {
    try {
      const lastColumn = sheet.getLastColumn();
      if (lastColumn === 0) {
        // Empty sheet, add headers
        const headerRange = sheet.getRange(1, 1, 1, requiredColumns.length);
        headerRange.setValues([requiredColumns]);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#f0f0f0');
        return true;
      }
      
      const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        console.warn(`Missing columns in ${sheet.getName()}:`, missingColumns);
        // Add missing columns
        const startCol = lastColumn + 1;
        const newRange = sheet.getRange(1, startCol, 1, missingColumns.length);
        newRange.setValues([missingColumns]);
        newRange.setFontWeight('bold');
        newRange.setBackground('#f0f0f0');
      }
      
      return true;
    } catch (error) {
      console.error('Column validation failed:', error);
      return false;
    }
  },

  /**
   * Get column index by header name
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {string} columnName - Column header name
   * @returns {number} Column index (1-based) or -1 if not found
   */
  getColumnIndex(sheet, columnName) {
    try {
      const lastColumn = sheet.getLastColumn();
      if (lastColumn === 0) return -1;
      
      const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      return headers.indexOf(columnName) + 1; // Convert to 1-based index
    } catch (error) {
      console.error(`Failed to get column index for ${columnName}:`, error);
      return -1;
    }
  },

  /**
   * Add row to sheet with data object
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {Object} dataObject - Data to add as key-value pairs
   * @returns {boolean} Success status
   */
  addRowFromObject(sheet, dataObject) {
    try {
      const lastColumn = sheet.getLastColumn();
      if (lastColumn === 0) {
        console.error('Cannot add row to sheet without headers');
        return false;
      }
      
      const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      const rowData = headers.map(header => dataObject[header] || '');
      
      const nextRow = sheet.getLastRow() + 1;
      const range = sheet.getRange(nextRow, 1, 1, lastColumn);
      range.setValues([rowData]);
      
      return true;
    } catch (error) {
      console.error('Failed to add row from object:', error);
      return false;
    }
  },

  /**
   * Find row by criteria
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {Object} criteria - Search criteria as key-value pairs
   * @returns {number} Row number or -1 if not found
   */
  findRowByCriteria(sheet, criteria) {
    try {
      const lastRow = sheet.getLastRow();
      const lastColumn = sheet.getLastColumn();
      
      if (lastRow <= 1 || lastColumn === 0) return -1;
      
      const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      const data = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
      
      for (let i = 0; i < data.length; i++) {
        let matches = true;
        for (const [key, value] of Object.entries(criteria)) {
          const colIndex = headers.indexOf(key);
          if (colIndex === -1 || data[i][colIndex] !== value) {
            matches = false;
            break;
          }
        }
        if (matches) {
          return i + 2; // Convert to 1-based row number
        }
      }
      
      return -1;
    } catch (error) {
      console.error('Failed to find row by criteria:', error);
      return -1;
    }
  },

  /**
   * Update row by criteria
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {Object} criteria - Search criteria
   * @param {Object} updateData - Data to update
   * @returns {boolean} Success status
   */
  updateRowByCriteria(sheet, criteria, updateData) {
    try {
      const rowNumber = this.findRowByCriteria(sheet, criteria);
      if (rowNumber === -1) return false;
      
      const lastColumn = sheet.getLastColumn();
      const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      
      for (const [key, value] of Object.entries(updateData)) {
        const colIndex = headers.indexOf(key) + 1; // Convert to 1-based
        if (colIndex > 0) {
          sheet.getRange(rowNumber, colIndex).setValue(value);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update row by criteria:', error);
      return false;
    }
  },

  /**
   * Get all data as objects
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {number} startRow - Starting row (default: 2)
   * @returns {Array<Object>} Array of row objects
   */
  getAllDataAsObjects(sheet, startRow = 2) {
    try {
      const lastRow = sheet.getLastRow();
      const lastColumn = sheet.getLastColumn();
      
      if (lastRow < startRow || lastColumn === 0) return [];
      
      const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, lastColumn).getValues();
      
      return data.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });
    } catch (error) {
      console.error('Failed to get all data as objects:', error);
      return [];
    }
  },

  /**
   * Clear sheet data but keep headers
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @returns {boolean} Success status
   */
  clearDataKeepHeaders(sheet) {
    try {
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) return true; // No data to clear
      
      const lastColumn = sheet.getLastColumn();
      if (lastColumn === 0) return true;
      
      const range = sheet.getRange(2, 1, lastRow - 1, lastColumn);
      range.clear();
      
      return true;
    } catch (error) {
      console.error('Failed to clear sheet data:', error);
      return false;
    }
  }
};

// ==================== DATE UTILITIES ====================

/**
 * Date utilities for consistent date handling
 */
const DateUtils = {
  
  /**
   * Get current date/time
   * @returns {Date} Current date
   */
  now() {
    return new Date();
  },

  /**
   * Format date for UK format (DD/MM/YYYY)
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  formatUK(date) {
    if (!(date instanceof Date)) return '';
    return Utilities.formatDate(date, getConfig('SYSTEM.TIMEZONE'), 'dd/MM/yyyy');
  },

  /**
   * Format time for UK format (HH:mm)
   * @param {Date} date - Date to format
   * @returns {string} Formatted time string
   */
  formatTime(date) {
    if (!(date instanceof Date)) return '';
    return Utilities.formatDate(date, getConfig('SYSTEM.TIMEZONE'), 'HH:mm');
  },

  /**
   * Format datetime for logging (ISO format)
   * @param {Date} date - Date to format
   * @returns {string} ISO formatted string
   */
  formatISO(date) {
    if (!(date instanceof Date)) return '';
    return date.toISOString();
  },

  /**
   * Parse UK date format (DD/MM/YYYY)
   * @param {string} dateString - Date string to parse
   * @returns {Date|null} Parsed date or null if invalid
   */
  parseUK(dateString) {
    try {
      if (!dateString) return null;
      
      const parts = dateString.split('/');
      if (parts.length !== 3) return null;
      
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-based
      const year = parseInt(parts[2], 10);
      
      const date = new Date(year, month, day);
      
      // Validate the date
      if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
        return null;
      }
      
      return date;
    } catch (error) {
      console.error('Failed to parse UK date:', error);
      return null;
    }
  },

  /**
   * Get day of week (0 = Sunday, 1 = Monday, etc.)
   * @param {Date} date - Date to check
   * @returns {number} Day of week
   */
  getDayOfWeek(date) {
    if (!(date instanceof Date)) return -1;
    return date.getDay();
  },

  /**
   * Get week number of month (1-4/5)
   * @param {Date} date - Date to check
   * @returns {number} Week number
   */
  getWeekOfMonth(date) {
    if (!(date instanceof Date)) return -1;
    
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstDayOfWeek = firstDay.getDay();
    const dayOfMonth = date.getDate();
    
    return Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
  },

  /**
   * Check if date is today
   * @param {Date} date - Date to check
   * @returns {boolean} Is today
   */
  isToday(date) {
    if (!(date instanceof Date)) return false;
    
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  },

  /**
   * Check if date is this week
   * @param {Date} date - Date to check
   * @returns {boolean} Is this week
   */
  isThisWeek(date) {
    if (!(date instanceof Date)) return false;
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    endOfWeek.setHours(23, 59, 59, 999);
    
    return date >= startOfWeek && date <= endOfWeek;
  },

  /**
   * Check if date is this month
   * @param {Date} date - Date to check
   * @returns {boolean} Is this month
   */
  isThisMonth(date) {
    if (!(date instanceof Date)) return false;
    
    const today = new Date();
    return date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  },

  /**
   * Add days to date
   * @param {Date} date - Base date
   * @param {number} days - Days to add
   * @returns {Date} New date
   */
  addDays(date, days) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  },

  /**
   * Get days between dates
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {number} Days difference
   */
  daysBetween(date1, date2) {
    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
};

// ==================== STRING UTILITIES ====================

/**
 * String utilities for text processing
 */
const StringUtils = {
  
  /**
   * Capitalize first letter of each word
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  toTitleCase(str) {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },

  /**
   * Generate safe filename from string
   * @param {string} str - String to convert
   * @returns {string} Safe filename
   */
  toSafeFilename(str) {
    if (!str) return '';
    return str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  },

  /**
   * Truncate string with ellipsis
   * @param {string} str - String to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated string
   */
  truncate(str, maxLength) {
    if (!str || str.length <= maxLength) return str || '';
    return str.substring(0, maxLength - 3) + '...';
  },

  /**
   * Clean and normalize player name
   * @param {string} name - Player name
   * @returns {string} Cleaned name
   */
  cleanPlayerName(name) {
    if (!name) return '';
    return name.toString().trim().replace(/\s+/g, ' ');
  },

  /**
   * Generate unique ID
   * @param {string} prefix - ID prefix
   * @returns {string} Unique ID
   */
  generateId(prefix = 'id') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}_${timestamp}_${random}`;
  },

  /**
   * Sanitize text for social media
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text
   */
  sanitizeForSocial(text) {
    if (!text) return '';
    return text.replace(/[^\w\s.,!?@#-]/g, '').trim();
  }
};

// ==================== VALIDATION UTILITIES ====================

/**
 * Validation utilities
 */
const ValidationUtils = {
  
  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid email
   */
  isValidEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate UK phone number
   * @param {string} phone - Phone number to validate
   * @returns {boolean} Is valid UK phone
   */
  isValidUKPhone(phone) {
    if (!phone) return false;
    const ukPhoneRegex = /^(\+44|0)[1-9]\d{8,9}$/;
    return ukPhoneRegex.test(phone.replace(/\s/g, ''));
  },

  /**
   * Validate minute value (0-90+)
   * @param {number|string} minute - Minute to validate
   * @returns {boolean} Is valid minute
   */
  isValidMinute(minute) {
    const num = parseInt(minute, 10);
    return !isNaN(num) && num >= 0 && num <= 120;
  },

  /**
   * Validate score (0-99)
   * @param {number|string} score - Score to validate
   * @returns {boolean} Is valid score
   */
  isValidScore(score) {
    const num = parseInt(score, 10);
    return !isNaN(num) && num >= 0 && num <= 99;
  },

  /**
   * Check if player name is opposition
   * @param {string} playerName - Player name to check
   * @returns {boolean} Is opposition entry
   */
  isOppositionPlayer(playerName) {
    const oppositionEntries = getConfig('PLAYERS.OPPOSITION_ENTRIES', []);
    return oppositionEntries.includes(playerName);
  },

  /**
   * Validate card type
   * @param {string} cardType - Card type to validate
   * @returns {boolean} Is valid card type
   */
  isValidCardType(cardType) {
    const validCards = getConfig('PLAYERS.CARD_TYPES', []);
    return validCards.includes(cardType);
  }
};

// ==================== ARRAY UTILITIES ====================

/**
 * Array utilities for data processing
 */
const ArrayUtils = {
  
  /**
   * Remove duplicates from array
   * @param {Array} arr - Array to deduplicate
   * @returns {Array} Array without duplicates
   */
  removeDuplicates(arr) {
    return [...new Set(arr)];
  },

  /**
   * Group array by property
   * @param {Array} arr - Array to group
   * @param {string} prop - Property to group by
   * @returns {Object} Grouped object
   */
  groupBy(arr, prop) {
    return arr.reduce((groups, item) => {
      const key = item[prop];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  },

  /**
   * Sort array by property
   * @param {Array} arr - Array to sort
   * @param {string} prop - Property to sort by
   * @param {boolean} ascending - Sort direction
   * @returns {Array} Sorted array
   */
  sortBy(arr, prop, ascending = true) {
    return arr.sort((a, b) => {
      const aVal = a[prop];
      const bVal = b[prop];
      
      if (aVal < bVal) return ascending ? -1 : 1;
      if (aVal > bVal) return ascending ? 1 : -1;
      return 0;
    });
  },

  /**
   * Find item by property value
   * @param {Array} arr - Array to search
   * @param {string} prop - Property to match
   * @param {*} value - Value to find
   * @returns {*} Found item or undefined
   */
  findBy(arr, prop, value) {
    return arr.find(item => item[prop] === value);
  },

  /**
   * Check if array is empty or contains only empty values
   * @param {Array} arr - Array to check
   * @returns {boolean} Is effectively empty
   */
  isEmpty(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return true;
    return arr.every(item => !item || item === '');
  }
};

// ==================== CACHE UTILITIES ====================

/**
 * Cache utilities for performance optimization
 */
const CacheUtils = {
  
  /**
   * Get from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or null
   */
  get(key) {
    try {
      if (!getConfig('PERFORMANCE.CACHE_ENABLED')) return null;
      
      const cache = CacheService.getScriptCache();
      const cached = cache.get(key);
      
      if (cached) {
        const parsed = JSON.parse(cached);
        const expiryTime = parsed.expiry || 0;
        
        if (Date.now() < expiryTime) {
          return parsed.data;
        } else {
          // Expired, remove from cache
          cache.remove(key);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} durationMinutes - Cache duration in minutes
   * @returns {boolean} Success status
   */
  set(key, value, durationMinutes = null) {
    try {
      if (!getConfig('PERFORMANCE.CACHE_ENABLED')) return false;
      
      const duration = durationMinutes || getConfig('PERFORMANCE.CACHE_DURATION_MINUTES', 30);
      const expiryTime = Date.now() + (duration * 60 * 1000);
      
      const cacheData = {
        data: value,
        expiry: expiryTime,
        created: Date.now()
      };
      
      const cache = CacheService.getScriptCache();
      cache.put(key, JSON.stringify(cacheData), duration * 60); // Convert to seconds
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  /**
   * Remove from cache
   * @param {string} key - Cache key
   * @returns {boolean} Success status
   */
  remove(key) {
    try {
      const cache = CacheService.getScriptCache();
      cache.remove(key);
      return true;
    } catch (error) {
      console.error('Cache remove error:', error);
      return false;
    }
  },

  /**
   * Clear all cache
   * @returns {boolean} Success status
   */
  clear() {
    try {
      const cache = CacheService.getScriptCache();
      cache.removeAll(cache.getKeys());
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }
};

// ==================== RETRY UTILITIES ====================

/**
 * Retry utilities for reliable operations
 */
const RetryUtils = {
  
  /**
   * Execute function with retry logic
   * @param {Function} fn - Function to execute
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} delayMs - Delay between retries
   * @param {boolean} exponentialBackoff - Use exponential backoff
   * @returns {*} Function result
   */
  async withRetry(fn, maxRetries = null, delayMs = null, exponentialBackoff = null) {
    const retries = maxRetries || getConfig('ERROR_HANDLING.DEFAULT_MAX_RETRIES', 3);
    const delay = delayMs || getConfig('ERROR_HANDLING.DEFAULT_RETRY_DELAY', 1000);
    const useBackoff = exponentialBackoff !== null ? 
      exponentialBackoff : 
      getConfig('ERROR_HANDLING.EXPONENTIAL_BACKOFF', true);
    
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === retries) {
          throw error; // Final attempt failed
        }
        
        // Calculate delay for next attempt
        const currentDelay = useBackoff ? delay * Math.pow(2, attempt) : delay;
        
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${currentDelay}ms:`, error.message);
        await this.delay(currentDelay);
      }
    }
    
    throw lastError;
  },

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// ==================== ERROR HANDLING UTILITIES ====================

/**
 * Error handling utilities
 */
const ErrorUtils = {
  
  /**
   * Create standardized error object
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {Object} context - Additional context
   * @returns {Object} Standardized error
   */
  createError(message, code = 'UNKNOWN_ERROR', context = {}) {
    return {
      message: message,
      code: code,
      context: context,
      timestamp: new Date().toISOString(),
      source: 'syston_tigers_automation'
    };
  },

  /**
   * Check if error is critical
   * @param {string} errorCode - Error code to check
   * @returns {boolean} Is critical error
   */
  isCriticalError(errorCode) {
    const criticalErrors = getConfig('ERROR_HANDLING.CRITICAL_ERRORS', []);
    return criticalErrors.includes(errorCode);
  },

  /**
   * Send error notification if critical
   * @param {Object} error - Error object
   * @returns {boolean} Notification sent
   */
  notifyIfCritical(error) {
    try {
      if (!this.isCriticalError(error.code)) return false;
      if (!getConfig('ERROR_HANDLING.ALERT_ON_CRITICAL_ERROR', true)) return false;
      
      const adminEmail = getSecureProperty(getConfig('ERROR_HANDLING.ADMIN_EMAIL_PROPERTY', ''));
      if (!adminEmail) return false;
      
      const subject = `Critical Error in ${getConfig('SYSTEM.NAME')}`;
      const body = `Critical error occurred:
      
Error Code: ${error.code}
Message: ${error.message}
Timestamp: ${error.timestamp}
Context: ${JSON.stringify(error.context, null, 2)}

Please investigate immediately.`;
      
      MailApp.sendEmail(adminEmail, subject, body);
      return true;
    } catch (emailError) {
      console.error('Failed to send critical error notification:', emailError);
      return false;
    }
  }
};

// ==================== PUBLIC API ====================

/**
 * Initialize all utilities
 * @returns {Object} Initialization result
 */
function initializeUtils() {
  try {
    // Test basic functionality
    const testResults = {
      sheetUtils: typeof SheetUtils === 'object',
      dateUtils: typeof DateUtils === 'object',
      stringUtils: typeof StringUtils === 'object',
      validationUtils: typeof ValidationUtils === 'object',
      arrayUtils: typeof ArrayUtils === 'object',
      cacheUtils: typeof CacheUtils === 'object',
      retryUtils: typeof RetryUtils === 'object',
      errorUtils: typeof ErrorUtils === 'object'
    };
    
    const allPassed = Object.values(testResults).every(result => result === true);
    
    return {
      success: allPassed,
      version: '6.0.0',
      testResults: testResults,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  } catch (error) {
    console.error('Failed to initialize utils:', error);
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test all utility functions
 * @returns {Object} Test results
 */
function testUtils() {
  const results = {};
  
  try {
    // Test DateUtils
    results.dateUtils = {
      now: DateUtils.now() instanceof Date,
      formatUK: DateUtils.formatUK(new Date()) !== '',
      parseUK: DateUtils.parseUK('20/09/2025') instanceof Date
    };
    
    // Test StringUtils
    results.stringUtils = {
      toTitleCase: StringUtils.toTitleCase('hello world') === 'Hello World',
      generateId: StringUtils.generateId('test').startsWith('test_'),
      cleanPlayerName: StringUtils.cleanPlayerName('  John Smith  ') === 'John Smith'
    };
    
    // Test ValidationUtils
    results.validationUtils = {
      isValidEmail: ValidationUtils.isValidEmail('test@example.com') === true,
      isValidMinute: ValidationUtils.isValidMinute(45) === true,
      isOppositionPlayer: ValidationUtils.isOppositionPlayer('Goal') === true
    };
    
    // Test ArrayUtils
    const testArray = [{name: 'John', score: 10}, {name: 'Jane', score: 20}];
    results.arrayUtils = {
      removeDuplicates: ArrayUtils.removeDuplicates([1,1,2,3]).length === 3,
      findBy: ArrayUtils.findBy(testArray, 'name', 'John').score === 10,
      isEmpty: ArrayUtils.isEmpty([]) === true
    };
    
    return {
      success: true,
      results: results,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      results: results,
      timestamp: new Date().toISOString()
    };
  }
}

