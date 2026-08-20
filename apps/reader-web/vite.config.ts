import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_TARGET = process.env.NEWLEDGE_API ?? 'http://localhost:4321'

// The reader talks to the local runtime through a same-origin path,
// so the browser never makes a cross-origin request during development.
// The desktop shell serves both from one origin, where no proxy is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    proxy: { '/api': { target: API_TARGET, changeOrigin: true, rewrite: path => path.replace(/^\/api/, '') } },
  },
})
