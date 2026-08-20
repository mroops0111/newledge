import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { WebSearchProvider, WebSearchResult } from '@newledge/source-loader-web'

/**
 * A provider that returns pre-saved pages from a directory, one `.md` file each.
 * Each file opens with an HTML comment `<!-- source-url: URL -->` and an H1 title,
 * so a local corpus stands in for a live fetcher during development.
 */
export function directoryWebSearchProvider(dir: string): WebSearchProvider {
  return {
    search: async () => readdirSync(dir)
      .filter(name => name.endsWith('.md'))
      .sort()
      .map(name => toResult(readFileSync(join(dir, name), 'utf-8'), name)),
  }
}

function toResult(raw: string, name: string): WebSearchResult {
  const url = raw.match(/<!--\s*source-url:\s*(\S+)\s*-->/)?.[1] ?? `about:${name}`
  const lines = raw.split('\n')
  const titleIndex = lines.findIndex(line => line.startsWith('# '))
  if (titleIndex < 0)
    return { url, title: name, markdown: raw.trim() }
  const title = lines[titleIndex]!.slice(2).trim()
  const markdown = lines.slice(titleIndex + 1).join('\n').trim()
  return { url, title, markdown }
}
