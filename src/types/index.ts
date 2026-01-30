import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

// Re-export Excalidraw types for convenience
export type { ExcalidrawElement, AppState, ExcalidrawImperativeAPI }

// Re-export element utility types
export type {
  ElementCategory,
  ElementProperties,
  ElementRelationship,
  ElementTag,
} from '@/utils/elementUtils'

// Re-export selection store types
export type {
  SelectionChangeEvent,
  SelectionListener,
} from '@/store/selectionStore'

// Re-export canvas context types
export type {
  CanvasDomain,
  CanvasContext,
  TerminologyEntry,
  ColorMeaning,
  CanvasStyleGuide,
  ResponseStyle,
} from '@/types/canvasContext'
export { DEFAULT_CANVAS_CONTEXT, getDomainDisplayName, getDomainOptions } from '@/types/canvasContext'

// Re-export utility types
export * from '@/types/utils'

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

export type AIProvider = 'anthropic' | 'ollama'

export interface ModelParameters {
  temperature?: number // 0.0-1.0, controls randomness
  topP?: number // 0.0-1.0, nucleus sampling
  topK?: number // Limits vocabulary for each step
  repeatPenalty?: number // Penalizes repetition
  seed?: number // For reproducible outputs
}

export interface AIServiceConfig {
  provider: AIProvider
  apiKey?: string // Required for Anthropic, optional for Ollama
  model?: string
  maxTokens?: number
  baseUrl?: string // For Ollama: default http://localhost:11434
  parameters?: ModelParameters // Model generation parameters
  debug?: boolean // Enable debug logging
}

export interface AIResponseStats {
  provider: AIProvider
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  durationMs: number
  timestamp: Date
}

export interface AIResponse {
  content: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

