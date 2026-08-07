// @newledge/ontology-knowledge — braid ontology plugin (bucket B).
//
// Scaffold placeholder. The real ontology lands in issue #7:
//   defineOntologyPlugin({ ontologyId: 'knowledge', nodeTypes, edgeTypes, sourceRoles })
// It must import ONLY the '@braidhq/sdk' public surface, never '@braidhq/core'
// internals, once the braid 0.2.0 dependency is wired (issue #6).

export const ONTOLOGY_ID = 'knowledge' as const

/** M0 minimal node set (see docs/03-ontology-draft.md). */
export type PlannedNodeType = 'Concept' | 'Claim' | 'Source'

/** M0 minimal edge set. */
export type PlannedEdgeType = 'introducedBy' | 'cites'

/** Ontology-declared source roles (braid #50): feed is unit-bearing, stance is sparse. */
export type PlannedSourceRole = 'feed' | 'stance'
