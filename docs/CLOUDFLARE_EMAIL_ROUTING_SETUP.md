# Cloudflare Email Routing Setup Guide

## Overview

This guide shows you how to set up **free** email routing using Cloudflare to enable two-way email conversations in your admin dashboard. Users can reply to your emails, and their responses will appear automatically in your UI.

## Why Cloudflare Email Routing?

✅ **Free** - No cost for unlimited email routing  
✅ **Immediate** - Works right away (no waitlist)  
✅ **Reliable** - Cloudflare's global infrastructure  
✅ **Simple** - Automatic MX record setup  

## Prerequisites

- Your domain (`bestdayministries.org`) must be added to Cloudflare
- Cloudflare nameservers must be active at your registrar (GoDaddy)

---

## Step 1: Add Domain to Cloudflare (if not already added)

### 1.1 Create Cloudflare Account
1. Go to https://dash.cloudflare.com
2. Sign up for a free account
3. Verify your email

### 1.2 Add Your Domain
1. Click "Add a Site"
2. Enter: `bestdayministries.org`
3. Select the **Free** plan
4. Click "Continue"

### 1.3 Update Nameservers at GoDaddy
1. Cloudflare will show you 2 nameservers like:
   ```
   adam.ns.cloudflare.com
   liv.ns.cloudflare.com
   ```
2. Go to GoDaddy → Domains → `bestdayministries.org` → DNS
3. Click "Change Nameservers"
4. Select "I'll use my own nameservers"
5. Enter both Cloudflare nameservers
6. Save changes
7. Wait 5-10 minutes for verification

### 1.4 Import DNS Records
1. Cloudflare will automatically scan and import your existing DNS records (including Resend SPF/DKIM)
2. Review the records to ensure everything imported correctly
3. Click "Continue" to finish setup

---

## Step 2: Enable Email Routing

### 2.1 Navigate to Email Settings
1. In Cloudflare Dashboard, select your domain
2. Click **Email** in the left sidebar
3. Click **Email Routing**
4. Click **Get Started**

### 2.2 Automatic MX Configuration
Cloudflare will automatically:
- Add MX records to your DNS
- Configure email routing infrastructure
- No manual DNS changes needed!

### 2.3 Verify Email Routing is Active
You should see:
- Status: "Active" with green checkmark
- MX records listed in DNS settings
- Ready to create routes

---

## Step 3: Create Email Worker

### 3.1 Create the Worker
1. Go to **Workers & Pages** in Cloudflare Dashboard
2. Click **Create Application**
3. Click **Create Worker**
4. Name it: `email-to-supabase`
5. Click **Deploy**

### 3.2 Add Worker Code
1. Click **Edit Code**
2. Replace all code with:

```javascript
export default {
  async email(message, env, ctx) {
    console.log('Received email to:', message.to);
    
    const WEBHOOK_SECRET = env.WEBHOOK_SECRET; // Environment variable
    const EDGE_FUNCTION_URL = 'https://nbvijawmjkycyweioglk.supabase.co/functions/v1/process-inbound-email';
    
    try {
      // Extract email details
      const from = message.from;
      const to = message.to;
      const subject = message.headers.get('subject') || '';
      
      // Read email content
      const reader = message.raw.getReader();
      const chunks = [];
      let done = false;
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          chunks.push(value);
        }
      }
      
      // Convert to string
      const rawEmail = new TextDecoder().decode(
        new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []))
      );
      
      console.log('Forwarding to Supabase edge function...');
      
      // Forward to Supabase edge function with webhook secret
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': WEBHOOK_SECRET, // Add secret header
        },
        body: JSON.stringify({
          from,
          to,
          subject,
          raw: rawEmail,
          headers: Object.fromEntries(message.headers),
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge function error:', errorText);
        throw new Error(`Edge function returned ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Successfully processed:', result);
      
    } catch (error) {
      console.error('Error processing email:', error);
      // Don't throw - this would cause the email to bounce
      // Instead, log the error and accept the email
    }
  }
}
```

3. Click **Save and Deploy**

### 3.3 Add Environment Variable (IMPORTANT!)

Before testing, you MUST add the webhook secret:

1. In the Worker editor, click **Settings** tab
2. Go to **Variables and Secrets**
3. Under **Environment Variables**, click **Add variable**
4. Configure:
   - **Variable name**: `WEBHOOK_SECRET`
   - **Value**: `wh_email_cf_9k2mxP7nQ4vL8zBj3wY6tR5sC1hN`
   - Click **"Encrypt"** to make it a secret
5. Click **Deploy**

**CRITICAL:** This value MUST match the `CLOUDFLARE_EMAIL_WEBHOOK_SECRET` in Lovable.

---

## Step 4: Create Email Route

### 4.1 Add Route
1. Go back to **Email → Email Routing**
2. Click **Routing Rules**
3. Click **Create address**

### 4.2 Configure Route
1. **Email address**: `contact@bestdayministries.org`
2. **Action**: Select **Send to a Worker**
3. **Worker**: Select `email-to-supabase`
4. Click **Save**

---

## Step 5: Test the Setup

### 5.1 Submit Contact Form
1. Go to your website homepage
2. Fill out the contact form
3. Click submit
4. Check Admin Dashboard → Contact tab to see the submission

### 5.2 Send Admin Reply
1. In Admin Dashboard, click "Reply" on the submission
2. Type a message
3. Click "Send Reply"
4. User receives email in their inbox

### 5.3 User Replies
1. User opens your email
2. User clicks "Reply" in their email client
3. User types response and sends
4. **Within seconds**, the reply appears in your Admin Dashboard under the same conversation thread!
5. Admin sees notification badge increment in header and Contact tab
6. Red dot indicator appears on the submission row
7. "Reply" button shows badge with count of unread replies
8. Opening reply dialog clears all related notifications

---

## Troubleshooting

### Email Route Not Working

**Check Worker Logs:**
1. Go to Workers & Pages → `email-to-supabase`
2. Click **Logs** tab
3. Send a test email to `contact@bestdayministries.org`
4. Look for errors in logs

**Common Issues:**
- Worker not deployed: Redeploy the worker
- Syntax error in worker code: Check for typos
- Edge function URL wrong: Verify the URL in worker code matches your project

### MX Records Not Propagating

**Check DNS:**
1. Go to https://dnschecker.org
2. Enter: `bestdayministries.org`
3. Type: `MX`
4. Verify Cloudflare MX records appear globally

**Wait Time:**
- DNS propagation can take 5-10 minutes
- In rare cases, up to 24 hours

### Replies Not Appearing in Database

**Check Edge Function Logs:**
1. Open Lovable project
2. View Backend (button in chat)
3. Edge Functions → `process-inbound-email` → Logs
4. Look for errors when test email arrives

**Check Database:**
```sql
-- Check if reply was saved
SELECT * FROM contact_form_replies 
ORDER BY created_at DESC 
LIMIT 5;
```

### Webhook Secret Mismatch

**Symptoms:**
- Worker logs show: "Edge function returned 401"
- Edge function logs show: "Webhook secret verification failed"

**Solutions:**
1. Verify the secrets match exactly:
   - **Cloudflare**: Worker Settings → Variables → `WEBHOOK_SECRET`
   - **Lovable**: Should be set as `CLOUDFLARE_EMAIL_WEBHOOK_SECRET`
   - **Value**: `wh_email_cf_9k2mxP7nQ4vL8zBj3wY6tR5sC1hN`

2. Re-deploy the Worker after updating environment variables:
   - Go to Worker → Settings → Variables
   - Click **Deploy** after any changes

3. Test with curl to isolate the issue:
```bash
curl -X POST https://nbvijawmjkycyweioglk.supabase.co/functions/v1/process-inbound-email \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: wh_email_cf_9k2mxP7nQ4vL8zBj3wY6tR5sC1hN" \
  -d '{"from":"test@example.com","to":"contact@bestdayministries.org","subject":"Test","text":"Test message"}'
```

Expected response: `{"success":true}` or `{"success":false,"message":"No matching submission found"}`
If you get `{"error":"Unauthorized"}`, the secret doesn't match.

---

## Email Flow Diagram

```
User sends email
    ↓
Cloudflare Email Routing (MX records)
    ↓
Email Worker (email-to-supabase)
    ↓
Parse email content
    ↓
Forward to Edge Function
    ↓
Save to contact_form_replies table
    ↓
Admin sees reply in UI
```

---

## Security Considerations

### Webhook Secret Protection ✅

This setup now uses a shared secret to ensure only your Cloudflare Worker can call the edge function:

1. **Cloudflare Worker** sends `X-Webhook-Secret` header with each request
2. **Edge Function** verifies the secret matches `CLOUDFLARE_EMAIL_WEBHOOK_SECRET`
3. **Unauthorized requests** receive a 401 error

### How It Works

**Worker Side:**
```javascript
headers: {
  'Content-Type': 'application/json',
  'X-Webhook-Secret': WEBHOOK_SECRET, // From environment variable
}
```

**Edge Function Side:**
```typescript
const webhookSecret = Deno.env.get('CLOUDFLARE_EMAIL_WEBHOOK_SECRET');
const providedSecret = req.headers.get('x-webhook-secret');

if (!webhookSecret || providedSecret !== webhookSecret) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

### Why This Is Secure

- ✅ **Prevents spam**: Random bots can't POST fake emails to your edge function
- ✅ **Validates source**: Only requests from your Cloudflare Worker are accepted
- ✅ **Secret encryption**: The secret is encrypted in both Cloudflare and Lovable
- ✅ **Header-based auth**: Simple and reliable authentication method

### Secret Management

- **Cloudflare Worker**: Environment variable `WEBHOOK_SECRET` (encrypted)
- **Lovable Cloud**: Environment variable `CLOUDFLARE_EMAIL_WEBHOOK_SECRET` (encrypted)
- **Value**: `wh_email_cf_9k2mxP7nQ4vL8zBj3wY6tR5sC1hN`

**Important:** These values MUST match exactly for the system to work.

---

## Cost Breakdown

| Service | Cost |
|---------|------|
| Cloudflare Email Routing | **FREE** (unlimited) |
| Cloudflare Workers | **FREE** (100k requests/day) |
| Resend Email Sending | **FREE** (100 emails/day) |
| **Total** | **$0/month** 🎉 |

---

## Next Steps

Once setup is complete:
1. Test the full round-trip flow
2. Monitor worker logs for any errors
3. Consider adding email templates for prettier replies
4. Set up email notifications for admin when replies arrive

---

## Support

**Need help?**
- Check Cloudflare Email Routing docs: https://developers.cloudflare.com/email-routing/
- Check Worker logs for errors
- Verify DNS propagation with dnschecker.org
- Contact support with specific error messages
