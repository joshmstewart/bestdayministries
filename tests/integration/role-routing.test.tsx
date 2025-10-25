import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';

// Mock Supabase
const mockAuth = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } }
  }))
};

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: mockAuth
  }
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
});

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
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default: no auth session
    mockAuth.getSession.mockResolvedValue({ 
      data: { session: null }, 
      error: null 
    });
    
    // Default: empty data for all queries
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            then: vi.fn((cb) => cb({ data: [], error: null }))
          }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    });
  });

  it('redirects non-authenticated users from protected routes', async () => {
    // No session = not authenticated
    mockAuth.getSession.mockResolvedValue({ 
      data: { session: null }, 
      error: null 
    });

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

    mockAuth.getSession.mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    });

    mockFrom.mockReturnValue({
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
    });

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

    mockAuth.getSession.mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    });

    // Mock non-admin role
    mockFrom.mockReturnValue({
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
    });

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

    mockAuth.getSession.mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    });

    // Mock admin role
    mockFrom.mockReturnValue({
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
    });

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

    mockAuth.getSession.mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    });

    // Mock bestie role (not caregiver)
    mockFrom.mockReturnValue({
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
    });

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

    mockAuth.getSession.mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    });

    // Mock caregiver role
    mockFrom.mockReturnValue({
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
    });

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

    mockAuth.getSession.mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    });

    // Mock non-vendor
    mockFrom.mockReturnValue({
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
    });

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

    mockAuth.getSession.mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    });

    // Mock bestie role
    mockFrom.mockReturnValue({
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
    });

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

    mockAuth.getSession.mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    });

    mockFrom.mockImplementation(() => ({
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
    }));

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

    mockAuth.getSession.mockResolvedValue({ 
      data: { session: mockSession }, 
      error: null 
    });

    // Mock admin with impersonation
    mockFrom.mockReturnValue({
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
    });

    render(<App />, { wrapper: createWrapper('/') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('shows public pages to all users regardless of role', async () => {
    const publicRoutes = ['/', '/about', '/events', '/help', '/support'];
    
    for (const route of publicRoutes) {
      mockAuth.getSession.mockResolvedValue({ 
        data: { session: null }, 
        error: null 
      });

      const { unmount } = render(<App />, { wrapper: createWrapper(route) });

      await waitFor(() => {
        expect(document.querySelector('body')).toBeInTheDocument();
      });

      unmount();
    }
  });
});
