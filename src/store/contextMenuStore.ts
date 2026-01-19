import { create } from 'zustand'
import type { ExcalidrawElement } from '@/types'

/**
 * Context menu position
 */
export interface MenuPosition {
  x: number
  y: number
}

/**
 * Captured selection at time of context menu open
 */
export interface CapturedSelection {
  selectedElements: ExcalidrawElement[]
  allElements: ExcalidrawElement[]
}

/**
 * Context menu state
 */
interface ContextMenuState {
  isOpen: boolean
  position: MenuPosition | null
  capturedSelection: CapturedSelection | null

  // Actions
  open: (position: MenuPosition, selection: CapturedSelection) => void
  close: () => void
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isOpen: false,
  position: null,
  capturedSelection: null,

  open: (position, selection) => {
    console.log('[ContextMenu] Opening with selection:', {
      selectedCount: selection.selectedElements.length,
      allElementsCount: selection.allElements.length,
      selectedElements: selection.selectedElements.map(e => ({ id: e.id, type: e.type })),
    })
    set({
      isOpen: true,
      position,
      capturedSelection: selection,
    })
  },

  close: () => set({ isOpen: false, position: null, capturedSelection: null }),
}))
