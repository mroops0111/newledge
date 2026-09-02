import { describe, expect, it } from 'vitest'
import { arrangementOf } from '../src/lib/layout.js'

describe('arrangementOf', () => {
  it('has nothing to say about a placement holding nothing', () => {
    expect(arrangementOf(new Map())).toBeUndefined()
  })

  it('takes in the whole of every card, not only where each one starts', () => {
    const arrangement = arrangementOf(new Map([
      ['one', { x: 0, y: 0 }],
      ['other', { x: 300, y: 200 }],
    ]))

    // The room runs from the first card's corner,
    // to the far corner of the last one, rather than to where it starts.
    expect(arrangement?.over).toEqual({ x: 0, y: 0, width: 500, height: 292 })
  })

  it('measures from where the cards are, wherever that is', () => {
    const arrangement = arrangementOf(new Map([
      ['one', { x: -400, y: -100 }],
      ['other', { x: -200, y: -100 }],
    ]))

    expect(arrangement?.over).toEqual({ x: -400, y: -100, width: 400, height: 92 })
  })

  it('names an arrangement by what it holds, whatever order it arrived in', () => {
    const one = arrangementOf(new Map([['b', { x: 0, y: 0 }], ['a', { x: 10, y: 0 }]]))
    const other = arrangementOf(new Map([['a', { x: 10, y: 0 }], ['b', { x: 0, y: 0 }]]))

    expect(one?.of).toBe(other?.of)
  })

  it('names two arrangements differently when they hold different cards', () => {
    const one = arrangementOf(new Map([['a', { x: 0, y: 0 }]]))
    const other = arrangementOf(new Map([['a', { x: 0, y: 0 }], ['b', { x: 10, y: 0 }]]))

    expect(one?.of).not.toBe(other?.of)
  })

  it('keeps its name when only the places change, since nothing was gained or lost', () => {
    // A card the reader edited is laid out again in a new place,
    // and framing what is already framed would move the canvas under them.
    const one = arrangementOf(new Map([['a', { x: 0, y: 0 }], ['b', { x: 10, y: 0 }]]))
    const other = arrangementOf(new Map([['a', { x: 90, y: 40 }], ['b', { x: 300, y: 0 }]]))

    expect(one?.of).toBe(other?.of)
  })
})
