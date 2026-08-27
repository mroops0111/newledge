import type { Node } from '@xyflow/react'
import { Background, Controls, getViewportForBounds, ReactFlow, ReactFlowProvider, useReactFlow, useStore } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { emphasisOf, IDLE, neighbourhood } from '../lib/attention.js'
import { nodeStyle, SURVEY_STROKE } from '../lib/boardStyle.js'
import type { GraphClient } from '../lib/client.js'
import type { GraphEdge, GraphNode, GraphView, Ontology } from '../lib/graph.js'
import { openingView, visibleGraph, withType } from '../lib/graph.js'
import { laidOut } from '../lib/layout.js'
import type { Nav } from '../ui/AppShell.js'
import { AppShell } from '../ui/AppShell.js'
import { BoardMarkers } from '../ui/BoardMarkers.js'
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
 * Frame the graph once its nodes have somewhere to be,
 * and again whenever the room it has to stand in changes.
 *
 * Placement lands after the graph is read,
 * so fitting on mount would frame a canvas still at the origin.
 * Opening or closing the column over it changes how much room the graph has,
 * and a frame taken for the old width leaves the graph off to one side.
 *
 * Every frame is taken at once rather than eased.
 * The canvas takes an eased viewport only while nothing else is moving,
 * and a reframe is asked for by the very thing that is,
 * so easing it is a frame that silently never arrives.
 */
function FitOnPlacement({ ready, covers }: {
  ready: boolean
  /** The panel standing over the canvas, or nothing while it is away. */
  covers: HTMLElement | null
}): null {
  const flow = useReactFlow()
  const canvas = useStore(
    state => ({ width: state.width, height: state.height, min: state.minZoom, max: state.maxZoom }),
    (one, other) => one.width === other.width && one.height === other.height,
  )
  const hidden = covers === null ? 0 : covers.offsetWidth

  useEffect(() => {
    if (!ready || canvas.width === 0)
      return
    // The nodes reach the canvas a tick before their positions do,
    // so the frame is taken after the browser has drawn them.
    const timer = setTimeout(() => {
      // Framed into the room the panel leaves rather than into the whole
      // canvas, and then slid across by what it stands over. Asking for a
      // padding on one side alone is answered differently depending on what
      // else the padding says, and this is the same sum written plainly.
      const bounds = flow.getNodesBounds(flow.getNodes())
      const room = Math.max(1, canvas.width - hidden)
      const framing = getViewportForBounds(bounds, room, canvas.height, canvas.min, canvas.max, PADDING)
      flow.setViewport({ ...framing, x: framing.x + hidden })
    }, 0)
    return () => clearTimeout(timer)
  }, [ready, hidden, canvas, flow])
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
  // Held as state rather than in a ref, since the fit has to be worked out
  // again once the panel is there, and setting a ref tells nobody. Measured
  // rather than assumed, so the width is not written down twice.
  const [panel, setPanel] = useState<HTMLElement | null>(null)
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

  const colourOf = useMemo(() => {
    const byType = new Map((ontology?.nodeTypes ?? []).map(type => [type.id, type.color ?? UNTYPED]))
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
    ...(type.color === undefined ? {} : { colour: type.color }),
    count: graph.nodes.filter(node => node.type === type.id).length,
  })), [kindsInOrder, graph])

  const relationCounts = useMemo(() => (ontology?.edgeTypes ?? []).map(type => ({
    id: type.id,
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

      <div className="relative min-h-0 flex-1">
        {shows && (
          <GraphFilters
            ref={setPanel}
            kinds={kindCounts}
            relations={relationCounts}
            activeKinds={view.nodeTypes}
            activeRelations={view.edgeTypes}
            onToggle={toggle}
            onOnly={only}
          />
        )}
        <div className="relative h-full">
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
            <FitOnPlacement ready={placedAll} covers={shows ? panel : null} />
            <Background color="var(--line-strong)" gap={24} size={1} />
            {/* Out from under the panel, which stands down the left of the canvas. */}
            <Controls
              position="bottom-right"
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
