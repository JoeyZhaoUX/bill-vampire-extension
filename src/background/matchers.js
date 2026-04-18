import matchers from './matchers.json' with { type: 'json' };

function fromMatches(fromHeader, entry) {
  return entry.from.some(f => fromHeader.includes(f));
}

export function matchMessage({ from, subject, body }) {
  for (const entry of matchers) {
    if (!fromMatches(from, entry)) continue;
    if (entry.subject_rx && !new RegExp(entry.subject_rx, 'i').test(subject)) continue;
    const priceRx = entry.price_rx ? new RegExp(entry.price_rx) : null;
    const priceMatch = priceRx ? (priceRx.exec(body) || priceRx.exec(subject)) : null;
    const amount = priceMatch ? parseFloat(priceMatch[1]) : null;
    return {
      name: entry.name,
      amountUsd: amount,
      cycle: entry.cycle || 'monthly',
      cancelUrl: entry.cancel_url || null,
    };
  }
  return null;
}

export function matcherCount() {
  return matchers.length;
}
