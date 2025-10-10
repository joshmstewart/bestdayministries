# Sentry Error Logging System

## Overview
Automatic error logging from Sentry to the admin dashboard via webhooks.

## Database
- **Table**: `error_logs`
- **Access**: Admins only (RLS policies)
- **Retention**: Manual (no auto-cleanup)

## Components
1. **Edge Function**: `sentry-webhook` - Receives Sentry webhooks and stores errors
2. **Admin UI**: ErrorLogsManager component in Admin > Logs > Errors tab
3. **Data Flow**: Sentry → Webhook → Database → Admin Dashboard

## Sentry Webhook Configuration

### Webhook URL
```
https://nbvijawmjkycyweioglk.supabase.co/functions/v1/sentry-webhook
```

### Setup Steps in Sentry Dashboard

1. **Go to Settings > Integrations > Internal Integrations**
2. **Create New Internal Integration**
   - Name: "Backend Error Logger"
   - Webhook URL: `https://nbvijawmjkycyweioglk.supabase.co/functions/v1/sentry-webhook`
   - Permissions: Read access to Issues & Events
   - Check "Alert Rule Action"

3. **Create Alert Rule**
   - Go to Alerts > Create Alert Rule
   - Select "Issues"
   - When: "A new issue is created"
   - Then: "Send a notification via [Your Internal Integration]"

### Webhook Payload
The webhook receives Sentry events with:
- Error message and type
- Stack trace
- User information (ID, email)
- Browser context
- URL where error occurred
- Sentry event ID
- Environment and severity

## Error Log Fields
- `error_message`: Main error description
- `error_type`: Error class/type
- `stack_trace`: Full stack trace (JSON)
- `user_id`: UUID if user was authenticated
- `user_email`: User's email
- `browser_info`: Browser/device context
- `url`: Page where error occurred
- `sentry_event_id`: Link back to Sentry
- `severity`: error, fatal, warning, info
- `environment`: production, development, etc.

## Admin Dashboard Features
- **Search**: Filter by error message, type, or user email
- **Severity Filter**: All, Error, Fatal, Warning, Info
- **Details**: Expandable stack traces
- **Timestamps**: Relative time display
- **User Context**: Email and URL tracking
- **Sentry Link**: Event ID for cross-reference

## Security
- Webhook is public (no JWT verification required)
- All inserts use service role key
- RLS prevents non-admins from viewing errors
- No PII stored beyond email/user ID

## Notes
- Errors are stored indefinitely (manual cleanup required)
- Only last 100 errors shown by default
- Stack traces stored as JSON strings
- Sentry event ID links back to full details
