# Tetris Next.js Architecture

This project is being shaped into a mobile-friendly Tetris experience with PWA support.

## Goals

- Fast browser gameplay with a responsive mobile layout
- Installable PWA experience for phones
- Local-first gameplay with online sync for scores and profiles
- Server-backed auth, leaderboard, and player statistics

## Layers

### `src/app/`

Owns routes, metadata, PWA manifest exposure, and the high-level screens.

### `src/components/`

Owns presentational UI such as the game shell, score panels, buttons, and overlays.

### `src/engine/`

Owns deterministic game rules, piece definitions, board state, and frame updates.
This layer should not depend on React so it stays easy to test and reuse.

### `src/db/`

Owns the Prisma schema, Prisma client setup, migrations, and database access helpers.

### `src/hooks/`

Owns the bridge between the engine and React.

## Near-Term Milestones

1. Stabilize project configuration and database tooling
2. Implement the core Tetris engine
3. Build the main game screen and HUD
4. Add local persistence and PWA installability
5. Add auth, profiles, and leaderboard sync

## Environment Strategy

- `DATABASE_URL` should point to the Neon pooled connection for app runtime
- `DIRECT_URL` should point to the direct Neon connection for migrations and admin tasks
- Guest play should work without login so the game remains usable offline and on low-end devices
