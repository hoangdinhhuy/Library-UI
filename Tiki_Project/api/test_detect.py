import json
from context_detection import detectContext

# Load products
with open('../data/products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

# Test specific products
test_products = [
    "Kem đánh bóng sơn xe ô tô (Car Cream)",
    "Xe Máy Honda LEAD 125cc 2026",
    "Combo 2 Khăn Lau Xe Ô Tô",
]

print("Testing detectContext function:\n")

for test_name in test_products:
    # Find matching product
    matching = [p for p in products if test_name[:30].lower() in p.get('name', '').lower()]
    if matching:
        p = matching[0]
        ctx = detectContext(p, 'xe')
        print(f"Product: {p.get('name', 'N/A')[:60]}")
        print(f"  Category: {p.get('category', 'N/A')}")
        print(f"  Context: {ctx}")
        print()
