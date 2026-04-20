#!/usr/bin/env python3
# ============================================================
# API Test Script
# ============================================================
# Usage: python test_api.py
# Make sure API server is running first!

import requests
import time
import json
from typing import Dict, Any

# API configuration
API_BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("\n" + "="*70)
    print("TEST 1: Health Check")
    print("="*70)
    
    url = f"{API_BASE_URL}/health"
    response = requests.get(url)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200, "Health check failed!"
    assert response.json()["status"] == "healthy", "API not healthy!"
    print("✅ Health check passed!")

def test_stats():
    """Test stats endpoint"""
    print("\n" + "="*70)
    print("TEST 2: API Statistics")
    print("="*70)
    
    url = f"{API_BASE_URL}/stats"
    response = requests.get(url)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200, "Stats endpoint failed!"
    print("✅ Stats endpoint passed!")

def test_query(query: str, k: int = 5, verbose: bool = False) -> Dict[str, Any]:
    """Test ask endpoint with a query"""
    url = f"{API_BASE_URL}/ask"
    
    payload = {
        "query": query,
        "k": k,
        "verbose": verbose
    }
    
    start_time = time.time()
    response = requests.post(url, json=payload)
    elapsed = time.time() - start_time
    
    print(f"\n🔍 Query: {query}")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n💬 Answer:")
        print(result['answer'])
        print(f"\n📚 Sources: {result['metadata']['num_docs_retrieved']}")
        print(f"⏱️  Server time: {result['metadata']['total_time_ms']:.2f}ms")
        print(f"⏱️  Round-trip time: {elapsed*1000:.2f}ms")
        print("✅ Query successful!")
        return result
    else:
        print(f"❌ Query failed: {response.text}")
        return None

def test_vietnamese_queries():
    """Test Vietnamese queries"""
    print("\n" + "="*70)
    print("TEST 3: Vietnamese Queries")
    print("="*70)
    
    queries = [
        "Sản phẩm nào có rating cao nhất?",
        "Giá trung bình của category sách-truyện?",
        "Khách hàng phàn nàn gì về điện thoại?"
    ]
    
    for query in queries:
        test_query(query, k=5)
        time.sleep(1)  # Rate limiting

def test_english_queries():
    """Test English queries"""
    print("\n" + "="*70)
    print("TEST 4: English Queries")
    print("="*70)
    
    queries = [
        "Which products have the highest ratings?",
        "What is the average price of books?"
    ]
    
    for query in queries:
        test_query(query, k=5)
        time.sleep(1)

def main():
    """Run all tests"""
    print("🧪 Starting API Tests...")
    print(f"API URL: {API_BASE_URL}")
    
    try:
        # Test 1: Health
        test_health()
        
        # Test 2: Stats
        test_stats()
        
        # Test 3: Vietnamese queries
        test_vietnamese_queries()
        
        # Test 4: English queries
        test_english_queries()
        
        print("\n" + "="*70)
        print("✅ ALL TESTS PASSED!")
        print("="*70)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to API server!")
        print("Make sure the server is running at:", API_BASE_URL)
        print("\nStart server with: python main.py")
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")

if __name__ == "__main__":
    main()
