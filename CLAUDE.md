# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ExcaliDraw AI Agent (EAA) - An AI-Human collaborative visual thinking tool built on Excalidraw that enables real-time bidirectional interaction between human visual expression and AI reasoning through contextual selection-based interfaces.

**Status**: Phase 7 complete. Full AI-driven canvas manipulation, N8N webhook integration, chat panel, canvas context system, and logging service.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (port 5173, listens on all interfaces)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key environment variables:
- `VITE_AI_PROVIDER` - 'anthropic' (default) or 'ollama'
- `VITE_ANTHROPIC_API_KEY` - Anthropic API key for Claude
- `VITE_OLLAMA_BASE_URL` - Ollama server URL (default: http://localhost:11434)
- `VITE_N8N_WEBHOOK_URL` - Optional N8N webhook for bidirectional sync
- `VITE_AI_DEBUG` - Enable AI service debug logging
- `VITE_LOGGING_ENABLED` - Enable canvas/AI event logging
- `VITE_AI_MAX_RETRIES` - Retry attempts for AI requests (default: 3)

## Architecture Overview

The application follows a service-oriented architecture with React/Zustand for UI and state management. Key architectural patterns:

1. **State Management**: Zustand stores (`selectionStore`, `canvasStore`, `contextMenuStore`, `chatStore`) with event subscription pattern
2. **Canvas Operations**: `canvasManipulator` singleton provides programmatic Excalidraw API access
3. **AI Layer**: `aiService` (Anthropic/Ollama) → `aiActions` → `actionParser` → `canvasManipulator`
4. **Context Enrichment**: `canvasContext` system injects domain knowledge into AI prompts
5. **Event Logging**: `loggingService` tracks all canvas and AI events for analysis

### Project Structure
```
src/
├── components/
│   ├── Canvas/
│   │   └── ExcalidrawCanvas.tsx    # Main Excalidraw wrapper with API integration
│   └── UI/
│       ├── ContextMenu.tsx         # Custom right-click context menu
│       ├── ChatPanel.tsx           # AI chat panel for conversations
│       └── CanvasContextModal.tsx  # Canvas context settings modal
├── config/
│   ├── prompts.ts                  # All AI system prompts (centralized)
│   └── canvasContextTemplates.ts   # Predefined context templates
├── hooks/
│   └── useSelection.ts             # Selection hooks (getSelectionInfo)
├── services/
│   ├── aiService.ts                # Anthropic/Ollama API with retry mechanism
│   ├── aiActions.ts                # AI-powered canvas actions (expand, connect, etc.)
│   ├── canvasManipulator.ts        # Programmatic canvas operations
│   ├── actionParser.ts             # AI response → canvas commands
│   ├── loggingService.ts           # Event logging for cognitive analysis
│   ├── n8nService.ts               # N8N webhook client
│   └── n8nListenerService.ts       # N8N callback listener server
├── store/
│   ├── selectionStore.ts           # Selection state with event pub/sub
│   ├── canvasStore.ts              # Canvas/app state + canvas context
│   ├── contextMenuStore.ts         # Context menu position + captured selection
│   └── chatStore.ts                # Chat panel state
├── types/
│   ├── index.ts                    # Main TypeScript definitions
│   └── canvasContext.ts            # Canvas context types + defaults
├── utils/
│   ├── elementUtils.ts             # Element type detection, relationships, #tags
│   ├── layoutUtils.ts              # Auto-layout algorithms
│   └── visualFeedback.ts           # AI change highlighting/animations
├── App.tsx                         # Main app (routes actions, N8N integration)
├── main.tsx                        # Entry point
└── index.css                       # Global styles
```

## Core Systems

### Canvas Manipulator (`src/services/canvasManipulator.ts`)

Singleton providing programmatic Excalidraw API access. All canvas operations go through this layer.

```typescript
import { canvasManipulator } from '@/services/canvasManipulator'

// Add shapes
const rectId = canvasManipulator.addRectangle(
  { x: 100, y: 100, width: 200, height: 100 },
  { backgroundColor: '#e3f2fd', strokeColor: '#1976d2' },
  { text: 'Label' }  // Optional bound text
)

// Add connections
const arrowId = canvasManipulator.addConnection(fromId, toId, { label: 'causes' })

// Modify elements
canvasManipulator.updateElement(id, { backgroundColor: '#ffcccc' })
canvasManipulator.updateText(id, 'New text')
canvasManipulator.moveElement(id, 50, 0)
canvasManiputor.setStyle(id, { strokeWidth: 3 })

// Delete
canvasManipulator.deleteElement(id)
canvasManipulator.deleteElements([id1, id2, id3])
```

### AI Service (`src/services/aiService.ts`)

Supports Anthropic Claude and Ollama with unified interface, retry mechanism, and response validation.

```typescript
import { aiService, ResponseValidators } from '@/services/aiService'

// Initialize (done in App.tsx)
aiService.initialize({
  provider: 'anthropic',
  apiKey: 'sk-ant-xxx',
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  parameters: { temperature: 0.7, topP: 0.9 }
})

// Send with retry
const response = await aiService.sendMessageWithRetry(
  [{ role: 'user', content: 'Improve this text' }],
  systemPrompt,
  {
    maxRetries: 3,
    retryDelay: 1000,
    validator: ResponseValidators.notEmpty,
    onRetry: (attempt, error) => console.log(`Retry ${attempt}: ${error}`)
  }
)
```

### AI Actions (`src/services/aiActions.ts`)

High-level AI-powered canvas operations. All functions:
- Accept `elements` (selected) and `allElements` (full context)
- Use canvas context to enrich prompts
- Apply changes directly via canvasManipulator
- Log interactions via loggingService
- Return structured results

```typescript
import {
  updateWording, improveClarity, makeConcise,
  expandConcept, suggestConnections,
  explainDiagram, summarizeDiagram
} from '@/services/aiActions'

// Text improvement (per-element)
const results = await updateWording(selectedElements, allElements)
// results: [{ success, elementId, originalText, newText, error }]

// Expand concept into related ideas
const result = await expandConcept(element, allElements, { count: 3, direction: 'right' })
// result: { success, concepts: [], createdElements: [] }

// Suggest and create connections
const result = await suggestConnections(elements, allElements)
// result: { success, suggestions: [{ fromId, toId, reason }], createdConnections: [] }

// Explain/summarize (opens chat panel)
const result = await explainDiagram(elements, allElements)
const result = await summarizeDiagram(elements, allElements)
```

### Action Parser (`src/services/actionParser.ts`)

Converts AI JSON responses into executable canvas commands.

```typescript
import { executeAction, executeActions, parseAIResponse } from '@/services/actionParser'

// Parse AI response
const aiResponse = parseAIResponse(responseText)
// Returns: { actions: CanvasAction[], explanation?: string }

// Execute actions with delay
const results = await executeActions(aiResponse.actions, {
  delayBetween: 100,
  onActionComplete: (result, index) => console.log(`Action ${index} done`)
})
```

Action types: `add_rectangle | add_ellipse | add_diamond | add_text | add_arrow | add_connection | update_text | update_style | delete_element | move_element | group_elements`

### Selection System (`src/store/selectionStore.ts`)

Event-driven selection state with pub/sub pattern.

```typescript
import { useSelectionStore } from '@/store/selectionStore'

// Subscribe to selection changes
const unsubscribe = useSelectionStore.subscribe((event) => {
  console.log('Selection changed:', event.added, event.removed)
})

// Get selection info
const count = useSelectionStore.getState().getSelectionCount()
const categories = useSelectionStore.getState().getSelectionCategories()
const relationships = useSelectionStore.getState().getRelationships()
```

### Canvas Context (`src/store/canvasStore.ts` + `src/types/canvasContext.ts`)

Metadata system for enriching AI prompts with domain knowledge, terminology, and conventions.

```typescript
import { useCanvasStore } from '@/store/canvasStore'

// Set context
useCanvasStore.getState().setCanvasContext({
  title: 'User Authentication Flow',
  description: 'OAuth2 authentication process',
  domain: 'flowchart',
  conventions: ['Rectangles = systems', 'Diamonds = decisions'],
  terminology: [
    { term: 'JWT', definition: 'JSON Web Token for stateless auth' }
  ],
  styleGuide: {
    nodeNamingConvention: 'camelCase',
    colorMeanings: [{ color: '#4CAF50', meaning: 'Success' }]
  },
  responseStyle: 'technical',
  aiInstructions: 'Always explain security implications',
  createdAt: Date.now(),
  updatedAt: Date.now()
})
```

### N8N Integration (`src/services/n8nService.ts`)

Bidirectional webhook integration for external AI workflows.

```typescript
import { n8nService } from '@/services/n8nService'

// Check configuration
if (n8nService.isConfigured()) {
  // Test connection
  const testResult = await n8nService.testConnection()

  // Send selection to N8N
  const response = await n8nService.sendToWebhook(
    selectedElements,
    totalElementCount,
    'process'  // action hint for N8N
  )

  // Response format: { success, message?, elements?, elementsToDelete? }

  // Apply response to canvas
  await n8nService.applyResponse(response, {
    updateElements: (elements) => api.updateScene({ elements })
  })
}
```

### Logging Service (`src/services/loggingService.ts`)

Tracks all canvas and AI events for cognitive process analysis.

```typescript
import { loggingService } from '@/services/loggingService'

// Service auto-logs AI requests/responses via aiActions
// Manual logging:
loggingService.logUserAction('custom-action', { details })
loggingService.logError(error, 'context-string')

// Get logs
const allLogs = loggingService.getLogs()
const aiLogs = loggingService.getLogsByType('ai_request')

// Cognitive analysis
const summary = loggingService.getCognitiveProcessSummary()
// Returns: { totalActions, aiInteractions, mostUsedActions, commonTags, averageResponseTime }
```

### Layout Utilities (`src/utils/layoutUtils.ts`)

Auto-layout algorithms for positioning elements.

```typescript
import { findAvailablePosition, calculateBranchPosition } from '@/utils/layoutUtils'

// Find empty space
const pos = findAvailablePosition(allElements, referenceElement, 'right')

// Position children in branch layout
const pos = calculateBranchPosition(parentElement, existingChildren, 'right', 60)
```

### Element Utilities (`src/utils/elementUtils.ts`)

Element classification, text extraction, relationship detection.

```typescript
import {
  getElementCategory, getElementText, extractElementTags,
  detectRelationships, serializeSelectionForAI
} from '@/utils/elementUtils'

// Type checking
const isShape = getElementCategory(element) === 'shape'

// Extract text (handles both text elements and bound text)
const text = getElementText(element, allElements)

// Extract #tags
const tags = extractElementTags(element, allElements)

// Serialize for AI context
const description = serializeSelectionForAI(selectedElements, allElements)
```

### Visual Feedback (`src/utils/visualFeedback.ts`)

Animations and highlights for AI changes.

```typescript
import { showAIChangeFeedback, highlightElements, pulseElements } from '@/utils/visualFeedback'

// Complete feedback (toast + scroll + pulse + highlight)
await showAIChangeFeedback(elementIds, 'Created 3 concepts')

// Just highlight
await highlightElements(elementIds, { duration: 2000, color: '#4CAF50' })

// Pulse animation
await pulseElements(elementIds, { pulses: 2, pulseDuration: 300 })
```

## Context Menu Actions

Right-click on selected elements to access AI actions:

| Action | Selection Required | Description |
|--------|-------------------|-------------|
| Update wording | Text or shapes | Improve wording while keeping meaning |
| Improve clarity | Text or shapes | Make text clearer |
| Make concise | Text or shapes | Shorten text |
| Suggest connections | 2+ shapes | AI suggests and adds arrows with labels |
| Expand concept | 1 element | Generate related child concepts |
| Explain | Any | Explain selection in chat panel |
| Summarize | Any | Summarize with key points in chat |
| Send to N8N | 1+ elements | Send selection to N8N webhook |
| Test N8N | None | Test webhook connection |

## Vite Configuration

The app uses a custom Vite plugin (`vite-plugin-n8n-listener.ts`) for N8N bidirectional integration. The dev server:
- Listens on `0.0.0.0:5173` (all network interfaces)
- Proxies `/n8n-webhook` to `http://localhost:5678` for CORS avoidance
- Provides callback endpoint at `http://localhost:5173/api/n8n/callback` for N8N responses

## Technologies

- **React 18** + TypeScript
- **Vite 6** - Build tool with HMR
- **@excalidraw/excalidraw** - Canvas library
- **Zustand** - State management with middleware
- **Claude API** (Anthropic) or Ollama - AI providers
- **CSS Modules** - Component styling

## Completed Phases

- **Phase 0**: Foundation - Vite + React + Excalidraw + Zustand
- **Phase 1**: Selection Detection - Type detection, relationships, events
- **Phase 2**: Context Menu - Right-click menu with AI actions
- **Phase 3**: AI Text Actions - Update wording, improve clarity, make concise
- **Phase 4**: AI Canvas Actions - Expand concept, suggest connections
- **Phase 5**: Canvas Manipulation - Programmatic element control + layouts
- **Phase 6**: Action Parser - AI response → canvas commands
- **Phase 7**: Advanced Features - N8N integration, chat panel, canvas context, logging

## Important Notes

- **API Key Security**: API key is exposed in browser; production requires backend proxy
- **Excalidraw API**: Access via `useCanvasStore.getState().excalidrawAPI`
- **Element IDs**: Excalidraw element IDs are unique strings; use for tracking
- **Bound Text**: Shapes with text have both container and bound text element
- **Arrows**: Use `addConnection()` for bound arrows, `addArrow()` for free arrows
- **State Persistence**: Canvas auto-saves to localStorage; logs persist to localStorage
- **N8N Callback**: If N8N is in Docker, use `http://host.docker.internal:5173` for callback URL
