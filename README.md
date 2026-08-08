# Newledge

Newledge is a personal-knowledge whiteboard fed by an AI that reads content you
do not have time to consume, then hands you the distilled knowledge to review and
merge into a spatial second brain. It is a downstream application of braid, a
sibling to everstory.

## Monorepo Layout

A pnpm + turbo workspace, mirroring braid and everstory.

```
newledge/
├─ packages/
│  ├─ ontology-knowledge/   # braid ontology plugin: nodes / edges / roles + evidence
│  └─ source-loader-web/    # braid source loader: retrieval via the web-search agent
└─ apps/
   └─ cli/                  # CLI: composeApp + plugins, sync -> extract -> apply -> print
```

More surfaces (`apps/server`, `apps/reader-web`, `apps/board`, the desktop shell)
land in later work. The Python web-search and extraction agents live in a
separate repo, reached through braid's language-agnostic agent port.

## The braid Dependency

Newledge depends on braid's published `@braidhq/*` packages (`^0.2.1`), the same
way everstory consumes braid. `pnpm install` pulls them from npm; no submodule or
local link is needed.

## Development

```sh
pnpm install
pnpm build       # turbo: builds packages then apps
pnpm typecheck
pnpm test
pnpm lint
```

Node 20+ (`.nvmrc` pins 20), pnpm from the `packageManager` field.
