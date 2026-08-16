# @newledge/ontology-knowledge

The knowledge ontology for Newledge, declared as a third-party braid plugin. It
gives braid's generic node-and-edge model the meaning "concepts, claims, and their
relations" instead of DDD aggregates.

The type set is not arbitrary. It is a deliberate hybrid of three established
frameworks, so every node and edge earns its place from learning science rather
than intuition:

- **Concept maps** (Novak & Gowin, 1984), grounded in **Ausubel's meaningful learning** (1968): knowledge is concepts joined by labelled relations, and you learn by connecting new material to what you already hold. This is the concept-structure layer.
- **Toulmin's argument model** (1958): a claim stands on grounds, and is met by backing and rebuttal. This is the evidence-and-argument layer.
- **Conceptual change** (Posner, Strike, Hewson & Gertzog, 1982): surfaced conflict is what drives deep learning. This is why `contradicts` is first-class, not bookkeeping.

## Node Types

| Node | What it is | Grounding |
| --- | --- | --- |
| **Concept** | A durable unit of knowledge — an idea, technique, definition. The dominant node. | Concept maps' *concept*; Ausubel — new concepts assimilate into your existing structure. |
| **Claim** | A specific assertion with a truth value you can accept, reject, or contest. | Toulmin's *claim* plus a concept-map *proposition*. Split from Concept because only claims have truth value, evidence, and support/contradict. |
| **Source** | An ingested artifact (web page, article, video…) — the provenance anchor. | Toulmin's *grounds/data*; the trust substrate for a domain with no ground truth. |
| **Topic** | A named, reusable, nestable, many-to-many grouping. | A concept-map section/domain made first-class (see Design Notes). |

## Edge Types

Two families.

**Concept-structure** — how concepts relate (the concept-map layer):

| Edge | Direction | Meaning |
| --- | --- | --- |
| `extends` | Concept → Concept | extension → base: one concept builds on or specializes another, e.g. GraphRAG extends RAG. |
| `uses` | Concept → Concept | functional dependency, e.g. RAG uses Embedding. |
| `contains` | Concept → Concept | whole → part: the mereological composition, e.g. RAG contains its retriever. |
| `about` | Concept / Claim / Topic → Topic | membership under a topic, or a topic nested under a topic. Many-to-many. |

Each edge has one canonical direction, fixed by its name (`contains` runs
whole → part; `extends` runs extension → base). How a line is drawn on a
whiteboard is a separate view concern that the board maps onto these edges, so a
node may be drawn hub-outward regardless of the stored direction.

**Evidence and argument** — where knowledge comes from, and how claims relate (Toulmin plus conceptual change):

| Edge | Direction | Meaning |
| --- | --- | --- |
| `introducedBy` | Concept / Claim → Source | the source that established this node. The provenance edge. |
| `supports` | Claim → Claim | corroboration, possibly across sources — the convergence signal. |
| `contradicts` | Claim → Claim | conflict, surfaced rather than force-merged, because conflict drives learning. |

## Design Notes

- **Concept vs Claim is the load-bearing split.** Concept maps distinguish *concepts* from *propositions*, and only a Claim carries a truth value, an evidence trail, and support/contradict relations. Collapsing them would either over-node everything as contestable, or lose the ability to surface disagreement.
- **No `cites`.** Provenance must be universal — every node, including a Concept, traces to a Source — which Toulmin's claim-specific *grounds* cannot be; and braid's evidence gate is satisfied by a node's `sourceReferences` metadata, not by a graph edge. So the single provenance edge is `introducedBy`, and a separate claim-only `cites` was redundant.
- **Sections are `Topic` plus `about`.** A concept-map section is many-to-many, nestable, and a node can belong to several. A `Topic` node plus a many-to-many `about` edge gives exactly that, natively: multi-membership is several `about` edges, nesting is a Topic → Topic `about`. The *semantic* group is ontology; the *visual* section box on a board is view state.
- **No ground truth.** No role is privileged as fact. Trust is reconstructed from provenance (`introducedBy`), cross-source convergence (`supports` / `contradicts`), and human curation. Confidence is derived from the support/contradict topology in a skill, not stored as a framework primitive.

## The Learning Tie-in

The ontology encodes a theory of learning, which is why it differs from a generic
knowledge graph:

- Ausubel's *meaningful learning* — you must connect new knowledge to your existing structure — is why extraction situates each candidate against the graph, and why a human reviews before it lands.
- Toulmin's *grounds* is why every claim must trace to a source (the evidence gate).
- Posner's *cognitive conflict* is why `contradicts` is surfaced for you to resolve rather than silently merged.

## References

- Ausubel, D. P. (1968). *Educational Psychology: A Cognitive View.*
- Novak, J. D., & Gowin, D. B. (1984). *Learning How to Learn.* Cambridge University Press.
- Toulmin, S. (1958). *The Uses of Argument.* Cambridge University Press.
- Posner, G. J., Strike, K. A., Hewson, P. W., & Gertzog, W. A. (1982). Accommodation of a scientific conception: Toward a theory of conceptual change. *Science Education, 66*(2).
