import { describe, expect, it } from 'vitest'
import { createViewClient, drawingFor, titleOf, writerOf } from '../src/lib/views.js'

const listed = { items: [{ path: 'docs/retrieval.md', format: 'md', bytes: 12, writtenAt: 'now' }] }

function client(reply: unknown, seen: string[] = []): ReturnType<typeof createViewClient> {
  return createViewClient({
    apiUrl: 'http://x/api',
    workspaceId: 'w',
    fetcher: (async (url: string) => {
      seen.push(url)
      return { ok: true, json: async () => reply } as Response
    }) as unknown as typeof fetch,
  })
}

describe('createViewClient', () => {
  it('lists what a generator has written', async () => {
    expect((await client(listed).list()).map(one => one.path)).toEqual(['docs/retrieval.md'])
  })

  it('gives back nothing rather than failing on a workspace with no views', async () => {
    expect(await client({}).list()).toEqual([])
  })

  it('escapes each segment alone, so a name cannot pose as a directory', async () => {
    const seen: string[] = []
    await client({ path: 'a', format: 'md', text: '' }, seen).read('docs/a b.md')
    expect(seen[0]).toBe('http://x/api/workspaces/w/views/docs/a%20b.md')
  })

  it('says which view failed rather than only that one did', async () => {
    const failing = createViewClient({
      apiUrl: 'http://x/api',
      workspaceId: 'w',
      fetcher: (async () => ({ ok: false, status: 404 }) as Response) as unknown as typeof fetch,
    })
    await expect(failing.read('docs/gone.md')).rejects.toThrow('docs/gone.md')
  })
})

describe('drawingFor', () => {
  it('draws what it has been taught as a page', () => {
    expect(drawingFor('html')).toBe('page')
    expect(drawingFor('md')).toBe('page')
    expect(drawingFor('markdown')).toBe('page')
  })

  it('shows anything else as what it is rather than refusing it', () => {
    expect(drawingFor('json')).toBe('text')
    expect(drawingFor('csv')).toBe('text')
  })
})

describe('naming a view', () => {
  it('drops the machinery from the name a reader reads', () => {
    expect(titleOf('docs/kdanPortfolio.md')).toBe('kdanPortfolio')
    expect(titleOf('plain')).toBe('plain')
  })

  it('says which generator wrote it, which is where it landed', () => {
    expect(writerOf('learning/retrieval.html')).toBe('learning')
    expect(writerOf('loose.md')).toBeUndefined()
  })
})
