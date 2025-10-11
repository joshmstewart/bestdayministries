import { Page } from '@playwright/test';

/**
 * Mock Supabase auth responses for testing
 * Intercepts network calls to avoid creating actual test users
 */

export async function mockSupabaseAuth(page: Page) {
  // Mock successful signup
  await page.route('**/auth/v1/signup*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          aud: 'authenticated',
          role: 'authenticated',
          created_at: new Date().toISOString(),
        },
        session: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
        },
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

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'test-user-id',
          email: body.email,
          aud: 'authenticated',
          role: 'authenticated',
        },
        session: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
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

  // Mock session check (returns no session by default)
  await page.route('**/auth/v1/user*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: null,
      }),
    });
  });

  // Mock session endpoint
  await page.route('**/auth/v1/session*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: null,
        refresh_token: null,
      }),
    });
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
 * Mock an authenticated session
 */
export async function mockAuthenticatedSession(
  page: Page, 
  userEmail = 'authenticated@example.com',
  userRole: 'supporter' | 'caregiver' | 'bestie' | 'admin' = 'supporter'
) {
  const userId = 'authenticated-user-id';
  
  // Mock auth session
  await page.route('**/auth/v1/user*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: userId,
          email: userEmail,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: new Date().toISOString(),
        },
      }),
    });
  });

  // Mock session endpoint
  await page.route('**/auth/v1/session*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: userId,
          email: userEmail,
          aud: 'authenticated',
          role: 'authenticated',
        },
      }),
    });
  });

  // Set session cookie
  await page.context().addCookies([
    {
      name: 'sb-nbvijawmjkycyweioglk-auth-token',
      value: JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: { id: userId, email: userEmail },
      }),
      domain: 'localhost',
      path: '/',
    },
  ]);
}

/**
 * Mock database operations (profiles, user_roles, etc.)
 */
export async function mockSupabaseDatabase(page: Page) {
  // Mock profile creation/update
  await page.route('**/rest/v1/profiles*', async (route) => {
    const method = route.request().method();
    
    if (method === 'POST' || method === 'PATCH') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'profile-id',
          user_id: 'test-user-id',
          display_name: 'Test User',
          created_at: new Date().toISOString(),
        }]),
      });
    } else if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    } else {
      await route.continue();
    }
  });

  // Mock user_roles table
  await page.route('**/rest/v1/user_roles*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    
    if (method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'role-id',
          user_id: 'test-user-id',
          role: 'supporter',
          created_at: new Date().toISOString(),
        }]),
      });
    } else if (method === 'GET') {
      // Return role based on URL query params
      const role = url.includes('caregiver') ? 'caregiver' : 'supporter';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          role: role,
          user_id: 'test-user-id',
        }]),
      });
    } else {
      await route.continue();
    }
  });

  // Mock terms acceptance
  await page.route('**/rest/v1/terms_acceptance*', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: 'terms-id',
        user_id: 'test-user-id',
        created_at: new Date().toISOString(),
      }]),
    });
  });

  // Mock edge functions
  await page.route('**/functions/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}
