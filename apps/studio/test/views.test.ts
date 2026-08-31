import { describe, expect, it } from 'vitest'
import type { Listed } from '../src/lib/views.js'
import { createViewClient, FORMS, formOf, madeFrom, pageOf, subjectOf, titleOf } from '../src/lib/views.js'

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
    await client({ runId: 'r1' }, seen).write(FORMS[0]!, 'b1', {})
    expect(seen[0]).toBe('http://x/api/workspaces/w/boards/b1/views')
  })

  it('sends what the reader asked for, since a form is not one document', async () => {
    let sent: string | undefined
    const asking = createViewClient({
      apiUrl: 'http://x/api',
      workspaceId: 'w',
      fetcher: (async (_url: string, init: RequestInit) => {
        sent = init.body as string
        return { ok: true, json: async () => ({ runId: 'r1' }) } as Response
      }) as unknown as typeof fetch,
    })
    await asking.write(FORMS[0]!, 'b1', { level: 'judge' })
    expect(JSON.parse(sent!)).toEqual({ form: 'handbook', asked: { level: 'judge' } })
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
  const palette = '<style>:root { --ink: #111 }</style>'

  it('hands a whole page on untouched, since it brought its own look', () => {
    // Wrapping one in another leaves it nested inside a body,
    // which is how a page comes out blank.
    const whole = '<!DOCTYPE html><html><head><style>body{color:red}</style></head><body>hi</body></html>'
    expect(pageOf({ path: 'a.html', format: 'html', text: whole }, palette)).toBe(whole)
  })

  it('sets a fragment in this application\'s own colours', () => {
    const page = pageOf({ path: 'a.html', format: 'html', text: '<p class="lede">hi</p>' }, palette)
    expect(page).toContain('<!doctype html>')
    expect(page).toContain('--ink: #111')
    expect(page).toContain('<p class="lede">hi</p>')
  })

  it('makes a whole page of markdown, which arrives with none', () => {
    for (const format of ['md', 'markdown']) {
      const page = pageOf({ path: 'a.md', format, text: '# Title' }, palette)
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
    expect(pageOf({ path: 'a.json', format: 'json', text: '{}' }, palette)).toBeUndefined()
  })
})

describe('FORMS', () => {
  it('offers every form over the same thing, which is a board', () => {
    // A split where one form took a topic and the rest took a board,
    // is what would make a reader learn two places to ask from.
    expect(FORMS.map(form => form.id)).toEqual(['handbook', 'tutorial', 'exam', 'presentation'])
    expect(FORMS.every(form => form.purpose.length > 0)).toBe(true)
  })
})

describe('what a subject was written out of', () => {
  it('reads a form that writes one file per board', () => {
    expect(subjectOf('exam/retrieval.html')).toBe('retrieval')
  })

  it('reads a form that writes a folder per board', () => {
    // A deck is a directory rather than a page,
    // so the name of the file inside it is not what a reader knows it by.
    expect(subjectOf('presentation/retrieval/index.tsx')).toBe('retrieval')
  })
})

describe('naming a view', () => {
  it('drops the machinery from the name a reader reads', () => {
    expect(titleOf('docs/retrievalNotes.md')).toBe('retrievalNotes')
    expect(titleOf('plain')).toBe('plain')
  })

  it('says which form it is in, not which folder it landed in', () => {
    expect(formOf('handbook/retrieval.html')).toBe('Handbook')
    expect(formOf('tutorial/retrieval.html')).toBe('Tutorial')
    expect(formOf('exam/retrieval.html')).toBe('Exam')
  })

  it('names an unclaimed folder as it stands, rather than guessing at it', () => {
    // A generator may write somewhere nobody has declared a form for,
    // and a reader still reads what is there as the name of a kind.
    expect(formOf('sketches/one.md')).toBe('Sketches')
  })
})

describe('madeFrom', () => {
  const at = (path: string, when: string): Listed =>
    ({ path, format: path.split('.').pop()!, bytes: 1, writtenAt: when })

  const listed = [
    at('exam/board-terms.html', '2026-08-28T10:00:00Z'),
    at('handbook/board-terms.html', '2026-08-28T09:00:00Z'),
    at('tutorial/board-two.html', '2026-08-28T12:00:00Z'),
  ]
  const named = (subject: string): string | undefined =>
    ({ 'board-terms': 'Terms', 'board-two': 'Retrieval' })[subject]

  it('gathers handouts under what each was written out of', () => {
    // A flat list of files makes a reader read a path,
    // to work out what they are looking at,
    // and says nothing about the board one came from.
    const made = madeFrom(listed, named)
    expect(made.map(one => one.name)).toEqual(['Retrieval', 'Terms'])
    expect(made.find(one => one.name === 'Terms')?.of).toHaveLength(2)
  })

  it('names a subject as the reader named it, not as the file spells it', () => {
    expect(madeFrom(listed, named)[0]?.name).toBe('Retrieval')
  })

  it('falls back to what the file carries when nothing knows the name', () => {
    // A board since renamed or dropped still has handouts worth reaching.
    expect(madeFrom(listed, () => undefined).map(one => one.name)).toContain('board-terms')
  })

  it('reads the forms in the order they were offered, not when they were made', () => {
    const forms = madeFrom(listed, named).find(one => one.name === 'Terms')?.of ?? []
    expect(forms.map(one => one.form)).toEqual(['Handbook', 'Exam'])
  })

  it('leads with the subject written to most recently', () => {
    // A reader coming back is usually coming back to what they just made.
    expect(madeFrom(listed, named)[0]?.name).toBe('Retrieval')
  })
})
