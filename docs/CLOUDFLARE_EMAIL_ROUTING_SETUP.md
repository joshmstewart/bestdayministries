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
    // Log incoming email
    console.log('Received email from:', message.from);
    console.log('To:', message.to);
    console.log('Subject:', message.headers.get('subject'));
    
    try {
      // Get email content
      const rawEmail = await streamToString(message.raw);
      
      // Parse text content
      let textContent = '';
      try {
        // Simple text extraction from raw email
        const bodyMatch = rawEmail.match(/Content-Type: text\/plain[\s\S]*?\n\n([\s\S]*?)(?=\n--|\nContent-Type|$)/);
        if (bodyMatch) {
          textContent = bodyMatch[1].trim();
        } else {
          textContent = rawEmail;
        }
      } catch (parseError) {
        console.error('Error parsing email:', parseError);
        textContent = rawEmail;
      }
      
      // Send to Supabase edge function
      const response = await fetch(
        'https://nbvijawmjkycyweioglk.supabase.co/functions/v1/process-inbound-email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: message.from,
            to: message.to,
            subject: message.headers.get('subject'),
            text: textContent,
            raw: rawEmail,
            headers: {
              subject: message.headers.get('subject'),
              'message-id': message.headers.get('message-id'),
              'in-reply-to': message.headers.get('in-reply-to'),
              references: message.headers.get('references'),
            },
            rawSize: rawEmail.length,
          })
        }
      );
      
      const result = await response.json();
      console.log('Supabase response:', result);
      
      if (!response.ok) {
        throw new Error(`Supabase returned ${response.status}: ${JSON.stringify(result)}`);
      }
      
      console.log('Email processed successfully');
      
    } catch (error) {
      console.error('Error processing email:', error);
      // Don't throw - we don't want Cloudflare to retry
    }
  }
}

async function streamToString(stream) {
  const chunks = [];
  const reader = stream.getReader();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  
  // Concatenate all chunks
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return new TextDecoder().decode(result);
}
```

3. Click **Save and Deploy**

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

### Current Setup
- Edge function is **public** (no auth required)
- This is safe because:
  - Only Cloudflare can call the worker
  - Worker is triggered by Cloudflare's email system
  - No sensitive data exposed

### Optional: Add Worker Secret Verification
If you want extra security, you can add a shared secret:

1. **In Worker Code**, add at the top:
```javascript
const SHARED_SECRET = 'your-random-secret-key-here';
```

2. **Update fetch call** to include secret:
```javascript
headers: {
  'Content-Type': 'application/json',
  'X-Worker-Secret': SHARED_SECRET,
}
```

3. **Update Edge Function** to verify secret:
```typescript
const workerSecret = req.headers.get('x-worker-secret');
if (workerSecret !== Deno.env.get('WORKER_SECRET')) {
  return new Response('Unauthorized', { status: 401 });
}
```

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
