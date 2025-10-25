# Integration Testing Guide

## Overview

Integration tests validate React components with mocked APIs. They're faster than E2E tests, more reliable, and easier to debug.

## Setup

### Prerequisites

```bash
# MSW is already installed
npm install -D msw
```

### Project Structure

```
tests/
├── builders/              # Test data builders
├── mocks/
│   ├── handlers.ts       # MSW API mocks
│   └── server.ts         # MSW server setup
├── integration/          # Integration tests
│   ├── sticker-collection.test.tsx
│   ├── contact-form.test.tsx
│   ├── terms-guard.test.tsx
│   └── guardian-linking.test.tsx
└── setup.ts              # Test setup (MSW initialization)
```

---

## Writing Integration Tests

### Basic Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { YourComponent } from '@/components/YourComponent';

describe('YourComponent Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );

  it('renders data from API', async () => {
    render(<YourComponent />, { wrapper });
    
    expect(await screen.findByText('Expected Content')).toBeInTheDocument();
  });
});
```

---

## MSW (Mock Service Worker)

### How It Works

MSW intercepts network requests at the network level and returns mocked responses. Your components make real fetch/axios calls, but MSW intercepts them.

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;

export const handlers = [
  // Mock GET request
  http.get(`${SUPABASE_URL}/rest/v1/stickers`, () => {
    return HttpResponse.json([
      { id: '1', name: 'Sticker 1', rarity: 'common' },
      { id: '2', name: 'Sticker 2', rarity: 'rare' }
    ]);
  }),

  // Mock POST request
  http.post(`${SUPABASE_URL}/rest/v1/contact_submissions`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...body,
      id: 'new-submission-id',
      created_at: new Date().toISOString()
    });
  }),

  // Mock error response
  http.get(`${SUPABASE_URL}/rest/v1/broken-endpoint`, () => {
    return new HttpResponse(null, { status: 500 });
  })
];
```

### Override Handlers Per Test

```typescript
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

it('handles API errors', async () => {
  // Override handler for this test
  server.use(
    http.get(`${SUPABASE_URL}/rest/v1/stickers`, () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  render(<StickerAlbum />);

  expect(await screen.findByText(/error loading/i)).toBeInTheDocument();
});
```

---

## Common Patterns

### Testing Form Validation

```typescript
it('validates required fields', async () => {
  render(<ContactForm />);

  // Submit without filling fields
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));

  // Assert validation errors appear
  expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  expect(await screen.findByText(/message is required/i)).toBeInTheDocument();
});
```

### Testing Async Data Loading

```typescript
it('loads and displays data', async () => {
  render(<StickerAlbum />);

  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  // Assert data is displayed
  expect(screen.getByText('Common Sticker')).toBeInTheDocument();
  expect(screen.getByText('Rare Sticker')).toBeInTheDocument();
});
```

### Testing User Interactions

```typescript
it('filters stickers by rarity', async () => {
  render(<StickerAlbum />);

  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText('Common Sticker')).toBeInTheDocument();
  });

  // Apply filter
  fireEvent.click(screen.getByRole('button', { name: /rare only/i }));

  // Assert filtered results
  expect(screen.queryByText('Common Sticker')).not.toBeInTheDocument();
  expect(screen.getByText('Rare Sticker')).toBeInTheDocument();
});
```

### Testing State Changes

```typescript
it('updates UI when approval status changes', async () => {
  render(<DiscussionPost postId="123" />);

  // Initial state
  expect(await screen.findByText(/pending approval/i)).toBeInTheDocument();

  // Trigger approval
  fireEvent.click(screen.getByRole('button', { name: /approve/i }));

  // Wait for state update
  await waitFor(() => {
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
  });
});
```

---

## Testing with React Query

### Mock Query Success

```typescript
it('displays cached data', async () => {
  const queryClient = new QueryClient();

  // Pre-populate cache
  queryClient.setQueryData(['stickers'], [
    { id: '1', name: 'Cached Sticker' }
  ]);

  render(
    <QueryClientProvider client={queryClient}>
      <StickerAlbum />
    </QueryClientProvider>
  );

  expect(screen.getByText('Cached Sticker')).toBeInTheDocument();
});
```

### Mock Query Error

```typescript
it('handles query errors', async () => {
  server.use(
    http.get(`${SUPABASE_URL}/rest/v1/stickers`, () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  render(<StickerAlbum />);

  expect(await screen.findByText(/error loading stickers/i)).toBeInTheDocument();
});
```

---

## Testing with Supabase

### Mock Auth State

```typescript
it('shows content for authenticated users', () => {
  // Mock authenticated session
  vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: 'user-123', email: 'test@example.com' }
            }
          }
        })
      }
    }
  }));

  render(<ProtectedComponent />);

  expect(screen.getByText(/welcome/i)).toBeInTheDocument();
});
```

### Mock Realtime Subscriptions

```typescript
it('updates UI on realtime events', async () => {
  // Mock subscription
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn()
  };

  vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
      channel: vi.fn(() => mockChannel)
    }
  }));

  render(<RealtimeComponent />);

  // Simulate realtime event
  const callback = mockChannel.on.mock.calls[0][2];
  callback({ new: { id: 'new-item', name: 'New Item' } });

  expect(await screen.findByText('New Item')).toBeInTheDocument();
});
```

---

## Best Practices

### ✅ DO

- **Test behavior, not implementation**
  ```typescript
  // ✅ Good - tests what user sees
  expect(screen.getByText('Error')).toBeInTheDocument();

  // ❌ Bad - tests internal state
  expect(component.state.hasError).toBe(true);
  ```

- **Use accessible queries**
  ```typescript
  // ✅ Good - queries users would use
  screen.getByRole('button', { name: /submit/i })
  screen.getByLabelText('Email')
  
  // ❌ Bad - brittle selectors
  screen.getByTestId('submit-btn')
  document.querySelector('.btn-submit')
  ```

- **Wait for async updates**
  ```typescript
  // ✅ Good - waits for element
  expect(await screen.findByText('Data')).toBeInTheDocument();

  // ❌ Bad - might fail intermittently
  expect(screen.getByText('Data')).toBeInTheDocument();
  ```

### ❌ DON'T

- **Don't test implementation details**
- **Don't use arbitrary timeouts** (`setTimeout`)
- **Don't test third-party libraries** (React, Supabase, etc.)
- **Don't share state between tests**

---

## Debugging Tips

### See What's Rendered

```typescript
import { screen } from '@testing-library/react';

it('debug test', () => {
  render(<YourComponent />);
  
  // Print entire DOM
  screen.debug();
  
  // Print specific element
  screen.debug(screen.getByRole('button'));
});
```

### Check Which Queries Match

```typescript
// Logs all matching elements
screen.getAllByRole('button').forEach(btn => {
  console.log(btn.textContent);
});
```

### Enable MSW Logging

```typescript
// tests/setup.ts
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
```

---

## Examples from Codebase

See these files for working examples:
- `tests/integration/sticker-collection.test.tsx`
- `tests/integration/contact-form.test.tsx`
- `tests/integration/terms-guard.test.tsx`
- `tests/integration/guardian-linking.test.tsx`

---

## Resources

- [Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [React Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)

---

## Common Errors & Solutions

### Error: "Unable to find element"

**Cause**: Element not yet rendered (async data)  
**Solution**: Use `findBy` queries which wait:
```typescript
expect(await screen.findByText('Data')).toBeInTheDocument();
```

### Error: "Multiple elements found"

**Cause**: Query matches multiple elements  
**Solution**: Be more specific:
```typescript
// Instead of:
screen.getByText('Submit')

// Use:
screen.getByRole('button', { name: 'Submit' })
```

### Error: "MSW handler not working"

**Cause**: URL mismatch  
**Solution**: Check SUPABASE_URL matches exactly:
```typescript
console.log(process.env.VITE_SUPABASE_URL); // Debug URL
```

---

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npm run test:integration sticker-collection

# Watch mode (reruns on changes)
npm run test:integration -- --watch

# With coverage
npm run test:integration -- --coverage
```
