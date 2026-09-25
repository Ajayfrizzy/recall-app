# Recall

Recall is an Android app that turns screenshots into user-controlled actions. It finds screenshots in the device gallery, reads their text on-device, and helps the user save products and places, keep content for later, create reminders or calendar events, group related items, resurface timely information, and review screenshots for deletion.

Screenshots are easy to capture and easy to forget. Recall preserves the intent behind them without making actions or deleting gallery items automatically.

## Features

- On-device OCR and local classification, available without Recall AI
- Optional GPT-5 mini analysis for structured product, event, deadline, place, content, and general results
- User-confirmed reminders, calendar events, saved products, saved places, and read-later items
- Multi-item actions, Smart Bundles, and Relevant Now resurfacing
- Screenshot Cleanup with explicit selection and Android Gallery confirmation
- Local persistence for app state and structured analysis results
- RevenueCat-managed Recall Pro paywall, purchases, restore flow, and entitlements
- Invitation-protected AI access and 90-day complimentary Pro for judge invitations

## How analysis works

OCR and AI analysis are separate:

1. `expo-ocr-kit` reads screenshot text on the device.
2. Recall creates a local result from that text.
3. Only after the user acknowledges optional AI processing and starts an eligible AI analysis does the app send the current screenshot, resized when needed and encoded as JPEG, plus its OCR text and limited time context to the Recall backend.
4. The backend calls `gpt-5-mini` through the OpenAI Responses API and validates a strict structured response.
5. The mobile app validates the response again. Provider and network failures preserve the on-device result.
6. The user decides whether to perform any suggested action.

See [Architecture](docs/architecture.md) for the full data flow.

## Architecture and stack

- Mobile: Expo SDK 57, React Native 0.86, React 19, Expo Router, TypeScript
- Device services: Expo Media Library, OCR Kit, Image Manipulator, Calendar, Notifications, SecureStore, and AsyncStorage
- Purchases: RevenueCat Purchases and RevenueCat Paywalls
- Backend: Node.js 22, TypeScript, OpenAI JavaScript SDK, Zod, and built-in `node:sqlite`
- AI: OpenAI Responses API, GPT-5 mini by default, and strict JSON Schema Structured Outputs
- Persistence: AsyncStorage on mobile; SQLite for backend access, quotas, spending estimates, and structured-result cache

The current backend is a single Node.js process. The planned production topology is a DigitalOcean VPS with Caddy, the Node backend, and a persistent SQLite volume. Container and Caddy files are not implemented in this repository yet; see [Deployment](docs/deployment.md).

## Requirements

- Node.js 22.13.x or newer in the Node 22 line. Expo SDK 57 documents Node 22.13.x as its minimum.
- npm
- Android Studio/device tooling or EAS CLI
- A development or preview build; Expo Go cannot exercise all native OCR and RevenueCat behavior
- A physical Android device for release verification

## Mobile setup

```sh
npm install
cp .env.example .env
npm run start
```

For a physical device, `EXPO_PUBLIC_ANALYSIS_API_URL` must be reachable from that device. A LAN URL can be used in a development build with `EXPO_PUBLIC_ALLOW_INSECURE_ANALYSIS_HTTP=true`; preview and production builds require public HTTPS.

Mobile environment variables:

| Variable                                   | Purpose                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `EXPO_PUBLIC_ANALYSIS_API_URL`             | Recall backend base URL                                                 |
| `EXPO_PUBLIC_ALLOW_INSECURE_ANALYSIS_HTTP` | Development-only opt-in for local HTTP                                  |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`   | Public Android RevenueCat SDK key                                       |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`       | Public iOS RevenueCat SDK key; unused by the current Android submission |

The `EXPO_PUBLIC_` variables are compiled into the app and are not secrets. Never put an OpenAI secret, RevenueCat secret key, invitation code, or installation token in them.

## Backend setup

```sh
cd server
npm install
cp .env.example .env
npm run dev
```

The backend exposes `GET /health`, `POST /access/redeem`, `POST /access/judge-entitlement`, and protected `POST /analyze`.

Backend environment variables:

| Variable                                    | Purpose / current default                                        |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `NODE_ENV`                                  | Runtime mode; use `production` on the server                     |
| `OPENAI_API_KEY`                            | Server-only OpenAI secret                                        |
| `OPENAI_MODEL`                              | Model, default `gpt-5-mini`                                      |
| `OPENAI_REQUEST_TIMEOUT_MS`                 | Provider timeout, default `45000`                                |
| `OPENAI_REASONING_EFFORT`                   | `minimal`, `low`, `medium`, or `high`; default `low`             |
| `OPENAI_TEXT_VERBOSITY`                     | `low`, `medium`, or `high`; default `low`                        |
| `OPENAI_ERROR_DETAILS`                      | Include concise provider details in server logs; default `false` |
| `AI_ANALYSIS_ENABLED`                       | Backend AI shutdown switch; default `false`                      |
| `RECALL_ACCESS_DB_PATH`                     | SQLite file, default `./data/recall-access.sqlite`               |
| `RECALL_TOKEN_PEPPER`                       | High-entropy server-only value used for HMAC hashing             |
| `AI_INSTALLATION_DAILY_LIMIT`               | Per-installation daily analyses, default `10`                    |
| `AI_GLOBAL_DAILY_LIMIT`                     | Global daily analyses, default `40`                              |
| `AI_GLOBAL_CONCURRENCY_LIMIT`               | Concurrent provider calls, default `2`                           |
| `AI_ACCESS_TOKEN_TTL_DAYS`                  | Standard installation access lifetime, default `30`              |
| `AI_INVITATION_TTL_DAYS`                    | Standard invitation lifetime, default `7`                        |
| `AI_REDEMPTION_WINDOW_MINUTES`              | Failed-redemption window, default `15`                           |
| `AI_REDEMPTION_MAX_FAILURES`                | Failed redemptions per hashed address/window, default `5`        |
| `AI_MONTHLY_ESTIMATED_LIMIT_USD`            | Estimated monthly AI ceiling, default `1.50`                     |
| `AI_REQUEST_RESERVATION_USD`                | Per-request budget reservation, default `0.05`                   |
| `OPENAI_INPUT_PRICE_PER_MILLION_USD`        | Cost estimator input rate, default `0.25`                        |
| `OPENAI_CACHED_INPUT_PRICE_PER_MILLION_USD` | Cost estimator cached-input rate, default `0.025`                |
| `OPENAI_OUTPUT_PRICE_PER_MILLION_USD`       | Cost estimator output rate, default `2.00`                       |
| `REVENUECAT_SECRET_API_KEY`                 | Server-only RevenueCat v1 secret for judge Pro provisioning      |
| `MOCK_ANALYSIS`                             | Deterministic fixtures in development/test only; default `false` |
| `PORT`                                      | HTTP port, default `8787`                                        |
| `ALLOWED_ORIGIN`                            | CORS origin; CORS is not native-client authentication            |
| `RECALL_PUBLIC_BASE_URL`                    | Public backend URL; production requires HTTPS                    |

Use [server/.env.example](server/.env.example) as the source of truth for deploy-time values. Production startup rejects mock mode, a missing RevenueCat secret, and a non-HTTPS public base URL.

## Development and checks

```sh
npm run start
npm run android
npm run lint
npx tsc --noEmit
npm run screenshots:check
npm run actions:check
npm run library:check
npm run ai-access:check
npm run persistence:check
npm run bundles:check
npm run resurfacing:check
npm run cleanup:check
npm run subscription:check
npm run ui:check
npm run format:check

cd server
npm run typecheck
npm run fixtures:check
npm run access:check
npm run format:check
```

`fixtures:check` skips the paid live OpenAI call unless `RUN_OPENAI_LIVE_TEST=true` is deliberately set. See [Release QA](docs/release-qa.md) for device testing.

## Builds

```sh
eas build --profile development --platform android
eas build --profile preview --platform android
```

The `preview` profile is configured to produce an internal APK, but the final standalone judge APK and its clean-install flow have not yet been verified. Run `npm run release:config-check` in the configured preview environment first.

## RevenueCat and judge access

Recall checks the `pro` entitlement, loads the default offering, presents the RevenueCat paywall, and supports Restore Purchases. The dashboard must provide Monthly and Yearly packages.

- Free: cleanup batches of up to 3 screenshots and up to 3 Relevant Now cards
- Pro: larger cleanup batches and up to 5 Relevant Now cards

Standard invitations enable AI access only. Judge invitations create 90-day installation access and request a matching 90-day promotional `pro` entitlement through the backend. Invitations do not bypass AI quotas, concurrency limits, the shutdown switch, or the spending ceiling.

From `server/`:

```sh
npm run access:admin -- create-invitations 1
npm run access:admin -- create-judge-invitations 1
npm run access:admin -- list-invitations
npm run access:admin -- revoke-invitation INVITATION_ID
npm run access:admin -- list-tokens
npm run access:admin -- revoke-token TOKEN_ID
npm run access:admin -- usage
```

Generate codes only in a private operator terminal and deliver them privately. Do not place codes in source, documentation, screenshots, EAS variables, or logs.

## Privacy and security

- Screenshot access uses Android media-library permission and may be full or user-selected.
- OCR runs on-device. AI upload is optional and user initiated.
- OpenAI and RevenueCat secret keys remain on the backend.
- Installation access tokens are stored in SecureStore on-device and HMAC-hashed in SQLite on the backend.
- App state, including saved items and structured results, is stored locally in AsyncStorage.
- The backend does not store uploaded image bytes or OCR text as standalone fields. It does store access records, quota/cost records, request fingerprints, and cached structured analysis JSON in SQLite.
- The current backend has no automatic cache-retention purge or user-facing backend deletion workflow. This must be addressed or documented operationally before a public launch.
- Gallery deletion always requires an explicit user action and Android confirmation; Recall's saved record can remain after the original asset is deleted.

Read the draft [Privacy Policy](docs/privacy-policy.md) before testing with personal screenshots.

## Current limitations

- The public HTTPS backend, deployment automation, standalone APK, and clean first-time judge installation remain pending.
- Android is the tested submission platform; iOS is not release-qualified.
- AI quality depends on screenshot clarity, OCR quality, connectivity, and provider availability.
- Access is installation-based, not a user account, and does not sync across devices.
- Backend SQLite is single-host state; the supplemental 30-requests/minute limiter is in memory.
- Cached structured backend analyses have no implemented automatic retention period.
- Date and time actions still require user review when source content is incomplete.
- RevenueCat products, offerings, entitlement, and keys must match the selected RevenueCat project.

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment plan](docs/deployment.md)
- [Privacy policy draft](docs/privacy-policy.md)
- [Judge guide](docs/judge-guide.md)
- [Next Gen submission checklist](docs/next-gen-submission.md)
- [Release QA](docs/release-qa.md)
- [Release notes](docs/release-notes.md)
- [Submission notes](docs/submission-notes.md)
- [Submission asset checklist](docs/submission-checklist.md)
- [Demo script](docs/demo-script.md)

## License

Recall is open source under the [MIT License](LICENSE).
