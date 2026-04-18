// Thin wrapper around Gmail REST list/get, using chrome.identity for the OAuth token.

const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

export async function getAuthToken({ interactive = false } = {}) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message || 'no_token'));
      } else {
        resolve(token);
      }
    });
  });
}

async function gmailFetch(path, token, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`gmail_${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function listRecentMessages(token, { query = 'newer_than:90d', maxResults = 100 } = {}) {
  const q = encodeURIComponent(query);
  return gmailFetch(`/messages?q=${q}&maxResults=${maxResults}`, token);
}

export async function getMessage(token, id) {
  return gmailFetch(`/messages/${id}?format=full`, token);
}

export function headerValue(msg, name) {
  const h = msg?.payload?.headers?.find(h => h.name?.toLowerCase() === name.toLowerCase());
  return h?.value || '';
}

function decodeBase64Url(data) {
  if (!data) return '';
  const padded = data.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return atob(padded.padEnd(padded.length + (4 - padded.length % 4) % 4, '='));
  } catch {
    return '';
  }
}

export function extractPlainText(msg) {
  const parts = [];
  (function walk(node) {
    if (!node) return;
    if (node.body?.data && (node.mimeType === 'text/plain' || node.mimeType === 'text/html')) {
      parts.push(decodeBase64Url(node.body.data));
    }
    for (const p of node.parts || []) walk(p);
  })(msg.payload);
  return parts.join('\n');
}
