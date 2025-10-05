# CORS QA — 2025-10-05

## Summary
- ❌ `qa/curl-cors.sh` was not executed.

## Details
- The script requires the real staging/dev base URL and authentication headers that are distributed only through the secure CI secrets store.
- Those secrets are intentionally unavailable in this sandbox environment to prevent accidental leakage.
- Running the script without valid credentials would produce misleading failures, so it was skipped.

## Next Steps
1. Run `bash qa/curl-cors.sh` from a workstation with access to the staging environment credentials.
2. Capture the full terminal output (including HTTP status codes and timing data) and store it in this file.
3. Verify that the recorded output demonstrates the expected CORS headers for all tested endpoints.
