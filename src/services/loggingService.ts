import type { ExcalidrawElement, AIResponseStats } from '@/types'

/**
 * Log entry types
 */
export type LogEventType =
  | 'canvas_update'
  | 'element_added'
  | 'element_deleted'
  | 'element_modified'
  | 'selection_changed'
  | 'ai_request'
  | 'ai_response'
  | 'ai_action_executed'
  | 'user_action'
  | 'error'

/**
 * Base log entry
 */
export interface LogEntry {
  id: string
  timestamp: Date
  type: LogEventType
  data: unknown
  tags?: string[]
}

/**
 * Canvas update log entry
 */
export interface CanvasUpdateLog extends LogEntry {
  type: 'canvas_update'
  data: {
    elementCount: number
    addedCount: number
    deletedCount: number
    modifiedCount: number
  }
}

/**
 * AI request log entry
 */
export interface AIRequestLog extends LogEntry {
  type: 'ai_request'
  data: {
    action: string
    prompt: string
    context: string
    elementIds: string[]
  }
}

/**
 * AI response log entry
 */
export interface AIResponseLog extends LogEntry {
  type: 'ai_response'
  data: {
    action: string
    response: string
    stats: AIResponseStats
    success: boolean
    error?: string
  }
}

const LOGGING_ENABLED = import.meta.env.VITE_LOGGING_ENABLED === 'true'
const LOG_TO_CONSOLE = import.meta.env.VITE_LOG_TO_CONSOLE === 'true'
const LOG_STORAGE_KEY = 'excalidraw-ai-logs'
const MAX_LOG_ENTRIES = Number(import.meta.env.VITE_MAX_LOG_ENTRIES) || 500

/**
 * Logging Service for canvas updates and AI interactions
 * Used for cognitive process learning and improvement
 */
class LoggingService {
  private logs: LogEntry[] = []
  private listeners: Set<(entry: LogEntry) => void> = new Set()
  private enabled: boolean = LOGGING_ENABLED
  private previousElements: Map<string, ExcalidrawElement> = new Map()

  constructor() {
    // Load existing logs from storage
    this.loadFromStorage()
  }

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.log('info', `Logging ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Console logging helper
   */
  private log(level: 'info' | 'debug' | 'warn' | 'error', message: string, data?: unknown): void {
    if (!LOG_TO_CONSOLE) return

    const timestamp = new Date().toISOString()
    const prefix = `[LoggingService ${timestamp}]`

    switch (level) {
      case 'info':
        console.log(`${prefix} ${message}`, data ?? '')
        break
      case 'debug':
        console.debug(`${prefix} ${message}`, data ?? '')
        break
      case 'warn':
        console.warn(`${prefix} ${message}`, data ?? '')
        break
      case 'error':
        console.error(`${prefix} ${message}`, data ?? '')
        break
    }
  }

  /**
   * Add a log entry
   */
  addEntry(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry {
    if (!this.enabled) return { ...entry, id: '', timestamp: new Date() }

    const fullEntry: LogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date(),
    }

    this.logs.push(fullEntry)

    // Trim old entries
    while (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs.shift()
    }

    // Notify listeners
    this.listeners.forEach((listener) => listener(fullEntry))

    // Save to storage
    this.saveToStorage()

    this.log('debug', `Log entry added: ${entry.type}`, entry.data)

    return fullEntry
  }

  /**
   * Log canvas update by comparing with previous state
   */
  logCanvasUpdate(elements: readonly ExcalidrawElement[]): void {
    if (!this.enabled) return

    const currentElements = new Map(elements.map((e) => [e.id, e]))
    let addedCount = 0
    let deletedCount = 0
    let modifiedCount = 0

    // Check for added and modified elements
    currentElements.forEach((element, id) => {
      const previous = this.previousElements.get(id)
      if (!previous) {
        addedCount++
        this.addEntry({
          type: 'element_added',
          data: {
            id: element.id,
            type: element.type,
            text: this.extractText(element),
            tags: this.extractTags(element),
          },
        })
      } else if (element.version !== previous.version) {
        modifiedCount++
        this.addEntry({
          type: 'element_modified',
          data: {
            id: element.id,
            type: element.type,
            changes: this.detectChanges(previous, element),
            tags: this.extractTags(element),
          },
        })
      }
    })

    // Check for deleted elements
    this.previousElements.forEach((_, id) => {
      if (!currentElements.has(id)) {
        deletedCount++
        this.addEntry({
          type: 'element_deleted',
          data: { id },
        })
      }
    })

    // Log overall update if changes occurred
    if (addedCount > 0 || deletedCount > 0 || modifiedCount > 0) {
      this.addEntry({
        type: 'canvas_update',
        data: {
          elementCount: elements.length,
          addedCount,
          deletedCount,
          modifiedCount,
        },
      })
    }

    // Update previous state
    this.previousElements = currentElements
  }

  /**
   * Extract text from element
   */
  private extractText(element: ExcalidrawElement): string | undefined {
    const el = element as ExcalidrawElement & { text?: string }
    return el.text
  }

  /**
   * Extract #tags from element text
   */
  private extractTags(element: ExcalidrawElement): string[] {
    const text = this.extractText(element)
    if (!text) return []

    const tagMatches = text.match(/#[\w-]+/g)
    return tagMatches || []
  }

  /**
   * Detect what changed between two element versions
   */
  private detectChanges(
    prev: ExcalidrawElement,
    curr: ExcalidrawElement
  ): Record<string, { from: unknown; to: unknown }> {
    const changes: Record<string, { from: unknown; to: unknown }> = {}

    const keys = ['x', 'y', 'width', 'height', 'text', 'strokeColor', 'backgroundColor'] as const

    keys.forEach((key) => {
      const prevVal = (prev as Record<string, unknown>)[key]
      const currVal = (curr as Record<string, unknown>)[key]
      if (prevVal !== currVal) {
        changes[key] = { from: prevVal, to: currVal }
      }
    })

    return changes
  }

  /**
   * Log AI request
   */
  logAIRequest(action: string, prompt: string, context: string, elementIds: string[]): void {
    this.addEntry({
      type: 'ai_request',
      data: { action, prompt, context, elementIds },
    })
  }

  /**
   * Log AI response
   */
  logAIResponse(
    action: string,
    response: string,
    stats: AIResponseStats,
    success: boolean,
    error?: string
  ): void {
    this.addEntry({
      type: 'ai_response',
      data: { action, response, stats, success, error },
    })
  }

  /**
   * Log AI action execution
   */
  logAIActionExecuted(actionType: string, elementId: string | undefined, success: boolean): void {
    this.addEntry({
      type: 'ai_action_executed',
      data: { actionType, elementId, success },
    })
  }

  /**
   * Log user action
   */
  logUserAction(action: string, details?: unknown): void {
    this.addEntry({
      type: 'user_action',
      data: { action, details },
    })
  }

  /**
   * Log error
   */
  logError(error: Error | string, context?: string): void {
    this.addEntry({
      type: 'error',
      data: {
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        context,
      },
    })
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * Get logs by type
   */
  getLogsByType(type: LogEventType): LogEntry[] {
    return this.logs.filter((log) => log.type === type)
  }

  /**
   * Get logs with specific tag
   */
  getLogsByTag(tag: string): LogEntry[] {
    return this.logs.filter((log) => log.tags?.includes(tag))
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = []
    this.saveToStorage()
    this.log('info', 'Logs cleared')
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * Subscribe to new log entries
   */
  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Save logs to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs))
    } catch (error) {
      this.log('warn', 'Failed to save logs to storage', error)
    }
  }

  /**
   * Load logs from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(LOG_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.logs = parsed.map((log: LogEntry) => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }))
        this.log('info', `Loaded ${this.logs.length} logs from storage`)
      }
    } catch (error) {
      this.log('warn', 'Failed to load logs from storage', error)
    }
  }

  /**
   * Get cognitive process summary
   * Analyzes logs to understand user behavior patterns
   */
  getCognitiveProcessSummary(): {
    totalActions: number
    aiInteractions: number
    mostUsedActions: Array<{ action: string; count: number }>
    commonTags: Array<{ tag: string; count: number }>
    averageResponseTime: number
  } {
    const actionCounts = new Map<string, number>()
    const tagCounts = new Map<string, number>()
    let aiResponseTimes: number[] = []

    this.logs.forEach((log) => {
      // Count actions
      if (log.type === 'ai_request' || log.type === 'user_action') {
        const action = (log.data as { action?: string }).action || log.type
        actionCounts.set(action, (actionCounts.get(action) || 0) + 1)
      }

      // Count tags
      log.tags?.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })

      // Track AI response times
      if (log.type === 'ai_response') {
        const stats = (log.data as { stats?: AIResponseStats }).stats
        if (stats?.durationMs) {
          aiResponseTimes.push(stats.durationMs)
        }
      }
    })

    const mostUsedActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const commonTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const averageResponseTime = aiResponseTimes.length > 0
      ? aiResponseTimes.reduce((a, b) => a + b, 0) / aiResponseTimes.length
      : 0

    return {
      totalActions: this.logs.length,
      aiInteractions: this.logs.filter((l) => l.type === 'ai_request' || l.type === 'ai_response').length,
      mostUsedActions,
      commonTags,
      averageResponseTime,
    }
  }
}

// Export singleton instance
export const loggingService = new LoggingService()

// Export class for testing
export { LoggingService }
