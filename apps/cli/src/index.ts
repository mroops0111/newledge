import type { WebSearchProvider } from '@newledge/source-loader-web'
import { composeKnowledgeApp } from './compose.js'

// Retrieval is not exercised by this compose step, so a no-op provider is enough;
// the real web-search fetcher is wired for the end-to-end flow.
const provider: WebSearchProvider = { search: () => Promise.resolve([]) }

// CLI entry: compose the braid app with Newledge's plugins and print the active
// ontology, proving the plugins register in braid's engine. The end-to-end
// sync -> extract -> apply -> print flow builds on this.
async function main(): Promise<void> {
  const { pluginRegistry, workspaceService, workspaceId } = await composeKnowledgeApp(provider)
  const workspace = await workspaceService.findById(workspaceId)
  const ontology = pluginRegistry.requireOntology(workspace.productManifest.ontologyId)
  console.log(`newledge — composed workspace '${workspaceId}' on ontology '${ontology.ontologyId}'`)
  console.log(`node types: ${ontology.nodeTypes.map(n => n.id).join(', ')}`)
  console.log(`edge types: ${ontology.edgeTypes.map(e => e.id).join(', ')}`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exitCode = 1
})
