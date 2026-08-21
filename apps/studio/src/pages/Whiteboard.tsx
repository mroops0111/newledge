import type { Board } from '@newledge/board'
import type { Node, NodeChange, NodeTypes } from '@xyflow/react'
import { Background, Controls, ReactFlow } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BoardClient } from '../lib/boards.js'
import { firstArrangement } from '../lib/arrange.js'
import { moved, renameSection, withBoard, withCard, withSection } from '../lib/boards.js'
import type { GraphClient } from '../lib/client.js'
import type { GraphNode, Ontology } from '../lib/graph.js'
import type { Nav } from '../ui/AppShell.js'
import { AppShell } from '../ui/AppShell.js'
import { Button } from '../ui/Button.js'
import type { NodeCardData } from '../ui/NodeCard.js'
import { NodeCard } from '../ui/NodeCard.js'
import { NodePicker } from '../ui/NodePicker.js'
import type { SectionBoxData } from '../ui/SectionBox.js'
import { SectionBox } from '../ui/SectionBox.js'
import '@xyflow/react/dist/style.css'

const UNTYPED = 'var(--ink-subtle)'
const NODE_TYPES: NodeTypes = { card: NodeCard, section: SectionBox }
const MIN_NAME_WIDTH = 10

export function Whiteboard({ graphClient, boardClient, nav }: {
  graphClient: GraphClient
  boardClient: BoardClient
  nav: Nav
}): React.JSX.Element {
  const [ontology, setOntology] = useState<Ontology | undefined>(undefined)
  const [nodes, setNodes] = useState<readonly GraphNode[]>([])
  const [board, setBoard] = useState<Board | undefined>(undefined)
  const [others, setOthers] = useState<readonly Board[]>([])
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    void (async () => {
      try {
        const [declared, graph, state] = await Promise.all([
          graphClient.ontology(),
          graphClient.graph(),
          boardClient.read(),
        ])
        setOntology(declared)
        setNodes(graph.nodes)
        // A workspace nobody has arranged opens on a first arrangement rather
        // than on an empty canvas, and it is written down at once so a reader
        // is editing their board from then on and never gets laid out again.
        const [kept] = state.boards
        setOthers(state.boards.slice(1))
        if (kept !== undefined) {
          setBoard(kept)
          return
        }
        const opening = firstArrangement(graph)
        setBoard(opening)
        await boardClient.keep({ boards: [opening] })
      }
      catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    })()
  }, [graphClient, boardClient])

  // A drag passes through here many times per second, so what a reader is still
  // moving is only shown, and only where they let go of it is written down.
  const show = useCallback((next: Board) => setBoard(next), [])
  const keep = useCallback((next: Board) => {
    setBoard(next)
    void boardClient
      .keep(withBoard({ boards: [...others] }, next))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
  }, [boardClient, others])

  const colourOf = useMemo(() => {
    const byType = new Map((ontology?.nodeTypes ?? []).map(type => [type.id, type.color ?? UNTYPED]))
    return (type: string): string => byType.get(type) ?? UNTYPED
  }, [ontology])

  const byId = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes])
  const available = useMemo(() => {
    const chosen = new Set((board?.cards ?? []).map(card => card.nodeId))
    return nodes.filter(node => !chosen.has(node.id))
  }, [nodes, board])

  // A section is ground, so it is drawn under the cards and never selects,
  // which keeps a click on the canvas about the cards a reader put there.
  const flowNodes: Node[] = useMemo(() => {
    if (board === undefined)
      return []
    const sections: Node<SectionBoxData>[] = board.sections.map(section => ({
      id: section.id,
      type: 'section',
      position: { x: section.x, y: section.y },
      data: {
        section,
        onRename: name => show(renameSection(board, section.id, name)),
        onRenamed: () => keep(board),
      },
      selectable: false,
      zIndex: 0,
    }))
    const cards: Node<NodeCardData>[] = board.cards.flatMap((card) => {
      const node = byId.get(card.nodeId)
      return node === undefined
        ? []
        : [{
            id: card.nodeId,
            type: 'card',
            position: { x: card.x, y: card.y },
            data: { node, colour: colourOf(node.type), selected: false },
            // A board says nothing about how two nodes relate, that is the
            // graph's job, so a card here offers nothing to connect to.
            connectable: false,
            zIndex: 1,
          }]
    })
    return [...sections, ...cards]
  }, [board, byId, colourOf, show, keep])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    if (board === undefined)
      return
    let next = board
    let settled = false
    for (const change of changes) {
      if (change.type !== 'position' || change.position === undefined)
        continue
      next = moved(next, change.id, change.position)
      settled ||= change.dragging === false
    }
    if (next === board)
      return
    if (settled)
      keep(next)
    else
      show(next)
  }, [board, show, keep])

  if (error !== undefined)
    return <AppShell {...nav}><p className="p-10 font-ui text-sm text-claim">{error}</p></AppShell>
  if (board === undefined)
    return <AppShell {...nav}><p className="p-10 font-ui text-sm text-ink-subtle">Opening your board</p></AppShell>

  const picker = <NodePicker available={available} onAdd={nodeId => keep(withCard(board, nodeId))} />

  return (
    <AppShell {...nav} panel={picker}>
      <div className="flex h-screen flex-col">
        <header className="flex items-center gap-3 border-b border-line px-6 py-3">
          <input
            value={board.name}
            onChange={event => show({ ...board, name: event.target.value })}
            onBlur={() => keep(board)}
            aria-label="Board name"
            // A board is named for a thought, which is longer than a word,
            // so the field is as wide as what a reader wrote in it.
            style={{ width: `${Math.max(board.name.length, MIN_NAME_WIDTH)}ch` }}
            className="rounded-control bg-transparent px-2 py-1 font-ui text-sm font-semibold text-ink outline-none focus:bg-raised"
          />
          <Button onClick={() => keep(withSection(board))}>Add a section</Button>
        </header>

        <div className="min-h-0 flex-1">
          <ReactFlow
            nodes={flowNodes}
            edges={[]}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            fitView
            fitViewOptions={{ padding: 0.2, minZoom: 0.4, maxZoom: 1 }}
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
