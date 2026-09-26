# Recall Release History

## 1.0.0 release candidate | September 2026

- Implemented Android screenshot discovery, selected-photo permission handling, on-device OCR, local classification, structured AI analysis, and graceful local fallback.
- Added user-confirmed reminders, calendar events, product/place/read-later saves, multi-item actions, duplicate protection, and versioned local persistence.
- Added Smart Bundles, Relevant Now, Screenshot Cleanup, and their persisted lifecycle controls.
- Integrated RevenueCat's default offering, managed paywall, purchases, restore flow, `pro` entitlement, Free/Pro limits, and judge promotional Pro provisioning.
- Added invitation-based AI access, SecureStore installation credentials, server-side quotas, estimated spending controls, structured-result caching, and redacted operational diagnostics.
- Packaged the Node.js backend for the InterServer VPS with Docker Compose, Caddy HTTPS, persistent SQLite, online backup, restore testing, and image rollback instructions.
- Refined Android permissions, image states, timestamps, accessibility states, reduced-motion behavior, typography, action feedback, and touch targets after physical-device review.
- Fixed Relevant Now secondary action layout so **Snooze 1 day** remains complete and wraps below longer primary actions when required.

The public backend health endpoint is verified. The final standalone preview APK, clean first-time judge flow, and physical Samsung retest of the Relevant Now label remain tracked in [release-qa.md](./release-qa.md).

## Earlier milestones

Earlier development established the four root tabs (Inbox, Upcoming, Library, and Profile), strict OpenAI Structured Outputs with server/client validation, local-first fallback, and the initial RevenueCat subscription flow. Detailed commit history remains available in Git; repetitive milestone-by-milestone implementation notes are intentionally omitted here.
