
# Cash Register Coin Rewards Expansion Plan

## Overview
Add four new configurable coin reward types for the Cash Register game that can be managed through the existing Admin → Settings → Earn Coins tab.

## New Rewards to Add

### 1. Time Trial Personal Best
**Reward Key:** `time_trial_record`
**Trigger:** When a user beats their own best score in any Time Trial duration
**Current Status:** Already referenced in code but NOT in database!
- In `useTimeTrialStats.ts` line 102-106, code already calls `awardCoinReward(user.id, "time_trial_record", ...)`
- Need to add the database record to make it configurable

### 2. Time Trial Completion
**Reward Key:** `time_trial_complete`  
**Trigger:** Every time a user completes a Time Trial run
**Current Status:** Already referenced in code but NOT in database!
- In `useTimeTrialStats.ts` line 109-114, code already calls `awardCoinReward(user.id, "time_trial_complete", ...)`
- Need to add the database record to make it configurable

### 3. First Cash Register Game
**Reward Key:** `cash_register_first_game`
**Trigger:** One-time bonus when user completes their very first Cash Register level (Just Play mode)
**Current Status:** Does NOT exist - needs new logic

### 4. Just Play Best Level Record
**Reward Key:** `cash_register_level_record`
**Trigger:** When a user beats their personal best for levels completed in a single Just Play session
**Current Status:** Does NOT exist - needs new logic

### 5. Leaderboard Rewards (Top 3/5/10)
**Reward Keys:** 
- `time_trial_top_3` - Monthly reward for top 3
- `time_trial_top_5` - Monthly reward for top 5
- `time_trial_top_10` - Monthly reward for top 10

**Trigger:** End-of-month or manual admin trigger to award top performers
**Note:** This requires a monthly processing mechanism (cron job or admin button)

---

## Implementation Plan

### Phase 1: Database - Add Coin Reward Records
Insert new reward settings into `coin_rewards_settings` table:

```sql
INSERT INTO coin_rewards_settings (reward_key, reward_name, description, coins_amount, is_active, category) VALUES
  ('time_trial_record', 'Time Trial Record', 'Beat your personal best in Time Trial mode', 25, true, 'games'),
  ('time_trial_complete', 'Complete Time Trial', 'Complete any Time Trial session', 5, true, 'games'),
  ('cash_register_first_game', 'First Cash Register Game', 'Complete your first Cash Register level', 50, true, 'games'),
  ('cash_register_level_record', 'Just Play Level Record', 'Beat your best level in Just Play mode', 15, true, 'games'),
  ('time_trial_top_3', 'Time Trial Top 3', 'Finish in top 3 on monthly Time Trial leaderboard', 100, true, 'games'),
  ('time_trial_top_5', 'Time Trial Top 5', 'Finish in top 5 on monthly Time Trial leaderboard', 50, true, 'games'),
  ('time_trial_top_10', 'Time Trial Top 10', 'Finish in top 10 on monthly Time Trial leaderboard', 25, true, 'games');
```

### Phase 2: Add Preset Templates
**File:** `src/components/admin/CoinRewardsManager.tsx`

Add new presets to the `PRESET_REWARDS` array so admins can quickly add them if deleted:

```typescript
// Add to PRESET_REWARDS array after existing cash register entries:
{ key: "time_trial_record", name: "Time Trial Record", description: "Beat your personal best in Time Trial mode", category: "games", coins: 25 },
{ key: "time_trial_complete", name: "Complete Time Trial", description: "Complete any Time Trial session", category: "games", coins: 5 },
{ key: "cash_register_first_game", name: "First Cash Register Game", description: "Complete your first Cash Register level (one-time)", category: "games", coins: 50 },
{ key: "cash_register_level_record", name: "Just Play Level Record", description: "Beat your best level in Just Play mode", category: "games", coins: 15 },
{ key: "time_trial_top_3", name: "Time Trial Top 3", description: "Monthly top 3 on Time Trial leaderboard", category: "games", coins: 100 },
{ key: "time_trial_top_5", name: "Time Trial Top 5", description: "Monthly top 5 on Time Trial leaderboard", category: "games", coins: 50 },
{ key: "time_trial_top_10", name: "Time Trial Top 10", description: "Monthly top 10 on Time Trial leaderboard", category: "games", coins: 25 },
```

### Phase 3: Implement First Game Bonus Logic
**File:** `src/hooks/useCashRegisterStats.ts`

Modify `saveGameResult` to:
1. Check if `total_games_played === 0` (first game)
2. Award `cash_register_first_game` bonus if so

```typescript
// After insert/update stats:
if (!existing) {
  // This is their first game ever
  await awardCoinReward(user.id, 'cash_register_first_game', 'First Cash Register game completed! 🎉');
}
```

### Phase 4: Implement Just Play Level Record Logic
**File:** `src/hooks/useCashRegisterStats.ts`

Modify `saveGameResult` to:
1. Check if new level beats `best_level`
2. Award `cash_register_level_record` if beating personal best

```typescript
// In update block, before updating:
const isNewLevelRecord = level > existing.best_level;

// After update:
if (isNewLevelRecord) {
  await awardCoinReward(
    user.id, 
    'cash_register_level_record', 
    `New personal best: ${level} levels in one session!`
  );
}
```

### Phase 5: Leaderboard Rewards System (Monthly)
**Approach:** Create admin UI button to manually trigger monthly rewards

**New Files:**
- Update `src/components/cash-register/TimeTrialLeaderboard.tsx` - Add admin "Award Monthly" button

**Logic:**
1. Admin clicks button to award monthly rewards
2. Query top 10 players for each duration (1min, 2min, 5min)
3. Award coins based on rank:
   - Top 3: Gets `time_trial_top_3` + `time_trial_top_5` + `time_trial_top_10`
   - 4-5: Gets `time_trial_top_5` + `time_trial_top_10`
   - 6-10: Gets `time_trial_top_10`
4. Track awarded month to prevent double-awarding

**Database Addition:**
```sql
-- Track monthly leaderboard rewards to prevent duplicates
CREATE TABLE IF NOT EXISTS cash_register_leaderboard_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_month text NOT NULL, -- Format: "2026-01"
  duration_seconds integer NOT NULL,
  rank integer NOT NULL,
  coins_awarded integer NOT NULL,
  awarded_at timestamptz DEFAULT now(),
  UNIQUE(user_id, reward_month, duration_seconds)
);

ALTER TABLE cash_register_leaderboard_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rewards"
  ON cash_register_leaderboard_rewards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage rewards"
  ON cash_register_leaderboard_rewards FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner());
```

---

## Summary of Changes

| File | Change |
|------|--------|
| Database | INSERT 7 new reward records |
| Database | CREATE `cash_register_leaderboard_rewards` table |
| `CoinRewardsManager.tsx` | Add 7 new preset templates |
| `useCashRegisterStats.ts` | Add first game + level record logic |
| `TimeTrialLeaderboard.tsx` | Add admin "Award Monthly Rewards" button |

## Technical Notes

- **Existing code already calls** `time_trial_record` and `time_trial_complete` - they just need database records to become active
- **First game detection** uses `total_games_played === 0` check before incrementing
- **Level record detection** compares incoming level vs stored `best_level`
- **Leaderboard rewards** are manual (admin-triggered) to avoid complex cron setup, but could be automated later
- All rewards will be immediately configurable in Admin → Settings → Earn Coins tab
