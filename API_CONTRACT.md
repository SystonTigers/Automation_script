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
- **Request Body**: Plain text or JSON payloads defined by the invoking
  service.
- **Response**: `text/plain` with the message `OK` for successful requests.
- **Error Handling**: Errors should be thrown with descriptive messages and
  will surface as HTTP 500 responses. Consumers should implement retries with
  backoff.

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
