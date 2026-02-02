
<context>
Goal: The “Newsletter” column in Admin → Users must accurately reflect whether each profile’s email/user_id has an active record in `newsletter_subscribers`, especially for recent signups (Noah, Mason, Grace, Heidi, Ric).

What we now know (verified):
- In the database, these users ARE subscribed and linked correctly:
  - Noah Edwards (nrhys2007@gmail.com) → `newsletter_subscribers.status='active'` and `user_id` matches `profiles.id`
  - Mason Longobricco (mlongobricco@gmail.com) → active + linked
  - Grace Bowen (gracebowen826@gmail.com) → active + linked
  - Heidi (hmcint@gmail.com) → active + linked
  - Ric Martinez (ivanricmartinez@gmail.com) → active + linked
- In the Admin Users UI, those same rows still display “Newsletter: No” (confirmed by extracting the rendered table in the preview).

This proves it’s not a “they’re not subscribed” problem. It’s a “Admin Users page isn’t loading/seeing the right subset of newsletter_subscribers rows” problem.
</context>

<root-cause-hypothesis (most likely)>
Even though we added `.range(0, 9999)`, the backend REST layer can enforce a hard max rows-per-response (commonly 1000). If that cap is in effect, the UI will still only receive up to 1000 “active” subscriptions, which can easily omit some of the newest signups depending on default ordering. That exactly matches what we’re seeing:
- Some users show “Yes” (because their subscription happens to be in the returned subset)
- Some users show “No” even though they’re subscribed (because their subscription is outside the returned subset)
</root-cause-hypothesis>

<solution-overview>
Stop fetching “all active newsletter subscribers” for admin display and instead fetch only the newsletter rows relevant to the user list currently being shown.

Because Admin → Users is loading ~200 profiles, we can always keep the subscription lookup under 1000 rows by querying:
1) newsletter_subscribers where user_id IN (all profile ids)
2) newsletter_subscribers where email IN (all profile emails)
and merge results.

This removes dependence on any global “1000 row” cap and also improves performance.
</solution-overview>

<implementation-plan>
1) Documentation + repo verification (required workflow)
   - Search docs for newsletter system + any admin user-management patterns.
   - Read the relevant section(s) in `docs/NEWSLETTER_SYSTEM.md` and any admin/user-management docs if present.
   - Re-read `src/components/admin/UserManagement.tsx` around `loadUsers()` to confirm where newsletter_subscribed is computed.

2) Update Admin Users newsletter lookup to be “targeted” (core fix)
   File: `src/components/admin/UserManagement.tsx`
   - Keep the existing profile fetch:
     - `profiles.select("id, display_name, email, created_at")`
   - Immediately after fetching profiles:
     - Build:
       - `profileIds = profiles.map(p => p.id)`
       - `profileEmails = profiles.map(p => (p.email || '').trim().toLowerCase()).filter(Boolean)`
   - Replace the current “fetch all active subscriptions + range(0,9999)” query with TWO bounded queries (parallel):
     - Query A (by user_id):
       - `from("newsletter_subscribers").select("user_id,email,status").eq("status","active").in("user_id", profileIds)`
     - Query B (by email):
       - `from("newsletter_subscribers").select("user_id,email,status").eq("status","active").in("email", profileEmails)`
     - Combine results into one array; de-dupe by (user_id || email).
   - Build sets:
     - `subscribedUserIds` from rows with user_id
     - `subscribedEmails` from rows with email (lowercased)
   - Keep the merge logic:
     - `newsletter_subscribed = subscribedUserIds.has(profile.id) || subscribedEmails.has(profile.email?.toLowerCase())`

   Why two queries instead of `.or(...)`:
   - It avoids tricky string formatting for PostgREST `.or()` syntax and is easier to keep correct and maintain.
   - Both queries are safely under the response cap because they are limited to your current user list.

3) Add temporary, non-invasive diagnostics (to conclusively prove the fix)
   File: `src/components/admin/UserManagement.tsx`
   - Add `console.info(...)` logs inside `loadUsers()` (guarded so they don’t spam too much) such as:
     - number of profiles loaded
     - count of newsletter rows returned by query A + query B
     - a small “spot-check” for the known problematic emails (Noah/Mason/Grace/Heidi/Ric) printing whether they are detected as subscribed
   - These logs will let us validate in-browser that the data actually being returned matches the DB reality.

4) Verify the “Create User → subscribeToNewsletter” path is not contributing to the mismatch
   - Confirm `create-user` function writes:
     - `newsletter_subscribers.user_id = newUserId`
     - `status='active'`
   - This is mostly to ensure there isn’t a second, separate regression.

5) End-to-end validation checklist (what we will verify after implementing)
   - In Admin → Users:
     - Noah, Mason, Grace, Heidi, Ric show “Yes”
     - Brenda Ford (info@masterpiecequilts.com) remains “No” (since there is no subscription record for that email)
   - Create a new user via Admin “Create User” with “Subscribe to newsletter” checked:
     - user shows “Yes” immediately after reload
   - Sign up a user via the normal signup flow (source=signup) and confirm newsletter is shown as “Yes” in admin.
</implementation-plan>

<non-goals (explicit)>
- We will NOT add non-user newsletter subscribers into the Admin Users list.
- We will NOT change how the newsletter subscriber list itself works (that’s a different admin area).
- We will not weaken security policies; we’ll keep RLS behavior unchanged.

<expected-outcome>
After this change, Admin → Users will show correct newsletter status for all users, including the newest signups, because we no longer depend on fetching the entire `newsletter_subscribers` dataset in one request.
</expected-outcome>

<notes>
The earlier `.range(0, 9999)` approach is still vulnerable if the backend enforces a hard maximum rows-per-request. The targeted query approach is robust regardless of backend caps and scales better.
</notes>
