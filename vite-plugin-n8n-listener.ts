import type { Plugin } from 'vite'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

export interface N8NCallbackData {
  elements?: ExcalidrawElement[]
  elementsToDelete?: string[]
  message?: string
  success?: boolean
}

/**
 * Vite plugin to handle N8N callback API
 * Listens for GET/POST requests from N8N with Excalidraw objects
 */
export function n8nListenerPlugin(): Plugin {
  // Store pending updates
  const pendingUpdates = new Map<string, N8NCallbackData>()
  const sseClients = new Set<NodeJS.ReadableStream>()

  return {
    name: 'n8n-listener',
    configureServer(server) {
      // Handle GET/POST requests from N8N
      server.middlewares.use('/api/n8n/callback', (req, res) => {
        console.log(`[N8N Callback] ${req.method} ${req.url}`)
        console.log(`[N8N Callback] Headers:`, req.headers)

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        res.setHeader('Access-Control-Max-Age', '86400')

        if (req.method === 'OPTIONS') {
          res.writeHead(200)
          res.end()
          return
        }

        let data = ''
        req.on('data', (chunk) => {
          data += chunk
        })

        req.on('end', () => {
          try {
            let callbackData: N8NCallbackData

            // Parse data from query string (GET) or body (POST)
            if (req.method === 'GET') {
              const url = new URL(req.url || '', `http://${req.headers.host}`)
              const dataParam = url.searchParams.get('data')

              if (dataParam) {
                callbackData = JSON.parse(decodeURIComponent(dataParam))
              } else {
                // Parse individual query parameters
                callbackData = {
                  success: url.searchParams.get('success') === 'true',
                  message: url.searchParams.get('message') || undefined,
                  elements: url.searchParams.get('elements')
                    ? JSON.parse(url.searchParams.get('elements')!)
                    : undefined,
                  elementsToDelete: url.searchParams.get('elementsToDelete')
                    ? JSON.parse(url.searchParams.get('elementsToDelete')!)
                    : undefined,
                }
              }
            } else {
              // POST request
              callbackData = JSON.parse(data)
            }

            console.log('[N8N Callback] Received data:', callbackData)

            // Handle Excalidraw clipboard format
            // N8N might send { type: 'excalidraw/clipboard', elements: [...] }
            // We need to extract the elements from this format
            let processedData: N8NCallbackData = callbackData
            if ('type' in callbackData && callbackData.type === 'excalidraw/clipboard' && 'elements' in callbackData) {
              // Extract elements from clipboard format
              processedData = {
                success: true,
                elements: (callbackData as any).elements,
                elementsToDelete: (callbackData as any).elementsToDelete,
                message: (callbackData as any).message || 'Elements received from N8N',
              }
              console.log('[N8N Callback] Converted clipboard format to standard format')
            }

            // Generate unique ID for this update
            const updateId = `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            pendingUpdates.set(updateId, processedData)

            // Respond to N8N
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              success: true,
              updateId,
              message: 'Update received and will be applied to canvas',
            }))

            // Notify all SSE clients
            notifyClients({ type: 'update', updateId, data: callbackData })

          } catch (error) {
            console.error('[N8N Callback] Error parsing request:', error)
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Invalid request',
            }))
          }
        })
      })

      // SSE endpoint for frontend to receive updates
      server.middlewares.use('/api/n8n/events', (req, res) => {
        console.log('[N8N SSE] New client connected')

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('Access-Control-Allow-Origin', '*')

        // Send initial connection message
        res.write('data: {"type":"connected"}\n\n')

        // Handle client disconnect
        req.on('close', () => {
          console.log('[N8N SSE] Client disconnected')
        })
      })

      // Endpoint to get pending updates (polling alternative)
      server.middlewares.use('/api/n8n/updates', (req, res) => {
        if (req.method === 'GET') {
          const url = new URL(req.url || '', `http://${req.headers.host}`)
          const lastId = url.searchParams.get('lastId')

          // Get updates since last check
          const updates: Array<{ id: string; data: N8NCallbackData }> = []

          if (lastId) {
            // Get all updates after the specified ID
            let found = false
            for (const [id, data] of pendingUpdates.entries()) {
              if (found) {
                updates.push({ id, data })
              } else if (id === lastId) {
                found = true
              }
            }
          } else {
            // Get all pending updates
            for (const [id, data] of pendingUpdates.entries()) {
              updates.push({ id, data })
            }
          }

          // Clear old updates (older than 5 minutes)
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
          for (const [id] of pendingUpdates.entries()) {
            if (id.startsWith('update-') && parseInt(id.split('-')[1]) < fiveMinutesAgo) {
              pendingUpdates.delete(id)
            }
          }

          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(JSON.stringify({ updates }))
        }
      })

      // Helper to notify SSE clients
      function notifyClients(message: object) {
        // Note: In a real implementation, we'd track SSE clients and send to them
        // For now, this is a placeholder for the SSE notification logic
      }
    },
  }
}
