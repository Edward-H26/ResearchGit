# Recommendation algorithm

Status: PapersClaw reference inspected, deterministic local reproduction active
Last updated: 2026-05-05

This repository scores recommendations directly from `papers_by_room.json`. The implementation is portable and does not require PapersClaw credentials, but it now records the live PapersClaw behavior used as the reference for V2.

## PapersClaw reference

Inspection source: `https://papersclaw.fun/`, `js/main.js?v=22`, and live POST requests on 2026-05-05.

Relevant client endpoint map observed in `main.js`:

| Skill | Endpoint |
|---|---|
| Dorphin launcher recommendations | `POST /api/dorphin/recommendations` |
| Shell collaborator recommendations | `POST /api/skills/collaborators` |
| Semantic paper discovery | `POST /api/skills/semantic-search` |
| Seahorse cross-domain paper discovery | `POST /api/skills/serendipity` |

`POST /api/skills/collaborators` request shape:

```json
{
  "user_author_name": "Yiren Liu",
  "selected_paper_titles": [
    "Perspectra: Choosing Your Experts Enhances Critical Thinking in Multi-Agent Research Ideation"
  ],
  "limit": 8
}
```

Observed response shape:

```json
{
  "skill_id": "collaborators",
  "title": "Suggest Collaborators",
  "rationale": "Dorphin excluded your existing co-authors and is showing new potential collaborators only.",
  "applied_context": {
    "query": null,
    "selected_domains": ["Multi-Agent Reasoning Systems for Sensemaking and Planning"],
    "paper_count": 7,
    "excluded_coauthors": 5
  },
  "result": {
    "people": [
      {
        "name": "Huamin Qu",
        "paper_count": 2,
        "supporting_papers": ["DiLLS: Interactive Diagnosis of LLM-based Multi-agent Systems via Layered Summary of Agent Behaviors"]
      }
    ],
    "teams": [
      {
        "members": ["Alexa Siu", "Varun Manjunatha", "Xinyue Chen", "Xu Wang"],
        "paper_count": 1,
        "supporting_papers": ["From Conversation to Human-AI Common Ground: Extracting Cognitive Workflows for Reuse in Sense-making Tasks"]
      }
    ],
    "user_papers": [
      {
        "title": "Perspectra: Choosing Your Experts Enhances Critical Thinking in Multi-Agent Research Ideation",
        "room": "P1 - Room 134",
        "date": "Fri, 17 Apr | 9:00 AM - 10:30 AM"
      }
    ]
  },
  "generated_at": "2026-05-05T16:55:36.920Z"
}
```

`POST /api/skills/semantic-search` request shape:

```json
{
  "user_description": "multi-agent research ideation",
  "selected_domains": [],
  "limit": 5
}
```

Observed semantic response shape:

```json
{
  "skill_id": "semantic-search",
  "title": "Semantic Paper Discovery",
  "result": {
    "papers": [
      {
        "paper": {
          "title": "Towards AI as Colleagues: Multi-Agent System Improves Structured Ideation Processes",
          "domain": "Human-AI Interaction & GenAI",
          "room": "P1 - Room 122"
        },
        "reason": "This paper discusses how a multi-agent system can enhance structured ideation processes."
      }
    ]
  }
}
```

## Ordering behavior

PapersClaw Shell uses two phases:

1. Resolve `user_author_name` to CHI papers and return `result.user_papers`.
2. If the author has multiple papers and no selected paper titles are sent, ask the user to choose a subset before showing collaborators.
3. Rank people before teams. People are sorted by topical domain support and descending `paper_count`, with co-authors excluded through `applied_context.excluded_coauthors`.
4. Teams are grouped by supporting paper and sorted after people.
5. The `limit` field controls how many people are returned initially, while the UI paginates additional people in batches.

Semantic paper discovery returns papers ordered by textual relevance to `user_description`, with a natural-language `reason` for each result.

## Evidence cases

Live `POST /api/skills/collaborators`, `limit: 8`, no selected papers:

| Author | User papers | Applied domains | Top people |
|---|---:|---|---|
| Ziyi Liu | 4 | AI Tutors and Learning Support Systems; Thermal and Gestural Interaction | Jin Ryong Kim, Abbas Khawaja, Adam Daniel Reynolds, Ahmed Farooq, Alexander Schier |
| Yiren Liu | 2 | Multi-Agent Reasoning Systems for Sensemaking and Planning | Huamin Qu, Alexa Siu, Caoyang Xue, Chi Zhang, Chuhan Shi |
| Hyanghee Park | 1 | none returned, broad fallback over 2,829 papers | Xiaojuan Ma, YI-CHIEH LEE, Yuanchun Shi, Mark Colley, Sophia Ppali |

Local deterministic `recommendPapersForAuthor(name, 5)` evidence:

| Author | Top paper recommendation |
|---|---|
| Ziyi Liu | Beyond the Empathy Fallacy: A Meta-analysis of Artificial Empathy in Human-AI Interactions |
| Yiren Liu | Training for the Future: Preparing Humans for Effective Human-AI Programming |
| Hyanghee Park | Beyond Age-Based Restrictions: Rethinking Children's Online Safety Through Comparing Parent-Child Perspectives of Risks in User-Generated Content Games |

Local deterministic `recommendCollaboratorsForAuthor(name, 3)` evidence:

| Author | Top with-you collaborators | Top stretch-you collaborators |
|---|---|---|
| Ziyi Liu | Karthik Ramani, Xiyun Hu, XINYI WANG | Mirjana Prpa, Alexandros Rouchitsas, Caroline G. L. Cao |
| Yiren Liu | Sangho Suh, Shunan Guo, Viraj Nischal Shah | Alexandra Kitson, Dina Albassam, Jinwoo Kim |
| Hyanghee Park | Daehwan Ahn, Jae Eun Kim, Alessandro Bozzon | Larissa Pschetz, Adam D G Jenkins, Adam Frank |

## Local reproduction

The local engine intentionally avoids network dependencies and credentials. It reproduces the reference at the data-contract level:

1. Resolve the CHI author from `papers_by_room.json`.
2. Exclude authored papers from paper recommendations.
3. Build a keyword profile from authored titles and abstracts.
4. Score candidate papers with Jaccard overlap against that profile.
5. Rank collaborators with the same profile, split into `with-you` for overlapping rooms and `stretch-you` for adjacent rooms.
6. Return stable, deterministic arrays that can be imported by dashboard, idea generation, and tests.

The local fallback differs from PapersClaw where PapersClaw has richer domain labels and public session metadata. The portability goal is deterministic behavior over the repository dataset, with the inspected endpoint contracts documented above.
