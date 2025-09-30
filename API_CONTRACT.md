# API Contract

This document summarizes the interfaces exposed by the Automation Script
project. Although Apps Script primarily operates through triggers and
spreadsheet interactions, several entry points are treated as public APIs for
integrators.

## Web App Endpoint

- **URL**: Deployment-specific URL managed by CI (see
  `WEBAPP_DEPLOYMENT_ID`).
- **Method**: `GET`
- **Handler**: `doGet`
- **Response**: Renders `index_ui.html`, the primary user interface.
- **Notes**: Inputs are sanitized before rendering. Do not expose Script
  Properties or sensitive configuration values directly to the client.

### POST Handler

- **Method**: `POST`
- **Handler**: `doPost`
- **Routing**: Path-based routing under `/auth`, `/events`, `/attendance`,
  `/votes`, `/streams`, `/shop`, and `/subs`.
- **Authentication**: Requires `Authorization: Bearer <JWT>` header using the
  shared HS256 secret stored in the `API_JWT_SECRET` Script Property. Tokens are
  validated for signature, expiration, and not-before claims.
- **CORS**: Origins must be listed in the `API_ALLOWED_ORIGINS` Script Property
  (comma-separated). Requests from other origins receive `403` responses.
- **Rate Limiting**: Per-IP and per-user (based on JWT `sub`) limits enforced
  via `CacheService`. Limits configurable with `API_RATE_LIMIT_IP`,
  `API_RATE_LIMIT_USER`, and `API_RATE_LIMIT_WINDOW_SECONDS`. Responses include
  `X-RateLimit-*` headers.
- **Idempotency**: Supplying an `Idempotency-Key` header caches responses for
  24 hours using `CacheService` with a spreadsheet fallback defined by
  `API_IDEMPOTENCY_SHEET`.
- **Request/Response Format**: JSON payloads. Validation errors return HTTP
  `400` with detailed messages. Successful responses include pagination headers
  (`X-Page`, `X-Per-Page`, `X-Total-Count`, `X-Total-Pages`) when applicable.

#### `/auth`

- `POST /auth/verify`: Returns the validated JWT claims.
- `POST /auth/introspect`: Returns token activity metadata.

#### `/events`

- `POST /events/list`: Returns paginated event listings honouring pagination
  headers.
- `POST /events/create`: Creates a new event; requires `title` and
  ISO8601 `startTime`.

#### `/attendance`

- `POST /attendance/list`: Returns paginated attendance entries.
- `POST /attendance/mark`: Marks attendance for an event using `eventId`,
  `playerId`, and `status`.

#### `/votes`

- `POST /votes/results`: Returns vote tallies with pagination.
- `POST /votes/submit`: Submits a vote (`pollId`, `selection`, optional
  `voterId`).

#### `/streams`

- `POST /streams/list`: Returns registered live streams.
- `POST /streams/register`: Registers a stream for an event (`eventId`,
  `streamUrl`).

#### `/shop`

- `POST /shop/list`: Returns paginated shop orders.
- `POST /shop/order`: Creates a new shop order (`itemId`, `quantity`).

#### `/subs`

- `POST /subs/list`: Returns subscription records.
- `POST /subs/create`: Creates a subscription (`memberId`, `planId`).

## Install Function

- **Function**: `installForCustomer`
- **Purpose**: Reads the Sheet Config tab, validates required keys, persists
  configuration to Script Properties, and ensures triggers are created
  idempotently.
- **Input**: None (relies on the active spreadsheet context).
- **Output**: Returns the string `Install OK` on success.
- **Failure Modes**:
  - Missing Sheet Config tab.
  - Required keys (`SHEET_ID`, `ENV`, `SYSTEM_VERSION`) not present.

## Scheduled Jobs

- **Functions**: `runHealthCheck`, `runWeeklyJobs`, and any future triggers
  created via `ensureTimeTrigger`.
- **Invocation**: Managed by time-based triggers. Each handler must be
  idempotent and log structured success/failure messages.
- **Retry Strategy**: Trigger handlers should catch and log recoverable errors,
  then rethrow to allow Apps Script's native retry behavior.

## HTTP Utility

- **Function**: `fetchJson(url, options, tries, delay)`
- **Purpose**: Standardized outbound HTTP client with exponential backoff, JSON
  parsing, and robust error signaling.
- **Behavior**:
  - Retries up to `tries` times (default 4) with a base delay provided in
    milliseconds.
  - Throws an error after the final attempt with context about the failing URL.

## Version Probe

- **Function**: `SA_Version`
- **Purpose**: Returns the current system version from Script Properties to
  assist with deployment validation and monitoring.
- **Response**: Version string or `unknown` when the property is not set.

For any additions or changes to these interfaces, update this contract and
notify downstream consumers via the changelog or release notes.
