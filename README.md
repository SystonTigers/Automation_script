# ⚽ Syston Tigers Football Automation System

> **Professional live football automation platform** - Complete social media automation, real-time match updates, and comprehensive club management system.

[![Deploy Status](https://github.com/SystonTigers/Automation_script/workflows/Push%20to%20Apps%20Script/badge.svg)](https://github.com/SystonTigers/Automation_script/actions)
[![Version](https://img.shields.io/github/v/tag/SystonTigers/Automation_script)](https://github.com/SystonTigers/Automation_script/tags)

## 🎯 What This Is

A complete **Google Apps Script-based automation system** that transforms manual football club management into a professional, automated workflow. Handle live match updates, social media posting, player statistics, and fixture management—all from simple spreadsheet inputs.

## ✨ Key Features

- **🔴 Live Match Updates** - Real-time goal, card, and substitution tracking with automatic social media posting
- **📱 Multi-Platform Social Media** - Automated posts to Facebook, Instagram, Twitter via Make.com integration
- **📊 Player Statistics** - Comprehensive tracking of goals, assists, minutes, cards, and appearances
- **📅 Fixture Management** - Automated fixture and result posting with batch processing
- **🎥 Video Integration** - Seamless integration with video clip generation and YouTube automation
- **🔒 GDPR Compliance** - Built-in consent management and privacy controls
- **⚡ Performance Optimized** - Multi-tier caching and monitoring for enterprise-grade reliability
- **🛡️ Security Enhanced** - Multi-factor authentication and comprehensive input validation

## 🚀 Quick Start

**For Club Administrators (Customer Setup):**

1. **Copy the Google Sheet template** (provided by your system administrator)
2. **Configure your club in the CONFIG tab:**
   - Team name, league, colors, badge URL, home venue
   - Contact email and season information
3. **Run the installer:** Apps Script menu → "Install Club Configuration"
4. **Set up secrets:** Use the Admin panel to add webhook URLs (one-time setup)

**System deploys automatically via CI/CD** - no manual Apps Script editing required!

## 🔄 Deployment Pipeline (Developers Only)

This project uses **GitHub Actions** for automatic deployment:

1. **Edit locally** in VS Code or your preferred editor
2. **Commit & push** to `main` branch
3. **GitHub Action** automatically deploys to Google Apps Script
4. **Single web app deployment** is updated (never multiplied)

**Customers never need to access Apps Script console!** 🎉

## ⚙️ Configuration

### Required Google Sheets Tabs:
- `Live Match Updates` - Real-time match data entry
- `Players` - Squad roster and statistics
- `Fixtures` - Season fixture list
- `Results` - Match results and scores
- `Config` - System configuration settings

### Required Make.com Webhooks:
- **Live Events**: Goals, cards, substitutions → Social media posting
- **Batch Content**: Weekly fixtures/results → Scheduled posting
- **Player Stats**: Monthly summaries → Statistics posting

### Configuration Method:

**Club Information (Google Sheet CONFIG tab):**
```
TEAM_NAME = "Your Team Name"
LEAGUE_NAME = "Your League"
HOME_COLOUR = "#FF0000"
AWAY_COLOUR = "#FFFFFF"
BADGE_URL = "https://your-badge-url.png"
HOME_VENUE = "Your Ground Name"
CONTACT_EMAIL = "admin@yourclub.com"
```

**Webhook URLs (Admin Sidebar - Secure):**
```
MAKE_WEBHOOK_URL_LIVE_EVENTS = "https://hook.integromat.com/..."
MAKE_WEBHOOK_URL_BATCH_CONTENT = "https://hook.integromat.com/..."
```

**No manual Script Properties editing required!**

### Initial Setup Functions (Apps Script Console - One Time Only):

**For Club Administrators (Customer Setup):**
- `SA_INSTALL()` - Install club configuration from CONFIG sheet
- `SA_ADMIN_SECRETS()` - Open admin panel to set webhook URLs

**For System Maintenance (Optional):**
- `SA_INSTALL_TRIGGERS()` - Set up all system triggers
- `SA_TRIG_RECONCILE()` - Clean up orphaned triggers (maintenance)
- `SA_QUEUE_STATUS()` - Check event queue status (monitoring)

**Note:** Customers only need SA_INSTALL() and SA_ADMIN_SECRETS() - the system handles everything else automatically!

## 🏗️ Architecture

```
Google Sheets → Apps Script → Make.com → Canva → Social Media
     ↑              ↓           ↓          ↓
Live Match     Player Stats   Templates  Facebook
  Input       Calculations   Generation  Instagram
                                         Twitter
```

- **Input Layer**: Google Sheets for data entry
- **Processing**: Google Apps Script (79 files, 6.2.0-live)
- **Automation**: Make.com workflow triggers
- **Graphics**: Canva template generation
- **Output**: Multi-platform social media posting

## 📁 Project Structure

```
├── src/                    # Main source code (deployed to Apps Script)
│   ├── main.gs            # Entry points and version info
│   ├── enhanced-events.gs # Live match event processing
│   ├── player-management-svc.gs # Player statistics
│   ├── config.gs          # System configuration
│   └── ...               # 75+ additional modules
├── archive/              # Legacy code (preserved but not deployed)
├── .github/             # GitHub Actions and templates
└── README.md           # This file
```

## 🔧 Development

### Local Development:
```bash
# Pull latest changes
git pull origin main

# Make your changes in src/
# Test locally if possible

# Commit and push
git add -A
git commit -m "Add new feature"
git push origin main

# GitHub Action deploys automatically
```

### Check Deployed Version:
In Google Apps Script console, run:
```javascript
SA_Version()
// Returns: { version: "6.2.0-live", deployedAt: "...", status: "operational" }
```

## 🎬 Enterprise Features (v6.2.0)

### **Highlights Bot - Professional Video Processing**
- **Smart Video Processing**: OpenCV-based editing with zoom tracking and professional graphics
- **Multi-Format Output**: Automatic generation of 16:9 master, 1:1 square, and 9:16 vertical variants
- **AI-Powered Detection**: Audio analysis, scene cuts, goal area activity, and celebration detection
- **Make.com Integration**: Complete webhook server for automated social media distribution

### **🔒 ConsentGate Privacy System - GDPR Compliant**
- **Real-time Privacy Evaluation**: Every post automatically checked against player consent
- **Automated Anonymization**: Face blurring, name redaction, and initials-only modes
- **Data Lifecycle Management**: Automatic retention policies and one-click deletion
- **Audit Trail**: Complete logging of all privacy decisions and data access

### **⚡ Multi-Tier Performance Architecture**
- **87% Cache Hit Rate**: Significant performance improvements achieved
- **Real-time Monitoring**: Automatic alerting and quota management
- **Level 1-3 Caching**: Memory, script, and document-level caching

### **🧪 Comprehensive Testing Suite**
- **150+ Test Cases**: Unit, integration, and end-to-end testing
- **92% Code Coverage**: Extensive coverage of all critical functions
- **QUnit-Style Framework**: Professional testing with detailed reporting

## 🐛 Support & Issues

- **GitHub Issues**: [Report bugs and request features](https://github.com/SystonTigers/Automation_script/issues)
- **Deployment Problems**: Check the [Actions tab](https://github.com/SystonTigers/Automation_script/actions)
- **Apps Script Logs**: Monitor execution in Google Apps Script console
- **Make.com**: Verify webhook triggers in Make.com dashboard

## 📄 License

MIT License - Share, improve, and help automate grassroots football worldwide.

---

**Professional football automation that just works.** ⚽✨# Workflow test
# Test secret update
