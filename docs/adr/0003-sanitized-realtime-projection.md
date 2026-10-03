# ADR 0003: Sanitized Realtime Projection Table

## Status
Accepted

## Context
Subscribing public clients to database changes must never expose confidential inspection notes, operator identities, or internal audit logs.

## Decision
- Maintain a dedicated projection table: `bridge_public_status`.
- This table contains only public fields: `bridge_id`, `condition`, `status_revision`, `public_revision`, `reported_at`, `public_note`, and `is_published`.
- Supabase Realtime / client subscriptions listen only to this table with an `is_published = true` policy.
- Unpublishing a bridge updates `is_published = false` atomically, cutting off public SELECT access.
