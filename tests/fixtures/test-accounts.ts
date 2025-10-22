/**
 * Test Account Helper - Shard-Specific Accounts
 * 
 * Provides unique test accounts for each shard to prevent race conditions
 * when tests run in parallel across multiple shards.
 */

export interface TestAccount {
  email: string;
  password: string;
  displayName: string;
}

/**
 * Get the test account for the current shard
 * Falls back to test@example.com if SHARD_INDEX not set (local testing)
 */
export function getTestAccount(): TestAccount {
  const shardIndex = process.env.SHARD_INDEX || '0';
  const shardNum = parseInt(shardIndex, 10);
  
  if (shardNum === 0) {
    // Local testing - use default account
    return {
      email: 'test@example.com',
      password: 'testpassword123',
      displayName: 'Test User'
    };
  }
  
  // CI testing - use shard-specific account
  return {
    email: `test${shardNum}@example.com`,
    password: 'testpassword123',
    displayName: `Test User ${shardNum}`
  };
}

/**
 * Get bestie test account for the current shard
 */
export function getBestieTestAccount(): TestAccount {
  const shardIndex = process.env.SHARD_INDEX || '0';
  const shardNum = parseInt(shardIndex, 10);
  
  if (shardNum === 0) {
    return {
      email: 'testbestie@example.com',
      password: 'testpassword123',
      displayName: 'Test Bestie'
    };
  }
  
  return {
    email: `testbestie${shardNum}@example.com`,
    password: 'testpassword123',
    displayName: `Test Bestie ${shardNum}`
  };
}

/**
 * Get guardian test account for the current shard
 */
export function getGuardianTestAccount(): TestAccount {
  const shardIndex = process.env.SHARD_INDEX || '0';
  const shardNum = parseInt(shardIndex, 10);
  
  if (shardNum === 0) {
    return {
      email: 'testguardian@example.com',
      password: 'testpassword123',
      displayName: 'Test Guardian'
    };
  }
  
  return {
    email: `testguardian${shardNum}@example.com`,
    password: 'testpassword123',
    displayName: `Test Guardian ${shardNum}`
  };
}

/**
 * Get supporter test account for the current shard
 */
export function getSupporterTestAccount(): TestAccount {
  const shardIndex = process.env.SHARD_INDEX || '0';
  const shardNum = parseInt(shardIndex, 10);
  
  if (shardNum === 0) {
    return {
      email: 'testsupporter@example.com',
      password: 'testpassword123',
      displayName: 'Test Supporter'
    };
  }
  
  return {
    email: `testsupporter${shardNum}@example.com`,
    password: 'testpassword123',
    displayName: `Test Supporter ${shardNum}`
  };
}
