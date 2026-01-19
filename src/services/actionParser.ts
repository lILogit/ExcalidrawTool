import { canvasManipulator, type ElementStyle } from './canvasManipulator'
import { findAvailablePosition, calculateBranchPosition } from '@/utils/layoutUtils'
import { useSelectionStore } from '@/store/selectionStore'
import type { ExcalidrawElement } from '@/types'

/**
 * Canvas action types
 */
export type CanvasActionType =
  | 'add_rectangle'
  | 'add_ellipse'
  | 'add_diamond'
  | 'add_text'
  | 'add_arrow'
  | 'add_connection'
  | 'update_text'
  | 'update_style'
  | 'delete_element'
  | 'move_element'
  | 'group_elements'

/**
 * Base action interface
 */
interface BaseAction {
  type: CanvasActionType
  id?: string // Optional ID for the created element
}

/**
 * Add shape action
 */
export interface AddShapeAction extends BaseAction {
  type: 'add_rectangle' | 'add_ellipse' | 'add_diamond'
  position?: { x: number; y: number }
  size?: { width: number; height: number }
  style?: ElementStyle
  relativeTo?: string // Element ID to position relative to
  direction?: 'right' | 'below' | 'left' | 'above'
}

/**
 * Add text action
 */
export interface AddTextAction extends BaseAction {
  type: 'add_text'
  text: string
  position?: { x: number; y: number }
  relativeTo?: string
  direction?: 'right' | 'below' | 'left' | 'above'
  style?: ElementStyle & {
    fontSize?: number
    fontFamily?: number
  }
}

/**
 * Add arrow action
 */
export interface AddArrowAction extends BaseAction {
  type: 'add_arrow'
  from: { x: number; y: number } | string // Position or element ID
  to: { x: number; y: number } | string
  label?: string
  style?: ElementStyle
}

/**
 * Add connection action (arrow between elements)
 */
export interface AddConnectionAction extends BaseAction {
  type: 'add_connection'
  fromId: string
  toId: string
  label?: string
}

/**
 * Update text action
 */
export interface UpdateTextAction extends BaseAction {
  type: 'update_text'
  targetId: string
  text: string
}

/**
 * Update style action
 */
export interface UpdateStyleAction extends BaseAction {
  type: 'update_style'
  targetId: string
  style: ElementStyle
}

/**
 * Delete element action
 */
export interface DeleteElementAction extends BaseAction {
  type: 'delete_element'
  targetId: string
}

/**
 * Move element action
 */
export interface MoveElementAction extends BaseAction {
  type: 'move_element'
  targetId: string
  position?: { x: number; y: number }
  delta?: { x: number; y: number }
}

/**
 * Group elements action
 */
export interface GroupElementsAction extends BaseAction {
  type: 'group_elements'
  elementIds: string[]
}

/**
 * Union of all action types
 */
export type CanvasAction =
  | AddShapeAction
  | AddTextAction
  | AddArrowAction
  | AddConnectionAction
  | UpdateTextAction
  | UpdateStyleAction
  | DeleteElementAction
  | MoveElementAction
  | GroupElementsAction

/**
 * Action execution result
 */
export interface ActionResult {
  success: boolean
  action: CanvasAction
  elementId?: string
  error?: string
}

/**
 * AI response format for canvas actions
 */
export interface AICanvasResponse {
  actions: CanvasAction[]
  explanation?: string
}

/**
 * Execute a single canvas action
 */
export function executeAction(action: CanvasAction): ActionResult {
  try {
    const allElements = useSelectionStore.getState().allElements

    switch (action.type) {
      case 'add_rectangle':
      case 'add_ellipse':
      case 'add_diamond': {
        const shapeAction = action as AddShapeAction
        let position = shapeAction.position

        // Calculate position relative to another element
        if (!position && shapeAction.relativeTo) {
          const refElement = allElements.find((e) => e.id === shapeAction.relativeTo)
          if (refElement) {
            position = findAvailablePosition(
              allElements,
              refElement,
              shapeAction.direction ?? 'right'
            )
          }
        }

        // Default position if none specified
        if (!position) {
          position = findAvailablePosition(allElements)
        }

        const geometry = {
          ...position,
          width: shapeAction.size?.width ?? 150,
          height: shapeAction.size?.height ?? 80,
        }

        let elementId: string
        if (action.type === 'add_rectangle') {
          elementId = canvasManipulator.addRectangle(geometry, shapeAction.style)
        } else if (action.type === 'add_ellipse') {
          elementId = canvasManipulator.addEllipse(geometry, shapeAction.style)
        } else {
          elementId = canvasManipulator.addDiamond(geometry, shapeAction.style)
        }

        return { success: true, action, elementId }
      }

      case 'add_text': {
        const textAction = action as AddTextAction
        let position = textAction.position

        if (!position && textAction.relativeTo) {
          const refElement = allElements.find((e) => e.id === textAction.relativeTo)
          if (refElement) {
            position = findAvailablePosition(
              allElements,
              refElement,
              textAction.direction ?? 'right'
            )
          }
        }

        if (!position) {
          position = findAvailablePosition(allElements)
        }

        const elementId = canvasManipulator.addText(textAction.text, position, textAction.style)
        return { success: true, action, elementId }
      }

      case 'add_arrow': {
        const arrowAction = action as AddArrowAction
        let start: { x: number; y: number }
        let end: { x: number; y: number }

        // Resolve from position
        if (typeof arrowAction.from === 'string') {
          const fromElement = allElements.find((e) => e.id === arrowAction.from)
          if (!fromElement) {
            return { success: false, action, error: `Element ${arrowAction.from} not found` }
          }
          start = {
            x: fromElement.x + fromElement.width,
            y: fromElement.y + fromElement.height / 2,
          }
        } else {
          start = arrowAction.from
        }

        // Resolve to position
        if (typeof arrowAction.to === 'string') {
          const toElement = allElements.find((e) => e.id === arrowAction.to)
          if (!toElement) {
            return { success: false, action, error: `Element ${arrowAction.to} not found` }
          }
          end = {
            x: toElement.x,
            y: toElement.y + toElement.height / 2,
          }
        } else {
          end = arrowAction.to
        }

        const elementId = canvasManipulator.addArrow(start, end, {
          ...arrowAction.style,
          endArrowhead: 'arrow',
        })
        return { success: true, action, elementId }
      }

      case 'add_connection': {
        const connAction = action as AddConnectionAction
        const elementId = canvasManipulator.addConnection(
          connAction.fromId,
          connAction.toId,
          connAction.label ? { label: connAction.label } : undefined
        )
        if (elementId) {
          return { success: true, action, elementId }
        }
        return { success: false, action, error: 'Failed to create connection' }
      }

      case 'update_text': {
        const updateAction = action as UpdateTextAction
        const success = canvasManipulator.updateText(updateAction.targetId, updateAction.text)
        return { success, action, error: success ? undefined : 'Failed to update text' }
      }

      case 'update_style': {
        const styleAction = action as UpdateStyleAction
        const success = canvasManipulator.setStyle(styleAction.targetId, styleAction.style)
        return { success, action, error: success ? undefined : 'Failed to update style' }
      }

      case 'delete_element': {
        const deleteAction = action as DeleteElementAction
        const success = canvasManipulator.deleteElement(deleteAction.targetId)
        return { success, action, error: success ? undefined : 'Element not found' }
      }

      case 'move_element': {
        const moveAction = action as MoveElementAction
        let success = false

        if (moveAction.delta) {
          success = canvasManipulator.moveElement(
            moveAction.targetId,
            moveAction.delta.x,
            moveAction.delta.y
          )
        } else if (moveAction.position) {
          const element = allElements.find((e) => e.id === moveAction.targetId)
          if (element) {
            success = canvasManipulator.moveElement(
              moveAction.targetId,
              moveAction.position.x - element.x,
              moveAction.position.y - element.y
            )
          }
        }

        return { success, action, error: success ? undefined : 'Failed to move element' }
      }

      case 'group_elements': {
        const groupAction = action as GroupElementsAction
        const groupId = canvasManipulator.groupElements(groupAction.elementIds)
        return {
          success: !!groupId,
          action,
          elementId: groupId ?? undefined,
          error: groupId ? undefined : 'Failed to group elements',
        }
      }

      default:
        return { success: false, action, error: `Unknown action type: ${(action as CanvasAction).type}` }
    }
  } catch (error) {
    return {
      success: false,
      action,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Execute multiple actions in sequence
 */
export async function executeActions(
  actions: CanvasAction[],
  options: {
    delayBetween?: number
    onActionComplete?: (result: ActionResult, index: number) => void
    onError?: (result: ActionResult, index: number) => void
  } = {}
): Promise<ActionResult[]> {
  const results: ActionResult[] = []
  const { delayBetween = 100, onActionComplete, onError } = options

  for (let i = 0; i < actions.length; i++) {
    const result = executeAction(actions[i])
    results.push(result)

    if (result.success) {
      onActionComplete?.(result, i)
    } else {
      onError?.(result, i)
    }

    // Delay between actions for visual feedback
    if (delayBetween > 0 && i < actions.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetween))
    }
  }

  return results
}

/**
 * Parse AI JSON response into actions
 */
export function parseAIResponse(response: string): AICanvasResponse | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                      response.match(/\{[\s\S]*"actions"[\s\S]*\}/)

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0]
      return JSON.parse(jsonStr) as AICanvasResponse
    }

    // Try parsing the whole response as JSON
    return JSON.parse(response) as AICanvasResponse
  } catch {
    console.error('Failed to parse AI response as JSON')
    return null
  }
}

/**
 * Create expand concept actions for a selected element
 */
export function createExpandConceptActions(
  element: ExcalidrawElement,
  concepts: string[],
  allElements: ExcalidrawElement[]
): CanvasAction[] {
  const actions: CanvasAction[] = []
  const existingChildren = allElements.filter(
    (e) => e.boundElements?.some((b) => b.id === element.id)
  )

  concepts.forEach((concept, index) => {
    // Calculate position for new concept
    // Create mock elements for already-added shapes to avoid overlap
    const addedShapeCount = actions.filter((a) => a.type === 'add_rectangle').length
    const mockElements: ExcalidrawElement[] = Array(addedShapeCount).fill(null).map((_, i) => ({
      x: 0, y: 0, width: 140, height: 60, id: `temp_${i}`,
      type: 'rectangle', boundElements: null,
    } as unknown as ExcalidrawElement))

    const position = calculateBranchPosition(
      element,
      [...existingChildren, ...mockElements],
      'right',
      60
    )

    // Add shape with text
    const shapeId = `concept_${Date.now()}_${index}`
    actions.push({
      type: 'add_rectangle',
      id: shapeId,
      position,
      size: { width: 140, height: 60 },
      style: {
        backgroundColor: '#e8f5e9',
        strokeColor: '#4caf50',
      },
    })

    actions.push({
      type: 'add_text',
      text: concept,
      position: {
        x: position.x + 10,
        y: position.y + 20,
      },
      style: { fontSize: 14 },
    })

    // Add connection from parent to new concept
    actions.push({
      type: 'add_connection',
      fromId: element.id,
      toId: shapeId,
    })
  })

  return actions
}

/**
 * Create connection suggestion actions
 */
export function createConnectionActions(
  connections: Array<{ from: string; to: string; label?: string }>
): CanvasAction[] {
  return connections.map((conn) => ({
    type: 'add_connection' as const,
    fromId: conn.from,
    toId: conn.to,
    label: conn.label,
  }))
}
