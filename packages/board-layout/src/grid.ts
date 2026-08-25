import type { Box, LayoutNode, Placed, Placement, PlacementRequest, Point } from './ports.js'

export interface GridOptions {
  readonly gap: number
  readonly pad: number
  readonly columns: number
  readonly looseColumns: number
  readonly rowWidth: number
}

export const GRID_DEFAULTS: GridOptions = {
  gap: 56,
  pad: 20,
  columns: 3,
  looseColumns: 5,
  rowWidth: 2600,
}

/**
 * Rows and columns, in the order the caller handed things over.
 * It reads nothing from the relations, so it says nothing about them,
 * but it needs no dependency and gives the same answer every time,
 * which is what a test wants of the port it measures another placement against.
 */
export function gridPlacement(options: GridOptions = GRID_DEFAULTS): Placement {
  return {
    id: 'grid',
    place: async (request: PlacementRequest) => place(request, options),
  }
}

function place(request: PlacementRequest, options: GridOptions): Placed {
  const nodes = new Map<string, Point>()
  const groups = new Map<string, Box>()
  const cursor = { x: options.pad, y: options.pad }
  let tallest = 0

  for (const group of request.groups) {
    const held = request.nodes.filter(node => node.groupId === group.id)
    if (held.length === 0)
      continue

    const inset = group.inset ?? { width: 0, height: 0 }
    const extent = extentOf(held, options, inset)
    if (cursor.x > options.pad && cursor.x + extent.width > options.rowWidth) {
      cursor.x = options.pad
      cursor.y += tallest + options.gap
      tallest = 0
    }
    groups.set(group.id, { ...cursor, ...extent })
    lay(held, { x: cursor.x + options.pad, y: cursor.y + options.pad + inset.height }, columnsFor(held.length, options), options, nodes)
    cursor.x += extent.width + options.gap
    tallest = Math.max(tallest, extent.height)
  }

  const filed = new Set(request.groups.map(group => group.id))
  const loose = request.nodes.filter(node => node.groupId === undefined || !filed.has(node.groupId))
  const below = { x: options.pad, y: cursor.y + (tallest === 0 ? 0 : tallest + options.gap * 2) }
  lay(loose, below, options.looseColumns, options, nodes)

  return { nodes, groups }
}

// A group holding one card is drawn one card wide,
// so its size reads as how much is in it, rather than as room left over.
function columnsFor(count: number, options: GridOptions): number {
  return Math.min(options.columns, Math.max(count, 1))
}

function extentOf(held: readonly LayoutNode[], options: GridOptions, inset: { height: number }): { width: number, height: number } {
  const columns = columnsFor(held.length, options)
  const rows = Math.ceil(held.length / columns)
  const cell = cellOf(held)
  return {
    width: options.pad * 2 + columns * cell.width + (columns - 1) * options.gap,
    height: options.pad * 2 + inset.height + rows * cell.height + (rows - 1) * options.gap,
  }
}

// One cell fits the largest thing in the group,
// so a row of cards of different heights still lines up,
// rather than overlapping the row below.
function cellOf(held: readonly LayoutNode[]): { width: number, height: number } {
  return {
    width: Math.max(...held.map(node => node.width), 0),
    height: Math.max(...held.map(node => node.height), 0),
  }
}

function lay(
  held: readonly LayoutNode[],
  origin: Point,
  columns: number,
  options: GridOptions,
  into: Map<string, Point>,
): void {
  if (held.length === 0)
    return
  const cell = cellOf(held)
  held.forEach((node, index) => {
    into.set(node.id, {
      x: origin.x + (index % columns) * (cell.width + options.gap),
      y: origin.y + Math.floor(index / columns) * (cell.height + options.gap),
    })
  })
}
