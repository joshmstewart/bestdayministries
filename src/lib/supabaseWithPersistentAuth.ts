/**
 * Supabase client with persistent auth storage for iOS PWA.
 * 
 * This module exports a Supabase client that uses IndexedDB for auth token
 * storage, which is more persistent on iOS PWAs than localStorage.
 * 
 * iOS aggressively clears localStorage for PWAs, causing users to be logged
 * out when reopening from the home screen. IndexedDB survives this clearing.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { idbAuthStorage } from './idbAuthStorage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client configured with IndexedDB-based auth storage.
 * Use this for better session persistence on iOS PWAs.
 */
export const supabasePersistent = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: idbAuthStorage,
      persistSession: true,
      autoRefreshToken: true,
      storageKey: `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`,
    },
  }
);
