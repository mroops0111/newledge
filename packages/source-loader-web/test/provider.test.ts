import { describe, expect, it } from 'vitest'
import { subprocessWebSearchProvider } from '../src/provider.js'

const query = { query: 'ai', keywords: [], maxResults: 5 }

// A stub fetcher that reads the query on stdin and echoes a derived result.
const echoScript = `
let d = ''
process.stdin.on('data', c => { d += c })
process.stdin.on('end', () => {
  const q = JSON.parse(d)
  process.stdout.write(JSON.stringify([{ url: 'https://x/' + q.query, title: 'T', markdown: 'M' }]))
})
`

describe('subprocessWebSearchProvider', () => {
  it('sends the query on stdin and parses results from stdout', async () => {
    const provider = subprocessWebSearchProvider({ command: process.execPath, args: ['-e', echoScript] })
    expect(await provider.search(query)).toEqual([{ url: 'https://x/ai', title: 'T', markdown: 'M' }])
  })

  it('rejects when the fetcher exits non-zero', async () => {
    const provider = subprocessWebSearchProvider({ command: process.execPath, args: ['-e', 'process.exit(3)'] })
    await expect(provider.search(query)).rejects.toThrow(/code 3/)
  })

  it('rejects when the fetcher emits invalid output', async () => {
    const provider = subprocessWebSearchProvider({ command: process.execPath, args: ['-e', "process.stdout.write('not json')"] })
    await expect(provider.search(query)).rejects.toThrow()
  })

  it('rejects when the fetcher cannot be spawned', async () => {
    const provider = subprocessWebSearchProvider({ command: '/nonexistent/newledge/fetcher', args: [] })
    await expect(provider.search(query)).rejects.toThrow()
  })
})
