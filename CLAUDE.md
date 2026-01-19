# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ExcaliDraw AI Agent (EAA) - An AI-Human collaborative visual thinking tool built on Excalidraw that enables real-time bidirectional interaction between human visual expression and AI reasoning through contextual selection-based interfaces.

**Status**: Phase 6 complete (AI Response → Canvas Actions). Full AI-driven canvas manipulation with expand concept, suggest connections, and visual feedback.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (port 5173)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Environment Setup

Copy `.env.example` to `.env` and add your Anthropic API key:

```bash
cp .env.example .env
# Edit .env and add: VITE_ANTHROPIC_API_KEY=sk-ant-xxxxx
```

## Architecture

### Project Structure
```
src/
├── components/
│   ├── Canvas/
│   │   └── ExcalidrawCanvas.tsx    # Main Excalidraw wrapper
│   └── UI/
│       ├── ContextMenu.tsx         # Custom context menu with AI actions
│       └── ContextMenu.module.css  # Context menu styles
├── hooks/
│   └── useSelection.ts             # Selection hooks
├── store/
│   ├── selectionStore.ts           # Selection state (Zustand)
│   ├── canvasStore.ts              # Canvas/app state (Zustand)
│   └── contextMenuStore.ts         # Context menu state (Zustand)
├── services/
│   ├── aiService.ts                # Claude API integration
│   ├── aiActions.ts                # AI-powered canvas actions
│   ├── canvasManipulator.ts        # Programmatic canvas operations
│   └── actionParser.ts             # AI response → canvas commands
├── utils/
│   ├── elementUtils.ts             # Element type detection, relationships
│   ├── layoutUtils.ts              # Auto-layout algorithms
│   └── visualFeedback.ts           # AI change highlighting/animations
├── types/
│   └── index.ts                    # TypeScript definitions
├── App.tsx                         # Main app component
├── main.tsx                        # Entry point
└── index.css                       # Global styles
```

### Key Components

**Canvas Manipulator** (`src/services/canvasManipulator.ts`)
- Programmatic canvas operations via Excalidraw API
- Add elements: `addRectangle`, `addEllipse`, `addDiamond`, `addText`, `addArrow`, `addLine`
- Modify elements: `updateElement`, `updateText`, `moveElement`, `resizeElement`, `setStyle`
- Delete elements: `deleteElement`, `deleteElements`
- Connections: `addConnection(fromId, toId)` - creates bound arrows
- Grouping: `groupElements`, `ungroupElements`
- Utilities: `scrollToElements`, `showToast`, `clearCanvas`

**Layout Utilities** (`src/utils/layoutUtils.ts`)
- `findAvailablePosition` - Find empty space for new element
- `calculateLinearLayout` - Position elements in row/column
- `calculateGridLayout` - Position elements in grid
- `calculateRadialLayout` - Position elements in circle
- `calculateBranchPosition` - Position child elements from parent
- `arrangeElements` - Auto-arrange to avoid overlaps

**Context Menu** (`src/components/UI/ContextMenu.tsx`)
- Custom right-click menu with AI actions
- Dynamic items based on selection type

**AI Actions** (`src/services/aiActions.ts`)
- `updateWording()`, `improveClarity()`, `makeConcise()`
- All update canvas directly via canvasManipulator

### Data Flow
1. User right-clicks → Context menu appears
2. User selects AI action → aiActions processes selection
3. Claude API improves text → canvasManipulator updates elements
4. Canvas re-renders with changes

## Canvas Manipulator API

### Adding Elements
```typescript
import { canvasManipulator } from '@/services/canvasManipulator'

// Add a rectangle
const rectId = canvasManipulator.addRectangle(
  { x: 100, y: 100, width: 200, height: 100 },
  { backgroundColor: '#e3f2fd', strokeColor: '#1976d2' }
)

// Add text
const textId = canvasManipulator.addText('Hello World', { x: 150, y: 130 })

// Add arrow between elements
const arrowId = canvasManipulator.addConnection(rectId, anotherElementId)
```

### Modifying Elements
```typescript
// Update any property
canvasManipulator.updateElement(id, { backgroundColor: '#red' })

// Update text content
canvasManipulator.updateText(textId, 'New text')

// Move element
canvasManipulator.moveElement(id, deltaX, deltaY)

// Change style
canvasManipulator.setStyle(id, { strokeWidth: 3 })
```

### Layout Utilities
```typescript
import { findAvailablePosition, calculateGridLayout } from '@/utils/layoutUtils'

// Find position for new element
const pos = findAvailablePosition(elements, referenceElement, 'right')

// Layout 6 elements in grid
const positions = calculateGridLayout(6, { x: 100, y: 100 }, { columns: 3 })
```

## Action Parser API

The action parser converts AI responses to executable canvas commands.

### Action Types
```typescript
type CanvasActionType =
  | 'add_rectangle' | 'add_ellipse' | 'add_diamond'
  | 'add_text' | 'add_arrow' | 'add_connection'
  | 'update_text' | 'update_style' | 'delete_element'
  | 'move_element' | 'group_elements'
```

### Executing Actions
```typescript
import { executeAction, executeActions, parseAIResponse } from '@/services/actionParser'

// Execute single action
const result = executeAction({
  type: 'add_rectangle',
  position: { x: 100, y: 100 },
  size: { width: 150, height: 80 },
  style: { backgroundColor: '#e3f2fd' }
})

// Execute multiple actions with delay
const results = await executeActions(actions, {
  delayBetween: 100,
  onActionComplete: (result, index) => console.log(`Action ${index} done`)
})

// Parse AI JSON response
const aiResponse = parseAIResponse(responseText)
if (aiResponse) {
  await executeActions(aiResponse.actions)
}
```

### AI Canvas Actions
```typescript
import { expandConcept, suggestConnections } from '@/services/aiActions'

// Expand a concept into related ideas
const result = await expandConcept(element, allElements, { count: 3 })
// result.concepts = ["Idea 1", "Idea 2", "Idea 3"]
// result.createdElements = ["id1", "id2", "id3"]

// Suggest connections between selected elements
const result = await suggestConnections(elements, allElements)
// result.suggestions = [{ fromId, toId, reason }]
// result.createdConnections = ["arrow_id_1", "arrow_id_2"]
```

### Visual Feedback
```typescript
import { showAIChangeFeedback, highlightElements, pulseElements } from '@/utils/visualFeedback'

// Complete feedback: toast + scroll + pulse + highlight
await showAIChangeFeedback(elementIds, 'Created 3 concepts')

// Just highlight elements
await highlightElements(elementIds, { duration: 2000, color: '#4CAF50' })

// Pulse animation
await pulseElements(elementIds, { pulses: 2, pulseDuration: 300 })
```

## Context Menu Actions

| Action | Description | Status |
|--------|-------------|--------|
| Update wording | Improve text while keeping meaning | ✅ Working |
| Improve clarity | Make text clearer | ✅ Working |
| Make concise | Shorten text | ✅ Working |
| Suggest connections | AI suggests and adds arrows between elements | ✅ Working |
| Expand concept | AI generates related concepts as child nodes | ✅ Working |
| Explain | Describe selection | Coming soon |

## Technologies

- React 18 + TypeScript
- Vite 6 (build tool)
- @excalidraw/excalidraw (canvas library)
- Zustand (state management)
- Claude API (Anthropic) with streaming support
- CSS Modules

## Completed Phases

- **Phase 0**: Foundation - Vite + React + Excalidraw + Zustand
- **Phase 1**: Selection Detection - Type detection, relationships, events
- **Phase 2**: Context Menu - Right-click menu with AI actions
- **Phase 5**: Canvas Manipulation - Programmatic element control + layouts
- **Phase 6**: AI Canvas Actions - Action parser, expand concept, suggest connections, visual feedback

## Next Steps (Phase 7)

- Advanced AI interactions
- Natural language canvas commands ("create a flowchart for...")
- Multi-turn conversations with context awareness
- Diagram explanation and summarization

## Notes

- `Claude.md` (capital C) contains the full project specification
- API key is exposed in browser; production needs backend proxy
