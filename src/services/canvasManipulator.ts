import { useCanvasStore } from '@/store/canvasStore'
import type { ExcalidrawElement } from '@/types'

/**
 * Generate a random ID for new elements
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

/**
 * Generate a random seed for roughjs
 */
function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647)
}

/**
 * Element style options
 */
export interface ElementStyle {
  strokeColor?: string
  backgroundColor?: string
  fillStyle?: 'hachure' | 'cross-hatch' | 'solid' | 'zigzag'
  strokeWidth?: number
  strokeStyle?: 'solid' | 'dashed' | 'dotted'
  roughness?: number
  opacity?: number
}

/**
 * Position and size for new elements
 */
export interface ElementGeometry {
  x: number
  y: number
  width?: number
  height?: number
}

/**
 * Text element options
 */
export interface TextOptions extends ElementStyle {
  fontSize?: number
  fontFamily?: number // 1 = Virgil, 2 = Helvetica, 3 = Cascadia
  textAlign?: 'left' | 'center' | 'right'
}

/**
 * Arrow/line options
 */
export interface ConnectorOptions extends ElementStyle {
  startArrowhead?: 'arrow' | 'bar' | 'dot' | 'triangle' | null
  endArrowhead?: 'arrow' | 'bar' | 'dot' | 'triangle' | null
}

/**
 * Default element styles
 */
const DEFAULT_STYLE: Required<ElementStyle> = {
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  fillStyle: 'solid',
  strokeWidth: 2,
  strokeStyle: 'solid',
  roughness: 1,
  opacity: 100,
}

/**
 * Default text options
 */
const DEFAULT_TEXT: Required<TextOptions> = {
  ...DEFAULT_STYLE,
  fontSize: 20,
  fontFamily: 1,
  textAlign: 'left',
}

/**
 * Canvas Manipulator - Programmatic canvas operations
 */
class CanvasManipulator {
  /**
   * Get the Excalidraw API
   */
  private getAPI() {
    const api = useCanvasStore.getState().excalidrawAPI
    if (!api) {
      throw new Error('Excalidraw API not available')
    }
    return api
  }

  /**
   * Get current scene elements
   */
  getElements(): readonly ExcalidrawElement[] {
    return this.getAPI().getSceneElements()
  }

  /**
   * Get element by ID
   */
  getElementById(id: string): ExcalidrawElement | undefined {
    return this.getElements().find((e) => e.id === id)
  }

  /**
   * Create base element properties
   */
  private createBaseElement(
    type: string,
    geometry: ElementGeometry,
    style: ElementStyle = {}
  ): Partial<ExcalidrawElement> {
    const mergedStyle = { ...DEFAULT_STYLE, ...style }

    return {
      id: generateId(),
      type: type as ExcalidrawElement['type'],
      x: geometry.x,
      y: geometry.y,
      width: geometry.width ?? 100,
      height: geometry.height ?? 100,
      angle: 0,
      strokeColor: mergedStyle.strokeColor,
      backgroundColor: mergedStyle.backgroundColor,
      fillStyle: mergedStyle.fillStyle,
      strokeWidth: mergedStyle.strokeWidth,
      strokeStyle: mergedStyle.strokeStyle,
      roughness: mergedStyle.roughness,
      opacity: mergedStyle.opacity,
      seed: generateSeed(),
      version: 1,
      versionNonce: generateSeed(),
      isDeleted: false,
      groupIds: [],
      frameId: null,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      index: null,
      roundness: { type: 3 },
    }
  }

  /**
   * Add a rectangle element
   */
  addRectangle(geometry: ElementGeometry, style?: ElementStyle, options?: { text?: string }): string {
    const rectangleId = generateId()
    const rectangle = {
      ...this.createBaseElement('rectangle', geometry, style),
      id: rectangleId,
    } as ExcalidrawElement

    const newElements: ExcalidrawElement[] = []

    // If text is provided, create bound text inside the rectangle
    if (options?.text) {
      const textId = generateId()
      const textElement = {
        ...this.createBaseElement('text', {
          x: geometry.x + (geometry.width || 100) / 2,
          y: geometry.y + (geometry.height || 100) / 2,
          width: (geometry.width || 100) - 20,
          height: 20,
        }),
        id: textId,
        type: 'text',
        text: options.text,
        originalText: options.text,
        fontSize: 16,
        fontFamily: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
        containerId: rectangleId,
        autoResize: true,
        lineHeight: 1.25,
      } as unknown as ExcalidrawElement

      // Update rectangle to reference bound text
      const rectangleWithBoundText = {
        ...rectangle,
        boundElements: [{ id: textId, type: 'text' as const }],
      } as ExcalidrawElement

      newElements.push(rectangleWithBoundText, textElement)
    } else {
      newElements.push(rectangle)
    }

    const elements = [...this.getElements(), ...newElements]
    this.getAPI().updateScene({ elements })

    return rectangleId
  }

  /**
   * Add an ellipse element
   */
  addEllipse(geometry: ElementGeometry, style?: ElementStyle): string {
    const element = {
      ...this.createBaseElement('ellipse', geometry, style),
    } as ExcalidrawElement

    const elements = [...this.getElements(), element]
    this.getAPI().updateScene({ elements })

    return element.id
  }

  /**
   * Add a diamond element
   */
  addDiamond(geometry: ElementGeometry, style?: ElementStyle): string {
    const element = {
      ...this.createBaseElement('diamond', geometry, style),
    } as ExcalidrawElement

    const elements = [...this.getElements(), element]
    this.getAPI().updateScene({ elements })

    return element.id
  }

  /**
   * Add a text element
   */
  addText(
    text: string,
    position: { x: number; y: number },
    options?: TextOptions
  ): string {
    const mergedOptions = { ...DEFAULT_TEXT, ...options }

    // Estimate text dimensions
    const lines = text.split('\n')
    const maxLineLength = Math.max(...lines.map((l) => l.length))
    const estimatedWidth = maxLineLength * mergedOptions.fontSize * 0.6
    const estimatedHeight = lines.length * mergedOptions.fontSize * 1.2

    const element = {
      ...this.createBaseElement('text', {
        x: position.x,
        y: position.y,
        width: estimatedWidth,
        height: estimatedHeight,
      }, options),
      type: 'text',
      text,
      originalText: text,
      fontSize: mergedOptions.fontSize,
      fontFamily: mergedOptions.fontFamily,
      textAlign: mergedOptions.textAlign,
      verticalAlign: 'top',
      containerId: null,
      autoResize: true,
      lineHeight: 1.25,
    } as ExcalidrawElement

    const elements = [...this.getElements(), element]
    this.getAPI().updateScene({ elements })

    return element.id
  }

  /**
   * Add an arrow connecting two points
   */
  addArrow(
    start: { x: number; y: number },
    end: { x: number; y: number },
    options?: ConnectorOptions
  ): string {
    const element = {
      ...this.createBaseElement('arrow', {
        x: start.x,
        y: start.y,
        width: end.x - start.x,
        height: end.y - start.y,
      }, options),
      type: 'arrow',
      points: [
        [0, 0],
        [end.x - start.x, end.y - start.y],
      ],
      lastCommittedPoint: null,
      startBinding: null,
      endBinding: null,
      startArrowhead: options?.startArrowhead ?? null,
      endArrowhead: options?.endArrowhead ?? 'arrow',
      elbowed: false,
    } as unknown as ExcalidrawElement

    const elements = [...this.getElements(), element]
    this.getAPI().updateScene({ elements })

    return element.id
  }

  /**
   * Add a line (arrow without arrowheads)
   */
  addLine(
    start: { x: number; y: number },
    end: { x: number; y: number },
    options?: ElementStyle
  ): string {
    const element = {
      ...this.createBaseElement('line', {
        x: start.x,
        y: start.y,
        width: end.x - start.x,
        height: end.y - start.y,
      }, options),
      type: 'line',
      points: [
        [0, 0],
        [end.x - start.x, end.y - start.y],
      ],
      lastCommittedPoint: null,
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: null,
    } as unknown as ExcalidrawElement

    const elements = [...this.getElements(), element]
    this.getAPI().updateScene({ elements })

    return element.id
  }

  /**
   * Add a connection (arrow) between two elements
   * Removes any existing arrows between the same elements first
   */
  addConnection(
    fromId: string,
    toId: string,
    options?: ConnectorOptions & { label?: string }
  ): string | null {
    const fromElement = this.getElementById(fromId)
    const toElement = this.getElementById(toId)

    if (!fromElement || !toElement) {
      console.error('Cannot create connection: element not found')
      return null
    }

    // Find and remove any existing arrows between these elements
    const existingArrows = this.getElements().filter((e) => {
      if (e.type !== 'arrow' || e.isDeleted) return false
      const arrow = e as ExcalidrawElement & { startBinding?: { elementId: string }; endBinding?: { elementId: string } }
      // Check if arrow connects these two elements in either direction
      const connectsFromTo = arrow.startBinding?.elementId === fromId && arrow.endBinding?.elementId === toId
      const connectsToFrom = arrow.startBinding?.elementId === toId && arrow.endBinding?.elementId === fromId
      return connectsFromTo || connectsToFrom
    })

    // Delete existing arrows and their bound text labels
    if (existingArrows.length > 0) {
      const idsToDelete: string[] = []
      existingArrows.forEach((arrow) => {
        idsToDelete.push(arrow.id)
        // Also delete any bound text (labels)
        if (arrow.boundElements) {
          arrow.boundElements.forEach((bound) => {
            if (bound.type === 'text') {
              idsToDelete.push(bound.id)
            }
          })
        }
      })
      this.deleteElements(idsToDelete)
    }

    // Calculate center points
    const fromCenter = {
      x: fromElement.x + fromElement.width / 2,
      y: fromElement.y + fromElement.height / 2,
    }
    const toCenter = {
      x: toElement.x + toElement.width / 2,
      y: toElement.y + toElement.height / 2,
    }

    // Calculate edge points (simple approach - from center to edge)
    const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x)

    const fromEdge = {
      x: fromCenter.x + (fromElement.width / 2) * Math.cos(angle),
      y: fromCenter.y + (fromElement.height / 2) * Math.sin(angle),
    }

    const toEdge = {
      x: toCenter.x - (toElement.width / 2) * Math.cos(angle),
      y: toCenter.y - (toElement.height / 2) * Math.sin(angle),
    }

    // Create arrow with bindings
    const arrowId = generateId()
    const arrow = {
      ...this.createBaseElement('arrow', {
        x: fromEdge.x,
        y: fromEdge.y,
        width: toEdge.x - fromEdge.x,
        height: toEdge.y - fromEdge.y,
      }, options),
      id: arrowId,
      type: 'arrow',
      points: [
        [0, 0],
        [toEdge.x - fromEdge.x, toEdge.y - fromEdge.y],
      ],
      lastCommittedPoint: null,
      startBinding: {
        elementId: fromId,
        focus: 0,
        gap: 8,
      },
      endBinding: {
        elementId: toId,
        focus: 0,
        gap: 8,
      },
      startArrowhead: options?.startArrowhead ?? null,
      endArrowhead: options?.endArrowhead ?? 'arrow',
      elbowed: false,
    } as unknown as ExcalidrawElement

    // Update source and target elements with bound arrow
    let updatedElements = this.getElements().map((e) => {
      if (e.id === fromId || e.id === toId) {
        const existingBounds = e.boundElements ?? []
        return {
          ...e,
          boundElements: [...existingBounds, { id: arrowId, type: 'arrow' as const }],
          version: e.version + 1,
        }
      }
      return e
    })

    // Add label text bound to arrow if provided
    let arrowWithBinding = arrow
    const newElements: ExcalidrawElement[] = []

    if (options?.label) {
      const midX = (fromEdge.x + toEdge.x) / 2
      const midY = (fromEdge.y + toEdge.y) / 2

      const labelId = generateId()
      const labelText = {
        ...this.createBaseElement('text', {
          x: midX - (options.label.length * 4),
          y: midY - 12,
          width: options.label.length * 8,
          height: 20,
        }),
        id: labelId,
        type: 'text',
        text: options.label,
        originalText: options.label,
        fontSize: 14,
        fontFamily: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
        containerId: arrowId,
        autoResize: true,
        lineHeight: 1.25,
      } as unknown as ExcalidrawElement

      // Update arrow to have bound text
      arrowWithBinding = {
        ...arrow,
        boundElements: [{ id: labelId, type: 'text' as const }],
      } as unknown as ExcalidrawElement

      newElements.push(labelText)
    }

    this.getAPI().updateScene({ elements: [...updatedElements, arrowWithBinding, ...newElements] })

    return arrowId
  }

  /**
   * Update an existing element
   */
  updateElement(id: string, changes: Partial<ExcalidrawElement>): boolean {
    const elements = this.getElements()
    const index = elements.findIndex((e) => e.id === id)

    if (index === -1) {
      console.error(`Element ${id} not found`)
      return false
    }

    const updatedElements = elements.map((e) => {
      if (e.id === id) {
        return {
          ...e,
          ...changes,
          version: e.version + 1,
          updated: Date.now(),
        }
      }
      return e
    })

    this.getAPI().updateScene({ elements: updatedElements as ExcalidrawElement[] })
    return true
  }

  /**
   * Update text content of a text element
   */
  updateText(id: string, newText: string): boolean {
    const element = this.getElementById(id)
    if (!element || element.type !== 'text') {
      console.error(`Text element ${id} not found`)
      return false
    }

    return this.updateElement(id, {
      text: newText,
      originalText: newText,
    } as Partial<ExcalidrawElement>)
  }

  /**
   * Delete an element
   */
  deleteElement(id: string): boolean {
    const elements = this.getElements()
    const element = elements.find((e) => e.id === id)

    if (!element) {
      console.error(`Element ${id} not found`)
      return false
    }

    // Mark as deleted (Excalidraw convention)
    const updatedElements = elements.map((e) => {
      if (e.id === id) {
        return {
          ...e,
          isDeleted: true,
          version: e.version + 1,
          updated: Date.now(),
        }
      }
      // Also clean up bound elements references
      if (e.boundElements?.some((b) => b.id === id)) {
        return {
          ...e,
          boundElements: e.boundElements.filter((b) => b.id !== id),
          version: e.version + 1,
        }
      }
      return e
    })

    this.getAPI().updateScene({ elements: updatedElements })
    return true
  }

  /**
   * Delete multiple elements
   */
  deleteElements(ids: string[]): number {
    const idSet = new Set(ids)
    let deleted = 0

    const updatedElements = this.getElements().map((e) => {
      if (idSet.has(e.id)) {
        deleted++
        return {
          ...e,
          isDeleted: true,
          version: e.version + 1,
          updated: Date.now(),
        }
      }
      // Clean up bound elements references
      if (e.boundElements?.some((b) => idSet.has(b.id))) {
        return {
          ...e,
          boundElements: e.boundElements.filter((b) => !idSet.has(b.id)),
          version: e.version + 1,
        }
      }
      return e
    })

    this.getAPI().updateScene({ elements: updatedElements })
    return deleted
  }

  /**
   * Move an element by delta
   */
  moveElement(id: string, deltaX: number, deltaY: number): boolean {
    const element = this.getElementById(id)
    if (!element) return false

    return this.updateElement(id, {
      x: element.x + deltaX,
      y: element.y + deltaY,
    })
  }

  /**
   * Resize an element
   */
  resizeElement(id: string, width: number, height: number): boolean {
    return this.updateElement(id, { width, height })
  }

  /**
   * Change element style
   */
  setStyle(id: string, style: ElementStyle): boolean {
    return this.updateElement(id, style as Partial<ExcalidrawElement>)
  }

  /**
   * Group elements together
   */
  groupElements(ids: string[]): string | null {
    if (ids.length < 2) {
      console.error('Need at least 2 elements to group')
      return null
    }

    const groupId = generateId()

    const updatedElements = this.getElements().map((e) => {
      if (ids.includes(e.id)) {
        return {
          ...e,
          groupIds: [...e.groupIds, groupId],
          version: e.version + 1,
        }
      }
      return e
    })

    this.getAPI().updateScene({ elements: updatedElements })
    return groupId
  }

  /**
   * Ungroup elements
   */
  ungroupElements(groupId: string): boolean {
    let found = false

    const updatedElements = this.getElements().map((e) => {
      if (e.groupIds.includes(groupId)) {
        found = true
        return {
          ...e,
          groupIds: e.groupIds.filter((g) => g !== groupId),
          version: e.version + 1,
        }
      }
      return e
    })

    if (found) {
      this.getAPI().updateScene({ elements: updatedElements })
    }

    return found
  }

  /**
   * Lock/unlock an element
   */
  setLocked(id: string, locked: boolean): boolean {
    return this.updateElement(id, { locked })
  }

  /**
   * Scroll to show element(s)
   */
  scrollToElements(ids?: string[]): void {
    const api = this.getAPI()
    if (ids && ids.length > 0) {
      const elements = this.getElements().filter((e) => ids.includes(e.id))
      api.scrollToContent(elements)
    } else {
      api.scrollToContent()
    }
  }

  /**
   * Show a toast notification
   */
  showToast(message: string, duration = 3000): void {
    this.getAPI().setToast({ message, duration, closable: true })
  }

  /**
   * Clear the canvas
   */
  clearCanvas(): void {
    this.getAPI().resetScene()
  }
}

// Export singleton instance
export const canvasManipulator = new CanvasManipulator()

// Export class for testing
export { CanvasManipulator }
