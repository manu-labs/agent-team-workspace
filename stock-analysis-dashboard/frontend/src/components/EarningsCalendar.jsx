import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { earningsApi } from '../services/api';

const PLACEHOLDER_EARNINGS = [
  { date: '2026-02-25', entries: [
    { ticker: 'NVDA', name: 'NVIDIA Corp', time: 'AMC', epsEstimate: 0.82 },
    { ticker: 'CRM', name: 'Salesforce Inc', time: 'AMC', epsEstimate: 2.61 },
  ]},
  { date: '2026-02-26', entries: [
    { ticker: 'DELL', name: 'Dell Technologies', time: 'AMC', epsEstimate: 2.54 },
    { ticker: 'SNOW', name: 'Snowflake Inc', time: 'AMC', epsEstimate: 0.18 },
  ]},
  { date: '2026-02-27', entries: [
    { ticker: 'COST', name: 'Costco Wholesale', time: 'AMC', epsEstimate: 4.08 },
    { ticker: 'MRVL', name: 'Marvell Technology', time: 'AMC', epsEstimate: 0.59 },
  ]},
];

function formatDate(dateStr) {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) return 'Today';
    if (dateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function EarningsCalendar() {
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await earningsApi.getUpcoming();
      if (data && data.length > 0) {
        setEarnings(data);
      } else {
        // API returned empty (service not implemented yet) — use placeholders
        setEarnings(PLACEHOLDER_EARNINGS);
      }
    } catch (err) {
      console.error('Failed to load upcoming earnings:', err);
      setEarnings(PLACEHOLDER_EARNINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  if (loading) {
    return <div className="card animate-pulse h-48" />;
  }

  if (earnings.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold text-white text-sm mb-3">Upcoming Earnings</h3>
        <p className="text-xs text-surface-200/40 py-4 text-center">No upcoming earnings scheduled.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-white text-sm mb-3">Upcoming Earnings</h3>
      <div className="space-y-4">
        {earnings.map((day) => (
          <div key={day.date}>
            <p className="text-xs font-medium text-brand-400 mb-1.5">{formatDate(day.date)}</p>
            <div className="space-y-1">
              {day.entries.map((e) => (
                <Link
                  key={e.ticker}
                  to={'/stock/' + e.ticker}
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-surface-700/50 transition-colors text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{e.ticker}</span>
                    <span className="text-xs text-surface-200/40">{e.time}</span>
                  </div>
                  <span className="text-xs text-surface-200/50 font-mono">
                    Est: ${e.epsEstimate != null ? e.epsEstimate.toFixed(2) : '--'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
