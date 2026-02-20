export default function KeyStats({ quote }) {
  if (!quote) return null;

  function formatLargeNumber(n) {
    if (n == null) return '--';
    if (typeof n === 'string') return n;
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    return '$' + n.toLocaleString();
  }

  function formatVolume(n) {
    if (n == null) return '--';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
    return n.toLocaleString();
  }

  const stats = [
    { label: 'Market Cap', value: formatLargeNumber(quote.marketCap) },
    { label: 'P/E Ratio', value: quote.pe != null ? quote.pe.toFixed(1) : '--' },
    { label: '52W High', value: quote.high52w != null ? '$' + quote.high52w.toFixed(2) : '--' },
    { label: '52W Low', value: quote.low52w != null ? '$' + quote.low52w.toFixed(2) : '--' },
    { label: 'Volume', value: formatVolume(quote.volume) },
    { label: 'Avg Volume', value: formatVolume(quote.avgVolume) },
    { label: 'Dividend', value: quote.dividendYield != null ? quote.dividendYield.toFixed(2) + '%' : '--' },
    { label: 'Beta', value: quote.beta != null ? quote.beta.toFixed(2) : '--' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="card text-center">
          <p className="text-xs text-surface-200/50 mb-1">{s.label}</p>
          <p className="text-sm font-semibold font-mono text-white">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
