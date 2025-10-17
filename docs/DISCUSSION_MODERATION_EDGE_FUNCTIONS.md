# DISCUSSION MODERATION - EDGE FUNCTIONS

## Overview
AI-powered content moderation for discussion posts and comments using Lovable AI (Google Gemini models).

---

## moderate-content

**Location:** `supabase/functions/moderate-content/index.ts`  
**Auth:** JWT Required  
**Dependencies:** Lovable AI  
**Secrets:** `LOVABLE_API_KEY` (auto-provisioned)

### Purpose
Analyzes text content for policy violations using AI

### Request Schema
```typescript
{
  content: string;  // Text to moderate (max 10,000 chars)
}
```

**Validation:** Zod schema ensures content is non-empty string

### Key Logic
1. Validates request with Zod
2. Calls Lovable AI Gateway at `https://ai.gateway.lovable.dev/v1/chat/completions`
3. Uses `google/gemini-2.5-flash` model by default
4. System prompt defines moderation policies:
   - Hate speech detection
   - Violence/threats
   - Sexual content
   - Spam/harassment
   - Personal information
   - Illegal activity

### AI Prompt
```
You are a content moderation assistant. Analyze the following text for policy violations:
- Hate speech or discrimination
- Violence or threats
- Sexual/explicit content
- Spam or harassment
- Personal information exposure
- Illegal activity

Respond with JSON:
{
  "approved": boolean,
  "reason": string (if not approved),
  "confidence": "low" | "medium" | "high"
}
```

### Response Format
```typescript
Success: {
  approved: boolean,
  reason?: string,        // Present if not approved
  confidence: string      // AI confidence level
}

Error: { error: string }
```

### Error Handling
- Returns 400 for validation errors
- Returns 429 if Lovable AI rate limit exceeded
- Returns 402 if Lovable AI credits exhausted
- Returns 500 for AI gateway errors
- Logs all errors with context

### Rate Limiting
**Client-side rate limiting recommended:**
- Max 10 moderation requests per minute per user
- Debounce requests on form inputs
- Cache results for identical content

### Integration Pattern
```typescript
// In DiscussionForm component
const handleSubmit = async (data) => {
  const { data: modResult, error } = await supabase.functions.invoke('moderate-content', {
    body: { content: data.content }
  });
  
  if (modResult?.approved === false) {
    toast.error(`Content flagged: ${modResult.reason}`);
    return;
  }
  
  // Proceed with post creation
};
```

---

## moderate-image

**Location:** `supabase/functions/moderate-image/index.ts`  
**Auth:** JWT Required  
**Dependencies:** Lovable AI  
**Secrets:** `LOVABLE_API_KEY`

### Purpose
Analyzes images for policy violations using AI vision

### Request Schema
```typescript
{
  imageUrl: string;  // Public URL of image to analyze
}
```

**Validation:** 
- Must be valid HTTPS URL
- Must be publicly accessible
- Recommended: Use signed Supabase storage URLs with 5-minute expiry

### Key Logic
1. Validates image URL format
2. Calls Lovable AI Gateway with vision model
3. Uses `google/gemini-2.5-flash` (supports vision)
4. System prompt defines image moderation policies:
   - Nudity/sexual content
   - Violence/gore
   - Hate symbols
   - Illegal substances
   - Graphic content

### AI Prompt
```
You are an image moderation assistant. Analyze this image for policy violations:
- Nudity or sexual content
- Violence or graphic content
- Hate symbols or extremism
- Illegal substances
- Disturbing or shocking content

Respond with JSON:
{
  "approved": boolean,
  "reason": string (if not approved),
  "confidence": "low" | "medium" | "high",
  "categories": string[] (violation types)
}
```

### Response Format
```typescript
Success: {
  approved: boolean,
  reason?: string,
  confidence: string,
  categories?: string[]   // e.g., ["violence", "graphic"]
}

Error: { error: string }
```

### Image Preparation
**Before calling function:**
1. Upload image to `discussion-images` bucket
2. Generate signed URL with 5-minute expiry:
   ```typescript
   const { data } = await supabase.storage
     .from('discussion-images')
     .createSignedUrl(imagePath, 300);
   ```
3. Pass signed URL to function
4. Delete image if not approved

### Error Handling
- Returns 400 for invalid URL
- Returns 429 if Lovable AI rate limit exceeded
- Returns 402 if Lovable AI credits exhausted
- Returns 500 for AI gateway errors
- Returns 403 if image not accessible

### Performance Optimization
- Process images client-side before upload (resize, compress)
- Max image size: 5MB recommended
- Supported formats: JPG, PNG, WebP
- Use aspect ratio validation before upload

### Integration Pattern
```typescript
// In ImageUpload component
const handleImageUpload = async (file) => {
  // 1. Upload to temporary location
  const { data: uploadData } = await supabase.storage
    .from('discussion-images')
    .upload(`temp/${uuid}`, file);
  
  // 2. Get signed URL
  const { data: urlData } = await supabase.storage
    .from('discussion-images')
    .createSignedUrl(uploadData.path, 300);
  
  // 3. Moderate image
  const { data: modResult } = await supabase.functions.invoke('moderate-image', {
    body: { imageUrl: urlData.signedUrl }
  });
  
  // 4. Handle result
  if (modResult?.approved === false) {
    // Delete temp image
    await supabase.storage
      .from('discussion-images')
      .remove([uploadData.path]);
    
    toast.error(`Image flagged: ${modResult.reason}`);
    return null;
  }
  
  // 5. Move to permanent location
  return uploadData.path;
};
```

---

## Moderation Policies

### Content Policy Thresholds
- **Auto-reject:** High confidence violations
- **Manual review:** Medium confidence violations (admin review)
- **Auto-approve:** Low confidence or no violations

### Escalation Rules
1. First violation: Warning notification
2. Second violation (30 days): 7-day post restriction
3. Third violation (90 days): Account review

### Admin Override
Admins can:
- Approve flagged content manually
- Adjust confidence thresholds
- View moderation history
- Ban repeat offenders

---

## Database Integration

### discussion_posts
```sql
-- Moderation fields
is_moderated: boolean DEFAULT false
approval_status: text DEFAULT 'approved'  -- 'pending', 'approved', 'rejected'
moderation_reason: text
```

### discussion_comments
```sql
-- Same fields as posts
is_moderated: boolean DEFAULT false
approval_status: text DEFAULT 'approved'
moderation_reason: text
```

### Workflow
1. User creates post/comment
2. If `is_moderated = true` (set via admin for bestie posts):
   - Call moderation functions
   - Set `approval_status = 'pending'`
   - Notify guardians
3. Guardian approves/rejects
4. If approved: `approval_status = 'approved'`, visible
5. If rejected: `approval_status = 'rejected'`, hidden

---

## Testing

### Test Content Endpoint
```bash
curl -X POST https://[project].supabase.co/functions/v1/moderate-content \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{"content": "This is a test post"}'
```

### Test Image Endpoint
```bash
curl -X POST https://[project].supabase.co/functions/v1/moderate-image \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/image.jpg"}'
```

### Test Cases
- **Pass:** Normal friendly content
- **Fail:** Explicit hate speech
- **Medium:** Borderline content (requires review)

---

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| 429 Rate Limit | Too many AI requests | Add client debouncing, cache results |
| 402 Credits Exhausted | Lovable AI credits depleted | Top up credits in Lovable workspace |
| Image not accessible | Wrong storage bucket permissions | Use signed URLs, check RLS |
| False positives | AI over-sensitive | Lower confidence threshold, admin review |
| Slow moderation | Large images | Compress images client-side first |

---

## Cost Optimization

### Reduce AI Calls
1. **Client-side pre-validation:** Basic profanity filter before AI
2. **Caching:** Cache moderation results for 24 hours
3. **Batch processing:** Moderate multiple images in one call (future enhancement)
4. **Skip on edit:** Only moderate new content, not edits by same author

### Rate Limits
- Max 60 requests/minute per workspace (Lovable AI)
- Implement exponential backoff on 429 errors
- Queue requests client-side during high traffic

---

## Related Documentation

- **DISCUSSION_SYSTEM_CONCISE.md** - Discussion post/comment system
- **NOTIFICATION_SYSTEM_COMPLETE.md** - Moderation notifications
- **GUARDIAN_LINKS_PAGE.md** - Approval settings for guardians
- **LOVABLE_AI_INTEGRATION.md** - AI gateway documentation
