# Bridge Operations Platform — implementation plan for AI agents

> Status: planning only. No application has been implemented or tested by creating this document.
> Intended execution: an ordered, independently verifiable implementation program for a team or AI agents, not an instruction to generate an unreviewed application in a single response.
> Stack requirements: Next.js frontend, separate backend, Supabase PostgreSQL, Supabase Auth, interactive GLB bridge viewer, real-time operational status, Redis, database connection pooling, CDN delivery, and comprehensive automated testing.
> Initial delivery: one reference bridge with its own page; architecture supports many bridges and a later map view.

## 1. Goals and non-negotiable rules

Build a production-oriented foundation for displaying bridge models and operator-reported road conditions. Public visitors can inspect a bridge, rotate and zoom its model, and see its latest reported condition. Road operators update only their assigned bridges. Super admins manage bridges, assignments, models, and platform-wide administration.

### 1.1 Required outcomes

- A public bridge directory and stable `/bridges/[slug]` detail pages.
- An accessible, responsive 3D viewer with rotate, zoom, bounded pan, reset view, loading, error, retry, and non-WebGL fallback states.
- A road condition badge and a correctly positioned 3D warning marker when a condition is broken or dangerous.
- Separate operator and super-admin interfaces, protected both in the UI and at the API/database layers.
- Authenticated, authorized, validated, transactional status updates with immutable history.
- Real-time public updates with revision tracking, recovery, and polling fallback.
- PostgreSQL as the source of truth; Redis is not the authority for condition or permissions.
- A tested, documented monorepo that separate frontend, backend, infrastructure, and QA contributors can work on without sharing implementation internals.
- Repeatable local setup, CI, deployments, rollback instructions, and operational runbooks.

### 1.2 Safety and scope rules

1. Never display `NORMAL` because an API call failed, Redis is unavailable, a model has not loaded, or no status exists.
2. `UNKNOWN`, stale information, and connectivity problems must remain visible as distinct states.
3. The application displays **operator-reported information**, not a structural safety assessment. Do not claim that a bridge is safe for travel or certified safe.
4. No credentials, Supabase service-role keys, database passwords, or privileged Redis/CDN tokens may enter browser bundles.
5. UI route guards are convenience, not authorization. Every API operation must enforce permission independently.
6. Do not infer which mesh represents the road from a model filename or arbitrary mesh name.
7. Do not synthesize geographic coordinates or bridge location from the GLB's local coordinates.
8. Keep user-supplied assets and existing work intact. Do not overwrite the original GLB.
9. Build a modular monolith first, not speculative microservices, Kubernetes, or a custom authentication system.
10. Do not claim production readiness or passing tests without recorded evidence.

### 1.3 Explicit MVP non-goals

- A maps UI, navigation, route planning, geographic clustering, or geospatial analytics.
- Sensors, IoT ingestion, computer-vision damage detection, or automated safety decisions.
- Per-road-segment statuses, traffic lanes, inspection workflows, work orders, and incident dispatch.
- Multiple customer organizations, billing, and tenant administration. If multi-tenancy becomes a requirement, revisit the schema and every authorization rule before enabling it.
- A general-purpose 3D editor or arbitrary user asset marketplace.
- Native mobile applications or offline write synchronization.
- High availability guarantees without the infrastructure and operational capacity to support them.

## 2. Reference asset and unresolved product inputs

### 2.1 Inspected reference file

The reference supplied for initial development is `/Users/jarvis/Downloads/bridge.glb`.

A read-only inspection during planning found:

| Property | Observed value |
| --- | --- |
| File length | 2,878,408 bytes, approximately 2.75 MiB |
| Container | GLB, glTF version 2 |
| Header length | Matches actual file length |
| Generator | Khronos glTF Blender I/O v5.2.40 |
| Scenes | 1 |
| Nodes | 41 |
| Meshes | 36 |
| Materials / textures / images | 0 / 0 / 0 |
| Declared glTF extensions | None |
| External buffer or image URIs | None found in the JSON chunk |

This establishes container metadata only. It is not a full glTF validation, rendering test, triangle count, structural assessment, or verification of useful mesh names.

The supplied JSON excerpt contains heterogeneous transforms and BIM-style node names. Inspect world-space bounds, orientation, scale, and geometry before selecting a camera, road highlight, or warning anchor. No materials are declared; assess the default appearance and apply reversible viewer-side material overrides only if appropriate.

### 2.2 Safe implementation defaults

Use these defaults unless the user specifies otherwise:

- Public visitors may read published bridge metadata and sanitized condition snapshots.
- Operators must be assigned to a bridge before accessing its management data or changing its condition.
- Super admins can manage all bridges and assignments and can submit status corrections with recorded attribution.
- Newly created bridges start `UNKNOWN`, never `NORMAL`.
- The public interface calls `NORMAL` “Reported normal,” not “Safe.”
- MVP road condition applies to the bridge as a whole; a marker anchors it visually to the road.
- Publication and retirement are soft lifecycle operations; preserve status history.
- Timestamps are stored in UTC and localized only for presentation.
- A configurable 24-hour freshness threshold is an initial UI default, not a safety standard. It must be confirmed by the project owner before live use.
- Public model delivery is acceptable for published models unless licensing or confidentiality says otherwise.
- Super-admin MFA is required before production launch. Operator MFA policy must be explicitly decided.

### 2.3 Inputs needed before live deployment

- Actual bridge name, slug, description, ownership, publication permission, and asset license.
- Real coordinates, if known, including coordinate source and accuracy; otherwise leave them null.
- Who may declare `DANGER`, who may restore `NORMAL`, and whether restoration requires a second reviewer.
- Local operational definitions for `BROKEN`, `DANGER`, and stale reports.
- Whether public users should see all published bridges and models.
- Hosting regions, expected number of bridges/operators, concurrent visitors, budget, retention, privacy obligations, and recovery targets.
- Supabase project, Redis, Cloudflare account, domains, and email configuration; secrets arrive later through environment configuration.
- Initial super-admin identity and a secure bootstrap approval.

Agents may continue local implementation with the safe defaults. They must not invent these deployment inputs or silently replace policy decisions with code.

## 3. Architecture decisions

### 3.1 Recommended stack

| Layer | Choice | Reason |
| --- | --- | --- |
| Frontend | Next.js App Router, React, TypeScript | Public pages, dashboards, SSR, route-level loading/error handling |
| UI | Tailwind CSS, accessible component primitives | Consistent responsive UI without building accessibility primitives from scratch |
| 3D | Three.js through React Three Fiber and Drei | GLB loading, orbit controls, annotations, camera fitting |
| Server state | TanStack Query | Fetching, invalidation, retries, snapshot reconciliation |
| Authentication | Supabase Auth and official SSR helpers | Shared identity provider; browser and server session support |
| Backend | Fastify, TypeScript, Node.js | Independent, typed HTTP API with schema validation and module boundaries |
| API contracts | Zod plus compatible OpenAPI tooling | Runtime validation and shared transport contracts |
| Database | Supabase PostgreSQL, SQL migrations, `pg` | Explicit transactions, inspectable permissions, pooling compatibility |
| Realtime | Supabase Realtime Postgres Changes on a sanitized public projection | Avoid exposing operational/audit tables or maintaining a custom socket service |
| Cache / coordination | Redis through a provider-compatible client | Rate limits, non-authoritative metadata cache, bounded worker coordination |
| Object delivery | Cloudflare R2 with custom-domain CDN configuration | Immutable versioned asset delivery and separation from app servers |
| Asset optimization | glTF Transform / Khronos validator; benchmark Draco | Measured optimization instead of assumed savings |
| Tests | Vitest, React Testing Library, Playwright, PostgreSQL/Redis integration tests | Coverage across domain, UI, real infrastructure, and user journeys |
| Observability | Structured JSON logs, error reporting adapter, metrics / tracing adapters | Provider-neutral operational diagnostics |
| Package management | pnpm workspaces with a task orchestrator such as Turborepo | Independent workspaces, reproducible tasks, shared tooling |

Pin mutually compatible stable package versions and the active Node LTS at implementation time. Read package documentation before choosing version-dependent APIs. Commit a lockfile; do not use floating `latest` dependencies in the finished repository.

### 3.2 Important clarification: CDN versus Draco

Cloudflare CDN and Google's Draco are not competing alternatives:

- A CDN delivers and caches the asset near visitors.
- Draco compresses mesh geometry inside a glTF/GLB asset and requires a browser decoder.
- KTX2/Basis addresses texture compression; it is irrelevant to the reference asset until textures exist.
- Meshopt is another geometry optimization option worth comparing, not a mandatory second decoder.

Recommended default: Cloudflare delivery plus a measured choice of uncompressed, Draco, or Meshopt GLB. The initial asset is small enough that uncompressed delivery may beat compression once decode time is included. Do not promise Draco is best without measuring file size, first useful frame, memory, and decode time on representative mobile hardware.

Host any required decoder files on the same controlled asset origin, pin their version, and allow them in the CSP. Do not rely on an unrelated public decoder CDN or runtime package URL.

### 3.3 Runtime shape

```text
Public / authenticated browser
  ├── Next.js web application
  │     ├── Public directory and bridge pages
  │     ├── Operator / admin routes
  │     ├── Supabase Auth session helpers
  │     └── API client, query state, 3D viewer
  ├── Fastify API over HTTPS
  │     ├── JWT verification and account checks
  │     ├── Bridge / status / assignment / asset modules
  │     ├── PostgreSQL transactions through bounded pooling
  │     └── Redis rate limits and metadata cache
  ├── Supabase Realtime (sanitized published status only)
  └── Asset CDN (immutable GLB, decoders, thumbnails)

Background worker
  ├── PostgreSQL outbox and durable processing-job records
  ├── Asset validation and optimization
  └── Cache invalidation and retry / reconciliation jobs

Supabase
  ├── Auth identities
  ├── PostgreSQL canonical state, audit history, public projection
  └── Realtime publication for explicitly allowed projection tables
```

### 3.4 Dependency boundaries

- `apps/web` can import contracts, API-client utilities, and shared UI utilities. It cannot import database, worker, or backend service internals.
- `apps/api` owns business authorization and writes. Next.js server actions and route handlers must not become a second write backend.
- `apps/worker` uses domain services and infrastructure through explicit interfaces; it does not call browser modules.
- Domain code cannot import React, Next.js, Redis, database clients, or HTTP framework objects.
- Shared contracts contain transport shapes, schemas, and stable error codes, not SQL rows or privileged configuration.
- Route handlers validate and delegate. Business logic belongs in services; persistence lives in repositories.
- If frontend proxying is needed for deployment, the proxy forwards to the API and does not reimplement policy.
- Enforce these boundaries using lint/import rules and CI, not convention alone.

## 4. Repository structure and team ownership

```text
bridge/
  plan.md
  README.md
  CONTRIBUTING.md
  SECURITY.md
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
  turbo.json
  tsconfig.base.json
  eslint.config.*
  .env.example
  .github/
    workflows/
    CODEOWNERS
    pull_request_template.md
  apps/
    web/
      src/app/
        (public)/bridges/
        (auth)/login/
        (operator)/operator/
        (admin)/admin/
      src/features/
        auth/
        bridges/
        bridge-viewer/
        bridge-status/
        operator-console/
        administration/
      src/lib/
      src/components/
      public/
      tests/
      .env.example
    api/
      src/modules/
        identity/
        bridges/
        assignments/
        status/
        assets/
        audit/
      src/plugins/
      src/config/
      src/server.ts
      src/app.ts
      tests/
      .env.example
    worker/
      src/jobs/
      src/config/
      tests/
      .env.example
  packages/
    contracts/
    domain/
    database/
    api-client/
    observability/
    test-utils/
    config/
  supabase/
    config.toml
    migrations/
    seed.sql
    tests/
  tooling/
    assets/
    scripts/
  tests/
    integration/
    e2e/
    performance/
    fixtures/
  assets/
    source/
    processed/
  docs/
    architecture/
    adr/
    api/
    runbooks/
    testing/
  infra/
    compose.yaml
    containers/
    deployment/
```

Create only the files needed for each phase; the tree is an ownership map, not a requirement for empty boilerplate directories.

### 4.1 Ownership

- Platform lead: contracts, architecture decisions, permissions, migration review, integration sign-off.
- Frontend team: web routes, dashboards, accessible UX, viewer, realtime reconciliation.
- Backend team: API modules, domain logic, database repositories, audit/outbox.
- Asset/3D team: model ingestion, coordinate conventions, optimization, visual QA.
- Infrastructure team: CI, deployments, secrets, pooling, CDN, observability.
- QA team: fixtures, acceptance tests, authorization matrix, failure injection, performance evidence.

Changes to shared contracts, migration files, authentication, or public visibility require explicit review. Parallel agents must have disjoint write scopes; nominate one migration owner to prevent timestamp collisions and conflicting schema changes.

## 5. Domain model and condition semantics

### 5.1 Canonical condition enum

```text
UNKNOWN — no verified operator report yet, or deliberately marked unassessed
NORMAL  — latest operator report says the road condition is normal
BROKEN  — damage reported; public warning required
DANGER  — dangerous condition reported; prominent public warning required
```

Do not combine report state with network state. The frontend derives separate fields:

```text
condition: UNKNOWN | NORMAL | BROKEN | DANGER
freshness: fresh | stale | unreported
connection: connecting | live | reconnecting | polling | offline
```

A stale `DANGER` report stays `DANGER` with a stale label. A stale `NORMAL` report is not reassured as current. Disconnecting must not mutate the stored condition.

### 5.2 Transition rules

- Active assigned operators and active super admins may submit a report.
- All reports require an `expectedRevision` and an idempotency key.
- `BROKEN` and `DANGER` require a private reason with a bounded length; a separately approved public note is optional.
- Changing `BROKEN` or `DANGER` to `NORMAL` requires a resolution reason.
- Repeating the same condition is permitted as an explicit re-inspection/report; create history, update report time, and increment revision.
- Retired bridges cannot receive new reports.
- Unpublishing does not delete canonical state or history.
- Record initial revision `0` with `UNKNOWN`; every committed report increments by exactly one.
- Do not auto-promote a condition to `NORMAL` based on elapsed time.

### 5.3 Core database tables

Use explicit SQL migrations, constraints, foreign keys, indexes, UTC `timestamptz`, and typed repository mapping.

#### `profiles`

- `user_id uuid primary key references auth.users(id)`.
- `display_name`, `account_status` (`active` / `disabled`), created/updated timestamps.
- Do not expose email addresses publicly; use Auth/admin identity endpoints where appropriate.
- Use soft disabling and preserve audit attribution; define any later legal-erasure flow separately.

#### `platform_roles`

- `user_id`, `role` (`super_admin`), timestamps, `granted_by`.
- Operators are identified through bridge assignments rather than a redundant globally privileged operator role.
- No client may self-grant a role. Do not authorize from editable Auth `user_metadata`.

#### `bridges`

- UUID primary key, unique normalized slug, display name, description.
- `lifecycle` (`draft` / `published` / `retired`), lifecycle revision, created/updated timestamps.
- Nullable `latitude` / `longitude`, both present or both null, numeric range checks, WGS84 convention.
- Optional location label and coordinate provenance; no invented coordinates in seed data.
- Keep publication lifecycle distinct from road condition.
- For MVP, freeze published slugs; later renames need an explicit redirect table.

#### `bridge_operator_assignments`

- `bridge_id`, `user_id`, `assigned_by`, assigned/revoked timestamps.
- At most one active assignment per `(bridge_id, user_id)` through a partial unique index.
- Multiple operators may manage a bridge. An operator may manage multiple bridges.
- Index active assignments by user and by bridge.

#### `bridge_current_status`

- `bridge_id primary key`, condition enum, `revision bigint`, `reported_at`, `updated_by`.
- Initialize in the same transaction as bridge creation.
- This row is the canonical current state; private reasons remain in history.
- Use a row lock or a compare-and-swap update to prevent lost updates.

#### `bridge_status_history`

- UUID, bridge ID, old/new condition, old/new revision, actor ID.
- Private reason, approved public note, request ID, event timestamp.
- Unique `(bridge_id, new_revision)` for one canonical event per report.
- Append-only. Normal runtime roles cannot update or delete it.
- Index `(bridge_id, new_revision desc)` for cursor pagination.

#### `bridge_public_status`

- Exactly one sanitized row per published bridge: bridge ID, condition, status revision, reported time, safe public note, `is_published`, monotonically increasing `public_revision`.
- No actor ID, private reason, operator identity, internal asset key, or audit payload.
- Maintain it atomically with status and publication changes.
- Expose only rows where `is_published = true` through public SELECT policy.
- Unpublish by setting `is_published = false`, not by relying on a public DELETE event.
- Status revision changes only for reports; public revision also changes for publication transitions. Handle them as separate clocks.
- Enable Realtime only for this table in MVP.

#### `bridge_assets`

- Asset UUID, bridge ID, immutable version, upload/processing state.
- Source checksum and key, selected processed key/checksum, MIME type, byte count.
- Geometry statistics, optimization method, validator result reference, source provenance/license.
- `uploaded_by`, timestamps; source location remains private.
- Asset states: `awaiting_upload`, `uploaded`, `validating`, `processing`, `ready`, `failed`.
- Only a `ready` asset may become the published model.

#### `bridge_viewer_configs`

- Bridge ID, asset ID, config version.
- Model-to-viewer transform, measured bounds, camera default/limits, warning anchor, optional selected road node paths, fallback poster reference.
- Validate finite numbers, sensible limits, and asset-specific association.
- Configuration refers to the exact optimized asset; replacing an asset requires validating or replacing the config.

#### `audit_events`

- UUID, actor, action, entity type/ID, request ID, outcome, safe structured metadata, timestamp.
- Required successful state-changing audit events are written in the same transaction as the mutation.
- Never record tokens, raw credentials, signed upload URLs, or unnecessary personal information.
- Authentication failures and rejected requests go to protected security logs with retention limits, not public tables.

#### `idempotency_records`

- Actor, operation, key, normalized request hash, state/result fields, resource identifiers, timestamps/expiry.
- Unique `(actor_id, operation, key)`.
- Authorization is checked again before returning a stored successful response.
- Same key and same request returns the committed response. Same key with a different request returns conflict.
- Keep a documented initial 24-hour retention; retry deduplication is not guaranteed after expiry.

#### `outbox_events` and `asset_processing_jobs`

- Durable event/job IDs, type, entity ID/revision, payload version, attempt count, next attempt time, lease expiry, completed/dead-letter state.
- Insert outbox events in the same transaction as the corresponding mutation.
- Postgres remains the durable queue; Redis locks are optional accelerators, not the only record of work.
- Workers claim bounded batches using `FOR UPDATE SKIP LOCKED`; use short DB transactions and renewable leases while processing assets outside transactions.
- Consumers must be idempotent. Delivery is at least once, not exactly once.

### 5.4 Database invariants

- A bridge always has a current status row.
- History and current status cannot diverge after a committed report.
- Published projection cannot show a newer or older status than the canonical state from that same transaction.
- Publication changes lock the bridge and relevant projection rows in a documented order.
- All bridge-scoped mutations use one documented lock order, for example bridge → assignment authorization → current status → projection.
- Assignment revocation uses the same bridge serialization boundary as reporting, so concurrent revocation and reports have a defined order.
- Account disabling is rechecked inside a transaction with an appropriate lock; define and test the concurrent-disable behavior.
- At least one active super admin remains; serialize role-management decisions with an advisory/guard lock to prevent simultaneous removal of the last admins.
- Super-admin permissions are fetched from the database, not trusted from stale token role claims.
- Runtime identities cannot directly edit history/audit rows, publish an unvalidated asset, or change their own platform role through generic update routes.

## 6. Authentication, authorization, and database isolation

### 6.1 Supabase Auth integration

- Use email/password initially; password reset and email verification must work.
- No public self-registration in MVP unless the owner explicitly requests it. Use invitation-based onboarding.
- Use official Supabase SSR helpers for Next.js session refresh/cookie behavior and the supported browser client.
- Do not build custom JWT issuance, password storage, or cookie cryptography.
- API requests carry `Authorization: Bearer <access_token>`; backend endpoints do not accept browser cookies as authentication.
- Keep the bearer token out of URLs and logs.
- Browser-visible Supabase sessions require strong XSS defenses. Do not falsely label SSR-helper client-accessible cookies as HttpOnly.
- SSR helpers are not backend authorization: the API verifies the supplied token independently.

### 6.2 Token verification

- Prefer a Supabase asymmetric signing configuration and verify issuer, audience, signature, expiration, and allowed algorithms through a supported JWKS verifier.
- Cache JWKS with bounded lifetime and support key rotation; do not fetch keys on every request.
- Reject malformed tokens, algorithm substitution, wrong-project tokens, expired tokens, and anonymous roles for protected operations.
- If a project uses a legacy signing setup, explicitly choose the supported server verification flow; do not accidentally accept an unverified decoded JWT.
- Resolve `sub` to an active profile. Sensitive super-admin actions also enforce the required MFA assurance level.
- Keep platform roles and assignments in PostgreSQL so disabling/revocation affects subsequent operations without waiting for a JWT role claim to expire.
- Auth-provider logout may not instantly revoke already-issued JWTs; document this and rely on account/assignment checks for platform access revocation.

### 6.3 Authorization matrix

| Action | Public visitor | Assigned active operator | Unassigned operator | Active super admin |
| --- | --- | --- | --- | --- |
| Read published bridge and public status | Yes | Yes | Yes | Yes |
| Read draft bridge | No | Only if assigned | No | Yes |
| Read private status history | No | Assigned bridge only | No | Yes |
| Submit report | No | Assigned active bridge | No | Yes |
| Create/publish/retire bridge | No | No | No | Yes |
| Upload/activate bridge model | No | No | No | Yes |
| Assign/revoke operator | No | No | No | Yes |
| Invite/disable account | No | No | No | Yes |
| Grant/revoke super admin | No | No | No | Yes, subject to last-admin and MFA rules |
| View global audit | No | No | No | Yes |

Choose consistent 403/404 behavior to avoid disclosing private bridge existence. IDs being UUIDs does not remove the need for object-level authorization.

### 6.4 PostgreSQL RLS and backend connection identity

Use a documented, tested identity design rather than assuming a normal `pg` connection automatically carries a Supabase user's JWT.

Recommended MVP design:

1. Create a dedicated least-privilege API database login and a restricted `bridge_api` role through deployment provisioning.
2. Runtime login is not a superuser, table owner, migration owner, or `BYPASSRLS` role. Separate worker and migration credentials.
3. Enable and, where appropriate, force RLS on application tables. Restrict table grants and stored-routine execute grants.
4. After token verification, begin a transaction on a checked-out connection and set transaction-local actor/request context using parameterized `set_config(..., true)` calls.
5. Set a fixed restricted role if required by the chosen provisioning model. Never interpolate client-supplied role names.
6. Policies use the trusted transaction-local actor context and database roles/assignments, with helper functions reviewed for recursion and security.
7. Missing actor context must deny protected access. Rollback or commit before returning the connection; context must not survive the transaction.
8. The context mechanism is trusted only because credentials are server-only and every query flows through the verified transaction wrapper. It is not appropriate for arbitrary browser SQL or an exposed generic query endpoint.
9. Integration-test policies under the actual runtime role through the actual pool mode, not only a local owner connection.

For Supabase's public/browser path, grant `anon`/`authenticated` read access only to the deliberately public projection needed for Realtime, with `is_published` SELECT policy. Do not grant browser roles writes to operational tables. Keep private tables in an unexposed schema where practical; ensure configured Realtime schema/publication support for the projection.

A backend service-role key bypasses ordinary RLS in supported Supabase APIs; reserve it for the narrow Auth-admin adapter and controlled provisioning. Do not use it as the general-purpose data-access solution.

If security-definer routines are needed, pin `search_path`, qualify names, restrict execution, and audit their contents. Avoid RLS policies that recursively query the same protected table.

### 6.5 Security controls

- Exact CORS allowlist; no wildcard credentialed origins. Browser API requests use bearer headers without API auth cookies.
- Auth/session endpoints that use cookies follow framework/provider origin and CSRF protections; reassess if API cookies are ever introduced.
- Helmet/security headers, tight CSP, safe asset/decoder origins, frame-ancestor restrictions, MIME sniffing protection.
- Parameterized SQL, bounded bodies, content-type validation, strict query schemas, output schemas, and safe error mapping.
- Escape public/private notes; no arbitrary HTML rendering. Restrict admin-supplied model URLs to controlled delivery origins.
- Separate public, authenticated, and admin rate limits; key operator writes by verified user and trusted client IP.
- Trust forwarded IP headers only behind configured trusted proxies.
- Protect against IDOR, mass assignment, status-enum coercion, privilege escalation, pagination abuse, upload abuse, and leaked signed URLs.
- Secrets scanning, dependency checks, lockfile review, and explicit retention for security/audit logs.
- Define the deployment threat model before launch; automated checks are not a substitute for security review.

## 7. API contract

### 7.1 HTTP conventions

- Prefix `/api/v1`; publish OpenAPI generated from validated schemas.
- UUID IDs internally, stable slugs for public navigation.
- Serialize bigint revisions as decimal strings end to end; never coerce arbitrarily large revisions into JavaScript numbers.
- ISO 8601 UTC timestamps.
- JSON error shape: `{ error: { code, message, requestId, details? } }` with safe field errors only.
- Cursor pagination with fixed maximum limits and documented ordering.
- Explicit status codes: 400 malformed input, 401 invalid/missing identity, 403 forbidden, 404 unavailable resource, 409 concurrency/idempotency conflict, 413 oversized upload/body, 429 rate-limited, 503 unavailable dependency.
- Configure auth responses and all mutable condition responses as `Cache-Control: no-store`.
- Request IDs returned in headers and logs; reject unsafe/unbounded client-provided IDs.
- Generated/typed API client handles transport errors without depending on backend internals.

### 7.2 Public endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /bridges` | Published bridge directory, bounded filters/pagination |
| `GET /bridges/:slug` | Published metadata, active model/viewer manifest, fresh canonical public snapshot |
| `GET /bridges/:bridgeId/status` | Small authoritative snapshot for reconnect/polling |

Public payloads contain approved metadata, asset URLs/configuration, condition, report time, status revision, public revision, and server observation time. Never return private history, assignments, emails, internal object keys, or actor IDs.

### 7.3 Authenticated/operator endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /me` | Current active account, permissions, permitted dashboard navigation |
| `GET /me/bridges` | Assigned bridges and management summaries |
| `GET /operator/bridges/:bridgeId` | Authorized private detail |
| `GET /bridges/:bridgeId/history` | Authorized private history with revision cursor |
| `POST /bridges/:bridgeId/reports` | Submit condition report |

Example report body:

```json
{
  "condition": "BROKEN",
  "reason": "Damage observed during the road inspection.",
  "publicNote": "Road damage reported; consult the responsible authority.",
  "expectedRevision": "4"
}
```

The request also carries a bounded `Idempotency-Key` header. Return the authoritative resulting snapshot and report identifier. If concurrent reporting changes revision, return 409 and require the client to refetch; do not silently overwrite.

### 7.4 Super-admin endpoints

- Bridge creation, metadata edits, publication/retirement.
- Operator invitations and account disabling through a narrow Supabase Auth-admin adapter.
- Assignment creation/revocation and role grant/revocation with last-admin safeguards.
- Asset upload initiation, completion verification, processing status, and asset activation.
- Viewer configuration changes and preview before publication.
- Private audit search with bounded time windows and pagination.

Do not provide generic arbitrary-table CRUD. Model admin actions explicitly and validate each permission and invariant.

### 7.5 Atomic report algorithm

1. Verify token, parse/validate request, apply rate limit.
2. Begin a transaction, attach actor context, lock the relevant active-account/bridge authorization boundary.
3. Verify account, lifecycle, assignment or super-admin role; enforce MFA where applicable.
4. Check existing idempotency record under uniqueness/locking rules; reauthorize before returning a replay.
5. Lock current status and compare the expected revision.
6. Validate transition and required reasons.
7. Increment canonical revision, update report time and actor.
8. Append status history and audit event.
9. Update public projection if published, incrementing public revision.
10. Insert durable outbox event and store idempotent response data.
11. Commit, then return success.
12. Any failure rolls back everything; a cache or realtime dispatch error after commit must not mislabel the report as uncommitted.

Use bounded retry only for safe transaction failures such as deadlocks/serialization errors, respecting idempotency. Never retry arbitrary side effects blindly.

## 8. Pooling, Redis, and background work

### 8.1 Database connections

- Use Supabase's supported pooled transaction connection for API/worker traffic, with TLS and verified certificate behavior according to the provider's deployment guidance.
- Use direct/session-compatible connections for migrations or administrative tasks that require them.
- Application `pg.Pool` is a bounded local pool above the hosted pooler; do not confuse its size with available PostgreSQL backend connections.
- Start with a small per-process pool, for example 5 connections, and calculate total process/replica/worker pressure against provider limits.
- Set connection-acquisition, statement, lock, and idle-in-transaction timeouts.
- Keep transactions short. Never download assets, call Auth email APIs, or optimize meshes while holding a transaction.
- Transaction pooling does not preserve session state. No session-scoped actor context, session advisory locks, `LISTEN`, or connection-affine assumptions.
- Confirm driver/prepared-statement compatibility with the chosen pool mode; avoid named session-bound prepared statements unless explicitly supported.
- Always use `try/finally` connection release and rollback on failure; gracefully drain pools on shutdown.
- Monitor acquisition wait time, active/idle connections, transaction duration, lock waits, and slow queries.

### 8.2 Redis scope

Use Redis for:

- Distributed rate-limit counters with atomic operations compatible with the selected provider.
- Published bridge directory/metadata caches, with short TTL and outbox-driven invalidation.
- Optional worker coordination where the underlying job is durable in PostgreSQL.

Do not use Redis for:

- Canonical condition, mandatory audit history, durable sole job storage, or authority over assignments/roles.
- Pub/Sub as a guaranteed-delivery event system.
- A cached `NORMAL` fallback when PostgreSQL is unavailable.

### 8.3 Cache rules

- Initial keys are namespaced/versioned, for example `bridge-platform:v1:bridge-metadata:<id>`.
- Cache only public, sanitized metadata by default; no mixed public/private cache entries.
- Dynamic condition endpoints and the public status projection read PostgreSQL in MVP.
- Directory cache must exclude condition or fetch current status separately; lifecycle/visibility is rechecked authoritatively before returning sensitive/unpublished content.
- Immutable model bytes have long CDN TTL; metadata manifests are short-lived or no-store and rechecked for publication.
- Use jittered TTL, bounded values, and invalidation tied to durable outbox events.
- Redis outages bypass metadata cache. Protected writes use a conservative bounded local limiter or return 503 according to a documented security policy; do not silently remove rate limits across a cluster.
- Retry failed invalidations. Cache correctness does not depend on Redis successfully receiving every event.
- Ensure Next.js fetch/route caching does not override the no-store status policy; audit service-worker behavior if one is added later.

### 8.4 Worker behavior

- Claim durable jobs with leased ownership; recover after worker crashes.
- Enforce attempt limits, exponential backoff, jitter, and dead-letter visibility.
- Use job/asset version identifiers for idempotency.
- Asset CPU/memory/time limits are independent from HTTP API resources.
- Graceful shutdown stops new claims and safely releases or expires leases.
- Reconciliation periodically detects stuck assets, unprocessed outbox events, and projection drift.
- Projection drift repair must be transactional and observable, not a silent overwrite of canonical state.

## 9. Real-time design and reconciliation

### 9.1 Subscription contract

Use Supabase Postgres Changes for the sanitized `bridge_public_status` table and filter subscriptions to the visible bridge where supported.

- Test anonymous subscription behavior against local and hosted-like configuration; RLS, schema grants, publication membership, and column visibility must all be correct.
- Public projection rows contain no private data even if subscription filters are incorrectly configured.
- Never subscribe public clients to status history, profiles, assignments, or audit tables.
- No claim of exactly-once delivery or guaranteed event history.

### 9.2 Race-safe client sequence

1. Create one scoped subscription and wait for its subscribed state; buffer incoming projection events temporarily.
2. Fetch a fresh HTTP snapshot.
3. Apply buffered events only if their public revision is newer than the snapshot and they belong to the current bridge.
4. If events reveal a status/public revision gap, refetch the snapshot. The latest snapshot is sufficient; do not require replaying all intermediate reports.
5. For steady-state events, ignore duplicates and older revisions; invalidate the query or merge the sanitized current snapshot safely.
6. On reconnect, always refetch before declaring the view live/current.
7. Refetch on tab visibility restore and on configured freshness timers.
8. Cancel and clean up subscriptions, timers, buffered events, and in-flight requests on bridge changes/unmount.

Use `BigInt` or a decimal-string comparison helper for revisions. Scope all callbacks by bridge and subscription generation so an old bridge's response cannot update a new route.

### 9.3 Polling fallback

- If subscription startup or reconnection fails, poll the small status endpoint, initially every 10–15 seconds with jitter/backoff.
- Polling must still operate if the subscription never reaches `SUBSCRIBED`.
- Avoid one timer per UI widget; have one bridge-status store/query owner.
- Pause unnecessary background traffic in hidden tabs and refetch immediately when visible.
- Show “Polling,” “Reconnecting,” or “Offline,” with last successful sync and report timestamps.
- Preserve the last known condition but clearly label it when stale/offline.
- A failed fetch returns an error state, not fabricated `UNKNOWN` or `NORMAL` server data.

### 9.4 Unpublication limitation

A row updated to `is_published = false` may no longer be visible under the subscriber's SELECT policy, so that subscriber cannot be assumed to receive the unpublication event. Mandatory periodic snapshots and visibility/reconnect refetches must discover 404/unavailable and remove the page from active display.

Public CDN assets already downloaded or cached are not recalled by unpublishing a bridge. Confidential models require private delivery and short-lived access control from the beginning; no cache purge provides guaranteed recall.

### 9.5 Performance targets

Initial acceptance targets under controlled test conditions:

- Committed report reflected in another healthy connected client within 2 seconds at p95.
- Polling fallback reflects changes within the configured interval plus measured API latency.
- One active subscription per viewed bridge; no leaked subscriptions after repeated navigation.
- Operator submitting a report sees the committed server result immediately, without depending on its own realtime event.

Document test region, network, client count, and infrastructure tier. These are initial engineering targets, not contractual availability guarantees.

## 10. Asset pipeline, CDN, and 3D viewer

### 10.1 Asset pipeline

1. Preserve the original model; compute SHA-256 and retain provenance.
2. For local development, copy the supplied GLB into a documented source-asset directory only after confirming availability and repository asset policy.
3. Validate GLB header/chunks, actual file size, glTF JSON, references, geometry constraints, and Khronos validator output.
4. Reject external URIs in MVP, or explicitly resolve only permitted internal resources during controlled ingestion. Never fetch arbitrary embedded URLs.
5. Enforce upload byte, geometry, decompression, memory, and processing-duration budgets. A small compressed file can still create enormous geometry.
6. Extract world-space bounds, vertex/triangle counts, draw-call estimates, node paths, unit/orientation observations, and decoder requirements.
7. Produce baseline, Draco, and optionally Meshopt candidates for the reference asset. Do not simplify engineering geometry destructively just to meet a visual target.
8. Compare visual fidelity, source-to-processed node mapping, size, decode time, render performance, and warning-anchor compatibility.
9. Choose a single default deliverable; retain source and processing report. Version all generated artifacts.
10. Produce a fallback thumbnail/poster through a deterministic documented render step.
11. Upload immutable processed objects and required decoders; create manifest and viewer configuration.
12. Activate/publish only after validation and visual inspection pass.

### 10.2 Upload security and publication

- Super-admin initiates a constrained presigned upload for a generated object key in a private staging location.
- Never trust client-provided MIME type, checksum, object URL, or declared length by itself.
- Completion endpoint confirms existence, size, checksum where supported, and ownership before enqueueing validation.
- Original/staging assets are not public. Processed selected assets become public only through explicit publication.
- Configure storage CORS separately from API CORS, allowing only required origins/methods/headers.
- Reject path traversal, arbitrary bucket/key selection, malicious JSON/external resources, invalid buffers, and decompression bombs.
- Repeated completion requests and duplicate worker deliveries are idempotent.
- Cleanup abandoned staging uploads through a retention job, never deleting active versions accidentally.

### 10.3 CDN rules

- Use a controlled custom asset domain rather than relying on a development-only object-store endpoint.
- Example immutable key structure: `bridges/<bridge-id>/<asset-version>/<content-hash>.glb`.
- Set correct GLB MIME type, long-lived `Cache-Control: public, max-age=31536000, immutable` for public versioned bytes, and correct CORS.
- Replacing a model changes the URL; never overwrite an immutable version in place.
- Keep manifests/condition JSON out of long-lived CDN caches.
- Verify delivery, caching, browser CORS, decoders, and headers from the deployed web origin.
- Configure purge rules only for exceptional revocation; they are not the normal update mechanism.
- Do not expose Cloudflare account/R2 write credentials to frontend clients.
- Keep a local-development delivery adapter so Cloudflare credentials are not required to run tests.

### 10.4 Viewer implementation

- Client-only feature boundary with Next.js-compatible dynamic loading; isolate WebGL from server rendering.
- Separate components/services: model loader, coordinate transform, camera controller, controls, status overlay, marker renderer, and viewer state.
- Model state: `idle`, `loading`, `ready`, `error`; network/status state is independent.
- Load only the viewed asset, not every model in the bridge directory.
- Fit camera to measured world-space bounds with padding; choose near/far planes and orbit target from scale, not fixed assumptions.
- Support bounded orbit/zoom, restrained pan, keyboard alternatives, reset view, touch, and resize.
- Prefer on-demand rendering and bounded DPR, initially `[1, 1.5]`, with measured device-specific adjustments.
- Use stable scene instances, avoid React rerenders per frame, and dispose resources without breaking shared loader caches.
- Clone cached scenes/materials before per-instance modifications. Preserve the original asset's geometry and transforms.
- Handle WebGL unsupported, context loss, decoder failure, CDN/CORS failure, and retry without reload loops.
- Display progress if measurable; otherwise show a honest indeterminate loader rather than an invented percentage.
- Keep public condition text visible outside the canvas so road status remains usable when the model fails.

### 10.5 Warning anchor and road highlighting

The warning marker requires a reproducible coordinate contract:

- Inspect the model and deliberately select the relevant road location; the BIM names do not prove identity.
- Store the anchor in a documented model-local coordinate system tied to the exact asset version, or explicitly in normalized viewer coordinates with its transform.
- Apply the same model-to-viewer transform to both model and annotation.
- Choose a marker offset relative to bridge size, not a hard-coded universal number.
- Warn with both icon and label; do not rely only on red/yellow colors.
- `NORMAL`: non-alarming “Reported normal” badge; no damage warning symbol.
- `BROKEN`: visible damage warning and textual status.
- `DANGER`: more prominent danger marker and banner, without inaccessible flashing.
- `UNKNOWN`: neutral unassessed indicator.
- If road mesh identifiers are stable, apply a reversible highlight to only the selected road surfaces.
- If mapping is unreliable, use an explicitly configured anchor and label rather than coloring arbitrary meshes.
- Keep essential warning text readable when the marker is occluded; do not falsify a physical crack or collapse by deforming the model.
- Re-optimize/replace model only with a matching tested viewer configuration. Node indices alone are not stable asset identifiers.

### 10.6 Rendering budgets

Initial targets, to calibrate with actual asset measurements:

- Useful viewer frame within 5 seconds on a documented throttled network and representative mid-range device.
- Smooth interactions, ideally 30+ FPS on representative mobile and 50+ FPS on reference desktop.
- No progressive memory leak after 20 bridge open/close navigation cycles.
- Avoid making the whole public page wait for WebGL; text/status and navigation load independently.
- Record file-transfer and decode/render budgets separately.
- If the model exceeds budgets, first reduce draw-call overhead, cap rendering quality, and lazy-load. Introduce geometry LOD only with measured need and fidelity review.

## 11. Frontend experience

### 11.1 Public directory

- Bridge cards with poster, name, location label if supplied, condition text, and last report time.
- Search and bounded pagination; useful empty/error/retry states.
- Do not instantiate WebGL canvases on every card.
- Drafts/retired entries are not public directory results.
- Separate metadata caching from no-store status refresh.

### 11.2 Bridge detail

- Breadcrumb, bridge title, condition banner, report time/freshness, viewer, controls, and optional approved public note.
- URL survives refresh and can be shared directly.
- Show “Operator-reported condition; follow official guidance” without implying engineering certification.
- Distinguish model loading from status connecting.
- Show unavailability for unpublished/retired bridges after authoritative checks.
- Use genuine geographic information only when supplied; no map placeholder with fabricated coordinates.

### 11.3 Operator console

- Assignment list and assigned bridge detail.
- Explicit status selection, private reason, optional public note, confirmation, submitting indicator.
- Show current condition, revision, report time, and private history.
- Warn that public notes are visible to visitors and must not contain private information.
- Disable double submission; retain form data after a retryable failure.
- Reuse the same idempotency key for the same uncertain request; use a new key after intentionally changing the report.
- On 409, show the updated report and request explicit reconfirmation. Do not automatically retry with the new revision.
- On 403 after assignment revocation, remove write affordances and explain loss of permission.
- Provide a preview of how the public status appears.

### 11.4 Super-admin console

- Bridge management, publication, assignments, invitations, account/role controls, audit search.
- Asset pipeline state and validation failure details, safe retry, activation preview.
- Viewer anchor/configuration editor or guided form with preview and validation; no requirement for a large generic 3D editor.
- Confirmation for destructive/lifecycle changes, last-admin guard, MFA prompts.
- Separate admin navigation from ordinary operator work while allowing a super admin to inspect all bridges.

### 11.5 Accessibility and responsive design

- Semantic HTML, visible focus, keyboard navigation, screen-reader labels, sufficient contrast, reduced-motion support.
- Canvas has a clear label and associated textual information; orbit gesture is never required to read status.
- Toasts/live regions are restrained and do not announce every reconnect repeatedly.
- Test desktop/tablet/mobile breakpoints, touch controls, and low-bandwidth states.
- Favor understandable operations UI over decorative dashboard charts without data.

## 12. Environment and configuration

Create separate `.env.example` files with descriptions and placeholder values only. Validate server environment on startup and fail with actionable non-secret messages.

### 12.1 Web, public configuration

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_API_BASE_URL
NEXT_PUBLIC_ASSET_BASE_URL
```

Support an explicitly documented legacy public key alternative only if the actual Supabase project requires it. Public Supabase keys are not privileged secrets; security depends on grants/RLS. Never put a service-role key under `NEXT_PUBLIC_*`.

### 12.2 API/worker server configuration

```text
NODE_ENV
PORT
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY          # narrow Auth-admin adapter only
SUPABASE_JWT_ISSUER
SUPABASE_JWT_AUDIENCE
DATABASE_URL                      # least-privilege pooled runtime identity
DATABASE_POOL_MAX
DATABASE_STATEMENT_TIMEOUT_MS
DATABASE_LOCK_TIMEOUT_MS
REDIS_URL                         # adapt to provider client/REST requirements
CORS_ALLOWED_ORIGINS
ASSET_DELIVERY_BASE_URL
R2_ACCOUNT_ID
R2_BUCKET_NAME
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
MODEL_UPLOAD_MAX_BYTES
MODEL_PROCESSING_TIMEOUT_MS
STATUS_FRESHNESS_SECONDS
LOG_LEVEL
ERROR_REPORTING_DSN               # optional server adapter
OTEL_EXPORTER_OTLP_ENDPOINT        # optional
```

### 12.3 Migration/deployment configuration

```text
MIGRATION_DATABASE_URL            # separate privileged direct/session connection
WEB_ORIGIN
API_ORIGIN
ASSET_ORIGIN
```

Use minimal configuration per service; worker/API need not receive every secret. Local mode uses local Supabase, Redis, and a filesystem/object-store adapter. Production cannot silently fall back to mocks.

Next.js public environment values may be embedded at build time; build/promote with an explicit environment strategy. Never assume changing a runtime environment variable updates an already-built browser bundle.

## 13. Testing strategy and evidence

Tests are required deliverables for each module, not a final-phase afterthought. Use real database/Redis integration tests for behavior that mocks cannot establish.

### 13.1 Test layers

1. Domain unit tests: condition transitions, required reasons, revisions, freshness, permission decisions, idempotency hashes.
2. Backend unit/component tests: schema parsing, routes, error mapping, JWT verifier adapters, service/repository interfaces.
3. Frontend component tests: banners, forms, empty/loading/error/offline states, permission-driven navigation.
4. Database integration tests: migrations, RLS, grants, constraints, atomicity, append-only permissions, concurrent updates.
5. API integration tests: real local PostgreSQL/Auth/Redis with HTTP injection or an ephemeral test server.
6. Asset tests: header/validator constraints, bad resources, optimization manifest, decoder compatibility, resource budgets.
7. Realtime integration tests: actual publication/subscription, public RLS payload, reconnect/refetch/fallback behavior.
8. End-to-end tests: real user journeys through web/API/local Supabase and model fixture.
9. Custom regression/property tests: randomized transition sequences, delayed/duplicated events, concurrent reports, role changes, malformed GLBs.
10. Accessibility, visual, performance, and security regression tests.

### 13.2 Deterministic fixtures

- Two published bridges, one draft, one retired; separate IDs/slugs.
- Super admin, operator A assigned only to bridge A, operator B assigned only to bridge B, unassigned user, disabled account, unauthenticated visitor.
- One tiny valid GLB for fast automated viewer tests, one invalid GLB, and the real reference asset for smoke/performance tests.
- Local test passwords only; no real account credentials in source or CI logs.
- Controlled clocks for freshness, idempotency expiry, and retry tests.
- Isolated database/test data namespaces for parallel runs; no tests against production.
- Cleanup handles early failures; never broad-delete unspecified project data.

### 13.3 Required authorization cases

- Missing/expired/wrong-project/invalid-signature token rejected.
- Operator A cannot read private bridge B data or report bridge B via guessed IDs.
- Client-supplied `role`, actor ID, timestamps, revision increments, and bridge ownership cannot elevate privileges.
- Disabled account cannot mutate even with a valid unexpired token.
- Revoked assignment stops new writes; concurrent revocation/report order is defined and tested.
- No direct browser-role insert/update/delete of canonical status/history/roles/assignments.
- Public projection includes no actor/private reason or internal asset keys.
- Draft and retired bridges cannot be retrieved through public endpoints.
- Last-super-admin removal races cannot remove all admins.
- Super-admin sensitive operations enforce configured MFA assurance.
- Idempotent replays are reauthorized after assignment revocation/account disabling.

### 13.4 Required database/concurrency cases

- A successful report produces current state, history, audit, projection, outbox, and idempotency result together.
- Fault injection at each write stage rolls back all preceding changes.
- Two reports with the same expected revision: exactly one wins, the other gets conflict.
- Same idempotency key/same body repeated sequentially or concurrently creates one report.
- Same key/different body returns conflict.
- Timeout after commit followed by retry returns the original result.
- Repeated same-condition inspection increments revision/time intentionally.
- Pool connection reuse cannot leak one actor's transaction context to another.
- Missing context and least-privilege grants deny unauthorized access.
- Migrations apply from empty DB; seeds are repeatable; forward migrations work on populated fixtures.
- Pagination is stable across concurrent inserts.
- Publication/status races preserve projection visibility and revisions.
- Worker crash/lease expiry/retry does not duplicate asset activation or lose jobs.

### 13.5 Required realtime cases

- Report by one user updates another browser's banner and marker.
- Initial snapshot/subscription race does not lose the latest state.
- Duplicate/out-of-order events do not regress displayed revisions.
- Missed revisions trigger fresh snapshot reconciliation.
- Reconnect and visibility restore refetch before claiming current state.
- Failed initial subscription still enables polling.
- Unpublish is discovered through authoritative refetch even if no removal event is delivered.
- Bridge navigation ignores late results/events from the previous bridge.
- Unmount removes timers/subscriptions; repeated mounts do not multiply traffic.
- Redis failure does not affect source-of-truth status or realtime authorization.

### 13.6 Required end-to-end journeys

1. Public visitor opens the directory and the real bridge page, sees model/status, rotates/zooms/resets.
2. Initial `UNKNOWN` is visible before any report.
3. Assigned operator logs in and reports `NORMAL`; another browser shows “Reported normal.”
4. Operator reports `BROKEN`; public banner and 3D warning appear.
5. Operator reports `DANGER`; stronger warning appears without flashing or inaccessible color-only meaning.
6. Operator resolves to `NORMAL` with a reason; history remains intact.
7. Unassigned user cannot write through UI or direct API calls.
8. Super admin assigns/revokes an operator; authorization takes effect.
9. Super admin uploads a valid model, observes processing, validates anchor, activates it.
10. Invalid/oversized model fails safely without changing active model.
11. Two operators edit concurrently; conflict UI prevents lost updates.
12. Realtime unavailable: polling works and labels connectivity honestly.
13. API/database unavailable: last known information is labeled stale/offline, never silently normal.
14. Model/decoder/CDN unavailable: textual status still works; error/retry/fallback appears.
15. Unpublish/retire hides public content and stops applicable writes.
16. Mobile layout, keyboard navigation, and reduced-motion behavior are usable.
17. Password reset and email verification flows work locally; production email delivery gets a separate staging smoke check.

### 13.7 3D and visual testing

- Verify real WebGL in at least one CI/staging browser lane; DOM-only mocks cannot prove the model renders.
- Use deterministic viewport, renderer settings, lighting, camera, and test assets for screenshots.
- Assert readable status and configured marker state independently of exact canvas pixels.
- Test transform math with known geometry and visual anchor alignment with the real model.
- Account for browser/GPU rendering differences; use bounded screenshot tolerance and human review rather than blind baseline updates.
- Test WebGL-unavailable and context-loss fallback explicitly.
- Monitor geometry/texture disposal and repeated route navigation for resource leaks.

### 13.8 Performance and security testing

- Load test public status reads and report writes separately; capture p50/p95/p99, errors, pool wait, DB locks, and realtime latency.
- Use a documented initial profile, for example 100 simultaneous bridge viewers and 10 report writers, then adjust to expected deployment size.
- Test direct origin and CDN paths separately; distinguish warm/cold asset load.
- Exercise pagination limits, upload limits, decompression/geometry budgets, rate limiting, cache outage, and malformed requests.
- Perform dependency/secret scanning and a staging header/CORS review.
- Audit for SQL injection, XSS, IDOR, SSRF in asset ingestion, auth metadata role spoofing, and privilege escalation.
- Coverage target: high branch coverage, initially 90% for domain/auth/status concurrency modules; do not use overall percentage as the sole quality gate.

### 13.9 Planned verification commands

Implement these workspace scripts or clearly documented equivalents; they do not exist yet:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:db
pnpm test:realtime
pnpm test:assets
pnpm test:e2e
pnpm test:a11y
pnpm test:security
pnpm test:performance
pnpm build
```

Document local-service startup, test environment variables, migrations/seeding, Playwright browser installation, and teardown. Bound commands in automation and preserve relevant logs/artifacts. Unit tests should run without cloud secrets; integration/E2E use local services by default.

## 14. Step-by-step implementation sequence

Each phase follows: inspect → implement a small vertical slice → test → review → record evidence. Do not skip failing checks and then claim the next phase is complete.

### Phase 0 — decisions and repository foundation

Tasks:

- Review this plan and record defaults/unresolved questions in `docs/architecture/product-decisions.md`.
- Establish package/runtime versions and pnpm workspaces; configure TypeScript strict mode, lint, formatting, task orchestration.
- Add module-boundary rules, `.gitignore`, environment examples, contribution/security docs, CI skeleton, CODEOWNERS.
- Define error/revision/status contracts first and generate initial API documentation.
- Add ADRs for separate Fastify API, canonical PostgreSQL, sanitized realtime projection, Redis scope, asset CDN/optimization, and trusted DB actor context.
- Define local Supabase/Redis startup and a no-cloud development asset adapter.

Acceptance:

- Clean install is reproducible from lockfile.
- Lint/typecheck/basic tests/build pass for the skeleton.
- No real secrets are committed or required for local unit tests.
- Import-boundary violations fail CI.

### Phase 1 — database and security baseline

Tasks:

- Provision migration/runtime/worker roles separately and document hosted setup constraints.
- Implement initial schema, constraints, indexes, grants/RLS, helper functions, and realtime publication.
- Seed synthetic local fixtures and bridge `UNKNOWN` state; do not seed production passwords/admins automatically.
- Implement transaction/context wrapper and typed repositories.
- Define lock order, idempotency semantics, last-admin safeguards, and soft lifecycle behavior.
- Write RLS/grants/constraint/context-leak tests immediately.

Acceptance:

- Empty DB migration/seed succeeds and is repeatable.
- Actual restricted runtime roles enforce the authorization matrix.
- Browser roles cannot mutate private tables.
- Private columns cannot leak through the public realtime table.
- Actor context is transaction-local under intended pooling mode.

### Phase 2 — authentication and onboarding

Tasks:

- Integrate official frontend SSR/browser Auth helpers.
- Implement API JWT verification, active-account checks, DB permission lookup, MFA enforcement hooks.
- Implement login/logout/session refresh/password reset and invitation adapter.
- Implement `/me`, protected navigation, unauthorized/disabled states.
- Add audited bootstrap procedure for first super admin, explicit manual approval, and MFA enrollment instructions.

Acceptance:

- Real local Auth flows pass; invalid/expired/wrong-project tokens fail.
- Role spoofing via user metadata has no effect.
- No service-role/database secret exists in frontend bundles.
- Account disable and assignment revocation are independently tested.

### Phase 3 — bridge and status backend vertical slice

Tasks:

- Public bridge read endpoints and operator assigned-bridge/history endpoints.
- Atomic report service, revisions, idempotency, audit, sanitized projection, outbox.
- Super-admin bridge creation/publication/retirement and assignment management.
- Strict schemas/OpenAPI/error mapping; no generic CRUD.
- Concurrency, rollback, IDOR, private-data, and publication-race tests.

Acceptance:

- Valid report updates all transaction artifacts atomically.
- Duplicate request produces one report; concurrent revisions produce one winner.
- Cross-bridge writes fail; no-data starts unknown.
- Every mutation records correct actor/request attribution.

### Phase 4 — initial model pipeline and viewer

Tasks:

- Inspect/copy reference model without modifying original; preserve checksum/provenance.
- Validate reference model fully; record world bounds, geometry metrics, orientation.
- Build delivery/decoder abstraction and compare baseline/Draco/Meshopt only as needed.
- Implement viewer with camera fitting, orbit controls, loading/error/fallback, text-independent status.
- Select warning anchor deliberately and document coordinate convention.
- Provide thumbnail and validated asset/config manifest; inspect on real desktop/mobile/browser.

Acceptance:

- Real reference bridge renders, rotates, zooms, resets, and fits viewport.
- Marker is aligned with the intended road location under the selected transform.
- Model failure does not hide condition information.
- Optimization choice has measured evidence and preserves required identity/appearance.

### Phase 5 — public and operator frontend

Tasks:

- Public directory and stable bridge page with freshness/report/connectivity states.
- Operator assigned list, report form, confirmation, history, conflict/retry handling.
- Typed API client/query keys and separate model/status loading boundaries.
- Accessibility and responsive component tests.
- Two-browser E2E for basic report updates via manual refetch before adding realtime complexity.

Acceptance:

- Core public/operator journeys work without hidden backend shortcuts.
- Private/public notes are clearly distinguished.
- Conflict and network error states retain user input safely.
- All essential operations/status information are accessible without 3D gestures.

### Phase 6 — realtime and resilience

Tasks:

- Configure sanitized projection subscriptions; implement subscribe/snapshot reconciliation.
- Add decimal revision comparisons, event deduplication, route-generation guards.
- Add polling, reconnect, visibility refetch, stale/offline labels, cleanup.
- Integrate durable outbox worker and Redis metadata invalidation/rate limits.
- Inject Redis/realtime/API failures and missed/out-of-order events.

Acceptance:

- Cross-browser committed reports update banner/marker within measured target.
- Subscription failure still produces polling updates.
- Old events never regress displayed condition.
- Unpublication and stale reports are correctly discovered/labeled.
- No polling/subscription/resource leaks after repeated navigation.

### Phase 7 — super-admin and production asset management

Tasks:

- Admin CRUD/lifecycle/assignments/invitations/accounts/audit UI.
- Presigned staged uploads, verification, durable processing, failure/retry visibility.
- Asset activation and viewer-config preview/validation.
- Cloudflare R2/CDN adapter, headers, CORS, immutable versioned URLs, decoder deployment.
- Last-admin guard and required MFA end-to-end tests.

Acceptance:

- Admin can onboard operator, assign bridge, publish model, and review history.
- Invalid/failed asset never replaces a working active version.
- New active version changes immutable URL and has matching anchor/config.
- Production-like asset delivery works from the actual staging web origin.

### Phase 8 — observability, performance, and release hardening

Tasks:

- Structured logs, request tracing, dependency health, DB/Redis/worker/realtime metrics.
- Full E2E/accessibility/security/failure-injection suite and reference-asset performance run.
- Load-test pool sizing, indexes, rate limits, asset budgets, worker concurrency.
- Review auth threat model, RLS, no-store/CDN behavior, CSP, and leaked-secret checks.
- Implement deployment/rollback/backups/runbooks and staging smoke scripts.

Acceptance:

- Required checks pass with captured artifacts; no unexplained critical vulnerabilities.
- Pool/performance/realtime budgets have measured results or explicit approved exceptions.
- Failure modes preserve honest status and data integrity.
- Staging recovery/rollback drill succeeds before production sign-off.

### Phase 9 — production handoff

Tasks:

- Confirm product policies, model license, domains, regions, retention, freshness semantics.
- Provision real secrets securely and bootstrap verified MFA super admin.
- Apply reviewed migrations; validate runtime grants and publication against hosted settings.
- Deploy and run smoke journey with controlled test bridge, then approve initial real bridge publication.
- Deliver operations ownership, incident contacts, maintenance schedules, and known limitations.

Acceptance:

- Owner accepts remaining limitations; all production blockers are resolved.
- Initial bridge model/status are correct; no synthetic data or credentials leak publicly.
- Monitoring and backups are enabled and restoration responsibility is assigned.

## 15. AI-agent execution protocol

### 15.1 Before editing

- Read this plan, repository instructions, relevant ADRs/contracts, current files, and working-tree status.
- Identify the exact phase and bounded write scope.
- List prerequisites, affected contracts, migrations, tests, and expected failure cases.
- Do not rewrite unrelated files or erase another agent's changes.
- If a dependency/credential/product policy is missing, record the blocker and implement only the safely testable local slice.

### 15.2 During implementation

- Keep changes small and cohesive; avoid placeholder success responses, silent catch blocks, and `any` escaping validation.
- Make contracts first, then domain/service/repository tests, then route/UI integration.
- Validate at all trust boundaries: environment, HTTP input, decoded token, asset input, DB mapping, and realtime payload.
- Keep transport/runtime details outside domain logic.
- Use existing patterns/dependencies; justify additions in an ADR if they alter architecture.
- Write idempotency/concurrency tests before assuming an asynchronous operation is safe.
- Mark development-only adapters clearly and make production reject them.
- Never bypass security checks to make an E2E test pass.

### 15.3 After implementation

- Run relevant unit/component tests, then actual integration tests, then affected E2E/build checks.
- Inspect lint/type errors and fix root causes. Do not blanket-disable strict checks or lower test expectations to hide problems.
- Report exact commands run, pass/fail/blocked status, relevant errors, and untested behavior.
- Update OpenAPI, environment examples, migration docs, and runbooks when affected.
- Attach evidence: test summaries, GLB metrics, screenshots where relevant, performance environment/results.
- Request review for permission/migration/contract changes. Do not commit or deploy without authorization.

### 15.4 Parallel work plan

After the contracts/security baseline is agreed:

- Agent A: DB schema/RLS/repositories and report transactions; owns `packages/database`, migrations, DB tests.
- Agent B: Auth/API modules; owns `apps/api`, working against agreed repository/contracts.
- Agent C: viewer/asset inspection and local pipeline; owns viewer feature and asset tooling only.
- Agent D: public/operator web routes and forms; excludes viewer internals and shared contracts unless agreed.
- Agent E: QA/CI/infrastructure; owns test harness, CI, deployment docs/config.

Do not run dependent edits in parallel before interfaces exist. One lead agent integrates, resolves contract differences, runs cross-system tests, and reviews security. Shared contracts and migrations have a single designated owner per work period.

### 15.5 Definition of done per task

- Behavior implemented, not just scaffolded.
- Relevant positive, negative, and failure-path tests added and run.
- No new lint/type/build errors.
- Authorization and public/private boundaries preserved.
- No secrets or unrelated rewrites.
- Documentation/configuration updated.
- Exact verification evidence and known limitations supplied.

## 16. CI/CD and deployment

### 16.1 Pull-request checks

Fast required lane:

- Frozen-lockfile install, formatting, lint/module boundaries, typecheck.
- Domain/backend/frontend unit tests with critical branch coverage gate.
- Build web/API/worker independently.
- Secret and dependency scans.

Integration required lane:

- Start isolated local Supabase/PostgreSQL/Redis and test asset adapter.
- Apply migrations and restricted grants, seed fixtures.
- Database/API/realtime integration tests.
- Playwright main authorization/status/viewer smoke journeys and accessibility checks.
- Publish logs, traces/screenshots, coverage, and test reports without secrets.

Scheduled/pre-release lane:

- Wider browser/mobile/real-asset visual checks, load/failure-injection tests.
- Migration-on-existing-data tests, security review, recovery drill.
- Hosted staging smoke validates differences local emulators cannot reproduce.

### 16.2 Deployment topology

- Next.js on a supported web hosting platform; choose SSR/edge behavior deliberately.
- API as a long-running container/service for predictable pooling and middleware.
- Worker as a separate background container/service with bounded CPU/memory/concurrency.
- Supabase, Redis, and API preferably colocated regionally; Cloudflare handles public asset distribution.
- Separate development/staging/production databases, Auth projects, buckets, keys, and Redis namespaces/instances.
- No test framework or privileged development endpoint in production builds.

### 16.3 Release order and rollback

1. Validate backup/recovery availability and review migrations.
2. Apply backward-compatible expand migrations.
3. Deploy API/worker compatible with old and new frontend contracts.
4. Deploy frontend and immutable assets/configuration.
5. Run smoke/authorization/status/realtime/asset checks.
6. Monitor error/latency/worker/backlog metrics.
7. Perform contract/remove migrations only after old versions are drained and data is migrated.

Rollback application versions independently of schema where possible. Do not automatically run destructive down migrations on a populated production database. Asset rollback points the active manifest back to a known ready version with its matching viewer config.

## 17. Observability and operational runbooks

### 17.1 Logs/metrics

- Structured request ID, route, duration, status, safe actor ID, bridge ID, revision where relevant.
- Redact tokens, passwords, cookies, signed URLs, and unnecessary private notes.
- API error/latency, pool acquisition/usage, lock waits, DB query duration, Redis failures/rate limits.
- Report success/conflict/denial counts; realtime reconciliation/polling rates.
- Worker queue age, retries, dead letters, model-processing time/memory/errors.
- Model loading/decoder failures and sampled client performance, with privacy-safe telemetry.
- Alert on sustained API errors, pool exhaustion, durable-job backlog, asset processing failures, and projection drift.

### 17.2 Health endpoints

- Liveness reflects process responsiveness, not every dependency.
- Readiness reflects ability to serve critical operations, primarily DB connectivity/schema readiness.
- Redis degradation is reported but does not automatically make all public reads unavailable.
- Dependency diagnostics are internal/protected and never expose credentials or full infrastructure configuration.

### 17.3 Required runbooks

- Supabase/DB outage: preserve last-known labels; no fake condition success.
- Realtime outage: polling rollout, visibility and metrics.
- Redis outage: metadata bypass and protected-write rate-limit policy.
- Pool exhaustion/deadlocks: query/lock diagnosis and safe scaling.
- Model upload/processing/CDN failure: retry, dead-letter inspection, active-asset rollback.
- Incorrect operator report: submit attributed corrective report, never rewrite history silently.
- Account compromise: disable account, revoke assignments, rotate compromised credentials, investigate audit.
- Backup/restore: database, Auth-related dependencies, original/processed asset inventory and viewer configs.
- Secret rotation/JWKS key rotation.
- Rollback deployment and asset activation.
- Operator invitation/email delivery issues.

Provisional recovery objectives, requiring owner/provider approval: RPO ≤ 24 hours and RTO ≤ 4 hours. Do not claim these unless backup schedules, asset retention, and an actual restore drill demonstrate them; use PITR if tighter recovery requirements justify its cost.

## 18. Future map integration without premature complexity

Prepare stable boundaries now:

- Bridge UUID remains canonical; slugs are navigation identifiers.
- Nullable validated latitude/longitude and location provenance are separate from model coordinates.
- Viewer consumes `bridgeId + assetManifest + snapshot`, not assumptions about a detail-page layout.
- Status query/subscription ownership can later be shared by a map inspector panel.
- Bridge directory API supports pagination and can later gain bounded geographic filtering.

When maps become a real scope:

- Decide provider, map licensing, public token/domain restrictions, and accessibility.
- Consider PostGIS and proper spatial indexes only when spatial query requirements justify them.
- Add bounding-box APIs, aggregation/clustering, and capped map results.
- Subscribe only to selected/visible entities through a capacity-tested design; never one socket subscription per bridge across an entire country.
- Lazy-load a model when a bridge is selected; do not render all GLBs on the map.
- Keep geographic coordinates and model-local anchor coordinates explicit and separate.
- Reassess tenant/organization permissions if multiple authorities join the platform.

## 19. Risk register

| Risk | Mitigation / verification |
| --- | --- |
| Unknown or stale condition looks normal | Separate condition/freshness/connectivity, no default-normal fallbacks, failure tests |
| Operator modifies another bridge | API object authorization, RLS, active assignments, IDOR tests |
| Privileged key in web build | Server-only env modules, secret scan, built-bundle inspection |
| Pool reuse leaks actor identity | Transaction-local context, no session state, pooled integration tests |
| Lost concurrent reports | Expected revision, row locking/CAS, idempotency, concurrent tests |
| Partial history/projection writes | Single PostgreSQL transaction, rollback fault injection |
| Realtime misses/duplicates events | Revisions, subscribe/snapshot reconciliation, polling/refetch |
| Unpublish event hidden by RLS | Mandatory authoritative refresh; document public asset recall limitation |
| Redis stale/failed cache | Never cache condition authority, safe metadata scope, durable invalidation |
| Asset corruption or abusive geometry | Staging validation, URI restrictions, CPU/memory/decode budgets |
| Warning marker points at wrong object | Explicit anchor/coordinate contract and asset-version visual review |
| Draco reduces bytes but slows load | Benchmark baseline and decoder cost before choosing |
| GLB has no useful materials | Inspect appearance; reversible material overrides and visual tests |
| Heavy 3D crashes mobile browsers | DPR cap, demand rendering, resource budgets, fallback and real-device tests |
| Team/agent integration conflicts | Contract-first work, ownership boundaries, one migration owner |
| Tests work only under DB owner | Run restricted-role, hosted-pool/staging checks |
| Public note leaks personal information | Separate fields, UI warning, validation/moderation policy and audit |
| Public status interpreted as engineering certification | Honest operator-reported language and owner-approved operational disclaimer |

## 20. Final acceptance checklist

### Product

- [ ] Real reference bridge has a shareable individual page and is interactive.
- [ ] Public directory works; only published entries are exposed.
- [ ] Unknown/normal/broken/danger behave correctly with independent freshness/connectivity states.
- [ ] Broken/danger warning marker is aligned and accessible; text works without WebGL.
- [ ] Operator can report only assigned bridges; super admin can manage the platform.
- [ ] History, resolution reasons, assignment revocation, and concurrency conflicts work.

### Architecture/security

- [ ] Separate frontend/API/worker workspaces and enforced module boundaries.
- [ ] Supabase Auth, verified JWTs, least-privilege DB roles/RLS, MFA policy implemented.
- [ ] PostgreSQL transactions preserve status/history/projection/audit invariants.
- [ ] Pool sizing/timeouts/context isolation tested.
- [ ] Redis is non-authoritative with documented outage behavior.
- [ ] CDN delivers immutable model/decoder bytes; dynamic status is not cached stale.
- [ ] Upload validation, resource limits, source provenance, and active-asset rollback exist.
- [ ] No privileged secrets in repository/frontend/logs; public payloads are sanitized.

### Quality/release

- [ ] Unit, component, DB/API integration, actual realtime, E2E, custom regression tests pass.
- [ ] Real WebGL/reference asset smoke and representative device checks complete.
- [ ] Accessibility and responsive checks pass with documented exceptions, if any.
- [ ] Performance/load/failure-injection measurements recorded.
- [ ] CI blocks regressions; migrations/release/rollback are repeatable.
- [ ] Monitoring, backups, restore drill, security review, and runbooks complete.
- [ ] Owner-provided policies, licensing, deployment inputs, and initial admin setup confirmed.
- [ ] README lets a new team member run the project locally without guessing.

## 21. Expected handoff artifacts

- Working monorepo with pinned dependencies and no committed secrets.
- SQL migrations/grants/RLS, fixtures, and separate runtime-provisioning instructions.
- OpenAPI contract and typed client.
- Auth/authorization matrix and threat-model notes.
- Source/processed asset manifests, validation reports, optimization comparison, viewer coordinate/anchor documentation.
- Test commands, results, coverage, Playwright traces, visual/performance evidence.
- Local setup and environment examples; staging/production deployment checklist.
- Pooling/Redis/CDN configuration and failure behavior.
- ADRs, team ownership, runbooks, restore/rollback evidence, and remaining limitations.

**Completion means a verified, reviewable foundation—not a claim that a large operational system can be made perfect by one generated implementation. Execute the phases in order, keep safety-critical data honest, and make every important assumption testable.**
