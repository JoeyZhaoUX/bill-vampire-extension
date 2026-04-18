// Very light content script: when the user opens a Gmail message whose subject
// looks like a recurring-billing receipt, inject a rose-bordered toast pinned
// to the bottom-right, offering one-tap "Track in Bill Vampire".

(function () {
  'use strict';

  const TOAST_ID = 'bv-patrol-toast';
  const BILLING_RX = /(invoice|receipt|payment|subscription|renewed|your.*bill)/i;
  const AMOUNT_RX = /\$([0-9]+\.[0-9]{2})/;

  function findSubject() {
    const el = document.querySelector('h2[data-thread-perm-id]')
      || document.querySelector('h2.hP')
      || document.querySelector('[data-legacy-thread-id] h2');
    return el ? el.textContent.trim() : '';
  }

  function findFromAddress() {
    const el = document.querySelector('span[email]');
    return el ? el.getAttribute('email') : '';
  }

  function findAmount() {
    const bodyText = document.querySelector('.ii.gt')?.innerText || '';
    const m = AMOUNT_RX.exec(bodyText);
    return m ? parseFloat(m[1]) : null;
  }

  function removeToast() {
    const existing = document.getElementById(TOAST_ID);
    if (existing) existing.remove();
  }

  function showToast({ name, amount }) {
    removeToast();
    const root = document.createElement('div');
    root.id = TOAST_ID;
    root.style.cssText = `
      position: fixed; right: 20px; bottom: 20px; z-index: 2147483647;
      max-width: 320px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #141420; color: #e2e8f0; border: 1px solid rgba(244,63,94,.4);
      border-radius: 14px; padding: 14px 16px; box-shadow: 0 20px 40px rgba(0,0,0,.5);
    `;
    root.innerHTML = `
      <div style="display:flex;gap:10px;align-items:flex-start;">
        <div style="flex-shrink:0;width:32px;height:32px;border-radius:8px;background:rgba(244,63,94,.15);border:1px solid rgba(244,63,94,.4);display:flex;align-items:center;justify-content:center;font-size:14px;">🧛</div>
        <div style="flex:1;min-width:0;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#fff;">Another vampire detected</p>
          <p style="margin:0 0 10px;font-size:12px;color:#94a3b8;line-height:1.5;">${escapeHtml(name)}${amount ? ' — $' + amount.toFixed(2) + '/mo' : ''}. Add to Bill Vampire?</p>
          <div style="display:flex;gap:6px;">
            <button id="bv-add" style="flex:1;padding:6px 10px;background:linear-gradient(90deg,#f43f5e,#f59e0b);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">Track it</button>
            <button id="bv-dismiss" style="padding:6px 10px;background:#1C1C2A;color:#94a3b8;border:1px solid rgba(100,116,139,.3);border-radius:8px;font-size:11px;font-weight:500;cursor:pointer;">Dismiss</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    root.querySelector('#bv-dismiss').addEventListener('click', removeToast);
    root.querySelector('#bv-add').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'vampire/track_manual', name, amount });
      removeToast();
    });
    setTimeout(removeToast, 20000);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function check() {
    const subject = findSubject();
    if (!subject || !BILLING_RX.test(subject)) {
      removeToast();
      return;
    }
    const from = findFromAddress();
    const amount = findAmount();
    const name = guessBillerName(from) || subject.slice(0, 40);
    showToast({ name, amount });
  }

  function guessBillerName(from) {
    if (!from) return '';
    const m = /@([a-z0-9.-]+)/i.exec(from);
    if (!m) return '';
    const host = m[1].replace(/\.(com|io|co|net|org|app|ai)$/i, '');
    const last = host.split('.').pop();
    return last ? last.charAt(0).toUpperCase() + last.slice(1) : '';
  }

  let t;
  const observer = new MutationObserver(() => {
    clearTimeout(t);
    t = setTimeout(check, 400);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  check();
})();
