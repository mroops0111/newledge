import { sectionHolding } from '@newledge/board'
import { describe, expect, it } from 'vitest'
import { firstArrangement } from '../src/lib/arrange.js'
import type { GraphEdge, GraphNode } from '../src/lib/graph.js'

function node(id: string, type: string, name = id): GraphNode {
  return { id, type, name }
}

function filedUnder(from: string, to: string): GraphEdge {
  return { id: `${from}-${to}`, type: 'belongsTo', fromNodeId: from, toNodeId: to }
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
  ],
  edges: [
    filedUnder('rag', 'retrieval'),
    filedUnder('graphRag', 'retrieval'),
    filedUnder('planner', 'agents'),
    filedUnder('faster', 'retrieval'),
    { id: 'concerns', type: 'concerns', fromNodeId: 'faster', toNodeId: 'graphRag' },
  ] as GraphEdge[],
}

describe('what a board opens on', () => {
  const board = firstArrangement(graph)

  it('lays out the concepts, since those are what a reader thinks with', () => {
    expect(board.cards.map(card => card.nodeId).sort()).toEqual(['embedding', 'graphRag', 'planner', 'rag'])
  })

  it('leaves the evidence off, for a reader to pull in when they want it', () => {
    const placed = new Set(board.cards.map(card => card.nodeId))
    expect(placed.has('faster')).toBe(false)
    expect(placed.has('paper')).toBe(false)
  })

  it('draws a section for each topic that has something filed under it', () => {
    expect(board.sections.map(section => section.name).sort()).toEqual(['Agents', 'Retrieval'])
  })

  it('drops a concept inside the section standing for the topic it is filed under', () => {
    const retrieval = board.sections.find(section => section.name === 'Retrieval')!
    const rag = board.cards.find(card => card.nodeId === 'rag')!
    expect(sectionHolding(rag, [retrieval])).toBeDefined()
  })

  it('leaves an unfiled concept out in the open rather than inside a section', () => {
    const embedding = board.cards.find(card => card.nodeId === 'embedding')!
    expect(sectionHolding(embedding, board.sections)).toBeUndefined()
  })

  it('draws no two sections over each other', () => {
    for (const section of board.sections) {
      const others = board.sections.filter(candidate => candidate.id !== section.id)
      expect(others.some(other => overlaps(section, other))).toBe(false)
    }
  })

  it('arranges the same graph the same way every time', () => {
    expect(firstArrangement(graph)).toEqual(board)
  })

  it('wraps onto another row instead of running off to the side forever', () => {
    const many = Array.from({ length: 8 }, (_unused, index) => index)
    const wide = firstArrangement({
      nodes: [
        ...many.map(index => node(`topic${index}`, 'Topic', `Topic ${index}`)),
        ...many.map(index => node(`concept${index}`, 'Concept', `Concept ${index}`)),
      ],
      edges: many.map(index => filedUnder(`concept${index}`, `topic${index}`)),
    })
    const rows = new Set(wide.sections.map(section => section.y))
    expect(rows.size).toBeGreaterThan(1)
    for (const section of wide.sections) {
      const others = wide.sections.filter(candidate => candidate.id !== section.id)
      expect(others.some(other => overlaps(section, other))).toBe(false)
    }
  })

  it('opens on an empty board when nothing has been absorbed yet', () => {
    const nothing = firstArrangement({ nodes: [], edges: [] })
    expect(nothing.cards).toEqual([])
    expect(nothing.sections).toEqual([])
  })
})

interface Box { x: number, y: number, width: number, height: number }

function overlaps(one: Box, other: Box): boolean {
  return one.x < other.x + other.width
    && other.x < one.x + one.width
    && one.y < other.y + other.height
    && other.y < one.y + one.height
}
