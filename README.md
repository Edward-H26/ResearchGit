# ResearchGit V2

A research-ideation platform for CHI 2026 authors. Sign in with Google, match a CHI author record, browse authored papers, join broader topic canvases grounded in the CHI program, develop a research idea on a sticky-note canvas with AI-clustered themes, publish to a shared marketplace, gather typed comments, and continue improving the draft through saved versions.

Spec: [`SPEC.md`](./SPEC.md). Current module notes: [`plans/abstract-pondering-starfish.md`](./plans/abstract-pondering-starfish.md). Archived V0/V1 specs: [`archive/`](./archive/).

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript strict
- Tailwind CSS 4 with Atomic Ideation visual tokens (`src/styles/globals.css`)
- Neo4j AuraDB Pro (driver helpers in `src/lib/neo4j.ts`)
- Auth.js v5 (`next-auth@beta`) + Google OAuth, JWT sessions
- OpenAI SDK with `zodResponseFormat` for structured outputs
- Biome (lint + format), Vitest (unit), Playwright (E2E), lefthook (pre-commit)
- pnpm 10.33

## First-time setup

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Copy `.env.example` to `.env` and fill in real values (Google OAuth, Neo4j AuraDB, OpenAI).
3. Apply the Neo4j schema (one-time, idempotent):
   ```bash
   pnpm migrate-neo4j
   ```
4. Start the dev server:
   ```bash
   pnpm dev
   ```

The CHI 2026 paper dataset (`papers_by_room.json` at the repo root) is loaded
**in-memory** at module init by `src/lib/papers/catalog.ts`. There is no Neo4j
ingest step. Paper and Author are read-only reference data. Neo4j only stores
dynamic per-user state (User, Idea, IdeaVersion, Sticky, Comment, and topic recommendation counts).

## Available scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Next.js dev server with Turbopack |
| `pnpm build` | Production build |
| `pnpm start` | Production server |
| `pnpm typecheck` | `tsc --noEmit` over `src/` |
| `pnpm typecheck:scripts` | `tsc --noEmit` over `scripts/` |
| `pnpm check` | `biome check src/ scripts/` |
| `pnpm format` | `biome format --write src/ scripts/` |
| `pnpm lint` | `biome lint src/ scripts/` |
| `pnpm test` | Vitest unit tests once |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Playwright E2E tests |
| `pnpm migrate-neo4j` | Drop V1 nodes + apply V2 constraints/indexes |
| `pnpm seed-neo4j` | Inspect current Neo4j state (read-only) |

## How V2 differs from V1

V0 was a swipe-deck model. V1 was a per-cluster sticky-note probe with `add / delete / merge` intent picker. V2 is per-idea: each user creates one idea, others contribute typed comments, and the owner iterates with AI through saved draft versions.

Key cuts from V1:
- Removed paper-cluster sampling and the swipe deck
- Removed the sticky-intent picker. V2 stickies are a single shape with resize, search, AI enhancement, and theme grouping
- Removed the locked-report workflow. A private idea uses the same detail UI as an open idea but is restricted to the owner
- Removed unused Liveblocks scaffolding. Current draft updates synchronize through the idea-store subscription and polling path
- Replaced ResearchGalaxy cluster catalog with the CHI 2026 program (`papers_by_room.json`)

## Architecture map

| Layer | Path |
|---|---|
| App routes | `src/app/` |
| API route handlers | `src/app/api/` |
| Page components | `src/components/v2/` |
| V2 UI workflow helpers | `src/components/v2/dashboard/`, `src/components/v2/idea-detail/`, `src/components/v2/idea-draft/` |
| Idea mutation validation | `src/lib/ideas/store-actions.ts` |
| Database driver | `src/lib/neo4j.ts` |
| Auth | `src/lib/auth.ts`, `src/lib/auth/`, `src/proxy.ts` |
| Paper ingest + lookup | `src/lib/papers/` |
| Recommendation engine | `src/lib/recommendation/` |
| LLM client + prompts + schemas | `src/lib/llm/` |
| Sticky canvas math | `src/lib/canvas/`, `src/components/canvas/` |
| Server services | `src/server/` |
| Visual tokens | `src/styles/globals.css` |

## Recommendation algorithm

`src/lib/recommendation/algorithm.md` documents the deterministic topic engine. The current app groups CHI 2026 records from `papers_by_room.json`, recommends broader same-topic canvases, and keeps idea generation, dashboard recommendations, and tests independent from external services.

## Conventions

- TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- Zod parsing at every network/LLM/Neo4j boundary.
- No `.js` files in `src/` — TS only.
- Pre-commit hook runs Biome + typecheck. Don't bypass with `--no-verify`.
- No `git commit` or `git push` from automation; user-driven only.

## Contributing

V2 is for first-author CHI 2026 researchers (Ziyi, Yiren, Hyanghee initially) and broader CHI authors. Internal-only until the recommendation engine is validated.
