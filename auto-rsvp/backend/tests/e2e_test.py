#!/usr/bin/env python3
"""End-to-end integration test for the Auto-RSVP pipeline.

Usage:
    python tests/e2e_test.py                          # defaults to http://localhost:8000
    python tests/e2e_test.py https://backend.railway.app
    BASE_URL=https://backend.railway.app python tests/e2e_test.py

Tests the full pipeline:
    1. Health check
    2. Scrape events from rsvpatx.com
    3. Create test user (or reuse existing)
    4. Trigger AI matching
    5. List matched events per platform
    6. Trigger RSVP pipeline
    7. Poll for completion
    8. Report per-platform results
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

TEST_USER = {
    "email": "autorsvp.test@gmail.com",
    "first_name": "Alex",
    "last_name": "Thompson",
    "phone": "512-555-0199",
    "interests_description": (
        "Interested in all SXSW 2026 events — technology, music, film, "
        "networking, panels, parties, meetups, showcases"
    ),
}

POLL_INTERVAL = 5
POLL_TIMEOUT = 300  # 5 minutes max


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


def report_results(rsvps: list[dict], events_by_id: dict):
    """Print per-platform results table."""
    print(f"\n{'=' * 60}")
    print("  E2E TEST RESULTS - Per-Platform Report")
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
    pending = sum(
        1 for r in rsvps if r.get("status") in ("pending", "in_progress")
    )

    print(f"\n--- Summary ---")
    print(f"Platforms tested:  {len(tested)}/{len(all_platforms)}")
    print(f"Total RSVPs:       {total}")
    print(f"  Success:         {success}")
    print(f"  Manual required: {manual}")
    print(f"  Failed:          {failed}")
    print(f"  Pending:         {pending}")

    passing = success + manual
    print(f"\nVERDICT: {passing}/{total} RSVPs passed (success or manual_required)")


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
        print(f"ERROR: Scrape failed - {resp}")
        sys.exit(1)
    print(f"Scrape results: {json.dumps(resp, indent=2)}")

    # Step 3: List events and index by platform
    step("List Events by Platform")
    events = api("GET", "/events/?limit=100")
    if isinstance(events, dict) and events.get("_error"):
        print(f"ERROR: Could not list events - {events}")
        sys.exit(1)

    events_by_id = {str(e["id"]): e for e in events}
    by_platform = defaultdict(list)
    for e in events:
        by_platform[e["platform"]].append(e)

    print(f"Total events: {len(events)}")
    for plat, evts in sorted(by_platform.items()):
        print(f"  {plat}: {len(evts)} events")

    # Step 4: Create or find test user
    step("Create Test User")
    resp = api("POST", "/users/", TEST_USER)
    if resp.get("_error") and resp.get("_status") == 409:
        print("Test user already exists - searching for them...")
        users_resp = api("GET", "/users/?limit=100")
        if isinstance(users_resp, dict) and not users_resp.get("_error"):
            items = users_resp.get("items", [])
        else:
            items = users_resp if isinstance(users_resp, list) else []
        user = next(
            (u for u in items if u.get("email") == TEST_USER["email"]), None
        )
        if not user:
            print("ERROR: Could not find existing test user")
            sys.exit(1)
        print(f"Found existing user: {user['id']}")
    elif resp.get("_error"):
        print(f"ERROR: Could not create user - {resp}")
        sys.exit(1)
    else:
        user = resp
        print(f"Created user: {user['id']}")

    user_id = user["id"]

    # Step 5: Trigger AI matching
    step("AI Matching")
    resp = api("POST", f"/match/{user_id}")
    if resp.get("_error"):
        print(f"ERROR: Matching failed - {resp}")
        print("Continuing anyway - may have partial results...")
    else:
        print("Matching results:")
        print(f"  Total events:      {resp.get('total_events', 0)}")
        print(f"  Auto-RSVP (>=0.7): {resp.get('auto_rsvp_count', 0)}")
        print(f"  Recommended:       {resp.get('recommended_count', 0)}")
        print(f"  Skipped (<0.4):    {resp.get('skipped_count', 0)}")

    # Step 6: Trigger RSVP pipeline
    step("Run RSVP Pipeline")
    resp = api("POST", "/jobs/run")
    if resp.get("_error"):
        print(f"ERROR: Pipeline trigger failed - {resp}")
        sys.exit(1)
    print(f"Pipeline: {resp.get('message', 'started')}")

    # Step 7: Poll for completion
    step("Waiting for Pipeline Completion")
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

    # Step 8: Fetch RSVPs and report
    step("Fetch RSVP Results")
    rsvps_resp = api("GET", f"/rsvps/?user_id={user_id}&limit=100")
    if isinstance(rsvps_resp, dict) and rsvps_resp.get("_error"):
        print(f"ERROR: Could not fetch RSVPs - {rsvps_resp}")
        sys.exit(1)

    rsvps = rsvps_resp if isinstance(rsvps_resp, list) else []
    print(f"Total RSVPs for user: {len(rsvps)}")

    rsvp_list = []
    for r in rsvps:
        eid = str(r.get("event_id", ""))
        rsvp_list.append(
            {
                "event_id": eid,
                "status": r.get("status", "unknown"),
                "match_score": r.get("match_score"),
            }
        )

    report_results(rsvp_list, events_by_id)


if __name__ == "__main__":
    main()
