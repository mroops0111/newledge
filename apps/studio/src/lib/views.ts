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

  return {
    list: async () => (await get<{ items?: readonly Listed[] }>('', 'your views')).items ?? [],
    // A path arrives with separators in it, and each segment is escaped alone,
    // so a name carrying a slash cannot be read as a directory of its own.
    read: async path => get<Written>(
      `/${path.split('/').map(encodeURIComponent).join('/')}`,
      `the view at "${path}"`,
    ),
  }
}

/**
 * How a reader is meant to see one of these.
 *
 * A generator says what it wrote by what it named the file,
 * since braid's field for saying so is one nothing fills in.
 * A format nobody has taught this surface to draw is shown as what it is,
 * which is the text, rather than refused.
 */
export type Drawing = 'page' | 'text'

export function drawingFor(format: string): Drawing {
  return format === 'html' || format === 'md' || format === 'markdown' ? 'page' : 'text'
}

/** What to call a view in a list, which is its name without the machinery. */
export function titleOf(path: string): string {
  const last = path.split('/').pop() ?? path
  const dot = last.lastIndexOf('.')
  return dot === -1 ? last : last.slice(0, dot)
}

/** Which generator wrote it, which is the folder it landed in. */
export function writerOf(path: string): string | undefined {
  const parts = path.split('/')
  return parts.length > 1 ? parts[0] : undefined
}
