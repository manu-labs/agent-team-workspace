import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <Navbar />
      {/*
        key={pathname} remounts <main> on route change, triggering the
        animate-fade-in CSS animation for a smooth page transition.
      */}
      <main
        key={pathname}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 animate-fade-in"
      >
        <Outlet />
      </main>
    </div>
  );
}