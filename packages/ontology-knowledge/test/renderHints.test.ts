import { describe, expect, it } from 'vitest'
import { knowledgeOntology } from '../src/index.js'

const nodeTypes = knowledgeOntology.nodeTypes
const declared = new Set(nodeTypes.map(type => type.id as string))

function hintOf(id: string): { container?: boolean, expandedUnder?: string } | undefined {
  return nodeTypes.find(type => (type.id as string) === id)?.renderHint
}

/** How far a kind sits from the container it is eventually read inside. */
function depthOf(id: string): number {
  let steps = 0
  let at = id
  while (hintOf(at)?.expandedUnder !== undefined) {
    at = hintOf(at)!.expandedUnder!
    steps += 1
    // A chain that revisits a kind never reaches a container.
    expect(steps).toBeLessThanOrEqual(nodeTypes.length)
  }
  return steps
}

describe('render hints', () => {
  // The SDK checks edge endpoints and ids but never looks at a render hint,
  // so a hint naming a kind that has since been renamed survives the build,
  // and only fails when something tries to write a document.
  it('never nests a kind under one the ontology does not declare', () => {
    for (const type of nodeTypes) {
      const under = type.renderHint?.expandedUnder
      if (under !== undefined)
        expect(declared).toContain(under as string)
    }
  })

  it('writes a document per topic, and only per topic', () => {
    const containers = nodeTypes.filter(type => type.renderHint?.container === true)
    expect(containers.map(type => type.id as string)).toEqual(['Topic'])
  })

  it('reads a concept inside the topic it is filed under', () => {
    expect(hintOf('Concept')?.expandedUnder).toBe('Topic')
  })

  it('reads a claim where the concept it is about is read', () => {
    expect(hintOf('Claim')?.expandedUnder).toBe('Concept')
  })

  it('leaves a source for the footer a renderer already writes', () => {
    // Provenance is what a reader checks a document against,
    // rather than a part of what the document says.
    expect(hintOf('Source')).toBeUndefined()
  })

  it('ends every chain at the container rather than in the air', () => {
    for (const type of nodeTypes) {
      const id = type.id as string
      if (type.renderHint?.expandedUnder === undefined)
        continue
      let at = id
      while (hintOf(at)?.expandedUnder !== undefined)
        at = hintOf(at)!.expandedUnder!
      expect(hintOf(at)?.container).toBe(true)
    }
  })

  it('nests two deep, which is the scope depth a renderer has to ask for', () => {
    // A renderer fetches the container's scope at the longest chain plus one,
    // so this figure is what decides whether a claim reaches the page at all.
    expect(depthOf('Claim')).toBe(2)
    expect(depthOf('Concept')).toBe(1)
    expect(depthOf('Topic')).toBe(0)
  })
})
