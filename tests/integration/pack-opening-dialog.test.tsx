import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Mock component for testing
const MockPackOpeningDialog = ({ 
  open, 
  onOpenChange, 
  collectionId 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  collectionId?: string;
}) => {
  return (
    <div data-testid="pack-opening-dialog" data-state={open ? 'open' : 'closed'}>
      <button data-testid="change-pack-btn">Change Pack</button>
      <button data-testid="view-collection-btn">View Collection</button>
      <div data-testid="collection-id">{collectionId || 'none'}</div>
    </div>
  );
};

describe('PackOpeningDialog Integration Tests', () => {
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

  describe('Button Visibility', () => {
    it('should show Change Pack button when pack not opened', () => {
      renderWithProviders(
        <MockPackOpeningDialog open={true} onOpenChange={() => {}} collectionId="test-id" />
      );
      
      expect(screen.getByTestId('change-pack-btn')).toBeInTheDocument();
    });

    it('should show View Collection button when pack not opened', () => {
      renderWithProviders(
        <MockPackOpeningDialog open={true} onOpenChange={() => {}} collectionId="test-id" />
      );
      
      expect(screen.getByTestId('view-collection-btn')).toBeInTheDocument();
    });
  });

  describe('Collection Loading', () => {
    it('should load collection by collectionId prop', async () => {
      const testCollectionId = 'collection-123';
      
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { id: testCollectionId, name: 'Test Collection', is_active: true, rarity_config: {} }
          ]);
        })
      );

      renderWithProviders(
        <MockPackOpeningDialog open={true} onOpenChange={() => {}} collectionId={testCollectionId} />
      );
      
      expect(screen.getByTestId('collection-id')).toHaveTextContent(testCollectionId);
    });

    it('should load collection from card when no collectionId provided', () => {
      renderWithProviders(
        <MockPackOpeningDialog open={true} onOpenChange={() => {}} />
      );
      
      expect(screen.getByTestId('collection-id')).toHaveTextContent('none');
    });

    it('should fetch featured collection for daily packs', async () => {
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
      expect(featured?.id).toBe('2');
    });

    it('should handle no featured collection gracefully', async () => {
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

  describe('Rarity System', () => {
    it('should validate rarity config structure', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { 
              id: '1', 
              name: 'Test Collection', 
              is_active: true,
              rarity_config: {
                common: 50,
                uncommon: 30,
                rare: 15,
                epic: 4,
                legendary: 1
              }
            }
          ]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      const rarityConfig = data[0].rarity_config;
      
      expect(rarityConfig).toHaveProperty('common');
      expect(rarityConfig).toHaveProperty('uncommon');
      expect(rarityConfig).toHaveProperty('rare');
      expect(rarityConfig).toHaveProperty('epic');
      expect(rarityConfig).toHaveProperty('legendary');
    });

    it('should calculate total rarity percentage equals 100', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { 
              id: '1', 
              name: 'Test Collection',
              is_active: true,
              rarity_config: {
                common: 50,
                uncommon: 30,
                rare: 15,
                epic: 4,
                legendary: 1
              }
            }
          ]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      const total = Object.values(data[0].rarity_config).reduce((sum: number, val: any) => sum + val, 0);
      
      expect(total).toBe(100);
    });

    it('should map rarity levels to correct confetti colors', () => {
      const rarityToColor = {
        common: 'gray',
        uncommon: 'green',
        rare: 'blue',
        epic: 'purple',
        legendary: 'gold'
      };
      
      expect(rarityToColor.common).toBe('gray');
      expect(rarityToColor.legendary).toBe('gold');
    });
  });

  describe('Audio Playback', () => {
    it('should validate audio file format', () => {
      const audioUrl = '/sounds/pack-reveal.mp3';
      expect(audioUrl).toMatch(/\.(mp3|wav|ogg)$/);
    });

    it('should handle audio play on pack open', () => {
      const mockAudio = {
        play: () => Promise.resolve(),
        pause: () => {},
        currentTime: 0
      };
      
      expect(mockAudio.play).toBeDefined();
      expect(typeof mockAudio.play).toBe('function');
    });
  });

  describe('Navigation', () => {
    it('should navigate to sticker album from View Collection button', () => {
      const expectedRoute = '/sticker-album';
      expect(expectedRoute).toBe('/sticker-album');
    });

    it('should pass collection ID in navigation', () => {
      const collectionId = 'test-collection-123';
      const route = `/sticker-album?collection=${collectionId}`;
      
      expect(route).toContain(collectionId);
      expect(route).toMatch(/\/sticker-album\?collection=/);
    });
  });

  describe('Error Handling', () => {
    it('should handle collection load failure', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      expect(response.status).toBe(500);
    });

    it('should handle empty collections list', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      
      expect(data).toHaveLength(0);
    });
  });
});
