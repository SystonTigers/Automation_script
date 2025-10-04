@echo off
echo ========================================
echo  SYSTON TIGERS - DEPLOY NEW FEATURES
echo ========================================
echo.
echo This will:
echo  1. Create match-events.gs (NEW)
echo  2. Update config.js (routing support)
echo  3. Commit to GitHub
echo  4. Deploy to Apps Script
echo.
pause

cd /d "%~dp0"

echo.
echo [1/5] Creating match-events.gs...
echo.

(
echo /**
echo  * match-events.gs - Complete Match Event Logger
echo  * @version 6.2.0
echo  * Logs ALL match events with timestamps for video editing
echo  */
echo.
echo /**
echo  * Log match kick-off
echo  */
echo function logMatchKickOff^(matchId, opponent, venue, competition^) {
echo   const logger = getLogger^(^);
echo   logger.enterFunction^('logMatchKickOff', { matchId }^);
echo   
echo   try {
echo     const timestamp = new Date^(^);
echo     
echo     logMatchEvent^(matchId, {
echo       timestamp: timestamp,
echo       minute: 0,
echo       eventType: 'KICK_OFF',
echo       description: 'Kick Off',
echo       videoTimestamp: '00:00:00',
echo       clipMarker: true
echo     }^);
echo     
echo     logger.exitFunction^('logMatchKickOff', { success: true }^);
echo     return { success: true };
echo     
echo   } catch ^(error^) {
echo     logger.error^('logMatchKickOff failed', { error: error.toString^(^) }^);
echo     return { success: false, error: error.toString^(^) };
echo   }
echo }
echo.
echo /**
echo  * Log goal with video timestamps
echo  */
echo function logGoalWithTimestamp^(matchId, scorer, minute, assist = null, isPenalty = false^) {
echo   const logger = getLogger^(^);
echo   logger.enterFunction^('logGoalWithTimestamp', { matchId, scorer, minute }^);
echo   
echo   try {
echo     const timestamp = new Date^(^);
echo     const videoTime = calculateVideoTimestamp^(matchId, minute^);
echo     
echo     logMatchEvent^(matchId, {
echo       timestamp: timestamp,
echo       minute: minute,
echo       eventType: 'GOAL',
echo       player: scorer,
echo       assist: assist,
echo       isPenalty: isPenalty,
echo       description: `⚽ GOAL - ${scorer}${assist ? ` ^(Assist: ${assist}^)` : ''}${isPenalty ? ' [PEN]' : ''}`,
echo       videoTimestamp: videoTime,
echo       clipMarker: true,
echo       clipStart: Math.max^(0, minute * 60 - 5^),
echo       clipEnd: minute * 60 + 10
echo     }^);
echo     
echo     logger.exitFunction^('logGoalWithTimestamp', { success: true }^);
echo     return { success: true };
echo     
echo   } catch ^(error^) {
echo     logger.error^('logGoalWithTimestamp failed', { error: error.toString^(^) }^);
echo     return { success: false, error: error.toString^(^) };
echo   }
echo }
echo.
echo /**
echo  * Log half-time
echo  */
echo function logHalfTime^(matchId, homeScore, awayScore^) {
echo   const logger = getLogger^(^);
echo   logger.enterFunction^('logHalfTime', { matchId }^);
echo   
echo   try {
echo     logMatchEvent^(matchId, {
echo       timestamp: new Date^(^),
echo       minute: 45,
echo       eventType: 'HALF_TIME',
echo       description: `Half Time - Score: ${homeScore}-${awayScore}`,
echo       videoTimestamp: calculateVideoTimestamp^(matchId, 45^),
echo       clipMarker: false
echo     }^);
echo     
echo     logger.exitFunction^('logHalfTime', { success: true }^);
echo     return { success: true };
echo     
echo   } catch ^(error^) {
echo     logger.error^('logHalfTime failed', { error: error.toString^(^) }^);
echo     return { success: false, error: error.toString^(^) };
echo   }
echo }
echo.
echo /**
echo  * Log full-time
echo  */
echo function logFullTime^(matchId, finalHomeScore, finalAwayScore^) {
echo   const logger = getLogger^(^);
echo   logger.enterFunction^('logFullTime', { matchId }^);
echo   
echo   try {
echo     logMatchEvent^(matchId, {
echo       timestamp: new Date^(^),
echo       minute: 90,
echo       eventType: 'FULL_TIME',
echo       description: `FULL TIME - Final Score: ${finalHomeScore}-${finalAwayScore}`,
echo       videoTimestamp: calculateVideoTimestamp^(matchId, 90^),
echo       clipMarker: false
echo     }^);
echo     
echo     logger.exitFunction^('logFullTime', { success: true }^);
echo     return { success: true };
echo     
echo   } catch ^(error^) {
echo     logger.error^('logFullTime failed', { error: error.toString^(^) }^);
echo     return { success: false, error: error.toString^(^) };
echo   }
echo }
echo.
echo /**
echo  * Log to Match Events sheet
echo  * @private
echo  */
echo function logMatchEvent^(matchId, event^) {
echo   const ss = SpreadsheetApp.getActiveSpreadsheet^(^);
echo   let sheet = ss.getSheetByName^('Match Events'^);
echo   
echo   if ^(!sheet^) {
echo     sheet = ss.insertSheet^('Match Events'^);
echo     sheet.getRange^('A1:M1'^).setValues^([[
echo       'Timestamp', 'Match ID', 'Minute', 'Event Type', 'Player',
echo       'Assist', 'Is Penalty', 'Card Type', 'Description',
echo       'Video Timestamp', 'Clip Marker', 'Clip Start ^(sec^)', 'Clip End ^(sec^)'
echo     ]]^);
echo     sheet.getRange^('A1:M1'^).setFontWeight^('bold'^);
echo     sheet.setFrozenRows^(1^);
echo   }
echo   
echo   sheet.appendRow^([
echo     event.timestamp ^|^| new Date^(^),
echo     matchId,
echo     event.minute ^|^| '',
echo     event.eventType ^|^| '',
echo     event.player ^|^| '',
echo     event.assist ^|^| '',
echo     event.isPenalty ^|^| false,
echo     event.cardType ^|^| '',
echo     event.description ^|^| '',
echo     event.videoTimestamp ^|^| '',
echo     event.clipMarker ^|^| false,
echo     event.clipStart ^|^| '',
echo     event.clipEnd ^|^| ''
echo   ]^);
echo }
echo.
echo /**
echo  * Calculate video timestamp from match minute
echo  * @private
echo  */
echo function calculateVideoTimestamp^(matchId, minute^) {
echo   const matchSeconds = minute * 60;
echo   const hours = Math.floor^(matchSeconds / 3600^);
echo   const minutes = Math.floor^(^(matchSeconds %% 3600^) / 60^);
echo   const seconds = matchSeconds %% 60;
echo   
echo   return `${String^(hours^).padStart^(2, '0'^)}:${String^(minutes^).padStart^(2, '0'^)}:${String^(seconds^).padStart^(2, '0'^)}`;
echo }
echo.
echo /**
echo  * Export match events for video editor ^(CSV^)
echo  */
echo function exportMatchEventsForVideo^(matchId^) {
echo   const ss = SpreadsheetApp.getActiveSpreadsheet^(^);
echo   const sheet = ss.getSheetByName^('Match Events'^);
echo   
echo   if ^(!sheet^) return '';
echo   
echo   const data = sheet.getDataRange^(^).getValues^(^);
echo   let csv = 'Minute,Event,Player,Description,Video Start,Duration\n';
echo   
echo   for ^(let i = 1; i ^< data.length; i++^) {
echo     if ^(data[i][1] === matchId ^&^& data[i][10]^) {
echo       const minute = data[i][2];
echo       const eventType = data[i][3];
echo       const player = data[i][4];
echo       const description = data[i][8];
echo       const clipStart = data[i][11];
echo       const clipEnd = data[i][12];
echo       const duration = clipEnd - clipStart;
echo       
echo       csv += `${minute},${eventType},${player},"${description}",${clipStart},${duration}\n`;
echo     }
echo   }
echo   
echo   return csv;
echo }
echo.
echo /**
echo  * Get all match events
echo  */
echo function getMatchEvents^(matchId^) {
echo   const ss = SpreadsheetApp.getActiveSpreadsheet^(^);
echo   const sheet = ss.getSheetByName^('Match Events'^);
echo   
echo   if ^(!sheet^) return [];
echo   
echo   const data = sheet.getDataRange^(^).getValues^(^);
echo   const events = [];
echo   
echo   for ^(let i = 1; i ^< data.length; i++^) {
echo     if ^(data[i][1] === matchId^) {
echo       events.push^({
echo         timestamp: data[i][0],
echo         matchId: data[i][1],
echo         minute: data[i][2],
echo         eventType: data[i][3],
echo         player: data[i][4],
echo         assist: data[i][5],
echo         isPenalty: data[i][6],
echo         cardType: data[i][7],
echo         description: data[i][8],
echo         videoTimestamp: data[i][9],
echo         clipMarker: data[i][10],
echo         clipStart: data[i][11],
echo         clipEnd: data[i][12]
echo       }^);
echo     }
echo   }
echo   
echo   return events;
echo }
) > src\match-events.gs

echo ✓ match-events.gs created!

echo.
echo [2/5] Updating config.js with routing support...
echo.

echo. >> src\config.js
echo   // ==================== ROUTING ^(FREE vs PAID TIERS^) ==================== >> src\config.js
echo   ROUTING: { >> src\config.js
echo     MODE: 'MAKE', // 'MAKE' ^(free tier^) or 'CLOUDFLARE' ^(paid tier^) >> src\config.js
echo     CLOUDFLARE_WORKER_URL: 'https://admin-console.team-platform-2025.workers.dev', >> src\config.js
echo     CLOUDFLARE_API_KEY_PROPERTY: 'CLOUDFLARE_API_KEY' >> src\config.js
echo   }, >> src\config.js

echo ✓ config.js updated!

echo.
echo [3/5] Committing to Git...
echo.

git add src\match-events.gs
git add src\config.js
git commit -m "Add match event logging with video timestamps and SaaS routing"

echo ✓ Committed!

echo.
echo [4/5] Pushing to GitHub...
echo.

git push origin main

echo ✓ Pushed to GitHub!

echo.
echo [5/5] Deploying to Google Apps Script...
echo.

clasp push

echo ✓ Deployed to Apps Script!

echo.
echo ========================================
echo  ✓ ALL DONE!
echo ========================================
echo.
echo New features added:
echo  • Match event logging with timestamps
echo  • Video clip timing calculations
echo  • SaaS routing ^(free vs paid tier^)
echo  • Export for video editor
echo.
echo Your system is ready for tomorrow's match!
echo.
pause