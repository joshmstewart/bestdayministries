# SECURITY CHANGE PROTOCOL — MANDATORY

## ⚠️ THIS IS NOT OPTIONAL. VIOLATION = BROKEN FEATURES = USER BLAME = UNACCEPTABLE ⚠️

---

## THE PROBLEM THIS SOLVES

Every RLS policy change, every security migration, every trigger modification has **invisible blast radius**. When security changes break features, there are NO error messages — data silently disappears, queries silently return empty, and the user discovers the breakage in production days later.

**Past incidents caused by skipping this protocol:**
- Bestie linking broke because RLS on `user_roles` prevented guardians from verifying bestie role
- Profile visibility broke because security definer view changes altered query permissions
- Sponsorship receipts became inaccessible due to overly restrictive RLS

---

## BEFORE ANY SECURITY MIGRATION — MANDATORY CHECKLIST

You MUST output this checklist in your response BEFORE proposing any migration:

```
SECURITY CHANGE PRE-FLIGHT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TABLE(S) AFFECTED: [list every table touched by this migration]

2. POLICY CHANGES:
   - ADDING: [list new policies with exact USING/WITH CHECK clauses]
   - REMOVING: [list policies being dropped]  
   - MODIFYING: [list policies being altered]

3. CONSUMER AUDIT (searched codebase for ALL references):
   □ Frontend components that query this table: [list with file paths]
   □ Hooks that query this table: [list with file paths]
   □ Edge functions that query this table: [list with file paths]
   □ Database functions/triggers that reference this table: [list]
   □ Database views that reference this table: [list]
   □ RLS policies on OTHER tables that reference this table: [list]
   □ Other tables with foreign keys to this table: [list]

4. ROLE-BY-ROLE ACCESS VERIFICATION:
   For EACH consumer found above, verify:
   □ Anonymous (anon) - Can they still access what they need? [Y/N + reason]
   □ Authenticated (no specific role) - Can they still access? [Y/N + reason]
   □ Bestie role - Can they still access? [Y/N + reason]
   □ Caregiver/Guardian role - Can they still access? [Y/N + reason]
   □ Supporter role - Can they still access? [Y/N + reason]
   □ Admin/Owner role - Can they still access? [Y/N + reason]
   □ Vendor status users - Can they still access? [Y/N + reason]

5. CRITICAL CROSS-SYSTEM FLOWS AFFECTED:
   □ Bestie linking (guardian enters emoji → verifies role → creates link)
   □ Sponsorship flow (browse → pay → verify → receipt)
   □ Vendor linking (request → guardian approve → feature bestie)
   □ Content moderation (post → moderate → approve/reject)
   □ Authentication (signup → profile creation → role assignment)
   □ Notification system (trigger → create → deliver)
   □ [Any other affected flows]

6. SPECIFIC QUERIES THAT WILL CHANGE BEHAVIOR:
   For each consumer, show the exact query and explain what it returns
   BEFORE vs AFTER the policy change:
   
   Consumer: [component/hook/function name]
   Query: [the actual supabase query]
   BEFORE: [what rows/data it returns now]
   AFTER: [what rows/data it will return after change]
   BREAKS?: [YES/NO - if YES, stop and redesign]

7. READY TO PROCEED: [YES only if ALL above checked and NO breaks found]
```

---

## RULES FOR WRITING RLS POLICIES

### 1. ALWAYS specify the TO clause
```sql
-- ✅ CORRECT: Explicit role targeting
CREATE POLICY "name" ON table FOR SELECT TO authenticated USING (...);

-- ❌ WRONG: Defaults to PUBLIC, unpredictable behavior
CREATE POLICY "name" ON table FOR SELECT USING (...);
```

### 2. NEVER restrict SELECT on lookup tables without checking consumers
Tables that serve as "lookup" for other flows MUST remain readable:
- `user_roles` — needed by bestie linking, admin checks, moderation
- `profiles` / `profiles_public` — needed by friend code search, display names
- `sponsor_besties` — needed by sponsorship page, carousel
- `caregiver_bestie_links` — needed by guardian features, approval checks

### 3. Use SECURITY DEFINER functions for cross-table checks
When a policy needs to check another table, ALWAYS use a security definer function:
```sql
-- ✅ CORRECT
CREATE POLICY "..." ON table USING (public.has_role(auth.uid(), 'admin'));

-- ❌ WRONG: Can cause recursion or permission failures
CREATE POLICY "..." ON table USING (
  EXISTS (SELECT 1 FROM user_roles WHERE ...)
);
```

### 4. Test restrictive policies BEFORE applying
For any policy that RESTRICTS access (not grants), verify:
- What currently works that might stop working?
- Is there a security definer function that bypasses this restriction for valid flows?

---

## AFTER APPLYING SECURITY MIGRATION

### Immediate Verification (MANDATORY)
```
POST-MIGRATION VERIFICATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━

□ Tested bestie linking flow (if user_roles or profiles affected)
□ Tested sponsorship page load (if sponsor_besties or sponsorships affected)
□ Tested guardian approvals (if caregiver_bestie_links affected)
□ Tested content posting (if discussion_posts/comments affected)
□ Tested admin dashboard load (if any admin-queried table affected)
□ Tested vendor features (if vendors or products affected)
□ Tested notification badges (if notifications affected)
□ All consumers from pre-flight audit confirmed working
```

### If Something Breaks
1. **IMMEDIATELY** revert the migration — do NOT try to fix forward
2. Redesign the policy to not break the affected flow
3. Re-run the full pre-flight checklist
4. Only re-apply after ALL consumers verified

---

## COMMON PITFALLS — LEARN FROM PAST FAILURES

### Pitfall 1: Restricting SELECT on shared lookup tables
**What happened:** Tightened `user_roles` SELECT → guardians couldn't verify bestie role → linking broke
**Rule:** `user_roles` SELECT must ALWAYS allow authenticated users to read roles needed for linking

### Pitfall 2: Forgetting security definer views run as invoker
**What happened:** Changed view to `security_invoker = true` → queries that worked for admins broke for regular users
**Rule:** When changing view security, test with the LEAST privileged user that needs access

### Pitfall 3: Adding WHERE clauses that filter out valid data
**What happened:** Added `WHERE user_id = auth.uid()` to receipts → broke admin receipt viewing
**Rule:** Admin override must be explicitly included in every restrictive policy

### Pitfall 4: Silent failures with no error messages
**What happened:** RLS blocked data → component showed empty state → user thought feature was removed
**Rule:** After ANY RLS change, manually verify data loads for each role

---

## TEMPLATE FOR SECURITY MIGRATION MESSAGES

When proposing a security migration to the user, use this format:

```
## Security Migration: [Brief Title]

### What this changes
[1-2 sentences]

### Tables affected
- [table_name]: [what's changing]

### Consumer audit results
I searched the codebase and found [N] consumers of these tables:
- [file:line] — [what it does] — ✅ Still works because [reason]
- [file:line] — [what it does] — ✅ Still works because [reason]

### Cross-system flows verified
- ✅ Bestie linking: [not affected / verified working because...]
- ✅ Sponsorship: [not affected / verified working because...]
[etc.]

### Risk assessment
- LOW/MEDIUM/HIGH
- [Explanation of why]
```

---

## ENFORCEMENT

**This protocol is MANDATORY for:**
- Any `CREATE POLICY` statement
- Any `ALTER POLICY` statement  
- Any `DROP POLICY` statement
- Any change to `security_invoker` or `security_definer` on views
- Any change to security definer functions
- Any migration that modifies RLS-protected tables
- Any edge function authentication changes

**Skipping this protocol WILL result in broken features. There are NO exceptions.**
