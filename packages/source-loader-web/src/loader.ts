import type { SourceLoaderPlugin } from '@braidhq/core'
import type { Timestamp } from '@braidhq/schema'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineSourceLoaderPlugin } from '@braidhq/sdk'
import { z } from 'zod'
import type { WebSearchProvider, WebSearchQuery, WebSearchResult } from './provider.js'

/** The loader kind. A workspace source points its `loader.kind` here. */
export const SOURCE_LOADER_ID = 'web' as const

/** Per-source config, what to search and how much to pull. */
export const webSourceConfig = z.object({
  query: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  maxResults: z.number().int().positive().max(50).default(10),
})
export type WebSourceConfig = z.infer<typeof webSourceConfig>

const FILE_EXT = '.md'
const BUNDLE_FILE = `results${FILE_EXT}`

// A unit is one file, so a query's results are bundled into one.
// The extract skill then reads the pages together,
// which is what lets it dedupe across them and weigh one against another.
// Splitting a query across files would put the same concept in rival proposals,
// and applying the second one is rejected as a duplicate id.
function renderBundle(results: readonly WebSearchResult[]): string {
  return results.map(renderResult).join('\n')
}

// The source url rides in an HTML comment,
// so each page inside the bundle stays attributable.
// Full-content comparison still detects an update.
function renderResult(result: WebSearchResult): string {
  return `<!-- source-url: ${result.url} -->\n# ${result.title}\n\n${result.markdown}\n`
}

async function readIfPresent(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf-8')
  }
  catch {
    return undefined
  }
}

function now(): Timestamp {
  return new Date().toISOString() as Timestamp
}

function toQuery(config: WebSourceConfig): WebSearchQuery {
  return { query: config.query, keywords: config.keywords, maxResults: config.maxResults }
}

/**
 * Build the web source loader with an injected retrieval provider,
 * so the real Python-backed fetcher and a test fake are interchangeable.
 * The loader is a pure provisioner that only writes files under `destination`,
 * and never touches the Knowledge Graph.
 * Turning those files into typed, deduped knowledge is the extract skill's job.
 */
export function createWebSourceLoaderPlugin(provider: WebSearchProvider): SourceLoaderPlugin {
  return defineSourceLoaderPlugin({
    kind: SOURCE_LOADER_ID,
    configSchema: webSourceConfig,

    provision: async (config, destination) => {
      const results = await provider.search(toQuery(config))
      await rm(destination, { recursive: true, force: true })
      await mkdir(destination, { recursive: true })
      await writeFile(join(destination, BUNDLE_FILE), renderBundle(results), 'utf-8')
      return { localPath: destination, metadata: { query: config.query, resultCount: results.length }, fetchedAt: now() }
    },

    sync: async (config, destination) => {
      await mkdir(destination, { recursive: true })
      const results = await provider.search(toQuery(config))
      const bundle = renderBundle(results)
      const path = join(destination, BUNDLE_FILE)
      const previous = await readIfPresent(path)

      // A file left by the earlier one-per-result layout enumerates as its own unit,
      // so the bundle stays the only unit this source yields.
      const stale = (await readdir(destination)).filter(name => name.endsWith(FILE_EXT) && name !== BUNDLE_FILE)
      for (const name of stale)
        await rm(join(destination, name))

      const changed = previous !== bundle || stale.length > 0
      if (previous !== bundle)
        await writeFile(path, bundle, 'utf-8')

      return {
        changed,
        added: previous === undefined ? 1 : 0,
        updated: previous !== undefined && previous !== bundle ? 1 : 0,
        removed: stale.length,
        unchanged: previous === bundle ? 1 : 0,
        metadata: { query: config.query, resultCount: results.length },
        fetchedAt: now(),
      }
    },
  })
}
