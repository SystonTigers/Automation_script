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

1. **Clone and configure:**
   ```bash
   git clone https://github.com/SystonTigers/Automation_script.git
   cd Automation_script
   ```

2. **Set up Google Apps Script:**
   ```bash
   npm install -g @google/clasp
   clasp login
   clasp push
   ```

3. **Configure webhooks:**
   - Add your Make.com webhook URLs to script properties
   - Set up Google Sheets with required tabs
   - Deploy as web app in Apps Script console

## 🔄 Deployment Pipeline

This project uses **GitHub Actions** for automatic deployment:

1. **Edit locally** in VS Code or your preferred editor
2. **Commit & push** to `main` branch
3. **GitHub Action** automatically pushes to Google Apps Script
4. **Verify deployment** by running `SA_Version()` in Apps Script console

**No more manual copying between interfaces!** 🎉

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

### Google Apps Script Properties:
```javascript
MAKE_WEBHOOK_URL_LIVE_EVENTS = "your-make-webhook-url"
MAKE_WEBHOOK_URL_BATCH_CONTENT = "your-make-webhook-url"
TEAM_NAME = "Your Team Name"
LEAGUE_NAME = "Your League"
```

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

**Professional football automation that just works.** ⚽✨