
# Plan: Fix Capped Transaction Statistics

## Problem
The Admin → Transactions tab shows incorrect statistics because:
1. The query fetches only 500 rows (`.limit(500)`)
2. All three stats (Total Transactions, Total Earned, Total Spent) are calculated from those 500 rows
3. The real totals are much higher but never shown

## Solution
Use a **separate COUNT/SUM query** to get accurate totals, while keeping the limited query for the paginated table display.

## Implementation

### File: `src/components/admin/CoinTransactionsManager.tsx`

#### 1. Add a separate stats query using aggregate functions

```typescript
const fetchStats = async () => {
  // Get total count
  const { count } = await supabase
    .from("coin_transactions")
    .select("*", { count: "exact", head: true });

  // Get sum of positive amounts (earned)
  const { data: earnedData } = await supabase
    .from("coin_transactions")
    .select("amount")
    .gt("amount", 0);

  // Get sum of negative amounts (spent)
  const { data: spentData } = await supabase
    .from("coin_transactions")
    .select("amount")
    .lt("amount", 0);

  const totalEarned = (earnedData || []).reduce((sum, t) => sum + t.amount, 0);
  const totalSpent = (spentData || []).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  setStats({
    totalEarned,
    totalSpent,
    transactionCount: count || 0
  });
};
```

**Note:** Supabase doesn't have a direct `SUM()` aggregate via the JS client, so we either:
- Option A: Fetch all amounts (just the `amount` column, not full rows) and sum client-side
- Option B: Create a database view or RPC function for the aggregates

#### 2. Alternative: Use an RPC function (more efficient)

Create a database function:
```sql
CREATE OR REPLACE FUNCTION get_coin_transaction_stats()
RETURNS TABLE (
  total_count bigint,
  total_earned numeric,
  total_spent numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_count,
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_earned,
    COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_spent
  FROM coin_transactions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Then call it from the component:
```typescript
const { data: statsData } = await supabase.rpc("get_coin_transaction_stats");
if (statsData && statsData[0]) {
  setStats({
    transactionCount: statsData[0].total_count,
    totalEarned: statsData[0].total_earned,
    totalSpent: statsData[0].total_spent
  });
}
```

#### 3. Keep the table query limited for performance
The existing `.limit(500)` for the table is fine—we just need to make the stats independent.

## Changes Summary

| File | Change |
|------|--------|
| Database | Add `get_coin_transaction_stats()` RPC function |
| `CoinTransactionsManager.tsx` | Call RPC for stats, keep `.limit(500)` for table |

## Visual Update
The footer text already says "(last 500)" which is correct for the table. The stats cards will now show the **true totals** across all transactions.

## Benefits
- Accurate statistics regardless of transaction volume
- Single efficient SQL query for aggregates
- Table remains performant with pagination limit
