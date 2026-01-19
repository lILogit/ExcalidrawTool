import { useState, useRef, useEffect, useCallback } from 'react'
import { useChatStore, type ChatMessage } from '@/store/chatStore'
import { useSelectionStore } from '@/store/selectionStore'
import { aiService } from '@/services/aiService'
import { serializeSelectionForAI } from '@/utils/elementUtils'
import { executeActions, parseAIResponse } from '@/services/actionParser'
import { CHAT_SYSTEM_PROMPT } from '@/config/prompts'
import type { AIMessage } from '@/types'
import styles from './ChatPanel.module.css'

export function ChatPanel() {
  const { isOpen, messages, isLoading, addMessage, setLoading, setError } = useChatStore()
  const selectedElements = useSelectionStore((state) => state.selectedElements)
  const allElements = useSelectionStore((state) => state.allElements)

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isLoading) return

    if (!aiService.isConfigured()) {
      setError('AI service not configured. Set VITE_ANTHROPIC_API_KEY.')
      return
    }

    // Add user message
    addMessage({
      role: 'user',
      content: trimmedInput,
      context: {
        selectedElements: [...selectedElements],
        allElements: [...allElements],
      },
    })

    setInput('')
    setLoading(true)
    setError(null)

    try {
      // Build context string
      const contextStr = serializeSelectionForAI(selectedElements, allElements)

      // Build message history for AI
      const aiMessages: AIMessage[] = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      // Add current message with context
      aiMessages.push({
        role: 'user',
        content: `${trimmedInput}\n\nCurrent canvas context:\n${contextStr || 'Empty canvas'}`,
      })

      // Call AI
      const response = await aiService.sendMessage(aiMessages, CHAT_SYSTEM_PROMPT)

      // Parse response for actions
      const parsed = parseAIResponse(response.content)
      let actionsExecuted: Array<{ type: string; description: string; executed: boolean }> = []

      if (parsed?.actions && parsed.actions.length > 0) {
        // Execute canvas actions
        const results = await executeActions(parsed.actions, { delayBetween: 100 })
        actionsExecuted = results.map((r, i) => ({
          type: parsed.actions[i].type,
          description: `${parsed.actions[i].type}`,
          executed: r.success,
        }))
      }

      // Add assistant message
      addMessage({
        role: 'assistant',
        content: parsed?.explanation || response.content,
        actions: actionsExecuted.length > 0 ? actionsExecuted : undefined,
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      addMessage({
        role: 'assistant',
        content: `Error: ${errorMsg}`,
      })
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [input, isLoading, messages, selectedElements, allElements, addMessage, setLoading, setError])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion)
    inputRef.current?.focus()
  }

  const selectionInfo = selectedElements.length > 0
    ? `${selectedElements.length} element(s) selected`
    : allElements.length > 0
      ? `${allElements.length} element(s) on canvas`
      : 'Empty canvas'

  return (
    <div className={`${styles.chatPanel} ${isOpen ? styles.open : ''}`}>
      <div className={styles.header}>
        <span className={styles.title}>
          <span>🤖</span>
          AI Assistant
        </span>
        <button className={styles.closeButton} onClick={() => useChatStore.getState().closeChat()}>
          ✕
        </button>
      </div>

      {messages.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>💬</div>
          <div className={styles.emptyTitle}>Chat with AI</div>
          <div className={styles.emptyText}>
            Ask questions about your diagram, request changes, or get suggestions.
          </div>
          <div className={styles.suggestions}>
            <button
              className={styles.suggestion}
              onClick={() => handleSuggestion('Explain what\'s on my canvas')}
            >
              Explain what's on my canvas
            </button>
            <button
              className={styles.suggestion}
              onClick={() => handleSuggestion('Create a simple flowchart')}
            >
              Create a simple flowchart
            </button>
            <button
              className={styles.suggestion}
              onClick={() => handleSuggestion('Suggest improvements for my diagram')}
            >
              Suggest improvements
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.messages}>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className={styles.loadingIndicator}>
              <div className={styles.dots}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
              Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className={styles.inputArea}>
        <div className={styles.contextInfo}>{selectionInfo}</div>
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI about your diagram..."
            disabled={isLoading}
          />
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`${styles.message} ${isUser ? styles.user : styles.assistant}`}>
      <div>{message.content}</div>
      {message.context && message.context.selectedElements && message.context.selectedElements.length > 0 && (
        <div className={styles.messageContext}>
          Context: {message.context.selectedElements.length} element(s) selected
        </div>
      )}
      {message.actions && message.actions.length > 0 && (
        <div className={styles.messageActions}>
          {message.actions.map((action, i) => (
            <div key={i} className={`${styles.actionItem} ${action.executed ? styles.executed : ''}`}>
              {action.executed ? '✓' : '✗'} {action.type}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChatPanel
