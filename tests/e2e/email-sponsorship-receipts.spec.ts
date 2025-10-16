/**
 * E2E Email Tests - Sponsorship Receipts
 * 
 * Tests sponsorship receipt email functionality via database verification.
 */

import { test, expect } from '@playwright/test';
import { supabase } from '../utils/resend-test-helper';
import { createClient } from '@supabase/supabase-js';

// Helper to create authenticated client
async function getAuthenticatedClient(accessToken: string, refreshToken: string) {
  const authClient = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
  );
  
  await authClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });
  
  return authClient;
}

test.describe('Sponsorship Receipt Email Tests', () => {
  let seedData: any;
  let sponsorClient: any;
  const createdReceiptIds: string[] = [];

  test.beforeAll(async () => {
    const testRunId = Date.now().toString();
    const { data, error } = await supabase.functions.invoke('seed-email-test-data', {
      body: { testRunId }
    });

    if (error) {
      throw new Error(`Failed to seed test data: ${error.message}`);
    }

    seedData = data;
    sponsorClient = await getAuthenticatedClient(
      seedData.authSessions.sponsor.access_token,
      seedData.authSessions.sponsor.refresh_token
    );
  });

  test.afterEach(async () => {
    // Cleanup test data
    if (createdReceiptIds.length > 0) {
      await sponsorClient.from('sponsorship_receipts').delete().in('id', createdReceiptIds);
      createdReceiptIds.length = 0;
    }
  });

  test('sends receipt email for new monthly sponsorship @email @receipts', async () => {
    test.setTimeout(90000);

    // Get active sponsorship using authenticated client
    const { data: sponsorships } = await sponsorClient
      .from('sponsorships')
      .select('*, sponsor_besties(*)')
      .eq('status', 'active')
      .eq('frequency', 'monthly')
      .limit(1);

    if (!sponsorships || sponsorships.length === 0) {
      console.log('⚠️ No active monthly sponsorships found');
      test.skip();
      return;
    }

    const sponsorship = sponsorships[0];

    // Trigger receipt generation
    const { error } = await sponsorClient.functions.invoke('send-sponsorship-receipt', {
      body: {
        sponsorshipId: sponsorship.id
      }
    });

    expect(error).toBeNull();

    // Wait for receipt processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify receipt created
    const { data: receipt } = await sponsorClient
      .from('sponsorship_receipts')
      .select('*')
      .eq('sponsorship_id', sponsorship.id)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(receipt).toBeTruthy();
    expect(receipt!.length).toBeGreaterThan(0);
    expect(receipt![0].receipt_number).toBeTruthy();
    expect(receipt![0].amount).toBeGreaterThan(0);
    if (receipt && receipt.length > 0) {
      createdReceiptIds.push(receipt[0].id);
    }

    console.log('✅ Monthly sponsorship receipt test passed');
  });

  test('sends receipt email for one-time sponsorship @email @receipts', async () => {
    test.setTimeout(90000);

    const { data: sponsorships } = await sponsorClient
      .from('sponsorships')
      .select('*, sponsor_besties(*)')
      .eq('status', 'completed')
      .eq('frequency', 'one-time')
      .limit(1);

    if (!sponsorships || sponsorships.length === 0) {
      console.log('⚠️ No one-time sponsorships found');
      test.skip();
      return;
    }

    const sponsorship = sponsorships[0];

    const { error } = await sponsorClient.functions.invoke('send-sponsorship-receipt', {
      body: {
        sponsorshipId: sponsorship.id
      }
    });

    expect(error).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 5000));

    const { data: receipt } = await sponsorClient
      .from('sponsorship_receipts')
      .select('*')
      .eq('sponsorship_id', sponsorship.id)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(receipt).toBeTruthy();
    expect(receipt!.length).toBeGreaterThan(0);
    if (receipt && receipt.length > 0) {
      createdReceiptIds.push(receipt[0].id);
    }

    console.log('✅ One-time sponsorship receipt test passed');
  });

  test('receipt includes correct organization information @email @receipts', async () => {
    test.setTimeout(90000);

    const { data: sponsorships } = await sponsorClient
      .from('sponsorships')
      .select('*')
      .eq('status', 'active')
      .limit(1);

    if (!sponsorships || sponsorships.length === 0) {
      test.skip();
      return;
    }

    const sponsorship = sponsorships[0];

    // Invoke receipt generation
    await sponsorClient.functions.invoke('send-sponsorship-receipt', {
      body: {
        sponsorshipId: sponsorship.id
      }
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify receipt was created with organization info
    const { data: receipt } = await sponsorClient
      .from('sponsorship_receipts')
      .select('*')
      .eq('sponsorship_id', sponsorship.id)
      .order('created_at', { ascending: false })
      .limit(1);

    expect(receipt).toBeTruthy();
    // Assert against known seed values from seed-email-test-data (lines 428-429)
    expect(receipt![0].organization_name).toBe('Test Organization');
    expect(receipt![0].organization_ein).toBe('12-3456789');
    if (receipt && receipt.length > 0) {
      createdReceiptIds.push(receipt[0].id);
    }

    console.log('✅ Receipt organization info test passed');
  });

  test('generates missing receipts for existing sponsorships @email @receipts', async () => {
    test.setTimeout(90000);

    // Find sponsorships using authenticated client
    const { data: sponsorships } = await sponsorClient
      .from('sponsorships')
      .select('id')
      .eq('status', 'active')
      .limit(5);

    if (!sponsorships || sponsorships.length === 0) {
      test.skip();
      return;
    }

    // Get sponsorships that don't have receipts
    const { data: existingReceipts } = await sponsorClient
      .from('sponsorship_receipts')
      .select('sponsorship_id')
      .in('sponsorship_id', sponsorships.map(s => s.id));

    const existingIds = new Set(existingReceipts?.map(r => r.sponsorship_id) || []);
    const missingReceipts = sponsorships.filter(s => !existingIds.has(s.id));

    if (missingReceipts.length === 0) {
      console.log('⚠️ All sponsorships have receipts');
      test.skip();
      return;
    }

    // Trigger missing receipt generation
    const { error } = await supabase.functions.invoke('generate-missing-receipts', {
      body: { userId: seedData.userIds.sponsor }
    });

    expect(error).toBeNull();

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify receipts were created
    const { data: newReceipts } = await sponsorClient
      .from('sponsorship_receipts')
      .select('*')
      .in('sponsorship_id', missingReceipts.map(s => s.id));

    expect(newReceipts).toBeTruthy();
    expect(newReceipts!.length).toBeGreaterThan(0);
    if (newReceipts) {
      createdReceiptIds.push(...newReceipts.map(r => r.id));
    }

    console.log('✅ Missing receipts generation test passed');
  });
});
