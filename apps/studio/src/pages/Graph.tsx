import type { Node } from '@xyflow/react'
import { Controls, getViewportForBounds, ReactFlow, ReactFlowProvider, useReactFlow, useStore, useStoreApi } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { emphasisOf, IDLE, neighbourhood } from '../lib/attention.js'
import { onSurface, SURVEY_STROKE } from '../lib/boardStyle.js'
import type { GraphClient } from '../lib/client.js'
import type { GraphEdge, GraphNode, GraphView, Ontology } from '../lib/graph.js'
import { openingView, visibleGraph, withType } from '../lib/graph.js'
import { inside } from '../lib/inside.js'
import type { Arrangement } from '../lib/layout.js'
import { arrangementOf, laidOut } from '../lib/layout.js'
import type { Nav } from '../ui/AppShell.js'
import { AppShell } from '../ui/AppShell.js'
import { BoardMarkers } from '../ui/BoardMarkers.js'
import { CanvasGrid } from '../ui/CanvasGrid.js'
import { GraphFilters, switchesFor } from '../ui/GraphFilters.js'
import { graphEdges } from '../ui/graphEdges.js'
import { NodePanel } from '../ui/NodePanel.js'
import { GLYPHS } from '../ui/Toolkit.js'
import type { NodeCardData } from '../ui/NodeCard.js'
import { NodeCard } from '../ui/NodeCard.js'
import { CanvasEdge } from '../ui/CanvasEdge.js'
import '@xyflow/react/dist/style.css'

const NODE_TYPES = { card: NodeCard }
const EDGE_TYPES = { line: CanvasEdge }

// A type the ontology declares without a colour still has to be drawn.
const UNTYPED = 'var(--ink-subtle)'

/**
 * How the graph is framed, on arrival and whenever a reader asks for it.
 *
 * Nothing floors how far out this goes.
 * Fitting is a reader saying show me all of it,
 * and a fit that stops short of all of it has answered a question nobody asked.
 * Whether what it frames can then be read is a separate matter,
 * answered by the wheel, not by refusing to frame.
 */
const PADDING = '8%'

/** How long a reframe takes, which is long enough to be followed by eye. */
const EASE = 250

/**
 * Frame the arrangement on the canvas, again each time there is a new one.
 *
 * Which cards are drawn is what a new frame is asked for by,
 * rather than anything about the canvas itself.
 * A reader who has moved the canvas is somewhere they went on purpose,
 * and a window resized, or a column opened beside it,
 * is not them asking to be shown everything a second time.
 * Focusing and filtering are, since each changes what there is to look at,
 * and an arrangement of six left in the frame ninety needed is not a reading.
 *
 * The arrival is taken at once, and every frame after it is eased.
 * A reader arriving never saw the viewport it would be eased from,
 * so there is nothing there for them to follow.
 */
function FitOnArrangement({ arrangement }: {
  arrangement: Arrangement | undefined
}): null {
  const flow = useReactFlow()
  const canvas = useStoreApi()
  const framed = useRef<string | undefined>(undefined)
  /**
   * How wide the canvas is, watched rather than only read.
   *
   * A frame owed while the canvas had no size is taken once it has one.
   * Watching does not make a resize reframe,
   * since the name of what was framed last is what turns this away,
   * and a window made narrower does not change that name.
   */
  const canvasWidth = useStore(state => state.width)

  useEffect(() => {
    if (arrangement === undefined || canvasWidth === 0)
      return
    if (arrangement.of === framed.current)
      return
    const arriving = framed.current === undefined
    framed.current = arrangement.of
    const { height, minZoom, maxZoom } = canvas.getState()
    void flow.setViewport(
      getViewportForBounds(arrangement.over, canvasWidth, height, minZoom, maxZoom, PADDING),
      arriving ? undefined : { duration: EASE },
    )
  }, [arrangement, canvasWidth, canvas, flow])
  return null
}

export function Graph(props: { client: GraphClient, nav: Nav }): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <GraphSurface {...props} />
    </ReactFlowProvider>
  )
}

function GraphSurface({ client, nav }: { client: GraphClient, nav: Nav }): React.JSX.Element {
  const [ontology, setOntology] = useState<Ontology | undefined>(undefined)
  const [graph, setGraph] = useState<{ nodes: readonly GraphNode[], edges: readonly GraphEdge[] }>({ nodes: [], edges: [] })
  const [view, setView] = useState<GraphView | undefined>(undefined)
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [focused, setFocused] = useState(false)
  const [shows, setShows] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    void (async () => {
      try {
        const [declared, read] = await Promise.all([client.ontology(), client.graph()])
        setOntology(declared)
        setGraph(read)
        setView(openingView(declared))
      }
      catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    })()
  }, [client])

  // Only a declared colour goes through the ramp,
  // since the ramp sets a chroma and the fallback is a grey,
  // which would come back out of it as a colour.
  const colourOf = useMemo(() => {
    const byType = new Map(
      (ontology?.nodeTypes ?? []).flatMap(type =>
        type.color === undefined ? [] : [[type.id, onSurface(type.color)] as const],
      ),
    )
    return (type: string): string => byType.get(type) ?? UNTYPED
  }, [ontology])

  const shown = useMemo(
    () => (view === undefined ? { nodes: [], edges: [] } : visibleGraph(graph, view)),
    [graph, view],
  )

  /**
   * A reader who picked something wants the rest out of the way,
   * gently while they glance and entirely once they ask to focus.
   * Coming back is the same gesture undone, so nothing is lost by trying it.
   */
  const attention = selected === undefined ? IDLE : { selectedId: selected, focused }
  const near = useMemo(
    () => neighbourhood(
      attention.selectedId,
      shown.edges.map(edge => ({ id: edge.id, from: edge.fromNodeId, to: edge.toNodeId })),
    ),
    [attention.selectedId, shown],
  )

  // What the canvas holds, which is the one thing a fresh layout waits on.
  const membership = `${shown.nodes.map(node => node.id).join('|')}#${shown.edges.map(edge => edge.id).join('|')}`

  /**
   * Where every card goes, which focusing works out again rather than keeping.
   *
   * Nothing here is a reader's arrangement.
   * Every position is worked out from the shape of the graph,
   * so a graph of six read as a graph of six costs nothing,
   * and hiding alone would leave six cards spread over the room ninety needed.
   *
   * Worked out again whenever the canvas gains or loses something,
   * and not when a node's own contents change,
   * since a description a reader edited is no reason to move every card.
   */
  const placed = useMemo(
    () => (attention.focused
      ? laidOut(
          shown.nodes.filter(node => near.nodes.has(node.id)),
          shown.edges.filter(edge => near.edges.has(edge.id)),
        )
      : laidOut(shown.nodes, shown.edges)),
    [membership, attention.focused, near],
  )

  // What the frame is taken of, read off the placement rather than the cards,
  // since the placement holds exactly the cards that get drawn.
  const arrangement = useMemo(() => arrangementOf(placed), [placed])

  const flowNodes: Node<NodeCardData>[] = useMemo(() => shown.nodes.flatMap((node): Node<NodeCardData>[] => {
    const emphasis = emphasisOf(node.id, near.nodes, attention)
    if (emphasis === 'gone')
      return []
    return [{
      id: node.id,
      type: 'card',
      position: placed.get(node.id) ?? { x: 0, y: 0 },
      data: {
        node,
        colour: colourOf(node.type),
        selected: node.id === selected,
        dimmed: emphasis === 'dimmed',
      },
    }]
  }), [shown, placed, colourOf, selected, near, attention])

  const flowEdges = useMemo(
    () => graphEdges(shown.edges, shown.nodes, near.edges, attention),
    [shown, near, attention],
  )

  /**
   * Focus frames one node's neighbourhood, so it ends when that node does.
   *
   * Held together here rather than at each control,
   * since a selection cleared anywhere else would bring the whole graph back,
   * with the button still reading as pressed,
   * claiming a view nobody was looking at.
   */
  const select = useCallback((nodeId: string | undefined) => {
    setSelected(nodeId)
    if (nodeId === undefined)
      setFocused(false)
  }, [])

  const only = useCallback((kind: 'nodeTypes' | 'edgeTypes', ids: readonly string[]) => {
    setView(current => current === undefined ? current : { ...current, [kind]: new Set(ids) })
  }, [])

  const toggle = useCallback((kind: 'nodeTypes' | 'edgeTypes', id: string) => {
    setView(current => current === undefined ? current : { ...current, [kind]: withType(current[kind], id) })
  }, [])

  const switches = useMemo(
    () => ontology === undefined ? undefined : switchesFor(ontology, graph, colourOf),
    [ontology, graph, colourOf],
  )

  const inspected = graph.nodes.find(node => node.id === selected)

  if (error !== undefined)
    return <AppShell {...nav}><p className="p-10 font-ui text-sm text-claim">{error}</p></AppShell>
  if (view === undefined || ontology === undefined)
    return <AppShell {...nav}><p className="p-10 font-ui text-sm text-ink-subtle">Reading your graph</p></AppShell>

  return (
    <AppShell
      {...nav}
      panel={inspected === undefined ? undefined : <NodePanel node={inspected} held={inside(inspected, graph)} />}
    >
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-line px-6 py-3">
        <p className="font-ui text-sm font-semibold text-ink">Everything you have absorbed</p>
        {/*
          A mode rather than an act, so it stands in the header,
          and not in the cluster on the canvas,
          where every control fires once and returns.
          Always drawn, and disabled without a selection,
          since one that appears only when there is something to focus,
          moves whatever stands beside it.
        */}
        <button
          type="button"
          onClick={() => setFocused(now => !now)}
          disabled={selected === undefined}
          aria-pressed={focused}
          // What pressing it does, since the word alone says only what it is.
          title={focused ? 'Show the whole graph' : 'Narrow to what is related'}
          className={`ml-auto rounded-control px-2.5 py-1 font-ui text-label transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${focused
            ? 'bg-raised text-ink'
            : 'text-ink-subtle enabled:hover:bg-raised enabled:hover:text-ink'}`}
        >
          Focus
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {shows && (
          <GraphFilters
            kinds={switches?.kinds ?? []}
            relations={switches?.relations ?? []}
            activeKinds={view.nodeTypes}
            activeRelations={view.edgeTypes}
            onToggle={toggle}
            onOnly={only}
          />
        )}
        <div className="relative min-w-0 flex-1">
          {/*
            The switch stands on the canvas rather than in the panel it opens,
            since a panel that is away has nowhere to put the thing that brings
            it back, and it stays in one place rather than moving with the
            panel, so a reader closing it does not have to find it again.
          */}
          <button
            type="button"
            onClick={() => setShows(now => !now)}
            aria-pressed={shows}
            title={shows ? 'Hide what is drawn' : 'Choose what is drawn'}
            className={`absolute left-3 top-3 z-20 rounded-control border border-line bg-surface p-1.5 shadow-card transition-colors ${shows
              ? 'text-ink'
              : 'text-ink-subtle hover:text-ink'}`}
          >
            {GLYPHS.panel}
          </button>
          <BoardMarkers weight={SURVEY_STROKE} />
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            onNodeClick={(_, node) => select(node.id)}
            onPaneClick={() => select(undefined)}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <FitOnArrangement arrangement={arrangement} />
            <CanvasGrid />
            {/*
              Down the same edge the panel and the switch that opens it are on,
              so everything a reader operates the canvas with is on one side,
              and the far corner is left to the graph.
            */}
            <Controls
              position="bottom-left"
              showInteractive={false}
              className="!border-line !bg-surface !shadow-card"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
    </AppShell>
  )
}
