import type { AIMessage, AIResponse, AIStreamChunk, AIServiceConfig, AIProvider, AIResponseStats, ModelParameters } from '@/types'

// Default configuration from environment
const DEFAULT_ANTHROPIC_MODEL = import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'
const DEFAULT_OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2'
const DEFAULT_MAX_TOKENS = Number(import.meta.env.VITE_AI_MAX_TOKENS) || 4096
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_OLLAMA_URL = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434'

// Model parameters from environment
const DEFAULT_PARAMETERS: ModelParameters = {
  temperature: Number(import.meta.env.VITE_AI_TEMPERATURE) || 0.7,
  topP: Number(import.meta.env.VITE_AI_TOP_P) || 0.9,
  topK: Number(import.meta.env.VITE_AI_TOP_K) || 40,
  repeatPenalty: Number(import.meta.env.VITE_AI_REPEAT_PENALTY) || 1.1,
  seed: import.meta.env.VITE_AI_SEED ? Number(import.meta.env.VITE_AI_SEED) : undefined,
}

const DEBUG_ENABLED = import.meta.env.VITE_AI_DEBUG === 'true'

// Retry configuration from environment
const DEFAULT_MAX_RETRIES = Number(import.meta.env.VITE_AI_MAX_RETRIES) || 3
const DEFAULT_RETRY_DELAY = Number(import.meta.env.VITE_AI_RETRY_DELAY) || 1000

/**
 * Response validator function type
 * Returns true if response is valid, false if retry is needed
 */
export type ResponseValidator = (content: string) => boolean

/**
 * Retry options for AI requests
 */
export interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  validator?: ResponseValidator
  onRetry?: (attempt: number, error: string) => void
}

/**
 * Default validators for common response formats
 */
export const ResponseValidators = {
  /** Validates that response is not empty */
  notEmpty: (content: string): boolean => {
    const trimmed = content.trim()
    // Also reject empty arrays "[]" and empty objects "{}"
    if (trimmed === '[]' || trimmed === '{}') return false
    return trimmed.length > 0
  },

  /** Validates that response is valid JSON */
  isJSON: (content: string): boolean => {
    try {
      JSON.parse(content.trim())
      return true
    } catch {
      return false
    }
  },

  /** Validates that response is a non-empty JSON array */
  isJSONArray: (content: string): boolean => {
    try {
      const parsed = JSON.parse(content.trim())
      return Array.isArray(parsed) && parsed.length > 0
    } catch {
      // Try to extract array from response
      const arrayMatch = content.match(/\[[\s\S]*\]/)
      if (arrayMatch) {
        try {
          const parsed = JSON.parse(arrayMatch[0])
          return Array.isArray(parsed) && parsed.length > 0
        } catch {
          return false
        }
      }
      return false
    }
  },

  /** Validates that response contains a non-empty JSON array (can be in code block) */
  containsJSONArray: (content: string): boolean => {
    const trimmed = content.trim()

    // Quick check for empty array
    if (trimmed === '[]') {
      console.log('[Validator] containsJSONArray: Rejected empty array "[]"')
      return false
    }

    // Direct parse
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        if (parsed.length > 0) {
          console.log('[Validator] containsJSONArray: Valid array with', parsed.length, 'items')
          return true
        } else {
          console.log('[Validator] containsJSONArray: Rejected empty array')
          return false
        }
      }
    } catch {
      // Continue to other methods
    }

    // Code block extraction
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1].trim())
        if (Array.isArray(parsed)) {
          if (parsed.length > 0) return true
          console.log('[Validator] containsJSONArray: Rejected empty array in code block')
          return false
        }
      } catch {
        // Continue
      }
    }

    // Array pattern match
    const arrayMatch = content.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0])
        if (Array.isArray(parsed)) {
          if (parsed.length > 0) return true
          console.log('[Validator] containsJSONArray: Rejected empty array from pattern')
          return false
        }
      } catch {
        // Continue
      }
    }

    console.log('[Validator] containsJSONArray: No valid array found')
    return false
  },

  /** Validates that response is a JSON object with specific keys */
  hasKeys: (...keys: string[]): ResponseValidator => {
    return (content: string): boolean => {
      try {
        const parsed = JSON.parse(content.trim())
        return keys.every(key => key in parsed)
      } catch {
        return false
      }
    }
  },
}

/**
 * AI Service supporting multiple providers (Anthropic Claude, Ollama)
 * With debug logging and model parameter configuration
 */
class AIService {
  private config: AIServiceConfig | null = null
  private lastStats: AIResponseStats | null = null
  private responseHistory: AIResponseStats[] = []

  /**
   * Initialize the AI service with configuration
   */
  initialize(config: AIServiceConfig): void {
    const defaultModel = config.provider === 'ollama' ? DEFAULT_OLLAMA_MODEL : DEFAULT_ANTHROPIC_MODEL

    this.config = {
      ...config,
      model: config.model ?? defaultModel,
      maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
      baseUrl: config.baseUrl ?? (config.provider === 'ollama' ? DEFAULT_OLLAMA_URL : undefined),
      parameters: { ...DEFAULT_PARAMETERS, ...config.parameters },
      debug: config.debug ?? DEBUG_ENABLED,
    }

    this.log('info', `AI Service initialized`, {
      provider: config.provider,
      model: this.config.model,
      baseUrl: this.config.baseUrl,
      parameters: this.config.parameters,
    })
  }

  /**
   * Debug logging helper
   */
  private log(level: 'info' | 'debug' | 'warn' | 'error', message: string, data?: unknown): void {
    if (!this.config?.debug && level === 'debug') return

    const timestamp = new Date().toISOString()
    const prefix = `[AIService ${timestamp}]`

    switch (level) {
      case 'info':
        console.log(`${prefix} ${message}`, data ?? '')
        break
      case 'debug':
        console.debug(`${prefix} ${message}`, data ?? '')
        break
      case 'warn':
        console.warn(`${prefix} ${message}`, data ?? '')
        break
      case 'error':
        console.error(`${prefix} ${message}`, data ?? '')
        break
    }
  }

  /**
   * Get current provider
   */
  getProvider(): AIProvider | null {
    return this.config?.provider ?? null
  }

  /**
   * Get current model name
   */
  getModel(): string | null {
    return this.config?.model ?? null
  }

  /**
   * Get current configuration (for display)
   */
  getConfig(): AIServiceConfig | null {
    return this.config
  }

  /**
   * Get last response statistics
   */
  getLastStats(): AIResponseStats | null {
    return this.lastStats
  }

  /**
   * Get response history
   */
  getResponseHistory(): AIResponseStats[] {
    return [...this.responseHistory]
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    if (!this.config) return false

    if (this.config.provider === 'anthropic') {
      return !!this.config.apiKey && this.config.apiKey.length > 0
    }

    return true
  }

  /**
   * Record response statistics
   */
  private recordStats(stats: AIResponseStats): void {
    this.lastStats = stats
    this.responseHistory.push(stats)

    // Keep only last 50 responses
    if (this.responseHistory.length > 50) {
      this.responseHistory.shift()
    }

    this.log('info', `Response completed`, {
      model: stats.model,
      tokens: `${stats.promptTokens} prompt + ${stats.completionTokens} completion = ${stats.totalTokens} total`,
      duration: `${stats.durationMs}ms`,
    })
  }

  /**
   * Send a message and get a response
   */
  async sendMessage(messages: AIMessage[], systemPrompt?: string): Promise<AIResponse> {
    if (!this.config) {
      throw new Error('AI Service not initialized. Call initialize() first.')
    }

    const startTime = Date.now()

    this.log('debug', 'Sending message', {
      provider: this.config.provider,
      model: this.config.model,
      messageCount: messages.length,
      systemPromptLength: systemPrompt?.length ?? 0,
    })

    try {
      const response = this.config.provider === 'ollama'
        ? await this.sendOllamaMessage(messages, systemPrompt)
        : await this.sendAnthropicMessage(messages, systemPrompt)

      const stats: AIResponseStats = {
        provider: this.config.provider,
        model: this.config.model!,
        promptTokens: response.usage?.inputTokens ?? 0,
        completionTokens: response.usage?.outputTokens ?? 0,
        totalTokens: (response.usage?.inputTokens ?? 0) + (response.usage?.outputTokens ?? 0),
        durationMs: Date.now() - startTime,
        timestamp: new Date(),
      }

      this.recordStats(stats)

      this.log('debug', 'Response received', {
        contentLength: response.content.length,
        contentPreview: response.content.substring(0, 200) + (response.content.length > 200 ? '...' : ''),
      })

      return response
    } catch (error) {
      this.log('error', 'Request failed', error)
      throw error
    }
  }

  /**
   * Send a message with automatic retry on invalid/empty responses
   * @param messages - The messages to send
   * @param systemPrompt - Optional system prompt
   * @param options - Retry options including validator function
   * @returns The validated AI response
   */
  async sendMessageWithRetry(
    messages: AIMessage[],
    systemPrompt?: string,
    options: RetryOptions = {}
  ): Promise<AIResponse> {
    const {
      maxRetries = DEFAULT_MAX_RETRIES,
      retryDelay = DEFAULT_RETRY_DELAY,
      validator = ResponseValidators.notEmpty,
      onRetry,
    } = options

    let lastError: Error | null = null
    let lastResponse: AIResponse | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[AIService] Attempt ${attempt}/${maxRetries}`)

        const response = await this.sendMessage(messages, systemPrompt)
        lastResponse = response

        console.log(`[AIService] Response received, content: "${response.content.substring(0, 50)}${response.content.length > 50 ? '...' : ''}"`)

        // Validate the response
        const isValid = validator(response.content)
        console.log(`[AIService] Validation result: ${isValid}`)

        if (isValid) {
          console.log(`[AIService] Response validated on attempt ${attempt}`)
          return response
        }

        // Response invalid - prepare for retry
        const validationError = `Response validation failed on attempt ${attempt}: "${response.content.substring(0, 50)}"`
        console.warn(`[AIService] ${validationError}`)
        this.log('warn', validationError, {
          contentPreview: response.content.substring(0, 100),
        })

        if (onRetry) {
          onRetry(attempt, validationError)
        }

        // Don't delay on the last attempt
        if (attempt < maxRetries) {
          console.log(`[AIService] Waiting ${retryDelay}ms before retry...`)
          await this.delay(retryDelay)
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        this.log('error', `Request failed on attempt ${attempt}`, error)

        if (onRetry) {
          onRetry(attempt, lastError.message)
        }

        // Don't delay on the last attempt
        if (attempt < maxRetries) {
          this.log('debug', `Waiting ${retryDelay}ms before retry...`)
          await this.delay(retryDelay)
        }
      }
    }

    // All retries exhausted
    if (lastResponse) {
      // Return the last response even if invalid, let caller handle it
      this.log('warn', `All ${maxRetries} attempts failed validation, returning last response`)
      return lastResponse
    }

    // No successful response at all
    throw lastError || new Error(`All ${maxRetries} retry attempts failed`)
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Send message to Anthropic Claude API
   */
  private async sendAnthropicMessage(messages: AIMessage[], systemPrompt?: string): Promise<AIResponse> {
    if (!this.config?.apiKey) {
      throw new Error('Anthropic API key not configured')
    }

    // Build request body - Anthropic only accepts temperature OR top_p, not both
    // We use temperature as the primary parameter for Anthropic
    const requestBody: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }

    // Only include temperature (Anthropic doesn't accept top_p with temperature)
    if (this.config.parameters?.temperature !== undefined) {
      requestBody.temperature = this.config.parameters.temperature
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      throw new Error(error.error?.message ?? `Anthropic API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      content: data.content[0]?.text ?? '',
      usage: {
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
      },
    }
  }

  /**
   * Send message to Ollama API
   */
  private async sendOllamaMessage(messages: AIMessage[], systemPrompt?: string): Promise<AIResponse> {
    const baseUrl = this.config?.baseUrl || DEFAULT_OLLAMA_URL

    const ollamaMessages: Array<{ role: string; content: string }> = []

    if (systemPrompt) {
      ollamaMessages.push({ role: 'system', content: systemPrompt })
    }

    ollamaMessages.push(
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
    )

    const options: Record<string, unknown> = {
      num_predict: this.config?.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: this.config?.parameters?.temperature,
      top_p: this.config?.parameters?.topP,
      top_k: this.config?.parameters?.topK,
      repeat_penalty: this.config?.parameters?.repeatPenalty,
    }

    if (this.config?.parameters?.seed !== undefined) {
      options.seed = this.config.parameters.seed
    }

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config?.model || DEFAULT_OLLAMA_MODEL,
        messages: ollamaMessages,
        stream: false,
        options,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    return {
      content: data.message?.content ?? '',
      usage: {
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
      },
    }
  }

  /**
   * Send a message and stream the response
   */
  async *streamMessage(
    messages: AIMessage[],
    systemPrompt?: string
  ): AsyncGenerator<AIStreamChunk> {
    if (!this.config) {
      throw new Error('AI Service not initialized. Call initialize() first.')
    }

    if (this.config.provider === 'ollama') {
      yield* this.streamOllamaMessage(messages, systemPrompt)
    } else {
      yield* this.streamAnthropicMessage(messages, systemPrompt)
    }
  }

  /**
   * Stream message from Anthropic Claude API
   */
  private async *streamAnthropicMessage(
    messages: AIMessage[],
    systemPrompt?: string
  ): AsyncGenerator<AIStreamChunk> {
    if (!this.config?.apiKey) {
      yield { type: 'error', content: 'Anthropic API key not configured' }
      return
    }

    // Build request body - Anthropic only accepts temperature OR top_p, not both
    const requestBody: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      stream: true,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }

    // Only include temperature (Anthropic doesn't accept top_p with temperature)
    if (this.config.parameters?.temperature !== undefined) {
      requestBody.temperature = this.config.parameters.temperature
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      yield { type: 'error', content: error.error?.message ?? `API error: ${response.status}` }
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      yield { type: 'error', content: 'No response body' }
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              yield { type: 'done', content: '' }
              return
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content_block_delta') {
                const text = parsed.delta?.text ?? ''
                if (text) {
                  yield { type: 'text', content: text }
                }
              } else if (parsed.type === 'message_stop') {
                yield { type: 'done', content: '' }
                return
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield { type: 'done', content: '' }
  }

  /**
   * Stream message from Ollama API
   */
  private async *streamOllamaMessage(
    messages: AIMessage[],
    systemPrompt?: string
  ): AsyncGenerator<AIStreamChunk> {
    const baseUrl = this.config?.baseUrl || DEFAULT_OLLAMA_URL

    const ollamaMessages: Array<{ role: string; content: string }> = []

    if (systemPrompt) {
      ollamaMessages.push({ role: 'system', content: systemPrompt })
    }

    ollamaMessages.push(
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
    )

    const options: Record<string, unknown> = {
      num_predict: this.config?.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: this.config?.parameters?.temperature,
      top_p: this.config?.parameters?.topP,
      top_k: this.config?.parameters?.topK,
      repeat_penalty: this.config?.parameters?.repeatPenalty,
    }

    if (this.config?.parameters?.seed !== undefined) {
      options.seed = this.config.parameters.seed
    }

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config?.model || DEFAULT_OLLAMA_MODEL,
        messages: ollamaMessages,
        stream: true,
        options,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      yield { type: 'error', content: `Ollama API error: ${response.status} - ${errorText}` }
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      yield { type: 'error', content: 'No response body' }
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const parsed = JSON.parse(line)
            if (parsed.done) {
              yield { type: 'done', content: '' }
              return
            }
            if (parsed.message?.content) {
              yield { type: 'text', content: parsed.message.content }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield { type: 'done', content: '' }
  }
}

// Export singleton instance
export const aiService = new AIService()

// Export class for testing
export { AIService }
