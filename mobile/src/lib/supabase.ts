import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import type { Database } from '../types/database';

// Read from app config (app.config.js loads .env and puts values in extra)
const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl = (extra.EXPO_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    'Supabase config missing. Create mobile/.env with:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key\n\n' +
    'Then run: npx expo start --clear';
  throw new Error(msg);
}

function createSecureStorage() {
  return {
    getItem: async (key: string) => {
      try {
        return await SecureStore.getItemAsync(key);
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch {}
    },
    removeItem: async (key: string) => {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {}
    },
  };
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createSecureStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
