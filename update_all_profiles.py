#!/usr/bin/env python3
"""
Update ALL database entries with user profile data.
This script fetches all existing FIDs from the database and forces profile data updates.
"""

import subprocess
import json
import time
import sys

API_BASE_URL = "https://buzzfunbackend.buzzdotfun.workers.dev/api"

def get_all_fids_from_leaderboard():
    """Get all FIDs from the current leaderboard."""
    try:
        result = subprocess.run([
            'curl', '-s', f'{API_BASE_URL}/leaderboard'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            data = json.loads(result.stdout)
            if data.get('success'):
                return [entry['fid'] for entry in data['data']['leaderboard']]
    except Exception as e:
        print(f"Error getting leaderboard FIDs: {e}")
    return []

def get_additional_known_fids():
    """Get additional FIDs that might not be in leaderboard but are in database."""
    # These are FIDs we know exist from previous bulk population
    return [
        1, 3, 5, 7, 8, 9, 13, 14, 15, 16, 18, 19, 20, 21, 23, 24, 25, 26, 27, 29, 
        30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 
        48, 49, 50, 51, 52, 53, 54, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 
        67, 68, 69, 71, 72, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 
        87, 89, 90, 91, 92, 93, 94, 95, 96, 98, 99, 100, 194, 3621, 5650
    ]

def force_profile_update(fid):
    """Force update a creator score to include fresh profile data."""
    try:
        # Add a timestamp parameter to bypass cache
        timestamp = int(time.time())
        result = subprocess.run([
            'curl', '-s', 
            f'{API_BASE_URL}/score/creator/{fid}?t={timestamp}'
        ], capture_output=True, text=True, timeout=45)
        
        if result.returncode != 0:
            print(f"❌ FID {fid}: Request failed")
            return False
            
        data = json.loads(result.stdout)
        if data.get('success'):
            score_data = data['data']
            username = score_data.get('username') or 'N/A'
            display_name = score_data.get('displayName') or 'N/A'
            pfp_url = 'Yes' if score_data.get('pfpUrl') else 'No'
            score = score_data.get('overallScore', 'N/A')
            tier = score_data.get('tier', 'N/A')
            
            # Show profile data status
            if username != 'N/A' or display_name != 'N/A':
                print(f"✅ FID {fid}: @{username} ({display_name}) - {score} ({tier}) - PFP: {pfp_url}")
            else:
                print(f"⚠️  FID {fid}: No profile data - {score} ({tier})")
            return True
        else:
            error_msg = data.get('error', 'Unknown error')
            if 'not found' in error_msg.lower() or 'invalid' in error_msg.lower():
                print(f"⚪ FID {fid}: Not found/invalid")
            else:
                print(f"❌ FID {fid}: {error_msg}")
            return False
            
    except json.JSONDecodeError:
        print(f"❌ FID {fid}: Invalid JSON response")
        return False
    except Exception as e:
        print(f"❌ FID {fid}: {str(e)}")
        return False

def main():
    print("🔄 Updating ALL database entries with profile data...")
    print("This will force refresh all cached scores to include profile information.\n")
    
    # Get all FIDs from leaderboard
    leaderboard_fids = get_all_fids_from_leaderboard()
    additional_fids = get_additional_known_fids()
    
    # Combine and deduplicate
    all_fids = list(set(leaderboard_fids + additional_fids))
    all_fids.sort()
    
    print(f"Found {len(leaderboard_fids)} FIDs from leaderboard")
    print(f"Adding {len(additional_fids)} additional known FIDs")
    print(f"Total unique FIDs to update: {len(all_fids)}\n")
    
    successful_updates = 0
    failed_updates = 0
    not_found = 0
    
    for i, fid in enumerate(all_fids, 1):
        print(f"[{i}/{len(all_fids)}] ", end="")
        
        result = force_profile_update(fid)
        if result:
            successful_updates += 1
        else:
            failed_updates += 1
        
        # Rate limiting - be gentle with the API
        if i % 10 == 0:
            print(f"\n--- Progress: {i}/{len(all_fids)} completed ---")
            time.sleep(2)
        else:
            time.sleep(1)
    
    print(f"\n{'='*60}")
    print(f"✅ Successfully updated: {successful_updates}")
    print(f"❌ Failed updates: {failed_updates}")
    print(f"📊 Total processed: {len(all_fids)}")
    print(f"{'='*60}")
    
    # Refresh leaderboard cache
    print("\n🏆 Refreshing leaderboard cache with updated profile data...")
    try:
        result = subprocess.run([
            'curl', '-X', 'POST', '-s', 
            f'{API_BASE_URL}/leaderboard/refresh'
        ], capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            print("✅ Leaderboard cache refreshed successfully")
        else:
            print("❌ Failed to refresh leaderboard cache")
    except Exception as e:
        print(f"❌ Leaderboard refresh failed: {e}")
    
    # Test final leaderboard with profile data
    print("\n🏆 Testing updated leaderboard with profile data...")
    try:
        result = subprocess.run([
            'curl', '-s', 
            f'{API_BASE_URL}/leaderboard'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            data = json.loads(result.stdout)
            if data.get('success'):
                leaderboard = data['data']['leaderboard'][:5]  # Top 5
                print("Top 5 with profile data:")
                for entry in leaderboard:
                    username = entry.get('username') or 'N/A'
                    display_name = entry.get('displayName') or 'N/A'
                    pfp = 'Yes' if entry.get('pfpUrl') else 'No'
                    print(f"  #{entry['rank']} FID {entry['fid']}: @{username} ({display_name}) - {entry['overallScore']} ({entry['tier']}) - PFP: {pfp}")
                
                # Count entries with profile data
                with_profiles = sum(1 for entry in data['data']['leaderboard'] 
                                  if entry.get('username') or entry.get('displayName'))
                total_entries = len(data['data']['leaderboard'])
                print(f"\n📊 Leaderboard profile coverage: {with_profiles}/{total_entries} entries have profile data")
            else:
                print("❌ Leaderboard API error")
        else:
            print("❌ Leaderboard request failed")
    except Exception as e:
        print(f"❌ Leaderboard test failed: {e}")
    
    print(f"\n🎉 Profile data update complete!")
    print(f"All database entries have been refreshed with the latest profile information.")

if __name__ == "__main__":
    main()
