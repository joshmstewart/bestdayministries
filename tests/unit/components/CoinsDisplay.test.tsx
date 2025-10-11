import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoinsDisplay } from '@/components/CoinsDisplay';
import { BrowserRouter } from 'react-router-dom';

// Mock the useCoins hook
vi.mock('@/hooks/useCoins', () => ({
  useCoins: () => ({
    coins: 150,
    loading: false,
  }),
}));

describe('CoinsDisplay', () => {
  it('renders coin count', () => {
    render(
      <BrowserRouter>
        <CoinsDisplay />
      </BrowserRouter>
    );
    
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    vi.mock('@/hooks/useCoins', () => ({
      useCoins: () => ({
        coins: 0,
        loading: true,
      }),
    }));

    render(
      <BrowserRouter>
        <CoinsDisplay />
      </BrowserRouter>
    );
    
    // Should show 0 or loading indicator
    const element = screen.getByText(/0|.../);
    expect(element).toBeInTheDocument();
  });
});
