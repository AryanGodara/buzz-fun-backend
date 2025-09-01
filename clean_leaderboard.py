#!/usr/bin/env python3
"""
Clean leaderboard by removing entries without profile data.
This will filter out FIDs that don't have username/displayName and rebuild the leaderboard.
"""

import subprocess
import json
import time

API_BASE_URL = "https://buzzfunbackend.buzzdotfun.workers.dev/api"

def get_current_leaderboard():
    """Get current leaderboard data."""
    try:
        result = subprocess.run([
            'curl', '-s', f'{API_BASE_URL}/leaderboard'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            data = json.loads(result.stdout)
            if data.get('success'):
                return data['data']['leaderboard']
    except Exception as e:
        print(f"Error getting leaderboard: {e}")
    return []

def identify_entries_to_remove(leaderboard):
    """Identify entries without profile data."""
    entries_to_remove = []
    entries_with_profiles = []
    
    for entry in leaderboard:
        has_profile = bool(entry.get('username') or entry.get('displayName'))
        if has_profile:
            entries_with_profiles.append(entry)
        else:
            entries_to_remove.append(entry)
    
    return entries_to_remove, entries_with_profiles

def main():
    print("🧹 Cleaning leaderboard by removing entries without profile data...")
    
    # Get current leaderboard
    current_leaderboard = get_current_leaderboard()
    if not current_leaderboard:
        print("❌ Failed to get current leaderboard")
        return
    
    print(f"📊 Current leaderboard has {len(current_leaderboard)} entries")
    
    # Identify entries to remove
    entries_to_remove, entries_with_profiles = identify_entries_to_remove(current_leaderboard)
    
    print(f"\n🗑️  Entries to remove (no profile data):")
    for entry in entries_to_remove:
        print(f"  - FID {entry['fid']}: Rank #{entry['rank']} - {entry['overallScore']} ({entry['tier']})")
    
    print(f"\n✅ Entries with profile data: {len(entries_with_profiles)}")
    print(f"❌ Entries without profile data: {len(entries_to_remove)}")
    
    if not entries_to_remove:
        print("🎉 All entries already have profile data!")
        return
    
    # The leaderboard cache is built from individual score entries in Firebase
    # We need to force refresh scores for the problematic FIDs to get them updated
    print(f"\n🔄 Attempting to refresh problematic entries...")
    
    updated_count = 0
    for entry in entries_to_remove:
        fid = entry['fid']
        print(f"Trying to refresh FID {fid}... ", end="")
        
        try:
            # Try to force a fresh calculation with cache busting
            timestamp = int(time.time())
            result = subprocess.run([
                'curl', '-s', 
                f'{API_BASE_URL}/score/creator/{fid}?force_refresh=true&t={timestamp}'
            ], capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                if data.get('success'):
                    score_data = data['data']
                    if score_data.get('username') or score_data.get('displayName'):
                        username = score_data.get('username') or 'N/A'
                        display_name = score_data.get('displayName') or 'N/A'
                        print(f"✅ Updated: @{username} ({display_name})")
                        updated_count += 1
                    else:
                        print(f"⚠️  Still no profile data")
                else:
                    print(f"❌ API error")
            else:
                print(f"❌ Request failed")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        time.sleep(1)  # Rate limiting
    
    print(f"\n📊 Updated {updated_count}/{len(entries_to_remove)} problematic entries")
    
    # Refresh leaderboard cache
    print(f"\n🏆 Refreshing leaderboard cache...")
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
    
    # Check final results
    print(f"\n📊 Final leaderboard analysis...")
    final_leaderboard = get_current_leaderboard()
    if final_leaderboard:
        final_entries_to_remove, final_entries_with_profiles = identify_entries_to_remove(final_leaderboard)
        
        print(f"✅ Entries with profile data: {len(final_entries_with_profiles)}/{len(final_leaderboard)}")
        
        if final_entries_to_remove:
            print(f"\n⚠️  Still {len(final_entries_to_remove)} entries without profile data:")
            for entry in final_entries_to_remove[:5]:  # Show first 5
                print(f"  - FID {entry['fid']}: Rank #{entry['rank']} - {entry['overallScore']} ({entry['tier']})")
            
            print(f"\n💡 Recommendation: These entries have 1-week cache TTL and will update naturally.")
            print(f"For immediate frontend display, consider filtering client-side to show only entries with profile data.")
        else:
            print(f"\n🎉 All leaderboard entries now have profile data!")
        
        # Show top 10 with profile status
        print(f"\nTop 10 entries:")
        for entry in final_leaderboard[:10]:
            username = entry.get('username') or 'N/A'
            display_name = entry.get('displayName') or 'N/A'
            pfp = 'Yes' if entry.get('pfpUrl') else 'No'
            profile_icon = "✅" if (entry.get('username') or entry.get('displayName')) else "❌"
            print(f"  {profile_icon} #{entry['rank']:2d} FID {entry['fid']:4d}: @{username:15s} ({display_name:20s}) - {entry['overallScore']:5.1f} ({entry['tier']}) - PFP: {pfp}")

if __name__ == "__main__":
    main()
