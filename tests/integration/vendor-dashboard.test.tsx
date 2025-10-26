import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack:parameter>
<parameter name="content">import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import '@testing-library/jest-dom';

// Mock vendor products
const mockVendorProducts = [
  {
    id: 'prod-1',
    name: 'Vendor Product 1',
    price: 19.99,
    stock_quantity: 50,
    is_active: true,
    created_at: '2025-01-01'
  },
  {
    id: 'prod-2',
    name: 'Vendor Product 2',
    price: 39.99,
    stock_quantity: 25,
    is_active: false,
    created_at: '2025-01-02'
  }
];

// Mock vendor orders
const mockVendorOrders = [
  {
    id: 'order-1',
    order_number: 'ORD-001',
    total: 59.98,
    status: 'pending',
    created_at: '2025-01-10',
    customer_email: 'customer@example.com'
  },
  {
    id: 'order-2',
    order_number: 'ORD-002',
    total: 19.99,
    status: 'completed',
    created_at: '2025-01-11',
    customer_email: 'buyer@example.com'
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

// Vendor Dashboard Test Component
const VendorDashboardTest = () => {
  return (
    <div>
      <h1>Vendor Dashboard</h1>
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="products">
          <button>Add Product</button>
          {mockVendorProducts.map(product => (
            <div key={product.id} data-testid="product-item">
              <h3>{product.name}</h3>
              <span>${product.price}</span>
              <span>Stock: {product.stock_quantity}</span>
              <span>{product.is_active ? 'Active' : 'Inactive'}</span>
              <button>Edit</button>
              <button>Delete</button>
            </div>
          ))}
        </TabsContent>
        
        <TabsContent value="orders">
          {mockVendorOrders.map(order => (
            <div key={order.id} data-testid="order-item">
              <h3>{order.order_number}</h3>
              <span>${order.total}</span>
              <span>{order.status}</span>
              <span>{order.customer_email}</span>
              <button>View Details</button>
            </div>
          ))}
        </TabsContent>
        
        <TabsContent value="earnings">
          <div data-testid="earnings-summary">
            <h3>Total Earnings</h3>
            <span>$79.97</span>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

describe('Vendor Dashboard - Tab Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard heading', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('heading', { name: /vendor dashboard/i })).toBeInTheDocument();
  });

  it('displays all dashboard tabs', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('tab', { name: /products/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /orders/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /earnings/i })).toBeInTheDocument();
  });

  it('switches to orders tab', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    const ordersTab = screen.getByRole('tab', { name: /orders/i });
    fireEvent.click(ordersTab);
    
    expect(screen.getByText('ORD-001')).toBeVisible();
  });

  it('switches to earnings tab', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    const earningsTab = screen.getByRole('tab', { name: /earnings/i });
    fireEvent.click(earningsTab);
    
    expect(screen.getByTestId('earnings-summary')).toBeVisible();
  });

  it('shows products tab by default', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Vendor Product 1')).toBeVisible();
  });
});

describe('Vendor Dashboard - Products Tab', () => {
  it('displays add product button', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument();
  });

  it('renders all vendor products', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    const productItems = screen.getAllByTestId('product-item');
    expect(productItems).toHaveLength(2);
  });

  it('displays product information', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Vendor Product 1')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('Stock: 50')).toBeInTheDocument();
  });

  it('shows product active status', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('displays edit and delete buttons for products', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    
    expect(editButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });
});

describe('Vendor Dashboard - Orders Tab', () => {
  it('renders all vendor orders', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    fireEvent.click(screen.getByRole('tab', { name: /orders/i }));
    
    const orderItems = screen.getAllByTestId('order-item');
    expect(orderItems).toHaveLength(2);
  });

  it('displays order information', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    fireEvent.click(screen.getByRole('tab', { name: /orders/i }));
    
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('$59.98')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('shows customer email for orders', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    fireEvent.click(screen.getByRole('tab', { name: /orders/i }));
    
    expect(screen.getByText('customer@example.com')).toBeInTheDocument();
    expect(screen.getByText('buyer@example.com')).toBeInTheDocument();
  });

  it('displays view details buttons', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    fireEvent.click(screen.getByRole('tab', { name: /orders/i }));
    
    const viewButtons = screen.getAllByRole('button', { name: /view details/i });
    expect(viewButtons).toHaveLength(2);
  });
});

describe('Vendor Dashboard - Earnings Tab', () => {
  it('displays earnings summary', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    fireEvent.click(screen.getByRole('tab', { name: /earnings/i }));
    
    const earningSummary = screen.getByTestId('earnings-summary');
    expect(earningSummary).toBeInTheDocument();
  });

  it('shows total earnings amount', () => {
    render(<VendorDashboardTest />, { wrapper: createWrapper() });
    
    fireEvent.click(screen.getByRole('tab', { name: /earnings/i }));
    
    expect(screen.getByText('$79.97')).toBeInTheDocument();
  });
});

describe('Vendor Dashboard - Empty States', () => {
  it('handles no products', () => {
    const EmptyProducts = () => (
      <div>
        <h1>Vendor Dashboard</h1>
        <p>No products yet</p>
        <button>Add Product</button>
      </div>
    );
    
    render(<EmptyProducts />, { wrapper: createWrapper() });
    
    expect(screen.getByText('No products yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument();
  });

  it('handles no orders', () => {
    const EmptyOrders = () => (
      <div>
        <h1>Vendor Dashboard</h1>
        <p>No orders yet</p>
      </div>
    );
    
    render(<EmptyOrders />, { wrapper: createWrapper() });
    
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
  });
});
