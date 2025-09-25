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
        // Main web interface
        return HtmlService.createTemplateFromFile('index')
          .evaluate()
          .setTitle('Club Console - ' + (getConfig('SYSTEM.CLUB_NAME') || 'Football Club'))
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