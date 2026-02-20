#!/usr/bin/env python3
"""Deploy StockPulse frontend to Vercel.

Usage:
    python deploy.py

Builds the Vite app with the production API URL and deploys
the dist/ directory to the Vercel 'stockpulse-dashboard' project.

Requires: gateway_proxy module (available in agent sandbox).
"""
import os
import sys
import json
import base64
import subprocess as sp

PROJECT_NAME = "stockpulse-dashboard"
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")
DIST_DIR = os.path.join(FRONTEND_DIR, "dist")
API_URL = "https://stockpulse-api-production.up.railway.app/api"


def build():
    print("Installing dependencies...")
    sp.run(["npm", "install"], cwd=FRONTEND_DIR, check=True)
    print("Building with VITE_API_URL =", API_URL)
    sp.run(
        ["npm", "run", "build"],
        cwd=FRONTEND_DIR,
        env={**os.environ, "VITE_API_URL": API_URL},
        check=True,
    )
    # Copy index.html to 404.html for SPA routing
    import shutil
    shutil.copy(os.path.join(DIST_DIR, "index.html"), os.path.join(DIST_DIR, "404.html"))
    print("Build complete. 404.html copied for SPA routing.")


def deploy():
    sys.path.insert(0, "/app")
    from gateway_proxy import call_gateway

    files = []
    for root, _dirs, filenames in os.walk(DIST_DIR):
        for fname in filenames:
            full_path = os.path.join(root, fname)
            rel_path = os.path.relpath(full_path, DIST_DIR)
            with open(full_path, "rb") as f:
                data = base64.b64encode(f.read()).decode("ascii")
            files.append({"file": rel_path, "data": data, "encoding": "base64"})

    print(f"Deploying {len(files)} files to Vercel...")
    for f in files:
        print(f"  {f['file']}")

    payload = {
        "name": PROJECT_NAME,
        "files": files,
        "target": "production",
        "project_settings": {"framework": None},
    }

    result = call_gateway("/vercel/deploy-directory", payload, timeout=120)

    if "error" in result:
        print("Deploy FAILED:", result["error"])
        sys.exit(1)

    state = result.get("readyState", "UNKNOWN")
    url = result.get("url", "")
    deploy_id = result.get("id", "")
    print(f"Deploy ID: {deploy_id}")
    print(f"State: {state}")
    print(f"URL: https://{url}")

    aliases = result.get("alias", [])
    if aliases:
        print(f"Production: https://{aliases[0]}")


if __name__ == "__main__":
    build()
    deploy()
