# Recall

Turn screenshots into actions.

## Problem

Screenshots are easy to save and easy to forget. Important products, events, deadlines, places, and posts become undifferentiated gallery clutter.

## Solution

Recall reads screenshot text on-device, optionally uses server-side vision analysis to understand the screenshot's structure, and lets the user turn detected items into deliberate actions. Recall never automatically creates actions or deletes screenshots.

## Key features

- On-device OCR and local fallback classification
- Structured product, event, deadline, place, content, and general analysis
- Calendar events, reminders, saved products, saved places, and read-later items
- Multi-item Smart Actions, Smart Bundles, and Relevant Now resurfacing
- Reviewed Screenshot Cleanup with explicit Gallery deletion confirmation
- Recall Pro subscriptions and a RevenueCat-managed paywall
- Local persistence for app state and analysis results
- Invitation-protected AI access with encrypted installation-token storage

## Architecture

```text
Screenshot → on-device OCR → compressed image + OCR text → Recall backend
           → OpenAI structured analysis → mobile validation
           → Actions / Bundles / Resurfacing / Cleanup
```

The mobile app uses Expo SDK 57 and React Native. It integrates Media Library, OCR, AsyncStorage, Calendar, Notifications, and RevenueCat. The Node/TypeScript backend accepts one prepared screenshot per request and calls the OpenAI Responses API. Its output must conform to the shared `RecallAnalysis` shape before it reaches the app, where it is validated again. `POST /access/redeem` exchanges a single-use invitation for an expiring installation token; `POST /analyze` requires that token as a Bearer credential.

## AI analysis

Real analysis uses `gpt-5-mini` by default through the OpenAI Responses API. A compressed JPEG and on-device OCR text are sent in the same request. The response uses strict JSON Schema Structured Outputs and is validated with Zod. Requests are stateless (`store: false`), have a 25-second provider timeout, do not enable tools, and do not include screenshot history or unrelated user state.

OpenAI usage is server-side and pay-as-you-go. The model is configurable with `OPENAI_MODEL`; no OpenAI key belongs in the mobile bundle.

`MOCK_ANALYSIS=true` keeps deterministic fixture analysis available only when `NODE_ENV` is `development` or `test`. Mock requests still require valid installation access. The final demo should use real AI with `MOCK_ANALYSIS=false`.

### Invitation access and safeguards

Standard AI invitation access is not an account and never grants Recall Pro. Judge invitations also provision a 90-day promotional RevenueCat `pro` entitlement for that installation. Neither invitation type bypasses AI quotas, shutdown, concurrency controls, or the global spending ceiling. Full user authentication and cross-device identity are future work.

The backend hashes tokens in SQLite, isolates cached results by installation, and persists quota/cache records across restarts. Defaults are 10 analyses per installation per UTC day, 40 globally per UTC day, two concurrent requests, and a $1.50 estimated monthly ceiling. A normal repeat can use the server cache without consuming another allowance; only the explicit **Reanalyze with Recall AI** action sends `reanalyze: true`.

The mobile app stores only the access token and expiration in `expo-secure-store`, never AsyncStorage. Expired, revoked, or invalid credentials are removed locally. Invitation codes and tokens must not be placed in source, APK configuration, EAS variables, or logs.

## RevenueCat integration

Recall checks the `pro` entitlement and uses the default RevenueCat offering with Monthly and Yearly packages configured in the RevenueCat dashboard. The app presents the RevenueCat Paywall and supports Restore Purchases.

- Free: cleanup batches of up to 3 screenshots and up to 3 Relevant Now cards
- Pro: larger cleanup batches and up to 5 Relevant Now cards

## Local-first and privacy approach

Screenshots and OCR stay on-device unless the user acknowledges and starts AI analysis. The mobile app sends only the current compressed screenshot, OCR text, and time context. The backend does not persist images or analysis bodies and its diagnostics omit image data, OCR text, and API keys. AI output is advisory: the user confirms actions and deletion.

## Tech stack

- Expo SDK 57, React Native 0.86, Expo Router, TypeScript
- Expo Media Library, Image Manipulator, Calendar, Notifications, and OCR Kit
- AsyncStorage
- RevenueCat Purchases and RevenueCat Paywalls
- Node.js, Zod, and the OpenAI JavaScript SDK

## Running locally

Requirements: Node.js 22.13 or newer, Android Studio/device tooling, and a development build for native OCR and RevenueCat modules.

```sh
npm install
cp .env.example .env
npm run start
```

Set `EXPO_PUBLIC_ANALYSIS_API_URL` to a backend URL reachable from the device, such as `http://192.168.x.x:8787`. Do not use `localhost` for a separate physical Android device. Local HTTP additionally requires `EXPO_PUBLIC_ALLOW_INSECURE_ANALYSIS_HTTP=true` in a development build. Preview and production builds require HTTPS.

## Backend setup

```sh
cd server
npm install
cp .env.example .env
npm run dev
```

The server exposes `GET /health`, `POST /access/redeem`, and protected `POST /analyze`. For a real-AI run, place secrets only in `server/.env` or the backend host's secret manager.

Generate invitations and administer installation access from the server directory:

```sh
npm run access:admin -- create-invitations 3
npm run access:admin -- create-judge-invitations 1
npm run access:admin -- list-invitations
npm run access:admin -- revoke-invitation INVITATION_ID
npm run access:admin -- list-tokens
npm run access:admin -- revoke-token TOKEN_ID
npm run access:admin -- usage
```

Standard invitations use the configurable `AI_INVITATION_TTL_DAYS`; judge invitations expire after 60 days and create 90-day installation access. Generate codes only in a private operator terminal, retain the accompanying invitation ID for revocation, deliver each code through a private channel, and never paste active codes into source, issues, screenshots, APK/EAS configuration, or public documentation. Testers open **Profile → Activate AI** and enter a code once. Revoke an unused code with its invitation ID, or revoke redeemed access with the opaque token ID shown by `list-tokens`; raw installation tokens are never displayed by the admin command.

## Environment variables

Mobile (`.env`):

```dotenv
EXPO_PUBLIC_ANALYSIS_API_URL=http://YOUR_LAN_IP:8787
EXPO_PUBLIC_ALLOW_INSECURE_ANALYSIS_HTTP=true
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=test_YOUR_PUBLIC_ANDROID_SDK_KEY
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=test_YOUR_PUBLIC_IOS_SDK_KEY
```

Backend (`server/.env`):

```dotenv
NODE_ENV=development
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OPENAI_REQUEST_TIMEOUT_MS=45000
OPENAI_REASONING_EFFORT=low
OPENAI_TEXT_VERBOSITY=low
OPENAI_ERROR_DETAILS=false
REVENUECAT_SECRET_API_KEY=
MOCK_ANALYSIS=false
PORT=8787
ALLOWED_ORIGIN=http://localhost:8081
RECALL_PUBLIC_BASE_URL=http://localhost:8787
```

`OPENAI_REQUEST_TIMEOUT_MS` accepts 5000–120000 milliseconds and falls back to 45000
when absent or invalid. `OPENAI_REASONING_EFFORT` accepts `minimal`, `low`, `medium`, or
`high`; `OPENAI_TEXT_VERBOSITY` accepts `low`, `medium`, or `high`. Invalid values fall
back to `low`. Keep `OPENAI_ERROR_DETAILS=false` unless concise provider messages are
needed during development.

Never prefix `OPENAI_API_KEY`, `REVENUECAT_SECRET_API_KEY`, an invitation, or an installation token with `EXPO_PUBLIC_`, or place one in Expo/EAS configuration. In production, set `NODE_ENV=production`, `MOCK_ANALYSIS=false`, a high-entropy `RECALL_TOKEN_PEPPER`, `AI_ANALYSIS_ENABLED=true`, the RevenueCat v1 secret key, and an HTTPS `RECALL_PUBLIC_BASE_URL`; terminate TLS at the service or a trusted reverse proxy. Restrict `ALLOWED_ORIGIN` where the client environment makes that effective. Back up the SQLite database if invitation, revocation, quota, and cache continuity must survive host replacement.

## Development build

Native OCR and purchase testing require a development or preview build rather than Expo Go.

```sh
eas build --profile development --platform android
```

After final validation, create the standalone internal preview with:

```sh
eas build --profile preview --platform android
```

## Demo flow

Use real AI and stable sample screenshots for the final demo:

1. Open Inbox and analyze the INGREM product grid.
2. Show four products, then Save All Products.
3. Open Library and the generated INGREM Smart Bundle.
4. Show Relevant Now and a scholarship reminder in Upcoming.
5. Review Screenshot Cleanup and its Gallery deletion warning.
6. Open Profile, the RevenueCat paywall, and the Recall Pro state.

See [docs/demo-script.md](docs/demo-script.md) for the timed version.

## Known limitations

- Physical-device AI quality depends on screenshot clarity, OCR quality, connectivity, and provider availability.
- The hackathon backend has installation access rather than full user authentication. Its supplemental request limiter is in-memory; durable quotas and spending state are SQLite-backed.
- Access is installation-local and cannot sync across devices. Clearing/reinstall behavior follows platform SecureStore/Keychain behavior.
- CORS is not an authentication boundary for native clients.
- Exact date/time actions still require user review when the screenshot is incomplete.
- RevenueCat offerings and products must be configured in its dashboard.

## License

MIT. See [LICENSE](LICENSE).
