#!/usr/bin/env python3
"""
Comprehensive update for FIDs 1-100 to ensure all have profile data.
This will force fresh calculations for all FIDs in the range.
"""

import subprocess
import json
import time

API_BASE_URL = "https://buzzfunbackend.buzzdotfun.workers.dev/api"

def update_fid_with_profile(fid):
    """Update a specific FID with fresh profile data."""
    try:
        # Add timestamp to bypass any potential caching
        timestamp = int(time.time())
        result = subprocess.run([
            'curl', '-s', 
            f'{API_BASE_URL}/score/creator/{fid}?t={timestamp}'
        ], capture_output=True, text=True, timeout=60)
        
        if result.returncode != 0:
            return {'status': 'failed', 'error': 'Request failed'}
            
        data = json.loads(result.stdout)
        if data.get('success'):
            score_data = data['data']
            username = score_data.get('username')
            display_name = score_data.get('displayName')
            pfp_url = score_data.get('pfpUrl')
            score = score_data.get('overallScore', 0)
            tier = score_data.get('tier', 'D')
            
            return {
                'status': 'success',
                'username': username,
                'displayName': display_name,
                'pfpUrl': pfp_url,
                'score': score,
                'tier': tier,
                'hasProfile': bool(username or display_name)
            }
        else:
            error_msg = data.get('error', 'Unknown error')
            return {'status': 'error', 'error': error_msg}
            
    except json.JSONDecodeError:
        return {'status': 'failed', 'error': 'Invalid JSON response'}
    except Exception as e:
        return {'status': 'failed', 'error': str(e)}

def main():
    print("🔄 Comprehensive update: FIDs 1-100 with profile data")
    print("This will ensure all early FIDs have complete profile information.\n")
    
    successful_updates = 0
    failed_updates = 0
    not_found = 0
    with_profiles = 0
    
    results = []
    
    for fid in range(1, 101):
        print(f"[{fid}/100] FID {fid}: ", end="", flush=True)
        
        result = update_fid_with_profile(fid)
        
        if result['status'] == 'success':
            successful_updates += 1
            if result['hasProfile']:
                with_profiles += 1
                username = result['username'] or 'N/A'
                display_name = result['displayName'] or 'N/A'
                pfp = 'Yes' if result['pfpUrl'] else 'No'
                print(f"✅ @{username} ({display_name}) - {result['score']} ({result['tier']}) - PFP: {pfp}")
                results.append({
                    'fid': fid,
                    'username': username,
                    'displayName': display_name,
                    'score': result['score'],
                    'tier': result['tier'],
                    'hasProfile': True
                })
            else:
                print(f"⚠️  No profile - {result['score']} ({result['tier']})")
        elif result['status'] == 'error':
            if 'not found' in result['error'].lower() or 'invalid' in result['error'].lower():
                not_found += 1
                print(f"⚪ Not found")
            else:
                failed_updates += 1
                print(f"❌ {result['error']}")
        else:
            failed_updates += 1
            print(f"❌ {result['error']}")
        
        # Rate limiting - be gentle with the API
        if fid % 10 == 0:
            print(f"\n--- Progress: {fid}/100 completed ---")
            time.sleep(2)
        else:
            time.sleep(1)
    
    print(f"\n{'='*70}")
    print(f"📊 FINAL RESULTS:")
    print(f"✅ Successful updates: {successful_updates}")
    print(f"👤 With profile data: {with_profiles}")
    print(f"❌ Failed updates: {failed_updates}")
    print(f"⚪ Not found: {not_found}")
    print(f"📈 Profile coverage: {with_profiles}/{successful_updates} ({(with_profiles/successful_updates*100):.1f}%)")
    print(f"{'='*70}")
    
    # Show top scoring creators with profiles
    if results:
        print(f"\n🏆 Top 10 creators (FIDs 1-100) with profile data:")
        top_creators = sorted([r for r in results if r['hasProfile']], 
                            key=lambda x: x['score'], reverse=True)[:10]
        
        for i, creator in enumerate(top_creators, 1):
            print(f"  {i:2d}. FID {creator['fid']:3d}: @{creator['username']} ({creator['displayName']}) - {creator['score']} ({creator['tier']})")
    
    # Refresh leaderboard cache
    print(f"\n🏆 Refreshing leaderboard cache...")
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
    
    # Final leaderboard analysis
    print(f"\n📊 Final leaderboard profile coverage analysis...")
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
                leaderboard_with_profiles = sum(1 for entry in leaderboard 
                                              if entry.get('username') or entry.get('displayName'))
                total_entries = len(leaderboard)
                
                print(f"📊 Leaderboard profile coverage: {leaderboard_with_profiles}/{total_entries} entries ({(leaderboard_with_profiles/total_entries*100):.1f}%)")
                
                # Show top 10 with profile status
                print(f"\nTop 10 leaderboard entries:")
                for entry in leaderboard[:10]:
                    username = entry.get('username') or 'N/A'
                    display_name = entry.get('displayName') or 'N/A'
                    pfp = 'Yes' if entry.get('pfpUrl') else 'No'
                    profile_icon = "✅" if (entry.get('username') or entry.get('displayName')) else "❌"
                    print(f"  {profile_icon} #{entry['rank']:2d} FID {entry['fid']:4d}: @{username:15s} ({display_name:20s}) - {entry['overallScore']:5.1f} ({entry['tier']}) - PFP: {pfp}")
                
            else:
                print("❌ Leaderboard API error")
        else:
            print("❌ Leaderboard request failed")
    except Exception as e:
        print(f"❌ Leaderboard analysis failed: {e}")
    
    print(f"\n🎉 Comprehensive update complete!")
    print(f"All FIDs 1-100 have been processed and updated with the latest profile data.")

if __name__ == "__main__":
    main()
