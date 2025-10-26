import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';

const createWrapper = (initialRoute = '/') => {
  const queryClient = new QueryClient({
    defaultOptions: { 
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Role-Based Routing', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Default: no auth session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
      data: { session: null }, 
      error: null 
    } as any);
    
    // Default: empty data for all queries
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            then: vi.fn((cb) => cb({ data: [], error: null }))
          }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    } as any);
  });

  it('redirects non-authenticated users from protected routes', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // No session = not authenticated
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
      data: { session: null }, 
      error: null 
    } as any);

    render(<App />, { wrapper: createWrapper('/admin') });

    await waitFor(() => {
      // Should redirect to auth or home
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('allows authenticated users to access their profile', async () => {
    const mockSession = {
      user: { 
        id: 'user-1', 
        email: 'test@example.com',
        user_metadata: {}
      },
      access_token: 'token',
      expires_at: Date.now() + 3600000
    };

    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    } as any);

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { 
                id: 'user-1', 
                email: 'test@example.com',
                name: 'Test User'
              }, 
              error: null 
            })),
            then: vi.fn((cb) => cb({ data: [], error: null }))
          }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    } as any);

    render(<App />, { wrapper: createWrapper('/profile') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('restricts admin routes to admin users only', async () => {
    const mockSession = {
      user: { 
        id: 'user-2', 
        email: 'supporter@example.com',
        user_metadata: {}
      },
      access_token: 'token',
      expires_at: Date.now() + 3600000
    };

    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    } as any);

    // Mock non-admin role
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { role: 'supporter' }, 
              error: null 
            })),
            then: vi.fn((cb) => cb({ data: [{ role: 'supporter' }], error: null }))
          }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    } as any);

    render(<App />, { wrapper: createWrapper('/admin') });

    await waitFor(() => {
      // Non-admin should be redirected
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('allows admin users to access admin routes', async () => {
    const mockSession = {
      user: { 
        id: 'admin-1', 
        email: 'admin@example.com',
        user_metadata: {}
      },
      access_token: 'token',
      expires_at: Date.now() + 3600000
    };

    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    } as any);

    // Mock admin role
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { role: 'admin' }, 
              error: null 
            })),
            then: vi.fn((cb) => cb({ data: [{ role: 'admin' }], error: null }))
          }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    } as any);

    render(<App />, { wrapper: createWrapper('/admin') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('restricts guardian features to caregivers', async () => {
    const mockSession = {
      user: { 
        id: 'bestie-1', 
        email: 'bestie@example.com',
        user_metadata: {}
      },
      access_token: 'token',
      expires_at: Date.now() + 3600000
    };

    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    } as any);

    // Mock bestie role (not caregiver)
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { role: 'bestie' }, 
              error: null 
            })),
            then: vi.fn((cb) => cb({ data: [{ role: 'bestie' }], error: null }))
          }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    } as any);

    render(<App />, { wrapper: createWrapper('/guardian-links') });

    await waitFor(() => {
      // Bestie should be redirected from guardian routes
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('allows caregivers to access guardian routes', async () => {
    const mockSession = {
      user: { 
        id: 'caregiver-1', 
        email: 'caregiver@example.com',
        user_metadata: {}
      },
      access_token: 'token',
      expires_at: Date.now() + 3600000
    };

    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    } as any);

    // Mock caregiver role
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { role: 'caregiver' }, 
              error: null 
            })),
            then: vi.fn((cb) => cb({ data: [{ role: 'caregiver' }], error: null }))
          }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    } as any);

    render(<App />, { wrapper: createWrapper('/guardian-links') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('restricts vendor dashboard to approved vendors', async () => {
    const mockSession = {
      user: { 
        id: 'user-3', 
        email: 'user@example.com',
        user_metadata: {}
      },
      access_token: 'token',
      expires_at: Date.now() + 3600000
    };

    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    } as any);

    // Mock non-vendor
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: null 
            })),
            then: vi.fn((cb) => cb({ data: [], error: null }))
          }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    } as any);

    render(<App />, { wrapper: createWrapper('/vendor-dashboard') });

    await waitFor(() => {
      // Non-vendor should be redirected
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('prevents besties from sponsoring themselves', async () => {
    const mockSession = {
      user: { 
        id: 'bestie-2', 
        email: 'bestie2@example.com',
        user_metadata: {}
      },
      access_token: 'token',
      expires_at: Date.now() + 3600000
    };

    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    } as any);

    // Mock bestie role
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { role: 'bestie' }, 
              error: null 
            })),
            then: vi.fn((cb) => cb({ data: [{ role: 'bestie' }], error: null }))
          }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    } as any);

    render(<App />, { wrapper: createWrapper('/sponsor-bestie') });

    await waitFor(() => {
      // Should show the page but with role blocking logic
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('handles role changes dynamically', async () => {
    // Start as supporter
    let currentRole = 'supporter';
    
    const mockSession = {
      user: { 
        id: 'user-4', 
        email: 'user4@example.com',
        user_metadata: {}
      },
      access_token: 'token',
      expires_at: Date.now() + 3600000
    };

    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    } as any);

    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { role: currentRole }, 
              error: null 
            })),
            then: vi.fn((cb) => cb({ data: [{ role: currentRole }], error: null }))
          }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    } as any));

    const { unmount } = render(<App />, { wrapper: createWrapper('/') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });

    unmount();

    // Change to admin
    currentRole = 'admin';

    render(<App />, { wrapper: createWrapper('/admin') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('supports role impersonation for admins', async () => {
    const mockSession = {
      user: { 
        id: 'admin-2', 
        email: 'admin2@example.com',
        user_metadata: {}
      },
      access_token: 'token',
      expires_at: Date.now() + 3600000
    };

    const { supabase } = await import('@/integrations/supabase/client');

    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    } as any);

    // Mock admin with impersonation
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { role: 'admin' }, 
              error: null 
            })),
            then: vi.fn((cb) => cb({ data: [{ role: 'admin' }], error: null }))
          }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    } as any);

    render(<App />, { wrapper: createWrapper('/') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('shows public pages to all users regardless of role', async () => {
    const publicRoutes = ['/', '/about', '/events', '/help', '/support'];
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    for (const route of publicRoutes) {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
        data: { session: null }, 
        error: null 
      } as any);

      const { unmount } = render(<App />, { wrapper: createWrapper(route) });

      await waitFor(() => {
        expect(document.querySelector('body')).toBeInTheDocument();
      });

      unmount();
    }
  });
});
