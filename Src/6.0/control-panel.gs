/**
 * @fileoverview Control Panel Manager - Bible Core Implementation
 * Implements feature toggles and manual data input capabilities
 * @version 6.0.0
 * @author Senior Software Architect
 */

/**
 * Control Panel Manager Class
 * Manages system feature toggles and manual data input
 */
class ControlPanelManager {
  constructor() {
    this.componentName = 'ControlPanelManager';
  }

  /**
   * Initialize Control Panel with default settings
   * Bible requirement: Turn on/off all features
   */
  initializeControlPanel() {
    logger.enterFunction(`${this.componentName}.initializeControlPanel`);

    try {
      // @testHook(control_panel_init_start)
      
      const controlPanelSheet = SheetUtils.getOrCreateSheet('Control Panel', [
        'Feature', 'Enabled', 'Description', 'Last Modified', 'Modified By'
      ]);
      
      if (!controlPanelSheet) {
        throw new Error('Failed to create Control Panel sheet');
      }

      // Define all Bible-compliant features
      const defaultFeatures = [
        {
          feature: 'WEEKLY_SCHEDULE',
          enabled: true,
          description: 'Monday-Sunday weekly content calendar automation'
        },
        {
          feature: 'OPPOSITION_DETECTION',
          enabled: true,
          description: 'Automatic opposition goal/card detection from "Goal" dropdown'
        },
        {
          feature: 'PLAYER_MINUTES',
          enabled: true,
          description: 'Real-time player minutes calculation and tracking'
        },
        {
          feature: 'VIDEO_INTEGRATION',
          enabled: true,
          description: 'Automatic video clip metadata creation for goals'
        },
        {
          feature: 'XBOTGO_INTEGRATION',
          enabled: false,
          description: 'XbotGo scoreboard automatic updates (optional hardware)'
        },
        {
          feature: 'LIVE_EVENTS',
          enabled: true,
          description: 'Live match event processing and social posting'
        },
        {
          feature: 'BATCH_POSTING',
          enabled: true,
          description: 'Weekly batch fixture/result posting (1-5 items)'
        },
        {
          feature: 'MONTHLY_SUMMARIES',
          enabled: true,
          description: 'Monthly fixture previews and result summaries'
        },
        {
          feature: 'GOTM_VOTING',
          enabled: false,
          description: 'Goal of the Month voting system'
        },
        {
          feature: 'YOUTUBE_UPLOADS',
          enabled: false,
          description: 'Automatic YouTube video uploads'
        },
        {
          feature: 'SOCIAL_VIDEO',
          enabled: false,
          description: 'TikTok and Instagram Reels distribution'
        },
        {
          feature: 'MANUAL_DATA_INPUT',
          enabled: true,
          description: 'Manual historical data input capabilities'
        }
      ];

      // Clear existing data (except headers)
      if (controlPanelSheet.getLastRow() > 1) {
        controlPanelSheet.getRange(2, 1, controlPanelSheet.getLastRow() - 1, 5).clear();
      }

      // Add default features
      defaultFeatures.forEach(item => {
        const newRow = [
          item.feature,
          item.enabled,
          item.description,
          new Date().toLocaleString('en-GB'),
          'System'
        ];
        controlPanelSheet.appendRow(newRow);
      });

      // Format the sheet
      this.formatControlPanelSheet(controlPanelSheet);

      // @testHook(control_panel_init_end)

      logger.exitFunction(`${this.componentName}.initializeControlPanel`, { 
        success: true,
        featuresCount: defaultFeatures.length
      });

      return { 
        success: true, 
        message: 'Control Panel initialized successfully',
        featuresCount: defaultFeatures.length
      };

    } catch (error) {
      logger.error('Control Panel initialization failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Get feature enabled status
   * Bible requirement: Check if features are enabled before execution
   */
  isFeatureEnabled(featureName) {
    logger.enterFunction(`${this.componentName}.isFeatureEnabled`, { feature: featureName });

    try {
      const controlPanelSheet = SheetUtils.getOrCreateSheet('Control Panel', [
        'Feature', 'Enabled', 'Description', 'Last Modified', 'Modified By'
      ]);
      
      if (!controlPanelSheet) {
        logger.warn('Control Panel sheet not available - defaulting to enabled');
        return true;
      }

      const data = controlPanelSheet.getDataRange().getValues();
      const featureRow = data.find(row => row[0] === featureName);
      
      if (!featureRow) {
        logger.warn('Feature not found in Control Panel - defaulting to enabled', { 
          feature: featureName 
        });
        return true;
      }
      
      const isEnabled = featureRow[1] === true || 
                       featureRow[1] === 'TRUE' || 
                       featureRow[1] === 'Yes' ||
                       featureRow[1] === 'ON';

      logger.exitFunction(`${this.componentName}.isFeatureEnabled`, { 
        feature: featureName,
        enabled: isEnabled
      });
      
      return isEnabled;
      
    } catch (error) {
      logger.error('Error checking feature enabled status', { 
        feature: featureName, 
        error: error.toString() 
      });
      return true; // Default to enabled on error
    }
  }

  /**
   * Toggle feature on/off
   */
  toggleFeature(featureName, enabled, modifiedBy = 'User') {
    logger.enterFunction(`${this.componentName}.toggleFeature`, { 
      feature: featureName,
      enabled: enabled,
      modifiedBy: modifiedBy
    });

    try {
      // @testHook(feature_toggle_start)
      
      const controlPanelSheet = SheetUtils.getOrCreateSheet('Control Panel', [
        'Feature', 'Enabled', 'Description', 'Last Modified', 'Modified By'
      ]);
      
      if (!controlPanelSheet) {
        throw new Error('Control Panel sheet not available');
      }

      const data = controlPanelSheet.getDataRange().getValues();
      let featureRowIndex = -1;
      
      // Find feature row
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === featureName) {
          featureRowIndex = i;
          break;
        }
      }
      
      if (featureRowIndex === -1) {
        throw new Error(`Feature '${featureName}' not found in Control Panel`);
      }
      
      // Update feature status
      controlPanelSheet.getRange(featureRowIndex + 1, 2).setValue(enabled);
      controlPanelSheet.getRange(featureRowIndex + 1, 4).setValue(new Date().toLocaleString('en-GB'));
      controlPanelSheet.getRange(featureRowIndex + 1, 5).setValue(modifiedBy);

      // @testHook(feature_toggle_end)

      logger.exitFunction(`${this.componentName}.toggleFeature`, { 
        success: true,
        feature: featureName,
        newStatus: enabled
      });

      return { 
        success: true, 
        message: `Feature '${featureName}' ${enabled ? 'enabled' : 'disabled'}`,
        feature: featureName,
        enabled: enabled
      };

    } catch (error) {
      logger.error('Feature toggle failed', { 
        error: error.toString(),
        feature: featureName,
        enabled: enabled
      });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Get all feature statuses
   */
  getAllFeatureStatuses() {
    logger.enterFunction(`${this.componentName}.getAllFeatureStatuses`);

    try {
      const controlPanelSheet = SheetUtils.getOrCreateSheet('Control Panel', [
        'Feature', 'Enabled', 'Description', 'Last Modified', 'Modified By'
      ]);
      
      if (!controlPanelSheet) {
        return { success: false, error: 'Control Panel sheet not available' };
      }

      const data = controlPanelSheet.getDataRange().getValues();
      const headers = data[0];
      
      const features = data.slice(1).map(row => ({
        feature: row[0],
        enabled: row[1],
        description: row[2],
        lastModified: row[3],
        modifiedBy: row[4]
      }));

      logger.exitFunction(`${this.componentName}.getAllFeatureStatuses`, { 
        success: true,
        featuresCount: features.length
      });

      return { 
        success: true, 
        features: features,
        count: features.length
      };

    } catch (error) {
      logger.error('Failed to get feature statuses', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Manual data input for historical player statistics
   * Bible requirement: Input player stats, results etc manually
   */
  inputHistoricalPlayerStats(playerData) {
    logger.enterFunction(`${this.componentName}.inputHistoricalPlayerStats`, { 
      playersCount: playerData ? playerData.length : 0
    });

    try {
      // @testHook(historical_input_start)
      
      if (!this.isFeatureEnabled('MANUAL_DATA_INPUT')) {
        return { success: false, error: 'Manual data input feature is disabled' };
      }

      const playerStatsSheet = SheetUtils.getOrCreateSheet('Player Stats', [
        'Player', 'Apps', 'Goals', 'Assists', 'Minutes', 'Cards', 'MOTM'
      ]);
      
      if (!playerStatsSheet) {
        throw new Error('Player Stats sheet not available');
      }

      let updatedPlayers = 0;
      let addedPlayers = 0;

      playerData.forEach(player => {
        try {
          const result = this.updateOrAddPlayerStats(playerStatsSheet, player);
          if (result.added) {
            addedPlayers++;
          } else {
            updatedPlayers++;
          }
        } catch (error) {
          logger.error('Failed to input player data', { 
            player: player.name,
            error: error.toString() 
          });
        }
      });

      // @testHook(historical_input_end)

      logger.exitFunction(`${this.componentName}.inputHistoricalPlayerStats`, { 
        success: true,
        updated: updatedPlayers,
        added: addedPlayers
      });

      return { 
        success: true, 
        message: `Historical data input complete`,
        updated: updatedPlayers,
        added: addedPlayers,
        total: playerData.length
      };

    } catch (error) {
      logger.error('Historical player stats input failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Manual data input for historical results
   */
  inputHistoricalResults(resultsData) {
    logger.enterFunction(`${this.componentName}.inputHistoricalResults`, { 
      resultsCount: resultsData ? resultsData.length : 0
    });

    try {
      // @testHook(historical_results_start)
      
      if (!this.isFeatureEnabled('MANUAL_DATA_INPUT')) {
        return { success: false, error: 'Manual data input feature is disabled' };
      }

      const resultsSheet = SheetUtils.getOrCreateSheet('Results', [
        'Date', 'Opponent', 'Home Score', 'Away Score', 'Venue', 'Competition'
      ]);
      
      if (!resultsSheet) {
        throw new Error('Results sheet not available');
      }

      let addedResults = 0;

      resultsData.forEach(result => {
        try {
          const newRow = [
            result.date,
            result.opponent,
            result.homeScore,
            result.awayScore,
            result.venue || 'Unknown',
            result.competition || 'League'
          ];
          
          resultsSheet.appendRow(newRow);
          addedResults++;
          
        } catch (error) {
          logger.error('Failed to input result data', { 
            result: result,
            error: error.toString() 
          });
        }
      });

      // @testHook(historical_results_end)

      logger.exitFunction(`${this.componentName}.inputHistoricalResults`, { 
        success: true,
        added: addedResults
      });

      return { 
        success: true, 
        message: `Historical results input complete`,
        added: addedResults,
        total: resultsData.length
      };

    } catch (error) {
      logger.error('Historical results input failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Bulk import from CSV data
   */
  bulkImportFromCSV(csvData, dataType) {
    logger.enterFunction(`${this.componentName}.bulkImportFromCSV`, { 
      dataType: dataType,
      rowsCount: csvData ? csvData.length : 0
    });

    try {
      // @testHook(bulk_import_start)
      
      if (!this.isFeatureEnabled('MANUAL_DATA_INPUT')) {
        return { success: false, error: 'Manual data input feature is disabled' };
      }

      let result;
      
      switch (dataType) {
        case 'player_stats':
          result = this.importPlayerStatsFromCSV(csvData);
          break;
        case 'results':
          result = this.importResultsFromCSV(csvData);
          break;
        case 'fixtures':
          result = this.importFixturesFromCSV(csvData);
          break;
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }

      // @testHook(bulk_import_end)

      logger.exitFunction(`${this.componentName}.bulkImportFromCSV`, { 
        success: true,
        dataType: dataType,
        imported: result.imported
      });

      return result;

    } catch (error) {
      logger.error('Bulk CSV import failed', { 
        error: error.toString(),
        dataType: dataType
      });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Validate data before import
   */
  validateDataForImport(data, dataType) {
    logger.enterFunction(`${this.componentName}.validateDataForImport`, { 
      dataType: dataType
    });

    try {
      const validationRules = this.getValidationRules(dataType);
      const errors = [];
      
      data.forEach((row, index) => {
        const rowErrors = this.validateRow(row, validationRules, index);
        errors.push(...rowErrors);
      });

      const isValid = errors.length === 0;

      logger.exitFunction(`${this.componentName}.validateDataForImport`, { 
        isValid: isValid,
        errorsCount: errors.length
      });

      return { 
        valid: isValid, 
        errors: errors,
        summary: {
          totalRows: data.length,
          errorCount: errors.length,
          validRows: data.length - errors.length
        }
      };

    } catch (error) {
      logger.error('Data validation failed', { 
        error: error.toString(),
        dataType: dataType
      });
      return { valid: false, errors: [error.toString()] };
    }
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Format Control Panel sheet for better usability
   */
  formatControlPanelSheet(sheet) {
    try {
      // Set column widths
      sheet.setColumnWidth(1, 200); // Feature
      sheet.setColumnWidth(2, 100); // Enabled
      sheet.setColumnWidth(3, 400); // Description
      sheet.setColumnWidth(4, 150); // Last Modified
      sheet.setColumnWidth(5, 120); // Modified By

      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, 5);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('white');

      // Add data validation for Enabled column
      const enabledRange = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1);
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['TRUE', 'FALSE'])
        .setAllowInvalid(false)
        .build();
      enabledRange.setDataValidation(rule);

      // Freeze header row
      sheet.setFrozenRows(1);

    } catch (error) {
      logger.error('Failed to format Control Panel sheet', { error: error.toString() });
    }
  }

  /**
   * Update or add player statistics
   */
  updateOrAddPlayerStats(sheet, playerData) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find existing player
    let playerRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === playerData.name) {
        playerRowIndex = i;
        break;
      }
    }
    
    if (playerRowIndex === -1) {
      // Add new player
      const newRow = [
        playerData.name,
        playerData.apps || 0,
        playerData.goals || 0,
        playerData.assists || 0,
        playerData.minutes || 0,
        playerData.cards || 0,
        playerData.motm || 0
      ];
      sheet.appendRow(newRow);
      return { added: true };
      
    } else {
      // Update existing player
      sheet.getRange(playerRowIndex + 1, 2).setValue(playerData.apps || data[playerRowIndex][1]);
      sheet.getRange(playerRowIndex + 1, 3).setValue(playerData.goals || data[playerRowIndex][2]);
      sheet.getRange(playerRowIndex + 1, 4).setValue(playerData.assists || data[playerRowIndex][3]);
      sheet.getRange(playerRowIndex + 1, 5).setValue(playerData.minutes || data[playerRowIndex][4]);
      sheet.getRange(playerRowIndex + 1, 6).setValue(playerData.cards || data[playerRowIndex][5]);
      sheet.getRange(playerRowIndex + 1, 7).setValue(playerData.motm || data[playerRowIndex][6]);
      return { added: false };
    }
  }

  /**
   * Import player stats from CSV data
   */
  importPlayerStatsFromCSV(csvData) {
    try {
      const playerStatsSheet = SheetUtils.getOrCreateSheet('Player Stats', [
        'Player', 'Apps', 'Goals', 'Assists', 'Minutes', 'Cards', 'MOTM'
      ]);
      
      if (!playerStatsSheet) {
        throw new Error('Player Stats sheet not available');
      }

      let imported = 0;
      
      csvData.forEach(row => {
        try {
          const playerData = {
            name: row[0],
            apps: parseInt(row[1]) || 0,
            goals: parseInt(row[2]) || 0,
            assists: parseInt(row[3]) || 0,
            minutes: parseInt(row[4]) || 0,
            cards: parseInt(row[5]) || 0,
            motm: parseInt(row[6]) || 0
          };
          
          this.updateOrAddPlayerStats(playerStatsSheet, playerData);
          imported++;
          
        } catch (error) {
          logger.error('Failed to import player row', { 
            row: row,
            error: error.toString() 
          });
        }
      });

      return { 
        success: true, 
        message: `Imported ${imported} player records`,
        imported: imported,
        total: csvData.length
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Import results from CSV data
   */
  importResultsFromCSV(csvData) {
    try {
      const resultsSheet = SheetUtils.getOrCreateSheet('Results', [
        'Date', 'Opponent', 'Home Score', 'Away Score', 'Venue', 'Competition'
      ]);
      
      if (!resultsSheet) {
        throw new Error('Results sheet not available');
      }

      let imported = 0;
      
      csvData.forEach(row => {
        try {
          const newRow = [
            row[0], // Date
            row[1], // Opponent
            parseInt(row[2]) || 0, // Home Score
            parseInt(row[3]) || 0, // Away Score
            row[4] || 'Unknown', // Venue
            row[5] || 'League' // Competition
          ];
          
          resultsSheet.appendRow(newRow);
          imported++;
          
        } catch (error) {
          logger.error('Failed to import result row', { 
            row: row,
            error: error.toString() 
          });
        }
      });

      return { 
        success: true, 
        message: `Imported ${imported} result records`,
        imported: imported,
        total: csvData.length
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Import fixtures from CSV data
   */
  importFixturesFromCSV(csvData) {
    try {
      const fixturesSheet = SheetUtils.getOrCreateSheet('Fixtures', [
        'Date', 'Time', 'Opponent', 'Venue', 'Competition', 'Importance'
      ]);
      
      if (!fixturesSheet) {
        throw new Error('Fixtures sheet not available');
      }

      let imported = 0;
      
      csvData.forEach(row => {
        try {
          const newRow = [
            row[0], // Date
            row[1], // Time
            row[2], // Opponent
            row[3] || 'TBD', // Venue
            row[4] || 'League', // Competition
            row[5] || 'normal' // Importance
          ];
          
          fixturesSheet.appendRow(newRow);
          imported++;
          
        } catch (error) {
          logger.error('Failed to import fixture row', { 
            row: row,
            error: error.toString() 
          });
        }
      });

      return { 
        success: true, 
        message: `Imported ${imported} fixture records`,
        imported: imported,
        total: csvData.length
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get validation rules for different data types
   */
  getValidationRules(dataType) {
    const rules = {
      player_stats: {
        requiredColumns: ['Player', 'Apps', 'Goals', 'Assists', 'Minutes', 'Cards', 'MOTM'],
        validations: {
          'Player': { type: 'string', required: true },
          'Apps': { type: 'number', min: 0 },
          'Goals': { type: 'number', min: 0 },
          'Assists': { type: 'number', min: 0 },
          'Minutes': { type: 'number', min: 0 },
          'Cards': { type: 'number', min: 0 },
          'MOTM': { type: 'number', min: 0 }
        }
      },
      results: {
        requiredColumns: ['Date', 'Opponent', 'Home Score', 'Away Score', 'Venue', 'Competition'],
        validations: {
          'Date': { type: 'date', required: true },
          'Opponent': { type: 'string', required: true },
          'Home Score': { type: 'number', min: 0 },
          'Away Score': { type: 'number', min: 0 },
          'Venue': { type: 'string' },
          'Competition': { type: 'string' }
        }
      },
      fixtures: {
        requiredColumns: ['Date', 'Time', 'Opponent', 'Venue', 'Competition', 'Importance'],
        validations: {
          'Date': { type: 'date', required: true },
          'Time': { type: 'string', required: true },
          'Opponent': { type: 'string', required: true },
          'Venue': { type: 'string' },
          'Competition': { type: 'string' },
          'Importance': { type: 'string' }
        }
      }
    };
    
    return rules[dataType] || {};
  }

  /**
   * Validate individual row
   */
  validateRow(row, rules, rowIndex) {
    const errors = [];
    
    if (!rules.requiredColumns) {
      return errors;
    }
    
    rules.requiredColumns.forEach((column, columnIndex) => {
      const value = row[columnIndex];
      const validation = rules.validations[column];
      
      if (!validation) return;
      
      // Check required fields
      if (validation.required && (!value || value.toString().trim() === '')) {
        errors.push(`Row ${rowIndex + 1}: ${column} is required`);
        return;
      }
      
      // Skip validation if value is empty and not required
      if (!value || value.toString().trim() === '') {
        return;
      }
      
      // Type validations
      switch (validation.type) {
        case 'number':
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            errors.push(`Row ${rowIndex + 1}: ${column} must be a number`);
          } else if (validation.min !== undefined && numValue < validation.min) {
            errors.push(`Row ${rowIndex + 1}: ${column} must be >= ${validation.min}`);
          } else if (validation.max !== undefined && numValue > validation.max) {
            errors.push(`Row ${rowIndex + 1}: ${column} must be <= ${validation.max}`);
          }
          break;
          
        case 'date':
          const dateValue = new Date(value);
          if (isNaN(dateValue.getTime())) {
            errors.push(`Row ${rowIndex + 1}: ${column} must be a valid date`);
          }
          break;
          
        case 'string':
          if (validation.minLength && value.length < validation.minLength) {
            errors.push(`Row ${rowIndex + 1}: ${column} must be at least ${validation.minLength} characters`);
          }
          if (validation.maxLength && value.length > validation.maxLength) {
            errors.push(`Row ${rowIndex + 1}: ${column} must be no more than ${validation.maxLength} characters`);
          }
          break;
      }
    });
    
    return errors;
  }

  /**
   * Create backup before bulk operations
   */
  createBackup(sheetName) {
    try {
      const sourceSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
      if (!sourceSheet) {
        return { success: false, error: 'Source sheet not found' };
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${sheetName}_Backup_${timestamp}`;
      
      const backupSheet = sourceSheet.copyTo(SpreadsheetApp.getActiveSpreadsheet());
      backupSheet.setName(backupName);
      
      return { 
        success: true, 
        backupName: backupName,
        message: `Backup created: ${backupName}`
      };
      
    } catch (error) {
      logger.error('Failed to create backup', { 
        sheetName: sheetName,
        error: error.toString() 
      });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Get system health status based on feature availability
   */
  getSystemHealthStatus() {
    logger.enterFunction(`${this.componentName}.getSystemHealthStatus`);

    try {
      const features = this.getAllFeatureStatuses();
      if (!features.success) {
        return { success: false, error: 'Could not get feature statuses' };
      }
      
      const criticalFeatures = [
        'WEEKLY_SCHEDULE',
        'OPPOSITION_DETECTION', 
        'PLAYER_MINUTES',
        'LIVE_EVENTS'
      ];
      
      let healthScore = 100;
      const issues = [];
      
      criticalFeatures.forEach(feature => {
        const featureData = features.features.find(f => f.feature === feature);
        if (!featureData || !featureData.enabled) {
          healthScore -= 25;
          issues.push(`Critical feature '${feature}' is disabled`);
        }
      });
      
      // Check sheet availability
      const requiredSheets = [
        'Live Match Updates',
        'Player Stats', 
        'Fixtures',
        'Control Panel'
      ];
      
      requiredSheets.forEach(sheetName => {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
          healthScore -= 10;
          issues.push(`Required sheet '${sheetName}' is missing`);
        }
      });
      
      const healthStatus = healthScore >= 90 ? 'Excellent' :
                          healthScore >= 70 ? 'Good' :
                          healthScore >= 50 ? 'Fair' : 'Poor';

      logger.exitFunction(`${this.componentName}.getSystemHealthStatus`, { 
        healthScore: healthScore,
        status: healthStatus
      });

      return { 
        success: true, 
        healthScore: healthScore,
        status: healthStatus,
        issues: issues,
        summary: {
          criticalFeaturesEnabled: criticalFeatures.length - issues.filter(i => i.includes('Critical feature')).length,
          totalCriticalFeatures: criticalFeatures.length,
          sheetsAvailable: requiredSheets.length - issues.filter(i => i.includes('Required sheet')).length,
          totalRequiredSheets: requiredSheets.length
        }
      };

    } catch (error) {
      logger.error('Failed to get system health status', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Reset all features to default settings
   */
  resetToDefaults() {
    logger.enterFunction(`${this.componentName}.resetToDefaults`);

    try {
      // @testHook(reset_defaults_start)
      
      const backup = this.createBackup('Control Panel');
      if (!backup.success) {
        logger.warn('Could not create backup before reset', { error: backup.error });
      }
      
      const result = this.initializeControlPanel();
      
      // @testHook(reset_defaults_end)

      logger.exitFunction(`${this.componentName}.resetToDefaults`, { 
        success: result.success
      });

      return { 
        success: result.success, 
        message: 'Control Panel reset to default settings',
        backup: backup
      };

    } catch (error) {
      logger.error('Failed to reset to defaults', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Export Control Panel settings
   */
  exportSettings() {
    logger.enterFunction(`${this.componentName}.exportSettings`);

    try {
      const features = this.getAllFeatureStatuses();
      if (!features.success) {
        throw new Error('Could not get feature statuses');
      }
      
      const exportData = {
        exportDate: new Date().toISOString(),
        version: getConfig('SYSTEM.VERSION'),
        features: features.features
      };

      logger.exitFunction(`${this.componentName}.exportSettings`, { 
        success: true,
        featuresCount: features.features.length
      });

      return { 
        success: true, 
        data: exportData,
        message: 'Settings exported successfully'
      };

    } catch (error) {
      logger.error('Failed to export settings', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }

  /**
   * Import Control Panel settings
   */
  importSettings(settingsData) {
    logger.enterFunction(`${this.componentName}.importSettings`);

    try {
      // @testHook(import_settings_start)
      
      if (!settingsData || !settingsData.features) {
        throw new Error('Invalid settings data format');
      }
      
      const backup = this.createBackup('Control Panel');
      if (!backup.success) {
        logger.warn('Could not create backup before import');
      }
      
      let imported = 0;
      
      settingsData.features.forEach(feature => {
        try {
          const result = this.toggleFeature(feature.feature, feature.enabled, 'Import');
          if (result.success) {
            imported++;
          }
        } catch (error) {
          logger.error('Failed to import feature setting', { 
            feature: feature.feature,
            error: error.toString() 
          });
        }
      });

      // @testHook(import_settings_end)

      logger.exitFunction(`${this.componentName}.importSettings`, { 
        success: true,
        imported: imported
      });

      return { 
        success: true, 
        message: `Imported ${imported} feature settings`,
        imported: imported,
        total: settingsData.features.length,
        backup: backup
      };

    } catch (error) {
      logger.error('Failed to import settings', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }
}

// ==================== PUBLIC API FUNCTIONS ====================

/**
 * Initialize Control Panel (public API)
 */
function initializeControlPanel() {
  const manager = new ControlPanelManager();
  return manager.initializeControlPanel();
}

/**
 * Check if feature is enabled (public API)
 */
function isFeatureEnabled(featureName) {
  const manager = new ControlPanelManager();
  return manager.isFeatureEnabled(featureName);
}

/**
 * Toggle feature on/off (public API)
 */
function toggleFeature(featureName, enabled, modifiedBy = 'User') {
  const manager = new ControlPanelManager();
  return manager.toggleFeature(featureName, enabled, modifiedBy);
}

/**
 * Get all feature statuses (public API)
 */
function getAllFeatureStatuses() {
  const manager = new ControlPanelManager();
  return manager.getAllFeatureStatuses();
}

/**
 * Input historical player statistics (public API)
 */
function inputHistoricalPlayerStats(playerData) {
  const manager = new ControlPanelManager();
  return manager.inputHistoricalPlayerStats(playerData);
}

/**
 * Input historical results (public API)
 */
function inputHistoricalResults(resultsData) {
  const manager = new ControlPanelManager();
  return manager.inputHistoricalResults(resultsData);
}

/**
 * Bulk import from CSV (public API)
 */
function bulkImportFromCSV(csvData, dataType) {
  const manager = new ControlPanelManager();
  return manager.bulkImportFromCSV(csvData, dataType);
}

/**
 * Validate data for import (public API)
 */
function validateDataForImport(data, dataType) {
  const manager = new ControlPanelManager();
  return manager.validateDataForImport(data, dataType);
}

/**
 * Get system health status (public API)
 */
function getSystemHealthStatus() {
  const manager = new ControlPanelManager();
  return manager.getSystemHealthStatus();
}

/**
 * Reset Control Panel to defaults (public API)
 */
function resetControlPanelToDefaults() {
  const manager = new ControlPanelManager();
  return manager.resetToDefaults();
}

/**
 * Export Control Panel settings (public API)
 */
function exportControlPanelSettings() {
  const manager = new ControlPanelManager();
  return manager.exportSettings();
}

/**
 * Import Control Panel settings (public API)
 */
function importControlPanelSettings(settingsData) {
  const manager = new ControlPanelManager();
  return manager.importSettings(settingsData);
}

// ==================== TEST FUNCTIONS ====================

/**
 * Test Control Panel initialization
 */
function testControlPanelInit() {
  return initializeControlPanel();
}

/**
 * Test feature toggling
 */
function testFeatureToggle() {
  const manager = new ControlPanelManager();
  
  // Test enabling a feature
  const enable = manager.toggleFeature('VIDEO_INTEGRATION', true, 'Test');
  
  // Test disabling a feature
  const disable = manager.toggleFeature('VIDEO_INTEGRATION', false, 'Test');
  
  return { enable, disable };
}

/**
 * Test historical data input
 */
function testHistoricalDataInput() {
  const manager = new ControlPanelManager();
  
  const testPlayerData = [
    {
      name: 'John Smith',
      apps: 25,
      goals: 12,
      assists: 8,
      minutes: 2000,
      cards: 3,
      motm: 2
    },
    {
      name: 'Mike Jones',
      apps: 20,
      goals: 5,
      assists: 15,
      minutes: 1800,
      cards: 1,
      motm: 1
    }
  ];
  
  return manager.inputHistoricalPlayerStats(testPlayerData);
}

/**
 * Test system health check
 */
function testSystemHealth() {
  const manager = new ControlPanelManager();
  return manager.getSystemHealthStatus();
}
