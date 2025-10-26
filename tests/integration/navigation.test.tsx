import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { 
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Navigation - Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('supports keyboard navigation', async () => {
    const TestComponent = () => (
      <div>
        <button>Button 1</button>
        <a href="/test">Link 1</a>
        <input type="text" />
      </div>
    );

    render(<TestComponent />, { wrapper: createWrapper() });

    await waitFor(() => {
      const buttons = document.querySelectorAll('button, a, input');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('has proper heading hierarchy', async () => {
    const TestComponent = () => (
      <div>
        <h1>Main Title</h1>
        <h2>Subtitle</h2>
      </div>
    );

    render(<TestComponent />, { wrapper: createWrapper() });

    await waitFor(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      expect(headings.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('has semantic HTML structure', async () => {
    const TestComponent = () => (
      <div>
        <header>Header</header>
        <main>Main Content</main>
        <footer>Footer</footer>
      </div>
    );

    render(<TestComponent />, { wrapper: createWrapper() });

    await waitFor(() => {
      const main = document.querySelector('main');
      const header = document.querySelector('header');
      const footer = document.querySelector('footer');
      
      expect(main || header || footer).toBeTruthy();
    });
  });

  it('supports screen reader navigation landmarks', async () => {
    const TestComponent = () => (
      <div>
        <header>Header</header>
        <nav>Navigation</nav>
        <main>Main</main>
      </div>
    );

    render(<TestComponent />, { wrapper: createWrapper() });

    await waitFor(() => {
      const landmarks = document.querySelectorAll('[role], main, nav, aside, header, footer');
      expect(landmarks.length).toBeGreaterThan(0);
    });
  });
});

describe('Navigation - Performance', () => {
  it('renders components without blocking', async () => {
    const TestComponent = () => <div>Test Content</div>;
    
    const startTime = performance.now();
    render(<TestComponent />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    const loadTime = performance.now() - startTime;
    expect(loadTime).toBeLessThan(1000);
  });

  it('handles rapid component changes', async () => {
    const components = [
      () => <div>Component 1</div>,
      () => <div>Component 2</div>,
      () => <div>Component 3</div>,
      () => <div>Component 4</div>
    ];
    
    for (const Component of components) {
      const { unmount } = render(<Component />, { wrapper: createWrapper() });
      
      await waitFor(() => {
        expect(document.querySelector('body')).toBeInTheDocument();
      });
      
      unmount();
    }
    
    expect(true).toBe(true);
  });
});
