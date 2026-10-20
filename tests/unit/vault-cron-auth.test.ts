import { describe, expect, it, vi } from 'vitest';
import { verifyVaultCronHeader } from '../../supabase/functions/_shared/vaultCronAuth';

describe('Vault cron authorization', () => {
  it('denies missing headers without a database call', async () => {
    const verify = vi.fn();
    expect(await verifyVaultCronHeader(null, 'digest_cron_secret', verify)).toBe(false);
    expect(verify).not.toHaveBeenCalled();
  });
  it('accepts only a true Vault comparison for the digest secret', async () => {
    const verify = vi.fn(async () => ({ data: true, error: null }));
    expect(await verifyVaultCronHeader('unit-fixture', 'digest_cron_secret', verify)).toBe(true);
    expect(verify).toHaveBeenCalledWith('digest_cron_secret', 'unit-fixture');
  });
  it('uses a separate reconciliation credential', async () => {
    const verify = vi.fn(async () => ({ data: true, error: null }));
    expect(await verifyVaultCronHeader('unit-fixture', 'donation_reconcile_cron_secret', verify)).toBe(true);
    expect(verify).toHaveBeenCalledWith('donation_reconcile_cron_secret', 'unit-fixture');
  });
  it('denies a rejected old credential', async () => {
    expect(await verifyVaultCronHeader('revoked-fixture', 'digest_cron_secret', async () => ({ data: false, error: null }))).toBe(false);
  });
  it('fails closed on RPC errors', async () => {
    expect(await verifyVaultCronHeader('unit-fixture', 'digest_cron_secret', async () => ({ data: true, error: new Error('unavailable') }))).toBe(false);
  });
  it('fails closed on thrown errors', async () => {
    expect(await verifyVaultCronHeader('unit-fixture', 'digest_cron_secret', async () => { throw new Error('unavailable'); })).toBe(false);
  });
  it('denies a missing Vault value', async () => {
    expect(await verifyVaultCronHeader('unit-fixture', 'digest_cron_secret', async () => ({ data: null, error: null }))).toBe(false);
  });
});