import type { Board } from '@newledge/board'
import { sectionHolding } from '@newledge/board'
import type { Edge, Node, NodeChange, NodeTypes, XYPosition } from '@xyflow/react'
import { Background, ReactFlow, ReactFlowProvider, useNodesState } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { orthogonalRouting } from '@newledge/board-layout'
import { firstArrangement } from '../lib/arrange.js'
import { align, TOLERANCE } from '../lib/aligning.js'
import type { Guide } from '../lib/aligning.js'
import { emphasisOf, IDLE, neighbourhood } from '../lib/attention.js'
import { elkPlacement } from '../lib/elkPlacement.js'
import type { BoardClient } from '../lib/boards.js'
import { openingBoards, renameSection, withBoard, withCard, withSection } from '../lib/boards.js'
import { nodeStyle } from '../lib/boardStyle.js'
import type { GraphClient } from '../lib/client.js'
import type { DrawnEdge } from '../lib/drawing.js'
import { drawnCards, drawnRelations } from '../lib/drawing.js'
import { cardExtent } from '../lib/measure.js'
import { kinship } from '../lib/family.js'
import { familyColours, familyOfRoot, kinColour, lineages, lineColour, NO_FAMILY, saidOnCard } from '../lib/kinship.js'
import type { Box, Facing } from '../lib/path.js'
import { borderRun, facing } from '../lib/path.js'
import type { GraphEdge, GraphNode } from '../lib/graph.js'
import type { Nav } from '../ui/AppShell.js'
import { AppShell } from '../ui/AppShell.js'
import type { BoardCardData } from '../ui/BoardCard.js'
import { BoardCard } from '../ui/BoardCard.js'
import { BoardMarkers, markerId } from '../ui/BoardMarkers.js'
import { ConceptPanel, inside } from '../ui/ConceptPanel.js'
import type { RoutedEdgeData } from '../ui/RoutedEdge.js'
import { RoutedEdge } from '../ui/RoutedEdge.js'
import { NodePicker } from '../ui/NodePicker.js'
import { BoardTools } from '../ui/BoardTools.js'
import { Guides } from '../ui/Guides.js'
import type { SectionBoxData } from '../ui/SectionBox.js'
import { SectionBox } from '../ui/SectionBox.js'
import '@xyflow/react/dist/style.css'

const NODE_TYPES: NodeTypes = { card: BoardCard, section: SectionBox }
const EDGE_TYPES = { routed: RoutedEdge }
const PLACEMENT = elkPlacement()
const ROUTING = orthogonalRouting()
const MIN_NAME_WIDTH = 10
const DIMMED = 0.22
const GRID = 24
/** How far a line may run before a reader loses it, and how far it may wander. */
/** How much of a section is left showing past whatever stands on it. */
const HOLDS_ITS_OWN = 24

const FAR = 1600
const WANDERS = 2.5
/**
 * How many times a line may turn and still be worth following.
 * Out, across, and in is a shape a reader takes in at once. A third turn means
 * the line doubled back on itself somewhere, and from then on following it is
 * work rather than looking. What it had to say is said on the card instead,
 * which costs a line of words and no confusion.
 */
const TURNS = 2
/**
 * How much worse a line already drawn may get before it stops being drawn.
 * What a card says about the relations the board could not draw is written on
 * the card, so it makes the card taller, which moves every route past it, which
 * changes what the board can draw. Judged on one threshold, two relations on
 * the real board flipped in and out of it for ever and the board never stood
 * still. A relation has to get this much worse than the threshold to be given
 * up, and that much better than it to be taken back, so the two answers cannot
 * chase each other.
 */
const SETTLES = 1.25
const NOTHING: readonly Guide[] = []

interface SectionDrag {
  readonly id: string
  readonly held: ReadonlySet<string>
  at: XYPosition
}

export function Whiteboard({ graphClient, boardClient, nav }: {
  graphClient: GraphClient
  boardClient: BoardClient
  nav: Nav
}): React.JSX.Element {
  const [graph, setGraph] = useState<{ nodes: readonly GraphNode[], edges: readonly GraphEdge[] }>({ nodes: [], edges: [] })
  const [boards, setBoards] = useState<readonly Board[]>([])
  const [openId, setOpenId] = useState<string | undefined>(undefined)
  /**
   * Where each line runs, worked out from where the cards are now.
   * It cannot be kept from the arrangement, because a reader moving one card
   * makes every route that went round it wrong, and it cannot be asked of the
   * placement again, because that would move the cards a reader put where they
   * wanted them.
   */
  const [routes, setRoutes] = useState<ReadonlyMap<string, readonly { x: number, y: number }[]>>(new Map())
  const [focused, setFocused] = useState(false)
  const [guides, setGuides] = useState<readonly Guide[]>([])
  // Laying a board out again gives back the same cards in new places, so what
  // is drawn has to be rebuilt from a fact other than which cards are on it.
  const [generation, setGeneration] = useState(0)
  const [error, setError] = useState<string | undefined>(undefined)

  // React Flow owns where things are while a reader is moving them, and the
  // board is written from it once they let go. Feeding the model back in on
  // every frame throws away the measurements and the drag flickers.
  const [drawn, setDrawn, applyChanges] = useNodesState<Node>([])
  const latestBoard = useRef<Board | undefined>(undefined)
  const sectionDrag = useRef<SectionDrag | undefined>(undefined)
  const zoom = useRef(1)
  /** Which relations the board drew last time, which is what it holds on to. */
  const alreadyDrawn = useRef<ReadonlySet<string>>(new Set())

  useEffect(() => {
    void (async () => {
      try {
        const [loaded, state] = await Promise.all([
          graphClient.graph(),
          boardClient.read(),
        ])
        setGraph(loaded)
        if (state.boards.length > 0) {
          setBoards(state.boards)
          setOpenId(state.boards[0]!.id)
          return
        }
        // A workspace nobody has arranged opens on a first arrangement rather
        // than on an empty canvas, written down at once so a reader is editing
        // their own boards from then on and is never laid out again.
        const opening = await Promise.all(openingBoards(loaded.nodes).map(async board => ({
          ...board,
          holds: [...board.holds],
          ...(await firstArrangement(loaded, PLACEMENT, board.holds)).board,
        })))
        setBoards(opening)
        setOpenId(opening[0]?.id)
        await boardClient.keep({ boards: opening })
      }
      catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    })()
  }, [graphClient, boardClient])

  const board = boards.find(one => one.id === openId)
  latestBoard.current = board

  const persist = useCallback((next: Board) => {
    setBoards((kept) => {
      const updated = withBoard({ boards: [...kept] }, next).boards
      void boardClient
        .keep({ boards: updated })
        .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      return updated
    })
  }, [boardClient])

  /**
   * What a card wears down its side, which is what it belongs to.
   * Not what kind it is, because the card's own shape already says that and
   * two meanings in one stripe can only be told apart by knowing the palette.
   */
  const familyOf = useMemo(() => familyColours(graph.edges), [graph])
  const hangsOff = useMemo(() => lineages(graph.edges), [graph])
  const familyLed = useMemo(() => familyOfRoot(graph.edges), [graph])
  const colourOf = useMemo(
    () => (node: GraphNode): string => kinColour(familyOf.get(node.id) ?? NO_FAMILY),
    [familyOf],
  )

  const byId = useMemo(() => new Map(graph.nodes.map(node => [node.id, node])), [graph])
  const available = useMemo(() => {
    const chosen = new Set((board?.cards ?? []).map(card => card.nodeId))
    return graph.nodes.filter(node => !chosen.has(node.id))
  }, [graph, board])

  const rearrange = useCallback(() => {
    void (async () => {
      try {
        const current = latestBoard.current
        if (current === undefined)
          return
        const again = await firstArrangement(graph, PLACEMENT, current.holds)
        setGeneration(count => count + 1)
        persist({ ...current, ...again.board })
      }
      catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    })()
  }, [graph, persist])

  const keepLatest = useCallback(() => {
    const current = latestBoard.current
    if (current !== undefined)
      persist(current)
  }, [persist])

  const rename = useCallback((sectionId: string, name: string) => {
    const current = latestBoard.current
    if (current === undefined)
      return
    const next = renameSection(current, sectionId, name)
    setBoards(kept => kept.map(one => (one.id === next.id ? next : one)))
    setDrawn(nodes => nodes.map(node => (node.id === sectionId
      ? { ...node, data: { ...node.data, section: next.sections.find(one => one.id === sectionId) } }
      : node)))
  }, [setDrawn])

  // What is on the board is rebuilt only when the board gains or loses
  // something, never when a position changes, so a drag is left alone.
  const membership = useMemo(
    () => (board === undefined
      ? ''
      : [generation, ...board.cards.map(card => card.nodeId), ...board.sections.map(section => section.id)].join('|')),
    [board, generation],
  )

  useEffect(() => {
    const current = latestBoard.current
    if (current === undefined)
      return
    const sections: Node<SectionBoxData>[] = current.sections.map(section => ({
      id: section.id,
      type: 'section',
      position: { x: section.x, y: section.y },
      // A section is ground, so it is drawn under the cards and never selects,
      // which keeps a click on the board about the cards a reader put there.
      // Taking hold of one is not selecting it, and is kept here rather than
      // handed to the canvas, so what a section does to the rest of the board
      // when a reader picks a card is left alone.
      data: {
        section,
        onRename: name => rename(section.id, name),
        onRenamed: keepLatest,
        grabbed: false,
      },
      selectable: false,
      zIndex: 0,
    }))
    const cards: Node<BoardCardData>[] = drawnCards(current, byId).map(card => ({
      id: card.nodeId,
      type: 'card',
      position: { x: card.x, y: card.y },
      data: {
        node: card.node,
        form: nodeStyle(card.node.type).form,
        colour: colourOf(card.node),
        says: [],
        // Only where there is something to tell a card apart from. A board of
        // one kind would say the same word on every card and so say nothing.
        ...((current.holds ?? []).length > 1 ? { kind: card.node.type } : {}),
      },
      style: { width: card.width },
      zIndex: 3,
    }))
    setDrawn([...sections, ...cards])
  }, [membership, byId, colourOf, hangsOff, familyLed, rename, keepLatest, setDrawn])

  const selected = useMemo(
    () => new Set(drawn.filter(node => node.selected === true).map(node => node.id)),
    [drawn],
  )
  const [pickedId] = [...selected]

  /**
   * The section a reader has taken hold of, which is the only one that moves.
   * Held apart from what the canvas calls selection, since selecting a section
   * would tell the rest of the board to stand back from a thing the graph has
   * no relations for, and everything else on the board would go quiet.
   */
  const [grabbed, setGrabbed] = useState<string | undefined>(undefined)
  const attention = pickedId === undefined ? IDLE : { selectedId: pickedId, focused }
  const near = useMemo(
    () => neighbourhood(
      attention.selectedId,
      graph.edges.map(edge => ({ id: edge.id, from: edge.fromNodeId, to: edge.toNodeId })),
    ),
    [attention.selectedId, graph],
  )

  // Where the cards actually are right now, which is what a family tree has to
  // be drawn from, since a reader may have moved any of them since it opened.
  /**
   * Where each card is, and how big.
   * The measured size once the browser has one, since a line has to meet a
   * card's real edge and an estimate leaves it hanging in the air. The
   * estimate stands in until then, because a board has to be laid out before
   * anything has been drawn.
   */
  const boxes = useMemo(() => new Map(drawn
    .filter(node => node.type === 'card')
    .flatMap((node) => {
      const graphNode = byId.get(node.id)
      if (graphNode === undefined)
        return []
      const guessed = cardExtent(graphNode, (hangsOff.get(node.id) ?? []).length)
      return [[node.id, {
        x: node.position.x,
        y: node.position.y,
        width: node.measured?.width ?? guessed.width,
        height: node.measured?.height ?? guessed.height,
      }] as const]
    })), [drawn, byId, hangsOff])

  const kin = useMemo(() => {
    const at = boxes
    return kinship(
      graph.edges.map(edge => ({ id: edge.id, type: edge.type, from: edge.fromNodeId, to: edge.toNodeId })),
      at,
    )
  }, [boxes, graph])
  // A reader who picked something wants the rest out of the way, gently while
  // they glance and entirely once they ask to focus.

  /**
   * The sections, each drawn big enough to hold what stands on it.
   * A section is sized by the layout from what a card was estimated to need,
   * and a card turns out taller than the estimate once the browser has laid
   * its words out, so ground meant to hold one ends a few pixels short of it.
   * Ground that does not reach the edge of what stands on it reads as a
   * mistake wherever it happens.
   */
  const grounds = useMemo(() => (board?.sections ?? []).map((section) => {
    const standing = [...boxes.values()].filter(box => sectionHolding(box, [section]) !== undefined)
    if (standing.length === 0)
      return section
    const right = Math.max(...standing.map(box => box.x + box.width + HOLDS_ITS_OWN))
    const bottom = Math.max(...standing.map(box => box.y + box.height + HOLDS_ITS_OWN))
    return {
      ...section,
      width: Math.max(section.width, right - section.x),
      height: Math.max(section.height, bottom - section.y),
    }
  }), [board, boxes])

  const extent = useMemo(
    () => [...boxes.values(), ...grounds.map(section => ({
      x: section.x,
      y: section.y,
      width: section.width,
      height: section.height,
    }))],
    [boxes, grounds],
  )

  /**
   * Whether the browser has drawn every card yet.
   * Fitting to estimated sizes fits to a board that is not the one about to
   * appear, since a card turns out about half as tall again as it was guessed.
   * Counted rather than asked of an empty list, which answers yes to anything.
   */
  const measured = drawn.filter(node => node.type === 'card' && node.measured?.height !== undefined)
  /**
   * Which ground each card is standing on.
   * Asked of where it is rather than of what it was filed under, so a reader
   * who drags a card into another section has moved it there.
   */
  const groundOf = useMemo(() => (nodeId: string): string | undefined => {
    const box = boxes.get(nodeId)
    return box === undefined ? undefined : sectionHolding(box, grounds)?.id
  }, [boxes, grounds])

  /** The section a topic is drawn as, so a relation reaching it has an end. */
  const sectionFor = useMemo(
    () => new Map((board?.sections ?? []).map(section => [section.id.replace(/^topic-/, ''), section.id])),
    [board],
  )

  const laidOut = board !== undefined
    && board.cards.length > 0
    && measured.length === drawnCards(board, byId).length

  // Lines are worked out again whenever a card settles somewhere new, since a
  // route that went round a card is wrong the moment that card moves.
  const obstacles = useMemo(
    () => [
      ...[...boxes].map(([id, box]) => ({ id, ...box })),
      // Given as ground rather than as something to avoid, since a section is
      // drawn under every line and a line crossing one is not hidden by it.
      // A line still has to be able to end on one, which is why it is here.
      ...grounds.map(section => ({
        id: section.id,
        x: section.x,
        y: section.y,
        width: section.width,
        height: section.height,
        ground: true,
      })),
    ],
    [boxes, grounds],
  )

  useEffect(() => {
    if (obstacles.length === 0)
      return
    let asking = true
    void ROUTING
      .route({
        obstacles,
        // Anything drawn as a trunk is worked out from where its cards are,
        // so routing it as well would spend a place on a border that nothing
        // then draws to, and push another line off the middle it wanted.
        edges: graph.edges
          .filter(edge => !kin.edges.has(edge.id))
          .map(edge => ({ id: edge.id, type: edge.type, from: edge.fromNodeId, to: edge.toNodeId })),
      })
      .then((routed) => {
        if (asking)
          setRoutes(routed.edges)
      })
    return () => { asking = false }
  }, [obstacles, graph, kin])

  const relations = useMemo(() => {
    const onBoard = new Set(drawn.filter(node => node.type === 'card').map(node => node.id))
    /**
     * Where a relation's end attaches.
     * A card when the node is on the board as one, and the ground itself when
     * the node is the topic that ground stands for, since a section is a topic
     * and a relation reaching a topic reaches the section.
     */
    const endpointOf = (nodeId: string): string | undefined =>
      onBoard.has(nodeId) ? nodeId : sectionFor.get(nodeId)

    /**
     * Whether a relation is worth drawing between its two cards.
     * Not whether it crosses a section, which is a fact about filing rather
     * than about what a reader can follow. A line that wanders far enough is
     * lost whether or not it stays on one ground, and a short line across two
     * grounds is perfectly readable.
     *
     * One already drawn is held to a looser measure than one not, so the board
     * settles instead of chasing its own answer.
     */
    const drawable = (edgeId: string): boolean => {
      const route = kin.edges.get(edgeId) ?? routes.get(edgeId)
      if (route === undefined || route.length < 2)
        return true
      const ends = [route[0]!, route[route.length - 1]!]
      const direct = Math.hypot(ends[1]!.x - ends[0]!.x, ends[1]!.y - ends[0]!.y)
      let run = 0
      let turns = 0
      for (let index = 1; index < route.length; index += 1) {
        run += Math.abs(route[index]!.x - route[index - 1]!.x) + Math.abs(route[index]!.y - route[index - 1]!.y)
        if (index < 2)
          continue
        const [before, corner, after] = [route[index - 2]!, route[index - 1]!, route[index]!]
        const straight = (before.x === corner.x && corner.x === after.x)
          || (before.y === corner.y && corner.y === after.y)
        if (!straight)
          turns += 1
      }
      const held = alreadyDrawn.current.has(edgeId)
      const slack = held ? SETTLES : 1
      return turns <= (held ? TURNS + 1 : TURNS)
        && run <= FAR * slack
        && run <= direct * WANDERS * slack
    }

    return drawnRelations(graph.edges, endpointOf, groundOf, drawable, selected)
  }, [graph, drawn, selected, routes, kin, groundOf, sectionFor])

  // Only lines whose way across the board is actually known. A line with no
  // route yet is drawn on the assumption that it will be fine, and remembering
  // that assumption let the slack protect a line the moment its real route
  // turned out to be one a reader could not follow.
  useEffect(() => {
    alreadyDrawn.current = new Set(relations.lines
      .filter(line => kin.edges.has(line.id) || routes.has(line.id))
      .map(line => line.id))
  }, [relations, kin, routes])

  /**
   * The cards as the canvas is given them.
   * A card moves only once it has been picked. Movable the moment it is under
   * the pointer, every card is a hole in the board a reader trying to move the
   * whole thing falls into, and a board is moved far more often than a card is.
   * Picking first also makes moving a card something a reader means to do.
   */
  const attended: Node[] = useMemo(() => drawn.flatMap((node): Node[] => {
    if (node.type !== 'card') {
      const held = node.id === grabbed
      // Given the ground grown to hold what stands on it, which is worked out
      // from what the browser measured and so is not known when a section is
      // first built.
      const section = grounds.find(one => one.id === node.id) ?? node.data.section
      return [{ ...node, draggable: held, data: { ...node.data, grabbed: held, section } }]
    }
    const emphasis = emphasisOf(node.id, near.nodes, attention)
    if (emphasis === 'gone')
      return []
    // Gathered here rather than where the card is built, since what the board
    // could not draw is only known once the lines have been worked out.
    const picked: Node = {
      ...node,
      draggable: node.selected === true,
      data: {
        ...node.data,
        says: saidOnCard(
          hangsOff.get(node.id) ?? [],
          relations.notes.get(node.id) ?? [],
          byId,
          parentId => kinColour(familyLed.get(parentId) ?? NO_FAMILY),
        ),
      },
    }
    return [emphasis === 'dimmed'
      ? { ...picked, style: { ...picked.style, opacity: DIMMED } }
      : picked]
  }), [drawn, near, attention, grabbed, relations, byId, hangsOff, familyLed, grounds])

  const edges: Edge[] = useMemo(() => {

    /**
     * The route a line takes.
     * A hierarchy is drawn from where its cards are now, so it survives a
     * reader moving one. Everything else follows the route that was worked out
     * to go round the cards in between, and falls back to running border to
     * border when there is no route for it.
     */
    const pointsFor = (edge: DrawnEdge): readonly { x: number, y: number }[] | undefined => {
      const routed = kin.edges.get(edge.id) ?? routes.get(edge.id)
      if (routed !== undefined)
        return routed
      const [from, to] = [extentOfEnd(edge.source), extentOfEnd(edge.target)]
      return from === undefined || to === undefined ? undefined : borderRun(from, to)
    }

    /**
     * Which way the line runs as it leaves each of its two cards.
     * Taken from the border each end sits on, so a curve leaves square on to
     * that border instead of at whatever angle the two centres happen to make.
     */
    const sidesOf = (
      edge: DrawnEdge,
      points: readonly { x: number, y: number }[] | undefined,
    ): { leaves?: Facing, arrives?: Facing } => {
      if (points === undefined || points.length < 2)
        return {}
      const from = extentOfEnd(edge.source)
      const to = extentOfEnd(edge.target)
      return {
        ...(from === undefined ? {} : { leaves: facing(from, points[0]!) }),
        ...(to === undefined ? {} : { arrives: facing(to, points[points.length - 1]!) }),
      }
    }

    const extentOfEnd = (id: string): Box | undefined => {
      const card = boxes.get(id)
      if (card !== undefined)
        return card
      const section = (board?.sections ?? []).find(one => one.id === id)
      return section === undefined
        ? undefined
        : { x: section.x, y: section.y, width: section.width, height: section.height }
    }

    // A relation drawn between two grounds belongs to neither family, so it
    // keeps the tone its own kind carries.
    const paintOf = (edge: DrawnEdge): string => {
      if (edge.style.kin !== 'tree')
        return edge.style.tone
      const parent = edge.style.rootAt === 'from' ? edge.source : edge.target
      return familyLed.get(parent) ?? NO_FAMILY
    }

    return relations.lines.flatMap((edge) => {
      const emphasis = emphasisOf(edge.id, near.edges, attention)
      if (emphasis === 'gone')
        return []
      const points = pointsFor(edge)
      return [{
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'routed',
        ...(edge.label === undefined ? {} : { label: edge.label }),
        data: {
          ...(points === undefined ? {} : { points }),
          curved: edge.style.kin === 'curve',
          ...sidesOf(edge, points),
        } satisfies RoutedEdgeData,
        style: {
          stroke: lineColour(paintOf(edge)),
          strokeWidth: edge.style.strokeWidth,
          ...(edge.style.dash === undefined ? {} : { strokeDasharray: edge.style.dash }),
          ...(emphasis === 'dimmed' ? { opacity: DIMMED } : {}),
        },
        markerEnd: markerId(edge.style.marker, paintOf(edge)),
        // Above the ground a section paints, below the cards it holds.
        zIndex: 2,
      }]
    })
  }, [graph, drawn, selected, routes, kin, boxes, near, attention, familyLed, groundOf, board, sectionFor])

  // A section is the shape of a thought, so moving one moves the thought,
  // and what sits inside keeps its arrangement rather than being relaid out.
  const onNodeDragStart = useCallback((_event: unknown, node: Node) => {
    const current = latestBoard.current
    const section = current?.sections.find(one => one.id === node.id)
    sectionDrag.current = section === undefined
      ? undefined
      : {
          id: node.id,
          at: node.position,
          held: new Set(drawn
            .filter(other => other.type === 'card'
              && sectionHolding(other.position, [{ ...section, ...node.position }]) !== undefined)
            .map(other => other.id)),
        }
  }, [drawn])

  /**
   * Where a drag actually puts things.
   * The canvas works a position out from the pointer and applies it through
   * this, so correcting it anywhere else is overwritten in the same frame.
   * A section moving carries what sits inside it, which is emitted here too so
   * the whole gesture lands together.
   */
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const board = latestBoard.current
    const sections = (board?.sections ?? []).map(section => ({
      id: section.id,
      x: section.x,
      y: section.y,
      width: section.width,
      height: section.height,
    }))
    const carried: NodeChange[] = []
    let lines: readonly Guide[] = NOTHING

    const settled = changes.map((change) => {
      if (change.type !== 'position' || change.position === undefined || change.dragging !== true)
        return change
      const moving = extentOf(change.id, boxes, board)
      if (moving === undefined)
        return change

      const others = [
        ...[...boxes].filter(([id]) => id !== change.id).map(([, box]) => box),
        ...sections.filter(section => section.id !== change.id),
      ]
      const lined = align({ ...moving, ...change.position }, others, TOLERANCE / zoom.current)
      lines = lined.guides

      const drag = sectionDrag.current
      if (drag !== undefined && drag.id === change.id) {
        const shift = { x: lined.at.x - drag.at.x, y: lined.at.y - drag.at.y }
        drag.at = lined.at
        for (const heldId of drag.held) {
          const at = boxes.get(heldId)
          if (at !== undefined)
            carried.push({ id: heldId, type: 'position', position: { x: at.x + shift.x, y: at.y + shift.y }, dragging: true })
        }
      }
      return { ...change, position: lined.at }
    })

    setGuides(lines)
    applyChanges([...settled, ...carried])
  }, [applyChanges, boxes])

  const onNodeDragStop = useCallback(() => {
    sectionDrag.current = undefined
    setGuides(NOTHING)
    const current = latestBoard.current
    if (current === undefined)
      return
    const at = new Map(drawn.map(node => [node.id, node.position]))
    persist({
      ...current,
      cards: current.cards.map(card => ({ ...card, ...(at.get(card.nodeId) ?? { x: card.x, y: card.y }) })),
      sections: current.sections.map(section => ({ ...section, ...(at.get(section.id) ?? { x: section.x, y: section.y }) })),
    })
  }, [drawn, persist])

  // Opening a concept is what shows what is asserted about it and where that
  // came from, since a board draws neither.
  const [openedId] = [...selected]
  const opened = openedId === undefined ? undefined : byId.get(openedId)

  if (error !== undefined)
    return <AppShell {...nav}><p className="p-10 font-ui text-sm text-claim">{error}</p></AppShell>
  if (board === undefined)
    return <AppShell {...nav}><p className="p-10 font-ui text-sm text-ink-subtle">Opening your board</p></AppShell>

  return (
    <AppShell {...nav} panel={opened === undefined
      ? <NodePicker available={available} onAdd={nodeId => persist(withCard(board, nodeId))} />
      : <ConceptPanel node={opened} held={inside(opened, graph)} />}
    >
      <div className="flex h-screen flex-col">
        <header className="flex items-center gap-3 border-b border-line px-6 py-3">
          <input
            value={board.name}
            onChange={(event) => {
              const renamed = { ...board, name: event.target.value }
              setBoards(kept => kept.map(one => (one.id === renamed.id ? renamed : one)))
            }}
            onBlur={() => persist(board)}
            aria-label="Board name"
            // A board is named for a thought, which is longer than a word,
            // so the field is as wide as what a reader wrote in it.
            style={{ width: `${Math.max(board.name.length, MIN_NAME_WIDTH)}ch` }}
            className="rounded-control bg-transparent px-2 py-1 font-ui text-sm font-semibold text-ink outline-none focus:bg-raised"
          />
          {/*
            One graph read three ways, so the readings sit beside each other
            and a reader moves between them without losing where they were in
            any of them.
          */}
          <nav className="ml-auto flex gap-1">
            {boards.map(one => (
              <button
                key={one.id}
                type="button"
                onClick={() => setOpenId(one.id)}
                className={`rounded-control px-2.5 py-1 font-ui text-xs transition-colors ${one.id === openId
                  ? 'bg-raised font-semibold text-ink'
                  : 'text-ink-subtle hover:bg-raised hover:text-ink-muted'}`}
              >
                {one.name}
              </button>
            ))}
          </nav>
        </header>

        {/*
          The instruments sit beside the canvas rather than inside it, under a
          provider that both share, since a child of the canvas is given the
          store too late to drive it.
        */}
        <ReactFlowProvider>
          <div className="relative min-h-0 flex-1">
            <BoardMarkers />
            <ReactFlow
              nodes={attended}
              edges={edges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              onNodesChange={onNodesChange}
              onNodeClick={(_, node) => setGrabbed(node.type === 'section' ? node.id : undefined)}
              onPaneClick={() => setGrabbed(undefined)}
              onNodeDragStart={onNodeDragStart}
              onNodeDragStop={onNodeDragStop}
              nodesConnectable={false}
              minZoom={0.1}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="var(--line-strong)" gap={GRID} size={1} />
              <Guides guides={guides} />
            </ReactFlow>
            <BoardTools
              extent={extent}
              laidOut={laidOut}
              onAddSection={() => persist(withSection(board))}
              onRearrange={rearrange}
              onFocus={() => setFocused(now => !now)}
              focused={focused}
              canFocus={pickedId !== undefined}
              zoom={zoom}
            />
          </div>
        </ReactFlowProvider>
      </div>
    </AppShell>
  )
}

/**
 * How big the thing being dragged is, whether it is a card or a section.
 * A card's size is taken from what the board already measured rather than from
 * the node the drag hands over, which does not carry one.
 */
function extentOf(
  id: string,
  boxes: ReadonlyMap<string, { width: number, height: number }>,
  board: Board | undefined,
): { width: number, height: number } | undefined {
  const section = board?.sections.find(one => one.id === id)
  if (section !== undefined)
    return { width: section.width, height: section.height }
  return boxes.get(id)
}
