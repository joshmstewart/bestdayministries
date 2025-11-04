# iOS Simulator Testing Guide

## Overview
This guide documents how to test the app on iOS simulators, specifically for verifying iOS version-specific bug fixes like the iOS 18.x CSS transform rendering issue.

## Important Context

### iOS Version Numbering
- Apple jumped from iOS 18 to iOS 26 in 2025 to align with the year 2026
- iOS 18.x versions (18.0, 18.1, etc.) are from 2024
- iOS 26.x versions are from 2025
- The `browserDetection.ts` checks for iOS version 18, which is correct for the 2024 releases

## Setup Process

### 1. Download iOS Simulators in Xcode

**Via Xcode UI:**
1. Open Xcode
2. Go to **Settings** (Xcode → Settings)
3. Navigate to **Platforms** tab
4. Select **iOS Simulators**
5. Download the specific iOS versions you need (e.g., iOS 18.0, 18.1, 18.2)

**Via Command Line:**
```bash
# List available iOS runtime versions
xcrun simctl runtime list

# Download specific iOS version
xcodebuild -downloadPlatform iOS
```

### 2. Testing Production vs Local Development

**For Production Sites (Simple!):**
- Just open Safari in the simulator
- Navigate to your production URL (e.g., `https://yoursite.lovable.app`)
- That's it! No terminal commands or IP addresses needed

**For Local Development (Requires IP Address):**

**Problem:** iOS Simulators cannot access `localhost` from the host machine.

**Solution:** Use your Mac's local IP address instead:

1. Find your Mac's IP address:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Example output: `192.168.4.221`

2. Start your dev server (it should already be accessible on network):
   ```bash
   npm run dev
   ```

3. In the iOS Simulator, navigate to:
   ```
   http://[YOUR_IP]:8080
   ```
   Example: `http://192.168.4.221:8080`

### 3. Testing Workflow

1. **Launch the desired iOS Simulator** from Xcode
   - Open Xcode → Window → Devices and Simulators
   - Select the iOS version you want to test
   - Click the play button to boot the simulator

2. **Open Safari** in the simulator

3. **Navigate to your app** using your Mac's IP:
   ```
   http://192.168.4.221:8080
   ```

4. **Test the specific functionality**
   - For iOS 18.x CSS bug: Check `/community` page
   - Look for the Daily Sticker Card
   - Verify page loads without disappearing
   - Confirm card appears without rotation

## Verifying iOS 18.x CSS Transform Bug Fix

### The Bug
- iOS 18.x has a CSS transform rendering bug
- Causes pages to briefly load then disappear
- Occurs with: absolute positioning + inline transforms + animations

### The Fix
Located in `src/lib/browserDetection.ts`:
```typescript
export function isProblematicIOSVersion(): boolean {
  const version = getIOSVersion();
  // iOS 18.x has known issues with CSS transforms
  return version !== null && version === 18;
}
```

Applied in components (e.g., `src/pages/Community.tsx`):
```typescript
<div className={`absolute ${!isProblematicIOSVersion() ? '[transform:rotate(-8deg)]' : ''}`}>
```

### Test Expectations

**On iOS 18.x (e.g., 18.0, 18.1):**
- ✅ Page loads normally
- ✅ Content stays visible
- ✅ No rotation transform applied to problematic elements
- ✅ No horizontal translations or layout thrashing

**On iOS 26.1+ (current versions):**
- ✅ Page loads normally
- ✅ Rotation transforms work correctly
- ✅ Visual effects display as intended

## Troubleshooting

### Simulator Shows Different iOS Version
- Verify you selected the correct simulator in Xcode
- Check: Settings app → General → About → Software Version

### Cannot Connect to App
- Confirm your Mac's firewall allows incoming connections
- Verify you're using the correct IP address (not localhost)
- Ensure dev server is running on `0.0.0.0` (not just `127.0.0.1`)

### Page Loads Then Disappears
- This is the iOS 18.x bug - check if the fix is applied
- Inspect element to verify transform classes are conditionally applied
- Check browser console for errors

## Related Documentation
- `docs/BROWSER_COMPATIBILITY.md` - Full iOS 18.x bug documentation
- `docs/ERROR_HANDLING_PATTERNS.md` - Browser compatibility patterns
- `src/lib/browserDetection.ts` - iOS version detection implementation

## Quick Reference

**Command to find your IP:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Simulator URL format:**
```
http://[YOUR_MAC_IP]:8080/[route]
```

**Key test routes:**
- `/community` - iOS 18.x CSS bug fix
- `/auth` - Authentication flow
- Any route with animations or transforms
