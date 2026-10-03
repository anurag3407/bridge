# ADR 0002: PostgreSQL as the Canonical Authority

## Status
Accepted

## Context
Bridge condition reports involve public safety notices. Lost updates, concurrent write races, or stale cache fallbacks could lead to misleading public information.

## Decision
- PostgreSQL is the sole canonical source of truth for bridge status, assignments, and audit history.
- Every condition report is executed within an atomic transaction:
  1. `SELECT ... FOR UPDATE` locks the bridge's current status row.
  2. Monotonic revision verification ensures concurrent writes fail with `409 Conflict` rather than silent overwriting.
  3. Status history, public projections, and outbox records are committed in the same database transaction.
- Redis is strictly prohibited from serving as an authoritative store or fallback for condition states.
