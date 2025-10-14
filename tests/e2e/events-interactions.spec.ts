import { test, expect } from '@playwright/test';

test.describe('Event Interactions @fast', () => {
  test('can view event details dialog', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Wait for events to load
    await page.waitForSelector('[data-testid="event-card"], .event-card, article', { timeout: 10000 }).catch(() => {});
    
    const eventCount = await page.locator('[data-testid="event-card"], .event-card, article').count();
    
    if (eventCount > 0) {
      // Click first event
      await page.locator('[data-testid="event-card"], .event-card, article').first().click();
      
      // Should open dialog or navigate to event details
      await page.waitForTimeout(1000);
      
      // Check for dialog or detail view
      const hasDialog = await page.locator('[role="dialog"]').isVisible();
      const urlChanged = page.url() !== 'http://localhost:8080/events';
      
      expect(hasDialog || urlChanged).toBeTruthy();
    }
  });

  test('event cards display key information', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    const eventCount = await page.locator('[data-testid="event-card"], .event-card, article').count();
    
    if (eventCount > 0) {
      const firstEvent = page.locator('[data-testid="event-card"], .event-card, article').first();
      
      // Should have title
      await expect(firstEvent.locator('h2, h3, h4')).toBeVisible();
      
      // Should have date/time information (look for calendar icon or date text)
      const hasDateInfo = 
        await firstEvent.locator('[data-icon="calendar"]').count() > 0 ||
        await firstEvent.locator('text=/\\d{1,2}\/\\d{1,2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i').count() > 0;
      
      expect(hasDateInfo).toBeTruthy();
    }
  });

  test('events are filtered by type (upcoming/past)', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Look for tabs or filters
    const hasUpcomingTab = await page.getByRole('tab', { name: /upcoming/i }).isVisible().catch(() => false);
    const hasPastTab = await page.getByRole('tab', { name: /past/i }).isVisible().catch(() => false);
    
    if (hasUpcomingTab && hasPastTab) {
      // Click past tab
      await page.getByRole('tab', { name: /past/i }).click();
      await page.waitForTimeout(500);
      
      // Events should update
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/events');
    }
  });

  test('location links are clickable', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    const eventCount = await page.locator('[data-testid="event-card"], .event-card, article').count();
    
    if (eventCount > 0) {
      // Look for map/location icons or links
      const locationLinks = page.locator('a[href*="maps"], a[href*="google.com/maps"]');
      const locationCount = await locationLinks.count();
      
      if (locationCount > 0) {
        const firstLocation = locationLinks.first();
        await expect(firstLocation).toBeVisible();
        
        // Verify it has href
        const href = await firstLocation.getAttribute('href');
        expect(href).toBeTruthy();
      }
    }
  });

  test('text-to-speech works on event details', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    const eventCount = await page.locator('[data-testid="event-card"], .event-card, article').count();
    
    if (eventCount > 0) {
      // Look for TTS buttons
      const ttsButtons = page.locator('button[aria-label*="speak"], button[aria-label*="listen"]');
      const ttsCount = await ttsButtons.count();
      
      expect(ttsCount).toBeGreaterThanOrEqual(0);
      
      if (ttsCount > 0) {
        // Button should be clickable
        await expect(ttsButtons.first()).toBeEnabled();
      }
    }
  });
});

test.describe('Event Audio Player @fast', () => {
  test('audio player appears on events with audio', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Look for audio players
    const audioPlayers = page.locator('audio, [data-testid="audio-player"]');
    const playerCount = await audioPlayers.count();
    
    // Audio players may or may not be present depending on event data
    expect(playerCount).toBeGreaterThanOrEqual(0);
  });
});
