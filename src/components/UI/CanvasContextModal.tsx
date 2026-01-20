import { useState, useEffect, useCallback } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import type { CanvasContext, CanvasDomain, TerminologyEntry, ResponseStyle } from '@/types'
import { DEFAULT_CANVAS_CONTEXT, getDomainOptions } from '@/types/canvasContext'
import { applyTemplateToContext } from '@/config/canvasContextTemplates'
import styles from './CanvasContextModal.module.css'

interface CanvasContextModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CanvasContextModal({ isOpen, onClose }: CanvasContextModalProps) {
  const canvasContext = useCanvasStore((state) => state.canvasContext)
  const setCanvasContext = useCanvasStore((state) => state.setCanvasContext)

  // Local state for editing
  const [editContext, setEditContext] = useState<CanvasContext>(
    canvasContext || { ...DEFAULT_CANVAS_CONTEXT, createdAt: Date.now(), updatedAt: Date.now() }
  )

  // Sync local state when modal opens or context changes
  useEffect(() => {
    if (isOpen) {
      setEditContext(
        canvasContext || { ...DEFAULT_CANVAS_CONTEXT, createdAt: Date.now(), updatedAt: Date.now() }
      )
    }
  }, [isOpen, canvasContext])

  const handleSave = useCallback(() => {
    setCanvasContext(editContext)
    onClose()
  }, [editContext, setCanvasContext, onClose])

  const handleClear = useCallback(() => {
    setCanvasContext(null)
    onClose()
  }, [setCanvasContext, onClose])

  const handleApplyTemplate = useCallback(() => {
    const newContext = applyTemplateToContext(editContext, editContext.domain)
    setEditContext(newContext)
  }, [editContext])

  // Update field handlers
  const updateField = useCallback(
    <K extends keyof CanvasContext>(field: K, value: CanvasContext[K]) => {
      setEditContext((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  // Convention handlers
  const addConvention = useCallback(() => {
    setEditContext((prev) => ({
      ...prev,
      conventions: [...prev.conventions, ''],
    }))
  }, [])

  const updateConvention = useCallback((index: number, value: string) => {
    setEditContext((prev) => ({
      ...prev,
      conventions: prev.conventions.map((c, i) => (i === index ? value : c)),
    }))
  }, [])

  const removeConvention = useCallback((index: number) => {
    setEditContext((prev) => ({
      ...prev,
      conventions: prev.conventions.filter((_, i) => i !== index),
    }))
  }, [])

  // Terminology handlers
  const addTerminology = useCallback(() => {
    setEditContext((prev) => ({
      ...prev,
      terminology: [...prev.terminology, { term: '', definition: '' }],
    }))
  }, [])

  const updateTerminology = useCallback(
    (index: number, field: keyof TerminologyEntry, value: string) => {
      setEditContext((prev) => ({
        ...prev,
        terminology: prev.terminology.map((t, i) =>
          i === index ? { ...t, [field]: value } : t
        ),
      }))
    },
    []
  )

  const removeTerminology = useCallback((index: number) => {
    setEditContext((prev) => ({
      ...prev,
      terminology: prev.terminology.filter((_, i) => i !== index),
    }))
  }, [])

  if (!isOpen) return null

  const domainOptions = getDomainOptions()

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Canvas Context Settings</span>
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.body}>
          {/* Basic Info Section */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Basic Information</div>
            <div className={styles.sectionDescription}>
              Define the purpose and title of your canvas
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Title</label>
              <input
                type="text"
                className={styles.input}
                value={editContext.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g., E-commerce System Architecture"
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={editContext.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe the purpose and scope of this diagram..."
              />
            </div>
          </div>

          {/* Domain Section */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Domain</div>
            <div className={styles.sectionDescription}>
              Select the diagram type to get relevant terminology and conventions
            </div>

            <div className={styles.domainRow}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Diagram Type</label>
                <select
                  className={styles.select}
                  value={editContext.domain}
                  onChange={(e) => {
                    const newDomain = e.target.value as CanvasDomain
                    updateField('domain', newDomain)
                    if (newDomain === 'custom') {
                      updateField('customDomain', '')
                    }
                  }}
                >
                  {domainOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <button className={styles.applyTemplateBtn} onClick={handleApplyTemplate}>
                Apply Template
              </button>
            </div>

            {editContext.domain === 'custom' && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Custom Domain Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editContext.customDomain || ''}
                  onChange={(e) => updateField('customDomain', e.target.value)}
                  placeholder="e.g., Business Process"
                />
              </div>
            )}
          </div>

          {/* Conventions Section */}
          <div className={styles.section}>
            <div className={styles.listSection}>
              <div className={styles.listHeader}>
                <span className={styles.listTitle}>Conventions</span>
                <button className={styles.addButton} onClick={addConvention}>
                  + Add
                </button>
              </div>
              <div className={styles.listItems}>
                {editContext.conventions.length === 0 ? (
                  <div className={styles.emptyList}>
                    No conventions defined. Add rules that apply to this diagram.
                  </div>
                ) : (
                  editContext.conventions.map((convention, index) => (
                    <div key={index} className={styles.listItem}>
                      <input
                        type="text"
                        className={styles.input}
                        value={convention}
                        onChange={(e) => updateConvention(index, e.target.value)}
                        placeholder="e.g., Services communicate via REST APIs"
                      />
                      <button
                        className={styles.removeButton}
                        onClick={() => removeConvention(index)}
                      >
                        &times;
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Terminology Section */}
          <div className={styles.section}>
            <div className={styles.listSection}>
              <div className={styles.listHeader}>
                <span className={styles.listTitle}>Domain Terminology</span>
                <button className={styles.addButton} onClick={addTerminology}>
                  + Add
                </button>
              </div>
              <div className={styles.listItems}>
                {editContext.terminology.length === 0 ? (
                  <div className={styles.emptyList}>
                    No terminology defined. Add domain-specific terms for AI context.
                  </div>
                ) : (
                  editContext.terminology.map((term, index) => (
                    <div key={index} className={styles.terminologyItem}>
                      <input
                        type="text"
                        className={`${styles.input} ${styles.termInput}`}
                        value={term.term}
                        onChange={(e) => updateTerminology(index, 'term', e.target.value)}
                        placeholder="Term"
                      />
                      <input
                        type="text"
                        className={`${styles.input} ${styles.definitionInput}`}
                        value={term.definition}
                        onChange={(e) => updateTerminology(index, 'definition', e.target.value)}
                        placeholder="Definition"
                      />
                      <button
                        className={styles.removeButton}
                        onClick={() => removeTerminology(index)}
                      >
                        &times;
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* AI Settings Section */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>AI Behavior</div>
            <div className={styles.sectionDescription}>
              Customize how the AI responds to your requests
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Response Style</label>
              <select
                className={styles.select}
                value={editContext.responseStyle || 'concise'}
                onChange={(e) => updateField('responseStyle', e.target.value as ResponseStyle)}
              >
                <option value="concise">Concise - Brief and to the point</option>
                <option value="detailed">Detailed - Thorough explanations</option>
                <option value="technical">Technical - Domain terminology</option>
                <option value="beginner-friendly">Beginner-friendly - Simple language</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Custom AI Instructions</label>
              <textarea
                className={styles.textarea}
                value={editContext.aiInstructions || ''}
                onChange={(e) => updateField('aiInstructions', e.target.value)}
                placeholder="e.g., Focus on scalability and fault tolerance. Suggest industry-standard patterns."
              />
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.clearButton} onClick={handleClear}>
            Clear Context
          </button>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.saveButton} onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default CanvasContextModal
