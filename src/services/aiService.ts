import type { AIMessage, AIResponse, AIStreamChunk, AIServiceConfig } from '@/types'

const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022'
const DEFAULT_MAX_TOKENS = 4096
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

/**
 * AI Service for Claude API integration
 *
 * Note: Direct API calls from browser expose the API key.
 * For production, implement a backend proxy to protect the key.
 */
class AIService {
  private config: AIServiceConfig | null = null

  /**
   * Initialize the AI service with configuration
   */
  initialize(config: AIServiceConfig): void {
    this.config = {
      ...config,
      model: config.model ?? DEFAULT_MODEL,
      maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
    }
  }

  /**
   * Check if the service is configured
   */
  isConfigured(): boolean {
    return this.config !== null && this.config.apiKey.length > 0
  }

  /**
   * Send a message to Claude and get a response
   */
  async sendMessage(messages: AIMessage[], systemPrompt?: string): Promise<AIResponse> {
    if (!this.config) {
      throw new Error('AI Service not initialized. Call initialize() first.')
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      throw new Error(error.error?.message ?? `API error: ${response.status}`)
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
   * Send a message and stream the response
   */
  async *streamMessage(
    messages: AIMessage[],
    systemPrompt?: string
  ): AsyncGenerator<AIStreamChunk> {
    if (!this.config) {
      throw new Error('AI Service not initialized. Call initialize() first.')
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        stream: true,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
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
              // Ignore parse errors for non-JSON lines
            }
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
