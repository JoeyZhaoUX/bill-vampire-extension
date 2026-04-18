// Mirror of the web app's pro.js semantics, adapted for the extension:
// - Reads the `bv_pro` cookie at .billvampire.com to determine Patrol status.
// - Exposes the Creem checkout URL so the popup can upsell with the same flow.

const COOKIE_URL = 'https://billvampire.com';
const COOKIE_NAME = 'bv_pro';

const CREEM_PATROL_MONTHLY_URL = 'https://www.creem.io/payment/prod_patrol_monthly_PLACEHOLDER';
const CREEM_PATROL_ANNUAL_URL = 'https://www.creem.io/payment/prod_patrol_annual_PLACEHOLDER';

function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

export async function readProCookie() {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: COOKIE_URL, name: COOKIE_NAME }, (cookie) => {
      if (!cookie?.value) return resolve(null);
      const payload = decodeJwtPayload(cookie.value);
      if (!payload) return resolve(null);
      if (payload.exp && payload.exp * 1000 < Date.now()) return resolve(null);
      resolve(payload);
    });
  });
}

export async function isPatrol() {
  const p = await readProCookie();
  return p?.tier === 'patrol' || p?.tier === 'patrol_annual';
}

export async function isPro() {
  const p = await readProCookie();
  return !!p;
}

function successUrl(tier) {
  return encodeURIComponent(`${COOKIE_URL}/app#patrol-success-${tier}`);
}

export function getPatrolCheckoutUrl(cycle = 'monthly', source = 'extension') {
  const base = cycle === 'annual' ? CREEM_PATROL_ANNUAL_URL : CREEM_PATROL_MONTHLY_URL;
  const tier = cycle === 'annual' ? 'patrol_annual' : 'patrol';
  return `${base}?success_url=${successUrl(tier)}&ref=${encodeURIComponent(source)}`;
}

export function openPatrolCheckout(cycle = 'monthly', source = 'extension') {
  chrome.tabs.create({ url: getPatrolCheckoutUrl(cycle, source) });
}

export function openWebApp(url) {
  chrome.tabs.create({ url });
}
