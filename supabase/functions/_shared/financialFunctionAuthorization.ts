import { createHash, timingSafeEqual } from 'node:crypto';

export type FinancialIdentity = { userId: string; roles: string[] };

// Do not trust decoded JWT roles or caller-supplied user/customer/receipt IDs.
export async function authorizeFinancialRequest(
  request: Request,
  serviceKey: string | undefined,
  verifyIdentity: (token: string) => Promise<FinancialIdentity | null>,
): Promise<200 | 401 | 403> {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return 401;
  if (serviceKey && timingSafeEqual(
    createHash('sha256').update(token).digest(),
    createHash('sha256').update(serviceKey).digest(),
  )) return 200;
  try {
    const identity = await verifyIdentity(token);
    if (!identity) return 401;
    return identity.roles.some(role => role === 'admin' || role === 'owner') ? 200 : 403;
  } catch {
    return 401;
  }
}