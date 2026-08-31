import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { check } from '../src/check.js'

describe('checking a written page', () => {
  let home: string

  beforeAll(async () => {
    home = await mkdtemp(join(tmpdir(), 'newledge-check-'))
  })

  afterAll(async () => {
    await rm(home, { recursive: true, force: true })
  })

  const wrote = async (name: string, html: string): Promise<string> => {
    const path = join(home, name)
    await writeFile(path, html, 'utf-8')
    return path
  }

  const quietly = async (path: string | undefined): Promise<{ code: number, said: string }> => {
    const lines: string[] = []
    const take = (...parts: unknown[]): void => { lines.push(parts.join(' ')) }
    const out = vi.spyOn(console, 'log').mockImplementation(take)
    const err = vi.spyOn(console, 'error').mockImplementation(take)
    const code = await check(path)
    out.mockRestore()
    err.mockRestore()
    return { code, said: lines.join('\n') }
  }

  it('exits zero on a page with nothing wrong, so a loop can end', async () => {
    const path = await wrote('good.html', '<section class="term"><h2>A</h2><p>What it is.</p></section>')
    const { code, said } = await quietly(path)
    expect(code).toBe(0)
    expect(said).toContain('holds together')
  })

  it('exits one and names each thing to fix', async () => {
    const path = await wrote('bad.html', '<div class="question"><p class="ask">Why?</p></div>')
    const { code, said } = await quietly(path)
    expect(code).toBe(1)
    expect(said).toContain('no answer behind this')
    expect(said).toContain('data-level')
  })

  it('says plainly when there is nothing at that path', async () => {
    const { code, said } = await quietly(join(home, 'absent.html'))
    expect(code).toBe(2)
    expect(said).toContain('nothing to read')
  })

  it('says what it wanted when it was given nothing', async () => {
    // Told apart from a page with problems,
    // so a caller cannot read being misused as a page that failed.
    const { code, said } = await quietly(undefined)
    expect(code).toBe(2)
    expect(said).toContain('give it the path')
  })
})
