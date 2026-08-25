import type { Section } from '@newledge/board'
import { describe, expect, it } from 'vitest'
import { grownSections } from '../src/lib/grounds.js'

function section(over: Partial<Section> = {}): Section {
  return { id: 'topic-retrieval', name: 'Retrieval', x: 0, y: 0, width: 400, height: 300, ...over }
}

describe('ground grown to hold what stands on it', () => {
  it('leaves a section alone when nothing is standing on it', () => {
    const alone = section()
    expect(grownSections([alone], [])).toEqual([alone])
  })

  it('leaves a section alone when what stands on it already fits', () => {
    const roomy = section()
    const inside = [{ x: 20, y: 20, width: 100, height: 100 }]
    expect(grownSections([roomy], inside)).toEqual([roomy])
  })

  // A card turns out taller than the estimate the layout sized the ground from.
  it('reaches past a card that turned out bigger than the ground it was given', () => {
    const tight = section({ width: 200, height: 200 })
    const [grown] = grownSections([tight], [{ x: 20, y: 20, width: 300, height: 400 }])
    expect(grown!.width).toBeGreaterThan(320)
    expect(grown!.height).toBeGreaterThan(420)
  })

  // A reader who drags a card off has not asked the ground to close behind it.
  it('never shrinks', () => {
    const roomy = section({ width: 900, height: 900 })
    const [grown] = grownSections([roomy], [{ x: 10, y: 10, width: 40, height: 40 }])
    expect(grown).toEqual(roomy)
  })

  it('leaves a card standing on another section out of it', () => {
    const here = section({ id: 'here', x: 0, y: 0, width: 200, height: 200 })
    const there = section({ id: 'there', x: 600, y: 0, width: 200, height: 200 })
    const [grownHere] = grownSections([here, there], [{ x: 620, y: 20, width: 400, height: 400 }])
    expect(grownHere).toEqual(here)
  })
})
