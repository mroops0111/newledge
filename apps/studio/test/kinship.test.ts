import { describe, expect, it } from 'vitest'
import type { GraphEdge, GraphNode } from '../src/lib/graph.js'
import type { Note } from '../src/lib/drawing.js'
import { EDGE_STYLES, edgeStyle } from '../src/lib/boardStyle.js'
import { FAMILY_COLOURS, familyColours, familyOfRoot, kinColour, KINSHIP_KEYS, lineages, LINE_PAINTS, lineColour, NO_FAMILY, saidOnCard } from '../src/lib/kinship.js'
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

  const grey = (): string => 'grey'

  it('names the whole a part belongs to', () => {
    expect(saidOnCard(held.get('editor')!, [], byId, grey))
      .toEqual([{
        phrase: 'Part of',
        glyph: '\u25C6',
        colour: 'grey',
        names: ['Suite'],
      }])
  })

  it('names what a kind is a kind of, which is the other end of how it is written', () => {
    expect(saidOnCard(held.get('graphRag')!, [], byId, grey)[0]!.phrase).toBe('Kind of')
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

describe('the colours lines are drawn in', () => {
  // A line takes its colour by a key, and the end it points with is cut from
  // the same table. A key with no colour draws nothing at all, so the line
  // vanishes and only its end is left standing in open space.
  it('answers every key a relation can ask by', () => {
    const asked = new Set<string>([...KINSHIP_KEYS])
    for (const type of Object.keys(EDGE_STYLES))
      asked.add(edgeStyle(type).tone)
    for (const key of asked)
      expect(LINE_PAINTS.get(key), key).toBeDefined()
  })

  it('gives a key it does not know the colour of no family', () => {
    expect(lineColour('nothing defines this')).toBe(kinColour(NO_FAMILY))
  })
})

describe('everything a card says about itself, gathered by how it says it', () => {
  const byId = new Map<string, GraphNode>([
    ['rag', { id: 'rag', type: 'Concept', name: 'RAG' }],
    ['faster', { id: 'faster', type: 'Concept', name: 'GraphRAG' }],
    ['other', { id: 'other', type: 'Concept', name: 'Embedding' }],
  ])
  const grey = (): string => 'grey'
  const note = (type: string, otherId: string, end: 'from' | 'to'): Note =>
    ({ edgeId: `${type}-${otherId}`, type, otherId, end })

  it('reads a relation one way from one end and the other way from the other', () => {
    expect(saidOnCard([], [note('uses', 'faster', 'from')], byId, grey)[0]!.phrase).toBe('Uses')
    expect(saidOnCard([], [note('uses', 'rag', 'to')], byId, grey)[0]!.phrase).toBe('Used by')
  })

  it('says one thing once and names everything it says it about', () => {
    const said = saidOnCard(
      [],
      [note('uses', 'faster', 'from'), note('uses', 'other', 'from')],
      byId,
      grey,
    )
    expect(said).toHaveLength(1)
    expect(said[0]!.names).toEqual(['GraphRAG', 'Embedding'])
  })

  it('keeps two families apart, since a colour has to mean one of them', () => {
    const held = lineages([
      edge('contains', 'one', 'card'),
      edge('contains', 'other', 'card'),
    ])
    const said = saidOnCard(held.get('card')!, [], byId, parentId => parentId)
    expect(said.map(one => one.colour)).toEqual(['one', 'other'])
  })

  it('says what the board drew and what it could not in the one place', () => {
    const held = lineages([edge('contains', 'rag', 'card')])
    const said = saidOnCard(held.get('card')!, [note('uses', 'faster', 'from')], byId, grey)
    expect(said.map(one => one.phrase)).toEqual(['Part of', 'Uses'])
  })

  it('reads a relation nobody has chosen words for off its own name', () => {
    expect(saidOnCard([], [note('dependsOn', 'rag', 'from')], byId, grey)[0]!.phrase)
      .toBe('Depends on')
  })

  it('names a card the graph no longer holds by the only name it has left', () => {
    expect(saidOnCard([], [note('uses', 'gone', 'from')], byId, grey)[0]!.names).toEqual(['gone'])
  })

  it('carries no mark on what was never drawn, since no line ends in one', () => {
    expect(saidOnCard([], [note('uses', 'rag', 'from')], byId, grey)[0]!.glyph).toBeUndefined()
  })
})
