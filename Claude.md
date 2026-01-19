## Project: ExcaliDraw AI Agent (EAA)

An AI-Human collaborative visual thinking tool built on Excalidraw that enables real-time bidirectional interaction between human visual expression and AI reasoning through contextual selection-based interfaces.

---

## 🎯 Project Vision

Create a seamless human-AI collaboration environment where:

- Humans express ideas visually (boxes, arrows, text, diagrams)
- AI understands visual context and provides intelligent assistance
- Both parties can modify the same canvas in real-time
- The visual medium becomes a shared thinking space

---

## 📋 TODO LIST - Development Phases

### Phase 0: Foundation Setup

- [ ] **P0.1** Fork/clone Excalidraw repository
- [ ] **P0.2** Set up development environment (Node.js, TypeScript, React, React Flow, N8N)
- [ ] **P0.3** Create project structure with clean separation of concerns
- [ ] **P0.4** Establish state management architecture (Zustand/Redux)
- [ ] **P0.5** Configure build pipeline and hot reload
- [ ] **P0.6** Set up API integration layer for AI backend

### Phase 1: Selection Detection System

- [ ] **P1.1** Hook into Excalidraw's selection state
- [ ] **P1.2** Create SelectionContext provider with selected elements data
- [ ] **P1.3** Implement element type detection (rectangle, text, arrow, ellipse, etc.)
- [ ] **P1.4** Extract element properties (position, size, text content, colors)
- [ ] **P1.5** Detect multi-element selections and relationships
- [ ] **P1.6** Build selection change event system

### Phase 2: Right-Click Context Menu


- [ ] **P2.1** Intercept right-click events on canvas
- [ ] **P2.2** Create custom context menu component (replace default)
- [ ] **P2.3** Position menu at cursor location
- [ ] **P2.4** Design menu UI with AI action options
- [ ] P2.5 Implement menu item: "Update wording"


### Phase 4: AI Backend Integration

- [ ] **P4.1** Define API contract for AI communication
- [ ] **P4.2** Create AIService class with request/response handling
- [ ] **P4.3** Implement context serialization (selection → text description)
- [ ] **P4.4** Build streaming response handler for real-time text
- [ ] **P4.5** Parse AI responses for actionable instructions
- [ ] **P4.6** Handle API errors gracefully with user feedback
- [ ] **P4.7** Implement request cancellation

### Phase 5: Canvas Manipulation Engine

- [ ] **P5.1** Create CanvasManipulator class
- [ ] **P5.2** Implement addElement(type, properties)
- [ ] **P5.3** Implement updateElement(id, changes)
- [ ] **P5.4** Implement deleteElement(id)
- [ ] **P5.5** Implement addConnection(fromId, toId, label?)
- [ ] **P5.6** Implement groupElements(ids)
- [ ] **P5.7** Build auto-layout algorithms for new elements
- [ ] **P5.8** Implement undo/redo integration for AI changes

### Phase 6: AI Response → Canvas Actions

- [ ] **P6.1** Define action instruction format (JSON schema)
- [ ] **P6.2** Build ActionParser to extract canvas commands from AI text
- [ ] **P6.3** Create action queue for sequential execution
- [ ] **P6.4** Implement "add box with text" action
- [ ] **P6.5** Implement "add arrow between elements" action
- [ ] **P6.6** Implement "modify text content" action
- [ ] **P6.7** Implement "change element style" action
- [ ] **P6.8** Implement "create diagram from description" action
- [ ] **P6.9** Add animation for AI-made changes (highlight effect)

### Phase 7: Bidirectional Sync (MVP Core)

- [ ] **P7.1** Real-time canvas state → AI context sync
- [ ] **P7.2** AI instruction → canvas update pipeline
- [ ] **P7.3** Conflict resolution when human and AI edit simultaneously
- [ ] **P7.4** Visual indicators showing AI is modifying canvas
- [ ] **P7.5** "AI is thinking..." overlay on affected elements
- [ ] **P7.6** Human can interrupt/cancel AI modifications

### Phase 8: Prompt Templates & Actions

- [ ] **P8.1** Create template system for common prompts
- [ ] **P8.2** Template: "Update wording"


### Phase 9: Testing & Quality

- [ ] **P9.1** Unit tests for SelectionContext
- [ ] **P9.2** Unit tests for CanvasManipulator
- [ ] **P9.3** Unit tests for ActionParser
- [ ] **P9.4** Integration tests for AI ↔ Canvas flow
- [ ] **P9.5** E2E tests for user workflows
- [ ] **P9.6** Performance testing with complex diagrams
- [ ] **P9.7** Accessibility audit (keyboard navigation, screen readers)

### Phase 10: Polish & Ship MVP

- [ ] **P10.1** Error boundary implementation
- [ ] **P10.2** Loading states and skeletons
- [ ] **P10.3** Tooltip hints for new users
- [ ] **P10.4** Settings panel (API key, preferences)
- [ ] **P10.5** Export with AI annotations
- [ ] **P10.6** Documentation and README
- [ ] **P10.7** Demo video creation