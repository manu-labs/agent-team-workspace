import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { stockApi } from '../services/api';

const RANGES = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'];

export default function PriceChart({ ticker }) {
  const [range, setRange] = useState('1M');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    stockApi.getChart(ticker, range)
      .then(setData)
      .catch((err) => {
        console.error('Failed to load chart:', err);
        // Generate placeholder data
        const now = Date.now();
        const points = 30;
        let price = 150 + Math.random() * 50;
        const placeholder = [];
        for (let i = 0; i < points; i++) {
          price += (Math.random() - 0.48) * 3;
          placeholder.push({
            date: new Date(now - (points - i) * 86400000).toISOString().slice(0, 10),
            price: Math.round(price * 100) / 100,
          });
        }
        setData(placeholder);
      })
      .finally(() => setLoading(false));
  }, [ticker, range]);

  const isGain = data.length >= 2 && data[data.length - 1].price >= data[0].price;
  const color = isGain ? '#22c55e' : '#ef4444';

  return (
    <div className="card">
      {/* Range selector */}
      <div className="flex gap-1 mb-4">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={"px-3 py-1 text-xs font-medium rounded-md transition-colors " +
              (range === r
                ? "bg-brand-600 text-white"
                : "text-surface-200/50 hover:text-white hover:bg-surface-700")}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-64 animate-pulse bg-surface-700/30 rounded-lg" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={"gradient-" + ticker} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              domain={['auto', 'auto']}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              width={60}
              tickFormatter={(v) => '$' + v.toFixed(0)}
            />
            <Tooltip
              contentStyle={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
              }}
              formatter={(value) => ['$' + value.toFixed(2), 'Price']}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              fill={"url(#gradient-" + ticker + ")"}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
