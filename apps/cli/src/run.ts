import type { WorkspaceId } from '@braidhq/schema'
import type { AppDependencies } from '@braidhq/server'
import { SourceId, WorkspaceId as WorkspaceIdSchema } from '@braidhq/schema'
import type { KnowledgeApp, KnowledgeRuntime } from './compose.js'

export const WORKSPACE_NAME = 'knowledge'
const FEED_SOURCE_ID = 'feed'
const FEED_PATH = './feeds/web'

export interface FeedQuery {
  readonly query: string
  readonly maxResults?: number
}

export interface IngestReport {
  readonly proposals: number
  readonly clarifications: number
  readonly nodes: number
}

// braid derives the workspace id from its name, so the name is the id.
async function workspacePresent(deps: AppDependencies, id: WorkspaceId): Promise<boolean> {
  try {
    await deps.workspaceService.findById(id)
    return true
  }
  catch {
    return false
  }
}

/**
 * Scaffold the knowledge workspace with one web feed source.
 * Scaffolding provisions the source, so the fetched pages land on disk.
 */
export async function scaffoldWorkspace(app: KnowledgeApp, feed: FeedQuery): Promise<WorkspaceId> {
  const response = await app.request('/workspaces/scaffold', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: WORKSPACE_NAME,
      manifest: {
        name: WORKSPACE_NAME,
        ontologyId: 'knowledge',
        sources: [{
          kind: 'filesystem',
          id: FEED_SOURCE_ID,
          role: 'feed',
          name: 'web',
          path: FEED_PATH,
          loader: { kind: 'web', config: { query: feed.query, maxResults: feed.maxResults ?? 10 } },
        }],
      },
    }),
  })
  if (!response.ok)
    throw new Error(`Workspace scaffold failed with ${response.status}, ${await response.text()}`)
  const body = await response.json() as { workspace: { id: string } }
  return WorkspaceIdSchema.parse(body.workspace.id)
}

/** Ensure the workspace exists, scaffolding it on the first run and reusing it after. */
export async function ensureWorkspace(runtime: KnowledgeRuntime, feed: FeedQuery): Promise<WorkspaceId> {
  const id = WorkspaceIdSchema.parse(WORKSPACE_NAME)
  if (await workspacePresent(runtime.deps, id))
    return id
  return scaffoldWorkspace(runtime.app, feed)
}

/** Pull fresh pages for the feed source onto disk before extraction. */
export async function syncFeed(deps: AppDependencies, id: WorkspaceId): Promise<void> {
  const workspace = await deps.workspaceService.findById(id)
  await deps.sourceLoaderRunner.syncOne(workspace, SourceId.parse(FEED_SOURCE_ID))
}

/** Count what waits for review, and how much of the graph you have absorbed. */
export async function report(deps: AppDependencies, id: WorkspaceId): Promise<IngestReport> {
  const proposals = await deps.proposalRepository.list({ workspaceId: id })
  const clarifications = await deps.clarificationRepository.list({ workspaceId: id })
  const snapshot = await deps.modelService.getSnapshot(id)
  return {
    proposals: proposals.length,
    clarifications: clarifications.length,
    nodes: snapshot.nodes.length,
  }
}
