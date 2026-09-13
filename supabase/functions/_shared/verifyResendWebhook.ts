import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

export interface WebhookVerificationResult {
  verified: boolean;
  reason?: string;
}

/**
 * Verify a Resend/Svix webhook signature.
 *
 * The Resend webhook secret starts with `whsec_`. The remainder is base64-encoded
 * and is the HMAC-SHA-256 key. The signed payload is:
 *   `${svix-id}.${svix-timestamp}.${rawBody}`
 *
 * Returns { verified: true } when the signature is valid, timestamp is within
 * tolerance, and a secret is configured. When no secret is configured, returns
 * { verified: true } but logs a warning so the endpoint continues to accept real
 * traffic until the secret is added.
 */
export async function verifyResendWebhook(
  req: Request,
  rawBody: string,
  secretEnvName = "RESEND_WEBHOOK_SECRET",
  toleranceSeconds = 300
): Promise<WebhookVerificationResult> {
  const secret = Deno.env.get(secretEnvName);

  if (!secret) {
    console.warn(
      `[verifyResendWebhook] ${secretEnvName} is not configured. Webhook is unprotected against forged events. Add the signing secret from your Resend dashboard to enable verification.`
    );
    return { verified: true };
  }

  // Resend/Svix secrets always start with whsec_. If a non-prefixed secret is
  // present (e.g. a placeholder or test value), treat it as unconfigured so
  // legitimate traffic is not accidentally rejected.
  if (!secret.startsWith("whsec_")) {
    console.warn(
      `[verifyResendWebhook] ${secretEnvName} is configured but does not start with "whsec_". It will be ignored until replaced with the real Resend signing secret.`
    );
    return { verified: true };
  }

  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signatureHeader = req.headers.get("svix-signature");

  if (!id || !timestamp || !signatureHeader) {
    return { verified: false, reason: "Missing svix-id, svix-timestamp, or svix-signature headers" };
  }

  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts)) {
    return { verified: false, reason: "Invalid svix-timestamp" };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - ts) > toleranceSeconds) {
    return {
      verified: false,
      reason: `Webhook timestamp ${ts} is outside ${toleranceSeconds}s tolerance`,
    };
  }

  let key: Uint8Array;
  try {
    const keyString = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    key = decodeBase64(keyString);
  } catch (e) {
    return { verified: false, reason: `Invalid webhook secret format: ${(e as Error).message}` };
  }

  const signedPayload = `${id}.${timestamp}.${rawBody}`;
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(signedPayload)
  );
  const expectedSignature = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const signatures = signatureHeader.split(/\s+/).map((s) => s.replace(/^v1,/, ""));
  if (!signatures.includes(expectedSignature)) {
    return { verified: false, reason: "Signature mismatch" };
  }

  return { verified: true };
}
