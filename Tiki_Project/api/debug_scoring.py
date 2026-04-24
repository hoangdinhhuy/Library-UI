import json
import unicodedata
import re

def _norm(value):
    if value is None:
        return ""
    text = str(value).strip().lower()
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()

def _contains_any(haystack: str, needles: list) -> bool:
    return any(n in haystack for n in needles)

# Load products
with open('../data/products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

# Test "Kem đánh bóng sơn xe ô tô"
p = [prod for prod in products if "Kem đánh bóng sơn xe ô tô" in prod.get('name', '')][0]

print("="*80)
print(f"DEBUGGING: {p.get('name', 'N/A')[:70]}")
print("="*80)

title = _norm(p.get('name'))
category = _norm(p.get('category'))

print(f"\nNormalized title: {title}")
print(f"Normalized category: {category}")

vehicle_terms = ["xe dap", "xe may", "oto", "o to", "xe hoi", "motor", "scooter", "bike", "car", "phuong tien"]
vehicle_brands = ["honda", "yamaha", "suzuki"]
vehicle_model_terms = ["futura", "vision", "air blade", "sh"]

score = 0
print("\nScore calculation:")

# Check 1
check1 = _contains_any(title, ["xe dap", "xe may", "oto", "o to", "xe hoi", "phuong tien"])
if check1:
    score += 3
    print(f"  ✓ Contains vehicle term words: +3 (NOW: {score})")
else:
    print(f"  ✗ No vehicle term words: +0")

# Check 2
check2 = _contains_any(title, vehicle_brands)
if check2:
    score += 3
    print(f"  ✓ Contains brand name: +3 (NOW: {score})")
else:
    print(f"  ✗ No brand name: +0")

# Check 3
check3 = _contains_any(title, vehicle_model_terms)
if check3:
    score += 3
    print(f"  ✓ Contains model term: +3 (NOW: {score})")
else:
    print(f"  ✗ No model term: +0")

# Check 4
check4 = _contains_any(title, vehicle_terms)
if check4:
    score += 1
    print(f"  ✓ Contains generic vehicle term: +1 (NOW: {score})")
else:
    print(f"  ✗ No generic term: +0")

# Check 5
check5 = ("phuong tien" in category or "xe dap" in category or "xe hoi" in category)
if check5:
    score += 1
    print(f"  ✓ Category matches: +1 (NOW: {score})")
else:
    print(f"  ✗ Category doesn't match: +0")

print(f"\nFinal score: {score}")
print(f"Threshold: >= 4")
print(f"Result: {'VEHICLE' if score >= 4 else 'NOT VEHICLE'}")
