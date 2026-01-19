import { canvasManipulator } from '@/services/canvasManipulator'

/**
 * Highlight color for AI-created elements
 */
const AI_HIGHLIGHT_COLOR = '#4CAF50'
const AI_HIGHLIGHT_STROKE_WIDTH = 3

/**
 * Temporarily highlight elements to show AI changes
 */
export async function highlightElements(
  elementIds: string[],
  options: {
    duration?: number
    color?: string
  } = {}
): Promise<void> {
  const { duration = 2000, color = AI_HIGHLIGHT_COLOR } = options

  if (elementIds.length === 0) return

  // Store original styles
  const originalStyles: Map<string, { strokeColor: string; strokeWidth: number }> = new Map()

  const elements = canvasManipulator.getElements()

  elementIds.forEach((id) => {
    const element = elements.find((e) => e.id === id)
    if (element) {
      originalStyles.set(id, {
        strokeColor: element.strokeColor,
        strokeWidth: element.strokeWidth,
      })

      // Apply highlight style
      canvasManipulator.updateElement(id, {
        strokeColor: color,
        strokeWidth: AI_HIGHLIGHT_STROKE_WIDTH,
      })
    }
  })

  // Don't scroll - keep canvas position unchanged

  // Restore original styles after duration
  await new Promise((resolve) => setTimeout(resolve, duration))

  originalStyles.forEach((style, id) => {
    canvasManipulator.updateElement(id, style)
  })
}

/**
 * Pulse animation effect using stroke width changes
 */
export async function pulseElements(
  elementIds: string[],
  options: {
    pulses?: number
    pulseDuration?: number
    color?: string
  } = {}
): Promise<void> {
  const { pulses = 2, pulseDuration = 300, color = AI_HIGHLIGHT_COLOR } = options

  if (elementIds.length === 0) return

  // Store original styles
  const originalStyles: Map<string, { strokeColor: string; strokeWidth: number }> = new Map()

  const elements = canvasManipulator.getElements()

  elementIds.forEach((id) => {
    const element = elements.find((e) => e.id === id)
    if (element) {
      originalStyles.set(id, {
        strokeColor: element.strokeColor,
        strokeWidth: element.strokeWidth,
      })
    }
  })

  // Perform pulse animation
  for (let i = 0; i < pulses; i++) {
    // Expand
    elementIds.forEach((id) => {
      canvasManipulator.updateElement(id, {
        strokeColor: color,
        strokeWidth: AI_HIGHLIGHT_STROKE_WIDTH + 2,
      })
    })

    await new Promise((resolve) => setTimeout(resolve, pulseDuration / 2))

    // Contract
    elementIds.forEach((id) => {
      canvasManipulator.updateElement(id, {
        strokeColor: color,
        strokeWidth: AI_HIGHLIGHT_STROKE_WIDTH,
      })
    })

    await new Promise((resolve) => setTimeout(resolve, pulseDuration / 2))
  }

  // Restore original styles
  originalStyles.forEach((style, id) => {
    canvasManipulator.updateElement(id, style)
  })
}

/**
 * Show a toast notification for AI actions
 */
export function showAIActionToast(
  message: string,
  type: 'success' | 'error' | 'info' = 'success'
): void {
  const emoji = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'
  canvasManipulator.showToast(`${emoji} ${message}`, 3000)
}

/**
 * Combined feedback: toast + highlight + scroll
 */
export async function showAIChangeFeedback(
  elementIds: string[],
  message: string,
  options: {
    highlightDuration?: number
    showPulse?: boolean
  } = {}
): Promise<void> {
  const { highlightDuration = 2000, showPulse = true } = options

  // Show toast
  showAIActionToast(message)

  if (elementIds.length === 0) return

  // Don't scroll - keep canvas position unchanged

  // Show pulse or highlight
  if (showPulse) {
    await pulseElements(elementIds, { pulses: 2, pulseDuration: 300 })
    await highlightElements(elementIds, { duration: highlightDuration - 600 })
  } else {
    await highlightElements(elementIds, { duration: highlightDuration })
  }
}
