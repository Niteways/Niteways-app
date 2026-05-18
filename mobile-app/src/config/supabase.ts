import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

const SUPABASE_URL = (Config.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (Config.SUPABASE_ANON_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in mobile app environment.');
}

if (!/^https:\/\/.+/i.test(SUPABASE_URL)) {
  console.warn('[supabase] SUPABASE_URL should be an https URL.', SUPABASE_URL.slice(0, 60));
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
