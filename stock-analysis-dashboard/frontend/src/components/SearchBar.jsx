import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockApi } from '../services/api';
import useDebounce from '../hooks/useDebounce';

/**
 * SearchBar — global stock search with debounced autocomplete.
 *
 * Props:
 *   isMobile  {boolean}  — when true: larger hit targets, clear button, auto-focus
 *   onClose   {Function} — called after a result is selected or Esc pressed
 *                          (used by the mobile overlay to close itself)
 */
export default function SearchBar({ isMobile = false, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // ── Fetch autocomplete results when debounced query changes ────────────────
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    stockApi
      .search(trimmed)
      .then((data) => {
        if (cancelled) return;
        setResults((data || []).slice(0, 8));
        setIsOpen(true);
        setActiveIndex(-1);
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setIsOpen(false);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // ── Close dropdown when clicking outside the component ────────────────────
  useEffect(() => {
    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // ── Auto-focus input when rendered in mobile overlay ──────────────────────
  useEffect(() => {
    if (isMobile) inputRef.current?.focus();
  }, [isMobile]);

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const selectResult = (result) => {
    navigate('/stock/' + result.ticker);
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
    onClose?.();
  };

  const submitQuery = () => {
    if (activeIndex >= 0 && results[activeIndex]) {
      selectResult(results[activeIndex]);
    } else {
      const ticker = query.trim().toUpperCase();
      if (ticker) {
        navigate('/stock/' + ticker);
        setQuery('');
        setIsOpen(false);
        onClose?.();
      }
    }
  };

  // ── Event handlers ─────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    submitQuery();
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) {
      setIsOpen(false);
      setResults([]);
    }
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen && results.length > 0) setIsOpen(true);
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case 'Enter':
        // form onSubmit handles this; prevent duplicate navigation
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        onClose?.();
        break;
      default:
        break;
    }
  };

  const formatPrice = (price) => {
    if (price == null) return null;
    return '$' + Number(price).toFixed(2);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} role="search" aria-label="Search stocks">
        <div className="relative">
          {/* Search / spinner icon */}
          {isLoading ? (
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-400 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-200/50"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          )}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Search stocks by ticker or name..."
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls="search-listbox"
            aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
            className={[
              'w-full rounded-lg bg-surface-800 border border-surface-700',
              'text-white placeholder-surface-200/50',
              'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
              'transition-colors',
              isMobile ? 'py-3 pl-10 pr-10 text-base' : 'py-2 pl-10 pr-4 text-sm',
            ].join(' ')}
          />

          {/* Clear button — mobile only */}
          {isMobile && query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIsOpen(false);
                setResults([]);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-200/50 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Autocomplete dropdown */}
      {isOpen && (
        <ul
          id="search-listbox"
          role="listbox"
          aria-label="Stock search results"
          className="absolute top-full left-0 right-0 mt-1.5 bg-surface-800 border border-surface-700 rounded-lg shadow-2xl overflow-hidden z-50 divide-y divide-surface-700/40"
        >
          {results.length === 0 ? (
            <li className="px-4 py-4 text-sm text-surface-200/50 text-center" role="status">
              No results found for &ldquo;{query}&rdquo;
            </li>
          ) : (
            results.map((result, index) => (
              <li
                key={result.ticker}
                id={`search-result-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  // Prevent blur-before-click so the item registers
                  e.preventDefault();
                  selectResult(result);
                }}
                className={[
                  'flex items-center justify-between px-4 py-3 cursor-pointer transition-colors',
                  index === activeIndex
                    ? 'bg-brand-600/20'
                    : 'hover:bg-surface-700',
                ].join(' ')}
              >
                {/* Ticker + name + sector */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-bold text-white text-sm font-mono w-14 shrink-0 truncate">
                    {result.ticker}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-white/90 truncate leading-tight">{result.name}</p>
                    {result.sector && (
                      <p className="text-xs text-surface-200/50 truncate leading-tight mt-0.5">
                        {result.sector}
                      </p>
                    )}
                  </div>
                </div>

                {/* Price */}
                {result.price != null && (
                  <span className="text-sm font-mono text-brand-400 shrink-0 ml-3">
                    {formatPrice(result.price)}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}