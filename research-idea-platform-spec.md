# Research Idea Collaboration Platform — UI/UX Specification

| Field | Value |
|---|---|
| Document version | 0.1 (Draft) |
| Status | For implementation |
| Owner | Edward Hu |
| Last updated | May 3, 2026 |
| Scope | End-to-end UX from login → locked execution. Out of scope: production auth, publication ingestion pipeline, AI model selection, billing. |

---

## 1. Product Overview

A research idea co-creation platform for academic researchers. A user logs in, surfaces their publication history, and uses AI to generate concrete research ideas grounded in their prior work. Ideas can be drafted privately, published to a shared "Idea Marketplace" where peers leave comments, iterated by the initiator using AI to absorb selected feedback, and finally **locked** when the idea is ready to move into execution. At lock time, the system produces a contributor analysis summarizing who contributed what.

### 1.1 Design Principles

1. **Grounded generation, not free hallucination.** Every AI-generated idea must cite the user's own publications (or an explicit "drawing from broader experience" tag).
2. **Narrow over broad.** The system biases toward 2–3 *specific, executable* ideas, never a 10-item brainstorm dump.
3. **Initiator authority.** Only the initiator decides which comments to absorb. Contributors suggest; they do not edit.
4. **Lock = commitment.** Locking is irreversible and signals "this is moving to execution." The UI should make this clear.
5. **Attribution is first-class.** Contributor effort is tracked and surfaced at lock time so credit is preserved.

---

## 2. User Roles & States

### 2.1 Roles
There is a single role: **Researcher**. The role splits into states relative to a given idea:

| State | Definition | Permissions on that idea |
|---|---|---|
| **Initiator** | Created the idea | Edit, iterate with AI, accept/dismiss comments, lock |
| **Contributor** | Has left ≥1 comment | Comment, edit/delete own comments |
| **Viewer** | Has seen but not commented | Read, upvote |

### 2.2 Idea Lifecycle States

```
[Draft] ──publish──▶ [Open] ──lock──▶ [Locked]
   │                    │
   │                    └──(initiator can iterate at any time)
   │
   └──(only visible to initiator)
```

| State | Visibility | Editable by initiator | Comments accepted |
|---|---|---|---|
| Draft | Initiator only | Yes | N/A |
| Open | All users (Marketplace) | Yes (manual or AI-assisted) | Yes |
| Locked | All users (Marketplace, marked LOCKED) | No | No (read-only thread preserved) |

---

## 3. End-to-End User Flow

```
  ┌─────────┐     ┌──────────┐     ┌────────────────┐     ┌────────────┐
  │  Login  │────▶│ Dashboard│────▶│ Idea Generation│────▶│ Draft Edit │
  └─────────┘     │ (Profile)│     │  (2–3 ideas)   │     │  + AI      │
                  └──────────┘     └────────────────┘     └─────┬──────┘
                       ▲                                        │
                       │                                  ┌─────▼──────┐
                       │                                  │  Publish   │
                       │                                  └─────┬──────┘
                       │                                        │
                  ┌────┴──────┐    ┌──────────────┐    ┌────────▼──────┐
                  │ My Ideas  │◀───│ Idea Detail  │◀───│  Marketplace  │
                  │ (mgmt)    │    │ (initiator   │    │  (browse all) │
                  └────┬──────┘    │  view + AI   │    └───────────────┘
                       │           │  iterate)    │
                       │           └──────┬───────┘
                       │                  │
                       │           ┌──────▼───────┐
                       └──────────▶│ Lock & Exec  │
                                   │  Report      │
                                   └──────────────┘
```

---

## 4. Screen Specifications

### 4.1 Login Screen

**Purpose.** Identify the user and load their researcher profile.

**Layout.**
- Centered card, max-width 420px, on neutral background.
- Logo/wordmark top-center.
- Single text input: "Enter your name."
- Primary button: "Continue."
- Helper text below input: "We'll fetch your publication profile."

**Components.**
| Element | Type | Behavior |
|---|---|---|
| Name input | Text field | Autofocus on load; min 2 chars; trims whitespace |
| Continue button | Primary CTA | Disabled until input is non-empty; triggers profile lookup |
| Profile not found state | Inline error | "We couldn't find a profile for that name. [Try again] or [Create new profile]." |

**States.**
- **Empty (default):** input focused, button disabled.
- **Loading (post-submit):** button shows spinner, input locked.
- **Match found:** transition to Dashboard.
- **No match:** show inline error with retry / create-new path.
- **Multiple matches:** disambiguation modal listing candidates with affiliation + last publication year; user clicks one.

**Notes.**
- Production auth (OAuth via institutional login or ORCID) is out of scope but should replace this screen 1:1; do not bake the name-only assumption deep into the architecture.

---

### 4.2 Dashboard / Profile Screen

**Purpose.** Show the user their identity, their publication history, and a clear entry point to idea generation. Also surface their existing ideas.

**Layout.** Three-region single-page layout:

```
┌───────────────────────────────────────────────────────────────┐
│  Header: name, affiliation, avatar               [logout ▾]   │
├──────────────────────────┬────────────────────────────────────┤
│                          │                                    │
│  Left: Publications      │  Right: Generate / My Ideas        │
│  (scrollable list)       │                                    │
│                          │                                    │
│  ☐ Paper 1               │  ┌──────────────────────────────┐  │
│  ☐ Paper 2               │  │ Generate Research Ideas      │  │
│  ☐ Paper 3               │  │ ────────────────────────     │  │
│  ☐ ...                   │  │ Mode: ○ From selected        │  │
│                          │  │       ○ From all experience  │  │
│                          │  │                              │  │
│                          │  │ [Generate]                   │  │
│                          │  └──────────────────────────────┘  │
│                          │                                    │
│                          │  My Ideas                          │
│                          │  • Idea A — Open  (3 comments)     │
│                          │  • Idea B — Locked                 │
│                          │  • Idea C — Draft                  │
│                          │                                    │
└──────────────────────────┴────────────────────────────────────┘
```

**Header.**
| Element | Detail |
|---|---|
| Name | Pulled from profile |
| Affiliation | Pulled from profile (e.g., "UIUC") |
| Publication count | Small pill: "47 publications" |
| Logout | Dropdown menu |

**Publications list (left pane).**
- Each row is a publication card containing:
  - Checkbox (left, for multi-select)
  - Title (bold)
  - Authors (truncated, current user highlighted)
  - Venue, year
  - Abstract preview (2 lines, expandable on hover/click)
  - Tag chips for area (e.g., "NLP", "Multi-agent")
- Sort options: Recent (default), Most cited, Alphabetical.
- Search box at top of list: filters by title/author/keyword.
- Selection counter: "3 papers selected" sticky at bottom of pane when ≥1 selected.

**Generate panel (right pane, top).**
- **Mode toggle (radio):**
  - **From selected papers** — only enabled when ≥1 paper is checked. Shows count: "Generate ideas based on 3 selected papers."
  - **From all experience** — always enabled. Helper text: "AI will draw from your full publication history."
- **Generate button:** primary CTA, disabled if mode is "From selected" but no papers checked.
- On click → navigate to Idea Generation screen (Section 4.3) with mode + selection IDs in route state.

**My Ideas list (right pane, bottom).**
- Each row:
  - Title
  - Status badge: `Draft` (gray), `Open` (blue), `Locked` (purple/dark)
  - Last activity timestamp
  - For Open ideas: comment count, contributor count
- Click → routes to:
  - Draft → Draft Editor (4.4)
  - Open → Idea Detail / Initiator View (4.7)
  - Locked → Locked Idea View (4.8)

**Empty states.**
- No publications: "No publications found in your profile. [Import from ORCID]" (button stub for future).
- No ideas: "You haven't generated any ideas yet. Pick papers or use 'From all experience' to start."

---

### 4.3 Idea Generation Screen

**Purpose.** Show 2–3 AI-generated research ideas; let the user pick one to develop further.

**Layout.**

```
┌────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                                       │
│                                                            │
│  Generating ideas based on: 3 selected papers              │
│  [paper chips, removable]                                  │
│                                                            │
│  ╔═══════════════╗  ╔═══════════════╗  ╔═══════════════╗   │
│  ║   Idea 1      ║  ║   Idea 2      ║  ║   Idea 3      ║   │
│  ║               ║  ║               ║  ║               ║   │
│  ║ Title         ║  ║ Title         ║  ║ Title         ║   │
│  ║ Hypothesis    ║  ║ Hypothesis    ║  ║ Hypothesis    ║   │
│  ║ Method sketch ║  ║ Method sketch ║  ║ Method sketch ║   │
│  ║ Novelty       ║  ║ Novelty       ║  ║ Novelty       ║   │
│  ║ Cited papers  ║  ║ Cited papers  ║  ║ Cited papers  ║   │
│  ║               ║  ║               ║  ║               ║   │
│  ║ [Develop →]   ║  ║ [Develop →]   ║  ║ [Develop →]   ║   │
│  ╚═══════════════╝  ╚═══════════════╝  ╚═══════════════╝   │
│                                                            │
│  [↻ Regenerate]   [← Change inputs]                        │
└────────────────────────────────────────────────────────────┘
```

**Idea card contents (each card).**

| Field | Format | Constraint |
|---|---|---|
| Title | Single line, bold | ≤ 120 chars |
| One-line hypothesis | Italic | ≤ 200 chars |
| Methodology sketch | 2–4 sentences | Concrete, names techniques |
| Novelty / contribution | 2–3 bullets | Must contrast with existing work |
| Grounding citations | List of user's papers used | Min 1 if "From selected"; min 1 if "From all experience" |
| Develop button | Primary CTA | Routes to Draft Editor with idea pre-filled |

**Constraints on idea generation.**
- **Hard limit: 2–3 ideas.** Never 4+. If model returns more, truncate to 3 with the highest grounding strength.
- **Specificity bias.** Ideas must propose concrete methods, datasets, or experiments — not survey topics. The generation prompt must enforce this.
- **Diversity.** The 2–3 ideas should differ meaningfully (different method, different application, or different theoretical angle). The UI shows a "diversity score" pill on each card optionally — out of scope for v1, flagged for v2.

**States.**
- **Generating:** skeleton cards with shimmer animation; "Reasoning over your work…" message; cancel button visible.
- **Generated:** cards rendered as above.
- **Generation error:** inline error with retry button; preserve input selection.

**Interactions.**
- Hover on a cited paper chip → tooltip with full citation.
- Click "Regenerate" → re-runs generation with same inputs (confirm modal: "This will replace the current ideas").
- Click "Change inputs" → returns to Dashboard preserving selection.

---

### 4.4 Draft Editor

**Purpose.** Let the user refine a single idea — manually and with AI assistance — before publishing.

**Layout.** Two-pane split, 60/40:

```
┌───────────────────────────────────┬──────────────────────────┐
│  Idea Draft (editable)            │  AI Assistant            │
│                                   │                          │
│  Title:                           │  Quick actions:          │
│  [____________________]           │  [Sharpen the title]     │
│                                   │  [Strengthen method]     │
│  Hypothesis:                      │  [Add related work]      │
│  [____________________]           │  [Tighten novelty claim] │
│                                   │                          │
│  Methodology:                     │  ──────────────          │
│  [____________________]           │                          │
│                                   │  Custom prompt:          │
│  Novelty:                         │  [____________]          │
│  [____________________]           │  [Apply]                 │
│                                   │                          │
│  Grounding citations:             │  ──────────────          │
│  [+] Add paper                    │  Suggested edits:        │
│                                   │  (diff view, accept/     │
│  ─────────────────────            │   reject per chunk)      │
│                                   │                          │
│  [Save draft]  [Publish to        │                          │
│                 Marketplace]      │                          │
└───────────────────────────────────┴──────────────────────────┘
```

**Left pane — Draft.**
- All fields from the generated idea card are editable.
- Field types:
  - Title: single-line input
  - Hypothesis: multi-line textarea (3 rows)
  - Methodology: rich text (basic formatting only — bold, italic, lists)
  - Novelty: bullet list editor (each bullet is its own row, drag-to-reorder)
  - Grounding citations: chips list with `[+]` to add; remove via `×`
- Word counts shown subtly under each section.
- Auto-save every 10 seconds; "Saved 3s ago" indicator.

**Right pane — AI Assistant.**
- **Quick action buttons** apply a pre-defined prompt to the current draft.
- **Custom prompt** text area for user-defined refinement (e.g., "Make this more aligned with NeurIPS submission format").
- **Suggested edits panel** appears after any AI action:
  - Shows a **diff view** (additions green, deletions red strikethrough).
  - Per-chunk **Accept** / **Reject** buttons.
  - Global **Accept all** / **Reject all** at top.
- Edit history accessible via "View versions" link → modal with timeline of versions, each with timestamp + summary of change + restore button.

**Bottom action bar.**
| Button | Behavior |
|---|---|
| Save draft | Writes current state; idea remains in `Draft` status; routes to Dashboard. |
| Publish to Marketplace | Validation modal (see below); on confirm, status → `Open` and routes to Idea Detail. |
| Discard | Confirm modal; deletes the draft. |

**Publish validation modal.**
- Checks:
  - Title present and ≤120 chars
  - Hypothesis present
  - At least 1 grounding citation
  - Methodology section ≥50 chars
- If failures: lists each issue with a "Fix" link that scrolls to that field.
- If pass: confirmation copy: "Once published, all platform users will see this idea and can comment. You can keep editing until you lock the idea. Publish?"

---

### 4.5 Idea Marketplace (Browse)

**Purpose.** Discovery surface for all published ideas across all users.

**Layout.**

```
┌─────────────────────────────────────────────────────────────┐
│  Idea Marketplace                                           │
│                                                             │
│  [Search________]  Sort: [Recent ▾]  Filter: [All areas ▾]  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [Open]  Title of the idea                            │   │
│  │         by Jane Doe (Stanford) · 2 days ago          │   │
│  │         One-line hypothesis preview...               │   │
│  │         💬 7 comments · 👥 4 contributors · ⬆ 12     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [Locked]  Title of another idea                      │   │
│  │           by John Smith (MIT) · last week            │   │
│  │           One-line hypothesis preview...             │   │
│  │           💬 23 comments · 👥 9 contributors · ⬆ 41  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  [Load more]                                                │
└─────────────────────────────────────────────────────────────┘
```

**Card contents.**
| Element | Format |
|---|---|
| Status badge | `Open` (blue) or `Locked` (dark) |
| Title | Bold, clickable |
| Author | Name + affiliation, clickable to that user's public profile (out of scope for v1 — flag) |
| Timestamp | Relative time |
| Hypothesis preview | 2 lines truncated |
| Comment count | Icon + number |
| Contributor count | Icon + number |
| Upvote count | Icon + number; clickable to upvote/unvote (toggles) |

**Filters.**
- **Sort:** Recent, Most discussed, Most upvoted, Most recently updated.
- **Filter:** All / Open only / Locked only / Your ideas / Ideas you've commented on.
- **Area filter:** Multi-select chips by research area (NLP, CV, Systems, etc.) — drawn from author publication tags.

**Empty state.** "No ideas match. Be the first to publish."

**Click idea card** → Idea Detail (Section 4.6 if not your idea, 4.7 if yours).

---

### 4.6 Idea Detail — Public View (Contributor / Viewer)

**Purpose.** Read someone else's idea and contribute via comment.

**Layout.**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Marketplace                                              │
│                                                             │
│  [Open]  Title of the idea                  ⬆ Upvote (12)   │
│  by Jane Doe (Stanford) · 2 days ago                        │
│                                                             │
│  Hypothesis                                                 │
│  ──────────                                                 │
│  ...                                                        │
│                                                             │
│  Methodology                                                │
│  ──────────                                                 │
│  ...                                                        │
│                                                             │
│  Novelty                                                    │
│  ──────────                                                 │
│  ...                                                        │
│                                                             │
│  Grounded in                                                │
│  ──────────                                                 │
│  • Paper 1 (link)                                           │
│  • Paper 2 (link)                                           │
│                                                             │
│  ═══════════════════════════════════════════════════════    │
│  Discussion (7)                                             │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Add a comment or suggestion...                        │  │
│  │ Type: ○ General comment ○ Method critique             │  │
│  │       ○ Related work ○ Experiment idea                │  │
│  │ [Submit]                                              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  • [User A] · 1d ago · Method critique                      │
│    "Have you considered..."                                 │
│    ↳ [User B] · 5h ago: "Agree, and..."                     │
│    [Reply]                                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Idea body.** Read-only render of all fields the initiator filled.

**Comment composer.**
- Textarea (markdown supported, basic only).
- **Comment type radio:** General / Method critique / Related work / Experiment idea / Concern.
- This typing helps the initiator triage during iteration (Section 4.7).
- Max 2,000 chars.
- Submit creates a new top-level comment.

**Comment thread.**
- Single level of replies (threading depth = 1; reply to a reply attaches to the parent).
- Each comment shows: author, timestamp, type chip, body, reply button, edit/delete (own only).
- No public "helpful" mark — that's initiator-only (visible only on initiator view).
- Sort: Oldest first (default), Newest first.

**Locked-state variant.**
- All comments preserved.
- Composer replaced with banner: "This idea is locked for execution. Comments are read-only."

---

### 4.7 Idea Detail — Initiator View

**Purpose.** Same as 4.6, plus comment triage and AI-assisted iteration.

**Layout.** Same as 4.6 with an additional **Owner Toolbar** sticky at the top right and per-comment owner controls.

**Owner Toolbar.**

```
┌──────────────────────────────────────┐
│  Owner controls                      │
│  ────────────                        │
│  [Edit idea]                         │
│  [Iterate with AI]   ← (highlighted) │
│  [Lock for execution]                │
│  ──────────                          │
│  Selected for iteration: 0 comments  │
└──────────────────────────────────────┘
```

**Per-comment owner controls** (visible only to initiator):
- **★ Mark helpful** — toggles a star on the comment (private; not shown to others).
- **☑ Use in iteration** — checkbox; adds the comment to the iteration batch.
- Helpful and Use-in-iteration are independent (a comment can be one, both, or neither).

**Iterate with AI flow.**

1. Initiator selects N comments (Use in iteration = checked).
2. Click **Iterate with AI** → modal:

```
┌─────────────────────────────────────────────────────┐
│  Iterate idea using 5 selected comments             │
│  ─────────────────────────────────────              │
│                                                     │
│  Selected comments:                                 │
│  • [Method critique] User A: "Have you..."          │
│  • [Related work] User C: "See also..."             │
│  • ...                                              │
│                                                     │
│  Iteration goal (optional):                         │
│  [_____________________________________]            │
│                                                     │
│  [Cancel]   [Run iteration]                         │
└─────────────────────────────────────────────────────┘
```

3. AI produces a **proposed v2** of the idea, shown in diff view (4.4 mechanism):
   - Per-section accept/reject.
   - "Apply all" / "Reject all".
   - Each accepted change is recorded along with which comment(s) drove it (attribution map — used at lock time).

4. After accept, idea is updated; a **version entry** is appended (visible via "View versions" link).

5. Comments used are tagged with a small "Absorbed in v2" badge (visible to all, including the contributor — this is the contributor's signal that their input was integrated).

**Edit idea (manual).**
- Routes back to the Draft Editor (4.4) but with the idea in Open state.
- Saving from there continues to update the live Open idea.

---

### 4.8 Lock for Execution

**Purpose.** Freeze the idea, end the contribution phase, and produce a contributor analysis report.

**Lock confirmation modal.**

```
┌─────────────────────────────────────────────────────────┐
│  Lock this idea for execution?                          │
│  ─────────────────────────────                          │
│                                                         │
│  Locking is irreversible. Once locked:                  │
│  • No new comments will be accepted.                    │
│  • The idea content cannot be edited.                   │
│  • Existing comments and version history are preserved. │
│  • A contributor analysis report will be generated.     │
│                                                         │
│  Type LOCK to confirm: [_______]                        │
│                                                         │
│  [Cancel]   [Lock idea]                                 │
└─────────────────────────────────────────────────────────┘
```

- Require typed "LOCK" string to prevent accidental clicks.

**Post-lock view (Contributor Analysis Report).**

Replaces the Owner Toolbar with a single **Contributor Analysis Report** panel.

```
┌─────────────────────────────────────────────────────────┐
│  Contributor Analysis Report                            │
│  ──────────────────────────                             │
│                                                         │
│  Locked: May 3, 2026  ·  9 contributors  ·  23 comments │
│                                                         │
│  By absorption                                          │
│  ─────────                                              │
│  • User A — 4 comments absorbed (method, novelty)       │
│  • User C — 2 comments absorbed (related work)          │
│  • User F — 1 comment absorbed (experiment design)      │
│                                                         │
│  By volume                                              │
│  ─────────                                              │
│  • User A — 6 comments                                  │
│  • User B — 5 comments                                  │
│  • ...                                                  │
│                                                         │
│  By type                                                │
│  ─────────                                              │
│  • Method critique: 9                                   │
│  • Related work: 6                                      │
│  • Experiment idea: 5                                   │
│  • General: 3                                           │
│                                                         │
│  Suggested acknowledgments                              │
│  ─────────                                              │
│  AI-generated paragraph naming top contributors and     │
│  the nature of their contributions, ready to copy.      │
│                                                         │
│  [Copy acknowledgments]   [Export report (PDF)]         │
└─────────────────────────────────────────────────────────┘
```

**Report fields.**

| Section | Source | Purpose |
|---|---|---|
| Header summary | DB aggregates | Top-level stats |
| By absorption | Iteration attribution map (4.7) | Who shaped the locked idea |
| By volume | Comment count per user | Who engaged most |
| By type | Comment type field | What kind of feedback the idea attracted |
| Suggested acknowledgments | LLM over the above + user roles | Drop-in text for paper acknowledgments |

**Locked-idea visual.**
- `Locked` badge replaces `Open` everywhere.
- Idea body and comment thread render read-only.
- A muted banner at the top: "This idea is locked. Moving to execution."

---

## 5. Component Library

### 5.1 Buttons
| Variant | Use |
|---|---|
| Primary | Main CTA on a screen (Generate, Publish, Lock) |
| Secondary | Adjacent actions (Save draft, Cancel) |
| Tertiary / link | Inline navigational text |
| Destructive | Discard, Delete (red) |
| Icon-only | Upvote, copy, etc. (with tooltip) |

### 5.2 Idea Card
Used on Generation (4.3), Marketplace (4.5), and Dashboard (4.2 — compressed variant). Three sizes:
- **Generation card:** full content, "Develop" CTA.
- **Marketplace card:** preview content, click-through.
- **Dashboard row:** compact, status + comment count only.

### 5.3 Diff View
Used in Draft Editor AI suggestions (4.4) and Iterate with AI (4.7).
- Additions: green background, no strikethrough.
- Deletions: red background with strikethrough.
- Per-chunk Accept/Reject inline.
- Global Accept All / Reject All header.

### 5.4 Comment
- Author avatar + name + affiliation.
- Type chip (color-coded by type).
- Body (markdown rendered).
- Footer: timestamp, reply, edit/delete (own), star/iterate-checkbox (initiator only).

### 5.5 Status Badges
| Status | Color |
|---|---|
| Draft | Neutral gray |
| Open | Blue |
| Locked | Dark purple |

---

## 6. Data Contracts (UI-relevant)

The UI consumes these shapes. Backend may store more.

### 6.1 User Profile
```json
{
  "user_id": "string",
  "name": "string",
  "affiliation": "string",
  "avatar_url": "string | null",
  "publications": [Publication]
}
```

### 6.2 Publication
```json
{
  "publication_id": "string",
  "title": "string",
  "authors": ["string"],
  "venue": "string",
  "year": "number",
  "abstract": "string",
  "tags": ["string"],
  "url": "string | null"
}
```

### 6.3 Idea
```json
{
  "idea_id": "string",
  "initiator_user_id": "string",
  "status": "draft | open | locked",
  "title": "string",
  "hypothesis": "string",
  "methodology": "string (markdown)",
  "novelty": ["string"],
  "grounding_publication_ids": ["string"],
  "created_at": "iso8601",
  "updated_at": "iso8601",
  "locked_at": "iso8601 | null",
  "versions": [IdeaVersion],
  "upvotes": "number"
}
```

### 6.4 IdeaVersion
```json
{
  "version_id": "string",
  "created_at": "iso8601",
  "trigger": "manual | ai_quick_action | ai_custom_prompt | ai_iteration",
  "absorbed_comment_ids": ["string"],
  "snapshot": Idea
}
```

### 6.5 Comment
```json
{
  "comment_id": "string",
  "idea_id": "string",
  "author_user_id": "string",
  "parent_comment_id": "string | null",
  "type": "general | method_critique | related_work | experiment_idea | concern",
  "body": "string (markdown)",
  "created_at": "iso8601",
  "edited_at": "iso8601 | null",
  "marked_helpful_by_initiator": "boolean",
  "absorbed_in_version_ids": ["string"]
}
```

### 6.6 Contributor Analysis Report
```json
{
  "idea_id": "string",
  "generated_at": "iso8601",
  "by_absorption": [{ "user_id": "string", "count": "number", "areas": ["string"] }],
  "by_volume": [{ "user_id": "string", "count": "number" }],
  "by_type": { "method_critique": "number", "related_work": "number", "...": "number" },
  "suggested_acknowledgments_text": "string"
}
```

---

## 7. Edge Cases & Error States

| Scenario | UI behavior |
|---|---|
| Profile lookup times out | Login screen shows retry banner, preserves input. |
| User has 0 publications | Dashboard publications pane shows empty state with import stub; "From all experience" mode is disabled with tooltip. |
| AI generation returns <2 ideas | Show what was returned; offer "Regenerate" prominently. |
| AI generation returns malformed JSON | Show generic failure with retry; log. |
| Publish validation fails | Inline errors on draft editor; do not navigate. |
| Network drop while editing draft | Auto-save queues; show "Reconnecting…" banner; flush on reconnect. |
| User deletes a comment that was already absorbed | Comment body replaced with "[deleted]" but absorption record preserved in version history. |
| User attempts to lock an idea with 0 comments | Modal warns: "No comments have been received. Lock anyway?" — still allowed. |
| Two users hit publish on same idea draft | Not possible — one initiator per idea. |
| Initiator account suspended after lock | Idea remains visible and locked; report still accessible. |

---

## 8. Accessibility

- All interactive elements keyboard-reachable; visible focus ring.
- Color is never the sole carrier of meaning (status badges include both color and text label).
- Diff view has ARIA labels: "added", "removed".
- Comment type chips include text, not only color.
- Contrast ratio ≥ 4.5:1 for body text.
- All icons paired with text or `aria-label`.

---

## 9. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| ≥ 1280px | Full layouts as specified. |
| 768–1279px | Two-pane screens (Dashboard, Draft Editor) become tabbed (Publications / Generate; Draft / AI). |
| < 768px | Single-column. Idea Generation displays cards stacked, scrollable. Owner toolbar collapses into a bottom sheet. |

Mobile is **not a priority for v1** — primary use is desktop research workflow — but layouts must not break.

---

## 10. Out of Scope for v1 (Tracked for v2+)

- Production authentication (OAuth, ORCID).
- Publication ingestion pipeline.
- Public user profiles.
- Notifications (email, in-app).
- Search across idea bodies (only title/author/area for v1).
- Real-time collaborative editing.
- Versioned comment editing history.
- Multi-language support.
- Mobile-optimized layouts (must work, not optimized).
- Diversity score on generated ideas.
- Cross-idea linking (e.g., "this idea builds on idea X").

---

## 11. Open Questions

1. **Comment absorption granularity.** Do we attribute at the comment level, or at the suggestion-within-a-comment level? v1 spec assumes comment level. Confirm before implementation.
2. **Iteration cooldown.** Should there be a rate limit on how often an initiator can iterate (e.g., to prevent thrash)? Not specified.
3. **Idea deletion.** Can an initiator delete an Open idea (with existing comments)? Spec currently does not allow deletion after publish — only lock. Confirm.
4. **Upvote semantics.** Does an upvote influence Marketplace ranking weight? Spec lists "Most upvoted" sort but does not define decay.
5. **Privacy of "Mark helpful".** Is the initiator's helpful mark truly private, or is it surfaced to the contributor as a soft signal? Spec assumes private. Confirm.

---

## 12. Implementation Notes (Stack Hints)

This spec is stack-agnostic, but assuming the existing ResearchGala stack:

- **Frontend:** Next.js 14+, App Router, Tailwind, shadcn/ui for primitives. Use React Server Components for the read-only marketplace and idea detail views; client components for editor and comment composer.
- **State:** TanStack Query for server state. Zustand or React context only for editor-local state (draft buffer, AI suggestion diffs).
- **Backend:** Flask endpoints maps directly to data contracts in §6. LangGraph orchestrates idea generation and iteration as separate graphs sharing a tool layer (paper retrieval, citation grounding).
- **Diff rendering:** `diff-match-patch` or `jsdiff` for inline diffs.
- **Auto-save:** debounced PATCH with optimistic update.

---

## 13. Acceptance Criteria (per screen)

| Screen | Criteria for "done" |
|---|---|
| Login | User enters name → reaches Dashboard for matched profile, sees disambiguation modal for ambiguous, sees error for no match. |
| Dashboard | Publications render with selection, both generation modes work, My Ideas list reflects DB truthfully. |
| Idea Generation | Returns 2–3 ideas grounded in input papers, "Develop" routes to Draft Editor with idea pre-filled. |
| Draft Editor | Manual edits persist via auto-save; AI quick actions produce diffs that can be accepted per chunk; Publish gated by validation. |
| Marketplace | All Open and Locked ideas listed; sort and filter work; click routes correctly to public or initiator view. |
| Idea Detail (public) | Read-only body; comment composer with type tagging; threaded replies (1 level). |
| Idea Detail (initiator) | Star + iteration-checkbox per comment; Iterate with AI produces a v2 with attribution; comments tagged "Absorbed". |
| Lock | Confirmation requires typed "LOCK"; post-lock state read-only; report panel renders with all four sections + acknowledgments text. |
