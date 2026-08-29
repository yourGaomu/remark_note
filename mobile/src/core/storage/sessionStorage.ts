import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { UserBasicInfo } from '../types/domain';

const sessionKey = 'ezbookkeeping.mobile.session';

export interface StoredSession {
  token: string;
  user?: UserBasicInfo;
}

export async function loadSession(): Promise<StoredSession | null> {
  const value = Platform.OS === 'web'
    ? globalThis.localStorage?.getItem(sessionKey) ?? null
    : await SecureStore.getItemAsync(sessionKey);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredSession;
  } catch {
    await clearSession();
    return null;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  const value = JSON.stringify(session);
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(sessionKey, value);
    return;
  }
  await SecureStore.setItemAsync(sessionKey, value);
}

export async function clearSession(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(sessionKey);
    return;
  }
  await SecureStore.deleteItemAsync(sessionKey);
}
