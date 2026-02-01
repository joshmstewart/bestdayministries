
# Add "Okay" and "Bored" Neutral Emotions

## Overview
Adding two new neutral emotion options that will appear after Tired and Confused in the picker.

## New Emotions

| Emotion | Emoji | Color | Category | Display Order |
|---------|-------|-------|----------|---------------|
| **Okay** | 🙂 | #78909C (Blue Gray) | neutral | 13 |
| **Bored** | 😐 | #607D8B (Slate Gray) | neutral | 14 |

## Coping Suggestions

**Okay:**
- Sometimes "okay" is perfectly fine!
- Check in with yourself later
- Enjoy the calm moment

**Bored:**
- Try something new or creative
- Go for a walk or move around  
- Find a fun activity or game
- Call or message a friend

## Implementation

### Database Insert
Insert two new records into the `emotion_types` table:

```sql
INSERT INTO emotion_types (name, emoji, color, category, display_order, coping_suggestions)
VALUES 
  ('Okay', '🙂', '#78909C', 'neutral', 13, 
   ARRAY['Sometimes okay is perfectly fine!', 'Check in with yourself later', 'Enjoy the calm moment']),
  ('Bored', '😐', '#607D8B', 'neutral', 14, 
   ARRAY['Try something new or creative', 'Go for a walk or move around', 'Find a fun activity or game', 'Call or message a friend']);
```

## Result
The emotion picker will now show 16 emotions with the neutral section displaying:
1. Tired 😴
2. Confused 😕
3. **Okay 🙂** ← new
4. **Bored 😐** ← new

Both will automatically use gray backgrounds when generating avatar emotion images since they're in the neutral category.
