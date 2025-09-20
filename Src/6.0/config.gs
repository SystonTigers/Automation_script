/**
 * @fileoverview Syston Tigers Automation - Enhanced Centralized Configuration
 * @version 5.1.0
 * @author Senior Software Architect
 * 
 * Centralized configuration with additional edge-case handling and validation.
 * Includes all new features from checklist requirements.
 */


/**
 * Enhanced system-wide configuration object
 * @type {Object}
 */
const SYSTEM_CONFIG = {
  
  // ===== CORE SYSTEM =====
  SYSTEM: {
    VERSION: '5.1.0',
    TIMEZONE: 'Europe/London',
    CLUB_NAME: 'Syston Town Tigers',
    SEASON: '2024-25',
    ENVIRONMENT: 'production', // production, staging, development
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    BATCH_SIZE: 50,
    LOCK_TIMEOUT_MS: 30000,
    IDEMPOTENCY_WINDOW_HOURS: 24 // Prevent duplicates within this window
  },


  // ===== SHEETS CONFIGURATION =====
  SHEETS: {
    // Primary sheet names
    LIVE: 'Live',
    FIXTURES: 'Fixtures', 
    RESULTS: 'Results',
    PLAYER_STATS: 'Player Stats',
    LOGS: 'Logs',
    CONFIG: 'Config',
    
    // Enhanced sheets for comprehensive functionality
    SUBS_LOG: 'Subs Log',
    MINUTES_TRACKER: 'Minutes Tracker',
    VIDEO_CLIPS: 'Video Clips',
    GOTM_VOTES: 'GOTM Votes',
    DISCIPLINE_LOG: 'Discipline Log',
    SOCIAL_POSTS: 'Social Posts',
    OPPOSITION_LOG: 'Opposition Log', // NEW: Track opposition events
    POSTPONED_MATCHES: 'Postponed Matches', // NEW: Postponed match tracking
    MONTHLY_SUMMARIES: 'Monthly Summaries', // NEW: Monthly summary cache
    IDEMPOTENCY_TRACKER: 'Idempotency Tracker', // NEW: Duplicate prevention
    
    // Sheet cell references (parameterized per ChatGPT feedback)
    LIVE_CELLS: {
      MATCH_ID: 'B1',
      HOME_TEAM: 'B2', 
      AWAY_TEAM: 'B3',
      HOME_SCORE: 'C2',
      AWAY_SCORE: 'D2',
      MATCH_STATUS: 'B4',
      KICK_OFF_TIME: 'B5',
      VENUE: 'B6',
      COMPETITION: 'B7',
      DATE: 'B8',
      CURRENT_MINUTE: 'B9' // NEW: Track current match minute
    },
    
    // Column mappings for each sheet
    COLUMNS: {
      LIVE: {
        MINUTE: 'A',
        EVENT_TYPE: 'B', 
        PLAYER: 'C',
        DETAILS: 'D',
        POSTED: 'E',
        IDEMPOTENCY_KEY: 'F' // NEW: Duplicate prevention
      },
      PLAYER_STATS: {
        NAME: 'A',
        APPS: 'B',
        SUBS: 'C', 
        GOALS: 'D',
        PENALTIES: 'E',
        ASSISTS: 'F',
        MOTM: 'G',
        MINUTES: 'H',
        YELLOW_CARDS: 'I',
        RED_CARDS: 'J',
        CLEAN_SHEET_BONUS: 'K', // NEW: Bonus points for clean sheets
        SEASON: 'L'
      },
      SUBS_LOG: {
        MATCH_DATE: 'A',
        MATCH_ID: 'B',
        MINUTE: 'C',
        PLAYER_OFF: 'D', 
        PLAYER_ON: 'E',
        HOME_AWAY: 'F',
        TIMESTAMP: 'G',
        TACTICAL_REASON: 'H' // NEW: Track substitution reasoning
      },
      OPPOSITION_LOG: {
        MATCH_ID: 'A',
        EVENT_TYPE: 'B',
        MINUTE: 'C',
        DETAILS: 'D',
        OPPONENT_NAME: 'E',
        POSTED: 'F',
        TIMESTAMP: 'G'
      }
    }
  },


  // ===== ENHANCED EVENT TYPES =====
  EVENTS: {
    // Core match events
    GOAL: 'goal',
    ASSIST: 'assist', 
    CARD: 'card',
    SUBSTITUTION: 'substitution',
    KICK_OFF: 'kick_off',
    HALF_TIME: 'half_time',
    SECOND_HALF_KICK_OFF: 'second_half_kick_off',
    FULL_TIME: 'full_time',
    
    // Opposition events (enhanced per checklist)
    GOAL_OPPOSITION: 'goal_opposition',
    CARD_OPPOSITION: 'card_opposition',
    
    // Enhanced events from checklist
    PLAYER_INJURY: 'player_injury',
    MOTM: 'motm',
    NEW_SIGNING: 'new_signing',
    CONTRACT_EXTENSION: 'contract_extension',
    PLAYER_RELEASE: 'player_release',
    
    // Match status events (enhanced)
    POSTPONED: 'match_postponed',
    ABANDONED: 'match_abandoned',
    DELAYED: 'match_delayed',
    PITCH_INSPECTION: 'pitch_inspection',
    
    // Administrative events
    GROUND_NEWS: 'ground_news', 
    PRESS_RELEASE: 'press_release',
    
    // Batch events (per checklist - 1-5 items)
    FIXTURES_BATCH: 'fixtures_batch',
    RESULTS_BATCH: 'results_batch',
    
    // Summary events (per checklist)
    MONTHLY_FIXTURES: 'fixtures_this_month',
    MONTHLY_RESULTS: 'results_this_month', 
    PLAYER_STATS_SUMMARY: 'player_stats',
    
    // Video & Media events (future-proofing)
    VIDEO_CLIP_CREATED: 'video_clip_created',
    GOTM_VOTING_OPEN: 'gotm_voting_open',
    GOTM_VOTING_CLOSED: 'gotm_voting_closed',
    GOTM_WINNER_ANNOUNCED: 'gotm_winner_announced'
  },


  // ===== ENHANCED CARD TYPES =====
  CARDS: {
    YELLOW: 'yellow',
    RED: 'red',
    SECOND_YELLOW: 'second_yellow', // Explicit 2nd yellow handling
    SIN_BIN: 'sin_bin',
    // Enhanced discipline tracking
    CAPTAIN_ARMBAND_REMOVED: 'captain_removed', // Serious misconduct
    VIOLENT_CONDUCT: 'violent_conduct'
  },


  // ===== ENHANCED MAKE.COM INTEGRATION =====
  MAKE: {
    WEBHOOK_URL_PROPERTY: 'MAKE_WEBHOOK_URL',
    TIMEOUT_MS: 30000,
    RETRY_ATTEMPTS: 3,
    FALLBACK_ENABLED: true, // NEW: Enable fallback mechanisms
    
    // Enhanced event type mappings for Make.com routing
    EVENT_MAPPINGS: {
      // Single events (existing)
      'goal': 'goal_scored',
      'goal_opposition': 'goal_opposition',
      'card': 'card_shown',
      'card_opposition': 'card_opposition', 
      'second_yellow': 'card_second_yellow',
      'substitution': 'substitution_made',
      'motm': 'man_of_match',
      'match_postponed': 'match_postponed_league',
      'second_half_kick_off': 'second_half_start',
      
      // Batch events (1-5 fixtures/results per checklist)
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
      
      // Monthly summaries (per checklist)
      'fixtures_this_month': 'fixtures_monthly',
      'results_this_month': 'results_monthly',
      'player_stats': 'player_stats_summary',
      
      // Video & GOTM (future-proofing)
      'video_clip_created': 'video_clip_ready',
      'gotm_voting_open': 'gotm_voting_start',
      'gotm_voting_closed': 'gotm_voting_end',
      'gotm_winner_announced': 'gotm_winner_reveal'
    }
  },


  // ===== ENHANCED CANVA PLACEHOLDERS =====
  CANVA: {
    // Goal placeholders (enhanced)
    GOAL: ['player_name', 'minute', 'home_score', 'away_score', 'match_info', 'goal_type', 'assist_by'],
    GOAL_OPPOSITION: ['opponent_name', 'minute', 'home_score', 'away_score', 'match_info', 'match_status'],
    
    // Card placeholders (including enhanced 2nd yellow)
    CARD: ['player_name', 'card_type', 'minute', 'match_info', 'incident_details'],
    CARD_OPPOSITION: ['card_type', 'minute', 'match_info', 'opponent_name'],
    CARD_SECOND_YELLOW: ['player_name', 'minute', 'match_info', 'previous_yellow_minute'],
    
    // Batch placeholders (enhanced per checklist)
    FIXTURES_BATCH: ['fixture_count', 'fixtures_list', 'weekend_date', 'competition', 'home_fixtures', 'away_fixtures'],
    RESULTS_BATCH: ['result_count', 'results_list', 'weekend_date', 'competition', 'wins', 'draws', 'losses'],
    
    // Monthly placeholders (per checklist)
    FIXTURES_MONTHLY: ['month_name', 'fixture_count', 'fixtures_list', 'key_dates', 'competition_breakdown'],
    RESULTS_MONTHLY: ['month_name', 'result_count', 'results_summary', 'key_stats', 'top_performers'],
    
    // Player stats placeholders (enhanced per checklist)
    PLAYER_STATS_SUMMARY: [
      'period', 'top_scorer', 'top_assists', 'most_apps', 'motm_winner', 
      'discipline_stats', 'minutes_leader', 'clean_sheet_heroes', 'breakthrough_player'
    ],
    
    // Postponed match placeholders
    POSTPONED: ['original_date', 'opponent', 'reason', 'new_date', 'venue', 'competition'],
    
    // 2nd half kickoff placeholders  
    SECOND_HALF_KICKOFF: ['home_team', 'away_team', 'half_time_score', 'match_info']
  },


  // ===== ENHANCED VALIDATION RULES =====
  VALIDATION: {
    MINUTE: {
      MIN: 0,
      MAX: 120, // Including extra time
      INJURY_TIME_MAX: 150 // Extended for extreme cases
    },
    PLAYER_NAME: {
      MIN_LENGTH: 2,
      MAX_LENGTH: 50,
      ALLOWED_CHARS: /^[a-zA-Z\s\-'\.]+$/,
      RESERVED_NAMES: ['Opposition', 'Goal', 'Own Goal', 'Unknown'] // Reserved system names
    },
    SCORE: {
      MIN: 0,
      MAX: 20 // Reasonable maximum
    },
    BATCH_SIZE: {
      MIN: 1,
      MAX: 5 // Per checklist requirement
    }
  },


  // ===== ENHANCED LOGGING CONFIGURATION =====
  LOGGING: {
    LEVEL: 'INFO', // DEBUG, INFO, WARN, ERROR
    MAX_LOG_ENTRIES: 2000, // Increased for more history
    LOG_RETENTION_DAYS: 60, // Longer retention
    PERFORMANCE_TRACKING: true,
    ERROR_RECOVERY_LOGGING: true, // NEW: Track recovery attempts
    
    CHANNELS: {
      CONSOLE: true,
      SHEET: true,
      EXTERNAL: false, // Future: external logging service
      EMAIL_ON_CRITICAL: true // NEW: Email alerts for critical errors
    }
  },


  // ===== ENHANCED SOCIAL POSTING POLICY =====
  SOCIAL: {
    // Events that trigger social posts (per checklist)
    ENABLED_EVENTS: [
      'goal', 'goal_opposition', 'card', 'card_opposition', 'second_yellow',
      'motm', 'match_postponed', 'second_half_kick_off',
      'fixtures_batch', 'results_batch', 'fixtures_monthly', 'results_monthly',
      'player_stats', 'gotm_voting_open', 'gotm_winner_announced'
    ],
    
    // Internal-only events (no social posting)
    INTERNAL_ONLY: [
      'substitution', 'player_injury', 'new_signing', 'contract_extension',
      'player_release', 'pitch_inspection', 'ground_news', 'press_release',
      'video_clip_created' // Only post when ready, not when created
    ],
    
    // Rate limiting (prevent spam)
    RATE_LIMITING: {
      MAX_POSTS_PER_HOUR: 20,
      MIN_DELAY_BETWEEN_POSTS_MS: 30000 // 30 seconds
    }
  },


  // ===== ENHANCED AUTOMATION SCHEDULE =====
  SCHEDULE: {
    // Player stats summary (per checklist - every 2nd week)
    PLAYER_STATS_SUMMARY: {
      DAY_OF_MONTH: 14, // 2nd week as per checklist
      HOUR: 10,
      ENABLED: true
    },
    
    // GOTM voting schedule
    GOTM_VOTING: {
      OPEN_DAY: 1, // 1st of month
      CLOSE_DAY: 7, // 7 days later
      ANNOUNCE_DAY: 8,
      ENABLED: true
    },
    
    // Monthly summaries
    MONTHLY_SUMMARIES: {
      FIXTURES_DAY: 25, // Near end of month for next month preview
      RESULTS_DAY: 2,   // Early in month for previous month review
      HOUR: 12,
      ENABLED: true
    },
    
    // Maintenance tasks
    MAINTENANCE: {
      CLEANUP_LOGS_DAY: 1, // Monthly cleanup
      BACKUP_DATA_DAY: 15, // Mid-month backup
      HOUR: 2, // Early morning
      ENABLED: true
    }
  },


  // ===== ENHANCED ERROR HANDLING =====
  ERRORS: {
    RETRY_EVENTS: [
      'NETWORK_ERROR',
      'TIMEOUT', 
      'RATE_LIMIT',
      'SERVICE_UNAVAILABLE',
      'TEMPORARY_FAILURE'
    ],
    
    CRITICAL_EVENTS: [
      'AUTHENTICATION_FAILED',
      'QUOTA_EXCEEDED',
      'INVALID_CREDENTIALS',
      'CONFIGURATION_ERROR'
    ],
    
    // Recovery strategies
    RECOVERY: {
      AUTO_RETRY_ENABLED: true,
      FALLBACK_MECHANISMS: true,
      GRACEFUL_DEGRADATION: true,
      ALERT_ON_REPEATED_FAILURES: true
    }
  },


  // ===== IDEMPOTENCY CONFIGURATION =====
  IDEMPOTENCY: {
    ENABLED: true,
    KEY_FORMAT: '{matchId}_{eventType}_{player}_{minute}_{details}',
    CACHE_DURATION_HOURS: 24,
    HASH_ALGORITHM: 'SHA1' // For generating short keys
  }
};


/**
 * Enhanced configuration getter with validation and fallbacks
 * @param {string} path - Dot notation path (e.g., 'SHEETS.LIVE')
 * @param {*} fallback - Fallback value if path not found
 * @returns {*} Configuration value or fallback
 */
function getConfig(path, fallback = null) {
  try {
    const keys = path.split('.');
    let value = SYSTEM_CONFIG;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        logger?.warn(`Config path not found: ${path}, using fallback`, { path, fallback });
        return fallback;
      }
    }
    
    return value;
  } catch (error) {
    logger?.error(`Config lookup failed for path: ${path}`, error);
    return fallback;
  }
}


/**
 * Enhanced configuration setter with validation
 * @param {string} path - Dot notation path
 * @param {*} value - Value to set
 * @returns {boolean} Success status
 */
function setConfig(path, value) {
  try {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = SYSTEM_CONFIG;
    
    for (const key of keys) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    target[lastKey] = value;
    logger?.info(`Config updated: ${path}`, { path, value });
    return true;
  } catch (error) {
    logger?.error(`Config set failed for path: ${path}`, error);
    return false;
  }
}


/**
 * Enhanced configuration loader with error recovery
 * @returns {boolean} Success status
 */
function loadConfigFromSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName(getConfig('SHEETS.CONFIG'));
    
    if (!configSheet) {
      logger?.warn('Config sheet not found - using defaults');
      return false;
    }
    
    const data = configSheet.getDataRange().getValues();
    let updated = 0;
    const errors = [];
    
    for (let i = 1; i < data.length; i++) { // Skip header
      const [key, value] = data[i];
      if (key && value !== '') {
        try {
          // Attempt to parse JSON values
          let parsedValue = value;
          if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
            try {
              parsedValue = JSON.parse(value);
            } catch (parseError) {
              // Keep as string if JSON parsing fails
            }
          }
          
          if (setConfig(key, parsedValue)) {
            updated++;
          }
        } catch (configError) {
          errors.push(`${key}: ${configError.toString()}`);
        }
      }
    }
    
    logger?.info(`Config loaded from sheet`, { 
      updated, 
      errors: errors.length,
      errorDetails: errors 
    });
    
    return errors.length === 0;
  } catch (error) {
    logger?.error('Failed to load config from sheet:', error);
    return false;
  }
}


/**
 * Validate system configuration
 * @returns {Object} Validation result
 */
function validateSystemConfig() {
  const validation = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  try {
    // Check required configurations
    const requiredPaths = [
      'SYSTEM.VERSION',
      'SYSTEM.CLUB_NAME',
      'SHEETS.LIVE',
      'SHEETS.FIXTURES',
      'SHEETS.RESULTS'
    ];
    
    for (const path of requiredPaths) {
      const value = getConfig(path);
      if (!value) {
        validation.errors.push(`Missing required config: ${path}`);
        validation.valid = false;
      }
    }
    
    // Check optional but recommended configurations
    const recommendedPaths = [
      'MAKE.WEBHOOK_URL_PROPERTY',
      'VIDEO.YOUTUBE.CHANNEL_ID_PROPERTY'
    ];
    
    for (const path of recommendedPaths) {
      const value = getConfig(path);
      if (!value) {
        validation.warnings.push(`Missing recommended config: ${path}`);
      }
    }
    
    // Validate numeric ranges
    const batchSize = getConfig('VALIDATION.BATCH_SIZE.MAX', 5);
    if (batchSize > 10) {
      validation.warnings.push('Batch size unusually high - may impact performance');
    }
    
    logger?.info('System configuration validated', validation);
    
  } catch (error) {
    validation.valid = false;
    validation.errors.push(`Validation error: ${error.toString()}`);
  }
  
  return validation;
}


// Export enhanced configuration for global access
globalThis.SYSTEM_CONFIG = SYSTEM_CONFIG;
globalThis.getConfig = getConfig;
globalThis.setConfig = setConfig;
globalThis.loadConfigFromSheet = loadConfigFromSheet;
globalThis.validateSystemConfig = validateSystemConfig;
