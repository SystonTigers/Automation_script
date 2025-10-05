# Historical Data Import

The historical import pipeline ingests legacy match data into Google Sheets while preserving idempotency and downstream consistency.

## Source Formats

| Source | Format | Required Columns |
| --- | --- | --- |
| Club archive CSV | UTF-8 CSV | `match_date`, `opponent`, `competition`, `home_away`, `goals_for`, `goals_against`, `scorers` |
| FA Full-Time export | XLSX | Same as CSV plus `fa_match_id`; convert to CSV before import. |
| Manual entry | Google Sheet tab | Must match headers listed above. |

## Import Workflow

1. Upload the CSV to Drive → `Historical Uploads/<TENANT>/pending/`.
2. Run `processHistoricalImport(fileId)` (see `../src/historical-import.gs`).
3. The script validates headers using the shared `validateHeaders` helper and normalizes dates via `../src/uk-date-utils.gs`.
4. Rows are hashed (`tenant + match_date + opponent`) to detect duplicates; duplicates are skipped with a `DUPLICATE_MATCH` warning.
5. New entries are appended to the `Historical` tab in a single `setValues` call.
6. Post-processing triggers `rebuildHistoricalAggregates()` to refresh streaks, top scorers, and summary pivots.

> 🛑 **Never** edit the `Historical` tab manually. Always re-run the importer so downstream formulas remain deterministic.

## Error Codes

| Code | Message | Resolution |
| --- | --- | --- |
| `MISSING_HEADERS` | Required column absent | Update the CSV headers to match the expected set. |
| `INVALID_DATE` | Date failed UK date parser | Correct the date format (expected `DD/MM/YYYY`). |
| `DUPLICATE_MATCH` | Match already exists | No action; importer continues. |
| `DRIVE_FILE_NOT_FOUND` | File removed before import | Re-upload the file and retry. |

## Maintenance Tasks

- Review Drive retention weekly; delete processed files older than 30 days.
- Update mappings in `mapLegacyColumns()` when clubs add new metadata fields.
- Keep the QA scenario `Historical CSV import` (see `qa/e2e-test-plan.md`) passing before each release.

---

_Last updated: 2025-10-05_
