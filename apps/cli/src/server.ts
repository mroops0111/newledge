import { serve } from '@hono/node-server'
import type { KnowledgeRuntime } from './compose.js'

export interface RunningServer {
  readonly close: () => void
}

/**
 * Listen on the runtime's HTTP surface, the full braid route set.
 * An ingestion batch needs it so the skill agent can call back,
 * and the reading UI needs it for as long as a reader is working.
 */
export function listen(runtime: KnowledgeRuntime, port: number): RunningServer {
  const server = serve({ fetch: runtime.app.fetch, port })
  return { close: () => server.close() }
}

/** Resolve once the process is interrupted, so a served runtime shuts down cleanly. */
export function untilInterrupted(): Promise<void> {
  return new Promise((resolve) => {
    const stop = (): void => resolve()
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  })
}
