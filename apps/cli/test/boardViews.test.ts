import type { WebSearchProvider } from '@newledge/source-loader-web'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DECK_WORKSPACE, formOfId } from '@newledge/view-generator-handout/forms'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { projectBoard, settingsFor, unsetIn } from '../src/boardViews.js'
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

  it('refuses a form whose setting is unset, rather than failing mid-run', async () => {
    // A deck goes to the workspace that plays it and is styled by that
    // workspace's theme, so with nowhere named there is nothing to write.
    delete process.env[DECK_WORKSPACE]
    const response = await ask('b1', { form: 'presentation' })
    expect(response.status).toBe(409)
    expect(await response.text()).toContain(DECK_WORKSPACE)
  })

  it('reads a setting left empty as one nobody gave', async () => {
    process.env[DECK_WORKSPACE] = ''
    const response = await ask('b1', { form: 'presentation' })
    expect(response.status).toBe(409)
    delete process.env[DECK_WORKSPACE]
  })

  it('asks nothing of a form that needs nothing', async () => {
    // Only the form that declares a requirement is held to one,
    // so the check cannot quietly gate every form on one deployment's setting.
    delete process.env[DECK_WORKSPACE]
    expect((await ask('gone', { form: 'reference' })).status).toBe(404)
  })

  it('refuses a body that is not an ask at all', async () => {
    const response = await ask('b1', { shape: 'wrong' })
    expect(response.status).toBe(400)
  })

  it('refuses before it reaches the agent, so a bad ask costs nothing', async () => {
    // Both refusals land before anything is spawned,
    // which is why they can be tested on a machine with no agent on it.
    expect((await ask('b1', { form: 'poem' })).status).toBe(400)
    expect((await ask('gone', { form: 'reference' })).status).toBe(404)
  })
})

describe('what a form needs from the deployment', () => {
  const presentation = formOfId('presentation')!
  const reference = formOfId('reference')!

  it('gathers only what the form named', () => {
    process.env[DECK_WORKSPACE] = '/somewhere/decks'
    expect(settingsFor(presentation)).toEqual({ [DECK_WORKSPACE]: '/somewhere/decks' })
    delete process.env[DECK_WORKSPACE]
  })

  it('gathers nothing for a form that named nothing', () => {
    expect(settingsFor(reference)).toEqual({})
  })

  it('reads a variable nobody exported as one nobody set', () => {
    delete process.env[DECK_WORKSPACE]
    expect(unsetIn(settingsFor(presentation))).toEqual([DECK_WORKSPACE])
  })

  it('reads one exported as nothing the same way', () => {
    // A variable exported empty is a reader who meant to set it,
    // and handing it on gives a skill a path to a directory that is not there.
    expect(unsetIn({ [DECK_WORKSPACE]: '' })).toEqual([DECK_WORKSPACE])
  })

  it('says nothing is missing once it is set', () => {
    expect(unsetIn({ [DECK_WORKSPACE]: '/somewhere/decks' })).toEqual([])
  })
})
