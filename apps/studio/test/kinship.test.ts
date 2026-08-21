import { describe, expect, it } from 'vitest'
import type { GraphEdge } from '../src/lib/graph.js'
import { FAMILY_COLOURS, familyColours } from '../src/lib/kinship.js'

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
