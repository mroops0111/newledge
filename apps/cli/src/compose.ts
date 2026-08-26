import type { AppDependencies } from '@braidhq/server'
import { claudeCodeAgentPlugin } from '@braidhq/agent-claude-code'
import { PluginRegistry } from '@braidhq/core'
import { composeFsAppWithRegistry, createApp } from '@braidhq/server'
import { kuzuStoragePlugin } from '@braidhq/storage-kuzu'
import type { WebSearchProvider } from '@newledge/source-loader-web'
import { knowledgeOntology } from '@newledge/ontology-knowledge'
import { createWebSourceLoaderPlugin } from '@newledge/source-loader-web'
import { mountBoards } from './boards.js'

export type KnowledgeApp = ReturnType<typeof createApp>

export interface KnowledgeRuntimeOptions {
  readonly braidHome: string
  readonly apiUrl: string
}

export interface KnowledgeRuntime {
  readonly deps: AppDependencies
  readonly app: KnowledgeApp
}

/**
 * Compose the braid runtime over a curated registry,
 * only the plugins Newledge uses, so none of braid's coding-preset defaults load.
 * kuzu storage and the claude-code agent are reused off the shelf,
 * and the knowledge ontology is the only one registered,
 * so the workspace default ontology resolves to it.
 * The retrieval provider is injected,
 * so the caller chooses the real fetcher or a fake.
 */
export async function composeKnowledgeRuntime(
  provider: WebSearchProvider,
  options: KnowledgeRuntimeOptions,
): Promise<KnowledgeRuntime> {
  const deps = await composeFsAppWithRegistry(() => {
    const registry = new PluginRegistry()
    registry.register(kuzuStoragePlugin)
    registry.register(claudeCodeAgentPlugin)
    registry.register(knowledgeOntology)
    registry.register(createWebSourceLoaderPlugin(provider))
    return registry
  }, { braidHome: options.braidHome, apiUrl: options.apiUrl })

  const app = createApp(deps, { apiUrl: options.apiUrl })
  // A board is Newledge's own view state, so its routes ride alongside braid's.
  mountBoards(app, deps)
  return { deps, app }
}
