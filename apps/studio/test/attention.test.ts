import { describe, expect, it } from 'vitest'
import type { Related } from '../src/lib/attention.js'
import { emphasisOf, IDLE, neighbourhood, remaining } from '../src/lib/attention.js'

const edges: Related[] = [
  { id: 'e1', from: 'rag', to: 'embedding' },
  { id: 'e2', from: 'graphRag', to: 'rag' },
  { id: 'e3', from: 'planner', to: 'memory' },
]

describe('one relation out from what a reader picked', () => {
  const near = neighbourhood('rag', edges)

  it('counts what a reader picked as part of it, so nothing is special-cased', () => {
    expect(near.nodes.has('rag')).toBe(true)
  })

  it('reaches whatever one relation touches, whichever end it runs from', () => {
    expect([...near.nodes].sort()).toEqual(['embedding', 'graphRag', 'rag'])
    expect([...near.edges].sort()).toEqual(['e1', 'e2'])
  })

  it('leaves out what is two relations away', () => {
    expect(near.nodes.has('memory')).toBe(false)
  })

  it('is empty rather than absent when a reader has picked nothing', () => {
    const nothing = neighbourhood(undefined, edges)
    expect(nothing.nodes.size).toBe(0)
    expect(nothing.edges.size).toBe(0)
  })
})

describe('how prominent one thing should be', () => {
  const near = neighbourhood('rag', edges)

  it('leaves everything plain while a reader has picked nothing', () => {
    expect(emphasisOf('memory', near.nodes, IDLE)).toBe('plain')
  })

  it('dims what a glance is not about, and leaves the rest alone', () => {
    const glancing = { selectedId: 'rag', focused: false }
    expect(emphasisOf('memory', near.nodes, glancing)).toBe('dimmed')
    expect(emphasisOf('embedding', near.nodes, glancing)).toBe('plain')
    expect(emphasisOf('rag', near.nodes, glancing)).toBe('plain')
  })

  // Dimming is for a glance and removal is for asking, which is what lets a
  // reader look without losing where they were.
  it('takes the rest away once a reader asks to focus, rather than dimming it', () => {
    const focusing = { selectedId: 'rag', focused: true }
    expect(emphasisOf('memory', near.nodes, focusing)).toBe('gone')
    expect(emphasisOf('embedding', near.nodes, focusing)).toBe('plain')
  })

  it('reads a relation the same way it reads a card', () => {
    const focusing = { selectedId: 'rag', focused: true }
    expect(emphasisOf('e3', near.edges, focusing)).toBe('gone')
    expect(emphasisOf('e1', near.edges, focusing)).toBe('plain')
  })
})

describe('what is left once the rest has gone', () => {
  const near = neighbourhood('rag', edges)
  const cards = [{ id: 'rag' }, { id: 'embedding' }, { id: 'memory' }]

  it('keeps everything a glance dims, since dimmed is still there', () => {
    expect(remaining(cards, card => card.id, near.nodes, { selectedId: 'rag', focused: false }))
      .toHaveLength(3)
  })

  it('keeps only the neighbourhood once a reader asks to focus', () => {
    expect(remaining(cards, card => card.id, near.nodes, { selectedId: 'rag', focused: true })
      .map(card => card.id)).toEqual(['rag', 'embedding'])
  })
})
