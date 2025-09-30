# Contributing Guide

Thank you for your interest in improving the Automation Script project. This
guide explains how to set up your environment, make meaningful changes, and
submit a high-quality pull request.

## Getting Started

1. Fork the repository and clone your fork locally.
2. Install the Google Apps Script CLI (`@google/clasp`) and authenticate with
   the service account used by CI.
3. Run `npm install` if your change depends on Node tooling (for example,
   linting or bundling helpers).
4. Work from a feature branch named after the issue or enhancement you are
   addressing (e.g., `feature/sheet-sync-improvements`).

## Development Workflow

- Keep edits inside the `src/` directory unless you are updating documentation
  or CI assets.
- Follow the configuration contract described in `README-Developer.md`—store
  customer-specific values in the Sheet Config tab and surface runtime settings
  via Script Properties.
- Prefer small, focused commits that are easy to review. Reference the related
  issue in your commit message when possible.

## Coding Standards

- Use modern Apps Script (V8) syntax and avoid introducing TypeScript unless
  explicitly requested.
- Group functionality into feature-focused modules: server code in `*_svc.gs`,
  HTML UI in `*_ui.html`.
- Batch spreadsheet reads and writes with `getValues()`/`setValues()` over full
  ranges; never loop over individual cells when a range operation will do.
- For outbound HTTP requests, apply the enterprise client pattern (timeouts,
  retries with exponential backoff, and structured error handling).

## API Standards

- Treat the Sheet Config tab and Script Properties as the canonical sources for
  runtime configuration; never hardcode URLs, secrets, or environment-specific
  identifiers.
- All mutating HTTP endpoints **must** enforce an `Idempotency-Key` header.
  Reject missing keys with a `400` response and reuse keys to make retries
  safe. Surface the header value in downstream logs for correlation, but do not
  log request bodies containing PII.
- Use shared utilities such as [`src/http_util_svc.gs`](src/http_util_svc.gs)
  and the idempotency helpers in [`src/enterprise-operations.gs`](src/enterprise-operations.gs)
  to standardize retries, logging, and duplicate suppression. Regression tests
  covering these behaviors live in [`src/edge-case-tests.gs`](src/edge-case-tests.gs).

**Example**

```
POST https://example.com/api/sync
Idempotency-Key: 84d8e27c-4c41-4b1f-b705-c7317c7a6ce5
Content-Type: application/json

{"sheetId":"abc123","action":"sync"}
```

```
HTTP/1.1 202 Accepted
Content-Type: application/json

{"status":"queued","idempotencyKey":"84d8e27c-4c41-4b1f-b705-c7317c7a6ce5"}
```

## Testing and Validation

- Use the Apps Script editor or clasp-driven tests to validate new triggers,
  installers, and HTTP integrations.
- Run any relevant local checks (e.g., linting, unit tests) before submitting.
- If you change scopes, note the update clearly in your pull request body so
  reviewers can plan for re-authorization.

## Submitting a Pull Request

1. Ensure your branch is rebased on the latest `main` branch.
2. Provide a concise summary of the change, highlighting user-facing impacts
   and any deployment actions.
3. Include acceptance criteria or test evidence (screenshots, logs, or sheet
   snapshots) demonstrating that the change meets expectations.
4. Request review from the maintainers listed in `README-Developer.md` or the
   code owners for the touched areas.

Following these guidelines helps us ship reliable automation for everyone who
depends on this project. We appreciate your contributions!
