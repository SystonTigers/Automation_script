# Error Codes Reference

Centralized list of structured error codes emitted by the automation platform. Apps Script handlers format errors through `buildErrorResponse()` in `../src/util_response.gs`, while Workers respond with `{ success: false, error, code }` payloads.

## Apps Script Codes

| Code | HTTP Status | Description | Remediation |
| --- | --- | --- | --- |
| `CONFIG_MISSING` | 400 | Sheet `CONFIG` tab missing required key. | Populate the missing key and rerun `installForCustomer()`. |
| `PROPERTY_MISSING` | 500 | Script Property not set at runtime. | Run `validateEnvironment()` and redeploy installer. |
| `SHEET_NOT_FOUND` | 404 | Expected sheet tab absent. | Create the tab or update config mapping. |
| `DRIVE_FILE_NOT_FOUND` | 404 | Referenced Drive asset missing. | Restore the file or update the stored fileId. |
| `VALIDATION_FAILED` | 422 | Input payload failed schema validation. | Fix the highlighted fields; see logs for field names. |

## Worker Codes

| Code | HTTP Status | Description | Remediation |
| --- | --- | --- | --- |
| `AUTH_INVALID` | 401 | JWT verification failed. | Confirm issuer, audience, and tenant claim. |
| `IDEMPOTENCY_REQUIRED` | 400 | `idempotency-key` header missing. | Include header (UUID) and retry. |
| `RATE_LIMITED` | 429 | Durable Object quota exceeded. | Back off per headers `Retry-After` and `X-RateLimit-*`. |
| `ADAPTER_TIMEOUT` | 504 | Downstream adapter failed to respond. | Retry (max 4 attempts) then review Make logs. |
| `MAKE_FALLBACK` | 202 | Worker routed request to Make.com fallback. | No action; track `requestId` for confirmation. |

## Logging Conventions

- Include `tenantId`, `requestId`, and `code` in structured logs.
- Never log PII (player names, emails); hash if correlation required.
- Stackdriver alerts trigger when `CONFIG_MISSING` or `PROPERTY_MISSING` occurs more than twice per hour.

---

_Last updated: 2025-10-05_
