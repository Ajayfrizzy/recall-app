# Recall Release QA

Milestone 10 is not a completed release candidate until the physical Android checklist passes on the target Samsung device. Automated checks do not replace device testing.

## Build prerequisites

- Use the EAS `preview` profile to produce a standalone Android APK.
- Configure the EAS `preview` environment with `EXPO_PUBLIC_ANALYSIS_API_URL` and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`.
- Do not set `EXPO_PUBLIC_ALLOW_INSECURE_ANALYSIS_HTTP` in preview or production.
- Set `EXPO_PUBLIC_ANALYSIS_API_URL` to a public HTTPS backend. Do not use localhost, `10.0.2.2`, a LAN IP, or a Metro URL.
- Keep `OPENAI_API_KEY` only on the backend. Never add it to Expo or EAS public variables.
- Run `npm run release:config-check` in the same environment used for the build.
- Build with `eas build --platform android --profile preview` only after the configuration check passes.

## Automated checks

Run without enabling `RUN_OPENAI_LIVE_TEST`:

```sh
npx tsc --noEmit
cd server && npm run typecheck && npm run fixtures:check && npm run format:check
cd ..
npm run actions:check
npm run ai-access:check
npm run persistence:check
npm run bundles:check
npm run resurfacing:check
npm run cleanup:check
npm run subscription:check
npm run format:check
git diff --check
```

Record failures instead of describing untested behavior as passed.

## Physical Android checklist

### Install and launch

- [ ] Install the standalone preview APK with Metro stopped.
- [ ] Confirm the app opens in its dark theme without a development launcher.
- [ ] Confirm no development-only IDs, analysis diagnostics, or debug logs appear in the UI.
- [ ] Increase Android font size and display size, relaunch, and check that headings, buttons, tabs, cards, and dialogs do not clip or overlap.
- [ ] Enable Remove animations in Android accessibility settings and confirm scanning/result/button animations become static or minimal.

### Onboarding and Inbox

- [ ] Complete onboarding and confirm the Get Started button shows a loading state and cannot be submitted twice.
- [ ] Grant screenshot access and verify loading, denied, retry, limited-access, empty, and populated Inbox states.
- [ ] Pull to refresh a long screenshot list and confirm smooth scrolling and stable image dimensions.
- [ ] Confirm the four root tabs remain Inbox, Upcoming, Library, and Profile.
- [ ] Force-stop and reopen offline; cached local state must still load.

### Samsung screenshot permission flow

Use a separate development application ID or a fresh test installation to verify the true first-run `not requested` state without deleting the primary Recall installation or its data. Do not clear storage or uninstall the primary app. If a separate build is unavailable, the remaining states can be exercised safely from **Settings > Apps > Recall > Permissions > Photos and videos**; Android does not provide a supported way to restore `undetermined` for an installed app while retaining all app data.

1. Launch the fresh test installation, finish onboarding, and confirm the screenshot permission introduction appears before any native dialog. It must show **Grant Screenshot Access**, never **Try Again**.
2. Tap **Grant Screenshot Access** once. Confirm only one Android permission dialog opens and the button remains disabled/loading while the request is active.
3. Choose full photo access. Confirm Recall opens the Inbox immediately, discovers screenshots, and does not show the permission introduction after a force-stop and restart.
4. In Android Settings, change Recall to selected photos, select at least one screenshot, and return to Recall. Confirm the app refreshes automatically, shows **Selected photos only**, and lists only accessible screenshots.
5. Tap **Choose More Photos**, change the selection, and confirm the Inbox refreshes. On devices or Android versions where the system picker is unavailable, use **Open Settings** instead.
6. In Android Settings, set Photos and videos to **Don't allow**, then return to Recall. Confirm it refreshes to the denied or Settings screen without resetting onboarding or persisted content.
7. If **Grant Access** is shown, decline until Android reports that Recall cannot ask again. Confirm the action changes to **Open Settings** and no permission dialog opens automatically.
8. Tap **Open Settings**, grant access, and return with the system Back action. Confirm the permission screen disappears automatically and screenshots load without an obsolete error.
9. Exercise a real retryable failure by temporarily making Media Library access fail in a development build. Confirm **Try Again** appears only for that failure and disappears after a successful retry.

The Android 14 selected-photo picker must be tested in a development or preview build. Do not use Expo Go for that case.

### Screenshot and AI analysis

- [ ] Open a screenshot and confirm the preview is compact, tappable, and opens a dismissible full-screen image.
- [ ] Start analysis and confirm the scan treatment and useful status copy remain responsive for the whole request.
- [ ] Tap Analyze repeatedly; only one backend request may be created.
- [ ] Confirm successful GPT-5 mini analysis is labeled `AI analysis complete`.
- [ ] Disable connectivity, use an unreachable backend, and simulate timeout/provider failure separately. Each must finish with an on-device result or concise retry state, with no provider internals and no automatic paid retry.
- [ ] Confirm extracted text can still be expanded and collapsed.
- [ ] Confirm long summaries and multiple item cards remain readable at large font scale.

### AI invitation access

- [ ] Fresh-install without an invitation. Skip activation; Inbox, Library, Upcoming, Profile, OCR, classification, and on-device analysis must remain usable.
- [ ] Enter an invalid invitation. Confirm the concise error and that repeated taps create only one redemption request.
- [ ] Redeem a fresh invitation. Confirm success, Profile shows active access and its expiration date, and no token is visible.
- [ ] Redeem a judge invitation once. Confirm Recall AI Active, Recall Pro Active, the judge expiration date, and no paywall while `pro` remains active.
- [ ] Temporarily make the RevenueCat grant fail, redeem a judge invitation, restore connectivity/configuration, and retry. Confirm the same installation activates Pro without another invitation.
- [ ] Redeem a standard invitation and confirm it never changes the RevenueCat identity or grants Pro.
- [ ] Force-stop and reopen. Confirm active access is restored from SecureStore without Metro.
- [ ] With `MOCK_ANALYSIS=false`, analyze one prepared screenshot and confirm GPT-5 mini output. Do this once; never use live calls for quota tests.
- [ ] Analyze the same screenshot through a normal eligible request and verify the server cache is returned without increasing the daily count.
- [ ] Tap **Reanalyze with Recall AI** once and verify `reanalyze: true` creates one new charged reservation.
- [ ] Revoke its token ID with `npm run access:admin -- revoke-token TOKEN_ID`; retry and confirm the token is cleared and activation becomes available. Repeat expiration with a short-lived test token or mocked response.
- [ ] Simulate installation and global daily exhaustion with mocked responses or reduced non-production limits. Confirm on-device results remain and the token is preserved.
- [ ] Simulate spending-ceiling, shutdown, busy, duplicate, provider failure, and timeout responses. Confirm concise messages, no automatic retry, and no credential deletion for temporary/quota failures.
- [ ] Launch offline and analyze. Confirm OCR/local classification completes with a network fallback message and no retry loop.
- [ ] Verify Profile states: checking, not activated, active with expiration, expired, replace, and confirmed local deactivation.
- [ ] Purchase/restore Recall Pro independently. Confirm Pro does not activate AI or bypass invitation/quota protections.
- [ ] Reinstall the standalone APK and launch with Metro stopped. Verify expected platform credential persistence behavior and all local-only features.

### Semantic regression cases

- [ ] Music player: track and artist remain visible, playback duration is not a date, and no irrelevant Read Later action appears.
- [ ] Charging notification: remains a distinct temporary status item with no Keep or other action.
- [ ] Truncated social notification: notification time is not publication time, missing text is not invented, and no unjustified Read Later action appears.
- [ ] Genuine event: visible event date survives and Add to Calendar remains available.
- [ ] Genuine deadline: deadline survives and Create Reminder remains available.
- [ ] Multi-product screenshot: products remain distinct; individual Save Product and Save All Products work once each and show loading then success.

### Calendar and reminders

- [ ] Ambiguous or partial dates open with blank exact fields and require manual confirmation.
- [ ] Invalid dates are rejected in the form.
- [ ] A past deadline is rejected before notification scheduling.
- [ ] A future deadline whose selected reminder offset is already past is rejected with a useful message.
- [ ] Add one real future event and one future reminder, then verify Upcoming and the Android system destination.
- [ ] Repeat each action and confirm duplicate protection prevents a second record.

### Library and bundles

- [ ] Restart the app and verify saved products, places, Read Later items, events, reminders, action completion, and screenshot status persist.
- [ ] Verify Library filters and screenshot history at large font scale.
- [ ] Refresh bundles and confirm a loading state appears.
- [ ] Open a Smart Bundle, remove one item, restore it from Removed Items, archive the bundle, and restore it from Archived.
- [ ] Confirm every mutation disables repeat submission and only reports completion after persistence succeeds.

### Relevant Now and cleanup

- [ ] Verify Relevant Now cards open, snooze, and dismiss with responsive button feedback.
- [ ] Verify Free and Pro card limits.
- [ ] In Cleanup, confirm Safe and Review-required labels remain distinct and kept screenshots are not silently selected for deletion.
- [ ] Select and deselect candidates; verify checkbox state and selection counts.
- [ ] Confirm the dialog explicitly says selected screenshots will be removed from the device Gallery.
- [ ] Cancel once and verify nothing is deleted.
- [ ] Complete one prepared deletion and verify saved Recall data remains while the Gallery asset is removed.
- [ ] Confirm no cleanup occurs without explicit confirmation.

### RevenueCat

- [ ] Confirm anonymous RevenueCat configuration loads the Default offering with Monthly and Yearly packages.
- [ ] Open the managed paywall once; repeated taps must not open multiple paywalls.
- [ ] Complete or sandbox-test purchase and verify the `pro` entitlement updates the UI.
- [ ] Restore purchases and verify loading followed by an accurate success or no-entitlement message.
- [ ] Configure the backend with a RevenueCat v1 secret API key allowed to grant promotional entitlements; keep it out of Expo/EAS mobile variables.
- [ ] Confirm the RevenueCat project contains the exact `pro` entitlement and that the public Android SDK key belongs to the same project as the backend secret key.
- [ ] On a physical Android device, test a fresh anonymous install, an existing paying anonymous customer, judge retry after airplane mode, app restart, and expiration. Confirm judge login never replaces an unrelated identified or actively paying customer.
- [ ] Verify errors are concise and Retry is usable.
- [ ] Verify Free and Pro cleanup/resurfacing limits.

### Physical Android judge flow

1. Configure the HTTPS backend with `REVENUECAT_SECRET_API_KEY`, restart it, and verify the mobile public Android SDK key belongs to the same RevenueCat project with the `pro` entitlement.
2. On the already-redeemed judge installation that currently shows Recall Free, open Profile and tap **Retry Pro Activation**. Do not enter another invitation. Confirm the backend logs one redacted `judge_provisioning` success event and Profile changes to **Recall Pro Active** only after the SDK refresh confirms active `pro`.
3. If the existing installation remains pending, record the machine-readable backend error code. For project/entitlement mismatch, verify the backend secret and APK public Android SDK key belong to the same RevenueCat project and that its entitlement identifier is exactly `pro`; restart the backend after changing its environment.
4. Create one judge code in a private terminal with `npm run access:admin -- create-judge-invitations 1`; retain its invitation ID and send the code through a private channel.
5. Install a fresh development or preview APK on the physical device. Open **Profile → Activate AI**. Paste the complete formatted code, then repeat with lowercase and accidental spaces. Type, backspace, delete, and replace a character in the middle; confirm the fixed `RCL-` prefix stays visible, the caret does not jump, and the preview is correct.
6. Activate once. Confirm **Recall AI Active**, then **Recall Pro Active**, the 90-day expiration date, and **Continue**. Reopen Profile and confirm no Upgrade/Paywall action is shown.
7. Force-stop and reopen the app. Confirm both AI and Pro remain active and an AI request still observes the normal daily/global/spending limits.
8. For recovery testing, block the backend's RevenueCat request or temporarily remove its secret, redeem a different judge code, and confirm AI stays active while Pro is pending. Restore the backend configuration, restart it, and use **Retry Pro Activation**; do not enter another invitation.
9. On a separate fresh installation, redeem a standard code and confirm it activates AI without changing the RevenueCat identity or enabling Pro.
10. On a device with an active sandbox purchase or purchase history, redeem a judge code and verify the existing identity and entitlement remain intact.

### Navigation and final checks

- [ ] Verify Android back from screenshot, bundle, Removed Items, Cleanup, full-screen image, date modal, and confirmation dialogs.
- [ ] Verify modal dismissal never submits an action.
- [ ] Exercise rapid tab changes and long lists without crashes or blank screens.
- [ ] Restart online and offline and verify no data loss.
- [ ] Confirm the installed build does not require Metro or a development-only LAN backend.

## Release blockers

The release remains blocked by any unchecked physical item, missing public HTTPS backend, missing RevenueCat preview variables/offering, exposed backend key, or failed automated check.
