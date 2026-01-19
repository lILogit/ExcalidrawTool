import { useEffect, useCallback, useState } from 'react'
import { ExcalidrawCanvas } from '@/components/Canvas/ExcalidrawCanvas'
import { ContextMenu } from '@/components/UI/ContextMenu'
import { aiService } from '@/services/aiService'
import { updateWording, makeConcise, improveClarity, expandConcept, suggestConnections } from '@/services/aiActions'
import { useSelection } from '@/hooks/useSelection'
import { showAIChangeFeedback, showAIActionToast } from '@/utils/visualFeedback'
import type { ExcalidrawElement } from '@/types'

function App() {
  const selection = useSelection()
  const [isProcessing, setIsProcessing] = useState(false)

  // Initialize AI service with API key from environment
  useEffect(() => {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (apiKey) {
      aiService.initialize({ apiKey })
      console.log('AI Service initialized')
    } else {
      console.warn('VITE_ANTHROPIC_API_KEY not set - AI features will be disabled')
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
          console.log('Summarize action - coming soon')
          break

        case 'explain':
          console.log('Explain action - coming soon')
          break

        case 'ask-ai':
          console.log('Ask AI action - will open dialog in future phase')
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

  return (
    <div className="app">
      <ExcalidrawCanvas />
      <ContextMenu onAction={handleContextMenuAction} />
    </div>
  )
}

export default App
