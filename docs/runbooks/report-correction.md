# Runbook: Operator Report Correction

## Purpose
Guide operators and administrators on resolving incorrect or mistakenly submitted condition reports.

## Invariant
**Never modify or delete rows from `bridge_status_history`.** History is immutable and audited. Corrections are submitted as subsequent attributed reports.

### Steps to Correct a Report
1. Authenticate as the assigned operator or super administrator.
2. Navigate to the bridge report console: `/operator/bridges/:bridgeId`.
3. Select the correct condition (e.g., restoring to `NORMAL` if `BROKEN` was submitted accidentally).
4. Provide an explicit corrective explanation in the Private Reason field:
   `"Correction: Prior report entered in error; actual deck surface inspection shows clear lanes."`
5. If the previous report included a misleading public note, supply an updated public note or leave it empty.
6. Commit the report. This creates a new monotonic revision, preserves full audit history, and updates the public projection immediately.
