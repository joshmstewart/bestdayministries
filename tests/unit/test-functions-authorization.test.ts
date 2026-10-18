import { describe, expect, it, vi } from 'vitest';
import { authorizeTestRequest } from '../../supabase/functions/_shared/testFunctionAuthorization';

describe('test function authorization', () => {
  const request = (headers: Record<string, string> = {}) => new Request('http://localhost/test', { method: 'POST', headers });
  it('denies anonymous requests', async () => {
    expect((await authorizeTestRequest(request(), undefined, async () => null)).allowed).toBe(false);
  });
  it('denies supporter JWTs', async () => {
    const verify = vi.fn(async () => null);
    expect((await authorizeTestRequest(request({ Authorization: 'Bearer supporter-fixture' }), undefined, verify)).allowed).toBe(false);
    expect(verify).toHaveBeenCalledWith('supporter-fixture');
  });
  it('denies an empty configured secret and empty supplied header', async () => {
    expect((await authorizeTestRequest(request({ 'x-test-functions-secret': '' }), '', async () => null)).allowed).toBe(false);
  });
  it('denies a wrong shared secret of a different length', async () => {
    expect((await authorizeTestRequest(request({ 'x-test-functions-secret': 'wrong-fixture' }), 'unit-fixture-only', async () => null)).allowed).toBe(false);
  });
  it('accepts the matching shared header without requiring a user JWT', async () => {
    const verify = vi.fn(async () => null);
    expect((await authorizeTestRequest(request({ 'x-test-functions-secret': 'unit-fixture-only' }), 'unit-fixture-only', verify)).allowed).toBe(true);
    expect(verify).not.toHaveBeenCalled();
  });
  for (const role of ['admin', 'owner']) {
    it(`accepts a verified ${role} JWT`, async () => {
      const result = await authorizeTestRequest(request({ Authorization: `Bearer ${role}-fixture` }), undefined, async () => 'verified-admin-id');
      expect(result).toEqual({ allowed: true, userId: 'verified-admin-id' });
    });
  }
  it('fails closed when token verification fails', async () => {
    expect((await authorizeTestRequest(request({ Authorization: 'Bearer invalid-fixture' }), undefined, async () => { throw new Error('invalid'); })).allowed).toBe(false);
  });
});