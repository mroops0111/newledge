# Vision

Newledge is a Heptabase alternative whose whiteboard is fed by an AI that watches, reads, and listens to content you do not have time to consume, then hands you the distilled knowledge to review and merge into your brain.

## The Problem

Learning has a throughput ceiling: the good material is longer than the time available.

- A two-hour lecture holds twenty minutes of knowledge you actually need, but you have to watch all two hours to find it.
- Podcasts, long articles, and conference talks pile up unwatched.
- Even when you do consume them, the knowledge does not connect to what you already know. It evaporates.

## The Wedge

The wedge is not "summarize a video". Summarizers are a red ocean. The wedge is the full loop.

- **AI reads any video for you.** Not just YouTube. Any video, via a capability ladder (transcript, then download-and-transcribe, then browser automation for login-walled content). See `02-architecture.md`.
- **Output is reviewable knowledge, not a wall of text.** Each extracted claim arrives as a card you can accept or reject, and it carries provenance back to the exact source moment.
- **Accepted knowledge merges into a spatial brain.** The whiteboard is where knowledge accretes, connects, and stays. This is the Heptabase-style surface.
- **It keeps pulling.** You declare what to track, and Newledge periodically pulls new material into your reading inbox.

## What Newledge Is

Newledge is three things stacked on one graph.

- **An ingestion engine** (`extract`): pull any video / article / podcast, have AI read it, propose structured knowledge with provenance.
- **A reading inbox** (`generate`, review): new knowledge shows up as reviewable proposal cards. This is the "整合進 proposal 讓我閱讀新知" surface.
- **A knowledge whiteboard** (`generate`, writeback): approved knowledge lands as cards on spatial boards you curate. This is the product's face and its moat.

## What Newledge Is Not

Being explicit about non-goals keeps the scope honest.

- **Not a video downloader.** Downloading is a means. The product is the knowledge, not the file.
- **Not a raw graph tool.** The graph is the substrate. Most users live on the whiteboard, never in a node-edge inspector.
- **Not a chatbot over your notes.** Q&A is one view among several, not the center. The center is the accreting board.
- **Not braid.** braid is the framework it runs on. See `00-overview.md`.

## The Two Real Differences From braid

Two things make Newledge a distinct product rather than a braid reskin. Both are recorded upstream.

- **Trust without a ground truth.** braid trusts Code as fact. Newledge trusts nothing by default. Every claim is sourced, contradictions are surfaced, and the human curates. Provenance is the trust mechanism. See braid #68.
- **A view that writes back.** The whiteboard is not a read-only projection. Editing it edits the brain. See braid #65.

## Delivery Shape

Newledge is web-first, with native clients later, mirroring braid and everstory.

- **Web first**: the whiteboard and reading inbox run in the browser.
- **App later**: an Expo or Tauri client, once the web loop is proven.
- **Ship independently**: like everstory, Newledge must run standalone and never block on braid's roadmap. It depends on braid, contributes generalizations upstream, and keeps its engine runnable on its own.
