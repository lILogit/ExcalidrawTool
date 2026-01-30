/**
 * Performance utility functions for debouncing, throttling, and memoization
 */

/**
 * Debounce function - delays execution until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function debounced(...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
      timeoutId = null
    }, wait)
  }
}

/**
 * Debounce with immediate execution on leading edge
 */
export function debounceLeading<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastCallTime = 0

  return function debounced(...args: Parameters<T>) {
    const now = Date.now()
    const timeSinceLastCall = now - lastCallTime

    if (timeSinceLastCall >= wait) {
      func(...args)
      lastCallTime = now
    } else {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        func(...args)
        lastCallTime = Date.now()
        timeoutId = null
      }, wait - timeSinceLastCall)
    }
  }
}

/**
 * Throttle function - ensures execution at most once per wait milliseconds
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastRunTime = 0
  let lastArgs: Parameters<T> | null = null

  return function throttled(...args: Parameters<T>) {
    const now = Date.now()
    const timeSinceLastRun = now - lastRunTime

    lastArgs = args

    if (timeSinceLastRun >= wait) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }

      func(...args)
      lastRunTime = now
    } else if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        if (lastArgs) {
          func(...lastArgs)
        }
        lastRunTime = Date.now()
        timeoutId = null
        lastArgs = null
      }, wait - timeSinceLastRun)
    }
  }
}

/**
 * Simple cache for memoization with TTL support
 */
export class Cache<K, V> {
  private cache: Map<K, { value: V; expiresAt: number }>
  private defaultTTL: number

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    // Default TTL: 5 minutes
    this.cache = new Map()
    this.defaultTTL = defaultTTL
  }

  /**
   * Get a value from cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      return undefined
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }

    return entry.value
  }

  /**
   * Set a value in cache with optional TTL
   */
  set(key: K, value: V, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL)
    this.cache.set(key, { value, expiresAt })
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: K): boolean {
    return this.get(key) !== undefined
  }

  /**
   * Delete a key from cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let removed = 0
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        removed++
      }
    }

    return removed
  }
}

/**
 * Memoize a function with optional cache and TTL
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  func: T,
  options?: {
    keyGenerator?: (...args: Parameters<T>) => string
    ttl?: number
    cache?: Cache<string, ReturnType<T>>
  }
): T {
  const cache = options?.cache ?? new Cache<string, ReturnType<T>>(options?.ttl)
  const keyGenerator = options?.keyGenerator ?? ((...args: Parameters<T>) => JSON.stringify(args))

  return function memoized(...args: Parameters<T>): ReturnType<T> {
    const key = keyGenerator(...args)
    const cached = cache.get(key)

    if (cached !== undefined) {
      return cached
    }

    const result = func(...args) as ReturnType<T>
    cache.set(key, result)
    return result
  } as T
}

/**
 * Create a memoized version of an async function
 */
export function memoizeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  func: T,
  options?: {
    keyGenerator?: (...args: Parameters<T>) => string
    ttl?: number
    cache?: Cache<string, Awaited<ReturnType<T>>>
  }
): T {
  const pendingRequests = new Map<string, Promise<Awaited<ReturnType<T>>>>()
  const cache = options?.cache ?? new Cache<string, Awaited<ReturnType<T>>>(options?.ttl)
  const keyGenerator = options?.keyGenerator ?? ((...args: Parameters<T>) => JSON.stringify(args))

  return function memoizedAsync(...args: Parameters<T>): ReturnType<T> {
    const key = keyGenerator(...args)

    // Check cache first
    const cached = cache.get(key)
    if (cached !== undefined) {
      return Promise.resolve(cached) as ReturnType<T>
    }

    // Check if there's a pending request for this key
    const pending = pendingRequests.get(key)
    if (pending) {
      return pending as ReturnType<T>
    }

    // Create new request
    const promise = func(...args).then((result) => {
      cache.set(key, result as Awaited<ReturnType<T>>)
      pendingRequests.delete(key)
      return result as Awaited<ReturnType<T>>
    })

    pendingRequests.set(key, promise)
    return promise as ReturnType<T>
  } as T
}

/**
 * Request animation frame throttled function
 */
export function rafThrottle<T extends (...args: unknown[]) => void>(func: T): T {
  let rafId: number | null = null
  let lastArgs: Parameters<T> | null = null

  return function rafThrottled(...args: Parameters<T>) {
    lastArgs = args

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          func(...lastArgs)
        }
        rafId = null
        lastArgs = null
      })
    }
  } as T
}

/**
 * Batch multiple function calls into a single execution
 */
export function batch<T>(
  func: (items: T[]) => void,
  wait: number = 0
): (item: T) => void {
  let batchedItems: T[] = []
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function batchItem(item: T) {
    batchedItems.push(item)

    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(batchedItems)
      batchedItems = []
      timeoutId = null
    }, wait)
  }
}

/**
 * Measure execution time of a function
 */
export function measureTime<T extends (...args: unknown[]) => unknown>(
  func: T,
  label?: string
): T {
  return function measured(...args: Parameters<T>): ReturnType<T> {
    const start = performance.now()
    const result = func(...args) as ReturnType<T>
    const end = performance.now()
    const duration = end - start

    if (import.meta.env.VITE_AI_DEBUG === 'true') {
      console.log(`[Performance] ${label || func.name || 'Anonymous'}: ${duration.toFixed(2)}ms`)
    }

    return result
  } as T
}

/**
 * Measure execution time of an async function
 */
export function measureTimeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  func: T,
  label?: string
): T {
  return async function measured(...args: Parameters<T>): Promise<ReturnType<T>> {
    const start = performance.now()
    const result = await func(...args) as Awaited<ReturnType<T>>
    const end = performance.now()
    const duration = end - start

    if (import.meta.env.VITE_AI_DEBUG === 'true') {
      console.log(`[Performance] ${label || func.name || 'Anonymous'}: ${duration.toFixed(2)}ms`)
    }

    return result as ReturnType<T>
  } as T
}

/**
 * Create a rate limiter that allows maxCalls calls per period
 */
export function rateLimit<T extends (...args: unknown[]) => unknown>(
  func: T,
  maxCalls: number,
  period: number
): T {
  let calls: number[] = []

  return function rateLimited(...args: Parameters<T>): ReturnType<T> {
    const now = Date.now()

    // Remove old calls outside the period
    calls = calls.filter((callTime) => now - callTime < period)

    if (calls.length >= maxCalls) {
      throw new Error(`Rate limit exceeded: ${maxCalls} calls per ${period}ms`)
    }

    calls.push(now)
    return func(...args) as ReturnType<T>
  } as T
}

/**
 * Lazy initialization - create value only when first accessed
 */
export function lazy<T>(initializer: () => T): () => T {
  let initialized = false
  let value: T

  return function getLazy(): T {
    if (!initialized) {
      value = initializer()
      initialized = true
    }
    return value
  }
}

/**
 * Create a weak map cache for memoizing object-based operations
 */
export function createWeakMemoCache<TKey extends object, TValue>(): WeakMap<TKey, TValue> {
  return new WeakMap<TKey, TValue>()
}

/**
 * Execute function with timeout
 */
export function withTimeout<T>(
  func: () => Promise<T>,
  timeoutMs: number,
  timeoutError: Error = new Error(`Operation timed out after ${timeoutMs}ms`)
): Promise<T> {
  return Promise.race([
    func(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(timeoutError), timeoutMs)
    ),
  ])
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  func: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await func()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 100, maxDelay)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

/**
 * Partition array into chunks of specified size
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Process array items in parallel batches
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number
): Promise<R[]> {
  const chunks = chunk(items, batchSize)
  const results: R[] = []

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(chunk.map(processor))
    results.push(...chunkResults)
  }

  return results
}
