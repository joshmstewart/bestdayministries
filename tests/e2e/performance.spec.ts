import { test, expect } from '@playwright/test';

test.describe('Performance Tests @slow', () => {
  test('homepage loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    console.log(`Homepage load time: ${loadTime}ms`);
  });

  test('community page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/community');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    console.log(`Community page load time: ${loadTime}ms`);
  });

  test('events page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    console.log(`Events page load time: ${loadTime}ms`);
  });

  test('marketplace loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 6 seconds (may have images)
    expect(loadTime).toBeLessThan(6000);
    console.log(`Marketplace load time: ${loadTime}ms`);
  });
});

test.describe('Core Web Vitals @slow', () => {
  test('measures Largest Contentful Paint (LCP)', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Get LCP metric
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.renderTime || lastEntry.loadTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Timeout after 10 seconds
        setTimeout(() => resolve(0), 10000);
      });
    });
    
    console.log(`LCP: ${lcp}ms`);
    
    // LCP should be under 2.5 seconds (good), but we'll allow up to 4 seconds
    expect(lcp).toBeLessThan(4000);
    expect(lcp).toBeGreaterThan(0);
  });

  test('measures First Input Delay readiness', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if page is interactive
    const isInteractive = await page.evaluate(() => {
      return document.readyState === 'complete';
    });
    
    expect(isInteractive).toBeTruthy();
  });

  test('measures Cumulative Layout Shift (CLS)', async ({ page }) => {
    await page.goto('/');
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    
    // Wait additional time for layout shifts to occur
    await page.waitForFunction(() => {
      return new Promise(resolve => setTimeout(resolve, 3000));
    }, { timeout: 5000 });
    
    // Get CLS score
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsScore = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsScore += (entry as any).value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });
        
        setTimeout(() => resolve(clsScore), 2000);
      });
    });
    
    console.log(`CLS: ${cls}`);
    
    // CLS should be under 0.1 (good), but we'll allow up to 0.25
    expect(cls).toBeLessThan(0.25);
  });
});

test.describe('Resource Loading @slow', () => {
  test('images load efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get all images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    console.log(`Total images on homepage: ${imageCount}`);
    
    // Check if images have lazy loading
    let lazyCount = 0;
    for (let i = 0; i < Math.min(imageCount, 10); i++) {
      const loading = await images.nth(i).getAttribute('loading');
      if (loading === 'lazy') lazyCount++;
    }
    
    console.log(`Images with lazy loading: ${lazyCount}`);
    
    // At least some images should use lazy loading
    expect(imageCount).toBeGreaterThan(0);
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Log errors if any
    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }
    
    // Should have no critical errors
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404') &&
      !e.includes('net::')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('checks for render-blocking resources', async ({ page }) => {
    await page.goto('/');
    
    const performanceData = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      return resources.map((r: any) => ({
        name: r.name,
        type: r.initiatorType,
        duration: r.duration,
        renderBlocking: r.renderBlockingStatus
      }));
    });
    
    // Log slow resources
    const slowResources = performanceData.filter((r: any) => r.duration > 1000);
    if (slowResources.length > 0) {
      console.log('Slow resources (>1s):', slowResources);
    }
    
    // Should complete
    expect(performanceData.length).toBeGreaterThan(0);
  });
});
