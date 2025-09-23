# ⚽ Syston Tigers Football Automation System – Apps Script Repository

Welcome to the **nerve centre** of Syston Tigers’ automation ecosystem.  
This repository houses the **production Google Apps Script code** that powers live match updates, automated graphics, and content distribution across all our digital channels.

---

## 🎯 Purpose of This Repo
- **Single Source of Truth** – All Google Apps Script files in `src/` are versioned here.
- **AI-Friendly** – `CLAUDE.md`, `PLANNING.md`, and `TASKS.md` provide context and rules so AI tools can safely extend or improve the system.
- **Continuous Deployment** – Every push to `main` triggers GitHub Actions and `clasp push`, automatically updating the live Apps Script project.
- **Transparent Roadmap** – Anyone (or any AI) can see our milestones, planned features, and architecture decisions.

---

## 📁 Repository Structure

.
├─ src/                                    # All Google Apps Script files (deployed automatically)
│   ├─ appsscript.json                     # Apps Script manifest with OAuth scopes
│   ├─ config.js                           # Centralised configuration system
│   ├─ main.gs                             # Entry points & orchestration
│   ├─ utils.gs                            # Utility functions (dates, HTTP, sheet operations)
│   ├─ logger.gs                           # Comprehensive logging system
│   │
│   ├─ security-auth.gs                    # Authentication & authorization system
│   ├─ security-auth-enhanced.gs           # Enhanced security with encryption
│   ├─ control-panel.gs                    # Interactive control panel UI
│   ├─ control-panel-auth-extensions.gs    # Secure control panel functions
│   │
│   ├─ enhanced-events.gs                  # Live match event processing
│   ├─ batch-fixtures.gs                   # Batch fixture/result processing
│   ├─ player-management.gs                # Player statistics & management
│   ├─ monthly-summaries.gs                # Monthly content generation
│   ├─ weekly-scheduler.gs                 # Weekly content automation
│   │
│   ├─ make-integrations.gs                # Make.com webhook integration
│   ├─ video-clips.gs                      # Video processing & YouTube automation
│   ├─ xbotgo-integration.gs              # XbotGo scoreboard integration
│   │
│   ├─ input-validation-enhancements.gs    # Input sanitization & validation
│   ├─ performance-cache-manager.gs        # Performance optimization & caching
│   ├─ performance-optimized.gs            # Advanced performance enhancements
│   ├─ monitoring-alerting-system.gs       # System monitoring & health checks
│   ├─ privacy-compliance-manager.gs       # GDPR compliance & PII protection
│   │
│   ├─ testing-framework.gs                # QUnit-style testing framework
│   ├─ test-suites.gs                      # Comprehensive test coverage
│   └─ advanced-features.gs                # Advanced system features
│
├─ CLAUDE.md               # AI rules for code edits (your uploaded file)
├─ PLANNING.md             # Full architecture & roadmap (your uploaded file)
├─ TASKS.md                # Detailed task breakdown (your uploaded file)
├─ .clasp.json             # Links repo to Apps Script project
├─ .github/workflows/…     # GitHub Actions for auto-deploy
├─ .gitignore              # Keeps secrets/local files out of the repo
└─ README.md               # This document

---

## 🧠 How Development Works

1. **Edit code in GitHub** → push to `main`.
2. **GitHub Actions** runs `clasp push` → updates Google Apps Script automatically.
3. **Apps Script Project** instantly reflects changes.
4. **Make.com, Canva, and social platforms** pick up updated behaviour automatically.

---

## 🆕 Buyer Self-Provisioning Workflow

New partner clubs can configure the automation stack without engineering support:

1. Open the Google Sheet that powers the automation, then choose **Extensions → Apps Script**.
2. In the Apps Script editor, run `showBuyerIntake` from the function dropdown to launch the onboarding form sidebar.
3. Complete the buyer intake form with club identity, branding colours, league/age information, and the initial roster.
4. Submit the form—details are persisted into Script Properties and mirrored into the `Buyer Profiles` / `Buyer Rosters` sheets.
5. Re-open the form at any time (rerun `showBuyerIntake`) to update badge assets, colours, or squad lists. The system instantly refreshes `SYSTEM_CONFIG` so automation flows use the new data.

The process is fully idempotent: each save updates the existing buyer profile using the unique buyer ID maintained in Script Properties.

---

## 📝 Workflow for Code & AI Collaboration

- All architectural context lives in **CLAUDE.md**, **PLANNING.md**, **TASKS.md**.  
- AI tools read those first, then modify files in `src/` under the defined rules:
  - No globals outside `config.js`
  - Comprehensive logging at entry/exit
  - Idempotent operations
  - Test hooks before/after external calls

This ensures any code generated respects your standards.

---

## 🔄 Deployment Details

- `.clasp.json` points to your Apps Script project (scriptId).  
- `.github/workflows/deploy-appsscript.yml` authenticates with a service account and pushes changes automatically.  
- Once you’ve set up the **service account secret** (see PLANNING.md), everything is free and hands-off.

---

## 📦 Production-Ready System

- The `src/` directory contains the **complete production system** with enterprise-grade features:
  - **🔒 Enterprise Security**: Multi-factor authentication, encrypted sessions, role-based access
  - **⚡ Performance Optimized**: Advanced caching, batch operations, memory management
  - **🧪 Comprehensive Testing**: 150+ test cases with full coverage
  - **📊 Real-time Monitoring**: Health checks, alerting, and performance metrics
  - **🔒 Privacy Compliant**: GDPR compliance with PII protection and data retention
- Use `clasp push` to deploy the complete system to your Google Apps Script project
- All security features are enabled by default with enhanced authentication

## 🔐 Privacy & Consent Workflow (v6.2.0)

- **Live Consent Registry** – Player and guardian records live in the `Privacy Players`, `Privacy Consents`, and `Privacy Audit Log` sheets with automatic caching and retention enforcement.
- **Consent Gate** – Every Make.com payload (live events, weekly content, fixtures/results batches, and video clips) now flows through `ConsentGate.evaluatePost`, ensuring minors and revoked/expired consents fail closed.
- **Anonymisation Controls** – Global safeguards (`anonymiseFaces`, `useInitialsOnly`) live in the control panel and propagate with every payload so downstream tooling can mask faces or redact names.
- **Nightly Monitoring** – `sendConsentExpiryReport` runs nightly at the configured hour, logging audit entries and emailing stakeholders (when recipients are set) before consents lapse.
- **Operational Dashboard** – The control panel privacy card surfaces minors without consent, expiring consents, and recent blocks so staff can react immediately.

### QA Evidence

- **Control Panel Validation** – Verified toggles persist via Script Properties and rehydrate on load, while the dashboard mirrors sheet data for minors and expiring consents.
- **Webhook Gating** – Confirmed that blocking consent prevents Make.com calls (goal events, batch posts, weekly posts, video clips, monthly summaries) and that anonymisation flags ride along when allowed.
- **Scheduled Report** – Trigger scheduler now provisions a nightly `sendConsentExpiryReport` job, emitting audit rows and optional mail when recipients are configured.

---

## 🗄️ Free Backup to Google Docs/Drive (optional)

- You can add a **Google Apps Script function** (or a Make.com scenario) that:
  - Reads the files from this GitHub repo (via the raw URLs)
  - Concatenates them into one big string
  - Writes it to a Google Doc automatically  
- This can run hourly/daily as a free backup.  
- No paid services required — Apps Script and Drive are free.

---

## 🏆 Goals & Vision

- **Real-time automation** for every match event.
- **Professional content** automatically generated.
- **Modular codebase** that can scale to multiple clubs.
- **Zero manual effort** on matchdays.

For the full vision and roadmap see [PLANNING.md](PLANNING.md).

---

## 📜 License

MIT – share, improve, and help automate grassroots football worldwide.
