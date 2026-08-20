import { homedir } from 'node:os'
import { join } from 'node:path'
import type { WebSearchProvider } from '@newledge/source-loader-web'
import { subprocessWebSearchProvider } from '@newledge/source-loader-web'
import { composeKnowledgeRuntime } from './compose.js'
import { ingest } from './ingest.js'
import { directoryWebSearchProvider } from './providers.js'
import { ensureWorkspace, report, syncFeed } from './run.js'

process.env.BRAID_LOCAL_TRUST ??= 'true'

const API_URL = 'http://localhost:4321'
const PORT = 4321

// A local corpus directory stands in until the real web fetcher lands,
// otherwise a subprocess command supplies live results.
function resolveProvider(): WebSearchProvider {
  const corpus = process.env.NEWLEDGE_CORPUS_DIR
  if (corpus)
    return directoryWebSearchProvider(corpus)
  const command = process.env.NEWLEDGE_FETCHER
  if (!command)
    throw new Error('Set NEWLEDGE_CORPUS_DIR to a local corpus, or NEWLEDGE_FETCHER to a web-search command')
  return subprocessWebSearchProvider({ command })
}

async function main(): Promise<void> {
  const braidHome = process.env.NEWLEDGE_HOME ?? join(homedir(), '.newledge')
  const feed = { query: process.env.NEWLEDGE_QUERY ?? 'knowledge', maxResults: 10 }

  const runtime = await composeKnowledgeRuntime(resolveProvider(), { braidHome, apiUrl: API_URL })
  const workspaceId = await ensureWorkspace(runtime, feed)
  await syncFeed(runtime.deps, workspaceId)
  await ingest(runtime, workspaceId, PORT)

  const counts = await report(runtime.deps, workspaceId)
  console.log(`newledge: ${counts.proposals} proposals and ${counts.clarifications} clarifications await your review`)
  console.log(`graph holds ${counts.nodes} absorbed nodes under '${braidHome}'`)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exitCode = 1
})
