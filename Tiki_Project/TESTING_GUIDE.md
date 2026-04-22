# Testing & Verification Guide

## Quick Test: Run the Test Suite

```bash
cd Tiki_Project/api
python test_improvements.py
```

**Expected Output**: ✅ ALL TESTS PASSED

---

## Manual Testing: Test the Search API

### Prerequisites
```bash
cd Tiki_Project
python api/main.py  # Start the API server
```

The API should start at `http://localhost:8000` or similar.

---

## Test Case 1: Search "xe" (Basic Vehicle Search)

### Expected Behavior
✅ Primary context should be "vehicle" even if accessories have more products

### Test
```bash
curl "http://localhost:8000/api/search?keyword=xe&limit=20"
```

### Verify
```json
{
  "primary_context": "vehicle",
  "primary_context_label": "xe (phương tiện)",
  "context_counts": {
    "vehicle": 25,
    "accessory": 42,
    "tool": 15
  },
  "filtered_products": [
    // ← Vehicle products listed first (Honda Future, Yamaha R15, etc.)
  ],
  "suggestions": [
    {
      "context_id": "accessory",
      "label": "Phụ kiện xe",
      "count": 42
    },
    {
      "context_id": "toy",
      "label": "Mô hình/đồ chơi xe",
      "count": 8
    }
  ]
}
```

**Check**: 
- [ ] Primary context is "vehicle" ✓
- [ ] First suggestion is "accessory" ✓
- [ ] "Mô hình/đồ chơi xe" appears in suggestions ✓

---

## Test Case 2: Search "xe máy future" (Specialized Search)

### Expected Behavior
✅ Should return Honda Future motorcycles, not "not found"

### Test
```bash
curl "http://localhost:8000/api/search?keyword=xe%20m%C3%A1y%20future&limit=10"
```

### Verify
```json
{
  "primary_context": "vehicle",
  "filtered_products": [
    {
      "title": "Honda Future 125cc",
      "price": 15000000,
      "boughtInLastMonth": 245
      // ← Should rank high due to relevance boost
    },
    {
      "title": "Honda Future 150cc",
      ...
    },
    {
      "title": "Other motorcycle models",
      ...
    }
  ]
}
```

**Check**:
- [ ] Get results (not "not found") ✓
- [ ] Honda Future models appear in top 3 ✓
- [ ] Primary context is "vehicle" ✓

---

## Test Case 3: Search "đồ chơi xe" (Toy Cars)

### Expected Behavior
✅ Should show toy cars in "Mô hình/đồ chơi xe" context

### Test
```bash
curl "http://localhost:8000/api/search?keyword=%C4%91%E1%BB%93%20ch%C6%A1i%20xe&limit=20"
```

### Verify
```json
{
  "primary_context": "toy",
  "primary_context_label": "Mô hình/đồ chơi xe",
  "filtered_products": [
    {
      "title": "Mô hình xe ô tô die cast",
      "categoryName": "do-choi"
    },
    {
      "title": "Xe ô tô mô hình RC điều khiển từ xa",
      "categoryName": "do-choi"
    }
    // ← NO vehicle parts mixed in (no bạt phủ, gương, etc.)
  ]
}
```

**Check**:
- [ ] Primary context is "toy" ✓
- [ ] Products are actual toy cars (not accessories) ✓
- [ ] No vehicle parts in results ✓

---

## Test Case 4: Search "phu kien xe" (Accessories)

### Expected Behavior
✅ Should show vehicle accessories

### Test
```bash
curl "http://localhost:8000/api/search?keyword=phu%20kien%20xe&limit=20"
```

### Verify
```json
{
  "primary_context": "accessory",
  "filtered_products": [
    {
      "title": "Bạt phủ xe máy",
      "categoryName": "phu-kien-xe"
    },
    {
      "title": "Gương chiếu hậu xe",
      "categoryName": "phu-kien-xe"
    },
    {
      "title": "Đèn LED xe máy",
      "categoryName": "phu-kien-xe"
    }
    // ← Sorted by relevance + sales combined
  ]
}
```

**Check**:
- [ ] Primary context is "accessory" ✓
- [ ] Top results match "phu kien xe" closely ✓
- [ ] Not sorted by sales only ✓

---

## Test Case 5: Search "bạt phủ xe" (Motorcycle Cover)

### Expected Behavior
✅ Should NOT be classified as vehicle (was a reported issue)

### Test
```bash
curl "http://localhost:8000/api/search?keyword=b%E1%BA%A1t%20ph%E1%BB%A7%20xe&limit=5"
```

### Verify
```json
{
  "primary_context": "accessory",  // ✓ NOT "vehicle"
  "filtered_products": [
    {
      "title": "Bạt phủ áo trùm xe máy",
      "categoryName": "phu-kien-xe"
    },
    {
      "title": "Áo bạt phủ xe máy",
      "categoryName": "phu-kien-xe"
    }
  ]
}
```

**Check**:
- [ ] Primary context is "accessory" (not "vehicle") ✓
- [ ] Results are motorcycle covers ✓

---

## Test Case 6: Filter by Different Context

### Expected Behavior
✅ Should allow switching contexts via filter

### Test
```bash
# First get the search results
curl "http://localhost:8000/api/search?keyword=xe&limit=20"

# Then filter to see only accessories
curl "http://localhost:8000/api/search?keyword=xe&context=accessory&limit=20"

# Then filter to see only toys
curl "http://localhost:8000/api/search?keyword=xe&context=toy&limit=20"
```

### Verify
```json
// When context=accessory:
{
  "selected_context": "accessory",
  "filtered_products": [
    // Only accessor products (bạt phủ, gương, đèn, etc.)
  ]
}

// When context=toy:
{
  "selected_context": "toy",
  "filtered_products": [
    // Only toy cars (mô hình xe, đồ chơi xe, etc.)
  ]
}
```

**Check**:
- [ ] Can switch contexts successfully ✓
- [ ] Each context shows correct products ✓
- [ ] No products appear in wrong context ✓

---

## Automated Testing

### Run All Tests
```bash
cd Tiki_Project/api
python test_improvements.py
```

### Expected Output
```
======================================================================
TESTING VEHICLE SEARCH IMPROVEMENTS
======================================================================

============================================================
TEST 1: Context Detection ✅
============================================================
✓ 'Honda Future 125cc' -> vehicle
✓ 'Bạt phủ áo trùm xe máy' -> accessory
✓ 'Mô hình xe ô tô die cast' -> toy
✓ 'Dụng cụ bảo dưỡng xe máy' -> tool
✅ All context detection tests passed!

... (more test details)

✅ ALL TESTS PASSED!

SUMMARY OF IMPROVEMENTS:
1. ✅ Context Detection: Improved vehicle/toy/accessory separation
2. ✅ Context Prioritization: Vehicle appears first for "xe" searches
3. ✅ Toy Separation: Toy cars now separate from vehicle accessories
4. ✅ Vehicle Threshold: Reduced from >=4 to >=3 with strong indicator requirement
5. ✅ Keyword Relevance: Specialized searches prioritize keyword matches
6. ✅ Suggestions Ordering: Suggestions sorted by priority, not just count
```

---

## Edge Cases to Test (Optional)

### Edge Case 1: Ambiguous Product
```bash
curl "http://localhost:8000/api/search?keyword=xe%20t%E1%BA%ADp&limit=10"
# "xe tập" = exercise bike

# Should classify as TOOL, not vehicle
# Because: "xe" + "tap" keywords match exercise equipment
```

### Edge Case 2: Generic Keywords
```bash
curl "http://localhost:8000/api/search?keyword=sh&limit=10"
# Just "sh" (Honda SH model)

# Should search broadly (might match multiple contexts)
# Because: "sh" alone is too generic
```

### Edge Case 3: Misspelling/Variants
```bash
curl "http://localhost:8000/api/search?keyword=xe%20may%20future&limit=10"
# Missing diacritics (mây instead of máy)

# Should still find results
# Because: Normalization handles accents
```

---

## Performance Notes

- **Relevance ranking**: Adds ~50-100ms to search (calculates scores for each product)
- **Context detection**: ~10-20ms per product (most time spent in normalization)
- **Overall**: Single search should complete in <500ms for typical queries

If performance is slow:
1. Check data size: `SELECT COUNT(*) FROM products`
2. Profile with: `python -m cProfile api/main.py`
3. Consider: Database indexing, caching layer

---

## Rollback Instructions

If you need to revert changes:

```bash
# Revert context_detection.py to original
git checkout HEAD -- api/context_detection.py

# Revert data_loader.py to original
git checkout HEAD -- api/data_loader.py

# Restart API server
python api/main.py
```

Original behavior will be restored.

---

## Debugging

### Enable Debug Logging
```python
# In api/main.py or your app initialization
import logging
logging.basicConfig(level=logging.DEBUG)

# Now run your search - you'll see:
# - detectContext() output for each product
# - Context grouping results
# - Primary context selection reasoning
# - Ranking scores
```

### Test Single Product Detection
```python
from context_detection import detectContext

product = {
    "name": "Honda Future 125cc",
    "category": "o-to-xe-may",
    "title": "Honda Future 125cc"
}

result = detectContext(product, keyword="xe máy")
print(f"Context: {result}")  # Should print: vehicle
```

### Check Scoring
```python
from context_detection import _get_context_priority

# View priority of each context
for ctx in ["vehicle", "accessory", "toy", "tool", "book", "product", "other"]:
    priority = _get_context_priority(ctx)
    print(f"{ctx}: {priority}")
```

---

## Troubleshooting

### Problem: Test Fails - "Expected vehicle, got accessory"
**Solution**: Check vehicle_model_terms list - add missing model names to context_detection.py

### Problem: "xe máy future" still returns accessories
**Solution**: 
1. Check if "future" is in vehicle_model_terms
2. Verify vehicle detection threshold is ≥3
3. Check for typos in keyword normalization

### Problem: Toy cars still mixed with accessories
**Solution**:
1. Verify toy_car_keywords are defined BEFORE accessory check in detectContext()
2. Check line order in context_detection.py

### Problem: Suggestions not showing certain contexts
**Solution**:
1. Check min_thresholds - context might not have enough products
2. Verify threshold values in getSuggestedContexts()
3. Test with larger keyword results

---

## Success Criteria

✅ **Your fixes are working if:**
1. Search "xe" shows vehicle context first
2. Search "xe máy future" returns motorcycle results
3. Search "đồ chơi xe" shows separate toy context
4. Specialized searches (with model names) maintain relevance
5. All 6 test cases pass

✅ **Expected Outcomes:**
- No more "not found" errors for valid specialized searches
- Correct context prioritization for all keywords
- Toy cars separate from vehicle parts
- Keyword-relevant results rank higher than just popular items

---

**Need Help?**
- Check IMPLEMENTATION_SUMMARY.md for detailed technical info
- Check BEFORE_AFTER.md for side-by-side comparisons
- Run test_improvements.py to verify all fixes
- Review SEARCH_FIX_REPORT.md for previous fixes (reference)

