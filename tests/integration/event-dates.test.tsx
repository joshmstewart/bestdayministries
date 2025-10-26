import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PublicEvents } from '@/components/PublicEvents';
import { format } from 'date-fns';

// Mock Supabase with diagnostic logging
vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        console.log('[MOCK] from() called with table:', table);
        
        // Default: user_roles returns null (no user logged in)
        if (table === 'user_roles') {
          return {
            select: vi.fn((columns) => {
              console.log('[MOCK] user_roles select() called with:', columns);
              return {
                eq: vi.fn((column, value) => {
                  console.log('[MOCK] user_roles eq() called with:', column, '=', value);
                  return {
                    maybeSingle: vi.fn(() => {
                      console.log('[MOCK] user_roles maybeSingle() called, returning null');
                      return Promise.resolve({ data: null, error: null });
                    })
                  };
                })
              };
            })
          };
        }
        
        // Default: events returns empty array with double .eq() chain
        if (table === 'events') {
          return {
            select: vi.fn((columns) => {
              console.log('[MOCK] events select() called with:', columns);
              return {
                eq: vi.fn((column, value) => {
                  console.log('[MOCK] events first eq() called with:', column, '=', value);
                  return {
                    eq: vi.fn((column2, value2) => {
                      console.log('[MOCK] events second eq() called with:', column2, '=', value2);
                      return {
                        order: vi.fn((orderCol, options) => {
                          console.log('[MOCK] events order() called with:', orderCol, options);
                          console.log('[MOCK] Returning empty array');
                          return Promise.resolve({ data: [], error: null });
                        })
                      };
                    })
                  };
                })
              };
            })
          };
        }
        
        // Fallback
        return {
          select: vi.fn(() => Promise.resolve({ data: [], error: null }))
        };
      }),
      auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null }))
      }
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
  it('DIAGNOSTIC: verifies mock chain supports double .eq() call', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    console.log('[DIAGNOSTIC] Testing mock chain structure...');
    
    // Call the mock exactly how the component does
    const chain = supabase
      .from('events')
      .select('*')
      .eq('is_public', true)
      .eq('is_active', true);
    
    // Verify each step returns an object with the next method
    expect(chain).toHaveProperty('order');
    expect(typeof chain.order).toBe('function');
    console.log('[DIAGNOSTIC] Mock chain has order method ✓');
    
    // Call order and verify it returns a promise
    const result = chain.order('event_date', { ascending: true });
    expect(result).toBeInstanceOf(Promise);
    console.log('[DIAGNOSTIC] order() returns Promise ✓');
    
    // Verify the promise resolves
    const { data, error } = await result;
    console.log('[DIAGNOSTIC] Promise resolved with:', { data, error });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    console.log('[DIAGNOSTIC] Mock chain verification PASSED ✓');
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Reset to default mock behavior with double .eq() chain
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        } as any;
      }
      if (table === 'events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        } as any;
      }
      return {
        select: vi.fn(() => Promise.resolve({ data: [], error: null }))
      } as any;
    });
    
    // Reset auth mocks
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null } as any);
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any);
  });

  it('displays single date event correctly', async () => {
    const eventDate = new Date(Date.now() + 86400000); // Tomorrow
    const callSequence: string[] = [];
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      callSequence.push(`from(${table})`);
      
      if (table === 'user_roles') {
        return {
          select: vi.fn(() => {
            callSequence.push('user_roles:select()');
            return {
              eq: vi.fn(() => {
                callSequence.push('user_roles:eq()');
                return {
                  maybeSingle: vi.fn(() => {
                    callSequence.push('user_roles:maybeSingle()');
                    return Promise.resolve({ data: null, error: null });
                  })
                };
              })
            };
          })
        } as any;
      }
      if (table === 'events') {
        return {
          select: vi.fn(() => {
            callSequence.push('events:select()');
            return {
              eq: vi.fn((col, val) => {
                callSequence.push(`events:eq(${col})`);
                return {
                  eq: vi.fn((col2, val2) => {
                    callSequence.push(`events:eq(${col2})`);
                    return {
                      order: vi.fn(() => {
                        callSequence.push('events:order()');
                        return Promise.resolve({
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
                        });
                      })
                    };
                  })
                };
              })
            };
          })
        } as any;
      }
      return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) } as any;
    });

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      const eventElement = screen.queryByText('Single Date Event');
      const loadingElement = screen.queryByText('Loading events...');
      
      if (!eventElement && loadingElement) {
        console.error('[TEST FAILURE] Still loading! Call sequence:', callSequence);
        console.error('[TEST FAILURE] Mock calls:', vi.mocked(supabase.from).mock.calls);
      }
      
      expect(eventElement).toBeInTheDocument();
    }, { timeout: 5000 });
    
    console.log('[TEST SUCCESS] Call sequence:', callSequence);
  });

  it('displays upcoming events only', async () => {
    const futureDate = new Date(Date.now() + 86400000);
    const pastDate = new Date(Date.now() - 86400000);
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        };
      }
      if (table === 'events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
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
          }))
        } as any;
      }
      return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) } as any;
    });

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Future Event')).toBeInTheDocument();
      expect(screen.queryByText('Past Event')).not.toBeInTheDocument();
    });
  });

  it('formats date correctly', async () => {
    const eventDate = new Date('2025-12-25T15:30:00');
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        };
      }
      if (table === 'events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
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
          }))
        } as any;
      }
      return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) } as any;
    });

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Date should be formatted as "PPPP" to match component output (includes ordinal suffixes)
      const formattedDate = format(eventDate, 'PPPP');
      expect(screen.getByText(new RegExp(formattedDate))).toBeInTheDocument();
    });
  });

  it('displays time correctly', async () => {
    const eventDate = new Date('2025-12-25T15:30:00');
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        };
      }
      if (table === 'events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
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
          }))
        } as any;
      }
      return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) } as any;
    });

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Time should be formatted as "h:mm a"
      const formattedTime = format(eventDate, 'h:mm a');
      expect(screen.getByText(new RegExp(formattedTime))).toBeInTheDocument();
    });
  });

  it('sorts events by date ascending', async () => {
    const date1 = new Date(Date.now() + 172800000); // 2 days from now
    const date2 = new Date(Date.now() + 86400000); // 1 day from now
    const date3 = new Date(Date.now() + 259200000); // 3 days from now
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        };
      }
      if (table === 'events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
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
          }))
        } as any;
      }
      return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) } as any;
    });

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
    const date1 = new Date(Date.now() + 86400000);
    const date2 = new Date(Date.now() + 172800000);
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        };
      }
      if (table === 'events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
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
          }))
        } as any;
      }
      return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) } as any;
    });

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Should show the event for both dates
      const events = screen.getAllByText('Weekly Class');
      expect(events.length).toBe(2);
    });
  });

  it('displays clock icon for time', async () => {
    const eventDate = new Date(Date.now() + 86400000);
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        };
      }
      if (table === 'events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
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
          }))
        } as any;
      }
      return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) } as any;
    });

    const { container } = render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Scheduled Event')).toBeInTheDocument();
    });

    // Check for Clock icon from lucide-react
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('handles events with no specific time', async () => {
    const eventDate = new Date('2025-12-25T00:00:00');
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        };
      }
      if (table === 'events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
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
          }))
        } as any;
      }
      return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) } as any;
    });

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('All Day Event')).toBeInTheDocument();
    });
  });

  it('handles timezone conversions correctly', async () => {
    // ISO string in UTC
    const utcDate = '2025-12-25T20:00:00Z';
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        };
      }
      if (table === 'events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
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
          }))
        } as any;
      }
      return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) } as any;
    });

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('UTC Event')).toBeInTheDocument();
    });

    // Date-fns format handles local timezone conversion automatically
    const localDate = new Date(utcDate);
    const formattedDate = format(localDate, 'PPPP');
    expect(screen.getByText(new RegExp(formattedDate))).toBeInTheDocument();
  });

  it('groups multiple dates for same event', async () => {
    const dates = [
      new Date(Date.now() + 86400000),
      new Date(Date.now() + 172800000),
      new Date(Date.now() + 259200000)
    ];
    
    const { supabase } = await import('@/integrations/supabase/client');
    
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'user_roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        };
      }
      if (table === 'events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
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
          }))
        } as any;
      }
      return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) } as any;
    });

    render(<PublicEvents />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Component creates separate card for each date
      const events = screen.getAllByText('Multi-Date Event');
      expect(events.length).toBe(3);
    });
  });
});
