import { create } from 'zustand'
import type { CanvasState, ExcalidrawImperativeAPI, CanvasContext } from '@/types'
import { DEFAULT_CANVAS_CONTEXT } from '@/types/canvasContext'

interface CanvasStore extends CanvasState {
  // Excalidraw API reference
  excalidrawAPI: ExcalidrawImperativeAPI | null

  // Canvas context for AI enrichment
  canvasContext: CanvasContext | null

  // Actions
  setExcalidrawAPI: (api: ExcalidrawImperativeAPI | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  setLastSaved: (date: Date) => void
  clearError: () => void

  // Canvas context actions
  setCanvasContext: (context: CanvasContext | null) => void
  updateCanvasContext: (updates: Partial<CanvasContext>) => void
  clearCanvasContext: () => void
  initializeCanvasContext: () => void
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Initial state
  isLoading: false,
  error: null,
  lastSaved: null,
  excalidrawAPI: null,
  canvasContext: null,

  // Actions
  setExcalidrawAPI: (api) => set({ excalidrawAPI: api }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setLastSaved: (date) => set({ lastSaved: date }),

  clearError: () => set({ error: null }),

  // Canvas context actions
  setCanvasContext: (context) =>
    set({
      canvasContext: context
        ? { ...context, updatedAt: Date.now() }
        : null,
    }),

  updateCanvasContext: (updates) =>
    set((state) => {
      if (!state.canvasContext) {
        // If no context exists, create a new one with defaults
        return {
          canvasContext: {
            ...DEFAULT_CANVAS_CONTEXT,
            ...updates,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        }
      }
      return {
        canvasContext: {
          ...state.canvasContext,
          ...updates,
          updatedAt: Date.now(),
        },
      }
    }),

  clearCanvasContext: () => set({ canvasContext: null }),

  initializeCanvasContext: () => {
    const current = get().canvasContext
    if (!current) {
      set({
        canvasContext: {
          ...DEFAULT_CANVAS_CONTEXT,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      })
    }
  },
}))

// Selector hooks for convenience
export const useCanvasContext = () => useCanvasStore((state) => state.canvasContext)
export const useCanvasContextActions = () =>
  useCanvasStore((state) => ({
    setCanvasContext: state.setCanvasContext,
    updateCanvasContext: state.updateCanvasContext,
    clearCanvasContext: state.clearCanvasContext,
    initializeCanvasContext: state.initializeCanvasContext,
  }))
