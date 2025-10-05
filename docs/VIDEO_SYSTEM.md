# Video System Overview

This guide outlines how match footage, highlight clips, and social-ready assets flow through the automation stack.

## Pipeline Summary

| Stage | Responsible Component | Description |
| --- | --- | --- |
| Capture | Mobile filmer uploads raw footage | Manual capture of 1080p MP4/HEVC files to Google Drive staging folder. |
| Ingest | Apps Script (`../src/video-clips.gs`) | Registers footage metadata, validates naming convention, and writes records to the `Highlights` sheet. |
| Clip Selection | Apps Script UI (`../src/video-clips-enhancement.gs`, `../src/feature-toggle-dashboard.html`) | Coaches select events; UI enforces tenant + match scoping. |
| Rendering | Make.com scenario `Video Highlights Builder` | Generates clip composites, watermarks, and captions. |
| Distribution | Cloudflare Worker adapter (`../backend/src/adapters/make.ts`) | Posts the rendered asset back to the mobile app feed and schedules social pushes. |

> 🎯 **Goal:** Keep the clip workflow deterministic so that replaying the same match events reuses cached renders instead of regenerating assets unnecessarily.

## Naming Convention

| Asset Type | Pattern | Notes |
| --- | --- | --- |
| Raw footage | `YYYYMMDD-opponent-competition-camera.mp4` | Example: `20241003-oakhamleague-home-cam1.mp4`. |
| Event exports | `events_<TENANT>_<MATCH_ID>.json` | Produced by `exportEventsForHighlights`. |
| Rendered clip | `<MATCH_ID>-<EVENT_ID>-v<iteration>.mp4` | Stored in tenant Drive folder, referenced in Sheet row. |

## Operational Considerations

1. `validateEnvironment()` ensures Script Properties include `VIDEO_DRIVE_ROOT_ID`; without it, the ingest step raises a warning (captured in QA).
2. Trigger `runWeeklyJobs` schedules highlight follow-ups every Sunday at 03:00 (managed in `../src/trigger-management-svc.gs`).
3. `make-integrations.gs` attaches a `requestId` header when calling Make so reruns tie back to the originating clip job.
4. To reprocess a match, delete the rendered asset row and rerun `generateHighlightPackage(matchId)`—the system will reuse cached metadata.

## Failure Handling

| Failure Mode | Detection | Automatic Response |
| --- | --- | --- |
| Missing footage file | `registerFootage()` throws `MISSING_DRIVE_FILE` | QA checklist flags the error; no downstream processing occurs. |
| Make rendering timeout | Adapter receives `504` | Retries with exponential backoff (4 attempts) before routing to manual review queue. |
| Invalid metadata | Validation step rejects row | Error logged without PII; UI highlights offending cells. |

---

_Last updated: 2025-10-05_
