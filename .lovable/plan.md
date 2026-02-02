
# Fix Password Reset Email - Add Plain Text Fallback Link

## Problem Identified
Robin requested a password reset but reported "there is no button to push" in her email. The current email template only includes a styled HTML button (`<a>` tag with inline CSS). Some email clients strip or fail to render styled links, leaving users with no way to reset their password.

## Solution
Add a plain-text fallback link below the styled button so users can always see and click/copy the reset URL, even if the button doesn't render.

## Changes Required

### 1. Update Password Reset Email Template
**File:** `supabase/functions/send-password-reset/index.ts`

Add a plain text link fallback below the button:
- After the styled button, add a paragraph with the raw link
- Text: "Or copy and paste this link into your browser:"
- Display the full URL in a simple text format that won't be stripped

### 2. Email Structure Update
```
[Styled Button - may not render in all clients]

"Or copy and paste this link into your browser:"
[Plain text URL - always visible]
```

## Technical Details

Current HTML (lines 178-180):
```html
<div style="text-align: center; margin: 30px 0;">
  <a href="${resetLink}" style="...">Reset Password</a>
</div>
```

Updated HTML:
```html
<div style="text-align: center; margin: 30px 0;">
  <a href="${resetLink}" style="...">Reset Password</a>
</div>
<p style="color: #666; font-size: 12px; margin-top: 20px; word-break: break-all;">
  Or copy and paste this link into your browser:<br>
  <a href="${resetLink}" style="color: #E07B39;">${resetLink}</a>
</p>
```

## Additional Improvement
Also add CORS headers update to match the pattern used in other edge functions (to prevent any preflight issues).

## Immediate Action for Robin
After the fix is deployed, Robin should request a new password reset. The new email will have both the button AND a plain text link she can click or copy.
