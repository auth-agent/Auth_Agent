import asyncio
import aiohttp
import json

async def test_post_with_real_flow():
    """Test the full POST flow with a real request_id"""
    print("=" * 60)
    print("Testing POST /api/agent/authenticate")
    print("=" * 60)
    
    # First, let's go through the authorize flow to get a real request_id
    # For now, let's check if we can manually create one or trace through logs
    
    # Test payload structure
    test_payload = {
        'request_id': 'req_test123',  # This will fail, but shows the structure
        'agent_id': 'agent_mt7XkrbQSKoDLN1l',
        'agent_secret': 'yf3U2h-eTQCIyGGOsYwTWpr5_BsmtrnI1QZjeHcKGY4',
        'model': 'browser-use'
    }
    
    url = 'https://clever-pika-819.convex.site/api/agent/authenticate'
    
    print(f"\n📤 Sending POST to: {url}")
    print(f"📦 Payload:")
    print(json.dumps(test_payload, indent=2))
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(url, json=test_payload) as response:
                status = response.status
                headers = dict(response.headers)
                data = await response.json()
                
                print(f"\n📥 Response Status: {status}")
                print(f"📋 Response Headers:")
                for k, v in headers.items():
                    print(f"   {k}: {v}")
                print(f"\n📄 Response Body:")
                print(json.dumps(data, indent=2))
                
                if status == 200:
                    print("\n✅ POST request SUCCEEDED!")
                elif status == 400:
                    print(f"\n⚠️  POST request reached server but failed: {data.get('error_description')}")
                else:
                    print(f"\n❌ POST request failed with status {status}")
                    
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_post_with_real_flow())
