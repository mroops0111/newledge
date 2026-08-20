import type { WebSearchProvider } from '@newledge/source-loader-web'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { WorkspaceId } from '@braidhq/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { composeKnowledgeRuntime } from '../src/compose.js'
import { directoryWebSearchProvider } from '../src/providers.js'
import { ensureWorkspace, report, syncFeed, WORKSPACE_NAME } from '../src/run.js'

process.env.BRAID_LOCAL_TRUST = 'true'

const pages = [
  { url: 'https://a.example/x', title: 'X', markdown: 'X body' },
  { url: 'https://b.example/y', title: 'Y', markdown: 'Y body' },
]
const fakeProvider: WebSearchProvider = { search: async () => pages }

describe('knowledge run pipeline', () => {
  let braidHome: string
  let runtime: Awaited<ReturnType<typeof composeKnowledgeRuntime>>
  const id = WorkspaceId.parse(WORKSPACE_NAME)

  beforeAll(async () => {
    braidHome = await mkdtemp(join(tmpdir(), 'newledge-'))
    runtime = await composeKnowledgeRuntime(fakeProvider, { braidHome, apiUrl: 'http://localhost:4399' })
  })
  afterAll(async () => {
    await rm(braidHome, { recursive: true, force: true })
  })

  it('wires the batch runtime over the curated registry', () => {
    expect(runtime.deps.skillRunner).toBeDefined()
    expect(runtime.deps.batchService).toBeDefined()
  })

  it('scaffolds one knowledge workspace and provisions the feed onto disk', async () => {
    const scaffolded = await ensureWorkspace(runtime, { query: 'test' })
    expect(scaffolded).toBe(WORKSPACE_NAME)

    const workspace = await runtime.deps.workspaceService.findById(id)
    expect(workspace.productManifest.ontologyId).toBe('knowledge')

    // Every page lands in one file,
    // so the batch runs a single extraction over them together.
    const feedDir = join(braidHome, 'workspaces', WORKSPACE_NAME, 'feeds', 'web')
    const files = readdirSync(feedDir).filter(name => name.endsWith('.md'))
    expect(files).toHaveLength(1)

    const unit = readFileSync(join(feedDir, files[0]!), 'utf-8')
    for (const page of pages)
      expect(unit).toContain(page.url)
  })

  it('reuses the existing workspace on a second run', async () => {
    const again = await ensureWorkspace(runtime, { query: 'test' })
    expect(again).toBe(WORKSPACE_NAME)
  })

  it('re-syncs the feed without error', async () => {
    await expect(syncFeed(runtime.deps, id)).resolves.toBeUndefined()
  })

  it('leaves the graph empty and holds proposals until a batch runs', async () => {
    const counts = await report(runtime.deps, id)
    expect(counts.proposals).toBe(0)
    expect(counts.clarifications).toBe(0)
    expect(counts.nodes).toBe(0)
  })
})

describe('directoryWebSearchProvider', () => {
  it('reads pre-saved pages from a corpus directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'corpus-'))
    try {
      await writeFile(join(dir, '01.md'), '<!-- source-url: https://k.example/a -->\n# A Title\n\nBody of A.\n')
      const [result] = await directoryWebSearchProvider(dir).search({ query: 'x', keywords: [], maxResults: 10 })
      expect(result?.url).toBe('https://k.example/a')
      expect(result?.title).toBe('A Title')
      expect(result?.markdown).toBe('Body of A.')
    }
    finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('falls back to a filename-derived url and title when a page has neither', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'corpus-'))
    try {
      await writeFile(join(dir, 'bare.md'), 'just a body, no header\n')
      const [result] = await directoryWebSearchProvider(dir).search({ query: 'x', keywords: [], maxResults: 10 })
      expect(result?.url).toBe('about:bare.md')
      expect(result?.title).toBe('bare.md')
      expect(result?.markdown).toBe('just a body, no header')
    }
    finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
