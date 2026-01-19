import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

// Re-export Excalidraw types for convenience
export type { ExcalidrawElement, AppState, ExcalidrawImperativeAPI }

// Re-export element utility types
export type {
  ElementCategory,
  ElementProperties,
  ElementRelationship,
} from '@/utils/elementUtils'

// Re-export selection store types
export type {
  SelectionChangeEvent,
  SelectionListener,
} from '@/store/selectionStore'

// Canvas/App state
export interface CanvasState {
  isLoading: boolean
  error: string | null
  lastSaved: Date | null
}

// AI Service types
export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIStreamChunk {
  type: 'text' | 'error' | 'done'
  content: string
}

export interface AIServiceConfig {
  apiKey: string
  model?: string
  maxTokens?: number
}

export interface AIResponse {
  content: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

