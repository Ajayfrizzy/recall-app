# RevenueCat Shipaton 2026 Next Gen Submission

This document consolidates the competition checklist, proposed submission copy, and asset checklist for Recall's Next Gen Award entry. The source was checked against the [official competition rules](https://revenuecat-shipaton-2026.devpost.com/rules), updated August 31, 2026. Recheck the live rules before submitting; this guide does not replace them.

The submission period ends **September 30, 2026 at 11:45 PM PDT**. Recall is entering only the Next Gen Award.

That is **October 1, 2026 at 7:45 AM in Lagos (WAT)**. Submit ahead of the deadline. The official rules were rechecked on September 26, 2026. Next Gen eligibility requires active student enrollment and a qualifying student/academic email; lack of time to publish to a store is not an eligibility condition.

## Eligibility

- [ ] The entrant is an active student enrolled in high school, college, university, bootcamp, or another academic program.
- [ ] Devpost uses a qualifying student or academic email address. The rules say eligibility may be checked with JetBrains/swot.
- [ ] The entrant is at least 13 and otherwise eligible under the rules and local law.
- [ ] If under the local age of majority, a parent or legal guardian has accepted the rules and completed required consent by the applicable deadline.
- [ ] No prohibited geography, conflict, ownership, or other general eligibility condition applies.
- [ ] A team or organization, if any, has an authorized representative; a team containing a minor enters only Next Gen.

## Project and repository

- [x] Android application with a working RevenueCat SDK integration and `pro` entitlement flow.
- [ ] Core functionality works as shown in the final video and description.
- [ ] Project is accessible from the United States as required by the rules.
- [ ] Third-party SDKs, APIs, data, music, images, and trademarks are authorized for use.
- [ ] Public repository is `Ajayfrizzy/recall-app`.
- [x] Repository contains the project source and required assets.
- [x] Root [MIT license](../LICENSE) exists.
- [ ] GitHub About displays the detected license.
- [x] The [README](../README.md) documents reproducible mobile/backend setup, environment names, and checks.
- [ ] A reviewer completes the setup from a fresh checkout without private developer files.
- [ ] Repository and history contain no secrets, real invitations, tokens, personal screenshots, or unauthorized material.

Next Gen uses the public repository and demo video instead of a published store listing. No paid Apple or Google developer account and no App Store or Google Play release is required.

The required evidence is the functional public repository, open-source license, English description, public demonstration video, icon, and screenshot specified below. An APK, judge invitation, and complimentary Pro are optional supporting material. Keep their verification requirements separate from the category's mandatory submission requirements.

## Devpost requirements

- [ ] Join the hackathon and complete every required field during the submission period.
- [ ] Select the Next Gen Award and no unintended categories.
- [ ] Add a clear English description of the problem, features, and functionality.
- [ ] Explain Recall's RevenueCat default offering, managed paywall, purchases, restore flow, `pro` entitlement, Free/Pro limits, and judge promotional Pro.
- [ ] Add the public repository URL.
- [ ] Upload a public YouTube or Vimeo demonstration and add its link.
- [ ] Keep the video under 2:00 and show Recall running on its target Android device.
- [ ] Exclude unauthorized material, personal data, invitations, tokens, keys, private URLs, and notifications from the video.
- [ ] Upload a 1024x1024 app icon.
- [ ] Upload at least one 1179x2556 screenshot without a device frame.
- [ ] Use English or include every English translation required by the rules.
- [ ] Confirm the entry is original, owned work and complies with relevant third-party and open-source licenses.

## Proposed submission copy

### One-line description

Recall turns screenshots into user-controlled actions such as reminders, calendar events, saved products, places, and read-later items.

### Problem

People use screenshots as quick memory, but galleries do not preserve intent. Deadlines, products, events, and useful posts become hard to find and easy to forget.

### Solution

Recall reads screenshot text on-device, optionally combines it with privacy-conscious server-side vision analysis, and returns structured items for useful workflows. The user reviews every action and every deletion.

### What makes Recall different

Recall is a local-first action layer rather than a screenshot chatbot or cloud gallery. It provides typed results, multi-item handling, duplicate protection, Smart Bundles, timely resurfacing, and reviewed cleanup.

### RevenueCat integration

Recall uses RevenueCat's `pro` entitlement, default offering, dashboard-managed paywall, purchases, and restore flow. Free users can clean up 3 screenshots per batch and see 3 Relevant Now cards. Pro removes the application-level cleanup batch cap and allows up to 5 Relevant Now cards.

Invitation-only AI access is separate from Pro. A judge invitation provisions 90-day AI access for the installation and requests a matching 90-day promotional `pro` entitlement; standard invitations never grant Pro. Normal AI quotas and safety controls still apply.

### AI and technical architecture

The Expo SDK 57 Android app performs OCR and initial classification on-device. With explicit user action, the InterServer-hosted Node.js backend sends one resized screenshot and its OCR text to GPT-5 mini through the OpenAI Responses API. Strict Structured Outputs conform to `RecallAnalysis`; Zod validates server-side and the mobile client validates again. Provider failures preserve the local result. Docker Compose runs the backend behind Caddy HTTPS with persistent SQLite state.

### Challenges and work completed

- Reliably associating titles, prices, and dates across multi-card screenshots
- Preserving useful offline behavior when AI or networking fails
- Converting incomplete dates into safe, user-reviewed actions
- Keeping Gallery deletion explicit while retaining useful saved data
- Testing native OCR, Media Library, notifications, RevenueCat, and permissions on physical Android hardware

The project includes screenshot discovery, on-device OCR, semantic analysis, action execution, duplicate protection, persistence, Smart Bundles and lifecycle controls, Relevant Now, Screenshot Cleanup, and RevenueCat subscriptions/paywalls.

## Evidence and readiness

- [x] On-device OCR is clearly distinguished from optional server-side AI.
- [x] OpenAI and RevenueCat secret keys are backend-only.
- [x] Smart Bundles, Relevant Now, reminders, cleanup, and local persistence are implemented.
- [x] Public InterServer HTTPS backend health endpoint is deployed and verified.
- [x] Existing-development-installation Samsung testing covered the core flow and judge complimentary Pro activation.
- [x] Samsung Maestro runs passed navigation, prepared screenshot opening/return, saved Library content after restart, and immediate snooze disappearance.
- [x] Local offline checks passed, including the storage-recovery, response-body deadline, and midnight snooze regression checks.
- [ ] GitHub-hosted Checks workflow has a successful run for the final published revision.
- [ ] Final standalone APK and clean first-time judge installation pass [Release QA](./release-qa.md).
- [ ] Final video uses real AI (`MOCK_ANALYSIS=false`) with prepared non-personal screenshots and truthful results.
- [ ] Final icon and 1179x2556 screenshots are exported and inspected.
- [ ] Final repository visibility, license detection, links, and fresh setup are checked from a logged-out or clean environment.

Do not describe existing-development-installation results as standalone APK verification.

Do not describe promotional judge Pro activation as a completed store purchase. Demonstrate RevenueCat's paywall and entitlement-based feature limits, and identify any Test Store or sandbox transaction accurately. The final video URL, exported submission icon/screenshot, public repository accessibility, student eligibility, and completed Devpost fields still need confirmation.

## Submission assets

- [ ] 1024x1024 Recall app icon
- [ ] At least one 1179x2556 screenshot without a device frame
- [ ] Public YouTube or Vimeo demonstration under two minutes
- [ ] Public repository link with visible MIT license
- [ ] English project description and RevenueCat explanation

Suggested screenshot set:

- [ ] Inbox with the Recall tagline and a useful pending screenshot
- [ ] Semantic analysis in progress or the privacy acknowledgement
- [ ] Prepared multi-product result with clearly separated products and accurate prices
- [ ] Library with saved content
- [ ] Smart Bundle with readable Active/Removed counts
- [ ] Relevant Now showing its primary action, **Snooze 1 day**, and Dismiss
- [ ] Screenshot Cleanup with selected items and Gallery deletion warning
- [ ] Profile showing Recall Free, Upgrade to Pro, and Restore Purchases
- [ ] RevenueCat Paywall with Monthly and Yearly options
- [ ] Profile showing Recall Pro and “Premium features active”

Before capture:

- [ ] Use a clean preview build with `MOCK_ANALYSIS=false` and a verified public HTTPS backend.
- [ ] Hide notifications and all personal or confidential data.
- [ ] Show no `.env`, API key, invitation, token, raw log, local IP, private URL, or credential.
- [ ] Use consistent orientation with no development labels or device frame where prohibited.
- [ ] Confirm text is not clipped and buttons remain readable at the captured scale.
- [ ] Match dates, prices, item counts, subscription state, and narration to the real result.
- [ ] Confirm Cleanup says selected screenshots will be removed from Gallery.
- [ ] Verify the standalone clean-install flow before sharing an optional APK.

Keep [demo-script.md](./demo-script.md) until the final demonstration video is complete.

## Judging readiness

The official criteria ask whether:

- [ ] the idea is clear, useful, interesting, or original and solves a real problem;
- [ ] the video and repository show meaningful progress and clear core functionality;
- [ ] RevenueCat is used thoughtfully for monetization; and
- [ ] the project demonstrates thoughtful technical choices, product thinking, care, and presentation.

## Optional judge material

- [ ] Standalone Android APK with checksum and install instructions
- [ ] Clean first-time judge flow verified against the public HTTPS backend
- [ ] Private judge invitation delivery and support contact
- [ ] Additional screenshots, architecture diagram, release history, and reviewed privacy policy

These can make evaluation easier but do not replace the required repository, public video, icon, screenshot, and Devpost fields. Google Play publication is not required for Recall's Next Gen-only entry.
