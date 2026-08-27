/**
 * The grid the canvas draws, which the first arrangement lands on.
 * A layout answers in whatever coordinates suit it,
 * and a board that opens half a pixel off the grid can never be tidied by eye.
 *
 * The canvas paints its dots at this spacing or a multiple of it.
 * Dots at one spacing, over a board that snaps to another,
 * give a reader the wrong lines to line anything up against.
 */
export const GRID = 24

/**
 * How wide a dot is drawn on the screen, whatever the canvas is scaled to.
 * A dot is texture rather than a thing on the board,
 * so it wants a size on the screen and not a size in board units,
 * which is what the canvas would otherwise give it.
 */
const DOT_ACROSS = 2

/**
 * The closest together a reader should ever see the dots stand.
 * Nearer than this they stop reading as a grid and become a haze on the paper.
 */
const DOTS_AT_LEAST = 16

export function onGrid(value: number): number {
  return Math.round(value / GRID) * GRID
}

/**
 * The grid to draw at this zoom, and the size the canvas wants for its dot.
 *
 * The canvas scales the spacing along with everything standing on it,
 * so going out does not only shrink the dots, it crowds them.
 * One fixed spacing therefore cannot serve both ends of the wheel,
 * and a board is read across a wide stretch of it,
 * since a card here is wider than a card on most canvases,
 * and a whole board is read from further out to fit.
 *
 * So the grid steps out by doubling rather than thinning away.
 * Every spacing it lands on is a multiple of the one the board snaps to,
 * so a dot always stands where a card could be lined up,
 * and a coarser grid is a subset of the finer one rather than another grid.
 * It is never drawn finer than the board snaps,
 * which would offer lines no card can land on.
 */
export function gridAt(zoom: number): { readonly spacing: number, readonly dot: number } {
  let spacing = GRID
  while (spacing * zoom < DOTS_AT_LEAST)
    spacing *= 2
  return { spacing, dot: DOT_ACROSS / zoom }
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
