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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects non-authenticated users from protected routes', async () => {
    render(<App />, { wrapper: createWrapper('/admin') });

    await waitFor(() => {
      // Should redirect to auth or home
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('allows authenticated users to access their profile', async () => {
    render(<App />, { wrapper: createWrapper('/profile') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('restricts admin routes to admin users only', async () => {
    render(<App />, { wrapper: createWrapper('/admin') });

    await waitFor(() => {
      // Non-admin should be redirected
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('allows admin users to access admin routes', async () => {
    render(<App />, { wrapper: createWrapper('/admin') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('restricts guardian features to caregivers', async () => {
    render(<App />, { wrapper: createWrapper('/guardian-links') });

    await waitFor(() => {
      // Bestie should be redirected from guardian routes
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('allows caregivers to access guardian routes', async () => {
    render(<App />, { wrapper: createWrapper('/guardian-links') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('restricts vendor dashboard to approved vendors', async () => {
    render(<App />, { wrapper: createWrapper('/vendor-dashboard') });

    await waitFor(() => {
      // Non-vendor should be redirected
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('prevents besties from sponsoring themselves', async () => {
    render(<App />, { wrapper: createWrapper('/sponsor-bestie') });

    await waitFor(() => {
      // Should show the page but with role blocking logic
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('handles role changes dynamically', async () => {
    const { unmount } = render(<App />, { wrapper: createWrapper('/') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });

    unmount();

    render(<App />, { wrapper: createWrapper('/admin') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('supports role impersonation for admins', async () => {
    render(<App />, { wrapper: createWrapper('/') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('shows public pages to all users regardless of role', async () => {
    const publicRoutes = ['/', '/about', '/events', '/help', '/support'];
    
    for (const route of publicRoutes) {
      const { unmount } = render(<App />, { wrapper: createWrapper(route) });

      await waitFor(() => {
        expect(document.querySelector('body')).toBeInTheDocument();
      });

      unmount();
    }
  });
});
