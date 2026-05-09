# Research Idea Collaboration Platform Legacy Notes

Status: superseded by `SPEC.md`
Last updated: 2026-05-07

This document is no longer an implementation specification. It is kept only as a historical pointer because the active V2 implementation has removed the older owner-toolbar, lock-report, contributor-analysis, and external recommendation-site assumptions.

## Active V2 Direction

ResearchGit V2 is scoped to CHI 2026 authors. Users sign in with Google, match an author record from `src/data/papers_by_room.json`, browse their authored papers, generate grounded ideas, join broader topic canvases, add sticky notes, comment on public work, and save AI-enhanced draft versions.

Private ideas use the same idea detail page as open ideas, with owner-only access. There is no separate private-report page or contributor report flow.

## Active References

- `SPEC.md` defines the product requirements.
- `README.md` defines setup, scripts, and architecture.
- `src/lib/recommendation/algorithm.md` defines the local topic recommendation engine.
- `archive/plans/abstract-pondering-starfish.md` lists current module pointers.
