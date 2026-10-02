# Inventory & Resource Booking

An internal tool for tracking shared equipment and supplies by location, checking time-based availability, and managing reservations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/inventory-fulfillment/` — web app
- `artifacts/api-server/src/routes/inventory.ts` and `reservations.ts` — API behavior
- `lib/api-spec/openapi.yaml` — API contract and generated hooks/schemas
- `lib/db/src/schema/` — PostgreSQL schema

## Architecture decisions

- The first version is a single-team starter, not the full multi-tenant SaaS scope from the inventory brief.
- Reservations hold stock only for overlapping time windows. The API locks the resource/location stock row inside a transaction before checking competing reservations, preventing concurrent requests from oversubscribing a slot.
- Completing a reservation deducts on-hand stock and records a movement in the same transaction.
- PostgreSQL is the source of truth; the UI uses generated API hooks from the OpenAPI contract.

## Product

The inventory/fulfillment brief defines the product. The resource-booking brief supplies the initial inventory types and booking concepts: resources, locations, time-window availability, and reservations. The starter includes a resource catalog, locations, stock adjustments, reservation create/cancel/fulfill, and movement history. Multi-tenant login/RLS, warehouse transfers, scheduled reconciliation, recurring reservations, approval workflows, and realtime notifications are later additions.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
