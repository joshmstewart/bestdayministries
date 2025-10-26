import { vi } from 'vitest';

// Comprehensive Supabase mock with all auth methods
const mockAuth = {
  getSession: vi.fn(() => Promise.resolve({ 
    data: { session: null }, 
    error: null 
  })),
  getUser: vi.fn(() => Promise.resolve({ 
    data: { user: null }, 
    error: null 
  })),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } }
  }))
};

// Flexible query chain builder that supports multiple .eq() calls
const createQueryChain = (data: any = [], error: any = null) => {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve({ data, error })),
    single: vi.fn(() => Promise.resolve({ data: data[0] || null, error })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: data[0] || null, error })),
    then: vi.fn((cb) => cb({ data, error }))
  };
  return chain;
};

const mockFrom = vi.fn((table: string) => createQueryChain());

// Mock the entire Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: mockAuth
  }
}));

export { mockAuth, mockFrom, createQueryChain };
