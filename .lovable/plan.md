
# Plan: Create System Account for Daily Inspiration Posts

## Problem Analysis
The `generate-fortune-posts` edge function creates a discussion post for each Daily Inspiration, and assigns authorship to "the first admin/owner found in `user_roles`". There's no `ORDER BY`, so the result is non-deterministic—currently it's picking Joshie because his `user_roles` row happens to be returned first.

## Solution
Create a dedicated **system account** that will author all automated content (Daily Inspiration posts, and potentially other future automated posts). This account:
- Will have a profile with a clear "system" identity (name like "Best Day Ministries" or "Joy House")
- Will have the `owner` role (so it has permissions to create approved posts)
- Will NOT be used for login (no one knows the password)
- The edge function will look for this specific account instead of "any admin"

---

## Implementation Steps

### 1. Create the System User (Database)
Use Supabase Auth Admin API (via edge function) to create a user with:
- Email: `system@bestdayministries.app` (or similar non-deliverable address)
- A random secure password (never shared)
- Profile: `display_name = "Best Day Ministries"`, `avatar_number = null` (could use the logo instead)

### 2. Add User Role
Insert a row into `user_roles` with `role = 'owner'` for the system user.

### 3. Add App Setting for System User ID
Store the system user's UUID in `app_settings` under a key like `system_user_id`. This makes it easy to query and update if needed.

### 4. Update Edge Function
Modify `generate-fortune-posts/index.ts` to:
```typescript
// Look for system user first
const { data: systemUserSetting } = await adminClient
  .from("app_settings")
  .select("setting_value")
  .eq("setting_key", "system_user_id")
  .maybeSingle();

const systemUserId = systemUserSetting?.setting_value;

// Fall back to first admin/owner if system user not configured
const authorId = systemUserId || (await getFirstAdminUser());
```

---

## Technical Details

### Database Changes
| Table | Action |
|-------|--------|
| `auth.users` | New user via Admin API |
| `profiles` | Auto-created by `handle_new_user` trigger |
| `user_roles` | Insert `owner` role |
| `app_settings` | Insert `system_user_id` setting |

### Edge Function Changes
| File | Changes |
|------|---------|
| `supabase/functions/generate-fortune-posts/index.ts` | Query `system_user_id` from `app_settings`, use it as author instead of random admin |

### Profile Appearance
- **Display Name**: "Best Day Ministries" (or your preference)
- **Avatar**: Could be `null` (shows default), or we could set a custom `avatar_url` pointing to the logo

---

## Benefits
1. **Clarity**: Users see "Best Day Ministries" posted the Daily Inspiration, not a real person
2. **Consistency**: Always the same author, regardless of admin user order
3. **Scalability**: Can reuse for other automated content (announcements, welcome posts, etc.)
4. **Audit-friendly**: Easy to identify automated vs. human-authored content

---

## Alternative Considered
Could hardcode a specific user ID in the edge function, but that's fragile—if the user is deleted or ID changes, it breaks silently. Using `app_settings` is more robust and visible.
