# Custom Prompt Editor Feature

## 🎯 Overview

Added the ability to **edit and select custom prompts** for text improvement actions in the context menu. Users can now customize how the AI processes their text by editing prompts before execution, and save frequently used prompts for quick access.

---

## ✨ What's New

### 1. **Prompt Editor Modal**
- ✅ Beautiful modal dialog for editing prompts
- ✅ Shows the default prompt as a starting point
- ✅ Save and load custom prompts
- ✅ Delete saved prompts
- ✅ Prompts persist in localStorage

### 2. **Enhanced Context Menu Actions**
Three text improvement actions now support custom prompts:
- **"Update Wording"** - Edit the prompt before improving wording
- **"Improve Clarity"** - Edit the prompt before making text clearer
- **"Make Concise"** - Edit the prompt before shortening text

### 3. **Prompt Management**
- **Save Custom Prompts**: Name and save your custom prompts
- **Load Saved Prompts**: Quickly load previously saved prompts
- **Delete Prompts**: Remove prompts you no longer need
- **Reset to Default**: Quickly revert to the default prompt

---

## 🚀 How to Use

### Basic Usage

1. **Select elements** on the canvas (must have text)
2. **Right-click** to open the context menu
3. **Select a text action**:
   - "Update Wording"
   - "Improve Clarity"
   - "Make Concise"
4. **Prompt Editor opens** showing the default prompt
5. **Edit the prompt** to customize the AI's behavior
6. **Click "Apply Prompt"** to execute with your custom prompt

### Saving Custom Prompts

1. Open the prompt editor for any action
2. Edit the prompt to your liking
3. Enter a name in the "Prompt name" field
4. Click "+ Save Current"
5. Your prompt is now saved and can be loaded anytime

### Loading Saved Prompts

1. Open the prompt editor
2. Click "▶ Saved Prompts"
3. Click "Load" next to any saved prompt
4. The prompt is loaded into the editor
5. Click "Apply Prompt" to use it

---

## 📝 Example Custom Prompts

### Example 1: Professional Tone
```
You are an AI assistant helping users improve text in visual diagrams.
Rewrite the text to use a more professional, business-appropriate tone.
Keep the same meaning but use formal language.
Respond with ONLY the improved text, nothing else.
```

### Example 2: Simplified Language
```
You are an AI assistant helping users improve text in visual diagrams.
Rewrite the text using simpler words and shorter sentences.
Make it easy for non-experts to understand.
Respond with ONLY the improved text, nothing else.
```

### Example 3: Marketing Copy
```
You are an AI assistant helping users improve marketing text.
Rewrite the text to be more persuasive and engaging.
Use action verbs and focus on benefits.
Keep it concise and impactful.
Respond with ONLY the improved text, nothing else.
```

### Example 4: Technical Documentation
```
You are an AI assistant helping users improve technical documentation.
Rewrite the text to be more precise and unambiguous.
Use standard technical terminology and avoid jargon when possible.
Respond with ONLY the improved text, nothing else.
```

---

## 🔧 Technical Details

### Files Modified

1. **`src/components/UI/PromptEditorModal.tsx`** (NEW)
   - Modal component for editing prompts
   - Save/load/delete functionality
   - localStorage persistence

2. **`src/App.tsx`** (MODIFIED)
   - Added prompt editor state management
   - Updated context menu actions to open prompt editor
   - Added `handlePromptConfirm` callback

3. **`src/services/aiActions.ts`** (MODIFIED)
   - Added optional `customPrompt` parameter to text action functions
   - `updateWording(elements, allElements, customPrompt?)`
   - `improveClarity(elements, allElements, customPrompt?)`
   - `makeConcise(elements, allElements, customPrompt?)`
   - Enhanced logging to track custom prompt usage

### Data Structure

**Saved Prompt:**
```typescript
{
  name: string          // User-defined name
  prompt: string        // The custom prompt text
}
```

**localStorage Key:** `excalidraw-saved-prompts`

---

## 📊 User Flow

```
┌─────────────────┐
│ Select Element   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Right-click      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────────┐
│ "Update Wording"│  ──►  │ Prompt Editor Opens   │
└─────────────────┘      │ Shows default prompt  │
                          └──────────┬───────────┘
                                     │
                    ┌────────────────────┴────────────────────┐
                    │ User edits prompt or loads saved prompt  │
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
                    ┌──────────────────────────────────────┐
                    │ User clicks "Apply Prompt"            │
                    └────────────────────┬─────────────────┘
                                         │
                                         ▼
                    ┌──────────────────────────────────────┐
                    │ AI processes text with custom prompt   │
                    │ Elements updated on canvas            │
                    └──────────────────────────────────────┘
```

---

## 🎨 Features

### Prompt Editor Interface
- **Large textarea** for easy editing
- **Monospace font** for better readability
- **Character count** (implied by textarea size)
- **Saved prompts dropdown** with expand/collapse
- **Quick actions**: Save, Load, Delete, Reset
- **Modal overlay** to focus attention

### Saved Prompts List
- **Name display** - Shows the user-defined name
- **Preview** - Shows first 80 characters of prompt
- **Actions**: Load, Delete
- **Scrollable** - Handles many saved prompts
- **Empty state** - Helpful message when no prompts saved

### Button Styles
- **Apply Prompt** - Blue, primary action
- **Cancel** - Gray, secondary action
- **Save Current** - Green, positive action
- **Load** - Blue, action button
- **Delete** - Red, destructive action
- **Reset** - Gray, neutral action

---

## 🔒 Privacy & Persistence

- **Local Storage Only**: Prompts are stored in browser's localStorage
- **No Server Upload**: Prompts never leave your browser
- **Per-Browser**: Saved prompts are browser-specific
- **Persistent**: Prompts remain even after closing the browser

---

## 🐛 Troubleshooting

**Q: My saved prompts disappeared**
- A: Check that localStorage is enabled in your browser
- A: Make sure you're using the same browser and device

**Q: The prompt editor doesn't open**
- A: Make sure you have selected at least one element
- A: Ensure the selected elements have text content

**Q: Custom prompt isn't being used**
- A: Check the browser console for the "Using custom prompt" log message
- A: Verify you clicked "Apply Prompt" (not just "Cancel")

---

## 🚀 Future Enhancements

Potential improvements for future versions:
- [ ] Export/Import saved prompts
- [ ] Prompt templates library
- [ ] Prompt variables (e.g., {{language}}, {{tone}})
- [ ] Prompt history/undo
- [ ] Share prompts with other users
- [ ] Prompt validation/testing
- [ ] AI prompt suggestions

---

## 📚 Related Documentation

- `CLAUDE.md` - Main project documentation
- `UTILITIES.md` - Utility functions documentation
- `src/config/prompts.ts` - Default prompt definitions

---

## ✅ Testing

To verify the feature works:

1. ✅ Draw a text element on the canvas
2. ✅ Select the element
3. ✅ Right-click → "Update Wording"
4. ✅ Prompt editor should open with default prompt
5. ✅ Edit the prompt text
6. ✅ Enter a name and click "+ Save Current"
7. ✅ Verify the prompt appears in the saved list
8. ✅ Click "Apply Prompt"
9. ✅ Verify the text is updated using your custom prompt
10. ✅ Open the prompt editor again
11. ✅ Verify your saved prompt is in the list
12. ✅ Click "Load" to load it again
13. ✅ Delete the saved prompt and verify it's removed

All tests should pass! 🎉
