import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Dashboard" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="scanline-overlay border-b border-terminal-border bg-terminal-surface">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5">
            {/* Pulse indicator */}
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-slow rounded-full bg-profit opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-profit" />
            </span>
            <span className="font-mono text-sm font-bold uppercase tracking-widest text-zinc-100">
              Arb Scanner
            </span>
            <span className="hidden sm:inline-flex rounded border border-terminal-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              Poly &times; Kalshi
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`
                    px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors
                    ${isActive
                      ? "bg-terminal-muted text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                    }
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-terminal-border py-4">
        <div className="mx-auto max-w-7xl px-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            Real-time arbitrage scanner &middot; Polymarket vs Kalshi &middot; Not financial advice
          </p>
        </div>
      </footer>
    </div>
  );
}