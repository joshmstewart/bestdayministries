import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { logProviderVerification, verifyGitHubTestSecret, verifyProviderSignature } from '../../supabase/functions/_shared/webhookVerification';

describe('GitHub test webhook header enforcement', () => {
  const request = (headers = {}) => new Request('https://example.invalid', { headers });
  it('rejects unsigned requests', async () => {
    expect(await verifyGitHubTestSecret(request(), 'test-fixture-only')).toBe(false);
  });
  it('rejects wrong secrets regardless of length', async () => {
    expect(await verifyGitHubTestSecret(request({ 'x-test-functions-secret': 'wrong' }), 'test-fixture-only')).toBe(false);
  });
  it('rejects missing configuration', async () => {
    expect(await verifyGitHubTestSecret(request({ 'x-test-functions-secret': 'test-fixture-only' }), undefined)).toBe(false);
  });
  it('does not permit an admin JWT instead of the header', async () => {
    expect(await verifyGitHubTestSecret(request({ Authorization: 'Bearer admin-fixture' }), 'test-fixture-only')).toBe(false);
  });
  it('accepts the correct header', async () => {
    expect(await verifyGitHubTestSecret(request({ 'x-test-functions-secret': 'test-fixture-only' }), 'test-fixture-only')).toBe(true);
  });
});

for (const provider of ['printify', 'sentry'] as const) {
  describe(`${provider} raw-body HMAC`, () => {
    const body = new TextEncoder().encode('{ "event": "harmless-é" }');
    const secret = 'test-fixture-only';
    const digest = createHmac('sha256', secret).update(body).digest('hex');
    const signature = provider === 'printify' ? `sha256=${digest}` : digest;
    it('accepts the official signature format', () => {
      expect(verifyProviderSignature(provider, body, signature, secret)).toBe('pass');
    });
    it('rejects altered raw bytes', () => {
      expect(verifyProviderSignature(provider, new TextEncoder().encode('{"event":"harmless-é"}'), signature, secret)).toBe('fail');
    });
    it('reports missing configuration', () => {
      expect(verifyProviderSignature(provider, body, signature, undefined)).toBe('missing-config');
    });
    it('rejects missing signatures', () => {
      expect(verifyProviderSignature(provider, body, null, secret)).toBe('fail');
    });
    it('rejects malformed signatures', () => {
      expect(verifyProviderSignature(provider, body, 'invalid', secret)).toBe('fail');
    });
    it('rejects a mismatched signing secret', () => {
      expect(verifyProviderSignature(provider, body, signature, 'wrong-fixture')).toBe('fail');
    });
    it('logs only fixed provider/mode/outcome labels', () => {
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
      try {
        logProviderVerification(provider, 'pass');
        expect(spy).toHaveBeenCalledExactlyOnceWith(`[webhook-verification] provider=${provider} mode=log-only outcome=pass`);
      } finally { spy.mockRestore(); }
    });
  });
}