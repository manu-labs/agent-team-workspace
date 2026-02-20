import { Link } from 'react-router-dom';

export default function StockCard({ ticker, name, price, change, changePercent, compact = false }) {
  const isGain = change >= 0;

  if (compact) {
    return (
      <Link
        to={'/stock/' + ticker}
        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-700/50 transition-colors group"
      >
        <div>
          <span className="font-semibold text-white text-sm group-hover:text-brand-400 transition-colors">
            {ticker}
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-white">${price?.toFixed(2)}</div>
          <div className={'text-xs font-mono ' + (isGain ? 'text-gain' : 'text-loss')}>
            {isGain ? '+' : ''}{changePercent?.toFixed(2)}%
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={'/stock/' + ticker} className="card-hover min-w-[160px] shrink-0 block">
      <div className="flex items-start justify-between mb-2">
        <span className="font-bold text-white">{ticker}</span>
        <span className={isGain ? 'badge-gain' : 'badge-loss'}>
          {isGain ? '+' : ''}{changePercent?.toFixed(2)}%
        </span>
      </div>
      {name && <p className="text-xs text-surface-200/50 mb-2 truncate">{name}</p>}
      <p className="text-lg font-mono font-semibold text-white">${price?.toFixed(2)}</p>
    </Link>
  );
}
