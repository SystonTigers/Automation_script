/**
 * @fileoverview Syston Tigers Automation - Ultimate Premium Features & AI Integration
 * @version 6.0.0 - THE ULTIMATE EDITION
 * @author Senior Software Architect
 * 
 * The most advanced football automation system ever built:
 * - AI-powered content generation and match analysis
 * - Predictive analytics for optimal engagement
 * - Advanced video processing with ML
 * - Multi-tenant architecture for unlimited clubs
 * - Real-time data backup and disaster recovery
 * - Enterprise-grade monitoring and alerting
 */


// ===== MULTI-TENANT ARCHITECTURE SYSTEM =====


/**
 * Multi-Tenant Configuration Manager
 * Supports unlimited clubs with isolated data and configurations
 */
class MultiTenantManager extends BaseAutomationComponent {
  
  constructor() {
    super('MultiTenantManager');
    this.tenants = new Map();
    this.currentTenant = null;
    this.tenantConfigs = new Map();
  }


  doInitialize() {
    logger.enterFunction('MultiTenantManager.doInitialize');
    
    try {
      // Load all tenant configurations
      this.loadTenantConfigurations();
      
      // Set default tenant (backward compatibility)
      this.setCurrentTenant('syston_tigers');
      
      // Initialize tenant isolation
      this.initializeTenantIsolation();
      
      logger.exitFunction('MultiTenantManager.doInitialize', { 
        success: true,
        tenantsLoaded: this.tenants.size
      });
      return true;
    } catch (error) {
      logger.error('MultiTenantManager initialization failed', { error: error.toString() });
      return false;
    }
  }


  loadTenantConfigurations() {
    // Multi-tenant configuration structure
    const TENANT_CONFIGS = {
      'syston_tigers': {
        clubName: 'Syston Town Tigers',
        season: '2024-25',
        timezone: 'Europe/London',
        colors: { primary: '#FF6B35', secondary: '#004E64' },
        socialHandles: {
          twitter: '@SystonTigers',
          instagram: '@systontigers',
          facebook: 'SystonTownTigers'
        },
        venue: {
          name: 'The Dovecote',
          address: 'Syston, Leicestershire',
          capacity: 2000
        },
        league: {
          name: 'United Counties League',
          division: 'Premier Division North',
          level: 9
        },
        sheetIds: {
          main: getConfig('SPREADSHEET_ID'),
          backup: PropertiesService.getScriptProperties().getProperty('BACKUP_SHEET_ID')
        },
        apiKeys: {
          make: 'MAKE_WEBHOOK_URL',
          youtube: 'YOUTUBE_API_KEY',
          xbotgo: 'XBOTGO_API_KEY'
        },
        features: {
          xbotgo: true,
          videoProcessing: true,
          gotm: true,
          aiContent: true,
          predictiveAnalytics: true
        }
      },
      'example_fc': {
        clubName: 'Example Football Club',
        season: '2024-25',
        timezone: 'Europe/London',
        colors: { primary: '#007BFF', secondary: '#28A745' },
        socialHandles: {
          twitter: '@ExampleFC',
          instagram: '@examplefc'
        },
        venue: {
          name: 'Example Stadium',
          address: 'Example Town'
        },
        league: {
          name: 'Example League',
          division: 'Division One'
        },
        sheetIds: {
          main: 'EXAMPLE_SHEET_ID'
        },
        apiKeys: {
          make: 'EXAMPLE_MAKE_WEBHOOK'
        },
        features: {
          xbotgo: false,
          videoProcessing: true,
          gotm: false,
          aiContent: true,
          predictiveAnalytics: false
        }
      }
    };


    // Load configurations
    Object.entries(TENANT_CONFIGS).forEach(([tenantId, config]) => {
      this.tenantConfigs.set(tenantId, config);
      this.tenants.set(tenantId, {
        id: tenantId,
        config: config,
        initialized: false,
        services: new Map()
      });
    });


    logger.info('Tenant configurations loaded', {
      tenantCount: this.tenants.size,
      tenantIds: Array.from(this.tenants.keys())
    });
  }


  setCurrentTenant(tenantId) {
    if (!this.tenants.has(tenantId)) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }


    this.currentTenant = tenantId;
    
    // Update global config for current tenant
    const tenantConfig = this.tenantConfigs.get(tenantId);
    this.updateGlobalConfigForTenant(tenantConfig);
    
    logger.info('Current tenant set', { tenantId, clubName: tenantConfig.clubName });
  }


  updateGlobalConfigForTenant(tenantConfig) {
    // Update SYSTEM_CONFIG with tenant-specific values
    setConfig('SYSTEM.CLUB_NAME', tenantConfig.clubName);
    setConfig('SYSTEM.SEASON', tenantConfig.season);
    setConfig('SYSTEM.TIMEZONE', tenantConfig.timezone);
    
    // Update sheet references if different
    if (tenantConfig.sheetIds.main !== getConfig('SPREADSHEET_ID')) {
      // Handle different spreadsheet for this tenant
      logger.info('Using tenant-specific spreadsheet', { 
        tenantId: this.currentTenant,
        sheetId: tenantConfig.sheetIds.main
      });
    }
  }


  getTenantConfig(tenantId = null) {
    const id = tenantId || this.currentTenant;
    return this.tenantConfigs.get(id);
  }


  isTenantFeatureEnabled(feature, tenantId = null) {
    const config = this.getTenantConfig(tenantId);
    return config?.features?.[feature] || false;
  }


  getAllTenants() {
    return Array.from(this.tenants.values()).map(tenant => ({
      id: tenant.id,
      clubName: tenant.config.clubName,
      league: tenant.config.league,
      initialized: tenant.initialized,
      features: tenant.config.features
    }));
  }


  initializeTenantIsolation() {
    // Set up isolated execution contexts for each tenant
    this.tenants.forEach((tenant, tenantId) => {
      tenant.services = new Map();
      tenant.cache = new SmartCache();
      tenant.metrics = new Map();
    });
  }
}


// ===== AI-POWERED CONTENT GENERATION SYSTEM =====


/**
 * AI Content Generator with GPT integration and dynamic templates
 */
class AIContentGenerator extends BaseAutomationComponent {
  
  constructor() {
    super('AIContentGenerator');
    this.aiApiUrl = 'https://api.openai.com/v1/chat/completions';
    this.templateLibrary = new Map();
    this.contentCache = new SmartCache();
    this.engagementPredictor = new EngagementPredictor();
  }


  doInitialize() {
    logger.enterFunction('AIContentGenerator.doInitialize');
    
    try {
      // Load AI configuration
      this.apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
      
      if (!this.apiKey) {
        logger.warn('OpenAI API key not configured - AI features disabled');
        return true; // Don't fail initialization
      }


      // Load content templates
      this.loadContentTemplates();
      
      // Initialize engagement predictor
      this.engagementPredictor.initialize();


      logger.exitFunction('AIContentGenerator.doInitialize', { 
        success: true,
        templatesLoaded: this.templateLibrary.size
      });
      return true;
    } catch (error) {
      logger.error('AIContentGenerator initialization failed', { error: error.toString() });
      return false;
    }
  }


  loadContentTemplates() {
    const templates = {
      'match_report': {
        prompt: `Write an engaging match report for {clubName} vs {opponent}. 
        Final score: {homeScore}-{awayScore}. 
        Key events: {events}. 
        Style: Professional but exciting, 150-200 words.
        Include player performances and match highlights.`,
        placeholders: ['clubName', 'opponent', 'homeScore', 'awayScore', 'events']
      },
      'goal_celebration': {
        prompt: `Create an exciting social media post celebrating a goal by {player} 
        in the {minute}th minute for {clubName} vs {opponent}. 
        Current score: {homeScore}-{awayScore}.
        Style: Energetic and celebratory, use emojis, 50-100 words.`,
        placeholders: ['player', 'minute', 'clubName', 'opponent', 'homeScore', 'awayScore']
      },
      'player_spotlight': {
        prompt: `Create a player spotlight post for {playerName} highlighting their 
        recent performance: {stats}. 
        Include their season stats: {seasonStats}.
        Style: Appreciative and professional, 100-150 words.`,
        placeholders: ['playerName', 'stats', 'seasonStats']
      },
      'match_preview': {
        prompt: `Write an exciting match preview for {clubName} vs {opponent} 
        at {venue} on {date}. 
        Recent form: {recentForm}. 
        Key players to watch: {keyPlayers}.
        Style: Anticipatory and engaging, 120-180 words.`,
        placeholders: ['clubName', 'opponent', 'venue', 'date', 'recentForm', 'keyPlayers']
      },
      'season_analysis': {
        prompt: `Analyze {clubName}'s season so far. 
        League position: {position}. 
        Record: {wins}W {draws}D {losses}L. 
        Top scorer: {topScorer} ({goals} goals).
        Style: Analytical but accessible, 200-250 words.`,
        placeholders: ['clubName', 'position', 'wins', 'draws', 'losses', 'topScorer', 'goals']
      }
    };


    Object.entries(templates).forEach(([key, template]) => {
      this.templateLibrary.set(key, template);
    });
  }


  /**
   * Generate AI-powered content for any event or scenario
   * @param {string} templateType - Type of content to generate
   * @param {Object} data - Data to fill template placeholders
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated content result
   */
  async generateContent(templateType, data, options = {}) {
    logger.enterFunction('AIContentGenerator.generateContent', { templateType, data });


    if (!this.apiKey) {
      return {
        success: false,
        error: 'AI content generation not configured'
      };
    }


    const perfId = performanceMonitor.startOperation('ai_content_generation', {
      templateType: templateType,
      dataSize: JSON.stringify(data).length
    });


    try {
      // Check cache first
      const cacheKey = `ai_content_${templateType}_${JSON.stringify(data)}`;
      const cached = this.contentCache.get(cacheKey);
      if (cached && !options.forceRegenerate) {
        performanceMonitor.endOperation(perfId, true, { source: 'cache' });
        return { success: true, content: cached, source: 'cache' };
      }


      logger.testHook('ai_content_generation_start', { templateType });


      // Get template
      const template = this.templateLibrary.get(templateType);
      if (!template) {
        throw new Error(`Template not found: ${templateType}`);
      }


      // Fill template with data
      let prompt = template.prompt;
      template.placeholders.forEach(placeholder => {
        const value = data[placeholder] || `[${placeholder}]`;
        prompt = prompt.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), value);
      });


      // Add tenant-specific context
      const tenantConfig = multiTenantManager.getTenantConfig();
      const contextPrompt = this.addTenantContext(prompt, tenantConfig);


      // Call OpenAI API with circuit breaker protection
      const aiResponse = await circuitBreakers.openai.execute(async () => {
        return await this.callOpenAI(contextPrompt, options);
      });


      if (!aiResponse.success) {
        throw new Error(aiResponse.error);
      }


      // Post-process content
      const processedContent = this.postProcessContent(aiResponse.content, templateType, data);


      // Predict engagement score
      const engagementScore = await this.engagementPredictor.predictEngagement(
        processedContent, templateType, data
      );


      const result = {
        success: true,
        content: processedContent,
        originalPrompt: prompt,
        engagementScore: engagementScore,
        metadata: {
          templateType: templateType,
          generatedAt: DateUtils.now().toISOString(),
          tokensUsed: aiResponse.tokensUsed,
          modelUsed: aiResponse.modelUsed
        }
      };


      // Cache the result
      this.contentCache.set(cacheKey, processedContent, 3600); // 1 hour cache


      // Log generation for analytics
      this.logContentGeneration(templateType, data, result);


      performanceMonitor.endOperation(perfId, true, {
        tokensUsed: aiResponse.tokensUsed,
        engagementScore: engagementScore
      });


      logger.testHook('ai_content_generation_complete', { 
        templateType, 
        engagementScore 
      });


      logger.exitFunction('AIContentGenerator.generateContent', {
        success: true,
        templateType: templateType,
        engagementScore: engagementScore
      });


      return result;


    } catch (error) {
      performanceMonitor.endOperation(perfId, false);
      logger.error('AI content generation failed', { 
        templateType, 
        error: error.toString() 
      });
      
      // Fallback to template-based content
      const fallbackContent = this.generateFallbackContent(templateType, data);
      return {
        success: false,
        error: error.toString(),
        fallbackContent: fallbackContent
      };
    }
  }


  addTenantContext(prompt, tenantConfig) {
    if (!tenantConfig) return prompt;


    const contextAddition = `\nClub context: ${tenantConfig.clubName} plays in the ${tenantConfig.league.name}. 
    Club colors: ${tenantConfig.colors.primary}. 
    Home venue: ${tenantConfig.venue.name}. 
    Social handles: ${tenantConfig.socialHandles.twitter || ''}.
    Keep the tone consistent with a ${tenantConfig.league.level}th tier English football club.`;


    return prompt + contextAddition;
  }


  async callOpenAI(prompt, options = {}) {
    const payload = {
      model: options.model || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a professional sports writer and social media manager for English non-league football clubs. Write engaging, accurate, and appropriately toned content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options.maxTokens || 300,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9
    };


    logger.apiCall('OpenAI', this.aiApiUrl, payload);


    const response = await ApiUtils.makeRequest(this.aiApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      timeout: 30000
    });


    logger.apiResponse('OpenAI', response.status, response.data);


    if (!response.success) {
      return {
        success: false,
        error: `OpenAI API error: ${response.status} - ${response.data}`
      };
    }


    if (!response.json || !response.json.choices || response.json.choices.length === 0) {
      return {
        success: false,
        error: 'Invalid response from OpenAI API'
      };
    }


    return {
      success: true,
      content: response.json.choices[0].message.content.trim(),
      tokensUsed: response.json.usage?.total_tokens || 0,
      modelUsed: response.json.model
    };
  }


  postProcessContent(content, templateType, data) {
    // Clean up AI-generated content
    let processed = content;


    // Remove any unwanted formatting
    processed = processed.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold markdown
    processed = processed.replace(/\*(.*?)\*/g, '$1');     // Remove italic markdown


    // Add appropriate hashtags based on template type
    if (templateType === 'goal_celebration') {
      processed += '\n\n⚽ #Goal #NonLeagueFootball';
      if (data.clubName) {
        processed += ` #${data.clubName.replace(/\s+/g, '')}`;
      }
    } else if (templateType === 'match_report') {
      processed += '\n\n📊 #MatchReport #NonLeague #Football';
    }


    // Add tenant-specific hashtags
    const tenantConfig = multiTenantManager.getTenantConfig();
    if (tenantConfig?.socialHandles?.twitter) {
      processed += ` ${tenantConfig.socialHandles.twitter}`;
    }


    // Ensure appropriate length for social media
    if (templateType.includes('social') && processed.length > 280) {
      processed = processed.substr(0, 250) + '...';
    }


    return processed;
  }


  generateFallbackContent(templateType, data) {
    // Simple template-based fallback when AI fails
    const fallbacks = {
      'goal_celebration': `⚽ GOAL! ${data.player || 'Our player'} finds the net in the ${data.minute || 'XX'}th minute! ${data.clubName || 'We'} ${data.homeScore || 'X'}-${data.awayScore || 'X'} ${data.opponent || 'Opposition'}! #Goal #Football`,
      'match_report': `Full time: ${data.clubName || 'Club'} ${data.homeScore || 'X'}-${data.awayScore || 'X'} ${data.opponent || 'Opposition'}. A good performance from the team today. #MatchReport`,
      'player_spotlight': `👏 Well played ${data.playerName || 'Player'}! Great performance recently. #PlayerSpotlight`,
      'match_preview': `🔥 Next up: ${data.clubName || 'We'} vs ${data.opponent || 'Opposition'} at ${data.venue || 'home'} on ${data.date || 'matchday'}. Come on! #MatchPreview`
    };


    return fallbacks[templateType] || 'Great result for the club! #Football';
  }


  logContentGeneration(templateType, data, result) {
    try {
      const aiLogSheet = SheetUtils.getOrCreateSheet(
        'AI_Content_Log',
        ['Timestamp', 'Template_Type', 'Tenant', 'Engagement_Score', 'Tokens_Used', 'Content_Preview', 'Success']
      );


      if (aiLogSheet) {
        const values = [
          DateUtils.now().toISOString(),
          templateType,
          multiTenantManager.currentTenant,
          result.engagementScore || 0,
          result.metadata?.tokensUsed || 0,
          result.content.substr(0, 100),
          result.success
        ];


        SheetUtils.appendRowSafe(aiLogSheet, values);
      }
    } catch (error) {
      logger.error('Failed to log content generation', { error: error.toString() });
    }
  }


  /**
   * Generate complete match report with AI analysis
   * @param {string} matchId - Match ID
   * @param {Object} matchData - Complete match data
   * @returns {Promise<Object>} Generated match report
   */
  async generateMatchReport(matchId, matchData) {
    logger.enterFunction('AIContentGenerator.generateMatchReport', { matchId });


    try {
      // Gather comprehensive match data
      const events = this.getMatchEvents(matchId);
      const playerStats = this.getMatchPlayerStats(matchId);
      const contextualData = this.getMatchContext(matchData);


      // Generate different sections
      const sections = await Promise.all([
        this.generateContent('match_report', {
          clubName: matchData.homeTeam,
          opponent: matchData.awayTeam,
          homeScore: matchData.homeScore,
          awayScore: matchData.awayScore,
          events: events.summary
        }),
        this.generatePlayerAnalysis(playerStats),
        this.generateTacticalAnalysis(events, matchData),
        this.generateLookAhead(contextualData)
      ]);


      const fullReport = {
        title: `Match Report: ${matchData.homeTeam} ${matchData.homeScore}-${matchData.awayScore} ${matchData.awayTeam}`,
        sections: {
          summary: sections[0].content,
          playerAnalysis: sections[1].content,
          tacticalAnalysis: sections[2].content,
          lookAhead: sections[3].content
        },
        metadata: {
          matchId: matchId,
          generatedAt: DateUtils.now().toISOString(),
          wordCount: sections.reduce((total, s) => total + (s.content?.length || 0), 0),
          engagementScore: Math.max(...sections.map(s => s.engagementScore || 0))
        }
      };


      // Save report to sheet
      this.saveMatchReport(matchId, fullReport);


      logger.exitFunction('AIContentGenerator.generateMatchReport', {
        success: true,
        wordCount: fullReport.metadata.wordCount
      });


      return { success: true, report: fullReport };


    } catch (error) {
      logger.error('Match report generation failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }
}


// ===== PREDICTIVE ANALYTICS ENGINE =====


/**
 * Engagement Predictor using historical data and ML algorithms
 */
class EngagementPredictor extends BaseAutomationComponent {
  
  constructor() {
    super('EngagementPredictor');
    this.historicalData = new Map();
    this.models = new Map();
    this.features = [];
  }


  doInitialize() {
    logger.enterFunction('EngagementPredictor.doInitialize');
    
    try {
      // Load historical engagement data
      this.loadHistoricalData();
      
      // Initialize feature extractors
      this.initializeFeatures();
      
      // Train prediction models
      this.trainModels();


      logger.exitFunction('EngagementPredictor.doInitialize', { 
        success: true,
        historicalDataPoints: this.historicalData.size
      });
      return true;
    } catch (error) {
      logger.error('EngagementPredictor initialization failed', { error: error.toString() });
      return false;
    }
  }


  loadHistoricalData() {
    try {
      // Load from social posts tracking sheet
      const socialSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.SOCIAL_POSTS'));
      if (!socialSheet) return;


      const data = socialSheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const [timestamp, eventType, payload, status, response] = row;
        
        if (status === 'SUCCESS' && response) {
          try {
            const responseData = JSON.parse(response);
            const payloadData = JSON.parse(payload);
            
            this.historicalData.set(StringUtils.generateId('hist'), {
              timestamp: new Date(timestamp),
              eventType: eventType,
              payload: payloadData,
              engagement: this.extractEngagementMetrics(responseData),
              contextualFeatures: this.extractContextualFeatures(timestamp, payloadData)
            });
          } catch (parseError) {
            // Skip malformed data
          }
        }
      }


      logger.info('Historical engagement data loaded', {
        dataPoints: this.historicalData.size
      });
    } catch (error) {
      logger.error('Failed to load historical data', { error: error.toString() });
    }
  }


  extractEngagementMetrics(responseData) {
    // Extract engagement metrics from API responses
    return {
      likes: responseData.likes || 0,
      shares: responseData.shares || 0,
      comments: responseData.comments || 0,
      clicks: responseData.clicks || 0,
      impressions: responseData.impressions || 0,
      engagementRate: this.calculateEngagementRate(responseData)
    };
  }


  calculateEngagementRate(responseData) {
    const totalEngagement = (responseData.likes || 0) + 
                           (responseData.shares || 0) + 
                           (responseData.comments || 0);
    const impressions = responseData.impressions || 1;
    return (totalEngagement / impressions) * 100;
  }


  extractContextualFeatures(timestamp, payload) {
    const date = new Date(timestamp);
    return {
      dayOfWeek: date.getDay(),
      hourOfDay: date.getHours(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isMatchDay: this.isMatchDay(date),
      eventType: payload.event_type || 'unknown',
      hasPlayer: !!(payload.player_name || payload.player),
      hasScore: !!(payload.home_score || payload.away_score),
      textLength: (payload.caption || payload.message || '').length,
      hasHashtags: /\#/.test(payload.caption || payload.message || ''),
      seasonMonth: date.getMonth() + 1,
      isHighActivity: this.isHighActivityPeriod(date)
    };
  }


  isMatchDay(date) {
    // Check if date is a match day (simplified)
    return date.getDay() === 6 || date.getDay() === 0; // Weekend
  }


  isHighActivityPeriod(date) {
    // Check if during high activity period (e.g., around matches)
    const hour = date.getHours();
    return hour >= 14 && hour <= 18; // Afternoon/early evening
  }


  initializeFeatures() {
    this.features = [
      'dayOfWeek',
      'hourOfDay', 
      'isWeekend',
      'isMatchDay',
      'eventType_encoded',
      'hasPlayer',
      'hasScore',
      'textLength',
      'hasHashtags',
      'seasonMonth',
      'isHighActivity'
    ];
  }


  trainModels() {
    if (this.historicalData.size < 10) {
      logger.warn('Insufficient historical data for model training');
      return;
    }


    // Simple regression model for engagement prediction
    const trainingData = Array.from(this.historicalData.values()).map(item => ({
      features: this.extractFeatureVector(item.contextualFeatures, item.payload),
      target: item.engagement.engagementRate
    }));


    // Train different models for different event types
    const eventTypes = [...new Set(trainingData.map(d => d.features[4]))]; // eventType_encoded


    eventTypes.forEach(eventType => {
      const eventData = trainingData.filter(d => d.features[4] === eventType);
      if (eventData.length >= 5) {
        const model = this.trainSimpleRegression(eventData);
        this.models.set(eventType, model);
      }
    });


    logger.info('Prediction models trained', {
      modelCount: this.models.size,
      eventTypes: eventTypes
    });
  }


  extractFeatureVector(contextualFeatures, payload) {
    return [
      contextualFeatures.dayOfWeek,
      contextualFeatures.hourOfDay,
      contextualFeatures.isWeekend ? 1 : 0,
      contextualFeatures.isMatchDay ? 1 : 0,
      this.encodeEventType(contextualFeatures.eventType),
      contextualFeatures.hasPlayer ? 1 : 0,
      contextualFeatures.hasScore ? 1 : 0,
      Math.min(contextualFeatures.textLength / 280, 1), // Normalize
      contextualFeatures.hasHashtags ? 1 : 0,
      contextualFeatures.seasonMonth,
      contextualFeatures.isHighActivity ? 1 : 0
    ];
  }


  encodeEventType(eventType) {
    const typeMap = {
      'goal': 1,
      'goal_opposition': 2,
      'card': 3,
      'motm': 4,
      'fixtures_batch': 5,
      'results_batch': 6
    };
    return typeMap[eventType] || 0;
  }


  trainSimpleRegression(trainingData) {
    // Simple linear regression implementation
    const n = trainingData.length;
    const features = trainingData.map(d => d.features);
    const targets = trainingData.map(d => d.target);


    // Calculate coefficients (simplified version)
    const weights = new Array(this.features.length).fill(0);
    const learningRate = 0.01;
    const iterations = 100;


    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < n; i++) {
        const prediction = this.predict(features[i], weights);
        const error = targets[i] - prediction;
        
        // Update weights
        for (let j = 0; j < weights.length; j++) {
          weights[j] += learningRate * error * features[i][j];
        }
      }
    }


    return { weights, trainingSize: n };
  }


  predict(features, weights) {
    let sum = 0;
    for (let i = 0; i < features.length; i++) {
      sum += features[i] * weights[i];
    }
    return Math.max(0, Math.min(100, sum)); // Clamp between 0-100%
  }


  /**
   * Predict engagement score for content
   * @param {string} content - Content to analyze
   * @param {string} templateType - Type of content
   * @param {Object} data - Content context data
   * @returns {Promise<number>} Predicted engagement score (0-100)
   */
  async predictEngagement(content, templateType, data) {
    logger.testHook('engagement_prediction', { templateType });


    try {
      const now = DateUtils.now();
      const contextualFeatures = this.extractContextualFeatures(now.toISOString(), {
        event_type: templateType,
        ...data
      });


      contextualFeatures.textLength = content.length;
      contextualFeatures.hasHashtags = /\#/.test(content);


      const features = this.extractFeatureVector(contextualFeatures, data);
      const encodedEventType = this.encodeEventType(templateType);
      
      const model = this.models.get(encodedEventType);
      if (model) {
        const prediction = this.predict(features, model.weights);
        logger.debug('Engagement prediction made', {
          templateType,
          prediction,
          modelTrainingSize: model.trainingSize
        });
        return prediction;
      } else {
        // Fallback: rule-based prediction
        return this.ruleBasedPrediction(content, templateType, contextualFeatures);
      }
    } catch (error) {
      logger.error('Engagement prediction failed', { error: error.toString() });
      return 50; // Default middle score
    }
  }


  ruleBasedPrediction(content, templateType, contextualFeatures) {
    let score = 50; // Base score


    // Time-based adjustments
    if (contextualFeatures.isHighActivity) score += 15;
    if (contextualFeatures.isWeekend) score += 10;
    if (contextualFeatures.isMatchDay) score += 20;


    // Content-based adjustments
    if (templateType === 'goal_celebration') score += 25;
    if (templateType === 'match_report') score += 10;
    if (contextualFeatures.hasPlayer) score += 10;
    if (contextualFeatures.hasScore) score += 15;
    if (contextualFeatures.hasHashtags) score += 5;


    // Length adjustments
    if (contextualFeatures.textLength > 200) score -= 10;
    if (contextualFeatures.textLength < 50) score -= 15;


    return Math.max(0, Math.min(100, score));
  }


  /**
   * Get optimal posting time for content
   * @param {string} contentType - Type of content
   * @param {Object} context - Context data
   * @returns {Date} Optimal posting time
   */
  getOptimalPostingTime(contentType, context = {}) {
    logger.testHook('optimal_timing_calculation', { contentType });


    const now = DateUtils.now();
    const currentHour = now.getHours();


    // Analyze historical data for optimal times
    const historicalOptimalTimes = this.analyzeOptimalTimes(contentType);
    
    if (historicalOptimalTimes.length > 0) {
      const avgOptimalHour = historicalOptimalTimes.reduce((sum, time) => sum + time.hour, 0) / historicalOptimalTimes.length;
      
      // If we're close to optimal time, post now
      if (Math.abs(currentHour - avgOptimalHour) <= 2) {
        return now;
      }
      
      // Otherwise schedule for next optimal time
      const nextOptimal = new Date(now);
      nextOptimal.setHours(Math.round(avgOptimalHour), 0, 0, 0);
      
      // If that time has passed today, schedule for tomorrow
      if (nextOptimal <= now) {
        nextOptimal.setDate(nextOptimal.getDate() + 1);
      }
      
      return nextOptimal;
    }


    // Fallback to rule-based optimal times
    const optimalTimes = {
      'goal_celebration': { hour: 18, minute: 0 }, // Peak engagement time
      'match_report': { hour: 21, minute: 30 },   // After match settling
      'player_spotlight': { hour: 12, minute: 0 }, // Lunch time
      'match_preview': { hour: 10, minute: 0 },    // Morning preview
      'fixtures_batch': { hour: 9, minute: 0 },    // Start of week
      'results_batch': { hour: 20, minute: 0 }     // Sunday evening
    };


    const optimal = optimalTimes[contentType] || { hour: 18, minute: 0 };
    const optimalTime = new Date(now);
    optimalTime.setHours(optimal.hour, optimal.minute, 0, 0);


    // If time has passed, schedule for tomorrow
    if (optimalTime <= now) {
      optimalTime.setDate(optimalTime.getDate() + 1);
    }


    return optimalTime;
  }


  analyzeOptimalTimes(contentType) {
    const relevantData = Array.from(this.historicalData.values())
      .filter(item => item.payload.event_type === contentType)
      .sort((a, b) => b.engagement.engagementRate - a.engagement.engagementRate)
      .slice(0, 10); // Top 10 performing posts


    return relevantData.map(item => ({
      hour: item.timestamp.getHours(),
      dayOfWeek: item.timestamp.getDay(),
      engagement: item.engagement.engagementRate
    }));
  }
}


// Create circuit breaker for OpenAI
if (!circuitBreakers.openai) {
  circuitBreakers.openai = new CircuitBreaker('OpenAI', 3, 300000);
}


// Create and export instances
const multiTenantManager = new MultiTenantManager();
const aiContentGenerator = new AIContentGenerator();


// Export for global access
globalThis.MultiTenantManager = MultiTenantManager;
globalThis.AIContentGenerator = AIContentGenerator;
globalThis.EngagementPredictor = EngagementPredictor;


globalThis.multiTenantManager = multiTenantManager;
globalThis.aiContentGenerator = aiContentGenerator;
