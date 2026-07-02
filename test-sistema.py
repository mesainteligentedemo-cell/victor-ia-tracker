#!/usr/bin/env python3
import requests
import json
import sys

BASE_URL = "https://tracker.victor-ia.xyz"

def test_endpoints():
    print("[TEST] Victor IA System Testing...")
    results = {"passed": 0, "failed": 0}
    
    # Test 1: Frontend
    print("
[TEST 1] Checking frontends...")
    for page in ['control-maestro.html', 'biblioteca.html', 'config-dashboard.html']:
        try:
            r = requests.get(f"{BASE_URL}/{page}", timeout=5)
            if r.status_code == 200:
                print(f"  OK: {page}")
                results["passed"] += 1
            else:
                print(f"  FAIL: {page} ({r.status_code})")
                results["failed"] += 1
        except Exception as e:
            print(f"  ERROR: {page} - {e}")
            results["failed"] += 1
    
    # Test 2: API biblioteca
    print("
[TEST 2] Checking /api/biblioteca...")
    try:
        r = requests.get(f"{BASE_URL}/api/biblioteca", timeout=5)
        if r.status_code == 200 and 'assets' in r.json():
            print(f"  OK: Total assets = {r.json()['total']}")
            results["passed"] += 1
        else:
            print(f"  FAIL: API response invalid")
            results["failed"] += 1
    except Exception as e:
        print(f"  ERROR: {e}")
        results["failed"] += 1
    
    # Test 3: API create (test payload)
    print("
[TEST 3] Testing /api/create (dry run)...")
    try:
        payload = {
            "action": "imagen",
            "voice_input": "test",
            "config": {}
        }
        r = requests.post(f"{BASE_URL}/api/create", json=payload, timeout=5)
        if r.status_code == 200 and 'jobId' in r.json():
            print(f"  OK: jobId = {r.json()['jobId'][:30]}...")
            results["passed"] += 1
        else:
            print(f"  FAIL: {r.status_code}")
            results["failed"] += 1
    except Exception as e:
        print(f"  ERROR: {e}")
        results["failed"] += 1
    
    print(f"
[RESULT] {results['passed']} passed, {results['failed']} failed")
    return results["failed"] == 0

if __name__ == "__main__":
    success = test_endpoints()
    sys.exit(0 if success else 1)
