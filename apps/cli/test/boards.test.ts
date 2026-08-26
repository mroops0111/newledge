import type { WebSearchProvider } from '@newledge/source-loader-web'
import { readFile } from 'node:fs/promises'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { composeKnowledgeRuntime } from '../src/compose.js'
import { ensureWorkspace, WORKSPACE_NAME } from '../src/run.js'

process.env.BRAID_LOCAL_TRUST = 'true'

const fakeProvider: WebSearchProvider = { search: async () => [] }

async function put(app: Awaited<ReturnType<typeof composeKnowledgeRuntime>>['app'], body: unknown): Promise<Response> {
  return app.request(`/workspaces/${WORKSPACE_NAME}/boards`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('board view state', () => {
  let braidHome: string
  let runtime: Awaited<ReturnType<typeof composeKnowledgeRuntime>>

  beforeAll(async () => {
    braidHome = await mkdtemp(join(tmpdir(), 'newledge-boards-'))
    runtime = await composeKnowledgeRuntime(fakeProvider, { braidHome, apiUrl: 'http://localhost:4401' })
    await ensureWorkspace(runtime, { query: 'test' })
  })
  afterAll(async () => {
    await rm(braidHome, { recursive: true, force: true })
  })

  it('reads a workspace that has never been arranged as having no boards', async () => {
    const response = await runtime.app.request(`/workspaces/${WORKSPACE_NAME}/boards`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ boards: [] })
  })

  it('keeps an arrangement, and hands the same one back', async () => {
    const state = {
      boards: [{
        id: 'b1',
        name: 'Retrieval',
        cards: [{ nodeId: 'rag', x: 40, y: 80 }],
        sections: [{ id: 's1', name: 'Basics', x: 0, y: 0, width: 300, height: 200 }],
      }],
    }
    expect((await put(runtime.app, state)).status).toBe(200)

    const read = await runtime.app.request(`/workspaces/${WORKSPACE_NAME}/boards`)
    expect(await read.json()).toEqual(state)
  })

  it('writes beside the knowledge, so an arrangement travels with the workspace', async () => {
    const path = join(braidHome, 'workspaces', WORKSPACE_NAME, 'artifacts', 'boards.json')
    const written = JSON.parse(await readFile(path, 'utf-8')) as { boards: { name: string }[] }
    expect(written.boards[0]?.name).toBe('Retrieval')
  })

  it('refuses an arrangement it could not draw', async () => {
    const noExtent = {
      boards: [{ id: 'b1', name: 'Retrieval', sections: [{ id: 's1', name: 'X', x: 0, y: 0, width: 0, height: 10 }] }],
    }
    const response = await put(runtime.app, noExtent)
    expect(response.status).toBe(400)
  })

  it('leaves the last good arrangement in place when one is refused', async () => {
    const read = await runtime.app.request(`/workspaces/${WORKSPACE_NAME}/boards`)
    const state = await read.json() as { boards: { name: string }[] }
    expect(state.boards[0]?.name).toBe('Retrieval')
  })
})
