/**
 * @fileoverview Syston Tigers Automation - Webhook Handlers & Advanced Scheduling
 * @version 5.1.0
 * @author Senior Software Architect
 * 
 * Advanced webhook handling, intelligent scheduling, and data synchronization
 */


// ===== WEBHOOK HANDLER SYSTEM =====


/**
 * Central Webhook Handler for all incoming webhooks
 */
class CentralWebhookHandler extends BaseAutomationComponent {
  
  constructor() {
    super('CentralWebhookHandler');
    this.handlers = new Map();
    this.security = webhookSecurity;
  }


  /**
   * Register webhook handlers for different event types
   */
  doInitialize() {
    logger.enterFunction('CentralWebhookHandler.doInitialize');
    
    try {
      // Register all webhook handlers
      this.registerHandler('video_processing_complete', this.handleVideoProcessingComplete.bind(this));
      this.registerHandler('youtube_upload_complete', this.handleYouTubeUploadComplete.bind(this));
      this.registerHandler('canva_design_complete', this.handleCanvaDesignComplete.bind(this));
      this.registerHandler('gotm_vote_received', this.handleGotmVoteReceived.bind(this));
      this.registerHandler('xbotgo_status_update', this.handleXbotGoStatusUpdate.bind(this));
      this.registerHandler('email_fixture_received', this.handleEmailFixtureReceived.bind(this));
      
      logger.exitFunction('CentralWebhookHandler.doInitialize', { 
        success: true,
        handlersRegistered: this.handlers.size
      });
      return true;
    } catch (error) {
      logger.error('CentralWebhookHandler initialization failed', { error: error.toString() });
      return false;
    }
  }


  registerHandler(eventType, handler) {
    this.handlers.set(eventType, handler);
    logger.debug(`Registered webhook handler for: ${eventType}`);
  }


  /**
   * Main webhook processing function (called by Apps Script web app)
   * @param {Object} request - HTTP request object
   * @returns {Object} Response object
   */
  processWebhook(request) {
    logger.enterFunction('CentralWebhookHandler.processWebhook');
    
    const perfId = performanceMonitor.startOperation('webhook_processing', {
      method: request.method,
      contentLength: request.postData?.contents?.length || 0
    });


    try {
      // Security validation
      const securityResult = this.security.validateWebhook(request, 'make.com');
      if (!securityResult.valid) {
        performanceMonitor.endOperation(perfId, false, {
          reason: 'security_failed',
          errors: securityResult.errors
        });
        
        return {
          success: false,
          error: 'Security validation failed',
          details: securityResult.errors
        };
      }


      // Parse payload
      let payload;
      try {
        payload = JSON.parse(request.postData.contents);
      } catch (parseError) {
        performanceMonitor.endOperation(perfId, false, { reason: 'invalid_json' });
        return {
          success: false,
          error: 'Invalid JSON payload'
        };
      }


      logger.testHook('webhook_payload_received', {
        eventType: payload.event_type,
        source: payload.source,
        timestamp: payload.timestamp
      });


      // Find and execute handler
      const handler = this.handlers.get(payload.event_type);
      if (!handler) {
        logger.warn('No handler found for event type', { 
          eventType: payload.event_type,
          availableHandlers: Array.from(this.handlers.keys())
        });
        
        performanceMonitor.endOperation(perfId, false, { reason: 'no_handler' });
        return {
          success: false,
          error: `No handler for event type: ${payload.event_type}`
        };
      }


      // Execute handler with circuit breaker protection
      const result = circuitBreakers.make.execute(async () => {
        return await handler(payload, request);
      });


      performanceMonitor.endOperation(perfId, result.success, {
        eventType: payload.event_type,
        handlerResult: result.success
      });


      logger.exitFunction('CentralWebhookHandler.processWebhook', {
        success: result.success,
        eventType: payload.event_type
      });


      return result;


    } catch (error) {
      performanceMonitor.endOperation(perfId, false, { 
        reason: 'exception',
        error: error.toString()
      });
      
      logger.error('Webhook processing failed', { error: error.toString() });
      return {
        success: false,
        error: 'Internal processing error'
      };
    }
  }


  // ===== SPECIFIC WEBHOOK HANDLERS =====


  /**
   * Handle video processing completion from Make.com/CloudConvert
   */
  async handleVideoProcessingComplete(payload, request) {
    logger.enterFunction('CentralWebhookHandler.handleVideoProcessingComplete', payload);
    
    try {
      const { clip_id, output_url, status, error_details } = payload;
      
      if (!clip_id) {
        return { success: false, error: 'Missing clip_id' };
      }


      // Update video clip status in sheet
      const updateResult = this.updateVideoClipStatus(clip_id, status, output_url, error_details);
      
      // If successful, trigger YouTube upload
      if (status === 'completed' && output_url) {
        const videoManager = coordinator.components.get('VideoClipsManager');
        if (videoManager) {
          const clipData = this.getClipDataById(clip_id);
          if (clipData) {
            const uploadResult = await videoManager.uploadToYouTube(clipData, output_url);
            logger.info('YouTube upload triggered', { clip_id, uploadResult });
          }
        }
      }


      logger.exitFunction('CentralWebhookHandler.handleVideoProcessingComplete', { 
        success: updateResult 
      });
      
      return { success: updateResult, clip_id: clip_id };
      
    } catch (error) {
      logger.error('Video processing webhook failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Handle YouTube upload completion
   */
  async handleYouTubeUploadComplete(payload, request) {
    logger.enterFunction('CentralWebhookHandler.handleYouTubeUploadComplete', payload);
    
    try {
      const { clip_id, youtube_url, upload_status, video_id } = payload;
      
      if (!clip_id || !youtube_url) {
        return { success: false, error: 'Missing required fields' };
      }


      // Update clip with YouTube URL
      const updateResult = this.updateClipYouTubeUrl(clip_id, youtube_url, video_id);
      
      // Update website data if successful
      if (updateResult && upload_status === 'success') {
        this.updateWebsiteVideoData(clip_id, youtube_url);
      }


      logger.exitFunction('CentralWebhookHandler.handleYouTubeUploadComplete', { 
        success: updateResult 
      });
      
      return { success: updateResult, youtube_url: youtube_url };
      
    } catch (error) {
      logger.error('YouTube upload webhook failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Handle Canva design completion
   */
  async handleCanvaDesignComplete(payload, request) {
    logger.enterFunction('CentralWebhookHandler.handleCanvaDesignComplete', payload);
    
    try {
      const { design_id, design_url, event_type, social_platform } = payload;
      
      if (!design_id || !design_url) {
        return { success: false, error: 'Missing design information' };
      }


      // Log the completed design
      this.logCanvaDesignCompletion(design_id, design_url, event_type, social_platform);
      
      // Auto-post to social media if configured
      if (social_platform && this.shouldAutoPost(event_type)) {
        const postResult = await this.autoPostToSocial(design_url, social_platform, payload);
        logger.info('Auto-posted to social media', { 
          platform: social_platform, 
          success: postResult.success 
        });
      }


      logger.exitFunction('CentralWebhookHandler.handleCanvaDesignComplete', { 
        success: true 
      });
      
      return { success: true, design_url: design_url };
      
    } catch (error) {
      logger.error('Canva design webhook failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Handle GOTM vote received
   */
  async handleGotmVoteReceived(payload, request) {
    logger.enterFunction('CentralWebhookHandler.handleGotmVoteReceived', payload);
    
    try {
      const { player, goal_id, vote_source, voter_info, month_year } = payload;
      
      if (!player || !goal_id || !vote_source) {
        return { success: false, error: 'Missing vote information' };
      }


      // Record vote in GOTM sheet
      const voteResult = this.recordGotmVote(player, goal_id, vote_source, voter_info, month_year);
      
      // Check if voting should be closed (reached threshold)
      const voteCount = this.getVoteCount(month_year);
      const threshold = getConfig('VIDEO.GOTM.AUTO_CLOSE_THRESHOLD', 100);
      
      if (voteCount >= threshold) {
        const videoManager = coordinator.components.get('VideoClipsManager');
        if (videoManager) {
          logger.info('Auto-closing GOTM voting due to threshold', { 
            voteCount, threshold 
          });
          await videoManager.closeGotmVoting(month_year);
        }
      }


      logger.exitFunction('CentralWebhookHandler.handleGotmVoteReceived', { 
        success: voteResult 
      });
      
      return { success: voteResult, vote_count: voteCount };
      
    } catch (error) {
      logger.error('GOTM vote webhook failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Handle XbotGo status updates
   */
  async handleXbotGoStatusUpdate(payload, request) {
    logger.enterFunction('CentralWebhookHandler.handleXbotGoStatusUpdate', payload);
    
    try {
      const { device_id, status, connection_state, last_update } = payload;
      
      // Update XbotGo status tracking
      this.updateXbotGoStatus(device_id, status, connection_state, last_update);
      
      // If device is offline, try to reconnect
      if (connection_state === 'offline') {
        const xbotgoManager = coordinator.components.get('XbotGoIntegrationManager');
        if (xbotgoManager) {
          logger.info('Attempting XbotGo reconnection');
          const reconnectResult = await xbotgoManager.testConnection();
          return { success: true, reconnect_attempted: true, reconnect_result: reconnectResult };
        }
      }


      logger.exitFunction('CentralWebhookHandler.handleXbotGoStatusUpdate', { 
        success: true 
      });
      
      return { success: true, device_status: status };
      
    } catch (error) {
      logger.error('XbotGo status webhook failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  /**
   * Handle email fixture ingestion
   */
  async handleEmailFixtureReceived(payload, request) {
    logger.enterFunction('CentralWebhookHandler.handleEmailFixtureReceived', payload);
    
    try {
      const { email_subject, email_body, attachments, sender } = payload;
      
      // Parse fixture information from email
      const fixtures = this.parseFixturesFromEmail(email_subject, email_body, attachments);
      
      if (fixtures.length === 0) {
        return { success: true, message: 'No fixtures found in email', fixtures_added: 0 };
      }


      // Add fixtures to sheet
      let addedCount = 0;
      const fixturesSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.FIXTURES'));
      
      for (const fixture of fixtures) {
        const duplicateCheck = this.checkFixtureDuplicate(fixture);
        if (!duplicateCheck.isDuplicate) {
          const values = [
            fixture.date,
            fixture.competition || 'League',
            fixture.homeTeam,
            fixture.awayTeam,
            fixture.venue || 'TBC',
            fixture.kickOff || '15:00',
            'N' // Posted status
          ];
          
          if (SheetUtils.appendRowSafe(fixturesSheet, values)) {
            addedCount++;
          }
        }
      }


      logger.exitFunction('CentralWebhookHandler.handleEmailFixtureReceived', { 
        success: true,
        fixtures_added: addedCount
      });
      
      return { 
        success: true, 
        fixtures_found: fixtures.length,
        fixtures_added: addedCount
      };
      
    } catch (error) {
      logger.error('Email fixture webhook failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  // ===== UTILITY METHODS FOR WEBHOOK HANDLERS =====


  updateVideoClipStatus(clipId, status, outputUrl, errorDetails) {
    try {
      const clipsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.VIDEO_CLIPS'));
      if (!clipsSheet) return false;


      // Find clip by ID and update status
      const data = clipsSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0].includes(clipId)) { // Assuming clip ID is in match_id or similar
          const statusCell = `I${i + 1}`;
          const urlCell = `J${i + 1}`;
          
          SheetUtils.setCellValue(clipsSheet, statusCell, status);
          if (outputUrl) {
            SheetUtils.setCellValue(clipsSheet, urlCell, outputUrl);
          }
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error('Failed to update video clip status', { error: error.toString() });
      return false;
    }
  }


  recordGotmVote(player, goalId, voteSource, voterInfo, monthYear) {
    try {
      const votesSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.GOTM_VOTES'));
      if (!votesSheet) return false;


      const values = [
        DateUtils.now().toISOString(),
        player,
        goalId,
        voteSource,
        JSON.stringify(voterInfo).substr(0, 200),
        monthYear
      ];


      return SheetUtils.appendRowSafe(votesSheet, values);
    } catch (error) {
      logger.error('Failed to record GOTM vote', { error: error.toString() });
      return false;
    }
  }


  parseFixturesFromEmail(subject, body, attachments) {
    // Email parsing logic would go here
    // This is a simplified implementation
    const fixtures = [];
    
    try {
      // Look for common patterns in football fixture emails
      const fixturePatterns = [
        /(\w+\s+\w+)\s+vs?\s+(\w+\s+\w+).*?(\d{1,2}\/\d{1,2}\/\d{2,4})/gi,
        /(\d{1,2}\/\d{1,2}\/\d{2,4}).*?(\w+\s+\w+)\s+vs?\s+(\w+\s+\w+)/gi
      ];


      const combinedText = `${subject} ${body}`;
      
      fixturePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(combinedText)) !== null) {
          fixtures.push({
            homeTeam: match[1] || match[2],
            awayTeam: match[2] || match[3],
            date: match[3] || match[1],
            competition: 'League',
            venue: 'TBC',
            kickOff: '15:00'
          });
        }
      });


      return fixtures;
    } catch (error) {
      logger.error('Failed to parse fixtures from email', { error: error.toString() });
      return [];
    }
  }
}


// ===== ADVANCED SCHEDULING SYSTEM =====


/**
 * Intelligent Scheduler with dynamic timing and workload balancing
 */
class AdvancedScheduler extends BaseAutomationComponent {
  
  constructor() {
    super('AdvancedScheduler');
    this.scheduledJobs = new Map();
    this.jobHistory = [];
    this.workloadManager = new WorkloadManager();
  }


  doInitialize() {
    logger.enterFunction('AdvancedScheduler.doInitialize');
    
    try {
      // Set up intelligent scheduling for various tasks
      this.scheduleIntelligentJobs();
      
      logger.exitFunction('AdvancedScheduler.doInitialize', { 
        success: true,
        jobsScheduled: this.scheduledJobs.size
      });
      return true;
    } catch (error) {
      logger.error('AdvancedScheduler initialization failed', { error: error.toString() });
      return false;
    }
  }


  scheduleIntelligentJobs() {
    // Player stats summary - adaptive timing based on activity
    this.scheduleAdaptiveJob('player_stats_summary', {
      baseSchedule: { dayOfMonth: 14, hour: 10 },
      adaptiveRules: {
        highActivity: { dayOffset: -2 }, // Post earlier if lots of matches
        lowActivity: { dayOffset: +2 }   // Post later if quiet period
      },
      handler: () => postPlayerStatsSummary()
    });


    // Monthly fixtures - intelligent timing based on fixture density
    this.scheduleAdaptiveJob('monthly_fixtures', {
      baseSchedule: { dayOfMonth: 25, hour: 12 },
      adaptiveRules: {
        manyFixtures: { dayOffset: -3 }, // Earlier if many fixtures
        fewFixtures: { dayOffset: +2 }   // Later if few fixtures
      },
      handler: () => postMonthlyFixturesSummary()
    });


    // Batch posting - dynamic based on fixture availability
    this.scheduleWorkloadAwareJob('batch_posting', {
      checkInterval: 'hourly',
      conditions: {
        minFixtures: 2,
        maxProcessedToday: 5
      },
      handler: () => this.intelligentBatchPosting()
    });


    // Video processing queue - resource-aware scheduling
    this.scheduleWorkloadAwareJob('video_processing', {
      checkInterval: '30min',
      conditions: {
        minQueueSize: 1,
        maxConcurrentJobs: 3,
        avoidPeakHours: true
      },
      handler: () => processVideoClipQueue()
    });


    // System health monitoring
    this.scheduleJob('system_health_check', {
      schedule: { interval: 'hourly' },
      handler: () => this.performSystemHealthCheck()
    });
  }


  scheduleAdaptiveJob(jobName, config) {
    const job = {
      name: jobName,
      type: 'adaptive',
      config: config,
      lastRun: null,
      nextRun: this.calculateNextAdaptiveRun(config),
      enabled: true
    };


    this.scheduledJobs.set(jobName, job);
    logger.info(`Scheduled adaptive job: ${jobName}`, { nextRun: job.nextRun });
  }


  scheduleWorkloadAwareJob(jobName, config) {
    const job = {
      name: jobName,
      type: 'workload_aware',
      config: config,
      lastRun: null,
      nextCheck: this.calculateNextCheck(config.checkInterval),
      enabled: true
    };


    this.scheduledJobs.set(jobName, job);
    logger.info(`Scheduled workload-aware job: ${jobName}`, { nextCheck: job.nextCheck });
  }


  calculateNextAdaptiveRun(config) {
    const now = DateUtils.now();
    const baseSchedule = config.baseSchedule;
    
    // Get activity level for adaptive adjustment
    const activityLevel = this.getActivityLevel();
    const adaptiveRules = config.adaptiveRules;
    
    let dayOffset = 0;
    if (activityLevel === 'high' && adaptiveRules.highActivity) {
      dayOffset = adaptiveRules.highActivity.dayOffset;
    } else if (activityLevel === 'low' && adaptiveRules.lowActivity) {
      dayOffset = adaptiveRules.lowActivity.dayOffset;
    }


    const targetDay = baseSchedule.dayOfMonth + dayOffset;
    const nextRun = new Date(now.getFullYear(), now.getMonth(), targetDay, baseSchedule.hour, 0, 0);


    // If date has passed this month, schedule for next month
    if (nextRun < now) {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }


    return nextRun;
  }


  getActivityLevel() {
    try {
      // Analyze recent activity to determine if we're in a busy period
      const recentEvents = this.getRecentEventCount(7); // Last 7 days
      const recentMatches = this.getRecentMatchCount(7);
      
      const activityScore = recentEvents + (recentMatches * 3);
      
      if (activityScore > 20) return 'high';
      if (activityScore < 5) return 'low';
      return 'normal';
    } catch (error) {
      logger.error('Failed to calculate activity level', { error: error.toString() });
      return 'normal';
    }
  }


  getRecentEventCount(days) {
    try {
      const liveSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.LIVE'));
      if (!liveSheet) return 0;


      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);


      const data = liveSheet.getDataRange().getValues();
      let eventCount = 0;


      // Count events in the last N days (simplified)
      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][0]) { // Has minute value
          eventCount++;
        }
        if (eventCount > 50) break; // Cap for performance
      }


      return eventCount;
    } catch (error) {
      return 0;
    }
  }


  getRecentMatchCount(days) {
    try {
      const resultsSheet = SheetUtils.getOrCreateSheet(getConfig('SHEETS.RESULTS'));
      if (!resultsSheet) return 0;


      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);


      const data = resultsSheet.getDataRange().getValues();
      let matchCount = 0;


      for (let i = 1; i < data.length; i++) {
        const matchDate = DateUtils.parseDate(data[i][0]);
        if (matchDate && matchDate >= cutoffDate) {
          matchCount++;
        }
      }


      return matchCount;
    } catch (error) {
      return 0;
    }
  }


  /**
   * Run scheduled jobs check (called by trigger)
   */
  runScheduledJobsCheck() {
    logger.enterFunction('AdvancedScheduler.runScheduledJobsCheck');
    
    const now = DateUtils.now();
    const results = [];


    for (const [jobName, job] of this.scheduledJobs) {
      if (!job.enabled) continue;


      try {
        let shouldRun = false;


        if (job.type === 'adaptive') {
          shouldRun = now >= job.nextRun;
        } else if (job.type === 'workload_aware') {
          shouldRun = now >= job.nextCheck && this.workloadManager.canRunJob(job);
        }


        if (shouldRun) {
          logger.info(`Executing scheduled job: ${jobName}`);
          
          const jobResult = this.executeScheduledJob(job);
          results.push({
            job: jobName,
            success: jobResult.success,
            result: jobResult
          });


          // Update job scheduling
          this.updateJobSchedule(job, jobResult.success);
        }
      } catch (error) {
        logger.error(`Scheduled job ${jobName} failed`, { error: error.toString() });
        results.push({
          job: jobName,
          success: false,
          error: error.toString()
        });
      }
    }


    logger.exitFunction('AdvancedScheduler.runScheduledJobsCheck', {
      jobsExecuted: results.length,
      results: results
    });


    return {
      success: true,
      jobsExecuted: results.length,
      results: results
    };
  }


  executeScheduledJob(job) {
    const perfId = performanceMonitor.startOperation(`scheduled_job_${job.name}`);


    try {
      const result = job.config.handler();
      
      // Record job execution
      this.jobHistory.push({
        jobName: job.name,
        executedAt: DateUtils.now().toISOString(),
        success: result?.success || true,
        duration: Date.now() - perfId
      });


      performanceMonitor.endOperation(perfId, result?.success || true);
      return result || { success: true };
    } catch (error) {
      performanceMonitor.endOperation(perfId, false);
      throw error;
    }
  }


  updateJobSchedule(job, success) {
    job.lastRun = DateUtils.now();
    
    if (job.type === 'adaptive') {
      job.nextRun = this.calculateNextAdaptiveRun(job.config);
    } else if (job.type === 'workload_aware') {
      job.nextCheck = this.calculateNextCheck(job.config.checkInterval);
    }


    logger.debug(`Updated schedule for job: ${job.name}`, {
      nextRun: job.nextRun || job.nextCheck,
      success: success
    });
  }


  intelligentBatchPosting() {
    logger.enterFunction('AdvancedScheduler.intelligentBatchPosting');


    try {
      // Check fixture availability
      const currentWeekend = this.getCurrentWeekend();
      const fixtures = this.getFixturesForPeriod(currentWeekend.start, currentWeekend.end);
      
      if (fixtures.length >= 2 && fixtures.length <= 5) {
        // Post fixture batch
        const batchManager = coordinator.components.get('BatchPostingManager');
        if (batchManager) {
          const result = batchManager.postLeagueFixturesBatch();
          logger.info('Intelligent batch posting executed', result);
          return result;
        }
      }


      return { success: true, message: 'No suitable fixtures for batch posting' };
    } catch (error) {
      logger.error('Intelligent batch posting failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  performSystemHealthCheck() {
    logger.enterFunction('AdvancedScheduler.performSystemHealthCheck');


    try {
      const healthStatus = enhancedCoordinator.getSystemHealthStatus();
      
      // Alert if health score is concerning
      if (healthStatus.healthScore < 70) {
        logger.warn('System health degraded', {
          healthScore: healthStatus.healthScore,
          status: healthStatus.status
        });
        
        // Could trigger alerts or corrective actions here
        this.triggerHealthAlert(healthStatus);
      }


      return { success: true, healthStatus: healthStatus };
    } catch (error) {
      logger.error('System health check failed', { error: error.toString() });
      return { success: false, error: error.toString() };
    }
  }


  triggerHealthAlert(healthStatus) {
    // Implementation for health alerts (email, webhook, etc.)
    logger.info('Health alert triggered', healthStatus);
  }
}


// ===== WORKLOAD MANAGER =====


/**
 * Manages system workload and resource allocation
 */
class WorkloadManager {
  constructor() {
    this.runningJobs = new Map();
    this.resourceLimits = {
      maxConcurrentJobs: 5,
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      maxExecutionTime: 5 * 60 * 1000     // 5 minutes
    };
  }


  canRunJob(job) {
    // Check current workload
    if (this.runningJobs.size >= this.resourceLimits.maxConcurrentJobs) {
      return false;
    }


    // Check specific job conditions
    if (job.config.conditions) {
      const conditions = job.config.conditions;
      
      // Check if we should avoid peak hours
      if (conditions.avoidPeakHours && this.isPeakHour()) {
        return false;
      }


      // Check daily limits
      if (conditions.maxProcessedToday) {
        const todayCount = this.getTodayJobCount(job.name);
        if (todayCount >= conditions.maxProcessedToday) {
          return false;
        }
      }


      // Check queue size conditions
      if (conditions.minQueueSize) {
        const queueSize = this.getJobQueueSize(job.name);
        if (queueSize < conditions.minQueueSize) {
          return false;
        }
      }
    }


    return true;
  }


  isPeakHour() {
    const hour = DateUtils.now().getHours();
    // Avoid 9-11 AM and 2-4 PM (typical high usage)
    return (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16);
  }


  getTodayJobCount(jobName) {
    // Count jobs run today (simplified implementation)
    return 0;
  }


  getJobQueueSize(jobName) {
    // Get queue size for specific job type
    if (jobName === 'video_processing') {
      const videoManager = coordinator.components.get('VideoClipsManager');
      return videoManager?.processingQueue?.length || 0;
    }
    return 0;
  }
}


// Create and export instances
const centralWebhookHandler = new CentralWebhookHandler();
const advancedScheduler = new AdvancedScheduler();
const workloadManager = new WorkloadManager();


// Export for global access
globalThis.CentralWebhookHandler = CentralWebhookHandler;
globalThis.AdvancedScheduler = AdvancedScheduler;
globalThis.WorkloadManager = WorkloadManager;


globalThis.centralWebhookHandler = centralWebhookHandler;
globalThis.advancedScheduler = advancedScheduler;
globalThis.workloadManager = workloadManager;


// ===== ENHANCED WEB APP DOPOST FUNCTION =====


/**
 * Enhanced doPost function for Google Apps Script web app
 * This replaces any existing doPost function
 */
function doPost(e) {
  logger.enterFunction('doPost', {
    method: e.method,
    contentLength: e.postData?.contents?.length || 0
  });


  try {
    // Process webhook through central handler
    const result = centralWebhookHandler.processWebhook(e);
    
    // Return proper HTTP response
    const response = ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);


    if (!result.success) {
      // Set appropriate HTTP status (Apps Script limitation: can't set actual status codes)
      response.setContent(JSON.stringify({
        ...result,
        http_status: 400
      }));
    }


    logger.exitFunction('doPost', { success: result.success });
    return response;


  } catch (error) {
    logger.error('doPost failed', { error: error.toString() });
    
    const errorResponse = {
      success: false,
      error: 'Internal server error',
      timestamp: DateUtils.now().toISOString()
    };


    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    logger.flush();
  }
}


// Export doPost function
globalThis.doPost = doPost;
