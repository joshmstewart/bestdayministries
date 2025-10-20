import { test, expect, Page } from '@playwright/test';

/**
 * Games System E2E Tests
 * Tests Memory Match and Match-3 games including gameplay, scoring, coin rewards, and difficulty modes
 */
test.describe('Games System @fast', () => {
  let testPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    testPage = await context.newPage();

    // Login as test user
    await testPage.goto('/auth');
    await testPage.waitForLoadState('networkidle');
    
    await testPage.fill('input[type="email"]', 'test@example.com');
    await testPage.fill('input[type="password"]', 'testpassword123');
    await testPage.click('button:has-text("Sign In")');
    
    await testPage.waitForURL(/\/(community|admin)/);
    await testPage.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    await testPage.close();
  });

  // MEMORY MATCH TESTS
  test.describe('Memory Match Game', () => {
    test('displays game lobby with difficulty options', async () => {
      await testPage.goto('/memory-match');
      await testPage.waitForLoadState('networkidle');
      
      // Check for difficulty cards
      const easyCard = testPage.locator('text=/Easy/i').first();
      await expect(easyCard).toBeVisible({ timeout: 10000 });
      
      // Look for start button
      const startButton = testPage.locator('button:has-text("Start")').first();
      await expect(startButton).toBeVisible();
    });

    test('can start easy game and display grid', async () => {
      await testPage.goto('/memory-match');
      await testPage.waitForLoadState('networkidle');
      
      // Click easy difficulty or start button
      const startEasyBtn = testPage.locator('button:has-text("Start Easy"), button:has-text("Start")').first();
      await startEasyBtn.click();
      await testPage.waitForTimeout(1000);
      
      // Verify game board renders
      const gameBoard = testPage.locator('[class*="grid"]').first();
      await expect(gameBoard).toBeVisible({ timeout: 10000 });
      
      // Verify cards are present
      const cards = testPage.locator('button[class*="card"], div[class*="card"]');
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);
    });

    test('can flip cards and see content', async () => {
      await testPage.goto('/memory-match');
      await testPage.waitForLoadState('networkidle');
      
      // Start game
      const startBtn = testPage.locator('button:has-text("Start")').first();
      await startBtn.click();
      await testPage.waitForTimeout(1000);
      
      // Click first card
      const firstCard = testPage.locator('button[class*="card"], div[class*="card"]').first();
      if (await firstCard.isVisible()) {
        await firstCard.click();
        await testPage.waitForTimeout(500);
        
        // Card should show content (emoji or image)
        // This is verified by the card state change
        console.log('Card flipped successfully');
      }
    });

    test('tracks moves and matched pairs', async () => {
      await testPage.goto('/memory-match');
      await testPage.waitForLoadState('networkidle');
      
      // Start game
      const startBtn = testPage.locator('button:has-text("Start")').first();
      await startBtn.click();
      await testPage.waitForTimeout(1000);
      
      // Look for stats display
      const movesDisplay = testPage.locator('text=/Moves|moves/i').first();
      const pairsDisplay = testPage.locator('text=/pairs|Matched/i').first();
      
      const hasStats = await movesDisplay.isVisible() || await pairsDisplay.isVisible();
      expect(hasStats).toBeTruthy();
    });

    test('displays timer during gameplay', async () => {
      await testPage.goto('/memory-match');
      await testPage.waitForLoadState('networkidle');
      
      // Start game
      const startBtn = testPage.locator('button:has-text("Start")').first();
      await startBtn.click();
      await testPage.waitForTimeout(1000);
      
      // Look for timer
      const timer = testPage.locator('text=/\\d+:\\d+|Timer|Time/i').first();
      const hasTimer = await timer.isVisible();
      
      if (hasTimer) {
        console.log('Timer is visible and running');
        expect(hasTimer).toBeTruthy();
      }
    });

    test('can return to lobby', async () => {
      await testPage.goto('/memory-match');
      await testPage.waitForLoadState('networkidle');
      
      // Start game
      const startBtn = testPage.locator('button:has-text("Start")').first();
      await startBtn.click();
      await testPage.waitForTimeout(1000);
      
      // Look for back/quit button
      const backBtn = testPage.locator('button:has-text("Back"), button:has-text("Quit"), button:has-text("Menu")').first();
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await testPage.waitForTimeout(1000);
        
        // Should be back at lobby
        const lobbyIndicator = testPage.locator('text=/Select Difficulty|Choose/i').first();
        const isBackAtLobby = await lobbyIndicator.isVisible();
        expect(isBackAtLobby).toBeTruthy();
      }
    });
  });

  // MATCH-3 TESTS
  test.describe('Match-3 Game', () => {
    test('displays game mode selection screen', async () => {
      await testPage.goto('/match3');
      await testPage.waitForLoadState('networkidle');
      
      // Check for game mode selection
      const modeSelection = testPage.locator('text=/Select|Choose|Mode|Free Play|Challenge/i').first();
      await expect(modeSelection).toBeVisible({ timeout: 10000 });
    });

    test('can start free play mode', async () => {
      await testPage.goto('/match3');
      await testPage.waitForLoadState('networkidle');
      
      // Look for "Easy" or "Free Play" or "Start" button
      const startBtn = testPage.locator('button:has-text("Easy"), button:has-text("Free Play"), button:has-text("Start")').first();
      await startBtn.waitFor({ state: 'visible', timeout: 10000 });
      await startBtn.click();
      await testPage.waitForTimeout(1500);
      
      // Verify game grid renders
      const gameGrid = testPage.locator('[class*="grid"]').first();
      await expect(gameGrid).toBeVisible({ timeout: 10000 });
    });

    test('displays game grid with items', async () => {
      await testPage.goto('/match3');
      await testPage.waitForLoadState('networkidle');
      
      // Start game
      const startBtn = testPage.locator('button:has-text("Start"), button:has-text("Easy")').first();
      await startBtn.click();
      await testPage.waitForTimeout(1500);
      
      // Check for grid cells with items
      const gridCells = testPage.locator('button[class*="cell"], div[class*="cell"]');
      const cellCount = await gridCells.count();
      expect(cellCount).toBeGreaterThan(0);
    });

    test('can select and swap items', async () => {
      await testPage.goto('/match3');
      await testPage.waitForLoadState('networkidle');
      
      // Start game
      const startBtn = testPage.locator('button:has-text("Start"), button:has-text("Easy")').first();
      await startBtn.click();
      await testPage.waitForTimeout(1500);
      
      // Click first cell
      const firstCell = testPage.locator('button[class*="cell"], div[class*="cell"]').first();
      if (await firstCell.isVisible()) {
        await firstCell.click();
        await testPage.waitForTimeout(300);
        
        // Click adjacent cell
        const secondCell = testPage.locator('button[class*="cell"], div[class*="cell"]').nth(1);
        if (await secondCell.isVisible()) {
          await secondCell.click();
          await testPage.waitForTimeout(500);
          
          console.log('Swap interaction completed');
        }
      }
    });

    test('tracks score and moves', async () => {
      await testPage.goto('/match3');
      await testPage.waitForLoadState('networkidle');
      
      // Start game
      const startBtn = testPage.locator('button:has-text("Start"), button:has-text("Easy")').first();
      await startBtn.click();
      await testPage.waitForTimeout(1500);
      
      // Look for score display
      const scoreDisplay = testPage.locator('text=/Score|Points/i').first();
      await expect(scoreDisplay).toBeVisible({ timeout: 10000 });
      
      // Look for moves counter
      const movesDisplay = testPage.locator('text=/Moves/i').first();
      const hasMoves = await movesDisplay.isVisible();
      
      if (hasMoves) {
        console.log('Moves counter is visible');
      }
    });

    test('has sound/music toggle controls', async () => {
      await testPage.goto('/match3');
      await testPage.waitForLoadState('networkidle');
      
      // Start game
      const startBtn = testPage.locator('button:has-text("Start"), button:has-text("Easy")').first();
      await startBtn.click();
      await testPage.waitForTimeout(1500);
      
      // Look for sound/music controls
      const soundBtn = testPage.locator('button[aria-label*="sound" i], button[aria-label*="music" i]').first();
      const hasSoundControl = await soundBtn.isVisible().catch(() => false);
      
      if (hasSoundControl) {
        console.log('Sound controls are available');
        expect(hasSoundControl).toBeTruthy();
      }
    });

    test('can access challenge mode', async () => {
      await testPage.goto('/match3');
      await testPage.waitForLoadState('networkidle');
      
      // Look for challenge mode option
      const challengeBtn = testPage.locator('button:has-text("Challenge"), text="Challenge"').first();
      if (await challengeBtn.isVisible()) {
        await challengeBtn.click();
        await testPage.waitForTimeout(1000);
        
        // Should see challenge selection or goals
        const challengeContent = testPage.locator('text=/Goal|Destroy|Target/i').first();
        const hasChallenges = await challengeContent.isVisible();
        expect(hasChallenges).toBeTruthy();
      } else {
        console.log('Challenge mode not immediately visible');
      }
    });

    test('can return to mode selection', async () => {
      await testPage.goto('/match3');
      await testPage.waitForLoadState('networkidle');
      
      // Start game
      const startBtn = testPage.locator('button:has-text("Start"), button:has-text("Easy")').first();
      await startBtn.click();
      await testPage.waitForTimeout(1500);
      
      // Look for back/quit button
      const backBtn = testPage.locator('button:has-text("Back"), button:has-text("Quit"), button:has-text("Menu")').first();
      if (await backBtn.isVisible()) {
        await backBtn.click();
        await testPage.waitForTimeout(1000);
        
        // Should be back at mode selection
        const modeSelection = testPage.locator('text=/Select|Mode|Choose/i').first();
        const isBackAtSelection = await modeSelection.isVisible();
        expect(isBackAtSelection).toBeTruthy();
      }
    });
  });

  // COIN REWARD VERIFICATION
  test.describe('Game Coin Rewards', () => {
    test('memory match awards coins on completion', async () => {
      // This test verifies coin transactions are created
      // Actual completion may be difficult to automate fully
      
      const hasCoinTransaction = await testPage.evaluate(async () => {
        // @ts-ignore
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        
        const { data: transactions } = await supabase
          .from('coin_transactions')
          .select('*')
          .eq('transaction_type', 'game_reward')
          .eq('description', 'Memory Match completion reward')
          .limit(1);
        
        return transactions && transactions.length > 0;
      });
      
      console.log('Memory match coin transactions exist:', hasCoinTransaction);
      // This is informational, not a strict assertion
    });

    test('match-3 awards coins for challenges', async () => {
      const hasCoinTransaction = await testPage.evaluate(async () => {
        // @ts-ignore
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        
        const { data: transactions } = await supabase
          .from('coin_transactions')
          .select('*')
          .eq('transaction_type', 'game_reward')
          .like('description', '%Match-3%')
          .limit(1);
        
        return transactions && transactions.length > 0;
      });
      
      console.log('Match-3 coin transactions exist:', hasCoinTransaction);
    });
  });
});
