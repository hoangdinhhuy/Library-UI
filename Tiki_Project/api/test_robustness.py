import json
from context_detection import detectContext, groupByContext

# Load products
with open('../data/products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

# Test multiple keywords to ensure robustness
test_keywords = ['xe', 'laptop', 'sach', 'dien thoai']

print("="*80)
print("ROBUSTNESS TEST: Multiple Keywords")
print("="*80)

for keyword in test_keywords:
    matching = [p for p in products if keyword in p.get('name', '').lower()]
    if matching:
        grouped = groupByContext(matching, keyword)
        print(f"\n🔍 Keyword: '{keyword}'")
        print(f"   Total products: {len(matching)}")
        for ctx in sorted(grouped.keys(), key=lambda k: len(grouped[k]), reverse=True):
            count = len(grouped[ctx])
            print(f"   - {ctx:12} : {count:4} products")

print("\n" + "="*80)
print("EDGE CASES TEST")
print("="*80)

# Test edge cases
edge_cases = [
    ("Bạt Phủ Áo Trùm Xe Máy Vải Dù", "xe", "accessory"),
    ("Sách Những Chiếc Xe Hiệp Sĩ", "xe", "book"),  
    ("Xe Đạp Tập Thể Dục BG 8701", "xe", "tool"),
    ("Phiếu Mua Hàng Xe Máy Honda", "xe", "vehicle"),
]

print("\nEdge case classifications:")
for product_name, kw, expected in edge_cases:
    # Find closest match
    matching = [p for p in products if product_name[:30].lower() in p.get('name', '').lower()]
    if matching:
        detected = detectContext(matching[0], kw)
        status = "✓" if detected == expected else "✗"
        print(f"{status} {product_name[:45]:45} → {detected:10} (expected: {expected})")
    else:
        print(f"✗ {product_name[:45]:45} → NOT FOUND")
