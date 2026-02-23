#!/usr/bin/env python3
"""
Auto-RSVP local integration test script.

Tests the full backend pipeline end-to-end against a locally running server:
  1. Health check
  2. Scrape events from rsvpatx.com
  3. Create a test user with interests
  4. Trigger AI matching for the test user
  5. Trigger the full job runner pipeline
  6. Report results

Usage:
  # Start the server first (in another terminal):
  #   cd auto-rsvp/backend && uvicorn app.main:app --reload --port 8000
  #
  # Then run this script:
  python scripts/test_pipeline.py
  python scripts/test_pipeline.py --base-url http://localhost:8000
  python scripts/test_pipeline.py --email test@example.com --interests "Tech startup networking and AI panels"

Requires: httpx (already in requirements.txt)
"""

import argparse
import json
import sys
import time

import httpx

# ── ANSI colors ───────────────────────────────────────────────────────────────

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def ok(msg: str) -> str:
    return f"{GREEN}✓{RESET} {msg}"


def fail(msg: str) -> str:
    return f"{RED}✗{RESET} {msg}"


def info(msg: str) -> str:
    return f"{CYAN}→{RESET} {msg}"


def header(msg: str) -> str:
    return f"\n{BOLD}{msg}{RESET}"


# ── Test steps ────────────────────────────────────────────────────────────────

def step_health(client: httpx.Client) -> bool:
    print(header("Step 1 — Health check"))
    try:
        r = client.get("/health")
        r.raise_for_status()
        data = r.json()
        if data.get("status") == "ok":
            print(ok(f"Server is healthy: {data}"))
            return True
        print(fail(f"Unexpected health response: {data}"))
        return False
    except httpx.ConnectError:
        print(fail("Could not connect to server. Is it running?"))
        print("  Start it with: uvicorn app.main:app --reload --port 8000")
        return False
    except Exception as e:
        print(fail(f"Health check failed: {e}"))
        return False


def step_scrape(client: httpx.Client) -> int:
    print(header("Step 2 — Scrape events from rsvpatx.com"))
    print(info("Calling POST /api/v1/events/scrape (this may take 10-20s)..."))
    try:
        r = client.post("/api/v1/events/scrape", timeout=60)
        r.raise_for_status()
        data = r.json()
        found = data.get("found", 0)
        new = data.get("new", 0)
        updated = data.get("updated", 0)
        errors = data.get("errors", 0)
        print(ok(f"Scrape complete: {found} found, {new} new, {updated} updated, {errors} errors"))
        if errors > 0:
            print(f"  {YELLOW}⚠ {errors} scrape error(s) — check server logs{RESET}")
        if found == 0:
            print(fail("No events scraped — parser may need updating"))
            return 0
        # Verify events are in the DB
        r2 = client.get("/api/v1/events?limit=5")
        r2.raise_for_status()
        events = r2.json()
        print(ok(f"Events accessible via GET /api/v1/events — sample:"))
        for ev in events[:3]:
            print(f"    • [{ev['platform']}] {ev['title'][:70]} ({ev['date']})")
        return found
    except Exception as e:
        print(fail(f"Scrape failed: {e}"))
        return 0


def step_create_user(client: httpx.Client, email: str, interests: str) -> dict | None:
    print(header("Step 3 — Create test user"))
    payload = {
        "email": email,
        "first_name": "Test",
        "last_name": "User",
        "interests_description": interests,
    }
    print(info(f"Creating user: {email}"))
    print(info(f"Interests: {interests}"))
    try:
        r = client.post("/api/v1/users", json=payload)
        if r.status_code == 409:
            print(f"  {YELLOW}User already exists — fetching existing user{RESET}")
            # Find user by listing (no search endpoint, so we check via a known approach)
            print(ok("Proceeding — user already exists in DB"))
            # We need the user ID — re-create won't work. Extract from 409 body if possible.
            # Fall back: try to find via list
            r2 = client.get("/api/v1/users?limit=100")
            if r2.status_code == 200:
                data = r2.json()
                items = data.get("items", [])
                for u in items:
                    if u["email"] == email:
                        print(ok(f"Found existing user ID: {u['id']}"))
                        return u
            print(fail("Could not retrieve existing user — delete it and re-run"))
            return None
        r.raise_for_status()
        user = r.json()
        print(ok(f"User created: ID={user['id']}"))
        return user
    except Exception as e:
        print(fail(f"User creation failed: {e}"))
        return None


def step_match(client: httpx.Client, user_id: str) -> dict | None:
    print(header("Step 4 — AI event matching"))
    print(info(f"Calling POST /api/v1/match/{user_id} (Claude API — may take 30-60s for large event lists)..."))
    try:
        r = client.post(f"/api/v1/match/{user_id}", timeout=120)
        r.raise_for_status()
        data = r.json()
        total = data.get("total_events", 0)
        auto = data.get("auto_rsvp_count", 0)
        rec = data.get("recommended_count", 0)
        skipped = data.get("skipped_count", 0)
        print(ok(f"Matching complete: {total} events scored"))
        print(f"    Auto-RSVP (≥0.7):    {auto}")
        print(f"    Recommended (0.4-0.7): {rec}")
        print(f"    Skipped (<0.4):        {skipped}")
        # Show top 5 matches
        results = sorted(data.get("results", []), key=lambda x: x["score"], reverse=True)
        if results:
            print(info("Top matches:"))
            for r_ in results[:5]:
                bar = "█" * int(r_["score"] * 10) + "░" * (10 - int(r_["score"] * 10))
                print(f"    [{bar}] {r_['score']:.2f}  {r_['title'][:60]}")
        return data
    except Exception as e:
        print(fail(f"Matching failed: {e}"))
        return None


def step_run_pipeline(client: httpx.Client) -> bool:
    print(header("Step 5 — Full job runner pipeline"))
    print(info("Calling POST /api/v1/jobs/run (background task — polling for completion)..."))
    try:
        r = client.post("/api/v1/jobs/run")
        r.raise_for_status()
        data = r.json()
        if "already running" in data.get("message", "").lower():
            print(f"  {YELLOW}⚠ Pipeline already running — waiting...{RESET}")

        # Poll /api/v1/jobs/status until not running (max 3 minutes)
        max_wait = 180
        poll_interval = 5
        elapsed = 0
        while elapsed < max_wait:
            time.sleep(poll_interval)
            elapsed += poll_interval
            sr = client.get("/api/v1/jobs/status")
            sr.raise_for_status()
            status = sr.json()
            if not status.get("running"):
                last = status.get("last_run", {})
                success = last.get("success", False)
                if success:
                    print(ok("Pipeline completed successfully!"))
                else:
                    print(fail(f"Pipeline reported failure: {last.get('error', 'unknown')}"))

                # Print summary
                print(info("Pipeline summary:"))
                scrape = last.get("scrape", {})
                match_ = last.get("match", {})
                rsvp = last.get("rsvp", {})
                print(f"    Scrape:  {scrape}")
                print(f"    Match:   {match_}")
                print(f"    RSVP:    {rsvp}")
                return success
            print(f"  {CYAN}... still running ({elapsed}s elapsed){RESET}")

        print(fail(f"Pipeline did not complete within {max_wait}s"))
        return False
    except Exception as e:
        print(fail(f"Job runner failed: {e}"))
        return False


def step_check_rsvps(client: httpx.Client, user_id: str) -> None:
    print(header("Step 6 — Check RSVP results"))
    try:
        r = client.get(f"/api/v1/rsvps?user_id={user_id}&limit=100")
        r.raise_for_status()
        rsvps = r.json()
        if not rsvps:
            print(info("No RSVPs recorded yet"))
            return

        # Tally by status
        tally: dict[str, int] = {}
        for rsvp in rsvps:
            s = rsvp.get("status", "unknown")
            tally[s] = tally.get(s, 0) + 1

        print(ok(f"RSVP results for user ({len(rsvps)} total):"))
        for status, count in sorted(tally.items()):
            color = GREEN if status == "success" else (YELLOW if status in ("manual_required", "skipped") else RED)
            print(f"    {color}{status}{RESET}: {count}")
    except Exception as e:
        print(fail(f"RSVP check failed: {e}"))


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="Auto-RSVP local integration test")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Backend base URL")
    parser.add_argument("--email", default="test@autorsvp.dev", help="Test user email")
    parser.add_argument(
        "--interests",
        default=(
            "Tech startup networking events, AI and machine learning panels, "
            "entrepreneurship and founder meetups, happy hours in Austin"
        ),
        help="Test user interests description",
    )
    parser.add_argument("--skip-pipeline", action="store_true", help="Skip the job runner step (just scrape + match)")
    args = parser.parse_args()

    print(f"{BOLD}{'='*60}")
    print("  Auto-RSVP Integration Test")
    print(f"  Backend: {args.base_url}")
    print(f"{'='*60}{RESET}")

    passed = 0
    total = 0

    with httpx.Client(base_url=args.base_url, timeout=30) as client:
        # Step 1: Health
        total += 1
        if not step_health(client):
            print(f"\n{RED}Aborting — server not reachable.{RESET}")
            return 1
        passed += 1

        # Step 2: Scrape
        total += 1
        event_count = step_scrape(client)
        if event_count > 0:
            passed += 1

        # Step 3: Create user
        total += 1
        user = step_create_user(client, args.email, args.interests)
        if user:
            passed += 1

        if user and event_count > 0:
            # Step 4: Match
            total += 1
            match_result = step_match(client, user["id"])
            if match_result:
                passed += 1

            # Step 5: Job runner (optional)
            if not args.skip_pipeline:
                total += 1
                if step_run_pipeline(client):
                    passed += 1

            # Step 6: Check RSVPs
            step_check_rsvps(client, user["id"])

    # Final report
    print(f"\n{BOLD}{'='*60}")
    color = GREEN if passed == total else (YELLOW if passed > total // 2 else RED)
    print(f"  {color}Result: {passed}/{total} steps passed{RESET}")
    print(f"{'='*60}{RESET}\n")

    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())