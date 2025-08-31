#!/usr/bin/env python3
"""
Targeted bulk populate using known working FID patterns and ranges.
"""

import random
import time
import subprocess
import json

# Configuration
TARGET_USERS = 100
API_BASE_URL = "https://buzzfunbackend.buzzdotfun.workers.dev/api"
REQUEST_DELAY = 1.0

# Known working FID ranges based on our testing
def generate_likely_fid() -> int:
    """Generate FIDs from ranges where we know users exist."""
    strategies = [
        lambda: random.randint(1, 100),      # Very early users (30%)
        lambda: random.randint(100, 500),    # Early adopters (25%)  
        lambda: random.randint(500, 2000),   # Early community (20%)
        lambda: random.randint(2000, 8000),  # Growing phase (15%)
        lambda: random.randint(8000, 25000), # Expansion (10%)
    ]
    
    weights = [0.3, 0.25, 0.2, 0.15, 0.1]
    choice = random.choices(strategies, weights=weights)[0]
    return choice()

def get_creator_score(fid: int) -> dict:
    """Get creator score from our API."""
    try:
        result = subprocess.run([
            'curl', '-s', 
            f'{API_BASE_URL}/score/creator/{fid}'
        ], capture_output=True, text=True, timeout=20)
        
        if result.returncode != 0:
            return {"success": False, "error": "Request failed"}
            
        data = json.loads(result.stdout)
        return data
            
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    print(f"🎯 Targeted bulk population of {TARGET_USERS} creators...")
    print("📊 Using known working FID ranges\n")
    
    successful_adds = 0
    attempts = 0
    max_attempts = TARGET_USERS * 3
    processed_fids = set()
    
    while successful_adds < TARGET_USERS and attempts < max_attempts:
        attempts += 1
        fid = generate_likely_fid()
        
        if fid in processed_fids:
            continue
        processed_fids.add(fid)
        
        print(f"[{attempts:3d}] FID {fid:,}...", end=" ", flush=True)
        
        result = get_creator_score(fid)
        
        if result.get('success'):
            score_data = result['data']
            score = score_data.get('overallScore')
            tier = score_data.get('tier', 'N/A')
            
            if score is not None:  # Valid score
                successful_adds += 1
                print(f"✅ {score:.1f} ({tier}) [{successful_adds}/{TARGET_USERS}]")
            else:  # Null score (inactive user)
                print("❌ Inactive")
        else:
            print(f"❌ {result.get('error', 'Failed')}")
        
        time.sleep(REQUEST_DELAY)
        
        # Progress update
        if attempts % 25 == 0:
            rate = (successful_adds/attempts)*100
            print(f"📊 Progress: {successful_adds}/{TARGET_USERS} ({rate:.1f}% success rate)")
    
    print(f"\n🎉 Complete! Added {successful_adds}/{TARGET_USERS} creators")
    print(f"📈 Success rate: {(successful_adds/attempts)*100:.1f}% ({attempts} attempts)")

if __name__ == "__main__":
    main()
