# ADR 0004: Redis as a Non-Authoritative Cache and Rate Limiter

## Status
Accepted

## Context
Redis provides rapid key-value lookups and rate-limiting counters. However, Redis outages or restarts must not degrade condition data integrity.

## Decision
- Redis is used exclusively for:
  1. Distributed rate limiting (`@fastify/rate-limit`).
  2. Public directory metadata caching with short TTL and outbox-driven invalidation.
- If Redis is unavailable, the API operates in degraded mode, bypassing the cache and falling back to PostgreSQL without failing public reads.
- Redis outages must never fabricate a `NORMAL` state or alter condition records.
