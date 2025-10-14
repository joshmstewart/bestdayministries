# Multi-Tenant SaaS Conversion Plan

## Executive Summary

This document outlines the complete strategy for converting Best Day Ministries from a single-tenant client website into a multi-tenant SaaS platform that other organizations can subscribe to and use.

### Current State
- Single organization (Best Day Ministries)
- All features built for one client
- No subscription billing
- No organization separation

### Target State
- Multi-tenant SaaS platform
- Seat-based subscription model (per-user pricing)
- Complete data isolation between organizations
- Self-service onboarding
- Stripe-powered billing

### Business Model
- **Starter Tier:** $99/month, 5 seats, basic features
- **Professional Tier:** $299/month, 20 seats, advanced features  
- **Enterprise Tier:** $799/month, unlimited seats, all features + white-label
- **Additional Seats:** $20/seat/month

---

## Development Strategy: Dark Launch on Main

### Why Work on Main Branch (Not Feature Branch)

**Recommended Approach:** Develop multi-tenant features on `main` branch with feature flags.

**Rationale:**
1. **Lower Risk:** Feature flags allow instant rollback without git operations
2. **Easier Testing:** Test in production environment without separate deployments
3. **Gradual Rollout:** Enable features for specific users/orgs incrementally
4. **No Merge Conflicts:** Avoid massive merge conflicts from long-lived branches
5. **Continuous Integration:** All changes tested continuously

### Feature Flag Strategy

```typescript
// Add to app_settings table
{
  enable_multi_tenant_beta: false  // Owner can toggle via Admin settings
}

// In components
const { multiTenantEnabled } = useAppSettings();

if (!multiTenantEnabled) {
  return null; // Hide multi-tenant UI
}

// In routes
<Route 
  path="/onboarding" 
  element={multiTenantEnabled ? <OrganizationOnboarding /> : <Navigate to="/" />} 
/>
```

### Protection Mechanisms

1. **Database Level:** Add nullable `organization_id` initially (NULL = Best Day Ministries legacy data)
2. **RLS Level:** Policies support both NULL (legacy) and set organization_id
3. **UI Level:** Hide all organization-related UI behind feature flags
4. **Route Level:** Protect new routes with feature flag guards

### Rollback Strategy

If issues arise:
1. Set `enable_multi_tenant_beta = false` in app_settings
2. All multi-tenant UI disappears instantly
3. Best Day Ministries continues working normally
4. No code deployments needed for rollback

---

## Architecture Decision: Row-Level Multi-Tenancy

### Chosen Approach: Single Database, Row-Level Tenancy

**Implementation:**
- One database for all organizations
- Every table gets `organization_id UUID` column
- RLS policies enforce data isolation
- Indexes on `(organization_id, created_at)` for performance

**Advantages:**
- ✅ Simple database management
- ✅ Easy backups and maintenance
- ✅ Cost-effective scaling
- ✅ Simpler migrations
- ✅ Cross-organization features possible (if needed)

**Disadvantages:**
- ⚠️ Requires careful RLS policy design
- ⚠️ Slightly more complex queries
- ⚠️ Must test data isolation thoroughly

### Rejected Approach: Database-Per-Tenant

**Why NOT separate databases:**
- ❌ Expensive (separate Postgres instance per org)
- ❌ Complex migrations (must run on every database)
- ❌ Difficult to manage at scale
- ❌ Harder backups
- ❌ No cross-organization features possible
- ❌ Overkill for this use case

---

## Database Schema Changes

### New Core Tables

#### 1. Organizations Table
```sql
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  settings JSONB DEFAULT '{}', -- Custom branding, features
  subscription_plan_id UUID REFERENCES subscription_plans(id),
  seat_limit INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
```

#### 2. Organization Members Table
```sql
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
```

#### 3. Subscription Plans Table
```sql
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- Starter, Professional, Enterprise
  tier TEXT NOT NULL, -- starter, professional, enterprise
  price_per_seat_cents INTEGER NOT NULL, -- 2000 = $20
  base_price_cents INTEGER NOT NULL, -- 9900 = $99
  base_seats INTEGER NOT NULL DEFAULT 5,
  features JSONB NOT NULL DEFAULT '{}', -- Feature flags for tier
  stripe_price_id TEXT, -- Stripe Price ID
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 4. Organization Subscriptions Table
```sql
CREATE TABLE public.organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  status TEXT NOT NULL, -- active, past_due, canceled, trialing
  current_seats INTEGER NOT NULL DEFAULT 5,
  plan_id UUID REFERENCES subscription_plans(id),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id)
);

CREATE INDEX idx_org_subs_stripe ON organization_subscriptions(stripe_subscription_id);
```

### Adding organization_id to Existing Tables

**Tables that need `organization_id UUID` column:**

1. Core User Data:
   - `profiles`
   - `user_roles`

2. Content:
   - `discussion_posts`
   - `discussion_comments`
   - `events`
   - `event_dates`
   - `albums`
   - `album_images`
   - `videos`

3. Sponsorship:
   - `sponsor_besties`
   - `sponsorships`
   - `sponsor_messages`
   - `featured_besties`

4. Marketplace:
   - `vendors`
   - `products`
   - `orders`
   - `order_items`

5. Community:
   - `featured_items`
   - `saved_locations`
   - `navigation_links`

6. Notifications:
   - `notifications`
   - `notification_preferences`

7. Help & Support:
   - `help_tours`
   - `help_guides`
   - `help_faqs`
   - `contact_form_submissions`

8. Settings:
   - `homepage_sections`
   - `about_sections`
   - `community_features`
   - `footer_links`

**Migration Pattern:**
```sql
-- Add nullable column initially
ALTER TABLE discussion_posts ADD COLUMN organization_id UUID;

-- Create index for performance
CREATE INDEX idx_discussion_posts_org ON discussion_posts(organization_id, created_at DESC);

-- After data migration, make NOT NULL
ALTER TABLE discussion_posts ALTER COLUMN organization_id SET NOT NULL;
```

### Helper Functions

#### Get User's Organization
```sql
CREATE OR REPLACE FUNCTION public.get_user_organization()
RETURNS UUID AS $$
  SELECT organization_id 
  FROM public.organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

#### Check Organization Permission
```sql
CREATE OR REPLACE FUNCTION public.has_organization_permission(
  org_id UUID,
  required_role TEXT DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND (
        role = 'owner' OR
        (required_role = 'admin' AND role IN ('owner', 'admin')) OR
        (required_role = 'member' AND role IN ('owner', 'admin', 'member'))
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

#### Check Seat Limit
```sql
CREATE OR REPLACE FUNCTION public.check_seat_limit(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  max_seats INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.organization_members
  WHERE organization_id = org_id;
  
  SELECT seat_limit INTO max_seats
  FROM public.organizations
  WHERE id = org_id;
  
  RETURN current_count < max_seats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Security & RLS Policy Updates

### Critical Principle

**Every RLS policy must enforce organization boundaries.**

### Pattern: Before vs After

#### Before (Single-Tenant)
```sql
CREATE POLICY "Users can view their own posts"
ON discussion_posts FOR SELECT
USING (auth.uid() = user_id);
```

#### After (Multi-Tenant)
```sql
CREATE POLICY "Users can view posts in their organization"
ON discussion_posts FOR SELECT
USING (
  organization_id = get_user_organization()
  OR organization_id IS NULL -- Legacy Best Day Ministries data
);
```

### RLS Policy Updates by Table Category

#### 1. User-Owned Content (Posts, Comments, etc.)
```sql
-- SELECT: Must be in same organization
USING (
  organization_id = get_user_organization() 
  OR organization_id IS NULL
);

-- INSERT: Set organization automatically
WITH CHECK (
  organization_id = get_user_organization()
);

-- UPDATE/DELETE: Own content + same org
USING (
  user_id = auth.uid() 
  AND (organization_id = get_user_organization() OR organization_id IS NULL)
);
```

#### 2. Organization Settings (Navigation, Features, etc.)
```sql
-- SELECT: Anyone in org
USING (
  organization_id = get_user_organization()
  OR organization_id IS NULL
);

-- INSERT/UPDATE/DELETE: Admins only
WITH CHECK (
  has_organization_permission(organization_id, 'admin')
);
```

#### 3. Public Content (Public Events, Public Discussions)
```sql
-- SELECT: Public to all, OR private within org
USING (
  is_public = true
  OR organization_id = get_user_organization()
  OR organization_id IS NULL
);
```

#### 4. Cross-Organization Features (if any)

For features that need to span organizations (unlikely but possible):
```sql
-- Example: Global marketplace
USING (true); -- Public to all authenticated users

-- But creation still scoped
WITH CHECK (organization_id = get_user_organization());
```

### Special Considerations

#### Admin Impersonation
```sql
-- When admin impersonates, respect organization context
CREATE OR REPLACE FUNCTION public.get_effective_user()
RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('app.impersonated_user_id', true)::UUID,
    auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Use in policies
USING (
  user_id = get_effective_user()
  AND organization_id = get_user_organization()
);
```

#### NULL Fallback During Migration

During migration period, support NULL organization_id:
```sql
USING (
  organization_id = get_user_organization()
  OR organization_id IS NULL -- Allows Best Day Ministries to function during migration
);
```

After migration complete, remove NULL checks:
```sql
USING (organization_id = get_user_organization());
```

---

## Stripe Integration - Seat-Based Billing

### Subscription Model

**Structure in Stripe:**
1. Product: "Best Day Platform"
2. Prices:
   - Starter: $99/month (base) + $20/seat
   - Professional: $299/month (base) + $20/seat
   - Enterprise: $799/month (base) + $20/seat

**Implementation:**
- Use Stripe Checkout for initial subscription
- Use Stripe Customer Portal for upgrades/downgrades
- Metered billing for additional seats

### Edge Functions Needed

#### 1. Create Organization Subscription
**Path:** `supabase/functions/create-organization-subscription/index.ts`

```typescript
// Creates Stripe subscription for new organization
// Called during onboarding flow
// Inputs: organization_id, plan_id, seat_count
// Returns: Stripe Checkout session URL
```

#### 2. Update Organization Seats
**Path:** `supabase/functions/update-organization-seats/index.ts`

```typescript
// Adds or removes seats from subscription
// Called when inviting users or removing members
// Inputs: organization_id, new_seat_count
// Updates Stripe subscription quantity
```

#### 3. Check Subscription Limits
**Path:** `supabase/functions/check-subscription-limits/index.ts`

```typescript
// Validates if organization can perform action
// Called before: inviting user, creating content, etc.
// Inputs: organization_id, action_type
// Returns: { allowed: boolean, reason?: string }
```

#### 4. Handle Subscription Webhooks
**Path:** `supabase/functions/handle-organization-subscription-webhook/index.ts`

```typescript
// Processes Stripe webhook events
// Handles: subscription.updated, subscription.deleted, invoice.paid, etc.
// Updates organization_subscriptions table
```

### Seat Counting Logic

```typescript
// Real-time seat usage
const countActiveSeats = async (organizationId: string) => {
  const { count } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  
  return count || 0;
};

// Check if can add member
const canAddMember = async (organizationId: string) => {
  const { data: org } = await supabase
    .from('organizations')
    .select('seat_limit')
    .eq('id', organizationId)
    .single();
  
  const currentSeats = await countActiveSeats(organizationId);
  
  return currentSeats < org.seat_limit;
};
```

### Upgrade/Downgrade Flows

#### Upgrade (Add Seats)
1. User clicks "Add Seat" in billing dashboard
2. Call `update-organization-seats` edge function
3. Edge function updates Stripe subscription quantity
4. Stripe prorates and charges immediately
5. Webhook updates `organization_subscriptions.current_seats`
6. User can now invite additional member

#### Downgrade (Remove Seats)
1. User removes member from organization
2. Check if current_seats > active_members
3. If yes, call `update-organization-seats` to reduce quantity
4. Stripe applies credit at next billing cycle
5. Webhook updates database

#### Plan Change (Starter → Professional)
1. User clicks "Upgrade Plan" 
2. Opens Stripe Customer Portal
3. User selects new plan
4. Stripe handles prorating
5. Webhook updates `organization_subscriptions.plan_id`
6. Features unlock automatically via plan check

### Grace Period Handling

```typescript
// Allow 7-day grace period for payment failures
const isSubscriptionActive = (subscription: OrganizationSubscription) => {
  if (subscription.status === 'active') return true;
  
  if (subscription.status === 'past_due') {
    const daysSincePeriodEnd = differenceInDays(
      new Date(),
      subscription.current_period_end
    );
    return daysSincePeriodEnd <= 7; // 7-day grace period
  }
  
  return false;
};
```

---

## Frontend Architecture Changes

### 1. OrganizationContext Provider

**File:** `src/contexts/OrganizationContext.tsx`

```typescript
interface OrganizationContextValue {
  organization: Organization | null;
  subscription: OrganizationSubscription | null;
  loading: boolean;
  canAddSeat: () => boolean;
  hasFeature: (feature: string) => boolean;
  activeSeats: number;
  seatLimit: number;
  switchOrganization: (orgId: string) => void;
  organizations: Organization[]; // If user is in multiple
}

export const OrganizationProvider = ({ children }) => {
  // Load current organization
  // Load subscription details
  // Provide helper methods
  // Subscribe to realtime changes
};
```

### 2. Organization Switcher Component

**File:** `src/components/OrganizationSwitcher.tsx`

For users who belong to multiple organizations:

```typescript
// Dropdown in header
// Shows list of user's organizations
// Allows switching between them
// Updates OrganizationContext
```

### 3. Billing Dashboard

**Route:** `/settings/billing`  
**File:** `src/pages/Billing.tsx`

**Features:**
- Current plan display (Starter/Professional/Enterprise)
- Seat usage indicator: "5 of 10 seats used"
- Progress bar for seat utilization
- "Add Seat" button (opens Stripe update flow)
- "Upgrade Plan" button (opens Stripe Customer Portal)
- "Downgrade Plan" button
- Invoice history table
- Payment method management (via Stripe Portal)
- Upcoming invoice preview

**Layout:**
```
┌─────────────────────────────────────────┐
│ Current Plan: Professional              │
│ $299/month + $20/seat                   │
│ [Upgrade to Enterprise]                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Seat Usage                              │
│ 15 of 20 seats used                     │
│ [███████████████░░░░░░░] 75%           │
│ [Add Seat +$20/month] [Remove Seat]     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Invoices                                │
│ Date       Amount    Status    Download │
│ 2025-01-01 $359.00   Paid      [PDF]   │
│ 2024-12-01 $339.00   Paid      [PDF]   │
└─────────────────────────────────────────┘

[Manage Payment Methods]
```

### 4. Onboarding Flow

**Route:** `/onboarding`  
**File:** `src/pages/OrganizationOnboarding.tsx`

**Multi-Step Wizard:**

#### Step 1: Create Account (if not authenticated)
- Email, password, name
- Standard auth signup

#### Step 2: Create Organization
- Organization name (e.g., "Acme Community Center")
- Slug (auto-generated, e.g., "acme-community")
- Preview: "Your site will be at: app.com/acme-community"

#### Step 3: Choose Plan
- Cards showing Starter, Professional, Enterprise
- Feature comparison table
- Seat count selector

#### Step 4: Stripe Checkout
- Redirect to Stripe-hosted checkout
- Return URL: `/onboarding?step=5&session_id=xxx`

#### Step 5: Invite Team Members
- Optional email invites
- "Skip for now" option
- Shows seat usage (1 of 5 used - just the owner)

#### Step 6: Success!
- Welcome message
- "Start Exploring" button → `/community`

### 5. Organization Settings

**Route:** `/settings/organization`  
**File:** `src/pages/OrganizationSettings.tsx`

**Tabs:**

#### Organization Profile Tab
- Organization name
- Slug (with warning about changing)
- Logo upload
- Description
- Contact email

#### Members Tab
- Table of current members
- Columns: Name, Email, Role, Joined Date, Actions
- "Invite Member" button
- Remove member (with confirmation)
- Change role (owner, admin, member)
- Shows seat usage above table

#### Branding Tab (Professional+)
- Primary color picker
- Logo upload
- Custom domain (Enterprise only)

#### Integrations Tab (Professional+)
- API keys
- Webhooks
- External integrations

### Key Files to Create

**Contexts & Hooks:**
- `src/contexts/OrganizationContext.tsx`
- `src/hooks/useOrganization.ts`
- `src/hooks/useSubscriptionLimits.ts`
- `src/hooks/useOrganizationMembers.ts`

**Pages:**
- `src/pages/OrganizationOnboarding.tsx`
- `src/pages/OrganizationSettings.tsx`
- `src/pages/Billing.tsx`

**Components:**
- `src/components/OrganizationSwitcher.tsx`
- `src/components/organization/MemberManagement.tsx`
- `src/components/organization/InviteUserDialog.tsx`
- `src/components/organization/PlanSelector.tsx`
- `src/components/organization/SeatUsageIndicator.tsx`

**Edge Functions:**
- `supabase/functions/create-organization-subscription/index.ts`
- `supabase/functions/update-organization-seats/index.ts`
- `supabase/functions/check-subscription-limits/index.ts`
- `supabase/functions/handle-organization-subscription-webhook/index.ts`

---

## Feature Flag System

### Database Setup

```sql
-- Add to app_settings table
ALTER TABLE app_settings 
ADD COLUMN enable_multi_tenant_beta BOOLEAN DEFAULT false;
```

### Hook Implementation

**File:** `src/hooks/useMultiTenantEnabled.ts`

```typescript
export const useMultiTenantEnabled = () => {
  const [enabled, setEnabled] = useState(false);
  
  useEffect(() => {
    const fetchSetting = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('enable_multi_tenant_beta')
        .single();
      
      setEnabled(data?.enable_multi_tenant_beta || false);
    };
    
    fetchSetting();
    
    // Subscribe to changes
    const channel = supabase
      .channel('app_settings_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'app_settings'
      }, fetchSetting)
      .subscribe();
    
    return () => { channel.unsubscribe(); };
  }, []);
  
  return enabled;
};
```

### Component-Level Gates

```typescript
const BillingDashboard = () => {
  const multiTenantEnabled = useMultiTenantEnabled();
  
  if (!multiTenantEnabled) {
    return null; // Don't render at all
  }
  
  return <div>Billing Dashboard Content</div>;
};
```

### Route-Level Protection

```typescript
// In App.tsx
const multiTenantEnabled = useMultiTenantEnabled();

<Route 
  path="/onboarding" 
  element={
    multiTenantEnabled 
      ? <OrganizationOnboarding /> 
      : <Navigate to="/" />
  } 
/>

<Route 
  path="/settings/billing" 
  element={
    multiTenantEnabled 
      ? <Billing /> 
      : <Navigate to="/settings" />
  } 
/>
```

### Admin Toggle UI

**In Admin Settings:**

```typescript
<Switch
  checked={multiTenantEnabled}
  onCheckedChange={async (checked) => {
    await supabase
      .from('app_settings')
      .update({ enable_multi_tenant_beta: checked })
      .eq('id', settingsId);
  }}
/>
<Label>Enable Multi-Tenant Beta Features</Label>
```

### Gradual Rollout Plan

1. **Week 1-9:** Feature flag OFF, develop with feature flag
2. **Week 10:** Enable for Owner account only (internal testing)
3. **Week 11:** Enable for 3-5 beta test organizations
4. **Week 12:** Enable for all (public launch)

---

## Implementation Timeline - 10-12 Week Phased Approach

### Phase 1: Foundation (Week 1-2)

**Goal:** Core infrastructure without breaking existing functionality

**Tasks:**
- [ ] Add `enable_multi_tenant_beta` to `app_settings` (default: false)
- [ ] Create `organizations` table
- [ ] Create `organization_members` table
- [ ] Create `subscription_plans` table
- [ ] Create `organization_subscriptions` table
- [ ] Add nullable `organization_id` to all existing tables (50+ tables)
- [ ] Create helper functions: `get_user_organization()`, `has_organization_permission()`, `check_seat_limit()`
- [ ] Create indexes on `(organization_id, created_at)` for performance

**Testing:**
- Verify Best Day Ministries site still works
- All existing features functional with NULL organization_id

**Deliverable:** Database schema ready, legacy data unaffected

---

### Phase 2: Security (Week 3-4)

**Goal:** Implement RLS policies with organization boundaries

**Tasks:**
- [ ] Update RLS policies for discussion_posts (with NULL fallback)
- [ ] Update RLS policies for discussion_comments
- [ ] Update RLS policies for events, event_dates
- [ ] Update RLS policies for albums, album_images
- [ ] Update RLS policies for videos
- [ ] Update RLS policies for sponsor_besties, sponsorships, sponsor_messages
- [ ] Update RLS policies for vendors, products, orders
- [ ] Update RLS policies for featured_items, navigation_links
- [ ] Update RLS policies for notifications, help content
- [ ] Update RLS policies for all remaining tables (~30 more)

**Testing:**
- Create 2 test organizations in database (manual INSERT)
- Create test users in each organization
- Verify users cannot see other organization's data
- Verify Best Day Ministries (NULL org_id) still accessible

**Security Audit:**
- Review every RLS policy
- Test data isolation with multiple accounts
- Check for any cross-organization leaks

**Deliverable:** Bulletproof data isolation, all RLS policies updated

---

### Phase 3: Billing Integration (Week 5-6)

**Goal:** Stripe subscription system fully functional

**Tasks:**
- [ ] Create subscription plans in Stripe dashboard
  - Starter: $99/month base + $20/seat
  - Professional: $299/month base + $20/seat
  - Enterprise: $799/month base + $20/seat
- [ ] Populate `subscription_plans` table with Stripe price IDs
- [ ] Build `create-organization-subscription` edge function
- [ ] Build `update-organization-seats` edge function
- [ ] Build `check-subscription-limits` edge function
- [ ] Build `handle-organization-subscription-webhook` edge function
- [ ] Configure Stripe webhook endpoint
- [ ] Test checkout flow end-to-end
- [ ] Test seat additions
- [ ] Test plan upgrades/downgrades
- [ ] Test subscription cancellation
- [ ] Test webhook processing (use Stripe CLI)

**Testing:**
- Create test subscriptions for 3 test organizations
- Verify Stripe charges correctly
- Verify webhooks update database
- Test failed payment scenarios
- Test grace period logic

**Deliverable:** Complete Stripe integration, billing automated

---

### Phase 4: Frontend Development (Week 7-9)

**Goal:** User-facing interfaces for multi-tenancy

**Tasks:**

**Week 7: Core Context & Hooks**
- [ ] Create `OrganizationContext.tsx`
- [ ] Create `useOrganization.ts` hook
- [ ] Create `useSubscriptionLimits.ts` hook
- [ ] Create `useOrganizationMembers.ts` hook
- [ ] Create `useMultiTenantEnabled.ts` hook
- [ ] Wrap App with OrganizationProvider (behind feature flag)

**Week 8: Onboarding Flow**
- [ ] Create `OrganizationOnboarding.tsx` page
- [ ] Step 1: Create account (if needed)
- [ ] Step 2: Create organization form
- [ ] Step 3: Plan selector component
- [ ] Step 4: Stripe Checkout integration
- [ ] Step 5: Team invite flow
- [ ] Success page
- [ ] Add route: `/onboarding` (protected by feature flag)

**Week 9: Settings & Management**
- [ ] Create `Billing.tsx` page
  - Current plan display
  - Seat usage indicator
  - Add/remove seats
  - Upgrade/downgrade buttons
  - Invoice history
- [ ] Create `OrganizationSettings.tsx` page
  - Organization profile tab
  - Members management tab
  - Branding tab (Professional+)
- [ ] Create `OrganizationSwitcher.tsx` component (for header)
- [ ] Create `InviteUserDialog.tsx`
- [ ] Create `MemberManagement.tsx`
- [ ] Create `SeatUsageIndicator.tsx`
- [ ] Add routes: `/settings/organization`, `/settings/billing` (protected)

**Testing:**
- Walk through complete onboarding flow
- Test member invitations
- Test seat limit enforcement
- Test UI responsiveness
- Test feature flag toggling

**Deliverable:** Complete multi-tenant UI, fully functional

---

### Phase 5: Migration & Testing (Week 10-11)

**Goal:** Migrate Best Day Ministries, load test, security audit

**Tasks:**

**Week 10: Data Migration**
- [ ] Create "Best Day Ministries" organization record
- [ ] Write migration script to set `organization_id` for all existing data
- [ ] Test migration on staging database
- [ ] Run migration on production
- [ ] Verify ALL records have `organization_id` set
- [ ] Remove NULL fallbacks from RLS policies (make strict)
- [ ] Make `organization_id` NOT NULL on all tables
- [ ] Monitor for any issues

**Week 11: Load Testing & Security**
- [ ] Create 5 test organizations with realistic data
  - 100+ discussion posts per org
  - 50+ events per org
  - 20+ users per org
- [ ] Load test with JMeter or Artillery
  - Target: 1000 requests/minute
  - Monitor query performance
  - Check for N+1 queries
- [ ] Security penetration testing
  - Attempt to access other org's data
  - Test SQL injection
  - Test authorization bypasses
- [ ] Performance optimization
  - Add missing indexes
  - Optimize slow queries
  - Add caching if needed

**Testing Checklist:**
- [ ] 5+ test organizations with full data
- [ ] Users cannot see other org's data (verified 10+ scenarios)
- [ ] Page load times <200ms (monitored)
- [ ] Seat limits enforced correctly
- [ ] Billing works end-to-end
- [ ] Best Day Ministries migrated with zero downtime
- [ ] All existing features work in organization context

**Deliverable:** Production-ready system, security verified, performance validated

---

### Phase 6: Launch Preparation (Week 12)

**Goal:** Soft launch with beta customers, documentation, monitoring

**Tasks:**
- [ ] Create customer onboarding documentation
  - Getting started guide
  - How to invite members
  - How to manage subscription
  - Feature usage guides
- [ ] Set up monitoring dashboards
  - Subscription metrics
  - Seat usage across all orgs
  - Error rates by organization
  - Performance metrics
- [ ] Create admin tools for organization management
  - View all organizations
  - Manually adjust seat limits (for enterprise deals)
  - Suspend/unsuspend organizations
- [ ] Soft launch: Enable feature flag for all
- [ ] Invite 3-5 beta organizations
  - Onboard personally
  - Gather feedback
  - Fix any issues quickly
- [ ] Marketing site updates
  - Pricing page
  - Feature comparison
  - Sign up CTA
- [ ] Prepare support materials
  - FAQ for customers
  - Support ticket system
  - Billing support process

**Final Checks:**
- [ ] All documentation complete
- [ ] Monitoring alerts configured
- [ ] Support team trained
- [ ] Beta feedback addressed
- [ ] Performance validated at scale
- [ ] Security audit passed

**Deliverable:** Public launch ready, beta validated, documentation complete

---

## Data Migration Strategy

### Phase 1: Add Nullable Columns

**Timeline:** Week 1

```sql
-- Example for discussion_posts
ALTER TABLE discussion_posts 
ADD COLUMN organization_id UUID REFERENCES organizations(id);

CREATE INDEX idx_discussion_posts_org 
ON discussion_posts(organization_id, created_at DESC);
```

**Apply to all 50+ tables.**

**Verification:**
```sql
-- Check all tables have the column
SELECT table_name 
FROM information_schema.columns 
WHERE column_name = 'organization_id' 
  AND table_schema = 'public';
-- Should return 50+ rows
```

---

### Phase 2: Create Best Day Ministries Organization

**Timeline:** Week 10

```sql
-- Create the organization
INSERT INTO organizations (id, name, slug, seat_limit, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001', -- Fixed UUID for easy reference
  'Best Day Ministries',
  'best-day-ministries',
  999, -- Large seat limit (they don't pay per seat)
  true
)
RETURNING id;

-- Set organization_id for existing profiles
UPDATE profiles
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Add all existing users as members
INSERT INTO organization_members (organization_id, user_id, role, joined_at)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.users.id 
        AND role IN ('owner', 'admin')
    ) THEN 'admin'
    ELSE 'member'
  END,
  created_at
FROM auth.users;
```

---

### Phase 3: Migrate All Data

**Timeline:** Week 10

```sql
-- Run for each table
UPDATE discussion_posts
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE discussion_comments
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE events
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- ... repeat for all 50+ tables
```

**Create a migration script:**
```typescript
// scripts/migrate-to-organization.ts
const TABLES_TO_MIGRATE = [
  'discussion_posts',
  'discussion_comments',
  'events',
  // ... all tables
];

const BDM_ORG_ID = '00000000-0000-0000-0000-000000000001';

for (const table of TABLES_TO_MIGRATE) {
  console.log(`Migrating ${table}...`);
  
  const { count } = await supabase
    .from(table)
    .update({ organization_id: BDM_ORG_ID })
    .is('organization_id', null);
  
  console.log(`✓ Migrated ${count} rows in ${table}`);
}
```

---

### Phase 4: Verify Migration

**Timeline:** Week 10

```sql
-- Check for any NULL organization_ids
-- Should return 0 rows for each table
SELECT 'discussion_posts' as table_name, COUNT(*) as null_count
FROM discussion_posts WHERE organization_id IS NULL
UNION ALL
SELECT 'events', COUNT(*) FROM events WHERE organization_id IS NULL
UNION ALL
-- ... all tables
```

---

### Phase 5: Make NOT NULL

**Timeline:** Week 10 (after verification)

```sql
-- Remove NULL fallbacks from RLS policies first!

-- Then make columns NOT NULL
ALTER TABLE discussion_posts 
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE discussion_comments 
ALTER COLUMN organization_id SET NOT NULL;

-- ... repeat for all tables
```

---

### Phase 6: Update RLS Policies (Remove NULL Checks)

**Timeline:** Week 10

**Before:**
```sql
USING (
  organization_id = get_user_organization()
  OR organization_id IS NULL -- REMOVE THIS
);
```

**After:**
```sql
USING (organization_id = get_user_organization());
```

**Update all 100+ RLS policies.**

---

### Rollback Plan

If migration fails:

1. **Before making NOT NULL:**
   - RLS policies still have NULL fallbacks
   - Best Day Ministries continues working
   - Can revert organization_id updates

2. **After making NOT NULL:**
   - Must keep organization_id
   - Can update RLS policies to re-add NULL checks temporarily
   - Investigate failed records

---

## Pricing Model Details

### Tier Comparison

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| **Base Price** | $99/month | $299/month | $799/month |
| **Included Seats** | 5 | 20 | Unlimited |
| **Additional Seats** | $20/seat/month | $20/seat/month | Included |
| **Events** | ✅ | ✅ | ✅ |
| **Discussions** | ✅ | ✅ | ✅ |
| **Albums** | ✅ | ✅ | ✅ |
| **Sponsorships** | ✅ | ✅ | ✅ |
| **Marketplace** | ✅ | ✅ | ✅ |
| **Custom Branding** | ❌ | ✅ | ✅ |
| **Advanced Analytics** | ❌ | ✅ | ✅ |
| **API Access** | ❌ | ✅ | ✅ |
| **White-Label** | ❌ | ❌ | ✅ |
| **Custom Domain** | ❌ | ❌ | ✅ |
| **Dedicated Support** | ❌ | ❌ | ✅ |
| **SSO** | ❌ | ❌ | ✅ |
| **Priority Features** | ❌ | ❌ | ✅ |

### Feature Flags by Tier

**Stored in `subscription_plans.features` JSONB:**

```json
{
  "starter": {
    "custom_branding": false,
    "advanced_analytics": false,
    "api_access": false,
    "white_label": false,
    "custom_domain": false,
    "sso": false
  },
  "professional": {
    "custom_branding": true,
    "advanced_analytics": true,
    "api_access": true,
    "white_label": false,
    "custom_domain": false,
    "sso": false
  },
  "enterprise": {
    "custom_branding": true,
    "advanced_analytics": true,
    "api_access": true,
    "white_label": true,
    "custom_domain": true,
    "sso": true
  }
}
```

**Check in code:**
```typescript
const { hasFeature } = useOrganization();

if (hasFeature('custom_branding')) {
  // Show branding settings
}
```

### Revenue Projections

**Assumptions:**
- 10 organizations in Year 1
- 50% Starter, 30% Professional, 20% Enterprise
- Average 10 seats per org

**Year 1 Revenue:**
- 5 Starter orgs: 5 × $99 × 12 = $5,940
- 3 Professional orgs: 3 × $299 × 12 = $10,764
- 2 Enterprise orgs: 2 × $799 × 12 = $19,176
- Additional seats: ~50 seats × $20 × 12 = $12,000
- **Total Year 1:** ~$48,000

**Year 2 Revenue (50 orgs):**
- **Projected:** ~$240,000

---

## Risk Mitigation

### Risk 1: Data Leakage Between Organizations

**Likelihood:** Medium  
**Impact:** Critical  
**Mitigation:**
- Write comprehensive E2E tests for data isolation
- Manual security audit by 2+ developers
- Automated tests: User A tries to access User B's data (different org)
- Test with 10+ scenarios across all tables

**Acceptance Criteria:**
- 100% of attempts to access other org's data fail
- RLS policies tested with `SET ROLE` for different users

---

### Risk 2: Performance Degradation

**Likelihood:** Medium  
**Impact:** High  
**Mitigation:**
- Add indexes on `(organization_id, created_at)` for all tables
- Load test with 50+ organizations, 1000+ requests/minute
- Use `EXPLAIN ANALYZE` on all common queries
- Monitor query times in production

**Acceptance Criteria:**
- Page load times remain <200ms
- No N+1 query problems
- Database CPU <70% under load

---

### Risk 3: Breaking Existing Best Day Ministries Site

**Likelihood:** Low  
**Impact:** Critical  
**Mitigation:**
- Feature flags hide all multi-tenant UI
- RLS policies support NULL organization_id during migration
- Test existing site after every major change
- Maintain staging environment with production data clone

**Acceptance Criteria:**
- All existing features work with feature flag OFF
- Migration completes with zero downtime
- Rollback possible at any phase

---

### Risk 4: Stripe Billing Issues

**Likelihood:** Medium  
**Impact:** High  
**Mitigation:**
- Comprehensive webhook testing with Stripe CLI
- Graceful handling of failed webhooks (retry logic)
- Manual billing reconciliation tools for admins
- Grace period for payment failures (7 days)

**Acceptance Criteria:**
- Webhooks process 99.9% successfully
- Failed payments flagged for admin review
- Customers receive payment failure notifications

---

### Risk 5: Seat Limit Enforcement Bugs

**Likelihood:** Medium  
**Impact:** Medium  
**Mitigation:**
- Enforce seat limits in multiple places:
  - Frontend (user can't click "Invite" if at limit)
  - Edge function (checks before sending invite)
  - Database trigger (prevents INSERT if at limit)
- Daily cron job to reconcile seat counts
- Admin dashboard to view all orgs' seat usage

**Acceptance Criteria:**
- Cannot invite user when at seat limit
- Seat count always matches active members
- Overage alerts sent to admins

---

## Success Criteria

Before launching to public, ALL criteria must be met:

### Data Integrity
- [ ] ✅ 5+ test organizations created with full data
- [ ] ✅ Users in Org A cannot see any data from Org B (tested 20+ scenarios)
- [ ] ✅ All 50+ tables have `organization_id` NOT NULL
- [ ] ✅ All 100+ RLS policies enforce organization boundaries
- [ ] ✅ Best Day Ministries migrated with zero data loss
- [ ] ✅ No NULL organization_ids in production

### Performance
- [ ] ✅ Page load times <200ms with 10+ organizations
- [ ] ✅ Database queries optimized (all have proper indexes)
- [ ] ✅ No N+1 query problems
- [ ] ✅ Load test: 1000 requests/minute handled successfully

### Billing
- [ ] ✅ Stripe checkout works end-to-end
- [ ] ✅ Webhooks update database correctly (tested 10+ events)
- [ ] ✅ Seat additions charge correctly (prorated)
- [ ] ✅ Plan upgrades/downgrades work
- [ ] ✅ Invoice history displays correctly
- [ ] ✅ Seat limits enforced in 3 places (UI, edge function, database)

### User Experience
- [ ] ✅ Onboarding flow completed by 5+ beta users
- [ ] ✅ Organization settings functional
- [ ] ✅ Member management works (invite, remove, change role)
- [ ] ✅ Billing dashboard accurate
- [ ] ✅ Feature flags toggle without issues

### Documentation
- [ ] ✅ Customer onboarding guide written
- [ ] ✅ Admin tools documented
- [ ] ✅ API documentation (for Professional+ tiers)
- [ ] ✅ Support team trained

### Security
- [ ] ✅ Security audit completed by 2+ developers
- [ ] ✅ Penetration testing passed
- [ ] ✅ No critical security vulnerabilities
- [ ] ✅ OWASP Top 10 checked

### Monitoring
- [ ] ✅ Error tracking configured (Sentry)
- [ ] ✅ Performance monitoring (Supabase metrics)
- [ ] ✅ Billing alerts set up (failed payments, seat overages)
- [ ] ✅ Daily health check automated

---

## Domain Strategy

### Phase 1: Path-Based (Launch)

**Pattern:** `app.com/[org-slug]`

**Examples:**
- `bestdayplatform.com/acme-community`
- `bestdayplatform.com/joy-center`
- `bestdayplatform.com/best-day-ministries`

**Implementation:**
- Use React Router params: `/:orgSlug/*`
- Load organization by slug in OrganizationContext
- All routes prefixed with org slug

**Advantages:**
- Simple to implement
- No DNS configuration needed
- Works for all tiers

---

### Phase 2: Subdomain-Based (Enterprise Feature)

**Pattern:** `[org-slug].app.com`

**Examples:**
- `acme-community.bestdayplatform.com`
- `joy-center.bestdayplatform.com`

**Implementation:**
- Wildcard DNS: `*.bestdayplatform.com` → app
- Extract subdomain in middleware
- Load organization by subdomain

**Advantages:**
- Cleaner URLs
- More professional
- Better for white-label

**Disadvantages:**
- Requires wildcard DNS
- More complex routing
- SSL certificate management

---

### Phase 3: Custom Domains (Enterprise Only)

**Pattern:** Customer's own domain

**Examples:**
- `community.acme.org`
- `connect.joycenter.com`

**Implementation:**
- Customer adds CNAME: `community.acme.org` → `bestdayplatform.com`
- Verify DNS before enabling
- Automatically provision SSL certificate (Let's Encrypt)
- Store in `organizations.custom_domain`

**Advantages:**
- Fully white-labeled
- Customer owns branding
- Premium feature ($799/month tier)

---

## Testing Strategy

### Unit Tests

**Files to test:**
- `src/hooks/useOrganization.ts`
- `src/hooks/useSubscriptionLimits.ts`
- Database helper functions
- Seat limit calculations

**Example:**
```typescript
describe('useSubscriptionLimits', () => {
  it('should return false when at seat limit', () => {
    // Test seat limit logic
  });
  
  it('should return true when feature enabled for tier', () => {
    // Test feature flag checks
  });
});
```

---

### Integration Tests (RLS Policies)

**Goal:** Verify data isolation

**Pattern:**
```typescript
describe('discussion_posts RLS', () => {
  it('should prevent user from viewing other org posts', async () => {
    // Create user in Org A
    // Create user in Org B
    // User A creates post
    // Verify User B cannot see post
  });
});
```

**Test all tables:** 50+ integration tests needed.

---

### E2E Tests (Playwright)

**Critical Flows:**

1. **Onboarding Flow**
   - Sign up → Create org → Choose plan → Complete checkout → Success

2. **Member Management**
   - Invite user → Accept invite → Verify appears in members list

3. **Seat Limit Enforcement**
   - Reach seat limit → Try to invite → See error message

4. **Billing Updates**
   - Add seat → Verify Stripe charged → Verify limit increased

5. **Data Isolation**
   - Create post in Org A → Login as Org B user → Verify cannot see post

**Example:**
```typescript
test('should prevent cross-organization data access', async ({ page }) => {
  // Create Org A user and post
  // Logout
  // Create Org B user
  // Navigate to discussions
  // Verify Org A's post not visible
});
```

---

### Load Tests

**Tools:** Artillery or JMeter

**Scenarios:**
- 1000 requests/minute across 10 organizations
- Simulate 100 concurrent users
- Mix of reads (80%) and writes (20%)

**Metrics to monitor:**
- Response times (p50, p95, p99)
- Error rates
- Database CPU/memory
- Query times

**Acceptance Criteria:**
- p95 response time <200ms
- Error rate <0.1%
- Database CPU <70%

---

### Security Audit

**Manual Testing:**
1. Attempt to access other org's data via:
   - Direct API calls (with manipulated organization_id)
   - SQL injection attempts
   - Authorization bypass attempts
2. Test RLS policies with `SET ROLE` for different users
3. Verify admin impersonation respects organization context

**Automated:**
- Use OWASP ZAP for security scanning
- SQL injection tests
- XSS tests

**Acceptance Criteria:**
- 0 critical security vulnerabilities
- All attempts to access other org's data fail
- OWASP Top 10 compliance

---

## Next Steps

### Immediate Actions

1. **Review & Approve Plan**
   - Share with stakeholders
   - Get engineering team approval
   - Estimate total hours (likely 400-500 hours)

2. **Set Up Feature Flag**
   - Add `enable_multi_tenant_beta` to `app_settings`
   - Default to `false`
   - Create admin toggle UI

3. **Create Staging Environment**
   - Clone production database
   - Set up separate Stripe test mode
   - Configure for multi-tenant testing

4. **Start Phase 1**
   - Create database tables
   - Add nullable `organization_id` columns
   - Create helper functions

### Weekly Check-ins

**During implementation:**
- Monday: Sprint planning
- Wednesday: Mid-week review
- Friday: Demo progress, adjust timeline

**Track:**
- Completed tasks
- Blockers
- Timeline adjustments
- Risk updates

---

## Conclusion

This plan outlines a **safe, phased approach** to converting Best Day Ministries from a single-tenant site into a multi-tenant SaaS platform. By using **feature flags** and working on the `main` branch, we minimize risk while building incrementally.

**Key Success Factors:**
1. ✅ Thorough RLS policy updates (security first)
2. ✅ Comprehensive testing at every phase
3. ✅ Feature flags for safe rollout
4. ✅ Data migration with zero downtime
5. ✅ Clear pricing and billing model

**Timeline:** 10-12 weeks from start to public launch.

**Expected Outcome:** A production-ready, secure, scalable multi-tenant platform that can serve 50+ organizations in Year 1.

---

## Appendix: Key SQL Queries

### Check Organization Isolation
```sql
-- Verify no cross-organization data leakage
SELECT 
  t1.organization_id AS org_a,
  t2.organization_id AS org_b,
  COUNT(*) as shared_records
FROM discussion_posts t1
JOIN discussion_posts t2 ON t1.id = t2.id
WHERE t1.organization_id != t2.organization_id
GROUP BY t1.organization_id, t2.organization_id;
-- Should return 0 rows
```

### Monitor Seat Usage
```sql
-- Real-time seat usage across all organizations
SELECT 
  o.name,
  o.seat_limit,
  COUNT(om.id) as active_seats,
  o.seat_limit - COUNT(om.id) as available_seats,
  ROUND(COUNT(om.id)::numeric / o.seat_limit * 100, 1) as usage_percent
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
GROUP BY o.id, o.name, o.seat_limit
ORDER BY usage_percent DESC;
```

### Find Organizations Near Seat Limit
```sql
-- Alert for organizations at 90%+ capacity
SELECT 
  o.name,
  o.seat_limit,
  COUNT(om.id) as active_seats
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
GROUP BY o.id, o.name, o.seat_limit
HAVING COUNT(om.id)::numeric / o.seat_limit >= 0.9
ORDER BY COUNT(om.id)::numeric / o.seat_limit DESC;
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-14  
**Next Review:** Start of each implementation phase
