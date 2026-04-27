# Design preference: TypeScript-first stack

**Decision:** ResearchGit uses TypeScript strict mode plus the broader TS-native tooling — Zod for runtime validation at boundaries (API/LLM/DB), `@t3-oss/env-nextjs` for typed env vars, Biome for lint+format (instead of ESLint+Prettier), `tsx` for runnable scripts, and typed page objects in Playwright.

**Why:** Edward called this out explicitly during spec review. The signal is that TypeScript itself is non-negotiable, and the project should adopt TS-native tooling rather than the older JS-era stack (ESLint+Prettier, plain `.env`, untyped fixtures).

**How to apply during implementation:**
- No `.js` files anywhere in `src/`. Even ad-hoc scripts run via `tsx`.
- Every API route handler and Server Action wraps incoming requests through a Zod parser.
- Every Cypher query result is parsed through a Zod schema before returning to the caller (because `neo4j-driver` returns `any`-shaped records).
- Every OpenAI structured output is parsed through Zod even though the API enforces schemas server-side (parse-don't-validate guard).
- Env vars are accessed only via `import { env } from "@/env"`, never via `process.env.X` directly.
- Playwright page objects live in `tests/e2e/pages/` and are typed against the page DOM.
