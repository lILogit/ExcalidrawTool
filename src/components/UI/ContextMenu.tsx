import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useContextMenuStore } from '@/store/contextMenuStore'
import { isShape, isText, isConnector } from '@/utils/elementUtils'
import styles from './ContextMenu.module.css'

/**
 * Menu action item
 */
interface MenuItem {
  id: string
  label: string
  icon?: string
  shortcut?: string
  disabled?: boolean
  divider?: boolean
  action?: () => void
}

interface ContextMenuProps {
  onAction?: (actionId: string, selection: { selectedElements: import('@/types').ExcalidrawElement[], allElements: import('@/types').ExcalidrawElement[] }) => void
}

export function ContextMenu({ onAction }: ContextMenuProps) {
  const { isOpen, position, close, capturedSelection } = useContextMenuStore()
  const menuRef = useRef<HTMLDivElement>(null)

  // Compute selection info from captured selection
  const selection = useMemo(() => {
    const elements = capturedSelection?.selectedElements ?? []
    const categories: string[] = []

    for (const element of elements) {
      if (isShape(element) && !categories.includes('shape')) {
        categories.push('shape')
      } else if (isText(element) && !categories.includes('text')) {
        categories.push('text')
      } else if (isConnector(element) && !categories.includes('connector')) {
        categories.push('connector')
      }
    }

    return {
      hasSelection: elements.length > 0,
      isMulti: elements.length > 1,
      categories,
    }
  }, [capturedSelection])

  // Close menu on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
      }
    }

    // Small delay to prevent immediate close from the right-click event
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }, 10)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, close])

  // Handle menu item click
  const handleItemClick = useCallback(
    (item: MenuItem) => {
      if (item.disabled) return

      if (item.action) {
        item.action()
      }

      if (onAction && capturedSelection) {
        // Pass the selection directly to avoid race conditions with close()
        onAction(item.id, {
          selectedElements: capturedSelection.selectedElements,
          allElements: capturedSelection.allElements,
        })
      }

      close()
    },
    [onAction, close, capturedSelection]
  )

  // Build menu items based on selection
  const getMenuItems = useCallback((): MenuItem[] => {
    const items: MenuItem[] = []

    if (!selection.hasSelection) {
      items.push({
        id: 'no-selection',
        label: 'Select elements to see AI actions',
        disabled: true,
      })
      return items
    }

    // AI Actions section
    items.push({
      id: 'ai-header',
      label: 'AI Actions',
      disabled: true,
      divider: true,
    })

    // Text-related actions (if selection has text or shapes with text)
    if (selection.categories.includes('text') || selection.categories.includes('shape')) {
      items.push({
        id: 'update-wording',
        label: 'Update wording',
        icon: '✏️',
        shortcut: '⌘U',
      })

      items.push({
        id: 'improve-clarity',
        label: 'Improve clarity',
        icon: '💡',
      })

      items.push({
        id: 'make-concise',
        label: 'Make concise',
        icon: '📝',
      })
    }

    // Shape-related actions
    if (selection.categories.includes('shape')) {
      items.push({
        id: 'divider-1',
        label: '',
        divider: true,
        disabled: true,
      })

      items.push({
        id: 'suggest-connections',
        label: 'Suggest connections',
        icon: '🔗',
      })

      items.push({
        id: 'expand-concept',
        label: 'Expand concept',
        icon: '🌱',
      })
    }

    // Connector-related actions
    if (selection.categories.includes('connector')) {
      items.push({
        id: 'label-arrow',
        label: 'Add/update label',
        icon: '🏷️',
      })
    }

    // Multi-selection actions
    if (selection.isMulti) {
      items.push({
        id: 'divider-2',
        label: '',
        divider: true,
        disabled: true,
      })

      items.push({
        id: 'summarize',
        label: 'Summarize selection',
        icon: '📋',
      })

      items.push({
        id: 'find-relationships',
        label: 'Find relationships',
        icon: '🔍',
      })
    }

    // General actions
    items.push({
      id: 'divider-3',
      label: '',
      divider: true,
      disabled: true,
    })

    items.push({
      id: 'explain',
      label: 'Explain this',
      icon: '❓',
    })

    items.push({
      id: 'ask-ai',
      label: 'Ask AI about selection...',
      icon: '🤖',
    })

    return items
  }, [selection])

  if (!isOpen || !position) {
    return null
  }

  const menuItems = getMenuItems()

  // Calculate position to keep menu in viewport
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    zIndex: 10000,
  }

  return (
    <div ref={menuRef} className={styles.contextMenu} style={menuStyle}>
      <div className={styles.menuContent}>
        {menuItems.map((item, index) => {
          if (item.divider && !item.label) {
            return <div key={`divider-${index}`} className={styles.divider} />
          }

          if (item.divider && item.label) {
            return (
              <div key={item.id} className={styles.sectionHeader}>
                {item.label}
              </div>
            )
          }

          return (
            <button
              key={item.id}
              className={`${styles.menuItem} ${item.disabled ? styles.disabled : ''}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
            >
              {item.icon && <span className={styles.icon}>{item.icon}</span>}
              <span className={styles.label}>{item.label}</span>
              {item.shortcut && <span className={styles.shortcut}>{item.shortcut}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ContextMenu
