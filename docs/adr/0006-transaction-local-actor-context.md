# ADR 0006: Transaction-Local PostgreSQL Actor Context

## Status
Accepted

## Context
When running behind a database connection pooler (e.g. Supabase Supavisor or PgBouncer), pooled connections are shared across distinct HTTP requests. Session-level variables (`SET app.user_id = ...`) could leak to subsequent transactions checked out by different users.

## Decision
- Always use `set_config('app.current_user_id', value, true)` with the third argument `is_local = true`.
- In PostgreSQL, `is_local = true` ensures that the setting applies exclusively to the active transaction and is automatically reset upon `COMMIT` or `ROLLBACK`.
- Our transaction wrapper `withTransaction(..., actorContext)` sets these parameters on the dedicated client and guarantees cleanup.
