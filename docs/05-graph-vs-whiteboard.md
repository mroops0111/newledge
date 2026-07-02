# Graph Versus Whiteboard

The most important conceptual distinction in Newledge is that three "graphs" are easy to conflate, and conflating them is the trap. This document separates them.

## The Three Graphs

Name them so they stop blurring together.

- **braid's Model (the IR graph)**: canonical, ontology-typed, evidence-backed nodes and edges. The SSoT.
- **Newledge's knowledge graph (the brain)**: `Concept`, `Claim`, `Source`, `Topic`, `Question` nodes with semantic edges.
- **The whiteboard**: Heptabase-style cards, spatial connections, and boards.

## Model And Knowledge Graph Are The Same Thing

The first two are not two graphs. They are one.

- **Newledge's knowledge graph is braid's Model.** Same graph, same meaning. The `ontology-knowledge` plugin is what makes braid's generic node-and-edge model mean "concepts and claims" instead of "aggregates and commands".
- This is identical to everstory, where canon is braid's Model with a story ontology, not a view of it.
- So the knowledge graph is not a view of the braid graph. It **is** the braid graph.

## The Whiteboard Is A View

The third graph is the one that is "just a view", and it is a special bidirectional one.

- **The Model is complete and machine-canonical.** All your knowledge, typed, evidence-backed. Not spatial, not arranged for reading.
- **The whiteboard is a curated spatial arrangement of a selected subset**, plus your own free-form cards. Not every node is on a board. A node can be on many boards. Position and grouping are view state.
- **Read direction**: `Model → whiteboard`. Render a selected subgraph as cards and connections. This is a braid Generator / View.
- **Write direction**: `whiteboard edit → Proposal → apply(gate: auto) → Model`. This is the writeback view, the one genuinely new braid concept (braid #65).

## Graph Edges Are Not Whiteboard Connections

A subtle but load-bearing point: the two kinds of link are not the same, and should not be forced to be.

- **A graph edge is semantic and evidence-derived.** `X contradicts Y` is a typed claim with provenance.
- **A whiteboard connection is a human gesture.** An arrow you drew, which may or may not be semantic.
- **They inform each other, they are not one-to-one.** A user-drawn arrow can become a Proposal for a graph edge (writeback). A graph edge can be suggested as a whiteboard connection (render). Heptabase lives with the same distinction between card links and spatial arrangement.

## What The braid Graph Represents In Newledge

Stated plainly, so the answer is unambiguous.

- The braid graph in Newledge is **your canonical, evidence-backed personal knowledge**. Every `Concept` and `Claim` traces to the source that established it, down to the moment inside that source.
- **The whiteboard is how you see and shape it.** The graph is what actually persists and stays consistent.
- **Other views hang off the same graph**: the reading inbox, a Q&A over your brain, a daily digest. The whiteboard is the flagship view, not the only one.
