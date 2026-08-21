import type { Edge, Node } from '@xyflow/react'
import { Background, Controls, ReactFlow } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GraphClient } from '../lib/client.js'
import type { BoardView, GraphEdge, GraphNode, Ontology } from '../lib/graph.js'
import { openingView, visibleGraph, withType } from '../lib/graph.js'
import { placeArrivals } from '../lib/layout.js'
import type { Nav } from '../ui/AppShell.js'
import { AppShell } from '../ui/AppShell.js'
import { Inspector } from '../ui/Inspector.js'
import type { NodeCardData } from '../ui/NodeCard.js'
import { NodeCard } from '../ui/NodeCard.js'
import { TypeToggles } from '../ui/TypeToggles.js'
import '@xyflow/react/dist/style.css'

const NODE_TYPES = { card: NodeCard }

// A disagreement is drawn as one, so it reads as tension rather than structure.
const DISPUTED = 'contradicts'

function toFlowEdges(edges: readonly GraphEdge[]): Edge[] {
  return edges.map((edge) => {
    const disputed = edge.type === DISPUTED
    return {
      id: edge.id,
      source: edge.fromNodeId,
      target: edge.toNodeId,
      label: edge.type,
      animated: false,
      style: disputed ? { stroke: '#dc2626', strokeDasharray: '4 4' } : { stroke: '#d3cec5' },
      labelStyle: { fontSize: 11, fill: disputed ? '#dc2626' : '#8a8378' },
      labelBgStyle: { fill: '#faf9f7' },
    }
  })
}

export function Board({ client, nav }: { client: GraphClient, nav: Nav }): React.JSX.Element {
  const [ontology, setOntology] = useState<Ontology | undefined>(undefined)
  const [graph, setGraph] = useState<{ nodes: readonly GraphNode[], edges: readonly GraphEdge[] }>({ nodes: [], edges: [] })
  const [view, setView] = useState<BoardView | undefined>(undefined)
  const [placed, setPlaced] = useState<ReadonlyMap<string, { x: number, y: number }>>(new Map())
  const [selected, setSelected] = useState<string | undefined>(undefined)
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
    const byType = new Map((ontology?.nodeTypes ?? []).map(type => [type.id, type.color ?? '#8a8378']))
    return (type: string): string => byType.get(type) ?? '#8a8378'
  }, [ontology])

  const shown = useMemo(
    () => (view === undefined ? { nodes: [], edges: [] } : visibleGraph(graph, view)),
    [graph, view],
  )

  useEffect(() => {
    setPlaced(current => placeArrivals(shown.nodes, shown.edges, current))
  }, [shown])

  const flowNodes: Node<NodeCardData>[] = useMemo(() => shown.nodes.map(node => ({
    id: node.id,
    type: 'card',
    position: placed.get(node.id) ?? { x: 0, y: 0 },
    data: { node, colour: colourOf(node.type), selected: node.id === selected },
  })), [shown, placed, colourOf, selected])

  const toggle = useCallback((kind: 'nodeTypes' | 'edgeTypes', id: string) => {
    setView(current => current === undefined ? current : { ...current, [kind]: withType(current[kind], id) })
  }, [])

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
    return <AppShell {...nav}><p className="p-10 font-ui text-sm text-ink-subtle">Opening your board</p></AppShell>

  return (
    <AppShell
      {...nav}
      panel={inspected === undefined ? undefined : <Inspector node={inspected} claims={claimsAbout} />}
    >
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-line px-6 py-3">
        <TypeToggles
          label="Nodes"
          options={ontology.nodeTypes.map(type => ({ id: type.id, colour: type.color ?? undefined }))}
          active={view.nodeTypes}
          onToggle={id => toggle('nodeTypes', id)}
        />
        <TypeToggles
          label="Relations"
          options={ontology.edgeTypes.map(type => ({ id: type.id }))}
          active={view.edgeTypes}
          onToggle={id => toggle('edgeTypes', id)}
        />
      </header>

      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={flowNodes}
          edges={toFlowEdges(shown.edges)}
          nodeTypes={NODE_TYPES}
          onNodeClick={(_, node) => setSelected(node.id)}
          fitView
          // A board that fits everything on screen fits nothing legible,
          // so the opening view stays readable and leaves the rest to pan.
          fitViewOptions={{ padding: 0.2, minZoom: 0.55, maxZoom: 1 }}
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#d3cec5" gap={24} size={1} />
          <Controls showInteractive={false} className="!border-line !bg-surface !shadow-card" />
        </ReactFlow>
      </div>
    </div>
    </AppShell>
  )
}
