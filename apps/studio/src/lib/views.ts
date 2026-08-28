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
  /** Set a generator going, and hand back the run to watch. */
  readonly write: (form: Form, about: string) => Promise<string>
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
  readonly skillId: string
  /** Which kind of node this form is written about. */
  readonly about: string
}

export const FORMS: readonly Form[] = [
  {
    id: 'docs',
    label: 'Reference',
    purpose: 'Everything filed under one topic, written for someone looking it up',
    skillId: 'braid:generate-doc',
    about: 'Topic',
  },
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

    write: async (form, about) => {
      const response = await fetcher(`${runs}/skills/${encodeURIComponent(form.skillId)}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args: about }),
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
  html: text => text,
  md: text => marked.parse(text, { async: false }),
  markdown: text => marked.parse(text, { async: false }),
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
