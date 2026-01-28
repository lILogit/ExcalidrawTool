import { useEffect, useRef, useState, useCallback } from 'react'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@/types'

import { useSelectionStore } from '@/store/selectionStore'
import { useCanvasStore } from '@/store/canvasStore'
import { useContextMenuStore } from '@/store/contextMenuStore'
import { loggingService } from '@/services/loggingService'

const SAVE_DELAY = 1000 // Debounce delay for saving to localStorage
const STORAGE_KEY = 'excalidraw-state'
const CONTEXT_KEY = 'excalidraw-context'

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored)
    // Return only Excalidraw-compatible data structure
    return {
      elements: parsed.elements || [],
      appState: parsed.appState || {},
      scrollToContent: true,
    }
  } catch {
    return null
  }
}

function loadCanvasContext() {
  try {
    const stored = localStorage.getItem(CONTEXT_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch {
    return null
  }
}

function saveToStorage(elements: readonly ExcalidrawElement[], canvasContext: any) {
  try {
    // Save Excalidraw state (elements only, Excalidraw handles appState internally)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        elements,
        timestamp: Date.now(),
      })
    )
    // Save canvas context separately
    if (canvasContext) {
      localStorage.setItem(
        CONTEXT_KEY,
        JSON.stringify({
          ...canvasContext,
          timestamp: Date.now(),
        })
      )
    }
  } catch (error) {
    console.warn('Failed to save to localStorage:', error)
  }
}

export function ExcalidrawCanvas() {
  const setSelection = useSelectionStore((state) => state.setSelection)
  const setAllElements = useSelectionStore((state) => state.setAllElements)
  const setExcalidrawAPI = useCanvasStore((state) => state.setExcalidrawAPI)
  const canvasContext = useCanvasStore((state) => state.canvasContext)
  const setCanvasContext = useCanvasStore((state) => state.setCanvasContext)
  const openContextMenu = useContextMenuStore((state) => state.open)
  const closeContextMenu = useContextMenuStore((state) => state.close)

  const containerRef = useRef<HTMLDivElement>(null)
  // Track previous selection to avoid unnecessary updates
  const prevSelectionRef = useRef<string>('')
  // Debounce timer for saving
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  // Track if context has been initialized from storage
  const contextInitializedRef = useRef(false)

  // Load initial data from localStorage
  const [initialData] = useState(() => {
    return loadFromStorage()
  })

  // Initialize canvas context from storage on mount
  useEffect(() => {
    if (!contextInitializedRef.current) {
      const savedContext = loadCanvasContext()
      if (savedContext) {
        setCanvasContext(savedContext)
      }
      contextInitializedRef.current = true
    }
  }, [setCanvasContext])

  // Save canvas context when it changes
  useEffect(() => {
    if (contextInitializedRef.current && canvasContext) {
      // Get current elements from the store
      const allElements = useSelectionStore.getState().allElements
      saveToStorage(allElements, canvasContext)
    }
  }, [canvasContext])

  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: { selectedElementIds: Record<string, boolean> }) => {
      // Filter out deleted elements
      const activeElements = elements.filter((el) => !el.isDeleted)

      // Update all elements in store (needed for relationship detection)
      setAllElements(activeElements as ExcalidrawElement[])

      // Log canvas updates for cognitive process learning
      loggingService.logCanvasUpdate(activeElements as ExcalidrawElement[])

      // Debounced save to localStorage (including canvas context)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      saveTimerRef.current = setTimeout(() => {
        // Get latest canvas context from store
        const currentContext = useCanvasStore.getState().canvasContext
        saveToStorage(elements, currentContext)
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
              elementTypes: selectedElements.map((e) => e.type),
            },
          })
        }

        // Update selection store
        setSelection(selectedIds, selectedElements as ExcalidrawElement[])
      }
    },
    [setSelection, setAllElements]
  )

  const handleExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
    // Store the API reference for external access
    setExcalidrawAPI(api)
  }, [setExcalidrawAPI])

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
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
        onChange={handleChange}
        initialData={initialData || undefined}
        theme="light"
        UIOptions={{
          canvasActions: {
            loadScene: true,
            saveToActiveFile: false,
            export: { saveFileToDisk: true },
          },
          welcomeScreen: false,
        }}
      />
    </div>
  )
}
