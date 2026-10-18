/** Server-side only: never pass this header into page.evaluate, browser storage, or traces. */
export function testFunctionsHeaders(): Record<string, string> {
  const secret = process.env.TEST_FUNCTIONS_SECRET;
  if (!secret) throw new Error('TEST_FUNCTIONS_SECRET must be configured for test-function calls');
  return { 'x-test-functions-secret': secret };
}

export async function invokeTestFunction(name: string, body: unknown) {
  const url = process.env.VITE_SUPABASE_URL;
  const apikey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !apikey) throw new Error('Missing test backend configuration');
  const response = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST', headers: { ...testFunctionsHeaders(), apikey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) return { data: null, error: { message: `Test function rejected request (${response.status})` } };
  return { data: result, error: null };
}