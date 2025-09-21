/**
 * @fileoverview Syston Tigers Automation - Advanced Fan Engagement & Match Analysis
 * @version 6.0.0 - THE ULTIMATE EDITION
 * @author Senior Software Architect
 * 
 * Ultimate fan engagement and match analysis features:
 * - AI-powered personalized fan content and engagement tracking
 * - Comprehensive automated match analysis with tactical insights
 * - Advanced social media optimization with viral content prediction
 * - Real-time fan sentiment analysis and engagement optimization
 * - Automated press releases and match reports
 * - Premium sponsor integration and content automation
 */


// ===== ADVANCED FAN ENGAGEMENT SYSTEM =====


/**
 * Advanced Fan Engagement Engine with AI Personalization
 */
class AdvancedFanEngagementSystem extends BaseAutomationComponent {
  
  constructor() {
    super('AdvancedFanEngagementSystem');
    this.fanProfiles = new Map();
    this.engagementMetrics = new Map();
    this.personalizationEngine = new PersonalizationEngine();
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.loyaltyTracker = new FanLoyaltyTracker();
  }


  doInitialize() {
    logger.enterFunction('AdvancedFanEngagementSystem.doInitialize');
    
    try {
      // Initialize personalization engine
      this.personalizationEngine.initialize();
      
      // Initialize sentiment analysis
      this.sentimentAnalyzer.initialize();
      
      // Initialize loyalty tracking
      this.loyaltyTracker.initialize();
      
      // Load fan profiles
      this.loadFanProfiles();
      
      // Setup engagement tracking
      this.setupEngagementTracking();


      logger.exitFunction('AdvancedFanEngagementSystem.doInitialize', { 
        success: true,
        fanProfiles: this.fanProfiles.size
      });
      return true;
    } catch (error) {
      logger.error('AdvancedFanEngagementSystem initialization failed', { error: error.toString() });
      return false;
    }
  }


  loadFanProfiles() {
    try {
      // Load fan engagement data from tracking sheet
      const fanEngagementSheet = SheetUtils.getOrCreateSheet(
        'Fan_Engagement_Tracking',
        ['Fan_ID', 'Platform', 'Engagement_Type', 'Content_ID', 'Timestamp', 'Sentiment_Score', 'Device_Type', 'Location']
      );


      if (fanEngagementSheet) {
        const data = fanEngagementSheet.getDataRange().getValues();
        
        for (let i = 1; i < data.length; i++) {
          const [fanId, platform, engagementType, contentId, timestamp, sentimentScore, deviceType, location] = data[i];
          
          if (!this.fanProfiles.has(fanId)) {
            this.fanProfiles.set(fanId, {
              id: fanId,
              engagementHistory: [],
              preferences: {},
              loyaltyScore: 0,
              lastSeen: null,
              platforms: new Set(),
              favoriteContentTypes: [],
              averageSentiment: 0,
              totalEngagements: 0,
              deviceTypes: new Set(),
              locations: new Set()
            });
          }


          const profile = this.fanProfiles.get(fanId);
          profile.engagementHistory.push({
            platform: platform,
            type: engagementType,
            contentId: contentId,
            timestamp: new Date(timestamp),
            sentiment: parseFloat(sentimentScore) || 0,
            deviceType: deviceType,
            location: location
          });


          profile.platforms.add(platform);
          profile.deviceTypes.add(deviceType);
          if (location) profile.locations.add(location);
          profile.totalEngagements++;
          profile.lastSeen = new Date(timestamp);
        }


        // Calculate derived metrics for each fan
        for (const [fanId, profile] of this.fanProfiles) {
          this.calculateFanMetrics(profile);
        }
      }


      logger.info('Fan profiles loaded and calculated', {
        totalFans: this.fanProfiles.size,
        avgEngagementsPerFan: Array.from(this.fanProfiles.values())
          .reduce((sum, p) => sum + p.totalEngagements, 0) / this.fanProfiles.size
      });


    } catch (error) {
      logger.error('Failed to load fan profiles', { error: error.toString() });
    }
  }


  calculateFanMetrics(profile) {
    // Calculate average sentiment
    if (profile.engagementHistory.length > 0) {
      const sentimentScores = profile.engagementHistory
        .filter(e => e.sentiment !== 0)
        .map(e => e.sentiment);
      
      if (sentimentScores.length > 0) {
        profile.averageSentiment = sentimentScores.reduce((sum, s) => sum + s, 0) / sentimentScores.length;
      }
    }


    // Calculate loyalty score based on engagement patterns
    profile.loyaltyScore = this.loyaltyTracker.calculateLoyaltyScore(profile);


    // Identify favorite content types
    const contentTypeFrequency = {};
    profile.engagementHistory.forEach(engagement => {
      const contentType = this.identifyContentType(engagement.contentId);
      contentTypeFrequency[contentType] = (contentTypeFrequency[contentType] || 0) + 1;
    });


    profile.favoriteContentTypes = Object.entries(contentTypeFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);


    // Calculate engagement preferences
    profile.preferences = this.calculateEngagementPreferences(profile);
  }


  calculateEngagementPreferences(profile) {
    const preferences = {
      preferredTimes: [],
      preferredPlatforms: [],
      contentTypeAffinity: {},
      devicePreference: null,
      engagementStyle: 'casual' // casual, active, passionate
    };


    // Analyze engagement timing patterns
    const timeFrequency = {};
    profile.engagementHistory.forEach(engagement => {
      const hour = engagement.timestamp.getHours();
      timeFrequency[hour] = (timeFrequency[hour] || 0) + 1;
    });


    preferences.preferredTimes = Object.entries(timeFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));


    // Platform preferences
    const platformFrequency = {};
    profile.engagementHistory.forEach(engagement => {
      platformFrequency[engagement.platform] = (platformFrequency[engagement.platform] || 0) + 1;
    });


    preferences.preferredPlatforms = Object.entries(platformFrequency)
      .sort(([,a], [,b]) => b - a)
      .map(([platform]) => platform);


    // Device preference
    const deviceFrequency = {};
    profile.engagementHistory.forEach(engagement => {
      if (engagement.deviceType) {
        deviceFrequency[engagement.deviceType] = (deviceFrequency[engagement.deviceType] || 0) + 1;
      }
    });


    if (Object.keys(deviceFrequency).length > 0) {
      preferences.devicePreference = Object.entries(deviceFrequency)
        .sort(([,a], [,b]) => b - a)[0][0];
    }


    // Engagement style based on frequency and sentiment
    const engagementFrequency = profile.totalEngagements / Math.max(1, 
      (Date.now() - Math.min(...profile.engagementHistory.map(e => e.timestamp.getTime()))) / (1000 * 60 * 60 * 24)
    );


    if (engagementFrequency > 5 && profile.averageSentiment > 0.7) {
      preferences.engagementStyle = 'passionate';
    } else if (engagementFrequency > 2) {
      preferences.engagementStyle = 'active';
    } else {
      preferences.engagementStyle = 'casual';
    }


    return preferences;
  }


  /**
   * Generate personalized content for specific fan or fan segment
   * @param {string} fanId - Fan ID (optional, generates for all if not provided)
   * @param {string} contentType - Type of content to personalize
   * @param {Object} baseContent - Base content to personalize
   * @returns {Promise<Object>} Personalized content result
   */
  async generatePersonalizedContent(fanId, contentType, baseContent) {
    logger.enterFunction('AdvancedFanEngagementSystem.generatePersonalizedContent', {
      fanId, contentType
    });


    const perfId = performanceMonitor.startOperation('personalized_content_generation', {
      fanId: fanId || 'all_fans',
      contentType: contentType
    });


    try {
      logger.testHook('personalization_start', { fanId, contentType });


      if (fanId) {
        // Generate for specific fan
        const fanProfile = this.fanProfiles.get(fanId);
        if (!fanProfile) {
          throw new Error(`Fan profile not found: ${fanId}`);
        }


        const personalizedContent = await this.personalizeContentForFan(
          fanProfile, contentType, baseContent
        );


        performanceMonitor.endOperation(perfId, true, { 
          fanCount: 1,
          personalizationApplied: true
        });


        logger.exitFunction('AdvancedFanEngagementSystem.generatePersonalizedContent', {
          success: true,
          fanId: fanId
        });


        return {
          success: true,
          fanId: fanId,
          personalizedContent: personalizedContent,
          personalizationScore: personalizedContent.personalizationScore
        };


      } else {
        // Generate for fan segments
        const fanSegments = this.segmentFans();
        const personalizedVariants = {};


        for (const [segmentName, fans] of fanSegments) {
          logger.debug(`Generating personalized content for segment: ${segmentName}`);
          
          const representativeFan = this.getRepresentativeFan(fans);
          const segmentContent = await this.personalizeContentForFan(
            representativeFan, contentType, baseContent
          );


          personalizedVariants[segmentName] = {
            content: segmentContent,
            fanCount: fans.length,
            targetFans: fans.map(f => f.id)
          };
        }


        performanceMonitor.endOperation(perfId, true, { 
          fanCount: this.fanProfiles.size,
          segmentsGenerated: Object.keys(personalizedVariants).length
        });


        logger.exitFunction('AdvancedFanEngagementSystem.generatePersonalizedContent', {
          success: true,
          segmentsGenerated: Object.keys(personalizedVariants).length
        });


        return {
          success: true,
          contentType: contentType,
          personalizedVariants: personalizedVariants,
          totalFans: this.fanProfiles.size,
          segments: Object.keys(personalizedVariants)
        };
      }


    } catch (error) {
      performanceMonitor.endOperation(perfId, false);
      logger.error('Personalized content generation failed', { 
        fanId, 
        contentType, 
        error: error.toString() 
      });
      
      return {
        success: false,
        error: error.toString(),
        fallbackContent: baseContent
      };
    }
  }


  async personalizeContentForFan(fanProfile, contentType, baseContent) {
    const personalizationFactors = {
      loyaltyLevel: this.categorizeLoyaltyLevel(fanProfile.loyaltyScore),
      engagementStyle: fanProfile.preferences.engagementStyle,
      favoriteContentTypes: fanProfile.favoriteContentTypes,
      averageSentiment: fanProfile.averageSentiment,
      platforms: Array.from(fanProfile.platforms),
      recentActivity: this.getRecentActivity(fanProfile)
    };


    logger.testHook('fan_personalization_factors', { 
      fanId: fanProfile.id,
      factors: personalizationFactors
    });


    // Use AI content generator for personalization
    const personalizationPrompt = this.buildPersonalizationPrompt(
      baseContent, personalizationFactors, contentType
    );


    let personalizedContent = baseContent;
    let personalizationScore = 0;


    if (aiContentGenerator) {
      try {
        const aiResult = await aiContentGenerator.generateContent('personalized_content', {
          baseContent: baseContent,
          fanProfile: personalizationFactors,
          contentType: contentType,
          clubName: multiTenantManager.getTenantConfig()?.clubName
        }, { temperature: 0.8 }); // Higher creativity for personalization


        if (aiResult.success) {
          personalizedContent = aiResult.content;
          personalizationScore = 0.9; // High personalization with AI
        }
      } catch (aiError) {
        logger.warn('AI personalization failed, using rule-based approach', { 
          error: aiError.toString() 
        });
      }
    }


    // Apply rule-based personalization as fallback or enhancement
    const ruleBasedPersonalization = this.applyRuleBasedPersonalization(
      personalizedContent, personalizationFactors, contentType
    );


    personalizedContent = ruleBasedPersonalization.content;
    personalizationScore = Math.max(personalizationScore, ruleBasedPersonalization.score);


    return {
      content: personalizedContent,
      personalizationScore: personalizationScore,
      personalizationFactors: personalizationFactors,
      originalContent: baseContent,
      personalizedAt: DateUtils.now().toISOString()
    };
  }


  buildPersonalizationPrompt(baseContent, factors, contentType) {
    return `Personalize this ${contentType} content for a fan with these characteristics:
    - Loyalty Level: ${factors.loyaltyLevel}
    - Engagement Style: ${factors.engagementStyle}
    - Favorite Content: ${factors.favoriteContentTypes.join(', ')}
    - Sentiment: ${factors.averageSentiment > 0.5 ? 'positive' : 'neutral'}
    - Platforms: ${factors.platforms.join(', ')}
    
    Original content: "${baseContent}"
    
    Make it more engaging and relevant to this fan's profile while maintaining the core message.
    Keep the same tone but adjust enthusiasm and detail level appropriately.`;
  }


  applyRuleBasedPersonalization(content, factors, contentType) {
    let personalizedContent = content;
    let personalizationScore = 0.3; // Base rule-based score


    // Adjust based on loyalty level
    if (factors.loyaltyLevel === 'passionate') {
      personalizedContent = personalizedContent.replace(/\b(great|good)\b/gi, 'absolutely incredible');
      personalizedContent += ' 💙🔥'; // Add passionate emojis
      personalizationScore += 0.2;
    } else if (factors.loyaltyLevel === 'casual') {
      // Tone down excessive enthusiasm
      personalizedContent = personalizedContent.replace(/!{2,}/g, '!');
      personalizedContent = personalizedContent.replace(/amazing|incredible|fantastic/gi, 'great');
    }


    // Adjust based on engagement style
    if (factors.engagementStyle === 'active') {
      if (!personalizedContent.includes('What do you think')) {
        personalizedContent += '\n\nWhat do you think about this? 💭';
        personalizationScore += 0.1;
      }
    }


    // Add relevant hashtags based on favorite content
    if (factors.favoriteContentTypes.includes('goal')) {
      personalizedContent += ' #Goals';
    }
    if (factors.favoriteContentTypes.includes('player_spotlight')) {
      personalizedContent += ' #Players';
    }


    // Platform-specific adjustments
    if (factors.platforms.includes('twitter') && personalizedContent.length > 250) {
      personalizedContent = personalizedContent.substring(0, 247) + '...';
      personalizationScore += 0.1;
    }


    return {
      content: personalizedContent,
      score: personalizationScore
    };
  }


  segmentFans() {
    const segments = new Map();
    
    // Initialize segments
    segments.set('passionate_fans', []);
    segments.set('active_fans', []);
    segments.set('casual_fans', []);
    segments.set('new_fans', []);
    segments.set('dormant_fans', []);


    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;


    for (const [fanId, profile] of this.fanProfiles) {
      const daysSinceLastSeen = (now - profile.lastSeen.getTime()) / (24 * 60 * 60 * 1000);
      
      // Segment based on loyalty and recent activity
      if (daysSinceLastSeen > 60) {
        segments.get('dormant_fans').push(profile);
      } else if (profile.totalEngagements < 5 || daysSinceLastSeen < 7) {
        segments.get('new_fans').push(profile);
      } else if (profile.loyaltyScore > 80) {
        segments.get('passionate_fans').push(profile);
      } else if (profile.loyaltyScore > 50) {
        segments.get('active_fans').push(profile);
      } else {
        segments.get('casual_fans').push(profile);
      }
    }


    return segments;
  }


  /**
   * Track fan engagement in real-time
   * @param {string} fanId - Fan identifier
   * @param {string} platform - Platform where engagement occurred
   * @param {string} engagementType - Type of engagement
   * @param {string} contentId - Content that was engaged with
   * @param {Object} metadata - Additional engagement metadata
   * @returns {Object} Tracking result
   */
  trackFanEngagement(fanId, platform, engagementType, contentId, metadata = {}) {
    logger.testHook('fan_engagement_tracking', { 
      fanId, platform, engagementType, contentId 
    });


    try {
      const timestamp = DateUtils.now();
      
      // Analyze sentiment if text content is provided
      let sentimentScore = 0;
      if (metadata.text) {
        sentimentScore = this.sentimentAnalyzer.analyzeSentiment(metadata.text);
      }


      // Update fan profile
      if (!this.fanProfiles.has(fanId)) {
        this.fanProfiles.set(fanId, this.createNewFanProfile(fanId));
      }


      const fanProfile = this.fanProfiles.get(fanId);
      fanProfile.engagementHistory.push({
        platform: platform,
        type: engagementType,
        contentId: contentId,
        timestamp: timestamp,
        sentiment: sentimentScore,
        deviceType: metadata.deviceType || 'unknown',
        location: metadata.location || 'unknown',
        metadata: metadata
      });


      fanProfile.totalEngagements++;
      fanProfile.lastSeen = timestamp;
      fanProfile.platforms.add(platform);


      // Recalculate metrics
      this.calculateFanMetrics(fanProfile);


      // Log engagement to sheet
      this.logFanEngagement(fanId, platform, engagementType, contentId, sentimentScore, metadata);


      // Check for engagement milestones
      const milestone = this.checkEngagementMilestones(fanProfile);
      
      // Update real-time metrics
      premiumAnalyticsEngine.updateRealTimeMetric('fan_engagement', 1, {
        platform: platform,
        engagementType: engagementType,
        sentiment: sentimentScore
      });


      const result = {
        success: true,
        fanId: fanId,
        engagementRecorded: true,
        sentimentScore: sentimentScore,
        updatedLoyaltyScore: fanProfile.loyaltyScore,
        milestone: milestone
      };


      logger.debug('Fan engagement tracked', result);
      return result;


    } catch (error) {
      logger.error('Fan engagement tracking failed', { 
        fanId, error: error.toString() 
      });
      
      return {
        success: false,
        fanId: fanId,
        error: error.toString()
      };
    }
  }


  checkEngagementMilestones(fanProfile) {
    const milestones = [
      { threshold: 10, name: 'Active Fan', reward: 'exclusive_content' },
      { threshold: 50, name: 'Loyal Supporter', reward: 'early_access' },
      { threshold: 100, name: 'Super Fan', reward: 'meet_and_greet' },
      { threshold: 500, name: 'Ultimate Fan', reward: 'season_ticket_discount' }
    ];


    const currentMilestone = milestones
      .reverse()
      .find(m => fanProfile.totalEngagements >= m.threshold);


    const previousTotal = fanProfile.totalEngagements - 1;
    const previousMilestone = milestones
      .reverse()
      .find(m => previousTotal >= m.threshold);


    if (currentMilestone && currentMilestone !== previousMilestone) {
      // New milestone reached!
      this.triggerMilestoneReward(fanProfile.id, currentMilestone);
      return currentMilestone;
    }


    return null;
  }


  triggerMilestoneReward(fanId, milestone) {
    logger.info('Fan milestone reached', { fanId, milestone });


    // Send milestone notification via webhook
    const milestonePayload = {
      timestamp: DateUtils.now().toISOString(),
      event_type: 'fan_milestone_reached',
      source: 'apps_script_fan_engagement',
      
      fan_id: fanId,
      milestone: milestone,
      tenant: multiTenantManager.currentTenant,
      
      reward_action: milestone.reward,
      celebration_message: `Congratulations! You've reached ${milestone.name} status!`
    };


    const milestoneWebhook = PropertiesService.getScriptProperties()
                              .getProperty('FAN_MILESTONE_WEBHOOK');


    if (milestoneWebhook) {
      ApiUtils.makeRequest(milestoneWebhook, {
        method: 'POST',
        payload: JSON.stringify(milestonePayload)
      }).catch(error => {
        logger.error('Failed to send milestone notification', { error: error.toString() });
      });
    }
  }
}


// ===== AUTOMATED MATCH ANALYSIS SYSTEM =====


/**
 * Comprehensive Automated Match Analysis with AI Insights
 */
class AutomatedMatchAnalyzer extends BaseAutomationComponent {
  
  constructor() {
    super('AutomatedMatchAnalyzer');
    this.analysisTemplates = new Map();
    this.tacticalAnalyzer = new TacticalAnalyzer();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.reportGenerator = new MatchReportGenerator();
  }


  doInitialize() {
    logger.enterFunction('AutomatedMatchAnalyzer.doInitialize');
    
    try {
      // Load analysis templates
      this.loadAnalysisTemplates();
      
      // Initialize analysis components
      this.tacticalAnalyzer.initialize();
      this.performanceAnalyzer.initialize();
      this.reportGenerator.initialize();


      logger.exitFunction('AutomatedMatchAnalyzer.doInitialize', { 
        success: true,
        templatesLoaded: this.analysisTemplates.size
      });
      return true;
    } catch (error) {
      logger.error('AutomatedMatchAnalyzer initialization failed', { error: error.toString() });
      return false;
    }
  }


  loadAnalysisTemplates() {
    const templates = {
      'post_match_analysis': {
        name: 'Post-Match Analysis Report',
        sections: [
          'match_summary',
          'key_moments',
          'player_performances',
          'tactical_analysis',
          'statistics_breakdown',
          'areas_for_improvement',
          'positive_takeaways'
        ],
        autoGenerate: true,
        publishTargets: ['website', 'email_newsletter']
      },
      'player_ratings': {
        name: 'Player Performance Ratings',
        sections: [
          'individual_ratings',
          'man_of_the_match',
          'best_performers',
          'areas_for_development'
        ],
        autoGenerate: true,
        publishTargets: ['social_media', 'website']
      },
      'tactical_review': {
        name: 'Tactical Analysis',
        sections: [
          'formation_analysis',
          'key_tactical_moments',
          'substitution_impact',
          'opposition_analysis',
          'tactical_recommendations'
        ],
        autoGenerate: false, // Requires manual review
        publishTargets: ['internal_review']
      },
      'press_release': {
        name: 'Match Press Release',
        sections: [
          'match_result_summary',
          'key_quotes',
          'standout_performances',
          'next_fixture_preview'
        ],
        autoGenerate: true,
        publishTargets: ['press', 'website', 'social_media']
      }
    };


    Object.entries(templates).forEach(([key, template]) => {
      this.analysisTemplates.set(key, template);
    });
  }


  /**
   * Perform comprehensive match analysis
   * @param {string} matchId - Match identifier
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Complete analysis result
   */
  async performCompleteMatchAnalysis(matchId, options = {}) {
    logger.enterFunction('AutomatedMatchAnalyzer.performCompleteMatchAnalysis', { 
      matchId, options 
    });


    const perfId = performanceMonitor.startOperation('complete_match_analysis', {
      matchId: matchId,
      analysisDepth: options.depth || 'standard'
    });


    try {
      logger.testHook('match_analysis_start', { matchId });


      // Gather all match data
      const matchData = await this.gatherCompleteMatchData(matchId);
      if (!matchData) {
        throw new Error(`Match data not found for ID: ${matchId}`);
      }


      const analysisResult = {
        matchId: matchId,
        analysisId: StringUtils.generateId('analysis'),
        generatedAt: DateUtils.now().toISOString(),
        matchData: matchData,
        analyses: {},
        reports: {},
        insights: [],
        recommendations: [],
        publishedContent: {}
      };


      // Run different types of analysis
      const analysisTypes = options.analysisTypes || [
        'tactical_analysis',
        'performance_analysis', 
        'statistical_analysis',
        'moment_analysis'
      ];


      for (const analysisType of analysisTypes) {
        logger.debug(`Running ${analysisType} for match ${matchId}`);
        
        try {
          const analysis = await this.runSpecificAnalysis(analysisType, matchData, options);
          analysisResult.analyses[analysisType] = analysis;
        } catch (analysisError) {
          logger.error(`${analysisType} failed`, { 
            matchId, 
            error: analysisError.toString() 
          });
          
          analysisResult.analyses[analysisType] = {
            success: false,
            error: analysisError.toString()
          };
        }
      }


      // Generate AI-powered insights
      analysisResult.insights = await this.generateMatchInsights(matchData, analysisResult.analyses);


      // Generate automated reports
      if (options.generateReports !== false) {
        analysisResult.reports = await this.generateAutomatedReports(matchData, analysisResult.analyses);
      }


      // Auto-publish if enabled
      if (options.autoPublish) {
        analysisResult.publishedContent = await this.autoPublishContent(analysisResult);
      }


      // Store analysis results
      this.storeAnalysisResults(analysisResult);


      performanceMonitor.endOperation(perfId, true, {
        analysesCompleted: Object.keys(analysisResult.analyses).length,
        reportsGenerated: Object.keys(analysisResult.reports).length,
        insightsGenerated: analysisResult.insights.length
      });


      logger.testHook('match_analysis_complete', { 
        matchId,
        analysesCompleted: Object.keys(analysisResult.analyses).length
      });


      logger.exitFunction('AutomatedMatchAnalyzer.performCompleteMatchAnalysis', {
        success: true,
        matchId: matchId,
        analysesCompleted: Object.keys(analysisResult.analyses).length
      });


      return {
        success: true,
        analysisResult: analysisResult
      };


    } catch (error) {
      performanceMonitor.endOperation(perfId, false);
      logger.error('Complete match analysis failed', { 
        matchId, 
        error: error.toString() 
      });
      
      return {
        success: false,
        matchId: matchId,
        error: error.toString(),
        partialResults: await this.generateFallbackAnalysis(matchId)
      };
    }
  }


  async gatherCompleteMatchData(matchId) {
    logger.testHook('match_data_gathering', { matchId });


    const matchData = {
      matchId: matchId,
      basicInfo: {},
      events: [],
      playerStats: {},
      teamStats: {},
      timeline: [],
      substitutions: [],
      cards: [],
      goals: []
    };


    try {
      // Get basic match information
      const liveSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.LIVE'));
      if (liveSheet) {
        matchData.basicInfo = {
          homeTeam: SheetUtils.getCellValue(liveSheet, 'B2', 'Home Team'),
          awayTeam: SheetUtils.getCellValue(liveSheet, 'B3', 'Away Team'),
          homeScore: SheetUtils.getCellValue(liveSheet, 'C2', 0),
          awayScore: SheetUtils.getCellValue(liveSheet, 'D2', 0),
          venue: SheetUtils.getCellValue(liveSheet, 'B6', 'Unknown'),
          date: SheetUtils.getCellValue(liveSheet, 'B8', 'Unknown'),
          competition: SheetUtils.getCellValue(liveSheet, 'B7', 'League')
        };


        // Get match events from Live sheet
        const eventData = liveSheet.getDataRange().getValues();
        for (let i = 10; i < eventData.length; i++) { // Skip header and match info rows
          const [minute, eventType, player, details] = eventData[i];
          if (minute) {
            const event = {
              minute: parseInt(minute),
              type: eventType,
              player: player,
              details: details
            };


            matchData.events.push(event);
            matchData.timeline.push(event);


            // Categorize events
            if (eventType === 'goal') {
              matchData.goals.push(event);
            } else if (eventType === 'substitution') {
              matchData.substitutions.push(event);
            } else if (eventType === 'card') {
              matchData.cards.push(event);
            }
          }
        }
      }


      // Get player statistics
      const playerStatsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.PLAYER_STATS'));
      if (playerStatsSheet) {
        const statsData = playerStatsSheet.getDataRange().getValues();
        for (let i = 1; i < statsData.length; i++) {
          const [name, apps, subs, goals, penalties, assists, motm, minutes, yellows, reds] = statsData[i];
          if (name) {
            matchData.playerStats[name] = {
              appearances: parseInt(apps) || 0,
              substitutions: parseInt(subs) || 0,
              goals: parseInt(goals) || 0,
              penalties: parseInt(penalties) || 0,
              assists: parseInt(assists) || 0,
              motm: parseInt(motm) || 0,
              minutes: parseInt(minutes) || 0,
              yellowCards: parseInt(yellows) || 0,
              redCards: parseInt(reds) || 0
            };
          }
        }
      }


      // Get substitution details
      const subsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.SUBS_LOG'));
      if (subsSheet) {
        const subsData = subsSheet.getDataRange().getValues();
        for (let i = 1; i < subsData.length; i++) {
          const [matchDate, subMatchId, minute, playerOff, playerOn] = subsData[i];
          if (subMatchId === matchId) {
            matchData.substitutions.push({
              minute: parseInt(minute),
              playerOff: playerOff,
              playerOn: playerOn,
              type: 'substitution'
            });
          }
        }
      }


      // Calculate team statistics
      matchData.teamStats = this.calculateTeamMatchStats(matchData);


      return matchData;


    } catch (error) {
      logger.error('Failed to gather match data', { matchId, error: error.toString() });
      return null;
    }
  }


  calculateTeamMatchStats(matchData) {
    const stats = {
      totalGoals: matchData.goals.length,
      totalCards: matchData.cards.length,
      totalSubstitutions: matchData.substitutions.length,
      goalMinutes: matchData.goals.map(g => g.minute),
      cardMinutes: matchData.cards.map(c => c.minute),
      scoringPlayers: [...new Set(matchData.goals.map(g => g.player))],
      disciplineRecord: {
        yellow: matchData.cards.filter(c => c.details?.includes('yellow')).length,
        red: matchData.cards.filter(c => c.details?.includes('red')).length
      }
    };


    return stats;
  }


  async runSpecificAnalysis(analysisType, matchData, options) {
    switch (analysisType) {
      case 'tactical_analysis':
        return await this.tacticalAnalyzer.analyzeMatch(matchData, options);
      
      case 'performance_analysis':
        return await this.performanceAnalyzer.analyzeMatch(matchData, options);
      
      case 'statistical_analysis':
        return await this.runStatisticalAnalysis(matchData, options);
      
      case 'moment_analysis':
        return await this.runMomentAnalysis(matchData, options);
      
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
  }


  async generateMatchInsights(matchData, analyses) {
    const insights = [];


    try {
      // Performance insights
      if (analyses.performance_analysis?.success) {
        const perfInsights = this.extractPerformanceInsights(analyses.performance_analysis);
        insights.push(...perfInsights);
      }


      // Tactical insights
      if (analyses.tactical_analysis?.success) {
        const tacticalInsights = this.extractTacticalInsights(analyses.tactical_analysis);
        insights.push(...tacticalInsights);
      }


      // Statistical insights
      if (analyses.statistical_analysis?.success) {
        const statInsights = this.extractStatisticalInsights(analyses.statistical_analysis);
        insights.push(...statInsights);
      }


      // AI-generated insights
      if (aiContentGenerator) {
        const aiInsights = await aiContentGenerator.generateContent('match_insights', {
          matchResult: `${matchData.basicInfo.homeTeam} ${matchData.basicInfo.homeScore}-${matchData.basicInfo.awayScore} ${matchData.basicInfo.awayTeam}`,
          keyEvents: matchData.timeline.slice(0, 5),
          topPerformers: this.identifyTopPerformers(matchData)
        });


        if (aiInsights.success) {
          insights.push({
            type: 'ai_generated',
            title: 'AI Match Insights',
            content: aiInsights.content,
            confidence: aiInsights.engagementScore,
            source: 'ai_content_generator'
          });
        }
      }


      return insights.slice(0, 10); // Limit to top 10 insights


    } catch (error) {
      logger.error('Failed to generate match insights', { error: error.toString() });
      return [];
    }
  }


  async generateAutomatedReports(matchData, analyses) {
    const reports = {};


    try {
      // Generate post-match analysis report
      if (this.analysisTemplates.get('post_match_analysis').autoGenerate) {
        reports.postMatchAnalysis = await this.reportGenerator.generatePostMatchReport(
          matchData, analyses
        );
      }


      // Generate player ratings report
      if (this.analysisTemplates.get('player_ratings').autoGenerate) {
        reports.playerRatings = await this.reportGenerator.generatePlayerRatingsReport(
          matchData, analyses
        );
      }


      // Generate press release
      if (this.analysisTemplates.get('press_release').autoGenerate) {
        reports.pressRelease = await this.reportGenerator.generatePressRelease(
          matchData, analyses
        );
      }


      return reports;


    } catch (error) {
      logger.error('Failed to generate automated reports', { error: error.toString() });
      return {};
    }
  }


  /**
   * Auto-publish content to various channels
   * @param {Object} analysisResult - Complete analysis result
   * @returns {Promise<Object>} Publishing results
   */
  async autoPublishContent(analysisResult) {
    logger.testHook('auto_publish_start', { 
      matchId: analysisResult.matchId,
      reportsToPublish: Object.keys(analysisResult.reports).length
    });


    const publishResults = {};


    try {
      // Publish to website
      if (analysisResult.reports.postMatchAnalysis) {
        publishResults.website = await this.publishToWebsite(
          analysisResult.reports.postMatchAnalysis,
          analysisResult.matchData
        );
      }


      // Publish to social media
      if (analysisResult.reports.playerRatings) {
        publishResults.socialMedia = await this.publishToSocialMedia(
          analysisResult.reports.playerRatings,
          analysisResult.matchData
        );
      }


      // Send to press if press release generated
      if (analysisResult.reports.pressRelease) {
        publishResults.press = await this.publishToPressOutlets(
          analysisResult.reports.pressRelease,
          analysisResult.matchData
        );
      }


      // Send email newsletter
      publishResults.newsletter = await this.publishToNewsletter(
        analysisResult,
        analysisResult.matchData
      );


      return publishResults;


    } catch (error) {
      logger.error('Auto-publish failed', { error: error.toString() });
      return { error: error.toString() };
    }
  }


  async publishToWebsite(report, matchData) {
    // Publish via webhook to website CMS
    const websitePayload = {
      timestamp: DateUtils.now().toISOString(),
      event_type: 'website_content_publish',
      source: 'apps_script_match_analysis',
      
      content_type: 'match_report',
      title: `Match Report: ${matchData.basicInfo.homeTeam} vs ${matchData.basicInfo.awayTeam}`,
      content: report.fullReport,
      metadata: {
        match_id: matchData.matchId,
        match_date: matchData.basicInfo.date,
        competition: matchData.basicInfo.competition,
        result: `${matchData.basicInfo.homeScore}-${matchData.basicInfo.awayScore}`,
        auto_generated: true
      },
      
      publish_immediately: true,
      seo_optimized: true
    };


    const websiteWebhook = PropertiesService.getScriptProperties()
                            .getProperty('WEBSITE_PUBLISH_WEBHOOK');


    if (websiteWebhook) {
      const response = await ApiUtils.makeRequest(websiteWebhook, {
        method: 'POST',
        payload: JSON.stringify(websitePayload)
      });


      return {
        success: response.success,
        publishedUrl: response.json?.published_url,
        response: response
      };
    }


    return { success: false, error: 'Website webhook not configured' };
  }
}


// Tactical and Performance Analyzer classes would be implemented similarly...


/**
 * Sentiment Analysis Engine for fan engagement
 */
class SentimentAnalyzer {
  constructor() {
    this.sentimentPatterns = new Map();
  }


  initialize() {
    // Load sentiment patterns
    this.loadSentimentPatterns();
  }


  loadSentimentPatterns() {
    const patterns = {
      positive: [
        /\b(great|amazing|fantastic|brilliant|excellent|superb|outstanding|incredible)\b/gi,
        /\b(love|loved|loving)\b/gi,
        /\b(happy|excited|thrilled|delighted)\b/gi,
        /👏|🎉|⚽|💙|🔥|❤️/g
      ],
      negative: [
        /\b(terrible|awful|horrible|disappointing|frustrating|annoying)\b/gi,
        /\b(hate|hated|hating)\b/gi,
        /\b(angry|upset|frustrated|disappointed)\b/gi,
        /😤|😠|👎|😔|💔/g
      ],
      neutral: [
        /\b(okay|ok|fine|average|decent)\b/gi,
        /\b(think|believe|feel|seems)\b/gi
      ]
    };


    Object.entries(patterns).forEach(([sentiment, regexArray]) => {
      this.sentimentPatterns.set(sentiment, regexArray);
    });
  }


  analyzeSentiment(text) {
    if (!text || typeof text !== 'string') return 0;


    const normalizedText = text.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;


    // Count positive patterns
    const positivePatterns = this.sentimentPatterns.get('positive');
    positivePatterns.forEach(pattern => {
      const matches = normalizedText.match(pattern);
      if (matches) positiveScore += matches.length;
    });


    // Count negative patterns
    const negativePatterns = this.sentimentPatterns.get('negative');
    negativePatterns.forEach(pattern => {
      const matches = normalizedText.match(pattern);
      if (matches) negativeScore += matches.length;
    });


    // Calculate final sentiment score (-1 to 1)
    const totalScore = positiveScore - negativeScore;
    const maxScore = Math.max(positiveScore + negativeScore, 1);
    
    return totalScore / maxScore;
  }
}


/**
 * Fan Loyalty Tracking System
 */
class FanLoyaltyTracker {
  initialize() {
    this.loyaltyFactors = {
      engagementFrequency: 0.3,
      engagementDiversity: 0.2,
      positiveSentiment: 0.2,
      longevity: 0.15,
      contentSharing: 0.15
    };
  }


  calculateLoyaltyScore(fanProfile) {
    let loyaltyScore = 0;


    // Engagement frequency (0-30 points)
    const avgEngagementsPerWeek = fanProfile.totalEngagements / 
      Math.max(1, this.getWeeksSinceFirstEngagement(fanProfile));
    const frequencyScore = Math.min(30, avgEngagementsPerWeek * 3);
    loyaltyScore += frequencyScore * this.loyaltyFactors.engagementFrequency;


    // Engagement diversity (0-20 points)  
    const uniqueEngagementTypes = new Set(fanProfile.engagementHistory.map(e => e.type)).size;
    const diversityScore = Math.min(20, uniqueEngagementTypes * 5);
    loyaltyScore += diversityScore * this.loyaltyFactors.engagementDiversity;


    // Positive sentiment (0-20 points)
    const sentimentScore = Math.max(0, fanProfile.averageSentiment * 20);
    loyaltyScore += sentimentScore * this.loyaltyFactors.positiveSentiment;


    // Longevity (0-15 points)
    const weeksSinceFirst = this.getWeeksSinceFirstEngagement(fanProfile);
    const longevityScore = Math.min(15, Math.log(weeksSinceFirst + 1) * 3);
    loyaltyScore += longevityScore * this.loyaltyFactors.longevity;


    // Content sharing behavior (0-15 points)
    const sharingEngagements = fanProfile.engagementHistory.filter(e => 
      e.type === 'share' || e.type === 'retweet'
    ).length;
    const sharingScore = Math.min(15, sharingEngagements * 2);
    loyaltyScore += sharingScore * this.loyaltyFactors.contentSharing;


    return Math.round(loyaltyScore);
  }


  getWeeksSinceFirstEngagement(fanProfile) {
    if (fanProfile.engagementHistory.length === 0) return 1;


    const firstEngagement = Math.min(
      ...fanProfile.engagementHistory.map(e => e.timestamp.getTime())
    );
    const weeksSince = (Date.now() - firstEngagement) / (7 * 24 * 60 * 60 * 1000);
    
    return Math.max(1, weeksSince);
  }
}


// Create and export instances
const advancedFanEngagementSystem = new AdvancedFanEngagementSystem();
const automatedMatchAnalyzer = new AutomatedMatchAnalyzer();


// Export for global access
globalThis.AdvancedFanEngagementSystem = AdvancedFanEngagementSystem;
globalThis.AutomatedMatchAnalyzer = AutomatedMatchAnalyzer;
globalThis.SentimentAnalyzer = SentimentAnalyzer;
globalThis.FanLoyaltyTracker = FanLoyaltyTracker;


globalThis.advancedFanEngagementSystem = advancedFanEngagementSystem;
globalThis.automatedMatchAnalyzer = automatedMatchAnalyzer;
