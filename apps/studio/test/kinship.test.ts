import { describe, expect, it } from 'vitest'
import type { GraphEdge } from '../src/lib/graph.js'
import { FAMILY_COLOURS, familyColours, familyOfRoot, lineageLabel, lineages } from '../src/lib/kinship.js'
import { cardExtent } from '../src/lib/measure.js'

function edge(type: string, from: string, to: string): GraphEdge {
  return { id: `${type}-${from}-${to}`, type, fromNodeId: from, toNodeId: to }
}

const edges: GraphEdge[] = [
  edge('contains', 'suite', 'editor'),
  edge('contains', 'suite', 'viewer'),
  edge('extends', 'graphRag', 'rag'),
  edge('uses', 'rag', 'embedding'),
]

describe('what a card wears to say what it belongs to', () => {
  const worn = familyColours(edges)

  it('gives a whole and its parts one colour, so belonging is seen not traced', () => {
    expect(worn.get('editor')).toBe(worn.get('suite'))
    expect(worn.get('viewer')).toBe(worn.get('suite'))
  })

  // A whole holds its parts and a kind extends what it is a kind of, so the
  // two are written in opposite directions and only one end is the root.
  it('gives a kind the colour of what it is a kind of, not the other way round', () => {
    expect(worn.get('graphRag')).toBe(worn.get('rag'))
  })

  it('keeps two families apart', () => {
    expect(worn.get('suite')).not.toBe(worn.get('rag'))
  })

  it('leaves a card in no family wearing nothing, so the colour means membership', () => {
    expect(worn.has('embedding')).toBe(false)
  })

  it('wears the same colours every time the same graph is opened', () => {
    expect([...familyColours(edges)]).toEqual([...worn])
  })

  it('wears the same colours whatever order the relations arrive in', () => {
    expect([...familyColours([...edges].reverse())].sort()).toEqual([...worn].sort())
  })

  it('runs out of colours by starting again rather than by drawing nothing', () => {
    const many = Array.from({ length: FAMILY_COLOURS.length + 2 }, (_unused, index) =>
      edge('contains', `whole${index}`, `part${index}`))
    const stretched = familyColours(many)
    expect([...stretched.values()].every(colour => FAMILY_COLOURS.includes(colour))).toBe(true)
  })
})

describe('what a card says it hangs off', () => {
  const byId = new Map([
    ['suite', { id: 'suite', type: 'Concept', name: 'Suite' }],
    ['rag', { id: 'rag', type: 'Concept', name: 'RAG' }],
  ])
  const held = lineages(edges)

  it('names the whole a part belongs to', () => {
    expect(lineageLabel(held.get('editor')![0]!, byId)).toBe('Part of Suite')
  })

  it('names what a kind is a kind of, which is the other end of how it is written', () => {
    expect(lineageLabel(held.get('graphRag')![0]!, byId)).toBe('Kind of RAG')
  })

  it('says nothing on a card that hangs off nothing', () => {
    expect(held.has('embedding')).toBe(false)
    expect(held.has('suite')).toBe(false)
  })

  // A card that says what it hangs off is taller than one that does not, and a
  // layout given the wrong height lays the board out wrong.
  it('costs a card a row, which the arrangement has to know about', () => {
    const node = { id: 'editor', type: 'Concept', name: 'Editor', description: 'A kit.' }
    expect(cardExtent(node, 2).height).toBeGreaterThan(cardExtent(node, 1).height)
    expect(cardExtent(node, 1).height).toBeGreaterThan(cardExtent(node, 0).height)
  })
})

describe('a family of one', () => {
  // A middle card leads a family of its own and wears that, so the family
  // above it is left with nobody but itself, and a colour worn by one card
  // announces a group that is not there.
  const chained = familyColours([
    edge('contains', 'vendor', 'suite'),
    edge('contains', 'suite', 'editor'),
    edge('contains', 'suite', 'viewer'),
  ])

  it('leaves it uncoloured', () => {
    expect(chained.has('vendor')).toBe(false)
  })

  it('still colours the family the middle card leads', () => {
    expect(chained.get('editor')).toBe(chained.get('suite'))
    expect(chained.get('viewer')).toBe(chained.get('suite'))
  })
})

describe('what colour a relation is drawn in', () => {
  const chained = [
    edge('contains', 'vendor', 'suite'),
    edge('contains', 'suite', 'editor'),
    edge('contains', 'suite', 'viewer'),
  ]
  const led = familyOfRoot(chained)

  // A relation belongs to the family its parent leads. Asking the child gives
  // the wrong answer whenever that child leads a family of its own.
  it('gives a relation the colour of the family its parent leads', () => {
    expect(led.get('suite')).toBe(familyColours(chained).get('editor'))
  })

  it('leaves a relation into a family of one uncoloured, as that family is', () => {
    expect(led.has('vendor')).toBe(false)
  })
})

describe('a card in two families', () => {
  // A card wearing one family and naming another says two things and settles
  // nothing, so both come from the same choice.
  const both = [
    edge('contains', 'suite', 'signing'),
    edge('instantiates', 'signing', 'electronicSignature'),
  ]

  it('wears the family it says it hangs off', () => {
    const named = lineages(both).get('signing')![0]!.parentId
    expect(familyColours(both).get('signing')).toBe(familyColours(both).get(named))
  })
})

describe('a card that hangs off more than one thing', () => {
  const both = [
    edge('contains', 'suite', 'signing'),
    edge('instantiates', 'signing', 'electronicSignature'),
  ]

  // Naming only the first leaves the second with nowhere to be said at all.
  it('names every one of them', () => {
    expect(lineages(both).get('signing')).toHaveLength(2)
  })

  it('names being part of something before being a kind of something', () => {
    expect(lineages(both).get('signing')![0]!.type).toBe('contains')
  })
})
