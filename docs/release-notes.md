# Recall Release Notes

## Implemented

- Added explicit screenshot image loading, loaded, failed, and unavailable states so inaccessible assets are not presented as unexplained black rectangles.
- Improved screenshot previews for portrait content and preserved recovery when media access or an asset URI changes.
- Centralized more readable sans-serif body typography while retaining Recall's established dark visual identity.
- Expanded screenshot timestamp normalization, persistence, newest-first sorting, and formatting regression coverage, including seconds, milliseconds, invalid/future dates, and the historical impossible-year case.
- Refined dense screenshot detail, Library, bundle, Relevant Now, Cleanup, AI Access, and navigation presentation after physical-device review.

- Corrected judge Pro provisioning for RevenueCat v1's `value.subscriber` response envelope, added machine-readable provisioning diagnostics, and made retry revalidate the existing judge installation without requiring another invitation.
- Replaced the invitation field's selection-rewriting formatter with a fixed `RCL-` prefix, a plain 20-character editable body, and a separate formatted preview for stable typing, editing, and full-code paste.
- Protected unrelated identified and previously paying RevenueCat customers from judge identity switching, deduplicated concurrent judge identity refreshes, and kept Pro gated on a freshly confirmed `pro` CustomerInfo entitlement.
- Added invitation activation, SecureStore-backed installation credentials, startup expiration handling, and Profile access status/deactivation without coupling AI access to Recall Pro.
- Added Bearer authorization for real and mock analysis, backend error-code mapping, local fallback, credential clearing on invalid/expired/revoked access, and an explicit activation path when access is missing.
- Added mobile cache/reanalysis behavior: normal requests allow server cache reuse, while only the user-facing reanalysis action sends `reanalyze: true`.
- Hardened mock/deployment configuration, made valid invitations resilient to unrelated shared-IP failures, and keyed the supplemental analysis limiter by hashed installation token rather than shared network address.
- Added focused AI access checks and extended backend checks for invitation state and global quota exhaustion.
- Consolidated the visual system around Recall's dark surfaces, blue accent, spacing, radii, borders, typography, and accessible touch targets.
- Added a shared animated action button with idle, pressed, loading, success, and disabled presentation. Motion follows the device reduced-motion preference.
- Compacted Screenshot Detail, added tap-to-expand image viewing, a reduced-motion-aware analysis scan, clearer long-request copy, smooth result entry, readable semantic dates, and scannable multi-item cards.
- Added explicit AI versus on-device result feedback while keeping provider details private and preserving local fallback.
- Added per-action feedback and repeat-submission protection for Save All, item actions, onboarding, bundle refresh/archive/restore/membership, cleanup deletion, RevenueCat paywall/restoration, and Relevant Now controls.
- Added UI safeguards for passed deadlines and reminder offsets that would schedule in the past. Ambiguous dates still require exact user-entered date and time.
- Improved dark-theme consistency, empty states, font scaling behavior, accessibility state announcements, and minimum touch targets.
- Configured the EAS preview profile for a standalone internal Android APK and added a release environment validator that rejects local or insecure backend URLs and checks that no OpenAI key is present in mobile configuration.
- Added focused automated checks for date parsing, passed deadlines, reminder offsets, actionless semantic items, and legacy action rendering.

## Preserved

- GPT-5 mini, OpenAI Responses API, strict Structured Outputs, timeout handling, mock mode, and on-device fallback.
- Existing persistence version and all saved actions, products, reminders, bundles, membership overrides, cleanup history, and subscription behavior.
- RevenueCat anonymous users, `pro` entitlement, Default offering, managed paywall, purchase restoration, and Free/Pro limits.
- Four root tabs: Inbox, Upcoming, Library, and Profile.

## Validation status

The latest UI refinements and the existing judge installation's AI/complimentary Pro activation were reported as passed on a physical Samsung device. Earlier physical testing also covered screenshot discovery and permissions, creation dates, onboarding, AI analysis, screenshot organization, and reminders. No paid OpenAI test runs by default.

The public HTTPS backend, final standalone preview APK, and clean first-time judge installation remain pending. Existing-installation results must not be described as standalone release verification. See [release-qa.md](./release-qa.md).
