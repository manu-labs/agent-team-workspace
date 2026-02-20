import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const ticker = query.trim().toUpperCase();
    if (ticker) {
      navigate('/stock/' + ticker);
      setQuery('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-200/50"
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks by ticker or name..."
          className="w-full rounded-lg bg-surface-800 border border-surface-700 py-2 pl-10 pr-4 text-sm text-white placeholder-surface-200/50 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
        />
      </div>
    </form>
  );
}
