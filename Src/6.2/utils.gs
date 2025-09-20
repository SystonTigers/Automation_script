
/**
 * @fileoverview Enhanced utility functions with additional functionality from *claude v6
 * @version 6.0.0
 * @author Senior Software Architect
 * @description Extended utilities including string handling, validation, and enhanced date operations
 * 
 * REPLACE EXISTING utils.js - This contains everything from Script 6.1 plus additional functions
 */

// ==================== SHEET UTILITIES ====================

/**
 * Sheet utilities for safe Google Sheets operations
 */
const SheetUtils = {
  
  /**
   * Get or create sheet with specified columns
   * @param {string} sheetName - Sheet name
   * @param {Array<string>} requiredColumns - Required column headers
   * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} Sheet object or null
   */
  getOrCreateSheet(sheetName, requiredColumns = []) {
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = spreadsheet.getSheetByName(sheetName);
      
      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
        
        // Add required columns if specified
        if (requiredColumns.length > 0) {
          const headerRange = sheet.getRange(1, 1, 1, requiredColumns.length);
          headerRange.setValues([requiredColumns]);
          headerRange.setFontWeight('bold');
          headerRange.setBackground('#f0f0f0');
        }
      } else if (requiredColumns.length > 0) {
        // Verify and add missing columns
        this.ensureColumnsExist(sheet, requiredColumns);
      }
      
      return sheet;
    } catch (error) {
      console.error(`Failed to get or create sheet: ${sheetName}`, error);
      return null;
    }
  },

  /**
   * Ensure required columns exist in sheet
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {Array<string>} requiredColumns - Required columns
   */
  ensureColumnsExist(sheet, requiredColumns) {
    try {
      const lastColumn = sheet.getLastColumn();
      const currentHeaders = lastColumn > 0 ? 
        sheet.getRange(1, 1, 1, lastColumn).getValues()[0] : [];
      
      const missingColumns = requiredColumns.filter(col => !currentHeaders.includes(col));
      
      if (missingColumns.length > 0) {
        const startColumn = currentHeaders.length + 1;
        const range = sheet.getRange(1, startColumn, 1, missingColumns.length);
        range.setValues([missingColumns]);
        range.setFontWeight('bold');
        range.setBackground('#f0f0f0');
      }
    } catch (error) {
      console.error('Failed to ensure columns exist:', error);
    }
  },

  /**
   * Add row from object to sheet
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {Object} dataObject - Data object with column names as keys
   * @returns {boolean} Success status
   */
  addRowFromObject(sheet, dataObject) {
    try {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const rowData = headers.map(header => dataObject[header] || '');
      
      const nextRow = sheet.getLastRow() + 1;
      sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
      
      return true;
    } catch (error) {
      console.error('Failed to add row from object:', error);
      return false;
    }
  },

  /**
   * Find row by criteria
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {Object} criteria - Search criteria
   * @returns {Object|null} Found row object or null
   */
  findRowByCriteria(sheet, criteria) {
    try {
      const data = this.getAllDataAsObjects(sheet);
      
      return data.find(row => {
        return Object.keys(criteria).every(key => {
          return String(row[key]).trim() === String(criteria[key]).trim();
        });
      });
    } catch (error) {
      console.error('Failed to find row by criteria:', error);
      return null;
    }
  },

  /**
   * Update row by criteria
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {Object} criteria - Search criteria
   * @param {Object} updates - Updates to apply
   * @returns {boolean} Success status
   */
  updateRowByCriteria(sheet, criteria, updates) {
    try {
      const lastRow = sheet.getLastRow();
      const lastColumn = sheet.getLastColumn();
      
      if (lastRow <= 1 || lastColumn === 0) return false;
      
      const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      const data = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
      
      for (let i = 0; i < data.length; i++) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = data[i][index];
        });
        
        // Check if row matches criteria
        const matches = Object.keys(criteria).every(key => {
          return String(row[key]).trim() === String(criteria[key]).trim();
        });
        
        if (matches) {
          // Apply updates
          Object.keys(updates).forEach(key => {
            const columnIndex = headers.indexOf(key);
            if (columnIndex !== -1) {
              const value = updates[key];
              sheet.getRange(i + 2, columnIndex + 1).setValue(value);
            }
          });
          return true;
        }
      }
      
      return false;
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
  },

  /**
   * Get column index by header name
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {string} headerName - Header name
   * @returns {number} Column index (1-based) or -1 if not found
   */
  getColumnIndex(sheet, headerName) {
    try {
      const lastColumn = sheet.getLastColumn();
      if (lastColumn === 0) return -1;
      
      const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      const index = headers.indexOf(headerName);
      
      return index === -1 ? -1 : index + 1; // Convert to 1-based
    } catch (error) {
      console.error('Failed to get column index:', error);
      return -1;
    }
  },

  /**
   * Sort sheet by column
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet object
   * @param {string} columnHeader - Column header to sort by
   * @param {boolean} ascending - Sort order (default: true)
   * @returns {boolean} Success status
   */
  sortByColumn(sheet, columnHeader, ascending = true) {
    try {
      const columnIndex = this.getColumnIndex(sheet, columnHeader);
      if (columnIndex === -1) return false;
      
      const lastRow = sheet.getLastRow();
      const lastColumn = sheet.getLastColumn();
      
      if (lastRow <= 2) return true; // No data to sort
      
      const range = sheet.getRange(2, 1, lastRow - 1, lastColumn);
      range.sort({column: columnIndex, ascending: ascending});
      
      return true;
    } catch (error) {
      console.error('Failed to sort by column:', error);
      return false;
    }
  }
};

// ==================== DATE UTILITIES ====================

/**
 * Enhanced date utilities for consistent date handling
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
   * Format date and time for UK format
   * @param {Date} date - Date to format
   * @returns {string} Formatted date/time string
   */
  formatDateTime(date) {
    if (!(date instanceof Date)) return '';
    return Utilities.formatDate(date, getConfig('SYSTEM.TIMEZONE'), 'dd/MM/yyyy HH:mm');
  },

  /**
   * Format date for ISO string
   * @param {Date} date - Date to format
   * @returns {string} ISO formatted string
   */
  formatISO(date) {
    if (!(date instanceof Date)) return '';
    return date.toISOString();
  },

  /**
   * Parse UK format date string
   * @param {string} dateString - Date string in DD/MM/YYYY format
   * @returns {Date|null} Parsed date or null
   */
  parseUK(dateString) {
    try {
      if (!dateString || typeof dateString !== 'string') return null;
      
      const parts = dateString.split('/');
      if (parts.length !== 3) return null;
      
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-based
      const year = parseInt(parts[2]);
      
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
   * Add days to date
   * @param {Date} date - Base date
   * @param {number} days - Days to add (can be negative)
   * @returns {Date} New date
   */
  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  /**
   * Get day of week (0 = Sunday, 1 = Monday, etc.)
   * @param {Date} date - Date to check
   * @returns {number} Day of week
   */
  getDayOfWeek(date) {
    return date.getDay();
  },

  /**
   * Get week start date (Monday)
   * @param {Date} date - Date within the week
   * @returns {Date} Week start date
   */
  getWeekStart(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(date.setDate(diff));
  },

  /**
   * Get week end date (Sunday)
   * @param {Date} date - Date within the week
   * @returns {Date} Week end date
   */
  getWeekEnd(date) {
    const weekStart = this.getWeekStart(new Date(date));
    return this.addDays(weekStart, 6);
  },

  /**
   * Get month name
   * @param {number} month - Month number (1-12)
   * @returns {string} Month name
   */
  getMonthName(month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
  },

  /**
   * Check if date is today
   * @param {Date} date - Date to check
   * @returns {boolean} True if date is today
   */
  isToday(date) {
    const today = this.now();
    return date.toDateString() === today.toDateString();
  },

  /**
   * Check if date is this week
   * @param {Date} date - Date to check
   * @returns {boolean} True if date is this week
   */
  isThisWeek(date) {
    const today = this.now();
    const weekStart = this.getWeekStart(new Date(today));
    const weekEnd = this.getWeekEnd(new Date(today));
    
    return date >= weekStart && date <= weekEnd;
  },

  /**
   * Get days until date
   * @param {Date} date - Target date
   * @returns {number} Days until date (negative if past)
   */
  getDaysUntil(date) {
    const today = this.now();
    const timeDiff = date.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
};

// ==================== STRING UTILITIES ====================

/**
 * String utilities for text processing and validation
 */
const StringUtils = {
  
  /**
   * Clean player name (remove extra spaces, standardize case)
   * @param {string} name - Player name
   * @returns {string} Cleaned name
   */
  cleanPlayerName(name) {
    if (!name || typeof name !== 'string') return '';
    
    return name.trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  /**
   * Generate safe filename from string
   * @param {string} text - Input text
   * @returns {string} Safe filename
   */
  toSafeFilename(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text.trim()
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase();
  },

  /**
   * Generate unique ID
   * @param {string} prefix - ID prefix
   * @returns {string} Unique ID
   */
  generateId(prefix = 'id') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  },

  /**
   * Truncate text to specified length
   * @param {string} text - Input text
   * @param {number} maxLength - Maximum length
   * @param {string} suffix - Suffix for truncated text
   * @returns {string} Truncated text
   */
  truncate(text, maxLength = 100, suffix = '...') {
    if (!text || typeof text !== 'string') return '';
    
    if (text.length <= maxLength) return text;
    
    return text.substr(0, maxLength - suffix.length) + suffix;
  },

  /**
   * Capitalize first letter
   * @param {string} text - Input text
   * @returns {string} Capitalized text
   */
  capitalize(text) {
    if (!text || typeof text !== 'string') return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  },

  /**
   * Convert to title case
   * @param {string} text - Input text
   * @returns {string} Title case text
   */
  toTitleCase(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  },

  /**
   * Slugify text for URLs
   * @param {string} text - Input text
   * @returns {string} Slugified text
   */
  slugify(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  },

  /**
   * Extract initials from name
   * @param {string} name - Full name
   * @returns {string} Initials
   */
  getInitials(name) {
    if (!name || typeof name !== 'string') return '';
    
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  }
};

// ==================== VALIDATION UTILITIES ====================

/**
 * Validation utilities for data checking
 */
const ValidationUtils = {
  
  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },

  /**
   * Validate UK phone number
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid UK phone
   */
  isValidUKPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    
    const ukPhoneRegex = /^(\+44\s?7\d{3}|\(?07\d{3}\)?\s?)\s?\d{3}\s?\d{3}$/;
    return ukPhoneRegex.test(phone.replace(/\s/g, ''));
  },

  /**
   * Validate match minute (1-120)
   * @param {string|number} minute - Minute to validate
   * @returns {boolean} True if valid minute
   */
  isValidMinute(minute) {
    const num = parseInt(minute);
    return !isNaN(num) && num >= 1 && num <= 120;
  },

  /**
   * Validate score (0-99)
   * @param {string|number} score - Score to validate
   * @returns {boolean} True if valid score
   */
  isValidScore(score) {
    const num = parseInt(score);
    return !isNaN(num) && num >= 0 && num <= 99;
  },

  /**
   * Validate date string (DD/MM/YYYY)
   * @param {string} dateString - Date string to validate
   * @returns {boolean} True if valid date format
   */
  isValidDate(dateString) {
    return DateUtils.parseUK(dateString) !== null;
  },

  /**
   * Validate required fields in object
   * @param {Object} obj - Object to validate
   * @param {Array<string>} requiredFields - Required field names
   * @returns {Object} Validation result
   */
  validateRequiredFields(obj, requiredFields) {
    const missing = requiredFields.filter(field => {
      const value = obj[field];
      return value === undefined || value === null || value === '';
    });
    
    return {
      isValid: missing.length === 0,
      missingFields: missing
    };
  },

  /**
   * Sanitize HTML content
   * @param {string} html - HTML content
   * @returns {string} Sanitized content
   */
  sanitizeHtml(html) {
    if (!html || typeof html !== 'string') return '';
    
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
               .replace(/<[^>]*>/g, '')
               .trim();
  }
};

// ==================== ARRAY UTILITIES ====================

/**
 * Array utilities for data manipulation
 */
const ArrayUtils = {
  
  /**
   * Remove duplicates from array
   * @param {Array} array - Input array
   * @returns {Array} Array without duplicates
   */
  removeDuplicates(array) {
    return [...new Set(array)];
  },

  /**
   * Group array by property
   * @param {Array} array - Input array
   * @param {string} property - Property to group by
   * @returns {Object} Grouped object
   */
  groupBy(array, property) {
    return array.reduce((groups, item) => {
      const key = item[property];
      groups[key] = groups[key] || [];
      groups[key].push(item);
      return groups;
    }, {});
  },

  /**
   * Sort array by property
   * @param {Array} array - Input array
   * @param {string} property - Property to sort by
   * @param {boolean} ascending - Sort order
   * @returns {Array} Sorted array
   */
  sortBy(array, property, ascending = true) {
    return array.sort((a, b) => {
      const aVal = a[property];
      const bVal = b[property];
      
      if (aVal < bVal) return ascending ? -1 : 1;
      if (aVal > bVal) return ascending ? 1 : -1;
      return 0;
    });
  },

  /**
   * Find max value in array by property
   * @param {Array} array - Input array
   * @param {string} property - Property to compare
   * @returns {*} Item with max value
   */
  maxBy(array, property) {
    if (array.length === 0) return null;
    
    return array.reduce((max, item) => {
      return item[property] > max[property] ? item : max;
    });
  },

  /**
   * Find min value in array by property
   * @param {Array} array - Input array
   * @param {string} property - Property to compare
   * @returns {*} Item with min value
   */
  minBy(array, property) {
    if (array.length === 0) return null;
    
    return array.reduce((min, item) => {
      return item[property] < min[property] ? item : min;
    });
  },

  /**
   * Calculate sum of property values
   * @param {Array} array - Input array
   * @param {string} property - Property to sum
   * @returns {number} Sum of values
   */
  sumBy(array, property) {
    return array.reduce((sum, item) => {
      const value = parseFloat(item[property]) || 0;
      return sum + value;
    }, 0);
  },

  /**
   * Chunk array into smaller arrays
   * @param {Array} array - Input array
   * @param {number} size - Chunk size
   * @returns {Array<Array>} Chunked arrays
   */
  chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
};

// ==================== UTILITY INITIALIZATION ====================

/**
 * Initialize utilities system
 * @returns {Object} Initialization result
 */
function initializeUtils() {
  try {
    // Test basic functionality
    const testDate = DateUtils.now();
    const testString = StringUtils.cleanPlayerName(' John  SMITH ');
    const testValidation = ValidationUtils.isValidMinute(45);
    
    return {
      success: true,
      version: '6.0.0',
      components: {
        SheetUtils: 'ready',
        DateUtils: 'ready',
        StringUtils: 'ready',
        ValidationUtils: 'ready',
        ArrayUtils: 'ready'
      },
      test_results: {
        date_formatting: !!testDate,
        string_cleaning: testString === 'John Smith',
        validation: testValidation === true
      }
    };
    
  } catch (error) {
    console.error('Utilities initialization failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

