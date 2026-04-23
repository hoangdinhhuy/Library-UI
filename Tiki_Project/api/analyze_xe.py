import json
from context_detection import detectContext, groupByContext

# Load products
with open('../data/products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

# Find products with "xe" 
xe_products = [p for p in products if 'xe' in p.get('name', '').lower()]
print(f"Total products with 'xe': {len(xe_products)}\n")

# Analyze by context
keyword = 'xe'
grouped = groupByContext(xe_products, keyword)

print("Products grouped by context:\n")
for context, items in sorted(grouped.items(), key=lambda x: len(x[1]), reverse=True):
    print(f"\n{context.upper()} ({len(items)} products):")
    for p in items[:5]:
        print(f"  - {p.get('name', 'N/A')[:80]}")
        print(f"    Category: {p.get('category', 'N/A')}")
    if len(items) > 5:
        print(f"  ... and {len(items) - 5} more")

print("\n\n" + "="*80)
print("Analyzing why certain products are misclassified:\n")

# Check specific problem cases
problem_products = [
    "Bạt phủ áo trùm xe máy",
    "Bộ 2 gương chiếu hậu",
    "Xe đạp tập thể dục"
]

for prob_name in problem_products:
    matching = [p for p in xe_products if prob_name.lower() in p.get('name', '').lower()]
    if matching:
        p = matching[0]
        ctx = detectContext(p, 'xe')
        print(f"\nProduct: {p.get('name', 'N/A')[:80]}")
        print(f"Category: {p.get('category', 'N/A')}")
        print(f"Detected context: {ctx}")
