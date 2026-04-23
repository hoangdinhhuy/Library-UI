"""
Test script for API endpoints
Run this AFTER the server is running (python main.py)
"""

import requests
import json
import time
from pathlib import Path

API_BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test health check endpoint"""
    print("\n" + "="*60)
    print("🏥 Testing Health Check...")
    print("="*60)
    
    try:
        response = requests.get(f"{API_BASE_URL}/")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Health check passed!")
            return True
        else:
            print("❌ Health check failed!")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\n⚠️  Make sure the server is running:")
        print("   python main.py")
        return False

def test_search_endpoint():
    """Test search endpoint"""
    print("\n" + "="*60)
    print("🔍 Testing Search Endpoint...")
    print("="*60)
    
    test_cases = [
        {
            "keyword": "tai nghe bluetooth",
            "market": "US",
            "limit": 10
        },
        {
            "keyword": "điện thoại samsung",
            "market": "US",
            "limit": 5
        },
        {
            "keyword": "laptop gaming",
            "market": "US",
            "limit": 15
        }
    ]
    
    for i, payload in enumerate(test_cases, 1):
        print(f"\n--- Test Case {i} ---")
        print(f"Keyword: {payload['keyword']}")
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{API_BASE_URL}/api/search",
                json=payload,
                timeout=30
            )
            elapsed = time.time() - start_time
            
            print(f"Status Code: {response.status_code}")
            print(f"Response Time: {elapsed:.2f}s")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    result = data.get('data', {})
                    products = result.get('products', [])
                    ai_insight = result.get('ai_insight', '')
                    total = result.get('total_found', 0)
                    
                    print(f"✅ Found {total} products")
                    print(f"   Returned: {len(products)} products")
                    if ai_insight:
                        print(f"   AI Insight: {ai_insight[:100]}...")
                    
                    # Show first product
                    if products:
                        print(f"\n   First product:")
                        prod = products[0]
                        print(f"   - ID: {prod.get('product_id')}")
                        print(f"   - Name: {prod.get('name', '')[:50]}...")
                        print(f"   - Price: {prod.get('price', 0):,} VNĐ")
                        print(f"   - Rating: {prod.get('rating', 0)}")
                else:
                    print(f"❌ Search failed: {data.get('error')}")
            else:
                print(f"❌ Request failed: {response.text}")
        
        except requests.Timeout:
            print("❌ Request timeout (>30s)")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        # Wait between requests
        if i < len(test_cases):
            time.sleep(1)

def test_batch_endpoint():
    """Test batch analysis endpoint"""
    print("\n" + "="*60)
    print("📊 Testing Batch Analysis Endpoint...")
    print("="*60)
    
    # Create test CSV
    csv_content = """keyword,market
tai nghe,US
điện thoại,US
laptop,US"""
    
    csv_path = Path("test_keywords.csv")
    csv_path.write_text(csv_content, encoding='utf-8')
    print(f"✓ Created test CSV: {csv_path}")
    
    try:
        with open(csv_path, 'rb') as f:
            files = {'file': ('test_keywords.csv', f, 'text/csv')}
            
            print("\nUploading CSV and analyzing...")
            start_time = time.time()
            response = requests.post(
                f"{API_BASE_URL}/api/analyze-batch",
                files=files,
                timeout=60
            )
            elapsed = time.time() - start_time
            
            print(f"Status Code: {response.status_code}")
            print(f"Response Time: {elapsed:.2f}s")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    result = data.get('data', {})
                    products = result.get('products', [])
                    ai_insight = result.get('ai_insight', '')
                    keywords_processed = result.get('keywords_processed', 0)
                    
                    print(f"✅ Batch analysis successful!")
                    print(f"   Keywords processed: {keywords_processed}")
                    print(f"   Total products: {len(products)}")
                    if ai_insight:
                        print(f"   AI Insight: {ai_insight[:150]}...")
                else:
                    print(f"❌ Batch analysis failed: {data.get('error')}")
            else:
                print(f"❌ Request failed: {response.text}")
    
    except requests.Timeout:
        print("❌ Request timeout (>60s)")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        # Cleanup
        if csv_path.exists():
            csv_path.unlink()
            print(f"\n✓ Cleaned up {csv_path}")

def main():
    print("🧪 TIKI API ENDPOINT TESTING")
    print("="*60)
    print(f"Testing API at: {API_BASE_URL}")
    print("="*60)
    
    # Test 1: Health check
    if not test_health_check():
        print("\n⚠️  Server is not running. Please start it first:")
        print("   python main.py")
        return
    
    # Test 2: Search endpoint
    test_search_endpoint()
    
    # Test 3: Batch endpoint
    test_batch_endpoint()
    
    print("\n" + "="*60)
    print("✅ All tests completed!")
    print("="*60)
    print("\n📖 Check the results above to verify API functionality.")

if __name__ == "__main__":
    main()
