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
 * Merge arrays into a unique ordered list (legacy + new columns)
 * @param {...Array<*>} arrays - Arrays of values to merge
 * @returns {Array<*>} Array with unique entries preserving first occurrence order
 */
function mergeUniqueArrays() {
  const merged = [];

  for (let i = 0; i < arguments.length; i += 1) {
    const current = Array.isArray(arguments[i]) ? arguments[i] : [];
    current.forEach(value => {
      if (!merged.includes(value)) {
        merged.push(value);
      }
    });
  }

  return merged;
}

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
    LEAGUE: 'Leicester & District Football League',
    LAST_UPDATED: '2025-09-20',
    
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
    ADVANCED_ANALYTICS: false,
    AI_CONTENT_GENERATION: false,
    LIVE_STREAMING: false,
    VOICE_COMMENTARY: false,

    // Future features
    TIKTOK_POSTING: false,
    GOAL_OF_MONTH: false,
    MULTI_TENANT: false,
    FACEBOOK_POSTING: true,
    TWITTER_POSTING: true,
    INSTAGRAM_POSTING: true
  },

  // ==================== DOCUMENTATION REFERENCE ====================
  DOCUMENTATION: {
    VERSION: '6.2.0',
    SOURCE_FILES: {
      BIBLE: 'System-Workings - AKA The Bible.md',
      CLAUDE: 'CLAUDE.md',
      TASKS: 'TASKS.md',
      PLANNING: 'PLANNING.md'
    },

    WEEKLY_SCHEDULE: {
      MONDAY: [
        "This week's fixtures",
        'No match scheduled this week'
      ],
      TUESDAY: ['Quotes'],
      WEDNESDAY: [
        'Player stats - Monthly',
        "Previous matches against this week's team"
      ],
      THURSDAY: ['Throwback Thursday', '3 days to go'],
      FRIDAY: ['2 days to go'],
      SATURDAY: ['1 day to go'],
      SUNDAY: [
        'Match day',
        'Kick off',
        'Live Match Updates',
        'Day results',
        'League tables'
      ]
    },

    OTHER_POSTS: [
      'Birthdays - as and when',
      'Syston Fixtures - 1st day of the month',
      'Syston Results - last day of the Month',
      'Goal of the month competition - repost daily until voting closes',
      'Voting closing reminders for competitions',
      'Goal of the month winner announced 5 days after competition opens',
      'Goal of the season competition using monthly winners and runners up',
      'Two week goal of the season campaign after final match',
      'Postponed match alerts canceling countdown posts',
      'Sponsor highlights page/posts',
      'Highlight clips and video recaps'
    ],

    MATCH_DAY_OPERATIONS: {
      PRE_MATCH: [
        'Fixture moves into Live Match Updates tab on match day',
        'Control panel toggles enable/disable automation features'
      ],
      STATUS_UPDATES: [
        'Kick off',
        'Half-time',
        'Second half kick-off',
        'Full time'
      ],
      GOAL_LOGIC: [
        'Selecting player "Goal" counts as opposition goal',
        'Brace and hat-trick detection for tailored posts',
        'Opposition goal updates do not affect player stats'
      ],
      DISCIPLINE: [
        'Cards logged with player dropdown',
        'Opposition cards logged against opposition entity'
      ],
      PLAYER_TRACKING: [
        'Player minutes auto calculated from kickoff/subs/full-time',
        'Appearances, goals, assists, cards and minutes updated in real time'
      ],
      VIDEO_NOTES: [
        'Notes dropdown marks video editor cues (big chance, tackle, good play, goal)',
        'Notes include player dropdown to reference individuals'
      ],
      VIDEO_REQUIREMENTS: [
        'Highlight video overlays match clock with team names',
        'Goal events trigger banner and replay zoom',
        'Video clips stored per player in Google Drive folders'
      ],
      LIVE_STREAMING: [
        'Consider live streaming to Facebook, YouTube, Instagram, TikTok'
      ],
      MANUAL_INPUT: [
        'Allow manual entry of player stats and historical data when needed'
      ]
    },

    CLAUDE_GUIDANCE: {
      PROJECT_OVERVIEW: {
        SUMMARY: 'Comprehensive automation platform for Syston Tigers FC',
        WEEKLY_SCHEDULE: ['Monday fixtures', 'Tuesday quotes', 'Wednesday stats/opposition history', 'Thursday throwback & countdown', 'Friday two days to go', 'Saturday one day to go', 'Sunday match day operations'],
        MATCHDAY_AUTOMATION: [
          'Live match tab activation on match day',
          'Status update workflow with send checkbox',
          'Opposition goal and card detection',
          'MOTM selection and player minutes tracking'
        ],
        CONTENT_TYPES: [
          'Live match events',
          'Weekly batch content',
          'Monthly summaries',
          'Special posts (birthdays, postponements, goal competitions)',
          'Video highlight content'
        ]
      },
      TECHNOLOGY_STACK: [
        'Google Sheets input layer',
        'Google Apps Script processing',
        'Make.com automation with router branches',
        'Canva for templated graphics',
        'Google Drive storage',
        'YouTube API and video tooling',
        'XbotGo scoreboard integration',
        'GitHub Pages data feeds'
      ],
      DESIGN_PRINCIPLES: [
        'Bible compliance governs implementation',
        'Strict weekly schedule automation',
        'Modular components per .gs file',
        'Centralized configuration only in config.js',
        'Idempotent external calls using unique keys',
        'Graceful fallback handling for missing data',
        'Comprehensive logging and @testHook usage'
      ],
      CODE_STANDARDS: {
        LOGGING_PATTERN: 'logger.enterFunction/exitFunction with try/catch and @testHook markers',
        CONFIG_ACCESS: 'Use getConfig utility instead of literals',
        SHEET_ACCESS: 'Use SheetUtils safe helpers with validation'
      }
    },

    TASK_STATUS: {
      UPDATED: '2025-09-20',
      CRITICAL_MISSING: [
        'Weekly content calendar automation',
        'Opposition goal auto-detection',
        'Real-time player minutes calculation',
        'Video clip metadata generation',
        'Video editor notes system',
        'Feature toggle control panel'
      ],
      FOUNDATIONS: [
        'Core Apps Script framework',
        'Event processing for goals/cards/MOTM',
        'Robust Google Sheets integration',
        'Make.com webhook and router setup',
        'Idempotent social media posting',
        'Version standardization and documentation',
        'Comprehensive logging infrastructure'
      ],
      METRICS: {
        WEEKLY_SCHEDULE: '0% implemented',
        OPPOSITION_DETECTION: '0% implemented',
        PLAYER_MINUTES: '0% implemented',
        VIDEO_INTEGRATION: '0% implemented',
        CONTROL_PANEL: '0% implemented'
      },
      PHASES: {
        PHASE_1: {
          DEADLINE: '2025-10-31',
          FOCUS: 'Bible core implementation',
          ESTIMATED_HOURS: 60,
          STATUS: 'Not started'
        }
      }
    },

    PLANNING: {
      MISSION_STATEMENT: 'Automate every moment of Syston Tigers FC with Bible-compliant workflows.',
      VISION_2025: 'Every Goal. Every Card. Every Moment. Every Day of the Week. Automated.',
      SUCCESS_TARGETS: [
        '10,000+ social followers',
        '95% automated posting',
        'Perfect weekly schedule compliance',
        '100% match event automation',
        'Complete video pipeline delivery',
        '50+ clubs using automation template',
        '£10,000+ annual digital revenue',
        'Industry recognition for innovation'
      ],
      ARCHITECTURE: {
        INPUT_LAYER: ['Weekly schedule triggers', 'Live match Google Sheets', 'Admin control panel', 'Email fixture ingestion'],
        PROCESSING_CORE: ['Weekly scheduler', 'Event manager', 'Player manager', 'Video manager'],
        INTEGRATIONS: ['Make.com routers', 'Canva templates', 'Video processing workflows', 'External APIs'],
        DISTRIBUTION: ['Facebook', 'Twitter/X', 'Instagram', 'TikTok', 'YouTube Shorts']
      },
      NOTES: [
        'System must remain under Make.com free tier limits',
        'All automation must support manual overrides',
        'Templates stored for repeatable Canva usage'
      ]
    }
  },

  // ==================== GOOGLE SHEETS CONFIGURATION ====================
  SHEETS: {
    SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '',
    TAB_NAMES: {
      // Core sheets
      LIVE_MATCH: 'Live Match Updates',
      FIXTURES: 'Fixtures',
      RESULTS: 'Results',
      PLAYER_STATS: 'Player Stats',
      PLAYER_EVENTS: 'Player Events',
      LIVE_MATCH_UPDATES: 'Live Match Updates',
      FIXTURES_RESULTS: 'Fixtures & Results',
      PLAYER_MINUTES: 'Player Minutes',
      
      // Enhanced sheets from spec
      SUBS_LOG: 'Subs Log',
      OPPOSITION_EVENTS: 'Opposition Events',
      VIDEO_CLIPS: 'Video Clips',
      MONTHLY_CONTENT: 'Monthly Content',
      MONTHLY_SUMMARIES: 'Monthly Summaries',
      WEEKLY_SCHEDULE: 'Weekly Schedule',
      WEEKLY_CONTENT: 'Weekly Content Calendar',
      
      // System sheets
      CONTROL_PANEL: 'Control Panel',
      CONFIG: 'Config',
      LOGS: 'Logs',
      NOTES: 'Notes',
      QUOTES: 'Quotes',
      HISTORICAL_DATA: 'Historical Data',
      
      // Future sheets
      SEASON_STATS: 'Season Stats',
      GOAL_OF_MONTH: 'GOTM Tracking',
      MONTHLY_STATS: 'Monthly Stats'
    },

    REQUIRED_COLUMNS: {
      LIVE_MATCH: [
        'Minute', 'Event', 'Player', 'Assist', 'Card Type',
        'Send', 'Posted', 'Match ID', 'Timestamp', 'Notes'
      ],
      LIVE_MATCH_UPDATES: [
        'Timestamp', 'Minute', 'Event', 'Player', 'Opponent', 'Home Score',
        'Away Score', 'Card Type', 'Assist', 'Notes', 'Send', 'Status'
      ],
      FIXTURES: [
        'Date', 'Time', 'Opposition', 'Venue', 'Competition',
        'Home/Away', 'Send', 'Posted', 'Match ID', 'Status'
      ],
      FIXTURES_RESULTS: [
        'Match Date', 'Opponent', 'Competition', 'Home/Away', 'Result',
        'Scoreline', 'Send Status', 'Posted At', 'Notes'
      ],
      RESULTS: [
        'Date', 'Opposition', 'Home Score', 'Away Score', 'Venue',
        'Competition', 'Home/Away', 'Result', 'Send', 'Posted', 'Match ID'
      ],
      PLAYER_STATS: mergeUniqueArrays(
        [
          'Player', 'Appearances', 'Starts', 'Sub Apps', 'Goals',
          'Penalties', 'Assists', 'Yellow Cards', 'Red Cards',
          'Sin Bins', 'MOTM', 'Minutes', 'Last Updated'
        ],
        [
          'Player Name', 'Goals', 'Assists', 'Position', 'Squad Number'
        ]
      ),
      PLAYER_EVENTS: [
        'Match ID', 'Date', 'Player', 'Event Type', 'Minute',
        'Details', 'Competition', 'Opposition', 'Timestamp'
      ],
      SUBS_LOG: mergeUniqueArrays(
        [
          'Match ID', 'Date', 'Minute', 'Player Off', 'Player On',
          'Home/Away', 'Reason', 'Timestamp'
        ],
        [
          'Match Date'
        ]
      ),
      OPPOSITION_EVENTS: [
        'Match ID', 'Date', 'Event Type', 'Minute', 'Details',
        'Posted', 'Timestamp'
      ],     
        [
          'Match Date', 'Local Path', 'Notes'
        ]
      ),
      MONTHLY_CONTENT: [
        'Month Key',
        'Type',
        'Event Type',
        'Count',
        'Statistics JSON',
        'Payload Preview',
        'Processed At',
        'Idempotency Key',
        'Make Result'
      ],
      WEEKLY_CONTENT: [
        'Date', 'Day', 'Content Type', 'Status', 'Posted At', 'Event Type', 'Notes' 
      ],
VIDEO_CLIPS: mergeUniqueArrays(
  [
    'Match ID', 'Player', 'Event Type', 'Minute', 'Start Time',
    'Duration', 'Title', 'Caption', 'Status', 'YouTube URL',
    'Folder Path', 'Created'
  ],
  [
    'Match Date', 'Local Path', 'Notes'
  ]
),

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
    WEBHOOK_URL_FALLBACK: 'MAKE_WEBHOOK_URL_FALLBACK',
    IDEMPOTENCY: {
      ENABLED: true,
      TTL_SECONDS: 86400,
      CACHE_PREFIX: 'MAKE_IDEMPOTENCY_'
    },
    
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
      PLAYER_STATS_MONTHLY: 'player_stats_summary',

      // Weekly content events (NEW: Bible compliance)
      WEEKLY_FIXTURES: 'weekly_fixtures',
      WEEKLY_NO_MATCH: 'weekly_no_match',
      WEEKLY_QUOTES: 'weekly_quotes',
      WEEKLY_STATS: 'weekly_stats',
      WEEKLY_THROWBACK: 'weekly_throwback',
      WEEKLY_COUNTDOWN_2: 'weekly_countdown_2',
      WEEKLY_COUNTDOWN_1: 'weekly_countdown_1',
      MONDAY_FIXTURES: 'weekly_fixtures',
      TUESDAY_QUOTES: 'weekly_quotes',
      WEDNESDAY_STATS: 'weekly_stats',
      WEDNESDAY_OPPOSITION: 'weekly_opposition_analysis',
      THURSDAY_THROWBACK: 'weekly_throwback',
      FRIDAY_COUNTDOWN: 'weekly_countdown_2',
      SATURDAY_COUNTDOWN: 'weekly_countdown_1',

      // Legacy aliases for batch and special events
      second_half: 'match_second_half',
      second_half_kickoff: 'match_second_half_kickoff',
      fixtures_batch_1: 'fixtures_1_league',
      fixtures_batch_2: 'fixtures_2_league',
      fixtures_batch_3: 'fixtures_3_league',
      fixtures_batch_4: 'fixtures_4_league',
      fixtures_batch_5: 'fixtures_5_league',
      results_batch_1: 'results_1_league',
      results_batch_2: 'results_2_league',
      results_batch_3: 'results_3_league',
      results_batch_4: 'results_4_league',
      results_batch_5: 'results_5_league',
      birthday: 'player_birthday',
      gotm_voting_open: 'gotm_voting_start',
      gotm_winner: 'gotm_winner_announcement'
    }
  },

  // ==================== MONITORING & ALERTS ====================
  MONITORING: {
    EMAIL_RECIPIENTS: '',
    ALERT_EMAIL_ONLY: true,
    ALERT_CRITICAL_ONLY: true,
    WEEKLY_SUMMARY: {
      ENABLED: true,
      DAY: 'Monday',
      TIME: '09:00'
    },
    SUMMARY_METRICS: ['quota_usage', 'error_count', 'last_post', 'disabled_features']
  },

  // ==================== CANVA INTEGRATION ====================
  CANVA: {
    TEMPLATE_PROPERTY_PREFIX: 'CANVA_TEMPLATE_',
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

  // ==================== LOGGING CONFIGURATION ====================
  LOGGING: {
    ENABLED: true,
    LOG_SHEET_NAME: 'Logs',
    LOG_LEVEL: 'INFO', // DEBUG | INFO | WARN | ERROR
    MAX_LOG_ENTRIES: 10000,
    LOG_RETENTION_DAYS: 30,
    LEVELS: {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    },
    CURRENT_LEVEL: 2,
    LOG_CLEANUP_DAYS: 30,

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
    SHEET_LOCK_TIMEOUT_MS: 30000,
    PROCESSING_DELAY_MS: 500,
    API_RATE_LIMIT_MS: 500
  },

  // ==================== PLAYER DIRECTORY SETTINGS ====================
  PLAYERS: {
    OPPOSITION_ENTRIES: ['Goal', 'Opposition', 'Own Goal', 'Unknown'],
    POSITIONS: [
      'Goalkeeper', 'Right Back', 'Centre Back', 'Left Back',
      'Defensive Midfielder', 'Central Midfielder', 'Attacking Midfielder',
      'Right Winger', 'Left Winger', 'Striker', 'Centre Forward'
    ],
    CARD_TYPES: ['Yellow Card', 'Red Card', 'Sin Bin', '2nd Yellow (Red)'],
    MATCH_DURATION_MINUTES: 90,
    HALF_TIME_MINUTE: 45,
    STAT_FIELDS: [
      'appearances', 'goals', 'assists', 'minutes', 'yellow_cards',
      'red_cards', 'motm', 'goals_per_game', 'minutes_per_goal'
    ]
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
    DEFAULT_CLIP_DURATION: 30,

    // Clip buffers per event type (Bible compliance defaults)
    CLIP_BUFFERS: {
      GOAL: { preSeconds: 10, postSeconds: 20 },
      CARD: { preSeconds: 5, postSeconds: 10 },
      BIG_CHANCE: { preSeconds: 10, postSeconds: 15 }
    },

    // Folder structure
    DRIVE_FOLDER_ID: '', // Set when configured
    DRIVE_FOLDER_PROPERTY: 'VIDEO_DRIVE_FOLDER_ID',
    PLAYER_FOLDERS_AUTO_CREATE: true,
    PLAYER_FOLDERS_PROPERTY: 'PLAYER_FOLDERS_MAPPING',
    MATCH_FOLDER_PREFIX: 'Match Highlights',

    // Processing options
    PROCESSING_METHOD: 'cloudconvert', // cloudconvert | ffmpeg_local
    YOUTUBE_AUTO_UPLOAD: false,
    YOUTUBE_DEFAULT_PRIVACY: 'unlisted',
    YOUTUBE_CHANNEL_PROPERTY: 'YOUTUBE_CHANNEL_ID',
    YOUTUBE_PLAYLIST_PROPERTY: 'YOUTUBE_PLAYLIST_ID',
    DEFAULT_PRIVACY_STATUS: 'unlisted',
    CLOUDCONVERT_API_KEY_PROPERTY: 'CLOUDCONVERT_API_KEY',

    // Video editor notes
    NOTE_TYPES: ['big_chance', 'goal', 'skill', 'good_play', 'card', 'other']
  },

  // ==================== XBOTGO INTEGRATION ====================
  XBOTGO: {
    ENABLED: false, // Enable when API configured
    API_URL: '',
    API_KEY_PROPERTY: 'XBOTGO_API_KEY',
    API_BASE_URL_PROPERTY: 'XBOTGO_API_URL',
    SCOREBOARD_ID: '',
    DEVICE_ID_PROPERTY: 'XBOTGO_DEVICE_ID',

    // Update settings
    AUTO_SCORE_UPDATE: true,
    UPDATE_ON_GOAL: true,
    UPDATE_ON_FINAL: true,
    RETRY_ATTEMPTS: 3,
    AUTO_PUSH_GOALS: true,
    AUTO_PUSH_CARDS: false,
    AUTO_PUSH_SUBS: false,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000
  },

  // ==================== WEEKLY SCHEDULE CONFIGURATION ====================
  WEEKLY_SCHEDULE: {
    ENABLED: true, // Bible compliance requirement
    TIMEZONE: 'Europe/London',
    COUNTDOWN: {
      LOOKAHEAD_DAYS: 10,
      SUPPRESS_ON_POSTPONED: true,
      CONTROL_PANEL_FLAG: 'COUNTDOWN_POSTS'
    },
    ROTATION: {
      QUOTES_PROPERTY_KEY: 'WEEKLY_QUOTES_ROTATION',
      THROWBACK_PROPERTY_KEY: 'WEEKLY_THROWBACK_ROTATION'
    },

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
    },

    LEGACY_SCHEDULE: {
      1: {
        type: 'fixtures',
        content: 'this_week_fixtures',
        fallback: 'no_match_scheduled',
        enabled: true
      },
      2: {
        type: 'quotes',
        content: 'motivational_quotes',
        rotation: true,
        enabled: true
      },
      3: {
        type: 'stats_or_opposition',
        content: 'monthly_stats',
        monthly_week: 2,
        enabled: true
      },
      4: {
        type: 'throwback',
        content: 'historical_content',
        countdown_if_match: true,
        enabled: true
      },
      5: {
        type: 'countdown',
        content: '2_days_to_go',
        only_if_match: true,
        enabled: true
      },
      6: {
        type: 'countdown',
        content: '1_day_to_go',
        only_if_match: true,
        enabled: true
      },
      0: {
        type: 'match_day',
        content: 'live_match_automation',
        priority: 'highest',
        enabled: true
      }
    },

    QUOTES_ROTATION_PROPERTY: 'LAST_QUOTE_INDEX',
    THROWBACK_ROTATION_PROPERTY: 'LAST_THROWBACK_INDEX',
    CONTENT_COOLDOWN_DAYS: 30
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

  // ==================== MONTHLY EVENTS (LEGACY SUPPORT) ====================
  MONTHLY: {
    GOTM: {
      VOTING_PERIOD_DAYS: 5,
      MIN_GOALS_FOR_COMPETITION: 3,
      VOTING_START_DAY: 1,
      WINNER_ANNOUNCE_DAY: 6,
      ENABLED: true
    },
    SUMMARIES: {
      FIXTURES_DAY: 1,
      RESULTS_DAY: -1,
      STATS_WEEK: 2,
      ENABLED: true
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
    DEFAULT_MAX_RETRIES: 3,
    DEFAULT_RETRY_DELAY: 1000,
    EXPONENTIAL_BACKOFF: true,
    CONTINUE_ON_ERROR: true,

    // Missing data handling
    HANDLE_MISSING_SHEETS: true,
    HANDLE_MISSING_PLAYERS: true,
    HANDLE_MISSING_CONFIG: true,

    // Error reporting
    LOG_ALL_ERRORS: true,
    ALERT_ON_CRITICAL: false, // Set to true for production monitoring
    ALERT_ON_CRITICAL_ERROR: true,
    ADMIN_EMAIL_PROPERTY: 'ADMIN_EMAIL',
    CRITICAL_ERRORS: [
      'SHEET_ACCESS_DENIED',
      'WEBHOOK_PERMANENTLY_FAILED',
      'CONFIG_CORRUPTION'
    ]
  },

  // ==================== DEVELOPMENT SETTINGS ====================
  DEVELOPMENT: {
    DEBUG_MODE: false,
    VERBOSE_LOGGING: false,
    USE_TEST_DATA: false,
    TEST_WEBHOOK_URL_PROPERTY: 'TEST_WEBHOOK_URL',
    SIMULATION_MODE: false,
    SIMULATION_LOG_PAYLOADS: true
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

