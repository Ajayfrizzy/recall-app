# Recall Privacy Policy — Pre-publication Draft

**Last updated:** September 27, 2026

**Effective date:** To be assigned on the date this policy is published.

This draft describes Recall's current implementation and identifies items that must be decided or reviewed before publication. It does not create functionality that Recall does not have. The operator and contact details have been provided, but retention and privacy-request procedures, applicable provider and jurisdictional terms, incident response, change notices, and geographic availability are not finalized. Recall currently has no automatic or self-service backend data deletion.

## Who operates Recall

Recall is operated by **Oluwaseun Ajao**.

- **Privacy and security contact:** ajayholuwaseun@gmail.com
- **Correspondence address:** First Unity Estate, Badore, Ajah.

Users may contact this address with privacy inquiries. Receipt of an email does not itself trigger backend data deletion; the procedure for identifying and handling requests concerning backend and third-party data has not yet been defined.

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

The Recall backend sends the image, OCR text, and time context to OpenAI's Responses API for GPT-5 mini analysis. Requests set `store: false`; this is a technical request setting, not a promise about all provider logging or legal retention. OpenAI's handling is governed by the applicable OpenAI terms, privacy commitments, account settings, and law. See [OpenAI's privacy policy](https://openai.com/policies/privacy-policy/) and [API data controls](https://platform.openai.com/docs/guides/your-data). **Before publication:** Verify the account-specific OpenAI terms and whether a data processing agreement is required.

Recall does not send screenshot history, Library contents, reminders, or unrelated app state in an analysis request.

## RevenueCat

Recall uses RevenueCat to load subscription offerings, show a paywall, process/restore purchases through the platform store, and determine whether the `pro` entitlement is active. Judge invitations also create a dedicated RevenueCat App User ID and ask the backend to provision a time-limited promotional entitlement.

RevenueCat may process app user identifiers, purchase and entitlement information, device/app metadata, and related diagnostics under its own terms and [privacy policy](https://www.revenuecat.com/privacy/). **Before publication:** Verify the applicable RevenueCat terms and whether a data processing agreement is required.

## Storage

On the device:

- AsyncStorage contains versioned app state, including structured screenshot analyses, saved items, actions, reminders/events, bundles, preferences, and onboarding/acknowledgement state.
- SecureStore contains the Recall AI installation token, its expiration, and judge provisioning metadata.
- Original screenshots remain in the Android Gallery rather than being copied into Recall's persistent app state.

On the backend, SQLite contains hashed invitation codes and installation tokens, hashed failed-redemption addresses, invitation/token metadata, judge RevenueCat identifiers, quota counts, estimated spending, active request reservations, HMAC request fingerprints, and cached structured analysis JSON. Uploaded image bytes and OCR text are not stored as standalone database fields. The structured result can reproduce information derived from the screenshot.

Server logs include limited usage, error, and RevenueCat provisioning diagnostics. The implementation is designed to omit raw image data, OCR text, access tokens, invitation codes, and secret keys from these diagnostics. `OPENAI_ERROR_DETAILS` is disabled by default because enabling it can include concise provider messages.

## Retention

Current implementation facts:

- Local Recall data can remain after the original screenshot is deleted from Android Gallery. It remains until application data is cleared or Recall changes or removes it through an existing control.
- Clearing Recall's application data removes local app records and locally stored access credentials from that installation. It does not necessarily delete screenshots from Android Gallery or data held by Recall's backend, OpenAI, RevenueCat, or a platform store.
- Expired or invalid Recall AI credentials are removed from SecureStore when detected.
- Backend access records, including invitations, installation records, usage/cost records, and cached structured analyses, currently have no general automatic deletion schedule.
- Active analysis reservations are removed after their timeout when subsequent access-control work reconciles them.
- RevenueCat and OpenAI apply their own retention practices.

**Not yet resolved:** The operator must determine an appropriate retention policy and an operational privacy-request procedure, including how records can be identified and how requests will be handled when deletion is legally required. No specific retention period or automatic deletion is claimed. Do not publish an unsupported deletion promise.

## Screenshot deletion and user controls

Users can:

- deny, limit, or revoke screenshot access in Android settings;
- use on-device analysis without activating Recall AI;
- choose whether to send an eligible screenshot for AI analysis;
- review and confirm reminders, calendar events, saves, and other actions;
- snooze or dismiss Relevant Now items;
- select screenshots for Cleanup and cancel before deletion;
- respond to Android's Gallery deletion confirmation;
- deactivate the locally stored Recall AI credential; and
- clear Recall's application data through Android settings to remove local Recall records from that installation.

Deleting a screenshot from Gallery removes the media asset if Android completes the request. Recall's locally saved structured data or action records may remain. Deactivating AI removes the locally stored access credential but does not delete backend records or RevenueCat records. Clearing application data removes local Recall records but does not necessarily remove backend or third-party data. Recall does not currently implement automatic deletion of backend records or a self-service backend deletion feature.

## Security

OpenAI and RevenueCat secret keys are intended to remain on the backend. Production mobile builds require an HTTPS backend URL. Backend access tokens and invitation codes are HMAC-hashed with a server-side pepper before database storage, and raw access tokens are stored on-device with SecureStore.

No system can guarantee absolute security. Recall's backend is deployed on an InterServer VPS behind Caddy HTTPS, with a persistent SQLite volume and documented online backup and rollback procedures. The final operational monitoring, off-server backup schedule, access review, and incident-response process still require operator verification. Security reports can be sent to **ajayholuwaseun@gmail.com**. **Not yet resolved:** Document and verify the incident-response procedure before publication.

## Children, geography, legal bases, and rights

**Intended age:** Recall is intended for users aged **13 and older**. This intended audience is not a claim that all applicable child-privacy or parental-consent requirements have been fulfilled.

**Supported countries:** Not yet decided. No unrestricted worldwide availability is claimed.

**Before publication:** Establish supported countries and review applicable parental-consent requirements, legal bases, international transfers, user rights, request verification and appeal procedures, and regulator-contact requirements. The competition's entrant age rules are separate from Recall's user eligibility.

## Changes

This policy may be updated as Recall's implementation, deployment, or legal obligations change. The published policy should state the effective date and explain material changes. **Before publication:** Decide and document the method for communicating material changes. Recall has no user accounts or dedicated privacy-policy notification feature.
