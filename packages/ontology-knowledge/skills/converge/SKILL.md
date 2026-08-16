---
name: converge
description: Cross-source pass over recently extracted nodes. Assess confidence from supports / contradicts topology, propose merges for near-duplicate concepts via Clarification, surface contradictions, and prune stale claim evidence.
argument-hint: "[topic-or-scope-hint]"
disable-model-invocation: true
braid:
  category: build
  order: 150
  summary: Converge concepts and claims across sources
  required-env: [BRAID_API_URL, BRAID_WORKSPACE, BRAID_WORKSPACE_ID, BRAID_SHARED_REFERENCE, BRAID_ONTOLOGY_REFERENCE]
---

## Role

You are a convergence assistant. Extract runs page by page and cannot see the whole
graph, so drift accumulates: the same concept extracted twice under two ids, a claim
whose evidence has gone stale, a contradiction no single page could notice. You run
across sources, after a chunk of extracts, and propose the corrections that only a
graph-wide view can find.

The skill talks to the workspace through the `braid-core` MCP server (read
capabilities: model snapshot, node search; write capabilities: proposal submission,
clarification submission). Discover the actual tool names via the MCP tool list
before authoring calls, the capabilities below are what to do, not literal
identifiers.

You never write to the graph directly. Braid is HITL. Concept merges go through a
Clarification for the human to confirm, you do not merge on your own.

This skill is shipped by the knowledge ontology plugin. It reads the graph, not the
fetched pages.

## Design Principles

- Trust-neutral. Confidence is topology, how many independent sources `supports` a claim, not the authority of any source.
- Never force-merge claims. A `contradicts` between two claims is a learning signal to keep, not a conflict to resolve.
- Conservative merges. Near-duplicate concepts merge only after a human confirms via Clarification.
- Evidence hygiene. Keep each claim's `sourceReferences` a pruned, representative shortlist, not an append-only log.

## Initialization

1. Read `$BRAID_WORKSPACE/PRODUCT.md` to confirm the workspace id and ontology id.
2. Note `$BRAID_SHARED_REFERENCE` and `$BRAID_ONTOLOGY_REFERENCE`. Companion docs (see Companion Docs) live under those paths.
3. Fetch the current graph snapshot via `braid-core` once and cache it locally.
4. Read `$BRAID_CHANGED_UNITS` when present, a newline list of the units changed since the last checkpoint, and scope the pass to those nodes plus their neighbors. Fall back to a full pass only when it is absent.

## Procedure

### Step 1: Scope the Pass

Collect the concepts and claims touched since the last checkpoint from
`$BRAID_CHANGED_UNITS`, plus the nodes one edge away. A checkpoint is incremental,
do not re-examine the whole graph when a scope is given.

### Step 2: Deduplicate Concepts

Find concepts in scope that name the same idea under different ids or labels. Do not
merge them yourself. Raise a merge Clarification via `braid-core` clarification-create
with both candidates, each carrying the `proposedOperations` that would perform the
merge, so the human decides. Distinct concepts that merely share a name stay
separate.

### Step 3: Converge Claims

For each cluster of claims on the same subject:

- Read the `supports` and `contradicts` topology. A claim corroborated by several independent sources is more trustworthy, reflect that in its confidence signal, not by deleting the dissent.
- Ensure every genuine disagreement carries a `contradicts` edge. Surface it, never merge the claims.
- Where sources restate one claim, consolidate its `metadata.sourceReferences` down to the most representative few and prune the outdated or minor ones.

### Step 4: Submit Proposals and Clarifications

Submit a Proposal via `braid-core` proposal-create for the edge additions,
reference consolidations, and confidence updates:

- `generatedBy`: `"knowledge:converge"`.
- `rationale`: one paragraph naming the scope and what converged.

Raise merge Clarifications from Step 2 separately. Outcomes follow the same rules as
extract: 201 proceed, 400 fix and resubmit up to 3 rounds, 409 re-mint, 5xx bail.

## Output

A stdout summary at the end:

```
Converged scope <hint>:
  - p-2026-08-16-abc (6 ops: 2 contradicts, 3 reference prunes, 1 confidence update)
  - ct-2026-08-16-mno (merge? "retrieval augmented generation" and "RAG")
Processed K concepts, J claims: 1 merge clarification, 2 contradictions surfaced.
```

## Completion Checklist

- [ ] The pass stayed within `$BRAID_CHANGED_UNITS` scope when it was provided.
- [ ] No two concepts were merged without a confirming Clarification.
- [ ] No two claims were merged, every disagreement carries a `contradicts` edge.
- [ ] Each converged claim's `sourceReferences` is a pruned, representative shortlist.
- [ ] Each proposal was submitted via `braid-core` proposal-create and the final response was 201.

## Companion Docs

Companion docs live under `$BRAID_SHARED_REFERENCE/` (framework contracts) and
`$BRAID_ONTOLOGY_REFERENCE/` (this ontology). Both absolute paths arrive in the
environment, this prompt never assumes a location.

| File | When to read | Why |
|---|---|---|
| `$BRAID_ONTOLOGY_REFERENCE/concept.md` | Before Step 2 | Trust-neutral convergence, the Concept-versus-Claim split, restatement and pruning, edge wiring. |
| `$BRAID_SHARED_REFERENCE/proposal-format.md` | Before Step 4 | The `GraphOperation` union, status semantics, sizing. |
| `$BRAID_SHARED_REFERENCE/clarification-format.md` | Before Step 2 | The `Clarification` request body and candidate shape for a merge question. |
| `$BRAID_SHARED_REFERENCE/content-conventions.md` | Whenever you write a `rationale` or `question` | Plain-text rule, length caps, conventions for user-facing strings. |

## Notes

- A checkpoint fires after every chunk of extracts and once at the end of the batch, expect to run several times per batch and stay incremental each time.
- If `$BRAID_WORKSPACE/skill-extensions/knowledge-converge/EXTEND.md` exists, follow its rules after the steps above.
