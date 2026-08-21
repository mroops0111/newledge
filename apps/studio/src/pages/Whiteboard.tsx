import type { Board } from '@newledge/board'
import { sectionHolding } from '@newledge/board'
import type { Edge, Node, NodeChange, NodeTypes, XYPosition } from '@xyflow/react'
import { Background, ReactFlow, ReactFlowProvider, useNodesState } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { firstArrangement } from '../lib/arrange.js'
import { align, TOLERANCE } from '../lib/aligning.js'
import type { Guide } from '../lib/aligning.js'
import { emphasisOf, IDLE, neighbourhood } from '../lib/attention.js'
import { elkPlacement } from '../lib/elkPlacement.js'
import type { BoardClient } from '../lib/boards.js'
import { renameSection, withBoard, withCard, withSection } from '../lib/boards.js'
import { nodeStyle, TONE_COLOURS } from '../lib/boardStyle.js'
import type { GraphClient } from '../lib/client.js'
import type { DrawnEdge } from '../lib/drawing.js'
import { drawnCards, drawnEdges } from '../lib/drawing.js'
import { cardExtent } from '../lib/measure.js'
import { kinship } from '../lib/family.js'
import { borderRun } from '../lib/path.js'
import type { GraphEdge, GraphNode, Ontology } from '../lib/graph.js'
import type { Nav } from '../ui/AppShell.js'
import { AppShell } from '../ui/AppShell.js'
import type { BoardCardData } from '../ui/BoardCard.js'
import { BoardCard } from '../ui/BoardCard.js'
import { BoardMarkers, markerId } from '../ui/BoardMarkers.js'
import { BroodBox } from '../ui/BroodBox.js'
import type { BroodBoxData } from '../ui/BroodBox.js'
import { ConceptPanel, inside } from '../ui/ConceptPanel.js'
import type { RoutedEdgeData } from '../ui/RoutedEdge.js'
import { RoutedEdge } from '../ui/RoutedEdge.js'
import { NodePicker } from '../ui/NodePicker.js'
import { BoardTools } from '../ui/BoardTools.js'
import { Guides } from '../ui/Guides.js'
import type { SectionBoxData } from '../ui/SectionBox.js'
import { SectionBox } from '../ui/SectionBox.js'
import '@xyflow/react/dist/style.css'

const UNTYPED = 'var(--ink-subtle)'
const NODE_TYPES: NodeTypes = { card: BoardCard, section: SectionBox, brood: BroodBox }
const EDGE_TYPES = { routed: RoutedEdge }
const PLACEMENT = elkPlacement()
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
  const [ontology, setOntology] = useState<Ontology | undefined>(undefined)
  const [graph, setGraph] = useState<{ nodes: readonly GraphNode[], edges: readonly GraphEdge[] }>({ nodes: [], edges: [] })
  const [board, setBoard] = useState<Board | undefined>(undefined)
  const [others, setOthers] = useState<readonly Board[]>([])
  // Where each line runs, worked out when the board was arranged. A reader who
  // moves a card leaves its lines behind, so those fall back to a plain curve
  // until a router runs again.
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
        const [declared, loaded, state] = await Promise.all([
          graphClient.ontology(),
          graphClient.graph(),
          boardClient.read(),
        ])
        setOntology(declared)
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
        setRoutes(opening.routes)
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

  const colourOf = useMemo(() => {
    const byType = new Map((ontology?.nodeTypes ?? []).map(type => [type.id, type.color ?? UNTYPED]))
    return (type: string): string => byType.get(type) ?? UNTYPED
  }, [ontology])

  const byId = useMemo(() => new Map(graph.nodes.map(node => [node.id, node])), [graph])
  const available = useMemo(() => {
    const chosen = new Set((board?.cards ?? []).map(card => card.nodeId))
    return graph.nodes.filter(node => !chosen.has(node.id))
  }, [graph, board])

  const rearrange = useCallback(() => {
    void (async () => {
      try {
        const again = await firstArrangement(graph, PLACEMENT)
        setRoutes(again.routes)
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
      data: { node: card.node, form: nodeStyle(card.node.type).form, colour: colourOf(card.node.type) },
      style: { width: card.width },
      zIndex: 3,
    }))
    setDrawn([...sections, ...cards])
  }, [membership, byId, colourOf, rename, keepLatest, setDrawn])

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
  // Where each card is, and how big. The position is live, since a reader may
  // be moving it, and the size is the one the arrangement was built from
  // rather than one measured by the browser, which arrives too late to lay a
  // board out with and never reaches this state at all.
  const boxes = useMemo(() => new Map(drawn
    .filter(node => node.type === 'card')
    .flatMap((node) => {
      const graphNode = byId.get(node.id)
      return graphNode === undefined
        ? []
        : [[node.id, { x: node.position.x, y: node.position.y, ...cardExtent(graphNode) }] as const]
    })), [drawn, byId])

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

  const laidOut = board !== undefined && boxes.size > 0

  const broods: Node<BroodBoxData>[] = useMemo(() => kin.broods.map(brood => ({
    id: brood.id,
    type: 'brood',
    position: { x: brood.x, y: brood.y },
    data: { width: brood.width, height: brood.height },
    draggable: false,
    selectable: false,
    zIndex: 1,
  })), [kin])

  const edges: Edge[] = useMemo(() => {
    const onBoard = new Set(drawn.filter(node => node.type === 'card').map(node => node.id))
    // A hierarchy and an association are both drawn from where the cards are,
    // so both survive a reader moving one. An association runs border to
    // border, which is the short way round rather than handle to handle.
    const pointsFor = (edge: DrawnEdge): readonly { x: number, y: number }[] | undefined => {
      if (edge.style.kin !== 'curve')
        return kin.edges.get(edge.id) ?? routes.get(edge.id)
      const [from, to] = [boxes.get(edge.source), boxes.get(edge.target)]
      return from === undefined || to === undefined ? undefined : borderRun(from, to)
    }

    return drawnEdges(graph.edges, onBoard, selected).flatMap((edge) => {
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
          stroke: TONE_COLOURS[edge.style.tone],
          strokeWidth: edge.style.strokeWidth,
          ...(edge.style.dash === undefined ? {} : { strokeDasharray: edge.style.dash }),
          ...(emphasis === 'dimmed' ? { opacity: DIMMED } : {}),
        },
        markerEnd: markerId(edge.style.marker, edge.style.tone),
        // Above the ground a section paints, below the cards it holds.
        zIndex: 2,
      }]
    })
  }, [graph, drawn, selected, routes, kin, boxes, near, attention])

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
    setRoutes(new Map())
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
              nodes={[...attended, ...broods]}
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
