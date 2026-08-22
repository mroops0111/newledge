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
import { renameSection, withBoard, withCard, withSection } from '../lib/boards.js'
import { edgeStyle, nodeStyle } from '../lib/boardStyle.js'
import type { GraphClient } from '../lib/client.js'
import type { DrawnEdge } from '../lib/drawing.js'
import { drawnCards, drawnRelations } from '../lib/drawing.js'
import { cardExtent } from '../lib/measure.js'
import { kinship } from '../lib/family.js'
import { familyColours, familyOfRoot, kinColour, lineageLabel, lineages, NO_FAMILY } from '../lib/kinship.js'
import type { Box } from '../lib/path.js'
import { borderRun } from '../lib/path.js'
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
  const [board, setBoard] = useState<Board | undefined>(undefined)
  const [others, setOthers] = useState<readonly Board[]>([])
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
  latestBoard.current = board

  useEffect(() => {
    void (async () => {
      try {
        const [loaded, state] = await Promise.all([
          graphClient.graph(),
          boardClient.read(),
        ])
        setGraph(loaded)
        const [kept] = state.boards
        setOthers(state.boards.slice(1))
        if (kept !== undefined) {
          setBoard(kept)
          return
        }
        // A workspace nobody has arranged opens on a first arrangement rather
        // than on an empty canvas, written down at once so a reader is editing
        // their own board from then on and is never laid out again.
        const opening = await firstArrangement(loaded, PLACEMENT)
        setBoard(opening.board)
        await boardClient.keep({ boards: [opening.board] })
      }
      catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    })()
  }, [graphClient, boardClient])

  const persist = useCallback((next: Board) => {
    setBoard(next)
    void boardClient
      .keep(withBoard({ boards: [...others] }, next))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
  }, [boardClient, others])

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
        const again = await firstArrangement(graph, PLACEMENT)
        setGeneration(count => count + 1)
        persist({ ...again.board, name: latestBoard.current?.name ?? again.board.name })
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
    setBoard(next)
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
      data: { section, onRename: name => rename(section.id, name), onRenamed: keepLatest },
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
        ...(hangsOff.get(card.nodeId) === undefined
          ? {}
          : { lineage: {
              label: lineageLabel(hangsOff.get(card.nodeId)!, byId),
              type: hangsOff.get(card.nodeId)!.type,
            } }),
      },
      style: { width: card.width },
      zIndex: 3,
    }))
    setDrawn([...sections, ...cards])
  }, [membership, byId, colourOf, hangsOff, rename, keepLatest, setDrawn])

  const selected = useMemo(
    () => new Set(drawn.filter(node => node.selected === true).map(node => node.id)),
    [drawn],
  )
  const [pickedId] = [...selected]
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
      const guessed = cardExtent(graphNode, hangsOff.has(node.id))
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
  const attended: Node[] = useMemo(() => drawn.flatMap((node) => {
    if (node.type !== 'card')
      return [node]
    const emphasis = emphasisOf(node.id, near.nodes, attention)
    if (emphasis === 'gone')
      return []
    return [emphasis === 'dimmed' ? { ...node, style: { ...node.style, opacity: DIMMED } } : node]
  }), [drawn, near, attention])

  const extent = useMemo(
    () => [...boxes.values(), ...(board?.sections ?? []).map(section => ({
      x: section.x,
      y: section.y,
      width: section.width,
      height: section.height,
    }))],
    [boxes, board],
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
  const groundOf = useMemo(() => {
    const sections = board?.sections ?? []
    return (nodeId: string): string | undefined => {
      const box = boxes.get(nodeId)
      return box === undefined ? undefined : sectionHolding(box, sections)?.id
    }
  }, [boxes, board])

  const laidOut = board !== undefined
    && board.cards.length > 0
    && measured.length === drawnCards(board, byId).length

  // Lines are worked out again whenever a card settles somewhere new, since a
  // route that went round a card is wrong the moment that card moves.
  const obstacles = useMemo(
    () => [
      ...[...boxes].map(([id, box]) => ({ id, ...box })),
      ...(board?.sections ?? []).map(section => ({
        id: section.id,
        x: section.x,
        y: section.y,
        width: section.width,
        height: section.height,
      })),
    ],
    [boxes, board],
  )

  useEffect(() => {
    if (obstacles.length === 0)
      return
    let asking = true
    void ROUTING
      .route({
        obstacles,
        edges: graph.edges
          .filter(edge => edgeStyle(edge.type).kin === 'curve')
          .map(edge => ({ id: edge.id, type: edge.type, from: edge.fromNodeId, to: edge.toNodeId })),
      })
      .then((routed) => {
        if (asking)
          setRoutes(routed.edges)
      })
    return () => { asking = false }
  }, [obstacles, graph])

  const edges: Edge[] = useMemo(() => {
    const onBoard = new Set(drawn.filter(node => node.type === 'card').map(node => node.id))
    const relations = drawnRelations(graph.edges, onBoard, groundOf, selected)

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

    return [...relations.withinSections, ...relations.betweenSections].flatMap((edge) => {
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
        } satisfies RoutedEdgeData,
        style: {
          stroke: kinColour(paintOf(edge)),
          strokeWidth: edge.style.strokeWidth,
          ...(edge.style.dash === undefined ? {} : { strokeDasharray: edge.style.dash }),
          ...(emphasis === 'dimmed' ? { opacity: DIMMED } : {}),
        },
        markerEnd: markerId(edge.style.marker, paintOf(edge)),
        // Above the ground a section paints, below the cards it holds.
        zIndex: 2,
      }]
    })
  }, [graph, drawn, selected, routes, kin, boxes, near, attention, familyLed, groundOf, board])

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
            onChange={event => setBoard({ ...board, name: event.target.value })}
            onBlur={() => persist(board)}
            aria-label="Board name"
            // A board is named for a thought, which is longer than a word,
            // so the field is as wide as what a reader wrote in it.
            style={{ width: `${Math.max(board.name.length, MIN_NAME_WIDTH)}ch` }}
            className="rounded-control bg-transparent px-2 py-1 font-ui text-sm font-semibold text-ink outline-none focus:bg-raised"
          />
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
