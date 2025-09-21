/**
 * @fileoverview Centralized Configuration for Syston Tigers Football Automation System
 * @version 6.0.0
 * @author Senior Software Architect
 * @description All configuration settings for the entire system - no globals outside this file
 */

/**
 * Main system configuration object - all settings centralized here
 * @type {Object}
 */
const SYSTEM_CONFIG = {
  
  // ==================== SYSTEM METADATA ====================
  SYSTEM: {
    VERSION: '6.0.0',
    NAME: 'Syston Tigers Football Automation System',
    ENVIRONMENT: 'production',
    TIMEZONE: 'Europe/London',
    CLUB_NAME: 'Syston Tigers',
    CLUB_SHORT_NAME: 'Tigers',
    SEASON: '2024-25',
    LEAGUE: 'Leicester & District Football League',
    LAST_UPDATED: '2025-09-20'
  },

  // ==================== GOOGLE SHEETS CONFIGURATION ====================
  SHEETS: {
    // Main spreadsheet
    SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '',
    
    // Sheet names and required columns
    TAB_NAMES: {
      LIVE_MATCH_UPDATES: 'Live Match Updates',
      PLAYER_STATS: 'Player Stats',
      FIXTURES_RESULTS: 'Fixtures & Results',
      WEEKLY_CONTENT: 'Weekly Content Calendar',
      SUBS_LOG: 'Subs Log',
      PLAYER_MINUTES: 'Player Minutes',
      VIDEO_CLIPS: 'Video Clips',
      NOTES: 'Notes',
      CONTROL_PANEL: 'Control Panel',
      CONFIG: 'Config',
      LOGS: 'Logs',
      QUOTES: 'Quotes',
      HISTORICAL_DATA: 'Historical Data',
      MONTHLY_STATS: 'Monthly Stats'
    },

    // Required column structures
    REQUIRED_COLUMNS: {
      LIVE_MATCH_UPDATES: [
        'Timestamp', 'Minute', 'Event', 'Player', 'Opponent', 'Home Score', 
        'Away Score', 'Card Type', 'Assist', 'Notes', 'Send', 'Status'
      ],
      PLAYER_STATS: [
        'Player Name', 'Appearances', 'Goals', 'Assists', 'Minutes', 
        'Yellow Cards', 'Red Cards', 'MOTM', 'Position', 'Squad Number'
      ],
      SUBS_LOG: [
        'Match Date', 'Minute', 'Player Off', 'Player On', 'Match ID', 'Reason'
      ],
      VIDEO_CLIPS: [
        'Match Date', 'Event Type', 'Minute', 'Player', 'Title', 'Start Time', 
        'Duration', 'Status', 'YouTube URL', 'Local Path', 'Notes'
      ],
      WEEKLY_CONTENT: [
        'Date', 'Day', 'Content Type', 'Status', 'Posted At', 'Event Type', 'Notes'
      ]
    }
  },

  // ==================== MAKE.COM INTEGRATION ====================
  MAKE: {
    // Webhook URLs (stored in PropertiesService for security)
    WEBHOOK_URL_PROPERTY: 'MAKE_WEBHOOK_URL',
    WEBHOOK_URL_FALLBACK: 'MAKE_WEBHOOK_URL_FALLBACK',
    
    // Retry configuration
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 2000,
    TIMEOUT_MS: 30000,

    // Event type mappings for Make.com router
    EVENT_MAPPINGS: {
      // Live match events
      'goal': 'goal_scored',
      'goal_opposition': 'goal_opposition',
      'card': 'card_shown',
      'card_opposition': 'card_opposition',
      'second_yellow': 'card_second_yellow',
      'kick_off': 'match_kickoff',
      'half_time': 'match_halftime',
      'second_half': 'match_second_half',
      'full_time': 'match_fulltime',
      'substitution': 'player_substitution',

      // Batch events (1-5 items)
      'fixtures_1_league': 'fixtures_batch_1',
      'fixtures_2_league': 'fixtures_batch_2',
      'fixtures_3_league': 'fixtures_batch_3',
      'fixtures_4_league': 'fixtures_batch_4',
      'fixtures_5_league': 'fixtures_batch_5',
      'results_1_league': 'results_batch_1',
      'results_2_league': 'results_batch_2',
      'results_3_league': 'results_batch_3',
      'results_4_league': 'results_batch_4',
      'results_5_league': 'results_batch_5',

      // Weekly schedule events
      'monday_fixtures': 'weekly_fixtures',
      'tuesday_quotes': 'weekly_quotes',
      'wednesday_stats': 'weekly_player_stats',
      'wednesday_opposition': 'weekly_opposition_analysis',
      'thursday_throwback': 'weekly_throwback',
      'friday_countdown': 'countdown_2_days',
      'saturday_countdown': 'countdown_1_day',

      // Monthly events
      'fixtures_this_month': 'fixtures_monthly',
      'results_this_month': 'results_monthly',
      'player_stats_monthly': 'player_stats_summary',

      // Special events
      'birthday': 'player_birthday',
      'postponed': 'match_postponed',
      'second_half_kickoff': 'match_second_half_kickoff',
      'gotm_voting_open': 'gotm_voting_start',
      'gotm_winner': 'gotm_winner_announcement'
    }
  },

  // ==================== CANVA INTEGRATION ====================
  CANVA: {
    // Template IDs (stored in PropertiesService)
    TEMPLATE_PROPERTY_PREFIX: 'CANVA_TEMPLATE_',
    
    // Standard placeholder names for all templates
    PLACEHOLDERS: {
      COMMON: [
        'club_name', 'club_logo', 'match_date', 'opponent', 'venue',
        'home_score', 'away_score', 'competition', 'kick_off_time'
      ],
      GOAL: [
        'goal_scorer', 'assist_provider', 'minute', 'goal_number',
        'match_score', 'celebration_text'
      ],
      CARD: [
        'player_name', 'card_type', 'minute', 'reason', 'referee_name'
      ],
      FIXTURES: [
        'fixture_count', 'fixture_1_opponent', 'fixture_1_date', 'fixture_1_time',
        'fixture_2_opponent', 'fixture_2_date', 'fixture_2_time',
        'fixture_3_opponent', 'fixture_3_date', 'fixture_3_time',
        'fixture_4_opponent', 'fixture_4_date', 'fixture_4_time',
        'fixture_5_opponent', 'fixture_5_date', 'fixture_5_time'
      ],
      RESULTS: [
        'result_count', 'result_1_opponent', 'result_1_score', 'result_1_outcome',
        'result_2_opponent', 'result_2_score', 'result_2_outcome',
        'result_3_opponent', 'result_3_score', 'result_3_outcome',
        'result_4_opponent', 'result_4_score', 'result_4_outcome',
        'result_5_opponent', 'result_5_score', 'result_5_outcome'
      ],
      PLAYER_STATS: [
        'player_name', 'appearances', 'goals', 'assists', 'minutes',
        'yellow_cards', 'red_cards', 'motm_awards', 'position',
        'goals_per_game', 'minutes_per_goal', 'passing_accuracy'
      ],
      WEEKLY_CONTENT: [
        'content_title', 'content_text', 'background_image', 'overlay_color',
        'quote_text', 'quote_author', 'countdown_days', 'next_match_info'
      ]
    }
  },

  // ==================== PLAYER MANAGEMENT ====================
  PLAYERS: {
    // Special player entries for opposition events
    OPPOSITION_ENTRIES: ['Goal', 'Opposition', 'Own Goal', 'Unknown'],
    
    // Default positions
    POSITIONS: [
      'Goalkeeper', 'Right Back', 'Centre Back', 'Left Back',
      'Defensive Midfielder', 'Central Midfielder', 'Attacking Midfielder',
      'Right Winger', 'Left Winger', 'Striker', 'Centre Forward'
    ],

    // Card types
    CARD_TYPES: ['Yellow Card', 'Red Card', 'Sin Bin', '2nd Yellow (Red)'],

    // Minutes calculation
    MATCH_DURATION_MINUTES: 90,
    HALF_TIME_MINUTE: 45,

    // Statistics tracking
    STAT_FIELDS: [
      'appearances', 'goals', 'assists', 'minutes', 'yellow_cards',
      'red_cards', 'motm', 'goals_per_game', 'minutes_per_goal'
    ]
  },

  // ==================== VIDEO PROCESSING ====================
  VIDEO: {
    // Google Drive folders
    DRIVE_FOLDER_PROPERTY: 'VIDEO_DRIVE_FOLDER_ID',
    PLAYER_FOLDERS_PROPERTY: 'PLAYER_FOLDERS_MAPPING',

    // Clip settings
    DEFAULT_CLIP_DURATION: 30, // seconds
    GOAL_CLIP_LEAD_TIME: 10,   // seconds before goal
    GOAL_CLIP_FOLLOW_TIME: 20, // seconds after goal

    // YouTube integration
    YOUTUBE_CHANNEL_PROPERTY: 'YOUTUBE_CHANNEL_ID',
    YOUTUBE_PLAYLIST_PROPERTY: 'YOUTUBE_PLAYLIST_ID',
    DEFAULT_PRIVACY_STATUS: 'unlisted',

    // Processing services
    PROCESSING_SERVICE: 'cloudconvert', // 'ffmpeg' or 'cloudconvert'
    CLOUDCONVERT_API_KEY_PROPERTY: 'CLOUDCONVERT_API_KEY'
  },

  // ==================== XBOTGO INTEGRATION ====================
  XBOTGO: {
    // API configuration
    API_BASE_URL_PROPERTY: 'XBOTGO_API_URL',
    API_KEY_PROPERTY: 'XBOTGO_API_KEY',
    DEVICE_ID_PROPERTY: 'XBOTGO_DEVICE_ID',

    // Push settings
    ENABLED: false, // Toggle via Control Panel
    AUTO_PUSH_GOALS: true,
    AUTO_PUSH_CARDS: false,
    AUTO_PUSH_SUBS: false,

    // Retry configuration
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000
  },

  // ==================== WEEKLY CONTENT SCHEDULE ====================
  WEEKLY_SCHEDULE: {
    // Content calendar (0 = Sunday, 1 = Monday, etc.)
    SCHEDULE: {
      1: { // Monday
        type: 'fixtures',
        content: 'this_week_fixtures',
        fallback: 'no_match_scheduled',
        enabled: true
      },
      2: { // Tuesday
        type: 'quotes',
        content: 'motivational_quotes',
        rotation: true,
        enabled: true
      },
      3: { // Wednesday
        type: 'stats_or_opposition',
        content: 'monthly_stats', // or 'opposition_analysis'
        monthly_week: 2, // 2nd week of month = stats
        enabled: true
      },
      4: { // Thursday
        type: 'throwback',
        content: 'historical_content',
        countdown_if_match: true,
        enabled: true
      },
      5: { // Friday
        type: 'countdown',
        content: '2_days_to_go',
        only_if_match: true,
        enabled: true
      },
      6: { // Saturday
        type: 'countdown',
        content: '1_day_to_go',
        only_if_match: true,
        enabled: true
      },
      0: { // Sunday
        type: 'match_day',
        content: 'live_match_automation',
        priority: 'highest',
        enabled: true
      }
    },

    // Content rotation settings
    QUOTES_ROTATION_PROPERTY: 'LAST_QUOTE_INDEX',
    THROWBACK_ROTATION_PROPERTY: 'LAST_THROWBACK_INDEX',
    CONTENT_COOLDOWN_DAYS: 30 // Don't repeat content for 30 days
  },

  // ==================== MONTHLY CONTENT ====================
  MONTHLY: {
    // Goal of the Month
    GOTM: {
      VOTING_PERIOD_DAYS: 5,
      MIN_GOALS_FOR_COMPETITION: 3,
      VOTING_START_DAY: 1,    // 1st of month
      WINNER_ANNOUNCE_DAY: 6, // 6th of month
      ENABLED: true
    },

    // Monthly summaries
    SUMMARIES: {
      FIXTURES_DAY: 1,  // 1st of month
      RESULTS_DAY: -1,  // Last day of month
      STATS_WEEK: 2,    // 2nd week (Wednesday)
      ENABLED: true
    }
  },

  // ==================== LOGGING CONFIGURATION ====================
  LOGGING: {
    // Log levels
    LEVELS: {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    },
    
    // Current log level
    CURRENT_LEVEL: 2, // INFO

    // Log retention
    MAX_LOG_ENTRIES: 1000,
    LOG_CLEANUP_DAYS: 30,

    // Sheet logging
    LOG_TO_SHEET: true,
    LOG_SHEET_NAME: 'Logs'
  },

  // ==================== FEATURE TOGGLES ====================
  FEATURES: {
    // Core features
    WEEKLY_CONTENT_AUTOMATION: true,
    OPPOSITION_AUTO_DETECTION: true,
    PLAYER_MINUTES_TRACKING: true,
    BATCH_POSTING: true,
    MONTHLY_SUMMARIES: true,

    // Advanced features
    VIDEO_INTEGRATION: false,      // Phase 2
    XBOTGO_INTEGRATION: false,     // Phase 2
    YOUTUBE_AUTOMATION: false,     // Phase 2
    ADVANCED_ANALYTICS: false,     // Phase 3
    MULTI_TENANT: false,          // Phase 4

    // Social media platforms
    FACEBOOK_POSTING: true,
    TWITTER_POSTING: true,
    INSTAGRAM_POSTING: true,
    TIKTOK_POSTING: false,        // Phase 3

    // Experimental features
    AI_CONTENT_GENERATION: false,
    VOICE_COMMENTARY: false,
    LIVE_STREAMING: false
  },

  // ==================== ERROR HANDLING ====================
  ERROR_HANDLING: {
    // Retry configuration
    DEFAULT_MAX_RETRIES: 3,
    DEFAULT_RETRY_DELAY: 1000,
    EXPONENTIAL_BACKOFF: true,

    // Fallback behavior
    CONTINUE_ON_ERROR: true,
    ALERT_ON_CRITICAL_ERROR: true,
    ADMIN_EMAIL_PROPERTY: 'ADMIN_EMAIL',

    // Error categories
    CRITICAL_ERRORS: [
      'SHEET_ACCESS_DENIED',
      'WEBHOOK_PERMANENTLY_FAILED',
      'CONFIG_CORRUPTION'
    ]
  },

  // ==================== PERFORMANCE SETTINGS ====================
  PERFORMANCE: {
    // Batch processing
    BATCH_SIZE: 10,
    PROCESSING_DELAY_MS: 500,

    // Caching
    CACHE_ENABLED: true,
    CACHE_DURATION_MINUTES: 30,

    // Rate limiting
    WEBHOOK_RATE_LIMIT_MS: 1000,
    API_RATE_LIMIT_MS: 500
  },

  // ==================== DEVELOPMENT SETTINGS ====================
  DEVELOPMENT: {
    // Debug mode
    DEBUG_MODE: false,
    VERBOSE_LOGGING: false,
    
    // Test data
    USE_TEST_DATA: false,
    TEST_WEBHOOK_URL_PROPERTY: 'TEST_WEBHOOK_URL',
    
    // Simulation mode
    SIMULATION_MODE: false, // Don't actually post to Make.com
    SIMULATION_LOG_PAYLOADS: true
  }
};

/**
 * Get configuration value using dot notation
 * @param {string} path - Configuration path (e.g., 'SYSTEM.VERSION')
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Configuration value
 */
function getConfig(path, defaultValue = null) {
  const parts = path.split('.');
  let current = SYSTEM_CONFIG;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return defaultValue;
    }
  }
  
  return current;
}

/**
 * Set configuration value using dot notation
 * @param {string} path - Configuration path
 * @param {*} value - Value to set
 * @returns {boolean} Success status
 */
function setConfig(path, value) {
  try {
    const parts = path.split('.');
    const lastPart = parts.pop();
    let current = SYSTEM_CONFIG;
    
    for (const part of parts) {
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[lastPart] = value;
    return true;
  } catch (error) {
    console.error('Failed to set config:', error);
    return false;
  }
}

/**
 * Get secure property from PropertiesService
 * @param {string} key - Property key
 * @param {string} defaultValue - Default value
 * @returns {string} Property value
 */
function getSecureProperty(key, defaultValue = '') {
  try {
    return PropertiesService.getScriptProperties().getProperty(key) || defaultValue;
  } catch (error) {
    console.error(`Failed to get property ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set secure property in PropertiesService
 * @param {string} key - Property key
 * @param {string} value - Property value
 * @returns {boolean} Success status
 */
function setSecureProperty(key, value) {
  try {
    PropertiesService.getScriptProperties().setProperty(key, value);
    return true;
  } catch (error) {
    console.error(`Failed to set property ${key}:`, error);
    return false;
  }
}

/**
 * Initialize configuration system
 * @returns {Object} Initialization result
 */
function initializeConfig() {
  try {
    // Validate required properties
    const requiredProperties = [
      'SPREADSHEET_ID',
      getConfig('MAKE.WEBHOOK_URL_PROPERTY')
    ];
    
    const missingProperties = requiredProperties.filter(prop => 
      !getSecureProperty(prop)
    );
    
    if (missingProperties.length > 0) {
      console.warn('Missing required properties:', missingProperties);
    }
    
    return {
      success: true,
      version: getConfig('SYSTEM.VERSION'),
      missingProperties: missingProperties,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to initialize config:', error);
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

// ==================== CONFIG VALIDATION ====================

/**
 * Validate entire configuration
 * @returns {Object} Validation result
 */
function validateConfig() {
  const errors = [];
  const warnings = [];
  
  // Check required properties
  const requiredProps = [
    'MAKE.WEBHOOK_URL_PROPERTY',
    'SHEETS.SPREADSHEET_ID'
  ];
  
  requiredProps.forEach(prop => {
    if (!getConfig(prop)) {
      errors.push(`Missing required config: ${prop}`);
    }
  });
  
  // Check feature flags consistency
  if (getConfig('FEATURES.VIDEO_INTEGRATION') && !getConfig('VIDEO.DRIVE_FOLDER_PROPERTY')) {
    warnings.push('Video integration enabled but no Drive folder configured');
  }
  
  if (getConfig('FEATURES.XBOTGO_INTEGRATION') && !getConfig('XBOTGO.API_KEY_PROPERTY')) {
    warnings.push('XbotGo integration enabled but no API key configured');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors,
    warnings: warnings,
    timestamp: new Date().toISOString()
  };
}

/**
 * Export configuration for backup
 * @returns {Object} Configuration export
 */
function exportConfig() {
  return {
    config: SYSTEM_CONFIG,
    version: getConfig('SYSTEM.VERSION'),
    exported_at: new Date().toISOString(),
    export_type: 'full_config'
  };
}

// ==================== PUBLIC API ====================

/**
 * Get system version
 * @returns {string} System version
 */
function getSystemVersion() {
  return getConfig('SYSTEM.VERSION');
}

/**
 * Get club information
 * @returns {Object} Club info
 */
function getClubInfo() {
  return {
    name: getConfig('SYSTEM.CLUB_NAME'),
    shortName: getConfig('SYSTEM.CLUB_SHORT_NAME'),
    season: getConfig('SYSTEM.SEASON'),
    league: getConfig('SYSTEM.LEAGUE')
  };
}

/**
 * Check if feature is enabled
 * @param {string} featureName - Feature name
 * @returns {boolean} Feature status
 */
function isFeatureEnabled(featureName) {
  return getConfig(`FEATURES.${featureName}`, false);
}

/**
 * Test configuration access
 * @returns {Object} Test results
 */
function testConfig() {
  return {
    configAccess: typeof SYSTEM_CONFIG === 'object',
    getConfigWorks: getConfig('SYSTEM.VERSION') === '6.0.0',
    clubName: getConfig('SYSTEM.CLUB_NAME'),
    timestamp: new Date().toISOString()
  };
}

