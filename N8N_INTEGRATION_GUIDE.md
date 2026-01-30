# N8N Excalidraw Integration - Complete Guide

## 🎯 Overview

Enhanced N8N webhook integration with **full Excalidraw API support**. N8N can now create elements on your canvas using either:
1. **Full Excalidraw element objects** - Complete element data
2. **Simplified element descriptions** - Easy-to-use JSON format
3. **Natural language descriptions** - Plain text descriptions

---

## 🔗 Sources

- [Excalidraw Element Skeleton API](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton)
- [Creating Elements programmatically](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/excalidraw/api/excalidraw-element-skeleton)
- [N8N Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook)

---

## 📦 Response Formats

### Format 1: Full Excalidraw Elements (Advanced)

Use this when you have complete control over the element structure:

```json
{
  "success": true,
  "message": "Created 2 elements",
  "elements": [
    {
      "type": "rectangle",
      "id": "custom_rect_001",
      "x": 300,
      "y": 200,
      "width": 200,
      "height": 100,
      "strokeColor": "#1976d2",
      "backgroundColor": "#e3f2fd",
      "strokeWidth": 2,
      "roughness": 1,
      "opacity": 100
    },
    {
      "type": "text",
      "id": "custom_text_001",
      "x": 400,
      "y": 250,
      "text": "Hello from N8N!",
      "fontSize": 20,
      "fontFamily": 1,
      "textAlign": "center"
    }
  ]
}
```

### Format 2: Simplified Element Descriptions (Recommended)

Easier to write and maintain:

```json
{
  "success": true,
  "message": "Created a flowchart",
  "elements": [
    {
      "type": "rectangle",
      "x": 300,
      "y": 200,
      "width": 200,
      "height": 100,
      "text": "Start Process",
      "backgroundColor": "#e8f5e9",
      "strokeColor": "#4caf50"
    },
    {
      "type": "diamond",
      "x": 600,
      "y": 200,
      "width": 150,
      "height": 100,
      "text": "Decision?",
      "backgroundColor": "#fff9c4",
      "strokeColor": "#ffc107"
    },
    {
      "type": "ellipse",
      "x": 900,
      "y": 200,
      "width": 150,
      "height": 100,
      "text": "End",
      "backgroundColor": "#ffcdd2",
      "strokeColor": "#f44336"
    }
  ]
}
```

### Format 3: Text Description (Natural Language)

Describe what you want in plain text (experimental feature):

```json
{
  "success": true,
  "message": "Created flowchart from description",
  "elements": [
    "Create a rectangle at position 200,150 with size 180x80, text 'User Login', green background",
    "Create a diamond at position 450,150 with size 140x80, text 'Authenticated?'",
    "Create a rectangle at position 650,150 with size 160x80, text 'Dashboard', blue background"
  ]
}
```

---

## 🎨 Element Types Supported

### Shapes

#### Rectangle
```json
{
  "type": "rectangle",
  "x": 100,
  "y": 100,
  "width": 200,
  "height": 100,
  "text": "My Rectangle",
  "strokeColor": "#000000",
  "backgroundColor": "#ffffff",
  "strokeWidth": 2
}
```

#### Ellipse/Circle
```json
{
  "type": "ellipse",
  "x": 100,
  "y": 100,
  "width": 150,
  "height": 150,
  "text": "My Circle",
  "strokeColor": "#000000",
  "backgroundColor": "#fff3e0"
}
```

#### Diamond
```json
{
  "type": "diamond",
  "x": 100,
  "y": 100,
  "width": 150,
  "height": 100,
  "text": "Decision?",
  "strokeColor": "#000000",
  "backgroundColor": "#fff9c4"
}
```

### Text

```json
{
  "type": "text",
  "x": 100,
  "y": 100,
  "text": "Hello World",
  "fontSize": 20,
  "fontFamily": 1,
  "textAlign": "center",
  "strokeColor": "#000000"
}
```

**Font Family Options:**
- `1` - Virgil (hand-drawn style)
- `2` - Helvetica (clean sans-serif)
- `3` - Cascadia (modern)

### Arrows/Lines

```json
{
  "type": "arrow",
  "fromId": "element1",
  "toId": "element2",
  "label": "Connects to",
  "strokeColor": "#1976d2",
  "strokeWidth": 2
}
```

Or with explicit points:

```json
{
  "type": "arrow",
  "x": 100,
  "y": 100,
  "points": [[0, 0], [150, 50]],
  "endArrowhead": "arrow",
  "strokeColor": "#1976d2"
}
```

---

## 🎯 Style Options

### Colors
Use any valid CSS color format:
- **Hex**: `#RRGGBB` or `#RGB`
- **Color names**: `red`, `blue`, `green`, `yellow`, `orange`, etc.
- **RGB**: `rgb(255, 0, 0)`

### Stroke Width
- **1-2**: Thin lines
- **2-4**: Normal (default)
- **5+**: Thick lines

### Font Sizes
- **16**: Small text
- **20**: Normal (default)
- **24-32**: Large text
- **36+**: Headings

---

## 📋 N8N Workflow Examples

### Example 1: Create a Simple Flowchart

**N8N Webhook Response:**

```json
{
  "success": true,
  "message": "Created user authentication flowchart",
  "elements": [
    {
      "type": "rectangle",
      "x": 50,
      "y": 150,
      "width": 180,
      "height": 80,
      "text": "User",
      "backgroundColor": "#e3f2fd",
      "strokeColor": "#1976d2"
    },
    {
      "type": "rectangle",
      "x": 300,
      "y": 150,
      "width": 180,
      "height": 80,
      "text": "Login System",
      "backgroundColor": "#fff3e0",
      "strokeColor": "#f57c00"
    },
    {
      "type": "rectangle",
      "x": 550,
      "y": 150,
      "width": 180,
      "height": 80,
      "text": "Dashboard",
      "backgroundColor": "#e8f5e9",
      "strokeColor": "#4caf50"
    },
    {
      "type": "arrow",
      "fromId": "n8n_rectangle_001",
      "toId": "n8n_rectangle_002",
      "label": "→"
    },
    {
      "type": "arrow",
      "fromId": "n8n_rectangle_002",
      "toId": "n8n_rectangle_003",
      "label": "→"
    }
  ]
}
```

### Example 2: Create Mind Map Structure

**N8N Webhook Response:**

```json
{
  "success": true,
  "message": "Created mind map with central idea",
  "elements": [
    {
      "type": "ellipse",
      "x": 400,
      "y": 250,
      "width": 200,
      "height": 120,
      "text": "Central Idea",
      "backgroundColor": "#ffcc80",
      "strokeColor": "#e65100",
      "fontSize": 24
    },
    {
      "type": "ellipse",
      "x": 200,
      "y": 450,
      "width": 150,
      "height": 80,
      "text": "Branch 1",
      "backgroundColor": "#ce93d8",
      "strokeColor": "#880e4f"
    },
    {
      "type": "ellipse",
     x": 600,
      "y": 450,
      "width": 150,
      "height": 80,
      "text": "Branch 2",
      "backgroundColor": "#ce93d8",
      "strokeColor": "#880e4f"
    },
    {
      "type": "arrow",
      "fromId": "n8n_ellipse_001",
      "toId": "n8n_ellipse_002"
    },
    {
      "type": "arrow",
      "fromId": "n8n_ellipse_001",
      "toId": "n8n_ellipse_003"
    }
  ]
}
```

### Example 3: Dynamic Element Creation Based on Input

**N8N Workflow with Expression:**

```json
{
  "success": true,
  "message": "Created {{ $json.title }} at {{ $json.position }}",
  "elements": [
    {
      "type": "rectangle",
      "x": {{ $json.x }},
      "y": {{ $json.y }},
      "width": 200,
      "height": 100,
      "text": "{{ $json.title }}",
      "backgroundColor": "{{ $json.color }}",
      "strokeColor": "#000000"
    }
  ]
}
```

**Input to N8N:**

```json
{
  "title": "API Gateway",
  "x": 300,
  "y": 200,
  "color": "#e1f5fe"
}
```

---

## 🛠️ N8N Workflow Setup

### Step 1: Create Webhook Node

1. In N8N, drag a **Webhook** node
2. Click **Listen for Test Event**
3. Copy the **Test URL** (or **Production URL** when ready)

### Step 2: Add Your Logic

Add your N8N logic between webhook and response:

```
Webhook → [Your Logic] → [Set Node] → Response
```

### Step 3: Configure Response Node

Add a **Set** node before responding:

```json
{
  "success": true,
  "message": "Processed {{ $json.title }}",
  "elements": [
    {
      "type": "rectangle",
      "x": 300,
      "y": 200,
      "width": 200,
      "height": 100,
      "text": "{{ $json.title }}"
    }
  ]
}
```

### Step 4: Send Response to Excalidraw

Add an **HTTP Request** node after your logic:

- **Method**: POST
- **URL**: Your callback URL (e.g., `http://localhost:5173/api/n8n/callback`)
- **Body**: Select the data from previous Set node

---

## 🔧 Callback URL Configuration

### Development (localhost)

```
http://localhost:5173/api/n8n/callback
```

### Production (Docker)

If Excalidraw is in Docker:
```
http://host.docker.internal:5173/api/n8n/callback
```

### Using Local IP

Find your IP and use:
```
http://192.168.x.x:5173/api/n8n/callback
```

---

## 📨 Complete N8N Workflow Examples

### Example 1: Process User Input and Create Elements

**Workflow:**
```
1. Webhook (receives: { "title": "Order", "x": 100 })
2. Function (processes data)
3. Set (builds response)
4. HTTP Request (sends to callback)
```

**Function Node Code:**
```javascript
// Add position offset
const newX = $json.x + ($index * 250)

// Return modified data
return {
  json: {
    title: $json.title,
    x: newX,
    y: 200,
    color: "#e8f5e9"
  }
}
```

### Example 2: Create Based on Selection Count

**Expression:**
```javascript
// Create multiple elements based on count
const elements = []
const baseX = 100
const baseY = 200

for (let i = 0; i < $json.selectionCount; i++) {
  elements.push({
    type: "rectangle",
    x: baseX + (i * 250),
    y: baseY,
    width: 200,
    height: 80,
    text: `Step ${i + 1}`,
    backgroundColor: i % 2 === 0 ? "#e3f2fd" : "#fff3e0"
  })
}

return {
  success: true,
  message: `Created ${elements.length} steps`,
  elements: elements
}
```

### Example 3: AI-Enhanced Element Creation

**N8N + OpenAI/Mistral:**

1. **Webhook** receives element description
2. **AI Node** (OpenAI) generates element details
3. **Code Node** parses AI response into element structure
4. **HTTP Request** sends to callback

**AI Prompt:**
```
You are an Excalidraw assistant. Create an element description JSON from this input: "{{ $json.description }}"

Response format:
{
  "type": "rectangle|ellipse|diamond|text",
  "x": number,
  "y": number,
  "text": "element label",
  "backgroundColor": "color"
}
```

---

## 🎨 Color Palette Reference

### Material Design Colors

| Color | Hex | Use Case |
|-------|-----|----------|
| Red | `#f44336` | Errors, important items |
| Pink | `#e91e63` | Accents |
| Purple | `#9c27b0` | Creative, premium |
| Deep Purple | `#673ab7` | Dark themes |
| Indigo | `#3f51b5` | Trust, professional |
| Blue | `#2196f3` | Primary actions |
| Light Blue | `#03a9f4` | Info, calm |
| Cyan | `#00bcd4` | Fresh, modern |
| Teal | `#009688` | Growth, success |
| Green | `#4caf50` | Success, positive |
| Light Green | `#8bc34a` | Nature, organic |
| Lime | `#cddc39` | Bright, energetic |
| Yellow | `#ffeb3b` | Warning, attention |
| Orange | `ff9800` | Energy, warmth |
| Deep Orange | `#ff5722` | Bold, urgent |
| Brown | `#795548` | Earthy, stable |
| Grey | `#9e9e9e` | Neutral |
| Blue Grey | `#607d8b` | Professional |
| |

### Semantic Colors

| Purpose | Suggested Colors |
|---------|-----------------|
| Success | `#4caf50`, `#81c784` |
| Warning | `#ff9800`, `#ffb74d` |
| Error | `#f44336`, `#e57373` |
| Info | `#2196f3`, `64b5f6` |
| Primary | `#1976d2`, `#42a5f5` |
| Secondary | `#ff9800`, `ffb74d` |
| Background | `#ffffff`, `#fafafa`, `#f5f5f5` |

---

## 🐛 Troubleshooting

### Elements Not Appearing

**Check:**
1. ✅ Callback URL is correct in N8N
2. ✅ N8N workflow is active (toggle ON)
3. ✅ Response includes `elements` array
4. ✅ Console shows "Updating canvas with X elements"
5. ✅ Element IDs are unique

**Debug:**
```javascript
// In browser console
localStorage.getItem('excalidraw-ai-logs')

// Check for N8N errors
// In N8N, check execution log
```

### Wrong Element Type

**Issue:** Element shows as different type than expected

**Fix:** Ensure `type` field matches:
- `rectangle` - Rectangles
- `ellipse` - Circles/ovals
- `diamond` - Diamonds/rhombus
- `text` - Text labels
- `arrow` - Arrows/lines
- `line` - Lines without arrowheads

### Text Not Showing

**Issue:** Shape created but no text

**Fix:** Ensure `text` field is included for shapes, or add a separate text element

### Elements Overlapping

**Issue:** Elements created on top of each other

**Fix:** Calculate positions based on existing elements:
```javascript
// Get last element position
const lastElement = elements[elements.length - 1]
const newX = lastElement.x + lastElement.width + 50
```

---

## 📚 API Reference

### N8NElementDescription

```typescript
interface N8NElementDescription {
  type?: 'rectangle' | 'ellipse' | 'diamond' | 'text' | 'arrow' | 'line'
  x?: number
  y?: number
  width?: number
  height?: number
  text?: string
  label?: string
  strokeColor?: string
  backgroundColor?: string
  strokeWidth?: number
  fontSize?: number
  fontFamily?: number // 1=Virgil, 2=Helvetica, 3=Cascadia
  textAlign?: 'left' | 'center' | 'right'
  fromId?: string  // For connections
  toId?: string    // For connections
  points?: Array<[number, number]>  // For arrows
  element?: Partial<ExcalidrawElement>  // Full element override
}
```

### Helper Functions

**createTextDescription()**
```javascript
function createTextDescription(x, y, text, color) {
  return {
    type: "rectangle",
    x, y,
    width: text.length * 10 + 40,
    height: 60,
    text,
    backgroundColor: color || "#ffffff"
  }
}
```

**createConnection()**
```javascript
function createConnection(fromId, toId, label) {
  return {
    type: "arrow",
    fromId,
    toId,
    label
  }
}
```

**Process text description** (natural language)
```javascript
function processDescription(description) {
  // Returns array of N8NElementDescription
  return [
    `Create rectangle at 100,200 size 180x80 text "${description}"`
  ]
}
```

---

## ✅ Testing Checklist

- [ ] Can create simple rectangle from N8N
- [ ] Can create ellipse/circle from N8N
- [ ] Can create diamond from N8N
- [ ] Can create text element from N8N
- [ ] Can create arrow from N8N
- [ ] Can create connection between two elements
- [ ] Text appears inside shapes
- [ ] Colors are applied correctly
- [ ] Elements don't overlap unreasonably
- [ ] Elements are created with unique IDs
- [ ] Multiple elements can be created at once
- [ ] Existing elements are preserved
- [ ] Deleted elements are removed from canvas

---

## 🎉 Best Practices

1. **Always use absolute positions** (x, y coordinates)
2. **Provide unique IDs** when creating connections
3. **Use descriptive text** for labels
4. **Add clear colors** for different element types
5. **Test with 1-2 elements first**, then scale up
6. **Include success messages** to describe what was created
7. **Log element IDs** for debugging
8. **Handle edge cases** (empty arrays, missing fields)

---

## 📞 Support

For issues or questions:
- Check the browser console for detailed logs
- Review N8N execution log
- Validate JSON format with a JSON linter
- Test element creation one at a time

**Sources:**
- [Excalidraw Element Skeleton API](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton)
- [N8N Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook)
