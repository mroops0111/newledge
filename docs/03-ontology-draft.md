# Ontology Draft (ontology-knowledge)

This is the first-pass domain ontology for Newledge, defined as a third-party braid plugin. It aligns to braid's model shape: an ontology declares node types, edge types, and SourceRoles, and every node and edge carries evidence. This draft is not final. Open questions are at the end.

> Mirrors everstory's `03-ontology-draft.md` in intent. Expect it to converge through the M0 CLI slice, not before.

## SourceRoles

braid ships `code | intent`. Newledge needs its own roles, which is exactly braid #50 (ontology-declared SourceRoles). The two roles are asymmetric, and this asymmetry is the point.

- **`feed`** (the primary role): external content you extract from, meaning video, article, podcast, web-search result. Analogous to braid's `code` role in position (the observed record), but not in authority. A feed is a **claim**, not a fact.
- **`stance`** (the sparse role): your own authored input, meaning notes, questions, opinions, and what you choose to track. Analogous to braid's `intent` role: your forward-looking framing.

The Model itself (your knowledge graph) is **not** a SourceRole. It is the IR, the canonical merge, the same way everstory's canon is the Model and not a source.

## The Trust Model (No Privileged Fact-SSoT)

This is the deepest difference from braid, filed upstream as braid #68.

- braid assumes `code` is an unquestionable fact-SSoT that arbitrates drift.
- Newledge has no such role. Two `feed` sources can contradict, and nothing breaks the tie by authority.
- **Trust is reconstructed from three things**: provenance per claim, cross-source convergence and contradiction, and human curation.
- **Consequence**: Newledge leans hard on evidence and lightly on "which role is true". Every node and edge must carry provenance or it does not exist.

## Node Types (v0 Draft)

A small set that covers "structured knowledge with sources". Expect to trim or split during M0.

- **`Concept`**: a unit of knowledge, an idea, a technique, a definition. The dominant node.
- **`Claim`**: a specific assertion with a truth value the user might accept, reject, or contest. Carries provenance to the source moment.
- **`Source`**: an ingested artifact (a video, an article, a podcast episode) with its metadata. The anchor for provenance.
- **`Topic`**: a grouping or theme. Backs boards and sub-boards without being a container.
- **`Question`**: something you want to understand. A `stance`-originated node that steers what to pull and what to surface.

## Edge Types (v0 Draft)

Edges are semantic and evidence-derived. They are not the same as the spatial connections a user draws on the whiteboard. See `05-graph-vs-whiteboard.md`.

- **`introducedBy`**: node → `Source`. The provenance edge. Mirrors everstory's `introduces`. Nothing exists without one.
- **`cites`**: `Claim` → `Source`. The evidence for an assertion, ideally with a media fragment (braid #64).
- **`elaborates`**: `Concept` → `Concept`. One idea expands another.
- **`supports`**: `Claim` → `Claim`. Corroboration, possibly across sources (convergence).
- **`contradicts`**: `Claim` → `Claim`. Conflict, the signal that surfaces disagreement across sources.
- **`about`**: `Concept` / `Claim` → `Topic`. Topical membership.
- **`answers`**: `Concept` / `Claim` → `Question`. Connects incoming knowledge to a standing question.

## Evidence Is The Gatekeeper

Newledge reuses braid's `EvidenceValidator` verbatim, the same way everstory does.

- **Every node and edge carries evidence**: which `Source`, and where inside it.
- **Provenance points inside the source**, not just at it: a video timestamp range, a paragraph, a URL fragment. braid's `SourceLocation` is line-oriented today, so this needs braid #64 (media-fragment provenance).
- **This is the mechanism** that keeps a large accreting brain trustworthy and free of hallucinated claims. A claim you cannot trace back is a bug.

## Materialize What You Keep

Newledge stores curated knowledge, not every candidate extraction.

- A two-hour video yields many candidate claims. Only accepted ones persist as nodes.
- This mirrors everstory's "store a line, not a tree". The graph is the walked, curated path, not the full space of everything AI could have proposed.

## Open Questions

Unresolved design points, to settle during M0 and M1.

- **A. Source versus unit granularity.** Is one video one `Source`, or does each chapter become its own extraction unit? Leaning: video is the `Source`, chapters are units, mirroring braid's per-unit extract.
- **B. Concept versus Claim boundary.** When does a sentence become a `Concept` versus a `Claim`? Risk of over-noding. Leaning: `Concept` for durable ideas, `Claim` only when a truth value matters.
- **C. Contradiction handling.** When two feeds contradict, does merge keep both with a `contradicts` edge, raise a Clarify, or confidence-weight by source count? This is braid #68 territory.
- **D. Board membership as state.** Is "this card is on the AI board at position (x, y)" graph state or app state? Leaning: view state in `apps/board`, not the ontology, so the ontology stays generic.
- **E. Whiteboard connections versus graph edges.** A user-drawn arrow is a gesture, a `contradicts` edge is a typed claim with evidence. They inform each other but are not one-to-one. Keep them distinct.
