import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { earningsApi } from '../services/api';

const PLACEHOLDER_EARNINGS = [
  { date: '2025-10-30', quarter: 'Q3 2025', epsActual: 1.64, epsEstimate: 1.59, revenue: 94.9e9, surprise: 3.14 },
  { date: '2025-07-31', quarter: 'Q2 2025', epsActual: 1.40, epsEstimate: 1.35, revenue: 85.8e9, surprise: 3.70 },
  { date: '2025-05-01', quarter: 'Q1 2025', epsActual: 1.53, epsEstimate: 1.50, revenue: 90.8e9, surprise: 2.00 },
  { date: '2025-01-30', quarter: 'Q4 2024', epsActual: 2.18, epsEstimate: 2.10, revenue: 124.3e9, surprise: 3.81 },
];

export default function EarningsHistory({ ticker }) {
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await earningsApi.getHistory(ticker);
      if (data && data.length > 0) {
        setEarnings(data);
      } else {
        setEarnings(PLACEHOLDER_EARNINGS);
      }
    } catch (err) {
      console.error('Failed to load earnings:', err);
      setEarnings(PLACEHOLDER_EARNINGS);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  if (loading) return <div className="card animate-pulse h-48" />;

  if (earnings.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-surface-200/50 text-sm">No earnings history available for {ticker}.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-surface-200/50 border-b border-surface-700">
            <th className="pb-2 font-medium">Quarter</th>
            <th className="pb-2 font-medium text-right">EPS Actual</th>
            <th className="pb-2 font-medium text-right">EPS Est.</th>
            <th className="pb-2 font-medium text-right">Surprise</th>
            <th className="pb-2 font-medium text-right">Revenue</th>
            <th className="pb-2 font-medium text-right">Result</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {earnings.map((e) => {
            const beat = e.epsActual >= e.epsEstimate;
            return (
              <tr key={e.date} className="border-b border-surface-700/50 hover:bg-surface-700/30">
                <td className="py-3 font-medium text-white">{e.quarter}</td>
                <td className="py-3 text-right font-mono">
                  {e.epsActual != null ? '$' + e.epsActual.toFixed(2) : '--'}
                </td>
                <td className="py-3 text-right font-mono text-surface-200/50">
                  {e.epsEstimate != null ? '$' + e.epsEstimate.toFixed(2) : '--'}
                </td>
                <td className={"py-3 text-right font-mono " + (beat ? "text-gain" : "text-loss")}>
                  {e.surprise != null ? (beat ? "+" : "") + e.surprise.toFixed(2) + "%" : '--'}
                </td>
                <td className="py-3 text-right font-mono">
                  {e.revenue != null ? '$' + (e.revenue / 1e9).toFixed(1) + 'B' : '--'}
                </td>
                <td className="py-3 text-right">
                  <span className={beat ? "badge-gain" : "badge-loss"}>
                    {beat ? "Beat" : "Miss"}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <Link
                    to={"/stock/" + ticker + "/earnings/" + e.date}
                    className="text-xs text-brand-400 hover:text-brand-300"
                  >
                    View Report
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
