import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createInboxClient } from './lib/client.js'
import { Inbox } from './pages/Inbox.js'
import './index.css'

const client = createInboxClient({
  apiUrl: import.meta.env.VITE_NEWLEDGE_API ?? '/api',
  workspaceId: import.meta.env.VITE_NEWLEDGE_WORKSPACE ?? 'knowledge',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Inbox client={client} />
  </StrictMode>,
)
