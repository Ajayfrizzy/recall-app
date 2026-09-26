# Recall

Recall is an Android app that turns screenshots into user-controlled actions. It discovers screenshots in the device gallery, reads text on-device, and helps users save products and places, keep content for later, create reminders or calendar events, group related items, resurface timely information, and review screenshots for deletion.

Recall never performs a suggested action or deletes a Gallery item without confirmation.

## Shipaton 2026 — Next Gen

Recall is being prepared for Shipaton 2026's **Next Gen Award**, which evaluates the public repository and demo video rather than a published store listing. Entrants must meet the student and academic-email requirements in the [official rules](https://revenuecat-shipaton-2026.devpost.com/rules). The final demo video and submission screenshots are pending. See the [submission checklist](docs/submission.md) and [judge guide](docs/judge-guide.md).

## Features

- On-device OCR and local classification that work without Recall AI
- Optional GPT-5 mini analysis with validated product, event, deadline, place, content, and general results
- User-confirmed reminders, calendar events, saved products, saved places, and read-later items
- Multi-item actions, duplicate protection, Smart Bundles, and Relevant Now resurfacing
- Screenshot Cleanup with explicit selection and Android Gallery confirmation
- Local mobile persistence and graceful on-device fallback when AI is unavailable
- RevenueCat-managed Recall Pro paywall, purchases, restore flow, and entitlements
- Invitation-protected AI access and 90-day complimentary Pro for judge invitations

## Architecture

- **Mobile:** Expo SDK 57, React Native 0.86, React 19.2.3, Expo Router, and TypeScript
- **Device services:** Expo Media Library, OCR Kit, Image Manipulator, Calendar, Notifications, SecureStore, and AsyncStorage
- **Subscriptions:** RevenueCat Purchases and RevenueCat Paywalls using the `pro` entitlement
- **Backend:** Node.js 22, TypeScript, OpenAI JavaScript SDK, Zod, and `node:sqlite`
- **Hosting:** an InterServer Ubuntu VPS running the backend and Caddy with Docker Compose and HTTPS
- **Persistence:** AsyncStorage on-device and a persistent SQLite volume for backend access, quotas, spending estimates, and structured-result cache

OCR and local classification run on the device. Optional Recall AI sends only the selected, resized screenshot, its OCR text, and limited time context over HTTPS after the user acknowledges processing and starts analysis. The backend authenticates the installation, applies quota and spending controls, calls the OpenAI Responses API, and validates the structured result. The app validates it again before display.

See [Architecture](docs/architecture.md) for the data flow and trust boundaries, and [Deployment](docs/deployment.md) for the current InterServer runbook.

## Requirements

- Node.js 22.23.x is recommended. Expo SDK 57 requires Node.js 22.13.x or newer, and the backend requires Node.js 22.16 or newer.
- npm
- Android Studio/device tooling or EAS CLI
- A development or preview build for native OCR and RevenueCat behavior; Expo Go is insufficient for release verification
- A physical Android device for final QA

## Mobile development

```sh
git clone https://github.com/Ajayfrizzy/recall-app.git
cd recall-app
npm ci
npm ci --prefix server
cp .env.example .env
```

For local-only testing, leave the API URL and RevenueCat keys empty rather than using the example placeholder values. Skip AI activation. Screenshot discovery, OCR/local classification, saves, reminders, and calendar actions do not require AI access. AI and purchases require their respective configuration.

Create and install a native development build, then start Metro:

```sh
npx eas-cli login
npx eas-cli build --profile development --platform android
# Install the resulting development APK on the device.
npx expo start --dev-client
```

Open Recall's development client and connect to the displayed Metro URL. EAS requires an Expo account; Android Studio with `npx expo run:android` is the local-build alternative. Expo Go cannot replace this native build. For USB testing, run `adb reverse tcp:8081 tcp:8081` and start Metro with `npx expo start --dev-client --localhost`. Install the server dependencies above even for local-only testing because the check scripts use its TypeScript runner.

Set these mobile variables in `.env`:

| Variable                                   | Purpose                                                           |
| ------------------------------------------ | ----------------------------------------------------------------- |
| `EXPO_PUBLIC_ANALYSIS_API_URL`             | Recall backend base URL                                           |
| `EXPO_PUBLIC_ALLOW_INSECURE_ANALYSIS_HTTP` | Local-development-only opt-in for HTTP                            |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`   | Public Android RevenueCat SDK key                                 |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`       | Public iOS RevenueCat SDK key; not used by the Android submission |

`EXPO_PUBLIC_` values are compiled into the app and are not secrets. Never put an OpenAI secret, RevenueCat secret key, invitation code, or installation token in them. Physical devices need a reachable backend URL; preview and production builds require public HTTPS.

## Backend development

```sh
cd server
npm install
cp .env.example .env
npm run dev
```

`server/.env.example` is the source of truth for backend settings. Keep `OPENAI_API_KEY`, `REVENUECAT_SECRET_API_KEY`, and `RECALL_TOKEN_PEPPER` server-only. AI starts disabled through `AI_ANALYSIS_ENABLED=false`, and production rejects mock analysis, missing required secrets, and a non-HTTPS public base URL.

The backend exposes `GET /health`, `POST /access/redeem`, `POST /access/judge-entitlement`, and authenticated `POST /analyze`.

## Checks

Run the mobile and shared checks from the repository root:

```sh
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
npm run docs:check
npm run format:check
node scripts/check-release-config.test.mjs
```

Run backend checks separately:

```sh
cd server
npm run typecheck
npm run fixtures:check
npm run access:check
npm run format:check
npm run build
```

`fixtures:check` does not make a paid OpenAI call unless `RUN_OPENAI_LIVE_TEST=true` is deliberately set. See [Release QA](docs/release-qa.md) for the distinction between automated, existing-device, and clean standalone APK verification.

## Builds

The [GitHub Actions workflow](.github/workflows/checks.yml) runs offline checks on pushes and pull requests. A successful GitHub-hosted run is not yet recorded. Native Maestro checks run separately; see [Release QA](docs/release-qa.md#maestro-native-smoke-tests) for setup, commands, and results.

```sh
eas build --profile development --platform android
eas build --profile preview --platform android
```

The `preview` profile creates an internal APK. Run `npm run release:config-check` in the configured preview environment before building. The public backend is deployed, but the final standalone APK and clean first-time judge flow still require release verification.

## Access and subscriptions

Free users can clean up to 3 screenshots per batch and see up to 3 Relevant Now cards. Recall Pro removes the application-level cleanup batch cap and allows up to 5 Relevant Now cards. Android still controls deletion confirmation. RevenueCat supplies the default offering, managed paywall, purchases, restore flow, and entitlement state.

Standard invitations enable AI only. Judge invitations create 90-day installation access and request a matching 90-day promotional `pro` entitlement. Invitations never bypass AI quotas, concurrency limits, the shutdown switch, or the spending ceiling.

Invitation administration is documented in the private-operator sections of [Deployment](docs/deployment.md). Generate and deliver codes only through a secure private channel; never add them to source, documentation, screenshots, EAS variables, or logs.

## Privacy and limitations

- Original screenshots stay in Android Gallery unless the user confirms deletion.
- The backend does not store uploaded image bytes or OCR text as standalone fields, but it does store access records, quota/cost records, request fingerprints, and cached structured analysis JSON in SQLite.
- Recall has no user account or cross-device sync.
- Backend structured-result cache records do not yet have an automatic retention purge or user-facing deletion workflow.
- Android is the release target; iOS is not release-qualified.
- AI quality depends on screenshot clarity, OCR quality, connectivity, and provider availability.

Review the draft [Privacy Policy](docs/privacy-policy.md) before testing with personal screenshots. Its legal identity, contact, effective-date, retention, and related publication placeholders remain intentionally unresolved.

## Documentation

- [Architecture](docs/architecture.md)
- [InterServer deployment and rollback](docs/deployment.md)
- [Judge guide](docs/judge-guide.md)
- [Release QA](docs/release-qa.md)
- [Shipaton submission guide](docs/submission.md)
- [Demo recording script](docs/demo-script.md)
- [Privacy policy draft](docs/privacy-policy.md)
- [Release history](docs/release-notes.md)

## License

Recall is open source under the [MIT License](LICENSE).
