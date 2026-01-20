/**
 * AI Prompts Configuration
 *
 * All AI system prompts are centralized here for easy editing.
 * Each prompt defines the AI's behavior for a specific action.
 */

import type { CanvasContext } from '@/types'
import { getDomainDisplayName } from '@/types/canvasContext'

/**
 * Chat panel system prompt - used for conversational AI interactions
 */
export const CHAT_SYSTEM_PROMPT = `You are an AI assistant helping users work with visual diagrams in Excalidraw.
You can help users by:
1. Explaining what's on their canvas
2. Suggesting improvements to their diagrams
3. Creating new elements based on their requests
4. Answering questions about their content

When the user asks you to CREATE or MODIFY elements on the canvas, respond with a JSON block containing actions:
\`\`\`json
{
  "actions": [
    { "type": "add_rectangle", "position": { "x": 100, "y": 100 }, "size": { "width": 150, "height": 80 } },
    { "type": "add_text", "text": "My Label", "position": { "x": 110, "y": 130 } },
    { "type": "add_connection", "fromId": "element1", "toId": "element2", "label": "relates to" }
  ],
  "explanation": "I've created a new rectangle with a label."
}
\`\`\`

Available action types:
- add_rectangle, add_ellipse, add_diamond: { position: {x, y}, size: {width, height}, style?: {backgroundColor, strokeColor} }
- add_text: { text, position: {x, y}, style?: {fontSize} }
- add_connection: { fromId, toId, label? }
- add_arrow: { from: {x, y} | elementId, to: {x, y} | elementId }
- update_text: { targetId, text }
- update_style: { targetId, style: {backgroundColor, strokeColor, ...} }
- delete_element: { targetId }
- move_element: { targetId, position?: {x, y}, delta?: {x, y} }

For questions or explanations, just respond with text normally.

Current canvas context will be provided with each message.`

/**
 * Text improvement prompt - used for "Update Wording" action
 */
export const TEXT_IMPROVEMENT_PROMPT = `You are an AI assistant helping users improve text in visual diagrams.
Your task is to improve the wording of text elements while:
- Keeping the same meaning and intent
- Making text clearer and more concise
- Using professional language appropriate for diagrams
- Preserving any technical terms

Respond with ONLY the improved text, nothing else. No explanations, no quotes, just the improved text.
If the text is already good, return it unchanged.`

/**
 * Make concise prompt - used for "Make Concise" action
 */
export const CONCISE_PROMPT = `You are an AI assistant helping users make text more concise in visual diagrams.
Your task is to shorten the text while preserving the core meaning.
- Remove unnecessary words
- Use shorter alternatives
- Keep essential information
- Aim for 50% or less of the original length when possible

Respond with ONLY the shortened text, nothing else.`

/**
 * Improve clarity prompt - used for "Improve Clarity" action
 */
export const CLARITY_PROMPT = `You are an AI assistant helping users improve text clarity in visual diagrams.
Your task is to rewrite the text to be clearer and easier to understand.
- Use simpler words when possible
- Improve sentence structure
- Remove ambiguity
- Keep technical terms if they're important

Respond with ONLY the improved text, nothing else.`

/**
 * Expand concept prompt - used for "Expand Concept" action
 * Note: Use getExpandPrompt(count) to get the prompt with dynamic count
 */
export const EXPAND_PROMPT_TEMPLATE = `You are an AI assistant helping users expand concepts in visual diagrams.
Given a concept, generate {{COUNT}} related sub-concepts or ideas that branch from it.

Rules:
- Each concept should be short (2-5 words)
- Concepts should be directly related to the parent
- Be specific and actionable
- No numbering or bullets

Respond with ONLY a JSON array of strings, nothing else.
Example: ["Related Idea 1", "Related Idea 2", "Related Idea 3"]`

/**
 * Get expand prompt with dynamic count
 */
export function getExpandPrompt(count: number): string {
  return EXPAND_PROMPT_TEMPLATE.replace('{{COUNT}}', count.toString())
}

/**
 * Suggest connections prompt - used for "Suggest Connections" action
 */
export const CONNECTIONS_PROMPT = `You are an AI assistant helping users connect related concepts in visual diagrams.
Analyze the given elements and suggest logical connections between them.

Rules:
- Only suggest connections where there's a clear relationship
- Each connection should have a brief reason
- Don't suggest redundant connections
- Consider cause-effect, hierarchy, and semantic relationships

Respond with ONLY a JSON array of connection objects.
Example: [{"from": "id1", "to": "id2", "reason": "causes"}, {"from": "id2", "to": "id3", "reason": "leads to"}]`

/**
 * Explain diagram prompt - used for "Explain" action
 */
export const EXPLAIN_PROMPT = `You are an AI assistant helping users understand visual diagrams.
Analyze the given elements and provide a clear explanation of what the diagram represents.

Rules:
- Be concise but thorough
- Identify relationships between elements
- Explain the overall purpose or flow
- Use simple language`

/**
 * Summarize diagram prompt - used for "Summarize" action
 */
export const SUMMARIZE_PROMPT = `You are an AI assistant helping users summarize visual diagrams.
Analyze the given elements and provide a concise summary with key points.

Rules:
- Create a brief 1-2 sentence summary
- Extract 3-5 key points
- Focus on the main ideas and relationships

Respond with ONLY a JSON object in this format:
{"summary": "Brief summary here", "keyPoints": ["Point 1", "Point 2", "Point 3"]}`

/**
 * Build an enhanced system prompt that incorporates canvas context
 * This function injects domain knowledge, response style, and custom instructions
 * into the base prompt
 */
export function buildSystemPrompt(
  basePrompt: string,
  canvasContext: CanvasContext | null
): string {
  if (!canvasContext) {
    return basePrompt
  }

  const parts: string[] = [basePrompt]

  // Add domain context
  const domainDisplay =
    canvasContext.domain === 'custom'
      ? canvasContext.customDomain || 'Custom'
      : getDomainDisplayName(canvasContext.domain)

  if (canvasContext.domain !== 'general') {
    parts.push('')
    parts.push(`## Domain Context`)
    parts.push(`This diagram is a ${domainDisplay} diagram.`)

    if (canvasContext.description) {
      parts.push(`Purpose: ${canvasContext.description}`)
    }
  }

  // Add response style guidance
  if (canvasContext.responseStyle) {
    parts.push('')
    parts.push('## Response Style')
    switch (canvasContext.responseStyle) {
      case 'concise':
        parts.push('Keep responses brief and to the point. Use bullet points where appropriate.')
        break
      case 'detailed':
        parts.push('Provide thorough explanations with context and examples where helpful.')
        break
      case 'technical':
        parts.push(
          'Use technical terminology appropriate for the domain. Assume familiarity with the subject matter.'
        )
        break
      case 'beginner-friendly':
        parts.push(
          'Explain concepts in simple terms. Avoid jargon and define technical terms when used.'
        )
        break
    }
  }

  // Add domain terminology
  if (canvasContext.terminology && canvasContext.terminology.length > 0) {
    parts.push('')
    parts.push('## Domain Terminology')
    parts.push('When discussing this diagram, use these domain-specific terms:')
    for (const term of canvasContext.terminology) {
      parts.push(`- **${term.term}**: ${term.definition}`)
    }
  }

  // Add conventions
  if (canvasContext.conventions && canvasContext.conventions.length > 0) {
    parts.push('')
    parts.push('## Diagram Conventions')
    parts.push('This diagram follows these conventions:')
    for (const convention of canvasContext.conventions) {
      parts.push(`- ${convention}`)
    }
  }

  // Add style guide context
  if (canvasContext.styleGuide) {
    const { nodeNamingConvention, connectionLabeling, colorMeanings } = canvasContext.styleGuide
    const hasStyleInfo =
      nodeNamingConvention || connectionLabeling || (colorMeanings && colorMeanings.length > 0)

    if (hasStyleInfo) {
      parts.push('')
      parts.push('## Style Conventions')

      if (nodeNamingConvention) {
        parts.push(`- Node labels use ${nodeNamingConvention} naming`)
      }

      if (connectionLabeling) {
        parts.push(`- Connections are labeled with ${connectionLabeling}`)
      }

      if (colorMeanings && colorMeanings.length > 0) {
        parts.push('- Color meanings in this diagram:')
        for (const cm of colorMeanings) {
          parts.push(`  - ${cm.color}: ${cm.meaning}`)
        }
      }
    }
  }

  // Add custom AI instructions (highest priority)
  if (canvasContext.aiInstructions) {
    parts.push('')
    parts.push('## Special Instructions')
    parts.push(canvasContext.aiInstructions)
  }

  return parts.join('\n')
}

/**
 * Get enhanced prompt by combining base prompt with canvas context
 * Convenience wrapper for common use case
 */
export function getEnhancedPrompt(
  promptKey: 'chat' | 'text_improvement' | 'concise' | 'clarity' | 'expand' | 'connections' | 'explain' | 'summarize',
  canvasContext: CanvasContext | null,
  options?: { expandCount?: number }
): string {
  let basePrompt: string

  switch (promptKey) {
    case 'chat':
      basePrompt = CHAT_SYSTEM_PROMPT
      break
    case 'text_improvement':
      basePrompt = TEXT_IMPROVEMENT_PROMPT
      break
    case 'concise':
      basePrompt = CONCISE_PROMPT
      break
    case 'clarity':
      basePrompt = CLARITY_PROMPT
      break
    case 'expand':
      basePrompt = getExpandPrompt(options?.expandCount ?? 3)
      break
    case 'connections':
      basePrompt = CONNECTIONS_PROMPT
      break
    case 'explain':
      basePrompt = EXPLAIN_PROMPT
      break
    case 'summarize':
      basePrompt = SUMMARIZE_PROMPT
      break
    default:
      basePrompt = ''
  }

  return buildSystemPrompt(basePrompt, canvasContext)
}
