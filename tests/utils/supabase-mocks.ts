import { Page } from '@playwright/test';

/**
 * Comprehensive stateful Supabase mock system for E2E testing
 * Maintains in-memory state across requests to simulate real backend behavior
 */

// Friend code emoji set (matches src/lib/friendCodeEmojis.ts)
const FRIEND_CODE_EMOJIS = [
  '🌟', '🌈', '🔥', '🌊', '🌸', '🍕', '🎸', '🚀', '🏆', '⚡',
  '🎨', '🎭', '🎪', '🏰', '🌵', '🦋', '🐉', '🎯', '🎺', '🏖️'
];

function generateMockFriendCode(): string {
  return Array.from({ length: 3 }, () => 
    FRIEND_CODE_EMOJIS[Math.floor(Math.random() * FRIEND_CODE_EMOJIS.length)]
  ).join('');
}

/**
 * Stateful mock backend that persists data across test requests
 */
export class MockSupabaseState {
  // Core auth & profile data
  users = new Map<string, {
    id: string;
    email: string;
    aud: string;
    role: string;
    created_at: string;
    raw_user_meta_data: any;
  }>();

  profiles = new Map<string, {
    id: string;
    user_id: string;
    display_name: string;
    email: string;
    avatar_number: number;
    friend_code: string;
    created_at: string;
  }>();

  userRoles = new Map<string, {
    id: string;
    user_id: string;
    role: string;
    created_at: string;
  }>();

  // Linking & relationships
  caregiverBestieLinks = new Map<string, {
    id: string;
    caregiver_id: string;
    bestie_id: string;
    relationship: string;
    require_post_approval: boolean;
    require_comment_approval: boolean;
    require_message_approval: boolean;
    require_vendor_asset_approval: boolean;
    allow_featured_posts: boolean;
    show_sponsor_link_on_guardian: boolean;
    show_sponsor_link_on_bestie: boolean;
    created_at: string;
  }>();

  // Vendor system
  vendors = new Map<string, {
    id: string;
    user_id: string;
    business_name: string;
    status: string;
    created_at: string;
  }>();

  vendorBestieRequests = new Map<string, {
    id: string;
    vendor_id: string;
    bestie_id: string;
    message: string;
    status: string;
    created_at: string;
  }>();

  // Featured besties
  featuredBesties = new Map<string, {
    id: string;
    vendor_id: string;
    bestie_id: string;
    created_at: string;
  }>();

  // Sponsorship system
  sponsorBesties = new Map<string, {
    id: string;
    bestie_id: string;
    bestie_name: string;
    description: string;
    monthly_goal: number;
    available_for_sponsorship: boolean;
    created_at: string;
  }>();

  // Terms & compliance
  termsAcceptance = new Set<string>();

  // Token to user ID mapping
  tokens = new Map<string, string>();

  // Session management
  sessions = new Map<string, {
    access_token: string;
    refresh_token: string;
    user: any;
  }>();

  // Page sections for navigation tests
  communityPageSections = new Map<string, any>();
  supportPageSections = new Map<string, any>();
  appSettings = new Map<string, any>();

  constructor() {
    // Initialize with default app settings
    this.appSettings.set('logo_url', { setting_key: 'logo_url', setting_value: null });
    this.appSettings.set('app_name', { setting_key: 'app_name', setting_value: 'Best Day Ministries' });
    
    // Initialize with default community sections (so pages render properly)
    this.communityPageSections.set('featured_carousel', {
      id: 'section-1',
      section_key: 'featured_carousel',
      section_name: 'Featured Carousel',
      display_order: 1,
      is_visible: true,
      content: {}
    });
    
    // Initialize with default support sections
    this.supportPageSections.set('ways_to_give', {
      id: 'section-2',
      section_key: 'ways_to_give',
      section_name: 'Ways to Give',
      display_order: 1,
      is_visible: true,
      content: {}
    });
  }

  // Helper methods
  addUser(email: string, password: string, metadata: any): string {
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const token = `token-${userId}`;
    
    this.tokens.set(token, userId);
    
    this.users.set(userId, {
      id: userId,
      email,
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
      raw_user_meta_data: metadata
    });

    // Auto-create profile
    const friendCode = metadata.role === 'bestie' ? generateMockFriendCode() : '';
    this.profiles.set(userId, {
      id: userId,
      user_id: userId,
      display_name: metadata.display_name || 'New User',
      email,
      avatar_number: metadata.avatar_number || 1,
      friend_code: friendCode,
      created_at: new Date().toISOString()
    });

    // Auto-create role
    this.userRoles.set(`${userId}-${metadata.role}`, {
      id: `role-${userId}`,
      user_id: userId,
      role: metadata.role || 'supporter',
      created_at: new Date().toISOString()
    });

    // Create session
    this.sessions.set(userId, {
      access_token: token,
      refresh_token: `refresh-${token}`,
      user: {
        id: userId,
        email,
        aud: 'authenticated',
        role: 'authenticated'
      }
    });

    return userId;
  }

  getUserByEmail(email: string) {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  getUserByToken(token: string | undefined): any {
    if (!token) return null;
    const userId = this.tokens.get(token);
    return userId ? this.users.get(userId) : null;
  }

  getUserIdFromToken(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    return this.tokens.get(token) || null;
  }

  getProfileByFriendCode(friendCode: string) {
    for (const profile of this.profiles.values()) {
      if (profile.friend_code === friendCode) return profile;
    }
    return null;
  }

  addCaregiverLink(caregiverId: string, bestieId: string, relationship: string) {
    const linkId = `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.caregiverBestieLinks.set(linkId, {
      id: linkId,
      caregiver_id: caregiverId,
      bestie_id: bestieId,
      relationship,
      require_post_approval: false,
      require_comment_approval: false,
      require_message_approval: true,
      require_vendor_asset_approval: false,
      allow_featured_posts: true,
      show_sponsor_link_on_guardian: true,
      show_sponsor_link_on_bestie: true,
      created_at: new Date().toISOString()
    });
    return linkId;
  }

  addVendor(userId: string, businessName: string, status: string = 'pending') {
    const vendorId = `vendor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.vendors.set(vendorId, {
      id: vendorId,
      user_id: userId,
      business_name: businessName,
      status,
      created_at: new Date().toISOString()
    });
    return vendorId;
  }

  clear() {
    this.users.clear();
    this.profiles.clear();
    this.userRoles.clear();
    this.caregiverBestieLinks.clear();
    this.vendors.clear();
    this.vendorBestieRequests.clear();
    this.featuredBesties.clear();
    this.sponsorBesties.clear();
    this.termsAcceptance.clear();
    this.tokens.clear();
    this.sessions.clear();
    this.communityPageSections.clear();
    this.supportPageSections.clear();
    this.appSettings.clear();
  }
}

/**
 * Parse Supabase query parameters from URL
 */
function extractQueryParam(url: string, param: string, operator: 'eq' | 'in' = 'eq'): string | null {
  const urlObj = new URL(url);
  const paramValue = urlObj.searchParams.get(param);
  
  if (!paramValue) return null;
  
  if (operator === 'eq') {
    return paramValue.replace('eq.', '');
  } else if (operator === 'in') {
    return paramValue.replace('in.(', '').replace(')', '');
  }
  
  return paramValue;
}

/**
 * Mock Supabase authentication with full state management
 */
export async function mockSupabaseAuth(page: Page, state: MockSupabaseState) {
  // Mock successful signup - creates user, profile, role, and friend code
  await page.route('**/auth/v1/signup*', async (route) => {
    const body = await route.request().postDataJSON();
    
    const userId = state.addUser(body.email, body.password, {
      display_name: body.options?.data?.display_name || 'New User',
      role: body.options?.data?.role || 'supporter',
      avatar_number: body.options?.data?.avatar_number || 1
    });

    const user = state.users.get(userId);
    const session = state.sessions.get(userId);

    // ✅ FIX: Use addInitScript to set localStorage before any page loads
    // This avoids SecurityError by letting Playwright inject the script at the right time
    const context = page.context();
    await context.addInitScript((sessionData) => {
      localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
      
      // ✅ COMPREHENSIVE FIX: Trigger storage event to notify Supabase client of session
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'supabase.auth.token',
        newValue: JSON.stringify(sessionData),
        url: window.location.href,
      }));
    }, session);

    // ✅ COMPREHENSIVE FIX: Wait for Supabase client to initialize from storage
    await page.waitForTimeout(100);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user,
        session,
      }),
    });
  });

  // Mock successful signin
  await page.route('**/auth/v1/token?grant_type=password', async (route) => {
    const body = await route.request().postDataJSON();
    
    // Simulate invalid credentials
    if (body.email === 'invalid@example.com') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
        }),
      });
      return;
    }

    const user = state.getUserByEmail(body.email);
    if (!user) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
        }),
      });
      return;
    }

    const token = Array.from(state.tokens.entries()).find(([_, id]) => id === user.id)?.[0];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user,
        session: {
          access_token: token,
          refresh_token: `refresh-${token}`,
          token_type: 'bearer',
          expires_in: 3600,
        },
      }),
    });
  });

  // Mock password reset request
  await page.route('**/auth/v1/recover*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  // Mock session check - returns actual created user
  await page.route('**/auth/v1/user*', async (route) => {
    const authHeader = route.request().headers()['authorization'];
    const user = state.getUserByToken(authHeader?.replace('Bearer ', ''));

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: user || null,
      }),
    });
  });

  // Mock session endpoint
  await page.route('**/auth/v1/session*', async (route) => {
    const authHeader = route.request().headers()['authorization'];
    const user = state.getUserByToken(authHeader?.replace('Bearer ', ''));

    if (user) {
      const token = Array.from(state.tokens.entries()).find(([_, id]) => id === user.id)?.[0];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: token,
          refresh_token: `refresh-${token}`,
          user,
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: null,
          refresh_token: null,
        }),
      });
    }
  });

  // Mock sign out
  await page.route('**/auth/v1/logout*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

/**
 * Mock authenticated session for a specific user
 */
export async function mockAuthenticatedSession(
  page: Page,
  state: MockSupabaseState,
  userEmail = 'authenticated@example.com',
  userRole: 'supporter' | 'caregiver' | 'bestie' | 'admin' = 'supporter'
) {
  // Get or create user
  let user = state.getUserByEmail(userEmail);
  let userId: string;
  
  if (!user) {
    userId = state.addUser(userEmail, 'password123', {
      display_name: userEmail.split('@')[0],
      role: userRole,
      avatar_number: 1
    });
    user = state.users.get(userId)!;
  } else {
    userId = user.id;
  }

  const session = state.sessions.get(userId);
  if (!session) {
    throw new Error(`Session not found for user ${userId}`);
  }

  // ✅ FIX 1: Use addInitScript to set localStorage before any page loads
  // This avoids the SecurityError by letting Playwright inject the script at the right time
  const context = page.context();
  await context.addInitScript((sessionData) => {
    localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
  }, session);

  // ✅ FIX 2: Also set authentication cookie as fallback
  await context.addCookies([{
    name: 'sb-access-token',
    value: session.access_token,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax'
  }]);

  // ✅ FIX 3: Mock auth endpoints to return this session
  await page.route('**/auth/v1/user*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { user },
        error: null
      }),
    });
  });

  await page.route('**/auth/v1/session*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { session, user },
        error: null
      }),
    });
  });

  // Set session cookie
  await page.context().addCookies([
    {
      name: 'sb-nbvijawmjkycyweioglk-auth-token',
      value: JSON.stringify(session),
      domain: 'localhost',
      path: '/',
    },
  ]);

  return { userId, token: session.access_token };
}

/**
 * Mock all database operations with full state management
 */
export async function mockSupabaseDatabase(page: Page, state: MockSupabaseState) {
  // Mock profile operations
  await page.route('**/rest/v1/profiles*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    
    if (method === 'POST' || method === 'PATCH') {
      const body = await route.request().postDataJSON();
      if (body.user_id) {
        state.profiles.set(body.user_id, {
          id: body.id || body.user_id,
          user_id: body.user_id,
          display_name: body.display_name || 'User',
          email: body.email || '',
          avatar_number: body.avatar_number || 1,
          friend_code: body.friend_code || '',
          created_at: new Date().toISOString(),
        });
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([body]),
      });
    } else if (method === 'GET') {
      const userId = extractQueryParam(url, 'user_id');
      const friendCode = extractQueryParam(url, 'friend_code');
      
      let results = Array.from(state.profiles.values());
      
      if (userId) {
        results = results.filter(p => p.user_id === userId);
      }
      if (friendCode) {
        results = results.filter(p => p.friend_code === friendCode);
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(results),
      });
    } else {
      await route.continue();
    }
  });

  // ✅ COMPREHENSIVE FIX: Mock terms_acceptance table for proper auth testing
  await page.route('**/rest/v1/terms_acceptance*', async (route) => {
    const method = route.request().method();
    
    if (method === 'POST') {
      const body = await route.request().postDataJSON();
      const authHeader = route.request().headers()['authorization'];
      const userId = state.getUserIdFromToken(authHeader);
      
      if (userId) {
        // Mock successful database insert
        state.termsAcceptance.add(userId);
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([{
            user_id: userId,
            terms_version: body.terms_version,
            privacy_version: body.privacy_version,
            accepted_at: new Date().toISOString()
          }]),
        });
      } else {
        await route.fulfill({ 
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized' })
        });
      }
    } else {
      await route.continue();
    }
  });

  // Mock user_roles operations
  await page.route('**/rest/v1/user_roles*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    
    if (method === 'POST') {
      const body = await route.request().postDataJSON();
      const roleId = `${body.user_id}-${body.role}`;
      state.userRoles.set(roleId, {
        id: body.id || roleId,
        user_id: body.user_id,
        role: body.role,
        created_at: new Date().toISOString(),
      });
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([body]),
      });
    } else if (method === 'GET') {
      const userId = extractQueryParam(url, 'user_id');
      const role = extractQueryParam(url, 'role');
      
      let results = Array.from(state.userRoles.values());
      
      if (userId) {
        results = results.filter(r => r.user_id === userId);
      }
      if (role) {
        results = results.filter(r => r.role === role);
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(results),
      });
    } else {
      await route.continue();
    }
  });

  // Mock caregiver_bestie_links operations
  await page.route('**/rest/v1/caregiver_bestie_links*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    
    if (method === 'POST') {
      const body = await route.request().postDataJSON();
      const linkId = state.addCaregiverLink(
        body.caregiver_id,
        body.bestie_id,
        body.relationship
      );
      const link = state.caregiverBestieLinks.get(linkId);
      
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([link]),
      });
    } else if (method === 'GET') {
      const caregiverId = extractQueryParam(url, 'caregiver_id');
      const bestieId = extractQueryParam(url, 'bestie_id');
      
      let results = Array.from(state.caregiverBestieLinks.values());
      
      if (caregiverId) {
        results = results.filter(link => link.caregiver_id === caregiverId);
      }
      if (bestieId) {
        results = results.filter(link => link.bestie_id === bestieId);
      }
      
      // Simulate join with profiles
      const enrichedResults = results.map(link => ({
        ...link,
        bestie: state.profiles.get(link.bestie_id) || null,
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(enrichedResults),
      });
    } else if (method === 'DELETE') {
      const linkId = extractQueryParam(url, 'id');
      if (linkId) {
        state.caregiverBestieLinks.delete(linkId);
      }
      await route.fulfill({ status: 204 });
    } else if (method === 'PATCH') {
      const linkId = extractQueryParam(url, 'id');
      const body = await route.request().postDataJSON();
      
      if (linkId) {
        const link = state.caregiverBestieLinks.get(linkId);
        if (link) {
          Object.assign(link, body);
          state.caregiverBestieLinks.set(linkId, link);
        }
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([body]),
      });
    } else {
      await route.continue();
    }
  });

  // Mock vendors operations
  await page.route('**/rest/v1/vendors*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    
    if (method === 'POST') {
      const body = await route.request().postDataJSON();
      const vendorId = state.addVendor(body.user_id, body.business_name, body.status || 'pending');
      const vendor = state.vendors.get(vendorId);
      
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([vendor]),
      });
    } else if (method === 'GET') {
      const userId = extractQueryParam(url, 'user_id');
      const status = extractQueryParam(url, 'status');
      
      let results = Array.from(state.vendors.values());
      
      if (userId) {
        results = results.filter(v => v.user_id === userId);
      }
      if (status) {
        results = results.filter(v => v.status === status);
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(results),
      });
    } else {
      await route.continue();
    }
  });

  // Mock vendor_bestie_requests operations
  await page.route('**/rest/v1/vendor_bestie_requests*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    
    if (method === 'POST') {
      const body = await route.request().postDataJSON();
      const requestId = `request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      state.vendorBestieRequests.set(requestId, {
        id: requestId,
        vendor_id: body.vendor_id,
        bestie_id: body.bestie_id,
        message: body.message || '',
        status: body.status || 'pending',
        created_at: new Date().toISOString(),
      });
      
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([state.vendorBestieRequests.get(requestId)]),
      });
    } else if (method === 'GET') {
      const vendorId = extractQueryParam(url, 'vendor_id');
      let results = Array.from(state.vendorBestieRequests.values());
      
      if (vendorId) {
        results = results.filter(r => r.vendor_id === vendorId);
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(results),
      });
    } else {
      await route.continue();
    }
  });

  // Mock terms_acceptance operations
  await page.route('**/rest/v1/terms_acceptance*', async (route) => {
    const method = route.request().method();
    
    if (method === 'POST') {
      const body = await route.request().postDataJSON();
      state.termsAcceptance.add(body.user_id);
      
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: `terms-${body.user_id}`,
          user_id: body.user_id,
          created_at: new Date().toISOString(),
        }]),
      });
    } else {
      await route.continue();
    }
  });

  // Mock community_page_sections
  await page.route('**/rest/v1/community_page_sections*', async (route) => {
    const sections = Array.from(state.communityPageSections.values());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sections.length > 0 ? sections : [])
    });
  });

  // Mock support_page_sections
  await page.route('**/rest/v1/support_page_sections*', async (route) => {
    const sections = Array.from(state.supportPageSections.values());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sections.length > 0 ? sections : [])
    });
  });

  // Mock RPC get_public_app_settings
  await page.route('**/rpc/get_public_app_settings*', async (route) => {
    const settings = Array.from(state.appSettings.values());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(settings)
    });
  });

  // Mock RPC check_terms_acceptance (prevents Terms dialog in tests)
  await page.route('**/rest/v1/rpc/check_terms_acceptance*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        needs_acceptance: false,
        current_terms_version: '1.0',
        current_privacy_version: '1.0'
      })
    });
  });

  // Mock edge functions
  await page.route('**/functions/v1/**', async (route) => {
    const url = route.request().url();
    
    if (url.includes('record-terms-acceptance')) {
      const body = await route.request().postDataJSON();
      const authHeader = route.request().headers()['authorization'];
      const userId = state.getUserIdFromToken(authHeader);
      
      if (userId) {
        state.termsAcceptance.add(userId);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, userId }),
        });
      } else {
        // ✅ COMPREHENSIVE FIX: Log authentication failure for debugging
        console.log('[TEST MOCK] record-terms-acceptance called without valid auth token');
        console.log('[TEST MOCK] Auth header:', authHeader ? 'present but invalid' : 'missing');
        
        await route.fulfill({ 
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Not authenticated - no user in session',
            errorCode: 'UNAUTHENTICATED'
          })
        });
      }
    } else if (url.includes('text-to-speech')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ audio_url: 'mock-audio-url.mp3' }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });
}
