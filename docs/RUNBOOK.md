# Operations Runbook

Follow these procedures to triage incidents, recover service, and communicate status across the automation stack.

## 1. Incident Intake

1. Confirm alert source (PagerDuty, Slack, manual report).
2. Capture tenant, environment (`ENV` Script Property), and timestamp.
3. Determine scope: Apps Script failure, Worker API degradation, or third-party outage (Make/YouTube).

## 2. Apps Script Outage

1. Run `validateEnvironment()` to spot missing Script Properties or broken triggers.
2. Execute `runHealthCheck()` manually from the editor.
3. Inspect Stackdriver logs for the failing handler; look for structured JSON with `requestId`.
4. If configuration is missing, re-run `installForCustomer()` and confirm `setupTriggers()` only adds absent triggers.
5. Update `QA_CERTIFICATION.md` with findings and mitigation ETA.

## 3. Worker API Degradation

1. Tail logs: `cd backend && npx wrangler tail --format=json`.
2. Check queue length with `wrangler queues list`; if >100 backlog, scale fallback to Make by toggling Script Property `ENABLE_DIRECT_POST=false`.
3. For JWT errors, verify `JWT_ISSUER`, `JWT_AUDIENCE`, and `JWT_SECRET` secrets.
4. Redeploy only after validating `npm test` passes and the incident is not Make-induced.

## 4. Data Integrity Issues

1. Compare Sheet row counts against historical averages using `runDataAudit()`.
2. If duplicates detected, use `dedupeHistoricalMatches()` with a dry run flag.
3. Communicate impact and remediation steps in Slack `#ops-status` with a timestamped update.

## 5. Post-Incident Review

| Step | Owner | Notes |
| --- | --- | --- |
| Draft incident timeline | Primary on-call | Include detection → resolution → validation. |
| Capture action items | Secondary on-call | Add owners + due dates. |
| Update documentation | Tech writer | Reflect lessons in `docs/` and QA materials. |

## Communication Template

```
Status: Investigating (Apps Script automation)
Impact: Automated match posts delayed for tenant <TENANT>
Start: 2025-10-05T09:12Z
Actions:
  - Running validateEnvironment()
  - Checking Make webhook latency
Next Update: 2025-10-05T09:27Z
```

---

_Last updated: 2025-10-05_
