import { aiService, ResponseValidators } from './aiService'
import { loggingService } from './loggingService'
import { useCanvasStore } from '@/store/canvasStore'
import { getElementText } from '@/utils/elementUtils'
import { executeActions, type CanvasAction } from './actionParser'
import { calculateBranchPosition } from '@/utils/layoutUtils'
import {
  TEXT_IMPROVEMENT_PROMPT,
  CONCISE_PROMPT,
  CLARITY_PROMPT,
  CONNECTIONS_PROMPT,
  EXPLAIN_PROMPT,
  SUMMARIZE_PROMPT,
  getExpandPrompt,
  buildSystemPrompt,
} from '@/config/prompts'
import type { ExcalidrawElement, CanvasContext } from '@/types'
import type { AIMessage } from '@/types'

/**
 * Helper to get current canvas context from store
 */
function getCanvasContext(): CanvasContext | null {
  return useCanvasStore.getState().canvasContext
}

/**
 * Helper to get enhanced prompt with canvas context
 */
function getContextEnhancedPrompt(basePrompt: string): string {
  const context = getCanvasContext()
  return buildSystemPrompt(basePrompt, context)
}

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
 * Helper to log AI request and response
 */
function logAIInteraction(
  action: string,
  prompt: string,
  context: string,
  elementIds: string[],
  response: string,
  success: boolean,
  error?: string
): void {
  const stats = aiService.getLastStats()
  loggingService.logAIRequest(action, prompt, context, elementIds)
  loggingService.logAIResponse(
    action,
    response,
    stats || {
      provider: aiService.getProvider() || 'unknown' as 'anthropic',
      model: aiService.getModel() || 'unknown',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      durationMs: 0,
      timestamp: new Date(),
    },
    success,
    error
  )
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
      // Use retry mechanism to handle empty responses
      const enhancedPrompt = getContextEnhancedPrompt(TEXT_IMPROVEMENT_PROMPT)
      const response = await aiService.sendMessageWithRetry(messages, enhancedPrompt, {
        validator: ResponseValidators.notEmpty,
        onRetry: (attempt, error) => {
          console.log(`[updateWording] Retry ${attempt}: ${error}`)
          loggingService.logError(new Error(`Retry ${attempt}: ${error}`), 'update-wording-retry')
        },
      })
      console.log('[updateWording] AI response:', response.content)
      const newText = response.content.trim()

      // Log the AI interaction
      logAIInteraction(
        'update-wording',
        `Improve this text: "${text}"`,
        TEXT_IMPROVEMENT_PROMPT,
        [element.id],
        newText,
        true
      )

      if (newText && newText !== text) {
        console.log('[updateWording] Updating element with new text:', newText)
        const updated = updateElementText(element.id, newText, text)
        console.log('[updateWording] Update result:', updated)

        // Log action execution
        loggingService.logAIActionExecuted('update-wording', element.id, updated)

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
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'

      // Log the error
      logAIInteraction(
        'update-wording',
        `Improve this text: "${text}"`,
        TEXT_IMPROVEMENT_PROMPT,
        [element.id],
        '',
        false,
        errorMsg
      )
      loggingService.logError(error instanceof Error ? error : new Error(errorMsg), 'update-wording')

      results.push({
        success: false,
        elementId: element.id,
        originalText: text,
        error: errorMsg,
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

      // Use retry mechanism to handle empty responses
      const enhancedPrompt = getContextEnhancedPrompt(CONCISE_PROMPT)
      const response = await aiService.sendMessageWithRetry(messages, enhancedPrompt, {
        validator: ResponseValidators.notEmpty,
        onRetry: (attempt, error) => {
          console.log(`[makeConcise] Retry ${attempt}: ${error}`)
          loggingService.logError(new Error(`Retry ${attempt}: ${error}`), 'make-concise-retry')
        },
      })
      const newText = response.content.trim()

      logAIInteraction(
        'make-concise',
        `Make this text more concise: "${text}"`,
        CONCISE_PROMPT,
        [element.id],
        newText,
        true
      )

      if (newText && newText !== text) {
        const updated = updateElementText(element.id, newText, text)
        loggingService.logAIActionExecuted('make-concise', element.id, updated)
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
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      logAIInteraction('make-concise', `Make this text more concise: "${text}"`, CONCISE_PROMPT, [element.id], '', false, errorMsg)
      loggingService.logError(error instanceof Error ? error : new Error(errorMsg), 'make-concise')
      results.push({
        success: false,
        elementId: element.id,
        originalText: text,
        error: errorMsg,
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

      // Use retry mechanism to handle empty responses
      const enhancedPrompt = getContextEnhancedPrompt(CLARITY_PROMPT)
      const response = await aiService.sendMessageWithRetry(messages, enhancedPrompt, {
        validator: ResponseValidators.notEmpty,
        onRetry: (attempt, error) => {
          console.log(`[improveClarity] Retry ${attempt}: ${error}`)
          loggingService.logError(new Error(`Retry ${attempt}: ${error}`), 'improve-clarity-retry')
        },
      })
      const newText = response.content.trim()

      logAIInteraction(
        'improve-clarity',
        `Improve the clarity of this text: "${text}"`,
        CLARITY_PROMPT,
        [element.id],
        newText,
        true
      )

      if (newText && newText !== text) {
        const updated = updateElementText(element.id, newText, text)
        loggingService.logAIActionExecuted('improve-clarity', element.id, updated)
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
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      logAIInteraction('improve-clarity', `Improve the clarity of this text: "${text}"`, CLARITY_PROMPT, [element.id], '', false, errorMsg)
      loggingService.logError(error instanceof Error ? error : new Error(errorMsg), 'improve-clarity')
      results.push({
        success: false,
        elementId: element.id,
        originalText: text,
        error: errorMsg,
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

  try {
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: `Generate ${count} related concepts for: "${text}"`,
      },
    ]

    // Use retry mechanism with JSON array validation
    const enhancedPrompt = getContextEnhancedPrompt(getExpandPrompt(count))
    const response = await aiService.sendMessageWithRetry(messages, enhancedPrompt, {
      validator: ResponseValidators.containsJSONArray,
      onRetry: (attempt, error) => {
        console.log(`[expandConcept] Retry ${attempt}: ${error}`)
        loggingService.logError(new Error(`Retry ${attempt}: ${error}`), 'expand-concept-retry')
      },
    })

    // Parse the JSON array from response - try multiple extraction methods
    let concepts: string[] = []
    const content = response.content.trim()

    // Check if response is empty or just empty array
    if (!content || content === '[]') {
      console.error('[expandConcept] AI returned empty response after retries:', content)
      logAIInteraction(
        'expand-concept',
        `Generate ${count} related concepts for: "${text}"`,
        getExpandPrompt(count),
        [element.id],
        content,
        false,
        'AI returned empty response'
      )
      return {
        success: false,
        elementId: element.id,
        concepts: [],
        createdElements: [],
        error: 'AI returned empty response. Please try again.',
      }
    }

    try {
      // Method 1: Try parsing the entire content as JSON
      try {
        concepts = JSON.parse(content)
      } catch {
        // Method 2: Look for JSON array in code block
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        if (codeBlockMatch) {
          concepts = JSON.parse(codeBlockMatch[1].trim())
        } else {
          // Method 3: Look for array pattern [...] anywhere in the response
          const arrayMatch = content.match(/\[[\s\S]*\]/)
          if (arrayMatch) {
            concepts = JSON.parse(arrayMatch[0])
          } else {
            throw new Error('No JSON array found')
          }
        }
      }

      if (!Array.isArray(concepts)) {
        throw new Error('Response is not an array')
      }

      // Check if array is empty
      if (concepts.length === 0) {
        throw new Error('AI returned empty concepts array')
      }
    } catch (parseError) {
      // Fallback: Try to extract concepts from non-JSON response (numbered/bulleted list)
      const lines = content.split('\n').filter(l => l.trim())
      concepts = lines.slice(0, count).map(l => l.replace(/^[-•*\d.)\]]+\s*/, '').trim()).filter(l => l)

      // If fallback also failed, return error
      if (concepts.length === 0) {
        console.error('[expandConcept] Failed to parse AI response:', content)
        logAIInteraction(
          'expand-concept',
          `Generate ${count} related concepts for: "${text}"`,
          getExpandPrompt(count),
          [element.id],
          content,
          false,
          'Failed to parse concepts from response'
        )
        return {
          success: false,
          elementId: element.id,
          concepts: [],
          createdElements: [],
          error: 'Failed to parse AI response. Please try again.',
        }
      }
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

      // Add rectangle with text inside
      actions.push({
        type: 'add_rectangle',
        id: shapeId,
        position: adjustedPosition,
        size: { width: 140, height: 60 },
        text: concept,
        style: {
          backgroundColor: '#e8f5e9',
          strokeColor: '#4caf50',
        },
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

    // Log AI interaction with actual success status
    logAIInteraction(
      'expand-concept',
      `Generate ${count} related concepts for: "${text}"`,
      getExpandPrompt(count),
      [element.id],
      JSON.stringify(concepts),
      allSuccess && concepts.length > 0
    )

    // Log action execution
    loggingService.logAIActionExecuted('expand-concept', element.id, allSuccess)

    return {
      success: allSuccess,
      elementId: element.id,
      concepts,
      createdElements: results.filter(r => r.success && r.elementId).map(r => r.elementId!),
      error: allSuccess ? undefined : `${results.length - successCount} actions failed`,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    logAIInteraction('expand-concept', `Generate related concepts for: "${text}"`, getExpandPrompt(count), [element.id], '', false, errorMsg)
    loggingService.logError(error instanceof Error ? error : new Error(errorMsg), 'expand-concept')
    return {
      success: false,
      elementId: element.id,
      concepts: [],
      createdElements: [],
      error: errorMsg,
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

    // Use retry mechanism with JSON array validation
    const enhancedPrompt = getContextEnhancedPrompt(CONNECTIONS_PROMPT)
    const response = await aiService.sendMessageWithRetry(messages, enhancedPrompt, {
      validator: ResponseValidators.containsJSONArray,
      onRetry: (attempt, error) => {
        console.log(`[suggestConnections] Retry ${attempt}: ${error}`)
        loggingService.logError(new Error(`Retry ${attempt}: ${error}`), 'suggest-connections-retry')
      },
    })

    // Parse the JSON array from response - try multiple extraction methods
    let suggestions: Array<{ from: string; to: string; reason: string }> = []
    let parseSuccess = false
    const content = response.content.trim()

    // Check if response is empty or just empty array
    if (!content || content === '[]') {
      console.error('[suggestConnections] AI returned empty response after retries:', content)
      logAIInteraction(
        'suggest-connections',
        `Analyze these elements and suggest connections:\n${elementsDescription}`,
        CONNECTIONS_PROMPT,
        elementData.map(e => e.id),
        content,
        false,
        'AI returned empty response'
      )
      return {
        success: false,
        suggestions: [],
        createdConnections: [],
        error: 'AI returned empty response. Please try again.',
      }
    }

    try {
      // Try to extract JSON array from the response
      // Method 1: Try parsing the entire content as JSON
      try {
        suggestions = JSON.parse(content)
      } catch {
        // Method 2: Look for JSON array in code block
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        if (codeBlockMatch) {
          suggestions = JSON.parse(codeBlockMatch[1].trim())
        } else {
          // Method 3: Look for array pattern [...] anywhere in the response
          const arrayMatch = content.match(/\[[\s\S]*\]/)
          if (arrayMatch) {
            suggestions = JSON.parse(arrayMatch[0])
          } else {
            throw new Error('No JSON array found in response')
          }
        }
      }

      if (!Array.isArray(suggestions)) {
        throw new Error('Response is not an array')
      }

      // Check if parsed array is empty
      if (suggestions.length === 0) {
        throw new Error('AI returned empty suggestions array')
      }

      parseSuccess = true
    } catch (parseError) {
      console.error('[suggestConnections] Failed to parse AI response:', content)
      logAIInteraction(
        'suggest-connections',
        `Analyze these elements and suggest connections:\n${elementsDescription}`,
        CONNECTIONS_PROMPT,
        elementData.map(e => e.id),
        content,
        false,
        parseError instanceof Error ? parseError.message : 'Invalid JSON'
      )
      return {
        success: false,
        suggestions: [],
        createdConnections: [],
        error: `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
      }
    }

    // Validate suggestions - only keep those with valid element IDs
    const validIds = new Set(elementData.map(e => e.id))
    const validSuggestions = suggestions.filter(
      s => s && s.from && s.to && validIds.has(s.from) && validIds.has(s.to) && s.from !== s.to
    )

    // Check if we have any valid suggestions after filtering
    if (validSuggestions.length === 0) {
      console.warn('[suggestConnections] No valid suggestions after filtering')
      logAIInteraction(
        'suggest-connections',
        `Analyze these elements and suggest connections:\n${elementsDescription}`,
        CONNECTIONS_PROMPT,
        elementData.map(e => e.id),
        JSON.stringify(suggestions),
        false,
        'No valid suggestions found (invalid element IDs)'
      )
      return {
        success: false,
        suggestions: [],
        createdConnections: [],
        error: 'AI suggestions did not match any elements. Please try again.',
      }
    }

    const formattedSuggestions = validSuggestions.map(s => ({
      fromId: s.from,
      toId: s.to,
      reason: s.reason || 'Related',
    }))

    // Log AI interaction - only log success if we have valid suggestions
    logAIInteraction(
      'suggest-connections',
      `Analyze these elements and suggest connections:\n${elementsDescription}`,
      CONNECTIONS_PROMPT,
      elementData.map(e => e.id),
      JSON.stringify(validSuggestions),
      parseSuccess && validSuggestions.length > 0
    )

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

      // Log action execution
      loggingService.logAIActionExecuted('suggest-connections', undefined, createdConnections.length > 0)

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
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    logAIInteraction('suggest-connections', `Analyze elements for connections`, CONNECTIONS_PROMPT, elementData.map(e => e.id), '', false, errorMsg)
    loggingService.logError(error instanceof Error ? error : new Error(errorMsg), 'suggest-connections')
    return {
      success: false,
      suggestions: [],
      createdConnections: [],
      error: errorMsg,
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

    // Use retry mechanism to handle empty responses
    const enhancedPrompt = getContextEnhancedPrompt(EXPLAIN_PROMPT)
    const response = await aiService.sendMessageWithRetry(messages, enhancedPrompt, {
      validator: ResponseValidators.notEmpty,
      onRetry: (attempt, error) => {
        console.log(`[explainDiagram] Retry ${attempt}: ${error}`)
        loggingService.logError(new Error(`Retry ${attempt}: ${error}`), 'explain-diagram-retry')
      },
    })
    const explanation = response.content.trim()

    // Log AI interaction
    logAIInteraction(
      'explain-diagram',
      `Explain this diagram:\n${elementsDescription}`,
      EXPLAIN_PROMPT,
      elementData.map(e => e.id),
      explanation,
      true
    )

    return {
      success: true,
      explanation,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    logAIInteraction('explain-diagram', 'Explain this diagram', EXPLAIN_PROMPT, elementData.map(e => e.id), '', false, errorMsg)
    loggingService.logError(error instanceof Error ? error : new Error(errorMsg), 'explain-diagram')
    return {
      success: false,
      explanation: '',
      error: errorMsg,
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

    // Use retry mechanism with JSON validation (expects object with summary and keyPoints)
    const enhancedPrompt = getContextEnhancedPrompt(SUMMARIZE_PROMPT)
    const response = await aiService.sendMessageWithRetry(messages, enhancedPrompt, {
      validator: ResponseValidators.hasKeys('summary', 'keyPoints'),
      onRetry: (attempt, error) => {
        console.log(`[summarizeDiagram] Retry ${attempt}: ${error}`)
        loggingService.logError(new Error(`Retry ${attempt}: ${error}`), 'summarize-diagram-retry')
      },
    })

    // Log AI interaction
    logAIInteraction(
      'summarize-diagram',
      `Summarize this diagram:\n${elementsDescription}`,
      SUMMARIZE_PROMPT,
      elementData.map(e => e.id),
      response.content.trim(),
      true
    )

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
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    logAIInteraction('summarize-diagram', 'Summarize this diagram', SUMMARIZE_PROMPT, elementData.map(e => e.id), '', false, errorMsg)
    loggingService.logError(error instanceof Error ? error : new Error(errorMsg), 'summarize-diagram')
    return {
      success: false,
      summary: '',
      keyPoints: [],
      error: errorMsg,
    }
  }
}
