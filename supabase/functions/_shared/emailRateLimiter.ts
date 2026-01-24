/**
 * Email Rate Limiter for Resend API
 * 
 * Resend has a rate limit of 2 requests per second.
 * This utility provides consistent rate limiting across all email-sending functions.
 * 
 * Usage:
 * ```typescript
 * import { emailDelay, RESEND_RATE_LIMIT_MS, sendEmailWithRateLimit } from "../_shared/emailRateLimiter.ts";
 * 
 * // Option 1: Simple delay between sends
 * for (const recipient of recipients) {
 *   await emailDelay();
 *   await resend.emails.send({ ... });
 * }
 * 
 * // Option 2: Use the wrapper function
 * const result = await sendEmailWithRateLimit(resend, {
 *   from: "notifications@bestdayministries.org",
 *   to: [recipient],
 *   subject: "Hello",
 *   html: "<p>Hello</p>"
 * });
 * ```
 */

/**
 * Safe delay between Resend API calls (600ms = ~1.6 emails/sec, safely under 2/sec limit)
 * This accounts for network latency variance and provides a safety margin.
 */
export const RESEND_RATE_LIMIT_MS = 600;

/**
 * Minimum delay for batch operations (1 second between batches)
 */
export const RESEND_BATCH_DELAY_MS = 1000;

/**
 * Maximum concurrent emails in a single batch (to avoid memory issues)
 */
export const RESEND_MAX_BATCH_SIZE = 50;

/**
 * Promise-based delay function
 */
export const emailDelay = (ms: number = RESEND_RATE_LIMIT_MS): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Send an email with automatic rate limiting delay AFTER the send.
 * This ensures the next call waits the appropriate time.
 * 
 * @param resend - Resend client instance
 * @param emailOptions - Email options (from, to, subject, html, etc.)
 * @returns Promise with send result
 */
export const sendEmailWithRateLimit = async (
  resend: { emails: { send: (options: EmailSendOptions) => Promise<{ data?: { id: string }, error?: Error }> } },
  emailOptions: EmailSendOptions
): Promise<{ data?: { id: string }, error?: Error }> => {
  const result = await resend.emails.send(emailOptions);
  await emailDelay();
  return result;
};

/**
 * Process emails in rate-limited batches
 * 
 * @param items - Array of items to process
 * @param processor - Function that processes each item and returns a promise
 * @param batchSize - Number of items per batch (default: 50)
 * @param delayMs - Delay between each email within a batch (default: 600ms)
 * @param batchDelayMs - Delay between batches (default: 1000ms)
 */
export const processEmailBatch = async <T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    delayMs?: number;
    batchDelayMs?: number;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<R[]> => {
  const {
    batchSize = RESEND_MAX_BATCH_SIZE,
    delayMs = RESEND_RATE_LIMIT_MS,
    batchDelayMs = RESEND_BATCH_DELAY_MS,
    onProgress
  } = options;

  const results: R[] = [];
  let processed = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process each item in the batch sequentially with rate limiting
    for (const item of batch) {
      const result = await processor(item);
      results.push(result);
      processed++;
      
      if (onProgress) {
        onProgress(processed, items.length);
      }
      
      // Add delay between emails (except for the last one in the entire list)
      if (processed < items.length) {
        await emailDelay(delayMs);
      }
    }
    
    // Add extra delay between batches
    if (i + batchSize < items.length) {
      await emailDelay(batchDelayMs);
    }
  }

  return results;
};

/**
 * Email send options type (compatible with Resend)
 */
interface EmailSendOptions {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  headers?: Record<string, string>;
}

/**
 * Log email rate limiting info for debugging
 */
export const logRateLimitInfo = (functionName: string, totalEmails: number) => {
  const estimatedTimeSeconds = Math.ceil(totalEmails * (RESEND_RATE_LIMIT_MS / 1000));
  const estimatedTimeMinutes = Math.ceil(estimatedTimeSeconds / 60);
  
  console.log(`[${functionName}] Processing ${totalEmails} emails with rate limiting`);
  console.log(`[${functionName}] Estimated time: ${estimatedTimeSeconds}s (~${estimatedTimeMinutes} min)`);
  console.log(`[${functionName}] Rate: ~${Math.floor(1000 / RESEND_RATE_LIMIT_MS)} emails/sec`);
};
