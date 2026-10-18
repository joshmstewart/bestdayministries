import { createHmac, timingSafeEqual } from 'node:crypto';
import { authorizeTestRequest } from './testFunctionAuthorization.ts';

export type SignatureOutcome = 'pass' | 'fail' | 'missing-config';

// Workflow receiver is secret-only: even an admin JWT cannot bypass this header.
export async function verifyGitHubTestSecret(request: Request, secret: string | undefined) {
  return (await authorizeTestRequest(request, secret, async () => null)).allowed;
}

export function verifyProviderSignature(
  provider: 'printify' | 'sentry',
  body: Uint8Array,
  signature: string | null,
  secret: string | undefined,
): SignatureOutcome {
  if (!secret) return 'missing-config';
  const pattern = provider === 'printify' ? /^sha256=([a-f0-9]{64})$/i : /^([a-f0-9]{64})$/i;
  const hex = signature?.match(pattern)?.[1];
  if (!hex) return 'fail';
  const expected = createHmac('sha256', secret).update(body).digest();
  const supplied = Uint8Array.from(hex.match(/../g) ?? [], byte => parseInt(byte, 16));
  return timingSafeEqual(expected, supplied) ? 'pass' : 'fail';
}

export function logProviderVerification(provider: 'printify' | 'sentry', outcome: SignatureOutcome) {
  // Fixed labels only: never request bodies, signatures, secrets, or event fields.
  console.info(`[webhook-verification] provider=${provider} mode=log-only outcome=${outcome}`);
}