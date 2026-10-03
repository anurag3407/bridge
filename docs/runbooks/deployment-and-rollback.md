# Runbook: Deployment and Safe Rollback

## 1. Migration and Deployment Order
1. Apply backward-compatible database schema migrations:
   ```bash
   pnpm db:migrate
   ```
2. Deploy Fastify API (`apps/api`) and Background Worker (`apps/worker`).
3. Deploy Next.js Web frontend (`apps/web`).
4. Verify health endpoints:
   - `GET /health/live` returns 200 Live.
   - `GET /health/ready` returns 200 Ready.
5. Execute smoke tests across public directory and operator login.

## 2. Safe Rollback Procedure
1. If application defects are discovered, roll back web and API containers to the previous version tag.
2. Database schema additions (expand-phase migrations) are backward-compatible and do not require destructive down-migrations on live data.
3. If an asset model or viewer config has visual defects:
   - Super admins can revert the active version in `bridge_assets` to the prior verified version without breaking the application.
