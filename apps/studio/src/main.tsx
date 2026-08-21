import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createGraphClient, createInboxClient } from './lib/client.js'
import { App } from './App.js'
import './index.css'

const connection = {
  apiUrl: import.meta.env.VITE_NEWLEDGE_API ?? '/api',
  workspaceId: import.meta.env.VITE_NEWLEDGE_WORKSPACE ?? 'knowledge',
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App inbox={createInboxClient(connection)} graph={createGraphClient(connection)} />
  </StrictMode>,
)
