export default function KeyStats({ quote }) {
  if (!quote) return null;

  const stats = [
    { label: 'Market Cap', value: quote.marketCap || '--' },
    { label: 'P/E Ratio', value: quote.pe?.toFixed(1) || '--' },
    { label: '52W High', value: quote.high52w ? '$' + quote.high52w.toFixed(2) : '--' },
    { label: '52W Low', value: quote.low52w ? '$' + quote.low52w.toFixed(2) : '--' },
    { label: 'Volume', value: quote.volume ? (quote.volume / 1e6).toFixed(1) + 'M' : '--' },
    { label: 'Avg Volume', value: quote.avgVolume ? (quote.avgVolume / 1e6).toFixed(1) + 'M' : '--' },
    { label: 'Dividend', value: quote.dividendYield ? quote.dividendYield.toFixed(2) + '%' : '--' },
    { label: 'Beta', value: quote.beta?.toFixed(2) || '--' },
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
