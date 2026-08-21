import { useState } from 'react'
import type { BoardClient } from './lib/boards.js'
import type { GraphClient, InboxClient } from './lib/client.js'
import { Graph } from './pages/Graph.js'
import { Inbox } from './pages/Inbox.js'
import { Whiteboard } from './pages/Whiteboard.js'
import type { SurfaceLink } from './ui/AppShell.js'

const SURFACES: readonly SurfaceLink[] = [
  { id: 'inbox', label: 'Reading inbox' },
  { id: 'board', label: 'Board' },
  { id: 'graph', label: 'Graph' },
]

/**
 * Which surface a reader is on.
 * Each surface draws its own frame, since only it knows what belongs beside it,
 * and what to count next to its own name.
 */
export function App({ inbox, graph, boards }: {
  inbox: InboxClient
  graph: GraphClient
  boards: BoardClient
}): React.JSX.Element {
  const [activeId, setActiveId] = useState(SURFACES[0]!.id)
  const nav = { surfaces: SURFACES, activeId, onSelect: setActiveId }
  if (activeId === 'graph')
    return <Graph client={graph} nav={nav} />
  if (activeId === 'board')
    return <Whiteboard graphClient={graph} boardClient={boards} nav={nav} />
  return <Inbox client={inbox} nav={nav} />
}
