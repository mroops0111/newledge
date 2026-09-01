import type { Node } from '@xyflow/react'
import { Controls, getViewportForBounds, ReactFlow, ReactFlowProvider, useReactFlow, useStoreApi } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { emphasisOf, IDLE, neighbourhood } from '../lib/attention.js'
import { onSurface, SURVEY_STROKE } from '../lib/boardStyle.js'
import type { GraphClient } from '../lib/client.js'
import type { GraphEdge, GraphNode, GraphView, Ontology } from '../lib/graph.js'
import { openingView, visibleGraph, withType } from '../lib/graph.js'
import { inside } from '../lib/inside.js'
import { laidOut } from '../lib/layout.js'
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
 * Frame whatever is drawn, again each time what is drawn changes.
 *
 * Placement lands after the graph is read,
 * so fitting on mount would frame a canvas still at the origin.
 *
 * Keyed on which cards are drawn rather than on the canvas.
 * A reader who has moved the canvas is somewhere they went on purpose,
 * and a window resized, or a column opened beside it, is not them asking
 * to be shown everything again. Focusing and filtering are,
 * since each changes what there is to look at,
 * and an arrangement of six left in the frame ninety needed is not a reading.
 *
 * The arrival is taken at once and every frame after it is eased.
 * The canvas takes an eased viewport only while nothing else is moving,
 * which on arrival everything is, so easing that one never arrives.
 */
function FitOnWhatIsDrawn({ drawing }: {
  /** Which cards are drawn, or nothing while any of them lacks a position. */
  drawing: string | undefined
}): null {
  const flow = useReactFlow()
  // Read when the frame is taken rather than watched,
  // since watching the canvas is what would reframe on every resize,
  // and a resize is not a reader asking to be shown everything again.
  const canvas = useStoreApi()
  const framed = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (drawing === undefined || drawing === framed.current)
      return
    // The nodes reach the canvas a tick before their positions do,
    // so the frame is taken after the browser has drawn them.
    const timer = setTimeout(() => {
      const { width, height, minZoom, maxZoom } = canvas.getState()
      // Nothing has been measured yet, so the frame is left for the next change,
      // rather than taken against a canvas of no size.
      if (width === 0)
        return
      const arriving = framed.current === undefined
      framed.current = drawing
      const bounds = flow.getNodesBounds(flow.getNodes())
      flow.setViewport(
        getViewportForBounds(bounds, width, height, minZoom, maxZoom, PADDING),
        arriving ? undefined : { duration: EASE },
      )
    }, 0)
    return () => clearTimeout(timer)
  }, [drawing, canvas, flow])
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

  // Laid out again whenever the canvas gains or loses something,
  // and not when a node's own contents change,
  // since a description a reader edited is no reason to move every card.
  const membership = `${shown.nodes.map(node => node.id).join('|')}#${shown.edges.map(edge => edge.id).join('|')}`

  /**
   * Focusing lays out what is left rather than leaving it where it was.
   *
   * Nothing here is a reader's arrangement. Every position is worked out
   * from the shape of the graph, so a graph of six read as a graph of six
   * costs nothing and is the only thing worth showing.
   * Hiding alone would leave six cards spread over the room ninety needed.
   */
  const placed = useMemo(
    () => (attention.focused
      ? laidOut(
          shown.nodes.filter(node => near.nodes.has(node.id)),
          shown.edges.filter(edge => near.edges.has(edge.id)),
        )
      : laidOut(shown.nodes, shown.edges)),
    // Keyed on membership rather than on the graph itself,
    // for the reason the line above it gives.
    [membership, attention.focused, near],
  )

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

  // What the frame is taken of, and what a change of frame is asked for by.
  // Held back until every card has a position,
  // since fitting before then frames a canvas still at the origin.
  const drawing = useMemo(
    () => (flowNodes.length > 0 && flowNodes.every(node => placed.has(node.id))
      ? flowNodes.map(node => node.id).join('|')
      : undefined),
    [flowNodes, placed],
  )

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
          Offered only once a reader has picked something, since there is
          nothing to narrow to before that, and a control that does nothing
          is a question a reader has to answer before they can ignore it.
        */}
        {selected !== undefined && (
          <button
            type="button"
            onClick={() => setFocused(now => !now)}
            className={`ml-auto rounded-control px-2.5 py-1 font-ui text-label transition-colors ${focused
              ? 'bg-ink text-surface'
              : 'text-ink-subtle hover:bg-raised hover:text-ink'}`}
          >
            {focused ? 'Show all' : 'Focus'}
          </button>
        )}
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
            onNodeClick={(_, node) => setSelected(node.id)}
            onPaneClick={() => { setSelected(undefined); setFocused(false) }}
            fitView
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <FitOnWhatIsDrawn drawing={drawing} />
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
