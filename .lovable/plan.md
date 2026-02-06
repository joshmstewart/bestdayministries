
# Prevent Silent Edge Function Failures

## The Core Problem

You have **~170 backend functions** and **zero automated verification** that they're actually alive after deployment. When Lovable deploys functions, any individual one can silently fail (timeout, bundle error, infrastructure hiccup) and you'd never know until a user hits it. There's no health check, no smoke test, no monitoring -- just hope.

That's unacceptable for critical functions like login, payments, and webhooks.

## The Solution: A Health Check System

Build a single backend function that pings every other function and reports which ones are dead. Then surface the results in the Admin dashboard so you see problems immediately.

### What Gets Built

**1. A `health-check` backend function**
- Accepts a list of function names (or defaults to ALL functions)
- Sends a lightweight `OPTIONS` request to each one (the CORS preflight -- every function must handle this)
- A 200 response = alive. Anything else (404, 500, timeout) = dead
- Returns a report: which functions are alive, which are dead, response times
- Categorizes functions by criticality (critical / important / utility)

**2. A criticality registry**
- Hardcoded list categorizing functions into tiers:
  - **Critical** (login, payments, webhooks): `picture-password-login`, `stripe-webhook`, `create-sponsorship-checkout`, `create-marketplace-checkout`, `verify-sponsorship-payment`, `verify-marketplace-payment`, `create-donation-checkout`, `reconcile-donations-from-stripe`
  - **Important** (user-facing features): `wordle-guess`, `scratch-card`, `text-to-speech`, `moderate-content`, `generate-full-recipe`, etc.
  - **Utility** (admin/batch/seed): everything else

**3. Admin dashboard tab: "System Health"**
- Shows last health check results
- Color-coded: green (alive), red (dead), yellow (slow > 2s)
- "Run Health Check" button to trigger on demand
- Critical functions highlighted at the top
- Dead function count shown as a badge on the Admin tab

**4. Automatic health check on page load (admin only)**
- When an admin loads the Admin dashboard, automatically run health check against critical functions only (fast -- just ~10 requests)
- Show a warning banner if any critical function is down

### How It Works

```text
Admin opens dashboard
        |
        v
Auto-check critical functions (OPTIONS requests)
        |
        v
  All alive? ----YES----> Green checkmark, no action needed
        |
        NO
        |
        v
  Red warning banner: "2 critical functions are DOWN: 
  picture-password-login, stripe-webhook"
  [Run Full Check] [View Details]
```

### Why OPTIONS Requests

Every function already handles `OPTIONS` for CORS preflight. It's the lightest possible check -- no auth needed, no side effects, instant response. If a function returns 404 on OPTIONS, it's not deployed.

## Implementation Steps

1. Create the criticality registry (a simple TypeScript map in `src/lib/edgeFunctionRegistry.ts`)
2. Create the `health-check` backend function
3. Create the `SystemHealthManager` admin component
4. Add it to the Admin dashboard tabs
5. Add auto-check on admin page load for critical functions
6. Deploy and test

## What This Does NOT Solve

- It won't **prevent** functions from failing to deploy -- that's a platform-level issue
- It won't auto-redeploy failed functions (not possible from within the app)
- It **will** tell you immediately when something is wrong, so you can trigger a redeploy before users are affected
