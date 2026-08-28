import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBoardClient } from './lib/boards.js'
import { createGraphClient, createInboxClient } from './lib/client.js'
import { createViewClient } from './lib/views.js'
import { App } from './App.js'
import './index.css'

const connection = {
  apiUrl: import.meta.env.VITE_NEWLEDGE_API ?? '/api',
  workspaceId: import.meta.env.VITE_NEWLEDGE_WORKSPACE ?? 'knowledge',
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App
      inbox={createInboxClient(connection)}
      graph={createGraphClient(connection)}
      boards={createBoardClient(connection)}
      views={createViewClient(connection)}
    />
  </StrictMode>,
)
