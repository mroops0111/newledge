import { describe, expect, it } from 'vitest'
import { IDLE } from '../src/lib/attention.js'
import type { GraphEdge, GraphNode } from '../src/lib/graph.js'
import { graphEdges } from '../src/ui/graphEdges.js'

const node = (id: string, type: string): GraphNode => ({ id, type, name: id })
const edge = (id: string, type: string, from: string, to: string): GraphEdge =>
  ({ id, type, fromNodeId: from, toNodeId: to })

/** Which node a relation's mark stands against, whichever end that is. */
function marked(type: string, from: string, to: string, kinds: Record<string, string> = {}) {
  const [drawn] = graphEdges(
    [edge('e', type, from, to)],
    [node(from, kinds[from] ?? 'Concept'), node(to, kinds[to] ?? 'Concept')],
    new Set(),
    IDLE,
  )
  if (drawn === undefined)
    return undefined
  return {
    at: drawn.markerStart === undefined ? drawn.target : drawn.source,
    shape: String(drawn.markerStart ?? drawn.markerEnd).replace(/^board-([a-zA-Z]+)-.*/, '$1'),
  }
}

// A class diagram puts the diamond against the whole,
// and the hollow triangle against the general,
// so a reader who has read one knows which way to read these.
// Which end a line is drawn from moves with the layout,
// so the mark follows the root instead.
describe('which node a mark stands against', () => {
  it('stands a diamond against the whole', () => {
    expect(marked('contains', 'whole', 'part')).toEqual({ at: 'whole', shape: 'diamond' })
  })

  it('stands a hollow triangle against the general', () => {
    expect(marked('instantiates', 'specific', 'general'))
      .toEqual({ at: 'general', shape: 'triangleHollow' })
    expect(marked('extends', 'specific', 'general'))
      .toEqual({ at: 'general', shape: 'triangleHollow' })
  })

  it('stands a dot against what a claim is about', () => {
    expect(marked('concerns', 'claim', 'concept')).toEqual({ at: 'concept', shape: 'dot' })
  })

  it('leaves a plain arrow pointing at what the relation reaches', () => {
    expect(marked('uses', 'user', 'used')).toEqual({ at: 'used', shape: 'arrow' })
  })

  it('draws a topic above what is filed under it, and marks neither end', () => {
    const [drawn] = graphEdges(
      [edge('e', 'belongsTo', 'idea', 'theme')],
      [node('idea', 'Concept'), node('theme', 'Topic')],
      new Set(),
      IDLE,
    )
    expect(drawn!.source).toBe('theme')
    expect(drawn!.markerStart).toBeUndefined()
    expect(drawn!.markerEnd).toBeUndefined()
  })
})
