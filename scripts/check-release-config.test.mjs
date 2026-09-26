import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function check(url, key = 'test_example', profile = 'preview') {
  return spawnSync(process.execPath, ['scripts/check-release-config.mjs'], {
    env: {
      ...process.env,
      EXPO_PUBLIC_ANALYSIS_API_URL: url,
      EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: key,
      EXPO_PUBLIC_ALLOW_INSECURE_ANALYSIS_HTTP: 'false',
      EAS_BUILD_PROFILE: profile,
    },
    encoding: 'utf8',
  }).status;
}
assert.equal(check('https://api.example.com'), 0);
assert.equal(check('https://api.example.com', 'goog_example', 'production'), 0);
for (const url of [
  'http://api.example.com',
  'https://127.1',
  'https://172.16.0.1',
  'https://169.254.1.1',
  'https://100.64.0.1',
  'https://[::1]',
  'https://recall.local',
  'https://user:password@api.example.com',
]) {
  assert.notEqual(check(url), 0, `must reject ${url}`);
}
assert.notEqual(check('https://api.example.com', 'sk_secret'), 0);
assert.notEqual(check('https://api.example.com', 'test_example', 'production'), 0);
console.log('Release configuration validation tests passed');
