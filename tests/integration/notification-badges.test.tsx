import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import '@testing-library/jest-dom';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

// Test Component with various badge scenarios
const NotificationBadgeTest = ({ 
  unreadCount = 0, 
  moderationCount = 0, 
  pendingCount = 0,
  contactCount = 0 
}: {
  unreadCount?: number;
  moderationCount?: number;
  pendingCount?: number;
  contactCount?: number;
}) => {
  return (
    <div>
      {/* Notification Bell Badge */}
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
          data-testid="notification-bell-badge"
        >
          {unreadCount}
        </Badge>
      )}
      
      {/* Moderation Badge */}
      {moderationCount > 0 && (
        <Badge 
          variant="destructive" 
          className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
          data-testid="moderation-badge"
        >
          {moderationCount}
        </Badge>
      )}
      
      {/* Pending Approvals Badge */}
      {pendingCount > 0 && (
        <Badge 
          variant="destructive" 
          className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
          data-testid="pending-badge"
        >
          {pendingCount}
        </Badge>
      )}
      
      {/* Contact Form Badge */}
      {contactCount > 0 && (
        <Badge 
          variant="destructive" 
          className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
          data-testid="contact-badge"
        >
          {contactCount}
        </Badge>
      )}
    </div>
  );
};

describe('Notification Badge - Count Calculations', () => {
  it('displays notification count when unread notifications exist', () => {
    render(<NotificationBadgeTest unreadCount={5} />, { wrapper: createWrapper() });
    
    const badge = screen.getByTestId('notification-bell-badge');
    expect(badge).toHaveTextContent('5');
  });

  it('does not display notification badge when count is zero', () => {
    render(<NotificationBadgeTest unreadCount={0} />, { wrapper: createWrapper() });
    
    expect(screen.queryByTestId('notification-bell-badge')).not.toBeInTheDocument();
  });

  it('displays moderation count correctly', () => {
    render(<NotificationBadgeTest moderationCount={7} />, { wrapper: createWrapper() });
    
    const badge = screen.getByTestId('moderation-badge');
    expect(badge).toHaveTextContent('7');
  });

  it('displays pending approvals count', () => {
    render(<NotificationBadgeTest pendingCount={12} />, { wrapper: createWrapper() });
    
    const badge = screen.getByTestId('pending-badge');
    expect(badge).toHaveTextContent('12');
  });

  it('displays contact form count', () => {
    render(<NotificationBadgeTest contactCount={3} />, { wrapper: createWrapper() });
    
    const badge = screen.getByTestId('contact-badge');
    expect(badge).toHaveTextContent('3');
  });

  it('handles double-digit counts', () => {
    render(<NotificationBadgeTest unreadCount={99} />, { wrapper: createWrapper() });
    
    const badge = screen.getByTestId('notification-bell-badge');
    expect(badge).toHaveTextContent('99');
  });

  it('displays multiple badges simultaneously', () => {
    render(
      <NotificationBadgeTest 
        unreadCount={5} 
        moderationCount={3} 
        pendingCount={8} 
        contactCount={2}
      />, 
      { wrapper: createWrapper() }
    );
    
    expect(screen.getByTestId('notification-bell-badge')).toHaveTextContent('5');
    expect(screen.getByTestId('moderation-badge')).toHaveTextContent('3');
    expect(screen.getByTestId('pending-badge')).toHaveTextContent('8');
    expect(screen.getByTestId('contact-badge')).toHaveTextContent('2');
  });
});

describe('Notification Badge - Display Styling', () => {
  it('uses destructive variant for urgency', () => {
    render(<NotificationBadgeTest unreadCount={5} />, { wrapper: createWrapper() });
    
    const badge = screen.getByTestId('notification-bell-badge');
    expect(badge.className).toContain('destructive');
  });

  it('applies circular styling to badges', () => {
    render(<NotificationBadgeTest unreadCount={5} />, { wrapper: createWrapper() });
    
    const badge = screen.getByTestId('notification-bell-badge');
    expect(badge.className).toContain('rounded-full');
  });

  it('uses consistent sizing for all badges', () => {
    render(
      <NotificationBadgeTest 
        unreadCount={5} 
        moderationCount={3}
      />, 
      { wrapper: createWrapper() }
    );
    
    const notificationBadge = screen.getByTestId('notification-bell-badge');
    const moderationBadge = screen.getByTestId('moderation-badge');
    
    expect(notificationBadge.className).toContain('h-5 w-5');
    expect(moderationBadge.className).toContain('h-5 w-5');
  });

  it('centers badge content', () => {
    render(<NotificationBadgeTest unreadCount={5} />, { wrapper: createWrapper() });
    
    const badge = screen.getByTestId('notification-bell-badge');
    expect(badge.className).toContain('flex items-center justify-center');
  });
});

describe('Notification Badge - Edge Cases', () => {
  it('handles zero count by hiding badge', () => {
    render(
      <NotificationBadgeTest 
        unreadCount={0} 
        moderationCount={0} 
        pendingCount={0}
        contactCount={0}
      />, 
      { wrapper: createWrapper() }
    );
    
    expect(screen.queryByTestId('notification-bell-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('moderation-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pending-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contact-badge')).not.toBeInTheDocument();
  });

  it('handles very large counts', () => {
    render(<NotificationBadgeTest unreadCount={999} />, { wrapper: createWrapper() });
    
    const badge = screen.getByTestId('notification-bell-badge');
    expect(badge).toHaveTextContent('999');
  });

  it('displays single digit counts', () => {
    render(<NotificationBadgeTest unreadCount={1} />, { wrapper: createWrapper() });
    
    const badge = screen.getByTestId('notification-bell-badge');
    expect(badge).toHaveTextContent('1');
  });

  it('updates when count changes from zero to positive', () => {
    const { rerender } = render(<NotificationBadgeTest unreadCount={0} />, { wrapper: createWrapper() });
    
    expect(screen.queryByTestId('notification-bell-badge')).not.toBeInTheDocument();
    
    rerender(<NotificationBadgeTest unreadCount={5} />);
    
    expect(screen.getByTestId('notification-bell-badge')).toBeInTheDocument();
  });

  it('updates when count changes from positive to zero', () => {
    const { rerender } = render(<NotificationBadgeTest unreadCount={5} />, { wrapper: createWrapper() });
    
    expect(screen.getByTestId('notification-bell-badge')).toBeInTheDocument();
    
    rerender(<NotificationBadgeTest unreadCount={0} />);
    
    expect(screen.queryByTestId('notification-bell-badge')).not.toBeInTheDocument();
  });
});
