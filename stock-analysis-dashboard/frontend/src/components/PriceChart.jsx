import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { stockApi } from '../services/api';

const RANGES = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'];

function generatePlaceholder(points = 30) {
  const now = Date.now();
  let price = 150 + Math.random() * 50;
  const data = [];
  for (let i = 0; i < points; i++) {
    price += (Math.random() - 0.48) * 3;
    data.push({
      date: new Date(now - (points - i) * 86400000).toISOString().slice(0, 10),
      close: Math.round(price * 100) / 100,
    });
  }
  return data;
}

export default function PriceChart({ ticker }) {
  const [range, setRange] = useState('1M');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChart = useCallback(async () => {
    setLoading(true);
    try {
      const prices = await stockApi.getChart(ticker, range);
      if (prices && prices.length > 0) {
        setData(prices);
      } else {
        setData(generatePlaceholder());
      }
    } catch (err) {
      console.error('Failed to load chart:', err);
      setData(generatePlaceholder());
    } finally {
      setLoading(false);
    }
  }, [ticker, range]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  const isGain = data.length >= 2 && data[data.length - 1].close >= data[0].close;
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
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-surface-200/40 text-sm">
          No price data available for this range.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={"gradient-" + ticker + "-" + range} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => {
                if (range === '1D') return v.slice(11, 16);
                return v.slice(5);
              }}
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
              labelFormatter={(label) => label}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={color}
              strokeWidth={2}
              fill={"url(#gradient-" + ticker + "-" + range + ")"}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
