import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const backendUrl = process.env.EXPO_PUBLIC_ANALYSIS_API_URL?.trim();
const revenueCatAndroidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();

assert(backendUrl, 'EXPO_PUBLIC_ANALYSIS_API_URL is required for the Android preview build.');
const parsedBackendUrl = new URL(backendUrl);
assert.equal(parsedBackendUrl.protocol, 'https:', 'The preview backend URL must use HTTPS.');
const hostname = parsedBackendUrl.hostname.toLowerCase().replace(/\.$/, '');
assert(
  !/^(localhost|.*\.(localhost|local|internal))$/.test(hostname) &&
    !/^(0|10|127)\./.test(hostname) &&
    !/^192\.168\./.test(hostname) &&
    !/^169\.254\./.test(hostname) &&
    !/^172\.(1[6-9]|2\d|3[01])\./.test(hostname) &&
    !/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(hostname) &&
    !hostname.startsWith('['),
  'The preview backend URL must be reachable outside the development LAN.',
);
assert(
  !parsedBackendUrl.username && !parsedBackendUrl.password,
  'Do not embed credentials in the backend URL.',
);
assert(
  revenueCatAndroidKey,
  'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY is required for the Android preview build.',
);
assert(
  /^(goog|test)_[A-Za-z0-9]+$/.test(revenueCatAndroidKey),
  'Use an Android public SDK key or a RevenueCat Test Store public key.',
);
if (process.env.EAS_BUILD_PROFILE === 'production') {
  assert(
    revenueCatAndroidKey.startsWith('goog_'),
    'Production builds must use the Google Play public SDK key, not Test Store.',
  );
}
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
assert(
  !appConfig.includes('REVENUECAT_SECRET_API_KEY'),
  'The mobile app config must not contain the RevenueCat secret API key.',
);
assert(
  !easConfig.includes('REVENUECAT_SECRET_API_KEY'),
  'EAS mobile configuration must not contain the RevenueCat secret API key.',
);

const eas = JSON.parse(easConfig);
assert.equal(eas.build?.preview?.distribution, 'internal');
assert.equal(eas.build?.preview?.android?.buildType, 'apk');

console.log('Android preview release configuration checks passed.');
