import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { n8nListenerPlugin } from './vite-plugin-n8n-listener'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), n8nListenerPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Required for Excalidraw
    'process.env.IS_PREACT': JSON.stringify('false'),
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    proxy: {
      // Proxy N8N webhook requests to avoid CORS issues with localhost
      '/n8n-webhook': {
        target: 'http://localhost:5678',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/n8n-webhook/, ''),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('N8N proxy error:', err.message)
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('N8N proxy request:', req.method, req.url)
          })
        },
      },
    },
  },
})
