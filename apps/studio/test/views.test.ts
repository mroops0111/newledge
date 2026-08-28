import { describe, expect, it } from 'vitest'
import { createViewClient, FORMS, formOf, pageOf, titleOf } from '../src/lib/views.js'

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

  it('asks the board for a view of itself, rather than naming a skill', async () => {
    const seen: string[] = []
    await client({ runId: 'r1' }, seen).write(FORMS[0]!, 'b1')
    expect(seen[0]).toBe('http://x/api/workspaces/w/boards/b1/views')
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

describe('pageOf', () => {
  it('hands a whole page on untouched, since it is already one', () => {
    // A generator writes a complete document,
    // and wrapping one in another leaves it nested inside a body,
    // which is how a page comes out blank.
    const whole = '<!DOCTYPE html><html><head><style>body{color:red}</style></head><body>hi</body></html>'
    expect(pageOf({ path: 'a.html', format: 'html', text: whole })).toBe(whole)
  })

  it('makes a whole page of markdown, which arrives with none', () => {
    for (const format of ['md', 'markdown']) {
      const page = pageOf({ path: 'a.md', format, text: '# Title' })
      expect(page).toContain('<h1>')
      expect(page).toContain('<!doctype html>')
      // Markdown carries no style either, so the frame is given one.
      expect(page).toContain('<style>')
    }
  })

  it('says nothing for a format it has not been taught, rather than refusing', () => {
    // A caller shows the text instead,
    // which serves a reader better than an apology for a format,
    // that a generator was free to write.
    expect(pageOf({ path: 'a.json', format: 'json', text: '{}' })).toBeUndefined()
  })
})

describe('FORMS', () => {
  it('offers every form over the same thing, which is a board', () => {
    // A split where one form took a topic and the rest took a board,
    // is what would make a reader learn two places to ask from.
    expect(FORMS.map(form => form.id)).toEqual(['reference', 'tutorial', 'exam'])
    expect(FORMS.every(form => form.purpose.length > 0)).toBe(true)
  })
})

describe('naming a view', () => {
  it('drops the machinery from the name a reader reads', () => {
    expect(titleOf('docs/kdanPortfolio.md')).toBe('kdanPortfolio')
    expect(titleOf('plain')).toBe('plain')
  })

  it('says which form it is in, not which folder it landed in', () => {
    expect(formOf('reference/retrieval.html')).toBe('Reference')
    expect(formOf('tutorial/retrieval.html')).toBe('Tutorial')
    expect(formOf('exam/retrieval.html')).toBe('Exam')
  })

  it('names an unclaimed folder as it stands, rather than guessing', () => {
    // A generator may write somewhere nobody has declared a form for.
    expect(formOf('sketches/one.md')).toBe('sketches')
  })
})
