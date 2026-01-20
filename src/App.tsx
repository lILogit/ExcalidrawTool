import { useEffect, useCallback, useState } from 'react'
import { ExcalidrawCanvas } from '@/components/Canvas/ExcalidrawCanvas'
import { ContextMenu } from '@/components/UI/ContextMenu'
import { ChatPanel } from '@/components/UI/ChatPanel'
import { CanvasContextModal } from '@/components/UI/CanvasContextModal'
import { aiService } from '@/services/aiService'
import { updateWording, makeConcise, improveClarity, expandConcept, suggestConnections, explainDiagram, summarizeDiagram } from '@/services/aiActions'
import { useSelection } from '@/hooks/useSelection'
import { useChatStore } from '@/store/chatStore'
import { useCanvasStore } from '@/store/canvasStore'
import { showAIChangeFeedback, showAIActionToast } from '@/utils/visualFeedback'
import type { ExcalidrawElement } from '@/types'

function App() {
  const selection = useSelection()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isContextModalOpen, setIsContextModalOpen] = useState(false)
  const canvasContext = useCanvasStore((state) => state.canvasContext)

  // Initialize AI service with provider from environment
  useEffect(() => {
    const provider = (import.meta.env.VITE_AI_PROVIDER || 'anthropic') as 'anthropic' | 'ollama'
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    const ollamaBaseUrl = import.meta.env.VITE_OLLAMA_BASE_URL
    const ollamaModel = import.meta.env.VITE_OLLAMA_MODEL

    if (provider === 'ollama') {
      aiService.initialize({
        provider: 'ollama',
        baseUrl: ollamaBaseUrl,
        model: ollamaModel,
      })
      console.log('AI Service initialized with Ollama')
    } else if (apiKey) {
      aiService.initialize({
        provider: 'anthropic',
        apiKey,
      })
      console.log('AI Service initialized with Anthropic')
    } else {
      console.warn('AI provider not configured - set VITE_AI_PROVIDER=ollama or VITE_ANTHROPIC_API_KEY')
    }
  }, [])

  // Handle context menu actions
  const handleContextMenuAction = useCallback(
    async (actionId: string, selectionParam: { selectedElements: ExcalidrawElement[], allElements: ExcalidrawElement[] }) => {
      if (isProcessing) return

      // Use selection passed directly from context menu (avoids race conditions)
      const { selectedElements, allElements } = selectionParam

      console.log(`[App] Action triggered: ${actionId}`, { selectedCount: selectedElements.length, allCount: allElements.length })

      // Handle different actions
      switch (actionId) {
        case 'update-wording':
          console.log('[App] update-wording action, selectedElements:', selectedElements.length, 'allElements:', allElements.length)
          if (selectedElements.length > 0) {
            setIsProcessing(true)
            console.log('[App] Updating wording with AI...', selectedElements.map(e => ({ id: e.id, type: e.type })))
            try {
              const results = await updateWording(
                selectedElements,
                allElements
              )
              console.log('[App] updateWording results:', results)
              const successIds = results.filter(r => r.success).map(r => r.elementId)
              results.forEach((r) => {
                if (r.success && r.newText) {
                  console.log(`Updated: "${r.originalText}" → "${r.newText}"`)
                } else if (r.error) {
                  console.error(`Error: ${r.error}`)
                }
              })
              if (successIds.length > 0) {
                showAIChangeFeedback(successIds, `Updated ${successIds.length} element(s)`)
              }
            } finally {
              setIsProcessing(false)
            }
          }
          break

        case 'improve-clarity':
          if (selectedElements.length > 0) {
            setIsProcessing(true)
            console.log('Improving clarity with AI...')
            try {
              const results = await improveClarity(
                selectedElements,
                allElements
              )
              const successIds = results.filter(r => r.success).map(r => r.elementId)
              results.forEach((r) => {
                if (r.success && r.newText) {
                  console.log(`Improved: "${r.originalText}" → "${r.newText}"`)
                } else if (r.error) {
                  console.error(`Error: ${r.error}`)
                }
              })
              if (successIds.length > 0) {
                showAIChangeFeedback(successIds, `Improved ${successIds.length} element(s)`)
              }
            } finally {
              setIsProcessing(false)
            }
          }
          break

        case 'make-concise':
          if (selectedElements.length > 0) {
            setIsProcessing(true)
            console.log('Making concise with AI...')
            try {
              const results = await makeConcise(
                selectedElements,
                allElements
              )
              const successIds = results.filter(r => r.success).map(r => r.elementId)
              results.forEach((r) => {
                if (r.success && r.newText) {
                  console.log(`Shortened: "${r.originalText}" → "${r.newText}"`)
                } else if (r.error) {
                  console.error(`Error: ${r.error}`)
                }
              })
              if (successIds.length > 0) {
                showAIChangeFeedback(successIds, `Shortened ${successIds.length} element(s)`)
              }
            } finally {
              setIsProcessing(false)
            }
          }
          break

        case 'suggest-connections':
          if (selectedElements.length >= 2) {
            setIsProcessing(true)
            console.log('Suggesting connections with AI...')
            try {
              const result = await suggestConnections(
                selectedElements,
                allElements
              )
              if (result.success) {
                console.log(`Created ${result.createdConnections.length} connections`)
                result.suggestions.forEach((s) => {
                  console.log(`  ${s.fromId} → ${s.toId}: ${s.reason}`)
                })
                if (result.createdConnections.length > 0) {
                  showAIChangeFeedback(
                    result.createdConnections,
                    `Created ${result.createdConnections.length} connection(s)`
                  )
                }
              } else {
                console.error(`Error: ${result.error}`)
                showAIActionToast(result.error || 'Failed to suggest connections', 'error')
              }
            } finally {
              setIsProcessing(false)
            }
          } else {
            showAIActionToast('Select at least 2 elements', 'info')
          }
          break

        case 'expand-concept':
          if (selectedElements.length === 1) {
            setIsProcessing(true)
            console.log('Expanding concept with AI...')
            try {
              const result = await expandConcept(
                selectedElements[0],
                allElements,
                { count: 3, direction: 'right' }
              )
              if (result.success) {
                console.log(`Generated ${result.concepts.length} concepts:`)
                result.concepts.forEach((c) => console.log(`  - ${c}`))
                if (result.createdElements.length > 0) {
                  showAIChangeFeedback(
                    result.createdElements,
                    `Expanded into ${result.concepts.length} concepts`
                  )
                }
              } else {
                console.error(`Error: ${result.error}`)
                showAIActionToast(result.error || 'Failed to expand concept', 'error')
              }
            } finally {
              setIsProcessing(false)
            }
          } else {
            showAIActionToast('Select exactly 1 element to expand', 'info')
          }
          break

        case 'summarize':
          setIsProcessing(true)
          console.log('Summarizing with AI...')
          try {
            const result = await summarizeDiagram(selectedElements, allElements)
            if (result.success) {
              // Open chat and display summary
              useChatStore.getState().openChat()
              useChatStore.getState().addMessage({
                role: 'assistant',
                content: `**Summary:** ${result.summary}\n\n**Key Points:**\n${result.keyPoints.map(p => `• ${p}`).join('\n')}`,
              })
            } else {
              showAIActionToast(result.error || 'Failed to summarize', 'error')
            }
          } finally {
            setIsProcessing(false)
          }
          break

        case 'explain':
          setIsProcessing(true)
          console.log('Explaining diagram with AI...')
          try {
            const result = await explainDiagram(selectedElements, allElements)
            if (result.success) {
              // Open chat and display explanation
              useChatStore.getState().openChat()
              useChatStore.getState().addMessage({
                role: 'assistant',
                content: result.explanation,
              })
            } else {
              showAIActionToast(result.error || 'Failed to explain', 'error')
            }
          } finally {
            setIsProcessing(false)
          }
          break

        case 'ask-ai':
          // Open chat panel for AI conversation
          useChatStore.getState().openChat()
          break

        default:
          console.log(`Unknown action: ${actionId}`)
      }
    },
    [isProcessing]
  )

  // Debug: Log selection info
  useEffect(() => {
    if (selection.hasSelection) {
      console.log(`Selected: ${selection.count} element(s), categories: ${selection.categories.join(', ')}`)
    }
  }, [selection.hasSelection, selection.count, selection.categories])

  const isChatOpen = useChatStore((state) => state.isOpen)
  const toggleChat = useChatStore((state) => state.toggleChat)

  return (
    <div className="app">
      <ExcalidrawCanvas />
      <ContextMenu onAction={handleContextMenuAction} />
      <ChatPanel />
      <CanvasContextModal
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
      />

      {/* Canvas Context Button */}
      <button
        className="context-settings-button"
        onClick={() => setIsContextModalOpen(true)}
        title="Canvas Context Settings"
        style={{
          position: 'fixed',
          bottom: '80px',
          right: isChatOpen ? '400px' : '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: canvasContext ? '#28a745' : '#6c757d',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 999,
          transition: 'right 0.3s ease, transform 0.2s ease, background 0.2s ease',
        }}
        onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {canvasContext ? '⚙' : '⚙'}
      </button>

      {/* AI Chat Toggle Button */}
      <button
        className="chat-toggle-button"
        onClick={toggleChat}
        title={isChatOpen ? 'Close AI Chat' : 'Open AI Chat'}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: isChatOpen ? '400px' : '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: '#0066cc',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 999,
          transition: 'right 0.3s ease, transform 0.2s ease',
        }}
        onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isChatOpen ? '✕' : '💬'}
      </button>
    </div>
  )
}

export default App
