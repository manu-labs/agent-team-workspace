import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { earningsApi } from '../services/api';

export default function EarningsCalendar() {
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    earningsApi.getUpcoming()
      .then(setEarnings)
      .catch((err) => {
        console.error('Failed to load upcoming earnings:', err);
        // Placeholder data
        setEarnings([
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
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="card animate-pulse h-48" />;
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-white text-sm mb-3">Upcoming Earnings</h3>
      <div className="space-y-4">
        {earnings.map((day) => (
          <div key={day.date}>
            <p className="text-xs font-medium text-surface-200/50 mb-1.5">{day.date}</p>
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
                    Est: ${e.epsEstimate?.toFixed(2)}
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
