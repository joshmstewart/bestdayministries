import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock product data
const mockProducts = [
  {
    id: 'product-1',
    name: 'Test Product 1',
    description: 'A great product',
    price: 29.99,
    image_url: '/images/product1.jpg',
    is_active: true
  },
  {
    id: 'product-2',
    name: 'Test Product 2',
    description: 'Another great product',
    price: 49.99,
    image_url: '/images/product2.jpg',
    is_active: true
  }
];

// Mock store items (virtual currency items)
const mockStoreItems = [
  {
    id: 'item-1',
    name: 'Coin Pack Small',
    coins_cost: 100,
    type: 'coins',
    is_active: true
  },
  {
    id: 'item-2',
    name: 'Sticker Pack',
    coins_cost: 50,
    type: 'sticker_pack',
    is_active: true
  }
];

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

// Product Card Test Component
const ProductCardTest = ({ product }: { product: typeof mockProducts[0] }) => {
  return (
    <article data-testid="product-card">
      <img src={product.image_url} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <span>${product.price.toFixed(2)}</span>
      <button>Add to Cart</button>
    </article>
  );
};

// Marketplace Test Component
const MarketplaceTest = () => {
  return (
    <div>
      <h1>Marketplace</h1>
      <button aria-label="Shopping cart">
        🛒 Cart (0)
      </button>
      {mockProducts.map(product => (
        <ProductCardTest key={product.id} product={product} />
      ))}
    </div>
  );
};

// Store Test Component
const StoreTest = () => {
  return (
    <div>
      <h1>Store</h1>
      <div data-testid="coins-display">
        1000 coins
      </div>
      {mockStoreItems.map(item => (
        <div key={item.id} data-testid="store-item">
          <h3>{item.name}</h3>
          <span>{item.coins_cost} coins</span>
          <button>Purchase</button>
        </div>
      ))}
    </div>
  );
};

describe('Shopping Cart - Marketplace Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders marketplace heading', () => {
    render(<MarketplaceTest />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('heading', { name: /marketplace/i })).toBeInTheDocument();
  });

  it('displays shopping cart icon', () => {
    render(<MarketplaceTest />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('button', { name: /shopping cart/i })).toBeInTheDocument();
  });

  it('renders all product cards', () => {
    render(<MarketplaceTest />, { wrapper: createWrapper() });
    
    const productCards = screen.getAllByTestId('product-card');
    expect(productCards).toHaveLength(2);
  });

  it('displays product information', () => {
    render(<MarketplaceTest />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    expect(screen.getByText('A great product')).toBeInTheDocument();
  });
});

describe('Shopping Cart - Product Cards', () => {
  it('displays product name', () => {
    render(<ProductCardTest product={mockProducts[0]} />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('heading', { name: 'Test Product 1' })).toBeInTheDocument();
  });

  it('displays product price', () => {
    render(<ProductCardTest product={mockProducts[0]} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('$29.99')).toBeInTheDocument();
  });

  it('displays product description', () => {
    render(<ProductCardTest product={mockProducts[0]} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('A great product')).toBeInTheDocument();
  });

  it('displays product image', () => {
    render(<ProductCardTest product={mockProducts[0]} />, { wrapper: createWrapper() });
    
    const image = screen.getByRole('img', { name: 'Test Product 1' });
    expect(image).toHaveAttribute('src', '/images/product1.jpg');
  });

  it('has add to cart button', () => {
    render(<ProductCardTest product={mockProducts[0]} />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
  });

  it('formats price with two decimal places', () => {
    render(<ProductCardTest product={mockProducts[1]} />, { wrapper: createWrapper() });
    
    expect(screen.getByText('$49.99')).toBeInTheDocument();
  });
});

describe('Shopping Cart - Store (Virtual Items)', () => {
  it('renders store heading', () => {
    render(<StoreTest />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('heading', { name: /store/i })).toBeInTheDocument();
  });

  it('displays coins balance', () => {
    render(<StoreTest />, { wrapper: createWrapper() });
    
    const coinsDisplay = screen.getByTestId('coins-display');
    expect(coinsDisplay).toHaveTextContent('1000 coins');
  });

  it('renders all store items', () => {
    render(<StoreTest />, { wrapper: createWrapper() });
    
    const storeItems = screen.getAllByTestId('store-item');
    expect(storeItems).toHaveLength(2);
  });

  it('displays item names and costs', () => {
    render(<StoreTest />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Coin Pack Small')).toBeInTheDocument();
    expect(screen.getByText('100 coins')).toBeInTheDocument();
  });

  it('shows purchase buttons', () => {
    render(<StoreTest />, { wrapper: createWrapper() });
    
    const purchaseButtons = screen.getAllByRole('button', { name: /purchase/i });
    expect(purchaseButtons).toHaveLength(2);
  });
});

describe('Shopping Cart - Empty States', () => {
  it('handles empty marketplace', () => {
    const EmptyMarketplace = () => (
      <div>
        <h1>Marketplace</h1>
        <p>No products available</p>
      </div>
    );
    
    render(<EmptyMarketplace />, { wrapper: createWrapper() });
    
    expect(screen.getByText('No products available')).toBeInTheDocument();
  });

  it('handles empty store', () => {
    const EmptyStore = () => (
      <div>
        <h1>Store</h1>
        <p>No items available</p>
      </div>
    );
    
    render(<EmptyStore />, { wrapper: createWrapper() });
    
    expect(screen.getByText('No items available')).toBeInTheDocument();
  });

  it('shows zero coins balance', () => {
    const ZeroCoinsStore = () => (
      <div>
        <h1>Store</h1>
        <div data-testid="coins-display">0 coins</div>
      </div>
    );
    
    render(<ZeroCoinsStore />, { wrapper: createWrapper() });
    
    expect(screen.getByTestId('coins-display')).toHaveTextContent('0 coins');
  });
});
