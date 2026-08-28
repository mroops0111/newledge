import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BORROWED_TOKENS, isWholePage, VIEW_STYLE } from '../src/lib/viewStyle.js'

const here = join(import.meta.dirname, '..')

/**
 * The vocabulary a generator is handed, read from where a generator reads it.
 * Crossing into the plugin is deliberate.
 * The two halves of this agreement live apart,
 * one in a stylesheet and one in a document an agent reads,
 * and nothing else would notice them drifting.
 */
const vocabulary = readFileSync(
  join(here, '../../packages/view-generator-learning/skills/shared/style.md'),
  'utf-8',
)

const palette = readFileSync(join(here, 'src/index.css'), 'utf-8')

function named(): readonly string[] {
  // The classes are the bolded names under the Classes heading.
  const section = vocabulary.slice(vocabulary.indexOf('## Classes'), vocabulary.indexOf('## Elements'))
  return [...section.matchAll(/- \*\*`(\w[\w-]*)`\*\*/g)].map(found => found[1]!)
}

describe('what a generator is told it may use', () => {
  it('names classes at all, so the check itself cannot pass vacuously', () => {
    expect(named().length).toBeGreaterThan(4)
  })

  it('styles every class it offers, since one it does not style does nothing', () => {
    for (const one of named())
      expect(VIEW_STYLE, `class "${one}" is offered and never styled`).toContain(`.${one}`)
  })

  it('tells a generator to write no style, colour, or font of its own', () => {
    // The whole reason the look is here rather than in whatever wrote the page.
    expect(vocabulary).toContain('Do not write a `<style>` block')
  })

  it('tells a generator to write a fragment rather than a page', () => {
    expect(vocabulary).toContain('No `<!DOCTYPE>`')
  })
})

describe('the palette a view borrows', () => {
  it('borrows only colours this application actually declares', () => {
    // Copying them would be two lists to keep in step.
    // These are read off the running application,
    // so a name that is not there would read as empty.
    for (const token of BORROWED_TOKENS)
      expect(palette, `--${token} is borrowed and never declared`).toContain(`--${token}:`)
  })

  it('chooses no colour of its own, so nothing can disagree with the surface', () => {
    const rules = VIEW_STYLE.slice(VIEW_STYLE.indexOf('body {'))
    expect(rules).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(rules).not.toMatch(/\b(?:rgb|hsl|oklch)\(/i)
  })
})

describe('isWholePage', () => {
  it('knows a document from a fragment', () => {
    expect(isWholePage('<!DOCTYPE html><html><body>hi</body></html>')).toBe(true)
    expect(isWholePage('\n  <html lang="en">')).toBe(true)
    expect(isWholePage('<p class="lede">hi</p>')).toBe(false)
    expect(isWholePage('<section class="term"><h2>A</h2></section>')).toBe(false)
  })

  it('is not fooled by a fragment that merely mentions one', () => {
    expect(isWholePage('<p>Write no <code>&lt;!doctype html&gt;</code></p>')).toBe(false)
  })
})
