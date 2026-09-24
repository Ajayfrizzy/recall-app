import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const backendUrl = process.env.EXPO_PUBLIC_ANALYSIS_API_URL?.trim();
const revenueCatAndroidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();

assert(backendUrl, 'EXPO_PUBLIC_ANALYSIS_API_URL is required for the Android preview build.');
const parsedBackendUrl = new URL(backendUrl);
assert.equal(parsedBackendUrl.protocol, 'https:', 'The preview backend URL must use HTTPS.');
assert(
  !['localhost', '127.0.0.1', '10.0.2.2'].includes(parsedBackendUrl.hostname) &&
    !/^192\.168\./.test(parsedBackendUrl.hostname) &&
    !/^10\./.test(parsedBackendUrl.hostname),
  'The preview backend URL must be reachable outside the development LAN.',
);
assert(
  revenueCatAndroidKey,
  'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY is required for the Android preview build.',
);
assert.notEqual(
  process.env.EXPO_PUBLIC_DEV_FORCE_PRO?.trim().toLowerCase(),
  'true',
  'EXPO_PUBLIC_DEV_FORCE_PRO must not be enabled in a preview build.',
);
assert.notEqual(
  process.env.EXPO_PUBLIC_ALLOW_INSECURE_ANALYSIS_HTTP?.trim().toLowerCase(),
  'true',
  'EXPO_PUBLIC_ALLOW_INSECURE_ANALYSIS_HTTP must not be enabled in a preview build.',
);

const [appConfig, easConfig] = await Promise.all([
  readFile(new URL('../app.json', import.meta.url), 'utf8'),
  readFile(new URL('../eas.json', import.meta.url), 'utf8'),
]);
assert(
  !appConfig.includes('OPENAI_API_KEY'),
  'The mobile app config must not contain OPENAI_API_KEY.',
);
assert(!easConfig.includes('OPENAI_API_KEY'), 'The EAS config must not contain OPENAI_API_KEY.');

const eas = JSON.parse(easConfig);
assert.equal(eas.build?.preview?.distribution, 'internal');
assert.equal(eas.build?.preview?.android?.buildType, 'apk');

console.log('Android preview release configuration checks passed.');
