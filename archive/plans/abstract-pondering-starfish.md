# ResearchGit V2 Implementation Notes

Status: superseded by `SPEC.md`
Last updated: 2026-05-07

This file is retained as a short historical pointer. The earlier exploratory plan was removed because it described obsolete external recommendation inspection, owner-toolbar controls, and locked-report flows that are no longer part of V2.

## Current Source Of Truth

- Product requirements live in `SPEC.md`.
- The CHI 2026 paper catalog is `src/data/papers_by_room.json` at the repository root.
- Catalog loading and author matching live in `src/lib/papers/catalog.ts`.
- Topic and paper recommendations live in `src/lib/recommendation/index.ts` and are documented in `src/lib/recommendation/algorithm.md`.
- Importable idea-store mutation validation lives in `src/lib/ideas/store-actions.ts`.
- Dashboard view sections live in `src/components/v2/dashboard/DashboardSections.tsx`.
- Draft modal workflows live in `src/components/v2/idea-draft/DraftModals.tsx`.

## Removed Legacy Assumptions

- No external recommendation-site dependency.
- No separate private-report route or contributor report.
- No owner-controls toolbar on the idea detail page.
- No ResearchGalaxy catalog dependency.
- No generated Playwright MCP snapshots committed to the repository.
