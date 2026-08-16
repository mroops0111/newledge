---
name: typescript-conventions
description: TypeScript coding conventions for the Newledge monorepo, adopted from braid. Apply when writing or modifying any `.ts` file under `packages/` or `apps/` to keep the codebase consistent with established OOAD, clean code, and layering rules. Trigger when a TS file is created or nontrivially edited, when reviewing a PR, or when answering "how should I write this in TS / Zod / Hono".
---

# Braid TypeScript Conventions

These rules are nonnegotiable inside the Braid monorepo. Every TS edit must satisfy them. They came out of multiple painful review rounds. Do not relearn the same lessons.

## Architecture Layers

`schema → domain → application → infrastructure → presentation`

- **Dependencies only flow inward toward `domain`.** Domain code may not import infrastructure or presentation. Application may import domain but not infrastructure concretes; only ports (interfaces in `domain/`).
- **`@braidhq/schema`** is the only place Zod schemas live. Every other package imports types/schemas from it; never redeclare a shape.
- **Production code MUST NOT contain test stubs.** No "always returns null", no "stub answer for". If a real implementation does not exist yet, fail loudly via a clearly named `failing*` adapter (see `failingAgentBindings`).
- **Composition root** (`packages/server/src/composition.ts`) is the only place infrastructure concretes are wired. Routes, services, and skills never instantiate repositories or clocks themselves.

## Branded Identifiers

- IDs are Zod branded strings, declared in `packages/schema/src/common.ts`:
  ```ts
  export const NodeId = z.string().min(1).brand<'NodeId'>()
  export type NodeId = z.infer<typeof NodeId>
  ```
- **Never** write `someString as WorkspaceId`. Always go through the branded schema:
  - In zod schemas: `z.object({ workspaceId: WorkspaceId })`; the field is automatically branded.
  - At runtime parse: `WorkspaceId.parse(req.param('workspaceId'))`.
  - Static identity in a class field: `readonly id = SkillId.parse('ask')`.
- Brand types include `NodeId`, `EdgeId`, `WorkspaceId`, `ProposalId`, `ClarifyTicketId`, `ClarifyCandidateId`, `DecisionId`, `QuestionId`, `AnswerId`, `SourceId`, `SkillId`, `SkillRunId`, `PluginId`, `AgentId`, `OntologyId`, `UserId`, `AbsolutePath`, `NodeTypeId`, `EdgeTypeId`, `IntentFragmentType`, `QuestionChannel`, `ViewArtifactFormat`, `ExternalReferenceKind`, `ViewKind`, `TaskName`.

## ID Minting

- New IDs come from `packages/core/src/domain/ids.ts` (`newNodeId()`, `newProposalId()`, `newAnswerId()`, etc.).
- **Never** call `crypto.randomUUID() as XxxId` inline. Add a helper to `ids.ts` if you need a new mint.

## Time

- Inject a `Clock` (`packages/core/src/domain/Clock.ts`) into any service that needs `now()`.
- **Never** call `new Date()` directly in domain or application code.
- Production wires `SystemClock`; tests use `FixedClock` from `test/fakes/`.

## Errors

- Domain throws subclasses of `BraidError` (`ValidationError` / `NotFoundError` / `ConflictError` / `BraidError` base) from `packages/core/src/domain/errors.ts`.
- Application services let those propagate; **don't catch and rethrow with the same type**.
- Presentation (server middleware in `packages/server/src/middleware/error.ts`) maps:
  - `ValidationError` → 400
  - `NotFoundError` → 404
  - `ConflictError` → 409
  - Other `BraidError` → 500
  - `ZodError` (from `@hono/zod-validator`) → 400
  - Anything else → 500 generic problem+json
- Don't add new error codes randomly; add a subclass of `BraidError` with a stable code string (e.g. `BRAID-AGENT-UNCONFIGURED`).
- Message capitalization is always sentence-case, capital first letter, short or long alike. Braid errors are thrown standalone and mapped to a problem+json response, never wrapped or concatenated, so the Go style of lowercasing fragments for splicing does not apply here. If errors ever start wrapping each other, revisit this. Lead with a capital word, not a bare camelCase identifier, and quote the offending value (`Node id "x" not found`, not `x not found`). What varies by form is the trailing period: a full user-facing sentence (a problem+json `detail`) ends with one, a short fragment (`"x" not found`, `"y" already exists`) does not.

## Domain Entities

- Class wrappers around schema types (e.g. `Proposal`, `ClarifyTicket`, `Workspace`) must have **real behavior**, not just getters. If a class is anemic, either:
  1. Add invariants + state transition validation, or
  2. Delete it and use the schema type directly.
- State transitions are explicit: `markApplied(userId, timestamp): Proposal` returns a *new* entity and throws `ConflictError` if the current status forbids the move.
- Entities never mutate themselves; they return new instances. Wrap with `private readonly data` and expose via getters.
- Collection getters return `readonly T[]`, never the mutable internal array.

## OOAD Splits

- **Domain entity**: data + business invariants. No I/O.
- **Repository (port)**: interface only, in `domain/<aggregate>/`. Methods are `Promise<T>` returning. No implementation in domain.
- **Service (application)**: orchestrates entities + repositories. Constructor takes a single deps object (named fields, no positional sprawl).
- **Skill (application)**: thin Hono callable wrapper around a service. `extends Skill<TInput, TOutput>` with branded zod `inputSchema`.
- **Infrastructure adapter**: implements a port. Lives in `packages/core/src/infrastructure/in-memory/` (v1) or `packages/<x>/src/infrastructure/<vendor>/` (future Neo4j, Anthropic, etc.).

## Class, Function, or Const Object

TypeScript has first-class functions, so the classic "Strategy is an interface plus concrete classes" is a Java-ism. Reach for the lightest form that carries the behaviour, escalate only when you need more.

- **Function**: a stateless operation with no interface family. A comparator, a formatter, a pure transform (`computeSourceDiff`, `enrichCommitAuthor`). The function is the strategy.
- **Const object implementing an interface**: a stateless strategy, one interchangeable member of a family, no constructor dependency. Selected or registered as a value (`policy/checks`, and `tenancy`'s `singleTenant` and `multiTenant`). A natural singleton, no `new`.
- **Class**: when it owns an external resource, holds state or identity, or takes construction-time dependencies.
  - **Port adapter**: implements a `core` port and owns fs, git, a DB, or a subprocess. Always a class, even with no field yet, it is a system boundary that grows config.
  - **Service**: orchestrates via a single injected deps object.
  - **Entity or value object**: data plus invariants.
  - **Configured strategy**: a strategy that needs constructor input, such as `StructuralValidator(descriptors)`.

The dividing line is state, identity, or construction-time dependencies, not whether it implements an interface. A class with no state and one method is a function with extra steps. A stateless strategy behind an interface is a const object, not a class.

## Zod Conventions

- Always pair `const Foo = z.object(...)` with `export type Foo = z.infer<typeof Foo>` so consumers import one name and get both.
- Skill base type is `inputSchema: z.ZodTypeAny`; accept any concrete subtype (`z.object`, `z.discriminatedUnion`, etc.). Don't fight Zod variance.
- Open ended categorical types (where plugins add values) are brand strings: `z.string().min(1).brand<'X'>()`. Closed types are `z.enum([...])`.

## Hono Routes

- Each route file exports `createXxxRouter(deps): Hono`. Accept only the services it needs, not the whole composition.
- Body validation via `zValidator('json', SchemaWithBrandedFields)`.
- Path param validation via `XxxId.parse(context.req.param('xxxId'))`.
- Don't call repositories directly; always go through a service.

## Exhaustive Switches

- Any switch over a discriminated union (`GraphOperation.operation`, `Decision.action`, …) must end with:
  ```ts
  default: {
    const exhaustive: never = value
    throw new Error(`Unhandled: ${JSON.stringify(exhaustive)}`)
  }
  ```
- This makes adding a new discriminant a compile error here, which is the point.

## Comments

- **Default: do not write comments.** Self explaining names + clean structure should be enough. A comment earns its place only when the code cannot state the reason on its own.
- Match the comment form to the role. A `/** */` JSDoc block is the right form for a doc comment on an exported or public declaration (function, class, interface, interface member, type). The TypeScript language server renders it as hover and autocomplete documentation, a `//` comment does not, so this is the standard place for it. Use `//` for inline notes inside a body.
- Never write `@param`, `@returns`, or `@type` tags that restate the TypeScript signature. The types already carry that, and the redundant tag rots. A JSDoc block is plain prose, no tags. The punctuation and line break rules below apply to a JSDoc body exactly as to a `//` line.
- Allowed comments (terse, one line where possible):
  - Non obvious WHY. A constraint, tradeoff, invariant, or deferred decision that the code cannot show. State the thing that makes the code correct, not what the code does.
  - Phase boundaries when behavior is intentionally limited. Name the concrete limitation (`// single workspace until multi tenant lands`), not a bare phase label a reader cannot look up.
- Forbidden:
  - File header comments (`// @braidhq/foo …`).
  - Section dividers (`// ### Helpers ###` or similar horizontal rule style).
  - Restating what code does (`// returns the user`).
  - Duplicating what the types already express.
  - Edit history narration. A reader has the current code, not its past, so never write `// previously returned null, now throws` or `// changed to avoid the race`. State the current constraint instead.
  - Context that is not in the repository. Issue numbers, dates, ticket ids, or design docs no reader can open. When a rationale rests on such context, restate the concrete constraint inline instead of naming the label.

### Punctuation and line breaks in comments

- No semicolons. Split into two sentences, or use a comma.
- A colon is allowed only in `Label: explanation` form (for example a `TODO:` prefix), never in running prose. Rewrite `// the outcome of one turn: the reply` as `// the outcome of one turn, carrying the reply`.
- No em dashes (`—`) or arrows (`→` `←` `↔`). Use commas, periods, or parentheses.
- No ellipsis (`…`) and no trailing `and more`, `and so on`, `etc`, or `...`. When a list is illustrative, introduce it with `e.g.` or `such as`, or give two or three concrete examples and stop.
- Keep each comment terse, roughly 80 characters, even when it would fit on one longer line.
- When a comment must wrap, a physical line may end **only** at a period or a comma, never mid clause. Break at the nearest preceding period first, then a comma. Fill each line toward the target width before wrapping, and merge adjacent lines that belong to one sentence rather than stacking short fragments. Do not give each short clause its own line, and do not pour several sentences onto one long line.

```ts
// BAD: mid clause wrap, and an edit history aside
// clamp the size so the mmap does not
// blow past the CI limit (used to be unbounded)

// GOOD: one terse line stating the constraint, break lands on a comma
// cap size to the CI mmap limit,
// an unbounded value faults the runner
```

## Naming

- camelCase for identifiers, PascalCase for types/classes, SCREAMING_SNAKE only for compile time constants exported from `schema`.
- Acronyms in identifiers: prefer the project's established casing (`HITLService`, `QAService`, `clarifyTicketId`, `ClarifyTicketRepository`). Don't drift between `qa`/`Qa`/`QA`.
- For graph related types, prefix with `Graph` to avoid DOM collisions: `GraphNode`, `GraphEdge`, `GraphNodeUpdate`. Their IDs and metadata keep the short form: `NodeId`, `NodeTypeId`, `NodeMetadata`.
- Name an application class by its role. A class that orchestrates one domain concept through a `Deps` object is a `*Service`. A reusable mechanism takes its pattern noun instead (`*Bus`, `*Lock`, `*Runner`). A port implemented in a sibling package is named for its role (`Repository`, `Clock`, `Digest`), never `*Service`. A stateless helper shared by more than one caller is a camelCase function, not a single-method class.
- Prefer a precise noun over a vague one. Avoid `backend`, `persisted`, `data`, `item`, `temp` when a specific term exists. When two locals share a type but come from different sources, name them by origin (`storeSnapshot` vs `fileSnapshot`), not by a fuzzy label that could describe either one.
- Never name a variable with a bare adjective or participle. `existing`, `live`, `resumed`, and `removed` describe a thing without naming it, so carry the noun (`existingNode`, `liveRun`, `resumedPlan`, `removedEdges`).

## Lint and Format

- ESLint flat config (`@antfu/eslint-config`). After each nontrivial edit, run `pnpm lint:fix`.
- `@tsconfig/strictest` is on, except `noPropertyAccessFromIndexSignature: false` to coexist with antfu's `dot-notation`.
- `exactOptionalPropertyTypes: true` means you cannot pass `T | undefined` where `T?` is expected without an explicit guard.

## Tests

- Vitest. Coverage threshold 80% on every metric.
- Test file mirrors the source path: `src/domain/hitl/Proposal.ts` → `test/domain/hitl/Proposal.test.ts`.
- Test helpers (fakes / stubs) live under `test/fakes/`, not `src/`. Production code never imports from `test/`.
- Test descriptions can be sentence case (`'returns the candidate operations'`); the project disables `test/prefer-lowercase-title`.
- Always test status transition errors (e.g. `markApplied` on an already applied entity).

## Process

- After any edit: `pnpm lint:fix && pnpm typecheck && pnpm test`. Don't proceed if any are red.
- Coverage threshold is a gate, not a suggestion. If a new file drops coverage below 80%, add tests or refactor.
- Commits land at sprint boundaries, not after every micro step.
