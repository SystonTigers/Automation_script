# ⚽ Syston Football — Club App + Automation

[![Deploy Status](https://github.com/SystonTigers/Automation_script/workflows/Push%20to%20Apps%20Script/badge.svg)](https://github.com/SystonTigers/Automation_script/actions)
[![Version](https://img.shields.io/github/v/tag/SystonTigers/Automation_script)](https://github.com/SystonTigers/Automation_script/tags)

Full-stack automation for grassroots football clubs. This Google Apps Script project powers the live **Syston Football** club app, delivering real-time match coverage, automated media workflows, and self-serve admin tools backed by CI/CD.

---

## 🧱 Architecture Overview

```
Google Sheets (Config & Data Entry)
        ↓
Apps Script Services (Automation + API Orchestration)
        ↓
Make.com Scenarios → Canva Templates → Social + Email Channels
        ↓
Club App UI (deployed via single Apps Script web app)
```

**Core layers**
- **Data Source**: Structured Google Sheets tabs for fixtures, players, results, config, and media planning.
- **Automation Runtime**: Modular Apps Script services (V8) with caching, logging, and enterprise-grade HTTP utilities.
- **Integration Hub**: Make.com workflows triggered from Apps Script to generate graphics, distribute posts, and sync external systems.
- **Presentation**: HTML service web app surfaces dashboards, consent tooling, and match control panels.

## 🌟 Key Features

- **Live Match Console** – One-click goal, card, and substitution events with instant social + graphics workflows.
- **Content Automation** – Weekly fixture/results packs, player spotlights, and highlights videos produced end-to-end.
- **Squad Intelligence** – Player minutes, availability, GDPR consent status, and medical flags tracked centrally.
- **Ops Command Centre** – Admin sidebar for secure secrets management, trigger reconciliation, and health checks.
- **Performance & Monitoring** – Multi-layer caching, quota guardrails, structured logging, and automated alerts.
- **Security & Compliance** – ConsentGate privacy engine, audit trails, redaction tooling, and hardened OAuth scopes.

## 🚀 Quickstart (Club Admins)

1. **Copy the master Google Sheet** provided by your Syston Football system lead.
2. **Fill the `Config` tab** with club metadata (name, league, colours, badge URL, contact email, etc.).
3. **Populate core tabs**: `Players`, `Fixtures`, `Results`, and any optional content planners.
4. **Run the installer** from the custom menu → **⚽ Syston Automation → Install Club Configuration**.
5. **Open the Admin sidebar** to enter secure Make.com webhook URLs and other secrets.
6. **Launch the web app** via the provided link; the CI/CD pipeline keeps it on the latest version automatically.

_No direct Apps Script edits required—everything syncs from Git on deploy._

## 🛠️ Development Workflow (Maintainers)

1. Clone the repository and work inside the `src/` directory (Apps Script root defined in `.clasp.json`).
2. Follow the modular naming convention (`*_svc.gs` for server logic, `*_ui.html` for templates).
3. Reuse shared helpers for triggers, HTTP backoff, and configuration loading—avoid duplicating logic.
4. Validate sheet headers in code and map values by header name to keep customer config flexible.
5. Commit changes with clear messages; never introduce new deployments, secrets, or hard-coded IDs.

### Local Tooling
- **Testing**: Run ad-hoc validations with clasp (`npx clasp pull/push --dry-run`) or Apps Script execution logs.
- **Version probe**: `SA_Version()` in Apps Script editor confirms the deployed build.

## 🔁 CI/CD Pipeline

The **Push to Apps Script** GitHub Action manages deployments:

1. Checkout & setup Node 22.
2. Install `@google/clasp` globally.
3. Materialise `~/.clasprc.json` from the encrypted `CLASPRC_JSON` secret.
4. Execute `npx clasp status` to verify repo structure.
5. Push sources with `npx clasp push --force`.
6. Stamp a version (`npx clasp version "<branch> @ <commit>"`).
7. Redeploy the existing web app via `npx clasp deploy --deploymentId $WEBAPP_DEPLOYMENT_ID`.

The workflow fails fast if credentials are missing or the deployment ID is unset, preventing partial releases.

## 🏪 Store & Launch Readiness

- **Deployment model**: Single managed web app tied to `WEBAPP_DEPLOYMENT_ID`; no extra deployments permitted.
- **Config philosophy**: Customers edit the Sheet Config tab → installer writes Script Properties → triggers remain idempotent.
- **Scopes**: Apps Script manifest locked to spreadsheet, drive.file, external request, and container UI scopes (re-auth required on scope changes).
- **Quality gates**: Automated tests + manual matchday rehearsals documented in `/TEST-REPORT.md` and `/COMPREHENSIVE-TEST-REPORT.md`.
- **Support**: Troubleshooting playbook and security audits bundled within repo (`TROUBLESHOOTING.md`, `SECURITY.md`).

## 🔗 Useful Links

- **Issues & Roadmap** – [GitHub Issues](https://github.com/SystonTigers/Automation_script/issues)
- **CI Status** – [Actions Dashboard](https://github.com/SystonTigers/Automation_script/actions)
- **Developer Guide** – [README-Developer.md](./README-Developer.md)
- **Customer Guide** – [README-Customer.md](./README-Customer.md)
- **Security Overview** – [SECURITY.md](./SECURITY.md)
- **Deployment Checklist** – [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)

---

Professional-grade automation so Syston Football can focus on the pitch. ⚽
