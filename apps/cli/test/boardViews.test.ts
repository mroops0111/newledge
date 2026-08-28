import type { WebSearchProvider } from '@newledge/source-loader-web'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { projectBoard } from '../src/boardViews.js'
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

  it('projects the board into material a skill can be handed', async () => {
    // Reached directly rather than through the route,
    // because the route goes on to start an agent,
    // and whether one is installed is not what is under test.
    const at = await projectBoard(runtime.deps, WORKSPACE_NAME as never, 'b1')
    expect(at).toBe(join('artifacts', 'material', 'handout', 'b1.json'))

    const material = JSON.parse(await readFile(join(root, at), 'utf-8')) as {
      title: string
      held: unknown[]
    }
    expect(material.title).toBe('Retrieval')
    expect(material.held).toEqual([])
  })

  it('keeps the material out of the views a reader is offered', async () => {
    // What a skill reads to write a page is machinery,
    // and a reader offered it among the views would be offered that.
    await projectBoard(runtime.deps, WORKSPACE_NAME as never, 'b1')
    const listed = await (await runtime.app.request(`/workspaces/${WORKSPACE_NAME}/views`)).json() as {
      items: { path: string }[]
    }
    expect(listed.items.map(one => one.path)).not.toContain('material/handout/b1.json')
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

  it('refuses before it reaches the agent, so a bad ask costs nothing', async () => {
    // Both refusals land before anything is spawned,
    // which is why they can be tested on a machine with no agent on it.
    expect((await ask('b1', { form: 'poem' })).status).toBe(400)
    expect((await ask('gone', { form: 'reference' })).status).toBe(404)
  })
})
