import { spawn } from 'node:child_process'
import { z } from 'zod'

/** One fetched web page: its URL, title, and content rendered as markdown. */
export interface WebSearchResult {
  readonly url: string
  readonly title: string
  readonly markdown: string
}

/** The query the loader hands to the retrieval agent. */
export interface WebSearchQuery {
  readonly query: string
  readonly keywords: readonly string[]
  readonly maxResults: number
}

/**
 * The retrieval seam. The loader depends on this abstraction, not on how the
 * search runs, so the production implementation can shell out to the Python
 * web-search agent while tests inject a fake. This is what keeps the loader
 * itself pure and offline-testable.
 */
export interface WebSearchProvider {
  readonly search: (query: WebSearchQuery) => Promise<readonly WebSearchResult[]>
}

const resultSchema = z.array(
  z.object({
    url: z.string().min(1),
    title: z.string(),
    markdown: z.string(),
  }),
)

/** How to launch the Python web-search agent. */
export interface SubprocessProviderOptions {
  /** The agent executable, e.g. `python` or an absolute path. */
  readonly command: string
  /** Fixed leading arguments, e.g. `['-m', 'newledge_pipeline.web_search']`. */
  readonly args?: readonly string[]
  /** Extra environment for the child process. */
  readonly env?: Readonly<Record<string, string>>
}

/**
 * A WebSearchProvider that runs the Python web-search agent as a subprocess,
 * mirroring braid's agent-as-subprocess seam. The query is written as JSON to the
 * child's stdin and a JSON array of results is read from its stdout, so the
 * agent's language and internals stay its own concern.
 */
export function subprocessWebSearchProvider(options: SubprocessProviderOptions): WebSearchProvider {
  return { search: query => runAgent(options, query) }
}

function runAgent(options: SubprocessProviderOptions, query: WebSearchQuery): Promise<readonly WebSearchResult[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(options.command, [...(options.args ?? [])], {
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf-8')
    child.stderr.setEncoding('utf-8')
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(`web-search agent exited with code ${String(code)}: ${stderr.trim()}`))
        return
      }
      try {
        resolve(resultSchema.parse(JSON.parse(stdout)))
      }
      catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    })

    child.stdin.end(JSON.stringify(query))
  })
}
