/**
 * @fileoverview Centralized configuration for Syston Tigers Football Automation System
 * @version 6.2.0
 * @author Senior Software Architect
 * @description All system configuration in one place - no globals elsewhere
 * 
 * CRITICAL: This is the single source of truth for all configuration.
 * No hard-coded values anywhere else in the system.
 */

// ==================== SYSTEM CONFIGURATION ====================

/**
 * Master system configuration object
 * @constant {Object} SYSTEM_CONFIG
 */
const SYSTEM_CONFIG = {
  
  // ==================== SYSTEM METADATA ====================
  SYSTEM: {
    VERSION: '6.2.0',
    NAME: 'Syston Tigers Football Automation System',
    DESCRIPTION: 'Live football automation with weekly content calendar',
    ENVIRONMENT: 'production', // production | development | testing
    TIMEZONE: 'Europe/London',
    CLUB_NAME: 'Syston Tigers',
    CLUB_SHORT_NAME: 'Syston',
    SEASON: '2024/25',
    
    // Bible compliance settings
    BIBLE_COMPLIANT: true,
    WEEKLY_SCHEDULE_ENABLED: true,
    OPPOSITION_AUTO_DETECTION: true,
    PLAYER_MINUTES_AUTO_CALC: true
  },

  // ==================== FEATURE FLAGS ====================
  FEATURES: {
    // Core features
    LIVE_MATCH_PROCESSING: true,
    BATCH_POSTING: true,
    PLAYER_STATISTICS: true,
    MAKE_INTEGRATION: true,
    
    // Enhanced features from spec
    OPPOSITION_EVENT_HANDLING: true,
    SECOND_YELLOW_PROCESSING: true,
    MONTHLY_SUMMARIES: true,
    WEEKLY_CONTENT_AUTOMATION: true,
    POSTPONED_MATCH_HANDLING: true,
    PLAYER_MINUTES_TRACKING: true,
    SUB_SWAPPING_SYSTEM: true,
    
    // Advanced features
    VIDEO_INTEGRATION: true,
    VIDEO_CLIP_CREATION: true,
    YOUTUBE_AUTOMATION: false, // Enable when ready
    XBOTGO_INTEGRATION: false, // Enable when configured
    
    // Future features
    TIKTOK_POSTING: false,
    GOAL_OF_MONTH: false,
    MULTI_TENANT: false
  },

  // ==================== GOOGLE SHEETS CONFIGURATION ====================
  SHEETS: {
    TAB_NAMES: {
      // Core sheets
      LIVE_MATCH: 'Live Match Updates',
      FIXTURES: 'Fixtures',
      RESULTS: 'Results',
      PLAYER_STATS: 'Player Stats',
      PLAYER_EVENTS: 'Player Events',
      
      // Enhanced sheets from spec
      SUBS_LOG: 'Subs Log',
      OPPOSITION_EVENTS: 'Opposition Events',
      VIDEO_CLIPS: 'Video Clips',
      MONTHLY_CONTENT: 'Monthly Content',
      MONTHLY_SUMMARIES: 'Monthly Summaries',
      WEEKLY_SCHEDULE: 'Weekly Schedule',
      
      // System sheets
      CONTROL_PANEL: 'Control Panel',
      CONFIG: 'Config',
      LOGS: 'Logs',
      NOTES: 'Notes',
      
      // Future sheets
      SEASON_STATS: 'Season Stats',
      GOAL_OF_MONTH: 'GOTM Tracking'
    },

    REQUIRED_COLUMNS: {
      LIVE_MATCH: [
        'Minute', 'Event', 'Player', 'Assist', 'Card Type', 
        'Send', 'Posted', 'Match ID', 'Timestamp', 'Notes'
      ],
      FIXTURES: [
        'Date', 'Time', 'Opposition', 'Venue', 'Competition', 
        'Home/Away', 'Send', 'Posted', 'Match ID', 'Status'
      ],
      RESULTS: [
        'Date', 'Opposition', 'Home Score', 'Away Score', 'Venue', 
        'Competition', 'Home/Away', 'Result', 'Send', 'Posted', 'Match ID'
      ],
      PLAYER_STATS: [
        'Player', 'Appearances', 'Starts', 'Sub Apps', 'Goals', 
        'Penalties', 'Assists', 'Yellow Cards', 'Red Cards', 
        'Sin Bins', 'MOTM', 'Minutes', 'Last Updated'
      ],
      PLAYER_EVENTS: [
        'Match ID', 'Date', 'Player', 'Event Type', 'Minute', 
        'Details', 'Competition', 'Opposition', 'Timestamp'
      ],
      SUBS_LOG: [
        'Match ID', 'Date', 'Minute', 'Player Off', 'Player On', 
        'Home/Away', 'Reason', 'Timestamp'
      ],
      OPPOSITION_EVENTS: [
        'Match ID', 'Date', 'Event Type', 'Minute', 'Details', 
        'Posted', 'Timestamp'
      ],
      VIDEO_CLIPS: [
        'Match ID', 'Player', 'Event Type', 'Minute', 'Start Time',
        'Duration', 'Title', 'Caption', 'Status', 'YouTube URL',
        'Folder Path', 'Created'
      ],
      MONTHLY_SUMMARIES: [
        'Timestamp', 'Month_Key', 'Summary_Type', 'Item_Count',
        'Summary_Data', 'Posted', 'Responses', 'Created'
      ]
    }
  },

  // ==================== MAKE.COM INTEGRATION ====================
  MAKE: {
    WEBHOOK_URL_PROPERTY: 'MAKE_WEBHOOK_URL', // PropertiesService key
    WEBHOOK_TIMEOUT_MS: 30000,
    WEBHOOK_RETRY_ATTEMPTS: 3,
    WEBHOOK_RETRY_DELAY_MS: 2000,
    
    // Event type mappings for router
    EVENT_TYPES: {
      // Live match events
      GOAL_TEAM: 'goal_team',
      GOAL_OPPOSITION: 'goal_opposition', // NEW: Opposition goals
      ASSIST: 'assist',
      CARD_YELLOW: 'card_yellow',
      CARD_RED: 'card_red',
      CARD_SECOND_YELLOW: 'card_second_yellow', // NEW: 2nd yellow
      CARD_SIN_BIN: 'card_sin_bin',
      CARD_OPPOSITION: 'discipline_opposition', // NEW: Opposition cards
      MOTM: 'motm',
      SUBSTITUTION: 'substitution',
      
      // Match status events
      KICK_OFF: 'kick_off',
      HALF_TIME: 'half_time',
      SECOND_HALF_KICKOFF: 'second_half_kickoff', // NEW: From spec
      FULL_TIME: 'full_time',
      POSTPONED: 'match_postponed', // NEW: From spec
      
      // Batch events (1-5 variations)
      FIXTURES_1_LEAGUE: 'fixtures_1_league',
      FIXTURES_2_LEAGUE: 'fixtures_2_league',
      FIXTURES_3_LEAGUE: 'fixtures_3_league',
      FIXTURES_4_LEAGUE: 'fixtures_4_league',
      FIXTURES_5_LEAGUE: 'fixtures_5_league',
      
      RESULTS_1_LEAGUE: 'results_1_league',
      RESULTS_2_LEAGUE: 'results_2_league',
      RESULTS_3_LEAGUE: 'results_3_league',
      RESULTS_4_LEAGUE: 'results_4_league',
      RESULTS_5_LEAGUE: 'results_5_league',
      
      // Monthly events (NEW: From spec)
      FIXTURES_THIS_MONTH: 'fixtures_this_month',
      RESULTS_THIS_MONTH: 'results_this_month',
      PLAYER_STATS_SUMMARY: 'player_stats_summary',
      
      // Weekly content events (NEW: Bible compliance)
      WEEKLY_FIXTURES: 'weekly_fixtures',
      WEEKLY_NO_MATCH: 'weekly_no_match',
      WEEKLY_QUOTES: 'weekly_quotes',
      WEEKLY_STATS: 'weekly_stats',
      WEEKLY_THROWBACK: 'weekly_throwback',
      WEEKLY_COUNTDOWN_2: 'weekly_countdown_2',
      WEEKLY_COUNTDOWN_1: 'weekly_countdown_1'
    }
  },

  // ==================== LOGGING CONFIGURATION ====================
  LOGGING: {
    ENABLED: true,
    LOG_SHEET_NAME: 'Logs',
    LOG_LEVEL: 'INFO', // DEBUG | INFO | WARN | ERROR
    MAX_LOG_ENTRIES: 10000,
    LOG_RETENTION_DAYS: 30,
    
    // Bible compliance: Comprehensive logging required
    FUNCTION_ENTRY_EXIT: true,
    ERROR_STACK_TRACES: true,
    PERFORMANCE_TIMING: true,
    AUDIT_TRAIL: true
  },

  // ==================== PERFORMANCE SETTINGS ====================
  PERFORMANCE: {
    CACHE_ENABLED: true,
    CACHE_DURATION_MINUTES: 30,
    BATCH_SIZE: 50,
    WEBHOOK_RATE_LIMIT_MS: 1000, // Min time between webhook calls
    SHEET_LOCK_TIMEOUT_MS: 30000
  },

  // ==================== PLAYER MANAGEMENT ====================
  PLAYER_MANAGEMENT: {
    AUTO_CALCULATE_MINUTES: true,
    AUTO_UPDATE_STATS: true,
    STARTER_VS_SUB_TRACKING: true,
    SUB_SWAP_ENABLED: true,
    
    // Minutes calculation settings
    MATCH_DURATION_MINUTES: 90,
    INJURY_TIME_DEFAULT: 5,
    
    // Stats calculation frequency
    STATS_UPDATE_FREQUENCY: 'real_time', // real_time | batch | manual
    BI_MONTHLY_STATS_DAY: 14 // 14th of every other month
  },

  // ==================== VIDEO INTEGRATION ====================
  VIDEO: {
    ENABLED: false, // Enable when ready
    AUTO_CLIP_CREATION: true,
    CLIP_DURATION_SECONDS: 30,
    CLIP_BUFFER_SECONDS: 3,
    
    // Folder structure
    DRIVE_FOLDER_ID: '', // Set when configured
    PLAYER_FOLDERS_AUTO_CREATE: true,
    
    // Processing options
    PROCESSING_METHOD: 'cloudconvert', // cloudconvert | ffmpeg_local
    YOUTUBE_AUTO_UPLOAD: false,
    YOUTUBE_DEFAULT_PRIVACY: 'unlisted'
  },

  // ==================== XBOTGO INTEGRATION ====================
  XBOTGO: {
    ENABLED: false, // Enable when API configured
    API_URL: '',
    API_KEY_PROPERTY: 'XBOTGO_API_KEY',
    SCOREBOARD_ID: '',
    
    // Update settings
    AUTO_SCORE_UPDATE: true,
    UPDATE_ON_GOAL: true,
    UPDATE_ON_FINAL: true,
    RETRY_ATTEMPTS: 3
  },

  // ==================== WEEKLY SCHEDULE CONFIGURATION ====================
  WEEKLY_SCHEDULE: {
    ENABLED: true, // Bible compliance requirement
    TIMEZONE: 'Europe/London',
    
    // Schedule definitions (Bible compliance)
    SCHEDULE: {
      MONDAY: {
        enabled: true,
        content_type: 'fixtures_or_no_match',
        post_time: '18:00',
        fallback_message: 'No match scheduled this week'
      },
      TUESDAY: {
        enabled: true,
        content_type: 'quotes',
        post_time: '19:00',
        quote_categories: ['motivation', 'teamwork', 'football']
      },
      WEDNESDAY: {
        enabled: true,
        content_type: 'stats_or_opposition',
        post_time: '20:00',
        monthly_stats_preference: true
      },
      THURSDAY: {
        enabled: true,
        content_type: 'throwback_or_countdown',
        post_time: '19:30',
        countdown_trigger_days: 3
      },
      FRIDAY: {
        enabled: true,
        content_type: 'countdown_2_days',
        post_time: '18:30'
      },
      SATURDAY: {
        enabled: true,
        content_type: 'countdown_1_day',
        post_time: '19:00'
      },
      SUNDAY: {
        enabled: true,
        content_type: 'match_day',
        varies_by_kickoff: true
      }
    }
  },

  // ==================== MONTHLY CONTENT CONFIGURATION ====================
  MONTHLY_CONTENT: {
    ENABLED: true,
    
    // Fixtures summary
    FIXTURES_SUMMARY: {
      enabled: true,
      post_date: 1, // 1st of month
      include_all_competitions: true,
      highlight_key_matches: true
    },
    
    // Results summary
    RESULTS_SUMMARY: {
      enabled: true,
      post_date: 'last_day', // Last day of month
      include_statistics: true,
      highlight_best_worst: true
    },
    
    // Player stats (bi-monthly as per spec)
    PLAYER_STATS: {
      enabled: true,
      frequency: 'bi_monthly', // Every 2nd week
      post_date: 14, // 14th of every other month
      include_all_stats: true,
      minimum_appearances: 1
    }
  },

  // ==================== MONTHLY SUMMARY SETTINGS ====================
  MONTHLY_SUMMARIES: {
    ENABLED: true,
    CACHE_TTL_SECONDS: 21600,
    MAX_FIXTURES_PER_PAYLOAD: 10,
    MAX_RESULTS_PER_PAYLOAD: 10,
    LOCAL_RIVALS: ['leicester', 'melton', 'oadby', 'hinckley', 'coalville'],
    IMPORTANT_COMPETITIONS: ['league cup', 'fa cup', 'county cup']
  },

  // ==================== OPPOSITION HANDLING ====================
  OPPOSITION_HANDLING: {
    // Bible compliance: Auto-detection required
    AUTO_GOAL_DETECTION: true, // "Goal" player = opposition goal
    AUTO_CARD_DETECTION: true, // "Opposition" player = opposition card
    
    // Detection keywords
    GOAL_KEYWORDS: ['Goal', 'goal', 'GOAL'],
    OPPOSITION_KEYWORDS: ['Opposition', 'opposition', 'OPPOSITION'],
    
    // Posting preferences
    POST_OPPOSITION_GOALS: true,
    POST_OPPOSITION_CARDS: true,
    
    // Event handling
    UPDATE_SCORE_ONLY: true, // Don't update our player stats
    TRACK_SEPARATELY: true // Keep opposition events separate
  },

  // ==================== VALIDATION RULES ====================
  VALIDATION: {
    REQUIRED_FIELDS: {
      GOAL: ['minute', 'player'],
      CARD: ['minute', 'player', 'card_type'],
      SUBSTITUTION: ['minute', 'player_off', 'player_on']
    },
    
    MINUTE_RANGE: {
      MIN: 1,
      MAX: 120 // Including extra time
    },
    
    DUPLICATE_PREVENTION: {
      ENABLED: true,
      CHECK_WINDOW_MINUTES: 5,
      KEY_FIELDS: ['match_id', 'minute', 'player', 'event_type']
    }
  },

  // ==================== ERROR HANDLING ====================
  ERROR_HANDLING: {
    GRACEFUL_FALLBACKS: true,
    RETRY_LOGIC: true,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 2000,
    
    // Missing data handling
    HANDLE_MISSING_SHEETS: true,
    HANDLE_MISSING_PLAYERS: true,
    HANDLE_MISSING_CONFIG: true,
    
    // Error reporting
    LOG_ALL_ERRORS: true,
    ALERT_ON_CRITICAL: false // Set to true for production monitoring
  }
};

// ==================== CONFIGURATION UTILITIES ====================

/**
 * Get configuration value by path
 * @param {string} path - Dot notation path (e.g., 'SYSTEM.VERSION')
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Configuration value
 */
function getConfig(path, defaultValue = null) {
  try {
    const parts = path.split('.');
    let value = SYSTEM_CONFIG;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  } catch (error) {
    console.error(`Failed to get config for path: ${path}`, error);
    return defaultValue;
  }
}

/**
 * Set configuration value by path
 * @param {string} path - Dot notation path
 * @param {*} value - Value to set
 * @returns {boolean} Success status
 */
function setConfig(path, value) {
  try {
    const parts = path.split('.');
    const lastPart = parts.pop();
    let current = SYSTEM_CONFIG;
    
    // Navigate to parent object
    for (const part of parts) {
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    // Set the value
    current[lastPart] = value;
    return true;
  } catch (error) {
    console.error(`Failed to set config for path: ${path}`, error);
    return false;
  }
}

/**
 * Check if feature is enabled
 * @param {string} featureName - Feature name from FEATURES object
 * @returns {boolean} Feature enabled status
 */
function isFeatureEnabled(featureName) {
  return getConfig(`FEATURES.${featureName}`, false) === true;
}

/**
 * Get webhook URL from Properties Service
 * @returns {string|null} Webhook URL or null if not set
 */
function getWebhookUrl() {
  try {
    const propertyName = getConfig('MAKE.WEBHOOK_URL_PROPERTY');
    return PropertiesService.getScriptProperties().getProperty(propertyName);
  } catch (error) {
    console.error('Failed to get webhook URL:', error);
    return null;
  }
}

/**
 * Validate configuration on startup
 * @returns {Object} Validation result
 */
function validateConfiguration() {
  const issues = [];
  const warnings = [];
  
  // Check required webhook URL
  if (!getWebhookUrl()) {
    issues.push('Webhook URL not configured');
  }
  
  // Check feature dependencies
  if (isFeatureEnabled('VIDEO_INTEGRATION') && !getConfig('VIDEO.DRIVE_FOLDER_ID')) {
    warnings.push('Video integration enabled but no Drive folder configured');
  }
  
  if (isFeatureEnabled('XBOTGO_INTEGRATION') && !getConfig('XBOTGO.API_URL')) {
    warnings.push('XbotGo integration enabled but no API URL configured');
  }
  
  // Check Bible compliance
  if (!getConfig('SYSTEM.BIBLE_COMPLIANT')) {
    issues.push('System not configured for Bible compliance');
  }
  
  return {
    valid: issues.length === 0,
    issues: issues,
    warnings: warnings,
    timestamp: new Date().toISOString()
  };
}
/**
 * Initialize configuration system
 * @returns {Object} Initialization result
 */
function initializeConfig() {
  try {
    // Validate configuration
    const validation = validateConfiguration();
    
    if (!validation.valid) {
      console.warn('Configuration validation failed:', validation.issues);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('Configuration warnings:', validation.warnings);
    }
    
    return {
      success: true,
      version: getConfig('SYSTEM.VERSION'),
      validation: validation,
      bible_compliant: getConfig('SYSTEM.BIBLE_COMPLIANT'),
      features_enabled: Object.entries(getConfig('FEATURES', {}))
        .filter(([key, value]) => value === true)
        .map(([key]) => key)
    };
    
  } catch (error) {
    console.error('Failed to initialize configuration:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ==================== EXPORT FOR TESTING ====================

/**
 * Export configuration for testing purposes
 * @returns {Object} Configuration object
 */
function exportConfig() {
  return SYSTEM_CONFIG;
}

/**
 * Reset configuration to defaults (testing only)
 * @returns {boolean} Success status
 */
function resetConfig() {
  try {
    // This would reset to defaults in a test environment
    // Not implemented for production safety
    console.warn('Config reset not implemented for production safety');
    return false;
  } catch (error) {
    console.error('Failed to reset configuration:', error);
    return false;
  }
}

