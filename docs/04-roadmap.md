# Roadmap

Newledge is dogfood-first: prove the extraction engine before building the product surface. This mirrors everstory's hard-won lesson. Do not build the whiteboard first, or you get a beautiful empty board with no knowledge flowing in.

## Why Newledge Is Less Blocked Than everstory

Newledge mostly consumes braid's mature side, so it can start almost immediately.

- **everstory was blocked on braid's immature `generate` axis** (model → artifact, `gate: auto`, proposals from generate). That is braid #57, still in progress.
- **Newledge mostly rides braid's shipped `extract` side**: source loaders, per-unit extract, Reactor v0, HITL proposals, Kuzu storage, RBAC, SSE, Google OAuth are all on braid master today.
- **The braid gaps Newledge needs are plugins or narrow features, not core rewrites**: new source loaders (write them), SourceRoles beyond `code | intent` (braid #50, already forced by everstory), and a scheduler for pull-only feeds (braid #67).

## Milestones

Five milestones, ordered so that the biggest risk is retired first.

### M0, Prove The Extract Slice (CLI, No UI)

The single most important milestone. If AI-extracted video knowledge is shallow or wrong, nothing downstream matters.

- Define a minimal `ontology-knowledge` (`Concept`, `Claim`, `Source`, `introducedBy`, `cites`, SourceRoles `feed | stance`, evidence).
- Build a transcript-only video loader for one platform.
- Run end to end in a CLI: pull one video, extract, produce Proposals, apply, print the resulting graph.
- Prove: provenance is intact, no hallucinated claims (evidence gate holds), dedup works.
- Zero UI. This is everstory's 10-episode CLI demo pattern applied to knowledge.

### M1, Reading Inbox (Extract Loop With HITL)

Wire the braid server plus a minimal web surface that is just the proposal inbox as a reading experience.

- Stand up `apps/server` (braid composition) and a minimal `apps/reader-web`.
- New knowledge from tracked videos shows up as reviewable cards. You read, then accept or reject.
- Salvage the `Track` concept from `legacy/` as the "what to pull" subscription config.
- Add scheduled sync feeding the Reactor for periodic pull (braid #67).

### M2, The Whiteboard (The Product)

Build the spatial canvas. This is the Heptabase alternative and Newledge's real differentiation.

- Approved knowledge merges onto boards as cards.
- The board renders the graph, and board edits write back via `apply(gate: auto)`. This exercises braid #65.
- Web-based, on a canvas library plus custom card rendering.

### M3, More Sources And Multimodal

Broaden ingestion once the loop is proven.

- Add web-search, podcast, and web-page loaders.
- Add the full acquisition ladder: `yt-dlp` plus Whisper (Tier B), then browser automation (Tier C).
- Add vision-augmented extraction with keyframes for slide-heavy videos. This exercises braid #66.

### M4, App And Platform

Expand beyond the browser, like braid and everstory.

- An Expo or Tauri client with sync.

## Upstream braid Issues Newledge Forces

Newledge is braid's third forcing function. These are filed on `mroops0111/braid`.

- **#50** (p1, pre-existing): ontology-declared SourceRoles. Needed by M0 for `feed | stance`. May be hacked around short term by mapping both to existing roles.
- **#57** (pre-existing): generative back-end and `gate: hitl | auto`. The whiteboard writeback uses `gate: auto`.
- **#64** (p2): media-fragment provenance. Needed for "Claim cites YouTube URL @ 12:03", a core feature. Highest-priority new gap.
- **#65** (p3): bidirectional / editable View. The whiteboard writeback. Done in the app layer first, generalized upstream later.
- **#66** (p3): multimodal source units. Needed at M3 for visual-heavy content.
- **#67** (p3): periodic-sync pattern for webhook-less sources. Needed at M1 for pull.
- **#68** (p3): trust / convergence model with no privileged fact-SSoT. The deepest conceptual gap, addressed as contradiction handling matures.

## Sequencing Note

Each milestone ships independently and dogfoods on real content the author actually wants to learn.

- M0 has no external dependency beyond one transcript API.
- The braid features above are not all blockers. Most are narrow, and M0 can proceed by mapping `feed` onto an existing role until braid #50 lands.
- Newledge must stay runnable standalone. Never block a milestone on braid's roadmap.
