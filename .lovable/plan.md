# Newsletter Subscription Display Fix - COMPLETED

## Summary
Fixed the Admin → Users newsletter column showing "No" for recent signups (Noah, Mason, Grace, Heidi, Ric) even though they were subscribed in the database.

## Root Cause
The previous approach used `.range(0, 9999)` but Supabase/PostgREST can enforce a hard 1000-row limit per request. With 1,384+ active subscribers, the most recent signups were being omitted from the returned dataset.

## Solution Implemented
Changed from fetching ALL active newsletter subscribers to a **targeted query approach**:
1. Build arrays of profile IDs and emails from the currently displayed users
2. Run two parallel queries:
   - Query A: `newsletter_subscribers.in("user_id", profileIds)`
   - Query B: `newsletter_subscribers.in("email", profileEmails)`
3. Combine and dedupe results to build subscription lookup sets

This approach:
- Always stays under the 1000-row limit (bounded by displayed profiles, typically ~200)
- Improves performance (fetches only relevant data)
- Is robust regardless of backend row limits

## Files Modified
- `src/components/admin/UserManagement.tsx`: Updated `loadUsers()` with targeted newsletter queries

## Verification
Temporary console logs added to confirm fix works:
- Number of profiles loaded
- Newsletter rows returned by each query
- Subscription status for known problematic emails
