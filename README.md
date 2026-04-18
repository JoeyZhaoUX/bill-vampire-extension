# Bill Vampire Patrol — Chrome extension (MV3)

Scans Gmail daily for new recurring charges, surfaces a rose toast inside Gmail
when a billing email opens, and deep-links to `billvampire.com/app` for the
full verdict.

## Development

```bash
npm install
npm run dev        # HMR via @crxjs/vite-plugin; load `dist/` as an unpacked extension
npm run build      # production bundle in dist/
```

Replace the placeholders before shipping:

- `manifest.json` → `oauth2.client_id` (Google Cloud Console OAuth client, scope `gmail.readonly`)
- `src/shared/pro.js` → `CREEM_PATROL_MONTHLY_URL` / `CREEM_PATROL_ANNUAL_URL` (real Creem product IDs)
- `public/icons/` → ship the 16/48/128 variants of the vampire mascot

## Pro sync

The extension reads a JWT cookie `bv_pro` at `.billvampire.com`. The web app
issues this cookie after Creem webhook via `functions/api/pro-token.js`. Patrol
unlocks when `tier === 'patrol' || 'patrol_annual'`.

## Architecture

```
src/
  background/
    service-worker.js   — daily alarm, Gmail poll, storage writes, badge
    gmail-client.js     — Gmail REST list/get wrapper, uses chrome.identity
    matchers.js         — matches message → biller using matchers.json
    matchers.json       — seed library of ~20 billers (extend with user reports)
  content/
    gmail-toast.js      — injects rose toast when a billing-email subject appears
  popup/
    App.jsx             — mini dashboard (findings, monthly drain, upsell)
  shared/
    pro.js              — bv_pro cookie reader + Patrol checkout URL
    analytics.js        — placeholder event shim
```

## Scope discipline (v2.1)

Intentionally out of scope: automated cancellation, negotiation, Outlook/iCloud
mail, Android. Ship Gmail first, prove demand, then expand.
