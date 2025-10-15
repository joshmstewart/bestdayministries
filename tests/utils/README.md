# Test Utilities

## Resend Email Testing (Production-Parity)

Utilities for testing email functionality using database verification and direct Resend API testing.

### Overview

This project uses production-parity testing where E2E tests verify the ACTUAL Resend email infrastructure by checking database state instead of relying on external email capture services.

### Setup

No additional configuration needed - tests use the existing Supabase database.

### Usage

```typescript
import {
  waitForSubmission,
  waitForReply,
  simulateInboundEmail,
  verifySubmission,
  verifyReply,
  cleanupTestSubmissions,
} from './utils/resend-test-helper';

test('contact form creates submission', async ({ page }) => {
  // Submit form
  await page.goto('/');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('textarea[name="message"]', 'Test message');
  await page.click('button[type="submit"]');
  
  // Verify in database
  const submission = await waitForSubmission('test@example.com');
  expect(submission.status).toBe('new');
  expect(submission.name).toBe('Test User');
});

test('inbound email reply saves to database', async ({ page }) => {
  // Create submission
  const submission = await waitForSubmission('user@example.com');
  
  // Simulate user replying to email
  await simulateInboundEmail({
    from: 'user@example.com',
    to: 'contact@yourdomain.com',
    subject: `Re: ${submission.subject}`,
    text: 'Thanks for the quick response!',
  });
  
  // Verify reply saved in database
  const reply = await waitForReply(submission.id, { senderType: 'user' });
  expect(reply.message).toContain('Thanks for the quick response!');
});
```

### Available Functions

#### Database Verification

##### `waitForSubmission(email, options?)`
Wait for a contact form submission to appear in the database.

**Parameters:**
- `email` - User email to search for
- `options.timeoutMs` - Maximum wait time (default: 30000)
- `options.pollIntervalMs` - Poll interval (default: 1000)

**Returns:** Submission object with id, email, name, subject, message, status, etc.

##### `waitForReply(submissionId, options?)`
Wait for a reply to appear in the database.

**Parameters:**
- `submissionId` - Submission UUID
- `options.senderType` - Filter by 'admin' or 'user'
- `options.timeoutMs` - Maximum wait time (default: 30000)

**Returns:** Reply object with id, submission_id, sender_type, message, etc.

##### `verifySubmission(email, expected)`
Verify submission data matches expectations.

**Expected fields:**
- `name` - Expected name
- `subject` - Expected subject
- `message` - Expected message
- `status` - Expected status ('new' | 'read')

##### `verifyReply(submissionId, expected)`
Verify reply data matches expectations.

**Expected fields:**
- `senderType` - 'admin' or 'user'
- `messageContains` - String that should appear in message
- `senderEmail` - Expected sender email

#### Email Simulation

##### `simulateInboundEmail(payload)`
Simulate an inbound email by calling the edge function directly.

**Payload:**
- `from` - Sender email
- `to` - Recipient email (e.g., 'contact@yourdomain.com')
- `subject` - Email subject
- `text` - Email body text
- `html` - Email body HTML (optional)

This directly calls the `process-inbound-email` edge function to simulate CloudFlare email routing.

#### Cleanup

##### `cleanupTestSubmissions(emailPattern)`
Delete test submissions matching email pattern.

**Parameters:**
- `emailPattern` - SQL LIKE pattern (e.g., '%test-%@example.com')

**Example:**
```typescript
// Clean up all test emails
await cleanupTestSubmissions('%test-%@example.com');

// Clean up specific test run
await cleanupTestSubmissions(`%${testRunId}%@example.com`);
```

### Test Tags

Use tags to categorize email tests:

- `@email` - General email tests
- `@slow` - Tests that involve multiple steps or long waits

Run email tests only:
```bash
npx playwright test --grep @email
```

### Best Practices

1. **Use unique emails** - Include timestamp or test ID to avoid conflicts
   ```typescript
   const testEmail = `test-${Date.now()}@example.com`;
   ```

2. **Clean up after tests** - Use `test.afterEach` to delete test data
   ```typescript
   test.afterEach(async () => {
     await cleanupTestSubmissions('%test-%@example.com');
   });
   ```

3. **Set appropriate timeouts** - Database queries are fast but allow buffer
   ```typescript
   await waitForSubmission(email, { timeoutMs: 30000 });
   ```

4. **Verify critical fields** - Check that important data is saved correctly
   ```typescript
   expect(submission.email).toBe(testEmail);
   expect(submission.status).toBe('new');
   ```

5. **Test real workflows** - Simulate full user journeys
   ```typescript
   // Submit → Admin Reply → User Reply → Verify Thread
   ```

### Troubleshooting

**Timeout waiting for submission:**
- Check that form validation passed (look for error messages)
- Verify submission was saved (check database manually)
- Increase timeout if needed

**Reply not found in database:**
- Verify edge function was called successfully
- Check that sender email matches submission email
- Review edge function logs for errors

**Test data not cleaned up:**
- Ensure cleanup function uses correct email pattern
- Check for foreign key constraints (delete replies before submissions)

### Complete Documentation

See `docs/EMAIL_TESTING_PRODUCTION_PARITY.md` for complete documentation including:
- Architecture and design decisions
- Test flow diagrams
- CI/CD setup
- Advanced examples
