# About This Legacy Directory

This directory holds the original Newledge (pre-2026-07-01), preserved verbatim after the project was reconceived as a braid application. The original app README is alongside this file at `README.md`. For the new direction, see the root `README.md` and `docs/00-overview.md`.

## What This Was

Newledge 1.0 was a Next.js frontend for an AI content-tracking product.

- **Built and working**: Track CRUD (domain / sources / keywords / frequency), Google OAuth login (HttpOnly cookies), a Next.js proxy layer to a separate FastAPI backend, and Cucumber BDD coverage.
- **Never built**: the actual content pipeline. AI search, summarization, and notifications existed only as homepage copy. `cookies.txt` was an empty yt-dlp placeholder. It stalled around 2025-08 when the backend list-tracks endpoint was missing.

## What Carries Forward

Most of this is superseded, but two ideas survive.

- **The `Track` concept** (a standing "what to pull" subscription: domain + sources + keywords + frequency) becomes the ingestion subscription config in the new design. See `docs/02-architecture.md`, milestone M1.
- **Google OAuth** is superseded: braid's server already ships Google OAuth and RBAC, so the new build reuses braid's auth rather than this app's.

## Git

The full pre-reconception state also lives on the `archive` branch. This directory keeps it readable in the working tree without a checkout.
