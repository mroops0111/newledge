import { describe, expect, it } from 'vitest'
import { cardExtent } from '../src/lib/measure.js'
import { borderRun, curvePath, orthogonalPath } from '../src/lib/path.js'

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
    const wordy = cardExtent(node('Concept', 'RAG', 'Retrieval augmented generation. '.repeat(9)))
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
      .toBeLessThan(cardExtent(node('Concept', 'RAG', 'A method. '.repeat(9))).height)
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

describe('anchoring a line on a card rather than on a point', () => {
  const upper = { x: 0, y: 0, width: 200, height: 100 }
  const lower = { x: 0, y: 300, width: 200, height: 100 }

  it('leaves the near side of one card and arrives at the near side of the other', () => {
    const [from, to] = borderRun(upper, lower)
    expect(from).toEqual({ x: 100, y: 100 })
    expect(to).toEqual({ x: 100, y: 300 })
  })

  it('takes the short way round when the target sits above the source', () => {
    const [from, to] = borderRun(lower, upper)
    expect(from).toEqual({ x: 100, y: 300 })
    expect(to).toEqual({ x: 100, y: 100 })
  })

  it('leaves through the side when the other card is beside it', () => {
    const [from] = borderRun(upper, { x: 500, y: 0, width: 200, height: 100 })
    expect(from).toEqual({ x: 200, y: 50 })
  })

  it('stays put when two cards sit on top of each other', () => {
    const [from, to] = borderRun(upper, upper)
    expect(from).toEqual(to)
  })

  it('bows a curve off the straight line, so two never lie on top of each other', () => {
    const path = curvePath({ x: 0, y: 0 }, { x: 100, y: 0 })
    expect(path).not.toContain('Q 50,0')
    expect(path.startsWith('M 0,0')).toBe(true)
  })
})

describe('how wide a card is', () => {
  // A section is sized by what it holds, so a topic's own width is only ever
  // the heading card a reader may add, never the ground it becomes.
  it('gives everything a reader reads the same width', () => {
    const widths = ['Concept', 'Claim', 'Source', 'Question']
      .map(type => cardExtent(node(type, 'A name', 'A description.')).width)
    expect(new Set(widths).size).toBe(1)
  })

  it('draws a topic narrower, since as a card it is a heading', () => {
    expect(cardExtent(node('Topic', 'Retrieval')).width)
      .toBeLessThan(cardExtent(node('Concept', 'RAG')).width)
  })
})
