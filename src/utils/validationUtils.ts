import type { ExcalidrawElement } from '@/types'

/**
 * Validation result type
 */
export interface ValidationResult<T = unknown> {
  isValid: boolean
  data?: T
  errors: string[]
}

/**
 * Validate that a value is not empty
 */
export function validateNotEmpty(value: unknown, fieldName = 'Value'): ValidationResult {
  const errors: string[] = []

  if (value === null || value === undefined) {
    errors.push(`${fieldName} cannot be null or undefined`)
    return { isValid: false, errors }
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    errors.push(`${fieldName} cannot be empty`)
    return { isValid: false, errors }
  }

  if (Array.isArray(value) && value.length === 0) {
    errors.push(`${fieldName} cannot be an empty array`)
    return { isValid: false, errors }
  }

  return { isValid: true, data: value, errors: [] }
}

/**
 * Validate AI response content
 */
export function validateAIResponse(content: string): ValidationResult<string> {
  const errors: string[] = []

  if (!content || typeof content !== 'string') {
    errors.push('AI response must be a non-empty string')
    return { isValid: false, errors }
  }

  const trimmed = content.trim()

  if (trimmed.length === 0) {
    errors.push('AI response cannot be empty or whitespace only')
    return { isValid: false, errors }
  }

  // Check for common error patterns in AI responses
  const errorPatterns = [
    /error: not found/i,
    /error: invalid/i,
    /failed to process/i,
    /unable to complete/i,
  ]

  for (const pattern of errorPatterns) {
    if (pattern.test(trimmed)) {
      errors.push(`AI response may contain an error: ${trimmed.substring(0, 100)}...`)
      return { isValid: false, errors }
    }
  }

  return { isValid: true, data: trimmed, errors: [] }
}

/**
 * Validate JSON structure
 */
export function validateJSON(jsonString: string): ValidationResult<object> {
  const errors: string[] = []

  if (!jsonString || typeof jsonString !== 'string') {
    errors.push('JSON must be a non-empty string')
    return { isValid: false, errors }
  }

  try {
    const parsed = JSON.parse(jsonString)
    return { isValid: true, data: parsed, errors: [] }
  } catch (error) {
    errors.push(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { isValid: false, errors }
  }
}

/**
 * Validate AI canvas action
 */
export interface CanvasActionValidation {
  type?: string
  hasRequiredFields: boolean
  validPosition?: boolean
  validSize?: boolean
}

export function validateCanvasAction(action: unknown): ValidationResult<CanvasActionValidation> {
  const errors: string[] = []

  if (!action || typeof action !== 'object') {
    errors.push('Canvas action must be an object')
    return { isValid: false, errors }
  }

  const actionObj = action as Record<string, unknown>

  // Check for type field
  if (!actionObj.type || typeof actionObj.type !== 'string') {
    errors.push('Canvas action must have a valid type field')
  }

  const validTypes = [
    'add_rectangle',
    'add_ellipse',
    'add_diamond',
    'add_text',
    'add_arrow',
    'add_connection',
    'update_text',
    'update_style',
    'delete_element',
    'move_element',
    'group_elements',
  ]

  if (actionObj.type && typeof actionObj.type === 'string' && !validTypes.includes(actionObj.type)) {
    errors.push(`Invalid canvas action type: ${actionObj.type}`)
  }

  const validation: CanvasActionValidation = {
    type: actionObj.type as string,
    hasRequiredFields: !!actionObj.type,
  }

  // Validate position if present
  if (actionObj.position) {
    const pos = actionObj.position as Record<string, unknown>
    if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      errors.push('Position must have valid x and y coordinates')
      validation.validPosition = false
    } else {
      validation.validPosition = true
    }
  }

  // Validate size if present
  if (actionObj.size) {
    const size = actionObj.size as Record<string, unknown>
    if (typeof size.width !== 'number' || typeof size.height !== 'number') {
      errors.push('Size must have valid width and height')
      validation.validSize = false
    } else if (size.width <= 0 || size.height <= 0) {
      errors.push('Size must be positive')
      validation.validSize = false
    } else {
      validation.validSize = true
    }
  }

  return {
    isValid: errors.length === 0,
    data: validation,
    errors,
  }
}

/**
 * Validate element ID format
 */
export function validateElementId(id: unknown): ValidationResult<string> {
  const errors: string[] = []

  if (!id || typeof id !== 'string') {
    errors.push('Element ID must be a string')
    return { isValid: false, errors }
  }

  if (id.trim().length === 0) {
    errors.push('Element ID cannot be empty')
    return { isValid: false, errors }
  }

  if (id.length > 100) {
    errors.push('Element ID is too long (max 100 characters)')
    return { isValid: false, errors }
  }

  return { isValid: true, data: id, errors: [] }
}

/**
 * Validate text content for elements
 */
export function validateElementText(text: unknown): ValidationResult<string> {
  const errors: string[] = []

  if (text === null || text === undefined) {
    // Empty text is valid (elements can have no text)
    return { isValid: true, data: '', errors: [] }
  }

  if (typeof text !== 'string') {
    errors.push('Element text must be a string')
    return { isValid: false, errors }
  }

  if (text.length > 10000) {
    errors.push('Element text is too long (max 10000 characters)')
    return { isValid: false, errors }
  }

  return { isValid: true, data: text, errors: [] }
}

/**
 * Validate color code
 */
export function validateColor(color: unknown): ValidationResult<string> {
  const errors: string[] = []

  if (!color || typeof color !== 'string') {
    errors.push('Color must be a string')
    return { isValid: false, errors }
  }

  // Check for hex color (#RRGGBB or #RGB)
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  // Check for named colors or rgb()
  const cssColorPattern = /^(rgb|hsl)a?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(\s*,\s*[\d.]+)?\s*\)|^[a-zA-Z]+$/

  if (!hexPattern.test(color) && !cssColorPattern.test(color)) {
    errors.push(`Invalid color format: ${color}`)
    return { isValid: false, errors }
  }

  return { isValid: true, data: color, errors: [] }
}

/**
 * Validate style object
 */
export function validateElementStyle(style: unknown): ValidationResult {
  const errors: string[] = []

  if (!style || typeof style !== 'object') {
    errors.push('Style must be an object')
    return { isValid: false, errors }
  }

  const styleObj = style as Record<string, unknown>

  // Validate strokeColor if present
  if (styleObj.strokeColor !== undefined) {
    const colorResult = validateColor(styleObj.strokeColor)
    if (!colorResult.isValid) {
      errors.push(...colorResult.errors.map(e => `strokeColor: ${e}`))
    }
  }

  // Validate backgroundColor if present
  if (styleObj.backgroundColor !== undefined) {
    const colorResult = validateColor(styleObj.backgroundColor)
    if (!colorResult.isValid) {
      errors.push(...colorResult.errors.map(e => `backgroundColor: ${e}`))
    }
  }

  // Validate strokeWidth if present
  if (styleObj.strokeWidth !== undefined) {
    if (typeof styleObj.strokeWidth !== 'number') {
      errors.push('strokeWidth must be a number')
    } else if (styleObj.strokeWidth < 0 || styleObj.strokeWidth > 20) {
      errors.push('strokeWidth must be between 0 and 20')
    }
  }

  // Validate opacity if present
  if (styleObj.opacity !== undefined) {
    if (typeof styleObj.opacity !== 'number') {
      errors.push('opacity must be a number')
    } else if (styleObj.opacity < 0 || styleObj.opacity > 100) {
      errors.push('opacity must be between 0 and 100')
    }
  }

  return {
    isValid: errors.length === 0,
    data: style,
    errors,
  }
}

/**
 * Validate array of elements
 */
export function validateElements(elements: unknown): ValidationResult<ExcalidrawElement[]> {
  const errors: string[] = []

  if (!Array.isArray(elements)) {
    errors.push('Elements must be an array')
    return { isValid: false, errors }
  }

  if (elements.length === 0) {
    errors.push('Elements array cannot be empty')
    return { isValid: false, errors }
  }

  if (elements.length > 1000) {
    errors.push('Too many elements (max 1000)')
    return { isValid: false, errors }
  }

  // Validate each element has required fields
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i]
    if (!element || typeof element !== 'object') {
      errors.push(`Element at index ${i} is not a valid object`)
      continue
    }

    const elem = element as Record<string, unknown>

    if (!elem.id || typeof elem.id !== 'string') {
      errors.push(`Element at index ${i} missing valid id`)
    }

    if (!elem.type || typeof elem.type !== 'string') {
      errors.push(`Element at index ${i} missing valid type`)
    }

    if (typeof elem.x !== 'number' || typeof elem.y !== 'number') {
      errors.push(`Element at index ${i} missing valid position`)
    }
  }

  return {
    isValid: errors.length === 0,
    data: elements as ExcalidrawElement[],
    errors,
  }
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate and sanitize text input
 */
export function validateAndSanitizeInput(input: unknown, fieldName = 'Input'): ValidationResult<string> {
  const notEmptyResult = validateNotEmpty(input, fieldName)
  if (!notEmptyResult.isValid) {
    return notEmptyResult
  }

  const str = String(input)
  const sanitized = sanitizeInput(str)

  if (sanitized.length !== str.length) {
    return {
      isValid: false,
      errors: [`${fieldName} contains potentially dangerous characters`],
    }
  }

  return { isValid: true, data: str, errors: [] }
}

/**
 * Batch validation - validate multiple items and return all errors
 */
export function validateBatch<T>(
  items: T[],
  validator: (item: T, index: number) => ValidationResult
): ValidationResult {
  const allErrors: string[] = []
  let isValid = true

  items.forEach((item, index) => {
    const result = validator(item, index)
    if (!result.isValid) {
      isValid = false
      allErrors.push(...result.errors.map(e => `[Item ${index}] ${e}`))
    }
  })

  return {
    isValid,
    errors: allErrors,
  }
}
