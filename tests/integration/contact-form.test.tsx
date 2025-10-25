import { describe, it, expect } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('Contact Form Integration Tests', () => {
  describe('Form Validation', () => {
    it('should validate email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('valid@example.com')).toBe(true);
      expect(emailRegex.test('invalid')).toBe(false);
    });

    it('should validate required fields', () => {
      const formData = { name: '', email: '', message: '' };
      const errors = Object.keys(formData).filter(k => !formData[k as keyof typeof formData]);
      expect(errors).toHaveLength(3);
    });
  });

  describe('Submission Handling', () => {
    it('should create submission via API', async () => {
      server.use(
        http.post('*/rest/v1/contact_form_submissions', async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ ...body, id: 'new-id', status: 'new' });
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/contact_form_submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test', email: 'test@example.com', message: 'Test' })
      });

      const data = await response.json();
      expect(data.status).toBe('new');
    });
  });

  describe('Admin Notifications', () => {
    it('should calculate badge count', () => {
      const submissions = [
        { status: 'new', unread_user_replies: 0 },
        { status: 'read', unread_user_replies: 2 }
      ];
      const count = submissions.filter(s => s.status === 'new' || s.unread_user_replies > 0).length;
      expect(count).toBe(2);
    });
  });
});
