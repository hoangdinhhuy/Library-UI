import sys
sys.path.insert(0, '.')

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

def _contains_any(haystack, needles):
    return any(n in haystack for n in needles)

# Load products
with open('../data/products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

# Test
p = [x for x in products if 'cream' in x.get('name','').lower()][0]

kw = _norm('xe')
title = _norm(p.get('title') or p.get('name'))
category = _norm(p.get('categoryName') or p.get('category'))
description = _norm(p.get('description') or p.get('short_description') or "")
text = f"{title} {category} {description}".strip()

print(f"Product: {p.get('name', 'N/A')[:70]}")
print(f"Title (norm): {title[:80]}")

# Vehicle terms from actual code
vehicle_terms = ["xe dap", "xe may", "oto", "o to", "xe hoi", "phuong tien"]
vehicle_brands = ["honda", "yamaha", "suzuki", "kawasaki", "vespa", "vinfast", "toyota", "hyundai", "kia", "ford", "mazda", "mercedes", "bmw", "audi"]
vehicle_model_terms = ["futura", "vision", "air blade", "sh mode", "lead", "r15", "wave", "winner", "pcx", "sh", "ex", "xr", "rebel"]

score = 0

# Check 1
if _contains_any(title, vehicle_terms):
    score += 3
    print(f"✓ Vehicle terms: +3")
    for term in vehicle_terms:
        if term in title:
            print(f"  -> Matched: {term}")

# Check 2
if _contains_any(title, vehicle_brands):
    score += 3
    print(f"✓ Vehicle brands: +3")

# Check 3
if _contains_any(title, vehicle_model_terms):
    score += 3
    print(f"✓ Vehicle models: +3")
    for term in vehicle_model_terms:
        if term in title:
            print(f"  -> Matched: {term}")

# Check 4
if "phuong tien" in category or "xe dap" in category or "xe hoi" in category:
    score += 1
    print(f"✓ Category: +1")

print(f"\nFinal score: {score}")
print(f"Threshold: >= 4")
print(f"Classified as: {'VEHICLE' if score >= 4 else 'NOT VEHICLE'}")
