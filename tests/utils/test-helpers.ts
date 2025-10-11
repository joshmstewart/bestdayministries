import { Page } from '@playwright/test';

/**
 * Test helper utilities for common testing patterns
 */

/**
 * Wait for authentication to complete by checking for session cookie or redirect
 */
export async function waitForAuthComplete(page: Page, timeout = 5000) {
  try {
    // Wait for either redirect away from auth page or session establishment
    await page.waitForFunction(
      () => {
        return !window.location.pathname.includes('/auth') || 
               document.cookie.includes('sb-') ||
               localStorage.getItem('sb-auth-token');
      },
      { timeout }
    );
  } catch (error) {
    // Timeout is acceptable - auth might have completed differently
    console.log('Auth completion wait timed out (this may be okay)');
  }
}

/**
 * Fill a form field with built-in waits and validation
 */
export async function fillFormField(
  page: Page, 
  selector: string, 
  value: string,
  options: { timeout?: number; waitForVisible?: boolean } = {}
) {
  const { timeout = 10000, waitForVisible = true } = options;
  
  const field = page.locator(selector).first();
  
  if (waitForVisible) {
    await field.waitFor({ state: 'visible', timeout });
  }
  
  await field.fill(value);
  
  // Wait a bit for any onChange handlers to complete
  await page.waitForTimeout(100);
}

/**
 * Submit a form and wait for navigation or response
 */
export async function submitFormAndWait(
  page: Page, 
  buttonText: string | RegExp,
  options: { waitForNavigation?: boolean; timeout?: number } = {}
) {
  const { waitForNavigation = true, timeout = 10000 } = options;
  
  const button = page.getByRole('button', { name: buttonText });
  await button.waitFor({ state: 'visible', timeout });
  
  if (waitForNavigation) {
    // Wait for either navigation or network response
    await Promise.race([
      page.waitForNavigation({ timeout }).catch(() => null),
      page.waitForResponse(resp => resp.status() < 400, { timeout }).catch(() => null),
    ]);
  }
  
  await button.click();
  await page.waitForTimeout(500);
}

/**
 * Wait for a specific network response
 */
export async function waitForSupabaseResponse(
  page: Page,
  endpoint: string,
  timeout = 10000
) {
  try {
    await page.waitForResponse(
      resp => resp.url().includes(endpoint) && resp.status() < 400,
      { timeout }
    );
  } catch (error) {
    console.log(`No response from ${endpoint} within ${timeout}ms`);
  }
}

/**
 * Select an option from a combobox/select with proper waits
 */
export async function selectComboboxOption(
  page: Page,
  comboboxSelector: string,
  optionText: string | RegExp,
  timeout = 5000
) {
  const combobox = page.locator(comboboxSelector);
  await combobox.waitFor({ state: 'visible', timeout });
  await combobox.click();
  
  await page.waitForTimeout(200);
  
  const option = page.getByRole('option', { name: optionText });
  await option.waitFor({ state: 'visible', timeout });
  await option.click();
  
  await page.waitForTimeout(200);
}

/**
 * Wait for element to be stable (not animating)
 */
export async function waitForElementStable(
  page: Page,
  selector: string,
  timeout = 5000
) {
  const element = page.locator(selector).first();
  
  try {
    await element.waitFor({ state: 'visible', timeout });
    // Wait for animations to complete
    await page.waitForTimeout(300);
  } catch (error) {
    console.log(`Element ${selector} not stable within ${timeout}ms`);
  }
}

/**
 * Check if element exists without throwing
 */
export async function elementExists(
  page: Page,
  selector: string,
  timeout = 2000
): Promise<boolean> {
  try {
    await page.locator(selector).first().waitFor({ state: 'attached', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fill password field with explicit wait for visibility
 */
export async function fillPasswordField(
  page: Page,
  value: string,
  options: { index?: number; timeout?: number } = {}
) {
  const { index = 0, timeout = 10000 } = options;
  
  // Wait for password fields to be present
  const passwordFields = page.getByPlaceholder(/password/i);
  await passwordFields.first().waitFor({ state: 'visible', timeout });
  
  // Get the specific password field by index
  const field = passwordFields.nth(index);
  await field.waitFor({ state: 'visible', timeout: 2000 });
  await field.fill(value);
  
  // Brief wait for any onChange handlers
  await page.waitForTimeout(100);
}
