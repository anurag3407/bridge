# Runbook: Handling Database Degradation or Outage

## Severity: High
## Affected Services: `apps/api`, `apps/worker`, Condition Updates

### Symptoms
- Fastify `/health/ready` returns 503 Unavailable.
- Condition report submissions return database timeout errors.
- Public client shows `OFFLINE` or `RECONNECTING` connection pills.

### Procedure
1. **Never fabricate NORMAL condition:**
   The frontend is designed to preserve the last-known condition while displaying `OFFLINE` and marking the report as potentially `STALE`. Do not configure any fallback that defaults condition to `NORMAL`.
2. **Verify PostgreSQL status:**
   ```bash
   # For local docker environment:
   docker ps | grep postgres
   docker logs bridge-postgres --tail 100
   ```
3. **Check connection pool saturation:**
   Inspect active connections and lock waits:
   ```sql
   SELECT pid, age(clock_timestamp(), query_start), usename, query, state 
   FROM pg_stat_activity 
   WHERE state != 'idle';
   ```
4. **Restart API instances gracefully once PostgreSQL recovers:**
   The API will automatically re-establish pool connections and return healthy on `/health/ready`.
