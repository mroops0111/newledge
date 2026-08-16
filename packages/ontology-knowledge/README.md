# @newledge/ontology-knowledge

The knowledge ontology for Newledge, declared as a third-party braid plugin. It
gives braid's generic node-and-edge model the meaning "concepts, claims, and their
relations" instead of DDD aggregates.

The type set is not arbitrary. It is a deliberate hybrid of established
frameworks, so every node and edge earns its place from learning science and
knowledge-organization practice rather than intuition:

- **Concept maps** (Novak & Gowin, 1984), grounded in **Ausubel's meaningful learning** (1968): knowledge is concepts joined by labelled relations, and you learn by connecting new material to what you already hold.
- **Toulmin's argument model** (1958): a claim stands on grounds, and is met by backing and rebuttal.
- **Conceptual change** (Posner, Strike, Hewson & Gertzog, 1982): surfaced conflict is what drives deep learning; this is why `contradicts` is first-class.
- **SKOS / ISO 25964** (the knowledge-organization standards): a minimal, principled backbone of hierarchical and associative relations, and the reason the edge set stays small (see the crosswalk below).

## Naming Convention

Every edge is an **active, present-tense, third-person-singular verb**, read as
"from verb to" (e.g. `GraphRAG extends RAG`). No adjectives, noun phrases, or
passive forms, so the graph reads as sentences and the extract skill has one
consistent shape to emit. Each edge has one canonical direction; how a line is
drawn on a whiteboard is a separate view concern.

## Node Types

| Node | What it is | Grounding |
| --- | --- | --- |
| **Concept** | A durable unit of knowledge — an idea, technique, definition. The dominant node. | Concept maps' *concept*; Ausubel — new concepts assimilate into your existing structure. |
| **Claim** | A specific assertion with a truth value you can accept, reject, or contest. | Toulmin's *claim* plus a concept-map *proposition*. Split from Concept because only claims have truth value, evidence, and support/contradict. |
| **Source** | An ingested artifact (web page, article, video…) — the provenance anchor. | Toulmin's *grounds/data*; the trust substrate for a domain with no ground truth. |
| **Topic** | A named, reusable, nestable, many-to-many grouping. | A concept-map section/domain made first-class (see Design Notes). |

## Edge Types

Nine edges in five families.

**Hierarchy** — kept as three distinct relations (ISO 25964), because is-a chains stay transitive while mixing part-of does not:

| Edge | Direction | Meaning |
| --- | --- | --- |
| `extends` | Concept → Concept | is-a / specialization, e.g. GraphRAG extends RAG. |
| `instantiates` | Concept → Concept | a concrete instance of a type, e.g. GPT-4 instantiates FoundationModel. |
| `contains` | Concept → Concept | whole → part composition, e.g. RAG contains its retriever. |

**Association**:

| Edge | Direction | Meaning |
| --- | --- | --- |
| `uses` | Concept → Concept | functional dependency, e.g. RAG uses Embedding. |
| `relatesTo` | Concept → Concept | generic association; the catch-all, used only when no more specific edge fits. |

**Categorization**:

| Edge | Direction | Meaning |
| --- | --- | --- |
| `belongsTo` | Concept / Claim / Topic → Topic | membership under a topic, or a topic nested under a topic. Many-to-many. |

**Provenance**:

| Edge | Direction | Meaning |
| --- | --- | --- |
| `introduces` | Source → Concept / Claim | the source that first established a node. |

**Argument** (Toulmin plus conceptual change):

| Edge | Direction | Meaning |
| --- | --- | --- |
| `supports` | Claim → Claim | corroboration, possibly across sources — the convergence signal. |
| `contradicts` | Claim → Claim | conflict, surfaced rather than force-merged, because conflict drives learning. |

## Avoiding Overlap

Three lines that are easy to blur, and the rule for each:

- **`extends` vs `instantiates`.** Between two types/concepts it is `extends` (a kind of); from a concrete instance to its type it is `instantiates`.
- **`uses` vs `relatesTo`.** `relatesTo` is the last resort. Reach for the specific edge first; fall back to `relatesTo` only when none fits. This is the stop rule against edge sprawl.
- **`contains` vs `belongsTo`.** `contains` is concept-to-concept composition; `belongsTo` always targets a `Topic`.

## SKOS / ISO 25964 Crosswalk

Newledge follows the standards' distinctions but keeps intuitive verb names. If
the graph is ever exported to a thesaurus, this is the mapping:

| Newledge | SKOS / ISO 25964 |
| --- | --- |
| `extends` | `iso-thes:broaderGeneric` (BTG) |
| `instantiates` | `iso-thes:broaderInstantial` (BTI) |
| `contains` | `iso-thes:broaderPartitive` (BTP), inverse |
| `relatesTo` | `skos:related` (RT) |
| `uses`, `belongsTo`, `introduces`, `supports`, `contradicts` | none — beyond thesaurus scope (OWL-style domain relations) |

## Design Notes

- **Concept vs Claim is the load-bearing split.** Concept maps distinguish *concepts* from *propositions*, and only a Claim carries a truth value, an evidence trail, and support/contradict relations.
- **Sections are `Topic` plus `belongsTo`.** A concept-map section is many-to-many, nestable, and a node can belong to several. A `Topic` node plus a many-to-many `belongsTo` edge gives exactly that: multi-membership is several `belongsTo` edges, nesting is a Topic → Topic `belongsTo`. The *semantic* group is ontology; the *visual* section box on a board is view state.
- **Direction is canonical, drawing is view.** Each edge stores one direction (e.g. `contains` runs whole → part; `extends` runs specialization → base). A whiteboard may draw a line either way and map it onto the canonical edge, so hierarchy directions are mixed on purpose (they read naturally) rather than uniform.
- **No ground truth.** No role is privileged as fact. Trust is reconstructed from provenance (`introduces`), cross-source convergence (`supports` / `contradicts`), and human curation. Confidence is derived from the support/contradict topology in a skill, not stored as a framework primitive.

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
- W3C (2009). *SKOS Simple Knowledge Organization System Reference.*
- ISO 25964-1:2011. *Thesauri for information retrieval.*
