import { useState, useEffect } from 'react'
import { useChatStore } from '@/store/chatStore'

interface PromptEditorModalProps {
  isOpen: boolean
  onClose: () => void
  defaultPrompt: string
  promptTitle: string
  onConfirm: (customPrompt: string) => void
}

export function PromptEditorModal({
  isOpen,
  onClose,
  defaultPrompt,
  promptTitle,
  onConfirm,
}: PromptEditorModalProps) {
  const [customPrompt, setCustomPrompt] = useState(defaultPrompt)
  const [savedPrompts, setSavedPrompts] = useState<Array<{ name: string; prompt: string }>>([])
  const [promptName, setPromptName] = useState('')
  const [showSaved, setShowSaved] = useState(false)

  // Load saved prompts from localStorage
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('excalidraw-saved-prompts')
      if (stored) {
        try {
          setSavedPrompts(JSON.parse(stored))
        } catch {
          console.error('Failed to load saved prompts')
        }
      }
      setCustomPrompt(defaultPrompt)
    }
  }, [isOpen, defaultPrompt])

  const handleSavePrompt = () => {
    if (!promptName.trim()) {
      alert('Please enter a name for this prompt')
      return
    }

    const newPrompt = { name: promptName.trim(), prompt: customPrompt }
    const updated = [...savedPrompts, newPrompt]
    setSavedPrompts(updated)
    localStorage.setItem('excalidraw-saved-prompts', JSON.stringify(updated))
    setPromptName('')
    setShowSaved(false)
  }

  const handleLoadPrompt = (prompt: string) => {
    setCustomPrompt(prompt)
    setShowSaved(false)
  }

  const handleDeletePrompt = (name: string) => {
    const updated = savedPrompts.filter((p) => p.name !== name)
    setSavedPrompts(updated)
    localStorage.setItem('excalidraw-saved-prompts', JSON.stringify(updated))
  }

  const handleConfirm = () => {
    onConfirm(customPrompt)
    onClose()
  }

  const handleReset = () => {
    setCustomPrompt(defaultPrompt)
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          width: '600px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold' }}>
          {promptTitle}
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label
            style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}
          >
            Prompt:
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '14px',
              resize: 'vertical',
            }}
            placeholder="Enter your custom prompt..."
          />
        </div>

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowSaved(!showSaved)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {showSaved ? '▼' : '▶'} Saved Prompts ({savedPrompts.length})
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ↺ Reset to Default
          </button>
        </div>

        {showSaved && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <input
                type="text"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                placeholder="Prompt name..."
                style={{
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                  width: '200px',
                }}
              />
              <button
                onClick={handleSavePrompt}
                style={{
                  padding: '8px 16px',
                  marginLeft: '8px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                + Save Current
              </button>
            </div>

            {savedPrompts.length > 0 ? (
              <div
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  maxHeight: '150px',
                  overflow: 'auto',
                }}
              >
                {savedPrompts.map((saved) => (
                  <div
                    key={saved.name}
                    style={{
                      padding: '8px',
                      borderBottom: '1px solid #e0e0e0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{saved.name}</div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#666',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {saved.prompt.substring(0, 80)}...
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => handleLoadPrompt(saved.prompt)}
                        style={{
                          padding: '4px 8px',
                          marginRight: '4px',
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(saved.name)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#666', fontSize: '13px', fontStyle: 'italic' }}>
                No saved prompts yet. Create one by entering a name and clicking "+ Save Current".
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Apply Prompt
          </button>
        </div>
      </div>
    </div>
  )
}
