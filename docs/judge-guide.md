# Next Gen Judge Guide

Recall's official Next Gen evaluation materials are the public source repository and a demonstration video. A standalone APK may also be provided as optional supporting material after its clean-install flow is verified.

## Submitted judging materials

- [Narrated Vimeo demonstration](https://vimeo.com/1230602934)
- [Public source repository and MIT license](https://github.com/Ajayfrizzy/recall-app)
- [Submitted media and project details](./submission.md)

The Devpost project-page URL has not been supplied for inclusion here. An APK and private invitation are not part of the required Next Gen evidence.

## Install an optional APK

Before following APK instructions, use the public repository's [README](../README.md) for setup and [submission guide](./submission.md) for the entry's assets. The narrated demonstration is published on [Vimeo](https://vimeo.com/1230602934), the icon and screenshots are committed in the repository, and the creator confirmed submitting the Next Gen Devpost entry on September 27, 2026. No optional APK download link has been supplied or verified. The Next Gen entry does not require a store release or an APK. Contact: **ajayholuwaseun@gmail.com**.

1. If the creator separately supplies a tested APK download link, download it only from that authorized link.
2. On Android, allow installation from that source when prompted, then install Recall.
3. Open Recall. The APK must run without Metro or a development launcher.
4. If Android blocks the install, do not disable broader device protections; report the exact message to **ajayholuwaseun@gmail.com**.

## What the Next Gen submission provides

The required judging materials are the public [source repository](https://github.com/Ajayfrizzy/recall-app), its MIT license, and the under-two-minute Android demo. Watch the [narrated Android demonstration on Vimeo](https://vimeo.com/1230602934). The same link is recorded in [submission.md](./submission.md). A playable APK and private judge invitation are optional extras, not conditions for Next Gen entry.

## Try the core flow

1. Complete onboarding and tap **Grant Screenshot Access**.
2. Choose full photo access or selected photos. Recall shows only screenshots Android makes available.
3. Open a screenshot and start analysis. OCR and the initial classification run on-device.
4. Optional Recall AI requires a private invitation and sends only the current compressed screenshot, OCR text, and limited time context to the backend. Review [privacy-policy.md](./privacy-policy.md) before using a personal screenshot.
5. Review the structured result. Depending on its contents, save a product/place/read-later item, create a reminder, or add an event. Recall does not perform the action automatically.
6. Open **Library** to view saved items and Smart Bundles. Open a bundle to inspect related items.
7. Open **Inbox** to view Relevant Now cards when eligible saved content is available; cards can be opened, snoozed, or dismissed.
8. Open **Upcoming** to verify a reminder or calendar action.

Use non-sensitive screenshots created for judging. Do not upload credentials, financial data, health data, private messages, or other personal material.

## Activate invitation-only AI and complimentary Pro

1. Obtain a judge invitation through the private channel stated in the submission. No real code is included in this repository.
2. Open **Profile → Activate AI** and enter the code once.
3. A judge invitation activates Recall AI for that installation and requests complimentary Recall Pro.
4. Confirm Profile shows active AI access, its expiration, and **Recall Pro Active**. If Pro remains pending after connectivity is restored, use **Retry Pro Activation**; do not consume another invitation.

Judge access lasts 90 days from successful invitation redemption. It is tied to that installation, is revocable, and remains subject to daily quotas, global limits, concurrent-request controls, the AI shutdown switch, and the estimated spending ceiling. Standard invitations activate AI but do not grant Pro.

Recall Free allows 3 cleanup items per batch and 3 Relevant Now cards. Pro removes the application-level cleanup batch cap and allows 5 Relevant Now cards. It does not activate AI by itself. Judge promotional activation is separate from a store purchase and is not evidence that the purchase/restore test matrix has passed.

## Prepared demonstration examples

- Use a non-personal product screenshot, save a product, then find its extracted product title in Library. The title can differ from the screenshot filename.
- Use a deadline screenshot with an explicit future date and time. Review the proposed reminder before confirming it, then check Upcoming.
- For Relevant Now, choose an eligible test deadline. Snooze hides that item for 24 hours without cancelling its reminder; after expiry it returns only if still relevant and within the displayed-card limit. Dismiss applies to the particular occurrence.

No example requires a real invitation to be published. On-device OCR and local classification remain available without AI activation. Developer smoke-test commands and their limits are in [Release QA](./release-qa.md#maestro-native-smoke-tests).

## Screenshot Cleanup

Open Cleanup, review each candidate, and select only prepared test screenshots. Recall displays a final warning and Android controls the Gallery deletion confirmation. Cancel unless deletion is intentionally part of the test.

## Known testing limits

- The public HTTPS backend is deployed and its health endpoint has been verified. End-to-end AI still depends on the runtime AI switch, quotas, and provider availability.
- The supplied Release QA does not establish a tested standalone APK or clean first-time judge installation; do not describe either as verified without further test evidence.
- AI requires connectivity and may fall back to the on-device result.
- Access does not transfer between devices and there is no user account.
- The current submission targets Android; Google Play publication is not required for this Next Gen entry.

Never share an invitation code, installation token, APK secret, or API key in Devpost comments, screenshots, recordings, or issues.
