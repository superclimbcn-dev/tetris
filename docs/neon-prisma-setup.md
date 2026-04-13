# Neon + Prisma Setup

This project uses two PostgreSQL URLs with Neon and Prisma.

## Required environment variables

- `DATABASE_URL`: pooled Neon connection for the runtime app
- `DIRECT_URL`: direct Neon connection for Prisma CLI, migrations, and introspection

## Expected shape

```env
DATABASE_URL="postgresql://USER:PASSWORD@YOUR-ENDPOINT-pooler.REGION.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@YOUR-ENDPOINT.REGION.aws.neon.tech/neondb?sslmode=require"
```

## Why both exist

- The runtime app should use the pooled endpoint because Neon uses PgBouncer for high-concurrency workloads.
- Prisma CLI operations such as migrations should use the direct endpoint because pooled transaction-mode connections can break schema tooling.

## Current local caveat

The current local environment still points both variables to a pooled endpoint.
That is enough for schema validation and client generation, but not enough for reliable migration commands.

Before running `prisma migrate dev`, replace `DIRECT_URL` with the non-pooler Neon endpoint.
