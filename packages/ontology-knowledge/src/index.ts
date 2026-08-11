import { defineOntologyPlugin } from '@braidhq/sdk'

/**
 * Reference to the braid entry point this plugin is built on. A scaffold
 * placeholder that proves the dependency resolves and typechecks; the real
 * plugin declares its node types, edge types, and source roles as data passed
 * to `defineOntologyPlugin`, so new types are added by extending that data
 * rather than editing a closed union.
 */
export type DefineOntologyPlugin = typeof defineOntologyPlugin

/** The ontology id this plugin declares. */
export const ONTOLOGY_ID = 'knowledge' as const
