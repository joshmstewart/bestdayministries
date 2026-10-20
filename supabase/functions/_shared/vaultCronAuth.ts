type CronSecretVerifier = (
  name: string,
  provided: string,
) => Promise<{ data: unknown; error: unknown }>;

// Vault plaintext never leaves PostgreSQL: the RPC returns only a boolean.
export async function verifyVaultCronHeader(
  provided: string | null,
  name: 'digest_cron_secret' | 'donation_reconcile_cron_secret',
  verify: CronSecretVerifier,
): Promise<boolean> {
  if (!provided) return false;
  try {
    const { data, error } = await verify(name, provided);
    return !error && data === true;
  } catch {
    return false;
  }
}