import type { WebSearchProvider } from '@newledge/source-loader-web'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { composeKnowledgeRuntime } from '../src/compose.js'
import { ensureWorkspace, WORKSPACE_NAME } from '../src/run.js'

process.env.BRAID_LOCAL_TRUST = 'true'

const fakeProvider: WebSearchProvider = { search: async () => [] }

describe('asking for a view of a board', () => {
  let braidHome: string
  let runtime: Awaited<ReturnType<typeof composeKnowledgeRuntime>>
  let root: string

  beforeAll(async () => {
    braidHome = await mkdtemp(join(tmpdir(), 'newledge-board-views-'))
    runtime = await composeKnowledgeRuntime(fakeProvider, { braidHome, apiUrl: 'http://localhost:4403' })
    await ensureWorkspace(runtime, { query: 'test' })
    root = (await runtime.deps.workspaceService.findById(WORKSPACE_NAME as never)).rootPath
    await runtime.app.request(`/workspaces/${WORKSPACE_NAME}/boards`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boards: [{ id: 'b1', name: 'Retrieval', cards: [], sections: [] }] }),
    })
  })

  afterAll(async () => {
    await rm(braidHome, { recursive: true, force: true })
  })

  const ask = async (boardId: string, body: unknown): Promise<Response> =>
    runtime.app.request(`/workspaces/${WORKSPACE_NAME}/boards/${boardId}/views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  it('projects the board before it asks anyone to write about it', async () => {
    // Starting the agent needs a live server this test does not stand up,
    // so the request does not finish. The material is written first either way,
    // which is the ordering worth pinning.
    // A skill is never asked to write about a board not yet projected.
    await ask('b1', { form: 'reference' }).catch(() => undefined)

    const at = join(root, 'artifacts', 'material', 'learning', 'b1.json')
    const material = JSON.parse(await readFile(at, 'utf-8')) as { title: string, held: unknown[] }
    expect(material.title).toBe('Retrieval')
    expect(material.held).toEqual([])
  })

  it('keeps the material out of the views a reader is offered', async () => {
    // What a skill reads to write a page is machinery,
    // and a reader offered it among the views would be offered that.
    await ask('b1', { form: 'reference' }).catch(() => undefined)
    const listed = await (await runtime.app.request(`/workspaces/${WORKSPACE_NAME}/views`)).json() as {
      items: { path: string }[]
    }
    expect(listed.items.map(one => one.path)).not.toContain('material/learning/b1.json')
  })

  it('refuses a form nobody ships a skill for, before anyone is asked', async () => {
    const response = await ask('b1', { form: 'poem' })
    expect(response.status).toBe(400)
  })

  it('says the board is missing rather than failing at it', async () => {
    const response = await ask('gone', { form: 'reference' })
    expect(response.status).toBe(404)
    expect(await response.text()).toContain('not one this workspace holds')
  })
})
