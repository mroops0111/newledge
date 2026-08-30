import type { WebSearchProvider } from '@newledge/source-loader-web'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DECK_WORKSPACE } from '@newledge/view-generator-handout/forms'
import { composeKnowledgeRuntime } from '../src/compose.js'
import { ensureWorkspace, WORKSPACE_NAME } from '../src/run.js'

process.env.BRAID_LOCAL_TRUST = 'true'

const fakeProvider: WebSearchProvider = { search: async () => [] }

describe('reading a generated view', () => {
  let braidHome: string
  let runtime: Awaited<ReturnType<typeof composeKnowledgeRuntime>>
  let views: string

  beforeAll(async () => {
    braidHome = await mkdtemp(join(tmpdir(), 'newledge-views-'))
    runtime = await composeKnowledgeRuntime(fakeProvider, { braidHome, apiUrl: 'http://localhost:4402' })
    await ensureWorkspace(runtime, { query: 'test' })
    const workspace = await runtime.deps.workspaceService.findById(WORKSPACE_NAME as never)
    views = join(workspace.rootPath, 'artifacts', 'views')
    await mkdir(join(views, 'docs'), { recursive: true })
    await mkdir(join(views, 'tutorial'), { recursive: true })
    await writeFile(join(views, 'docs', 'retrieval.md'), '# Retrieval\n', 'utf-8')
    await writeFile(join(views, 'tutorial', 'retrieval.html'), '<h1>Retrieval</h1>\n', 'utf-8')
    // What the operating system leaves lying about is not a view.
    await writeFile(join(views, '.DS_Store'), 'junk', 'utf-8')
  })

  afterAll(async () => {
    await rm(braidHome, { recursive: true, force: true })
  })

  const list = async (): Promise<Response> => runtime.app.request(`/workspaces/${WORKSPACE_NAME}/views`)
  const read = async (path: string): Promise<Response> =>
    runtime.app.request(`/workspaces/${WORKSPACE_NAME}/views/${path}`)

  it('finds a view however deeply the generator nested it', async () => {
    const body = await (await list()).json() as { items: { path: string }[] }
    expect(body.items.map(one => one.path)).toEqual(['docs/retrieval.md', 'tutorial/retrieval.html'])
  })

  it('says what each one is, taken off the name rather than a promise', async () => {
    const body = await (await list()).json() as { items: { path: string, format: string }[] }
    expect(body.items.map(one => one.format)).toEqual(['md', 'html'])
  })

  it('hands back what a generator wrote, unchanged', async () => {
    const body = await (await read('tutorial/retrieval.html')).json() as { text: string, format: string }
    expect(body.text).toBe('<h1>Retrieval</h1>\n')
    expect(body.format).toBe('html')
  })

  it('passes over what the operating system left, since nobody generated it', async () => {
    const body = await (await list()).json() as { items: { path: string }[] }
    expect(body.items.map(one => one.path)).not.toContain('.DS_Store')
  })

  it('says plainly when there is no view by that name', async () => {
    expect((await read('docs/missing.md')).status).toBe(404)
  })

  it('refuses a name that climbs out of the views directory', async () => {
    // A path is a string a caller chose,
    // so one walking upwards would otherwise read any file it can reach.
    expect((await read('../boards.json')).status).toBe(404)
    expect((await read('..%2F..%2Fworkspaces.json')).status).toBe(404)
  })

  it('lists nothing for a workspace nothing has generated a view in', async () => {
    await rm(views, { recursive: true, force: true })
    const body = await (await list()).json() as { items: unknown[] }
    expect(body.items).toEqual([])
  })
})

describe('the decks the workspace that plays them is holding', () => {
  let braidHome: string
  let deckHome: string
  let runtime: Awaited<ReturnType<typeof composeKnowledgeRuntime>>

  beforeAll(async () => {
    braidHome = await mkdtemp(join(tmpdir(), 'newledge-decks-'))
    deckHome = await mkdtemp(join(tmpdir(), 'newledge-slides-'))
    runtime = await composeKnowledgeRuntime(fakeProvider, { braidHome, apiUrl: 'http://localhost:4404' })
    await ensureWorkspace(runtime, { query: 'test' })
    await runtime.app.request(`/workspaces/${WORKSPACE_NAME}/boards`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boards: [{ id: 'board-terms', name: 'Terms', cards: [], sections: [] }] }),
    })
    await mkdir(join(deckHome, 'slides', 'board-terms'), { recursive: true })
    await writeFile(join(deckHome, 'slides', 'board-terms', 'index.tsx'), 'export default []\n', 'utf-8')
    // A folder holding no deck is not one.
    await mkdir(join(deckHome, 'slides', 'board-terms-empty'), { recursive: true })
    // A deck the reader wrote by hand is theirs, and was never written here.
    await mkdir(join(deckHome, 'slides', 'their-own-deck'), { recursive: true })
    await writeFile(join(deckHome, 'slides', 'their-own-deck', 'index.tsx'), 'export default []\n', 'utf-8')
  })

  afterAll(async () => {
    delete process.env[DECK_WORKSPACE]
    delete process.env.NEWLEDGE_DECK_URL
    await rm(braidHome, { recursive: true, force: true })
    await rm(deckHome, { recursive: true, force: true })
  })

  const listed = async (): Promise<{ path: string, seenAt?: string }[]> => {
    const response = await runtime.app.request(`/workspaces/${WORKSPACE_NAME}/views`)
    return (await response.json() as { items: { path: string, seenAt?: string }[] }).items
  }

  it('lists nothing when nobody said where the decks are kept', async () => {
    delete process.env[DECK_WORKSPACE]
    expect(await listed()).toEqual([])
  })

  it('lists a deck beside the pages, so a reader is shown all of them', async () => {
    process.env[DECK_WORKSPACE] = deckHome
    const paths = (await listed()).map(one => one.path)
    expect(paths).toContain('presentation/board-terms/index.tsx')
  })

  it('sends a reader to the runtime that plays it, rather than to a file', async () => {
    process.env[DECK_WORKSPACE] = deckHome
    process.env.NEWLEDGE_DECK_URL = 'http://localhost:5199/'
    const deck = (await listed()).find(one => one.path.startsWith('presentation/'))
    expect(deck?.seenAt).toBe('http://localhost:5199/s/board-terms')
  })

  it('sends them to the default when nobody moved that runtime', async () => {
    process.env[DECK_WORKSPACE] = deckHome
    delete process.env.NEWLEDGE_DECK_URL
    const deck = (await listed()).find(one => one.path.startsWith('presentation/'))
    expect(deck?.seenAt).toBe('http://localhost:5173/s/board-terms')
  })

  it('passes over a folder holding no deck', async () => {
    process.env[DECK_WORKSPACE] = deckHome
    const paths = (await listed()).map(one => one.path)
    expect(paths).not.toContain('presentation/board-terms-empty/index.tsx')
  })

  it('leaves the decks a reader wrote by hand out of their handouts', async () => {
    // That workspace is theirs and holds work this one never wrote,
    // and sweeping it in would offer a reader handouts they never asked for.
    process.env[DECK_WORKSPACE] = deckHome
    const paths = (await listed()).map(one => one.path)
    expect(paths).not.toContain('presentation/their-own-deck/index.tsx')
  })

  it('lists nothing when the workspace named is not there', async () => {
    process.env[DECK_WORKSPACE] = join(tmpdir(), 'newledge-nothing-here')
    expect(await listed()).toEqual([])
  })
})
