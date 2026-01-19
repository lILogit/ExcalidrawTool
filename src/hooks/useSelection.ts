import { useEffect, useCallback, useMemo } from 'react'
import { useSelectionStore, type SelectionChangeEvent, type SelectionListener } from '@/store/selectionStore'
import {
  serializeSelectionForAI,
  getElementText,
  isShape,
  isText,
  isConnector,
  type ElementCategory,
} from '@/utils/elementUtils'
import type { ExcalidrawElement } from '@/types'

/**
 * Hook for accessing selection state with computed properties
 */
export function useSelection() {
  const store = useSelectionStore()

  return {
    // Core state
    selectedIds: store.selectedElementIds,
    selectedElements: store.selectedElements,
    allElements: store.allElements,

    // Computed state
    count: store.getSelectionCount(),
    hasSelection: store.hasSelection(),
    isSingle: store.isSingleSelection(),
    isMulti: store.isMultiSelection(),
    categories: store.getSelectionCategories(),
    properties: store.getSelectionProperties(),
    relationships: store.getRelationships(),
    boundingBox: store.getBoundingBox(),

    // Actions
    setSelection: store.setSelection,
    setAllElements: store.setAllElements,
    clearSelection: store.clearSelection,
  }
}

/**
 * Hook to subscribe to selection change events
 */
export function useSelectionChange(callback: SelectionListener) {
  const subscribe = useSelectionStore((state) => state.subscribe)

  useEffect(() => {
    const unsubscribe = subscribe(callback)
    return unsubscribe
  }, [subscribe, callback])
}

/**
 * Hook to get selection text content
 */
export function useSelectionText(): string[] {
  const selectedElements = useSelectionStore((state) => state.selectedElements)
  const allElements = useSelectionStore((state) => state.allElements)

  return useMemo(() => {
    const texts: string[] = []
    for (const element of selectedElements) {
      const text = getElementText(element, allElements)
      if (text) {
        texts.push(text)
      }
    }
    return texts
  }, [selectedElements, allElements])
}

/**
 * Hook to get AI-ready serialized selection context
 */
export function useSelectionContext(): string {
  const selectedElements = useSelectionStore((state) => state.selectedElements)
  const allElements = useSelectionStore((state) => state.allElements)

  return useMemo(() => {
    return serializeSelectionForAI(selectedElements, allElements)
  }, [selectedElements, allElements])
}

/**
 * Hook to filter selection by type
 */
export function useSelectionByType() {
  const selectedElements = useSelectionStore((state) => state.selectedElements)

  return useMemo(() => {
    const shapes: ExcalidrawElement[] = []
    const texts: ExcalidrawElement[] = []
    const connectors: ExcalidrawElement[] = []
    const others: ExcalidrawElement[] = []

    for (const element of selectedElements) {
      if (isShape(element)) {
        shapes.push(element)
      } else if (isText(element)) {
        texts.push(element)
      } else if (isConnector(element)) {
        connectors.push(element)
      } else {
        others.push(element)
      }
    }

    return { shapes, texts, connectors, others }
  }, [selectedElements])
}

/**
 * Hook to check if selection contains specific element types
 */
export function useSelectionContains(): {
  hasShapes: boolean
  hasText: boolean
  hasConnectors: boolean
  hasOnly: (category: ElementCategory) => boolean
} {
  const categories = useSelectionStore((state) => state.getSelectionCategories())

  return useMemo(
    () => ({
      hasShapes: categories.includes('shape'),
      hasText: categories.includes('text'),
      hasConnectors: categories.includes('connector'),
      hasOnly: (category: ElementCategory) =>
        categories.length === 1 && categories[0] === category,
    }),
    [categories]
  )
}

/**
 * Hook for selection event logging (useful for debugging)
 */
export function useSelectionDebug(enabled = false) {
  const handleSelectionChange = useCallback(
    (event: SelectionChangeEvent) => {
      if (!enabled) return
      console.group('Selection Changed')
      console.log('Previous:', event.previousIds)
      console.log('Current:', event.currentIds)
      console.log('Added:', event.added)
      console.log('Removed:', event.removed)
      console.log('Elements:', event.elements)
      console.groupEnd()
    },
    [enabled]
  )

  useSelectionChange(handleSelectionChange)
}
