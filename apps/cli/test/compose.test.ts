import type { WebSearchProvider } from '@newledge/source-loader-web'
import { describe, expect, it } from 'vitest'
import { composeKnowledgeApp } from '../src/compose.js'

const fakeProvider: WebSearchProvider = { search: () => Promise.resolve([]) }

describe('composeKnowledgeApp', () => {
  it('registers the knowledge ontology in braid and reads it back through the registry', async () => {
    const { pluginRegistry, workspaceService, workspaceId } = await composeKnowledgeApp(fakeProvider)
    const workspace = await workspaceService.findById(workspaceId)
    const ontology = pluginRegistry.requireOntology(workspace.productManifest.ontologyId)

    expect(ontology.ontologyId).toBe('knowledge')
    expect(ontology.nodeTypes.map(n => n.id)).toEqual(['Concept', 'Claim', 'Source', 'Topic'])
    expect(ontology.edgeTypes.map(e => e.id)).toEqual(['extends', 'instantiates', 'contains', 'uses', 'relatesTo', 'belongsTo', 'introduces', 'supports', 'contradicts'])
  })

  it('scaffolds the knowledge workspace on the in-memory store', async () => {
    const { workspaceService, workspaceId } = await composeKnowledgeApp(fakeProvider)
    const workspace = await workspaceService.findById(workspaceId)
    expect(workspace.id).toBe('newledge')
    expect(workspace.productManifest.ontologyId).toBe('knowledge')
  })
})
