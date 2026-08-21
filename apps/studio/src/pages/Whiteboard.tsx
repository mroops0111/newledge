import type { Board } from '@newledge/board'
import { sectionHolding } from '@newledge/board'
import type { Edge, Node, NodeTypes, XYPosition } from '@xyflow/react'
import { Background, Controls, ReactFlow, useNodesState } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Arrangement } from '../lib/arrange.js'
import { firstArrangement } from '../lib/arrange.js'
import { elkPlacement } from '../lib/elkPlacement.js'
import type { BoardClient } from '../lib/boards.js'
import { renameSection, withBoard, withCard, withSection } from '../lib/boards.js'
import { nodeStyle, TONE_COLOURS } from '../lib/boardStyle.js'
import type { GraphClient } from '../lib/client.js'
import { drawnCards, drawnEdges } from '../lib/drawing.js'
import { kinship } from '../lib/family.js'
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
import { Button } from '../ui/Button.js'
import { NodePicker } from '../ui/NodePicker.js'
import type { SectionBoxData } from '../ui/SectionBox.js'
import { SectionBox } from '../ui/SectionBox.js'
import '@xyflow/react/dist/style.css'

const UNTYPED = 'var(--ink-subtle)'
const NODE_TYPES: NodeTypes = { card: BoardCard, section: SectionBox, brood: BroodBox }
const EDGE_TYPES = { routed: RoutedEdge }
const PLACEMENT = elkPlacement()
const MIN_NAME_WIDTH = 10

interface SectionDrag {
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
  const [enclosures, setEnclosures] = useState<Arrangement['broods']>([])
  const [error, setError] = useState<string | undefined>(undefined)

  // React Flow owns where things are while a reader is moving them, and the
  // board is written from it once they let go. Feeding the model back in on
  // every frame throws away the measurements and the drag flickers.
  const [drawn, setDrawn, onNodesChange] = useNodesState<Node>([])
  const latestBoard = useRef<Board | undefined>(undefined)
  const sectionDrag = useRef<SectionDrag | undefined>(undefined)
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
        setEnclosures(opening.broods)
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
      : [...board.cards.map(card => card.nodeId), ...board.sections.map(section => section.id)].join('|')),
    [board],
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

  // Where the cards actually are right now, which is what a family tree has to
  // be drawn from, since a reader may have moved any of them since it opened.
  const kin = useMemo(() => {
    const at = new Map(drawn
      .filter(node => node.type === 'card')
      .map(node => [node.id, {
        x: node.position.x,
        y: node.position.y,
        width: node.measured?.width ?? 0,
        height: node.measured?.height ?? 0,
      }]))
    return kinship(
      graph.edges.map(edge => ({ id: edge.id, type: edge.type, from: edge.fromNodeId, to: edge.toNodeId })),
      at,
    )
  }, [drawn, graph])
  const broods: Node<BroodBoxData>[] = useMemo(() => enclosures.map(brood => ({
    id: brood.id,
    type: 'brood',
    position: { x: brood.x, y: brood.y },
    data: { width: brood.width, height: brood.height },
    draggable: false,
    selectable: false,
    zIndex: 1,
  })), [enclosures])

  const edges: Edge[] = useMemo(() => {
    const onBoard = new Set(drawn.filter(node => node.type === 'card').map(node => node.id))
    // A hierarchy is drawn from where the cards are, so it survives a reader
    // moving one. Everything else keeps the route it was placed with.
    const pointsFor = (id: string): readonly { x: number, y: number }[] | undefined =>
      kin.edges.get(id) ?? routes.get(id)
    return drawnEdges(graph.edges, onBoard, selected).map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'routed',
      ...(edge.label === undefined ? {} : { label: edge.label }),
      data: {
        ...(pointsFor(edge.id) === undefined ? {} : { points: pointsFor(edge.id) }),
        curved: edge.style.kin === 'curve',
      } satisfies RoutedEdgeData,
      style: {
        stroke: TONE_COLOURS[edge.style.tone],
        strokeWidth: edge.style.strokeWidth,
        ...(edge.style.dash === undefined ? {} : { strokeDasharray: edge.style.dash }),
      },
      markerEnd: markerId(edge.style.marker, edge.style.tone),
      // Above the ground a section paints, below the cards it holds.
      zIndex: 2,
    }))
  }, [graph, drawn, selected, routes, kin])

  // A section is the shape of a thought, so moving one moves the thought,
  // and what sits inside keeps its arrangement rather than being relaid out.
  const onNodeDragStart = useCallback((_event: unknown, node: Node) => {
    const current = latestBoard.current
    const section = current?.sections.find(one => one.id === node.id)
    sectionDrag.current = section === undefined
      ? undefined
      : {
          at: node.position,
          held: new Set(drawn
            .filter(other => other.type === 'card'
              && sectionHolding(other.position, [{ ...section, ...node.position }]) !== undefined)
            .map(other => other.id)),
        }
  }, [drawn])

  const onNodeDrag = useCallback((_event: unknown, node: Node) => {
    const drag = sectionDrag.current
    if (drag === undefined || drag.held.size === 0)
      return
    const dx = node.position.x - drag.at.x
    const dy = node.position.y - drag.at.y
    drag.at = node.position
    setDrawn(nodes => nodes.map(other => (drag.held.has(other.id)
      ? { ...other, position: { x: other.position.x + dx, y: other.position.y + dy } }
      : other)))
  }, [setDrawn])

  const onNodeDragStop = useCallback(() => {
    sectionDrag.current = undefined
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
          <Button onClick={() => persist(withSection(board))}>Add a section</Button>
        </header>

        <div className="relative min-h-0 flex-1">
          <BoardMarkers />
          <ReactFlow
            nodes={[...drawn, ...broods]}
            edges={edges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            onNodesChange={onNodesChange}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            nodesConnectable={false}
            fitView
            fitViewOptions={{ padding: 0.15, minZoom: 0.2, maxZoom: 1 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="var(--line-strong)" gap={24} size={1} />
            <Controls showInteractive={false} className="!border-line !bg-surface !shadow-card" />
          </ReactFlow>
        </div>
      </div>
    </AppShell>
  )
}
