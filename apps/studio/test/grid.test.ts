import { describe, expect, it } from 'vitest'
import { boxOnGrid, GRID, gridAt, onGrid } from '../src/lib/grid.js'

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

describe('gridAt', () => {
  const ZOOMS = [0.1, 0.24, 0.35, 0.5, 0.75, 1, 1.5, 2]

  it('never lets the dots crowd closer than they can be read', () => {
    for (const zoom of ZOOMS)
      expect(gridAt(zoom).spacing * zoom).toBeGreaterThanOrEqual(16)
  })

  it('takes the closest spacing that clears it, so it is never sparser than it has to be', () => {
    for (const zoom of ZOOMS) {
      const { spacing } = gridAt(zoom)
      // Either the board's own grid, which is as fine as it goes,
      // or a spacing whose next step down would crowd.
      if (spacing !== GRID)
        expect((spacing / 2) * zoom).toBeLessThan(16)
    }
  })

  it('only ever draws a spacing the board itself lands on', () => {
    for (const zoom of [0.1, 0.24, 0.35, 0.5, 0.75, 1, 2])
      expect(gridAt(zoom).spacing % GRID).toBe(0)
  })

  it('never offers a line finer than the board snaps to', () => {
    expect(gridAt(2).spacing).toBe(GRID)
    expect(gridAt(8).spacing).toBe(GRID)
  })

  it('steps out by doubling as a reader goes out', () => {
    expect(gridAt(1).spacing).toBe(GRID)
    expect(gridAt(0.5).spacing).toBe(GRID * 2)
    expect(gridAt(0.24).spacing).toBe(GRID * 4)
  })

  it('holds one dot size on the screen, whatever the canvas is scaled to', () => {
    // The canvas draws a dot at half this and then scales it by the zoom,
    // so what a reader sees is the same at either end of the wheel.
    const seen = (zoom: number): number => (gridAt(zoom).dot / 2) * zoom
    expect(seen(0.24)).toBeCloseTo(seen(1))
    expect(seen(2)).toBeCloseTo(seen(1))
  })
})
