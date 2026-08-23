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
    const wordy = cardExtent(node('Concept', 'RAG', 'Retrieval augmented generation. '.repeat(14)))
    const endless = cardExtent(node('Concept', 'RAG', 'Retrieval augmented generation. '.repeat(90)))
    expect(endless.height).toBe(wordy.height)
  })

  it('costs a concept with no definition less than one with a definition', () => {
    const bare = cardExtent(node('Concept', 'RAG'))
    const defined = cardExtent(node('Concept', 'RAG', 'Retrieval augmented generation.'))
    expect(bare.height).toBeLessThan(defined.height)
  })

  it('keeps provenance small, so it never competes with a thought', () => {
    expect(cardExtent(node('Source', 'A paper')).height)
      .toBeLessThan(cardExtent(node('Concept', 'RAG', 'A method. '.repeat(40))).height)
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

  // A hierarchy is read as a family tree, and a family tree turns square.
  it('turns a corner square', () => {
    expect(orthogonalPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]))
      .toBe('M 0,0 L 100,0 L 100,100')
  })

  it('rounds one off when it is asked to', () => {
    const path = orthogonalPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], 20)
    expect(path).toContain('Q 100,0')
  })

  it('never rounds past the middle of a run that is shorter than the corner', () => {
    const path = orthogonalPath([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }], 10)
    expect(path).toContain('L 2,0')
  })

  it('leaves a corner where it is when a route doubles back on itself', () => {
    const path = orthogonalPath([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }], 10)
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
  // A card is a card. A section is sized by what it holds instead, which is a
  // different mechanism entirely and never reads a width from a type.
  it('gives every card the same width, whatever kind it is', () => {
    const widths = ['Concept', 'Claim', 'Source', 'Topic', 'Question']
      .map(type => cardExtent(node(type, 'A name', 'A description.')).width)
    expect(new Set(widths).size).toBe(1)
  })

  it('still lets a kind be its own height, since that is what it holds', () => {
    const heights = ['Concept', 'Claim', 'Source', 'Topic']
      .map(type => cardExtent(node(type, 'A name', 'A description.')).height)
    expect(new Set(heights).size).toBeGreaterThan(1)
  })
})

describe('following a route rather than cutting across it', () => {
  // A route with bends was worked out to go round the cards in between, so
  // bowing from one end to the other instead runs through them and leaves the
  // line hidden under one.
  it('keeps every bend a router handed back', () => {
    const path = orthogonalPath([{ x: 0, y: 0 }, { x: 0, y: 50 }, { x: 90, y: 50 }, { x: 90, y: 90 }])
    expect(path).toBe('M 0,0 L 0,50 L 90,50 L 90,90')
  })

  it('has nothing to go round when a route is only its two ends', () => {
    const path = curvePath({ x: 0, y: 0 }, { x: 100, y: 0 })
    expect(path.split(' ').filter(part => part === 'C')).toHaveLength(1)
  })
})
