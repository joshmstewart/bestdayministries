/**
 * Shared auth storage keys for dual-client auth.
 *
 * IMPORTANT: The standard client (localStorage) and persistent client (IndexedDB)
 * must NOT share the same storageKey, otherwise Supabase will warn about multiple
 * GoTrueClient instances and Safari can get into undefined behavior.
 */

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

// Standard Supabase client default key (localStorage-backed)
export const STANDARD_AUTH_STORAGE_KEY = `sb-${PROJECT_ID}-auth-token`;

// Persistent client key (IndexedDB-backed via idbAuthStorage)
export const PERSISTENT_AUTH_STORAGE_KEY = `sb-${PROJECT_ID}-auth-token-persistent`;
