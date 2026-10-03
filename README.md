# Bridge Operations Platform

A production-oriented foundation for displaying interactive 3D bridge models and managing authoritative operator-reported road conditions.

Built with Next.js (App Router), Three.js / React Three Fiber, Fastify, PostgreSQL (canonical source of truth with Row Level Security), Redis, and a background processing worker.

---

## 🏗️ Architecture & Philosophy

1. **PostgreSQL Canonical Authority:** All operational state transitions, monotonic revision increments, and immutable history logs occur inside serializable/row-locked PostgreSQL transactions.
2. **Honest Reporting:** `UNKNOWN` is the unassessed baseline; `NORMAL` is labeled "Reported normal", never "Safe".
3. **Interactive 3D Digital Twin:** The reference bridge (`bridge.glb`, 2.75 MiB) renders in WebGL with bounded camera fitting, orbit controls, road deck highlighting, and an animated floating 3D warning marker at the physical road deck (`[8.54, 17.5, 63.09]`).
4. **Sanitized Public Projections:** The public status projection isolates confidential inspector observations and operator identity behind database Row Level Security.
5. **Resilient Sync & Polling Fallback:** Clients maintain monotonic revision clocks and fall back gracefully to 10-second polling if network sockets disconnect.

---

## 📁 Monorepo Layout

```text
bridge/
├── apps/
│   ├── api/          # Fastify Node.js HTTP server (transactions, JWT, OpenAPI, rate limiting)
│   ├── web/          # Next.js App Router (Public directory, 3D viewer, Operator & Admin console)
│   └── worker/       # Background worker (outbox event processor, asset validation)
├── packages/
│   ├── contracts/    # Zod schemas, DTOs, Enums, and error contracts
│   ├── domain/       # Pure domain rules, condition transitions, revisions, and freshness
│   ├── database/     # PostgreSQL pool, repositories, migrations, and seed scripts
│   ├── api-client/   # Typed API client for web and testing
│   ├── observability/# Structured JSON logger and metrics collector
│   └── test-utils/   # Personas, test fixtures, and JWT token generator
├── supabase/
│   ├── migrations/   # PostgreSQL schema & RLS migrations
│   └── seed.sql      # Deterministic seed fixtures
├── assets/           # Source & processed 3D GLB assets
├── infra/            # Docker Compose configuration (PostgreSQL 16 & Redis 7)
└── docs/             # Architecture Decision Records (ADRs) and Operational Runbooks
```

---

## 🚀 Quickstart

### 1. Prerequisites
- **Node.js**: v20+ (Active LTS)
- **pnpm**: v10+
- **Docker**: For PostgreSQL & Redis containers (or local services running on ports 5432 and 6379)

### 2. Infrastructure Setup
Start the PostgreSQL and Redis containers:
```bash
docker compose -f infra/compose.yaml up -d
```
*(Or use your existing local PostgreSQL on 5432 and Redis on 6379)*

### 3. Migrations & Seed Data
Initialize the schema and seed reference bridges, operators, and 3D configs:
```bash
pnpm db:migrate
pnpm db:seed
```

### 4. Run Development Servers
Start all applications concurrently:
```bash
# Start API (port 4000)
pnpm --filter @bridge/api dev

# Start Web Frontend (port 3000)
pnpm --filter @bridge/web dev

# Start Background Worker
pnpm --filter @bridge/worker dev
```

Visit **http://localhost:3000** to explore the public bridge directory!

---

## 👥 Personas & Test Credentials

The database comes pre-seeded with deterministic personas for evaluation:

| Persona | Email | Password | Role / Sector Assignment |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@bridge.local` | `password123` | Platform-wide administrator (All bridges) |
| **Operator Alice** | `operator-a@bridge.local` | `password123` | Assigned to **River Gorge Bridge** |
| **Operator Bob** | `operator-b@bridge.local` | `password123` | Assigned to **Coastal Marine Causeway** |
| **Disabled Operator** | `disabled@bridge.local` | `password123` | Inactive account (Access forbidden) |

*The login page at `/login` also features instant **Quick Persona Switching** buttons.*

---

## 🧪 Verification & Testing Commands

Execute comprehensive verification across all workspace packages:

```bash
# Run domain & unit tests
pnpm test:unit

# Run API integration tests
pnpm --filter @bridge/api test:integration

# Typecheck all packages
pnpm typecheck

# Build all applications
pnpm build
```

---

## 📖 Operational Runbooks

- [Database Outage & Degradation](docs/runbooks/database-outage.md)
- [Real-Time Failover & Polling](docs/runbooks/realtime-failover.md)
- [Report Corrections](docs/runbooks/report-correction.md)
- [Deployment & Rollback](docs/runbooks/deployment-and-rollback.md)
