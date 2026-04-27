# ResearchGit — Specification

> Project name: **ResearchGit**
> Path: `/Users/edwardhu/Desktop/ResearchGit/`
> Author: Edward Hu
> Date: 2026-04-27
> Status: Approved spec, source of truth for implementation

---

## 1. Context

### 1.1 Why this exists

Research proposal generation is increasingly delegated to LLMs that read paper clusters and emit candidate research directions. The bottleneck is no longer "what could we research?", it is "which directions are good, why, and how do we converge as a community?" Today this happens in scattered Slack threads, lab meetings, and Google Docs that vanish.

ResearchGit treats AI-generated research proposals as first-class versionable artifacts. It borrows the social vocabulary of GitHub (branches, comments, threads, reactions) and the engagement loop of Tinder (swipe to engage) to build a focused tool where:

1. The system samples 10 paper clusters from a fixed catalog.
2. GPT-5.5 generates 3 candidate proposals per cluster.
3. Researchers swipe through candidates and lock one winner per cluster.
4. The winner becomes a base proposal that anyone can branch from with their own discussion thread plus optional markdown edits.
5. AI revision is available as a manual button on each branch.
6. Same 10 clusters are seen by every user, so conversations accumulate.

### 1.2 Out of scope for v1

- Merging branches back into the canonical proposal (reconciliation deferred to v2).
- User profile pages.
- Mobile-optimized interactions.
- Email notifications and digests.
- Public API or third-party integrations.
- Multi-deck coexistence (only one Active Deck at a time, plus archived read-only decks).

### 1.3 Success signal

A successful v1 demo run looks like: 5 to 10 researchers each spend 10 minutes swiping through one shared deck, lock different winners across the 10 clusters, and at least 3 branches per popular proposal accumulate comments + at least one AI-revised draft.

---

## 2. End-to-end User Flow

This mirrors the hand-drawn workflow diagram exactly.

```
┌──────────────┐  ┌──────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────┐
│ Paper        │→ │ LLM (GPT-5.5)    │→ │ Card stack     │→ │ Locked winner  │→ │ Winner + branches    │
│ clusters     │  │ generates 3      │  │ A B C          │  │ A (with        │  │ A                    │
│ (10 sampled) │  │ proposals/cluster│  │ swipe ✓ / ✗    │  │ rationale)     │  │ ├ branch1 (+edits)   │
│              │  │                  │  │                │  │                │  │ ├ branch2 (comments) │
│              │  │                  │  │                │  │                │  │ └ branch3 (...)      │
└──────────────┘  └──────────────────┘  └────────────────┘  └────────────────┘  └──────────────────────┘
```

### 2.1 First-run onboarding

A 3-step modal tour fires on first authenticated visit (skippable, persistently dismissed via Neo4j `User.onboardingCompleted = true`):

1. **What is a Deck?** — short blurb, animated illustration of 10 cluster bubbles forming.
2. **How do you swipe?** — interactive: user swipes a tutorial card (right + left) to feel the gesture.
3. **What is a Branch?** — animated reveal of a proposal sprouting branches; "branches are how you and others discuss + tweak the proposal".

### 2.2 Steady-state

```
1. User signs in via Google OAuth.
2. Lands on /deck (the Active Deck view).
3. Sees a horizontal progress bar: "Cluster 1 of 10".
4. Card stack renders: top card = proposal A, peek of B, peek of C.
5. User swipes:
   - Right (✓): locks A as the cluster winner, jumps to /proposal/<id>.
   - Left (✗): rejects A, B becomes top.
   - If all three rejected: cluster shows "No winner picked" state, advances to cluster 2.
6. On /proposal/<id>:
   - Top: full proposal card (title + research question + rationale + 3 anchor papers).
   - Below: list of branches (siblings under the proposal).
   - User can:
     a. Click "Comment" on the proposal → auto-creates user's branch if absent → jump to /proposal/<id>/branch/<branch_id>.
     b. Click an existing branch to view its discussion + diffs.
   - Inside a branch: top-level Slack-style comments, each with a thread side-panel.
   - Branch owner sees "Edit proposal" affordance → opens markdown editor → side-by-side diff.
   - Each branch has a "Revise with AI" button (manual trigger).
7. History rewind: a left-pointing chevron in the deck header lets the user step backward to revisit any cluster, including ones already locked. Re-swiping overwrites the previous selection (single mutable winner per cluster, not append-only).
```

---

## 3. Tech Stack

### 3.1 Languages and core tooling

The entire codebase is **TypeScript-first**, no plain `.js` allowed in `src/`. Every value crossing a network or LLM boundary is validated at runtime by Zod so the static type system actually represents reality rather than assumed shape.

| Concern | Choice | Notes |
|---------|--------|-------|
| Primary language | **TypeScript 5.x (strict mode)** | `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true` in `tsconfig.json` |
| Runtime validation | **Zod v3+** | Parse-don't-validate at: API request bodies, OpenAI structured outputs, Neo4j result rows |
| Linter / formatter | **Biome v1** | One tool covers lint + format; faster than ESLint+Prettier; plays nicely with TS |
| Pre-commit hooks | **lefthook** | Runs `biome check`, `tsc --noEmit`, `vitest --run` on changed files |
| Package manager | **pnpm 9+** | Faster installs, strict node_modules, shipped via `packageManager` field |
| Type-safe env | **`@t3-oss/env-nextjs`** | Zod-validated environment variables at build time |
| Type-safe Neo4j helpers | Hand-rolled `Result<T>` wrappers in `src/lib/neo4j.ts` | `runQuery<TSchema extends ZodSchema>(cypher, params, schema)` returns `z.infer<TSchema>[]` |
| Type-safe scripts | **`tsx`** | Runs TS scripts (sanitize-catalog.ts, seed-neo4j.ts) without a build step |

### 3.2 Frontend, backend, infrastructure

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend framework | Next.js 16 (App Router) | TypeScript by default; RSC where it pays, client components for the swipe + editor |
| Styling | Tailwind CSS 4 + shadcn/ui | Dark mode tokens via shadcn `globals.css`; shadcn components copied as TS source |
| Animation | Framer Motion | Card swipe, history rewind, modals, toasts |
| Data fetching (client) | TanStack Query v5 | Cache, invalidate on Pusher events; query keys typed via `as const` |
| Forms | React Hook Form + Zod resolver | Comments, branch edits, admin actions |
| Real-time | Pusher Channels | Server SDK on API routes, `pusher-js` on client |
| Auth | NextAuth (`@auth/nextjs`) Google provider | JWT session strategy |
| Database | Neo4j AuraDB Pro | Cypher queries via `neo4j-driver` v5+ (official TS types) |
| LLM | OpenAI GPT-5.5 via official `openai` npm SDK | Structured outputs (JSON schema generated from Zod) |
| Diff renderer | `react-diff-viewer-continued` | Side-by-side mode |
| Markdown | `react-markdown` + `remark-gfm` | Comments + proposal text |
| Icons | `lucide-react` | Same as research-galaxy demo |
| Deployment | Render (Web Service for Next.js) | AuraDB and Pusher are external SaaS |
| Local dev DB | `neo4j:5-community` Docker | `docker compose` shipped in repo |
| Unit tests | Vitest + `@testing-library/react` | TS-native, fast, watch mode |
| E2E tests | Playwright | Typed page objects in `tests/e2e/pages/` |
| a11y tests | `@axe-core/playwright` | Automated WCAG 2.1 AA checks on key screens |
| Bundler / dev server | Built-in Next.js (Turbopack in dev, webpack in prod) | No custom config |

### 3.3 Folder layout (proposed)

```
ResearchGit/
├── SPEC.md
├── README.md
├── docker-compose.yml              # local Neo4j
├── package.json                    # packageManager: "pnpm@9.x"
├── pnpm-lock.yaml
├── tsconfig.json                   # strict + noUncheckedIndexedAccess
├── tsconfig.scripts.json           # extends base, target=ESNext for tsx
├── next.config.ts                  # TypeScript Next.js config
├── tailwind.config.ts
├── components.json                 # shadcn config
├── biome.json                      # lint + format
├── lefthook.yml                    # pre-commit hooks
├── playwright.config.ts
├── vitest.config.ts
├── public/
│   └── catalog/                    # vendored cluster JSONs (sanitized)
│       ├── all_venues_cluster_themes.json
│       └── cluster_details/
│           ├── cluster_0.json
│           └── ... (cluster_19.json)
├── src/
│   ├── env.ts                      # @t3-oss/env-nextjs zod schema
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                # landing
│   │   ├── deck/page.tsx           # the swipe deck
│   │   ├── proposal/[id]/page.tsx
│   │   ├── proposal/[id]/branch/[branchId]/page.tsx
│   │   ├── admin/regenerate/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── deck/route.ts
│   │       ├── proposals/[id]/route.ts
│   │       ├── branches/route.ts
│   │       ├── comments/route.ts
│   │       ├── reactions/route.ts
│   │       ├── ai/revise/route.ts
│   │       └── admin/regenerate/route.ts
│   ├── components/
│   │   ├── deck/SwipeableCard.tsx  # ported verbatim from BlindMatchStep
│   │   ├── deck/ProposalCard.tsx   # new, replaces MatchCard
│   │   ├── deck/DeckProgress.tsx
│   │   ├── deck/RewindButton.tsx
│   │   ├── proposal/BranchList.tsx
│   │   ├── proposal/BranchView.tsx
│   │   ├── proposal/CommentTree.tsx       # Slack-style with side panel
│   │   ├── proposal/ThreadPanel.tsx
│   │   ├── proposal/ProposalEditor.tsx    # markdown textarea + diff preview
│   │   ├── proposal/ReviseWithAIButton.tsx
│   │   ├── proposal/ReactionBar.tsx
│   │   └── onboarding/OnboardingTour.tsx
│   ├── lib/
│   │   ├── neo4j.ts                # driver singleton + typed runQuery helper
│   │   ├── pusher-server.ts
│   │   ├── pusher-client.ts
│   │   ├── llm/
│   │   │   ├── client.ts           # OpenAI wrapper, typed
│   │   │   ├── prompts.ts          # generate-proposals + revise prompts
│   │   │   └── schema.ts           # zod schemas for structured outputs
│   │   ├── catalog/
│   │   │   ├── sampler.ts          # uniform random over 20 clusters → 10
│   │   │   ├── paperSampler.ts     # uniform random 30 papers per cluster
│   │   │   └── loader.ts           # reads vendored JSON
│   │   ├── auth.ts                 # NextAuth config
│   │   ├── api/
│   │   │   ├── handler.ts          # typed route handler factory (zod-in, json-out)
│   │   │   └── errors.ts           # ApiError class + toResponse mapper
│   │   └── types.ts                # cross-cutting domain types (z.infer<>)
│   ├── server/
│   │   ├── deck-service.ts         # Cypher for deck queries
│   │   ├── proposal-service.ts
│   │   ├── branch-service.ts
│   │   ├── comment-service.ts
│   │   └── ai-service.ts
│   └── styles/globals.css
├── scripts/
│   ├── sanitize-catalog.ts         # tsx-runnable, one-time NaN → null pass
│   └── seed-neo4j.ts               # tsx-runnable, dev-only seed
├── .notes/
│   └── typescript-preference.md    # design preference rationale
└── tests/
    ├── e2e/
    │   ├── pages/                  # typed page objects
    │   ├── swipe-deck.spec.ts
    │   ├── branch-flow.spec.ts
    │   └── ai-revise.spec.ts
    └── unit/
        ├── sampler.test.ts
        └── prompts.test.ts
```

---

## 4. Domain Model (Neo4j Schema)

### 4.1 Nodes

```
(:User { id: uuid, googleId, email, handle, avatarUrl, onboardingCompleted, createdAt })

(:Deck { id: uuid, generatedAt, modelVersion, sampleSeed, status: 'active'|'archived', createdBy })

(:Cluster { clusterId: int, summary, description, paperCount, themeLabel, keywords:[string], subTopics:[string] })

(:Proposal {
  id: uuid,
  cardLetter: 'A'|'B'|'C',
  title,
  researchQuestion,
  rationale,
  proposalMarkdown,    -- canonical markdown body (rationale rendered here)
  generatedAt,
  modelVersion,
  promptVersion,
  samplePaperIds:[string]   -- the 30 papers seen by the LLM, for reproducibility
})

(:AnchorPaper { paperId, title, authors, venue, year, url })

(:Branch { id: uuid, name, displayName, createdAt, lastActivityAt })

(:BranchEdit { id: uuid, proposalMarkdown, createdAt, source: 'human'|'ai-suggested', accepted: bool })

(:Comment { id: uuid, body, createdAt, editedAt, parentCommentId? })

(:Reaction { kind: 'thumbs_up'|'thumbs_down'|'target'|'bulb'|'warning'|'question', createdAt })
```

### 4.2 Relationships

```
(:Deck)-[:CONTAINS]->(:Cluster)            -- 10 per active deck
(:Cluster)-[:HAS_PROPOSAL]->(:Proposal)    -- 3 per cluster (configurable)
(:Proposal)-[:CITES]->(:AnchorPaper)       -- 3 per proposal
(:User)-[:LOCKED_WINNER {at: timestamp}]->(:Proposal)
        -- exactly one per (user, cluster); REPLACE on rewind
(:User)-[:OWNS]->(:Branch)
(:Branch)-[:OF]->(:Proposal)               -- a branch belongs to a proposal
(:Branch)-[:HAS_EDIT]->(:BranchEdit)       -- 0..N, ordered by createdAt
(:Branch)-[:HAS_COMMENT]->(:Comment)       -- top-level comments
(:Comment)-[:REPLY_TO]->(:Comment)         -- 1 level deep only (Slack-style)
(:User)-[:AUTHORED]->(:Comment)
(:User)-[:AUTHORED]->(:BranchEdit)
(:User)-[:REACTED { kind } ]->(:Comment | :Branch)  -- one per (user, target, kind)
```

### 4.3 Constraints / indexes (Cypher)

```cypher
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT user_google IF NOT EXISTS FOR (u:User) REQUIRE u.googleId IS UNIQUE;
CREATE CONSTRAINT deck_id IF NOT EXISTS FOR (d:Deck) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT proposal_id IF NOT EXISTS FOR (p:Proposal) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT branch_id IF NOT EXISTS FOR (b:Branch) REQUIRE b.id IS UNIQUE;
CREATE CONSTRAINT comment_id IF NOT EXISTS FOR (c:Comment) REQUIRE c.id IS UNIQUE;
CREATE INDEX deck_status IF NOT EXISTS FOR (d:Deck) ON (d.status);
CREATE INDEX cluster_in_deck IF NOT EXISTS FOR ()-[r:CONTAINS]-() ON (r);
CREATE INDEX branch_lastactivity IF NOT EXISTS FOR (b:Branch) ON (b.lastActivityAt);
```

### 4.4 Why Neo4j is the right call here

The graph traversals that matter most:
- "All branches on this proposal, sorted by lastActivityAt" — 1 hop.
- "All comments and replies inside this branch, threaded" — 2 hops with a single MATCH.
- "Has this user locked a winner for this cluster yet, and which one?" — 1 hop on `LOCKED_WINNER`.
- "Other proposals where users who locked this proposal also locked something" (recommendation-y; future v2) — 3 hops, trivial Cypher.

Postgres + jsonb would work but the relationship-heavy queries become awkward joins. Neo4j keeps the model literally identical to how we think about the social structure.

---

## 5. Core Subsystems

### 5.1 Catalog vendoring

**Source paths (copied once):**
- `/Users/edwardhu/Desktop/ProjectResearchGala/ResearchGalaxy-/research-galaxy-next demo/public/assets/cluster_details/cluster_*.json`
- `/Users/edwardhu/Desktop/ProjectResearchGala/ResearchGalaxy-/demo_data/merged/all_venues_cluster_themes.json`

**Destination:** `ResearchGit/public/catalog/`

**Sanitization step (one-time, scripted):**
- `scripts/sanitize-catalog.ts` reads each cluster JSON as a raw string, regex-replaces bare `NaN` literals with `null`, validates by `JSON.parse`, writes back. ~500 to 1000 occurrences across 20 files (all in the `award` field).

**Loader pattern (mirrors `DataLoader.fetchClusterDetails` from research-galaxy):**
- `src/lib/catalog/loader.ts` lazily reads cluster JSON via `fs.readFile` from the `public/catalog/` dir on the server. In-memory `Map<number, ClusterDetails>` cache keyed by `clusterId`.

**Sampling:**
- `sampler.ts`: `sampleClusters(n=10, total=20, seed?)` returns shuffled `clusterId[]`, optionally seeded by deck ID for determinism.
- `paperSampler.ts`: `samplePapers(papers[], n=30, seed)` uniform-random subsample of 30 paper objects.

### 5.2 LLM proposal generation

Triggered by admin action on `/admin/regenerate`, protected by a hard-coded ADMIN_EMAILS env list.

**Pseudocode:**
```ts
async function generateActiveDeck() {
  const previousActive = await neo4j.findActiveDeck();
  if (previousActive) await neo4j.archiveDeck(previousActive.id);

  const deck = await neo4j.createDeck({ modelVersion: "gpt-5.5", sampleSeed });
  const clusterIds = sampleClusters(10);

  for (const cid of clusterIds) {
    const cluster = await loader.load(cid);
    const samplePapers = samplePapers(cluster.papers, 30, sampleSeed + cid);
    const cards = await llm.generateProposals({
      cluster, samplePapers, count: CARDS_PER_CLUSTER ?? 3
    });
    await neo4j.persistProposals(deck.id, cluster, cards, samplePapers.map(p => p.paper_id));
  }

  await neo4j.markDeckActive(deck.id);
  pusher.trigger("global", "deck.regenerated", { deckId: deck.id });
}
```

**Prompt outline (`src/lib/llm/prompts.ts`):**
```
SYSTEM: You are a research-direction generator. Given a cluster of papers, propose
3 distinct novel research directions. Each direction must be grounded in 3 anchor
papers from the provided list. Respond strictly in JSON matching the supplied schema.

USER: Cluster summary: {{summary}}
Cluster description: {{description}}
Sub-topics: {{subTopics}}
Sampled papers (titles + abstracts): {{30 papers}}

Schema:
[
  { "cardLetter": "A",
    "title": "...",
    "researchQuestion": "...",
    "rationale": "<= 2 sentences",
    "anchorPaperIds": ["paper_id_1", "paper_id_2", "paper_id_3"] },
  ...
]
```

**Structured outputs** are enforced via OpenAI's `response_format: { type: "json_schema", strict: true }`. Schema generated from a `zod` definition in `src/lib/llm/schema.ts`.

### 5.3 Swipe deck

Components ported nearly verbatim from `research-galaxy-next demo`:
- `SwipeableCard.tsx` (gesture wrapper, content-agnostic) — port directly, no changes.
- The `MatchCard.tsx` is replaced by a new `ProposalCard.tsx` rendering: title, research question, rationale, anchor papers as chips.

**New behavior:**
- 100px swipe threshold, retained.
- On right-swipe: optimistic POST `/api/deck/lock` `{ clusterId, proposalId }`, navigate to `/proposal/<id>`.
- On left-swipe: advance to next card in the same cluster's stack (B then C). If C also rejected, mark cluster as "no winner" (Neo4j: no `LOCKED_WINNER` rel) and advance.
- **History rewind**: header chevron `<` decrements `currentClusterIndex`, restoring the deck to the previous cluster; if a winner was previously locked, its card shows a "previously locked" banner with options "Keep" or "Re-pick". Re-picking overwrites the `LOCKED_WINNER` relationship.

### 5.4 Proposal page + branch list

Layout:
```
┌─────────────────────────────────────────────────────────┐
│ Proposal: "Title"                       [Add Comment]   │
│ Research question: ...                                  │
│ Rationale: ...                                          │
│ Anchor papers: [chip] [chip] [chip]                     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Branches (4)                                            │
│ ┌───────────────────────────────────────────────────┐   │
│ │ edward-h4f9 — 3 comments, edited 2h ago           │   │
│ ├───────────────────────────────────────────────────┤   │
│ │ alice-d2c1 — 1 comment, no edits                  │   │
│ ├───────────────────────────────────────────────────┤   │
│ │ bob-99af  — 7 comments, edited 4d ago [AI rev.]   │   │
│ └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

`Add Comment` on the proposal auto-creates a branch for the current user if none exists, then routes to the branch view.

### 5.5 Branch view

Layout:
```
┌─────────────────────────────────────────────────────────┐
│ Branch: edward-h4f9 (yours)        [Edit proposal] [⚙]  │
│ ┌── proposal text (markdown rendered) ────────────────┐ │
│ │ If edits exist, show side-by-side diff toggle       │ │
│ └─────────────────────────────────────────────────────┘ │
│ [Revise with AI]                                        │
├─────────────────────────────────────────────────────────┤
│ Comments (Slack-style)                                  │
│ • Edward: "Have you considered ..." 👍3 💡1   [reply]   │
│ • Alice:  "Anchor paper 2 is misaligned"      [reply]   │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘

Side panel (opens when a top-level comment's [reply] is clicked):
┌─── Thread: "Have you considered..." ────────────────────┐
│ Edward: original                                        │
│ Bob: "+1, also see ..."                                 │
│ Edward: "Good point"                                    │
│ [Reply box]                                             │
└─────────────────────────────────────────────────────────┘
```

### 5.6 Branch edit flow

`ProposalEditor.tsx` opens in a full-width modal:
- Left: current proposal markdown (read-only).
- Right: editable textarea with markdown highlighting (`@uiw/react-md-editor` or hand-rolled with `react-markdown` preview).
- On submit: POST `/api/branches/<id>/edit` with the new markdown. Server creates a `BranchEdit` node with `source: 'human'`, links via `:HAS_EDIT`, sets `accepted: true`, updates `Branch.lastActivityAt`.
- On display: most-recent accepted edit is the "active" version; original proposal markdown remains accessible via toggle.

### 5.7 AI revise flow

Manual "Revise with AI" button on the branch view. Click:
1. POST `/api/ai/revise` `{ branchId }`.
2. Server collects: parent proposal markdown + all comments (top-level + replies) + current branch edit.
3. Calls GPT-5.5 with a Revise prompt asking for an updated proposal markdown plus a one-line changelog.
4. Returns a `BranchEdit` node with `source: 'ai-suggested', accepted: false`.
5. UI shows a side-by-side diff modal "Apply AI suggestion?" — Accept = sets `accepted: true`. Reject = leaves the suggestion stored but inactive.

**AI prompt outline:**
```
SYSTEM: You revise research proposals. Read the canonical proposal, the latest
human edits if any, and the discussion. Produce a revised proposal in markdown
plus a one-line summary of what changed.
USER: Canonical: {{markdown}}
Latest human edits: {{edited_markdown or "none"}}
Comments: {{all comments concatenated with timestamps + authors}}
Output:
{ "revisedMarkdown": "...", "changelog": "..." }
```

### 5.8 Reactions

Six kinds: `thumbs_up`, `thumbs_down`, `target`, `bulb`, `warning`, `question`. Stored as `(:User)-[:REACTED {kind}]->(:Comment | :Branch)`. UI: row of emoji chips with counts; click toggles user's own reaction.

### 5.9 Real-time

Pusher channels:
- `global` — `deck.regenerated` (forces clients to refetch deck).
- `proposal-<id>` — `branch.created`, `branch.updated`.
- `branch-<id>` — `comment.created`, `comment.replied`, `reaction.added`, `branch-edit.created`.

Client subscribes lazily on the proposal/branch page mount; unsubscribes on unmount. TanStack Query receives events and patches caches in place to avoid full refetches.

In-app notifications: each authenticated user has an Activity log derived from queries (no separate `:Notification` node). Pusher toast fires for events on branches the user has commented in.

### 5.10 Onboarding

`OnboardingTour.tsx` is a 3-step modal using shadcn `Dialog` plus Framer Motion transitions. Steps as listed in §2.1. Persists `User.onboardingCompleted = true` on completion or skip.

---

## 6. API Surface

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/api/deck` | Returns active deck + 10 clusters + their 3 proposals each + user's existing locks |
| POST   | `/api/deck/lock` | `{ clusterId, proposalId }` upserts `LOCKED_WINNER` |
| GET    | `/api/proposals/[id]` | Returns proposal + branches summary |
| GET    | `/api/branches/[id]` | Returns branch + edits + comments + reactions |
| POST   | `/api/branches` | Create branch for current user on proposal (idempotent: returns existing if any) |
| POST   | `/api/branches/[id]/edit` | Owner-only: append a `BranchEdit` |
| POST   | `/api/comments` | `{ branchId, parentCommentId?, body }` |
| POST   | `/api/reactions` | `{ targetType: 'comment'|'branch', targetId, kind }` toggles |
| POST   | `/api/ai/revise` | `{ branchId }` triggers AI suggestion |
| POST   | `/api/admin/regenerate` | Admin-only: regenerate active deck |
| GET    | `/api/me` | Current user (auth check helper) |

All mutating endpoints validate session via NextAuth and ownership where relevant (e.g., only branch owner can hit `/edit`).

---

## 7. Auth & Permissions

- NextAuth Google provider, JWT session strategy.
- On first login, server creates `(:User)` node keyed by `googleId`.
- Admin = email in `ADMIN_EMAILS` env var (comma-separated).
- Authorization rules (enforced server-side):
  - Lock winner: any authenticated user, scoped to own `LOCKED_WINNER` rel.
  - Edit branch text: branch owner only.
  - Comment / reply / react: any authenticated user.
  - Trigger AI revise: any authenticated user (cost concern mitigated via rate limit, see §10).
  - Regenerate deck: admin only.

---

## 8. Onboarding & Empty States

- New user, no Active Deck: `/deck` shows "An admin hasn't published a deck yet" with a friendly graphic.
- New user, Active Deck exists: onboarding tour fires, then deck loads.
- Returning user mid-deck: deck restores `currentClusterIndex` from last `LOCKED_WINNER` count (latest unlocked cluster).
- Proposal with zero branches: shows a "Be the first to comment" CTA.

---

## 9. Verification & Testing

### 9.1 Type checking + linting + formatting
- `pnpm typecheck` → `tsc --noEmit` over the whole repo (strict mode + `noUncheckedIndexedAccess`).
- `pnpm check` → `biome check src/` (lint + format combined).
- `pnpm format` → `biome format --write src/`.
- Pre-commit (`lefthook`) runs `tsc --noEmit` on staged TS files + `biome check` + `vitest --run --changed`.
- CI (Render build hook) runs all three plus `pnpm test:e2e` against a staging Neo4j.

### 9.2 Unit tests (Vitest)
- `sampler.test.ts`: deterministic sampling under seed, uniform distribution sanity.
- `prompts.test.ts`: prompt builder produces expected token shape on synthetic inputs.
- `auth.test.ts`: middleware correctly rejects unauthenticated requests.

### 9.3 E2E (Playwright)
- `swipe-deck.spec.ts`: log in (mocked Google), swipe through one cluster, lock A, land on proposal page.
- `branch-flow.spec.ts`: comment on a proposal as user A, sign in as user B, see A's branch and reply.
- `ai-revise.spec.ts`: with OpenAI mocked, click revise, accept suggestion, confirm new edit appears.

### 9.4 a11y
- `@axe-core/playwright` runs on every E2E flow's key screens.
- Manual keyboard pass: Tab through deck (Right/Left arrow keys for swipe alternative).

### 9.5 Manual browser pass
- `pnpm dev` + `chrome-devtools` skill scripts: `navigate.js --url http://localhost:3000` + screenshots of deck, proposal, branch, edit modal, AI suggestion modal.

### 9.6 Local Neo4j sanity
- `docker compose up neo4j` then visit `http://localhost:7474`, run sample Cypher queries from `scripts/seed-neo4j.ts`.

---

## 10. Cross-cutting Concerns

### 10.1 Rate limiting
- Per-user comment rate: 30 per minute (in-memory token bucket, since single-region).
- AI revise per-user: 10 per hour (Neo4j-backed counter).
- Admin regenerate: at most 1 in flight (advisory lock via Neo4j `Deck.status='generating'`).

### 10.2 Dark mode + a11y
- shadcn theme tokens; root toggle persisted in `localStorage`, hydrated from `User.preferences.theme` server-side.
- Keyboard equivalents for swipe (Right/Left arrows, U for undo/rewind).
- Focus rings respected (no `outline: none`); WCAG 2.1 AA color contrast on all chrome.

### 10.3 Telemetry
- Minimal: PostHog or Plausible self-host (optional, not in v1 build budget).
- Server logs to console (Render captures).

### 10.4 Secrets / env vars

All env vars are validated at build time via `src/env.ts` using `@t3-oss/env-nextjs` + Zod. A missing or malformed var fails the build, so dev never sees runtime undefined-env crashes.

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEO4J_URI=neo4j+s://...auradb.io
NEO4J_USER=
NEO4J_PASSWORD=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=
ADMIN_EMAILS=2910479857h@gmail.com
CARDS_PER_CLUSTER=3
```

Sample shape of `src/env.ts`:

```ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    NEXTAUTH_SECRET: z.string().min(32),
    NEO4J_URI: z.string().url(),
    NEO4J_USER: z.string().min(1),
    NEO4J_PASSWORD: z.string().min(1),
    OPENAI_API_KEY: z.string().startsWith("sk-"),
    OPENAI_MODEL: z.string().default("gpt-5.5"),
    PUSHER_APP_ID: z.string(),
    PUSHER_KEY: z.string(),
    PUSHER_SECRET: z.string(),
    PUSHER_CLUSTER: z.string(),
    ADMIN_EMAILS: z.string().transform((s) => s.split(",")),
    CARDS_PER_CLUSTER: z.coerce.number().int().min(1).max(5).default(3),
  },
  client: {
    NEXT_PUBLIC_PUSHER_KEY: z.string(),
    NEXT_PUBLIC_PUSHER_CLUSTER: z.string(),
  },
  runtimeEnv: process.env,
});
```

---

## 11. Risks & Open Questions

| Risk | Mitigation |
|------|------------|
| GPT-5.5 rate limits during admin regen (30 calls in burst) | Sequential calls with retry+backoff; admin sees a progress UI |
| Pusher Sandbox limits (200K msgs/day) | Within budget for v1; escalate plan if needed |
| Neo4j AuraDB Pro free trial expiry mid-demo | Plan billing in advance |
| Branch ownership inferred wrong if user deletes their account | v1 ignores: account deletion not supported |
| LLM output non-determinism breaks JSON schema | Strict structured outputs + zod validation + 1 retry |
| Pre-generated decks become stale if cluster JSON updates | Re-run sanitize + admin regen |
| "No winner picked" clusters are still in deck | Render in deck history but no proposal page |

### Open questions for follow-up review

1. Should the deck rotation be schedulable in a v1.1 (CRON) or remain strictly manual?
2. Should branch *edits* (not just comments) trigger Pusher events to non-owners? (Spec assumes yes.)
3. Once a user re-picks a different winner via rewind, do we keep their previously authored branches alive on the discarded card? (Spec says yes; branches stay linked to the proposal regardless of `LOCKED_WINNER` state.)

---

## 12. Phased Implementation Order (suggested)

A natural sequence to maximize feedback and minimize rework. Each phase is a vertical slice with at least one runnable demo target.

1. **Project scaffold + Neo4j wiring** — empty Next.js app, Neo4j driver, env, dev compose, NextAuth Google login.
2. **Catalog vendoring** — sanitize JSONs, copy into `public/catalog/`, write loader + samplers, unit tests.
3. **Admin regenerate (offline-mock LLM)** — wire deck creation + cluster + proposal nodes, mock LLM with fixtures.
4. **Real LLM integration** — swap in OpenAI client + structured outputs + prompts.
5. **Swipe deck UI** — port SwipeableCard, build ProposalCard, lock winner endpoint.
6. **Proposal page + branch list** — read-only branch list, "Add Comment" creates branch.
7. **Branch view + comments** — Slack-style comment tree + thread side panel + reactions.
8. **Branch edit + diff** — markdown editor, side-by-side diff, owner-only enforcement.
9. **AI revise** — Revise button + suggestion modal + accept flow.
10. **Pusher real-time + toasts + activity** — client subscriptions + cache patching.
11. **Onboarding tour** — 3-step modal, persistence.
12. **Polish** — dark mode toggle, keyboard shortcuts, a11y audit, Playwright E2E.

---

## 13. Deferred to v2+

- Branch merge (proposal-owner accept, AI synthesis, voting threshold).
- User profile pages.
- Mobile-optimized swipe.
- Email digests.
- Cross-deck recommendation.
- Public read-only API.
- "Lab" or "team" grouping for branches.

---

## 14. Implementation kickoff

After approval, the implementation phase will:

1. `cd /Users/edwardhu/Desktop/ResearchGit/`
2. Scaffold the Next.js + TypeScript project with the §3.3 layout.
3. Vendor and sanitize the cluster catalog from ResearchGalaxy (§5.1).
4. Build phase by phase per §12.

No git commits or pushes will be performed (per global rule). Implementation work happens locally only.
