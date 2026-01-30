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
  private processedUpdateIds: Set<string> = new Set() // Track processed updates to prevent duplicates
  private emptyPollCount = 0 // Track consecutive empty polls to detect stale lastId

  /**
   * Start listening for N8N updates
   * In dev mode, always start since we have the polling API
   */
  async start(): Promise<void> {
    // Always reset lastUpdateId and processed IDs to get all pending updates
    // This handles server restarts and stale IDs
    const hadPreviousId = this.lastUpdateId !== null
    this.lastUpdateId = null

    if (this.processedUpdateIds.size > 0) {
      console.log('[N8N Listener] Clearing', this.processedUpdateIds.size, 'processed update IDs')
      this.processedUpdateIds.clear()
    }

    if (hadPreviousId) {
      console.log('[N8N Listener] Reset lastUpdateId for fresh start')
    }

    if (this.enabled) {
      console.log('[N8N Listener] Already running (reset complete)')
      return
    }

    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL

    // In dev mode with Vite, the polling endpoint always exists
    // So we can start polling even if webhook URL isn't configured yet
    this.enabled = true

    console.log('[N8N Listener] Starting to poll for updates...', webhookUrl ? '(N8N configured)' : '(waiting for N8N)')

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

        // Reset empty poll count when we receive updates
        this.emptyPollCount = 0

        for (const update of result.updates as N8NUpdate[]) {
          console.log('[N8N Listener] Processing update:', update.id, '| Already processed:', this.processedUpdateIds.has(update.id))

          // Skip if already processed (prevents duplicates from Strict Mode double-mount)
          if (this.processedUpdateIds.has(update.id)) {
            console.log(`[N8N Listener] Skipping already processed update: ${update.id}`)
            continue
          }

          // Mark as processed
          this.processedUpdateIds.add(update.id)

          // Update last ID
          this.lastUpdateId = update.id

          // Notify listeners
          this.notifyListeners(update)
        }
      } else {
        // No updates received
        this.emptyPollCount++

        // If we have a lastId but keep getting empty results, the lastId might be stale
        // Reset after 3 empty polls to allow fetching all updates
        if (this.lastUpdateId && this.emptyPollCount >= 3) {
          console.log('[N8N Listener] Detected stale lastId after', this.emptyPollCount, 'empty polls, resetting')
          this.lastUpdateId = null
          this.emptyPollCount = 0
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
    console.log('[N8N Listener] Notifying listeners, count:', this.listeners.size)
    for (const listener of this.listeners) {
      try {
        console.log('[N8N Listener] Calling listener with update:', update.id)
        listener(update)
        console.log('[N8N Listener] Listener call completed')
      } catch (error) {
        console.error('[N8N Listener] Error in listener callback:', error)
      }
    }
  }

  /**
   * Get the callback URL to use in N8N
   * In production, always use window.location.origin to avoid hardcoded localhost
   */
  getCallbackUrl(): string {
    // Only use configured URL if explicitly set and not localhost
    const configuredUrl = import.meta.env.VITE_N8N_CALLBACK_URL
    if (configuredUrl && !configuredUrl.includes('localhost') && !configuredUrl.includes('127.0.0.1')) {
      console.log('[N8N Listener] Using configured callback URL:', configuredUrl)
      return configuredUrl
    }

    // Otherwise, auto-generate from current location (works in both dev and production)
    const autoUrl = `${window.location.origin}/api/n8n/callback`
    console.log('[N8N Listener] Using auto-generated callback URL:', autoUrl)
    return autoUrl
  }
}

// Singleton instance
export const n8nListenerService = new N8NListenerService()
