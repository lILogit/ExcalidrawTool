# N8N Element Creator - Quick Reference

## 🚀 Quick Start

Send this JSON from N8N to create elements on your Excalidraw canvas:

### Simple Example - One Rectangle

```json
{
  "success": true,
  "message": "Created a process step",
  "elements": [
    {
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 80,
      "text": "Start",
      "backgroundColor": "#e8f5e9",
      "strokeColor": "#4caf50"
    }
  ]
}
```

### Flowchart Example - Three Nodes + Connections

```json
{
  "success": true,
  "message": "Created authentication flowchart",
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
      "text": "Login",
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

---

## 🎨 Element Type Examples

### Rectangle

```json
{
  "type": "rectangle",
  "x": 100,
  "y": 100,
  "width": 200,
  "height": 100,
  "text": "My Rectangle",
  "backgroundColor": "#e8f5e9",
  "strokeColor": "#4caf50",
  "strokeWidth": 2
}
```

### Ellipse/Circle

```json
{
  "type": "ellipse",
  "x": 100,
  "y": 100,
  "width": 150,
  "height": 150,
  "text": "My Circle",
  "backgroundColor": "#ffcc80",
  "strokeColor": "#e65100"
}
```

### Diamond

```json
{
  "type": "diamond",
  "x": 100,
  "y": 100,
  "width": 150,
  "height": 100,
  "text": "Decision?",
  "backgroundColor": "#fff9c4",
  "strokeColor": "#ffc107"
}
```

### Text Only

```json
{
  "type": "text",
  "x": 100,
  "y": 100,
  "text": "Just some text",
  "fontSize": 24,
  "fontFamily": 1,
  "textAlign": "center",
  "strokeColor": "#000000"
}
```

### Arrow Connection

```json
{
  "type": "arrow",
  "fromId": "element_id_1",
  "toId": "element_id_2",
  "label": "connects to"
}
```

---

## 🎨 Quick Color Reference

| Name | Hex | Use |
|------|-----|-----|
| Red | `#f44336` | Error |
| Green | `#4caf50` | Success |
| Blue | `#2196f3` | Primary |
| Yellow | `#ffeb3b` | Warning |
| Orange | `#ff9800` | Secondary |
| Purple | `#9c27b0` | Creative |
| Teal | `#009688` | Growth |
| Grey | `#9e9e9e` | Neutral |

---

## 🔗 Common N8N Patterns

### Pattern 1: Dynamic Positioning

```javascript
// In N8N Function node
const position = 100 + ($index * 250)

return {
  success: true,
  elements: [{
    type: "rectangle",
    x: position,
    y: 200,
    width: 200,
    height: 80,
    text: `Step ${$index + 1}`
  }]
}
```

### Pattern 2: Color Based on Value

```javascript
// In N8N Switch node
if ($json.status === "done") {
  return "#81c784"; // Green
} else if ($json.status === "error") {
  return "#e57373"; // Red
} else {
  return "#ff9800"; // Orange
}
```

### Pattern 3: Size Based on Text Length

```javascript
// In N8N Function node
const textWidth = $json.text.length * 10 + 40

return {
  success: true,
  elements: [{
    type: "rectangle",
    text: $json.text,
    width: textWidth,
    height: 60,
    x: 100,
    y: 200
  }]
}
```

---

## 🧪 Test Cases

### Test 1: Single Rectangle

**Input:**
```json
{
  "elements": [{
    "type": "rectangle",
    "x": 100,
    "y": 100,
    "width": 150,
    "height": 80,
    "text": "Test"
  }]
}
```

**Expected:** Green rectangle with "Test" text at (100, 100)

---

### Test 2: Connection Between Existing Elements

**Input:**
```json
{
  "elements": [{
    "type": "arrow",
    "fromId": "existing_id_1",
    "toId": "existing_id_2",
    "label": "connects"
  }]
}
```

**Expected:** Arrow from element1 to element2 with label

---

### Test 3: Multiple Elements

**Input:**
```json
{
  "elements": [
    {"type": "rectangle", "x": 50, "y": 50, "width": 100, "height": 60, "text": "A"},
    {"type": "ellipse", "x": 200, "y": 50, "width": 100, "height": 100, "text": "B"},
    {"type": "arrow", "fromId": "id1", "toId": "id2"}
  ]
}
```

**Expected:** Three elements created with proper connection

---

## ⚠️ Important Notes

1. **IDs Must Match**: When using `fromId`/`toId` for connections, the IDs must exist on the canvas
2. **Unique IDs**: Each element needs a unique ID (auto-generated if omitted)
3. **Absolute Positions**: Always use absolute x, y coordinates
4. **Element Types**: Must use valid Excalidraw types (rectangle, ellipse, diamond, text, arrow, line)
5. **Text in Shapes**: Add `text` field to shapes to automatically create bound text
6. **Array Order**: Elements are created in order, so dependent elements come after their references

---

## 📚 Full Documentation

See **[N8N_INTEGRATION_GUIDE.md](N8N_INTEGRATION_GUIDE.md)** for complete documentation including:
- Detailed element structure
- Advanced formatting options
- N8N workflow examples
- Troubleshooting guide
- API reference

---

## 🔗 Official Sources

- [Excalidraw Element Skeleton API](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton)
- [Excalidraw Developer Docs](https://docs.excalidraw.com/)
- [N8N Integration Docs](https://docs.n8n.io/)
