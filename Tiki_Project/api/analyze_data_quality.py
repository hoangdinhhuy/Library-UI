import json
from collections import defaultdict

# Load products
with open('../data/products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

print("="*100)
print("COMPREHENSIVE DATA ANALYSIS FOR CONTEXT OPTIMIZATION")
print("="*100)

# Analyze all categories
categories = defaultdict(list)
for p in products:
    cat = p.get('category', 'unknown')
    categories[cat].append(p)

print(f"\n📊 Total products: {len(products)}")
print(f"📂 Categories: {len(categories)}")
print("\nCategory breakdown:")
for cat in sorted(categories.keys(), key=lambda k: len(categories[k]), reverse=True):
    print(f"  - {cat:25} : {len(categories[cat]):4} products")

# Analyze vehicle-related categories
print("\n" + "="*100)
print("VEHICLE-RELATED PRODUCT ANALYSIS")
print("="*100)

vehicle_related = [
    'o-to-xe-may',
    'the-thao-da-ngoai',
    'do-gia-dung',
    'phu-kien-xe',
]

vehicle_products = []
for p in products:
    if any(cat in p.get('category', '') for cat in vehicle_related):
        vehicle_products.append(p)

print(f"\nTotal vehicle-related products: {len(vehicle_products)}")

# Deep dive into o-to-xe-may category
print("\n" + "-"*100)
print("CATEGORY: o-to-xe-may (Auto & Motorcycle)")
print("-"*100)

auto_products = categories.get('o-to-xe-may', [])
print(f"\nTotal products: {len(auto_products)}")

# Analyze names to find real vehicles vs accessories
real_vehicles = []
accessories = []
tools = []
others = []

vehicle_keywords = ['honda', 'yamaha', 'suzuki', 'kawasaki', 'vespa', 'vinfast', 'toyota', 
                   'hyundai', 'kia', 'ford', 'mazda', 'mercedes', 'bmw', 'audi',
                   'future', 'vision', 'air blade', 'sh', 'pcx', 'winner', 'wave', 'ex']

accessory_keywords = ['bat', 'ao trum', 'guong', 'ap', 'bao', 'tui', 'cap', 'sac', 'op']
tool_keywords = ['bom', 'den', 'nuoc rua', 'dung cu', 'dau', 'sua chua']

for p in auto_products:
    name = p.get('name', '').lower()
    if any(kw in name for kw in vehicle_keywords):
        real_vehicles.append(p)
    elif any(kw in name for kw in accessory_keywords):
        accessories.append(p)
    elif any(kw in name for kw in tool_keywords):
        tools.append(p)
    else:
        others.append(p)

print(f"  Real vehicles (brands/models): {len(real_vehicles)}")
print(f"  Accessories: {len(accessories)}")
print(f"  Tools/maintenance: {len(tools)}")
print(f"  Others: {len(others)}")

print("\n  Sample real vehicles:")
for p in real_vehicles[:5]:
    print(f"    - {p.get('name', 'N/A')[:70]}")

print("\n  Sample accessories:")
for p in accessories[:5]:
    print(f"    - {p.get('name', 'N/A')[:70]}")

# Analyze the-thao-da-ngoai (Sports & Outdoors) for exercise bikes
print("\n" + "-"*100)
print("CATEGORY: the-thao-da-ngoai (Sports & Outdoors)")
print("-"*100)

sports_products = categories.get('the-thao-da-ngoai', [])
print(f"\nTotal products: {len(sports_products)}")

exercise_bikes = [p for p in sports_products if any(
    kw in p.get('name', '').lower() for kw in ['xe dap', 'dap tap', 'treadmill', 'gym']
)]

print(f"Exercise bikes/equipment: {len(exercise_bikes)}")
print("\nSample exercise equipment:")
for p in exercise_bikes[:5]:
    print(f"  - {p.get('name', 'N/A')[:70]}")

# Check book category for "xe" mentions
print("\n" + "-"*100)
print("CATEGORY: sach-truyen (Books & Novels)")
print("-"*100)

books = categories.get('sach-truyen', [])
print(f"\nTotal books: {len(books)}")

xe_books = [p for p in books if 'xe' in p.get('name', '').lower()]
print(f"Books mentioning 'xe': {len(xe_books)}")
print("\nBooks with 'xe':")
for p in xe_books:
    print(f"  - {p.get('name', 'N/A')[:70]}")

# Create data quality summary
print("\n" + "="*100)
print("DATA QUALITY FOR CONTEXT SUGGESTIONS")
print("="*100)

print("""
Based on analysis, recommended context thresholds:

✓ VEHICLE (xe phương tiện): REQUIRE actual vehicle data
  - Current: Only 20-30 real vehicle products in "o-to-xe-may" category
  - ISSUE: Over 46 products suggested, many are accessories/tools
  - ACTION: Only suggest if >= 10+ REAL vehicles found

✓ ACCESSORY (Phụ kiện xe): OKAY
  - Current: ~50+ accessories in category
  - ACTION: Safe to suggest

✓ TOOL (Dụng cụ): OKAY  
  - Current: ~100+ maintenance/repair items
  - ACTION: Safe to suggest

✓ TOY (Đồ chơi): LOW DATA
  - Current: Only 15 toys
  - ACTION: Only suggest if >= 10+ found, otherwise hide

✓ BOOK (Sách): VERY LOW DATA
  - Current: Only 1-2 genuine vehicle books
  - ACTION: Only suggest if >= 5+ found, otherwise hide
""")
