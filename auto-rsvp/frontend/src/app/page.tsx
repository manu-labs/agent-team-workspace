import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
        Auto-RSVP
      </h1>
      <p className="mt-4 max-w-lg text-lg text-zinc-400">
        Tell us what you&apos;re into. We&apos;ll find the best SXSW 2026
        events and automatically sign you up &mdash; across Eventbrite, Lu.ma,
        Splashthat, and more.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/signup"
          className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
        >
          Get Started
        </Link>
        <Link
          href="/events"
          className="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
        >
          Browse Events
        </Link>
      </div>
      <div className="mt-16 grid max-w-3xl gap-8 sm:grid-cols-3">
        <div className="text-left">
          <h3 className="font-semibold text-white">1. Describe your vibe</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Tell us what events you want &mdash; tech panels, music showcases,
            happy hours, whatever.
          </p>
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-white">2. We match &amp; RSVP</h3>
          <p className="mt-1 text-sm text-zinc-500">
            AI matches your interests to 500+ events and auto-RSVPs you on each
            platform.
          </p>
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-white">3. Just show up</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Check your dashboard, see what you&apos;re signed up for, and enjoy
            SXSW.
          </p>
        </div>
      </div>
    </div>
  );
}
