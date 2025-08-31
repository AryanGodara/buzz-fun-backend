#!/usr/bin/env python3
"""
Quick test to verify Neynar API connectivity and find valid FIDs.
"""

import subprocess
import json
import os

NEYNAR_API_KEY = os.getenv('NEYNAR_API_KEY')
if not NEYNAR_API_KEY:
    print("❌ NEYNAR_API_KEY environment variable not set!")
    exit(1)

# Test known good FIDs that we've already verified work
test_fids = [1, 2, 3, 10, 12, 15, 20, 22, 100, 200, 500, 1000]

print(f"🧪 Testing Neynar API with known FIDs...")
print(f"🔑 API Key: {NEYNAR_API_KEY[:10]}...")

for fid in test_fids:
    try:
        result = subprocess.run([
            'curl', '-s', '-w', '%{http_code}',
            '-H', 'accept: application/json',
            '-H', f'x-api-key: {NEYNAR_API_KEY}',
            f'https://api.neynar.com/v2/farcaster/user/bulk?fids={fid}'
        ], capture_output=True, text=True, timeout=10)
        
        if result.returncode != 0:
            print(f"❌ FID {fid}: curl failed")
            continue
            
        # Extract HTTP status code (last 3 characters)
        response_body = result.stdout[:-3]
        status_code = result.stdout[-3:]
        
        print(f"FID {fid}: Status {status_code}", end=" ")
        
        if status_code == "200":
            try:
                data = json.loads(response_body)
                users = data.get('users', [])
                if len(users) > 0 and users[0].get('fid') == fid:
                    username = users[0].get('username', 'unknown')
                    print(f"✅ Found @{username}")
                else:
                    print("❌ No user data")
            except json.JSONDecodeError:
                print("❌ Invalid JSON")
        else:
            print(f"❌ HTTP {status_code}")
            if status_code == "401":
                print("   🔑 API key might be invalid")
            elif status_code == "429":
                print("   ⏱️  Rate limited")
                
    except Exception as e:
        print(f"❌ FID {fid}: {e}")

print("\n✅ Neynar API test complete!")
