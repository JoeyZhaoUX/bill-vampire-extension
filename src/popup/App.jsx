import React, { useEffect, useState } from 'react';
import { isPatrol, openPatrolCheckout, getPatrolCheckoutUrl, openWebApp } from '../shared/pro.js';

const WEB_APP = 'https://billvampire.com/app';
const FREE_LIMIT = 5;

function readFindings() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'vampire/findings' }, (res) => resolve(res?.findings || []));
  });
}

function startScan() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'vampire/scan' }, (res) => resolve(res));
  });
}

export default function App() {
  const [findings, setFindings] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState('');
  const [patrol, setPatrol] = useState(false);

  useEffect(() => {
    readFindings().then(setFindings);
    isPatrol().then(setPatrol);
  }, []);

  const runScan = async () => {
    setScanning(true);
    setErr('');
    const res = await startScan();
    if (res?.ok) setFindings(res.findings || []);
    else setErr(res?.error || 'scan failed');
    setScanning(false);
  };

  const monthlyDrain = findings.reduce((acc, f) => acc + (Number.isFinite(f.amountUsd) ? f.amountUsd : 0), 0);
  const atCap = !patrol && findings.length >= FREE_LIMIT;

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#f43f5e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>\u{1F9DB}</div>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>Bill Vampire Patrol</p>
          <p style={{ margin: 0, fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{patrol ? 'Patrol active' : 'Free tier'}</p>
        </div>
      </header>

      <div style={{ background: '#141420', border: '1px solid rgba(100,116,139,.2)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Monthly drain</p>
        <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 800, color: '#fb7185', fontFamily: 'ui-monospace, monospace' }}>${monthlyDrain.toFixed(2)}</p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>{findings.length} vampire{findings.length === 1 ? '' : 's'} detected{atCap ? ' \u00b7 free cap reached' : ''}</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={runScan} disabled={scanning}
          style={{ flex: 1, padding: '8px 10px', background: '#f43f5e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: scanning ? 0.6 : 1 }}>
          {scanning ? 'Scanning\u2026' : 'Scan Gmail now'}
        </button>
        <button onClick={() => openWebApp(WEB_APP + '?import=ext')}
          style={{ flex: 1, padding: '8px 10px', background: '#1C1C2A', color: '#e2e8f0', border: '1px solid rgba(100,116,139,.3)', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          Open full verdict
        </button>
      </div>

      {err && <p style={{ color: '#fb7185', fontSize: 11, marginBottom: 10 }}>{err}</p>}

      <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {findings.map((f, i) => (
          <div key={i} style={{ background: '#141420', border: '1px solid rgba(100,116,139,.15)', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{f.name}</span>
              <span style={{ fontSize: 11, color: '#fb7185', fontWeight: 700 }}>{Number.isFinite(f.amountUsd) ? `$${f.amountUsd.toFixed(2)}` : '\u2014'}</span>
            </div>
            {f.cancelUrl && (
              <a href={f.cancelUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 10, color: '#94a3b8', textDecoration: 'none' }}>
                Cancel at source \u2192
              </a>
            )}
          </div>
        ))}
        {findings.length === 0 && !scanning && (
          <p style={{ color: '#64748b', fontSize: 11, textAlign: 'center', padding: 20 }}>
            Click \u201cScan Gmail now\u201d. Read-only; only matched receipts leave your device.
          </p>
        )}
      </div>

      {atCap && (
        <div style={{ marginTop: 14, padding: 12, background: 'linear-gradient(135deg,#4c1d95,#7f1d1d)', borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: 11, color: '#fff', fontWeight: 600 }}>Free cap reached (5 vampires).</p>
          <p style={{ margin: '4px 0 8px', fontSize: 10, color: '#e9d5ff' }}>Upgrade to Patrol for unlimited detections + weekly digest + charge alerts.</p>
          <a href={getPatrolCheckoutUrl('monthly', 'popup_cap')} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-block', padding: '6px 12px', background: '#fff', color: '#4c1d95', borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
            Start Patrol \u2014 $4.99/mo
          </a>
        </div>
      )}
    </div>
  );
}
