
# Plan: Add VoiceInput for Notes Dictation in EmotionJournal

## Overview
Add the `VoiceInput` component to the Emotion Journal page to enable voice-to-text dictation for notes, exactly mirroring the DailyBar QuickMoodPicker implementation.

## Current State Analysis
- **QuickMoodPicker** (DailyBar): Has `VoiceInput` below the `Textarea` (lines 564-572) with:
  - `showTranscript={false}` - doesn't show its own transcript display
  - `silenceStopSeconds={15}` - auto-stops after 15s silence
  - `maxDuration={60}` - max 60s recording
  - `handleVoiceTranscript` callback that directly appends to `note` state

- **EmotionJournal**: Currently has:
  - Initial entry: `Textarea` for `journalText` (lines 978-983) with **no VoiceInput**
  - Edit mode: `Textarea` for `editNoteText` (lines 794-799) with **no VoiceInput**

## Implementation Details

### File: `src/pages/EmotionJournal.tsx`

#### 1. Add VoiceInput Import
```tsx
import { VoiceInput } from '@/components/VoiceInput';
```

#### 2. Add Voice Transcript Handler for Initial Entry
Add callback to append transcript chunks directly to `journalText`:
```tsx
const handleVoiceTranscriptJournal = useCallback((transcript: string) => {
  setJournalText(prev => prev ? `${prev} ${transcript}` : transcript);
}, []);
```

#### 3. Add Voice Transcript Handler for Edit Mode
Add callback to append transcript chunks directly to `editNoteText`:
```tsx
const handleVoiceTranscriptEdit = useCallback((transcript: string) => {
  setEditNoteText(prev => prev ? `${prev} ${transcript}` : transcript);
}, []);
```

#### 4. Add VoiceInput Below Initial Entry Textarea (~line 984)
After the `Textarea` in the notes section, add:
```tsx
<VoiceInput
  onTranscript={handleVoiceTranscriptJournal}
  placeholder="Tap microphone to add notes by voice..."
  buttonSize="sm"
  showTranscript={false}
  autoStop={true}
  silenceStopSeconds={15}
  maxDuration={60}
/>
```

#### 5. Add VoiceInput Below Edit Mode Textarea (~line 799)
After the edit mode `Textarea`, add:
```tsx
<VoiceInput
  onTranscript={handleVoiceTranscriptEdit}
  placeholder="Tap microphone to add notes by voice..."
  buttonSize="sm"
  showTranscript={false}
  autoStop={true}
  silenceStopSeconds={15}
  maxDuration={60}
/>
```

## Technical Notes
- The `VoiceInput` component uses ElevenLabs Scribe realtime transcription
- With `showTranscript={false}`, only the microphone button and recording indicator show
- Transcript chunks are appended directly to the text state as they're committed (VAD-based)
- No manual "merge" step needed - this matches DailyBar behavior exactly
- The existing `JournalEntry.tsx` component with its "accumulate then merge" pattern is unused and can be cleaned up in a future task

## Files to Modify
| File | Changes |
|------|---------|
| `src/pages/EmotionJournal.tsx` | Add import, two handlers, two VoiceInput components |

## Testing Checklist
- [ ] Tap microphone on initial entry notes → speaks → text appears in textarea
- [ ] Tap microphone on edit mode notes → speaks → text appears in textarea  
- [ ] Silence auto-stop works after 15 seconds
- [ ] Recording stops at 60 seconds max
- [ ] Transcript appends to existing text (doesn't replace)
