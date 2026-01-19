import { aiService } from './aiService'
import { useCanvasStore } from '@/store/canvasStore'
import { getElementText } from '@/utils/elementUtils'
import { executeActions, type CanvasAction } from './actionParser'
import { calculateBranchPosition } from '@/utils/layoutUtils'
import type { ExcalidrawElement } from '@/types'
import type { AIMessage } from '@/types'

/**
 * System prompt for text improvement actions
 */
const TEXT_IMPROVEMENT_PROMPT = `You are an AI assistant helping users improve text in visual diagrams.
Your task is to improve the wording of text elements while:
- Keeping the same meaning and intent
- Making text clearer and more concise
- Using professional language appropriate for diagrams
- Preserving any technical terms

Respond with ONLY the improved text, nothing else. No explanations, no quotes, just the improved text.
If the text is already good, return it unchanged.`

/**
 * Result of an AI action
 */
export interface AIActionResult {
  success: boolean
  elementId: string
  originalText: string
  newText?: string
  error?: string
}

/**
 * Update the text of an element on the canvas
 * Keeps the element position (x, y) unchanged - only updates text content
 */
function updateElementText(elementId: string, newText: string, originalText?: string): boolean {
  const api = useCanvasStore.getState().excalidrawAPI
  if (!api) {
    console.error('Excalidraw API not available')
    return false
  }

  const elements = api.getSceneElements()
  const element = elements.find((e) => e.id === elementId)

  if (!element) {
    console.error(`Element ${elementId} not found`)
    return false
  }

  // Show toast with before/after
  if (originalText && originalText !== newText) {
    const truncate = (s: string, len: number) => s.length > len ? s.slice(0, len) + '...' : s
    api.setToast({
      message: `"${truncate(originalText, 20)}" → "${truncate(newText, 20)}"`,
      duration: 3000,
      closable: true,
    })
  }

  // For text elements, update the text (let Excalidraw handle sizing with autoResize)
  if (element.type === 'text') {
    // Calculate approximate dimensions for the new text
    const textEl = element as ExcalidrawElement & { fontSize?: number; fontFamily?: number }
    const fontSize = textEl.fontSize || 20
    const lines = newText.split('\n')
    const maxLineLength = Math.max(...lines.map((l) => l.length))
    // Use generous width calculation to ensure all text fits
    // Multiply by 0.75 for wider fonts, add padding
    const newWidth = Math.max((maxLineLength * fontSize * 0.75) + 20, element.width)
    const newHeight = Math.max((lines.length * fontSize * 1.5) + 10, element.height)

    const updatedElements = elements.map((e) => {
      if (e.id === elementId) {
        return {
          ...e,
          text: newText,
          originalText: newText,
          width: newWidth,
          height: newHeight,
          autoResize: true,
          version: e.version + 1,
          versionNonce: Math.floor(Math.random() * 2147483647),
        }
      }
      return e
    })

    api.updateScene({ elements: updatedElements })
    return true
  }

  // For shapes with bound text, update the text (size is handled by container)
  if (element.boundElements) {
    const boundText = element.boundElements.find((b) => b.type === 'text')
    if (boundText) {
      const updatedElements = elements.map((e) => {
        if (e.id === boundText.id) {
          return {
            ...e,
            text: newText,
            originalText: newText,
            autoResize: true,
            version: e.version + 1,
            versionNonce: Math.floor(Math.random() * 2147483647),
          }
        }
        return e
      })

      api.updateScene({ elements: updatedElements })
      return true
    }
  }

  console.error(`Element ${elementId} has no text to update`)
  return false
}

/**
 * Update wording for selected elements using AI
 */
export async function updateWording(
  elements: ExcalidrawElement[],
  allElements: ExcalidrawElement[]
): Promise<AIActionResult[]> {
  console.log('[updateWording] Starting with', elements.length, 'elements')
  console.log('[updateWording] Elements:', elements.map(e => ({ id: e.id, type: e.type })))

  if (!aiService.isConfigured()) {
    console.error('[updateWording] AI service not configured')
    return elements.map((e) => ({
      success: false,
      elementId: e.id,
      originalText: '',
      error: 'AI service not configured. Set VITE_ANTHROPIC_API_KEY.',
    }))
  }

  const results: AIActionResult[] = []

  for (const element of elements) {
    console.log('[updateWording] Processing element:', element.id, element.type)
    const text = getElementText(element, allElements)
    console.log('[updateWording] Got text:', text)

    if (!text || text.trim().length === 0) {
      console.log('[updateWording] No text found for element')
      results.push({
        success: false,
        elementId: element.id,
        originalText: '',
        error: 'Element has no text content',
      })
      continue
    }

    try {
      const messages: AIMessage[] = [
        {
          role: 'user',
          content: `Improve this text: "${text}"`,
        },
      ]

      console.log('[updateWording] Calling AI service...')
      const response = await aiService.sendMessage(messages, TEXT_IMPROVEMENT_PROMPT)
      console.log('[updateWording] AI response:', response.content)
      const newText = response.content.trim()

      if (newText && newText !== text) {
        console.log('[updateWording] Updating element with new text:', newText)
        const updated = updateElementText(element.id, newText, text)
        console.log('[updateWording] Update result:', updated)
        results.push({
          success: updated,
          elementId: element.id,
          originalText: text,
          newText: updated ? newText : undefined,
          error: updated ? undefined : 'Failed to update element',
        })
      } else {
        console.log('[updateWording] Text unchanged or empty response')
        results.push({
          success: true,
          elementId: element.id,
          originalText: text,
          newText: text,
        })
      }
    } catch (error) {
      console.error('[updateWording] Error:', error)
      results.push({
        success: false,
        elementId: element.id,
        originalText: text,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  console.log('[updateWording] Results:', results)
  return results
}

/**
 * Make text more concise using AI
 */
export async function makeConcise(
  elements: ExcalidrawElement[],
  allElements: ExcalidrawElement[]
): Promise<AIActionResult[]> {
  const CONCISE_PROMPT = `You are an AI assistant helping users make text more concise in visual diagrams.
Your task is to shorten the text while preserving the core meaning.
- Remove unnecessary words
- Use shorter alternatives
- Keep essential information
- Aim for 50% or less of the original length when possible

Respond with ONLY the shortened text, nothing else.`

  if (!aiService.isConfigured()) {
    return elements.map((e) => ({
      success: false,
      elementId: e.id,
      originalText: '',
      error: 'AI service not configured',
    }))
  }

  const results: AIActionResult[] = []

  for (const element of elements) {
    const text = getElementText(element, allElements)

    if (!text) {
      results.push({
        success: false,
        elementId: element.id,
        originalText: '',
        error: 'Element has no text content',
      })
      continue
    }

    try {
      const messages: AIMessage[] = [
        {
          role: 'user',
          content: `Make this text more concise: "${text}"`,
        },
      ]

      const response = await aiService.sendMessage(messages, CONCISE_PROMPT)
      const newText = response.content.trim()

      if (newText && newText !== text) {
        const updated = updateElementText(element.id, newText, text)
        results.push({
          success: updated,
          elementId: element.id,
          originalText: text,
          newText: updated ? newText : undefined,
          error: updated ? undefined : 'Failed to update element',
        })
      } else {
        results.push({
          success: true,
          elementId: element.id,
          originalText: text,
          newText: text,
        })
      }
    } catch (error) {
      results.push({
        success: false,
        elementId: element.id,
        originalText: text,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

/**
 * Improve text clarity using AI
 */
export async function improveClarity(
  elements: ExcalidrawElement[],
  allElements: ExcalidrawElement[]
): Promise<AIActionResult[]> {
  const CLARITY_PROMPT = `You are an AI assistant helping users improve text clarity in visual diagrams.
Your task is to rewrite the text to be clearer and easier to understand.
- Use simpler words when possible
- Improve sentence structure
- Remove ambiguity
- Keep technical terms if they're important

Respond with ONLY the improved text, nothing else.`

  if (!aiService.isConfigured()) {
    return elements.map((e) => ({
      success: false,
      elementId: e.id,
      originalText: '',
      error: 'AI service not configured',
    }))
  }

  const results: AIActionResult[] = []

  for (const element of elements) {
    const text = getElementText(element, allElements)

    if (!text) {
      results.push({
        success: false,
        elementId: element.id,
        originalText: '',
        error: 'Element has no text content',
      })
      continue
    }

    try {
      const messages: AIMessage[] = [
        {
          role: 'user',
          content: `Improve the clarity of this text: "${text}"`,
        },
      ]

      const response = await aiService.sendMessage(messages, CLARITY_PROMPT)
      const newText = response.content.trim()

      if (newText && newText !== text) {
        const updated = updateElementText(element.id, newText, text)
        results.push({
          success: updated,
          elementId: element.id,
          originalText: text,
          newText: updated ? newText : undefined,
          error: updated ? undefined : 'Failed to update element',
        })
      } else {
        results.push({
          success: true,
          elementId: element.id,
          originalText: text,
          newText: text,
        })
      }
    } catch (error) {
      results.push({
        success: false,
        elementId: element.id,
        originalText: text,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

/**
 * Result of expand concept action
 */
export interface ExpandConceptResult {
  success: boolean
  elementId: string
  concepts: string[]
  createdElements: string[]
  error?: string
}

/**
 * Expand a concept by generating related ideas using AI
 */
export async function expandConcept(
  element: ExcalidrawElement,
  allElements: ExcalidrawElement[],
  options: {
    count?: number
    direction?: 'right' | 'below'
  } = {}
): Promise<ExpandConceptResult> {
  const { count = 3, direction = 'right' } = options

  if (!aiService.isConfigured()) {
    return {
      success: false,
      elementId: element.id,
      concepts: [],
      createdElements: [],
      error: 'AI service not configured. Set VITE_ANTHROPIC_API_KEY.',
    }
  }

  const text = getElementText(element, allElements)
  if (!text) {
    return {
      success: false,
      elementId: element.id,
      concepts: [],
      createdElements: [],
      error: 'Element has no text content to expand',
    }
  }

  const EXPAND_PROMPT = `You are an AI assistant helping users expand concepts in visual diagrams.
Given a concept, generate ${count} related sub-concepts or ideas that branch from it.

Rules:
- Each concept should be short (2-5 words)
- Concepts should be directly related to the parent
- Be specific and actionable
- No numbering or bullets

Respond with ONLY a JSON array of strings, nothing else.
Example: ["Related Idea 1", "Related Idea 2", "Related Idea 3"]`

  try {
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `Generate ${count} related concepts for: "${text}"`,
      },
    ]

    const response = await aiService.sendMessage(messages, EXPAND_PROMPT)

    // Parse the JSON array from response
    let concepts: string[]
    try {
      concepts = JSON.parse(response.content.trim())
      if (!Array.isArray(concepts)) {
        throw new Error('Response is not an array')
      }
    } catch {
      // Try to extract concepts from non-JSON response
      const lines = response.content.trim().split('\n').filter(l => l.trim())
      concepts = lines.slice(0, count).map(l => l.replace(/^[-•*\d.]+\s*/, '').trim())
    }

    // Build canvas actions for the new concepts
    const actions: CanvasAction[] = []
    const createdIds: string[] = []

    // Get existing children to avoid overlap
    const existingChildren = allElements.filter(
      (e) => e.boundElements?.some((b) => b.id === element.id)
    )

    concepts.forEach((concept, index) => {
      const position = calculateBranchPosition(
        element,
        [...existingChildren, ...actions.filter(a => a.type === 'add_rectangle').map((_, i) => ({
          x: 0, y: 0, width: 140, height: 60, id: `temp_${i}`
        } as ExcalidrawElement))],
        direction,
        60
      )

      // Adjust Y position for each new element to prevent stacking
      const adjustedPosition = {
        x: position.x,
        y: position.y + (index * 90) - ((concepts.length - 1) * 45),
      }

      const shapeId = `expand_${Date.now()}_${index}`
      createdIds.push(shapeId)

      // Add rectangle for the concept
      actions.push({
        type: 'add_rectangle',
        id: shapeId,
        position: adjustedPosition,
        size: { width: 140, height: 60 },
        style: {
          backgroundColor: '#e8f5e9',
          strokeColor: '#4caf50',
        },
      })

      // Add text inside the rectangle
      actions.push({
        type: 'add_text',
        text: concept,
        position: {
          x: adjustedPosition.x + 10,
          y: adjustedPosition.y + 20,
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

    // Execute all actions
    const results = await executeActions(actions, { delayBetween: 50 })
    const successCount = results.filter(r => r.success).length
    const allSuccess = successCount === results.length

    return {
      success: allSuccess,
      elementId: element.id,
      concepts,
      createdElements: results.filter(r => r.success && r.elementId).map(r => r.elementId!),
      error: allSuccess ? undefined : `${results.length - successCount} actions failed`,
    }
  } catch (error) {
    return {
      success: false,
      elementId: element.id,
      concepts: [],
      createdElements: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Result of suggest connections action
 */
export interface SuggestConnectionsResult {
  success: boolean
  suggestions: Array<{
    fromId: string
    toId: string
    reason: string
  }>
  createdConnections: string[]
  error?: string
}

/**
 * Analyze elements and suggest connections between them
 */
export async function suggestConnections(
  elements: ExcalidrawElement[],
  allElements: ExcalidrawElement[],
  options: {
    autoApply?: boolean
  } = {}
): Promise<SuggestConnectionsResult> {
  const { autoApply = true } = options

  if (!aiService.isConfigured()) {
    return {
      success: false,
      suggestions: [],
      createdConnections: [],
      error: 'AI service not configured. Set VITE_ANTHROPIC_API_KEY.',
    }
  }

  if (elements.length < 2) {
    return {
      success: false,
      suggestions: [],
      createdConnections: [],
      error: 'Need at least 2 elements to suggest connections',
    }
  }

  // Get text content for each element
  const elementData = elements.map(e => ({
    id: e.id,
    text: getElementText(e, allElements) || `[${e.type}]`,
    type: e.type,
  })).filter(e => e.text)

  if (elementData.length < 2) {
    return {
      success: false,
      suggestions: [],
      createdConnections: [],
      error: 'Not enough elements with text content',
    }
  }

  const CONNECTIONS_PROMPT = `You are an AI assistant helping users connect related concepts in visual diagrams.
Analyze the given elements and suggest logical connections between them.

Rules:
- Only suggest connections where there's a clear relationship
- Each connection should have a brief reason
- Don't suggest redundant connections
- Consider cause-effect, hierarchy, and semantic relationships

Respond with ONLY a JSON array of connection objects.
Example: [{"from": "id1", "to": "id2", "reason": "causes"}, {"from": "id2", "to": "id3", "reason": "leads to"}]`

  try {
    const elementsDescription = elementData
      .map(e => `- ID "${e.id}": "${e.text}"`)
      .join('\n')

    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `Analyze these elements and suggest connections:\n${elementsDescription}`,
      },
    ]

    const response = await aiService.sendMessage(messages, CONNECTIONS_PROMPT)

    // Parse the JSON array from response
    let suggestions: Array<{ from: string; to: string; reason: string }>
    try {
      suggestions = JSON.parse(response.content.trim())
      if (!Array.isArray(suggestions)) {
        throw new Error('Response is not an array')
      }
    } catch {
      return {
        success: false,
        suggestions: [],
        createdConnections: [],
        error: 'Failed to parse AI response',
      }
    }

    // Validate suggestions - only keep those with valid element IDs
    const validIds = new Set(elementData.map(e => e.id))
    const validSuggestions = suggestions.filter(
      s => validIds.has(s.from) && validIds.has(s.to) && s.from !== s.to
    )

    const formattedSuggestions = validSuggestions.map(s => ({
      fromId: s.from,
      toId: s.to,
      reason: s.reason,
    }))

    // Apply connections if autoApply is true
    if (autoApply && validSuggestions.length > 0) {
      const actions: CanvasAction[] = validSuggestions.map(s => ({
        type: 'add_connection' as const,
        fromId: s.from,
        toId: s.to,
        label: s.reason,
      }))

      const results = await executeActions(actions, { delayBetween: 50 })
      const createdConnections = results
        .filter(r => r.success && r.elementId)
        .map(r => r.elementId!)

      return {
        success: true,
        suggestions: formattedSuggestions,
        createdConnections,
      }
    }

    return {
      success: true,
      suggestions: formattedSuggestions,
      createdConnections: [],
    }
  } catch (error) {
    return {
      success: false,
      suggestions: [],
      createdConnections: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Result of explain diagram action
 */
export interface ExplainResult {
  success: boolean
  explanation: string
  error?: string
}

/**
 * Explain selected elements or the entire diagram
 */
export async function explainDiagram(
  elements: ExcalidrawElement[],
  allElements: ExcalidrawElement[]
): Promise<ExplainResult> {
  if (!aiService.isConfigured()) {
    return {
      success: false,
      explanation: '',
      error: 'AI service not configured. Set VITE_ANTHROPIC_API_KEY.',
    }
  }

  // Get text content for elements
  const targetElements = elements.length > 0 ? elements : allElements
  const elementData = targetElements.map(e => ({
    id: e.id,
    text: getElementText(e, allElements) || `[${e.type}]`,
    type: e.type,
  }))

  if (elementData.length === 0) {
    return {
      success: false,
      explanation: '',
      error: 'No elements to explain',
    }
  }

  const EXPLAIN_PROMPT = `You are an AI assistant helping users understand visual diagrams.
Analyze the given elements and provide a clear explanation of what the diagram represents.

Rules:
- Be concise but thorough
- Identify relationships between elements
- Explain the overall purpose or flow
- Use simple language`

  try {
    const elementsDescription = elementData
      .map(e => `- ${e.type}: "${e.text}"`)
      .join('\n')

    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `Explain this diagram:\n${elementsDescription}`,
      },
    ]

    const response = await aiService.sendMessage(messages, EXPLAIN_PROMPT)

    return {
      success: true,
      explanation: response.content.trim(),
    }
  } catch (error) {
    return {
      success: false,
      explanation: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Result of summarize action
 */
export interface SummarizeResult {
  success: boolean
  summary: string
  keyPoints: string[]
  error?: string
}

/**
 * Summarize selected elements or the entire diagram
 */
export async function summarizeDiagram(
  elements: ExcalidrawElement[],
  allElements: ExcalidrawElement[]
): Promise<SummarizeResult> {
  if (!aiService.isConfigured()) {
    return {
      success: false,
      summary: '',
      keyPoints: [],
      error: 'AI service not configured. Set VITE_ANTHROPIC_API_KEY.',
    }
  }

  // Get text content for elements
  const targetElements = elements.length > 0 ? elements : allElements
  const elementData = targetElements.map(e => ({
    id: e.id,
    text: getElementText(e, allElements) || '',
    type: e.type,
  })).filter(e => e.text)

  if (elementData.length === 0) {
    return {
      success: false,
      summary: '',
      keyPoints: [],
      error: 'No elements with text to summarize',
    }
  }

  const SUMMARIZE_PROMPT = `You are an AI assistant helping users summarize visual diagrams.
Analyze the given elements and provide a concise summary with key points.

Rules:
- Create a brief 1-2 sentence summary
- Extract 3-5 key points
- Focus on the main ideas and relationships

Respond with ONLY a JSON object in this format:
{"summary": "Brief summary here", "keyPoints": ["Point 1", "Point 2", "Point 3"]}`

  try {
    const elementsDescription = elementData
      .map(e => `- ${e.type}: "${e.text}"`)
      .join('\n')

    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `Summarize this diagram:\n${elementsDescription}`,
      },
    ]

    const response = await aiService.sendMessage(messages, SUMMARIZE_PROMPT)

    // Parse the JSON response
    try {
      const result = JSON.parse(response.content.trim())
      return {
        success: true,
        summary: result.summary || '',
        keyPoints: result.keyPoints || [],
      }
    } catch {
      // If JSON parsing fails, return the raw text as summary
      return {
        success: true,
        summary: response.content.trim(),
        keyPoints: [],
      }
    }
  } catch (error) {
    return {
      success: false,
      summary: '',
      keyPoints: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
