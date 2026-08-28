import type { Node } from '@xyflow/react'
import { Controls, getViewportForBounds, ReactFlow, ReactFlowProvider, useReactFlow, useStoreApi } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { emphasisOf, IDLE, neighbourhood } from '../lib/attention.js'
import { onSurface, SURVEY_STROKE } from '../lib/boardStyle.js'
import type { GraphClient } from '../lib/client.js'
import type { ViewClient } from '../lib/views.js'
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
import { WriteOut } from '../ui/WriteOut.js'
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

/**
 * Frame the graph once its nodes have somewhere to be.
 *
 * Placement lands after the graph is read,
 * so fitting on mount would frame a canvas still at the origin.
 *
 * Framed on arrival and then left alone.
 * A reader who has moved the canvas is somewhere they went on purpose.
 * Reframing whenever the room changes takes that away,
 * for a reason the reader never gave.
 * Opening the column beside it is the plainest case of that,
 * and asking for the frame back is one button, which is where asking belongs.
 *
 * Taken at once rather than eased.
 * The canvas takes an eased viewport only while nothing else is moving,
 * so easing this one is a frame that silently never arrives.
 */
function FitOnPlacement({ ready }: { ready: boolean }): null {
  const flow = useReactFlow()
  // Read when the frame is taken rather than watched,
  // since watching the canvas is what would reframe on every resize,
  // and a resize is not a reader asking to be shown everything again.
  const canvas = useStoreApi()

  useEffect(() => {
    if (!ready)
      return
    // The nodes reach the canvas a tick before their positions do,
    // so the frame is taken after the browser has drawn them.
    const timer = setTimeout(() => {
      const { width, height, minZoom, maxZoom } = canvas.getState()
      if (width === 0)
        return
      const bounds = flow.getNodesBounds(flow.getNodes())
      flow.setViewport(getViewportForBounds(bounds, width, height, minZoom, maxZoom, PADDING))
    }, 0)
    return () => clearTimeout(timer)
  }, [ready, canvas, flow])
  return null
}

export function Graph(props: { client: GraphClient, views: ViewClient, nav: Nav }): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <GraphSurface {...props} />
    </ReactFlowProvider>
  )
}

function GraphSurface({ client, views, nav }: { client: GraphClient, views: ViewClient, nav: Nav }): React.JSX.Element {
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

  // Laid out again whenever the canvas gains or loses something,
  // and not when a node's own contents change,
  // since a description a reader edited is no reason to move every card.
  const membership = `${shown.nodes.map(node => node.id).join('|')}#${shown.edges.map(edge => edge.id).join('|')}`
  const placed = useMemo(() => laidOut(shown.nodes, shown.edges), [membership])

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

  // Fitting before every node has a position frames a canvas at the origin.
  const placedAll = shown.nodes.length > 0 && shown.nodes.every(node => placed.has(node.id))

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
        <div className="ml-auto flex items-center gap-1">
          {/*
            A generator is offered beside what it would be given, so a reader
            who has picked a topic is shown what can be written out of it.
          */}
          <WriteOut
            client={views}
            about={inspected?.id}
            kind={inspected?.type}
            onWritten={() => nav.onSelect('views')}
          />
        </div>
        {selected !== undefined && (
          <button
            type="button"
            onClick={() => setFocused(now => !now)}
            className={`rounded-control px-2.5 py-1 font-ui text-label transition-colors ${focused
              ? 'bg-ink text-surface'
              : 'text-ink-subtle hover:bg-raised hover:text-ink'}`}
          >
            {focused ? 'Show the rest' : 'Only this'}
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
            <FitOnPlacement ready={placedAll} />
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
