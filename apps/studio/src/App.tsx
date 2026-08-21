import { useState } from 'react'
import type { GraphClient, InboxClient } from './lib/client.js'
import { Board } from './pages/Board.js'
import { Inbox } from './pages/Inbox.js'
import type { SurfaceLink } from './ui/AppShell.js'

const SURFACES: readonly SurfaceLink[] = [
  { id: 'inbox', label: 'Reading inbox' },
  { id: 'board', label: 'Board' },
]

/**
 * Which surface a reader is on.
 * Each surface draws its own frame, since only it knows what belongs beside it,
 * and what to count next to its own name.
 */
export function App({ inbox, graph }: { inbox: InboxClient, graph: GraphClient }): React.JSX.Element {
  const [activeId, setActiveId] = useState(SURFACES[0]!.id)
  const nav = { surfaces: SURFACES, activeId, onSelect: setActiveId }
  return activeId === 'board'
    ? <Board client={graph} nav={nav} />
    : <Inbox client={inbox} nav={nav} />
}
