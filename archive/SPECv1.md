1.1 Goal

This work investigates how researchers might collaboratively refine early-stage research ideas in an open, crowdsourced setting — what we provisionally call a GitHub for research ideation. While code-collaboration platforms such as GitHub have established mature primitives (fork, merge, pull request, contribute) for distributed software development, the analogous primitives for collaborative research ideation remain unclear. Which actions do researchers actually want to perform on someone else's idea? When do they want to extend it, prune it, recombine it, or branch off from it? Under what conditions are they willing to contribute to an idea they did not originate?

Rather than prescribing a fixed interaction model, we approach these questions through co-design. We build a lightweight probe in which:





An LLM seeds the design space with candidate research ideas drawn from clustered HCI literature, giving participants concrete, non-trivial artifacts to react to;



Participants collaborate on each idea through a shared Miro-like canvas, expressing their intentions via labeled sticky notes (add, delete, merge) and free spatial arrangement;



A motivating end goal — producing an idea worth submitting as a research proposal — anchors the collaboration in a realistic stake, surfacing the kinds of refinement researchers genuinely care about.

The goal of this demo is therefore not to deliver a finished collaboration platform, but to elicit the design requirements for one. By observing how participants appropriate the sticky-note vocabulary, where it falls short, and what additional primitives they spontaneously request, we aim to inform the design of future infrastructure for crowdsourced research ideation. 

1.2 Workflow





Cluster Sampling. The system samples 10 paper clusters from a fixed catalog.



Idea Generation. For each cluster, an LLM generates one candidate research idea (10 ideas in total).



Idea Selection (List View). The 10 generated ideas are presented in a list view. The user selects 1–2 ideas of interest to explore further.



Co-design on a Miro-like Board. Clicking into a selected idea opens an interactive canvas. Participants leave feedback as typed sticky notes — labeled by intent such as add, delete, or merge — and can freely arrange notes on the canvas to express grouping or relationships. No explicit branching is introduced at this stage; all collaboration happens on a shared board per idea.



Optional AI-assisted Revision. Each board provides a manual "AI Revise" button. Users may enter their own revision intent in natural language, and the AI updates the research idea accordingly. Invocation is fully user-controlled — no automatic rewriting.

 