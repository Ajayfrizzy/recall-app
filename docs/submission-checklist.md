# Submission Asset Checklist

Capture from a clean preview build using real AI. Hide notifications and personal data, use consistent device orientation, and verify no development labels are visible. The final Devpost submission requires a 1024x1024 icon and at least one 1179x2556 screenshot without a device frame.

## Mandatory assets

- [ ] 1024x1024 Recall app icon
- [ ] At least one 1179x2556 screenshot without a device frame
- [ ] Public YouTube or Vimeo demonstration video shorter than two minutes
- [ ] Public repository link with visible MIT license
- [ ] English project description and RevenueCat explanation

## Screenshot set

- [ ] Inbox with the Recall tagline and a useful pending screenshot
- [ ] Semantic analysis in progress or the privacy acknowledgement
- [ ] INGREM result with four clearly separated products and correct prices
- [ ] Library with saved content
- [ ] Smart Bundle with readable Active/Removed counts
- [ ] Relevant Now card with action, Snooze, and Dismiss
- [ ] Screenshot Cleanup with selected items and Gallery deletion warning
- [ ] Profile showing Recall Free, Upgrade to Pro, and Restore Purchases
- [ ] RevenueCat Paywall with Monthly and Yearly options
- [ ] Profile showing Recall Pro and “Premium features active”

Before capture:

- [ ] `MOCK_ANALYSIS=false`
- [ ] No API key, `.env`, raw logs, local IP, or personal credentials visible
- [ ] Status bar and notification shade are clean
- [ ] Text is not clipped and buttons do not wrap awkwardly
- [ ] Dates, prices, item counts, and subscription state match the narration
- [ ] Cleanup confirmation uses: “They will be removed from your Gallery.”
- [ ] Public HTTPS backend is live and verified
- [ ] Standalone APK clean-install flow is verified if the optional APK will be shared
- [ ] No real invitation code or installation token appears in any asset

Google Play publication is not required for Recall's Next Gen-only entry. See [next-gen-submission.md](./next-gen-submission.md) for the rules-based submission checklist.
