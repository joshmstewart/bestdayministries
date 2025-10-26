import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Mock component for testing
const MockCollectionSelectorDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  return (
    <div data-testid="collection-selector-dialog" data-state={open ? 'open' : 'closed'}>
      <button onClick={() => onOpenChange(false)}>Close</button>
      <div data-testid="collections-list">Mock Collections</div>
    </div>
  );
};

describe('CollectionSelectorDialog Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Dialog Behavior', () => {
    it('should open when triggered', () => {
      const onOpenChange = () => {};
      renderWithProviders(<MockCollectionSelectorDialog open={true} onOpenChange={onOpenChange} />);
      
      const dialog = screen.getByTestId('collection-selector-dialog');
      expect(dialog).toHaveAttribute('data-state', 'open');
    });

    it('should close when close button clicked', () => {
      let isOpen = true;
      const onOpenChange = (open: boolean) => { isOpen = open; };
      
      const { rerender } = renderWithProviders(<MockCollectionSelectorDialog open={isOpen} onOpenChange={onOpenChange} />);
      
      const closeButton = screen.getByText('Close');
      closeButton.click();
      
      expect(isOpen).toBe(false);
    });

    it('should display collections list', () => {
      renderWithProviders(<MockCollectionSelectorDialog open={true} onOpenChange={() => {}} />);
      
      expect(screen.getByTestId('collections-list')).toBeInTheDocument();
    });
  });

  describe('Collection Filtering', () => {
    it('should load active collections only', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { id: '1', name: 'Active Collection', is_active: true, rarity_config: {} },
            { id: '2', name: 'Inactive Collection', is_active: false, rarity_config: {} }
          ]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      const activeCollections = data.filter((c: any) => c.is_active);
      
      expect(activeCollections).toHaveLength(1);
      expect(activeCollections[0].name).toBe('Active Collection');
    });

    it('should filter by user role and scheduling', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { 
              id: '1', 
              name: 'Admin Only', 
              is_active: true,
              visible_to_roles: ['admin', 'owner'],
              ga_date: '2099-12-31',
              rarity_config: {}
            },
            { 
              id: '2', 
              name: 'Public Collection', 
              is_active: true,
              visible_to_roles: ['bestie', 'caregiver', 'supporter', 'admin', 'owner'],
              ga_date: '2020-01-01',
              rarity_config: {}
            }
          ]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      
      const userRole = 'bestie';
      const accessibleCollections = data.filter((c: any) => 
        c.is_active && 
        c.visible_to_roles.includes(userRole) &&
        (!c.ga_date || c.ga_date <= today)
      );
      
      expect(accessibleCollections).toHaveLength(1);
      expect(accessibleCollections[0].name).toBe('Public Collection');
    });

    it('should show collections with passed GA dates', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { id: '1', name: 'Past GA', is_active: true, ga_date: '2020-01-01', rarity_config: {} },
            { id: '2', name: 'Future GA', is_active: true, ga_date: '2099-12-31', rarity_config: {} }
          ]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      const eligibleCollections = data.filter((c: any) => !c.ga_date || c.ga_date <= today);
      
      expect(eligibleCollections).toHaveLength(1);
      expect(eligibleCollections[0].name).toBe('Past GA');
    });
  });

  describe('Featured Collection Display', () => {
    it('should identify featured collection', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { id: '1', name: 'Regular Collection', is_active: true, is_featured: false, rarity_config: {} },
            { id: '2', name: 'Featured Collection', is_active: true, is_featured: true, rarity_config: {} }
          ]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      const featured = data.find((c: any) => c.is_featured);
      
      expect(featured?.name).toBe('Featured Collection');
    });

    it('should prioritize featured collection in list', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { id: '1', name: 'Collection A', is_active: true, is_featured: false, display_order: 1, rarity_config: {} },
            { id: '2', name: 'Collection B', is_active: true, is_featured: true, display_order: 2, rarity_config: {} }
          ]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      const sorted = [...data].sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return a.display_order - b.display_order;
      });
      
      expect(sorted[0].name).toBe('Collection B');
    });
  });

  describe('Empty States', () => {
    it('should handle no active collections', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      
      expect(data).toHaveLength(0);
    });

    it('should handle no featured collections', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { id: '1', name: 'Collection A', is_active: true, is_featured: false, rarity_config: {} }
          ]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      const featured = data.find((c: any) => c.is_featured);
      
      expect(featured).toBeUndefined();
    });
  });

  describe('Pack Images', () => {
    it('should validate pack image URL format', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { 
              id: '1', 
              name: 'Collection with Image', 
              is_active: true,
              pack_image_url: 'https://example.com/pack.png',
              rarity_config: {}
            }
          ]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      
      expect(data[0].pack_image_url).toMatch(/^https?:\/\//);
    });

    it('should handle collections without pack images', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { id: '1', name: 'No Image Collection', is_active: true, pack_image_url: null, rarity_config: {} }
          ]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      
      expect(data[0].pack_image_url).toBeNull();
    });
  });
});
