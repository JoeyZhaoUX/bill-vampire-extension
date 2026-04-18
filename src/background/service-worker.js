// MV3 service worker. Wakes once a day, fetches recent Gmail messages, matches
// against the local biller library, writes findings to chrome.storage.local,
// and updates the action badge.

import { getAuthToken, listRecentMessages, getMessage, headerValue, extractPlainText } from './gmail-client.js';
import { matchMessage } from './matchers.js';

const ALARM_NAME = 'vampire_daily_scan';
const STORAGE_FINDINGS = 'vampire_findings';
const STORAGE_LAST_SCAN = 'vampire_last_scan';
const FREE_LIFETIME_LIMIT = 5;

chrome.runtime.onInstalled.addListener(async () => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 24 * 60 });
  try { await runScan({ interactive: false }); } catch { /* token probably not granted yet */ }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) runScan({ interactive: false }).catch(() => { /* silent */ });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'vampire/scan') {
    runScan({ interactive: true })
      .then((findings) => sendResponse({ ok: true, findings }))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }
  if (msg?.type === 'vampire/findings') {
    chrome.storage.local.get(STORAGE_FINDINGS, (res) => sendResponse({ findings: res[STORAGE_FINDINGS] || [] }));
    return true;
  }
  return false;
});

async function isPatrol() {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: 'https://billvampire.com', name: 'bv_pro' }, (cookie) => {
      if (!cookie?.value) return resolve(false);
      try {
        const [, payload] = cookie.value.split('.');
        const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        resolve(json?.tier === 'patrol' || json?.tier === 'patrol_annual');
      } catch { resolve(false); }
    });
  });
}

async function runScan({ interactive }) {
  const token = await getAuthToken({ interactive });
  const list = await listRecentMessages(token, { query: 'newer_than:90d category:primary OR from:(@stripe.com OR @apple.com)' , maxResults: 80 });
  const ids = (list.messages || []).map(m => m.id);
  const patrol = await isPatrol();
  const cap = patrol ? Infinity : FREE_LIFETIME_LIMIT;

  const existing = await readFindings();
  const byKey = new Map(existing.map(f => [f.name.toLowerCase(), f]));

  for (const id of ids) {
    try {
      const msg = await getMessage(token, id);
      const from = headerValue(msg, 'From');
      const subject = headerValue(msg, 'Subject');
      const body = extractPlainText(msg).slice(0, 20000);
      const match = matchMessage({ from, subject, body });
      if (!match || !match.name) continue;
      const prev = byKey.get(match.name.toLowerCase());
      const finding = {
        name: match.name,
        amountUsd: match.amountUsd ?? prev?.amountUsd ?? null,
        cycle: match.cycle || prev?.cycle || 'monthly',
        cancelUrl: match.cancelUrl || prev?.cancelUrl || null,
        lastSeenAt: Date.now(),
        lastMessageId: id,
        source: 'patrol_extension',
      };
      byKey.set(match.name.toLowerCase(), finding);
    } catch { /* keep scanning */ }
  }

  let findings = Array.from(byKey.values());
  if (findings.length > cap) findings = findings.slice(0, cap);

  await writeFindings(findings);
  updateBadge(findings.length, cap);
  return findings;
}

function readFindings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_FINDINGS], (res) => resolve(res[STORAGE_FINDINGS] || []));
  });
}

function writeFindings(findings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({
      [STORAGE_FINDINGS]: findings,
      [STORAGE_LAST_SCAN]: Date.now(),
    }, resolve);
  });
}

function updateBadge(count, cap) {
  const text = count > 0 ? String(count) : '';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: count >= cap && cap !== Infinity ? '#f59e0b' : '#f43f5e' });
}
