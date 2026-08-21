import { sectionHolding } from '@newledge/board'
import { gridPlacement } from '@newledge/board-layout'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Arrangement } from '../src/lib/arrange.js'
import { firstArrangement } from '../src/lib/arrange.js'
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

  it('places every node the graph holds, so nothing is hiding off the board', () => {
    expect(arranged.board.cards.map(card => card.nodeId).sort())
      .toEqual(['embedding', 'faster', 'graphRag', 'paper', 'planner', 'rag', 'stray'])
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

  it('sits a claim nobody filed with the concept it is about', () => {
    const retrieval = arranged.board.sections.find(section => section.name === 'Retrieval')!
    const faster = arranged.board.cards.find(card => card.nodeId === 'faster')!
    expect(sectionHolding(faster, [retrieval])).toBeDefined()
  })

  it('sits a source with what it introduced, one step further out', () => {
    const retrieval = arranged.board.sections.find(section => section.name === 'Retrieval')!
    const paper = arranged.board.cards.find(card => card.nodeId === 'paper')!
    expect(sectionHolding(paper, [retrieval])).toBeDefined()
  })

  it('leaves a node with nothing to sit beside out in the open', () => {
    for (const id of ['embedding', 'stray']) {
      const loose = arranged.board.cards.find(card => card.nodeId === id)!
      expect(sectionHolding(loose, arranged.board.sections)).toBeUndefined()
    }
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
