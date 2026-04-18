// Minimal analytics shim. Forwards events to the web app's /api/stats or a
// PostHog endpoint once configured. For now it just console.logs so events
// are visible in `chrome-extension://...` devtools.

export function track(event, props = {}) {
  try {
    // eslint-disable-next-line no-console
    console.log('[bv-patrol]', event, props);
  } catch { /* ignore */ }
}
