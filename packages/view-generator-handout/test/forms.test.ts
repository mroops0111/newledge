import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { argumentsFor, askedOf, FORMS, formOfId, LEVELS } from '../src/forms.js'

const exam = formOfId('exam')!

describe('the forms a board can be written in', () => {
  it('ships a skill directory for every form it offers', () => {
    // The list and the directories are the same declaration,
    // so a form offered with nothing behind it would start and fail.
    for (const form of FORMS)
      expect(() => new URL(`../skills/${form.id}/SKILL.md`, import.meta.url)).not.toThrow()
  })

  it('gives every ask a fallback that is one of its own choices', () => {
    for (const form of FORMS) {
      for (const ask of form.asks)
        expect(ask.choices.map(one => one.id)).toContain(ask.fallback)
    }
  })

  it('offers a handbook no choices, since a lookup nobody makes twice is one', () => {
    expect(formOfId('handbook')?.asks).toEqual([])
  })

  it('knows nothing of a form it does not ship', () => {
    expect(formOfId('quiz')).toBeUndefined()
  })
})

describe('askedOf', () => {
  it('fills in every ask a reader said nothing about', () => {
    expect(askedOf(exam, {})).toEqual({ level: 'mixed', kinds: 'mixed', length: 'standard' })
  })

  it('keeps what a reader did say', () => {
    expect(askedOf(exam, { level: 'judge' }).level).toBe('judge')
  })

  it('drops a value nobody offered rather than passing it on', () => {
    // A skill handed a choice outside its vocabulary,
    // cannot tell that from one it has not implemented yet.
    expect(askedOf(exam, { level: 'impossible' }).level).toBe('mixed')
  })

  it('drops a key the form never asked about', () => {
    expect(askedOf(exam, { depth: 'deep' })).not.toHaveProperty('depth')
  })
})

describe('argumentsFor', () => {
  it('keeps the material first, since that is the path a skill opens', () => {
    expect(argumentsFor('material/a.json', { level: 'recall' }))
      .toBe('material/a.json level=recall')
  })

  it('hands over a path alone when a form asks nothing', () => {
    expect(argumentsFor('material/a.json', {})).toBe('material/a.json')
  })
})

describe('the axis a question sits on', () => {
  const depth = exam.asks.find(ask => ask.id === 'level')!

  it('is named for the thinking a question draws on, not for how hard it is', () => {
    // Calling it difficulty is the mistake the frameworks warn about,
    // since an obscure fact is a hard recall question and is still recall.
    expect(depth.label).toBe('Depth')
  })

  it('says so where the skill that writes the questions will read it', () => {
    const skill = readFileSync(new URL('../skills/exam/SKILL.md', import.meta.url), 'utf-8')
    expect(skill).toContain('Depth is not difficulty')
    expect(skill).toContain('Where the three levels come from')
  })

  it('names where the three came from, rather than presenting them as its own', () => {
    const skill = readFileSync(new URL('../skills/exam/SKILL.md', import.meta.url), 'utf-8')
    expect(skill).toContain("Webb's Depth of Knowledge")
    expect(skill).toContain("Bloom's taxonomy")
  })
})

describe('the levels a question can test', () => {
  it('are the three a question carries, without the one meaning all of them', () => {
    expect(LEVELS.map(one => one.id)).toEqual(['recall', 'apply', 'judge'])
  })

  it('are what the exam offers, so a page and its request cannot drift', () => {
    const offered = exam.asks.find(ask => ask.id === 'level')!.choices.map(one => one.id)
    for (const level of LEVELS)
      expect(offered).toContain(level.id)
  })
})
