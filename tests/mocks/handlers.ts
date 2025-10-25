import { http, HttpResponse } from 'msw';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';

export const handlers = [
  // Mock sticker collections query
  http.get(`${SUPABASE_URL}/rest/v1/sticker_collections`, () => {
    return HttpResponse.json([
      {
        id: 'mock-collection-1',
        name: 'Test Collection',
        description: 'A test sticker collection',
        is_active: true,
        start_date: '2024-01-01',
        rarity_config: {
          common: 50,
          uncommon: 30,
          rare: 15,
          epic: 4,
          legendary: 1
        }
      }
    ]);
  }),

  // Mock stickers query
  http.get(`${SUPABASE_URL}/rest/v1/stickers`, () => {
    return HttpResponse.json([
      {
        id: 'mock-sticker-1',
        collection_id: 'mock-collection-1',
        name: 'Common Sticker',
        rarity: 'common',
        image_url: 'https://example.com/sticker1.png',
        is_active: true
      },
      {
        id: 'mock-sticker-2',
        collection_id: 'mock-collection-1',
        name: 'Rare Sticker',
        rarity: 'rare',
        image_url: 'https://example.com/sticker2.png',
        is_active: true
      }
    ]);
  }),

  // Mock user stickers query
  http.get(`${SUPABASE_URL}/rest/v1/user_stickers`, () => {
    return HttpResponse.json([
      {
        id: 'mock-user-sticker-1',
        user_id: 'mock-user-id',
        sticker_id: 'mock-sticker-1',
        collection_id: 'mock-collection-1',
        quantity: 2,
        obtained_at: '2024-01-15T10:00:00Z'
      }
    ]);
  }),

  // Mock daily scratch cards query
  http.get(`${SUPABASE_URL}/rest/v1/daily_scratch_cards`, () => {
    return HttpResponse.json([
      {
        id: 'mock-card-1',
        user_id: 'mock-user-id',
        date: '2024-01-20',
        is_scratched: false,
        is_bonus_card: false
      }
    ]);
  }),

  // Mock discussion posts query
  http.get(`${SUPABASE_URL}/rest/v1/discussion_posts`, () => {
    return HttpResponse.json([
      {
        id: 'mock-post-1',
        author_id: 'mock-author-id',
        title: 'Test Discussion',
        content: 'Test content',
        approval_status: 'approved',
        is_moderated: true,
        created_at: '2024-01-20T10:00:00Z'
      }
    ]);
  }),

  // Mock discussion comments query
  http.get(`${SUPABASE_URL}/rest/v1/discussion_comments`, () => {
    return HttpResponse.json([
      {
        id: 'mock-comment-1',
        post_id: 'mock-post-1',
        author_id: 'mock-author-id',
        content: 'Test comment',
        approval_status: 'approved',
        created_at: '2024-01-20T10:30:00Z'
      }
    ]);
  }),

  // Mock contact form submissions query
  http.get(`${SUPABASE_URL}/rest/v1/contact_form_submissions`, () => {
    return HttpResponse.json([
      {
        id: 'mock-submission-1',
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message',
        status: 'new',
        created_at: '2024-01-20T10:00:00Z'
      }
    ]);
  }),

  // Mock contact form submission insert
  http.post(`${SUPABASE_URL}/rest/v1/contact_form_submissions`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...body,
      id: 'mock-new-submission',
      status: 'new',
      created_at: new Date().toISOString()
    });
  }),

  // Mock notifications query
  http.get(`${SUPABASE_URL}/rest/v1/notifications`, () => {
    return HttpResponse.json([
      {
        id: 'mock-notification-1',
        user_id: 'mock-user-id',
        type: 'pending_approval',
        title: 'Post Pending Approval',
        message: 'A new post requires your approval',
        is_read: false,
        created_at: '2024-01-20T10:00:00Z'
      }
    ]);
  }),

  // Mock profiles query
  http.get(`${SUPABASE_URL}/rest/v1/profiles`, () => {
    return HttpResponse.json([
      {
        id: 'mock-user-id',
        display_name: 'Test User',
        email: 'test@example.com',
        friend_code: '🌟🌈🔥'
      }
    ]);
  }),

  // Mock caregiver_bestie_links query
  http.get(`${SUPABASE_URL}/rest/v1/caregiver_bestie_links`, () => {
    return HttpResponse.json([
      {
        id: 'mock-link-1',
        caregiver_id: 'mock-guardian-id',
        bestie_id: 'mock-bestie-id',
        require_post_approval: true,
        require_comment_approval: false
      }
    ]);
  }),

  // Mock terms acceptance query
  http.get(`${SUPABASE_URL}/rest/v1/terms_acceptance`, () => {
    return HttpResponse.json([
      {
        id: 'mock-acceptance-1',
        user_id: 'mock-user-id',
        terms_version: '1.0',
        privacy_version: '1.0',
        accepted_at: '2024-01-01T00:00:00Z'
      }
    ]);
  }),

  // Mock edge function calls
  http.post(`${SUPABASE_URL}/functions/v1/record-terms-acceptance`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      acceptance_id: 'mock-acceptance-new'
    });
  })
];
