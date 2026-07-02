# Newledge

A personal-knowledge whiteboard that pulls fresh knowledge from any video, article, or podcast, has AI read it for you, and merges the result into a spatial second brain.

> **Reconceived 2026-07-01.** Newledge was previously a Next.js track-configuration and auth shell. That codebase is preserved under `legacy/` (and on the `archive` git branch). The new direction rebuilds Newledge as a braid application.

## What It Is

Newledge is braid's third downstream application, a sibling to everstory.

- **braid** (`../braid`) is the framework: a bidirectional compiler whose IR is a canonical, evidence-backed graph.
- **everstory** (`../everstory`) is braid's second app and stresses the `generate` axis.
- **Newledge** is braid's third app and stresses the `extract` axis with multimodal sources and periodic pull.

The engine is braid. The product (the whiteboard, the video ingestion, the knowledge ontology) is not. See `docs/00-overview.md`.

## The Loop

```
any video / article / podcast ─▶ AI reads it ─▶ reviewable knowledge cards ─▶ your whiteboard brain
                                    (extract)         (reading inbox)            (writeback view)
```

- **Pull** any content, not just YouTube, via a capability ladder (transcript, download-and-transcribe, browser automation).
- **Review** extracted knowledge as proposal cards, each with provenance back to the exact source moment.
- **Merge** approved knowledge onto spatial boards you curate.
- **Repeat** on a schedule.

## Documentation

Start at `docs/00-overview.md`, then read in order.

- `docs/00-overview.md`: positioning, mental model, index.
- `docs/01-vision.md`: the product, the wedge, non-goals.
- `docs/02-architecture.md`: repo layout, braid dependency, acquisition layer, the two loops.
- `docs/03-ontology-draft.md`: `ontology-knowledge` nodes, edges, SourceRoles, evidence.
- `docs/04-roadmap.md`: milestones M0 to M4 and the upstream braid issues.
- `docs/05-graph-vs-whiteboard.md`: the three-graph distinction.

## Status

Design stage. No new code yet. The immediate next step is M0: a CLI slice proving that AI extraction of a single video produces trustworthy, provenance-backed knowledge.
