# Architecture

Newledge is a pnpm + turbo monorepo that depends on braid as a library, mirroring everstory. This document covers the repo layout, the braid dependency boundary, the video acquisition layer, and the two loops.

## Repo Layout

The intended structure follows everstory: a braid ontology plugin plus an engine in `packages/`, and the deployable surfaces in `apps/`.

```
newledge/
├─ packages/
│  ├─ ontology-knowledge/   # braid plugin (third-party): nodes / edges / SourceRoles + evidence
│  ├─ source-loader-video/  # braid plugin (thin): conforms to SourceLoader port, calls the acquisition layer
│  ├─ ingest/               # extraction orchestration: transcript / frames → Proposals
│  └─ shared/               # shared types, braid API client
├─ apps/
│  ├─ server/               # braid server composition (composeApp) + ingest routes + scheduler
│  ├─ reader-web/           # reading inbox: proposal review, reskinned from braid Studio
│  └─ board/                # the whiteboard / card canvas — the product surface, web first
├─ media-ingest/            # SEPARATE service: "any video URL → transcript + frames + audio"
└─ legacy/                  # the pre-2026 Next.js app, preserved
```

## The braid Dependency Boundary

Newledge reuses braid's engine and forbids reusing its UI, exactly as everstory does.

- **Reuse**: `@braidhq/sdk`, `@braidhq/core`, `@braidhq/schema`, and the braid server (workspace, model, proposals, HITL, Reactor, RBAC, SSE, Google OAuth).
- **Do not reuse**: braid Studio's UI. The reading inbox is a reskin at most, and the whiteboard is entirely new.
- **`ontology-knowledge` lives in this repo**, as a genuine third-party braid plugin. That is what proves braid's SDK is usable by outsiders, the same role `ontology-story` plays for everstory.

## Workspace Mapping

One workspace is your whole brain, not one workspace per domain.

- **`Workspace` = your entire knowledge base** (one graph, one Model). "AI", "Company", "Software Engineering", and sub-boards are boards and `Topic` groupings **inside** the one graph, not separate workspaces.
- A card can appear on multiple boards because a board is a view, not a container. This matches Heptabase.
- **Split into a second workspace only for a hard boundary**, meaning permission, compliance, or lifecycle. A likely split is `personal-brain` versus `company`, never a split by topic.
- Rationale: knowledge does not respect domain lines. An AI paper links to a Company decision links to an engineering practice. Splitting by topic turns those links into awkward cross-workspace references.

## The Video Acquisition Layer

Getting content out of "any video" is a capability ladder, not one mechanism. The messy, provider-specific work lives in a separate `media-ingest` service behind a stable interface.

- **Tier A, caption / transcript API**: YouTube, Bilibili, most course platforms. Cheapest and fastest. The 80 percent path.
- **Tier B, download and transcribe**: `yt-dlp` (supports thousands of sites) grabs audio, Whisper transcribes. This is the real "any video" backbone.
- **Tier C, browser automation**: headless Playwright (or Claude in Chrome for one-off prototyping) plays login-walled, DRM, or anti-bot content in a real session and captures screen frames plus on-screen captions. The fallback, never the default.

Design rules for this layer:

- **Interface first**: everything hides behind `acquire(url) -> { transcript, frames, audio, metadata }`. The loader and the extractor never know which tier ran.
- **Separate lifecycle**: `yt-dlp`, Whisper, and ffmpeg are heavy and Python-native. Keep them out of the braid TS plugin. `media-ingest` can be its own service or worker.
- **This mirrors braid's Agent-as-subprocess and everstory's pluggable Storyteller seam.**
- **Interactive versus productized**: Claude in Chrome is for prototyping the Tier C fallback by hand. Scheduled pull at scale wants a headless browser worker.

## The Two Loops

Newledge has the same two-loop shape as everstory, split by gate policy.

- **Ingestion loop (extract, HITL)**: `feed source → extract → Proposal → reading inbox → apply(gate: hitl) → graph`. This is "AI reads the video, you review the knowledge before it lands". It is braid's classic extract loop.
- **Authoring loop (whiteboard, auto)**: `you edit a card → Proposal → apply(gate: auto) → graph`. You curate your own brain, so no review gate. This is the writeback view (braid #65).
- **Decoupled through the IR**: the two loops never form a continuous AI-on-AI reaction. The graph sits between them, exactly as everstory keeps its writers' room and performance engine apart.

## Periodic Pull

Periodic pull reuses braid's Reactor plus a scheduler.

- **Reactor v0 already ships in braid**: it reacts to `source.synced`, runs per-unit extract plus model, and drops Proposals into the inbox.
- **The gap is the trigger for webhook-less feeds.** braid deliberately has no in-server scheduler. Newledge adds scheduled sync in `apps/server`, or uses an external cron. Tracked upstream as braid #67.
- **Push versus pull is just how sync fires**: RSS or webhook is push, cron is pull. Both end at `loader.sync → Reactor`.

## Tech Stack

TypeScript end to end, with a Python-native media service.

- **Packages and apps**: TypeScript, pnpm, turbo, mirroring braid and everstory toolchain.
- **Extraction agent**: Claude (Anthropic TS SDK, opus-class) behind a pluggable seam so tests run against a scripted stub.
- **Whiteboard**: a canvas library (tldraw / React Flow / Excalidraw) plus custom card rendering.
- **`media-ingest`**: likely Python (yt-dlp + Whisper + ffmpeg + headless browser), exposed over a small HTTP interface.
