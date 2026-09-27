# Recall — RevenueCat Shipaton 2026 Next Gen Submission

**Category:** Next Gen Award only.  
**Deadline:** September 30, 2026 at **11:45 PM PDT** = October 1, 2026 at **7:45 AM WAT (Lagos)**. Submit ahead of the deadline.  
**Official rules:** https://revenuecat-shipaton-2026.devpost.com/rules  
**Project source:** https://github.com/Ajayfrizzy/recall-app

The Next Gen category accepts a **public open-source repository with a license and an under-two-minute demonstration** in place of a published app-store listing. A paid Google/Apple developer account, Play Store release, and standalone judge APK are **not required** for this category. Active student enrollment and a qualifying academic/student email on Devpost are essential; verify eligibility and all final form fields against the official rules.

## Essential submission checklist

- [x] Confirm active student status, qualifying Devpost academic/student email and Next Gen-only category selection.
- [x] Complete the public Devpost project page and all required English fields before the deadline.
- [x] Verify the GitHub repository is visible while logged out, includes the actual source, setup instructions and a visible MIT `LICENSE` file; check Git history for secrets and private screenshots.
- [x] Record and edit an Android demonstration with the creator's human narration, approximately 1:42. **Prepared locally, publication pending.**
- [x] Review the exact final MP4: real product behavior and RevenueCat integration are visible; voice-over matches the scene; no live tokens, invitation codes, notifications, personal information or unauthorized media are exposed.
- [x] Upload the approved final demo to **public or judge-accessible unlisted YouTube/Vimeo** and verify it from a logged-out browser. **Public video URL: TO ADD AFTER UPLOAD.**
- [x] Prepare a **1024 × 1024 PNG** Recall icon and **1179 × 2556 PNG** Android screenshots without device frames. **Prepared locally; commit to the repo and recheck image dimensions.**
- [x] Upload the app icon and at least one correctly sized, frame-free screenshot to the Devpost submission; choose screenshots that clearly demonstrate the app.
- [x] Complete the project description, explicitly explain the RevenueCat offering/paywall, `pro` entitlement, subscription restoration, Free/Pro limits, and time-limited promotional judge access.
- [x] Confirm any required RevenueCat project ID and other Devpost fields in the actual form, without adding secret API keys.
- [x] Review final assets, category selection and all links; submit the entry and verify the submitted-project page.

**Optional, separate from required Next Gen materials:** An EAS standalone APK and private judge invitation may help reviewers test Recall, but share them only after clean-install and public-backend checks pass. Do not claim a promotional Pro grant is a paid store purchase.

## Submission assets

Use `docs/assets/submission/` to store the finalized icon and screenshot PNGs in Git. Descriptive filenames such as `icon.png`, `relevant-now.png`, `library.png`, `upcoming.png`, `products.png`, `smart-bundles.png` and `pro-paywall.png` are suitable **only when those names match the actual images**. Keep app-runtime assets under `assets/` separate. Avoid placeholder images, debug IDs, personal screenshots and inappropriate subscription-platform wording. Do not imply local media is already committed or uploaded to Devpost.

Prepared local recording: `Recall_Shipaton_Demo_Human_Voice.mp4` (approximately 1:42). **Public video URL:** not supplied. See [demo guide](./demo-script.md) for the scene sequence and final playback/privacy checks.

## Copy-ready Devpost project description

### Tagline

**Turn forgotten screenshots into useful, user-controlled actions.**

### Problem

Screenshots capture products, events, deadlines, places and information that people intend to revisit. In a conventional Gallery, those screenshots quickly become difficult to find, organize and act on.

### What we built

**Recall** is an Android screenshot-to-action app. It discovers accessible screenshots, recognizes text on the device, and creates local structured results even without cloud AI. With a user's explicit consent and action, optional Recall AI analyzes one compressed screenshot and its OCR text through a secured backend to identify products, deadlines, events and useful content. The user can save products or places, keep articles for later, create reminders or calendar entries, and review screenshots for deletion. **Nothing is automatically saved to an external calendar or deleted from Android Gallery without user confirmation.**

**Smart Bundles** organize related saves, **Relevant Now** resurfaces time-sensitive information with snooze and dismissal controls, and **Screenshot Cleanup** helps users make deliberate decisions about Gallery clutter. Local state persists across restarts, and network or AI failures preserve the on-device fallback result.

### RevenueCat integration and monetization

Recall uses the RevenueCat mobile SDK, its **default offering**, **managed paywall**, **purchase and Restore Purchases flows**, and the active **`pro` entitlement** to control paid features. Recall Free allows up to three screenshots per Cleanup batch and three Relevant Now cards; Recall Pro removes the app-level Cleanup batch cap and supports up to five Relevant Now cards.

Optional AI access is invitation-protected and **separate from Pro**. A private judge invitation grants 90-day AI access for that installation and requests a matching time-limited promotional RevenueCat `pro` entitlement so judges can see premium features. That promotional entitlement is **not** a completed paid purchase, and ordinary AI invitations do not grant Pro. Server-side quotas and spending controls still apply.

### Technical implementation

The Android app uses Expo SDK 57, React Native, Expo Router, on-device OCR and local persistence. With explicit user action, the InterServer-hosted Node.js backend uses the OpenAI Responses API for GPT-5 mini structured analysis. Server-side Zod and client-side validation check the result. Docker Compose hosts the backend behind Caddy HTTPS, with persistent SQLite for access, usage, spending controls and cached structured results. OpenAI and RevenueCat secrets stay on the backend.

### Challenges and limitations

The implementation addresses multiple products in one screenshot, ambiguous dates, duplicate actions, incomplete connectivity, Android gallery permissions and accessible navigation. Recall currently targets Android; it has no accounts or cross-device sync. AI needs connectivity, an invitation and available provider quota. Deleting a Gallery image does not automatically delete locally saved structured data. Backend access and cached-result records currently lack general automatic deletion and self-service deletion controls.

### Why Next Gen

Recall is entered in the **Next Gen Award**, the student-only category that evaluates a working mobile demonstration, a public open-source repository, thoughtful technical choices and thoughtful RevenueCat monetization without requiring a paid developer account or a published store listing.

## Evidence and remaining tasks

| Item | Status based on supplied documents and conversation |
| --- | --- |
| Android implementation and RevenueCat integration | Implemented; see [architecture](./architecture.md). |
| Public HTTPS backend `/health` | Reported verified September 26; this is not end-to-end fresh-install proof. |
| Final edited and human-narrated video | Prepared locally, approximately 1:42; final playback and public upload still require confirmation. |
| Required-size icon and screenshots | Prepared locally; verify actual final files are committed under `docs/assets/submission/` before checking repository asset placement. |
| Privacy-policy draft | Operator/contact supplied; retention and request-handling procedure and legal review remain unresolved. |
| Student/academic-email eligibility | Verify in Devpost; do not infer from app development. |
| Public repository and LICENSE visibility | Check logged-out access before submission. |
| Public video URL and final Devpost submission | Not yet supplied or verified. |
| Optional standalone APK and clean judge installation | Do not mark passed until the checks in [Release QA](./release-qa.md) are documented. |

Useful internal documents: [Judge guide](./judge-guide.md), [Release QA](./release-qa.md), [Deployment](./deployment.md), [Privacy-policy draft](./privacy-policy.md), [Demo guide](./demo-script.md).
