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

Newledge builds on braid `0.2.0`. That version exists only in the braid source
tree; the published npm packages are still `@braidhq/*@0.0.1`, an older cut
missing the capabilities Newledge needs. braid's packages also point `main` at
TypeScript source rather than built `dist`.

The clean way to consume it, as everstory does, is to depend on published braid
packages. Until braid `0.2.0` is published, this scaffold stays braid-free so it
builds standalone and CI is green.

## Development

```sh
pnpm install
pnpm build       # turbo: builds packages then apps
pnpm typecheck
pnpm test
pnpm lint
```

Node 20+ (`.nvmrc` pins 20), pnpm from the `packageManager` field.
