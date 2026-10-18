import { createClient } from 'npm:@supabase/supabase-js@2';
import { authorizeTestRequest } from './testFunctionAuthorization.ts';

export async function requireTestFunctionsAuth(req: Request, corsHeaders: Record<string, string>) {
  const authorization = await authorizeTestRequest(req, Deno.env.get('TEST_FUNCTIONS_SECRET'), async (token) => {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) return null;
    const userClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await userClient.auth.getClaims(token);
    const userId = data?.claims?.sub;
    if (error || typeof userId !== 'string' || data?.claims?.role !== 'authenticated') return null;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: roles, error: roleError } = await admin.from('user_roles')
      .select('role').eq('user_id', userId).in('role', ['admin', 'owner']).limit(1);
    return !roleError && roles?.length ? userId : null;
  });
  if (!authorization.allowed) {
    console.info('test-functions authorization denied');
    return { ...authorization, response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }) };
  }
  return { ...authorization, response: null };
}

// Internal callers forward the original verified admin JWT or shared header, never a service-role bypass.
export function testFunctionsForwardHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authorization = req.headers.get('Authorization');
  const secret = req.headers.get('x-test-functions-secret');
  if (authorization) headers.Authorization = authorization;
  if (secret) headers['x-test-functions-secret'] = secret;
  const apikey = Deno.env.get('SUPABASE_ANON_KEY');
  if (apikey) headers.apikey = apikey;
  return headers;
}