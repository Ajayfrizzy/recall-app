# Recall — RevenueCat Shipaton 2026 Next Gen Submission

**Category:** Next Gen Award only.  
**Submission:** Creator-confirmed as submitted September 27, 2026.  
**Competition deadline:** September 30, 2026 at **11:45 PM PDT** = October 1, 2026 at **7:45 AM WAT (Lagos)**.  
**Official rules:** https://revenuecat-shipaton-2026.devpost.com/rules  
**Project source:** https://github.com/Ajayfrizzy/recall-app  
**Submitted demonstration:** https://vimeo.com/1230602934  
**Devpost project page:** Not supplied for inclusion in this record.

The Next Gen category accepts a **public open-source repository with a license and an under-two-minute demonstration** in place of a published app-store listing. A paid Google/Apple developer account, Play Store release, and standalone judge APK are **not required** for this category. Active student enrollment and a qualifying academic/student email on Devpost are essential; verify eligibility and all final form fields against the official rules.

## Submission record — September 27, 2026

**Status: SUBMITTED (creator-confirmed).** The creator confirmed completion of the Devpost submission after filling out the entry, providing the Vimeo link and preparing the submitted screenshots and icon. The final Devpost project-page URL has not been supplied, so this record does not claim an independent review of every saved form field or media attachment.

| Submission component | Recorded status |
| --- | --- |
| Competition category | Next Gen Award only, as selected for Recall. |
| Devpost entry | **Submitted**, confirmed by the creator September 27, 2026. |
| Project title | Recall. |
| Narrated video | [Vimeo upload complete](https://vimeo.com/1230602934); prepared running time approximately 1:42. |
| Source code | [Public GitHub repository](https://github.com/Ajayfrizzy/recall-app), MIT-licensed. |
| Images | Icon and seven submission screenshots committed under `docs/assets/submission/`; creator confirmed completing the entry's media workflow. |
| RevenueCat integration | Default offering, managed paywall, `pro` entitlement, purchases and restore flow; AI access is invitation-protected separately from Pro. |
| Store release | Not required for this Next Gen entry; Recall was not represented as published on Google Play. |
| Optional judge APK | Not supplied as a verified distribution artifact. |
| Privacy policy | Pre-publication draft with confirmed operator and contact; outstanding retention/request procedures and legal review remain clearly identified. |

**Post-submission housekeeping (optional, not outstanding competition-entry requirements):** Save the Devpost confirmation and project-page URL when available, retain the exact submitted media and source revision, and avoid describing later builds as the original submitted build. Any future downloadable judge APK should first pass the standalone and invitation tests in [Release QA](./release-qa.md).

## Submission assets

The corrected icon and seven screenshots are committed under [`docs/assets/submission/`](./assets/submission/): `icon.png`, `Screenshot1.jpeg`, `Screenshot2.jpeg`, `Screenshot3.jpeg`, `Screenshot4.jpeg`, `Screenshot5.jpeg`, `Screenshot6.png` and `Screenshot7.jpeg`. Keep app-runtime assets under `assets/` separate. The creator confirmed completing the Devpost submission. This documentation does not independently inventory which of the seven repository screenshots appear in the published gallery.

Submitted Vimeo demonstration: [Recall narrated Android walkthrough](https://vimeo.com/1230602934) (prepared runtime approximately 1:42). See [demo guide](./demo-script.md) for the intended scene sequence and media record.

## Project-description archive

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

Recall was submitted to the **Next Gen Award**, the student-only category that evaluates a working mobile demonstration, a public open-source repository, thoughtful technical choices and thoughtful RevenueCat monetization without requiring a paid developer account or a published store listing.

## Current limits and post-submission notes

The entry is submitted. The latest source and submitted demonstration should not be presented as a verified standalone APK: the previously documented clean-install and first-time judge tests remain separate optional QA work. The privacy policy remains a pre-publication draft and does not claim automatic backend deletion or a completed backend deletion-request workflow. Preserve the submitted entry and media as a reference if development continues.

Useful internal documents: [Judge guide](./judge-guide.md), [Release QA](./release-qa.md), [Deployment](./deployment.md), [Privacy-policy draft](./privacy-policy.md), [Demo record](./demo-script.md).
