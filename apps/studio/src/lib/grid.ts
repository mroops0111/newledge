/**
 * The grid the canvas draws, which the first arrangement lands on.
 * A layout answers in whatever coordinates suit it,
 * and a board that opens half a pixel off the grid can never be tidied by eye.
 *
 * The canvas paints its dots at this same spacing, off this same figure.
 * Dots at one spacing, over a board that snaps to another,
 * give a reader the wrong lines to line anything up against.
 */
export const GRID = 24

/** How big a dot on the grid is drawn, in the units the board is laid out in. */
export const GRID_DOT = 3

/**
 * How far apart the dots have to land on the screen to be worth drawing.
 *
 * The canvas scales the grid with everything else,
 * so going out does not only shrink the dots, it crowds them,
 * and a board read whole puts these a few pixels apart.
 * That is a haze over the paper rather than marks a card can be lined up
 * against, and it is worst exactly where it is least use,
 * since a reader that far out is looking at the shape of the board
 * and not placing anything on it.
 *
 * It comes up across a range rather than at a line,
 * so a board held near it does not strobe while a reader is still moving
 * the wheel, and so that the grid arrives as a reader zooms towards the work.
 */
const GRID_FADES_IN = 8
const GRID_FULL_AT = 16

export function gridStrength(zoom: number): number {
  const apart = GRID * zoom
  return Math.min(Math.max((apart - GRID_FADES_IN) / (GRID_FULL_AT - GRID_FADES_IN), 0), 1)
}

export function onGrid(value: number): number {
  return Math.round(value / GRID) * GRID
}

/**
 * A box on the grid, put there by both its edges rather than by one and a size.
 * Rounding a position and a size on their own,
 * moves the far edge by the two roundings together,
 * which on a section can close a gap the layout left.
 */
export function boxOnGrid(box: { x: number, y: number, width: number, height: number }): typeof box {
  const [left, top] = [onGrid(box.x), onGrid(box.y)]
  return {
    x: left,
    y: top,
    width: onGrid(box.x + box.width) - left,
    height: onGrid(box.y + box.height) - top,
  }
}

/**
 * How far apart two sections stand, which is further than two cards do.
 * A section is ground, and two grounds set end to end read as one.
 * The gap is what says where one ends,
 * so it has to be wider than the gaps inside them.
 */
export const SECTION_GAP = 96
