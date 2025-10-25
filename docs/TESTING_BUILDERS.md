# Test Data Builders

## Overview

Test builders provide a fluent, readable way to create complex test data. Instead of writing repetitive setup code, you use builders to construct test entities with sensible defaults and easy customization.

## Benefits

✅ **Readable**: Tests read like English  
✅ **Reusable**: Same builder across all tests  
✅ **Maintainable**: Change schema once, not in every test  
✅ **Fast**: Builders create minimal required data  
✅ **Type-Safe**: TypeScript ensures correctness  

---

## Available Builders

### 1. GuardianBuilder

Creates guardian users with optional linked besties.

**Basic Usage:**
```typescript
import { GuardianBuilder } from '@/tests/builders';

// Guardian only
const { guardian } = await new GuardianBuilder().build();

// Guardian with linked bestie
const { guardian, bestie } = await new GuardianBuilder()
  .withLinkedBestie()
  .build();

// Guardian with bestie + approval flags
const { guardian, bestie } = await new GuardianBuilder()
  .withLinkedBestie()
  .withApprovalFlags({
    posts: true,
    comments: false,
    messages: true
  })
  .build();
```

**Methods:**
- `.withLinkedBestie(email?: string)` - Creates bestie and links to guardian
- `.withApprovalFlags({ posts, comments, messages, vendorAssets })` - Sets approval requirements

**Returns:**
```typescript
{
  guardian: {
    id: string;
    email: string;
  },
  bestie?: {
    id: string;
    email: string;
  }
}
```

---

### 2. SponsorshipBuilder

Creates sponsor relationships with configurable amounts and frequencies.

**Basic Usage:**
```typescript
import { SponsorshipBuilder } from '@/tests/builders';

// Default: $25/month active sponsorship
const { sponsor, bestie, sponsorship } = await new SponsorshipBuilder().build();

// Custom amount
const data = await new SponsorshipBuilder()
  .withAmount(50)
  .build();

// One-time sponsorship
const data = await new SponsorshipBuilder()
  .withFrequency('one-time')
  .withAmount(100)
  .build();

// Cancelled sponsorship
const data = await new SponsorshipBuilder()
  .withStatus('cancelled')
  .build();

// Live mode sponsorship
const data = await new SponsorshipBuilder()
  .withStripeMode('live')
  .withAmount(25)
  .build();
```

**Methods:**
- `.withAmount(amount: number)` - Set sponsorship amount
- `.withFrequency('one-time' | 'monthly')` - Set frequency
- `.withStatus('active' | 'cancelled' | 'paused')` - Set status
- `.withStripeMode('test' | 'live')` - Set Stripe mode

**Returns:**
```typescript
{
  sponsor: { id: string; email: string; },
  bestie: { id: string; email: string; },
  sponsorBestie: { id: string; ... },
  sponsorship: { id: string; amount: number; ... }
}
```

---

### 3. DiscussionBuilder

Creates discussion posts with optional comments.

**Basic Usage:**
```typescript
import { DiscussionBuilder } from '@/tests/builders';

// Approved post
const { author, post } = await new DiscussionBuilder().build();

// Pending approval post
const { author, post } = await new DiscussionBuilder()
  .withApprovalStatus('pending_approval')
  .build();

// Post with custom content
const { author, post } = await new DiscussionBuilder()
  .withTitle('My Custom Title')
  .withContent('Custom post content here')
  .build();

// Post with 3 comments
const { author, post, comments } = await new DiscussionBuilder()
  .withComments(3)
  .build();

// Unmoderated post (bypass moderation)
const { author, post } = await new DiscussionBuilder()
  .withModeration(false)
  .build();
```

**Methods:**
- `.withTitle(title: string)` - Set post title
- `.withContent(content: string)` - Set post content
- `.withApprovalStatus('approved' | 'pending_approval' | 'rejected')` - Set approval status
- `.withModeration(isModerated: boolean)` - Enable/disable moderation
- `.withComments(count: number)` - Create N comments

**Returns:**
```typescript
{
  author: { id: string; email: string; },
  post: { id: string; title: string; ... },
  comments: Array<{ id: string; content: string; ... }>
}
```

---

### 4. StickerBuilder

Creates sticker collections with stickers.

**Basic Usage:**
```typescript
import { StickerBuilder } from '@/tests/builders';

// Default: Collection with 5 stickers
const { collection, stickers } = await new StickerBuilder().build();

// Custom collection name
const { collection, stickers } = await new StickerBuilder()
  .withCollectionName('Holiday Stickers')
  .build();

// Collection with 10 stickers
const { collection, stickers } = await new StickerBuilder()
  .withStickersCount(10)
  .build();

// Inactive collection
const { collection, stickers } = await new StickerBuilder()
  .withActive(false)
  .build();

// Custom rarity configuration
const { collection, stickers } = await new StickerBuilder()
  .withRarityConfig({
    common: 60,
    uncommon: 25,
    rare: 10,
    epic: 4,
    legendary: 1
  })
  .build();
```

**Methods:**
- `.withCollectionName(name: string)` - Set collection name
- `.withStickersCount(count: number)` - Create N stickers
- `.withActive(isActive: boolean)` - Set active status
- `.withRarityConfig(config: Record<string, number>)` - Set rarity percentages

**Returns:**
```typescript
{
  collection: { id: string; name: string; ... },
  stickers: Array<{ id: string; name: string; rarity: string; ... }>
}
```

---

### 5. VendorBuilder

Creates vendor accounts with optional products.

**Basic Usage:**
```typescript
import { VendorBuilder } from '@/tests/builders';

// Approved vendor
const { vendor, vendorRecord } = await new VendorBuilder().build();

// Pending vendor application
const { vendor, vendorRecord } = await new VendorBuilder()
  .withStatus('pending')
  .build();

// Vendor with 5 products
const { vendor, vendorRecord, products } = await new VendorBuilder()
  .withProducts(5)
  .build();

// Vendor with custom business name
const { vendor, vendorRecord } = await new VendorBuilder()
  .withBusinessName('Amazing Pet Supplies')
  .build();
```

**Methods:**
- `.withBusinessName(name: string)` - Set business name
- `.withStatus('pending' | 'approved' | 'rejected' | 'suspended')` - Set vendor status
- `.withProducts(count: number)` - Create N products

**Returns:**
```typescript
{
  vendor: { id: string; email: string; },
  vendorRecord: { id: string; business_name: string; ... },
  products: Array<{ id: string; name: string; price: number; ... }>
}
```

---

## Real-World Examples

### Testing Guardian Approval Flow

```typescript
test('guardian can approve pending post', async () => {
  // Create guardian linked to bestie
  const { guardian, bestie } = await new GuardianBuilder()
    .withLinkedBestie()
    .withApprovalFlags({ posts: true })
    .build();

  // Bestie creates pending post
  const { post } = await new DiscussionBuilder()
    .withApprovalStatus('pending_approval')
    .build();

  // Guardian approves
  await approvePost(guardian.id, post.id);

  // Assert post is now approved
  expect(post.approval_status).toBe('approved');
});
```

### Testing Sponsorship Funding Progress

```typescript
test('shows correct funding progress with multiple sponsors', async () => {
  // Create bestie with goal
  const bestie = await createBestieWithGoal(100);

  // Add 3 sponsors at different amounts
  await new SponsorshipBuilder()
    .withAmount(25)
    .withFrequency('monthly')
    .build();

  await new SponsorshipBuilder()
    .withAmount(25)
    .withFrequency('monthly')
    .build();

  await new SponsorshipBuilder()
    .withAmount(50)
    .withFrequency('monthly')
    .build();

  // Total: $100/month = 100% funded
  const progress = await getFundingProgress(bestie.id);
  expect(progress.percentage).toBe(100);
});
```

### Testing Sticker Collection Completion

```typescript
test('awards badge when collection is complete', async () => {
  // Create collection with 5 stickers
  const { collection, stickers } = await new StickerBuilder()
    .withStickersCount(5)
    .build();

  const user = await createTestUser();

  // User collects all 5 stickers
  for (const sticker of stickers) {
    await awardSticker(user.id, sticker.id);
  }

  // Assert badge was awarded
  const badges = await getUserBadges(user.id);
  expect(badges).toContainEqual(
    expect.objectContaining({ type: 'collection_complete' })
  );
});
```

---

## Cleanup

Builders automatically create test users with prefixes like `testguardian_`, `testsponsor_`, etc. These are cleaned up by:

1. **Automated Cleanup**: `cleanup-test-data-unified` edge function
2. **Manual Cleanup**: Admin → Settings → Testing → Clean Test Data
3. **CI Cleanup**: Runs after every test suite

**Important**: Builders use the same patterns as E2E tests for naming, so existing cleanup logic handles them.

---

## Advanced Patterns

### Chaining Multiple Builders

```typescript
// Create ecosystem: guardian, bestie, sponsor, posts
const { guardian, bestie } = await new GuardianBuilder()
  .withLinkedBestie()
  .withApprovalFlags({ posts: true })
  .build();

const { post } = await new DiscussionBuilder()
  .withApprovalStatus('pending_approval')
  .withComments(2)
  .build();

const { sponsorship } = await new SponsorshipBuilder()
  .withAmount(25)
  .build();
```

### Custom Email Addresses

```typescript
// Use specific email for tracking
const { guardian } = await new GuardianBuilder()
  .withLinkedBestie('mybestie@example.com')
  .build();
```

### Conditional Building

```typescript
const buildTestData = async (needsSponsorship: boolean) => {
  const base = await new GuardianBuilder()
    .withLinkedBestie()
    .build();

  if (needsSponsorship) {
    const sponsorship = await new SponsorshipBuilder()
      .withAmount(50)
      .build();
    return { ...base, sponsorship };
  }

  return base;
};
```

---

## Troubleshooting

### "Failed to create user" Error

**Cause**: Email already exists in database  
**Solution**: Use unique timestamps (builders do this automatically)

### "Foreign key violation" Error

**Cause**: Referenced entity doesn't exist  
**Solution**: Build dependencies first (e.g., bestie before sponsorship)

### "Permission denied" Error

**Cause**: Service role key not set  
**Solution**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is in environment

---

## Best Practices

✅ **DO:**
- Use builders for all test data creation
- Chain methods for readability
- Clean up after tests (automatic in most cases)
- Create minimal required data

❌ **DON'T:**
- Create test data manually with raw SQL
- Share test data between tests
- Hardcode user IDs
- Skip cleanup

---

## Contributing

When adding new builders:

1. Create builder in `tests/builders/YourBuilder.ts`
2. Follow existing patterns (fluent interface, sensible defaults)
3. Export from `tests/builders/index.ts`
4. Add documentation to this file
5. Add example usage in `TESTING_STRATEGY.md`
