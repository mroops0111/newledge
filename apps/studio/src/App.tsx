import { useState } from 'react'
import type { BoardClient } from './lib/boards.js'
import type { GraphClient, InboxClient } from './lib/client.js'
import type { ViewClient } from './lib/views.js'
import { Graph } from './pages/Graph.js'
import { Inbox } from './pages/Inbox.js'
import { Views } from './pages/Views.js'
import { Whiteboard } from './pages/Whiteboard.js'
import type { SurfaceLink } from './ui/AppShell.js'

/**
 * The surfaces, in the order knowledge moves through them.
 *
 * What arrives is read, what is kept is the graph,
 * what a reader picks out of it is a board,
 * and what is written out of either comes last.
 * Ordering them any other way puts a surface before the one it draws from.
 */
const SURFACES: readonly SurfaceLink[] = [
  { id: 'inbox', label: 'Reading inbox' },
  { id: 'graph', label: 'Graph' },
  { id: 'board', label: 'Board' },
  { id: 'views', label: 'Written out' },
]

/**
 * Which surface a reader is on. Each surface draws its own frame,
 * since only it knows what belongs beside it,
 * and what to count next to its own name.
 */
export function App({ inbox, graph, boards, views }: {
  inbox: InboxClient
  graph: GraphClient
  boards: BoardClient
  views: ViewClient
}): React.JSX.Element {
  const [activeId, setActiveId] = useState(SURFACES[0]!.id)
  const nav = { surfaces: SURFACES, activeId, onSelect: setActiveId }
  if (activeId === 'graph')
    return <Graph client={graph} views={views} nav={nav} />
  if (activeId === 'views')
    return <Views client={views} nav={nav} />
  if (activeId === 'board')
    return <Whiteboard graphClient={graph} boardClient={boards} nav={nav} />
  return <Inbox client={inbox} nav={nav} />
}
