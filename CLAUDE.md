# **claude.md - Syston Tigers Football Automation System**

## **🎯 CLAUDE SESSION GUIDANCE DOCUMENT**

**Purpose**: This document provides essential context for any Claude session working on the Syston Tigers Football Automation System. Read this first before making any code changes.

---

## **📋 PROJECT OVERVIEW**

### **What This System Does**

The Syston Tigers Football Automation System is a **comprehensive live football automation platform** that follows a **weekly content schedule** and **match day automation**:

**📅 WEEKLY CONTENT SCHEDULE:**
- **Monday**: This week's fixtures / no match scheduled this week
- **Tuesday**: Quotes
- **Wednesday**: Player stats (Monthly) / Previous matches against this week's team
- **Thursday**: Throwback Thursday / 3 days to go
- **Friday**: 2 days to go
- **Saturday**: 1 day to go
- **Sunday**: MATCH DAY (Kick off, Live Match Updates, Results, League tables)

**🎯 MATCH DAY AUTOMATION:**
- Fixture moves into Live Match Updates tab only on day of fixture
- Status updates: kick off, HT, 2nd Half KO, FT with send checkbox
- Live scoring with goal/assist tracking
- Opposition goal detection ("Goal" player = opposition scored)
- Discipline tracking (cards, including opposition cards)
- Man of the Match selection
- Real-time player minutes calculation
- Automatic appearance, goal, assist, card, and minutes tracking

**📊 CONTENT TYPES:**
- **Live Events**: Goals, cards, subs, MOTM, kick-off, HT, FT
- **Batch Content**: Weekly fixtures (1-5), weekly results (1-5)
- **Monthly Content**: Fixture previews, result summaries, player stats
- **Special Events**: Birthdays, postponements, Goal of the Month competitions
- **Video Content**: Highlight clips with match clock, player banners, replays

### **Technology Stack**
- **Input Layer**: Google Sheets (Live match data entry)
- **Processing**: Google Apps Script (JavaScript-like, server-side)
- **Automation**: Make.com (Webhook-based workflow automation)
- **Graphics**: Canva (Automated template-based design)
- **Storage**: Google Drive + Sheets
- **Video**: YouTube API + FFmpeg/CloudConvert
- **Scoreboard**: XbotGo API integration
- **Website**: GitHub Pages with automated data feeds

### **Current Version Status**
- **Target Version**: `6.0.0` (standardize all files to this)
- **Architecture**: Modular component-based system
- **Status**: Production-ready core system with video pipeline in development

---

## **🏗️ SYSTEM ARCHITECTURE**

### **Core Design Principles**
1. **Bible Compliance**: System workings document is the master specification
2. **Weekly Schedule Driven**: Automated content follows strict weekly calendar
3. **Match Day Focus**: Live events are the primary automation target
4. **Modular Components**: Each `.gs` file is a self-contained component
5. **Centralized Configuration**: All config in `config.js`, no globals elsewhere
6. **Idempotency**: No duplicate posts if retriggered (use unique keys)
7. **Graceful Fallbacks**: Handle missing sheets/data without crashing
8. **Comprehensive Logging**: `logger.info()` at function entry/exit, `logger.error()` in catches
9. **Test Hooks**: Insert `@testHook(id)` comments before/after external calls

### **File Structure & Responsibilities**

📁 Apps Script Project Structure:
├── 📄 config.js              # Centralized configuration (SYSTEM_CONFIG object)
├── 📄 utils.js               # Utility functions (SheetUtils, DateUtils, etc.)
├── 📄 logger.js              # Smart logging system with sheet persistence
├── 📄 mains.gs               # Main coordinator and public API functions
├── 📄 enhanced-events.gs     # Live match event processing
├── 📄 batch-fixtures.gs      # Weekly batch posting (1-5 fixtures/results)
├── 📄 player-management.gs   # Player stats, minutes, sub tracking
├── 📄 video-clips.gs         # Video processing and YouTube automation
├── 📄 make-integration.gs    # Make.com webhook integration
├── 📄 xbotgo-integration.gs  # XbotGo scoreboard API
├── 📄 weekly-scheduler.gs    # Weekly content calendar automation
├── 📄 monthly-summaries.gs   # Monthly content generation
└── 📄 advanced-features.gs   # System health, scheduling, multi-tenant

### **Data Flow**

**📅 WEEKLY CONTENT FLOW:**
Scheduled Trigger → Weekly Calendar Check → Content Generation → Make.com → Canva → Social Media

**🎯 LIVE MATCH FLOW:**
Match Official Input (Sheets) → Enhanced Events Processing → Make.com Webhook → Canva Template → Social Media
                                     ↓                          ↓
                              Player Statistics Update    XbotGo Scoreboard Update
                                     ↓                          ↓
                              Video Clip Generation       Website Data Update

**📊 BATCH CONTENT FLOW:**
Data Aggregation → Batch Processing → Make.com Router → Canva Templates → Multi-platform Distribution

---

## **🎯 CRITICAL IMPLEMENTATION RULES**

### **Bible Compliance Rules**
1. **Weekly Schedule**: All content must follow Monday-Sunday calendar exactly
2. **Match Day Priority**: Live events take precedence over scheduled content
3. **Opposition Detection**: "Goal" from player list = opposition goal automatically
4. **Player Minutes**: Auto-calculate from kick-off, subs, and full-time
5. **Video Integration**: Every goal creates clip metadata for editing
6. **Free Tool Mandate**: Must stay under Make.com free allowance and use only free tools where possible

### **Code Quality Standards**
```javascript
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
```

### **Configuration Access**
```javascript
// ✅ CORRECT:
const clubName = getConfig('SYSTEM.CLUB_NAME');
const webhookUrl = getConfig('MAKE.WEBHOOK_URL_PROPERTY');

// ❌ WRONG:
const clubName = "Syston Tigers"; // Hard-coded values
```

### **Sheet Operations**
```javascript
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
```

---

## **📊 MAKE.COM INTEGRATION PATTERNS**

### **Event Type Mapping**

Every function that posts to Make.com must use the standardized event types:

**Single Events:**
- `'goal'` → `'goal_scored'`
- `'goal_opposition'` → `'goal_opposition'`    
- `'card'` → `'card_shown'`
- `'card_opposition'` → `'card_opposition'`
- `'second_yellow'` → `'card_second_yellow'`
- `'kick_off'` → `'match_kickoff'`
- `'half_time'` → `'match_halftime'`
- `'second_half'` → `'match_second_half'`
- `'full_time'` → `'match_fulltime'`

**Batch Events (1-5 items):**
- `'fixtures_1_league'` → `'fixtures_batch_1'`
- `'fixtures_2_league'` → `'fixtures_batch_2'`
- ... up to `fixtures_5_league`
- `'results_1_league'` → `'results_batch_1'`
- ... up to `results_5_league`

**Weekly Schedule Events:**
- `'monday_fixtures'` → `'weekly_fixtures'`
- `'tuesday_quotes'` → `'weekly_quotes'`
- `'wednesday_stats'` → `'weekly_player_stats'`
- `'thursday_throwback'` → `'weekly_throwback'`
- `'friday_countdown'` → `'countdown_2_days'`
- `'saturday_countdown'` → `'countdown_1_day'`

**Monthly Events:**
- `'fixtures_this_month'` → `'fixtures_monthly'`
- `'results_this_month'` → `'results_monthly'`
- `'player_stats_monthly'` → `'player_stats_summary'`

**Special Events:**
- `'birthday'` → `'player_birthday'`
- `'postponed'` → `'match_postponed'`
- `'gotm_voting_open'` → `'gotm_voting_start'`
- `'gotm_winner'` → `'gotm_winner_announcement'`

### **Required Payload Structure**
```javascript
const basePayload = {
  timestamp: DateUtils.now().toISOString(),
  match_id: this.currentMatchId,
  event_type: getConfig(`MAKE.EVENT_MAPPINGS.${eventType}`, eventType),
  source: 'apps_script_enhanced_automation',
  version: getConfig('SYSTEM.VERSION'),
  club_name: getConfig('SYSTEM.CLUB_NAME'),
  
  // Event-specific data here
  player_name: player,
  minute: minute,
  home_score: currentScores.home,
  away_score: currentScores.away,
  match_date: matchDate,
  opponent: opponent,
  // ... etc
};
```

---

## **🎨 CANVA PLACEHOLDER REQUIREMENTS**

### **Essential Placeholders for Each Event Type**

**Goal Events:**
- `player_name`, `minute`, `home_score`, `away_score`
- `club_name`, `opponent_name`, `goal_type`, `assist_by`
- `match_date`, `competition`, `venue`

**Card Events:**
- `player_name`, `card_type`, `minute`, `match_info`
- `is_second_yellow`, `incident_details`, `referee_name`

**Match Status Events:**
- `match_status`, `kick_off_time`, `venue`, `attendance`
- `weather_conditions`, `referee_name`, `competition`

**Weekly Content:**
- `week_start_date`, `fixture_count`, `next_match_date`
- `quote_text`, `quote_author`, `throwback_year`
- `countdown_days`, `match_importance`, `opponent_form`

**Batch Fixtures (1-5):**
- `fixture_count`, `fixtures_list`, `week_description`
- `club_name`, `season`, `next_match_highlight`
- `competition_types`, `home_away_split`

**Monthly Summaries:**
- `month_name`, `fixture_count`/`result_count`, `key_stats`
- `best_result`, `worst_result`, `goal_stats`
- `clean_sheets`, `top_scorer`, `most_assists`

**Player Statistics:**
- `reporting_period`, `top_scorer`, `most_assists`, `most_minutes`
- `clean_sheets_count`, `discipline_summary`, `motm_winners`
- `appearance_leaders`, `sub_usage`, `goal_conversion`

**Video Content:**
- `clip_title`, `goal_scorer`, `assist_provider`, `match_context`
- `video_duration`, `highlight_type`, `youtube_url`

---

## **🔧 COMPONENT-SPECIFIC GUIDANCE**

### **Enhanced Events Manager (`enhanced-events.gs`)**

**Responsibilities:**
- Process live match events exactly as they occur
- Handle opposition events (detect "Goal" = opposition automatically)
- Manage discipline tracking for both teams
- Calculate player minutes in real-time
- Update XbotGo scoreboard automatically
- Create video clip metadata for goals

**Key Functions:**
- `processGoalEvent()` - Handle both team and opposition goals
- `processCardEvent()` - Track discipline for players and opposition
- `processSubstitution()` - Swap players and update minutes
- `updatePlayerMinutes()` - Real-time minutes calculation
- `postMatchStatus()` - Kick-off, HT, 2nd half, FT updates

### **Weekly Scheduler (`weekly-scheduler.gs`)**

**Responsibilities:**
- Implement Monday-Sunday content calendar exactly
- Check for match days and adjust content accordingly
- Handle special events (birthdays, postponements)
- Coordinate with batch posting for fixtures/results

**Key Functions:**
- `runWeeklySchedule()` - Main scheduler function
- `postMondayFixtures()` - This week's fixtures or no match message
- `postTuesdayQuotes()` - Motivational quotes
- `postWednesdayStats()` - Monthly player stats or opposition analysis
- `postThursdayThrowback()` - Historical content + countdown
- `postFridayCountdown()` - 2 days to go
- `postSaturdayCountdown()` - 1 day to go

### **Monthly Summaries (`monthly-summaries.gs`)**

**Responsibilities:**
- Generate monthly fixture previews (1st of month)
- Create monthly result summaries (last day of month)
- Compile Goal of the Month competitions
- Track season-long statistics

**Key Functions:**
- `postMonthlyFixtures()` - 1st day of month fixture preview
- `postMonthlyResults()` - Last day of month result summary
- `postGOTMVoting()` - Goal of the Month voting
- `announceGOTMWinner()` - 5 days after voting opens

### **Player Management System (`player-management.gs`)**

**Responsibilities:**
- Auto-calculate appearances, goals, assists, cards, minutes from live events
- Track substitutions and squad rotation
- Generate monthly player statistics
- Handle manual stat input for historical data

**Key Functions:**
- `updatePlayerStats()` - Real-time stat updates from events
- `calculatePlayerMinutes()` - Track time on pitch
- `processSubstitution()` - Handle player swaps
- `postPlayerStatsSummary()` - Monthly stats compilation

### **Video Clips Manager (`video-clips.gs`)**

**Responsibilities:**
- Create clip metadata when goals are scored
- Mark interesting events for video editor (big chance, tackle, good play)
- Store clips in individual player folders in Google Drive
- Generate match clock overlays and player banners
- Integrate with FFmpeg/CloudConvert for processing

**Key Functions:**
- `createGoalClip()` - Auto-create clip metadata for goals
- `markVideoEvent()` - Tag events for video editing
- `organizePlayerClips()` - Sort clips into player folders
- `generateMatchGraphics()` - Create overlays and banners

---

## **🚨 CRITICAL IMPLEMENTATION PRIORITIES**

### **Bible Compliance Features (MUST IMPLEMENT)**

1. **Weekly Schedule Automation (HIGH PRIORITY)**
   ```javascript
   // Monday: This week's fixtures / no match scheduled
   // Tuesday: Quotes
   // Wednesday: Player stats (Monthly) / Previous matches vs opponent
   // Thursday: Throwback Thursday / 3 days to go
   // Friday: 2 days to go
   // Saturday: 1 day to go
   // Sunday: MATCH DAY
   ```

2. **Opposition Goal Detection (HIGH PRIORITY)**
   ```javascript
   // When "Goal" selected from player list = opposition goal
   // Must update opposition score only, not treat as our goal
   // Auto-detect and handle without manual intervention
   ```

3. **Player Minutes Calculation (HIGH PRIORITY)**
   ```javascript
   // Auto-calculate from kick-off, substitutions, full-time
   // Track appearances (starter vs sub)
   // Real-time updates during match
   ```

4. **Video Clip Integration (MEDIUM PRIORITY)**
   ```javascript
   // Every goal creates clip metadata
   // Notes dropdown for video editor markers
   // Player folders in Google Drive
   // Match clock and player banners
   ```

5. **Control Panel Features (MEDIUM PRIORITY)**
   ```javascript
   // Turn on/off all features
   // Manual stat input for historical data
   // XbotGo scoreboard integration toggle
   ```

### **Free Tool Compliance**
- Must stay under Make.com free allowance (1,000 operations/month)
- Use only free tools where possible
- Optimize webhook calls and batch operations
- Implement smart scheduling to spread load

---

## **📏 TESTING REQUIREMENTS**

### **Bible Compliance Tests**
1. **Weekly Schedule Test**: Verify correct content posts on correct days
2. **Opposition Goal Test**: "Goal" from dropdown correctly triggers opposition scoring
3. **Player Minutes Test**: Minutes calculate correctly from kick-off to substitution
4. **Video Integration Test**: Goal events create clip metadata correctly
5. **Control Panel Test**: Features can be toggled on/off successfully

### **Required Test Scenarios**
Every new function must be tested with:
1. **Happy Path**: Normal operation with valid data
2. **Edge Cases**: Missing data, invalid inputs, network failures
3. **Idempotency**: Multiple calls produce same result
4. **Bible Compliance**: Matches system workings specification exactly

---

## **🔄 VERSION CONTROL NOTES**

### **Current Version Status**
- **Target Version**: `6.0.0` across all components
- **Bible Alignment**: All components must comply with system workings specification
- **Documentation Sync**: claude.md, planning.md, tasks.md must reflect system workings

### **Version Update Checklist**
- [ ] Update `@version` in all file headers to `6.0.0`
- [ ] Update `SYSTEM.VERSION` in config.js to `'6.0.0'`
- [ ] Verify Bible compliance in all components
- [ ] Test weekly schedule automation
- [ ] Validate opposition goal detection
- [ ] Confirm player minutes calculation

---

## **🎯 SESSION OBJECTIVES TEMPLATE**

When starting a new Claude session, define:

## Session Objective:
- [ ] Implement Bible-compliant [specific function name]
- [ ] Ensure weekly schedule alignment
- [ ] Add opposition goal detection
- [ ] Implement player minutes tracking
- [ ] Create video clip integration
- [ ] Add comprehensive error handling
- [ ] Write Make.com router branch JSON
- [ ] List required Canva placeholders
- [ ] Test with edge cases

## Success Criteria:
- Function follows system workings specification exactly
- Weekly content calendar works correctly
- Opposition events are handled automatically
- Player statistics update in real-time
- Video integration is seamless
- Logging is comprehensive
- Error handling is graceful
- Idempotency is maintained
- Documentation is complete

---

**📝 Document Version**: 2.0 (Bible Aligned)
**🔄 Last Updated**: September 20, 2025
**👤 Maintainer**: Senior Software Architect
**🎯 Purpose**: Guide all future Claude sessions to implement system workings specification exactly

---

**⚠️ CRITICAL**: This document now reflects the system workings "Bible" - all implementation must follow this specification exactly. The weekly content calendar and opposition goal detection are core features that define the system's identity.

All tasks, milestones, and requirements listed below remain valid and must be included in full, unless they are explicitly superseded or refined by the text above or the System Workings “Bible.” Where the Bible introduces new functionality (such as weekly content scheduling, Goal of the Season, sponsor page, livestreaming, or expanded control-panel features), these requirements are additive and should be incorporated alongside existing tasks rather than replacing them. In case of conflict between the text below and text above, the text above plus Bible take precedence.

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
Current Version Status:
* All source files: Updated to v6.2.0 (standardized)
* config.js: Updated to v6.2.0 with enterprise features
* Repository structure: Normalized to standard src/ layout
Version Update Checklist:
* [x] Update @version in all file headers to 6.2.0
* [x] Update SYSTEM.VERSION in config.js to '6.2.0'
* [x] Ensure all new features are documented
* [x] Test version consistency across components
* [x] Normalize repository structure to standard src/ layout
* [x] Create v6.2 release tag
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
