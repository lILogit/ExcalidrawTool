import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { ExcalidrawElement } from '@/types'
import {
  getElementCategory,
  extractElementProperties,
  detectRelationships,
  getBoundingBox,
  type ElementCategory,
  type ElementProperties,
  type ElementRelationship,
} from '@/utils/elementUtils'

/**
 * Selection change event data
 */
export interface SelectionChangeEvent {
  previousIds: string[]
  currentIds: string[]
  added: string[]
  removed: string[]
  elements: ExcalidrawElement[]
}

/**
 * Selection event listener type
 */
export type SelectionListener = (event: SelectionChangeEvent) => void

/**
 * Selection store state
 */
interface SelectionState {
  // Core selection data
  selectedElementIds: string[]
  selectedElements: ExcalidrawElement[]

  // All scene elements (for relationship detection)
  allElements: ExcalidrawElement[]
}

/**
 * Selection store with event system
 */
interface SelectionStore extends SelectionState {
  // Actions
  setSelection: (elementIds: string[], elements: ExcalidrawElement[]) => void
  setAllElements: (elements: ExcalidrawElement[]) => void
  clearSelection: () => void

  // Event listeners
  listeners: Set<SelectionListener>
  subscribe: (listener: SelectionListener) => () => void

  // Computed getters (called as functions for reactivity)
  getSelectionCount: () => number
  hasSelection: () => boolean
  isSingleSelection: () => boolean
  isMultiSelection: () => boolean
  getSelectionCategories: () => ElementCategory[]
  getSelectionProperties: () => ElementProperties[]
  getRelationships: () => ElementRelationship[]
  getBoundingBox: () => ReturnType<typeof getBoundingBox>
}

export const useSelectionStore = create<SelectionStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    selectedElementIds: [],
    selectedElements: [],
    allElements: [],
    listeners: new Set(),

    // Actions
    setSelection: (elementIds, elements) => {
      const state = get()
      const previousIds = state.selectedElementIds

      // Calculate diff
      const previousSet = new Set(previousIds)
      const currentSet = new Set(elementIds)
      const added = elementIds.filter((id) => !previousSet.has(id))
      const removed = previousIds.filter((id) => !currentSet.has(id))

      // Update state
      set({
        selectedElementIds: elementIds,
        selectedElements: elements,
      })

      // Notify listeners if selection changed
      if (added.length > 0 || removed.length > 0) {
        const event: SelectionChangeEvent = {
          previousIds,
          currentIds: elementIds,
          added,
          removed,
          elements,
        }
        state.listeners.forEach((listener) => listener(event))
      }
    },

    setAllElements: (elements) => set({ allElements: elements }),

    clearSelection: () => {
      const state = get()
      const previousIds = state.selectedElementIds

      set({
        selectedElementIds: [],
        selectedElements: [],
      })

      // Notify listeners
      if (previousIds.length > 0) {
        const event: SelectionChangeEvent = {
          previousIds,
          currentIds: [],
          added: [],
          removed: previousIds,
          elements: [],
        }
        state.listeners.forEach((listener) => listener(event))
      }
    },

    // Event subscription
    subscribe: (listener) => {
      const state = get()
      state.listeners.add(listener)
      return () => {
        state.listeners.delete(listener)
      }
    },

    // Computed getters
    getSelectionCount: () => get().selectedElementIds.length,

    hasSelection: () => get().selectedElementIds.length > 0,

    isSingleSelection: () => get().selectedElementIds.length === 1,

    isMultiSelection: () => get().selectedElementIds.length > 1,

    getSelectionCategories: () => {
      const elements = get().selectedElements
      const categories = new Set(elements.map(getElementCategory))
      return Array.from(categories)
    },

    getSelectionProperties: () => {
      const elements = get().selectedElements
      return elements.map(extractElementProperties)
    },

    getRelationships: () => {
      const { selectedElements, allElements } = get()
      return detectRelationships(selectedElements, allElements)
    },

    getBoundingBox: () => {
      const elements = get().selectedElements
      return getBoundingBox(elements)
    },
  }))
)

/**
 * Selector hooks for common patterns
 */
export const selectionSelectors = {
  selectedIds: (state: SelectionStore) => state.selectedElementIds,
  selectedElements: (state: SelectionStore) => state.selectedElements,
  hasSelection: (state: SelectionStore) => state.selectedElementIds.length > 0,
  selectionCount: (state: SelectionStore) => state.selectedElementIds.length,
  isSingle: (state: SelectionStore) => state.selectedElementIds.length === 1,
  isMulti: (state: SelectionStore) => state.selectedElementIds.length > 1,
}
