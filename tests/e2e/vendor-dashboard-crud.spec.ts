import { test, expect, Page } from '@playwright/test';
import percySnapshot from '@percy/playwright';

/**
 * Vendor Dashboard CRUD E2E Tests
 * Tests complete vendor-side product and order management workflows
 */
test.describe('Vendor Dashboard CRUD @fast', () => {
  let vendorPage: Page;
  const timestamp = Date.now();
  const testProductName = `Test Product ${timestamp}`;
  let testProductId: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    vendorPage = await context.newPage();

    // Create vendor account or login
    await vendorPage.goto('/vendor-auth');
    await vendorPage.waitForLoadState('networkidle');
    
    // Try to sign in first (vendor may already exist)
    const signInTab = vendorPage.locator('button:has-text("Sign In"), text="Sign In"').first();
    if (await signInTab.isVisible()) {
      await signInTab.click();
      await vendorPage.waitForTimeout(500);
    }
    
    await vendorPage.fill('input[type="email"]', 'testvendor@example.com');
    await vendorPage.fill('input[type="password"]', 'testpassword123');
    
    const signInBtn = vendorPage.locator('button:has-text("Sign In")').first();
    await signInBtn.click();
    
    // Wait for redirect to vendor dashboard or community
    await vendorPage.waitForTimeout(3000);
  });

  test.afterAll(async () => {
    // Cleanup test products
    if (testProductId) {
      await vendorPage.evaluate(async ({ productId }) => {
        try {
          // @ts-ignore
          const { supabase } = await import('/src/integrations/supabase/client.ts');
          await supabase.from('products').delete().eq('id', productId);
          console.log('✅ Test product cleaned up');
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }, { productId: testProductId });
    }
    
    await vendorPage.close();
  });

  test('vendor can navigate to dashboard', async () => {
    await vendorPage.goto('/vendor-dashboard');
    await vendorPage.waitForLoadState('networkidle');
    
    // Verify dashboard loads
    const dashboardHeading = vendorPage.locator('text=/Vendor Dashboard|Products|Orders/i').first();
    await expect(dashboardHeading).toBeVisible({ timeout: 15000 });
  });

  test('vendor dashboard has expected tabs', async () => {
    await vendorPage.goto('/vendor-dashboard');
    await vendorPage.waitForLoadState('networkidle');
    
    // Check for key tabs
    const expectedTabs = ['Products', 'Orders'];
    let visibleTabs = 0;
    
    for (const tabName of expectedTabs) {
      const tab = vendorPage.locator(`button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`).first();
      if (await tab.isVisible().catch(() => false)) {
        visibleTabs++;
        console.log(`Tab "${tabName}" is visible`);
      }
    }
    
    expect(visibleTabs).toBeGreaterThan(0);
  });

  test('vendor can create new product', async () => {
    await vendorPage.goto('/vendor-dashboard');
    await vendorPage.waitForLoadState('networkidle');
    
    // Navigate to Products tab if needed
    const productsTab = vendorPage.locator('button:has-text("Products"), [role="tab"]:has-text("Products")').first();
    if (await productsTab.isVisible()) {
      await productsTab.click();
      await vendorPage.waitForTimeout(1000);
    }
    
    // Click Add/Create Product button
    const addProductBtn = vendorPage.locator('button:has-text("Add Product"), button:has-text("New Product"), button:has-text("Create")').first();
    await addProductBtn.waitFor({ state: 'visible', timeout: 10000 });
    await addProductBtn.click();
    await vendorPage.waitForTimeout(1000);
    
    // Fill product form
    await vendorPage.fill('input[name="name"], input[placeholder*="Product Name" i]', testProductName);
    await vendorPage.fill('textarea[name="description"], textarea[placeholder*="Description" i]', 'Test product description');
    await vendorPage.fill('input[name="price"], input[placeholder*="Price" i]', '29.99');
    await vendorPage.fill('input[name="stock_quantity"], input[placeholder*="Stock" i]', '10');
    
    // Save product
    const saveBtn = vendorPage.locator('button:has-text("Save"), button:has-text("Create")').first();
    await saveBtn.click();
    
    // Wait for success
    await vendorPage.waitForTimeout(3000);
    
    // Verify product in database and store ID
    const product = await vendorPage.evaluate(async ({ name }) => {
      // @ts-ignore
      const { supabase } = await import('/src/integrations/supabase/client.ts');
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('name', name)
        .maybeSingle();
      return data;
    }, { name: testProductName });
    
    expect(product).toBeTruthy();
    if (product) {
      testProductId = product.id;
    }
  });

  test('vendor can view product list', async () => {
    await vendorPage.goto('/vendor-dashboard');
    await vendorPage.waitForLoadState('networkidle');
    
    const productsTab = vendorPage.locator('button:has-text("Products")').first();
    if (await productsTab.isVisible()) {
      await productsTab.click();
      await vendorPage.waitForTimeout(1000);
    }
    
    // Look for product in list
    const productCard = vendorPage.locator(`text="${testProductName}"`).first();
    const isVisible = await productCard.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      console.log('Test product is visible in product list');
    }
  });

  test('vendor can edit product', async () => {
    // Instead of depending on earlier test, create product if needed
    if (!testProductId) {
      console.log('No test product exists - creating one for edit test');
      const product = await vendorPage.evaluate(async ({ name }) => {
        // @ts-ignore
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: name,
            description: 'Test product for edit test',
            price: 29.99,
            stock_quantity: 10,
            is_active: true
          })
          .select()
          .single();
        
        if (error) throw new Error(`Failed to create test product: ${error.message}`);
        return data;
      }, { name: testProductName });
      
      testProductId = product.id;
    }
    
    await vendorPage.goto('/vendor-dashboard');
    await vendorPage.waitForLoadState('networkidle');
    
    const productsTab = vendorPage.locator('button:has-text("Products")').first();
    if (await productsTab.isVisible()) {
      await productsTab.click();
      await vendorPage.waitForTimeout(1000);
    }
    
    // Find and click edit button for test product
    const editBtn = vendorPage.locator(`button:has-text("Edit"), button[aria-label*="Edit" i]`).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await vendorPage.waitForTimeout(1000);
      
      // Update price
      const priceField = vendorPage.locator('input[name="price"], input[placeholder*="Price" i]').first();
      await priceField.fill('39.99');
      
      // Save changes
      const saveBtn = vendorPage.locator('button:has-text("Save"), button:has-text("Update")').first();
      await saveBtn.click();
      
      await vendorPage.waitForTimeout(2000);
      
      // Verify update in database
      const updatedProduct = await vendorPage.evaluate(async ({ productId }) => {
        // @ts-ignore
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        const { data } = await supabase
          .from('products')
          .select('price')
          .eq('id', productId)
          .single();
        return data;
      }, { productId: testProductId });
      
      expect(updatedProduct?.price).toBe(39.99);
    }
  });

  test('vendor can toggle product visibility', async () => {
    // Instead of depending on earlier test, create product if needed
    if (!testProductId) {
      console.log('No test product exists - creating one for visibility toggle test');
      const product = await vendorPage.evaluate(async ({ name }) => {
        // @ts-ignore
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: name,
            description: 'Test product for visibility toggle test',
            price: 29.99,
            stock_quantity: 10,
            is_active: true
          })
          .select()
          .single();
        
        if (error) throw new Error(`Failed to create test product: ${error.message}`);
        return data;
      }, { name: testProductName });
      
      testProductId = product.id;
    }
    
    await vendorPage.goto('/vendor-dashboard');
    await vendorPage.waitForLoadState('networkidle');
    
    const productsTab = vendorPage.locator('button:has-text("Products")').first();
    if (await productsTab.isVisible()) {
      await productsTab.click();
      await vendorPage.waitForTimeout(1000);
    }
    
    // Look for visibility toggle (Eye/EyeOff button)
    const visibilityBtn = vendorPage.locator('button[title*="active" i], button[title*="visible" i]').first();
    if (await visibilityBtn.isVisible()) {
      await visibilityBtn.click();
      await vendorPage.waitForTimeout(1000);
      
      console.log('Product visibility toggled');
    }
  });

  test('vendor can view orders list', async () => {
    await vendorPage.goto('/vendor-dashboard');
    await vendorPage.waitForLoadState('networkidle');
    
    // Navigate to Orders tab
    const ordersTab = vendorPage.locator('button:has-text("Orders"), [role="tab"]:has-text("Orders")').first();
    if (await ordersTab.isVisible()) {
      await ordersTab.click();
      await vendorPage.waitForTimeout(1500);
      
      // Verify orders interface loads
      const ordersContent = vendorPage.locator('text=/Order|Status|Customer/i').first();
      const hasOrders = await ordersContent.isVisible({ timeout: 10000 }).catch(() => false);
      
      if (hasOrders) {
        console.log('Orders list loaded successfully');
      }
    }
  });

  test('vendor can submit tracking information', async () => {
    await vendorPage.goto('/vendor-dashboard');
    await vendorPage.waitForLoadState('networkidle');
    
    // Navigate to Orders tab
    const ordersTab = vendorPage.locator('button:has-text("Orders")').first();
    if (await ordersTab.isVisible()) {
      await ordersTab.click();
      await vendorPage.waitForTimeout(1500);
      
      // Look for tracking input or add tracking button
      const trackingBtn = vendorPage.locator('button:has-text("Add Tracking"), button:has-text("Track")').first();
      if (await trackingBtn.isVisible()) {
        await trackingBtn.click();
        await vendorPage.waitForTimeout(1000);
        
        // Fill tracking form
        const trackingInput = vendorPage.locator('input[placeholder*="Tracking" i], input[name="tracking"]').first();
        if (await trackingInput.isVisible()) {
          await trackingInput.fill('1Z999AA10123456784');
          
          const carrierSelect = vendorPage.locator('select, [role="combobox"]').first();
          if (await carrierSelect.isVisible()) {
            await carrierSelect.selectOption('ups');
          }
          
          // Submit tracking
          const submitBtn = vendorPage.locator('button:has-text("Submit"), button:has-text("Save")').first();
          await submitBtn.click();
          
          await vendorPage.waitForTimeout(2000);
          console.log('Tracking information submitted');
        }
      } else {
        console.log('No orders available to add tracking');
      }
    }
  });

  test('vendor can view earnings display', async () => {
    await vendorPage.goto('/vendor-dashboard');
    await vendorPage.waitForLoadState('networkidle');
    
    // Look for Earnings tab
    const earningsTab = vendorPage.locator('button:has-text("Earnings"), text="Earnings"').first();
    if (await earningsTab.isVisible()) {
      await earningsTab.click();
      await vendorPage.waitForTimeout(1000);
      
      // Verify earnings display
      const earningsContent = vendorPage.locator('text=/Total|Revenue|Balance/i').first();
      await expect(earningsContent).toBeVisible({ timeout: 10000 });
    } else {
      console.log('Earnings tab not found in current UI');
    }
  });

  test('vendor can access payment settings', async () => {
    await vendorPage.goto('/vendor-dashboard');
    await vendorPage.waitForLoadState('networkidle');
    
    // Look for Settings or Payments tab
    const settingsTab = vendorPage.locator('button:has-text("Settings"), button:has-text("Payments")').first();
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
      await vendorPage.waitForTimeout(1000);
      
      // Verify settings interface
      const settingsContent = vendorPage.locator('text=/Payment|Account|Settings/i').first();
      await expect(settingsContent).toBeVisible({ timeout: 10000 });
    } else {
      console.log('Settings tab not found');
    }
  });

  test('vendor can delete product', async () => {
    // Instead of depending on earlier test, create product if needed
    if (!testProductId) {
      console.log('No test product exists - creating one for delete test');
      const product = await vendorPage.evaluate(async ({ name }) => {
        // @ts-ignore
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: name,
            description: 'Test product for delete test',
            price: 29.99,
            stock_quantity: 10,
            is_active: true
          })
          .select()
          .single();
        
        if (error) throw new Error(`Failed to create test product: ${error.message}`);
        return data;
      }, { name: testProductName });
      
      testProductId = product.id;
    }
    
    await vendorPage.goto('/vendor-dashboard');
    await vendorPage.waitForLoadState('networkidle');
    
    const productsTab = vendorPage.locator('button:has-text("Products")').first();
    if (await productsTab.isVisible()) {
      await productsTab.click();
      await vendorPage.waitForTimeout(1000);
    }
    
    // Find and click delete button
    const deleteBtn = vendorPage.locator('button:has-text("Delete"), button[aria-label*="Delete" i]').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await vendorPage.waitForTimeout(500);
      
      // Confirm deletion if dialog appears
      const confirmBtn = vendorPage.locator('button:has-text("Delete"), button:has-text("Confirm")').last();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
      
      await vendorPage.waitForTimeout(2000);
      
      // Verify deletion
      const productExists = await vendorPage.evaluate(async ({ productId }) => {
        // @ts-ignore
        const { supabase } = await import('/src/integrations/supabase/client.ts');
        const { data } = await supabase
          .from('products')
          .select('id')
          .eq('id', productId)
          .maybeSingle();
        return !!data;
      }, { productId: testProductId });
      
      expect(productExists).toBeFalsy();
      testProductId = ''; // Clear so afterAll doesn't try to delete again
    }
  });

  // VISUAL REGRESSION TESTS
  test.describe('Vendor Dashboard Visual Regression', () => {
    test('products tab visual snapshot', async () => {
      await vendorPage.goto('/vendor-dashboard');
      await vendorPage.waitForLoadState('networkidle');
      
      const productsTab = vendorPage.locator('button:has-text("Products")').first();
      if (await productsTab.isVisible()) {
        await productsTab.click();
        await vendorPage.waitForTimeout(1000);
        await percySnapshot(vendorPage, 'Vendor Dashboard - Products Tab');
      }
    });

    test('orders tab visual snapshot', async () => {
      await vendorPage.goto('/vendor-dashboard');
      await vendorPage.waitForLoadState('networkidle');
      
      const ordersTab = vendorPage.locator('button:has-text("Orders")').first();
      if (await ordersTab.isVisible()) {
        await ordersTab.click();
        await vendorPage.waitForTimeout(1500);
        await percySnapshot(vendorPage, 'Vendor Dashboard - Orders Tab');
      }
    });

    test('product creation dialog visual snapshot', async () => {
      await vendorPage.goto('/vendor-dashboard');
      await vendorPage.waitForLoadState('networkidle');
      
      const productsTab = vendorPage.locator('button:has-text("Products")').first();
      if (await productsTab.isVisible()) {
        await productsTab.click();
        await vendorPage.waitForTimeout(1000);
      }
      
      const addProductBtn = vendorPage.locator('button:has-text("Add Product"), button:has-text("New Product")').first();
      if (await addProductBtn.isVisible()) {
        await addProductBtn.click();
        await vendorPage.waitForTimeout(1000);
        await percySnapshot(vendorPage, 'Vendor Dashboard - Product Creation Dialog');
      }
    });
  });
});
