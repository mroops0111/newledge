import type { SkillFrontmatter as SkillFrontmatterType } from '@braidhq/schema'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { validateSkillStructure } from '@braidhq/core'
import { SkillFrontmatter } from '@braidhq/schema'
import { parse as parseYaml } from 'yaml'
import { describe, expect, it } from 'vitest'
import { knowledgeOntology } from '../src/index.js'

// braid's own frontmatter parser lives in @braidhq/server and is not published,
// so this mirrors it, splitting the `---` block,
// lowering the kebab keys to the camel case the zod schema expects,
// then running the body through the framework validator.
const DELIMITER = '---'

function kebabToCamel(key: string): string {
  return key.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
}

function normaliseKeys(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(normaliseKeys)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value))
      out[kebabToCamel(key)] = normaliseKeys(nested)
    return out
  }
  return value
}

function parseSkillDoc(content: string): { frontmatter: SkillFrontmatterType, body: string } {
  const lines = content.split('\n')
  if (lines[0]?.trim() !== DELIMITER)
    throw new Error('SKILL.md must open with a "---" frontmatter line')
  const close = lines.findIndex((line, index) => index > 0 && line.trim() === DELIMITER)
  if (close === -1)
    throw new Error('SKILL.md frontmatter is not terminated')
  const raw = normaliseKeys(parseYaml(lines.slice(1, close).join('\n')))
  const body = lines.slice(close + 1).join('\n')
  return { frontmatter: SkillFrontmatter.parse(raw), body }
}

function readSkill(verb: string): string {
  return readFileSync(fileURLToPath(new URL(`../skills/${verb}/SKILL.md`, import.meta.url)), 'utf-8')
}

function dirBasename(dir: URL | string): string {
  const path = typeof dir === 'string' ? dir : dir.pathname
  return path.replace(/\/+$/, '').split('/').pop() ?? ''
}

const VERBS = ['extract', 'converge', 'clarify'] as const

describe('knowledge skills', () => {
  it.each(VERBS)('%s SKILL.md parses and passes braid structure validation', (verb) => {
    const { frontmatter, body } = parseSkillDoc(readSkill(verb))
    expect(frontmatter.name).toBe(verb)
    expect(frontmatter.braid.category).toBe('build')

    const result = validateSkillStructure({ body, frontmatter })
    expect(result.ok, JSON.stringify(result.issues)).toBe(true)
  })
})

describe('knowledgeOntology plugin wiring', () => {
  it('registers the three skills under the knowledge namespace', () => {
    expect(knowledgeOntology.skillNamespace).toBe('knowledge')
    expect(knowledgeOntology.skills?.map(s => dirBasename(s.directory))).toEqual([...VERBS])
  })

  it('mounts the shared ontology reference dir', () => {
    expect(knowledgeOntology.referenceDirs?.map(r => r.name)).toEqual(['knowledge'])
  })

  it('binds a per-unit extract with a chunked converge checkpoint', () => {
    const batch = knowledgeOntology.batch
    expect(batch?.perUnit.skillId).toBe('knowledge:extract')
    expect(batch?.checkpoint?.skillId).toBe('knowledge:converge')
    expect(batch?.checkpoint?.chunkSize).toBe(5)
    expect(batch?.checkpoint?.runAtEnd).toBe(true)
    expect(batch?.deriveUnits).toBeUndefined()
  })
})
