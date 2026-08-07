# Newledge

Newledge is a personal-knowledge whiteboard fed by an AI that reads content you
do not have time to consume, then hands you the distilled knowledge to review and
merge into a spatial second brain. It is braid's third downstream application, a
sibling to everstory.

See `docs/00-overview.md` for positioning and the document index, and
`docs/07-braid-boundary.md` for what is braid core, what is a Newledge braid
plugin, and what is Newledge-only.

> The pre-2026 Newledge (a Next.js track-configuration shell) is preserved under
> `legacy/`. `docs/` and `legacy/` are local-only (see `.gitignore`).

## Monorepo Layout

A pnpm + turbo workspace, mirroring braid and everstory.

```
newledge/
├─ packages/
│  ├─ ontology-knowledge/   # braid plugin (bucket B): nodes / edges / roles + evidence
│  └─ source-loader-web/    # braid plugin (bucket B): SourceLoader, retrieval via the web-search agent
├─ apps/
│  └─ cli/                  # M0 CLI: composeApp + plugins, sync -> extract -> apply -> print
└─ legacy/                  # the pre-2026 Next.js app (local-only)
```

More packages (`apps/server`, `apps/reader-web`, `apps/board`, the desktop
shell) land in later milestones. The Python web-search and extraction agents
live in a separate repo (evolving `newledge-pipeline`), reached through braid's
language-agnostic agent port.

## The braid Dependency (open decision)

Newledge builds on braid `0.2.0`. That version exists only in the local braid
source tree; the published npm packages are still `@braidhq/*@0.0.1`, an older
cut where the capabilities Newledge needs do not exist. braid also exports
TypeScript source (`main: ./src/index.ts`), not built `dist`.

This scaffold does not yet depend on braid, so it builds standalone and CI stays
green. Wiring braid in needs a strategy decision, because a plain local
`link:../braid` breaks CI on a clean runner where braid is absent:

- **git submodule** braid into this repo, so CI checks it out.
- **publish braid `0.2.0`** (npm or GitHub Packages) and depend by version.
- **local `link:`** for dev only, paired with one of the above for CI.

Tracked in issue #6.

## Development

```sh
pnpm install
pnpm build       # turbo: builds packages then apps
pnpm typecheck
pnpm test
pnpm lint
```

Node 20+ (`.nvmrc` pins 20), pnpm from the `packageManager` field.
