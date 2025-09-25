/**
 * @fileoverview Web App Entry Point for Club Console
 * @version 6.2.0
 * @description Routes web requests to existing backend functions without modifying them
 */

/**
 * Handles GET requests (serves the web interface)
 */
function doGet(e) {
  try {
    const path = e.pathInfo || '';
    const params = e.parameter || {};

    logger.info('Web request received', { path, params });

    // Route different paths
    switch (path) {
      case '':
      case 'index':
        // DIRECT MATCH INTERFACE - No complex templates
        return HtmlService.createHtmlOutput(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>⚽ Live Match Updates - ${getConfig('SYSTEM.CLUB_NAME') || 'Football Club'}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                max-width: 800px; margin: 0 auto; padding: 20px;
                background: #f5f5f5; color: #333;
              }
              .header { text-align: center; margin-bottom: 30px; }
              .score {
                text-align: center; font-size: 48px; font-weight: bold;
                margin: 30px 0; padding: 20px; background: white;
                border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .btn {
                padding: 15px 20px; margin: 8px; font-size: 16px; font-weight: bold;
                border: none; border-radius: 8px; cursor: pointer;
                transition: all 0.2s; min-width: 140px;
              }
              .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
              .btn-success { background: #28a745; color: white; }
              .btn-warning { background: #ffc107; color: #333; }
              .btn-danger { background: #dc3545; color: white; }
              .btn-primary { background: #007bff; color: white; }

              .controls {
                display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px; margin: 20px 0;
              }
              .section {
                background: white; padding: 20px; margin: 20px 0;
                border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .section h2 { margin-bottom: 15px; color: #333; }
              .status {
                text-align: center; font-size: 18px; margin: 15px 0;
                padding: 10px; background: #e9ecef; border-radius: 8px;
              }
              .events {
                max-height: 200px; overflow-y: auto;
                font-family: monospace; line-height: 1.6;
              }
              .time-display { text-align: center; font-size: 24px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>⚽ Live Match Updates</h1>
              <div class="time-display" id="current-time"></div>
            </div>

            <div class="status" id="match-status">🔴 Ready to start match</div>
            <div class="score" id="score">0 - 0</div>

            <div class="section">
              <h2>🎮 Match Controls</h2>
              <div class="controls">
                <button class="btn btn-success" onclick="startMatch()">⏱️ Kick Off</button>
                <button class="btn btn-warning" onclick="halfTime()">⏸️ Half Time</button>
                <button class="btn btn-primary" onclick="secondHalf()">▶️ 2nd Half</button>
                <button class="btn btn-warning" onclick="fullTime()">⏹️ Full Time</button>
              </div>
            </div>

            <div class="section">
              <h2>⚽ Scoring</h2>
              <div class="controls">
                <button class="btn btn-success" onclick="homeGoal()">⚽ HOME GOAL</button>
                <button class="btn btn-success" onclick="awayGoal()">⚽ AWAY GOAL</button>
              </div>
            </div>

            <div class="section">
              <h2>📋 Discipline & Subs</h2>
              <div class="controls">
                <button class="btn btn-warning" onclick="yellowCard()">🟨 Yellow Card</button>
                <button class="btn btn-danger" onclick="redCard()">🟥 Red Card</button>
                <button class="btn btn-primary" onclick="substitution()">🔄 Substitution</button>
              </div>
            </div>

            <div class="section">
              <h2>📝 Recent Events</h2>
              <div id="events" class="events">No events yet - click buttons above to start!</div>
            </div>

            <script>
              let homeScore = 0;
              let awayScore = 0;
              let events = [];
              let matchMinute = 0;

              // Update time display
              setInterval(() => {
                document.getElementById('current-time').textContent = new Date().toLocaleTimeString();
              }, 1000);

              function updateScore() {
                document.getElementById('score').textContent = homeScore + ' - ' + awayScore;
              }

              function addEvent(event, isImportant = false) {
                const timestamp = new Date().toLocaleTimeString();
                const eventText = timestamp + ' - ' + (isImportant ? '🔥 ' : '') + event;
                events.unshift(eventText);
                document.getElementById('events').innerHTML = events.slice(0, 15).join('<br>') || 'No events yet';
              }

              function updateStatus(status, color = '#e9ecef') {
                const statusEl = document.getElementById('match-status');
                statusEl.textContent = status;
                statusEl.style.background = color;
              }

              // Match state functions
              function startMatch() {
                matchMinute = 0;
                updateStatus('🟢 1st Half - Match in progress', '#d4edda');
                addEvent('⏱️ KICK OFF - Match started!', true);
                callAPI('processState', { stateType: 'kickoff', period: '1H' });
              }

              function halfTime() {
                updateStatus('🟡 Half Time', '#fff3cd');
                addEvent('⏸️ HALF TIME', true);
                callAPI('processState', { stateType: 'halftime' });
              }

              function secondHalf() {
                updateStatus('🟢 2nd Half - Match in progress', '#d4edda');
                addEvent('▶️ SECOND HALF STARTED', true);
                callAPI('processState', { stateType: 'kickoff', period: '2H' });
              }

              function fullTime() {
                updateStatus('🔴 Full Time - Match ended', '#f8d7da');
                addEvent('⏹️ FULL TIME - Final score: ' + homeScore + '-' + awayScore, true);
                callAPI('processState', { stateType: 'fulltime' });
              }

              // Scoring functions
              function homeGoal() {
                homeScore++;
                updateScore();
                addEvent('⚽ HOME GOAL! ' + homeScore + '-' + awayScore, true);
                callAPI('processGoal', {
                  minute: matchMinute || new Date().getMinutes(),
                  player: 'Player',
                  team: 'home',
                  assist: ''
                });
              }

              function awayGoal() {
                awayScore++;
                updateScore();
                addEvent('⚽ AWAY GOAL! ' + homeScore + '-' + awayScore, true);
                callAPI('processGoal', {
                  minute: matchMinute || new Date().getMinutes(),
                  player: 'Opposition',
                  team: 'away'
                });
              }

              // Discipline functions
              function yellowCard() {
                addEvent('🟨 Yellow card shown');
                callAPI('processCard', {
                  minute: matchMinute || new Date().getMinutes(),
                  player: 'Player',
                  cardType: 'Y'
                });
              }

              function redCard() {
                addEvent('🟥 Red card shown', true);
                callAPI('processCard', {
                  minute: matchMinute || new Date().getMinutes(),
                  player: 'Player',
                  cardType: 'R'
                });
              }

              function substitution() {
                addEvent('🔄 Substitution made');
                callAPI('processSub', {
                  minute: matchMinute || new Date().getMinutes(),
                  playerOut: 'Player Out',
                  playerIn: 'Player In'
                });
              }

              // API communication
              function callAPI(action, data) {
                addEvent('📡 Sending to system: ' + action);

                fetch(window.location.origin + window.location.pathname, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: action, data: data })
                })
                .then(response => response.json())
                .then(result => {
                  if (result.success) {
                    addEvent('✅ System updated successfully');
                    console.log('API Success:', result);
                  } else {
                    addEvent('❌ System error: ' + result.error);
                    console.error('API Error:', result);
                  }
                })
                .catch(error => {
                  addEvent('⚠️ Connection error - check network');
                  console.error('Network error:', error);
                });
              }

              // Initialize
              document.addEventListener('DOMContentLoaded', function() {
                addEvent('🚀 Live Match Updates ready!');
                updateScore();
              });
            </script>
          </body>
          </html>
        `)
          .setTitle('Live Match Updates - ' + (getConfig('SYSTEM.CLUB_NAME') || 'Football Club'))
          .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

      case 'match':
        // Direct match interface
        return HtmlService.createHtmlOutput(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Live Match Updates</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
              .btn { padding: 15px 25px; margin: 10px; font-size: 18px; border: none; border-radius: 8px; cursor: pointer; }
              .btn-success { background: #28a745; color: white; }
              .btn-warning { background: #ffc107; color: black; }
              .btn-danger { background: #dc3545; color: white; }
              .score { text-align: center; font-size: 32px; font-weight: bold; margin: 20px 0; }
              .controls { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
              .events { margin: 20px 0; }
              h1, h2 { text-align: center; }
              .status { text-align: center; font-size: 18px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <h1>⚽ Live Match Updates</h1>
            <div class="status" id="match-status">Ready to start match</div>

            <div class="score" id="score">0 - 0</div>

            <h2>Match Controls</h2>
            <div class="controls">
              <button class="btn btn-success" onclick="startMatch()">⏱️ Kick Off</button>
              <button class="btn btn-warning" onclick="halfTime()">⏸️ Half Time</button>
              <button class="btn btn-warning" onclick="fullTime()">⏹️ Full Time</button>
              <button class="btn btn-success" onclick="homeGoal()">⚽ Home Goal</button>
              <button class="btn btn-success" onclick="awayGoal()">⚽ Away Goal</button>
              <button class="btn btn-warning" onclick="yellowCard()">🟨 Yellow Card</button>
              <button class="btn btn-danger" onclick="redCard()">🟥 Red Card</button>
              <button class="btn btn-warning" onclick="substitution()">🔄 Substitution</button>
            </div>

            <h2>Recent Events</h2>
            <div id="events" class="events">No events yet</div>

            <script>
              let homeScore = 0;
              let awayScore = 0;
              let events = [];

              function updateScore() {
                document.getElementById('score').textContent = homeScore + ' - ' + awayScore;
              }

              function addEvent(event) {
                events.unshift(event + ' - ' + new Date().toLocaleTimeString());
                document.getElementById('events').innerHTML = events.slice(0, 10).join('<br>');
              }

              function startMatch() {
                document.getElementById('match-status').textContent = 'Match in progress';
                addEvent('⏱️ Match started');
                callAPI('processState', { stateType: 'kickoff' });
              }

              function halfTime() {
                document.getElementById('match-status').textContent = 'Half time';
                addEvent('⏸️ Half time');
                callAPI('processState', { stateType: 'halftime' });
              }

              function fullTime() {
                document.getElementById('match-status').textContent = 'Full time';
                addEvent('⏹️ Full time');
                callAPI('processState', { stateType: 'fulltime' });
              }

              function homeGoal() {
                homeScore++;
                updateScore();
                addEvent('⚽ HOME GOAL!');
                callAPI('processGoal', { minute: new Date().getMinutes(), player: 'Player', team: 'home' });
              }

              function awayGoal() {
                awayScore++;
                updateScore();
                addEvent('⚽ AWAY GOAL!');
                callAPI('processGoal', { minute: new Date().getMinutes(), player: 'Opposition', team: 'away' });
              }

              function yellowCard() {
                addEvent('🟨 Yellow card');
                callAPI('processCard', { minute: new Date().getMinutes(), player: 'Player', cardType: 'Y' });
              }

              function redCard() {
                addEvent('🟥 Red card');
                callAPI('processCard', { minute: new Date().getMinutes(), player: 'Player', cardType: 'R' });
              }

              function substitution() {
                addEvent('🔄 Substitution');
                callAPI('processSub', { minute: new Date().getMinutes(), playerOut: 'Player Out', playerIn: 'Player In' });
              }

              function callAPI(action, data) {
                fetch(window.location.origin + window.location.pathname, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: action, data: data })
                })
                .then(response => response.json())
                .then(result => {
                  if (result.success) {
                    console.log('Success:', result);
                  } else {
                    console.error('Error:', result);
                    alert('Error: ' + result.error);
                  }
                })
                .catch(error => {
                  console.error('Network error:', error);
                  alert('Network error - check connection');
                });
              }
            </script>
          </body>
          </html>
        `)
          .setTitle('Live Match Updates')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

      case 'manifest.json':
        // PWA manifest
        const manifest = HtmlService.createTemplate(`{
  "name": "<?= getConfig('SYSTEM.CLUB_NAME') || 'Club Console' ?>",
  "short_name": "Club Console",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "<?= getConfig('BRANDING.PRIMARY_COLOR') || '#FF0000' ?>",
  "icons": [
    {
      "src": "<?= getConfig('BRANDING.BADGE_URL') || '/icon-192.png' ?>",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}`);
        return manifest.evaluate().setMimeType(ContentService.MimeType.JSON);

      default:
        throw new Error(`Unknown path: ${path}`);
    }

  } catch (error) {
    logger.error('doGet error', { error: error.toString() });

    return HtmlService.createHtmlOutput(`
      <html>
        <head><title>Error</title></head>
        <body>
          <h1>Error</h1>
          <p>${error.message}</p>
          <a href="/">Back to Home</a>
        </body>
      </html>
    `);
  }
}

/**
 * Handles POST requests (API calls from web interface)
 */
function doPost(e) {
  try {
    let requestData;

    // Parse request data
    if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else {
      requestData = e.parameter || {};
    }

    const action = requestData.action;
    const data = requestData.data || {};

    logger.info('API request received', { action, data });

    // Route to appropriate handler
    let result;
    switch (action) {
      case 'getConfig':
        result = getConfig();
        break;

      case 'saveConfig':
        result = saveConfigFromWeb(data);
        break;

      case 'getPlayers':
        result = getPlayersForWeb();
        break;

      case 'savePlayers':
        result = savePlayersFromWeb(data.players);
        break;

      case 'processGoal':
        result = processGoalFromWeb(data);
        break;

      case 'processCard':
        result = processCardFromWeb(data);
        break;

      case 'processSub':
        result = processSubFromWeb(data);
        break;

      case 'processState':
        result = processStateFromWeb(data);
        break;

      case 'getRecentEvents':
        result = getRecentEventsForWeb(data.limit || 10);
        break;

      case 'undoLastEvent':
        result = undoLastEventFromWeb();
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logger.error('doPost error', { error: error.toString() });

    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Include helper for HTML templates
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ==================== WEB API WRAPPER FUNCTIONS ====================
// These functions wrap your existing functions for web interface use

/**
 * Saves configuration from web interface
 */
function saveConfigFromWeb(configData) {
  try {
    // Update the existing SYSTEM_CONFIG with new values
    Object.keys(configData).forEach(key => {
      // Map web config keys to your existing SYSTEM_CONFIG structure
      switch(key) {
        case 'CLUB_NAME':
          SYSTEM_CONFIG.SYSTEM.CLUB_NAME = configData[key];
          break;
        case 'PRIMARY_HEX':
          SYSTEM_CONFIG.BRANDING.PRIMARY_COLOR = configData[key];
          break;
        case 'SECONDARY_HEX':
          SYSTEM_CONFIG.BRANDING.SECONDARY_COLOR = configData[key];
          break;
        case 'BADGE_URL':
          SYSTEM_CONFIG.BRANDING.BADGE_URL = configData[key];
          break;
        case 'LEAGUE':
          SYSTEM_CONFIG.SYSTEM.LEAGUE = configData[key];
          break;
        case 'AGE_GROUP':
          SYSTEM_CONFIG.SYSTEM.AGE_GROUP = configData[key];
          break;
        case 'WEBHOOK_URL':
          if (!SYSTEM_CONFIG.INTEGRATIONS) SYSTEM_CONFIG.INTEGRATIONS = {};
          if (!SYSTEM_CONFIG.INTEGRATIONS.MAKE) SYSTEM_CONFIG.INTEGRATIONS.MAKE = {};
          SYSTEM_CONFIG.INTEGRATIONS.MAKE.WEBHOOK_URL = configData[key];
          break;
        default:
          // For other keys, try to find appropriate section
          if (SYSTEM_CONFIG.MATCH && SYSTEM_CONFIG.MATCH.hasOwnProperty(key)) {
            SYSTEM_CONFIG.MATCH[key] = configData[key];
          } else if (SYSTEM_CONFIG.SYSTEM && SYSTEM_CONFIG.SYSTEM.hasOwnProperty(key)) {
            SYSTEM_CONFIG.SYSTEM[key] = configData[key];
          }
      }
    });

    // Update last modified timestamp
    SYSTEM_CONFIG.BRANDING.LAST_ASSET_UPDATE = new Date().toISOString();

    logger.info('Configuration saved from web', { configData });
    return { success: true };

  } catch (error) {
    logger.error('Error saving config from web', { error: error.toString() });
    throw error;
  }
}

/**
 * Gets players formatted for web interface
 */
function getPlayersForWeb() {
  try {
    // Use your existing player management if available
    if (typeof getActivePlayers === 'function') {
      return getActivePlayers();
    }

    // Fallback to basic implementation
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Players');
    if (!sheet) {
      return [];
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const players = [];

    for (let i = 1; i < data.length; i++) {
      const player = {};
      headers.forEach((header, index) => {
        player[header] = data[i][index];
      });
      if (player.IsActive !== false) {
        players.push(player);
      }
    }

    return players.sort((a, b) => (a.Number || 0) - (b.Number || 0));

  } catch (error) {
    logger.error('Error getting players for web', { error: error.toString() });
    return [];
  }
}

/**
 * Saves players from web interface
 */
function savePlayersFromWeb(players) {
  try {
    // Use your existing player management if available
    if (typeof savePlayersData === 'function') {
      return savePlayersData(players);
    }

    // Fallback to basic implementation
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Players') ||
                  SpreadsheetApp.getActiveSpreadsheet().insertSheet('Players');

    // Clear and write headers if needed
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 6).setValues([['Number', 'Name', 'Position', 'IsActive', 'Notes', 'ShortName']]);
    }

    // Clear existing data
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
    }

    // Write player data
    if (players.length > 0) {
      const values = players.map(player => [
        player.Number || '',
        player.Name || '',
        player.Position || '',
        player.IsActive !== false,
        player.Notes || '',
        player.ShortName || ''
      ]);

      sheet.getRange(2, 1, values.length, 6).setValues(values);
    }

    logger.info('Players saved from web', { count: players.length });
    return { success: true };

  } catch (error) {
    logger.error('Error saving players from web', { error: error.toString() });
    throw error;
  }
}

/**
 * Process goal from web interface using existing function
 */
function processGoalFromWeb(data) {
  try {
    const eventsManager = new EnhancedEventsManager();
    const result = eventsManager.processGoalEvent(
      data.minute || '0',
      data.player || '',
      data.assist || '',
      data.matchId || 'web_match_' + new Date().toDateString()
    );

    logger.info('Goal processed from web', { data, result });
    return result;

  } catch (error) {
    logger.error('Error processing goal from web', { error: error.toString() });
    throw error;
  }
}

/**
 * Process card from web interface using existing function
 */
function processCardFromWeb(data) {
  try {
    const eventsManager = new EnhancedEventsManager();
    const result = eventsManager.processCardEvent(
      data.minute || '0',
      data.player || '',
      data.cardType || 'Y',
      data.matchId || 'web_match_' + new Date().toDateString()
    );

    logger.info('Card processed from web', { data, result });
    return result;

  } catch (error) {
    logger.error('Error processing card from web', { error: error.toString() });
    throw error;
  }
}

/**
 * Process substitution from web interface using existing function
 */
function processSubFromWeb(data) {
  try {
    const eventsManager = new EnhancedEventsManager();
    const result = eventsManager.processSubstitutionEvent(
      data.minute || '0',
      data.playerOut || '',
      data.playerIn || '',
      data.matchId || 'web_match_' + new Date().toDateString()
    );

    logger.info('Substitution processed from web', { data, result });
    return result;

  } catch (error) {
    logger.error('Error processing substitution from web', { error: error.toString() });
    throw error;
  }
}

/**
 * Process state change from web interface
 */
function processStateFromWeb(data) {
  try {
    const eventsManager = new EnhancedEventsManager();

    // Process different state types
    let result;
    switch (data.stateType) {
      case 'kickoff':
        result = eventsManager.processKickoffEvent(data.period || '1H');
        break;
      case 'halftime':
        result = eventsManager.processHalftimeEvent();
        break;
      case 'fulltime':
        result = eventsManager.processFulltimeEvent();
        break;
      default:
        throw new Error(`Unknown state type: ${data.stateType}`);
    }

    logger.info('State processed from web', { data, result });
    return result;

  } catch (error) {
    logger.error('Error processing state from web', { error: error.toString() });
    throw error;
  }
}

/**
 * Get recent events for web interface
 */
function getRecentEventsForWeb(limit = 10) {
  try {
    // Use existing function if available
    if (typeof getRecentEvents === 'function') {
      return getRecentEvents(limit);
    }

    // Fallback implementation
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Events');
    if (!sheet || sheet.getLastRow() <= 1) {
      return [];
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const events = [];

    // Get recent events (up to limit)
    const startRow = Math.max(1, data.length - limit);
    for (let i = data.length - 1; i >= startRow; i--) {
      const event = {};
      headers.forEach((header, index) => {
        event[header] = data[i][index];
      });
      events.push(event);
    }

    return events;

  } catch (error) {
    logger.error('Error getting recent events for web', { error: error.toString() });
    return [];
  }
}

/**
 * Undo last event from web interface
 */
function undoLastEventFromWeb() {
  try {
    // Use existing undo functionality if available
    if (typeof undoLastEvent === 'function') {
      return undoLastEvent();
    }

    // Basic fallback - just log the undo request
    logger.info('Undo requested from web');
    return { success: true, message: 'Undo functionality not implemented' };

  } catch (error) {
    logger.error('Error undoing last event from web', { error: error.toString() });
    throw error;
  }
}