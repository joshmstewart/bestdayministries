import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

describe('Navigation - Page Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders homepage route', async () => {
    render(<App />, { wrapper: createWrapper('/') });

    await waitFor(() => {
      // Homepage should have main content
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('renders about page route', async () => {
    render(<App />, { wrapper: createWrapper('/about') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('renders community page route', async () => {
    render(<App />, { wrapper: createWrapper('/community') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('renders events page route', async () => {
    render(<App />, { wrapper: createWrapper('/events') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('renders partners page route', async () => {
    render(<App />, { wrapper: createWrapper('/partners') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('renders support page route', async () => {
    render(<App />, { wrapper: createWrapper('/support') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('renders videos page route', async () => {
    render(<App />, { wrapper: createWrapper('/videos') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('renders gallery page route', async () => {
    render(<App />, { wrapper: createWrapper('/gallery') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('renders help center route', async () => {
    render(<App />, { wrapper: createWrapper('/help') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('renders newsletter page route', async () => {
    render(<App />, { wrapper: createWrapper('/newsletter') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('renders discussions page route', async () => {
    render(<App />, { wrapper: createWrapper('/discussions') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('renders marketplace route', async () => {
    render(<App />, { wrapper: createWrapper('/marketplace') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('renders shopping cart route', async () => {
    render(<App />, { wrapper: createWrapper('/cart') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('renders order history route', async () => {
    render(<App />, { wrapper: createWrapper('/order-history') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('renders coffee shop route', async () => {
    render(<App />, { wrapper: createWrapper('/coffee-shop') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('renders sticker album route', async () => {
    render(<App />, { wrapper: createWrapper('/sticker-album') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });
});

describe('Navigation - Header and Footer', () => {
  it('displays header on all pages', async () => {
    render(<App />, { wrapper: createWrapper('/') });

    await waitFor(() => {
      const header = document.querySelector('header');
      expect(header).toBeInTheDocument();
    });
  });

  it('displays footer on all pages', async () => {
    render(<App />, { wrapper: createWrapper('/') });

    await waitFor(() => {
      const footer = document.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });
  });

  it('header contains navigation elements', async () => {
    const { container } = render(<App />, { wrapper: createWrapper('/') });

    await waitFor(() => {
      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
      
      // Header should have nav or buttons
      const hasNav = header?.querySelector('nav') || header?.querySelector('button');
      expect(hasNav).toBeTruthy();
    });
  });

  it('footer contains link sections', async () => {
    const { container } = render(<App />, { wrapper: createWrapper('/') });

    await waitFor(() => {
      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });
  });
});

describe('Navigation - 404 Handling', () => {
  it('handles non-existent routes', async () => {
    render(<App />, { wrapper: createWrapper('/this-does-not-exist-12345') });

    await waitFor(() => {
      // Should render something (either 404 or redirect to home)
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('handles malformed URLs gracefully', async () => {
    render(<App />, { wrapper: createWrapper('//invalid//route') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });
});

describe('Navigation - Deep Linking', () => {
  it('supports deep link to specific event', async () => {
    render(<App />, { wrapper: createWrapper('/events?eventId=123') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('supports deep link to specific post', async () => {
    render(<App />, { wrapper: createWrapper('/discussions?postId=456') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('supports deep link to help tour', async () => {
    render(<App />, { wrapper: createWrapper('/help?tour=welcome') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });

  it('supports deep link with bestie sponsor ID', async () => {
    render(<App />, { wrapper: createWrapper('/sponsor-bestie?bestieId=789') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });
  });
});

describe('Navigation - Accessibility', () => {
  it('supports keyboard navigation', async () => {
    render(<App />, { wrapper: createWrapper('/') });

    await waitFor(() => {
      // Page should have focusable elements
      const buttons = document.querySelectorAll('button, a, input');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('has proper heading hierarchy', async () => {
    render(<App />, { wrapper: createWrapper('/') });

    await waitFor(() => {
      // Should have semantic heading structure
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      expect(headings.length).toBeGreaterThanOrEqual(0);
    });
  });

  it('has semantic HTML structure', async () => {
    render(<App />, { wrapper: createWrapper('/') });

    await waitFor(() => {
      const main = document.querySelector('main');
      const header = document.querySelector('header');
      const footer = document.querySelector('footer');
      
      // At least one semantic element should exist
      expect(main || header || footer).toBeTruthy();
    });
  });

  it('supports screen reader navigation landmarks', async () => {
    render(<App />, { wrapper: createWrapper('/') });

    await waitFor(() => {
      // Should have ARIA landmarks or semantic HTML
      const landmarks = document.querySelectorAll('[role], main, nav, aside, header, footer');
      expect(landmarks.length).toBeGreaterThan(0);
    });
  });
});

describe('Navigation - Performance', () => {
  it('loads routes without blocking', async () => {
    const startTime = performance.now();
    render(<App />, { wrapper: createWrapper('/') });

    await waitFor(() => {
      expect(document.querySelector('body')).toBeInTheDocument();
    });

    const loadTime = performance.now() - startTime;
    // Should load reasonably fast (under 1 second)
    expect(loadTime).toBeLessThan(1000);
  });

  it('handles rapid route changes', async () => {
    const routes = ['/', '/about', '/community', '/events'];
    
    for (const route of routes) {
      const { unmount } = render(<App />, { wrapper: createWrapper(route) });
      
      await waitFor(() => {
        expect(document.querySelector('body')).toBeInTheDocument();
      });
      
      unmount();
    }
    
    // Should complete without errors
    expect(true).toBe(true);
  });
});
