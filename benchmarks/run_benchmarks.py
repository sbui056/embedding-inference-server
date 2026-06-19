#!/usr/bin/env python3
"""
Benchmark runner: tests three server configurations under load.

Configs:
  1. naive     — BATCHING_ENABLED=false, CACHE_ENABLED=false
  2. batching  — BATCHING_ENABLED=true,  CACHE_ENABLED=false
  3. full      — BATCHING_ENABLED=true,  CACHE_ENABLED=true

Each config runs locust headless for DURATION seconds with USERS concurrent
users against the MixedTextUser workload (70% repeated, 30% unique).
"""

import csv
import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

DURATION = 60
USERS = 50
SPAWN_RATE = 10
PORT = 8000
HOST = f"http://localhost:{PORT}"
RESULTS_DIR = Path(__file__).parent / "results"
LOCUSTFILE = Path(__file__).parent / "locustfile.py"

CONFIGS = [
    {
        "name": "naive",
        "env": {"BATCHING_ENABLED": "false", "CACHE_ENABLED": "false"},
    },
    {
        "name": "batching",
        "env": {"BATCHING_ENABLED": "true", "CACHE_ENABLED": "false"},
    },
    {
        "name": "full",
        "env": {"BATCHING_ENABLED": "true", "CACHE_ENABLED": "true"},
    },
]


def wait_for_server(timeout: int = 30) -> bool:
    import urllib.request
    start = time.time()
    while time.time() - start < timeout:
        try:
            urllib.request.urlopen(f"{HOST}/health", timeout=2)
            return True
        except Exception:
            time.sleep(0.5)
    return False


def flush_redis():
    try:
        subprocess.run(["redis-cli", "flushdb"], capture_output=True, timeout=5)
    except Exception:
        pass


def run_config(config: dict) -> dict:
    name = config["name"]
    print(f"\n{'='*60}")
    print(f"  Running: {name}")
    print(f"  Config: {config['env']}")
    print(f"{'='*60}")

    flush_redis()

    env = os.environ.copy()
    env.update(config["env"])
    env["LOG_LEVEL"] = "warning"

    server = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "server.main:app",
         "--host", "0.0.0.0", "--port", str(PORT)],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        if not wait_for_server():
            print(f"  ERROR: Server failed to start for {name}")
            return {}

        print(f"  Server ready. Running locust for {DURATION}s with {USERS} users...")

        csv_prefix = str(RESULTS_DIR / name)
        locust_cmd = [
            sys.executable, "-m", "locust",
            "-f", str(LOCUSTFILE),
            "--host", HOST,
            "--users", str(USERS),
            "--spawn-rate", str(SPAWN_RATE),
            "--run-time", f"{DURATION}s",
            "--headless",
            "--only-summary",
            "--csv", csv_prefix,
        ]
        subprocess.run(locust_cmd, timeout=DURATION + 30)

        stats = parse_csv(f"{csv_prefix}_stats.csv")
        print(f"  Done: {name}")
        return stats

    finally:
        server.send_signal(signal.SIGTERM)
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
        time.sleep(1)


def parse_csv(path: str) -> dict:
    try:
        with open(path) as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("Name") == "Aggregated":
                    return {
                        "requests": int(row.get("Request Count", 0)),
                        "failures": int(row.get("Failure Count", 0)),
                        "avg_ms": float(row.get("Average Response Time", 0)),
                        "p50_ms": float(row.get("50%", 0)),
                        "p95_ms": float(row.get("95%", 0)),
                        "p99_ms": float(row.get("99%", 0)),
                        "rps": float(row.get("Requests/s", 0)),
                    }
    except Exception as e:
        print(f"  Warning: could not parse {path}: {e}")
    return {}


def print_results(all_results: dict):
    print(f"\n{'='*80}")
    print("  BENCHMARK RESULTS")
    print(f"{'='*80}")
    print(f"  {'Config':<12} {'Reqs':>7} {'Fail':>6} {'Avg':>8} {'p50':>8} {'p95':>8} {'p99':>8} {'RPS':>8}")
    print(f"  {'-'*12} {'-'*7} {'-'*6} {'-'*8} {'-'*8} {'-'*8} {'-'*8} {'-'*8}")

    for name, stats in all_results.items():
        if stats:
            print(
                f"  {name:<12} {stats['requests']:>7} {stats['failures']:>6} "
                f"{stats['avg_ms']:>7.1f}ms {stats['p50_ms']:>7.1f}ms "
                f"{stats['p95_ms']:>7.1f}ms {stats['p99_ms']:>7.1f}ms "
                f"{stats['rps']:>7.1f}"
            )
        else:
            print(f"  {name:<12} {'FAILED':>7}")

    if "naive" in all_results and "full" in all_results:
        naive = all_results["naive"]
        full = all_results["full"]
        if naive and full and naive["p95_ms"] > 0:
            improvement = ((naive["p95_ms"] - full["p95_ms"]) / naive["p95_ms"]) * 100
            print(f"\n  p95 improvement (naive → full): {improvement:.1f}%")

    print(f"{'='*80}\n")

    summary_path = RESULTS_DIR / "summary.json"
    with open(summary_path, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"  Results saved to {summary_path}")


def main():
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    all_results = {}
    for config in CONFIGS:
        stats = run_config(config)
        all_results[config["name"]] = stats

    print_results(all_results)


if __name__ == "__main__":
    main()
