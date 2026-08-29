import { LEVELS } from '@newledge/view-generator-handout/forms'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { VIEW_BEHAVIOUR } from '../src/lib/viewBehaviour.js'
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
  join(here, '../../packages/view-generator-handout/skills/shared/style.md'),
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
    // Read across the wrap, since prose is filled rather than laid out.
    expect(vocabulary.replace(/\s+/g, ' ')).toContain('do not write a `<script>`')
    expect(vocabulary.replace(/\s+/g, ' ')).toContain('Do not write a `<style>` block')
  })

  it('tells a generator to write a fragment rather than a page', () => {
    expect(vocabulary).toContain('No `<!DOCTYPE>`')
  })

  it('tells a generator to write no control, since the surface draws them', () => {
    expect(vocabulary).toContain('Do not build your own controls')
  })
})

/**
 * The markup a generator writes is read twice,
 * once by a stylesheet and once by a script, both of them here.
 * A class renamed in one and not the other is a page that looks right,
 * and does nothing.
 */
describe('what the surface does with what it is handed', () => {
  const worked = ['question', 'choice', 'answer', 'chapter']

  it('acts on every class the reference says the surface acts on', () => {
    for (const one of worked)
      expect(VIEW_BEHAVIOUR, `class "${one}" is worked and never read`).toContain(one)
  })

  it('reads the attribute a question says what it tests with', () => {
    expect(vocabulary).toContain('data-level')
    expect(VIEW_BEHAVIOUR).toContain('data-level')
  })

  it('reads the attribute that marks the right option', () => {
    expect(vocabulary).toContain('data-correct')
    expect(VIEW_BEHAVIOUR).toContain('data-correct')
  })

  it('names every level a question may carry, in the words a reader sees', () => {
    // Taken from the plugin rather than written again,
    // so a fourth level arrives named rather than unlabelled.
    for (const level of LEVELS)
      expect(VIEW_BEHAVIOUR).toContain(`"${level.id}":"${level.label}"`)
  })

  it('styles what it draws, so nothing it inserts arrives unstyled', () => {
    const drawn = [...VIEW_BEHAVIOUR.matchAll(/make\('\w+', '(v-[\w-]+)'/g)].map(found => found[1]!)
    expect(drawn.length).toBeGreaterThan(4)
    for (const one of new Set(drawn))
      expect(VIEW_STYLE, `"${one}" is drawn and never styled`).toContain(`.${one}`)
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
