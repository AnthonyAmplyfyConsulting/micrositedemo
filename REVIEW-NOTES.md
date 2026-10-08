# Amplyfy luxury microsite preview

This review copy was built from AnthonyAmplyfyConsulting/micrositedemo at commit 01028d3169f9ff14f50658b32b770db3712d8bb8. No remote branches, commits, files, settings, or deployments were changed.

## Preview

Run `npm ci` then `npm run dev`. The homepage, /demo, and /preview open the redesigned experience. The existing /play/[slug], redemption routes, Supabase/GHL integration, and pass signing backend are retained for the production integration phase.

## Implemented

- Reference-inspired black marble, orange/amber lighting, gold details, supplied Amplyfy wordmark.
- Rotating Grow headline: Repeat Visits / Customer LCV / Regulars / Loyalty.
- Seven coordinated Higgsfield-generated background/cover assets in public/luxury.
- Four illustrated tiles: Roll Dice, Roulette, Lucky Drive, 3 Card Monty.
- Three.js PBR game scenes with environment lighting, shadows, detailed physical models, optional synthesized sound, and reduced-motion support.
- Dice: Cannon rigid-body trajectories, gold pips, opposite sides add to seven. Totals 2–5 = 5%, 6–9 = 10%, 10–12 = 15%.
- Roulette: authentic European 37-pocket layout and ball landing matched to the resulting pocket. Red numbers = 15%, black numbers = 10%, green zero = 5%. Visible rules explain the target before spinning.
- Golf: 140-yard par 3, aim and power controls, gravity-shaped flight, crosswind, bounce and rollout. Within 6 metres = 15%, within 20 metres = 10%, farther = 5%.
- Cards: face-up 5/10/15 preview, flip, six animated swaps, position-to-card identity tracking, chosen card reveals its actual value.
- Branded reward form with phone validation and optional promotional SMS checkbox. Demo details remain in memory only.
- Wallet visual preview, replay flow, lifecycle cleanup, responsive mobile layout.

## Scope and integration

This is a reviewable demo. It does not write contacts, send messages, issue redeemable coupons, or generate a signed pass. The Wallet control visibly says Preview Apple Wallet Pass. Keep the existing credentials and backend in the deployment environment. Server-authoritative validation of game results must be implemented before using client-calculated golf/card outcomes in real coupons.

## Validation

TypeScript and Next.js production build passed. All four normal-motion game-to-form-to-wallet preview flows passed browser checks without console errors. Golf power tests at 72%, 81%, and 100% correctly yielded 15%, 10%, and 5%. Phone validation and a 320px content-width mobile check passed. The review preview embeds its images and rendering/physics libraries.

## Text contrast revision

Plain headings, labels, descriptions, inputs, and controls explicitly render in white across every demo screen. Orange gradient accent headlines remain. Verified against an injected dark host heading/form stylesheet in the browser.

## Menu focus and reward reveal revision

The game menu background has an 8px blur on a separate background layer, with sharp game covers and controls. The result percentage uses an explicit 1.25 line-height block to prevent inherited host styles from clipping it. Desktop and 320px content-width browser checks confirmed the full reward fits.

## Roulette and course polish revision

Roulette now uses color-based rewards, with visible red/black/zero rules and matching result text. Lucky Drive has an inset amber-edged course window, continuous procedural sky and terrain, haze, organically edged fairway, painted mowing bands, and a forged iron model with grooves, cavity, hosel, ferrule and textured grip. The camera keeps the ball and club above the status caption.
