import type { WebSearchProvider } from '@newledge/source-loader-web'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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
    await mkdir(join(views, 'learning'), { recursive: true })
    await writeFile(join(views, 'docs', 'retrieval.md'), '# Retrieval\n', 'utf-8')
    await writeFile(join(views, 'learning', 'retrieval.html'), '<h1>Retrieval</h1>\n', 'utf-8')
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
    expect(body.items.map(one => one.path)).toEqual(['docs/retrieval.md', 'learning/retrieval.html'])
  })

  it('says what each one is, taken off the name rather than a promise', async () => {
    const body = await (await list()).json() as { items: { path: string, format: string }[] }
    expect(body.items.map(one => one.format)).toEqual(['md', 'html'])
  })

  it('hands back what a generator wrote, unchanged', async () => {
    const body = await (await read('learning/retrieval.html')).json() as { text: string, format: string }
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
