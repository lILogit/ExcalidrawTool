import type { ExcalidrawElement } from '@/types'

/**
 * Element type categories for easier classification
 */
export type ElementCategory = 'shape' | 'text' | 'connector' | 'drawing' | 'media' | 'container'

/**
 * Shape types that can contain text or be connected
 */
export const SHAPE_TYPES = ['rectangle', 'diamond', 'ellipse'] as const
export type ShapeType = (typeof SHAPE_TYPES)[number]

/**
 * Connector types (arrows and lines)
 */
export const CONNECTOR_TYPES = ['arrow', 'line'] as const
export type ConnectorType = (typeof CONNECTOR_TYPES)[number]

/**
 * Check if element is a shape (rectangle, diamond, ellipse)
 */
export function isShape(element: ExcalidrawElement): boolean {
  return SHAPE_TYPES.includes(element.type as ShapeType)
}

/**
 * Check if element is a text element
 */
export function isText(element: ExcalidrawElement): boolean {
  return element.type === 'text'
}

/**
 * Check if element is a connector (arrow or line)
 */
export function isConnector(element: ExcalidrawElement): boolean {
  return CONNECTOR_TYPES.includes(element.type as ConnectorType)
}

/**
 * Check if element is an arrow
 */
export function isArrow(element: ExcalidrawElement): boolean {
  return element.type === 'arrow'
}

/**
 * Check if element is a freedraw element
 */
export function isFreedraw(element: ExcalidrawElement): boolean {
  return element.type === 'freedraw'
}

/**
 * Check if element is an image
 */
export function isImage(element: ExcalidrawElement): boolean {
  return element.type === 'image'
}

/**
 * Check if element is a frame or magic frame
 */
export function isFrame(element: ExcalidrawElement): boolean {
  return element.type === 'frame' || element.type === 'magicframe'
}

/**
 * Get the category of an element
 */
export function getElementCategory(element: ExcalidrawElement): ElementCategory {
  if (isShape(element)) return 'shape'
  if (isText(element)) return 'text'
  if (isConnector(element)) return 'connector'
  if (isFreedraw(element)) return 'drawing'
  if (isImage(element)) return 'media'
  if (isFrame(element)) return 'container'
  return 'shape' // Default fallback
}

/**
 * Tag extracted from element text
 */
export interface ElementTag {
  tag: string // The tag without # prefix
  elementId: string
  elementType: string
  context?: string // Surrounding text for context
}

/**
 * Extract #tags from text content
 * Supports: #tag, #multi-word-tag, #tag_with_underscore
 */
export function extractTagsFromText(text: string): string[] {
  if (!text) return []
  const tagMatches = text.match(/#[\w-]+/g)
  return tagMatches ? tagMatches.map(t => t.substring(1)) : [] // Remove # prefix
}

/**
 * Extract all tags from an element
 */
export function extractElementTags(
  element: ExcalidrawElement,
  allElements: readonly ExcalidrawElement[]
): ElementTag[] {
  const text = getElementText(element, allElements)
  if (!text) return []

  const tags = extractTagsFromText(text)
  return tags.map(tag => ({
    tag,
    elementId: element.id,
    elementType: element.type,
    context: text.length > 100 ? text.substring(0, 100) + '...' : text,
  }))
}

/**
 * Extract all tags from multiple elements
 */
export function extractAllTags(
  elements: readonly ExcalidrawElement[],
  allElements: readonly ExcalidrawElement[]
): ElementTag[] {
  const allTags: ElementTag[] = []
  for (const element of elements) {
    allTags.push(...extractElementTags(element, allElements))
  }
  return allTags
}

/**
 * Get unique tags from elements
 */
export function getUniqueTags(
  elements: readonly ExcalidrawElement[],
  allElements: readonly ExcalidrawElement[]
): string[] {
  const tags = extractAllTags(elements, allElements)
  return [...new Set(tags.map(t => t.tag))]
}

/**
 * Find elements by tag
 */
export function findElementsByTag(
  tag: string,
  allElements: readonly ExcalidrawElement[]
): ExcalidrawElement[] {
  return allElements.filter(element => {
    const tags = extractElementTags(element, allElements)
    return tags.some(t => t.tag.toLowerCase() === tag.toLowerCase())
  })
}

/**
 * Extracted element properties for AI context
 */
export interface ElementProperties {
  id: string
  type: string
  category: ElementCategory
  position: { x: number; y: number }
  size: { width: number; height: number }
  text?: string
  tags?: string[] // Extracted #tags
  style: {
    strokeColor: string
    backgroundColor: string
    fillStyle: string
    strokeWidth: number
    strokeStyle: string
    opacity: number
  }
  connections: {
    boundElements: string[]
    connectedTo?: string // For arrows: the element it points to
    connectedFrom?: string // For arrows: the element it comes from
  }
  groupIds: readonly string[]
  isLocked: boolean
}

/**
 * Extract properties from an element for AI context
 */
export function extractElementProperties(
  element: ExcalidrawElement,
  allElements?: readonly ExcalidrawElement[]
): ElementProperties {
  const base: ElementProperties = {
    id: element.id,
    type: element.type,
    category: getElementCategory(element),
    position: { x: element.x, y: element.y },
    size: { width: element.width, height: element.height },
    style: {
      strokeColor: element.strokeColor,
      backgroundColor: element.backgroundColor,
      fillStyle: element.fillStyle,
      strokeWidth: element.strokeWidth,
      strokeStyle: element.strokeStyle,
      opacity: element.opacity,
    },
    connections: {
      boundElements: element.boundElements?.map((b) => b.id) ?? [],
    },
    groupIds: element.groupIds,
    isLocked: element.locked,
  }

  // Extract text content for text elements
  if (element.type === 'text') {
    const textElement = element as ExcalidrawElement & { text?: string }
    base.text = textElement.text
    // Extract tags from text
    if (textElement.text) {
      base.tags = extractTagsFromText(textElement.text)
    }
  }

  // Extract text and tags from bound text elements
  if (allElements && element.boundElements) {
    const boundText = element.boundElements.find((b) => b.type === 'text')
    if (boundText) {
      const textElement = allElements.find((e) => e.id === boundText.id)
      if (textElement?.type === 'text') {
        const text = (textElement as ExcalidrawElement & { text?: string }).text
        if (text) {
          base.text = text
          base.tags = extractTagsFromText(text)
        }
      }
    }
  }

  // Extract connection info for arrows
  if (element.type === 'arrow' || element.type === 'line') {
    const linearElement = element as ExcalidrawElement & {
      startBinding?: { elementId: string } | null
      endBinding?: { elementId: string } | null
    }
    if (linearElement.startBinding) {
      base.connections.connectedFrom = linearElement.startBinding.elementId
    }
    if (linearElement.endBinding) {
      base.connections.connectedTo = linearElement.endBinding.elementId
    }
  }

  return base
}

/**
 * Get text content from an element (works for text elements and shapes with bound text)
 */
export function getElementText(
  element: ExcalidrawElement,
  allElements: readonly ExcalidrawElement[]
): string | undefined {
  console.log('[getElementText] Element:', element.id, element.type)

  // Direct text element
  if (element.type === 'text') {
    const textEl = element as ExcalidrawElement & { text?: string }
    console.log('[getElementText] Direct text element, text:', textEl.text)
    return textEl.text
  }

  // Shape with bound text
  console.log('[getElementText] Checking boundElements:', element.boundElements)
  const boundText = element.boundElements?.find((b) => b.type === 'text')
  if (boundText) {
    console.log('[getElementText] Found bound text ref:', boundText.id)
    const textElement = allElements.find((e) => e.id === boundText.id)
    console.log('[getElementText] Found text element:', textElement?.id, textElement?.type)
    if (textElement?.type === 'text') {
      const text = (textElement as ExcalidrawElement & { text?: string }).text
      console.log('[getElementText] Bound text content:', text)
      return text
    }
  }

  console.log('[getElementText] No text found')
  return undefined
}

/**
 * Relationship between elements
 */
export interface ElementRelationship {
  type: 'arrow_connection' | 'text_binding' | 'group' | 'frame_containment'
  sourceId: string
  targetId: string
  label?: string // For labeled arrows
}

/**
 * Detect relationships between selected elements
 */
export function detectRelationships(
  elements: readonly ExcalidrawElement[],
  allElements: readonly ExcalidrawElement[]
): ElementRelationship[] {
  const relationships: ElementRelationship[] = []
  const elementIds = new Set(elements.map((e) => e.id))

  for (const element of elements) {
    // Arrow connections
    if (element.type === 'arrow' || element.type === 'line') {
      const linearElement = element as ExcalidrawElement & {
        startBinding?: { elementId: string } | null
        endBinding?: { elementId: string } | null
      }

      if (linearElement.startBinding && linearElement.endBinding) {
        // Get arrow label if any
        const labelText = getElementText(element, allElements)

        relationships.push({
          type: 'arrow_connection',
          sourceId: linearElement.startBinding.elementId,
          targetId: linearElement.endBinding.elementId,
          label: labelText,
        })
      }
    }

    // Text bindings
    if (element.boundElements) {
      for (const bound of element.boundElements) {
        if (bound.type === 'text' && elementIds.has(bound.id)) {
          relationships.push({
            type: 'text_binding',
            sourceId: element.id,
            targetId: bound.id,
          })
        }
      }
    }

    // Group relationships
    if (element.groupIds.length > 0) {
      const groupedElements = elements.filter(
        (e) => e.id !== element.id && e.groupIds.some((g) => element.groupIds.includes(g))
      )
      for (const grouped of groupedElements) {
        // Only add once (avoid duplicates)
        if (element.id < grouped.id) {
          relationships.push({
            type: 'group',
            sourceId: element.id,
            targetId: grouped.id,
          })
        }
      }
    }

    // Frame containment
    if (element.frameId) {
      const frame = allElements.find((e) => e.id === element.frameId)
      if (frame && elementIds.has(frame.id)) {
        relationships.push({
          type: 'frame_containment',
          sourceId: element.frameId,
          targetId: element.id,
        })
      }
    }
  }

  return relationships
}

/**
 * Get center point of an element
 */
export function getElementCenter(element: ExcalidrawElement): { x: number; y: number } {
  return {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  }
}

/**
 * Get bounding box for multiple elements
 */
export function getBoundingBox(elements: readonly ExcalidrawElement[]): {
  x: number
  y: number
  width: number
  height: number
} | null {
  if (elements.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const element of elements) {
    minX = Math.min(minX, element.x)
    minY = Math.min(minY, element.y)
    maxX = Math.max(maxX, element.x + element.width)
    maxY = Math.max(maxY, element.y + element.height)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Serialize selection for AI context (human-readable description)
 */
export function serializeSelectionForAI(
  elements: readonly ExcalidrawElement[],
  allElements: readonly ExcalidrawElement[]
): string {
  if (elements.length === 0) {
    return 'No elements selected.'
  }

  const lines: string[] = []
  lines.push(`Selected ${elements.length} element(s):`)
  lines.push('')

  // Collect all tags for context section
  const allTags = extractAllTags(elements, allElements)
  const uniqueTags = [...new Set(allTags.map(t => t.tag))]

  // Group by type
  const byType = new Map<string, ExcalidrawElement[]>()
  for (const element of elements) {
    const existing = byType.get(element.type) ?? []
    existing.push(element)
    byType.set(element.type, existing)
  }

  for (const [type, typeElements] of byType) {
    lines.push(`## ${type.charAt(0).toUpperCase() + type.slice(1)}s (${typeElements.length}):`)
    for (const element of typeElements) {
      const text = getElementText(element, allElements)
      const tags = text ? extractTagsFromText(text) : []
      const textDesc = text ? ` - "${text}"` : ''
      const tagDesc = tags.length > 0 ? ` [${tags.map(t => '#' + t).join(', ')}]` : ''
      lines.push(`- ${element.id.slice(0, 8)}...${textDesc}${tagDesc}`)
    }
    lines.push('')
  }

  // Tags summary section
  if (uniqueTags.length > 0) {
    lines.push('## Tags/Context:')
    lines.push(`Found ${uniqueTags.length} tag(s): ${uniqueTags.map(t => '#' + t).join(', ')}`)
    lines.push('')

    // Group elements by tag for context
    for (const tag of uniqueTags) {
      const elementsWithTag = allTags.filter(t => t.tag === tag)
      lines.push(`### #${tag}`)
      for (const tagInfo of elementsWithTag) {
        lines.push(`- Element ${tagInfo.elementId.slice(0, 8)} (${tagInfo.elementType}): "${tagInfo.context}"`)
      }
    }
    lines.push('')
  }

  // Relationships
  const relationships = detectRelationships(elements, allElements)
  if (relationships.length > 0) {
    lines.push('## Relationships:')
    for (const rel of relationships) {
      switch (rel.type) {
        case 'arrow_connection':
          lines.push(`- Arrow: ${rel.sourceId.slice(0, 8)} → ${rel.targetId.slice(0, 8)}${rel.label ? ` (${rel.label})` : ''}`)
          break
        case 'text_binding':
          lines.push(`- Text bound to: ${rel.sourceId.slice(0, 8)}`)
          break
        case 'group':
          lines.push(`- Grouped: ${rel.sourceId.slice(0, 8)} & ${rel.targetId.slice(0, 8)}`)
          break
        case 'frame_containment':
          lines.push(`- Frame contains: ${rel.targetId.slice(0, 8)}`)
          break
      }
    }
  }

  return lines.join('\n')
}
