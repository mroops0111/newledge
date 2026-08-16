# Knowledge ontology reference

The single source of vocabulary, wiring rules, and id conventions for the
`knowledge` ontology. Every `knowledge:` skill consults this file before it
authors an operation. When a rule here disagrees with a prompt, this file wins.

## What newledge is building

newledge is a learning tool wearing a whiteboard. The retrieval loader and these
skills do the throughput, reading far more than a person could, so the human is
left with the one job that does not transfer: absorbing. The graph is the record
of what has been read and how it fits together, and the human passes each node by
understanding it, not by collecting it. Keep every proposal small and legible so a
person can actually absorb it.

## Trust-neutral by design

There is no privileged source and no ground truth to reconcile toward. Confidence
is a property of the graph's topology, not of any one source's authority: a claim
grows trustworthy when independent sources `supports` it, and a disagreement is
kept as a `contradicts` edge rather than resolved by fiat. This is why the build
flow is extract then converge, not extract then reconcile. Never pick a winner
between two conflicting claims. Surface the conflict and let the human learn from
it.

## Node types

| Type | What it is | Rule of thumb |
|---|---|---|
| `Concept` | A durable unit of knowledge, an idea, a technique, or a definition. | The dominant node. Dedupe aggressively, two ids for one idea is a defect. |
| `Claim` | A specific assertion with a truth value the human can accept, reject, or contest. | Carries provenance to the exact source moment. Never force-merge conflicting claims. |
| `Source` | An ingested artifact, a web page or article, with its metadata. | The anchor every claim traces back to. One per fetched page. |
| `Topic` | A named grouping or theme, reusable and nestable. | Many-to-many, a node can sit under several topics. |

### Concept versus Claim

The split is load-bearing. A `Concept` is a thing that endures (RAG, embeddings,
context windows). A `Claim` is something asserted about the world that could be
right or wrong (a benchmark number, a design tradeoff, a cause-effect statement).
Concepts converge by merging duplicates. Claims converge by accumulating
`supports` and `contradicts`, never by merging away a disagreement.

## Edge types

Every edge is an active present-tense verb read from source to target. Each has one
canonical direction. Do not invent edge ids, use only the ids below.

| Edge | From to To | Meaning |
|---|---|---|
| `extends` | Concept to Concept | The source is a specialization or kind of the target (is-a). GraphRAG extends RAG. |
| `instantiates` | Concept to Concept | The source is a concrete instance of a type concept. GPT-4 instantiates FoundationModel. |
| `contains` | Concept to Concept | The source contains the target as a component, whole to part. |
| `uses` | Concept to Concept | The source functionally depends on the target. RAG uses Embedding. |
| `relatesTo` | Concept to Concept | Generic association, the catch-all used only when no more specific edge fits. |
| `belongsTo` | Concept, Claim, or Topic to Topic | The source is filed under the target topic, or a topic nests under a topic. |
| `introduces` | Source to Concept or Claim | The source that first established the target. Nothing durable exists without one. |
| `supports` | Claim to Claim | The source corroborates the target, possibly across sources. The convergence signal. |
| `contradicts` | Claim to Claim | The source conflicts with the target. Surfaced, never force-merged. |

### The stop rule for association

Reach for `uses` first. Fall back to `relatesTo` only when no more specific edge
fits. A graph full of `relatesTo` carries no structure and teaches nothing.

## Evidence gate

Every `Concept` and `Claim` you emit must carry provenance in
`metadata.sourceReferences`, each pointing at a `Source` and the location inside
it. A node with an empty `sourceReferences` and no other justification is rejected
by the server validator. A fetched page embeds its origin as an HTML comment on the
first line, `<!-- source-url: ... -->`, use that url as the source reference.

## Restatement and source pruning

When a later source restates a claim the graph already holds, do not add a
duplicate `Claim`. Add the new source to the existing claim's
`metadata.sourceReferences`, then keep only the most representative few and prune
the outdated or minor ones. A claim's reference list is a curated shortlist of its
best evidence, not an append-only log. Add a `supports` edge only when a genuinely
distinct claim corroborates another, not for a plain restatement of the same claim.

## Id conventions

- Concept ids are lowerCamelCase of the idea, `graphRag`, `contextWindow`.
- Claim ids are short and content-derived, they are not sentences.
- Source ids derive from the fetched page. Topic ids are lowerCamelCase of the theme.
- Ids are a hint for humans. The `type` field is the contract, and it must equal one
  of the ontology's `nodeTypes[].id` or `edgeTypes[].id` exactly, case-sensitive.

## Clarifications

Raise a Clarification only for an identity question a human must answer: is this the
same concept as one already in the graph, or a distinct one that happens to share a
name. Write the question and each candidate description in plain language a learner
reads, not in graph topology or ids. Put the ids and the reasoning in the `context`
field, which has no audience constraint.
