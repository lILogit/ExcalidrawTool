/**
 * N8N Element Creator
 * Converts N8N webhook responses into proper Excalidraw elements
 * Supports both full element objects and simplified descriptions
 */

import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { canvasManipulator } from './canvasManipulator'

/**
 * Simplified element description from N8N
 */
export interface N8NElementDescription {
  // Element type
  type?: 'rectangle' | 'ellipse' | 'diamond' | 'text' | 'arrow' | 'line'
  // Position
  x?: number
  y?: number
  width?: number
  height?: number
  // Text content (for text elements or labels)
  text?: string
  label?: string
  // Style
  strokeColor?: string
  backgroundColor?: string
  strokeWidth?: number
  fontSize?: number
  fontFamily?: number
  // Connections
  fromId?: string
  toId?: string
  // For arrows: start and end positions
  points?: Array<[number, number]>
  // Optional: Full element object (for advanced use)
  element?: Partial<ExcalidrawElement>
}

/**
 * Enhanced N8N response that supports element descriptions
 */
export interface EnhancedN8NWebhookResponse {
  success: boolean
  message?: string
  // Elements to create (can be full elements or descriptions)
  elements?: (ExcalidrawElement | N8NElementDescription)[]
  // Elements to delete by ID
  elementsToDelete?: string[]
  // Error message if request failed
  error?: string
}

/**
 * Generate a valid Excalidraw element from a description
 * Returns an array because shapes with text require both a shape element AND a text element
 */
export function createElementFromDescription(
  desc: N8NElementDescription,
  allElements: ExcalidrawElement[]
): ExcalidrawElement[] {
  // If full element is provided, validate and enhance it
  if (desc.element) {
    const enhanced = validateAndEnhanceElement(desc.element, allElements)
    return [enhanced]
  }

  // Generate from description
  const type = desc.type || 'rectangle'
  const x = desc.x ?? 100
  const y = desc.y ?? 100
  const width = desc.width ?? 150
  const height = desc.height ?? 80

  // Generate unique ID
  const id = `n8n_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  // Common base properties
  const baseElement: Partial<ExcalidrawElement> = {
    id,
    type: type as ExcalidrawElement['type'],
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: desc.strokeColor || '#1e1e1e',
    backgroundColor: desc.backgroundColor || 'transparent',
    strokeWidth: desc.strokeWidth ?? 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    seed: Math.floor(Math.random() * 2147483647),
    version: 1,
    versionNonce: Math.floor(Math.random() * 2147483647),
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

  // Type-specific properties
  switch (type) {
    case 'rectangle':
    case 'ellipse':
    case 'diamond':
      // Handle shapes with optional text
      if (desc.text || desc.label) {
        const textId = `n8n_text_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        const textElement: Partial<ExcalidrawElement> = {
          id: textId,
          type: 'text',
          // Position at center - Excalidraw will handle positioning when autoResize is true
          x: x,
          y: y,
          width: width,
          height: height,
          text: desc.text || desc.label || '',
          originalText: desc.text || desc.label || '',
          fontSize: desc.fontSize || 16,
          fontFamily: desc.fontFamily || 1,
          textAlign: 'center',
          verticalAlign: 'middle',
          containerId: id,
          autoResize: true,
          lineHeight: 1.25,
          strokeColor: desc.strokeColor || '#1e1e1e',
          backgroundColor: 'transparent',
          angle: 0,
          roughness: 1,
          opacity: 100,
          seed: Math.floor(Math.random() * 2147483647),
          version: 1,
          versionNonce: Math.floor(Math.random() * 2147483647),
          isDeleted: false,
          groupIds: [],
          frameId: null,
          boundElements: null,
          link: null,
          locked: false,
          index: null,
        }

        // Add bound text to shape
        baseElement.boundElements = [{ id: textId, type: 'text' }]
        // Return BOTH the shape and text element
        return [baseElement as ExcalidrawElement, textElement as ExcalidrawElement]
      }
      break

    case 'text':
      baseElement.text = desc.text || desc.label || ''
      baseElement.originalText = baseElement.text
      baseElement.fontSize = desc.fontSize || 20
      baseElement.fontFamily = desc.fontFamily || 1
      baseElement.textAlign = 'left'
      baseElement.verticalAlign = 'top'
      baseElement.containerId = null
      baseElement.autoResize = true
      baseElement.lineHeight = 1.25
      break

    case 'arrow':
    case 'line':
      // Handle arrows and lines
      if (desc.points && desc.points.length >= 2) {
        const points = desc.points
        const start = points[0]
        const end = points[points.length - 1]

        baseElement.points = points.map(p => [...p])
        baseElement.x = start[0]
        baseElement.y = start[1]
        baseElement.width = end[0] - start[0]
        baseElement.height = end[1] - start[1]

        // Arrow-specific properties
        if (type === 'arrow') {
          baseElement.startArrowhead = null
          baseElement.endArrowhead = 'arrow'
          baseElement.elbowed = false
          baseElement.startBinding = null
          baseElement.endBinding = null
        }
      }

      // If it's a connection between elements
      if (desc.fromId && desc.toId) {
        const fromElement = allElements.find(e => e.id === desc.fromId)
        const toElement = allElements.find(e => e.id === desc.toId)

        if (fromElement && toElement) {
          // Calculate connection points
          const fromCenter = {
            x: fromElement.x + fromElement.width / 2,
            y: fromElement.y + fromElement.height / 2,
          }
          const toCenter = {
            x: toElement.x + toElement.width / 2,
            y: toElement.y + toElement.height / 2,
          }

          // Use canvasManipulator for proper connection creation
          const connectionId = canvasManipulator.addConnection(
            desc.fromId,
            desc.toId,
            {
              label: desc.label,
              strokeColor: desc.strokeColor,
            }
          )

          // Return the connection element
          const connectionElement = canvasManipulator.getElementById(connectionId)
          if (connectionElement) {
            return [connectionElement]
          }
        }
      }
      break
  }

  return [baseElement as ExcalidrawElement]
}

/**
 * Validate and enhance an existing element to ensure it has all required fields
 */
function validateAndEnhanceElement(
  element: Partial<ExcalidrawElement>,
  allElements: ExcalidrawElement[]
): ExcalidrawElement {
  const now = Date.now()
  const seed = Math.floor(Math.random() * 2147483647)

  // Required defaults
  const defaults: Partial<ExcalidrawElement> = {
    id: element.id || `n8n_${now}_${Math.random().toString(36).substring(2, 9)}`,
    type: element.type || 'rectangle',
    x: element.x ?? 100,
    y: element.y ?? 100,
    width: element.width ?? 150,
    height: element.height ?? 100,
    angle: element.angle ?? 0,
    strokeColor: element.strokeColor || '#1e1e1e',
    backgroundColor: element.backgroundColor || 'transparent',
    fillStyle: element.fillStyle || 'solid',
    strokeWidth: element.strokeWidth ?? 2,
    strokeStyle: element.strokeStyle || 'solid',
    roughness: element.roughness ?? 1,
    opacity: element.opacity ?? 100,
    seed: element.seed ?? seed,
    version: element.version ?? 1,
    versionNonce: element.versionNonce ?? seed,
    isDeleted: false,
    groupIds: element.groupIds || [],
    frameId: element.frameId || null,
    boundElements: element.boundElements || null,
    updated: now,
    link: element.link || null,
    locked: element.locked || false,
    index: element.index || null,
    roundness: element.roundness || { type: 3 },
  }

  // Text element specific
  if (defaults.type === 'text') {
    defaults.text = element.text || ''
    defaults.originalText = element.originalText || element.text || ''
    defaults.fontSize = element.fontSize || 20
    defaults.fontFamily = element.fontFamily || 1
    defaults.textAlign = element.textAlign || 'left'
    defaults.verticalAlign = element.verticalAlign || 'top'
    defaults.containerId = element.containerId || null
    defaults.autoResize = element.autoResize ?? true
    defaults.lineHeight = element.lineHeight || 1.25
  }

  // Arrow/line specific
  if (defaults.type === 'arrow' || defaults.type === 'line') {
    defaults.points = element.points || [[0, 0], [100, 100]]
    defaults.startArrowhead = element.startArrowhead ?? null
    defaults.endArrowhead = element.endArrowhead ?? (defaults.type === 'arrow' ? 'arrow' : null)
    defaults.elbowed = element.elbowed ?? false
    defaults.startBinding = element.startBinding || null
    defaults.endBinding = element.endBinding || null
  }

  return { ...defaults, ...element } as ExcalidrawElement
}

/**
 * Create element from text description using natural language
 */
export function createElementFromTextDescription(
  description: string,
  allElements: ExcalidrawElement[]
): { element: ExcalidrawElement; type: string }[] {
  const elements: { element: ExcalidrawElement; type: string }[] = []

  // Parse natural language description
  const desc = description.toLowerCase()

  // Determine element type
  let elementType: 'rectangle' | 'ellipse' | 'diamond' | 'text' = 'rectangle'
  if (desc.includes('ellipse') || desc.includes('circle') || desc.includes('oval')) {
    elementType = 'ellipse'
  } else if (desc.includes('diamond') || desc.includes('decision') || desc.includes('rhombus')) {
    elementType = 'diamond'
  } else if (desc.includes('text')) {
    elementType = 'text'
  }

  // Extract text content (in quotes or after "text:" or "label:")
  const textMatch = description.match(/["']([^"']+)["']|text[:\s]+([^\n,\.]+)/i)
  const text = textMatch ? (textMatch[1] || textMatch[2]).trim() : ''

  // Extract color (hex codes or color names)
  const colorMatch = description.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|(red|blue|green|yellow|orange|purple|pink|brown|black|white|gray|grey)/i)
  const strokeColor = colorMatch ? colorMatch[0] : '#1e1e1e'

  // Extract position (e.g., "at 100,200" or "position: 100x200")
  const posMatch = description.match(/(?:at|position)[:\s]*(\d+)[,\sx]+(\d+)/i)
  const x = posMatch ? parseInt(posMatch[1]) : 100
  const y = posMatch ? parseInt(posMatch[2]) : 100

  // Extract size (e.g., "size: 200x100" or "200 by 100")
  const sizeMatch = description.match(/size[:\s]*(\d+)[x by]+(\d+)/i)
  const width = sizeMatch ? parseInt(sizeMatch[1]) : 150
  const height = sizeMatch ? parseInt(sizeMatch[2]) : 80

  // Create element
  if (elementType === 'text') {
    const textElement: Partial<ExcalidrawElement> = {
      id: `n8n_text_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: 'text',
      x,
      y,
      width: text.length * 12, // Approximate width
      height: 24,
      text: text || 'New Text',
      originalText: text || 'New Text',
      fontSize: 20,
      fontFamily: 1,
      textAlign: 'left',
      verticalAlign: 'top',
      containerId: null,
      autoResize: true,
      lineHeight: 1.25,
      strokeColor,
      backgroundColor: 'transparent',
      angle: 0,
      roughness: 1,
      opacity: 100,
      seed: Math.floor(Math.random() * 2147483647),
      version: 1,
      versionNonce: Math.floor(Math.random() * 2147483647),
      isDeleted: false,
      groupIds: [],
      frameId: null,
      boundElements: null,
      link: null,
      locked: false,
      index: null,
    }
    elements.push({ element: textElement as ExcalidrawElement, type: 'text' })
  } else {
    // Shape with optional text
    const shapeElement: Partial<ExcalidrawElement> = {
      id: `n8n_${elementType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: elementType,
      x,
      y,
      width,
      height,
      strokeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      seed: Math.floor(Math.random() * 2147483647),
      version: 1,
      versionNonce: Math.floor(Math.random() * 2147483647),
      isDeleted: false,
      groupIds: [],
      frameId: null,
      boundElements: null,
      link: null,
      locked: false,
      index: null,
      roundness: { type: 3 },
    }

    // Add text if specified
    if (text && elementType !== 'text') {
      const textId = `n8n_text_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      const textElement: Partial<ExcalidrawElement> = {
        id: textId,
        type: 'text',
        x: x + width / 2,
        y: y + height / 2,
        width: width - 20,
        height: 20,
        text,
        originalText: text,
        fontSize: 16,
        fontFamily: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
        containerId: shapeElement.id,
        autoResize: true,
        lineHeight: 1.25,
        strokeColor,
        backgroundColor: 'transparent',
        angle: 0,
        roughness: 1,
        opacity: 100,
        seed: Math.floor(Math.random() * 2147483647),
        version: 1,
        versionNonce: Math.floor(Math.random() * 2147483647),
        isDeleted: false,
        groupIds: [],
        frameId: null,
        boundElements: null,
        link: null,
        locked: false,
        index: null,
      }

      shapeElement.boundElements = [{ id: textId, type: 'text' }]
      elements.push({ element: textElement as ExcalidrawElement, type: 'text' })
    }

    elements.push({ element: shapeElement as ExcalidrawElement, type: elementType })
  }

  return elements
}

/**
 * Process N8N response and create proper Excalidraw elements
 */
export function processN8NResponse(
  response: EnhancedN8NWebhookResponse,
  allElements: ExcalidrawElement[]
): {
  elements: ExcalidrawElement[]
  created: string[]
  updated: string[]
  deleted: string[]
} {
  const result = {
    elements: [] as ExcalidrawElement[],
    created: [] as string[],
    updated: [] as string[],
    deleted: response.elementsToDelete || [],
  }

  if (response.elements && response.elements.length > 0) {
    // Track existing elements for update detection
    const existingIds = new Set(allElements.map(e => e.id))

    for (const item of response.elements) {
      if ('type' in item && typeof item.type === 'string') {
        // This is an N8NElementDescription
        const elements = createElementFromDescription(item as N8NElementDescription, allElements)
        // createElementFromDescription now returns an array (may contain shape + text elements)
        for (const element of elements) {
          if (element) {
            result.elements.push(element)
            result.created.push(element.id)
          }
        }
      } else if ('id' in item) {
        // This is a full ExcalidrawElement
        const enhancedElement = validateAndEnhanceElement(item as Partial<ExcalidrawElement>, allElements)
        if (existingIds.has(enhancedElement.id)) {
          result.elements.push(enhancedElement)
          result.updated.push(enhancedElement.id)
        } else {
          result.elements.push(enhancedElement)
          result.created.push(enhancedElement.id)
        }
      }
    }
  }

  return result
}

/**
 * Validate N8N response structure
 */
export function validateN8NResponse(
  response: unknown
): { valid: boolean; errors: string[]; response?: EnhancedN8NWebhookResponse } {
  const errors: string[] = []

  if (!response || typeof response !== 'object') {
    return {
      valid: false,
      errors: ['Response must be an object'],
    }
  }

  const resp = response as Record<string, unknown>

  // Check success field
  if (resp.success !== undefined && typeof resp.success !== 'boolean') {
    errors.push('success must be a boolean')
  }

  // Check elements array
  if (resp.elements !== undefined) {
    if (!Array.isArray(resp.elements)) {
      errors.push('elements must be an array')
    }
  }

  // Check elementsToDelete array
  if (resp.elementsToDelete !== undefined) {
    if (!Array.isArray(resp.elementsToDelete)) {
      errors.push('elementsToDelete must be an array')
    } else if (!resp.elementsToDelete.every(id => typeof id === 'string')) {
      errors.push('elementsToDelete must contain only strings')
    }
  }

  // Check message
  if (resp.message !== undefined && typeof resp.message !== 'string') {
    errors.push('message must be a string')
  }

  // Check error
  if (resp.error !== undefined && typeof resp.error !== 'string') {
    errors.push('error must be a string')
  }

  return {
    valid: errors.length === 0,
    errors,
    response: errors.length === 0 ? resp as EnhancedN8NWebhookResponse : undefined,
  }
}
