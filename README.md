# Inventory & Resource Booking

A simple, single-team app for tracking shared equipment and supplies by location, checking time-based availability, and managing reservations.

## Features

- View stock levels and low-stock items by location
- Manage shared resources and locations
- Check availability for a time window
- Create, cancel, and fulfill reservations
- Adjust stock and review inventory movement history
- Prevent overlapping reservations from exceeding available stock

## Tech stack

- React, Vite, and TypeScript
- Express API
- PostgreSQL with Drizzle ORM
- pnpm workspaces
- OpenAPI contracts with generated client hooks and Zod schemas

## Project layout

- `artifacts/inventory-fulfillment/` — web application
- `artifacts/api-server/` — API server and route handlers
- `lib/api-spec/` — OpenAPI contract and code generation
- `lib/api-client-react/` — generated React API hooks
- `lib/api-zod/` — generated API validation schemas
- `lib/db/` — database schema and Drizzle configuration

## Run locally

### Requirements

- Node.js 24
- pnpm
- PostgreSQL

### Setup

1. Install dependencies from the repository root:

   ```sh
   pnpm install
   ```

2. Set `DATABASE_URL` in your environment to a PostgreSQL connection string. Keep it out of source control.

3. Create or update the database schema:

   ```sh
   pnpm --filter @workspace/db run push
   ```

4. Start the API and web app in separate terminals:

   ```sh
   pnpm --filter @workspace/api-server run dev
   ```

   ```sh
   pnpm --filter @workspace/inventory-fulfillment run dev
   ```

   Open the web URL printed by the Vite process.

Run the workspace typecheck with:

```sh
pnpm run typecheck
```

## Database data

The sample records shown in the Replit preview are stored in that Replit database; they are not included in a GitHub clone. Add records in the app or create your own seed data for a local database.

## Scope and security

This is a single-team starter and does not include sign-in or multi-tenant data isolation. Do not expose it publicly with sensitive inventory data until authentication and access controls are added.