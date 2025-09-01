#!/usr/bin/env python3
"""
Force cache refresh for all entries by directly updating Firebase.
This bypasses the cache TTL to ensure all entries get fresh profile data.
"""

import subprocess
import json
import time
import random

API_BASE_URL = "https://buzzfunbackend.buzzdotfun.workers.dev/api"

def get_fids_without_profiles():
    """Get FIDs from leaderboard that don't have profile data."""
    try:
        result = subprocess.run([
            'curl', '-s', f'{API_BASE_URL}/leaderboard'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            data = json.loads(result.stdout)
            if data.get('success'):
                fids_without_profiles = []
                for entry in data['data']['leaderboard']:
                    if not entry.get('username') and not entry.get('displayName'):
                        fids_without_profiles.append(entry['fid'])
                return fids_without_profiles
    except Exception as e:
        print(f"Error getting leaderboard: {e}")
    return []

def force_fresh_calculation(fid):
    """Force a completely fresh calculation by using cache-busting parameters."""
    try:
        # Use multiple cache-busting parameters
        timestamp = int(time.time())
        random_param = random.randint(1000, 9999)
        
        result = subprocess.run([
            'curl', '-s', '-H', 'Cache-Control: no-cache',
            f'{API_BASE_URL}/score/creator/{fid}?refresh=true&t={timestamp}&r={random_param}&force=1'
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode != 0:
            print(f"❌ FID {fid}: Request failed")
            return False
            
        data = json.loads(result.stdout)
        if data.get('success'):
            score_data = data['data']
            username = score_data.get('username')
            display_name = score_data.get('displayName')
            pfp_url = score_data.get('pfpUrl')
            score = score_data.get('overallScore', 'N/A')
            tier = score_data.get('tier', 'N/A')
            
            if username or display_name:
                username_display = username or 'N/A'
                display_name_display = display_name or 'N/A'
                pfp_status = 'Yes' if pfp_url else 'No'
                print(f"✅ FID {fid}: @{username_display} ({display_name_display}) - {score} ({tier}) - PFP: {pfp_status}")
                return True
            else:
                print(f"⚠️  FID {fid}: Still no profile data - {score} ({tier})")
                return False
        else:
            error_msg = data.get('error', 'Unknown error')
            print(f"❌ FID {fid}: {error_msg}")
            return False
            
    except Exception as e:
        print(f"❌ FID {fid}: {str(e)}")
        return False

def main():
    print("🔄 Force refreshing entries without profile data...")
    
    # Get FIDs that don't have profile data
    fids_without_profiles = get_fids_without_profiles()
    
    if not fids_without_profiles:
        print("✅ All entries already have profile data!")
        return
    
    print(f"Found {len(fids_without_profiles)} entries without profile data")
    print(f"FIDs to refresh: {fids_without_profiles[:10]}{'...' if len(fids_without_profiles) > 10 else ''}\n")
    
    successful_updates = 0
    
    for i, fid in enumerate(fids_without_profiles, 1):
        print(f"[{i}/{len(fids_without_profiles)}] ", end="")
        
        if force_fresh_calculation(fid):
            successful_updates += 1
        
        # Rate limiting
        time.sleep(2)
        
        if i % 5 == 0:
            print(f"\n--- Progress: {i}/{len(fids_without_profiles)} completed ---")
    
    print(f"\n{'='*60}")
    print(f"✅ Successfully updated: {successful_updates}/{len(fids_without_profiles)}")
    print(f"{'='*60}")
    
    # Wait a bit then refresh leaderboard
    print("\n⏳ Waiting 10 seconds before refreshing leaderboard...")
    time.sleep(10)
    
    print("🏆 Refreshing leaderboard cache...")
    try:
        result = subprocess.run([
            'curl', '-X', 'POST', '-s', 
            f'{API_BASE_URL}/leaderboard/refresh'
        ], capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            print("✅ Leaderboard cache refreshed")
        else:
            print("❌ Failed to refresh leaderboard cache")
    except Exception as e:
        print(f"❌ Leaderboard refresh failed: {e}")
    
    # Test final results
    print("\n🏆 Final leaderboard check...")
    try:
        result = subprocess.run([
            'curl', '-s', 
            f'{API_BASE_URL}/leaderboard'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            data = json.loads(result.stdout)
            if data.get('success'):
                leaderboard = data['data']['leaderboard']
                
                # Count entries with profile data
                with_profiles = sum(1 for entry in leaderboard 
                                  if entry.get('username') or entry.get('displayName'))
                total_entries = len(leaderboard)
                
                print(f"📊 Final profile coverage: {with_profiles}/{total_entries} entries have profile data")
                
                # Show top 5 with profile status
                print("\nTop 5 entries:")
                for entry in leaderboard[:5]:
                    username = entry.get('username') or 'N/A'
                    display_name = entry.get('displayName') or 'N/A'
                    pfp = 'Yes' if entry.get('pfpUrl') else 'No'
                    profile_status = "✅" if (entry.get('username') or entry.get('displayName')) else "❌"
                    print(f"  {profile_status} #{entry['rank']} FID {entry['fid']}: @{username} ({display_name}) - {entry['overallScore']} ({entry['tier']}) - PFP: {pfp}")
                
            else:
                print("❌ Leaderboard API error")
        else:
            print("❌ Leaderboard request failed")
    except Exception as e:
        print(f"❌ Leaderboard test failed: {e}")

if __name__ == "__main__":
    main()
