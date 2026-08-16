import type { WebSearchProvider } from '@newledge/source-loader-web'
import { composeKnowledgeApp } from './compose.js'

// This entry only composes and introspects, so a no-op provider suffices.
const provider: WebSearchProvider = { search: () => Promise.resolve([]) }

async function main(): Promise<void> {
  const { pluginRegistry, workspaceService, workspaceId } = await composeKnowledgeApp(provider)
  const workspace = await workspaceService.findById(workspaceId)
  const ontology = pluginRegistry.requireOntology(workspace.productManifest.ontologyId)
  console.log(`newledge: composed workspace '${workspaceId}' on ontology '${ontology.ontologyId}'`)
  console.log(`node types: ${ontology.nodeTypes.map(n => n.id).join(', ')}`)
  console.log(`edge types: ${ontology.edgeTypes.map(e => e.id).join(', ')}`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exitCode = 1
})
