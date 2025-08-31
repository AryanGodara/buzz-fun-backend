#!/usr/bin/env python3
"""
Bulk populate Firebase DB with 100 random creator scores.
Focuses on higher FID numbers (10k-100k) to get more average creators.
Verifies accounts are active via Neynar before scoring.
"""

import random
import time
import subprocess
import json
import sys
import os
from typing import List, Dict, Optional

# Configuration
TARGET_USERS = 100
API_BASE_URL = "https://buzzfunbackend.buzzdotfun.workers.dev/api"
NEYNAR_API_KEY = os.getenv('NEYNAR_API_KEY')
if not NEYNAR_API_KEY:
    print("❌ NEYNAR_API_KEY environment variable not set!")
    sys.exit(1)
REQUEST_DELAY = 2.0  # Seconds between requests to avoid rate limits

# FID ranges with weights (focus on lower numbers where users exist)
FID_RANGES = [
    (1, 1000, 0.3),      # Early adopters (30% chance)
    (1000, 5000, 0.4),   # Early users (40% chance) 
    (5000, 20000, 0.2),  # Mid-tier users (20% chance)
    (20000, 50000, 0.1)  # Recent users (10% chance)
]

def generate_weighted_fid() -> int:
    """Generate a random FID based on weighted ranges."""
    rand = random.random()
    cumulative = 0
    
    for min_fid, max_fid, weight in FID_RANGES:
        cumulative += weight
        if rand <= cumulative:
            return random.randint(min_fid, max_fid)
    
    # Fallback to highest range
    return random.randint(20000, 50000)

def check_neynar_user_exists(fid: int) -> bool:
    """Check if user exists and is active via Neynar API."""
    try:
        # Use curl to check user existence
        result = subprocess.run([
            'curl', '-s', '-w', '%{http_code}',
            '-H', 'accept: application/json',
            '-H', f'x-api-key: {NEYNAR_API_KEY}',
            f'https://api.neynar.com/v2/farcaster/user/bulk?fids={fid}'
        ], capture_output=True, text=True, timeout=10)
        
        if result.returncode != 0:
            return False
            
        # Extract HTTP status code (last 3 characters)
        response_body = result.stdout[:-3]
        status_code = result.stdout[-3:]
        
        if status_code != "200":
            return False
            
        # Parse response to check if user exists
        try:
            data = json.loads(response_body)
            users = data.get('users', [])
            return len(users) > 0 and users[0].get('fid') == fid
        except json.JSONDecodeError:
            return False
            
    except Exception as e:
        print(f"❌ Neynar check failed for FID {fid}: {e}")
        return False

def get_creator_score(fid: int) -> Optional[Dict]:
    """Get creator score from our API."""
    try:
        result = subprocess.run([
            'curl', '-s', 
            f'{API_BASE_URL}/score/creator/{fid}'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            return None
            
        data = json.loads(result.stdout)
        if data.get('success'):
            return data['data']
        else:
            print(f"❌ Score API error for FID {fid}: {data.get('error', 'Unknown error')}")
            return None
            
    except Exception as e:
        print(f"❌ Score request failed for FID {fid}: {e}")
        return None

def main():
    """Main execution function."""
    print(f"🚀 Starting bulk population of {TARGET_USERS} creators...")
    print(f"📊 FID distribution:")
    for min_fid, max_fid, weight in FID_RANGES:
        print(f"   {min_fid:,}-{max_fid:,}: {weight*100:.0f}%")
    print()
    
    successful_adds = 0
    attempts = 0
    max_attempts = TARGET_USERS * 3  # Allow for failures
    
    processed_fids = set()
    
    while successful_adds < TARGET_USERS and attempts < max_attempts:
        attempts += 1
        fid = generate_weighted_fid()
        
        # Skip if already processed
        if fid in processed_fids:
            continue
        processed_fids.add(fid)
        
        print(f"[{attempts:3d}] Testing FID {fid:,}...", end=" ")
        
        # Step 1: Check if user exists in Neynar
        if not check_neynar_user_exists(fid):
            print("❌ Not found in Neynar")
            time.sleep(0.5)  # Short delay for failed checks
            continue
        
        print("✅ Active →", end=" ")
        
        # Step 2: Get score from our API
        score_data = get_creator_score(fid)
        if score_data:
            score = score_data.get('overallScore', 'N/A')
            tier = score_data.get('tier', 'N/A')
            successful_adds += 1
            print(f"Score: {score} ({tier}) [{successful_adds}/{TARGET_USERS}]")
        else:
            print("❌ Score failed")
        
        # Rate limiting
        time.sleep(REQUEST_DELAY)
    
    print(f"\n🎉 Bulk population complete!")
    print(f"✅ Successfully added: {successful_adds}/{TARGET_USERS}")
    print(f"📊 Total attempts: {attempts}")
    print(f"📈 Success rate: {(successful_adds/attempts)*100:.1f}%")
    
    if successful_adds < TARGET_USERS:
        print(f"⚠️  Target not fully reached. Consider running again to add {TARGET_USERS - successful_adds} more users.")

if __name__ == "__main__":
    main()
