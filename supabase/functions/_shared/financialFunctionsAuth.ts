import { createClient } from 'npm:@supabase/supabase-js@2';
import { authorizeFinancialRequest } from './financialFunctionAuthorization.ts';

// These six endpoints have internal/admin callers only; there is no self-service
// caller. Ordinary users cannot submit any customer or recipient identifier.
export async function requireFinancialFunctionsAuth(req: Request, corsHeaders: Record<string, string>): Promise<Response | null> {
  const status = await authorizeFinancialRequest(req, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), async token => {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) return null;
    const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.getClaims(token);
    const userId = data?.claims?.sub;
    if (error || typeof userId !== 'string' || data?.claims?.role !== 'authenticated') return null;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: roles, error: roleError } = await admin.from('user_roles').select('role')
      .eq('user_id', userId).in('role', ['admin', 'owner']).limit(2);
    if (roleError) throw roleError;
    return { userId, roles: (roles || []).map(row => row.role) };
  });
  if (status !== 200) {
    console.info(`[financial-auth] denied status=${status}`);
    return new Response(JSON.stringify({ error: status === 401 ? 'Unauthorized' : 'Admin or owner access required' }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // Safe authenticated validation probes cannot start business work.
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json', Allow: 'POST, OPTIONS' },
  });
  return null;
}