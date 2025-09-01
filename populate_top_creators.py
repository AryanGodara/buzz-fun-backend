#!/usr/bin/env python3
"""
Populate profile data for top creators by using fresh FIDs that will get new calculations.
Focus on getting profile data for the most visible leaderboard positions.
"""

import subprocess
import json
import time

API_BASE_URL = "https://buzzfunbackend.buzzdotfun.workers.dev/api"

def get_fresh_high_scoring_creators():
    """Get FIDs of creators likely to score high and have profile data."""
    # These are known high-quality creators with good profiles
    high_profile_fids = [
        # Ethereum/Crypto leaders
        5650,   # vitalik.eth
        3621,   # horsefacts.eth  
        194,    # rish
        99,     # jesse.base.eth
        
        # Other notable creators we can test
        1214,   # dwr.eth (Dan Romero)
        602,    # v
        6131,   # linda.eth
        2433,   # ace
        7094,   # derek
        8152,   # ted (warpcast)
        
        # More potential high scorers
        15983,  # ccarella.eth
        16098,  # christin
        1689,   # macbudkowski
        3,      # @dwr (if not cached)
        
        # Base ecosystem
        6546,   # base
        7269,   # coinbase
        
        # Additional creators
        1102,   # balajis
        239,    # naval (if available)
        2,      # @farcaster (if not cached)
    ]
    
    return high_profile_fids

def test_creator_score(fid):
    """Test if a creator has a good score and profile data."""
    try:
        result = subprocess.run([
            'curl', '-s', 
            f'{API_BASE_URL}/score/creator/{fid}'
        ], capture_output=True, text=True, timeout=45)
        
        if result.returncode != 0:
            return None
            
        data = json.loads(result.stdout)
        if data.get('success'):
            score_data = data['data']
            return {
                'fid': fid,
                'username': score_data.get('username'),
                'displayName': score_data.get('displayName'),
                'pfpUrl': score_data.get('pfpUrl'),
                'overallScore': score_data.get('overallScore', 0),
                'tier': score_data.get('tier', 'D'),
                'hasProfile': bool(score_data.get('username') or score_data.get('displayName'))
            }
        return None
            
    except Exception as e:
        return None

def main():
    print("🎯 Testing high-profile creators for leaderboard enhancement...")
    
    potential_fids = get_fresh_high_scoring_creators()
    print(f"Testing {len(potential_fids)} potential high-scoring creators\n")
    
    successful_creators = []
    
    for i, fid in enumerate(potential_fids, 1):
        print(f"[{i}/{len(potential_fids)}] Testing FID {fid}... ", end="")
        
        creator_data = test_creator_score(fid)
        if creator_data:
            if creator_data['hasProfile'] and creator_data['overallScore'] > 60:
                username = creator_data['username'] or 'N/A'
                display_name = creator_data['displayName'] or 'N/A'
                pfp = 'Yes' if creator_data['pfpUrl'] else 'No'
                print(f"✅ @{username} ({display_name}) - {creator_data['overallScore']} ({creator_data['tier']}) - PFP: {pfp}")
                successful_creators.append(creator_data)
            elif creator_data['hasProfile']:
                username = creator_data['username'] or 'N/A'
                display_name = creator_data['displayName'] or 'N/A'
                print(f"⚠️  @{username} ({display_name}) - {creator_data['overallScore']} ({creator_data['tier']}) (Lower score)")
            else:
                print(f"❌ No profile data - {creator_data['overallScore']} ({creator_data['tier']})")
        else:
            print("❌ Failed to fetch")
        
        time.sleep(1)  # Rate limiting
    
    print(f"\n{'='*60}")
    print(f"✅ Found {len(successful_creators)} high-scoring creators with profiles")
    print(f"{'='*60}")
    
    if successful_creators:
        print("\n🏆 High-scoring creators with profile data:")
        sorted_creators = sorted(successful_creators, key=lambda x: x['overallScore'], reverse=True)
        for creator in sorted_creators[:10]:
            username = creator['username'] or 'N/A'
            display_name = creator['displayName'] or 'N/A'
            pfp = 'Yes' if creator['pfpUrl'] else 'No'
            print(f"  FID {creator['fid']}: @{username} ({display_name}) - {creator['overallScore']} ({creator['tier']}) - PFP: {pfp}")
    
    # Refresh leaderboard to include new entries
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
    
    # Check final leaderboard profile coverage
    print("\n📊 Final leaderboard analysis...")
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
                
                print(f"📊 Profile coverage: {with_profiles}/{total_entries} entries have profile data")
                
                # Show entries with profiles in top 20
                print(f"\nTop 20 entries with profile data:")
                count = 0
                for entry in leaderboard[:20]:
                    if entry.get('username') or entry.get('displayName'):
                        username = entry.get('username') or 'N/A'
                        display_name = entry.get('displayName') or 'N/A'
                        pfp = 'Yes' if entry.get('pfpUrl') else 'No'
                        print(f"  #{entry['rank']} FID {entry['fid']}: @{username} ({display_name}) - {entry['overallScore']} ({entry['tier']}) - PFP: {pfp}")
                        count += 1
                
                print(f"\n✅ {count} of top 20 entries have profile data")
                
            else:
                print("❌ Leaderboard API error")
        else:
            print("❌ Leaderboard request failed")
    except Exception as e:
        print(f"❌ Leaderboard test failed: {e}")
    
    print(f"\n💡 Note: Cached entries without profile data will be updated as their 1-week cache expires naturally.")
    print(f"New score calculations now include full profile data automatically.")

if __name__ == "__main__":
    main()
