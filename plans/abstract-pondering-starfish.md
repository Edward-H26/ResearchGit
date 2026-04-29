# ResearchGit V1 — Implementation Plan

> Status: **Interview complete. Ready for user review.** This plan is the source of truth for V1 implementation. V0 (`SPEC.md`) is reference-only carryover; V1 (`SPEC_V1.md`) is the actual product. Where V0 and V1 conflict, V1 wins; where V1 is silent, V0 carries over.

---

## 1. Context

Two specs exist in this repo:

- **`SPEC.md`** — V0, a deep GitHub-style research-ideation platform: swipe deck → lock winner → per-user branches with markdown edits, Slack-style threaded comments, per-branch AI revision. Approved spec, but a *different paradigm* than V1.
- **`SPEC_V1.md`** — V1, an HCI co-design probe. Researchers see 10 LLM-generated ideas (one per cluster), pick **one** to explore, and contribute to a Miro-like canvas with intent-labeled sticky notes (`add`, `delete`, `merge`). Optional manual "AI Revise" button on the board.

V1 is the implementation target. The underlying **research goal** (V1 §1.1): observe how researchers appropriate the sticky-note vocabulary, where it falls short, what additional primitives they spontaneously request — to inform the design of future infrastructure for crowdsourced research ideation.

---

## 2. Verified facts (Explore-agent pass)

- The project at `/Users/edwardhu/Desktop/ResearchGit/` contains only `SPEC.md`, `SPEC_V1.md`, `.notes/typescript-preference.md`, an empty `plans/` directory, `.claude/`, and `.git/`. **No source code yet.**
- ResearchGalaxy catalog at `/Users/edwardhu/Desktop/ProjectResearchGala/ResearchGalaxy-/` is intact:
  - 20 cluster files (`cluster_0.json` … `cluster_19.json`) — paper objects keyed by `paper_id`, `title`, `abstract`, `authors`, `affiliations`, `venue`, `venue_code`, `url`, `type`, `award`.
  - **NaN literals confirmed in `award` field** — sanitization step from V0 §5.1 still required.
  - `all_venues_cluster_themes.json` provides per-cluster `theme_label`, `keywords`, `description`, `sub_topics`, `paper_count`.
- TypeScript preference (`.notes/typescript-preference.md`): strict mode, Zod at all boundaries, Biome, typed env via `@t3-oss/env-nextjs`, no `.js` files in `src/`.
- ResearchGalaxy uses **React Three Fiber + lucide-react + react-markdown + jsPDF** — zero canvas-tooling imports. V1's canvas is **greenfield**, but the user supplied a complete TypeScript reference component (`StickyNotesBoard`) that defines schema, mechanics, and toolbar layout.

---

## 3. Decisions locked

| # | Decision | Rationale |
|---|----------|-----------|
| **D1** | **Collaboration model = real-time multi-user.** Multiple participants edit one canvas concurrently, with live cursors and presence. | Forces CRDT-based sync. Eliminates plain Pusher and plain Postgres-with-polling. |
| **D2** | **Concurrent canvas scale = 2–5 per canvas at peak.** | Both Liveblocks free tier (~100 connections) and self-hosted Yjs are over-provisioned. Sync tech can be picked on DX, not capacity. |
| **D3** | **Database = Neo4j AuraDB Pro (V0 carryover). Hosting = Render web service.** Total study size treated as small probe (<100 cumulative). | User explicit. Neo4j stores ideas, sticky notes, relationships, telemetry event log. Canvas live-edit layer is *separate* (D4); Neo4j is durable snapshot + analytics. |
| **D4** | **Live-edit layer = Liveblocks managed (Yjs-based CRDT).** Real-time canvas state lives in Liveblocks rooms (one room per idea-canvas); periodic snapshots persist to Neo4j for durability + telemetry. Pusher retained for non-canvas global events; can also be replaced with Next.js `revalidatePath` if Pusher is judged unnecessary at probe scale. | **Why Liveblocks managed:** Yjs-compatible CRDT means concurrent edits on the same sticky resolve correctly without last-write-wins data loss. Free tier handles 2–5 concurrent easily. Built-in presence + cursors. Snapshot pattern keeps Neo4j as system of record. |
| **D5** | **Authentication = Google OAuth via Auth.js v5 (`next-auth@beta`) with JWT-only session strategy.** Sign-in flow: Google OAuth → Auth.js `jwt` callback fires once on initial sign-in and `MERGE`s a `(:User)` node into Neo4j keyed on `googleId`, then stores the resulting Neo4j UUID in the JWT. Subsequent requests verify the JWT signature with `AUTH_SECRET` and resolve `session.user.id` from `token.id` without any DB read. | **Three-step decision history:** (1) Original V0: Auth.js. (2) Deep-research review picked Better Auth because its team now maintains Auth.js and it has security-first defaults. (3) **Implementation review reverted to Auth.js v5** because Better Auth requires a SQL or Mongo adapter for its `users/sessions/accounts/verifications` tables, and **no Neo4j adapter exists** — using Better Auth would force either a 500-line custom adapter or a second SQLite database. Auth.js v5 with `session.strategy = "jwt"` needs zero database adapter; the V0 `MERGE` pattern in `jwt` callback covers our needs without ceremony. Both libraries share OAuth + signed-cookie security primitives. |
| **D6** | **Cluster sampling = same 10 globally (V0 carryover).** All participants see the same 10 ideas drawn from the 20-cluster catalog. Admin regenerates manually. | Maximizes between-subjects comparability — the core methodological tool for the probe. |
| **D7** | **1 LLM idea per cluster (10 ideas total).** | Matches V1 prose. Simpler list view; cheaper regeneration (10 LLM calls). |
| **D8** | **Idea schema = V0 schema.** `{ title, researchQuestion, rationale (≤2 sentences), proposalMarkdown, anchorPaperIds: [3] }`. | Structured fields enable per-field comparison across participant revisions during analysis. |
| **D9** | **List-view layout = card grid (3 columns).** Each card shows title, research question, rationale, and 3 anchor-paper chips. | Best for parallel browsing of 10 short structured ideas. |
| **D10** | **Selection = exactly one idea (revised from V1's "1–2").** On click, the selected card transitions to a writing-enabled canvas view. | User explicit revision. Simpler protocol; one focused session per participant. |
| **D11** | **Expansion mechanic = inline split-screen (ChatGPT-canvas style).** Left pane: read-only original idea (title, RQ, rationale, anchor-paper chips). Right pane: editable canvas. Split is resizable. | User explicit: "ChatGPT style ... left side displays original idea's description ... right side shows the canvas." Implementation: Next.js App-Router parallel routes (`@canvas` slot) so URL becomes `/idea/[id]` (shareable, refresh-safe) while the transition feels inline. |
| **D12** | **Canvas mechanics = bounded 2D (~1650×1250 px) with pan + zoom (0.45–1.6×), per the user-supplied reference.** Sticky notes are absolute-positioned children of a `transform: translate(...) scale(...)` wrapper. Background dotted grid. Pan via Pan-mode toggle, Alt+drag, or middle-click. Zoom via Ctrl/Cmd+scroll. Double-click empty canvas to create a note. | User provided full TypeScript reference (`StickyNotesBoard`) covering pan/zoom math, drag handlers, and `validateBoardPayload` (port to Zod). |
| **D12-port** | **Adaptations from reference to V1 production:** (a) `notes` array → Liveblocks Yjs `Y.Array<StickyNote>`; (b) `currentAuthor` dropdown → derived from NextAuth session; (c) `useState` persistence → Liveblocks room + Neo4j snapshot; (d) `validateBoardPayload` → real Zod schemas in `src/lib/canvas/schema.ts`; (e) static avatar row → Liveblocks presence; (f) JSON export/import → kept, repurposed as researcher export. | Reference is single-user; production needs multi-user state, auth-bound author, durable persistence, presence. Schema unchanged. |
| **D13** | **Sticky-note types = 3 hard-coded intents.** Field `intent: "add" \| "delete" \| "merge"`. Visual mapping: `add → emerald-300 (green)`, `delete → red-300`, `merge → violet-300 (purple)`. Reference's other 3 colors (yellow, blue, orange, pink) dropped. | User explicit. Faithful to V1 prose ("labeled by intent — add, delete, merge"). Color *is* the intent; toolbar palette shrinks to 3 swatches. Schema clean for `groupBy(stickies, "intent")` analysis. |
| **D14** | **AI Revise input = intent + idea + all stickies.** LLM receives: original idea (title, RQ, rationale, current proposalMarkdown), all sticky notes (text, intent, author), and the user's free-text revision intent. Spatial positions NOT included. | Methodologically rich — AI's output reflects collaborative input, not just one user's prompt. Position deferred to a follow-up study (would add tokens with uncertain signal). |
| **D15** | **AI Revise output = diff view with accept/reject (V0-style).** AI returns proposed new `proposalMarkdown`. Modal shows side-by-side diff vs current idea text. Triggering user accepts or rejects; only on accept does everyone see the update via Liveblocks broadcast. | Researcher captures both proposed and accepted versions for comparison. Mirrors V0's `BranchEdit { accepted: bool }` pattern. |
| **D16** | **AI Revise trigger = any participant, no rate limit.** | At 2–5 concurrent + deliberate diff-view step (D15), runaway calls are structurally unlikely. Simplest UX. |
| **D17** | **Idea text = append-only versions with version selector.** Original LLM-generated idea is `IdeaVersion` v0; each accepted AI revision becomes v1, v2, …. Left pane shows version selector ("Original", "Rev 1 — by P3, intent: …", …). Latest is canonical by default. | User explicit. Methodologically rich; participants and researcher both see history. |
| **D18** | **Telemetry granularity = medium.** Logged as Neo4j `Event` nodes: every sticky CRUD + move-end + text-edit (debounced 500 ms) + intent change + AI events + selection events + canvas open/close + idle transitions. NOT per-keystroke or per-drag-frame. | Captures meaningful behaviors without flooding the log. Storage cost manageable at probe scale. |
| **D19** | **Real-time presence = avatars + live cursors + edit halo.** Top-header avatar circles for all online participants; Liveblocks live cursors with name labels; colored halo on stickies someone else is currently dragging or editing. | Maximum collaborative awareness; supports observation of co-design dynamics. |
| **D20** | **Onboarding = V1-tailored 3-step modal.** Steps: (1) "Pick an idea" (cluster grid demo), (2) "Sticky-note feedback" (add/delete/merge intent demo), (3) "Revise with AI" (button + diff demo). Persisted via `User.onboardingCompleted`. | Mirrors V0 onboarding pattern; ensures consistent first-run experience for unmoderated participants. |
| **D21** | **Sticky-note extras = reactions (emoji bar) only.** No threading, no Miro-style connections. Emoji set: 👍 👎 🎯 💡 ⚠️ ❓ (V0 set). | User explicit. V1 prose ("free spatial arrangement to express grouping or relationships") covered by spatial position alone. Reactions add lightweight expressivity. The probe's research goal is to discover what extra primitives participants spontaneously request — so we deliberately keep the baseline minimal. |
| **D22** | **Researcher analysis tooling = Neo4j Browser (Cypher console) + per-canvas JSON export.** Export contains: idea metadata + all `IdeaVersion`s + all sticky-note states + full event log + reactions. Reuses the reference component's `exportBoard` pattern, extended. | Researcher uses external tools (Jupyter / pandas) for analysis — no custom dashboard build. |
| **D23** *(implicit V0 carryover)* | **LLM = OpenAI SDK; model configurable via `OPENAI_MODEL` env (default `gpt-5.5`).** Idea generation uses structured outputs (JSON schema from Zod). AI Revise uses freeform output validated against a Zod schema (`{ revisedMarkdown, changelog }`). | V0 §3 + §5.2; reusable as-is. |
| **D24** *(implicit V0 carryover)* | **Admin regen = `/admin/regenerate` page.** ADMIN_EMAILS env list. Regenerating archives the previous deck and creates a fresh one with new LLM ideas. | V0 §5.2; reusable as-is. |
| **D25** *(implicit V0 carryover)* | **Catalog vendoring + sanitization per V0 §5.1.** `scripts/sanitize-catalog.ts` regex-replaces bare `NaN` → `null`. Vendored to `public/catalog/`. | NaN literals confirmed in 20 cluster files. |
| **D26** *(implicit V0 carryover)* | **Folder layout per V0 §3.3, with V1 adaptations.** Drop swipe-deck/branch components; add canvas/sticky-note components and Liveblocks scaffolding. | See §6 below. |
| **D27** *(deep-research, 2026-04-28)* | **Mutation pattern = Next.js 16 Server Actions for user-triggered writes; Route Handlers for webhooks + M2M endpoints.** Examples: `createSticky`, `updateSticky`, `toggleReaction`, `requestAiRevise`, `acceptAiRevise` are Server Actions. `/api/liveblocks/auth`, `/api/liveblocks/webhook`, `/api/telemetry/batch` stay as Route Handlers. | Per [Next.js 16 App Router patterns](https://dev.to/teguh_coding/nextjs-app-router-the-patterns-that-actually-matter-in-2026-146): Server Actions give automatic CSRF, progressive enhancement, and keep mutation logic adjacent to UI. Route Handlers reserved for non-component callers. |
| **D28** *(deep-research, 2026-04-28)* | **Auth/middleware file is `src/proxy.ts`, NOT `src/middleware.ts`.** Next.js 16 renamed the convention. Export named `proxy` (or default) handler. | Per [Next.js 16 release notes](https://nextjs.org/blog/next-16) and Auth.js v5 / Better Auth docs. The plan's V0-derived §6 reference to `middleware.ts` is **superseded**. |
| **D29** *(deep-research, 2026-04-28)* | **OpenAI integration = Responses API with `zodTextFormat`-derived strict structured outputs.** Idea generation: model = `gpt-5.5` (or env override), input = prompt, `text.format = zodTextFormat(IdeaProposalsSchema, "ideaProposals")`. AI Revise: same pattern with `RevisedIdeaSchema`. | The legacy `chat.completions` `response_format: { json_schema, strict: true }` still works, but [OpenAI's migration guide](https://platform.openai.com/docs/guides/migrate-to-responses) marks it deprecated for new code. The Responses API has cleaner ergonomics and the SDK ships `zodTextFormat` to wire Zod schemas directly. |
| **D30** *(deep-research, 2026-04-28)* | **Neo4j read pattern = `runRead()` using driver's `executeRead`** (with auto-retry on transient errors and read-replica routing on AuraDB Pro). Plain `runQuery` is now an alias of `runRead`. | Bare `session.run()` lacks retry semantics and forces all queries through the leader. `executeRead` enables 3–5× exponential-backoff retries on Neo.ClientError-recoverable errors, plus future read-replica routing for analytics queries. Implemented in `src/lib/neo4j.ts` after deep-research review. |
| **D31** *(deep-research, 2026-04-28)* | **Catalog loader is `React.cache`-wrapped** for per-request dedup in Server Components. Module-level `Map` cache stays as a process-level second tier. | Per [Next.js 16 data-fetching patterns](https://nextjs.org/docs/app/getting-started/route-handlers): wrap async loaders with `cache()` from React so multiple Server Components asking for the same cluster within one render share a single fs read. Implemented in `src/lib/catalog/loader.ts`. |

---

## 4. Architectural overview

```
                  ┌─────────────────────────────────────────────────────────┐
                  │  Browser (participant)                                  │
                  │                                                         │
                  │   /deck                /idea/[id]                       │
                  │   ┌──────────┐         ┌────────────┬──────────────┐    │
                  │   │ 3-col    │         │ Idea (R/O) │ Canvas (R/W) │    │
                  │   │ card grid│         │ + version  │ + sticky CRDT│    │
                  │   │ (10)     │         │   selector │ + presence   │    │
                  │   └──────────┘         └────────────┴──────────────┘    │
                  └────┬───────────────────────┬────────────────────┬───────┘
                       │ NextAuth session      │ Liveblocks WS       │ /api/* (REST)
                       │                       │ (Yjs CRDT + presence)│
                       ▼                       ▼                     ▼
              ┌────────────────┐      ┌────────────────┐    ┌────────────────────┐
              │ NextAuth       │      │ Liveblocks     │    │ Next.js 16 App     │
              │ Google OAuth   │      │ Cloud (rooms)  │    │ Router (Render)    │
              └────────┬───────┘      └────────┬───────┘    │  - /api/deck       │
                       │                       │            │  - /api/ideas/[id] │
                       │                       │            │  - /api/stickies/* │
                       │                       │            │  - /api/ai/revise  │
                       │                       │            │  - /api/reactions  │
                       │                       │            │  - /api/telemetry  │
                       │                       │            │  - /api/admin/*    │
                       │                       │            └─────────┬──────────┘
                       │                       │                      │
                       │                       │  webhook              │ neo4j-driver
                       │                       │  (room.changed)       │
                       │                       ▼                      ▼
                       │            ┌──────────────────┐    ┌────────────────────┐
                       │            │ Snapshot worker  │    │ Neo4j AuraDB Pro   │
                       │            │ (debounced       │───▶│  - User, Idea,     │
                       │            │  Liveblocks→Neo4j│    │    IdeaVersion,    │
                       │            │  serializer)     │    │    Canvas, Sticky, │
                       │            └──────────────────┘    │    Reaction, Event │
                       │                                    └─────────┬──────────┘
                       │                                              │
                       └──────────── createUserNode  ──────────────────┘

                          ┌────────────────────────┐      ┌──────────────┐
                          │ OpenAI API (GPT-5.5)   │◀─────│ /api/ai/*    │
                          │  - structured idea gen │      │ (admin regen,│
                          │  - AI Revise (free)    │      │   per-canvas │
                          └────────────────────────┘      │   revise)    │
                                                          └──────────────┘
```

**Three persistence layers, by purpose:**

1. **Liveblocks Yjs Doc** — live, conflict-free canvas state. Source of truth for "what does the canvas look like *right now*." TTL: room lifetime. Includes presence (cursors).
2. **Neo4j current-state mirror** — durable snapshot of the latest canvas state, reconciled from Liveblocks via debounced snapshot writer. Used for: list view counts, recovery after Liveblocks downtime, researcher export.
3. **Neo4j event log** — append-only `(:Event)` nodes capturing every meaningful action (D18 telemetry). Used for: research analysis (after the study, not during it).

---

## 5. Data model (Neo4j)

### 5.1 Nodes

```cypher
(:User {
  id: uuid, googleId, email, handle, avatarUrl,
  onboardingCompleted: bool, createdAt
})

(:Deck {
  id: uuid, generatedAt, modelVersion, sampleSeed,
  status: 'active' | 'archived', createdBy
})

(:Cluster {
  clusterId: int, summary, description,
  paperCount, themeLabel,
  keywords: [string], subTopics: [string]
})

(:Idea {
  id: uuid,
  generatedAt, modelVersion, promptVersion,
  samplePaperIds: [string]
})

(:IdeaVersion {
  id: uuid, ord: int,                      -- 0 = original LLM, 1+ = AI revisions
  title, researchQuestion, rationale,
  proposalMarkdown,                        -- canonical body for this version
  source: 'llm' | 'ai-revise',
  revisionIntent: string?,                 -- the user's free-text intent (null for v0)
  changelog: string?,                      -- LLM-produced 1-line summary (null for v0)
  createdAt, createdBy: uuid?              -- userId for ai-revise versions
})

(:AnchorPaper { paperId, title, authors, venue, year, url })

(:Canvas {
  id: uuid, ideaId,
  createdAt, lastActivityAt, lastSnapshotAt,
  liveblocksRoomId
})

(:Sticky {
  id: string,                              -- "note-..." per reference
  text, x, y, width, height, rotation,
  intent: 'add' | 'delete' | 'merge',
  authorUserId: uuid,
  createdAt, updatedAt
})

(:Reaction {
  kind: 'thumbs_up' | 'thumbs_down' | 'target' | 'bulb' | 'warning' | 'question',
  createdAt
})

(:Event {
  id: uuid, kind: string,                  -- 'sticky.created', 'sticky.moved', 'ai.revise.triggered', ...
  ts: datetime,
  payload: JSON,                           -- event-specific data (positions, text diffs, etc.)
})
```

### 5.2 Relationships

```cypher
(:Deck)-[:CONTAINS]->(:Cluster)              -- 10 per active deck
(:Cluster)-[:HAS_IDEA]->(:Idea)              -- exactly 1 per cluster (D7)
(:Idea)-[:HAS_VERSION]->(:IdeaVersion)       -- v0 = LLM; v1+ = AI-revise accepted
(:IdeaVersion)-[:CITES]->(:AnchorPaper)      -- 3 per v0; v1+ inherit unless changed
(:Idea)-[:HAS_CANVAS]->(:Canvas)             -- 1:1
(:Canvas)-[:HAS_STICKY]->(:Sticky)
(:Canvas)-[:HAS_EVENT]->(:Event)
(:Sticky)-[:HAS_REACTION]->(:Reaction)
(:User)-[:AUTHORED]->(:Sticky)
(:User)-[:AUTHORED]->(:IdeaVersion)          -- only for ai-revise versions
(:User)-[:REACTED { kind } ]->(:Sticky)      -- via :Reaction node, one per (user, sticky, kind)
(:User)-[:VISITED { at } ]->(:Canvas)        -- session tracking
(:User)-[:EMITTED]->(:Event)
```

### 5.3 Constraints / indexes

```cypher
CREATE CONSTRAINT user_id          IF NOT EXISTS FOR (u:User)         REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT user_google      IF NOT EXISTS FOR (u:User)         REQUIRE u.googleId IS UNIQUE;
CREATE CONSTRAINT deck_id          IF NOT EXISTS FOR (d:Deck)         REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT idea_id          IF NOT EXISTS FOR (i:Idea)         REQUIRE i.id IS UNIQUE;
CREATE CONSTRAINT idea_version_id  IF NOT EXISTS FOR (v:IdeaVersion)  REQUIRE v.id IS UNIQUE;
CREATE CONSTRAINT canvas_id        IF NOT EXISTS FOR (c:Canvas)       REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT sticky_id        IF NOT EXISTS FOR (s:Sticky)       REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT event_id         IF NOT EXISTS FOR (e:Event)        REQUIRE e.id IS UNIQUE;
CREATE INDEX deck_status           IF NOT EXISTS FOR (d:Deck)         ON (d.status);
CREATE INDEX canvas_lastactivity   IF NOT EXISTS FOR (c:Canvas)       ON (c.lastActivityAt);
CREATE INDEX event_ts              IF NOT EXISTS FOR (e:Event)        ON (e.ts);
CREATE INDEX event_kind            IF NOT EXISTS FOR (e:Event)        ON (e.kind);
```

---

## 6. Folder layout

```
ResearchGit/
├── SPEC.md                                # V0 (reference)
├── SPEC_V1.md                             # V1 (target)
├── README.md                              # to be written
├── docker-compose.yml                     # local Neo4j 5
├── package.json                           # packageManager: "pnpm@9.x"
├── pnpm-lock.yaml
├── tsconfig.json                          # strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
├── tsconfig.scripts.json                  # extends base for tsx
├── next.config.ts
├── tailwind.config.ts
├── components.json                        # shadcn config
├── biome.json                             # lint + format
├── lefthook.yml                           # pre-commit: biome check + tsc --noEmit + vitest --run
├── playwright.config.ts
├── vitest.config.ts
├── .notes/typescript-preference.md        # existing
├── plans/                                 # this file lives here
├── public/
│   └── catalog/                           # vendored from ResearchGalaxy, sanitized
│       ├── all_venues_cluster_themes.json
│       └── cluster_details/
│           ├── cluster_0.json
│           └── … cluster_19.json
├── scripts/
│   ├── sanitize-catalog.ts                # NaN → null pass (V0 §5.1)
│   └── seed-neo4j.ts                      # dev-only seed
├── tests/
│   ├── e2e/
│   │   ├── pages/                         # typed page objects
│   │   ├── deck-flow.spec.ts              # login → grid → pick idea → land on canvas
│   │   ├── canvas-sticky.spec.ts          # create/edit/delete sticky; intent change; presence
│   │   └── ai-revise.spec.ts              # trigger → diff modal → accept → version increments
│   └── unit/
│       ├── sampler.test.ts
│       ├── prompts.test.ts
│       └── canvas-schema.test.ts          # Zod parse roundtrips
└── src/
    ├── env.ts                             # @t3-oss/env-nextjs
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                       # landing
    │   ├── deck/page.tsx                  # 10-card grid (D9)
    │   ├── idea/
    │   │   └── [id]/
    │   │       ├── layout.tsx             # split-screen layout (D11)
    │   │       ├── page.tsx               # left pane: idea + version selector
    │   │       └── @canvas/page.tsx       # parallel route: right pane canvas
    │   ├── admin/regenerate/page.tsx      # admin-only (D24)
    │   ├── admin/export/page.tsx          # researcher export UI (D22)
    │   └── api/
    │       ├── auth/[...nextauth]/route.ts
    │       ├── deck/route.ts              # GET active deck + 10 ideas
    │       ├── ideas/[id]/route.ts        # GET + version list
    │       ├── ideas/[id]/versions/route.ts  # POST: create new IdeaVersion (AI accept)
    │       ├── stickies/route.ts          # POST create
    │       ├── stickies/[id]/route.ts     # PATCH update; DELETE
    │       ├── reactions/route.ts         # POST toggle
    │       ├── ai/revise/route.ts         # POST: returns proposed markdown + changelog (no DB write)
    │       ├── telemetry/route.ts         # POST event log batch
    │       ├── liveblocks/auth/route.ts   # NextAuth → Liveblocks JWT
    │       ├── liveblocks/snapshot/route.ts  # webhook target (room.changed)
    │       ├── admin/regenerate/route.ts
    │       └── admin/export/route.ts      # JSON export per canvas
    ├── components/
    │   ├── deck/
    │   │   ├── IdeaCard.tsx
    │   │   └── IdeaCardGrid.tsx
    │   ├── idea/
    │   │   ├── IdeaPane.tsx               # left pane with version selector
    │   │   ├── VersionSelector.tsx
    │   │   └── AnchorPaperChip.tsx
    │   ├── canvas/
    │   │   ├── StickyNotesBoard.tsx       # ported from user reference, multi-userized
    │   │   ├── CanvasToolbar.tsx          # left sidebar: Tools, Create, Intent (3 colors), Selected, Search
    │   │   ├── CanvasHeader.tsx           # top header: avatars, count, zoom controls
    │   │   ├── StickyNote.tsx             # one note (text + intent + reactions + drag)
    │   │   ├── StickyReactionBar.tsx
    │   │   ├── PresenceCursors.tsx        # Liveblocks live cursors
    │   │   └── ReviseWithAIButton.tsx     # bottom-right floating button
    │   ├── ai/
    │   │   ├── ReviseDialog.tsx           # input intent + diff view + accept/reject
    │   │   └── DiffView.tsx               # side-by-side diff
    │   ├── onboarding/
    │   │   └── OnboardingTour.tsx         # 3-step modal (D20)
    │   └── ui/                            # shadcn primitives
    ├── lib/
    │   ├── neo4j.ts                       # driver singleton + typed runQuery<TSchema>
    │   ├── liveblocks/
    │   │   ├── server.ts
    │   │   ├── client.ts
    │   │   └── room-id.ts                 # `canvas:${ideaId}` convention
    │   ├── llm/
    │   │   ├── client.ts                  # OpenAI wrapper
    │   │   ├── prompts.ts                 # generate + revise
    │   │   └── schema.ts                  # Zod for structured outputs
    │   ├── catalog/
    │   │   ├── loader.ts                  # fs-backed cluster loader, in-memory cache
    │   │   ├── sampler.ts                 # 10 of 20, seedable
    │   │   └── paperSampler.ts            # 30 of N, seedable
    │   ├── canvas/
    │   │   ├── schema.ts                  # Zod for StickyNote, BoardSnapshot
    │   │   ├── snapshot.ts                # Liveblocks room → Neo4j writer (debounced)
    │   │   └── intent-styles.ts           # add/delete/merge → Tailwind class
    │   ├── auth.ts                        # Better Auth config (Google provider)
    │   ├── proxy.ts                        # Next.js 16 proxy.ts (replaces middleware.ts) — at src/proxy.ts
    │   ├── api/
    │   │   ├── handler.ts                 # zod-in/json-out factory
    │   │   └── errors.ts                  # ApiError + toResponse
    │   ├── telemetry.ts                   # emitEvent(kind, payload) → /api/telemetry
    │   └── types.ts                       # cross-cutting z.infer<>
    ├── server/
    │   ├── deck-service.ts
    │   ├── idea-service.ts                # CRUD + version create
    │   ├── canvas-service.ts              # snapshot, export
    │   ├── sticky-service.ts
    │   ├── reaction-service.ts
    │   ├── ai-service.ts                  # revise prompt, response parsing
    │   └── telemetry-service.ts
    └── styles/globals.css
```

---

## 7. Critical files & port targets

The user supplied a complete `StickyNotesBoard.tsx` reference. Files derived from it:

| Reference structure | V1 destination | Adaptations |
|--------------------|----------------|-------------|
| `type StickyNoteItem` | `src/lib/canvas/schema.ts` (Zod schema) | Drop `color` enum (yellow/blue/orange/pink); add `intent: "add"\|"delete"\|"merge"`. `author` becomes `authorUserId: string`. |
| `type DragState`, `BoardMode` | `src/components/canvas/StickyNotesBoard.tsx` | Reused as-is. |
| `validateBoardPayload` | `src/lib/canvas/schema.ts` | Replaced with Zod `.parse()`. |
| `colorStyles`, `colorLabels` | `src/lib/canvas/intent-styles.ts` | Becomes `intentStyles: Record<StickyIntent, string>` with 3 entries. |
| `addNote`, `updateNote`, `deleteSelectedNote` | `StickyNotesBoard.tsx` | Operate on Liveblocks Y.Array via `useStorage`/`useMutation` instead of `useState`. Each call also POSTs to `/api/stickies/*` (telemetry) and emits an Event. |
| `exportBoard` | `src/server/canvas-service.ts` (`exportCanvas`) | Server-side; pulls from Neo4j; includes IdeaVersion history + events + reactions. Reachable via `/admin/export`. |
| `importBoard` | Dropped from runtime UI | Could resurface as researcher seeding tool but not v1. |
| `currentAuthor` dropdown | Removed | Author is always the NextAuth session user. |
| Static `AuthorBadge` decorations | Removed | Replaced with Liveblocks presence avatars. |
| Decorative title + image divs | Removed | These were demo artifacts; canvas starts empty per idea. |
| Pan / zoom / drag math | `StickyNotesBoard.tsx` | Reused verbatim — well-tested arithmetic. |

---

## 8. Implementation phases

Each phase is a vertical slice with a runnable demo target. Estimates assume one engineer, normal-week pace.

| # | Phase | Duration | Demo target |
|---|-------|----------|-------------|
| 1 | **Project scaffold** — Next.js 16 (App Router) + TS strict + Biome + lefthook + Tailwind + shadcn/ui + `@t3-oss/env-nextjs` + Zod + folder layout. `pnpm dev` boots a blank page; `pnpm typecheck` clean; `pnpm check` clean. | 0.5 day | Empty page renders. |
| 2 | **Catalog vendoring** — copy 20 cluster JSONs + `all_venues_cluster_themes.json`. Run `scripts/sanitize-catalog.ts` (NaN → null). Build `loader.ts` with in-memory cache + `sampler.ts` + `paperSampler.ts`. Vitest unit tests for sampler determinism. | 0.5 day | `pnpm tsx scripts/loader-smoke.ts` prints a sampled cluster. |
| 3 | **Neo4j wiring** — driver singleton, typed `runQuery<TSchema>`, `docker-compose.yml` for local Neo4j 5, constraint/index migration, `seed-neo4j.ts`. | 0.5 day | `docker compose up neo4j` + visit `localhost:7474` shows constraints in place. |
| 4 | **Auth** — NextAuth Google provider, JWT session, User-node create-on-first-login, ADMIN_EMAILS gate for `/admin/*`. | 0.5 day | Sign-in flow lands on `/deck`. |
| 5 | **LLM idea generation (admin path)** — OpenAI client + Zod-bounded structured outputs + prompt builder. `/admin/regenerate` regenerates the active deck (10 ideas, 1 each, 3 anchor papers). Persists `Deck → Cluster → Idea → IdeaVersion (v0) → AnchorPaper`. | 1 day | Click admin button → 10 ideas appear in DB. |
| 6 | **List view** — `/deck` page, 3-col card grid, `IdeaCard` displaying title + RQ + rationale + 3 anchor chips. TanStack Query for fetch. Click → navigate to `/idea/[id]`. | 0.5 day | `/deck` shows 10 cards; clicking goes to a stub canvas page. |
| 7 | **Idea page split layout** — App-Router parallel routes `(default)/page.tsx` for left pane (`IdeaPane` + `VersionSelector` showing only Original) and `@canvas/page.tsx` stub. Resizable split (shadcn Resizable). | 0.5 day | `/idea/[id]` shows split with stub right pane. |
| 8 | **Canvas v1 (single-user, local state)** — Port reference component to `StickyNotesBoard.tsx`. Adapt: 3 intents instead of 6 colors, author from session, drop import/decoratives. Drag, pan/zoom, double-click create, sticky text edit, intent picker (3 swatches), delete from sidebar, search. State in `useState` for now; persist to Neo4j on every change via `/api/stickies/*`. | 2 days | Single user can fully use canvas; refresh restores from Neo4j. |
| 9 | **Liveblocks multi-user** — Liveblocks SDK install, room provider, `Y.Array<StickyNote>` + `Y.Map<canvasMeta>`. Replace `useState` with `useStorage` + `useMutation`. NextAuth → Liveblocks JWT bridge. Cursor presence. Edit-halo. | 2 days | Two browser tabs → real-time co-editing with cursors. |
| 10 | **Snapshot writer** — Liveblocks webhook → `/api/liveblocks/snapshot` debounced 5s. Parses Y.Array → writes Sticky nodes to Neo4j. Idempotent (key on sticky.id). | 1 day | Closing all tabs and reopening shows persisted state. |
| 11 | **Telemetry** — `emitEvent(kind, payload)` client helper, `/api/telemetry` batch endpoint, `Event` nodes per D18. Wire emissions on every CRUD + AI events + canvas open/close + idle. | 1 day | Cypher: `MATCH (e:Event) RETURN e.kind, count(*) ORDER BY count(*) DESC` shows expected mix. |
| 12 | **AI Revise** — `ReviseWithAIButton` (sparkles, bottom-right). `ReviseDialog` with intent textarea. `/api/ai/revise` collects idea + stickies + intent → OpenAI → returns proposed markdown + changelog. `DiffView` modal (use `react-diff-viewer-continued`). Accept → POST `/api/ideas/[id]/versions` → creates IdeaVersion (vN) → broadcasts Liveblocks event so other clients refresh `VersionSelector`. | 2 days | Trigger → modal → accept → left pane updates with new version. |
| 13 | **Reactions** — emoji bar on each sticky (lazy-loaded on hover). Toggle per (user, sticky, emoji). Reaction count updates real-time via Liveblocks broadcast. | 0.5 day | Click 👍 on a sticky; counts increment for both browsers. |
| 14 | **Onboarding** — 3-step modal (shadcn Dialog + Framer Motion). Persists `User.onboardingCompleted`. | 0.5 day | First sign-in shows tour; subsequent sign-ins don't. |
| 15 | **Researcher export** — `/admin/export` page lists canvases. "Download JSON" per canvas runs `exportCanvas(canvasId)` → returns idea + all IdeaVersions + stickies + events + reactions. | 0.5 day | Download produces a JSON readable in Jupyter. |
| 16 | **Polish** — empty states, dark-mode tokens (V0 carryover, optional), keyboard shortcuts (R = revise, Esc = clear selection), a11y pass with `@axe-core/playwright` on key flows. | 1 day | Lighthouse + axe pass at AA. |
| 17 | **E2E tests** — Playwright specs for the 3 critical flows. | 1 day | `pnpm test:e2e` green. |

**Total: ~15 working days.** Phases 1–7 are sequential; 11 (telemetry) can run alongside 9–10; 12 depends on 9; 13–17 mostly parallelizable.

---

## 9. Verification approach

| Layer | How to verify |
|-------|---------------|
| Type safety | `pnpm typecheck` (`tsc --noEmit`) — must pass with strict + noUncheckedIndexedAccess. |
| Lint + format | `pnpm check` (`biome check src/`). |
| Unit | Vitest: `sampler.test.ts`, `prompts.test.ts`, `canvas-schema.test.ts` (Zod parse roundtrips for the reference's `validateBoardPayload` cases). |
| Integration | Playwright + local Neo4j via docker-compose: `tests/e2e/deck-flow.spec.ts`, `canvas-sticky.spec.ts`, `ai-revise.spec.ts`. |
| Real-time | Two-tab E2E: tab A creates sticky, tab B's DOM mutation observer sees it within 1s. |
| Multi-user concurrency | Two-tab simultaneous drag of *same* sticky: Yjs CRDT resolves, no exceptions. |
| Telemetry | Cypher: assert event counts after a scripted Playwright session. |
| LLM | Mock OpenAI in tests (`msw` or stubbed client). For dev: structured outputs validated by Zod parse on every response, with one retry on schema-violation. |
| A11y | `@axe-core/playwright` on `/deck` and `/idea/[id]`. WCAG 2.1 AA. |
| Manual | `pnpm dev` + `chrome-devtools` skill: navigate, screenshot key screens, compare to reference. |

---

## 10. Risks & follow-ups

| Risk | Mitigation |
|------|------------|
| Liveblocks free-tier limits during a study burst (50 MAU, ~100 connections) | At D2 scale (2–5 concurrent), well within budget. Upgrade to Pro (~$14/mo) if a single canvas approaches 25 simultaneous. |
| Snapshot writer races a fast Liveblocks update stream | 5s debounce + last-write-wins on Sticky.id; tolerable since Liveblocks is the source of truth. Snapshot is a *mirror* for analysis, not authoritative live state. |
| AI Revise incorporates stale stickies if mid-revision someone edits | Acceptable for a probe; the diff view lets the triggering user inspect and reject. |
| GPT-5.5 schema-violation on idea generation | Zod-validated structured outputs + 1 retry; admin sees a clear error message in `/admin/regenerate`. |
| Same-10-globally regeneration during an active study would invalidate sessions | Admin-only; ADMIN_EMAILS gate. UI confirms: "This will archive the current deck and break in-flight canvases. Continue?" |
| Participant tab close mid-edit | Liveblocks holds the canvas; reopening the tab restores. Snapshot writer ensures Neo4j eventually catches up (≤5s after last activity). |

**Open follow-ups (not blocking V1):**

1. Pusher: drop entirely in favor of Liveblocks broadcast + Next.js `revalidatePath`, or retain for non-canvas global events? Decision deferred to phase 9.
2. Dark mode tokens: V0 had them; V1 optional. Decision deferred to phase 16.
3. Mobile/tablet support: V0 explicitly out-of-scope for V1, same here.

---

## 11. Out of scope (V0 features deliberately dropped)

- **Swipe deck + lock-winner mechanic** — replaced by single-pick card grid (D9–D10).
- **Per-user branches with markdown edits** — replaced by single shared canvas per idea (D1 + D11).
- **Slack-style threaded comments** — replaced by sticky notes; reactions retained on stickies (D21).
- **Branch ownership / owner-only edits** — no branches in V1.
- **`BranchEdit` accept/reject mechanic** — reused conceptually for AI revise (D15) but on the idea, not on a branch.
- **History rewind on the deck** — single-pick is final per-session (D10); no rewind needed.
- **Cluster recommendation features** — V0's "users who locked X also locked Y" deferred to v2+.
- **Account deletion, multi-deck coexistence, mobile, email digests, public API** — same as V0.

---

## Acceptance

This plan represents a complete architectural commit for V1 implementation. After user approval (`ExitPlanMode`), implementation begins at Phase 1.
