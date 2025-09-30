# Privacy Notice

This document explains how the Automation Script project handles data while
automating Google Workspace workflows. The focus is on transparency and
minimizing the amount of information we process.

## Data Sources

- **Google Sheets** – Configuration and operational data reside in
  customer-owned spreadsheets. The script reads and writes ranges defined by
  the Sheet Config tab and never stores sheet contents outside Google
  Workspace.
- **Google Drive** – Files may be accessed when workflows require reading
  templates or exporting reports. Access is limited to the permissions granted
  to the Apps Script project.
- **External APIs** – When integrations are configured, the script
  communicates with the endpoints listed in the Sheet Config tab. All outbound
  requests are authenticated using credentials supplied by the customer.

## Data Handling Principles

1. **Least Privilege** – The script requests only the OAuth scopes required to
   execute the documented workflows.
2. **No Persistent Storage** – We do not persist customer data on external
   servers. Script Properties store configuration keys only; sensitive values
   should be rotated by the customer.
3. **Secure Logging** – Operational logs avoid including personally
   identifiable information. When debugging requires context, sensitive values
   are hashed or redacted.
4. **Idempotent Operations** – Installers and triggers are designed to re-run
   safely, ensuring repeated executions do not leak or duplicate data.

## Access Controls

- Contributors interact with production resources only through the established
  CI pipeline and service accounts.
- Manual testing should use sandbox spreadsheets or copies of production data
  with sensitive fields removed.
- Customers maintain control of their configuration sheets and can revoke
  access by removing the Apps Script project or changing sharing settings.

## Incident Response

If you suspect a privacy incident:

1. Immediately disable triggers that interact with the impacted data source.
2. Notify the maintainers listed in `README-Developer.md` with a summary of the
   issue.
3. Capture relevant logs while respecting the no-PII policy, and document
   remediation steps in the issue tracker.

## Contact

For privacy-related inquiries, open an issue in the repository or contact the
project maintainers directly via the support channels outlined in
`README-Customer.md`.
