import type { Form } from '@newledge/view-generator-handout/forms'
import { FORMS } from '@newledge/view-generator-handout/forms'
import { marked } from 'marked'

import { isWholePage, pageAround } from './viewStyle.js'

/**
 * The forms and what each one asks come from the plugin that ships the skills.
 *
 * A form is a skill, and the plugin is what has one.
 * Declaring the list again here is how a fourth form arrives in the runtime,
 * and never reaches the reader who would have asked for it.
 */
export type { Ask, Choice, Form } from '@newledge/view-generator-handout/forms'
export { FORMS } from '@newledge/view-generator-handout/forms'

/** One generated view, as the runtime lists it. */
export interface Listed {
  readonly path: string
  readonly format: string
  readonly bytes: number
  readonly writtenAt: string
  /**
   * Where this is seen, for a view that is not read from here.
   * A deck is played by its own runtime, so it is shown at its own address,
   * rather than read as a file and drawn again by this surface.
   */
  readonly seenAt?: string
}

/** One generated view, with what was written in it. */
export interface Written extends Pick<Listed, 'path' | 'format'> {
  readonly text: string
}

export interface ViewClient {
  readonly list: () => Promise<readonly Listed[]>
  readonly read: (path: string) => Promise<Written>
  /**
   * Set a generator going over one board, and hand back the run to watch.
   * What the reader answered goes with it,
   * because a view is not obliged to be the same document every time.
   */
  readonly write: (form: Form, boardId: string, asked: Readonly<Record<string, string>>) => Promise<string>
  readonly finished: (runId: string) => Promise<boolean>
}

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

    write: async (form, boardId, asked) => {
      const response = await fetcher(`${runs}/boards/${encodeURIComponent(boardId)}/views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form: form.id, asked }),
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
const BODIES: Readonly<Record<string, (text: string) => string>> = {
  html: text => text,
  md: text => marked.parse(text, { async: false }),
  markdown: text => marked.parse(text, { async: false }),
}

/**
 * A view as a page, or nothing when its format is one nobody has taught here.
 *
 * Nothing is not a refusal. A caller shows the text instead,
 * because a generator may write something nobody has taught yet,
 * and a reader is better served by the words than by an apology.
 *
 * A generator is asked for a fragment,
 * which is what gets this application's own look.
 * One arriving as a whole page brought its own,
 * so it is handed on untouched rather than nested inside a second document.
 */
export function pageOf(written: Written, palette: string): string | undefined {
  const body = BODIES[written.format]?.(written.text)
  if (body === undefined)
    return undefined
  return isWholePage(written.text) ? written.text : pageAround(body, palette)
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
  if (known !== undefined)
    return known.label
  // Set as a name even so, since a reader reads it as one either way.
  return folder === undefined ? 'View' : folder[0]!.toUpperCase() + folder.slice(1)
}

/**
 * What a handout was written out of, which is what sits under the form.
 *
 * A form that writes one file names it after the board,
 * and one that writes a folder names the folder after it,
 * so the segment after the form is the subject either way,
 * and neither has to be special-cased for the other to group.
 */
export function subjectOf(path: string): string {
  const [, under] = path.split('/')
  return under === undefined ? titleOf(path) : titleOf(under)
}

/** One thing a reader made handouts of, and which forms they have of it. */
export interface Made {
  /** What it was written out of, named as a reader would recognise it. */
  readonly name: string
  readonly of: readonly { readonly form: string, readonly view: Listed }[]
}

/**
 * The handouts a reader has, gathered under whatever each was written out of.
 *
 * A flat list of files makes a reader read a path,
 * to work out what they are looking at,
 * and says nothing about the board a handout came from,
 * which is the thing they would think of it by.
 * So they are gathered by subject,
 * and a subject that is a board is named as the reader named it.
 *
 * The subject written to most recently leads,
 * since a reader coming back is usually coming back to what they just made.
 */
export function madeFrom(
  listed: readonly Listed[],
  nameOf: (subject: string) => string | undefined,
): readonly Made[] {
  const gathered = new Map<string, { readonly view: Listed, readonly form: string }[]>()
  for (const view of listed) {
    const subject = subjectOf(view.path)
    gathered.set(subject, [...(gathered.get(subject) ?? []), { view, form: formOf(view.path) }])
  }

  return [...gathered.entries()]
    .map(([subject, of]) => ({
      name: nameOf(subject) ?? subject,
      of: [...of].sort((one, other) => order(one.form) - order(other.form)),
    }))
    .sort((one, other) => latest(other) - latest(one))
}

/** Forms read in the order they were offered, not the order they were made. */
function order(form: string): number {
  const at = FORMS.findIndex(one => one.label === form)
  return at === -1 ? FORMS.length : at
}

function latest(made: Made): number {
  return Math.max(...made.of.map(one => Date.parse(one.view.writtenAt) || 0))
}

