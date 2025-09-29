/**
 * @fileoverview Monthly summaries core manager - Base class and common functionality
 * @version 6.2.0
 * @author Senior Software Architect
 * @description Core MonthlySummariesManager class with shared utilities (split from monthly-summaries.gs for performance)
 */

// ==================== MONTHLY SUMMARIES CORE ====================

/**
 * MonthlySummariesManager orchestrates monthly fixtures/results summaries.
 * Split into modules for performance optimization.
 */
class MonthlySummariesManager {

  constructor() {
    this.loggerName = 'MonthlySummaries';
    this._logger = null;
    this.makeIntegration = new MakeIntegration();
    this.summaryConfig = getConfigValue('MONTHLY_SUMMARIES', {});
    this.monthlyContentSheetName = getConfigValue('SHEETS.TAB_NAMES.MONTHLY_CONTENT');
    this.monthlyContentColumns = getConfigValue('SHEETS.REQUIRED_COLUMNS.MONTHLY_CONTENT', []);
    this.properties = (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties)
      ? PropertiesService.getScriptProperties()
      : null;
    this.cache = new Map();
    this.maxFixturesPerPayload = this.summaryConfig.MAX_FIXTURES_PER_PAYLOAD || 10;
    this.maxResultsPerPayload = this.summaryConfig.MAX_RESULTS_PER_PAYLOAD || 10;
    this.cacheTtlSeconds = this.summaryConfig.CACHE_TTL_SECONDS || 21600;
    this.monthlySheet = null;
    this.variantBuilderAvailable = typeof buildTemplateVariantCollection === 'function';
  }

  get logger() {
    if (!this._logger) {
      try {
        this._logger = logger.scope(this.loggerName);
      } catch (error) {
        this._logger = {
          enterFunction: (fn, data) => console.log(`[${this.loggerName}] → ${fn}`, data || ''),
          exitFunction: (fn, data) => console.log(`[${this.loggerName}] ← ${fn}`, data || ''),
          info: (msg, data) => console.log(`[${this.loggerName}] ${msg}`, data || ''),
          warn: (msg, data) => console.warn(`[${this.loggerName}] ${msg}`, data || ''),
          error: (msg, data) => console.error(`[${this.loggerName}] ${msg}`, data || ''),
          audit: (msg, data) => console.log(`[${this.loggerName}] AUDIT: ${msg}`, data || ''),
          security: (msg, data) => console.log(`[${this.loggerName}] SECURITY: ${msg}`, data || '')
        };
      }
    }
    return this._logger;
  }

  // ==================== CORE UTILITY METHODS ====================

  /**
   * Resolve month/year parameters with defaults
   */
  resolveMonthParameters(month, year, context = 'general') {
    const now = new Date();
    const targetMonth = month !== null ? month : now.getMonth() + 1;
    const targetYear = year !== null ? year : now.getFullYear();

    const targetDate = new Date(targetYear, targetMonth - 1, 1);

    return {
      targetDate: targetDate,
      monthNumber: targetMonth,
      yearNumber: targetYear,
      context: context
    };
  }

  /**
   * Build month key for tracking
   */
  buildMonthKey(year, month) {
    return `${year}-${month.toString().padStart(2, '0')}`;
  }

  /**
   * Check if request is duplicate
   */
  isDuplicateRequest(summaryType, monthKey) {
    try {
      if (!this.properties) return false;

      const propertyKey = `monthly_${summaryType}_${monthKey}`;
      const lastProcessed = this.properties.getProperty(propertyKey);

      if (lastProcessed) {
        const processedTime = new Date(lastProcessed);
        const hoursSinceProcessed = (Date.now() - processedTime.getTime()) / (1000 * 60 * 60);

        // Consider duplicate if processed within last 23 hours
        if (hoursSinceProcessed < 23) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.warn('Duplicate check failed', { summaryType, monthKey, error: error.toString() });
      return false;
    }
  }

  /**
   * Mark request as processed
   */
  markRequestProcessed(summaryType, monthKey) {
    try {
      if (!this.properties) return;

      const propertyKey = `monthly_${summaryType}_${monthKey}`;
      this.properties.setProperty(propertyKey, new Date().toISOString());
    } catch (error) {
      this.logger.error('Failed to mark request processed', { summaryType, monthKey, error: error.toString() });
    }
  }

  /**
   * Get cached data
   */
  getCachedData(cacheKey) {
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTtlSeconds * 1000) {
        return cached.data;
      } else {
        this.cache.delete(cacheKey);
      }
    }
    return null;
  }

  /**
   * Set cached data
   */
  setCachedData(cacheKey, data) {
    this.cache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.cacheTtlSeconds * 1000) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      this.logger.info(`Cleaned ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Get sheets for data access
   */
  getFixturesSheet() {
    return SheetUtils.getOrCreateSheet(
      getConfigValue('SHEETS.TAB_NAMES.FIXTURES'),
      getConfigValue('SHEETS.REQUIRED_COLUMNS.FIXTURES', [])
    );
  }

  getResultsSheet() {
    return SheetUtils.getOrCreateSheet(
      getConfigValue('SHEETS.TAB_NAMES.RESULTS'),
      getConfigValue('SHEETS.REQUIRED_COLUMNS.RESULTS', [])
    );
  }

  /**
   * Error handling wrapper
   */
  handleError(operation, error, context = {}) {
    this.logger.error(`${operation} failed`, {
      error: error.toString(),
      context: context
    });

    return {
      success: false,
      error: error.toString(),
      operation: operation,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Success response wrapper
   */
  createSuccessResponse(data, operation) {
    return {
      success: true,
      operation: operation,
      data: data,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
const monthlySummariesManager = new MonthlySummariesManager();