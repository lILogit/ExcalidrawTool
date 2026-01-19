import type { ExcalidrawElement } from '@/types'
import { getBoundingBox } from './elementUtils'

/**
 * Layout direction
 */
export type LayoutDirection = 'horizontal' | 'vertical' | 'radial' | 'grid'

/**
 * Layout options
 */
export interface LayoutOptions {
  direction?: LayoutDirection
  spacing?: number
  startX?: number
  startY?: number
  columns?: number // For grid layout
}

/**
 * Position for a new element
 */
export interface ElementPosition {
  x: number
  y: number
}

/**
 * Default layout settings
 */
const DEFAULT_SPACING = 50
const DEFAULT_ELEMENT_WIDTH = 150
const DEFAULT_ELEMENT_HEIGHT = 80

/**
 * Find a good position for a new element relative to existing elements
 */
export function findAvailablePosition(
  elements: readonly ExcalidrawElement[],
  referenceElement?: ExcalidrawElement,
  direction: 'right' | 'below' | 'left' | 'above' = 'right',
  spacing = DEFAULT_SPACING
): ElementPosition {
  // If no reference, position relative to all elements
  if (!referenceElement) {
    const bbox = getBoundingBox(elements.filter((e) => !e.isDeleted))
    if (!bbox) {
      // Empty canvas - start at center-ish
      return { x: 100, y: 100 }
    }

    // Position to the right of all elements
    return {
      x: bbox.x + bbox.width + spacing,
      y: bbox.y,
    }
  }

  // Position relative to reference element
  switch (direction) {
    case 'right':
      return {
        x: referenceElement.x + referenceElement.width + spacing,
        y: referenceElement.y,
      }
    case 'below':
      return {
        x: referenceElement.x,
        y: referenceElement.y + referenceElement.height + spacing,
      }
    case 'left':
      return {
        x: referenceElement.x - DEFAULT_ELEMENT_WIDTH - spacing,
        y: referenceElement.y,
      }
    case 'above':
      return {
        x: referenceElement.x,
        y: referenceElement.y - DEFAULT_ELEMENT_HEIGHT - spacing,
      }
  }
}

/**
 * Calculate positions for multiple new elements in a row/column
 */
export function calculateLinearLayout(
  count: number,
  startPosition: ElementPosition,
  options: LayoutOptions = {}
): ElementPosition[] {
  const {
    direction = 'horizontal',
    spacing = DEFAULT_SPACING,
  } = options

  const positions: ElementPosition[] = []

  for (let i = 0; i < count; i++) {
    if (direction === 'horizontal') {
      positions.push({
        x: startPosition.x + i * (DEFAULT_ELEMENT_WIDTH + spacing),
        y: startPosition.y,
      })
    } else {
      positions.push({
        x: startPosition.x,
        y: startPosition.y + i * (DEFAULT_ELEMENT_HEIGHT + spacing),
      })
    }
  }

  return positions
}

/**
 * Calculate positions for elements in a grid
 */
export function calculateGridLayout(
  count: number,
  startPosition: ElementPosition,
  options: LayoutOptions = {}
): ElementPosition[] {
  const {
    spacing = DEFAULT_SPACING,
    columns = Math.ceil(Math.sqrt(count)),
  } = options

  const positions: ElementPosition[] = []

  for (let i = 0; i < count; i++) {
    const col = i % columns
    const row = Math.floor(i / columns)

    positions.push({
      x: startPosition.x + col * (DEFAULT_ELEMENT_WIDTH + spacing),
      y: startPosition.y + row * (DEFAULT_ELEMENT_HEIGHT + spacing),
    })
  }

  return positions
}

/**
 * Calculate positions for elements in a radial/circular pattern
 */
export function calculateRadialLayout(
  count: number,
  centerPosition: ElementPosition,
  radius = 200
): ElementPosition[] {
  const positions: ElementPosition[] = []
  const angleStep = (2 * Math.PI) / count

  for (let i = 0; i < count; i++) {
    const angle = i * angleStep - Math.PI / 2 // Start from top
    positions.push({
      x: centerPosition.x + radius * Math.cos(angle) - DEFAULT_ELEMENT_WIDTH / 2,
      y: centerPosition.y + radius * Math.sin(angle) - DEFAULT_ELEMENT_HEIGHT / 2,
    })
  }

  return positions
}

/**
 * Calculate position for a child element branching from parent
 */
export function calculateBranchPosition(
  parentElement: ExcalidrawElement,
  existingChildren: ExcalidrawElement[],
  direction: 'right' | 'below' = 'right',
  spacing = DEFAULT_SPACING
): ElementPosition {
  const parentCenter = {
    x: parentElement.x + parentElement.width / 2,
    y: parentElement.y + parentElement.height / 2,
  }

  const childCount = existingChildren.length

  if (direction === 'right') {
    // Fan out vertically to the right
    const startY = parentCenter.y - ((childCount * (DEFAULT_ELEMENT_HEIGHT + spacing)) / 2)
    return {
      x: parentElement.x + parentElement.width + spacing * 2,
      y: startY + childCount * (DEFAULT_ELEMENT_HEIGHT + spacing),
    }
  } else {
    // Fan out horizontally below
    const startX = parentCenter.x - ((childCount * (DEFAULT_ELEMENT_WIDTH + spacing)) / 2)
    return {
      x: startX + childCount * (DEFAULT_ELEMENT_WIDTH + spacing),
      y: parentElement.y + parentElement.height + spacing * 2,
    }
  }
}

/**
 * Calculate center point of a bounding box
 */
export function calculateCenter(elements: readonly ExcalidrawElement[]): ElementPosition | null {
  const bbox = getBoundingBox(elements)
  if (!bbox) return null

  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2,
  }
}

/**
 * Auto-arrange elements to avoid overlaps
 * Simple force-directed approach
 */
export function arrangeElements(
  elements: ExcalidrawElement[],
  fixedIds: Set<string> = new Set()
): Map<string, ElementPosition> {
  const positions = new Map<string, ElementPosition>()
  const padding = 20

  // Initialize positions
  elements.forEach((e) => {
    positions.set(e.id, { x: e.x, y: e.y })
  })

  // Simple overlap resolution - push elements apart
  const iterations = 50
  for (let iter = 0; iter < iterations; iter++) {
    let moved = false

    for (let i = 0; i < elements.length; i++) {
      const e1 = elements[i]
      if (fixedIds.has(e1.id)) continue

      const pos1 = positions.get(e1.id)!

      for (let j = i + 1; j < elements.length; j++) {
        const e2 = elements[j]
        const pos2 = positions.get(e2.id)!

        // Check for overlap
        const overlap = checkOverlap(
          pos1.x, pos1.y, e1.width, e1.height,
          pos2.x, pos2.y, e2.width, e2.height,
          padding
        )

        if (overlap) {
          moved = true

          // Calculate push direction
          const dx = (pos1.x + e1.width / 2) - (pos2.x + e2.width / 2)
          const dy = (pos1.y + e1.height / 2) - (pos2.y + e2.height / 2)
          const dist = Math.sqrt(dx * dx + dy * dy) || 1

          const pushX = (dx / dist) * 10
          const pushY = (dy / dist) * 10

          if (!fixedIds.has(e1.id)) {
            positions.set(e1.id, { x: pos1.x + pushX, y: pos1.y + pushY })
          }
          if (!fixedIds.has(e2.id)) {
            positions.set(e2.id, { x: pos2.x - pushX, y: pos2.y - pushY })
          }
        }
      }
    }

    if (!moved) break
  }

  return positions
}

/**
 * Check if two rectangles overlap
 */
function checkOverlap(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number,
  padding = 0
): boolean {
  return !(
    x1 + w1 + padding < x2 ||
    x2 + w2 + padding < x1 ||
    y1 + h1 + padding < y2 ||
    y2 + h2 + padding < y1
  )
}

/**
 * Calculate optimal arrow path between two elements
 */
export function calculateArrowPath(
  from: ExcalidrawElement,
  to: ExcalidrawElement
): { start: ElementPosition; end: ElementPosition } {
  const fromCenter = {
    x: from.x + from.width / 2,
    y: from.y + from.height / 2,
  }
  const toCenter = {
    x: to.x + to.width / 2,
    y: to.y + to.height / 2,
  }

  // Determine which edges to connect
  const dx = toCenter.x - fromCenter.x
  const dy = toCenter.y - fromCenter.y

  let startX: number, startY: number, endX: number, endY: number

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection
    if (dx > 0) {
      // To is on the right
      startX = from.x + from.width
      startY = fromCenter.y
      endX = to.x
      endY = toCenter.y
    } else {
      // To is on the left
      startX = from.x
      startY = fromCenter.y
      endX = to.x + to.width
      endY = toCenter.y
    }
  } else {
    // Vertical connection
    if (dy > 0) {
      // To is below
      startX = fromCenter.x
      startY = from.y + from.height
      endX = toCenter.x
      endY = to.y
    } else {
      // To is above
      startX = fromCenter.x
      startY = from.y
      endX = toCenter.x
      endY = to.y + to.height
    }
  }

  return {
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
  }
}
