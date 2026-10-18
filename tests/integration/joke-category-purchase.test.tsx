import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JokeCategorySelector } from '@/components/joke-generator/JokeCategorySelector';

const mocks = vi.hoisted(() => ({
  deduct: vi.fn().mockResolvedValue(true),
  insert: vi.fn().mockResolvedValue({ error: null }),
  from: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'test-user' } }) }));
vi.mock('@/hooks/useCoins', () => ({ useCoins: () => ({ coins: 50, deductCoins: mocks.deduct, refetch: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/lib/errorToast', () => ({ showErrorToast: vi.fn(), showErrorToastWithCopy: vi.fn() }));

describe('joke category coin purchase', () => {
  it('spends 50 once and records ownership in the category table without another ledger write', async () => {
    mocks.from.mockImplementation((table: string) => {
      if (table === 'joke_categories') {
        const chain = { select: vi.fn(), eq: vi.fn(), neq: vi.fn(), order: vi.fn() };
        chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.neq.mockReturnValue(chain);
        chain.order.mockResolvedValue({ data: [{ id: 'category-id', name: 'holidays', emoji: '🎉', is_free: false, coin_price: 50 }], error: null });
        return chain;
      }
      if (table === 'user_joke_categories') return {
        select: () => ({ eq: async () => ({ data: [], error: null }) }), insert: mocks.insert,
      };
      throw new Error(`Unexpected table: ${table}`);
    });
    render(<JokeCategorySelector selectedCategories={[]} onCategoriesChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Categories/ }));
    fireEvent.click(await screen.findByRole('button', { name: /50/ }));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledWith({ user_id: 'test-user', category_id: 'category-id', coins_spent: 50 }));
    expect(mocks.deduct).toHaveBeenCalledTimes(1);
    expect(mocks.deduct).toHaveBeenCalledWith(50, 'Purchased joke category: holidays', 'category-id');
    expect(mocks.from).not.toHaveBeenCalledWith('coin_transactions');
    expect(mocks.from).not.toHaveBeenCalledWith('user_store_purchases');
  });
});