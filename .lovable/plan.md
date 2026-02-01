

# Plan: Add Bible Translation Selection for Fortune Generation

## Summary
Add a translation preference dropdown to the fortune generation dialog that appears when generating Bible-related content. This allows you to select modern, easier-to-understand translations like NIV, NLT, or ESV instead of older translations like KJV.

---

## Implementation Details

### Available Translation Options

| Translation | Description |
|-------------|-------------|
| **NIV (New International Version)** | Balance of accuracy and readability, widely used |
| **NLT (New Living Translation)** | Very easy to read, thought-for-thought translation |
| **ESV (English Standard Version)** | Accurate, slightly more formal but readable |
| **CSB (Christian Standard Bible)** | Modern, clear language |
| **NASB (New American Standard)** | Very literal, word-for-word accurate |
| **The Message** | Paraphrase, very casual/conversational |
| **KJV (King James Version)** | Classic, beautiful language but archaic |

**Default**: NLT (New Living Translation) - most accessible for your audience

---

### Changes to Make

**1. Edge Function (`generate-fortunes-batch`)**
- Add `translation` parameter to the request body
- Update the Bible verse and Proverbs prompts to specify the chosen translation
- Example prompt update:
  ```
  Generate 20 REAL Bible verses from the NLT (New Living Translation).
  Use the EXACT text as it appears in this translation...
  ```

**2. Admin UI (`FortunesManager.tsx`)**
- Add `generateTranslation` state (default: "nlt")
- Add translation dropdown that **only shows** when Type is:
  - "Bible Verses"
  - "Biblical Wisdom (Proverbs)"
  - "All Types (Random Mix)"
- Pass translation to the edge function

---

### UI Preview

The generate dialog will show a conditional "Bible Translation" field:

```text
┌─ Generate Fortunes with AI ─────────────────────┐
│                                                  │
│  Type of Content                                 │
│  [All Types (Random Mix)           ▼]           │
│                                                  │
│  Theme (Optional)                               │
│  [⏰ Time & Its Preciousness       ▼]           │
│                                                  │
│  Bible Translation  ← NEW (appears for Bible)   │
│  [NLT - New Living Translation     ▼]           │
│  "Most accessible for your audience"            │
│                                                  │
│  Number to Generate                             │
│  [20                               ]            │
│                                                  │
│              [Cancel]  [Generate]               │
└──────────────────────────────────────────────────┘
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-fortunes-batch/index.ts` | Add `translation` parameter, update Bible/Proverbs prompts |
| `src/components/admin/FortunesManager.tsx` | Add translation dropdown (conditional), state management |

---

### Technical Notes

1. **Conditional Display**: Translation dropdown only appears for Bible-related types, keeping the UI clean for other content types

2. **AI Prompt Engineering**: The prompt will explicitly request the specific translation to ensure accuracy:
   ```
   Generate verses from the NLT (New Living Translation). 
   Use the EXACT wording as it appears in this specific translation.
   DO NOT mix translations or use paraphrases.
   ```

3. **Default to NLT**: New Living Translation is the most accessible for adults with IDD while still being accurate

4. **Backwards Compatible**: If no translation is specified, defaults to NLT (changing from the previous NIV/KJV default)

---

### Estimated Effort
- Edge function: 10 minutes (add parameter, update prompts)
- Admin UI: 10 minutes (add conditional dropdown)
- Testing: 5 minutes

Total: ~25 minutes

