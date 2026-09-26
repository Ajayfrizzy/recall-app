# Recall Architecture

This document describes the implementation currently in the repository and its deployed single-host topology. The backend runs on an InterServer Ubuntu VPS behind Caddy; see [deployment.md](./deployment.md).

## System view

```text
Android Gallery
      |
      | user grants full or selected-photo access
      v
Expo Media Library -----> Inbox / screenshot detail
      |                           |
      | asset URI                 | user starts analysis
      v                           v
On-device OCR ------------> Local classification and fallback
                                  |
                                  | optional, acknowledged Recall AI request
                                  v
                  Resize to <= 1800 px long edge, JPEG 85%
                                  |
                         HTTPS + Bearer token
                                  v
                    Caddy reverse proxy
                                  |
                         Compose private network
                                  v
                    Recall Node.js backend
                      |                 |
                      |                 +--> SQLite
                      |                      access, quotas, spend,
                      |                      fingerprints, result cache
                      v
              OpenAI Responses API
                 GPT-5 mini
                      |
            strict structured result
                      v
              server Zod validation
                      |
              mobile validation
                      v
       User-controlled actions and local persistence
       | reminders | calendar | library | bundles |
       | Relevant Now | reviewed gallery cleanup |
```

## Screenshot discovery and permissions

The app requests photo access through `expo-media-library/legacy`. Full access queries the device's Screenshots album; limited access queries only assets selected in Android's system picker. Permission changes are re-read when the app returns to the foreground. Recall keeps the Media Library asset ID as the screenshot identity and does not copy every source image into app storage.

The current Android configuration requests image/media permissions. Calendar access is write-only through the Expo Calendar plugin. Notification permission is requested only when the user creates a reminder.

## Analysis data flow

1. `recognizeScreenshotText` passes the selected local image URI to `expo-ocr-kit`. Text and OCR blocks are produced on-device.
2. Local understanding classifies the OCR text and produces a usable fallback result.
3. AI is requested only when the user has acknowledged semantic processing, chooses AI, and has a valid invitation-derived access token.
4. Image Manipulator resizes images whose long edge exceeds 1800 pixels and creates a JPEG at 0.85 quality. The app sends the data URL, OCR text, timezone, filename, dimensions, and screenshot creation time for that one screenshot.
5. The backend authenticates the Bearer token, checks the shutdown switch, cache, quotas, concurrency, estimated monthly spend, and the in-memory request limiter.
6. The backend sends the image and OCR evidence to the OpenAI Responses API with `store: false`, no tools, and strict JSON Schema output.
7. Zod validates the provider result. The app validates it again before replacing the local result. Failures return to the local result without automatic paid retries.

A normal identical request may reuse the per-installation SQLite cache. Only the explicit **Reanalyze with Recall AI** path bypasses cache lookup.

The mobile AI request deadline covers both HTTP headers and response-body reading. Stalled body reading is raced against cancellation; timeout and invalid-response paths retain the on-device fallback without automatic paid retries.

## Local persistence

AsyncStorage holds a versioned JSON state containing screenshot statuses and structured analyses, saved Library items, Upcoming reminders/events, action records, Smart Bundles, bundle overrides, Relevant Now preferences, the AI-processing acknowledgement, and onboarding completion. Screenshot image bytes remain in the Android Gallery.

The AI installation token, expiration, judge metadata, and provisioning status are stored separately in Expo SecureStore. Clearing or reinstalling behavior depends on the platform's storage behavior. Recall currently has no account or cross-device sync.

Storage read failures, malformed JSON, and unsupported state versions show a retry screen instead of silently opening empty state. Writes retain optimistic in-memory state but persist in order. Failed writes remain pending until an explicit retry succeeds, and a dialog warns about losing unsaved changes if the app closes. This is recovery feedback, not a backup service.

## Actions and reminders

Actions are suggestions, not automatic operations. The user confirms each save, reminder, calendar event, or deletion. Reminder creation requests notification permission and schedules a local notification. Calendar events use the platform calendar form/write flow. Upcoming records and external notification/calendar identifiers are retained in local app state for display and duplicate prevention.

## Smart Bundles and Relevant Now

Smart Bundles group related locally stored Library items. Users can refresh membership, remove or restore an item, archive a bundle, and restore archived bundles. Membership overrides are persisted locally.

Relevant Now derives cards locally from saved content, upcoming dates, screenshot state, and user preferences. Snooze and dismiss choices are persisted. Free and Pro presentation limits come from the subscription feature rules.

Snooze hides the underlying item for a full 24 hours, including across deadline date-bucket changes, bundle updates, and summary week rollover. Existing occurrence IDs are normalized for snooze matching; Dismiss remains occurrence-specific. Refresh occurs at the next snooze expiry or midnight and when the app returns to the foreground. Items return only if still eligible and within the ranked card limit. Snooze does not cancel reminders or delete saved content.

## Screenshot Cleanup

Cleanup derives candidates from screenshots, action records, and bundle membership. The user selects candidates, sees whether an item is safe or needs review, and confirms deletion. Android performs the Gallery deletion; Recall refreshes Media Library afterward to reconcile what was actually removed. Saved Recall data is not silently deleted with the gallery asset.

## RevenueCat subscriptions

The mobile RevenueCat SDK uses public platform SDK keys, anonymous customer identities by default, the `pro` entitlement, the default offering, RevenueCat Paywalls, and Restore Purchases. The backend RevenueCat v1 secret is used only for judge promotional entitlement provisioning and is never included in the app.

Free users can select up to 3 cleanup items per batch and see up to 3 Relevant Now cards. Pro removes the application-level cleanup batch cap and allows up to 5 Relevant Now cards.

## Invitations and judge access

The backend creates single-use standard or judge invitation codes. Codes and installation tokens are stored as HMAC hashes using `RECALL_TOKEN_PEPPER`. The raw installation token is returned once and stored in SecureStore.

- Standard invitation: configurable invitation lifetime, then a configurable installation token lifetime; AI only.
- Judge invitation: invitation expires after 60 days; redemption creates 90-day AI access and a stable judge RevenueCat App User ID for a matching 90-day complimentary `pro` entitlement.

The backend can revoke unused invitations and redeemed installation tokens. Judge access still observes all AI safety controls.

## Backend state and spending controls

SQLite persists invitations, installation tokens, failed-redemption hashes, daily usage, monthly estimated spending, active reservations, and cached structured analysis JSON. It does not store uploaded image bytes or OCR text as standalone columns. The request fingerprint is HMAC-derived from the installation scope and request content.

Default controls are:

- AI disabled until `AI_ANALYSIS_ENABLED=true`
- 10 analyses per installation per UTC day
- 40 analyses globally per UTC day
- 2 concurrent provider requests
- $1.50 estimated monthly ceiling
- $0.05 reserved before each provider request
- 30 analyze requests per installation token per minute in process memory

The backend and Caddy run as Docker Compose services on one InterServer host. Caddy terminates HTTPS and is the only service with public ports; the backend is exposed only on the Compose network. SQLite is mounted from the `recall_data` volume, and online backups are written to the protected host backup directory.

The spending ceiling is an application estimate based on configured token prices, not a provider billing guarantee. SQLite survives process and container replacement through its persistent volume; the per-minute limiter does not survive a backend restart.

## Trust boundaries and limitations

- Caddy terminates public HTTPS; backend port `8787` is not published on the host.
- CORS is not authentication for a native app. Invitation-derived Bearer tokens protect AI routes.
- `store: false` asks OpenAI not to store the Responses API object, but third-party handling remains governed by the applicable OpenAI terms and account settings.
- Cached structured results currently have no automatic expiration or user-facing deletion endpoint.
- A single SQLite file is suitable for the current single-server deployment, not multiple independent backend replicas.
