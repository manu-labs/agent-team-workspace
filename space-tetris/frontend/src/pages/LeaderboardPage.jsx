import { useState, useEffect, useRef } from 'react';
import { leaderboardApi, scoresApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const PERIODS = [
  { key: 'alltime', label: 'All Time' },
  { key: 'weekly', label: 'This Week' },
  { key: 'daily', label: 'Today' },
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState('alltime');
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [personalBest, setPersonalBest] = useState(null);
  const { user, isAuthenticated, token } = useAuthStore();

  // Fetch leaderboard + set up 30-second auto-refresh
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (cancelled) return;
      setLoading(true);
      try {
        const data = await leaderboardApi.get(period);
        if (!cancelled) setScores(data.scores || data || []);
      } catch {
        if (!cancelled) setScores([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [period]);

  // Fetch user's personal best when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setPersonalBest(null);
      return;
    }
    scoresApi.myScores(token)
      .then((data) => {
        const list = data.scores || data || [];
        if (list.length > 0) {
          const best = list.reduce((a, b) => (b.score > a.score ? b : a), list[0]);
          setPersonalBest(best);
        } else {
          setPersonalBest(null);
        }
      })
      .catch(() => setPersonalBest(null));
  }, [isAuthenticated, token]);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="font-display text-2xl font-bold tracking-wider text-neon-cyan neon-text">
        Leaderboard
      </h1>

      {/* Personal best — shown when logged in */}
      {isAuthenticated && personalBest && (
        <div className="glass-panel p-4 border border-neon-cyan/20">
          <p className="text-xs font-mono text-white/40 mb-2 tracking-widest">YOUR PERSONAL BEST</p>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="font-mono text-neon-green text-sm font-bold">{user?.username}</span>
            <div className="flex items-center gap-6 font-mono text-sm">
              <span className="text-neon-yellow font-bold text-xl">
                {personalBest.score?.toLocaleString()}
              </span>
              <span className="text-white/50">Lv {personalBest.level}</span>
              <span className="text-white/50">{personalBest.lines_cleared} lines</span>
              <span className="text-white/30 text-xs">{formatDate(personalBest.created_at)}</span>
            </div>
          </div>
        </div>
      )}

      {isAuthenticated && !personalBest && (
        <div className="glass-panel p-4 border border-white/5">
          <p className="text-xs font-mono text-white/30 text-center">
            No scores yet — play a game to get on the board!
          </p>
        </div>
      )}

      {/* Period tabs */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${
              period === p.key
                ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40'
                : 'bg-space-700/40 text-white/50 border border-white/5 hover:text-white/80'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Scores table */}
      <div className="glass-panel overflow-hidden">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-white/40 text-xs uppercase border-b border-white/10">
              <th className="px-4 py-3 text-left w-12">Rank</th>
              <th className="px-4 py-3 text-left">Player</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3 text-right">Level</th>
              <th className="px-4 py-3 text-right">Lines</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-white/30">
                  Loading...
                </td>
              </tr>
            ) : scores.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-white/30">
                  No scores yet. Be the first!
                </td>
              </tr>
            ) : (
              scores.map((s, i) => {
                const isMe = user && s.username === user.username;
                return (
                  <tr
                    key={s.id || i}
                    className={`border-b border-white/5 transition-colors ${
                      isMe ? 'bg-neon-cyan/10' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="px-4 py-3 text-white/40">{i + 1}</td>
                    <td className={`px-4 py-3 ${isMe ? 'text-neon-cyan font-bold' : 'text-white'}`}>
                      {s.username}
                      {isMe && (
                        <span className="ml-2 text-xs text-neon-cyan/50 font-normal">YOU</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-neon-yellow font-bold">
                      {s.score?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-white/60">{s.level}</td>
                    <td className="px-4 py-3 text-right text-white/60">{s.lines_cleared}</td>
                    <td className="px-4 py-3 text-right text-white/30 text-xs hidden sm:table-cell">
                      {formatDate(s.created_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

