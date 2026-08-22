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

/**
 * How far apart two sections stand, which is further than two cards do.
 * A section is ground, and two grounds set end to end read as one. The gap is
 * what says where one ends, so it has to be wider than the gaps inside them.
 */
const SECTION_GAP = '96'

const BOARD_OPTIONS: Record<string, string> = {
  ...CORE_OPTIONS,
  'elk.padding': '[top=40.0,left=40.0,bottom=40.0,right=40.0]',
  'elk.spacing.nodeNode': SECTION_GAP,
  'elk.layered.spacing.nodeNodeBetweenLayers': SECTION_GAP,
  // Sections with no relation between them are not laid out at all, they are
  // packed, and packing answers to a spacing of its own. Left at its default
  // of 20 the board set two sections all but touching however far apart the
  // layout had been told to keep things.
  'elk.spacing.componentComponent': SECTION_GAP,
}

const GROUP_PADDING = 20

/**
 * How many relations a section needs before laying it out in layers is worth it.
 * A layered algorithm exists to make a dense directed graph readable. Given a
 * section with almost nothing to go on it spreads the cards out to fill layers,
 * which reads worse than simply sitting them together. A group that says its
 * order is settled by its relations is laid out in layers whatever this says,
 * since a hierarchy of two is still a hierarchy.
 */
const DENSE_ENOUGH = 0.6

// A section lays itself out, and ELK asks each container for its own options
// rather than reading them off the one above, so they are given again here.
// What the group asked to keep clear is kept clear at the top, which is where
// a section carries its name.
function groupOptions(cards: number, relations: number, header: number, ranked: boolean): Record<string, string> {
  const dense = ranked || (cards > 0 && relations / cards >= DENSE_ENOUGH)
  const padding = `[top=${(GROUP_PADDING + header).toFixed(1)},left=${GROUP_PADDING}.0,`
    + `bottom=${GROUP_PADDING}.0,right=${GROUP_PADDING}.0]`
  return dense
    ? { ...CORE_OPTIONS, 'elk.padding': padding }
    : {
        ...CORE_OPTIONS,
        'elk.algorithm': 'rectpacking',
        'elk.padding': padding,
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
  const groupById = new Map(request.groups.map(group => [group.id, group]))

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

  /**
   * A relation is laid out by whichever container can see both of its ends.
   * Both in one group, and that group lays it out between the two cards. Ends
   * in different groups, and the board lays it out between the two **groups**,
   * because a group is opaque to the board and an edge into a card it cannot
   * see places nothing. Those are merged, and the more relations run between
   * two groups the harder the board is asked to keep them together.
   */
  const drawn = new Set(request.nodes.map(node => node.id))
  const within = new Map<string, ElkExtendedEdge[]>()
  const crossing = new Map<string, { from: string, to: string, count: number }>()

  for (const edge of request.edges) {
    const style = edgeStyle(edge.type)
    if (style.shapes !== 'layout' || !drawn.has(edge.from) || !drawn.has(edge.to))
      continue
    const [from, to] = [seatOf.get(edge.from), seatOf.get(edge.to)]
    if (from !== undefined && from === to) {
      const kept = within.get(from) ?? []
      kept.push({ id: edge.id, sources: [edge.from], targets: [edge.to] })
      within.set(from, kept)
      continue
    }
    const [one, other] = [from ?? edge.from, to ?? edge.to].sort() as [string, string]
    const pair = crossing.get(`${one}|${other}`) ?? { from: one, to: other, count: 0 }
    pair.count += 1
    crossing.set(`${one}|${other}`, pair)
  }

  // A group inside a group is built from the inside out, so a nested one is
  // already whole by the time the one holding it asks for its children.
  const built = new Map<string, ElkNode>()
  for (const group of [...request.groups].reverse()) {
    const children = held.get(group.id) ?? []
    if (children.length === 0)
      continue
    built.set(group.id, {
      id: group.id,
      children,
      edges: within.get(group.id) ?? [],
      layoutOptions: groupOptions(
        children.length,
        (within.get(group.id) ?? []).length,
        group.inset?.height ?? 0,
        group.ranked === true,
      ),
    })
  }
  for (const [id, group] of built) {
    const parent = groupById.get(id)?.groupId
    const seat = parent === undefined ? undefined : held.get(parent)
    if (seat !== undefined)
      seat.push(group)
  }

  const top = [...built]
    .filter(([id]) => {
      const parent = groupById.get(id)?.groupId
      return parent === undefined || !built.has(parent)
    })
    .map(([, group]) => group)

  return {
    id: ROOT,
    layoutOptions: BOARD_OPTIONS,
    children: [...top, ...loose],
    edges: [...crossing].map(([id, pair]) => ({
      id: `between-${id}`,
      sources: [pair.from],
      targets: [pair.to],
      layoutOptions: { 'elk.layered.priority.shortness': String(pair.count) },
    })),
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
  walk(laid, { x: 0, y: 0 }, { nodes, groups, edges })
  return { nodes, groups, edges }
}

interface Collected {
  readonly nodes: Map<string, Point>
  readonly groups: Map<string, Box>
  readonly edges: Map<string, readonly Point[]>
}

/**
 * Read the arrangement back out.
 * ELK gives a child its position within its parent, and a group may hold
 * another, so everything is carried out to where the board sees it.
 */
function walk(container: ElkNode, origin: Point, into: Collected): void {
  routesOf(container, origin, into.edges)
  for (const child of container.children ?? []) {
    const at = { x: origin.x + (child.x ?? 0), y: origin.y + (child.y ?? 0) }
    if (child.children === undefined || child.children.length === 0) {
      into.nodes.set(child.id, at)
      continue
    }
    into.groups.set(child.id, { ...at, width: child.width ?? 0, height: child.height ?? 0 })
    walk(child, at, into)
  }
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
