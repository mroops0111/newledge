import type { SourceLoaderContext } from '@braidhq/core'
import type { AbsolutePath, SourceId, WorkspaceId } from '@braidhq/schema'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createWebSourceLoaderPlugin, SOURCE_LOADER_ID } from '../src/loader.js'
import type { WebSearchProvider, WebSearchQuery, WebSearchResult } from '../src/provider.js'

const ctx: SourceLoaderContext = { workspaceId: 'ws-test' as WorkspaceId, sourceId: 'src-test' as SourceId }

function fakeProvider(results: WebSearchResult[]): WebSearchProvider {
  return { search: () => Promise.resolve(results) }
}

function page(url: string, markdown = 'body'): WebSearchResult {
  return { url, title: `Title of ${url}`, markdown }
}

function mdFiles(dir: AbsolutePath): Promise<string[]> {
  return readdir(dir).then(names => names.filter(n => n.endsWith('.md')))
}

describe('web source loader', () => {
  let dest: AbsolutePath

  beforeEach(async () => {
    dest = await mkdtemp(join(tmpdir(), 'newledge-web-loader-')) as AbsolutePath
  })
  afterEach(async () => {
    await rm(dest, { recursive: true, force: true })
  })

  it('declares the web loader kind', () => {
    expect(createWebSourceLoaderPlugin(fakeProvider([])).kind).toBe(SOURCE_LOADER_ID)
  })

  it('provision fills destination with one file per result and reports localPath', async () => {
    const loader = createWebSourceLoaderPlugin(fakeProvider([page('https://a'), page('https://b')]))
    const report = await loader.provision({ query: 'ai' }, dest, ctx)
    expect(report.localPath).toBe(dest)
    expect(report.metadata).toMatchObject({ query: 'ai', resultCount: 2 })
    expect(await mdFiles(dest)).toHaveLength(2)
  })

  it('embeds the source url in each file for provenance', async () => {
    const loader = createWebSourceLoaderPlugin(fakeProvider([page('https://a')]))
    await loader.provision({ query: 'ai' }, dest, ctx)
    const [file] = await mdFiles(dest)
    expect(await readFile(join(dest, file!), 'utf-8')).toContain('<!-- source-url: https://a -->')
  })

  it('provision clears destination before writing', async () => {
    await createWebSourceLoaderPlugin(fakeProvider([page('https://a'), page('https://b')])).provision({ query: 'ai' }, dest, ctx)
    await createWebSourceLoaderPlugin(fakeProvider([page('https://c')])).provision({ query: 'ai' }, dest, ctx)
    expect(await mdFiles(dest)).toHaveLength(1)
  })

  it('sync with the same results is a no-op', async () => {
    const loader = createWebSourceLoaderPlugin(fakeProvider([page('https://a'), page('https://b')]))
    await loader.provision({ query: 'ai' }, dest, ctx)
    expect(await loader.sync!({ query: 'ai' }, dest, ctx)).toMatchObject({ changed: false, added: 0, updated: 0, removed: 0, unchanged: 2 })
  })

  it('sync reports added, updated, and removed against what is on disk', async () => {
    let results = [page('https://a'), page('https://b')]
    const loader = createWebSourceLoaderPlugin({ search: () => Promise.resolve(results) })
    await loader.provision({ query: 'ai' }, dest, ctx)
    results = [page('https://a', 'CHANGED'), page('https://c')] // a updated, b removed, c added
    expect(await loader.sync!({ query: 'ai' }, dest, ctx)).toMatchObject({ changed: true, added: 1, updated: 1, removed: 1, unchanged: 0 })
    expect(await mdFiles(dest)).toHaveLength(2)
  })

  it('parses config: rejects an empty query and applies defaults', async () => {
    let received: WebSearchQuery | undefined
    const loader = createWebSourceLoaderPlugin({ search: (q) => { received = q; return Promise.resolve([]) } })
    await expect(loader.provision({ query: '' }, dest, ctx)).rejects.toThrow()
    await loader.provision({ query: 'ai' }, dest, ctx)
    expect(received).toEqual({ query: 'ai', keywords: [], maxResults: 10 })
  })
})
