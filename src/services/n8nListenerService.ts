/**
 * N8N Listener Service
 * Polls for updates from N8N callback API and applies them to canvas
 */

import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

export interface N8NUpdate {
  id: string
  data: {
    elements?: ExcalidrawElement[]
    elementsToDelete?: string[]
    message?: string
    success?: boolean
  }
}

class N8NListenerService {
  private pollInterval: number | null = null
  private lastUpdateId: string | null = null
  private enabled = false
  private listeners: Set<(update: N8NUpdate) => void> = new Set()

  /**
   * Start listening for N8N updates
   * Only starts if N8N webhook is configured
   */
  async start(): Promise<void> {
    if (this.enabled) {
      console.log('[N8N Listener] Already running')
      return
    }

    // Check if N8N webhook URL is configured
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL
    if (!webhookUrl) {
      console.log('[N8N Listener] N8N webhook URL not configured, skipping listener (dev-only feature)')
      return
    }

    this.enabled = true
    console.log('[N8N Listener] Starting to poll for updates...')

    // Initial check
    await this.checkUpdates()

    // Poll every 2 seconds
    this.pollInterval = window.setInterval(() => {
      this.checkUpdates()
    }, 2000)
  }

  /**
   * Stop listening for N8N updates
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    this.enabled = false
    console.log('[N8N Listener] Stopped')
  }

  /**
   * Check for new updates from N8N
   */
  private async checkUpdates(): Promise<void> {
    try {
      const url = new URL('/api/n8n/updates', window.location.origin)
      if (this.lastUpdateId) {
        url.searchParams.set('lastId', this.lastUpdateId)
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        console.warn('[N8N Listener] Failed to check updates:', response.statusText)
        return
      }

      const result = await response.json()

      if (result.updates && result.updates.length > 0) {
        console.log(`[N8N Listener] Received ${result.updates.length} update(s)`)

        for (const update of result.updates as N8NUpdate[]) {
          // Update last ID
          this.lastUpdateId = update.id

          // Notify listeners
          this.notifyListeners(update)
        }
      }
    } catch (error) {
      console.error('[N8N Listener] Error checking updates:', error)
    }
  }

  /**
   * Subscribe to N8N updates
   */
  onUpdate(callback: (update: N8NUpdate) => void): () => void {
    this.listeners.add(callback)

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Notify all listeners of an update
   */
  private notifyListeners(update: N8NUpdate): void {
    for (const listener of this.listeners) {
      try {
        listener(update)
      } catch (error) {
        console.error('[N8N Listener] Error in listener callback:', error)
      }
    }
  }

  /**
   * Get the callback URL to use in N8N
   */
  getCallbackUrl(): string {
    // Check if callback URL is explicitly configured
    const configuredUrl = import.meta.env.VITE_N8N_CALLBACK_URL
    if (configuredUrl) {
      console.log('[N8N Listener] Using configured callback URL:', configuredUrl)
      return configuredUrl
    }

    // Otherwise, auto-generate from current location
    const autoUrl = `${window.location.origin}/api/n8n/callback`
    console.log('[N8N Listener] Using auto-generated callback URL:', autoUrl)
    return autoUrl
  }
}

// Singleton instance
export const n8nListenerService = new N8NListenerService()
