import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicEvents } from '@/components/PublicEvents';
import { format } from 'date-fns';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => {
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      }))
    }))
  }));

  const mockAuth = {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null }))
  };

  return {
    supabase: {
      from: mockFrom,
      auth: mockAuth
    }
  };
});

// Mock hooks
vi.mock('@/hooks/useRoleImpersonation', () => ({
  useRoleImpersonation: () => ({
    effectiveRole: null,
    isImpersonating: false
  })
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Event Date Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays single date event correctly', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const eventDate = new Date(Date.now() + 86400000); // Tomorrow
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [{
              id: '1',
              title: 'Single Date Event',
              description: 'One time event',
              location: 'Venue',
              image_url: '/img.jpg',
              aspect_ratio: '16:9',
              is_active: true,
              is_public: true,
              visible_to_roles: ['supporter'],
              audio_url: null,
              expires_after_date: true,
              recurrence_type: null,
              event_dates: [{ id: 'd1', event_date: eventDate.toISOString() }]
            }],
            error: null
          }))
        }))
      }))
    } as any);

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Single Date Event')).toBeInTheDocument();
    });
  });

  it('displays upcoming events only', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const futureDate = new Date(Date.now() + 86400000);
    const pastDate = new Date(Date.now() - 86400000);
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [
              {
                id: '1',
                title: 'Future Event',
                description: 'Upcoming',
                location: 'Location 1',
                image_url: '/future.jpg',
                aspect_ratio: '16:9',
                is_active: true,
                is_public: true,
                visible_to_roles: ['supporter'],
                audio_url: null,
                expires_after_date: true,
                recurrence_type: null,
                event_dates: [{ id: 'd1', event_date: futureDate.toISOString() }]
              },
              {
                id: '2',
                title: 'Past Event',
                description: 'Already happened',
                location: 'Location 2',
                image_url: '/past.jpg',
                aspect_ratio: '16:9',
                is_active: true,
                is_public: true,
                visible_to_roles: ['supporter'],
                audio_url: null,
                expires_after_date: true,
                recurrence_type: null,
                event_dates: [{ id: 'd2', event_date: pastDate.toISOString() }]
              }
            ],
            error: null
          }))
        }))
      }))
    } as any);

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Future Event')).toBeInTheDocument();
      expect(screen.queryByText('Past Event')).not.toBeInTheDocument();
    });
  });

  it('formats date correctly', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const eventDate = new Date('2025-12-25T15:30:00');
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [{
              id: '3',
              title: 'Christmas Event',
              description: 'Holiday celebration',
              location: 'Town Hall',
              image_url: '/xmas.jpg',
              aspect_ratio: '16:9',
              is_active: true,
              is_public: true,
              visible_to_roles: ['supporter'],
              audio_url: null,
              expires_after_date: true,
              recurrence_type: null,
              event_dates: [{ id: 'd3', event_date: eventDate.toISOString() }]
            }],
            error: null
          }))
        }))
      }))
    } as any);

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Date should be formatted as "EEEE, MMMM d, yyyy"
      const formattedDate = format(eventDate, 'EEEE, MMMM d, yyyy');
      expect(screen.getByText(new RegExp(formattedDate))).toBeInTheDocument();
    });
  });

  it('displays time correctly', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const eventDate = new Date('2025-12-25T15:30:00');
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [{
              id: '4',
              title: 'Timed Event',
              description: 'Specific time',
              location: 'Location',
              image_url: '/time.jpg',
              aspect_ratio: '16:9',
              is_active: true,
              is_public: true,
              visible_to_roles: ['supporter'],
              audio_url: null,
              expires_after_date: true,
              recurrence_type: null,
              event_dates: [{ id: 'd4', event_date: eventDate.toISOString() }]
            }],
            error: null
          }))
        }))
      }))
    } as any);

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Time should be formatted as "h:mm a"
      const formattedTime = format(eventDate, 'h:mm a');
      expect(screen.getByText(new RegExp(formattedTime))).toBeInTheDocument();
    });
  });

  it('sorts events by date ascending', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const date1 = new Date(Date.now() + 172800000); // 2 days from now
    const date2 = new Date(Date.now() + 86400000); // 1 day from now
    const date3 = new Date(Date.now() + 259200000); // 3 days from now
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [
              {
                id: '1',
                title: 'Event C',
                description: 'Third',
                location: 'Loc',
                image_url: '/c.jpg',
                aspect_ratio: '16:9',
                is_active: true,
                is_public: true,
                visible_to_roles: ['supporter'],
                audio_url: null,
                expires_after_date: true,
                recurrence_type: null,
                event_dates: [{ id: 'd1', event_date: date1.toISOString() }]
              },
              {
                id: '2',
                title: 'Event A',
                description: 'First',
                location: 'Loc',
                image_url: '/a.jpg',
                aspect_ratio: '16:9',
                is_active: true,
                is_public: true,
                visible_to_roles: ['supporter'],
                audio_url: null,
                expires_after_date: true,
                recurrence_type: null,
                event_dates: [{ id: 'd2', event_date: date2.toISOString() }]
              },
              {
                id: '3',
                title: 'Event B',
                description: 'Second',
                location: 'Loc',
                image_url: '/b.jpg',
                aspect_ratio: '16:9',
                is_active: true,
                is_public: true,
                visible_to_roles: ['supporter'],
                audio_url: null,
                expires_after_date: true,
                recurrence_type: null,
                event_dates: [{ id: 'd3', event_date: date3.toISOString() }]
              }
            ],
            error: null
          }))
        }))
      }))
    } as any);

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      const events = screen.getAllByText(/Event [ABC]/);
      // Should be sorted by date: A (1 day), C (2 days), B (3 days)
      expect(events[0]).toHaveTextContent('Event A');
      expect(events[1]).toHaveTextContent('Event C');
      expect(events[2]).toHaveTextContent('Event B');
    });
  });

  it('handles recurring events with multiple dates', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const date1 = new Date(Date.now() + 86400000);
    const date2 = new Date(Date.now() + 172800000);
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [{
              id: '5',
              title: 'Weekly Class',
              description: 'Every week',
              location: 'Studio',
              image_url: '/weekly.jpg',
              aspect_ratio: '16:9',
              is_active: true,
              is_public: true,
              visible_to_roles: ['supporter'],
              audio_url: null,
              expires_after_date: true,
              recurrence_type: 'weekly',
              event_dates: [
                { id: 'd1', event_date: date1.toISOString() },
                { id: 'd2', event_date: date2.toISOString() }
              ]
            }],
            error: null
          }))
        }))
      }))
    } as any);

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Should show the event for both dates
      const events = screen.getAllByText('Weekly Class');
      expect(events.length).toBe(2);
    });
  });

  it('displays clock icon for time', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const eventDate = new Date(Date.now() + 86400000);
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [{
              id: '6',
              title: 'Scheduled Event',
              description: 'With time',
              location: 'Location',
              image_url: '/scheduled.jpg',
              aspect_ratio: '16:9',
              is_active: true,
              is_public: true,
              visible_to_roles: ['supporter'],
              audio_url: null,
              expires_after_date: true,
              recurrence_type: null,
              event_dates: [{ id: 'd6', event_date: eventDate.toISOString() }]
            }],
            error: null
          }))
        }))
      }))
    } as any);

    const { container } = render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Scheduled Event')).toBeInTheDocument();
    });

    // Check for Clock icon from lucide-react
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('handles events with no specific time', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const eventDate = new Date('2025-12-25T00:00:00');
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [{
              id: '7',
              title: 'All Day Event',
              description: 'No specific time',
              location: 'Location',
              image_url: '/allday.jpg',
              aspect_ratio: '16:9',
              is_active: true,
              is_public: true,
              visible_to_roles: ['supporter'],
              audio_url: null,
              expires_after_date: true,
              recurrence_type: null,
              event_dates: [{ id: 'd7', event_date: eventDate.toISOString() }]
            }],
            error: null
          }))
        }))
      }))
    } as any);

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('All Day Event')).toBeInTheDocument();
    });
  });

  it('handles timezone conversions correctly', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    // ISO string in UTC
    const utcDate = '2025-12-25T20:00:00Z';
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [{
              id: '8',
              title: 'UTC Event',
              description: 'Timezone test',
              location: 'Location',
              image_url: '/utc.jpg',
              aspect_ratio: '16:9',
              is_active: true,
              is_public: true,
              visible_to_roles: ['supporter'],
              audio_url: null,
              expires_after_date: true,
              recurrence_type: null,
              event_dates: [{ id: 'd8', event_date: utcDate }]
            }],
            error: null
          }))
        }))
      }))
    } as any);

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('UTC Event')).toBeInTheDocument();
    });

    // Date-fns format handles local timezone conversion automatically
    const localDate = new Date(utcDate);
    const formattedDate = format(localDate, 'EEEE, MMMM d, yyyy');
    expect(screen.getByText(new RegExp(formattedDate))).toBeInTheDocument();
  });

  it('groups multiple dates for same event', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const dates = [
      new Date(Date.now() + 86400000),
      new Date(Date.now() + 172800000),
      new Date(Date.now() + 259200000)
    ];
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [{
              id: '9',
              title: 'Multi-Date Event',
              description: 'Multiple occurrences',
              location: 'Location',
              image_url: '/multi.jpg',
              aspect_ratio: '16:9',
              is_active: true,
              is_public: true,
              visible_to_roles: ['supporter'],
              audio_url: null,
              expires_after_date: true,
              recurrence_type: 'custom',
              event_dates: dates.map((d, i) => ({ id: `d${i}`, event_date: d.toISOString() }))
            }],
            error: null
          }))
        }))
      }))
    } as any);

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Component creates separate card for each date
      const events = screen.getAllByText('Multi-Date Event');
      expect(events.length).toBe(3);
    });
  });
});
