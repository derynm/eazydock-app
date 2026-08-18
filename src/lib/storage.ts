import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Token-safe key/value storage. SecureStore on native; localStorage on web
 * (SecureStore is unavailable there). Same async surface everywhere.
 */
const isWeb = Platform.OS === 'web';

export const storage = {
  async get(key: string): Promise<string | null> {
    if (isWeb) {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (isWeb) {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* ignore */
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (isWeb) {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        /* ignore */
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const StorageKeys = {
  token: 'admin_token',
  companyId: 'active_company_id',
  buildingId: 'selected_building_id',
  buildingName: 'selected_building_name',
  lastTransactionParkingAreaId: 'last_transaction_parking_area_id',
  themeMode: 'theme_mode',
} as const;
