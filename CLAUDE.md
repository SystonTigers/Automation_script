
﻿claude.md - Syston Tigers Football Automation System
🎯 CLAUDE SESSION GUIDANCE DOCUMENT
Purpose: This document provides essential context for any Claude session working on the Syston Tigers Football Automation System. Read this first before making any code changes.
________________


📋 PROJECT OVERVIEW
What This System Does
The Syston Tigers Football Automation System is a comprehensive live football automation platform that:
* Processes live match events (goals, cards, subs) in real-time
* Generates automated social media posts via Make.com → Canva → Social platforms
* Tracks detailed player statistics and minutes
* Creates batch content (weekly fixtures/results, monthly summaries)
* Manages video clip generation and YouTube automation
* Integrates with XbotGo scoreboards for live updates
Technology Stack
Input Layer:     Google Sheets (Live match data entry)
Processing:      Google Apps Script (JavaScript-like, server-side)
Automation:      Make.com (Webhook-based workflow automation)
Graphics:        Canva (Automated template-based design)
Storage:         Google Drive + Sheets
Video:           YouTube API + FFmpeg/CloudConvert
Scoreboard:      XbotGo API integration


Current Version Status
* Target Version: 6.0.0 (standardize all files to this)
* Architecture: Modular component-based system
* Status: ~75% complete, missing some monthly/opposition features
________________


🏗️ SYSTEM ARCHITECTURE
Core Design Principles
1. Modular Components: Each .gs file is a self-contained component
2. Centralized Configuration: All config in config.js, no globals elsewhere
3. Idempotency: No duplicate posts if retriggered (use unique keys)
4. Graceful Fallbacks: Handle missing sheets/data without crashing
5. Comprehensive Logging: logger.info() at function entry/exit, logger.error() in catches
6. Test Hooks: Insert @testHook(id) comments before/after external calls
File Structure & Responsibilities
📁 Apps Script Project Structure:
├── 📄 config.js              # Centralized configuration (SYSTEM_CONFIG object)
├── 📄 utils.js               # Utility functions (SheetUtils, DateUtils, etc.)
├── 📄 logger.js              # Smart logging system with sheet persistence
├── 📄 mains.gs               # Main coordinator and public API functions
├── 📄 enhanced-events.gs     # Live match event processing
├── 📄 batch-fixtures.gs      # Batch posting (1-5 fixtures/results)
├── 📄 player-management.gs   # Player stats, minutes, sub tracking
├── 📄 video-clips.gs         # Video processing and YouTube automation
├── 📄 make-integration.gs    # Make.com webhook integration
├── 📄 xbotgo-integration.gs  # XbotGo scoreboard API
└── 📄 advanced-features.gs   # System health, scheduling, multi-tenant


Data Flow
Live Match Input (Sheets) 
    ↓
Enhanced Events Processing 
    ↓
Make.com Webhook Trigger 
    ↓
Canva Template Population 
    ↓
Social Media Posting (Facebook/Twitter/Instagram)


________________


🎯 CRITICAL IMPLEMENTATION RULES
Code Quality Standards
// ✅ ALWAYS DO THIS:
function functionName(params) {
  logger.enterFunction('ComponentName.functionName', { params });
  
  try {
    // @testHook(operation_start)
    const result = someOperation();
    // @testHook(operation_end)
    
    logger.exitFunction('ComponentName.functionName', { success: true });
    return result;
  } catch (error) {
    logger.error('Operation failed', { error: error.toString() });
    return { success: false, error: error.toString() };
  }
}


// ❌ NEVER DO THIS:
var globalVariable = "something"; // No globals outside config.js
function doSomething() {
  // No logging, no error handling, no test hooks
  return "result";
}


Configuration Access
// ✅ CORRECT:
const clubName = getConfig('SYSTEM.CLUB_NAME');
const webhookUrl = getConfig('MAKE.WEBHOOK_URL_PROPERTY');


// ❌ WRONG:
const clubName = "Syston Tigers"; // Hard-coded values


Sheet Operations
// ✅ SAFE SHEET ACCESS:
const sheet = SheetUtils.getOrCreateSheet('Live', ['Minute', 'Event', 'Player']);
if (!sheet) {
  logger.warn('Sheet not available');
  return { success: false, error: 'Sheet unavailable' };
}


// ✅ IDEMPOTENCY:
const idempotencyKey = `${matchId}_${eventType}_${player}_${minute}`;
if (this.isAlreadyProcessed(idempotencyKey)) {
  return { success: true, skipped: true };
}


________________


📊 MAKE.COM INTEGRATION PATTERNS
Event Type Mapping
Every function that posts to Make.com must use the standardized event types:
// Single Events:
'goal' → 'goal_scored'
'goal_opposition' → 'goal_opposition'  
'card' → 'card_shown'
'card_opposition' → 'card_opposition'
'second_yellow' → 'card_second_yellow'


// Batch Events (1-5 items):
'fixtures_1_league' → 'fixtures_batch_1'
'fixtures_2_league' → 'fixtures_batch_2'
// ... up to fixtures_5_league


'results_1_league' → 'results_batch_1'
// ... up to results_5_league


// Monthly Events:
'fixtures_this_month' → 'fixtures_monthly'
'results_this_month' → 'results_monthly'
'player_stats' → 'player_stats_summary'


Required Payload Structure
const basePayload = {
  timestamp: DateUtils.now().toISOString(),
  match_id: this.currentMatchId,
  event_type: getConfig(`MAKE.EVENT_MAPPINGS.${eventType}`, eventType),
  source: 'apps_script_enhanced_automation',
  version: getConfig('SYSTEM.VERSION'),
  
  // Event-specific data here
  player_name: player,
  minute: minute,
  home_score: currentScores.home,
  away_score: currentScores.away,
  // ... etc
};


________________


🎨 CANVA PLACEHOLDER REQUIREMENTS
Essential Placeholders for Each Event Type
Goal Events:
* player_name, minute, home_score, away_score
* club_name, opponent_name, goal_type, assist_by
Card Events:
* player_name, card_type, minute, match_info
* is_second_yellow, incident_details
Batch Fixtures (1-5):
* fixture_count, fixtures_list, week_description
* club_name, season, next_match_highlight
Monthly Summaries:
* month_name, fixture_count/result_count, key_stats
* best_result, worst_result, goal_stats
________________


🔧 COMPONENT-SPECIFIC GUIDANCE
Enhanced Events Manager (enhanced-events.gs)
Responsibilities:
* Process live match events (goals, cards, subs, MOTM)
* Handle opposition events separately
* Manage 2nd yellow card logic
* Post second half kick-off notifications
Key Functions to Implement/Fix:
* processOppositionGoal() - Handle when opposition scores
* processOppositionCard() - Track opposition discipline
* processSecondYellow() - Enhanced 2nd yellow card handling
* postSecondHalfKickoff() - Half-time restart notification
Batch Posting Manager (batch-fixtures.gs)
Responsibilities:
* Gather 1-5 fixtures/results for batch posting
* Generate weekly roundups
* Create monthly fixture/result summaries
* Rate limiting and idempotency
Key Functions to Implement:
* postMonthlyFixturesSummary() - Monthly fixture preview
* postMonthlyResultsSummary() - Monthly result roundup
* postPostponed() - Postponed match notifications
Player Management System (player-management.gs)
Responsibilities:
* Track player statistics (goals, assists, cards, minutes)
* Manage substitutions and squad rotation
* Generate bi-monthly player stats summaries
* Handle player minutes calculation
Key Functions:
* postPlayerStatsSummary() - Bi-monthly stats roundup
* processSubstitution() - Swap players and track minutes
* updatePlayerMinutes() - Real-time minutes tracking
________________


🚨 CRITICAL MISSING FEATURES
Immediate Implementation Priority:
Opposition Event Handling (HIGH PRIORITY)

// When "Goal" selected from player list = opposition goal
// When "Opposition" selected + card = opposition card
// Must update opposition score only, not treat as our goal
1. Monthly Summary Functions (HIGH PRIORITY)

function postMonthlyFixturesSummary() {
  // Gather all Syston fixtures for current month
  // Post with type 'fixtures_this_month'
}


function postMonthlyResultsSummary() {
  // Gather all Syston results for current month  
  // Post with type 'results_this_month'
}
2. Enhanced 2nd Yellow Logic (MEDIUM PRIORITY)

// Detect "Red card (2nd yellow)" selection
// Trigger discipline post with cardType: 'second_yellow'
// Generate specific Canva template for 2nd yellow
3. Postponed Match Handling (MEDIUM PRIORITY)

function postPostponed(opponent, originalDate, reason, newDate = null) {
  // Detect postponed games
  // Post to Make.com with type 'match_postponed_*'
}
4. ________________


📏 TESTING REQUIREMENTS
Required Test Scenarios
Every new function must be tested with:
1. Happy Path: Normal operation with valid data
2. Edge Cases: Missing data, invalid inputs, network failures
3. Idempotency: Multiple calls produce same result
Example Test Structure
// Test 1: Normal fixture batch posting
// Expected: Success with fixtures_3_league event type


// Test 2: No fixtures available  
// Expected: Success with count=0, no webhook calls


// Test 3: Network failure to Make.com
// Expected: Graceful fallback, retry logic activated


________________


🔄 VERSION CONTROL NOTES
Current Version Issues:
* mains.gs: Shows v5.0.0, needs update to v6.0.0
* config.js: Shows v5.1.0, needs update to v6.0.0
* Various files: Mixed versions, standardize all to v6.0.0
Version Update Checklist:
* [ ] Update @version in all file headers to 6.0.0
* [ ] Update SYSTEM.VERSION in config.js to '6.0.0'
* [ ] Ensure all new features are documented
* [ ] Test version consistency across components
________________


🎯 FUTURE ROADMAP AWARENESS
Planned Features (Don't Implement Yet):
* Video Clips Pipeline: Goal highlight generation (Phase 3)
* XbotGo Full Integration: Live scoreboard updates (Phase 3)
* Multi-tenant System: Support multiple clubs (Phase 4)
* Mobile App: Companion app for live input (Phase 4)
Technical Debt to Address:
* Performance optimization for large datasets
* Enhanced error recovery mechanisms
* Advanced analytics and reporting
* API rate limiting improvements
________________


📞 SUPPORT CONTEXT
When Things Go Wrong:
1. Check the Logs sheet - All operations are logged
2. Verify Make.com webhook URL - Common failure point
3. Test with small data sets - Before processing large batches
4. Check Google Apps Script quotas - Daily execution limits
Common Issues:
* Sheet permissions: Ensure script has edit access
* Webhook timeouts: Make.com 30-second limit
* Date parsing: UK format vs US format confusion
* Player name matching: Case sensitivity and special characters
________________


🎯 SESSION OBJECTIVES TEMPLATE
When starting a new Claude session, define:
## Session Objective:
- [ ] Implement [specific function name]
- [ ] Update version numbers to 6.0.0
- [ ] Add comprehensive error handling
- [ ] Write Make.com router branch JSON
- [ ] List required Canva placeholders
- [ ] Test with edge cases


## Success Criteria:
- Function works with test data
- Logging is comprehensive  
- Error handling is graceful
- Idempotency is maintained
- Documentation is complete


________________


📝 Document Version: 1.0
🔄 Last Updated: September 16, 2025
👤 Maintainer: Senior Software Architect
🎯 Purpose: Guide all future Claude sessions working on this codebase
________________


⚠️ IMPORTANT: Always read this document first before making code changes. It contains critical context that prevents breaking existing functionality while implementing new features.Check TASKS.ms before starting work. Mark completed tasks immediately. Add newly discovered tasks
claude.md.txt

Displaying claude.md.txt.
