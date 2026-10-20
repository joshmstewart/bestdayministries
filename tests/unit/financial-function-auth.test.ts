// Additive security regressions, not an E2E conversion.
import { describe, it, expect, vi } from 'vitest';
import { authorizeFinancialRequest } from '../../supabase/functions/_shared/financialFunctionAuthorization';

const request = (token?: string) => new Request('https://example.invalid', {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});
describe('receipt, summary and Stripe diagnostic authorization', () => {
  it('rejects missing auth before identity work', async () => {
    const verify = vi.fn();
    expect(await authorizeFinancialRequest(request(), 'server-key', verify)).toBe(401);
    expect(verify).not.toHaveBeenCalled();
  });
  it('accepts exactly the configured service key for internal receipts', async () => {
    const verify = vi.fn();
    expect(await authorizeFinancialRequest(request('server-key'), 'server-key', verify)).toBe(200);
    expect(verify).not.toHaveBeenCalled();
  });
  it('rejects an incorrect service key', async () => {
    expect(await authorizeFinancialRequest(request('wrong'), 'server-key', async () => null)).toBe(401);
  });
  it('does not accept arbitrary tokens when service configuration is missing', async () => {
    expect(await authorizeFinancialRequest(request('server-key'), undefined, async () => null)).toBe(401);
  });
  for (const role of ['admin', 'owner']) it(`accepts verified ${role} for existing admin callers`, async () => {
    expect(await authorizeFinancialRequest(request('valid'), 'server-key', async () => ({ userId: 'u', roles: [role] }))).toBe(200);
  });
  for (const role of ['supporter', 'bestie', 'caregiver', 'moderator', 'vendor']) it(`denies ${role} all customer/recipient lookups`, async () => {
    expect(await authorizeFinancialRequest(request('valid'), 'server-key', async () => ({ userId: 'u', roles: [role] }))).toBe(403);
  });
  it('fails closed on auth/role lookup errors', async () => {
    expect(await authorizeFinancialRequest(request('valid'), 'server-key', async () => { throw new Error('unavailable'); })).toBe(401);
  });
});