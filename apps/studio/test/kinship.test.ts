import { describe, expect, it } from 'vitest'
import type { GraphEdge } from '../src/lib/graph.js'
import { FAMILY_COLOURS, familyColours, familyOfRoot, lineageLabel, lineages } from '../src/lib/kinship.js'
import { cardExtent } from '../src/lib/measure.js'

function edge(type: string, from: string, to: string): GraphEdge {
  return { id: `${type}-${from}-${to}`, type, fromNodeId: from, toNodeId: to }
}

const edges: GraphEdge[] = [
  edge('contains', 'ecosystem', 'compdf'),
  edge('contains', 'ecosystem', 'lynxpdf'),
  edge('extends', 'graphRag', 'rag'),
  edge('uses', 'rag', 'embedding'),
]

describe('what a card wears to say what it belongs to', () => {
  const worn = familyColours(edges)

  it('gives a whole and its parts one colour, so belonging is seen not traced', () => {
    expect(worn.get('compdf')).toBe(worn.get('ecosystem'))
    expect(worn.get('lynxpdf')).toBe(worn.get('ecosystem'))
  })

  // A whole holds its parts and a kind extends what it is a kind of, so the
  // two are written in opposite directions and only one end is the root.
  it('gives a kind the colour of what it is a kind of, not the other way round', () => {
    expect(worn.get('graphRag')).toBe(worn.get('rag'))
  })

  it('keeps two families apart', () => {
    expect(worn.get('ecosystem')).not.toBe(worn.get('rag'))
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
    ['ecosystem', { id: 'ecosystem', type: 'Concept', name: 'Digital Enablement Ecosystem' }],
    ['rag', { id: 'rag', type: 'Concept', name: 'RAG' }],
  ])
  const held = lineages(edges)

  it('names the whole a part belongs to', () => {
    expect(lineageLabel(held.get('compdf')!, byId)).toBe('Part of Digital Enablement Ecosystem')
  })

  it('names what a kind is a kind of, which is the other end of how it is written', () => {
    expect(lineageLabel(held.get('graphRag')!, byId)).toBe('Kind of RAG')
  })

  it('says nothing on a card that hangs off nothing', () => {
    expect(held.has('embedding')).toBe(false)
    expect(held.has('ecosystem')).toBe(false)
  })

  // A card that says what it hangs off is taller than one that does not, and a
  // layout given the wrong height lays the board out wrong.
  it('costs a card a row, which the arrangement has to know about', () => {
    const node = { id: 'compdf', type: 'Concept', name: 'ComPDF', description: 'A kit.' }
    expect(cardExtent(node, true).height).toBeGreaterThan(cardExtent(node, false).height)
  })
})

describe('a family of one', () => {
  // A middle card leads a family of its own and wears that, so the family
  // above it is left with nobody but itself, and a colour worn by one card
  // announces a group that is not there.
  const chained = familyColours([
    edge('contains', 'kdan', 'ecosystem'),
    edge('contains', 'ecosystem', 'compdf'),
    edge('contains', 'ecosystem', 'lynxpdf'),
  ])

  it('leaves it uncoloured', () => {
    expect(chained.has('kdan')).toBe(false)
  })

  it('still colours the family the middle card leads', () => {
    expect(chained.get('compdf')).toBe(chained.get('ecosystem'))
    expect(chained.get('lynxpdf')).toBe(chained.get('ecosystem'))
  })
})

describe('what colour a relation is drawn in', () => {
  const chained = [
    edge('contains', 'kdan', 'ecosystem'),
    edge('contains', 'ecosystem', 'compdf'),
    edge('contains', 'ecosystem', 'lynxpdf'),
  ]
  const led = familyOfRoot(chained)

  // A relation belongs to the family its parent leads. Asking the child gives
  // the wrong answer whenever that child leads a family of its own.
  it('gives a relation the colour of the family its parent leads', () => {
    expect(led.get('ecosystem')).toBe(familyColours(chained).get('compdf'))
  })

  it('leaves a relation into a family of one uncoloured, as that family is', () => {
    expect(led.has('kdan')).toBe(false)
  })
})
