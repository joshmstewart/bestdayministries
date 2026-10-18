import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const source = readFileSync('supabase/functions/create-user/index.ts', 'utf8')
  .replace(/^import .*;\r?\n/gm, '');

async function invoke(requestedRole: string, callerRole = 'owner', assignmentFails = false) {
  const roles = [{ user_id: '22222222-2222-4222-8222-222222222222', role: 'supporter', created_by: null as string | null }];
  const filters: Record<string, string> = {};
  let update: { role: string; created_by: string } | undefined;
  let created = false;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: '11111111-1111-4111-8111-111111111111' } }, error: null }),
      admin: { createUser: async () => { created = true; return { data: { user: { id: roles[0].user_id } }, error: null }; } } },
    rpc: async () => ({ data: true }),
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: (key: string, value: string) => { filters[key] = value; return chain; },
        update: (value: { role: string; created_by: string }) => { update = value; return chain; },
        insert: async () => ({ error: null }),
        single: async () => {
          if (!update) return { data: { role: callerRole }, error: null };
          if (assignmentFails) return { data: null, error: { message: 'assignment failed' } };
          const row = roles.find(r => r.user_id === filters.user_id && r.role === filters.role);
          if (!row) return { data: null, error: { message: 'missing role' } };
          Object.assign(row, update);
          return { data: { role: row.role }, error: null };
        },
      };
      if (!['user_roles', 'vendors'].includes(table)) throw new Error(`Unexpected table: ${table}`);
      return chain;
    },
  };
  let handler: ((req: Request) => Promise<Response>) | undefined;
  new Function('createClient', 'z', 'Deno', source)(() => client, z, {
    env: { get: () => '' }, serve: (value: typeof handler) => { handler = value; },
  });
  if (!handler) throw new Error('Missing request handler');
  const response = await handler(new Request('http://localhost/create-user', {
    method: 'POST', headers: { Authorization: 'Bearer test-only' },
    body: JSON.stringify({ email: 'security-test@example.com', password: 'TestOnly123', displayName: 'Security Test', role: requestedRole, subscribeToNewsletter: false }),
  }));
  return { response, roles, filters, created };
}

describe('trusted create-user role assignment', () => {
  for (const role of ['admin', 'owner', 'vendor']) {
    it(`replaces supporter with exactly ${role} for an owner-created account`, async () => {
      const result = await invoke(role);
      expect(result.response.status).toBe(200);
      expect(result.roles).toEqual([{ user_id: '22222222-2222-4222-8222-222222222222', role, created_by: '11111111-1111-4111-8111-111111111111' }]);
      expect(result.filters).toEqual({ user_id: '22222222-2222-4222-8222-222222222222', role: 'supporter' });
    });
  }
  it('preserves existing admin authorization for privileged creation', async () => {
    const result = await invoke('admin', 'admin');
    expect(result.response.status).toBe(200);
    expect(result.roles.map(r => r.role)).toEqual(['admin']);
  });
  it('does not report success when role replacement fails', async () => {
    const result = await invoke('owner', 'owner', true);
    expect(result.response.status).toBe(500);
    expect(result.roles.map(r => r.role)).toEqual(['supporter']);
  });
  it('rejects non-admin callers before account creation', async () => {
    const result = await invoke('owner', 'supporter');
    expect(result.response.status).toBe(403);
    expect(result.created).toBe(false);
  });
});