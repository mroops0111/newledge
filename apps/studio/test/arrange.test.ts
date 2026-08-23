import { sectionHolding } from '@newledge/board'
import { gridPlacement } from '@newledge/board-layout'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Arrangement } from '../src/lib/arrange.js'
import { broodOf, firstArrangement } from '../src/lib/arrange.js'
import type { GraphEdge, GraphNode } from '../src/lib/graph.js'

function node(id: string, type: string, name = id): GraphNode {
  return { id, type, name }
}

function edge(type: string, from: string, to: string): GraphEdge {
  return { id: `${type}-${from}-${to}`, type, fromNodeId: from, toNodeId: to }
}

const graph = {
  nodes: [
    node('retrieval', 'Topic', 'Retrieval'),
    node('agents', 'Topic', 'Agents'),
    node('empty', 'Topic', 'Nothing filed here'),
    node('rag', 'Concept', 'RAG'),
    node('graphRag', 'Concept', 'GraphRAG'),
    node('planner', 'Concept', 'Planner'),
    node('embedding', 'Concept', 'Embedding'),
    node('faster', 'Claim', 'GraphRAG answers faster'),
    node('paper', 'Source', 'A paper'),
    node('stray', 'Source', 'Nobody cites this'),
  ],
  edges: [
    edge('belongsTo', 'rag', 'retrieval'),
    edge('belongsTo', 'graphRag', 'retrieval'),
    edge('belongsTo', 'planner', 'agents'),
    edge('concerns', 'faster', 'graphRag'),
    edge('introduces', 'paper', 'faster'),
  ],
}

// The arrangement is asked of a placement, so it can be tested against the one
// that needs no browser, which is the point of it being a port at all.
describe('what a board opens on', () => {
  let arranged: Arrangement

  beforeAll(async () => {
    arranged = await firstArrangement(graph, gridPlacement())
  })

  // A board is for the things a reader thinks with. What is asserted about one
  // of them, and where that came from, is read inside it rather than beside it.
  it('places the concepts, and leaves claims and sources to be opened', () => {
    expect(arranged.board.cards.map(card => card.nodeId).sort())
      .toEqual(['embedding', 'graphRag', 'planner', 'rag'])
  })

  it('draws a topic as its section rather than as a card among its members', () => {
    expect(arranged.board.cards.some(card => card.nodeId === 'retrieval')).toBe(false)
    expect(arranged.board.sections.map(section => section.name).sort()).toEqual(['Agents', 'Retrieval'])
  })

  it('leaves out a topic nobody filed anything under', () => {
    expect(arranged.board.sections.some(section => section.name === 'Nothing filed here')).toBe(false)
  })

  it('drops a node inside the section standing for the topic it is filed under', () => {
    const retrieval = arranged.board.sections.find(section => section.name === 'Retrieval')!
    const rag = arranged.board.cards.find(card => card.nodeId === 'rag')!
    expect(sectionHolding(rag, [retrieval])).toBeDefined()
  })

  it('leaves a concept nobody filed out in the open', () => {
    const loose = arranged.board.cards.find(card => card.nodeId === 'embedding')!
    expect(sectionHolding(loose, arranged.board.sections)).toBeUndefined()
  })

  it('arranges the same graph the same way every time', async () => {
    expect((await firstArrangement(graph, gridPlacement())).board).toEqual(arranged.board)
  })

  it('opens on an empty board when nothing has been absorbed yet', async () => {
    const nothing = await firstArrangement({ nodes: [], edges: [] }, gridPlacement())
    expect(nothing.board.cards).toEqual([])
    expect(nothing.board.sections).toEqual([])
  })

  it('carries back the lines when the placement worked them out', async () => {
    const routed = await firstArrangement(graph, {
      id: 'fake',
      place: async () => ({
        nodes: new Map([['rag', { x: 0, y: 0 }]]),
        groups: new Map(),
        edges: new Map([['e1', [{ x: 0, y: 0 }, { x: 10, y: 10 }]]]),
      }),
    })
    expect(routed.routes.get('e1')).toHaveLength(2)
  })

  it('drops a card the placement had no room for rather than putting it nowhere', async () => {
    const partial = await firstArrangement(graph, {
      id: 'fake',
      place: async () => ({ nodes: new Map([['rag', { x: 0, y: 0 }]]), groups: new Map() }),
    })
    expect(partial.board.cards.map(card => card.nodeId)).toEqual(['rag'])
  })
})

describe('a family after the layout has placed it', () => {
  const family = {
    nodes: [
      node('whole', 'Concept', 'Whole'),
      node('one', 'Concept', 'One'),
      node('two', 'Concept', 'Two'),
      node('three', 'Concept', 'Three'),
    ],
    edges: [
      edge('contains', 'whole', 'one'),
      edge('contains', 'whole', 'two'),
      edge('contains', 'whole', 'three'),
    ],
  }

  /** Placed in a row with gaps a layout worked out rather than gaps that match. */
  const uneven = {
    id: 'uneven',
    place: async () => ({
      nodes: new Map([
        ['whole', { x: 0, y: 0 }],
        ['one', { x: 0, y: 400 }],
        ['two', { x: 500, y: 400 }],
        ['three', { x: 1200, y: 400 }],
      ]),
      groups: new Map(),
    }),
  }

  // Uneven gaps read as carelessness however sound the reasoning behind them.
  it('spaces siblings on a row alike', async () => {
    const { board } = await firstArrangement(family, uneven)
    const at = (id: string): number => board.cards.find(card => card.nodeId === id)!.x
    expect(at('two') - at('one')).toBe(at('three') - at('two'))
  })

  it('centres a parent over the children it holds', async () => {
    const { board } = await firstArrangement(family, uneven)
    const at = (id: string): number => board.cards.find(card => card.nodeId === id)!.x
    const span = { from: at('one'), to: at('three') }
    expect(Math.abs(at('whole') - (span.from + span.to) / 2)).toBeLessThan(24)
  })

  it('leaves a card that is in no family exactly where it was placed', async () => {
    const loner = {
      nodes: [node('alone', 'Concept', 'Alone')],
      edges: [],
    }
    const { board } = await firstArrangement(loner, {
      id: 'fixed',
      place: async () => ({ nodes: new Map([['alone', { x: 240, y: 480 }]]), groups: new Map() }),
    })
    expect(board.cards[0]).toEqual({ nodeId: 'alone', x: 240, y: 480 })
  })
})

describe('moving sections so what relates sits nearer', () => {
  // Three sections in one row, with the outer two doing all the talking. A
  // packing has no reason to put them together, and a relation stretched the
  // width of the board is too long to be worth drawing.
  const spread = {
    nodes: [
      node('left', 'Topic'),
      node('middle', 'Topic'),
      node('right', 'Topic'),
      node('here', 'Concept'),
      node('quiet', 'Concept'),
      node('there', 'Concept'),
    ],
    edges: [
      edge('belongsTo', 'here', 'left'),
      edge('belongsTo', 'quiet', 'middle'),
      edge('belongsTo', 'there', 'right'),
      edge('relatesTo', 'here', 'there'),
      edge('relatesTo', 'there', 'here'),
    ],
  }

  it('shortens the reach between two sections that relate', async () => {
    const { board } = await firstArrangement(spread, gridPlacement())
    const at = (id: string): number => {
      const section = board.sections.find(one => one.id === `topic-${id}`)!
      return section.x + section.width / 2
    }
    expect(Math.abs(at('left') - at('right'))).toBeLessThan(Math.abs(at('left') - at('middle'))
      + Math.abs(at('middle') - at('right')))
  })

  it('takes the cards standing on a section with it', async () => {
    const { board } = await firstArrangement(spread, gridPlacement())
    for (const card of board.cards)
      expect(sectionHolding(card, board.sections)).toBeDefined()
  })

  it('leaves a board whose sections say nothing to each other where it was', async () => {
    const quiet = { nodes: spread.nodes, edges: spread.edges.filter(one => one.type === 'belongsTo') }
    const { board } = await firstArrangement(quiet, gridPlacement())
    expect(board.sections.map(section => section.x))
      .toEqual([...board.sections].sort((one, other) => one.x - other.x).map(section => section.x))
  })
})

describe('which way round a whole and its parts are laid out', () => {
  // Packed rather than laid out, two cards go wherever they fit, and a reader
  // has to work out which way a hierarchy runs from the arrow heads.
  const held = {
    nodes: [
      node('subscription', 'Concept', 'The subscription'),
      node('reader', 'Concept', 'The reader'),
    ],
    edges: [edge('contains', 'subscription', 'reader')],
  }

  it('says the relations inside a brood settle its order', async () => {
    const asked: string[] = []
    await firstArrangement(held, {
      id: 'noting',
      place: async (request) => {
        asked.push(...request.groups.filter(group => group.ranked === true).map(group => group.id))
        return gridPlacement().place(request)
      },
    })
    expect(asked).toEqual([broodOf('subscription')])
  })

  it('does not say it of a section, which holds whatever was filed there', async () => {
    const filed = {
      nodes: [node('topic', 'Topic'), node('one', 'Concept'), node('other', 'Concept')],
      edges: [edge('belongsTo', 'one', 'topic'), edge('belongsTo', 'other', 'topic')],
    }
    const ranked: string[] = []
    await firstArrangement(filed, {
      id: 'noting',
      place: async (request) => {
        ranked.push(...request.groups.filter(group => group.ranked === true).map(group => group.id))
        return gridPlacement().place(request)
      },
    })
    expect(ranked).toEqual([])
  })
})

describe('what shares a block with what', () => {
  // A concept and what is said about it read as one object, so they are laid
  // out as one rather than as a concept and a spray of claims around it.
  const said = {
    nodes: [
      node('term', 'Concept', 'A term'),
      node('whole', 'Concept', 'A whole'),
      node('one', 'Claim', 'One thing said'),
      node('other', 'Claim', 'Another thing said'),
    ],
    edges: [
      edge('concerns', 'one', 'term'),
      edge('concerns', 'other', 'term'),
      edge('contains', 'whole', 'term'),
    ],
  }

  async function blocks(graph: typeof said): Promise<Map<string, string[]>> {
    const seats = new Map<string, string[]>()
    await firstArrangement(graph, {
      id: 'noting',
      place: async (request) => {
        for (const node of request.nodes) {
          if (node.groupId !== undefined)
            seats.set(node.groupId, [...(seats.get(node.groupId) ?? []), node.id])
        }
        return gridPlacement().place(request)
      },
    }, ['Concept', 'Claim'])
    return seats
  }

  it('puts what is said about a concept in the block that concept is in', async () => {
    const seats = await blocks(said)
    const held = [...seats.values()].find(members => members.includes('one'))
    expect(held?.sort()).toEqual(['one', 'other', 'term', 'whole'])
  })

  // A claim is evidence about a concept and has no business sitting under a
  // topic away from what it is about, so it follows the concept off its ground.
  it('brings a claim to its concept even when it was filed elsewhere', async () => {
    const filed = {
      nodes: [...said.nodes, node('elsewhere', 'Topic', 'Elsewhere')],
      edges: [...said.edges, edge('belongsTo', 'one', 'elsewhere')],
    }
    const seats = await blocks(filed)
    const held = [...seats.values()].find(members => members.includes('term'))
    expect(held).toContain('one')
  })

  // A part is a thing in its own right and a reader may file it wherever they
  // like, so being filed somewhere beats being held by something.
  it('leaves a part where it was filed rather than moving it off its ground', async () => {
    const filed = {
      nodes: [
        node('whole', 'Concept', 'A whole'),
        node('part', 'Concept', 'A part'),
        node('elsewhere', 'Topic', 'Elsewhere'),
      ],
      edges: [edge('contains', 'whole', 'part'), edge('belongsTo', 'part', 'elsewhere')],
    }
    const seats = await blocks(filed)
    expect(seats.get(broodOf('whole'))).toBeUndefined()
  })

  it('keeps a concept in the block it was already in rather than starting one', async () => {
    const seats = await blocks(said)
    expect([...seats.keys()]).toEqual([broodOf('whole')])
  })
})
