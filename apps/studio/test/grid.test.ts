import { describe, expect, it } from 'vitest'
import { boxOnGrid, GRID, gridStrength, onGrid } from '../src/lib/grid.js'

describe('onGrid', () => {
  it('puts a value on the nearest grid line', () => {
    expect(onGrid(0)).toBe(0)
    expect(onGrid(GRID / 2 - 1)).toBe(0)
    expect(onGrid(GRID / 2 + 1)).toBe(GRID)
  })
})

describe('boxOnGrid', () => {
  it('puts both edges on the grid rather than one edge and a size', () => {
    const box = boxOnGrid({ x: 5, y: 5, width: 100, height: 100 })
    expect(box.x % GRID).toBe(0)
    expect((box.x + box.width) % GRID).toBe(0)
    expect((box.y + box.height) % GRID).toBe(0)
  })
})

describe('gridStrength', () => {
  it('draws nothing where the dots would crowd into a haze', () => {
    // A whole board read at once puts these a few pixels apart.
    expect(gridStrength(0.24)).toBe(0)
    expect(gridStrength(1 / 3)).toBe(0)
  })

  it('draws the grid whole once its spacing is worth reading', () => {
    expect(gridStrength(1)).toBe(1)
    expect(gridStrength(2)).toBe(1)
  })

  it('comes up across a range, so a board held near it does not strobe', () => {
    const half = gridStrength(0.5)
    expect(half).toBeGreaterThan(0)
    expect(half).toBeLessThan(1)
    expect(gridStrength(0.45)).toBeLessThan(half)
    expect(gridStrength(0.6)).toBeGreaterThan(half)
  })
})
