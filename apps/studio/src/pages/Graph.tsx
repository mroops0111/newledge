import type { Node } from '@xyflow/react'
import { Controls, getViewportForBounds, ReactFlow, ReactFlowProvider, useReactFlow, useStoreApi } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { emphasisOf, IDLE, neighbourhood } from '../lib/attention.js'
import { edgeStyle, nodeStyle, onSurface, SURVEY_STROKE } from '../lib/boardStyle.js'
import type { GraphClient } from '../lib/client.js'
import type { GraphEdge, GraphNode, GraphView, Ontology } from '../lib/graph.js'
import { openingView, visibleGraph, withType } from '../lib/graph.js'
import { laidOut } from '../lib/layout.js'
import type { Nav } from '../ui/AppShell.js'
import { AppShell } from '../ui/AppShell.js'
import { BoardMarkers } from '../ui/BoardMarkers.js'
import { CanvasGrid } from '../ui/CanvasGrid.js'
import { GraphFilters } from '../ui/GraphFilters.js'
import { graphEdges } from '../ui/graphEdges.js'
import { Inspector } from '../ui/Inspector.js'
import { GLYPHS } from '../ui/Toolkit.js'
import type { NodeCardData } from '../ui/NodeCard.js'
import { NodeCard } from '../ui/NodeCard.js'
import { SurveyEdge } from '../ui/SurveyEdge.js'
import '@xyflow/react/dist/style.css'

const NODE_TYPES = { card: NodeCard }
const EDGE_TYPES = { survey: SurveyEdge }

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
 * A reader who has moved the canvas is somewhere they went on purpose,
 * and a surface that reframes itself whenever its room changes
 * takes that away for a reason the reader never gave.
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

  // Only a declared colour goes through the ramp, since the ramp sets a chroma
  // and the fallback is a grey, which would come back out of it as a colour.
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

  /**
   * The kinds in the order they stand on each other. Ground first,
   * since it is what the rest sits on,
   * and then the bands a section is read down: terms,
   * then what is asserted about them, then where that came from.
   * Read off the same facts a board arranges by,
   * so the two surfaces never disagree about which kind comes first.
   */
  const kindsInOrder = useMemo(() => [...(ontology?.nodeTypes ?? [])].sort((one, other) => {
    const [a, b] = [nodeStyle(one.id), nodeStyle(other.id)]
    return Number(b.ground) - Number(a.ground) || a.band - b.band
  }), [ontology])

  const only = useCallback((kind: 'nodeTypes' | 'edgeTypes', ids: readonly string[]) => {
    setView(current => current === undefined ? current : { ...current, [kind]: new Set(ids) })
  }, [])

  const toggle = useCallback((kind: 'nodeTypes' | 'edgeTypes', id: string) => {
    setView(current => current === undefined ? current : { ...current, [kind]: withType(current[kind], id) })
  }, [])

  /**
   * How much of each kind and each relation the graph holds.
   * Counted over the whole graph rather than over what is drawn,
   * so a switch says what turning it on would bring, not what it has already.
   */
  const kindCounts = useMemo(() => kindsInOrder.map(type => ({
    id: type.id,
    legend: { as: 'colour' as const, colour: colourOf(type.id) },
    count: graph.nodes.filter(node => node.type === type.id).length,
  })), [kindsInOrder, colourOf, graph])

  const relationCounts = useMemo(() => (ontology?.edgeTypes ?? []).map(type => ({
    id: type.id,
    legend: { as: 'line' as const, line: edgeStyle(type.id) },
    count: graph.edges.filter(edge => edge.type === type.id).length,
  })), [ontology, graph])

  const inspected = graph.nodes.find(node => node.id === selected)
  const claimsAbout = inspected === undefined
    ? []
    : graph.edges
        .filter(edge => edge.type === 'concerns' && edge.toNodeId === inspected.id)
        .map(edge => graph.nodes.find(node => node.id === edge.fromNodeId))
        .filter((node): node is GraphNode => node !== undefined)

  if (error !== undefined)
    return <AppShell {...nav}><p className="p-10 font-ui text-sm text-claim">{error}</p></AppShell>
  if (view === undefined || ontology === undefined)
    return <AppShell {...nav}><p className="p-10 font-ui text-sm text-ink-subtle">Reading your graph</p></AppShell>

  return (
    <AppShell
      {...nav}
      panel={inspected === undefined ? undefined : <Inspector node={inspected} claims={claimsAbout} />}
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
            {focused ? 'Show the rest' : 'Only this'}
          </button>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        {shows && (
          <GraphFilters
            kinds={kindCounts}
            relations={relationCounts}
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
