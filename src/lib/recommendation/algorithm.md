# Catalog Topic Recommendation Algorithm

Status: deterministic local topic engine active

The recommendation engine is fully local and uses `papers_by_room.json` as the authoritative CHI 2026 source. The app no longer depends on external recommendation services or reference-site behavior.

## Source Data

The catalog loader in `src/lib/papers/catalog.ts` imports the repository root file `papers_by_room.json`. The JSON is grouped first by room. Individual paper records may also include a `domain`, which is used as a label inside that session group when it is specific.

Topic construction uses this order:

1. Use `sessionRoom` as the program anchor.
2. Use a specific `domain` as the visible topic label inside that session when present.
3. For unassigned papers without a useful room, derive a small deterministic label from title and abstract keywords.

## Topic Ranking

`recommendTopicsForAuthor(authorName, limit)` builds an author profile from the matched author's CHI 2026 papers, then scores each topic group by:

- whether the topic contains one of the author's own papers,
- keyword overlap between the author's papers and the topic group,
- a small topic-size boost so sparse ties remain stable.

The result is deterministic. Each recommendation includes:

- the topic id and label,
- the source category used to form the topic,
- a rationale,
- same-topic papers for dashboard previews and the topic canvas paper area.

## Paper Ranking

`recommendPapersForAuthor(authorName, limit)` now reuses the topic ranking. It walks the highest-ranked topics, removes the author's own papers, and ranks the remaining papers by topic score plus paper-level keyword overlap.

This keeps idea generation, dashboard recommendations, and tests aligned around the same CHI 2026 topic model.

## Topic Canvas

Joining a dashboard topic creates or reuses one shared open topic idea. The topic idea id is derived from the topic id and stores the topic paper ids as grounding records. Unlike private drafts, topic canvases allow any matched CHI 2026 author to save sticky notes, comment, and react.
