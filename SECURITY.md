# Security Policy

## Purpose
- Protect customer data, club operations, and integrations that run on the Syston Tigers Automation platform.
- Provide clear expectations for secure development, deployment, and incident handling.

## Reporting Security Issues
- Email security@systontigers.com with detailed reproduction steps, impacted components, and observed timestamps.
- Encrypt submissions with our PGP key (fingerprint: 3F5C 0A4E 7AC1 22B4 5D9E  90B0 8AF0 11D3 0C6F 41AF) when sharing sensitive logs or proofs of concept.
- We acknowledge reports within 24 hours and share remediation plans or status updates within three business days.

## JWT Handling
- Sign all JSON Web Tokens with the service account private key stored in Script Properties; keys are rotated at least every 90 days.
- Use `RS256` for token signatures and validate both the signature and `aud`, `iss`, and `exp` claims on every request.
- Reject tokens older than 15 minutes and require a fresh refresh-token exchange for continued access.
- Store refresh tokens only in encrypted Script Properties and revoke them immediately if suspicious activity is detected.

## Rate Limiting
- Apply per-customer quotas for inbound webhook requests (default: 300 requests per minute) enforced through CacheService counters.
- Throttle outbound HTTP calls to third-party APIs to 60 requests per minute per integration to avoid abuse and cascading failures.
- Automatically blacklist sources that exceed limits for more than five consecutive windows and notify the on-call engineer.

## Identity-Aware Proxy (IAP) Verification
- Require all administrative traffic to originate from Google Cloud IAP; block requests lacking the `X-Goog-IAP-JWT-Assertion` header.
- Validate the IAP JWT signature against Google public keys, confirm the `aud` matches our OAuth client ID, and enforce email domain allow-lists.
- Log verified principal email addresses (with redaction where required) for traceability while excluding PII from standard logs.

## Continuous Review
- Reassess this policy quarterly or after any major incident to ensure emerging threats and compliance obligations are addressed.
- Document changes in the repository changelog and communicate updates to all maintainers and on-call responders.
