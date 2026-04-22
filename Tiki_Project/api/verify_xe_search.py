import json
from context_detection import detectContext, groupByContext, getSuggestedContexts, getContextLabel, pick_primary_context, filter_by_context

# Load products
with open('../data/products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

# Simulate a search for 'xe'
keyword = 'xe'
xe_products = [p for p in products if 'xe' in p.get('name', '').lower()]

# Analyze using the same logic as the API
grouped = groupByContext(xe_products, keyword)
primary_context = pick_primary_context(grouped)
suggestions = getSuggestedContexts(keyword, grouped, primary_context, max_suggestions=6)

print("="*80)
print(f"Search for: '{keyword}'")
print(f"Total products found: {len(xe_products)}")
print("="*80)
print(f"\nPrimary Context: {getContextLabel(keyword, primary_context)}")
print(f"Products in primary category: {len(grouped.get(primary_context, []))}")

print("\n" + "="*80)
print("SUGGESTIONS:")
print("="*80)
for suggestion in suggestions:
    ctx_id = suggestion['context_id']
    label = suggestion['label']
    count = suggestion['count']
    print(f"\n✓ {label} ({count} products)")
    # Show sample products
    sample_products = grouped.get(ctx_id, [])[:3]
    for p in sample_products:
        print(f"   - {p.get('name', 'N/A')[:70]}")
    if len(grouped.get(ctx_id, [])) > 3:
        print(f"   ... and {len(grouped.get(ctx_id, [])) - 3} more")

print("\n" + "="*80)
print("VERIFICATION:")
print("="*80)

# Check key products
test_cases = [
    ("Bạt Phủ Áo Trùm Xe Máy", "accessory"),
    ("Bộ 2 Gương Chiếu Hậu", "accessory"),
    ("Xe đạp tập thể dục", "tool"),
    ("Honda", "vehicle"),
]

print("\nExpected classifications:")
for product_name, expected_context in test_cases:
    matching = [p for p in xe_products if product_name.lower() in p.get('name', '').lower()]
    if matching:
        p = matching[0]
        actual_context = detectContext(p, keyword)
        status = "✓" if actual_context == expected_context else "✗"
        print(f"{status} {product_name[:40]}")
        print(f"   Expected: {expected_context}, Got: {actual_context}")
