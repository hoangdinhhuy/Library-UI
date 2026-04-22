import json
from context_detection import detectContext, groupByContext

# Load products
with open('../data/products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

keyword = 'xe'
xe_products = [p for p in products if 'xe' in p.get('name', '').lower()]
grouped = groupByContext(xe_products, keyword)

print("="*100)
print("DEBUG: VEHICLE CLASSIFICATION")
print("="*100)

vehicles = grouped.get('vehicle', [])
print(f"\nTotal classified as VEHICLE: {len(vehicles)}")
print("\nVehicle products with analysis:")

real_vehicles = []
questionable = []

vehicle_brands = [
    "honda", "yamaha", "suzuki", "kawasaki", "vespa", "vinfast", 
    "toyota", "hyundai", "kia", "ford", "mazda", "mercedes", "bmw", "audi"
]

for p in vehicles:
    name = p.get('name', '').lower()
    has_brand = any(brand in name for brand in vehicle_brands)
    has_purchase_voucher = 'phieu' in name or 'voucher' in name
    
    if has_brand or has_purchase_voucher:
        real_vehicles.append(p)
    else:
        questionable.append(p)

print(f"\n✓ REAL vehicles (with brand/model): {len(real_vehicles)}")
for p in real_vehicles[:10]:
    print(f"  - {p.get('name', 'N/A')[:70]}")

print(f"\n⚠️  QUESTIONABLE: {len(questionable)}")
for p in questionable[:10]:
    print(f"  - {p.get('name', 'N/A')[:70]}")
    print(f"    Category: {p.get('category', 'N/A')}")

print("\n" + "="*100)
print(f"ANALYSIS:")
print(f"  - Real vehicle products: {len(real_vehicles)} (meets 10+ threshold? {len(real_vehicles) >= 10})")
print(f"  - Current suggestion: SHOWING (should be {'SHOWN' if len(real_vehicles) >= 10 else 'HIDDEN'})")
print("="*100)
