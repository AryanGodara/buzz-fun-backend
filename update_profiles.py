#!/usr/bin/env python3
"""
Update existing database entries with user profile data (username, displayName, pfpUrl).
This script fetches profile data for existing FIDs and updates the database.
"""

import subprocess
import json
import time

API_BASE_URL = "https://buzzfunbackend.buzzdotfun.workers.dev/api"

def get_existing_fids():
    """Get list of FIDs that need profile data updates."""
    # Test with a few known FIDs first
    return [10, 2, 12, 88, 1626, 22, 70, 97, 367, 11]

def update_creator_score(fid):
    """Force update a creator score to include profile data."""
    try:
        result = subprocess.run([
            'curl', '-s', 
            f'{API_BASE_URL}/score/creator/{fid}'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            return False
            
        data = json.loads(result.stdout)
        if data.get('success'):
            score_data = data['data']
            username = score_data.get('username', 'N/A')
            display_name = score_data.get('displayName', 'N/A')
            pfp_url = 'Yes' if score_data.get('pfpUrl') else 'No'
            score = score_data.get('overallScore', 'N/A')
            tier = score_data.get('tier', 'N/A')
            
            print(f"✅ FID {fid}: @{username} ({display_name}) - {score} ({tier}) - PFP: {pfp_url}")
            return True
        else:
            print(f"❌ FID {fid}: {data.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ FID {fid}: {str(e)}")
        return False

def main():
    print("🔄 Updating existing database entries with profile data...")
    
    fids = get_existing_fids()
    successful_updates = 0
    
    for fid in fids:
        if update_creator_score(fid):
            successful_updates += 1
        time.sleep(1)  # Rate limiting
    
    print(f"\n✅ Updated {successful_updates}/{len(fids)} entries with profile data")
    
    # Test leaderboard
    print("\n🏆 Testing updated leaderboard...")
    try:
        result = subprocess.run([
            'curl', '-s', 
            f'{API_BASE_URL}/leaderboard'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            data = json.loads(result.stdout)
            if data.get('success'):
                leaderboard = data['data']['leaderboard'][:3]  # Top 3
                print("Top 3 with profile data:")
                for entry in leaderboard:
                    username = entry.get('username', 'N/A')
                    display_name = entry.get('displayName', 'N/A')
                    pfp = 'Yes' if entry.get('pfpUrl') else 'No'
                    print(f"  #{entry['rank']} FID {entry['fid']}: @{username} ({display_name}) - {entry['overallScore']} ({entry['tier']}) - PFP: {pfp}")
            else:
                print("❌ Leaderboard API error")
        else:
            print("❌ Leaderboard request failed")
    except Exception as e:
        print(f"❌ Leaderboard test failed: {e}")

if __name__ == "__main__":
    main()
