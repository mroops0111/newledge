import type { Board } from '@newledge/board'
import { sectionHolding } from '@newledge/board'
import type { Edge, Node, NodeTypes } from '@xyflow/react'
import { ReactFlow, ReactFlowProvider, useNodesState } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Box } from '@newledge/board-layout'
import { orthogonalRouting } from '@newledge/board-layout'
import { alreadyOn, firstArrangement, ofKinds } from '../lib/arrange.js'
import { DIMMED, emphasisOf, IDLE, neighbourhood } from '../lib/attention.js'
import { elkPlacement } from '../lib/elkPlacement.js'
import type { BoardClient } from '../lib/boards.js'
import { newBoard, openingBoards, renameSection, resizeSection, withBoard, withSection } from '../lib/boards.js'
import { nodeStyle, STROKE } from '../lib/boardStyle.js'
import type { GraphClient } from '../lib/client.js'
import { drawnCards, drawnRelations } from '../lib/drawing.js'
import { grownSections } from '../lib/grounds.js'
import { worthFollowing } from '../lib/legibility.js'
import { topicOf } from '../lib/topic.js'
import { CARD_HEIGHT, cardExtent } from '../lib/measure.js'
import { kinship } from '../lib/family.js'
import { familyColours, familyOfRoot, kinColour, lineages, NO_FAMILY, saidOnCard } from '../lib/kinship.js'
import type { GraphEdge, GraphNode } from '../lib/graph.js'
import type { ViewClient } from '../lib/views.js'
import type { Nav } from '../ui/AppShell.js'
import { AppShell } from '../ui/AppShell.js'
import type { BoardCardData } from '../ui/BoardCard.js'
import { BoardCard } from '../ui/BoardCard.js'
import { useBoardCards } from '../ui/useBoardCards.js'
import { CanvasGrid } from '../ui/CanvasGrid.js'
import { CardDrop } from '../ui/CardDrop.js'
import { CardPicker } from '../ui/CardPicker.js'
import { BoardMarkers } from '../ui/BoardMarkers.js'
import { boardEdges } from '../ui/boardEdges.js'
import { BoardList } from '../ui/BoardList.js'
import { inside } from '../lib/inside.js'
import { NodePanel } from '../ui/NodePanel.js'
import { WriteOut } from '../ui/WriteOut.js'
import { CanvasEdge } from '../ui/CanvasEdge.js'
import { BoardTools } from '../ui/BoardTools.js'
import { Guides } from '../ui/Guides.js'
import type { SectionBoxData } from '../ui/SectionBox.js'
import { SectionBox } from '../ui/SectionBox.js'
import { useBoardDrag } from '../ui/useBoardDrag.js'
import { useRoutes } from '../ui/useRoutes.js'
import '@xyflow/react/dist/style.css'

const NODE_TYPES: NodeTypes = { card: BoardCard, section: SectionBox }
const EDGE_TYPES = { line: CanvasEdge }
const PLACEMENT = elkPlacement()
const ROUTING = orthogonalRouting()
const MIN_NAME_WIDTH = 10

export function Whiteboard({ graphClient, boardClient, views, nav }: {
  graphClient: GraphClient
  boardClient: BoardClient
  views: ViewClient
  nav: Nav
}): React.JSX.Element {
  const [graph, setGraph] = useState<{ nodes: readonly GraphNode[], edges: readonly GraphEdge[] }>({ nodes: [], edges: [] })
  const [boards, setBoards] = useState<readonly Board[]>([])
  const [openId, setOpenId] = useState<string | undefined>(undefined)
  const [focused, setFocused] = useState(false)
  // Laying a board out again gives back the same cards in new places,
  // so what is drawn is rebuilt from a fact other than which cards it holds.
  const [generation, setGeneration] = useState(0)
  const [error, setError] = useState<string | undefined>(undefined)

  // React Flow owns where things are while a reader is moving them,
  // and the board is written from it once they let go.
  // Feeding the model back in on every frame throws away the measurements,
  // and the drag flickers.
  const [drawn, setDrawn, applyChanges] = useNodesState<Node>([])
  const latestBoard = useRef<Board | undefined>(undefined)
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
        // A workspace nobody has arranged opens on a first arrangement,
        // rather than on an empty canvas, written down at once,
        // so a reader is editing their own boards from then on,
        // and is never laid out again.
        const opening = await Promise.all(openingBoards(loaded.nodes).map(async board => ({
          ...board,
          holds: [...board.holds],
          ...(await firstArrangement(loaded, PLACEMENT, ofKinds(board.holds))).board,
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
   * Not what kind it is, because the card's own shape already says that,
   * and two meanings in one stripe can only be told apart,
   * by knowing the palette.
   */
  const familyOf = useMemo(() => familyColours(graph.edges), [graph])
  const hangsOff = useMemo(() => lineages(graph.edges), [graph])
  const familyLed = useMemo(() => familyOfRoot(graph.edges), [graph])
  const colourOf = useMemo(
    () => (node: GraphNode): string => kinColour(familyOf.get(node.id) ?? NO_FAMILY),
    [familyOf],
  )

  const byId = useMemo(() => new Map(graph.nodes.map(node => [node.id, node])), [graph])

  const rearrange = useCallback(() => {
    void (async () => {
      try {
        const current = latestBoard.current
        if (current === undefined)
          return
        // Of what the board holds now, not of the kinds it was seeded from.
        // A reader who dragged a source onto a board of terms,
        // and then asked for it to be laid out again,
        // has not asked for the source to be thrown away.
        const again = await firstArrangement(graph, PLACEMENT, alreadyOn(current))
        setGeneration(count => count + 1)
        persist({ ...current, ...again.board })
      }
      catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    })()
  }, [graph, persist])

  /**
   * A board a reader adds opens on nothing, with the panel they fill it from.
   *
   * It used to open on the widest reading of the graph,
   * because there was no way to put anything on one,
   * and an empty board could not be worked with.
   * There is now, and a board of five things made by dropping forty,
   * was never a reader choosing a subset.
   */
  const addBoard = useCallback(() => {
    const fresh = newBoard({ boards: [...boards] })
    persist(fresh)
    setOpenId(fresh.id)
    setPutting(true)
  }, [boards, persist])

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

  // What is on the board is rebuilt only when it gains or loses something,
  // never when a position changes, so a drag is left alone.
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
      // Taking hold of one is not selecting it,
      // and is kept here rather than handed to the canvas,
      // so what a section does to the rest of the board,
      // when a reader picks a card, is left alone.
      data: {
        section,
        onRename: name => rename(section.id, name),
        onRenamed: keepLatest,
        onResized: (extent) => {
          const now = latestBoard.current
          if (now !== undefined)
            persist(resizeSection(now, section.id, extent))
        },
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
        // Only where there is something to tell a card apart from.
        // A board of one kind says one word on every card, and so says nothing.
        ...((current.holds ?? []).length > 1 ? { kind: card.node.type } : {}),
      },
      style: { width: card.width, height: CARD_HEIGHT },
      zIndex: 3,
    }))
    setDrawn([...sections, ...cards])
  }, [membership, byId, colourOf, rename, keepLatest, setDrawn])

  const selected = useMemo(
    () => new Set(drawn.filter(node => node.selected === true).map(node => node.id)),
    [drawn],
  )
  const [pickedId] = [...selected]

  // What this board holds.
  // How it is arranged and how it is drawn are answered elsewhere,
  // and this is answered where they are not.
  const { putting, setPutting, actsOn } = useBoardCards({
    latestBoard,
    picked: pickedId,
    focused,
    persist,
    onFocus: setFocused,
  })


  /**
   * The section a reader has taken hold of, which is the only one that moves.
   * Held apart from what the canvas calls selection,
   * since selecting a section would tell the rest of the board to stand back,
   * from a thing the graph has no relations for,
   * and everything else on the board would go quiet.
   */
  const [grabbed, setGrabbed] = useState<string | undefined>(undefined)

  // A reader who picked something wants the rest out of the way,
  // gently while they glance and entirely once they ask to focus.
  const attention = pickedId === undefined ? IDLE : { selectedId: pickedId, focused }
  const near = useMemo(
    () => neighbourhood(
      attention.selectedId,
      graph.edges.map(edge => ({ id: edge.id, from: edge.fromNodeId, to: edge.toNodeId })),
    ),
    [attention.selectedId, graph],
  )

  /**
   * Where each card is, and how big.
   * The measured size once the browser has one,
   * since a line has to meet a card's real edge,
   * and an estimate leaves it hanging in the air.
   * The estimate stands in until then,
   * because a board has to be laid out before anything has been drawn.
   * Read from where the cards are now rather than from the arrangement,
   * since a reader may have moved any of them since it opened.
   */
  const boxes = useMemo(() => new Map(drawn
    .filter(node => node.type === 'card')
    .flatMap((node): [string, Box][] => {
      const graphNode = byId.get(node.id)
      if (graphNode === undefined)
        return []
      const size = cardExtent(graphNode)
      return [[node.id, { x: node.position.x, y: node.position.y, ...size }]]
    })), [drawn, byId])

  const grounds = useMemo(
    () => grownSections(board?.sections ?? [], boxes.values()),
    [board, boxes],
  )

  const kin = useMemo(() => kinship(
    graph.edges.map(edge => ({ id: edge.id, type: edge.type, from: edge.fromNodeId, to: edge.toNodeId })),
    boxes,
  ), [boxes, graph])

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
   * Fitting to estimated sizes fits a board other than the one about to appear,
   * since a card turns out about half as tall again as it was guessed.
   * Counted rather than asked of an empty list, which answers yes to anything.
   */
  const measured = drawn.filter(node => node.type === 'card' && node.measured?.height !== undefined)
  const laidOut = board !== undefined
    && board.cards.length > 0
    && measured.length === drawnCards(board, byId).length

  /**
   * Which ground each card is standing on.
   * Asked of where it is rather than of what it was filed under,
   * so a reader who drags a card into another section has moved it there.
   */
  const groundOf = useMemo(() => (nodeId: string): string | undefined => {
    const box = boxes.get(nodeId)
    return box === undefined ? undefined : sectionHolding(box, grounds)?.id
  }, [boxes, grounds])

  /** The section a topic is drawn as, so a relation reaching it has an end. */
  const sectionFor = useMemo(
    () => new Map((board?.sections ?? []).flatMap((section): [string, string][] => {
      const topicId = topicOf(section.id)
      return topicId === undefined ? [] : [[topicId, section.id]]
    })),
    [board],
  )

  const routes = useRoutes({ routing: ROUTING, boxes, grounds, edges: graph.edges, trunks: kin.edges })

  const relations = useMemo(() => {
    const onBoard = new Set(drawn.filter(node => node.type === 'card').map(node => node.id))
    /**
     * Where a relation's end attaches.
     * A card when the node is on the board as one,
     * and the ground itself when the node is the topic that ground stands for,
     * since a section is a topic,
     * and a relation reaching a topic reaches the section.
     */
    const endpointOf = (nodeId: string): string | undefined =>
      onBoard.has(nodeId) ? nodeId : sectionFor.get(nodeId)

    return drawnRelations(
      graph.edges,
      endpointOf,
      groundOf,
      edgeId => worthFollowing(
        kin.edges.get(edgeId) ?? routes.get(edgeId),
        alreadyDrawn.current.has(edgeId),
      ),
      selected,
    )
  }, [graph, drawn, selected, routes, kin, groundOf, sectionFor])

  // Only lines whose way across the board is actually known.
  // A line with no route yet is drawn on the assumption that it will be fine,
  // and remembering that assumption let the slack protect a line,
  // the moment its real route turned out to be one a reader could not follow.
  useEffect(() => {
    alreadyDrawn.current = new Set(relations.lines
      .filter(line => kin.edges.has(line.id) || routes.has(line.id))
      .map(line => line.id))
  }, [relations, kin, routes])

  /**
   * The cards as the canvas is given them.
   * A card moves only once it has been picked.
   * Movable the moment it is under the pointer,
   * every card is a hole in the board,
   * for a reader trying to move the whole thing,
   * and a board is moved far more often than a card is.
   * Picking first also makes moving a card something a reader means to do.
   */
  const attended: Node[] = useMemo(() => drawn.flatMap((node): Node[] => {
    if (node.type !== 'card') {
      const held = node.id === grabbed
      // Given the ground grown to hold what stands on it,
      // which is worked out from what the browser measured,
      // and so is not known when a section is first built.
      const section = grounds.find(one => one.id === node.id) ?? node.data.section
      return [{ ...node, draggable: held, data: { ...node.data, grabbed: held, section } }]
    }
    const emphasis = emphasisOf(node.id, near.nodes, attention)
    if (emphasis === 'gone')
      return []
    // Gathered here rather than where the card is built,
    // since what the board could not draw is only known,
    // once the lines have been worked out.
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
        // Here rather than where the card is built.
        // What a card offers reads back what a reader is attending to,
        // and that is settled here and nowhere earlier.
        acts: actsOn(node.id),
      },
    }
    return [emphasis === 'dimmed'
      ? { ...picked, style: { ...picked.style, opacity: DIMMED } }
      : picked]
  }), [drawn, near, attention, grabbed, relations, byId, hangsOff, familyLed, grounds, actsOn])

  const edges: Edge[] = useMemo(() => boardEdges(relations.lines, {
    boxes,
    grounds,
    trunks: kin.edges,
    routes,
    familyLed,
    nearby: near.edges,
    attention,
  }), [relations, boxes, grounds, kin, routes, familyLed, near, attention])

  const drag = useBoardDrag({ boxes, drawn, latestBoard, zoom, applyChanges, persist })

  // Opening a concept is what shows what is asserted about it,
  // and where that came from, since a board draws neither.
  const opened = pickedId === undefined ? undefined : byId.get(pickedId)

  if (error !== undefined)
    return <AppShell {...nav}><p className="p-10 font-ui text-sm text-claim">{error}</p></AppShell>
  if (board === undefined)
    return <AppShell {...nav}><p className="p-10 font-ui text-sm text-ink-subtle">Opening your board</p></AppShell>

  return (
    <AppShell
      {...nav}
      beneath={<BoardList boards={boards} openId={openId} onOpen={setOpenId} onAdd={addBoard} />}
      // Putting things on and reading one of them are different things,
      // so the panel is whichever the reader last asked for.
      panel={putting
        ? <CardPicker nodes={graph.nodes} board={board} />
        : opened === undefined ? undefined : <NodePanel node={opened} held={inside(opened, graph)} />}
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
            Beside the name of the board it writes out, since the board is what
            every form takes and this is where a reader has finished arranging.
          */}
          <div className="ml-auto flex items-center gap-1">
            <WriteOut client={views} boardId={board.id} onWritten={() => nav.onSelect('views')} />
          </div>
        </header>

        {/*
          The instruments sit beside the canvas rather than inside it,
          under a provider that both share,
          since a child of the canvas is given the store too late to drive it.
        */}
        <ReactFlowProvider>
          <CardDrop board={board} persist={persist} className="relative min-h-0 flex-1">
            <BoardMarkers weight={STROKE} />
            <ReactFlow
              nodes={attended}
              edges={edges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              onNodesChange={drag.onNodesChange}
              onNodeClick={(_, node) => {
                setGrabbed(node.type === 'section' ? node.id : undefined)
                // Picking a card is asking what it is,
                // and the answer takes the place the panel is putting things on in,
                // so asking is what closes it.
                if (node.type !== 'section')
                  setPutting(false)
              }}
              onPaneClick={() => setGrabbed(undefined)}
              onNodeDragStart={drag.onNodeDragStart}
              onNodeDragStop={drag.onNodeDragStop}
              nodesConnectable={false}
              minZoom={0.1}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
            >
              <CanvasGrid />
              <Guides guides={drag.guides} />
            </ReactFlow>
            <BoardTools
              extent={extent}
              laidOut={laidOut}
              onAddSection={() => persist(withSection(board))}
              onRearrange={rearrange}
              onPutting={() => setPutting(!putting)}
              putting={putting}
              zoom={zoom}
            />
          </CardDrop>
        </ReactFlowProvider>
      </div>
    </AppShell>
  )
}
