# Direct Apple subscriptions

The iPhone app uses Apple StoreKit 2 directly through an app-local Capacitor Swift bridge. It requires iOS 15 or later. RevenueCat and its SDK keys are removed. The web app continues using its existing Stripe checkout. Product features and personalization variables remain shared.

Apple app: `com.bibleforlifestages`, App Store Connect ID `6763881155`.

Configure one Apple subscription group with:

- `001`: existing Apple monthly product, one month, intended US price $4.99. Apple currently reports MISSING_METADATA; complete its metadata and verify its price before testing.
- `com.bibleforlifestages.premium.yearly`: one year, US price $49.99.

The existing monthly Apple identifier is preserved. The former adapter's unverified placeholder IDs are removed; the yearly identifier is proposed for the product still to be configured. Localized prices displayed in the app come from StoreKit. Introductory trials are recognized only when Apple actually reports a free introductory offer; UI trial claims must match the approved Apple offer.

## Native implementation

`native/ios/LifeStagesStoreKitPlugin.swift` uses `Product.products`, `Product.purchase`, `Transaction.currentEntitlements`, `Transaction.updates`, and explicit `AppStore.sync` for Restore Purchases. Only Apple-verified, known-product, unexpired, non-revoked transactions unlock native access. Pending Ask to Buy and cancelled purchases do not grant premium. Renewal cancellation keeps access until paid expiration. Refunds/revocations and foreground refreshes update access. Apple subscription management opens Apple's native management sheet.

After creating/syncing the iOS Capacitor project, run `ruby scripts/configure-storekit.rb`. This adds the native files to the app target and registers the plugin through its bridge view controller. Both cloud workflows include this step. No private signing key is bundled into the app.

## Hosted backend

The mobile client keeps the Apple-signed transaction only in memory and attaches it to JSON requests. The personalization resolver removes it before passing content inputs downstream. The backend verifies Apple's certificate chain, app ID, bundle, environment, product, expiry and revocation, then queries the App Store Server API for current subscription status. It uses Apple's official Node server library and public Apple PKI roots. Positive results are cached for at most 30 seconds and never past expiration.

Required server-only Railway variables:

- `APPLE_IAP_PRIVATE_KEY`: existing Apple In-App Purchase key (different from build-signing App Store Connect API key).
- `APPLE_IAP_KEY_ID` and `APPLE_IAP_ISSUER_ID`.
- `APPLE_IAP_ALLOW_SANDBOX=true` only while explicitly enabling TestFlight/sandbox receipt testing. Production receipts are always supported. Remove sandbox acceptance for production-only operation after testing.

Missing configuration and failed verification grant no Apple premium. `/api/apple/status` reports only configuration readiness; native purchases are blocked until it reports ready. Receipts and private keys must not be logged or committed. iPhone API requests use the exact `capacitor://localhost` CORS origin; same-origin web behavior remains supported.

## Release verification

Run TypeScript, regression tests, mobile export, and cloud native compilation. Then test actual StoreKit sandbox purchases and restoration on the signed TestFlight app: monthly/yearly localized prices, cancellation, Ask to Buy pending, reinstalls/restores, expiry, refund/revocation, subscription management, and personalized backend content. Passing JavaScript tests does not establish successful Apple purchases. App Store product approval, paid agreements and review remain account-side requirements.
