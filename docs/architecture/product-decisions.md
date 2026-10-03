# Product Decisions and Defaults

This document records the safe operational defaults established for the Bridge Operations Platform.

## 1. Safe Implementation Defaults

- **Condition Semantics:**
  - `UNKNOWN`: The initial state for all bridges upon creation. Represents an unassessed bridge or deliberately reset baseline. Never default to `NORMAL`.
  - `NORMAL`: Displayed publicly as "Reported normal", never "Safe". Indicates that the latest operator physical or remote check observed clear road conditions.
  - `BROKEN`: Road surface or structural deck damage reported. Triggers a prominent amber warning marker positioned at the bridge road deck.
  - `DANGER`: Severe operational hazard reported. Triggers a critical red hazard beacon and banner.
- **Reporting Invariants:**
  - `BROKEN` and `DANGER` require a non-empty private observation reason detailing the physical defect.
  - Transitioning from `BROKEN` or `DANGER` to `NORMAL` requires a resolution explanation.
  - Same-condition submissions are permitted as explicit daily re-inspections, incrementing monotonic revision and recording history.
- **Freshness Policy:**
  - 24 hours (`STATUS_FRESHNESS_SECONDS=86400`) is the default UI freshness threshold. Reports older than 24 hours receive a `STALE` indicator.
- **Public Visibility vs Confidentiality:**
  - Public projection (`bridge_public_status`) contains only sanitized data: condition, status revision, public revision, reported timestamp, and approved public note.
  - Private reasons, internal actor IDs, and audit records remain isolated behind PostgreSQL Row Level Security.
