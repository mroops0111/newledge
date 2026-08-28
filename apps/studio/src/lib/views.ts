import { marked } from 'marked'

/** One generated view, as the runtime lists it. */
export interface Listed {
  readonly path: string
  readonly format: string
  readonly bytes: number
  readonly writtenAt: string
}

/** One generated view, with what was written in it. */
export interface Written extends Pick<Listed, 'path' | 'format'> {
  readonly text: string
}

export interface ViewClient {
  readonly list: () => Promise<readonly Listed[]>
  readonly read: (path: string) => Promise<Written>
  /** Set a generator going over one board, and hand back the run to watch. */
  readonly write: (form: Form, boardId: string) => Promise<string>
  readonly finished: (runId: string) => Promise<boolean>
}

/**
 * A way of writing the graph out, and what each one is for.
 *
 * They are peers rather than steps.
 * Which one a reader wants follows from what they are about to do,
 * not from how far along they are.
 */
export interface Form {
  readonly id: string
  readonly label: string
  /** What a reader gets, said in the terms they would ask for it in. */
  readonly purpose: string
}

/**
 * Every form is written out of a board, which is the whole of the split.
 *
 * A board is the only thing carrying both what a view is about,
 * and the order it is read in, which the graph cannot supply.
 * So a reader arranges and then writes it out,
 * and there is one place to do either.
 */
export const FORMS: readonly Form[] = [
  { id: 'reference', label: 'Reference', purpose: 'Arranged to be scanned, for coming back and finding one thing' },
  { id: 'tutorial', label: 'Tutorial', purpose: 'Written for someone meeting the subject for the first time' },
  { id: 'exam', label: 'Exam', purpose: 'Questions with the answers behind them, for finding out what stuck' },
]

export interface ViewClientOptions {
  readonly apiUrl: string
  readonly workspaceId: string
  readonly fetcher?: typeof fetch
}

export function createViewClient(options: ViewClientOptions): ViewClient {
  const fetcher = options.fetcher ?? globalThis.fetch
  const base = `${options.apiUrl.replace(/\/+$/, '')}/workspaces/${options.workspaceId}/views`

  async function get<T>(path: string, what: string): Promise<T> {
    const response = await fetcher(`${base}${path}`)
    if (!response.ok)
      throw new Error(`Reading ${what} failed with ${response.status}`)
    return await response.json() as T
  }

  const runs = `${options.apiUrl.replace(/\/+$/, '')}/workspaces/${options.workspaceId}`

  return {
    list: async () => (await get<{ items?: readonly Listed[] }>('', 'your views')).items ?? [],

    write: async (form, boardId) => {
      const response = await fetcher(`${runs}/boards/${encodeURIComponent(boardId)}/views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form: form.id }),
      })
      if (!response.ok)
        throw new Error(`Writing out failed with ${response.status}`)
      return (await response.json() as { runId: string }).runId
    },

    // A run is over when it has an exit code,
    // which is the only thing the record carries that says so.
    finished: async (runId) => {
      const response = await fetcher(`${runs}/runs`)
      if (!response.ok)
        return false
      const items = (await response.json() as { items?: readonly { runId: string, exitCode?: number }[] }).items ?? []
      return items.some(one => one.runId === runId && one.exitCode !== undefined)
    },
    // A path arrives with separators in it, and each segment is escaped alone,
    // so a name carrying a slash cannot be read as a directory of its own.
    read: async path => get<Written>(
      `/${path.split('/').map(encodeURIComponent).join('/')}`,
      `the view at "${path}"`,
    ),
  }
}

/**
 * How each format a generator may write becomes a page.
 *
 * One table rather than a condition,
 * so teaching this surface another format is an entry rather than an edit,
 * and so that what counts as a page, and how one is made,
 * cannot come to disagree by living in two places.
 *
 * A generator says what it wrote by what it named the file,
 * since braid's field for saying so is one nothing fills in.
 */
const PAGES: Readonly<Record<string, (text: string) => string>> = {
  // Already a whole document, so it is handed on untouched.
  // Wrapping one in another leaves a document nested inside a body,
  // which a browser recovers from unevenly,
  // and which cost this surface a page that came out blank.
  html: text => text,
  md: text => wrapped(marked.parse(text, { async: false })),
  markdown: text => wrapped(marked.parse(text, { async: false })),
}

/**
 * A page around a body that has none.
 *
 * Markdown carries no document and no style, so both are given here.
 * Anything arriving as a whole page is left alone,
 * since its own style is the one its author meant.
 */
function wrapped(body: string): string {
  return `<!doctype html><meta charset="utf-8">${MARKDOWN_STYLE}<body>${body}</body>`
}

/**
 * A view as a page, or nothing when its format is one nobody has taught here.
 * Nothing is not a refusal. A caller shows the text instead,
 * because a generator may write something nobody has taught yet,
 * and a reader is better served by the words than by an apology.
 */
export function pageOf(written: Written): string | undefined {
  return PAGES[written.format]?.(written.text)
}

/** What to call a view in a list, which is its name without the machinery. */
export function titleOf(path: string): string {
  const last = path.split('/').pop() ?? path
  const dot = last.lastIndexOf('.')
  return dot === -1 ? last : last.slice(0, dot)
}

/**
 * Which form this was written in, which is the folder a generator landed it in.
 *
 * A reader wants to know they are looking at a reference,
 * rather than at a set of questions,
 * and the folder is the only thing that says so,
 * since braid's field for saying it is one nothing fills in.
 * A folder nobody has claimed is named as it stands,
 * because a generator may write somewhere nobody has declared.
 */
export function formOf(path: string): string {
  const [folder] = path.split('/')
  const known = FORMS.find(form => form.id === folder)
  return known?.label ?? folder ?? 'View'
}

/**
 * How markdown is set once it has been made into a page.
 * A sandboxed frame is its own document and shares no stylesheet with this one,
 * so a body arriving with no style of its own is set here or set by nobody.
 */
const MARKDOWN_STYLE = `<style>
  :root { color-scheme: light }
  body {
    margin: 0 auto; padding: 3rem 2.5rem; max-width: 46rem;
    font: 15px/1.65 ui-serif, Georgia, serif; color: #1c1917; background: #fff;
  }
  h1, h2, h3, h4 { font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.25; }
  h1 { font-size: 1.6rem; margin: 0 0 1.5rem }
  h2 { font-size: 1.2rem; margin: 2.2rem 0 .6rem }
  h3, h4 { font-size: 1rem; margin: 1.6rem 0 .4rem }
  blockquote { margin: 1rem 0; padding-left: 1rem; border-left: 2px solid #e7e3dd; color: #57534e }
  table { border-collapse: collapse; width: 100%; font-size: .9em; margin: 1rem 0 }
  th, td { border: 1px solid #e7e3dd; padding: .4rem .6rem; text-align: left }
  code { font: .9em ui-monospace, monospace; background: #f5f3f0; padding: .1em .3em; border-radius: 3px }
  hr { border: 0; border-top: 1px solid #e7e3dd; margin: 2rem 0 }
  a { color: #1c1917 }
</style>`
