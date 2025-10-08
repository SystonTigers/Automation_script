# ⚠️ DEPRECATED - DO NOT USE

## 🚨 CRITICAL: CI/CD DISABLED TO PREVENT DEPLOYMENT CONFLICTS

**This repository has been consolidated into the official monorepo and is NO LONGER ACTIVE.**

**⛔ ALL CI/CD WORKFLOWS HAVE BEEN DISABLED** - This repo will NOT deploy to production.

---

## 👉 Go to the Active Repository

**Official Monorepo:** https://github.com/SystonTigers/app

**All development, issues, PRs, and deployments happen there.**

---

## Why This Repo Was Deprecated

Both `Automation_script` and `app` were deploying to the **same Apps Script (scriptId: 1x4MvHn...)**
- ⚠️ Last push wins = deployment collisions
- ⚠️ High risk of production overwrites
- ⚠️ Contributor confusion

**Solution:** Consolidate to ONE active repo (`app`) and archive this one.

## 🔄 New Location

**All code and functionality is now in:** https://github.com/SystonTigers/app

## 📦 What Was Moved

Everything from this repo has been consolidated into the `app` monorepo:

### Directories Moved:
- `qa/` → `app/qa/` - QA tests and evidence
- `test/` → `app/test/` - Unit tests
- `scripts/` → `app/scripts/` - Deployment scripts
- `src/` → `app/apps-script/` - Google Apps Script files (110+ files)
- `archive/` → `app/archive/` - Legacy code
- `.github/workflows/` → `app/.github/workflows/` - CI/CD workflows (merged)

### Documentation Moved:
- All 40+ markdown files copied to `app/`
- CODEX_10_10_INSTRUCTIONS.md
- AGENT.md
- System-Workings - AKA The Bible.md
- QA_CERTIFICATION.md
- All security, testing, and deployment guides

## ✅ All Features Preserved

**NOTHING was deleted or removed. Every feature, test, workflow, and documentation file was copied to the new monorepo.**

## 🚀 Why Consolidate?

The Syston Tigers platform uses a monorepo structure to:
- ✅ Single source of truth
- ✅ Shared TypeScript types between backend and mobile
- ✅ Atomic commits across full stack
- ✅ Simpler dependency management
- ✅ Better for small teams

## 📁 New Monorepo Structure

```
app/
├── backend/          # Cloudflare Workers
├── mobile/           # React Native mobile app
├── apps-script/      # Google Apps Script (was src/)
├── qa/               # QA infrastructure
├── test/             # Unit tests
├── scripts/          # Deployment scripts
├── admin/            # Admin console
├── setup/            # Setup console
├── workers/          # Additional workers
├── archive/          # Legacy code
├── .github/          # CI/CD workflows (7 workflows)
├── CLAUDE.md         # Complete system guide
└── [40+ doc files]
```

## 🔗 Links

- **Main Repository**: https://github.com/SystonTigers/app
- **System Guide**: https://github.com/SystonTigers/app/blob/main/CLAUDE.md
- **Product Roadmap**: https://github.com/SystonTigers/app/blob/main/PRODUCT_ROADMAP.md

## 📋 For Future Development

**Use the `app` repository for all future work:**

```bash
# Clone the consolidated repo
git clone https://github.com/SystonTigers/app.git
cd app

# Everything is here:
ls -la qa/          # QA tests
ls -la apps-script/ # Apps Script source
ls -la mobile/      # Mobile app
ls -la backend/     # Cloudflare Workers
```

---

**This repository remains for historical reference only.**
**All active development happens in:** https://github.com/SystonTigers/app

---

**Consolidated on:** 2025-10-07
**By:** Claude Code
**Commit:** See app repo commit `1ab02ae` for full consolidation details
