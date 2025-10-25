# Testing Quick Reference Card

## 🏃 Run Tests

```bash
npm test                    # All tests
npm run test:unit          # Unit tests (fastest)
npm run test:integration   # Integration tests
npm run test:e2e           # E2E tests
npm run test:coverage      # With coverage report
```

---

## 🏗️ Test Data Builders

### Guardian with Bestie
```typescript
import { GuardianBuilder } from '@/tests/builders';

const { guardian, bestie } = await new GuardianBuilder()
  .withLinkedBestie()
  .withApprovalFlags({ posts: true, comments: false })
  .build();
```

### Sponsorship
```typescript
import { SponsorshipBuilder } from '@/tests/builders';

const { sponsor, bestie, sponsorship } = await new SponsorshipBuilder()
  .withAmount(50)
  .withFrequency('monthly')
  .withStatus('active')
  .build();
```

### Discussion Post
```typescript
import { DiscussionBuilder } from '@/tests/builders';

const { author, post, comments } = await new DiscussionBuilder()
  .withTitle('Test Post')
  .withApprovalStatus('pending_approval')
  .withComments(3)
  .build();
```

### Sticker Collection
```typescript
import { StickerBuilder } from '@/tests/builders';

const { collection, stickers } = await new StickerBuilder()
  .withCollectionName('Halloween')
  .withStickersCount(10)
  .build();
```

### Vendor with Products
```typescript
import { VendorBuilder } from '@/tests/builders';

const { vendor, vendorRecord, products } = await new VendorBuilder()
  .withBusinessName('Pet Supplies Co')
  .withProducts(5)
  .build();
```

---

## 🧪 Integration Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

describe('MyComponent', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );

  it('renders correctly', async () => {
    render(<MyComponent />, { wrapper });
    expect(await screen.findByText('Expected')).toBeInTheDocument();
  });
});
```

---

## 🎭 Mock API with MSW

### Override Handler in Test
```typescript
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

it('handles errors', async () => {
  server.use(
    http.get('/api/endpoint', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  // Test error handling
});
```

---

## 🧹 Reset Test Environment

### Via Admin UI
1. Login as admin
2. Admin → Settings → Testing
3. Click "Reset Test Environment"

### Programmatically
```typescript
const { data, error } = await supabase.functions
  .invoke('reset-test-environment');

console.log(`Deleted: ${data.summary.deleted.users} users`);
console.log(`Seeded: ${data.summary.seeded.guardians} guardians`);
```

---

## 📋 Test Account Credentials

**After Reset, these accounts exist:**

```
testguardian1@example.com / testpassword123
testguardian2@example.com / testpassword123
testbestie1@example.com / testpassword123
testbestie2@example.com / testpassword123
testsponsor@example.com / testpassword123
```

---

## 🎯 When to Use Each Test Type

| Scenario | Type | Why |
|----------|------|-----|
| Pure function/calculation | Unit | Fast, no dependencies |
| Component with mocked API | Integration | UI behavior without DB |
| Stripe payment flow | E2E | External integration |
| Form validation logic | Integration | Logic test, no DB needed |
| Signup → sponsor → success | E2E | Critical revenue path |

---

## 🐛 Debugging

### See Rendered Output
```typescript
import { screen } from '@testing-library/react';

screen.debug(); // Print entire DOM
screen.debug(screen.getByRole('button')); // Print specific element
```

### Check API Calls
```typescript
// MSW logs to console by default
// Look for "[MSW] ..." messages
```

---

## 📚 Full Documentation

- **Strategy:** `docs/TESTING_STRATEGY.md`
- **Builders:** `docs/TESTING_BUILDERS.md`
- **Integration:** `docs/TESTING_INTEGRATION.md`
- **Phase 1 Summary:** `docs/PHASE_1_IMPLEMENTATION_COMPLETE.md`

---

## ✅ Checklist: Writing a New Test

1. [ ] Choose test type (unit/integration/E2E)
2. [ ] Use builder for test data setup
3. [ ] Write test following AAA pattern (Arrange, Act, Assert)
4. [ ] Use accessible queries (`getByRole`, `getByLabelText`)
5. [ ] Wait for async with `findBy` not `getBy`
6. [ ] Clean up in `afterEach` (automatic)
7. [ ] Document complex scenarios

---

**Quick Start:** Copy templates above and replace component names!
