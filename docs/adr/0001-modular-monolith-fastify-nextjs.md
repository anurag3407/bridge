# ADR 0001: Modular Monolith with Fastify API and Next.js Frontend

## Status
Accepted

## Context
The platform requires clear separation between public visualization and authenticated operations. Route handlers in Next.js could blur domain boundaries or lead to duplicate backend logic.

## Decision
Adopt a modular monorepo (`apps/api`, `apps/web`, `apps/worker`, `packages/*`):
- `apps/api`: Fastify Node.js HTTP server owning transactions, business authorization, OpenAPI docs, and rate limiting.
- `apps/web`: Next.js App Router for public directory, 3D viewer, and operator dashboards.
- `packages/contracts`: Single source of truth for Zod schemas, DTOs, and error types.
- Next.js server actions and route handlers are strictly prohibited from acting as a secondary write backend.

## Consequences
- Clean architectural boundaries.
- API can be scaled and load-tested independently from frontend SSR.
