/**
 * Accessibility Components
 * 
 * These components help ensure WCAG 2.1 AA compliance:
 * 
 * - SkipLink: Bypass repetitive navigation (WCAG 2.4.1)
 * - VisuallyHidden: Screen reader-only content
 * - FocusTrap: Modal focus management (WCAG 2.4.3)
 * - LiveRegion: Dynamic content announcements (WCAG 4.1.3)
 */

export { SkipLink } from "./SkipLink";
export { VisuallyHidden } from "./VisuallyHidden";
export { FocusTrap } from "./FocusTrap";
export { LiveRegion, useAnnounce } from "./LiveRegion";
