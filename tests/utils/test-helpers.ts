import { Page } from '@playwright/test';
import { MockSupabaseState } from './supabase-mocks';

/**
 * Wait for page load
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

/**
 * Create a mock caregiver user in the test state
 */
export function createMockCaregiver(
  state: MockSupabaseState,
  email = 'caregiver@test.com',
  displayName = 'Test Guardian'
): string {
  return state.addUser(email, 'password123', {
    display_name: displayName,
    role: 'caregiver',
    avatar_number: 1
  });
}

/**
 * Create a mock bestie user in the test state with a friend code
 */
export function createMockBestie(
  state: MockSupabaseState,
  email = 'bestie@test.com',
  displayName = 'Test Bestie'
): { userId: string; friendCode: string } {
  const userId = state.addUser(email, 'password123', {
    display_name: displayName,
    role: 'bestie',
    avatar_number: 2
  });
  
  const profile = state.profiles.get(userId);
  return {
    userId,
    friendCode: profile?.friend_code || ''
  };
}

/**
 * Create a mock vendor user in the test state
 */
export function createMockVendor(
  state: MockSupabaseState,
  email = 'vendor@test.com',
  businessName = 'Test Vendor',
  status: 'pending' | 'approved' | 'rejected' = 'approved'
): { userId: string; vendorId: string } {
  const userId = state.addUser(email, 'password123', {
    display_name: businessName,
    role: 'supporter',
    avatar_number: 3
  });
  
  const vendorId = state.addVendor(userId, businessName, status);
  
  return { userId, vendorId };
}

/**
 * Link a caregiver to a bestie in the test state
 */
export function linkCaregiverToBestie(
  state: MockSupabaseState,
  caregiverId: string,
  bestieId: string,
  relationship = 'Parent'
): string {
  return state.addCaregiverLink(caregiverId, bestieId, relationship);
}

/**
 * Create a vendor bestie request in the test state
 */
export function createVendorBestieRequest(
  state: MockSupabaseState,
  vendorId: string,
  bestieId: string,
  message = 'Would love to partner with you!',
  status: 'pending' | 'approved' | 'rejected' = 'pending'
): string {
  const requestId = `vendor-request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  state.vendorBestieRequests.set(requestId, {
    id: requestId,
    vendor_id: vendorId,
    bestie_id: bestieId,
    message,
    status,
    requested_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  });
  return requestId;
}