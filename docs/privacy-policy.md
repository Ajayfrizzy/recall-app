# Recall Privacy Policy (Draft)

**Effective date:** [REVIEW AND INSERT]

**Last updated:** September 26, 2026

This draft reflects the current repository implementation. It is not legal advice and must be reviewed before publication. The effective date, legal operator, contact details, provider-policy links, retention/deletion terms, security contact, age/geography/legal-basis terms, rights process, and change-notice method remain explicit bracketed placeholders; do not publish the policy until they are resolved.

## Who operates Recall

Recall is operated by **[LEGAL NAME / ENTITY REQUIRED]**. Privacy questions or requests can be sent to **[CONTACT EMAIL REQUIRED]** at **[POSTAL ADDRESS OR OTHER REQUIRED CONTACT DETAILS]**.

## Information Recall handles

Recall may handle:

- screenshots the user allows the app to access, including their image, filename, dimensions, creation time, and Media Library asset identifier;
- text extracted from a screenshot on the device;
- structured analysis such as detected products, events, deadlines, places, content, summaries, warnings, and suggested actions;
- locally created reminders, calendar-event references, saved items, Smart Bundles, Relevant Now preferences, cleanup state, onboarding state, and action history;
- an invitation-derived installation access token and expiration details;
- RevenueCat customer, entitlement, offering, purchase, restore, and judge promotional-entitlement information; and
- backend access, quota, estimated-cost, request-fingerprint, and diagnostic records.

Recall does not currently provide user accounts or cross-device synchronization.

## Screenshot permission and on-device OCR

Recall asks for Android photo/media access so it can find screenshots. Depending on the Android version and the user's choice, access can cover the full photo library or only selected photos. The user can change this permission in system settings.

OCR runs on the device using `expo-ocr-kit`. Local classification can use the extracted text without sending the screenshot to Recall's backend. Screenshot image files remain in the device Gallery unless the user explicitly confirms deletion.

## Optional Recall AI processing

Recall AI is optional and invitation protected. After the user acknowledges the processing and starts AI analysis, Recall prepares the current screenshot as a JPEG, resizing it if its long edge exceeds 1800 pixels, and sends:

- that screenshot image;
- its on-device OCR text;
- timezone and current-time context;
- filename, dimensions, and screenshot creation time; and
- an installation access credential.

The Recall backend sends the image, OCR text, and time context to OpenAI's Responses API for GPT-5 mini analysis. Requests set `store: false`; this is a technical request setting, not a promise about all provider logging or legal retention. OpenAI's handling is governed by the applicable OpenAI terms, privacy commitments, account settings, and law. **[LINK TO APPLICABLE OPENAI POLICY / DPA REQUIRED]**

Recall does not send screenshot history, Library contents, reminders, or unrelated app state in an analysis request.

## RevenueCat

Recall uses RevenueCat to load subscription offerings, show a paywall, process/restore purchases through the platform store, and determine whether the `pro` entitlement is active. Judge invitations also create a dedicated RevenueCat App User ID and ask the backend to provision a time-limited promotional entitlement.

RevenueCat may process app user identifiers, purchase and entitlement information, device/app metadata, and related diagnostics under its own terms and privacy policy. **[LINK TO REVENUECAT PRIVACY POLICY REQUIRED]**

## Storage

On the device:

- AsyncStorage contains versioned app state, including structured screenshot analyses, saved items, actions, reminders/events, bundles, preferences, and onboarding/acknowledgement state.
- SecureStore contains the Recall AI installation token, its expiration, and judge provisioning metadata.
- Original screenshots remain in the Android Gallery rather than being copied into Recall's persistent app state.

On the backend, SQLite contains hashed invitation codes and installation tokens, hashed failed-redemption addresses, invitation/token metadata, judge RevenueCat identifiers, quota counts, estimated spending, active request reservations, HMAC request fingerprints, and cached structured analysis JSON. Uploaded image bytes and OCR text are not stored as standalone database fields. The structured result can reproduce information derived from the screenshot.

Server logs include limited usage, error, and RevenueCat provisioning diagnostics. The implementation is designed to omit raw image data, OCR text, access tokens, invitation codes, and secret keys from these diagnostics. `OPENAI_ERROR_DETAILS` is disabled by default because enabling it can include concise provider messages.

## Retention

Current implementation facts:

- Local app state remains until app data is cleared or the app changes/removes it through an available control.
- Expired or invalid Recall AI credentials are removed from SecureStore when detected.
- Backend invitations, installation records, usage/cost records, and cached structured analyses do not currently have a general automatic retention purge.
- Active analysis reservations are removed after their timeout when subsequent access-control work reconciles them.
- RevenueCat and OpenAI apply their own retention practices.

Before public launch, the operator must define and publish retention periods and implement any required deletion process: **[RETENTION SCHEDULE AND DELETION PROCESS REQUIRED]**.

## Screenshot deletion and user controls

Users can:

- deny, limit, or revoke screenshot access in Android settings;
- use on-device analysis without activating Recall AI;
- choose whether to send an eligible screenshot for AI analysis;
- review and confirm reminders, calendar events, saves, and other actions;
- snooze or dismiss Relevant Now items;
- select screenshots for Cleanup and cancel before deletion;
- respond to Android's Gallery deletion confirmation; and
- deactivate the locally stored Recall AI credential.

Deleting a screenshot from Gallery removes the media asset if Android completes the request. Recall's locally saved structured data or action records may remain. Deactivating AI removes the local credential but does not currently delete backend records or RevenueCat records. A user-facing backend deletion request workflow is not implemented.

## Security

OpenAI and RevenueCat secret keys are intended to remain on the backend. Production mobile builds require an HTTPS backend URL. Backend access tokens and invitation codes are HMAC-hashed with a server-side pepper before database storage, and raw access tokens are stored on-device with SecureStore.

No system can guarantee absolute security. Recall's backend is deployed on an InterServer VPS behind Caddy HTTPS, with a persistent SQLite volume and documented online backup and rollback procedures. The final operational monitoring, off-server backup schedule, access review, and incident-response process still require operator verification. **[SECURITY CONTACT / INCIDENT PROCESS REQUIRED]**

## Children, geography, legal bases, and rights

The operator must decide and document intended age limits, supported countries, legal bases, international transfers, applicable consumer/privacy rights, request verification, appeal rights, and regulator contacts before publication. **[LEGAL REVIEW REQUIRED]**

The Shipaton Next Gen competition permits eligible student entrants aged 13 and older; that competition rule does not itself establish the age eligibility of Recall users.

## Changes

This policy may be updated as Recall's implementation, deployment, or legal obligations change. The published policy should state the effective date and explain material changes. **[NOTICE METHOD REQUIRED]**
