/**
 * @fileoverview Simple Privacy Compliance for Football Automation System
 * @version 6.2.0
 * @description Basic GDPR compliance that actually works
 */

/**
 * Simple Privacy Manager
 */
class SimplePrivacy {

  /**
   * Check if a player can be featured in posts
   */
  static checkPlayerConsent(playerName) {
    try {
      const consentsSheet = this.getConsentsSheet();
      if (!consentsSheet) {
        // If no consents sheet, default to allowing (opt-out approach)
        return { allowed: true, reason: 'No consent tracking configured' };
      }

      const data = consentsSheet.getDataRange().getValues();
      if (data.length <= 1) {
        // No consent data, default to allow
        return { allowed: true, reason: 'No consent data found' };
      }

      // Find player in consent sheet
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const name = row[0]?.toString().trim();
        const consent = row[1]?.toString().toLowerCase();

        if (name === playerName.trim()) {
          const allowed = consent === 'yes' || consent === 'true' || consent === '1';
          return {
            allowed: allowed,
            reason: allowed ? 'Explicit consent given' : 'Consent withdrawn/denied'
          };
        }
      }

      // Player not found in consent sheet - default to allow
      return { allowed: true, reason: 'Player not in consent tracking' };

    } catch (error) {
      console.error('Consent check failed:', error);
      // Fail safe - allow if check fails
      return { allowed: true, reason: 'Consent check error, defaulting to allow' };
    }
  }

  /**
   * Get or create consents sheet
   */
  static getConsentsSheet() {
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = spreadsheet.getSheetByName('Player Consents');

      if (!sheet) {
        // Create consent sheet with headers
        sheet = spreadsheet.insertSheet('Player Consents');
        sheet.getRange(1, 1, 1, 4).setValues([
          ['Player Name', 'Consent', 'Date Updated', 'Notes']
        ]);

        // Format header
        const headerRange = sheet.getRange(1, 1, 1, 4);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#f0f0f0');

        console.log('Created Player Consents sheet');
      }

      return sheet;

    } catch (error) {
      console.error('Failed to get consents sheet:', error);
      return null;
    }
  }

  /**
   * Update player consent
   */
  static updatePlayerConsent(playerName, consent, notes = '') {
    try {
      const sheet = this.getConsentsSheet();
      if (!sheet) {
        throw new Error('Cannot access consents sheet');
      }

      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;

      // Find existing player
      for (let i = 1; i < data.length; i++) {
        if (data[i][0]?.toString().trim() === playerName.trim()) {
          rowIndex = i + 1; // Convert to 1-based index
          break;
        }
      }

      const timestamp = new Date().toISOString();
      const rowData = [playerName.trim(), consent ? 'yes' : 'no', timestamp, notes];

      if (rowIndex > 0) {
        // Update existing row
        sheet.getRange(rowIndex, 1, 1, 4).setValues([rowData]);
        console.log(`Updated consent for ${playerName}: ${consent}`);
      } else {
        // Add new row
        sheet.appendRow(rowData);
        console.log(`Added consent for ${playerName}: ${consent}`);
      }

      return { success: true, updated: rowIndex > 0, playerName: playerName };

    } catch (error) {
      console.error('Failed to update consent:', error);
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Check if post content needs privacy filtering
   */
  static evaluatePostContent(content) {
    try {
      const result = {
        allowed: true,
        filtered: false,
        originalContent: content,
        filteredContent: content,
        warnings: []
      };

      // Extract player names from content
      const playerNames = this.extractPlayerNames(content);

      // Check consent for each player
      for (const playerName of playerNames) {
        const consent = this.checkPlayerConsent(playerName);

        if (!consent.allowed) {
          // Remove or anonymize the player name
          result.filteredContent = result.filteredContent.replace(
            new RegExp(playerName, 'gi'),
            this.anonymizePlayerName(playerName)
          );
          result.filtered = true;
          result.warnings.push(`Player ${playerName} anonymized: ${consent.reason}`);
        }
      }

      return result;

    } catch (error) {
      console.error('Post evaluation failed:', error);
      return {
        allowed: true,
        filtered: false,
        originalContent: content,
        filteredContent: content,
        error: error.toString()
      };
    }
  }

  /**
   * Extract player names from content (basic implementation)
   */
  static extractPlayerNames(content) {
    // Simple approach - look for capitalized words that might be names
    const words = content.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) || [];
    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Anonymize player name
   */
  static anonymizePlayerName(playerName) {
    const parts = playerName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}. ${parts[parts.length - 1]}`;
    }
    return `${playerName[0]}.`;
  }

  /**
   * Log privacy action for audit
   */
  static logPrivacyAction(action, playerName, details = {}) {
    try {
      const sheet = this.getAuditSheet();
      if (!sheet) return;

      const timestamp = new Date().toISOString();
      const user = Session.getActiveUser().getEmail() || 'system';

      sheet.appendRow([
        timestamp,
        action,
        playerName || '',
        user,
        JSON.stringify(details)
      ]);

      console.log(`Privacy audit logged: ${action} for ${playerName}`);

    } catch (error) {
      console.error('Failed to log privacy action:', error);
    }
  }

  /**
   * Get or create audit sheet
   */
  static getAuditSheet() {
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = spreadsheet.getSheetByName('Privacy Audit');

      if (!sheet) {
        sheet = spreadsheet.insertSheet('Privacy Audit');
        sheet.getRange(1, 1, 1, 5).setValues([
          ['Timestamp', 'Action', 'Player', 'User', 'Details']
        ]);

        const headerRange = sheet.getRange(1, 1, 1, 5);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#f0f0f0');
      }

      return sheet;

    } catch (error) {
      console.error('Failed to get audit sheet:', error);
      return null;
    }
  }

  /**
   * Simple GDPR data export for a player
   */
  static exportPlayerData(playerName) {
    try {
      const data = {
        playerName: playerName,
        exportDate: new Date().toISOString(),
        data: {}
      };

      // Get consent information
      const consent = this.checkPlayerConsent(playerName);
      data.data.consent = consent;

      // Get data from Players sheet
      const playersSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Players');
      if (playersSheet) {
        const playersData = playersSheet.getDataRange().getValues();
        const headers = playersData[0];

        for (let i = 1; i < playersData.length; i++) {
          const row = playersData[i];
          if (row[0]?.toString().trim() === playerName.trim()) {
            data.data.playerRecord = {};
            headers.forEach((header, index) => {
              data.data.playerRecord[header] = row[index];
            });
            break;
          }
        }
      }

      this.logPrivacyAction('data_export', playerName, { exportedBy: Session.getActiveUser().getEmail() });

      return {
        success: true,
        data: data,
        message: 'Player data exported successfully'
      };

    } catch (error) {
      console.error('Data export failed:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  /**
   * Delete player data (right to erasure)
   */
  static deletePlayerData(playerName, reason = 'User request') {
    try {
      let deletedFrom = [];

      // Remove from consents sheet
      const consentsSheet = this.getConsentsSheet();
      if (consentsSheet) {
        const data = consentsSheet.getDataRange().getValues();
        for (let i = data.length - 1; i >= 1; i--) {
          if (data[i][0]?.toString().trim() === playerName.trim()) {
            consentsSheet.deleteRow(i + 1);
            deletedFrom.push('consents');
            break;
          }
        }
      }

      // Note: In practice, you might want to anonymize rather than delete
      // from historical records to maintain data integrity

      this.logPrivacyAction('data_deletion', playerName, {
        reason: reason,
        deletedFrom: deletedFrom,
        deletedBy: Session.getActiveUser().getEmail()
      });

      return {
        success: true,
        deletedFrom: deletedFrom,
        message: `Player data deleted from: ${deletedFrom.join(', ')}`
      };

    } catch (error) {
      console.error('Data deletion failed:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
}

/**
 * Public functions for webapp use
 */

/**
 * Check if player can be featured in posts
 */
function checkPlayerPrivacy(playerName) {
  return SimplePrivacy.checkPlayerConsent(playerName);
}

/**
 * Update player consent
 */
function updatePlayerConsent(playerName, consent, notes = '') {
  return SimplePrivacy.updatePlayerConsent(playerName, consent, notes);
}

/**
 * Filter post content for privacy
 */
function filterPostContent(content) {
  return SimplePrivacy.evaluatePostContent(content);
}

/**
 * Export player data for GDPR request
 */
function exportPlayerData(playerName) {
  return SimplePrivacy.exportPlayerData(playerName);
}

/**
 * Delete player data for GDPR request
 */
function deletePlayerData(playerName, reason = 'User request') {
  return SimplePrivacy.deletePlayerData(playerName, reason);
}

/**
 * Setup privacy sheets if they don't exist
 */
function setupPrivacySheets() {
  try {
    const consentsSheet = SimplePrivacy.getConsentsSheet();
    const auditSheet = SimplePrivacy.getAuditSheet();

    return {
      success: true,
      message: 'Privacy sheets setup completed',
      sheets: {
        consents: consentsSheet ? consentsSheet.getName() : null,
        audit: auditSheet ? auditSheet.getName() : null
      }
    };

  } catch (error) {
    console.error('Privacy setup failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}