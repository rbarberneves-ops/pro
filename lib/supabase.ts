import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

// SecureStore tem limite de 2048 bytes — dividimos valores grandes em chunks
const CHUNK_SIZE = 1800;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    const chunkCount = await SecureStore.getItemAsync(`${key}_chunks`);
    if (chunkCount) {
      let value = '';
      for (let i = 0; i < parseInt(chunkCount); i++) {
        value += (await SecureStore.getItemAsync(`${key}_chunk_${i}`)) ?? '';
      }
      return value;
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (value.length > CHUNK_SIZE) {
      const chunks = Math.ceil(value.length / CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}_chunks`, String(chunks));
      for (let i = 0; i < chunks; i++) {
        await SecureStore.setItemAsync(`${key}_chunk_${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
      }
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  removeItem: async (key: string) => {
    const chunkCount = await SecureStore.getItemAsync(`${key}_chunks`);
    if (chunkCount) {
      for (let i = 0; i < parseInt(chunkCount); i++) {
        await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = 'https://mgyavdvbpbkywazcnnjt.supabase.co';
const supabaseAnonKey = 'sb_publishable_fg9HZQhu-YUYF_opO7qLIQ_GFFv0mRe';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
