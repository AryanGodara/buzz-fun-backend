#!/usr/bin/env python3
"""
Refresh top creators with profile data by forcing score recalculation.
This will update cached scores to include username, displayName, and pfpUrl.
"""

import subprocess
import json
import time

API_BASE_URL = "https://buzzfunbackend.buzzdotfun.workers.dev/api"

def get_top_creator_fids():
    """Get FIDs of top creators from current leaderboard."""
    try:
        result = subprocess.run([
            'curl', '-s', f'{API_BASE_URL}/leaderboard'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            data = json.loads(result.stdout)
            if data.get('success'):
                # Get top 10 FIDs from leaderboard
                return [entry['fid'] for entry in data['data']['leaderboard'][:10]]
    except Exception as e:
        print(f"Error getting leaderboard: {e}")
    
    # Fallback to known top FIDs
    return [10, 2, 12, 88, 1626, 22, 70, 97, 367, 11]

def refresh_creator_with_profile(fid):
    """Force refresh a creator score to include profile data."""
    try:
        # Use a fresh FID parameter to bypass cache
        result = subprocess.run([
            'curl', '-s', 
            f'{API_BASE_URL}/score/creator/{fid}?refresh=true'
        ], capture_output=True, text=True, timeout=45)
        
        if result.returncode != 0:
            return False
            
        data = json.loads(result.stdout)
        if data.get('success'):
            score_data = data['data']
            username = score_data.get('username') or 'N/A'
            display_name = score_data.get('displayName') or 'N/A'
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
    print("🔄 Refreshing top creators with profile data...")
    
    top_fids = get_top_creator_fids()
    print(f"Found {len(top_fids)} top creators to refresh")
    
    successful_refreshes = 0
    
    for fid in top_fids:
        if refresh_creator_with_profile(fid):
            successful_refreshes += 1
        time.sleep(2)  # Rate limiting
    
    print(f"\n✅ Refreshed {successful_refreshes}/{len(top_fids)} creators with profile data")
    
    # Refresh leaderboard cache
    print("\n🏆 Refreshing leaderboard cache...")
    try:
        result = subprocess.run([
            'curl', '-X', 'POST', '-s', 
            f'{API_BASE_URL}/leaderboard/refresh'
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print("✅ Leaderboard cache refreshed")
        else:
            print("❌ Failed to refresh leaderboard cache")
    except Exception as e:
        print(f"❌ Leaderboard refresh failed: {e}")
    
    # Test final leaderboard
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
                    username = entry.get('username') or 'N/A'
                    display_name = entry.get('displayName') or 'N/A'
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
