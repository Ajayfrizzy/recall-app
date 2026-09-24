import * as SecureStore from 'expo-secure-store';
import { createAiAccessClient, resolveAnalysisApiUrl } from './access-client';

const ACCESS_KEY = 'recall.ai.installation-access.v1';

const client = createAiAccessClient({
  storage: {
    async get() {
      if (!(await SecureStore.isAvailableAsync())) return null;
      return SecureStore.getItemAsync(ACCESS_KEY);
    },
    async set(value) {
      if (!(await SecureStore.isAvailableAsync())) {
        throw new Error('Secure credential storage is unavailable on this device.');
      }
      await SecureStore.setItemAsync(ACCESS_KEY, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    },
    async remove() {
      if (await SecureStore.isAvailableAsync()) await SecureStore.deleteItemAsync(ACCESS_KEY);
    },
  },
  getBaseUrl: getAnalysisApiUrl,
});

export function getAnalysisApiUrl(): string {
  return resolveAnalysisApiUrl(
    process.env.EXPO_PUBLIC_ANALYSIS_API_URL,
    __DEV__ && process.env.EXPO_PUBLIC_ALLOW_INSECURE_ANALYSIS_HTTP === 'true',
  );
}

export const aiAccessClient = client;
export { AiAccessError, type AiAccessCredentials } from './access-client';
