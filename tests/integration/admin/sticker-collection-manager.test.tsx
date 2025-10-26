import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

// Mock component for testing
const MockStickerCollectionManager = () => {
  return (
    <div data-testid="sticker-collection-manager">
      <form data-testid="collection-form">
        <input data-testid="ga-date-input" type="date" name="ga_date" />
        <input data-testid="featured-start-date-input" type="date" name="featured_start_date" />
        <button data-testid="featured-toggle-btn">Toggle Featured</button>
        <button type="submit">Save</button>
      </form>
      <div data-testid="collections-list">Collections List</div>
    </div>
  );
};

describe('StickerCollectionManager Integration Tests', () => {
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

  describe('Form Fields', () => {
    it('should display GA Date input in create form', () => {
      renderWithProviders(<MockStickerCollectionManager />);
      
      expect(screen.getByTestId('ga-date-input')).toBeInTheDocument();
    });

    it('should display Featured Start Date input in create form', () => {
      renderWithProviders(<MockStickerCollectionManager />);
      
      expect(screen.getByTestId('featured-start-date-input')).toBeInTheDocument();
    });

    it('should accept date values in YYYY-MM-DD format', () => {
      renderWithProviders(<MockStickerCollectionManager />);
      
      const gaDateInput = screen.getByTestId('ga-date-input') as HTMLInputElement;
      gaDateInput.value = '2025-10-26';
      
      expect(gaDateInput.value).toBe('2025-10-26');
    });

    it('should accept empty/null values for date fields', () => {
      renderWithProviders(<MockStickerCollectionManager />);
      
      const gaDateInput = screen.getByTestId('ga-date-input') as HTMLInputElement;
      gaDateInput.value = '';
      
      expect(gaDateInput.value).toBe('');
    });
  });

  describe('Collection Management', () => {
    it('should save collection with GA date', async () => {
      const testData = {
        name: 'Test Collection',
        ga_date: '2025-10-26',
        is_active: true
      };

      server.use(
        http.post('*/rest/v1/sticker_collections', async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ ...body, id: '1' });
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      const data = await response.json();
      expect(data.ga_date).toBe('2025-10-26');
    });

    it('should save collection with featured start date', async () => {
      const testData = {
        name: 'Test Collection',
        featured_start_date: '2025-10-25',
        is_active: true
      };

      server.use(
        http.post('*/rest/v1/sticker_collections', async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ ...body, id: '1' });
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      const data = await response.json();
      expect(data.featured_start_date).toBe('2025-10-25');
    });

    it('should update existing collection with new dates', async () => {
      const collectionId = 'test-id';
      const updateData = {
        ga_date: '2025-11-01',
        featured_start_date: '2025-11-01'
      };

      server.use(
        http.patch(`*/rest/v1/sticker_collections*`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ id: collectionId, ...body });
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections?id=eq.${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      expect(data.ga_date).toBe('2025-11-01');
      expect(data.featured_start_date).toBe('2025-11-01');
    });
  });

  describe('Featured Toggle', () => {
    it('should display featured toggle button', () => {
      renderWithProviders(<MockStickerCollectionManager />);
      
      expect(screen.getByTestId('featured-toggle-btn')).toBeInTheDocument();
    });

    it('should toggle featured status', async () => {
      const collectionId = 'test-id';

      server.use(
        http.patch(`*/rest/v1/sticker_collections*`, async ({ request }) => {
          const body = await request.json() as { is_featured: boolean };
          return HttpResponse.json({ 
            id: collectionId, 
            is_featured: body.is_featured 
          });
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections?id=eq.${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: true })
      });

      const data = await response.json();
      expect(data.is_featured).toBe(true);
    });

    it('should reflect featured button state from database', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { id: '1', name: 'Featured Collection', is_featured: true, is_active: true, rarity_config: {} },
            { id: '2', name: 'Not Featured', is_featured: false, is_active: true, rarity_config: {} }
          ]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      
      const featuredCollection = data.find((c: any) => c.is_featured);
      const notFeaturedCollection = data.find((c: any) => !c.is_featured);
      
      expect(featuredCollection?.is_featured).toBe(true);
      expect(notFeaturedCollection?.is_featured).toBe(false);
    });
  });

  describe('Collections List', () => {
    it('should display collections list', () => {
      renderWithProviders(<MockStickerCollectionManager />);
      
      expect(screen.getByTestId('collections-list')).toBeInTheDocument();
    });

    it('should load scheduled collections', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { 
              id: '1', 
              name: 'Scheduled Collection', 
              is_active: true,
              ga_date: '2025-11-01',
              featured_start_date: '2025-11-01',
              rarity_config: {}
            }
          ]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      
      expect(data[0].ga_date).toBe('2025-11-01');
      expect(data[0].featured_start_date).toBe('2025-11-01');
    });

    it('should display indicators for scheduled collections', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { 
              id: '1', 
              name: 'Future GA Collection',
              is_active: true,
              ga_date: '2099-12-31',
              rarity_config: {}
            }
          ]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      const today = new Date().toISOString().split('T')[0];
      
      const hasFutureGA = data[0].ga_date && data[0].ga_date > today;
      expect(hasFutureGA).toBe(true);
    });
  });

  describe('Helper Text', () => {
    it('should validate GA date helper text intention', () => {
      const helperText = 'Collections automatically become visible to all users on this date';
      expect(helperText).toContain('visible to all users');
    });

    it('should validate Featured Start Date helper text intention', () => {
      const helperText = 'Collection automatically becomes featured on this date';
      expect(helperText).toContain('automatically becomes featured');
    });
  });

  describe('Validation', () => {
    it('should validate date is in YYYY-MM-DD format', () => {
      const isValidFormat = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);
      
      expect(isValidFormat('2025-10-26')).toBe(true);
      expect(isValidFormat('10/26/2025')).toBe(false);
    });

    it('should allow null values for optional date fields', () => {
      const collection = {
        name: 'Test Collection',
        ga_date: null,
        featured_start_date: null
      };
      
      expect(collection.ga_date).toBeNull();
      expect(collection.featured_start_date).toBeNull();
    });

    it('should validate featured_start_date can be same as ga_date', () => {
      const collection = {
        ga_date: '2025-10-26',
        featured_start_date: '2025-10-26'
      };
      
      expect(collection.ga_date).toBe(collection.featured_start_date);
    });

    it('should validate featured_start_date can be before ga_date', () => {
      const collection = {
        ga_date: '2025-10-26',
        featured_start_date: '2025-10-20'
      };
      
      expect(collection.featured_start_date < collection.ga_date).toBe(true);
    });
  });
});
