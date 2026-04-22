import json
import unicodedata
import re

# Copy of context_detection functions
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

def _contains_any(haystack: str, needles):
    return any(n in haystack for n in needles)

# Load products
with open('../data/products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

# Get the car polish product
p = [prod for prod in products if "Kem đánh bóng sơn xe ô tô" in prod.get('name', '')][0]

kw = _norm('xe')
title = _norm(p.get('title') or p.get('name'))
category = _norm(p.get('categoryName') or p.get('category'))
description = _norm(p.get('description') or p.get('short_description') or "")
text = f"{title} {category} {description}".strip()

print(f"Product: {p.get('name', 'N/A')[:70]}")
print(f"Keyword: {kw}")
print(f"Title (norm): {title[:70]}")
print(f"Category (norm): {category}")
print(f"Text (norm): {text[:70]}")

# Check all the keyword lists
accessory_keywords = [
    "phu kien", "accessory", "op", "bao", "tui", "cap", "sac", "charger", "adapter", "hub",
    "gia do", "stand", "dan man hinh", "bat phu", "bac phu", "ao trum", "guong", "guong chieu",
    "dau", "den xe", "chuong", "horn", "gioang", "lo sanh", "thung",
]

tool_keywords = [
    "dung cu", "tool", "do nghe", "sua chua", "repair", "bao duong", "cham soc", "nuoc rua",
    "rua kinh", "dung dich", "ve sinh", "dau nhot", "dau phanh", "nuoc lam mat", "phu gia",
    "thay the", "the thu phi", "etag", "bom", "bom xe", "lap",
    # + exercise keywords (tap the duc, tap gym, tap, etc.)
    "tap", "the duc", "gym", "exercise", "indoor"
]

print("\nKeyword checks:")
print(f"Contains accessory keywords? {_contains_any(text, accessory_keywords)}")
if _contains_any(text, accessory_keywords):
    for kw_item in accessory_keywords:
        if kw_item in text:
            print(f"  -> Matches: {kw_item}")

print(f"Contains tool keywords? {_contains_any(text, tool_keywords)}")
if _contains_any(text, tool_keywords):
    for kw_item in tool_keywords:
        if kw_item in text:
            print(f"  -> Matches: {kw_item}")
