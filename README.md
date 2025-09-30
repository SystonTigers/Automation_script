# ⚽ Syston Football — App + Workers Automation Backend

[![Deploy Backend](https://github.com/SystonTigers/Automation_script/workflows/Deploy%20Backend/badge.svg)](https://github.com/SystonTigers/Automation_script/actions)
[![Deploy Apps Script](https://github.com/SystonTigers/Automation_script/workflows/Push%20to%20Apps%20Script/badge.svg)](https://github.com/SystonTigers/Automation_script/actions)
[![Version](https://img.shields.io/github/v/tag/SystonTigers/Automation_script)](https://github.com/SystonTigers/Automation_script/tags)
[![Implementation](https://img.shields.io/badge/implementation-82%25-yellow)](./IMPLEMENTATION_STATUS.md)

**Full-stack automation platform for grassroots football clubs**, combining a **Cloudflare Workers** backend with **Google Apps Script** orchestration. Powers the Syston Football club mobile app with real-time match coverage, automated social media workflows, and self-serve admin tools.

---

## 🧱 Architecture Overview

```
Mobile App (iOS/Android - Capacitor)
        ↓ HTTPS + JWT
Cloudflare Workers Backend (Post Bus API)
        ├─ HTTP Worker (JWT auth, rate limiting, idempotency)
        ├─ Queue Consumer (async post processing)
        ├─ Durable Objects (rate limiting)
        └─ Adapters (Make.com primary, YouTube/Facebook/Instagram planned)
        ↓
Make.com Scenarios + Canva → Social Media (all channels)
        ↓
Google Apps Script (config management, fixture parsing, scheduling)
        ↓
Google Sheets (data source & admin interface)
```

---

## 🎯 System Status (82% Complete)

| Component | Status | Completeness |
|-----------|--------|--------------|
| **Backend Worker** | ✅ Operational | 90% |
| **Queue Consumer** | ✅ Operational | 100% |
| **Make.com Adapter** | ✅ Production | 100% |
| **Idempotency & Rate Limiting** | ✅ Production | 100% |
| **Fixtures Worker** | ⚠️ Ready | 95% - needs deployment config |
| **Admin Endpoints** | ❌ Missing | 0% - manual KV required |
| **Apps Script** | ✅ Operational | 90% - 110+ files |
| **CI/CD Pipeline** | ✅ Operational | 100% |
| **Documentation** | ✅ Complete | 100% |

**See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for detailed breakdown.**

---

## 🌟 Key Features

### Mobile App Backend (Cloudflare Workers)
- **Post Bus API** – Queue-based async processing with idempotency
- **JWT Authentication** – Tenant-scoped security
- **Rate Limiting** – 5 req/sec per tenant via Durable Objects
- **Livestream Metadata** – YouTube Live scheduling
- **Fixtures & Table** – Cached FA snippet data
- **MOTM Voting** – Anti-cheat voting system

### Automation (Make.com + Apps Script)
- **Live Match Console** – One-click events with social publishing
- **Content Automation** – Weekly fixture/results packs
- **Squad Intelligence** – Player tracking with GDPR compliance
- **ConsentGate** – Privacy engine for minors

---

## 🚀 Quickstart

### Deploy Backend (Cloudflare Workers)
```bash
cd backend
npm install

# Create resources
wrangler kv:namespace create KV_CACHE
wrangler kv:namespace create KV_IDEMP
wrangler queues create post-queue

# Set secrets
wrangler secret put JWT_SECRET
wrangler secret put MAKE_WEBHOOK_BASE

# Deploy
wrangler deploy

# Verify
curl https://your-worker.workers.dev/healthz
```

### Deploy Apps Script
```bash
npm install -g @google/clasp
clasp login
clasp clone <SCRIPT_ID>
clasp push
```

---

## 📂 Repository Structure

```
├── backend/                 # Cloudflare Workers (TypeScript)
│   ├── src/
│   │   ├── index.ts        # HTTP Worker (10 API endpoints)
│   │   ├── queue-consumer.ts
│   │   ├── adapters/       # Make.com ✅, YouTube ⚠️, FB/IG ⚠️
│   │   ├── do/             # Rate limiter (Durable Object)
│   │   └── services/       # Auth, idempotency, tenants
│   └── wrangler.toml       # Cloudflare config
│
├── workers/                 # Separate Workers
│   └── fixtures.ts         # FA snippet parser (needs wrangler.toml)
│
├── src/                     # Apps Script (110+ files)
│   ├── appsscript.json
│   ├── api_*.gs            # API endpoints
│   └── util_*.gs           # Utilities
│
├── docs/                    # Documentation
│   └── README.md           # Workers architecture
│
├── .github/workflows/       # CI/CD
│   ├── deploy.yml          # Backend deployment
│   └── appsscript-push.yml # Apps Script deployment
│
├── openapi.yaml            # API specification v1.0.0
├── AGENT.md                # Automation spec v7.0
├── IMPLEMENTATION_PLAN.md  # Roadmap
├── IMPLEMENTATION_STATUS.md # Component breakdown
└── NEXT_STEPS.md           # Immediate actions
```

---

## 🔌 API Endpoints

### Public (JWT Required)
- `GET /healthz` — Health check
- `GET /i18n/{locale}` — Localization
- `GET /api/v1/events` — Fixtures list
- `POST /api/v1/attendance` — Mark attendance
- `POST /api/v1/votes` — MOTM vote
- `POST /api/v1/post` — **Post Bus** (queue submission)
- `GET /api/v1/table` — League table

### Admin (Not Implemented) ⚠️
- `PUT /api/v1/admin/tenants/{id}` — Update tenant
- `PATCH /api/v1/admin/tenants/{id}/flags` — Toggle flags
- `POST /api/v1/admin/tenants/{id}/youtube-token` — Store OAuth

---

## 📋 Roadmap

### ✅ Completed (82%)
- Backend Worker with 10 API endpoints
- Queue-based async processing
- Make.com adapter production-ready
- Apps Script integration (110+ files)

### 🚧 In Progress
- Admin endpoints (Priority 1)
- Fixtures Worker deployment config (Priority 1)
- Backend test suite (Priority 2)

### 📅 Planned
- YouTube Direct integration (or document Make.com as primary)
- Facebook/Instagram Direct integrations
- Enhanced monitoring

**See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed roadmap.**

---

## 📖 Documentation

- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) — Detailed component breakdown
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) — Roadmap and phases
- [NEXT_STEPS.md](./NEXT_STEPS.md) — Immediate action items
- [openapi.yaml](./openapi.yaml) — API specification v1.0.0
- [AGENT.md](./AGENT.md) — Automation spec v7.0
- [docs/README.md](./docs/README.md) — Workers architecture details

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

**Current Version:** 1.0.0-alpha  
**Last Updated:** 2025-09-30  
**Implementation Status:** 82% Complete (Production-Ready)
