import sys
sys.path.insert(0, '.')

# Force reload
if 'context_detection' in sys.modules:
    del sys.modules['context_detection']

import json
from context_detection import detectContext

# Load products
with open('../data/products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

# Test - search for Polish specifically
matches = [x for x in products if 'polish' in x.get('name','').lower() or 'cream' in x.get('name','').lower()]
if matches:
    p = matches[0]
    print(f'Testing: {p.get("name", "N/A")[:60]}')
    result = detectContext(p, 'xe')
    print(f'Result: {result}')

# Check code
import inspect
source = inspect.getsource(detectContext)
if 'score >= 4' in source:
    print('\n✓ Code has score >= 4 threshold')
    # Print relevant lines
    for i, line in enumerate(source.split('\n')):
        if 'score' in line and '>=' in line:
            print(f'  Line: {line.strip()}')
else:
    print('\n✗ Code does NOT have score >= 4 threshold')
