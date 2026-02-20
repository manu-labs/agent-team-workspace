import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import SearchBar from './SearchBar';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawers whenever the route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav className="sticky top-0 z-40 bg-surface-900/80 backdrop-blur-xl border-b border-surface-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <span className="text-2xl" aria-hidden="true">⚡</span>
              <span className="text-lg font-bold text-white hidden sm:block">StockPulse</span>
            </Link>

            {/* Desktop search bar */}
            <div className="hidden md:flex flex-1 max-w-xl">
              <SearchBar />
            </div>

            {/* Right-side actions */}
            <div className="flex items-center gap-1 shrink-0">

              {/* Mobile: search icon button */}
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                className="md:hidden p-2 rounded-lg text-surface-200/70 hover:text-white hover:bg-surface-700 transition-colors"
                aria-label="Search stocks"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </button>

              <ThemeToggle />

              {/* Mobile: hamburger / close toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="md:hidden p-2 rounded-lg text-surface-200/70 hover:text-white hover:bg-surface-700 transition-colors"
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav-menu"
              >
                {mobileMenuOpen ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile navigation menu (slide-in under navbar) */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav-menu"
            className="md:hidden border-t border-surface-700 bg-surface-900/97 backdrop-blur-xl"
          >
            <nav className="px-4 py-3 space-y-1" aria-label="Mobile navigation">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-600/20 text-brand-400'
                      : 'text-surface-200 hover:text-white hover:bg-surface-700',
                  ].join(' ')
                }
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </NavLink>
            </nav>
          </div>
        )}
      </nav>

      {/* Mobile full-screen search overlay */}
      {mobileSearchOpen && (
        <div
          className="fixed inset-0 z-50 bg-surface-900/97 backdrop-blur-xl md:hidden flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-700">
            <div className="flex-1">
              <SearchBar isMobile onClose={() => setMobileSearchOpen(false)} />
            </div>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="shrink-0 text-sm font-medium text-surface-200/70 hover:text-white transition-colors py-1 px-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}