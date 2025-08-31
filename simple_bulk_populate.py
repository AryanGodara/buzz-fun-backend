#!/usr/bin/env python3
"""
Simplified bulk populate script that directly calls our API.
Our API already handles invalid FIDs gracefully, so no need for Neynar pre-check.
"""

import random
import time
import subprocess
import json

# Configuration
TARGET_USERS = 100
API_BASE_URL = "https://buzzfunbackend.buzzdotfun.workers.dev/api"
REQUEST_DELAY = 1.5  # Seconds between requests

# FID ranges focused on areas where users exist
FID_RANGES = [
    (1, 1000, 0.4),      # Early adopters (40% chance)
    (1000, 5000, 0.3),   # Early users (30% chance) 
    (5000, 15000, 0.2),  # Mid-tier users (20% chance)
    (15000, 30000, 0.1)  # Recent users (10% chance)
]

def generate_weighted_fid() -> int:
    """Generate a random FID based on weighted ranges."""
    rand = random.random()
    cumulative = 0
    
    for min_fid, max_fid, weight in FID_RANGES:
        cumulative += weight
        if rand <= cumulative:
            return random.randint(min_fid, max_fid)
    
    # Fallback
    return random.randint(1, 5000)

def get_creator_score(fid: int) -> dict:
    """Get creator score from our API."""
    try:
        result = subprocess.run([
            'curl', '-s', 
            f'{API_BASE_URL}/score/creator/{fid}'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            return {"success": False, "error": "Request failed"}
            
        data = json.loads(result.stdout)
        return data
            
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    """Main execution function."""
    print(f"🚀 Starting simplified bulk population of {TARGET_USERS} creators...")
    print(f"📊 FID distribution:")
    for min_fid, max_fid, weight in FID_RANGES:
        print(f"   {min_fid:,}-{max_fid:,}: {weight*100:.0f}%")
    print()
    
    successful_adds = 0
    attempts = 0
    max_attempts = TARGET_USERS * 2  # Allow for some failures
    
    processed_fids = set()
    
    while successful_adds < TARGET_USERS and attempts < max_attempts:
        attempts += 1
        fid = generate_weighted_fid()
        
        # Skip if already processed
        if fid in processed_fids:
            continue
        processed_fids.add(fid)
        
        print(f"[{attempts:3d}] Testing FID {fid:,}...", end=" ")
        
        # Get score from our API (it handles validation internally)
        result = get_creator_score(fid)
        
        if result.get('success'):
            score_data = result['data']
            score = score_data.get('overallScore', 'N/A')
            tier = score_data.get('tier', 'N/A')
            successful_adds += 1
            print(f"✅ Score: {score} ({tier}) [{successful_adds}/{TARGET_USERS}]")
        else:
            error = result.get('error', 'Unknown error')
            if 'not found' in error.lower() or 'invalid' in error.lower():
                print("❌ Invalid FID")
            else:
                print(f"❌ {error}")
        
        # Rate limiting
        time.sleep(REQUEST_DELAY)
        
        # Progress update every 20 attempts
        if attempts % 20 == 0:
            print(f"📊 Progress: {successful_adds}/{TARGET_USERS} ({(successful_adds/TARGET_USERS)*100:.1f}%) after {attempts} attempts")
    
    print(f"\n🎉 Bulk population complete!")
    print(f"✅ Successfully added: {successful_adds}/{TARGET_USERS}")
    print(f"📊 Total attempts: {attempts}")
    print(f"📈 Success rate: {(successful_adds/attempts)*100:.1f}%")
    
    if successful_adds < TARGET_USERS:
        remaining = TARGET_USERS - successful_adds
        print(f"⚠️  Target not fully reached. Need {remaining} more users.")
        print(f"💡 Consider running again or adjusting FID ranges.")

if __name__ == "__main__":
    main()
