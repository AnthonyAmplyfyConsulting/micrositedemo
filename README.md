# Amplyfy Restaurant Rewards

A mobile-first rewards microsite with four games: Spin the Wheel, Pick Your Card, Lucky Dice, and Scratch & Reveal. Every game uses the existing 5%, 10%, or 15% server-selected reward.

## Run locally

```sh
npm ci
npm run dev
```

- `/play/amplyfy` uses the real reward, claim, and Wallet APIs. The root URL redirects here.
- `/play/[slug]` uses the matching restaurant slug in Supabase.
- `/preview` is an isolated interactive preview. It does not save contacts or issue real Wallet passes.

## Existing integrations

Keep the existing deployment environment variables and Apple signing configuration:

| Integration | Configuration |
| --- | --- |
| Supabase API routes | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Public Supabase client, if used | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Optional GoHighLevel contact sync | `GHL_API_KEY`, `GHL_LOCATION_ID` |
| Apple PEM signing configuration | `APPLE_WWDR_CERT_BASE64`, `APPLE_SIGNER_CERT_BASE64`, `APPLE_SIGNER_KEY_BASE64` |
| Alternative Apple P12 configuration | `APPLE_PASS_P12_BASE64`, `APPLE_WWDR_BASE64`, `APPLE_PASS_CERT_PASSWORD` |
| Optional fallback redemption URL | `NEXT_PUBLIC_BASE_URL` |

The existing local `certs/` signing fallback is also supported. Signing certificates, private keys, and environment files must stay out of Git. The existing pass type and team identifiers remain in `src/lib/pass/pass.model/pass.json`.

The flow remains:

1. `/api/spin` records the server-selected reward in Supabase and returns its spin ID.
2. The chosen game reveals that same reward.
3. `/api/claim` receives the original spin ID and creates the coupon and optional GHL contact.
4. The official Add to Apple Wallet badge links to `/api/pass/[couponId]`, which signs the existing pass template with the configured certificates.

Claiming no longer requests a second spin. A failed reward request can retry with the same session token. No Supabase schema changes are required.

## Mobile behavior

The interface supports portrait and landscape phones, touch gestures, safe-area insets, and reduced motion. Name and phone inputs use 16px text and autofill; the reward form scrolls within the visual viewport when the keyboard opens. Only one reward screen is mounted at a time.

Three.js renders the wheel, cards, and dice. Cannon records physically simulated dice throws that match the server reward. Decorative geometry is batched, pixel density is capped, idle scenes avoid unnecessary rendering, and inactive scenes release their graphics resources.

## Validation for this revision

- Production build and TypeScript checks.
- Live Supabase connectivity: one anonymous spin and an idempotent retry, with no coupon or GHL contact created.
- ESLint checks for the changed UI and game files.
- Mobile viewport checks at 320×568, 375×667, 390×844, 430×932, 736×390, and 852×393.
- All four games through the actual spin, claim, and pass API handlers using a local Supabase REST fixture.
- Card tapping, dice swiping, scratch gestures, and landscape control placement using touch events.
- Original winning spin/coupon consistency, duplicate-claim rejection, pass manifest hashes, and CMS signatures using temporary test certificates.

Local fixture checks do not establish trust in a live Apple signing certificate. Installing a pass on an iPhone must be checked against the deployed site's existing credentials.
