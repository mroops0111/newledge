import { describe, expect, it } from 'vitest'
import { cardExtent } from '../src/lib/measure.js'
import { orthogonalPath } from '../src/lib/path.js'

function node(type: string, name: string, description?: string): {
  id: string
  type: string
  name: string
  description?: string
} {
  return { id: name, type, name, ...(description === undefined ? {} : { description }) }
}

describe('how tall a card will be', () => {
  it('grows a claim with the sentence, since clipping one destroys it', () => {
    const short = cardExtent(node('Claim', 'It is faster'))
    const long = cardExtent(node('Claim', 'It is faster '.repeat(12)))
    expect(long.height).toBeGreaterThan(short.height)
  })

  it('costs a concept no more for a long definition than for one that fills the clamp', () => {
    const wordy = cardExtent(node('Concept', 'RAG', 'Retrieval augmented generation. '.repeat(6)))
    const endless = cardExtent(node('Concept', 'RAG', 'Retrieval augmented generation. '.repeat(60)))
    expect(endless.height).toBe(wordy.height)
  })

  it('costs a concept with no definition less than one with a definition', () => {
    const bare = cardExtent(node('Concept', 'RAG'))
    const defined = cardExtent(node('Concept', 'RAG', 'Retrieval augmented generation.'))
    expect(bare.height).toBeLessThan(defined.height)
  })

  it('keeps provenance small, so it never competes with a thought', () => {
    expect(cardExtent(node('Source', 'A paper')).height)
      .toBeLessThan(cardExtent(node('Concept', 'RAG', 'A method.')).height)
  })

  it('gives a type the ontology adds a size rather than none', () => {
    expect(cardExtent(node('Question', 'What is this?')).height).toBeGreaterThan(0)
  })

  it('draws a topic as a heading rather than as a card of substance', () => {
    expect(cardExtent(node('Topic', 'Retrieval')).height)
      .toBeLessThan(cardExtent(node('Claim', 'It is faster')).height)
  })
})

describe('drawing a line along the route it was given', () => {
  it('draws nothing when it was given nothing', () => {
    expect(orthogonalPath([])).toBe('')
  })

  it('draws a straight run when there is nowhere to bend', () => {
    expect(orthogonalPath([{ x: 0, y: 0 }, { x: 10, y: 0 }])).toBe('M 0,0 L 10,0')
  })

  it('rounds a corner rather than turning it square', () => {
    const path = orthogonalPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }])
    expect(path).toContain('Q 100,0')
  })

  it('never rounds past the middle of a run that is shorter than the corner', () => {
    const path = orthogonalPath([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }], 10)
    expect(path).toContain('L 2,0')
  })

  it('leaves a corner where it is when a route doubles back on itself', () => {
    const path = orthogonalPath([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }])
    expect(path).toContain('Q 0,0')
  })
})
