/**
 * N8N Webhook Service
 * Handles sending selected canvas elements to N8N webhook and receiving updates
 */

import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { processN8NResponse, validateN8NResponse, EnhancedN8NWebhookResponse, N8NElementDescription } from './n8nElementCreator'

export interface N8NWebhookPayload {
  // Selected elements to send to N8N
  elements: ExcalidrawElement[]
  // App state context
  context: {
    timestamp: number
    selectionCount: number
    totalElements: number
  }
  // Optional: Action to perform in N8N
  action?: string
}

export interface N8NWebhookResponse {
  success: boolean
  message?: string
  // Elements to create/update on canvas (can be full elements or descriptions)
  elements?: (ExcalidrawElement | N8NElementDescription)[]
  // Elements to delete by ID
  elementsToDelete?: string[]
  // Error message if request failed
  error?: string
}

export interface N8NTestResult {
  success: boolean
  message: string
  statusCode?: number
}

class N8NService {
  private webhookUrl: string | null = null
  private webhookToken: string | null = null
  private debugEnabled: boolean = false

  constructor() {
    // Load configuration from environment variables
    this.webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || null
    this.webhookToken = import.meta.env.VITE_N8N_WEBHOOK_TOKEN || null
    this.debugEnabled = import.meta.env.VITE_N8N_DEBUG === 'true'

    // Check if using localhost N8N - use proxy to avoid CORS
    if (this.webhookUrl && (this.webhookUrl.includes('localhost:5678') || this.webhookUrl.includes('127.0.0.1:5678'))) {
      // Rewrite URL to use proxy
      const url = new URL(this.webhookUrl)
      const pathAndQuery = url.pathname + url.search
      this.webhookUrl = '/n8n-webhook' + pathAndQuery

      if (this.debugEnabled) {
        console.log('[N8N Service] Using proxy for localhost N8N')
        console.log('[N8N Service] Original URL: http://localhost:5678' + pathAndQuery)
        console.log('[N8N Service] Proxied URL:', this.webhookUrl)
      }
    }

    if (this.debugEnabled) {
      console.log('[N8N Service] Initialized with webhook URL:', this.webhookUrl)
    }
  }

  /**
   * Check if N8N webhook is configured and available
   */
  isConfigured(): boolean {
    return !!this.webhookUrl
  }

  /**
   * Get the configured webhook URL (for display purposes)
   */
  getWebhookUrl(): string | null {
    return this.webhookUrl
  }

  /**
   * Test the webhook connection
   * Returns detailed test result with helpful error messages
   */
  async testConnection(): Promise<N8NTestResult> {
    if (!this.webhookUrl) {
      return {
        success: false,
        message: 'N8N webhook URL is not configured. Please set VITE_N8N_WEBHOOK_URL in your .env file.',
      }
    }

    // Validate URL format
    try {
      new URL(this.webhookUrl)
    } catch {
      return {
        success: false,
        message: `Invalid webhook URL format: "${this.webhookUrl}". Please check your VITE_N8N_WEBHOOK_URL.`,
      }
    }

    // Test with a minimal payload
    const testPayload: N8NWebhookPayload = {
      elements: [],
      context: {
        timestamp: Date.now(),
        selectionCount: 0,
        totalElements: 0,
      },
      action: 'test',
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (this.webhookToken) {
        headers['Authorization'] = `Bearer ${this.webhookToken}`
      }

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
      })

      let responseText = ''
      try {
        responseText = await response.text()
      } catch {
        // Ignore text extraction errors
      }

      if (response.ok) {
        return {
          success: true,
          statusCode: response.status,
          message: `Webhook connection successful! (${response.status} ${response.statusText})`,
        }
      }

      // Provide helpful error messages based on status code
      let errorMessage = `Webhook returned ${response.status}: ${response.statusText}`

      switch (response.status) {
        case 400:
          errorMessage += '. The request format was invalid. Check your N8N workflow configuration.'
          break
        case 401:
          errorMessage += '. Authentication failed. Check your VITE_N8N_WEBHOOK_TOKEN.'
          break
        case 404:
          // Check if it's the specific N8N webhook registration error
          if (responseText.includes('not registered for POST requests')) {
            errorMessage = 'N8N Webhook not registered for POST. In N8N:\n' +
              '  1. Open your workflow in N8N\n' +
              '  2. Click on the Webhook node\n' +
              '  3. Click "Listen for Test Event" button\n' +
              '  4. Then try sending again\n\n' +
              '  OR switch to Production URL:\n' +
              '  1. Click "Production URL" in the webhook node\n' +
              '  2. Copy the production URL\n' +
              '  3. Activate the workflow (toggle ON)\n' +
              '  4. Update your .env with the production URL'
          } else {
            errorMessage += '. The webhook endpoint was not found. Make sure:\n' +
              '  1. The webhook is created in N8N\n' +
              '  2. The workflow is ACTIVE (not just saved)\n' +
              '  3. The webhook path matches exactly\n' +
              '  4. For test webhooks, click "Listen for Test Event" first'
          }
          break
        case 405:
          errorMessage += '. Method not allowed. The webhook must accept POST requests.'
          break
        case 500:
        case 502:
        case 503:
          errorMessage += '. N8N server error. Check if your N8N instance is running.'
          break
        default:
          if (responseText) {
            errorMessage += `\nResponse: ${responseText.substring(0, 200)}`
          }
      }

      return {
        success: false,
        statusCode: response.status,
        message: errorMessage,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'

      // Provide helpful error messages for network errors
      if (errorMsg.includes('fetch')) {
        return {
          success: false,
          message: `Network error connecting to webhook. Check:\n` +
            `  1. The N8N server is accessible\n` +
            `  2. No CORS issues (try accessing the webhook URL in a browser)\n` +
            `  3. Your network connection\n\n` +
            `Error: ${errorMsg}`,
        }
      }

      return {
        success: false,
        message: `Connection failed: ${errorMsg}`,
      }
    }
  }

  /**
   * Send selected elements to N8N webhook
   */
  async sendToWebhook(
    elements: ExcalidrawElement[],
    totalElementCount: number,
    action?: string
  ): Promise<N8NWebhookResponse> {
    if (!this.webhookUrl) {
      throw new Error('N8N webhook URL is not configured. Please set VITE_N8N_WEBHOOK_URL in your .env file.')
    }

    const payload: N8NWebhookPayload = {
      elements,
      context: {
        timestamp: Date.now(),
        selectionCount: elements.length,
        totalElements: totalElementCount,
      },
      action,
    }

    if (this.debugEnabled) {
      console.log('[N8N Service] Sending webhook payload:', payload)
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // Add authentication token if configured
      if (this.webhookToken) {
        headers['Authorization'] = `Bearer ${this.webhookToken}`
      }

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        let errorText = ''
        try {
          errorText = await response.text()
        } catch {
          // Ignore text extraction errors
        }

        let errorMsg = `N8N webhook returned ${response.status}: ${response.statusText}`
        if (errorText) {
          errorMsg += `\n${errorText.substring(0, 200)}`
        }

        // Add helpful hints for common errors
        if (response.status === 404) {
          if (errorText.includes('not registered for POST requests')) {
            errorMsg = 'N8N Webhook not registered for POST. In N8N:\n' +
              '  1. Open your workflow in N8N\n' +
              '  2. Click on the Webhook node\n' +
              '  3. Click "Listen for Test Event" button\n' +
              '  4. Then try sending again\n\n' +
              '  OR switch to Production URL:\n' +
              '  1. Click "Production URL" in the webhook node\n' +
              '  2. Copy the production URL\n' +
              '  3. Activate the workflow (toggle ON)\n' +
              '  4. Update your .env with the production URL'
          } else {
            errorMsg += '\n\nHint: Make sure the N8N workflow is ACTIVE and the webhook path is correct.'
          }
        }

        throw new Error(errorMsg)
      }

      const data: N8NWebhookResponse = await response.json()

      if (this.debugEnabled) {
        console.log('[N8N Service] Received webhook response:', data)
        console.log('[N8N Service] Response details:', {
          success: data.success,
          hasElements: !!data.elements,
          elementsCount: data.elements?.length || 0,
          hasElementsToDelete: !!data.elementsToDelete,
          elementsToDeleteCount: data.elementsToDelete?.length || 0,
          message: data.message,
        })
      }

      // If success field is not set, assume success if we got a 200 OK
      if (data.success === undefined) {
        data.success = true
      }

      return data
    } catch (error) {
      if (this.debugEnabled) {
        console.error('[N8N Service] Webhook request failed:', error)
      }

      throw new Error(
        `Failed to send to N8N webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Apply N8N response to canvas
   * Returns an object with created, updated, and deleted element IDs
   */
  async applyResponse(
    response: N8NWebhookResponse,
    api: { updateElements: (elements: ExcalidrawElement[]) => void; getSceneElements?: () => ExcalidrawElement[] }
  ): Promise<{
    created: string[]
    updated: string[]
    deleted: string[]
  }> {
    const result = {
      created: [] as string[],
      updated: [] as string[],
      deleted: [] as string[],
    }

    // Get current scene elements if available
    const currentElements = api.getSceneElements?.() || []

    if (response.elements && response.elements.length > 0) {
      // Process N8N response - convert descriptions to full elements
      const processed = processN8NResponse(
        response as EnhancedN8NWebhookResponse,
        currentElements as ExcalidrawElement[]
      )

      if (this.debugEnabled) {
        console.log('[N8N Service] Processed elements from N8N:', {
          received: response.elements?.length,
          created: processed.created.length,
          updated: processed.updated.length,
        })
      }

      // Merge N8N elements with existing elements
      const mergedElements: ExcalidrawElement[] = [...currentElements]

      for (const newElement of processed.elements) {
        const existingIndex = mergedElements.findIndex(el => el.id === newElement.id)

        if (existingIndex >= 0) {
          // Update existing element
          mergedElements[existingIndex] = newElement
          result.updated.push(newElement.id)
        } else {
          // Add new element
          mergedElements.push(newElement)
          result.created.push(newElement.id)
        }
      }

      // Update the scene with merged elements
      api.updateElements(mergedElements)
    }

    if (response.elementsToDelete && response.elementsToDelete.length > 0) {
      // Mark elements as deleted (Excalidraw convention)
      const mergedElements = currentElements.map((el) => {
        if (response.elementsToDelete!.includes(el.id)) {
          return {
            ...el,
            isDeleted: true,
            version: el.version + 1,
            updated: Date.now(),
          }
        }
        // Clean up bound elements references
        if (el.boundElements?.some((b) => response.elementsToDelete!.includes(b.id))) {
          return {
            ...el,
            boundElements: el.boundElements.filter((b) => !response.elementsToDelete!.includes(b.id)),
            version: el.version + 1,
          }
        }
        return el
      })

      // Update scene with deletions applied
      api.updateElements(mergedElements)
      result.deleted = [...response.elementsToDelete]
    }

    if (this.debugEnabled) {
      console.log('[N8N Service] Applied response to canvas:', result)
    }

    return result
  }
}

// Singleton instance
export const n8nService = new N8NService()
