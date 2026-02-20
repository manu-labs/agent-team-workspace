import { useParams, Link } from 'react-router-dom';

export default function EarningsReport() {
  const { ticker, date } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={'/stock/' + ticker} className="text-surface-200/50 hover:text-white transition-colors">
          &larr; Back to {ticker}
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white">
        {ticker} Earnings Report — {date}
      </h1>
      <div className="card">
        <p className="text-surface-200/50">
          Full earnings report transcript and AI analysis will be displayed here.
        </p>
      </div>
    </div>
  );
}
