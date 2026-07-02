# Newledge Overview

Newledge is a personal-knowledge whiteboard that pulls fresh knowledge from any video, article, or podcast, has AI read it for you, and merges the result into a spatial "second brain". This document is the entry point and the map to the rest of `docs/`.

> Reconceived 2026-07-01. The pre-2026 Newledge (a Next.js track-configuration + auth shell) is preserved under `legacy/`. See `legacy/README.md`.

## The One-Line Positioning

Newledge is braid's third downstream application, a sibling to everstory.

- **braid** is the grounding framework: a bidirectional compiler whose IR is a canonical, evidence-backed graph. See `../braid`.
- **everstory** is braid's second app: an AI bedtime-story engine that stresses the **generate** axis.
- **newledge** is braid's third app: a knowledge whiteboard that stresses the **extract** axis with multimodal sources and periodic pull.

The engine is braid. The product is not braid. braid has no opinion about YouTube, no whiteboard, and no knowledge ontology. Those are newledge's contribution.

## The Governing Mental Model

The same model everstory uses applies here: braid is a compiler, the graph is an IR.

```
front-end (extract)         IR (the graph)          back-end (generate)
video / article / podcast ─▶ Knowledge Graph ─▶ whiteboard · reading inbox · Q&A · digest
your own notes / stance   ─▶ (the "brain")   ─▶ (many views over one model)
```

- Everything before the IR is `extract`: pull external content, have AI read it, emit candidate knowledge.
- Everything after the IR is `generate`: render the graph as a whiteboard, a reading feed, an answer, a summary.
- The whiteboard is one view (the flagship), not the graph itself. See `03-ontology-draft.md` and `05-graph-vs-whiteboard.md` for the distinction.

## Why It Is Not "Just braid"

Newledge maps onto braid cleanly, but two things are genuinely different and are the reason it is a distinct product.

- **No privileged fact-SSoT.** braid rests on Code being an unquestionable fact-SSoT. Newledge has none: a YouTube video is a claim, not a fact. Trust comes from provenance per claim plus human curation, not from one authoritative role. Filed upstream as braid #68.
- **The whiteboard is a writeback view.** braid Views are one-way (`model → text`). Newledge's whiteboard renders the graph and writes edits back as Proposals. Filed upstream as braid #65.

## Document Index

Read in this order.

- **`00-overview.md`** (this file): positioning, mental model, index.
- **`01-vision.md`**: the product, the wedge, what it is not.
- **`02-architecture.md`**: repo layout, braid dependency, the acquisition layer, the two loops.
- **`03-ontology-draft.md`**: `ontology-knowledge` nodes, edges, SourceRoles, evidence, open questions.
- **`04-roadmap.md`**: milestones M0 to M4 and the upstream braid issues newledge forces.
- **`05-graph-vs-whiteboard.md`**: the three-graph distinction (braid Model, knowledge graph, whiteboard).

## Relationship To braid, Recorded Upstream

Newledge forces five braid generalizations, now tracked as issues on `mroops0111/braid`.

- **#50** (pre-existing): decouple `code | intent` into ontology-declared SourceRoles. Newledge needs `feed | stance`.
- **#57** (pre-existing): generative back-end, `apply(gate: hitl | auto)`. Newledge's whiteboard writeback uses `gate: auto`.
- **#64**: media-fragment provenance (video timestamps, page regions, URL fragments).
- **#65**: bidirectional / editable View (writeback).
- **#66**: multimodal source units for extract (keyframes / audio).
- **#67**: sanctioned periodic-sync pattern for pull-only, webhook-less sources.
- **#68**: trust / convergence model for domains with no privileged fact-SSoT.
