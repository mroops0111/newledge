import { describe, expect, it } from 'vitest'
import { hostOf, worded } from '../src/lib/naming.js'

describe('worded', () => {
  it('opens an identifier at its seams, and drops the capital that marked one', () => {
    expect(worded('relatesTo')).toBe('relates to')
    expect(worded('belongsTo')).toBe('belongs to')
  })

  it('keeps a capital that begins a name, since that one is not a seam', () => {
    expect(worded('Concept')).toBe('Concept')
    expect(worded('NodeType')).toBe('Node type')
  })

  it('leaves a name that is already one word alone', () => {
    expect(worded('contains')).toBe('contains')
  })
})

describe('hostOf', () => {
  it('keeps the publisher and drops the machinery', () => {
    expect(hostOf('https://www.example.org/a/b?c=d')).toBe('example.org')
  })

  it('hands back anything it cannot read as a URL', () => {
    expect(hostOf('not a url')).toBe('not a url')
  })
})
