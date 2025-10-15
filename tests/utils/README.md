# Test Utilities

# Test Utilities

## Resend Email Testing (Production-Parity)

Utilities for testing email functionality using database verification and direct Resend API testing.

### Setup

All tests use the existing Supabase database - no additional configuration needed.

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
  await submitContactForm(page, { email: 'test@example.com' });
  
  // Verify in database
  const submission = await waitForSubmission('test@example.com');
  expect(submission.status).toBe('new');
});
```

### Available Functions

#### Database Verification
- `waitForSubmission(email)` - Wait for submission to appear in DB
- `waitForReply(submissionId)` - Wait for reply to appear in DB
- `verifySubmission(email, expected)` - Verify submission data
- `verifyReply(submissionId, expected)` - Verify reply data

#### Email Simulation
- `simulateInboundEmail(payload)` - Simulate inbound email via edge function

#### Cleanup
- `cleanupTestSubmissions(emailPattern)` - Clean up test data

See `EMAIL_TESTING_PRODUCTION_PARITY.md` for complete documentation.
2. Create a testing inbox (Sandboxes → My Sandbox)
3. Get your API credentials from the API tab
4. Add secrets:
   - `MAILTRAP_API_TOKEN` - Your API token
   - `MAILTRAP_INBOX_ID` - Your inbox ID (e.g., 4099857)
   - `MAILTRAP_ACCOUNT_ID` - Your account ID (default: 3242583)

### Usage

```typescript
import {
  waitForEmail,
  verifyEmailContent,
  clearInbox,
  extractLinks,
} from './utils/mailtrap-helper';

// Clear inbox before test
await clearInbox();

// Trigger email (e.g., submit contact form)
await submitContactForm(page);

// Wait for email to arrive
const email = await waitForEmail({
  to: 'test@example.com',
  subject: 'Contact Form',
});

// Verify email content
verifyEmailContent(email, {
  subject: 'Thank you for contacting us',
  htmlContains: ['We received your message', 'Reply within 24 hours'],
  linksContain: ['/contact'],
});

// Extract all links from email
const links = extractLinks(email);
expect(links).toContain('https://yoursite.com/contact');
```

### Available Functions

#### `isMailtrapConfigured()`
Check if Mailtrap environment variables are set.

#### `waitForEmail(criteria, options)`
Wait for an email matching criteria to arrive.

**Criteria:**
- `to` - Recipient email address
- `subject` - Subject line (partial match)
- `from` - Sender email address

**Options:**
- `timeoutMs` - Maximum wait time (default: 30000)
- `pollIntervalMs` - Poll interval (default: 2000)

#### `fetchAllMessages()`
Fetch all messages from the inbox.

#### `fetchEmail(emailId)`
Fetch a specific email with full body content.

#### `findLatestEmail(criteria)`
Find the most recent email matching criteria.

#### `clearInbox()`
Delete all emails from the inbox.

#### `verifyEmailContent(email, expectations)`
Verify email matches expectations.

**Expectations:**
- `subject` - Expected subject (string or regex)
- `toEmail` - Expected recipient
- `fromEmail` - Expected sender
- `htmlContains` - Array of strings that should appear in HTML
- `textContains` - Array of strings that should appear in plain text
- `linksContain` - Array of URL fragments that should be in links

#### `extractLinks(email)`
Extract all href links from email HTML.

### Test Tags

Use tags to categorize email tests:

- `@email` - General email tests
- `@slow` - Tests that involve multiple steps or long waits

Run email tests only:
```bash
npx playwright test --grep @email
```

### CI/CD Setup

Add Mailtrap secrets to GitHub Actions:

1. Go to repository Settings → Secrets and variables → Actions
2. Add secrets:
   - `MAILTRAP_API_TOKEN`
   - `MAILTRAP_INBOX_ID`
   - `MAILTRAP_ACCOUNT_ID`

The tests will automatically use these in CI pipelines.

### Best Practices

1. **Clear inbox before each test** - Prevents false positives from old emails
2. **Use specific criteria** - Match on subject + recipient for accuracy
3. **Set appropriate timeouts** - Email delivery can take 5-15 seconds
4. **Verify critical content** - Check links, names, amounts are correct
5. **Don't test in parallel** - Email tests should run sequentially

### Troubleshooting

**Timeout waiting for email:**
- Check that `MAILTRAP_API_TOKEN` and `MAILTRAP_INBOX_ID` are set
- Verify inbox ID is correct (check Mailtrap dashboard)
- Increase `timeoutMs` if email delivery is slow
- Check that email is actually being sent (review edge function logs)

**API errors:**
- Verify API token has correct permissions
- Check account ID is correct (default: 3242583)
- Ensure you're not hitting rate limits (100 emails/month on free tier)

**Wrong inbox:**
- Verify `MAILTRAP_INBOX_ID` matches your sandbox inbox
- Clear old test emails from inbox

### Examples

See `tests/e2e/email-contact-form.spec.ts` for complete examples.
