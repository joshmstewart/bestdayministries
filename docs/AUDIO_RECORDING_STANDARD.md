# Audio Recording Button Standard

## Overview
All audio recording buttons across the application follow a consistent visual standard to ensure accessibility and ease of recognition, especially for users who cannot read.

## Visual Standard

### Microphone Icon Styling
All record audio buttons MUST use the following icon styling:

```tsx
<Mic className="w-5 h-5 mr-2 text-red-500" strokeWidth={2.5} />
```

**Key Properties:**
- **Size**: `w-5 h-5` (20px × 20px) - Larger than standard icons for better visibility
- **Color**: `text-red-500` - Red color for instant recognition and association with "record"
- **Stroke Width**: `strokeWidth={2.5}` - Bolder lines for improved clarity
- **Spacing**: `mr-2` - Consistent margin-right for spacing from text

## Implementation Locations

The red microphone standard is implemented in the following components:

### Discussion & Comments
- **DiscussionDetailDialog** (`src/components/DiscussionDetailDialog.tsx`)
  - Comment recording button

### Admin Management
- **FeaturedBestieManager** (`src/components/admin/FeaturedBestieManager.tsx`)
  - Bestie audio bio recording
- **SponsorBestieManager** (`src/components/admin/SponsorBestieManager.tsx`)
  - Sponsor bestie audio recording

### Messaging
- **BestieSponsorMessenger** (`src/components/bestie/BestieSponsorMessenger.tsx`)
  - Audio message toggle button
- **GuardianSponsorMessenger** (`src/components/guardian/GuardianSponsorMessenger.tsx`)
  - Audio message toggle button

### Content Management
- **AlbumManagement** (`src/pages/AlbumManagement.tsx`)
  - Album audio description recording
- **EventManagement** (`src/pages/EventManagement.tsx`)
  - Event audio description recording

### Core Component
- **AudioRecorder** (`src/components/AudioRecorder.tsx`)
  - Base recording component used throughout the app

## Button Patterns

### Standard Record Button
```tsx
<Button
  variant="outline"
  onClick={() => setShowAudioRecorder(true)}
>
  <Mic className="w-5 h-5 mr-2 text-red-500" strokeWidth={2.5} />
  Record Audio
</Button>
```

### Toggle Button (for message type selection)
```tsx
<Button
  variant={messageType === 'audio' ? 'default' : 'outline'}
  onClick={() => setMessageType('audio')}
>
  <Mic className="w-5 h-5 mr-2 text-red-500" strokeWidth={2.5} />
  Audio Message
</Button>
```

## Accessibility Benefits

1. **Visual Recognition**: The red color immediately signals "record" functionality
2. **Non-readers**: Users who cannot read can identify recording buttons by the distinctive red microphone
3. **Size**: Larger icon size (w-5 h-5 vs standard w-4 h-4) improves visibility
4. **Boldness**: Increased stroke width makes the icon stand out more clearly
5. **Consistency**: Same visual pattern across all recording contexts builds user familiarity

## Design Rationale

- **Red Color**: Universally associated with recording (like record buttons on devices)
- **Larger Size**: Accommodates users with visual impairments
- **Bold Strokes**: Ensures clarity even at smaller screen sizes
- **Consistent Placement**: Icon always appears to the left of button text with `mr-2` spacing

## Maintenance

When adding new audio recording functionality:

1. Always use the standard microphone icon styling
2. Maintain consistent button variant patterns (outline for triggers, toggle states for mode selection)
3. Test visibility across different themes (light/dark mode)
4. Ensure button text clearly indicates the recording action

## Related Components

- `AudioRecorder.tsx` - Core recording component
- Button variants from `@/components/ui/button`
- `Mic` icon from `lucide-react`
