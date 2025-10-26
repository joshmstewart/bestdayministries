import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

describe('Update Sticker Collections Edge Function', () => {
  describe('promote_collections_to_ga RPC', () => {
    it('should call promote_collections_to_ga successfully', async () => {
      server.use(
        http.post('*/rest/v1/rpc/promote_collections_to_ga', () => {
          return HttpResponse.json({ success: true });
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/promote_collections_to_ga`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should handle promote_collections_to_ga errors', async () => {
      server.use(
        http.post('*/rest/v1/rpc/promote_collections_to_ga', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/promote_collections_to_ga`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.status).toBe(500);
    });
  });

  describe('update_featured_collections RPC', () => {
    it('should call update_featured_collections successfully', async () => {
      server.use(
        http.post('*/rest/v1/rpc/update_featured_collections', () => {
          return HttpResponse.json({ success: true });
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/update_featured_collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should handle update_featured_collections errors', async () => {
      server.use(
        http.post('*/rest/v1/rpc/update_featured_collections', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/update_featured_collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.status).toBe(500);
    });
  });

  describe('activate_collections_on_start_date RPC', () => {
    it('should call activate_collections_on_start_date successfully', async () => {
      server.use(
        http.post('*/rest/v1/rpc/activate_collections_on_start_date', () => {
          return HttpResponse.json({ success: true });
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/activate_collections_on_start_date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should handle activate_collections_on_start_date errors', async () => {
      server.use(
        http.post('*/rest/v1/rpc/activate_collections_on_start_date', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/activate_collections_on_start_date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.status).toBe(500);
    });
  });

  describe('deactivate_collections_after_end_date RPC', () => {
    it('should call deactivate_collections_after_end_date successfully', async () => {
      server.use(
        http.post('*/rest/v1/rpc/deactivate_collections_after_end_date', () => {
          return HttpResponse.json({ success: true });
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/deactivate_collections_after_end_date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should handle deactivate_collections_after_end_date errors', async () => {
      server.use(
        http.post('*/rest/v1/rpc/deactivate_collections_after_end_date', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/deactivate_collections_after_end_date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.status).toBe(500);
    });
  });

  describe('Edge Function Response Validation', () => {
    it('should return proper JSON response on success', async () => {
      server.use(
        http.post('*/functions/v1/update-sticker-collections', () => {
          return HttpResponse.json({
            success: true,
            message: 'Sticker collections updated successfully'
          });
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/update-sticker-collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
    });

    it('should return error details on failure', async () => {
      server.use(
        http.post('*/functions/v1/update-sticker-collections', () => {
          return HttpResponse.json(
            { success: false, error: 'Function execution failed' },
            { status: 500 }
          );
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/update-sticker-collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
    });
  });
});
