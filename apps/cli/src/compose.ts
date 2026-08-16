import type { AbsolutePath, WorkspaceId } from '@braidhq/schema'
import { PluginRegistry, Workspace, WorkspaceService } from '@braidhq/core'
import { InMemoryWorkspaceRepository } from '@braidhq/core/in-memory'
import { ProductManifest } from '@braidhq/schema'
import type { WebSearchProvider } from '@newledge/source-loader-web'
import { knowledgeOntology, ONTOLOGY_ID } from '@newledge/ontology-knowledge'
import { createWebSourceLoaderPlugin } from '@newledge/source-loader-web'

export interface KnowledgeApp {
  readonly pluginRegistry: PluginRegistry
  readonly workspaceService: WorkspaceService
  readonly workspaceId: WorkspaceId
}

/**
 * Compose an in-memory braid app with Newledge's plugins registered.
 * This mirrors composeApp's in-memory path over @braidhq/core,
 * so the CLI stays pure-JS with no native storage.
 * The retrieval provider is injected,
 * so the caller chooses the real web-search fetcher or a fake.
 */
export async function composeKnowledgeApp(provider: WebSearchProvider): Promise<KnowledgeApp> {
  const pluginRegistry = new PluginRegistry()
  pluginRegistry.register(knowledgeOntology)
  pluginRegistry.register(createWebSourceLoaderPlugin(provider))

  const workspaceService = new WorkspaceService({
    workspaceRepository: new InMemoryWorkspaceRepository(),
    pluginRegistry,
  })

  const workspaceId = 'newledge' as WorkspaceId
  const productManifest = ProductManifest.parse({
    name: workspaceId,
    ontologyId: ONTOLOGY_ID,
    storage: { kind: 'in-memory', config: {} },
  })
  await workspaceService.save(new Workspace({
    id: workspaceId,
    rootPath: '/virtual/newledge' as AbsolutePath,
    productManifest,
  }))

  return { pluginRegistry, workspaceService, workspaceId }
}
