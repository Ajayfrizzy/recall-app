# Recall submission notes

## One-line description

Recall turns screenshots into user-controlled actions such as reminders, calendar events, saved products, places, and read-later items.

## Problem

People save screenshots as a quick form of memory, but galleries do not preserve intent. Deadlines, products, events, and useful posts become hard to find and easy to forget.

## Solution

Recall reads screenshot text on-device, optionally combines it with privacy-conscious server-side vision analysis, and returns structured items that plug into useful workflows. The user reviews every action and every deletion.

## What makes Recall different

Recall is not a screenshot chatbot or cloud gallery. It is a local-first action layer with typed results, multi-item handling, duplicate protection, Smart Bundles, timely resurfacing, and reviewed cleanup.

## RevenueCat integration

Recall uses RevenueCat's `pro` entitlement, default offering, dashboard-managed Paywall, and purchase restoration. Free users can clean up 3 screenshots per batch and see 3 Relevant Now cards. Pro supports larger cleanup batches and up to 5 Relevant Now cards.

## AI integration

The backend calls `gpt-5-mini` through the OpenAI Responses API with one compressed screenshot and its on-device OCR text. Strict Structured Outputs conform to `RecallAnalysis`, then Zod validates the result server-side and the mobile client validates it again. Provider failures fall back to the local result.

## Technical architecture

- Mobile: Expo SDK 57, React Native, Expo Router, Media Library, OCR, Image Manipulator, AsyncStorage, Calendar, Notifications, and RevenueCat
- Backend: Node.js/TypeScript, OpenAI JavaScript SDK, Responses API, and Zod
- Flow: screenshot → OCR → backend vision analysis → structured result → Smart Actions, Bundles, Resurfacing, and Cleanup

## Challenges

- Reliably associating titles, prices, and dates across multi-card screenshots
- Preserving useful offline/local behavior when AI or networking fails
- Converting incomplete date information into safe, user-reviewed actions
- Keeping screenshot deletion explicit while maintaining related saved data
- Testing native OCR, Media Library, notifications, and purchases on physical Android hardware

## What was built during the hackathon

The project includes screenshot discovery, on-device OCR, structured semantic analysis, action execution, duplicate protection, persistence, Smart Bundles and lifecycle controls, Relevant Now, Screenshot Cleanup, and RevenueCat subscriptions/paywalls.

## Future work

- Release-candidate QA across more Android devices and iOS
- Authenticated production API access and distributed abuse protection
- Broader evaluation sets for visual layouts, currencies, locales, and date formats
- Better observability with privacy-safe aggregate metrics
- Store-listing assets, final policy copy, and production deployment hardening
