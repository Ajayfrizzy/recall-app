# Recall Release History

## 1.0.0 — Next Gen submission candidate | September 2026

Recall is an Android screenshot-to-action app submitted to **RevenueCat Shipaton 2026's Next Gen Award**. Its required evaluation materials are the public open-source source code and a short demonstration, rather than a Google Play listing.

### Implemented features

- Screenshot discovery and selected-photo permissions; on-device OCR, local classification and optional GPT-5 mini analysis with validated structured results and a local fallback.
- User-confirmed reminders, calendar events, product/place/Read Later saves, multi-item handling and duplicate protection.
- Smart Bundles, Relevant Now with persisted snooze/dismissal, Screenshot Cleanup with explicit Android Gallery deletion confirmation, and persistent local state.
- RevenueCat default offering, managed paywall, purchasing/restoration integration, `pro` entitlement checks, Free/Pro feature limits and judge-only complimentary Pro provisioning.
- Invitation-protected AI access, backend quotas and spending controls, SecureStore installation credentials, and limited operational diagnostics.
- InterServer Ubuntu deployment configuration with Docker Compose, Caddy HTTPS, persistent SQLite, backup/restore scripts and rollback instructions.
- Android accessibility, timestamp, button-layout, safe-area, error-recovery and response-timeout improvements.

### Demonstration and submission preparation

- An edited Android video with the creator's own narration has been prepared locally (approximately 1:42); the public video URL is not yet recorded in these documents.
- A 1024 × 1024 icon and submission screenshots have been prepared. Only mark repository asset placement complete after committing the final PNGs under `docs/assets/submission/`.
- The privacy-policy draft now identifies the operator and contact. Retention decisions and privacy-request procedures remain unresolved; see [privacy-policy.md](./privacy-policy.md).

### Verification boundary

The supplied Release QA records a verified public HTTPS health response, development-installation Samsung tests, Maestro smoke tests and passing local checks. **That evidence does not automatically establish** a passing clean standalone APK, a fresh judge activation, a complete 24-hour snooze device test or a successful hosted CI run. Update [release-qa.md](./release-qa.md) as new evidence is obtained.

Detailed implementation history is available in Git; this file intentionally omits repetitive per-milestone notes.
