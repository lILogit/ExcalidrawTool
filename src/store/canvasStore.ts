import { create } from 'zustand'
import type { CanvasState, ExcalidrawImperativeAPI } from '@/types'

interface CanvasStore extends CanvasState {
  // Excalidraw API reference
  excalidrawAPI: ExcalidrawImperativeAPI | null

  // Actions
  setExcalidrawAPI: (api: ExcalidrawImperativeAPI | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  setLastSaved: (date: Date) => void
  clearError: () => void
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  // Initial state
  isLoading: false,
  error: null,
  lastSaved: null,
  excalidrawAPI: null,

  // Actions
  setExcalidrawAPI: (api) => set({ excalidrawAPI: api }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  setLastSaved: (date) => set({ lastSaved: date }),

  clearError: () => set({ error: null }),
}))
