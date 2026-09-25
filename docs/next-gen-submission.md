# RevenueCat Shipaton 2026 Next Gen Checklist

Source checked: [official competition rules](https://revenuecat-shipaton-2026.devpost.com/rules), updated August 31, 2026. This is an operational checklist, not a replacement for the rules. Recheck the live rules before submission.

The submission period ends September 30, 2026 at 11:45 PM PDT. Recall is entering only the Next Gen Award.

## Mandatory eligibility

- [ ] Entrant is an active student enrolled in high school, college, university, bootcamp, or another academic program.
- [ ] Devpost uses a qualifying student or academic email address. The rules say eligibility may be checked with JetBrains/swot.
- [ ] Entrant is at least 13 and is otherwise eligible under the rules and local law.
- [ ] If under the local age of majority, a parent/legal guardian has reviewed and agreed to the rules and the required consent form is completed by the deadline or when permitted/requested by the rules.
- [ ] No prohibited geography, conflict, ownership, or other general eligibility condition applies.
- [ ] Team/organization, if any, has an authorized representative; a team containing a minor enters only Next Gen.

## Mandatory project and repository

- [x] Android application with a working RevenueCat SDK integration and `pro` subscription entitlement flow.
- [ ] Core functionality works as depicted in the final video and description.
- [ ] Project is accessible from the United States as required by the rules.
- [ ] All third-party SDKs, APIs, data, music, images, and trademarks are authorized for use.
- [ ] Public repository URL is the final `Ajayfrizzy/recall-app` repository.
- [x] Repository contains source code and assets required by the project.
- [x] Root [MIT license](../LICENSE) exists.
- [ ] GitHub About section detects/displays the license at the top of the repository page.
- [x] Reproducible mobile/backend setup, environment-variable names, and checks are documented in the [README](../README.md).
- [ ] A reviewer follows the clean setup instructions from a fresh checkout without access to private developer files.
- [ ] Repository and commit history contain no secrets, real invitations, tokens, personal screenshots, or unauthorized material.

Next Gen replaces the published store listing with the public repository and demo video. No paid Apple or Google developer account and no App Store or Google Play release is required.

## Mandatory Devpost submission

- [ ] Join the hackathon and complete all required fields during the submission period.
- [ ] Select the Next Gen Award and no unintended categories.
- [ ] Add a clear English text description of Recall's problem, features, and functionality.
- [ ] Explain how Recall uses RevenueCat for subscriptions, its managed paywall/default offering, restore flow, `pro` entitlement, Free/Pro limits, and judge promotional Pro.
- [ ] Add the public repository URL.
- [ ] Upload a public YouTube or Vimeo demo and add its link.
- [ ] Video is shorter than 2:00 and shows Recall working on its target Android device.
- [ ] Video contains no unauthorized trademarks, copyrighted music/material, personal data, invitations, tokens, or keys.
- [ ] Upload a 1024x1024 app icon.
- [ ] Upload at least one app screenshot at 1179x2556 pixels without a device frame.
- [ ] All submission materials are in English or include the English translations required by the rules.
- [ ] Submission is the entrant's original, owned work and complies with all relevant third-party/open-source licenses.

## Next Gen judging readiness

The official criteria ask whether:

- [ ] the idea is clear, useful, interesting, or original and solves a real problem;
- [ ] the video and repository show meaningful progress toward a working app and clear core functionality;
- [ ] RevenueCat is used thoughtfully for the monetization flow; and
- [ ] the project shows thoughtful technical choices, product thinking, care, and presentation.

## Recall evidence to verify

- [x] On-device OCR is clearly distinguished from optional server-side AI.
- [x] OpenAI and RevenueCat secret keys are documented as backend-only.
- [x] Smart Bundles, Relevant Now, reminders, cleanup, and local persistence are implemented.
- [x] Latest UI refinements and the existing judge installation's complimentary Pro activation were reported as passed on a physical Samsung device.
- [ ] Public HTTPS backend is deployed and verified.
- [ ] Final video uses real AI (`MOCK_ANALYSIS=false`) with prepared non-personal screenshots and truthful results.
- [ ] Final icon and 1179x2556 screenshots are exported and inspected.
- [ ] Final repository visibility, license detection, links, and fresh setup are checked from a logged-out/clean environment.

## Optional supporting material

- [ ] Standalone Android APK with checksum and install instructions.
- [ ] Clean first-time judge installation verified against the public HTTPS backend.
- [ ] Private judge invitation delivery and support contact.
- [ ] Additional screenshots, architecture diagram, release notes, and privacy policy.

These items can make evaluation easier but the rules say Next Gen is evaluated through the video and public code repository and is exempt from the store-download requirement. A standalone APK is optional, not a substitute for the required materials. Google Play publication is not on this checklist.
