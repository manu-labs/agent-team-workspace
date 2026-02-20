import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-6xl font-bold text-surface-200/20 mb-4">404</p>
      <h1 className="text-xl font-semibold text-white mb-2">Page not found</h1>
      <p className="text-surface-200/50 mb-8">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
