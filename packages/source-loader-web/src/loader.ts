import type { SourceLoaderPlugin } from '@braidhq/core'
import type { Timestamp } from '@braidhq/schema'
import { createHash } from 'node:crypto'
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

// Filename is a hash of the url, so the files on disk are the seen set,
// and a re-sync diffs fresh results against them without a manifest.
function fileNameFor(url: string): string {
  return `${createHash('sha256').update(url).digest('hex').slice(0, 16)}${FILE_EXT}`
}

// The source url rides in an HTML comment,
// so it survives into the file the extract skill reads.
// Full-content comparison still detects an update.
function render(result: WebSearchResult): string {
  return `<!-- source-url: ${result.url} -->\n# ${result.title}\n\n${result.markdown}\n`
}

function now(): Timestamp {
  return new Date().toISOString() as Timestamp
}

function toQuery(config: WebSourceConfig): WebSearchQuery {
  return { query: config.query, keywords: config.keywords, maxResults: config.maxResults }
}

/**
 * Build the web source loader.
 * The retrieval provider is injected,
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
      await Promise.all(results.map(r => writeFile(join(destination, fileNameFor(r.url)), render(r), 'utf-8')))
      return { localPath: destination, metadata: { query: config.query, resultCount: results.length }, fetchedAt: now() }
    },

    sync: async (config, destination) => {
      await mkdir(destination, { recursive: true })
      const results = await provider.search(toQuery(config))
      const fresh = new Map(results.map(r => [fileNameFor(r.url), render(r)]))
      const existing = new Set((await readdir(destination)).filter(name => name.endsWith(FILE_EXT)))

      let added = 0
      let updated = 0
      let unchanged = 0
      let removed = 0

      for (const [name, content] of fresh) {
        const path = join(destination, name)
        if (!existing.has(name)) {
          await writeFile(path, content, 'utf-8')
          added++
        }
        else if (await readFile(path, 'utf-8') === content) {
          unchanged++
        }
        else {
          await writeFile(path, content, 'utf-8')
          updated++
        }
      }

      for (const name of existing) {
        if (!fresh.has(name)) {
          await rm(join(destination, name))
          removed++
        }
      }

      return {
        changed: added + updated + removed > 0,
        added,
        updated,
        removed,
        unchanged,
        metadata: { query: config.query, resultCount: results.length },
        fetchedAt: now(),
      }
    },
  })
}
