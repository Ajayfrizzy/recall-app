# Recall Release History

## 1.0.0 release candidate | September 2026

- Implemented Android screenshot discovery, selected-photo permission handling, on-device OCR, local classification, structured AI analysis, and graceful local fallback.
- Added user-confirmed reminders, calendar events, product/place/read-later saves, multi-item actions, duplicate protection, and versioned local persistence.
- Added Smart Bundles, Relevant Now, Screenshot Cleanup, and their persisted lifecycle controls.
- Integrated RevenueCat's default offering, managed paywall, purchases, restore flow, `pro` entitlement, Free/Pro limits, and judge promotional Pro provisioning.
- Added invitation-based AI access, SecureStore installation credentials, server-side quotas, estimated spending controls, structured-result caching, and redacted operational diagnostics.
- Packaged the Node.js backend for the InterServer VPS with Docker Compose, Caddy HTTPS, persistent SQLite, online backup, restore testing, and image rollback instructions.
- Refined Android permissions, image states, timestamps, accessibility states, reduced-motion behavior, typography, action feedback, and touch targets after physical-device review.
- Fixed Android Snooze text measurement with full inner label width and scaling-aware button minimums. Primary actions fill their own row; Snooze and Dismiss fill available space and wrap at larger text sizes.
- Added clearer Library filters/action buttons, safe-area spacing on all root tabs, and scaling-aware tab-bar height.
- Made snooze apply to the underlying item for 24 hours across date changes, with expiry refresh and confirmation. Dismiss remains occurrence-specific.
- Added recoverable storage error feedback, response-body timeout protection, stricter release configuration validation, offline CI configuration, and Maestro smoke flows.

The public backend health endpoint and existing-development-installation Samsung smoke tests have been verified. Final standalone APK testing, clean first-time judge flow, hosted CI execution, and the full card-type/24-hour device matrix remain tracked in [release-qa.md](./release-qa.md).

## Earlier milestones

Earlier development established the four root tabs (Inbox, Upcoming, Library, and Profile), strict OpenAI Structured Outputs with server/client validation, local-first fallback, and the initial RevenueCat subscription flow. Detailed commit history remains available in Git; repetitive milestone-by-milestone implementation notes are intentionally omitted here.
