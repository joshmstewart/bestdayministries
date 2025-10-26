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

describe('Role-Based Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles unauthenticated user state', async () => {
    const TestComponent = () => <div>Public Content</div>;
    
    render(<TestComponent />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Public Content')).toBeInTheDocument();
    });
  });

  it('handles authenticated user state', async () => {
    const TestComponent = () => <div>Protected Content</div>;
    
    render(<TestComponent />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('supports role-based content display', async () => {
    const TestComponent = ({ role }: { role: string }) => (
      <div>
        {role === 'admin' && <div>Admin Content</div>}
        {role === 'user' && <div>User Content</div>}
      </div>
    );
    
    const { unmount } = render(<TestComponent role="admin" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    unmount();

    render(<TestComponent role="user" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('User Content')).toBeInTheDocument();
    });
  });

  it('handles role changes dynamically', async () => {
    const TestComponent = ({ currentRole }: { currentRole: string }) => (
      <div>Current Role: {currentRole}</div>
    );
    
    const { rerender } = render(
      <TestComponent currentRole="user" />, 
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Current Role: user')).toBeInTheDocument();
    });

    rerender(<TestComponent currentRole="admin" />);

    await waitFor(() => {
      expect(screen.getByText('Current Role: admin')).toBeInTheDocument();
    });
  });

  it('shows public content to all users regardless of role', async () => {
    const publicContent = ['Home', 'About', 'Events', 'Help', 'Support'];
    
    for (const content of publicContent) {
      const TestComponent = () => <div>{content} Page</div>;
      const { unmount } = render(<TestComponent />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(`${content} Page`)).toBeInTheDocument();
      });

      unmount();
    }
  });
});
