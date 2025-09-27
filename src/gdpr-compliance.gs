/**
 * @fileoverview GDPR Compliance System with Real Sheets
 * @version 6.3.0
 * @description Working GDPR compliance that uses actual spreadsheet data
 */

/**
 * GDPR Compliance Manager - Uses real sheets for privacy management
 */
class GDPRCompliance {

  /**
   * Initialize GDPR compliance system with real sheets
   */
  static initializeGDPRSystem() {
    try {
      console.log('🔐 Initializing GDPR compliance system...');

      const results = {
        sheetsCreated: [],
        sheetsExisting: [],
        errors: []
      };

      // Create or verify essential privacy sheets
      const requiredSheets = [
        { name: 'Player_Consents', headers: ['Player Name', 'Consent Given', 'Date Updated', 'Consent Type', 'Notes', 'Expiry Date'] },
        { name: 'Privacy_Requests', headers: ['Request Date', 'Player Name', 'Request Type', 'Status', 'Completed Date', 'Details'] },
        { name: 'Data_Processing_Log', headers: ['Date', 'Player Name', 'Processing Type', 'Legal Basis', 'Purpose', 'Data Types'] },
        { name: 'Consent_Audit_Trail', headers: ['Date', 'Player Name', 'Action', 'Previous Value', 'New Value', 'Updated By', 'IP Address'] }
      ];

      requiredSheets.forEach(sheetSpec => {
        const result = this.createOrVerifySheet(sheetSpec.name, sheetSpec.headers);
        if (result.created) {
          results.sheetsCreated.push(sheetSpec.name);
        } else if (result.exists) {
          results.sheetsExisting.push(sheetSpec.name);
        }
        if (result.error) {
          results.errors.push(result.error);
        }
      });

      console.log('✅ GDPR system initialized');
      return {
        success: true,
        results: results,
        initialized: new Date().toISOString()
      };

    } catch (error) {
      console.error('GDPR initialization failed:', error);
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Create or verify a sheet exists with proper headers
   */
  static createOrVerifySheet(sheetName, headers) {
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = spreadsheet.getSheetByName(sheetName);

      if (!sheet) {
        // Create the sheet
        sheet = spreadsheet.insertSheet(sheetName);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

        // Format header row
        const headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#e8f0fe');
        headerRange.setBorder(true, true, true, true, true, true);

        // Set column widths
        for (let i = 1; i <= headers.length; i++) {
          sheet.setColumnWidth(i, 150);
        }

        return { created: true, sheet: sheet };
      } else {
        return { exists: true, sheet: sheet };
      }

    } catch (error) {
      return { error: `Failed to create/verify ${sheetName}: ${error.toString()}` };
    }
  }

  /**
   * Check player consent with full GDPR compliance
   */
  static checkPlayerConsentGDPR(playerName) {
    try {
      const consentSheet = this.getSheet('Player_Consents');
      if (!consentSheet) {
        return { allowed: false, reason: 'Consent tracking system unavailable' };
      }

      const data = consentSheet.getDataRange().getValues();
      if (data.length <= 1) {
        return { allowed: false, reason: 'No consent records found' };
      }

      // Find player consent record
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const name = row[0]?.toString().trim();
        const consentGiven = row[1]?.toString().toLowerCase();
        const dateUpdated = row[2];
        const consentType = row[3]?.toString();
        const expiryDate = row[5];

        if (name === playerName.trim()) {
          // Check if consent is valid
          const isConsentGiven = consentGiven === 'yes' || consentGiven === 'true';

          // Check if consent has expired
          const isExpired = expiryDate && new Date(expiryDate) < new Date();

          if (!isConsentGiven) {
            return {
              allowed: false,
              reason: 'Consent not given',
              consentType: consentType,
              lastUpdated: dateUpdated
            };
          }

          if (isExpired) {
            return {
              allowed: false,
              reason: 'Consent expired',
              expiryDate: expiryDate,
              requiresRenewal: true
            };
          }

          // Log consent check
          this.logConsentCheck(playerName, 'consent_verified');

          return {
            allowed: true,
            reason: 'Valid consent found',
            consentType: consentType,
            lastUpdated: dateUpdated,
            expiryDate: expiryDate
          };
        }
      }

      // Player not found - GDPR requires explicit consent
      return {
        allowed: false,
        reason: 'Player not found in consent records',
        requiresConsent: true
      };

    } catch (error) {
      console.error('GDPR consent check failed:', error);
      return {
        allowed: false,
        reason: 'Consent check system error',
        error: error.toString()
      };
    }
  }

  /**
   * Handle GDPR data requests (access, portability, deletion)
   */
  static handleGDPRRequest(playerName, requestType, requestDetails = '') {
    try {
      const requestId = `REQ_${Date.now()}`;
      const requestDate = new Date().toISOString();

      // Log the request
      const requestSheet = this.getSheet('Privacy_Requests');
      if (requestSheet) {
        requestSheet.appendRow([
          requestDate,
          playerName,
          requestType,
          'In Progress',
          '', // Completed date
          `${requestDetails} (ID: ${requestId})`
        ]);
      }

      let response = {};

      switch (requestType.toLowerCase()) {
        case 'access':
        case 'export':
          response = this.exportPlayerData(playerName);
          break;

        case 'deletion':
        case 'erasure':
          response = this.deletePlayerData(playerName);
          break;

        case 'portability':
          response = this.exportPlayerDataPortable(playerName);
          break;

        case 'rectification':
          response = this.rectifyPlayerData(playerName, requestDetails);
          break;

        default:
          response = {
            success: false,
            error: `Unknown request type: ${requestType}`
          };
      }

      // Update request status
      if (requestSheet) {
        const data = requestSheet.getDataRange().getValues();
        for (let i = data.length - 1; i >= 1; i--) {
          if (data[i][5] && data[i][5].includes(requestId)) {
            requestSheet.getRange(i + 1, 4).setValue(response.success ? 'Completed' : 'Failed');
            requestSheet.getRange(i + 1, 5).setValue(new Date().toISOString());
            break;
          }
        }
      }

      return {
        requestId: requestId,
        response: response,
        processed: new Date().toISOString()
      };

    } catch (error) {
      console.error('GDPR request handling failed:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  /**
   * Export all data for a player (GDPR Article 15)
   */
  static exportPlayerData(playerName) {
    try {
      const playerData = {
        playerName: playerName,
        exportDate: new Date().toISOString(),
        dataCategories: {}
      };

      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const sheets = spreadsheet.getSheets();

      // Search all sheets for player data
      sheets.forEach(sheet => {
        const sheetName = sheet.getName();
        const data = sheet.getDataRange().getValues();

        if (data.length <= 1) return; // Skip empty sheets

        const headers = data[0];
        const playerRows = [];

        // Find rows containing player data
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const rowText = row.join(' ').toLowerCase();

          if (rowText.includes(playerName.toLowerCase())) {
            const rowObject = {};
            headers.forEach((header, index) => {
              rowObject[header] = row[index];
            });
            playerRows.push(rowObject);
          }
        }

        if (playerRows.length > 0) {
          playerData.dataCategories[sheetName] = playerRows;
        }
      });

      // Log the data export
      this.logDataProcessing(playerName, 'data_export', 'GDPR Article 15', 'Data access request');

      return {
        success: true,
        data: playerData,
        recordsFound: Object.keys(playerData.dataCategories).length
      };

    } catch (error) {
      console.error('Player data export failed:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  /**
   * Delete all player data (GDPR Article 17 - Right to Erasure)
   */
  static deletePlayerData(playerName) {
    try {
      const deletionResults = {
        playerName: playerName,
        deletionDate: new Date().toISOString(),
        sheetsProcessed: [],
        recordsDeleted: 0,
        errors: []
      };

      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const sheets = spreadsheet.getSheets();

      // Process each sheet
      sheets.forEach(sheet => {
        const sheetName = sheet.getName();

        try {
          const data = sheet.getDataRange().getValues();
          if (data.length <= 1) return; // Skip empty sheets

          let deletedCount = 0;

          // Delete from bottom to top to avoid index issues
          for (let i = data.length - 1; i >= 1; i--) {
            const row = data[i];
            const rowText = row.join(' ').toLowerCase();

            if (rowText.includes(playerName.toLowerCase())) {
              sheet.deleteRow(i + 1);
              deletedCount++;
            }
          }

          if (deletedCount > 0) {
            deletionResults.sheetsProcessed.push({
              sheet: sheetName,
              recordsDeleted: deletedCount
            });
            deletionResults.recordsDeleted += deletedCount;
          }

        } catch (error) {
          deletionResults.errors.push(`${sheetName}: ${error.toString()}`);
        }
      });

      // Log the deletion
      this.logDataProcessing(playerName, 'data_deletion', 'GDPR Article 17', 'Right to erasure request');

      return {
        success: deletionResults.errors.length === 0,
        results: deletionResults
      };

    } catch (error) {
      console.error('Player data deletion failed:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  /**
   * Log data processing activities
   */
  static logDataProcessing(playerName, processingType, legalBasis, purpose) {
    try {
      const logSheet = this.getSheet('Data_Processing_Log');
      if (logSheet) {
        logSheet.appendRow([
          new Date().toISOString(),
          playerName,
          processingType,
          legalBasis,
          purpose,
          'Personal data, performance data, consent records'
        ]);
      }
    } catch (error) {
      console.error('Failed to log data processing:', error);
    }
  }

  /**
   * Log consent checks for audit trail
   */
  static logConsentCheck(playerName, action) {
    try {
      const auditSheet = this.getSheet('Consent_Audit_Trail');
      if (auditSheet) {
        auditSheet.appendRow([
          new Date().toISOString(),
          playerName,
          action,
          '', // Previous value
          '', // New value
          Session.getActiveUser().getEmail() || 'system',
          'system_check' // IP address placeholder
        ]);
      }
    } catch (error) {
      console.error('Failed to log consent check:', error);
    }
  }

  /**
   * Get a specific sheet by name
   */
  static getSheet(sheetName) {
    try {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      return spreadsheet.getSheetByName(sheetName);
    } catch (error) {
      console.error(`Failed to get sheet ${sheetName}:`, error);
      return null;
    }
  }

  /**
   * Get GDPR compliance dashboard
   */
  static getGDPRDashboard() {
    try {
      const dashboard = {
        overview: {
          timestamp: new Date().toISOString(),
          systemStatus: 'operational'
        },
        consents: this.getConsentSummary(),
        requests: this.getRequestSummary(),
        compliance: this.getComplianceStatus()
      };

      return dashboard;

    } catch (error) {
      return {
        overview: {
          timestamp: new Date().toISOString(),
          systemStatus: 'error',
          error: error.toString()
        }
      };
    }
  }

  /**
   * Get consent summary
   */
  static getConsentSummary() {
    try {
      const consentSheet = this.getSheet('Player_Consents');
      if (!consentSheet) {
        return { error: 'Consent sheet not available' };
      }

      const data = consentSheet.getDataRange().getValues();
      if (data.length <= 1) {
        return { totalRecords: 0, consentGiven: 0, consentWithdrawn: 0 };
      }

      let consentGiven = 0;
      let consentWithdrawn = 0;
      let expiring = 0;

      for (let i = 1; i < data.length; i++) {
        const consentValue = data[i][1]?.toString().toLowerCase();
        const expiryDate = data[i][5];

        if (consentValue === 'yes' || consentValue === 'true') {
          consentGiven++;

          // Check if expiring within 30 days
          if (expiryDate) {
            const expiry = new Date(expiryDate);
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            if (expiry <= thirtyDaysFromNow) {
              expiring++;
            }
          }
        } else {
          consentWithdrawn++;
        }
      }

      return {
        totalRecords: data.length - 1,
        consentGiven: consentGiven,
        consentWithdrawn: consentWithdrawn,
        expiring: expiring
      };

    } catch (error) {
      return { error: error.toString() };
    }
  }

  /**
   * Get request summary
   */
  static getRequestSummary() {
    try {
      const requestSheet = this.getSheet('Privacy_Requests');
      if (!requestSheet) {
        return { error: 'Request sheet not available' };
      }

      const data = requestSheet.getDataRange().getValues();
      if (data.length <= 1) {
        return { totalRequests: 0, pending: 0, completed: 0 };
      }

      let pending = 0;
      let completed = 0;

      for (let i = 1; i < data.length; i++) {
        const status = data[i][3]?.toString().toLowerCase();
        if (status === 'completed') {
          completed++;
        } else {
          pending++;
        }
      }

      return {
        totalRequests: data.length - 1,
        pending: pending,
        completed: completed
      };

    } catch (error) {
      return { error: error.toString() };
    }
  }

  /**
   * Get compliance status
   */
  static getComplianceStatus() {
    try {
      const status = {
        sheetsConfigured: 0,
        requiredSheets: 4,
        consentSystemActive: false,
        requestHandlingActive: false,
        auditTrailActive: false
      };

      const requiredSheets = ['Player_Consents', 'Privacy_Requests', 'Data_Processing_Log', 'Consent_Audit_Trail'];

      requiredSheets.forEach(sheetName => {
        if (this.getSheet(sheetName)) {
          status.sheetsConfigured++;
        }
      });

      status.consentSystemActive = status.sheetsConfigured >= 1;
      status.requestHandlingActive = status.sheetsConfigured >= 2;
      status.auditTrailActive = status.sheetsConfigured >= 4;

      return status;

    } catch (error) {
      return { error: error.toString() };
    }
  }
}

/**
 * Public functions for integration
 */

function initializeGDPRCompliance() {
  return GDPRCompliance.initializeGDPRSystem();
}

function checkPlayerGDPRConsent(playerName) {
  return GDPRCompliance.checkPlayerConsentGDPR(playerName);
}

function handlePlayerGDPRRequest(playerName, requestType, details = '') {
  return GDPRCompliance.handleGDPRRequest(playerName, requestType, details);
}

function getGDPRComplianceDashboard() {
  return GDPRCompliance.getGDPRDashboard();
}

function exportPlayerGDPRData(playerName) {
  return GDPRCompliance.exportPlayerData(playerName);
}

function deletePlayerGDPRData(playerName) {
  return GDPRCompliance.deletePlayerData(playerName);
}