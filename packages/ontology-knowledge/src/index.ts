// @newledge/ontology-knowledge — braid ontology plugin.
//
// Scaffold placeholder. The real ontology lands in issue #7:
//   defineOntologyPlugin({ ontologyId: 'knowledge', nodeTypes, edgeTypes, sourceRoles })
// It imports ONLY the '@braidhq/sdk' public surface, never '@braidhq/core' internals.

import { defineOntologyPlugin } from '@braidhq/sdk'

/** Smoke reference proving the braid dependency resolves and typechecks. Issue #7 uses it for real. */
export type DefineOntologyPlugin = typeof defineOntologyPlugin

export const ONTOLOGY_ID = 'knowledge' as const

/** Minimal node set. */
export type PlannedNodeType = 'Concept' | 'Claim' | 'Source'

/** Minimal edge set. */
export type PlannedEdgeType = 'introducedBy' | 'cites'

/** Ontology-declared source roles (braid #50): feed is unit-bearing, stance is sparse. */
export type PlannedSourceRole = 'feed' | 'stance'
