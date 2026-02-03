export type CTAButtonWidth = "auto" | "full";

/**
 * Single source of truth for CTA button sizing.
 * Keep editor (NodeView) + preview/sent HTML (renderHTML) consistent.
 */
export function getCTASizing(width: CTAButtonWidth) {
  const isFullWidth = width === "full";

  // Smaller, more email-friendly button sizing.
  // NOTE: These values are duplicated in the inline HTML styles that ship in emails,
  // so keep them conservative for cross-client rendering.
  const padding = isFullWidth ? "10px 18px" : "6px 12px";
  const fontSize = "14px";

  return { padding, fontSize };
}
