/**
 * Custom error classes and error handling utilities
 */

/**
 * Base application error
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    }
  }
}

/**
 * AI service related errors
 */
export class AIServiceError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'AI_SERVICE_ERROR', 500, details)
  }
}

export class AIConfigError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'AI_CONFIG_ERROR', 500, details)
  }
}

export class AIRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'AI_REQUEST_ERROR', 500, details)
  }
}

export class AIResponseError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'AI_RESPONSE_ERROR', 500, details)
  }
}

export class AIRetryExhaustedError extends AppError {
  constructor(message: string, public attempts: number, details?: unknown) {
    super(message, 'AI_RETRY_EXHAUSTED', 500, details)
  }
}

/**
 * Canvas operation errors
 */
export class CanvasError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CANVAS_ERROR', 500, details)
  }
}

export class CanvasAPIError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'CANVAS_API_ERROR', 500, details)
  }
}

export class ElementNotFoundError extends AppError {
  constructor(elementId: string) {
    super(`Element not found: ${elementId}`, 'ELEMENT_NOT_FOUND', 404, { elementId })
  }
}

export class ElementValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'ELEMENT_VALIDATION_ERROR', 400, details)
  }
}

/**
 * Network errors
 */
export class NetworkError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_ERROR', 500, details)
  }
}

export class WebhookError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'WEBHOOK_ERROR', 500, details)
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string, public fields: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 400, { fields })
  }
}

/**
 * State errors
 */
export class StateError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'STATE_ERROR', 500, details)
  }
}

/**
 * Error type guard
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unknown error occurred'
}

/**
 * Get error code from unknown error
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code
  }

  if (error instanceof Error) {
    return error.name
  }

  return 'UNKNOWN_ERROR'
}

/**
 * Parse error and return standardized error object
 */
export function parseError(error: unknown): {
  message: string
  code: string
  statusCode: number
  details?: unknown
} {
  if (isAppError(error)) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: error.name,
      statusCode: 500,
      details: error.stack,
    }
  }

  if (typeof error === 'string') {
    return {
      message: error,
      code: 'STRING_ERROR',
      statusCode: 500,
      details: error,
    }
  }

  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
    details: error,
  }
}

/**
 * Async error wrapper - catches errors and converts them to AppError
 */
export async function safeAsync<T>(
  func: () => Promise<T>,
  errorWrapper?: (error: unknown) => AppError
): Promise<T> {
  try {
    return await func()
  } catch (error) {
    if (errorWrapper) {
      throw errorWrapper(error)
    }
    throw new AppError(
      getErrorMessage(error),
      getErrorCode(error),
      500,
      error
    )
  }
}

/**
 * Sync error wrapper - catches errors and converts them to AppError
 */
export function safeSync<T>(
  func: () => T,
  errorWrapper?: (error: unknown) => AppError
): T {
  try {
    return func()
  } catch (error) {
    if (errorWrapper) {
      throw errorWrapper(error)
    }
    throw new AppError(
      getErrorMessage(error),
      getErrorCode(error),
      500,
      error
    )
  }
}

/**
 * Result type for error handling without try/catch
 */
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E }

/**
 * Wrap a function call in a Result type
 */
export async function resultAsync<T>(
  func: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await func()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof AppError ? error : new AppError(
        getErrorMessage(error),
        getErrorCode(error),
        500,
        error
      ),
    }
  }
}

/**
 * Wrap a synchronous function call in a Result type
 */
export function resultSync<T>(
  func: () => T
): Result<T> {
  try {
    const data = func()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof AppError ? error : new AppError(
        getErrorMessage(error),
        getErrorCode(error),
        500,
        error
      ),
    }
  }
}

/**
 * Error boundary handler for React components
 */
export function handleErrorBoundary(
  error: Error,
  errorInfo: { componentStack: string },
  onError?: (error: Error, errorInfo: { componentStack: string }) => void
): void {
  console.error('[Error Boundary]', error)
  console.error('[Error Boundary] Component Stack:', errorInfo.componentStack)

  if (onError) {
    onError(error, errorInfo)
  }

  // Log to logging service if available
  if (typeof window !== 'undefined' && (window as any).loggingService) {
    ;(window as any).loggingService.logError(error, 'react-error-boundary', {
      componentStack: errorInfo.componentStack,
    })
  }
}

/**
 * Create error logger
 */
export function createErrorLogger(context: string) {
  return (error: unknown, additionalInfo?: Record<string, unknown>) => {
    const parsed = parseError(error)
    console.error(`[${context}]`, parsed.message, parsed.details)

    // Log to logging service if available
    if (typeof window !== 'undefined' && (window as any).loggingService) {
      ;(window as any).loggingService.logError(error, context, additionalInfo)
    }
  }
}

/**
 * Retry function with error handling
 */
export async function retryOnError<T>(
  func: () => Promise<T>,
  options?: {
    maxRetries?: number
    retryDelay?: number
    shouldRetry?: (error: unknown) => boolean
    onRetry?: (attempt: number, error: unknown) => void
  }
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    shouldRetry = () => true,
    onRetry,
  } = options || {}

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await func()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw new AIRetryExhaustedError(
          `Retry exhausted after ${attempt + 1} attempts`,
          attempt + 1,
          error
        )
      }

      if (onRetry) {
        onRetry(attempt + 1, error)
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }
  }

  throw lastError
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failures: number = 0
  private lastFailureTime: number = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private halfOpenAttempts: number = 3
  ) {}

  async execute<T>(func: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.timeout) {
        this.state = 'half-open'
        console.log('[CircuitBreaker] Entering half-open state')
      } else {
        throw new AppError('Circuit breaker is open', 'CIRCUIT_BREAKER_OPEN', 503)
      }
    }

    try {
      const result = await func()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failures = 0
    if (this.state === 'half-open') {
      this.state = 'closed'
      console.log('[CircuitBreaker] Circuit closed after successful execution')
    }
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.threshold) {
      this.state = 'open'
      console.error('[CircuitBreaker] Circuit opened due to failures')
    }
  }

  reset(): void {
    this.failures = 0
    this.state = 'closed'
    console.log('[CircuitBreaker] Circuit manually reset')
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state
  }
}

/**
 * Aggregate multiple errors
 */
export class AggregateError extends AppError {
  constructor(public errors: Array<Error | AppError>) {
    const messages = errors.map((e) => e.message).join('; ')
    super(`Multiple errors occurred: ${messages}`, 'AGGREGATE_ERROR', 500, {
      count: errors.length,
      errors: errors.map((e) => ({ message: e.message, name: e.name })),
    })
  }
}

/**
 * Validate and throw if invalid
 */
export function assert(
  condition: boolean,
  message: string,
  code: string = 'ASSERTION_ERROR'
): asserts condition {
  if (!condition) {
    throw new AppError(message, code, 400)
  }
}

/**
 * Assert value is not null/undefined
 */
export function assertNotNull<T>(
  value: T | null | undefined,
  message: string = 'Value should not be null'
): T {
  assert(value !== null && value !== undefined, message, 'NULL_ASSERTION')
  return value
}
