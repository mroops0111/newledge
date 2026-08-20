import type { WorkspaceId } from '@braidhq/schema'
import { serve } from '@hono/node-server'
import type { KnowledgeRuntime } from './compose.js'

const TERMINAL_STATUSES = ['completed', 'failed', 'stopped', 'archived']
const POLL_INTERVAL_MS = 5000

/**
 * Run one ingestion batch, emitting Proposals and Clarifications without applying them.
 * The graph grows only when you review and apply, which is the absorption gate,
 * so this never writes the graph itself.
 * A transient server listens so the skill agent can call back over the braid-core MCP.
 */
export async function ingest(runtime: KnowledgeRuntime, id: WorkspaceId, port: number): Promise<void> {
  const batchService = runtime.deps.batchService
  if (!batchService)
    throw new Error('The runtime did not wire a batch service')

  const server = serve({ fetch: runtime.app.fetch, port })
  try {
    await batchService.start(id, { autoApply: false })
    for (;;) {
      const plan = await batchService.getStatus(id)
      const status = plan?.toData().status
      if (status === undefined || TERMINAL_STATUSES.includes(status))
        break
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  }
  finally {
    server.close()
  }
}
