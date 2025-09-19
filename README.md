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
├─ src/                    # All Google Apps Script files (deployed automatically)
│   ├─ appsscript.json     # Apps Script manifest
│   ├─ config.js           # Centralised config (sheet names, URLs, timeouts)
│   ├─ main.gs             # Entry points & orchestration
│   ├─ triggers.gs         # Time-based triggers
│   ├─ utils.gs            # Helpers (dates, HTTP, sheet ops)
│   ├─ logger.gs           # Unified logging wrapper
│   ├─ testhooks.gs        # No-op hooks for AI/testing
│   └─ fixtures.ingest.gs  # Fixtures ingestion example module
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

## 📦 Adding Your Actual Code

- Right now `src/` contains **starter scaffold files**.  
- You can paste your **real code** over them at any time.  
- On your PC, run `clasp pull` to sync down from Apps Script → then commit to GitHub.  
- Or simply paste your existing code into the correct files in `src/` and push.

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
