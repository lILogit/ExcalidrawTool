import { useCallback, useEffect, useRef, useState } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import { useSelectionStore } from '@/store/selectionStore'
import { useCanvasStore } from '@/store/canvasStore'
import { useContextMenuStore } from '@/store/contextMenuStore'
import { loggingService } from '@/services/loggingService'
import type { ExcalidrawElement, ExcalidrawImperativeAPI } from '@/types'
import '@excalidraw/excalidraw/index.css'

const STORAGE_KEY = 'excalidraw-ai-canvas'
const SAVE_DELAY = 300 // Debounce save to avoid excessive writes

/**
 * Load saved canvas data from localStorage
 */
function loadFromStorage(): { elements: ExcalidrawElement[] } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      if (data.elements && Array.isArray(data.elements)) {
        return { elements: data.elements }
      }
    }
  } catch (error) {
    console.warn('Failed to load canvas from storage:', error)
  }
  return null
}

/**
 * Save canvas data to localStorage
 */
function saveToStorage(elements: readonly ExcalidrawElement[]): void {
  try {
    const data = {
      elements: elements.filter((el) => !el.isDeleted),
      timestamp: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to save canvas to storage:', error)
  }
}

export function ExcalidrawCanvas() {
  const setSelection = useSelectionStore((state) => state.setSelection)
  const setAllElements = useSelectionStore((state) => state.setAllElements)
  const setExcalidrawAPI = useCanvasStore((state) => state.setExcalidrawAPI)
  const openContextMenu = useContextMenuStore((state) => state.open)
  const closeContextMenu = useContextMenuStore((state) => state.close)

  const containerRef = useRef<HTMLDivElement>(null)
  // Track previous selection to avoid unnecessary updates
  const prevSelectionRef = useRef<string>('')
  // Debounce timer for saving
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Load initial data from localStorage
  const [initialData] = useState(() => loadFromStorage())

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: { selectedElementIds: Record<string, boolean> }) => {
      // Filter out deleted elements
      const activeElements = elements.filter((el) => !el.isDeleted)

      // Update all elements in store (needed for relationship detection)
      setAllElements(activeElements as ExcalidrawElement[])

      // Log canvas updates for cognitive process learning
      loggingService.logCanvasUpdate(activeElements as ExcalidrawElement[])

      // Debounced save to localStorage
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      saveTimerRef.current = setTimeout(() => {
        saveToStorage(elements)
      }, SAVE_DELAY)

      // Extract selected element IDs
      const selectedIds = Object.entries(appState.selectedElementIds)
        .filter(([, isSelected]) => isSelected)
        .map(([id]) => id)

      // Create a stable key for selection comparison
      const selectionKey = selectedIds.sort().join(',')

      // Only update if selection actually changed
      if (selectionKey !== prevSelectionRef.current) {
        prevSelectionRef.current = selectionKey

        // Get the actual selected elements
        const selectedElements = activeElements.filter((el) => selectedIds.includes(el.id))

        // Log selection change
        if (selectedIds.length > 0) {
          loggingService.addEntry({
            type: 'selection_changed',
            data: {
              count: selectedIds.length,
              elementIds: selectedIds,
              elementTypes: selectedElements.map(e => e.type),
            },
          })
        }

        // Update selection store
        setSelection(selectedIds, selectedElements as ExcalidrawElement[])
      }
    },
    [setSelection, setAllElements]
  )

  const handleExcalidrawAPI = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      // Store the API reference for external access
      setExcalidrawAPI(api)
    },
    [setExcalidrawAPI]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setExcalidrawAPI(null)
      // Clear any pending save timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [setExcalidrawAPI])

  // Handle right-click to open custom context menu
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleContextMenu = (e: MouseEvent) => {
      // Prevent browser's default context menu
      e.preventDefault()
      // Stop Excalidraw from showing its own context menu
      e.stopPropagation()
      e.stopImmediatePropagation()

      closeContextMenu()

      // Small delay to allow selection to update first
      requestAnimationFrame(() => {
        // Capture current selection state before it potentially changes
        const selectionState = useSelectionStore.getState()
        openContextMenu(
          { x: e.clientX, y: e.clientY },
          {
            selectedElements: [...selectionState.selectedElements],
            allElements: [...selectionState.allElements],
          }
        )
      })
    }

    // Use capture phase to intercept before Excalidraw's handlers
    container.addEventListener('contextmenu', handleContextMenu, true)

    return () => {
      container.removeEventListener('contextmenu', handleContextMenu, true)
    }
  }, [openContextMenu, closeContextMenu])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
        onChange={handleChange}
        initialData={initialData || undefined}
        UIOptions={{
          canvasActions: {
            loadScene: true,
            saveToActiveFile: false,
            export: { saveFileToDisk: true },
          },
        }}
      />
    </div>
  )
}
