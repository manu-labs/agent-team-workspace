#!/usr/bin/env python3
"""End-to-end integration test for the Auto-RSVP pipeline.

Usage:
    python tests/e2e_test.py                          # defaults to http://localhost:8000
    python tests/e2e_test.py https://backend.railway.app
    BASE_URL=https://backend.railway.app python tests/e2e_test.py

Tests the full pipeline with multiple user interest profiles:
    1. Health check
    2. Scrape events from rsvpatx.com
    3. For each test profile:
       a. Create test user (or reuse existing)
       b. Trigger AI matching
       c. Trigger RSVP pipeline
       d. Poll for completion
       e. Report per-platform results
"""

import json
import os
import sys
import time
from collections import defaultdict
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

BASE_URL = (
    sys.argv[1]
    if len(sys.argv) > 1
    else os.getenv("BASE_URL", "http://localhost:8000")
).rstrip("/")
API = f"{BASE_URL}/api/v1"

# Test profiles — each validates a different AI matching capability
TEST_PROFILES = [
    {
        "email": "autorsvp.broad@gmail.com",
        "first_name": "Alex",
        "last_name": "Thompson",
        "phone": "512-555-0101",
        "interests_description": "I want all Austin events",
        "_label": "BROAD (all events)",
    },
    {
        "email": "autorsvp.exclusion@gmail.com",
        "first_name": "Jordan",
        "last_name": "Rivera",
        "phone": "512-555-0102",
        "interests_description": "I want all Austin events except country music ones",
        "_label": "EXCLUSION (no country music)",
    },
]

POLL_INTERVAL = 5
POLL_TIMEOUT = 600  # 10 minutes max


def api(method: str, path: str, body: dict | None = None) -> dict:
    """Make an API call and return parsed JSON."""
    url = f"{API}/{path.lstrip('/')}"
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"} if data else {}
    req = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except HTTPError as e:
        body_text = e.read().decode() if e.fp else ""
        return {"_error": True, "_status": e.code, "_detail": body_text}
    except URLError as e:
        return {"_error": True, "_status": 0, "_detail": str(e)}


def health_get(path: str) -> dict:
    """GET against base URL (not /api/v1)."""
    url = f"{BASE_URL}/{path.lstrip('/')}"
    req = Request(url, method="GET")
    try:
        with urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except (HTTPError, URLError) as e:
        return {"_error": True, "_detail": str(e)}


def step(name: str):
    print(f"\n{'=' * 60}")
    print(f"  STEP: {name}")
    print(f"{'=' * 60}")


def report_results(label: str, rsvps: list[dict], events_by_id: dict):
    """Print per-platform results table for a user profile."""
    print(f"\n{'=' * 60}")
    print(f"  E2E TEST RESULTS — {label}")
    print(f"{'=' * 60}\n")

    by_platform = defaultdict(list)
    for r in rsvps:
        event = events_by_id.get(r.get("event_id", ""), {})
        platform = event.get("platform", "unknown")
        by_platform[platform].append(
            {
                "title": event.get("title", "Unknown"),
                "status": r.get("status", "unknown"),
                "url": event.get("rsvp_url", ""),
                "score": r.get("match_score"),
            }
        )

    all_platforms = [
        "eventbrite",
        "luma",
        "splashthat",
        "partiful",
        "posh",
        "universe",
        "dice",
        "other",
    ]
    tested = set()

    header = f"{'Platform':<15} {'Status':<20} {'Score':>6}  Event Title"
    print(header)
    print(f"{'-' * 15} {'-' * 20} {'-' * 6}  {'-' * 40}")

    for platform in all_platforms:
        entries = by_platform.get(platform, [])
        if not entries:
            print(f"{platform:<15} {'NO EVENTS FOUND':<20} {'--':>6}  --")
            continue
        tested.add(platform)
        e = entries[0]  # show first event per platform
        status = e["status"]
        score = f"{e['score']:.2f}" if e["score"] is not None else "--"
        if status == "success":
            icon = "[OK]"
        elif status == "manual_required":
            icon = "[MANUAL]"
        elif status == "skipped":
            icon = "[SKIP]"
        else:
            icon = "[FAIL]"
        title = e["title"][:50]
        print(f"{platform:<15} {icon} {status:<13} {score:>6}  {title}")

    # Also show any platforms not in the standard list
    for platform in sorted(by_platform.keys()):
        if platform not in all_platforms:
            entries = by_platform[platform]
            tested.add(platform)
            e = entries[0]
            status = e["status"]
            score = f"{e['score']:.2f}" if e["score"] is not None else "--"
            title = e["title"][:50]
            print(f"{platform:<15} {status:<20} {score:>6}  {title}")

    # Summary
    total = len(rsvps)
    success = sum(1 for r in rsvps if r.get("status") == "success")
    manual = sum(1 for r in rsvps if r.get("status") == "manual_required")
    failed = sum(1 for r in rsvps if r.get("status") == "failed")
    skipped = sum(1 for r in rsvps if r.get("status") == "skipped")
    pending = sum(
        1 for r in rsvps if r.get("status") in ("pending", "in_progress")
    )

    print(f"\n--- Summary ({label}) ---")
    print(f"Platforms tested:  {len(tested)}/{len(all_platforms)}")
    print(f"Total RSVPs:       {total}")
    print(f"  Success:         {success}")
    print(f"  Manual required: {manual}")
    print(f"  Failed:          {failed}")
    print(f"  Skipped:         {skipped}")
    print(f"  Pending:         {pending}")

    passing = success + manual
    print(f"\nVERDICT: {passing}/{total} RSVPs passed (success or manual_required)")
    return {"label": label, "total": total, "success": success, "manual": manual,
            "failed": failed, "skipped": skipped, "pending": pending, "tested_platforms": len(tested)}


def run_profile(profile: dict, events_by_id: dict) -> dict:
    """Run the full pipeline for a single test profile."""
    label = profile["_label"]
    user_data = {k: v for k, v in profile.items() if not k.startswith("_")}

    step(f"Create/Find User — {label}")
    resp = api("POST", "/users", user_data)
    if resp.get("_error") and resp.get("_status") == 409:
        print("User already exists — searching...")
        users_resp = api("GET", "/users?limit=100")
        if isinstance(users_resp, dict) and not users_resp.get("_error"):
            items = users_resp.get("items", [])
        else:
            items = users_resp if isinstance(users_resp, list) else []
        user = next(
            (u for u in items if u.get("email") == user_data["email"]), None
        )
        if not user:
            print(f"ERROR: Could not find existing user {user_data['email']}")
            return {}
        print(f"Found existing user: {user['id']}")
    elif resp.get("_error"):
        print(f"ERROR: Could not create user — {resp}")
        return {}
    else:
        user = resp
        print(f"Created user: {user['id']}")

    user_id = user["id"]

    step(f"AI Matching — {label}")
    resp = api("POST", f"/match/{user_id}")
    if resp.get("_error"):
        print(f"ERROR: Matching failed — {resp}")
        print("Continuing anyway...")
    else:
        print(f"  Interests: \"{user_data['interests_description']}\"")
        print(f"  Total events:      {resp.get('total_events', 0)}")
        print(f"  Auto-RSVP (>=0.7): {resp.get('auto_rsvp_count', 0)}")
        print(f"  Recommended:       {resp.get('recommended_count', 0)}")
        print(f"  Skipped (<0.4):    {resp.get('skipped_count', 0)}")

    step(f"Run RSVP Pipeline — {label}")
    resp = api("POST", "/jobs/run")
    if resp.get("_error"):
        print(f"ERROR: Pipeline trigger failed — {resp}")
        return {"user_id": user_id}
    print(f"Pipeline: {resp.get('message', 'started')}")

    step(f"Waiting for Pipeline Completion — {label}")
    start = time.time()
    while time.time() - start < POLL_TIMEOUT:
        status = api("GET", "/jobs/status")
        if status.get("_error"):
            print(f"  Poll error: {status}")
            time.sleep(POLL_INTERVAL)
            continue

        running = status.get("running", False)
        last_run = status.get("last_run")
        elapsed = int(time.time() - start)

        if not running and last_run:
            print(f"  Pipeline finished after ~{elapsed}s")
            print(f"  Last run: {json.dumps(last_run, indent=2)}")
            break

        print(f"  [{elapsed}s] Still running...")
        time.sleep(POLL_INTERVAL)
    else:
        print(f"  TIMEOUT: Pipeline did not finish within {POLL_TIMEOUT}s")

    step(f"Fetch RSVP Results — {label}")
    rsvps = []
    offset = 0
    while True:
        page = api("GET", f"/rsvps?user_id={user_id}&limit=100&offset={offset}")
        if isinstance(page, dict) and page.get("_error"):
            print(f"ERROR: Could not fetch RSVPs — {page}")
            return {"user_id": user_id}
        page_list = page if isinstance(page, list) else []
        rsvps.extend(page_list)
        if len(page_list) < 100:
            break
        offset += 100
    print(f"Total RSVPs for user: {len(rsvps)}")

    rsvp_list = [
        {
            "event_id": str(r.get("event_id", "")),
            "status": r.get("status", "unknown"),
            "match_score": r.get("match_score"),
        }
        for r in rsvps
    ]

    return report_results(label, rsvp_list, events_by_id)


def main():
    print("Auto-RSVP E2E Test")
    print(f"Target: {BASE_URL}")

    # Step 1: Health check
    step("Health Check")
    resp = health_get("/health")
    if resp.get("_error"):
        print(f"FATAL: Backend not reachable at {BASE_URL}")
        print(f"  Detail: {resp.get('_detail')}")
        sys.exit(1)
    print(f"Health: {resp}")

    # Step 2: Scrape events
    step("Scrape Events")
    resp = api("POST", "/events/scrape")
    if resp.get("_error"):
        print(f"ERROR: Scrape failed — {resp}")
        sys.exit(1)
    print(f"Scrape results: {json.dumps(resp, indent=2)}")

    # Step 3: Fetch all events for lookup (paginate through all pages)
    step("List Events by Platform")
    events = []
    offset = 0
    while True:
        page = api("GET", f"/events?limit=100&offset={offset}")
        if isinstance(page, dict) and page.get("_error"):
            print(f"ERROR: Could not list events — {page}")
            sys.exit(1)
        page_list = page if isinstance(page, list) else []
        events.extend(page_list)
        if len(page_list) < 100:
            break
        offset += 100

    events_by_id = {str(e["id"]): e for e in events}
    by_platform = defaultdict(list)
    for e in events:
        by_platform[e["platform"]].append(e)

    print(f"Total events: {len(events)}")
    for plat, evts in sorted(by_platform.items()):
        print(f"  {plat}: {len(evts)} events")

    # Step 4: Run each test profile
    all_results = []
    for profile in TEST_PROFILES:
        result = run_profile(profile, events_by_id)
        if result:
            all_results.append(result)

    # Final summary across all profiles
    print(f"\n{'=' * 60}")
    print("  FINAL SUMMARY — All Profiles")
    print(f"{'=' * 60}")
    for r in all_results:
        label = r.get("label", "?")
        passing = r.get("success", 0) + r.get("manual", 0)
        total = r.get("total", 0)
        skipped = r.get("skipped", 0)
        print(f"\n  {label}")
        print(f"    RSVP attempted: {total - skipped} | passed: {passing} | skipped: {skipped}")
        print(f"    Platforms covered: {r.get('tested_platforms', 0)}/8")


if __name__ == "__main__":
    main()