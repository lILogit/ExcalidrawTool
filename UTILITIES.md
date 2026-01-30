# Utility Functions and Types

This document provides an overview of the utility modules available in the codebase.

## Validation Utilities (`src/utils/validationUtils.ts`)

Comprehensive input validation for API responses, user inputs, and element data.

### Key Functions

- `validateNotEmpty(value, fieldName)` - Validates that a value is not empty
- `validateAIResponse(content)` - Validates AI response content
- `validateJSON(jsonString)` - Validates JSON structure
- `validateCanvasAction(action)` - Validates canvas action objects
- `validateElementId(id)` - Validates element ID format
- `validateElementText(text)` - Validates text content
- `validateColor(color)` - Validates color codes
- `validateElementStyle(style)` - Validates style objects
- `validateElements(elements)` - Validates arrays of elements
- `sanitizeInput(input)` - Sanitizes user input to prevent XSS
- `validateBatch(items, validator)` - Batch validation

### Example Usage

```typescript
import { validateAIResponse, validateElements } from '@/utils/validationUtils'

// Validate AI response
const result = validateAIResponse(aiResponseText)
if (!result.isValid) {
  console.error('Invalid AI response:', result.errors)
}

// Validate elements
const elementsResult = validateElements(elementsArray)
if (!elementsResult.isValid) {
  console.error('Invalid elements:', elementsResult.errors)
}
```

## Performance Utilities (`src/utils/performanceUtils.ts`)

Performance optimization utilities including debouncing, throttling, caching, and memoization.

### Key Functions

#### Debouncing
- `debounce(func, wait)` - Standard debounce
- `debounceLeading(func, wait)` - Debounce with immediate leading execution

#### Throttling
- `throttle(func, wait)` - Standard throttle
- `rafThrottle(func)` - RequestAnimationFrame-based throttle

#### Caching & Memoization
- `Cache<K, V>` - Generic cache class with TTL support
- `memoize(func, options)` - Memoize synchronous functions
- `memoizeAsync(func, options)` - Memoize async functions
- `createWeakMemoCache()` - Create a WeakMap-based cache

#### Batching
- `batch(func, wait)` - Batch multiple function calls
- `chunk(array, size)` - Partition array into chunks
- `processBatch(items, processor, batchSize)` - Process items in parallel batches

#### Performance Measurement
- `measureTime(func, label)` - Measure synchronous execution time
- `measureTimeAsync(func, label)` - Measure async execution time

#### Other Utilities
- `rateLimit(func, maxCalls, period)` - Rate limit function calls
- `lazy(initializer)` - Lazy initialization
- `withTimeout(func, timeoutMs)` - Execute with timeout
- `retryWithBackoff(func, maxRetries)` - Retry with exponential backoff

### Example Usage

```typescript
import { debounce, memoize, Cache } from '@/utils/performanceUtils'

// Debounce search input
const debouncedSearch = debounce((query: string) => {
  console.log('Searching for:', query)
}, 300)

// Memoize expensive computation
const expensiveComputation = memoize((data: number[]) => {
  return data.reduce((sum, n) => sum + n * n, 0)
}, { ttl: 60000 })

// Create a cache
const cache = new Cache<string, any>(5 * 60 * 1000) // 5 minutes TTL
cache.set('key', data)
const cached = cache.get('key')
```

## Error Handling Utilities (`src/utils/errorUtils.ts`)

Custom error classes and error handling utilities for better error management.

### Custom Error Classes

#### Base Errors
- `AppError` - Base application error
- `ValidationError` - Validation error with field details

#### AI Service Errors
- `AIServiceError` - General AI service errors
- `AIConfigError` - AI configuration errors
- `AIRequestError` - AI request errors
- `AIResponseError` - AI response errors
- `AIRetryExhaustedError` - Retry limit exceeded

#### Canvas Errors
- `CanvasError` - General canvas errors
- `CanvasAPIError` - Canvas API errors
- `ElementNotFoundError` - Element not found
- `ElementValidationError` - Element validation failed

#### Network Errors
- `NetworkError` - Network-related errors
- `WebhookError` - Webhook errors

### Error Handling Functions

- `isAppError(error)` - Type guard for AppError
- `getErrorMessage(error)` - Extract error message
- `getErrorCode(error)` - Extract error code
- `parseError(error)` - Parse error to standardized format
- `safeAsync(func, errorWrapper)` - Async error wrapper
- `safeSync(func, errorWrapper)` - Sync error wrapper
- `resultAsync(func)` - Wrap async in Result type
- `resultSync(func)` - Wrap sync in Result type

### Advanced Error Handling

- `CircuitBreaker` - Circuit breaker pattern for fault tolerance
- `retryOnError(func, options)` - Retry with error handling
- `AggregateError` - Aggregate multiple errors
- `assert(condition, message)` - Assert condition
- `assertNotNull(value, message)` - Assert not null

### Example Usage

```typescript
import {
  AIServiceError,
  ElementNotFoundError,
  safeAsync,
  resultAsync,
  CircuitBreaker
} from '@/utils/errorUtils'

// Throw custom error
throw new ElementNotFoundError('element-123')

// Wrap unsafe async function
const safeResult = await safeAsync(
  async () => await riskyOperation(),
  (error) => new AIServiceError('AI request failed', error)
)

// Use Result type
const result = await resultAsync(() => fetchData())
if (isSuccess(result)) {
  console.log(result.data)
} else {
  console.error(result.error)
}

// Circuit breaker
const circuitBreaker = new CircuitBreaker(5, 60000) // 5 failures, 60s timeout
const data = await circuitBreaker.execute(() => fetchAPI())
```

## TypeScript Utility Types (`src/types/utils.ts`)

Advanced TypeScript types and type guards for type-safe code.

### Primitive Type Utilities

- `RequireFields<T, K>` - Make specific fields required
- `PartialFields<T, K>` - Make specific fields optional
- `DeepPartial<T>` - Deep partial type
- `DeepReadonly<T>` - Deep readonly type
- `DeepRequired<T>` - Deep required type

### Function Types

- `AsyncFunction<T, R>` - Async function type
- `MaybeAsyncFunction<T, R>` - Sync or async function
- `Parameters<T>` - Extract parameters
- `ReturnType<T>` - Extract return type
- `AsyncReturnType<T>` - Extract async return type

### Union & Collection Types

- `Dictionary<T>` - Object with string keys
- `Nullable<T>` - T | null
- `Optional<T>` - T | undefined
- `OneOrMany<T>` - T | T[]
- `PromiseValue<T>` - Unwrap Promise type

### Result Types

- `Result<T, E>` - Result type for operations
- `Success<T>` - Success result
- `Failure<E>` - Error result
- `isSuccess(result)` - Type guard for success
- `isFailure(result)` - Type guard for failure

### Option/Maybe Types

- `Option<T>` - Optional value type
- `Some<T>` - Some value
- `None` - None value
- `some(value)` - Create Some
- `none` - None constant

### Type Guards

- `isObject(value)` - Check if object
- `isArray(value, guard?)` - Check if array
- `isPromise(value)` - Check if promise
- `isDate(value)` - Check if date
- `isDefined(value)` - Check if not null/undefined

### Example Usage

```typescript
import {
  Result,
  Option,
  isObject,
  isDefined,
  Dictionary,
  DeepPartial
} from '@/types/utils'

// Use Result type
function processData(): Result<string> {
  if (isValid()) {
    return success('Data processed')
  }
  return failure(new Error('Invalid data'))
}

// Use Option type
function findValue(id: string): Option<string> {
  const value = map.get(id)
  return value !== undefined ? some(value) : none
}

// Use type guards
if (isObject(data) && isDefined(data.name)) {
  console.log(data.name)
}

// Use Dictionary type
const config: Dictionary<string> = {
  apiUrl: 'https://api.example.com',
  timeout: '5000',
}
```

## Using the Utils Index

All utilities can be imported from the central index:

```typescript
// Import all utilities from central index
import {
  // Validation
  validateAIResponse,
  validateElements,
  sanitizeInput,

  // Performance
  debounce,
  throttle,
  memoize,
  Cache,

  // Error handling
  AppError,
  AIServiceError,
  safeAsync,
  resultAsync,
  CircuitBreaker,

  // Element utilities
  isShapeElement,
  isTextElement,
  getElementText,
} from '@/utils'
```

## Best Practices

### Validation
- Always validate external data (API responses, user input)
- Use sanitization for user-generated content
- Use batch validation for arrays
- Return structured validation results

### Performance
- Debounce user inputs (search, type-ahead)
- Throttle high-frequency events (scroll, resize)
- Memoize expensive computations
- Use caching for repeated operations
- Process large datasets in batches

### Error Handling
- Use specific error types for different scenarios
- Wrap third-party API calls with error handlers
- Use Result types for operations that can fail
- Implement circuit breakers for external services
- Provide meaningful error messages

### TypeScript
- Leverage utility types for type safety
- Use type guards for runtime type checking
- Use discriminated unions for state management
- Use branded types for value constraints
- Make data structures immutable where possible
