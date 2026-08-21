import type { Box, Placed, Placement, PlacementRequest, Point } from '@newledge/board-layout'
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api.js'
import { edgeStyle, nodeStyle } from './boardStyle.js'

const CORE_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  // The whole point of reaching for ELK, lines bend around cards instead of
  // running through them, and it hands back where each one bends.
  'elk.edgeRouting': 'ORTHOGONAL',
  // Each section is laid out on its own and stands as one box to the board.
  // Letting the board place cards across sections lets it interleave them,
  // and two sections then come back overlapping.
  'elk.hierarchyHandling': 'SEPARATE_CHILDREN',
  'elk.spacing.nodeNode': '64',
  'elk.spacing.edgeNode': '24',
  'elk.spacing.edgeEdge': '16',
  'elk.layered.spacing.nodeNodeBetweenLayers': '64',
  'elk.layered.spacing.edgeNodeBetweenLayers': '24',
}

const BOARD_OPTIONS: Record<string, string> = {
  ...CORE_OPTIONS,
  'elk.padding': '[top=40.0,left=40.0,bottom=40.0,right=40.0]',
}

const GROUP_PADDING = '[top=20.0,left=20.0,bottom=20.0,right=20.0]'

/**
 * How many relations a section needs before laying it out in layers is worth it.
 * A layered algorithm exists to make a dense directed graph readable. Given a
 * section with almost nothing to go on it spreads the cards out to fill layers,
 * which reads worse than simply sitting them together.
 */
const DENSE_ENOUGH = 0.6

// A section lays itself out, and ELK asks each container for its own options
// rather than reading them off the one above, so they are given again here.
function groupOptions(cards: number, relations: number): Record<string, string> {
  const dense = cards > 0 && relations / cards >= DENSE_ENOUGH
  return dense
    ? { ...CORE_OPTIONS, 'elk.padding': GROUP_PADDING }
    : {
        ...CORE_OPTIONS,
        'elk.algorithm': 'rectpacking',
        'elk.padding': GROUP_PADDING,
        'elk.aspectRatio': '1.6',
      }
}

type ElkFactory = () => Promise<{
  layout: (graph: ElkNode) => Promise<ElkNode>
}>

/**
 * Placement by the Eclipse Layout Kernel.
 * It is loaded only when a board actually asks for an arrangement, since it is
 * the largest thing the studio depends on and most sessions never need it.
 */
export function elkPlacement(factory: ElkFactory = load): Placement {
  return {
    id: 'elk',
    place: async (request: PlacementRequest): Promise<Placed> => {
      const elk = await factory()
      return read(await elk.layout(write(request)))
    },
  }
}

async function load(): Promise<{ layout: (graph: ElkNode) => Promise<ElkNode> }> {
  const { default: Elk } = await import('elkjs/lib/elk.bundled.js')
  return new Elk()
}

const ROOT = 'board'

function write(request: PlacementRequest): ElkNode {
  const held = new Map<string, ElkNode[]>(request.groups.map(group => [group.id, []]))
  const seatOf = new Map<string, string>()
  const loose: ElkNode[] = []

  // Anything a relation reaches is placed by that relation. What none reaches
  // is laid down in the order it is handed over, so handing kinds over in
  // band order is what keeps kinds together, terms first and provenance last.
  const banded = [...request.nodes].sort((one, other) =>
    nodeStyle(one.type).band - nodeStyle(other.type).band)

  for (const node of banded) {
    const seat = node.groupId === undefined ? undefined : held.get(node.groupId)
    const written: ElkNode = { id: node.id, width: node.width, height: node.height }
    if (seat === undefined)
      loose.push(written)
    else {
      seat.push(written)
      seatOf.set(node.id, node.groupId!)
    }
  }

  // A relation is laid out by whichever container can see both of its ends,
  // which is the section when both are filed there, and the board otherwise.
  const drawn = new Set(request.nodes.map(node => node.id))
  const within = new Map<string, ElkExtendedEdge[]>()
  for (const edge of request.edges) {
    const style = edgeStyle(edge.type)
    if (style.shapes !== 'layout' || !drawn.has(edge.from) || !drawn.has(edge.to))
      continue
    const from = seatOf.get(edge.from)
    const owner = from !== undefined && from === seatOf.get(edge.to) ? from : ROOT
    const [source, target] = style.flow === 'reverse' ? [edge.to, edge.from] : [edge.from, edge.to]
    const kept = within.get(owner) ?? []
    kept.push({ id: edge.id, sources: [source], targets: [target] })
    within.set(owner, kept)
  }

  const groups: ElkNode[] = request.groups
    .filter(group => (held.get(group.id) ?? []).length > 0)
    .map(group => ({
      id: group.id,
      children: held.get(group.id),
      edges: within.get(group.id) ?? [],
      layoutOptions: groupOptions((held.get(group.id) ?? []).length, (within.get(group.id) ?? []).length),
    }))

  return {
    id: ROOT,
    layoutOptions: BOARD_OPTIONS,
    children: [...groups, ...loose],
    edges: within.get(ROOT) ?? [],
  }
}

/**
 * Read the arrangement back out.
 * ELK gives a child its position within its parent, so a card inside a section
 * is carried out to where the board sees it.
 */
function read(laid: ElkNode): Placed {
  const nodes = new Map<string, Point>()
  const groups = new Map<string, Box>()
  const edges = new Map<string, readonly Point[]>()
  const origin = { x: 0, y: 0 }

  routesOf(laid, origin, edges)
  for (const child of laid.children ?? []) {
    const at = { x: child.x ?? 0, y: child.y ?? 0 }
    if (child.children === undefined || child.children.length === 0) {
      nodes.set(child.id, at)
      continue
    }
    groups.set(child.id, { ...at, width: child.width ?? 0, height: child.height ?? 0 })
    // A section lays its own cards and its own lines out in its own corner,
    // so both are carried out to where the board sees them.
    routesOf(child, at, edges)
    for (const held of child.children)
      nodes.set(held.id, { x: at.x + (held.x ?? 0), y: at.y + (held.y ?? 0) })
  }

  return { nodes, groups, edges }
}

function routesOf(container: ElkNode, origin: Point, into: Map<string, readonly Point[]>): void {
  for (const edge of container.edges ?? []) {
    const [section] = (edge as ElkExtendedEdge).sections ?? []
    if (section === undefined)
      continue
    const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint]
    into.set(edge.id, points.map(point => ({ x: origin.x + point.x, y: origin.y + point.y })))
  }
}
