import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import '@testing-library/jest-dom';

// Mock hooks
const mockModerationCount = { count: 5, loading: false };
const mockPendingVendorsCount = { count: 3, loading: false };
const mockMessageModerationCount = { count: 2, loading: false };
const mockContactFormCount = { count: 7, loading: false };

vi.mock('@/hooks/useModerationCount', () => ({
  useModerationCount: () => mockModerationCount
}));

vi.mock('@/hooks/usePendingVendorsCount', () => ({
  usePendingVendorsCount: () => mockPendingVendorsCount
}));

vi.mock('@/hooks/useMessageModerationCount', () => ({
  useMessageModerationCount: () => mockMessageModerationCount
}));

vi.mock('@/hooks/useContactFormCount', () => ({
  useContactFormCount: () => mockContactFormCount
}));

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

// Admin Tabs Component for testing
const AdminTabsTest = () => {
  const moderationCount = mockModerationCount.count;
  const pendingVendorsCount = mockPendingVendorsCount.count;
  const messageModerationCount = mockMessageModerationCount.count;
  const contactFormCount = mockContactFormCount.count;

  return (
    <Tabs defaultValue="users" className="space-y-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="events">Events</TabsTrigger>
        <TabsTrigger value="vendors" className="relative">
          Vendors
          {pendingVendorsCount > 0 && (
            <Badge 
              variant="destructive" 
              className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
            >
              {pendingVendorsCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="moderation" className="relative">
          Moderation
          {(moderationCount + messageModerationCount) > 0 && (
            <Badge 
              variant="destructive" 
              className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
            >
              {moderationCount + messageModerationCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="contact" className="relative">
          Contact
          {contactFormCount > 0 && (
            <Badge 
              variant="destructive" 
              className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
            >
              {contactFormCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="analytics">Analytics Content</TabsContent>
      <TabsContent value="users">Users Content</TabsContent>
      <TabsContent value="events">Events Content</TabsContent>
      <TabsContent value="vendors">Vendors Content</TabsContent>
      <TabsContent value="moderation">Moderation Content</TabsContent>
      <TabsContent value="contact">Contact Content</TabsContent>
    </Tabs>
  );
};

describe('Admin Tabs - Tab Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all admin tabs', () => {
    render(<AdminTabsTest />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /events/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /vendors/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /moderation/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /contact/i })).toBeInTheDocument();
  });

  it('displays default active tab', () => {
    render(<AdminTabsTest />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Users Content')).toBeVisible();
  });

  it('switches tabs on click', async () => {
    const user = userEvent.setup();
    render(<AdminTabsTest />, { wrapper: createWrapper() });
    
    const analyticsTab = screen.getByRole('tab', { name: /analytics/i });
    await user.click(analyticsTab);
    
    await waitFor(() => {
      expect(screen.getByText('Analytics Content')).toBeVisible();
    });
  });

  it('hides previous tab content when switching', async () => {
    const user = userEvent.setup();
    render(<AdminTabsTest />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Users Content')).toBeVisible();
    
    const eventsTab = screen.getByRole('tab', { name: /events/i });
    await user.click(eventsTab);
    
    await waitFor(() => {
      expect(screen.queryByText('Users Content')).not.toBeVisible();
      expect(screen.getByText('Events Content')).toBeVisible();
    });
  });

  it('allows multiple tab switches', async () => {
    const user = userEvent.setup();
    render(<AdminTabsTest />, { wrapper: createWrapper() });
    
    await user.click(screen.getByRole('tab', { name: /analytics/i }));
    expect(screen.getByText('Analytics Content')).toBeVisible();
    
    await user.click(screen.getByRole('tab', { name: /vendors/i }));
    expect(screen.getByText('Vendors Content')).toBeVisible();
    
    await user.click(screen.getByRole('tab', { name: /contact/i }));
    expect(screen.getByText('Contact Content')).toBeVisible();
  });
});

describe('Admin Tabs - Badge Counts', () => {
  it('displays vendors badge when pending vendors exist', () => {
    render(<AdminTabsTest />, { wrapper: createWrapper() });
    
    const vendorsTab = screen.getByRole('tab', { name: /vendors/i });
    expect(vendorsTab).toHaveTextContent('3');
  });

  it('displays moderation badge with combined count', () => {
    render(<AdminTabsTest />, { wrapper: createWrapper() });
    
    const moderationTab = screen.getByRole('tab', { name: /moderation/i });
    expect(moderationTab).toHaveTextContent('7'); // 5 + 2
  });

  it('displays contact badge when submissions exist', () => {
    render(<AdminTabsTest />, { wrapper: createWrapper() });
    
    const contactTab = screen.getByRole('tab', { name: /contact/i });
    expect(contactTab).toHaveTextContent('7');
  });

  it('uses destructive variant for badges', () => {
    render(<AdminTabsTest />, { wrapper: createWrapper() });
    
    const badges = screen.getAllByText('3')[0].closest('.bg-destructive');
    expect(badges).toBeInTheDocument();
  });

  it('displays correct badge counts for each tab', () => {
    render(<AdminTabsTest />, { wrapper: createWrapper() });
    
    const vendorsBadge = screen.getByRole('tab', { name: /vendors/i });
    expect(vendorsBadge).toHaveTextContent('3');
    
    const moderationBadge = screen.getByRole('tab', { name: /moderation/i });
    expect(moderationBadge).toHaveTextContent('7');
    
    const contactBadge = screen.getByRole('tab', { name: /contact/i });
    expect(contactBadge).toHaveTextContent('7');
  });
});

describe('Admin Tabs - Tab Content Loading', () => {
  it('loads tab content immediately on mount', () => {
    render(<AdminTabsTest />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Users Content')).toBeVisible();
  });

  it('loads content when switching to new tab', async () => {
    const user = userEvent.setup();
    render(<AdminTabsTest />, { wrapper: createWrapper() });
    
    await user.click(screen.getByRole('tab', { name: /moderation/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Moderation Content')).toBeVisible();
    });
  });

  it('maintains content after switching away and back', async () => {
    const user = userEvent.setup();
    render(<AdminTabsTest />, { wrapper: createWrapper() });
    
    await user.click(screen.getByRole('tab', { name: /events/i }));
    expect(screen.getByText('Events Content')).toBeVisible();
    
    await user.click(screen.getByRole('tab', { name: /users/i }));
    expect(screen.getByText('Users Content')).toBeVisible();
    
    await user.click(screen.getByRole('tab', { name: /events/i }));
    expect(screen.getByText('Events Content')).toBeVisible();
  });

  it('handles rapid tab switching', async () => {
    const user = userEvent.setup();
    render(<AdminTabsTest />, { wrapper: createWrapper() });
    
    await user.click(screen.getByRole('tab', { name: /analytics/i }));
    await user.click(screen.getByRole('tab', { name: /vendors/i }));
    await user.click(screen.getByRole('tab', { name: /moderation/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Moderation Content')).toBeVisible();
    });
  });

  it('renders tab content only for active tab', () => {
    render(<AdminTabsTest />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Users Content')).toBeVisible();
    expect(screen.queryByText('Analytics Content')).not.toBeVisible();
    expect(screen.queryByText('Events Content')).not.toBeVisible();
  });
});
