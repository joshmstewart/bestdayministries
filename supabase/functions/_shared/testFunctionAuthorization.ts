import { createHash, timingSafeEqual } from 'node:crypto';

export interface TestAuthorization {
  allowed: boolean;
  userId: string | null;
}

export async function authorizeTestRequest(
  request: Request,
  secret: string | undefined,
  verifyAdmin: (token: string) => Promise<string | null>,
): Promise<TestAuthorization> {
  const supplied = request.headers.get('x-test-functions-secret');
  // Compare fixed-size digests, including mismatched-length inputs, without logging either value.
  if (secret && supplied && timingSafeEqual(
    createHash('sha256').update(secret).digest(),
    createHash('sha256').update(supplied).digest(),
  )) return { allowed: true, userId: null };

  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { allowed: false, userId: null };
  try {
    const userId = await verifyAdmin(token);
    return { allowed: Boolean(userId), userId };
  } catch {
    return { allowed: false, userId: null };
  }
}