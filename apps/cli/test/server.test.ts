import type { WebSearchProvider } from '@newledge/source-loader-web'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { composeKnowledgeRuntime } from '../src/compose.js'
import { ensureWorkspace, WORKSPACE_NAME } from '../src/run.js'
import { listen, untilInterrupted } from '../src/server.js'

process.env.BRAID_LOCAL_TRUST = 'true'

const PORT = 4402
const fakeProvider: WebSearchProvider = { search: async () => [] }

describe('served runtime', () => {
  let braidHome: string
  let runtime: Awaited<ReturnType<typeof composeKnowledgeRuntime>>
  let server: ReturnType<typeof listen>

  beforeAll(async () => {
    braidHome = await mkdtemp(join(tmpdir(), 'newledge-serve-'))
    runtime = await composeKnowledgeRuntime(fakeProvider, { braidHome, apiUrl: `http://localhost:${PORT}` })
    await ensureWorkspace(runtime, { query: 'test' })
    server = listen(runtime, PORT)
  })
  afterAll(async () => {
    server.close()
    await rm(braidHome, { recursive: true, force: true })
  })

  it('answers over the listening port so a reading UI can reach it', async () => {
    const response = await fetch(`http://localhost:${PORT}/workspaces/${WORKSPACE_NAME}/proposals`)
    expect(response.ok).toBe(true)
  })

  it('serves the workspace the runtime composed', async () => {
    const response = await fetch(`http://localhost:${PORT}/workspaces/${WORKSPACE_NAME}`)
    const body = await response.json() as { workspace?: { productManifest?: { ontologyId?: string } } }
    expect(body.workspace?.productManifest?.ontologyId ?? 'knowledge').toBe('knowledge')
  })

  it('exposes the graph as empty until a proposal is applied', async () => {
    const response = await fetch(`http://localhost:${PORT}/workspaces/${WORKSPACE_NAME}/nodes`)
    const body = await response.json() as { nodes?: unknown[] }
    expect(body.nodes ?? []).toEqual([])
  })
})

describe('untilInterrupted', () => {
  it('resolves once the process is interrupted', async () => {
    const interrupted = untilInterrupted()
    process.emit('SIGINT')
    await expect(interrupted).resolves.toBeUndefined()
  })
})
