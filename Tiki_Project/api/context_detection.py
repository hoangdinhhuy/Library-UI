import re
import unicodedata
from typing import Any, Dict, List, Optional, Tuple


def _norm(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip().lower()
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _contains_any(haystack: str, needles: List[str]) -> bool:
    return any(n in haystack for n in needles)


def detectContext(product: Dict[str, Any], keyword: str) -> str:
    """
    Classify a product into a context bucket using lightweight heuristics.
    Returns a stable context_id (e.g. vehicle, book, accessory, toy, tool, product, other).
    """
    kw = _norm(keyword)

    title = _norm(product.get("title") or product.get("name"))
    category = _norm(product.get("categoryName") or product.get("category"))
    description = _norm(
        product.get("description") or product.get("short_description") or ""
    )
    text = f"{title} {category} {description}".strip()

    # ===== TOY CAR DETECTION (Highest Priority for toy cars) =====
    # Detect toy cars/models BEFORE general accessory to separate from vehicle parts
    toy_car_keywords = [
        "do choi xe",
        "toy car",
        "model car",
        "xe do choi",
        "mo hinh xe",
        "mo hinh o to",
        "xe hoi do choi",
        "die cast",
        "toy automobile",
        "model automobile",
    ]
    if _contains_any(text, toy_car_keywords):
        return "toy"

    # ===== ACCESSORY-SPECIFIC KEYWORDS (High Priority) =====
    # These clearly indicate a product is an accessory/part, not a vehicle
    accessory_keywords = [
        "phu kien",
        "accessory",
        "op",
        "bao",
        "tui",
        "cap",
        "sac",
        "charger",
        "adapter",
        "hub",
        "gia do",
        "stand",
        "dan man hinh",
        "bat phu",
        "bac phu",
        "ao trum",
        "guong",
        "guong chieu",
        "dau",  # headlight
        "den xe",
        "chuong",
        "horn",
        "gioang",
        "lo sanh",
        "thung",
    ]

    # ===== EXERCISE EQUIPMENT (Not real vehicles) =====
    exercise_keywords = [
        "tap the duc",
        "tap gym",
        "tap",  # catches "tập" in various contexts
        "xe tap",
        "xe tap the duc",
        "dap tap",
        "trong nha",
        "exercise",
        "indoor",
        "treadmill",
    ]

    # ===== TOOL/MAINTENANCE KEYWORDS =====
    tool_keywords = [
        "dung cu",
        "tool",
        "do nghe",
        "sua chua",
        "repair",
        "bao duong",
        "cham soc",
        "nuoc rua",
        "rua kinh",
        "dung dich",
        "ve sinh",
        "dau nhot",
        "dau phanh",
        "nuoc lam mat",
        "phu gia",
        "thay the",
        "the thu phi",
        "etag",
        "bom",  # pump
        "bom xe",
        "lap",  # cleaning/wiping
    ] + exercise_keywords  # Combine exercise equipment with tools

    # ===== BOOK DETECTION WITH CONTEXT =====
    # More strict: require multiple book indicators or specific book terms
    book_keywords = ["sach", "book", "giao trinh", "huong dan", "cam nang", "tu dien"]
    book_specific = ["sach", "book", "truyen", "tap chi"]
    # Only count as book if it has strong book indicators
    strong_book_indicators = (
        title.count("sach") + title.count("book") + title.count("truyen")
    )

    if strong_book_indicators > 0 or _contains_any(title, book_specific):
        # But NOT if it's just mentioning a vehicle type in the title
        # e.g., "Slam Dunk" or "Monster" shouldn't be classified as "Sách về xe"
        if kw in (
            "xe",
            "oto",
            "o to",
            "xe may",
            "xemay",
            "xe dap",
            "xedap",
            "car",
            "motor",
            "bike",
        ):
            # For vehicle keywords, only classify as book if it explicitly mentions vehicles/vehicle topics
            if _contains_any(
                text,
                ["ky", "nhat ky", "hanh trinh", "du lich", "huong dan", "cam nang"],
            ):
                return "book"
            elif _contains_any(title, ["xe", "oto", "motor", "bike", "dap"]):
                # Check if it's genuinely about vehicles (not just coincidentally has the word)
                vehicle_book_terms = [
                    "hanh trinh",
                    "nhat ky",
                    "du lich",
                    "cam nang",
                    "huong dan",
                    "ky su",
                    "lich su",
                ]
                if _contains_any(text, vehicle_book_terms):
                    return "book"
                # If just has the word "xe" but no context about it, skip book classification
                # (this is likely a manga/light novel that just happens to have "xe" in title)
        else:
            return "book"

    # ===== TOY/MODEL DETECTION =====
    if _contains_any(
        text,
        [
            "do choi",
            "toy",
            "mo hinh",
            "model",
            "figure",
            "lego",
            "mini",
            "phien ban thu nho",
        ],
    ):
        return "toy"

    # ===== TOOL DETECTION =====
    if _contains_any(text, tool_keywords):
        return "tool"

    # ===== PRIMARY: VEHICLE KEYWORD LOGIC =====
    if kw in (
        "xe",
        "oto",
        "o to",
        "xe may",
        "xemay",
        "xe dap",
        "xedap",
        "car",
        "motor",
        "bike",
    ):
        # First check: is this clearly an accessory/part?
        if _contains_any(text, accessory_keywords):
            return "accessory"

        # Second check: is this exercise equipment?
        if _contains_any(text, exercise_keywords):
            return "tool"

        # Now determine if it's a REAL vehicle vs just something that mentions "xe"
        # Be VERY specific to avoid false positives
        vehicle_terms = ["xe dap", "xe may", "oto", "o to", "xe hoi", "phuong tien"]
        # Generic terms like "motor", "scooter" removed to avoid duplicating checks below

        vehicle_brands = [
            "honda",
            "yamaha",
            "suzuki",
            "kawasaki",
            "vespa",
            "vinfast",
            "toyota",
            "hyundai",
            "kia",
            "ford",
            "mazda",
            "mercedes",
            "bmw",
            "audi",
        ]
        # Vehicle specific model/series names (NOT generic terms)
        vehicle_model_terms = [
            "futura",  # Honda Futura
            "future",  # Alias for Futura
            "vision",  # Honda Vision
            "air blade",  # Honda Air Blade
            "sh mode",  # Honda SH Mode - MUST include "mode" to avoid matching "sh" in other words
            "lead",  # Honda LEAD
            "r15",  # Yamaha R15
            "r3",  # Yamaha R3
            "wave",  # Honda Wave
            "winner",  # Hero MotoCorp Winner
            "pcx",  # Honda PCX
            "vario",  # Honda Vario
            "blade",  # Honda Blade (with context check)
            "click",  # Honda Click
            "scoopy",  # Honda Scoopy
            "sh",  # Honda SH (standalone, works in vehicle context)
            "ex",  # Honda EX
            "xr",  # Honda XR
            "rebel",  # Honda Rebel
            "phantom",  # Bajaj Phantom
            "pulsar",  # Bajaj Pulsar
            "xpulse",  # Hero XPulse
            "fascino",  # Hero Fascino
            "splendor",  # Hero Splendor
        ]

        score = 0
        has_strong_indicator = False

        # SCORING: Give points for vehicle indicators
        # Give points for explicit vehicle terms in title (highest priority)
        if _contains_any(title, vehicle_terms):
            score += 3
            has_strong_indicator = True
        # Brand names - STRONG indicator of real vehicle
        if _contains_any(title, vehicle_brands):
            score += 3
            has_strong_indicator = True
        # Model/series names - STRONG indicator
        if _contains_any(title, vehicle_model_terms):
            score += 3
            has_strong_indicator = True
        # Category hints - be very strict (o-to-xe-may has ~200 non-vehicle products)
        # Only count if we're very sure
        if "phuong tien" in category or "xe dap" in category or "xe hoi" in category:
            score += 1

        # THRESHOLD: score >= 3 and must have at least one strong indicator
        # This balances strictness with recall - allows "xe máy future" to pass
        # while still avoiding false positives for accessories
        if score >= 3 and has_strong_indicator:
            return "vehicle"

        return "accessory" if _contains_any(text, accessory_keywords) else "tool"

    if kw in ("laptop", "notebook", "may tinh", "may tinh xach tay"):
        # "laptop + ..." already caught by book/tool/accessory/toy above
        if _contains_any(text, ["laptop", "notebook", "may tinh", "may tinh xach tay"]):
            return "product"

    # Fallback: for vehicle-like keywords, DO NOT create a redundant "product" bucket.
    # If it contains the keyword but isn't a real vehicle, keep it in accessory/tool/other buckets above.
    if kw in (
        "xe",
        "oto",
        "o to",
        "xe may",
        "xemay",
        "xe dap",
        "xedap",
        "car",
        "motor",
        "bike",
    ):
        return "other"

    # Generic fallback: if it mentions the keyword, treat as product-ish; otherwise other
    if kw and (kw in text or _contains_any(text, kw.split())):
        return "product"

    return "other"


def groupByContext(
    products: List[Dict[str, Any]], keyword: str
) -> Dict[str, List[Dict[str, Any]]]:
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for p in products or []:
        ctx = detectContext(p, keyword)
        grouped.setdefault(ctx, []).append(p)
    return grouped


def _get_context_priority(context_id: str) -> int:
    """
    Return priority score for a context.
    Higher score = higher priority (will be picked as primary context).
    """
    priority_map = {
        "vehicle": 100,  # Highest: actual vehicles
        "accessory": 80,  # High: vehicle parts
        "toy": 70,  # Medium-high: toy cars and models
        "tool": 60,  # Medium: tools and maintenance
        "book": 50,  # Medium-low: books
        "product": 40,  # Low: generic products
        "other": 0,  # Lowest: miscellaneous
    }
    return priority_map.get(context_id, 0)


def _context_label(keyword: str, context_id: str) -> str:
    kw = keyword.strip()
    mapping = {
        "vehicle": f"{kw} (phương tiện)",
        "book": f"Sách có liên quan {kw}" if kw else "Sách",
        "tool": f"Dụng cụ liên quan {kw}" if kw else "Dụng cụ",
        "toy": f"Mô hình/đồ chơi {kw}" if kw else "Đồ chơi/mô hình",
        "accessory": f"Phụ kiện {kw}" if kw else "Phụ kiện",
        "product": f"{kw} (sản phẩm)",
        "other": f"Khác liên quan {kw}" if kw else "Khác",
    }
    return mapping.get(context_id, context_id)


def getContextLabel(keyword: str, context_id: str) -> str:
    return _context_label(keyword, context_id)


def getSuggestedContexts(
    keyword: str,
    grouped: Dict[str, List[Dict[str, Any]]],
    selected_context: str,
    max_suggestions: int = 6,
) -> List[Dict[str, Any]]:
    """
    Return alternative context suggestions sorted by PRIORITY first, then by count.
    Exclude the selected_context.

    IMPORTANT: Only suggest contexts if they have sufficient data quality.
    This prevents suggesting categories with insufficient/irrelevant products.

    Data quality thresholds (minimum products required):
    - vehicle: 10+ (real vehicles with brand/model)
    - accessory: 5+ (parts/accessories)
    - tool: 5+ (maintenance/tools)
    - toy: 5+ (models/toys - reduced from 8)
    - book: 5+ (books about the topic, not just mentioning keyword)
    """
    # Define minimum thresholds for each context
    min_thresholds = {
        "vehicle": 10,  # Only suggest if >= 10 real vehicles
        "accessory": 5,  # Safe threshold
        "tool": 5,  # Safe threshold
        "toy": 5,  # Reduced from 8+ to allow toy suggestions sooner
        "book": 5,  # Stricter - need quality books
        "product": 5,
        "other": 3,
    }

    counts: List[Tuple[str, int]] = [
        (ctx, len(items))
        for ctx, items in grouped.items()
        if ctx != selected_context and len(items) > 0
    ]
    # Sort by PRIORITY first, then by count (for display order)
    counts.sort(key=lambda x: (-_get_context_priority(x[0]), -x[1]))

    suggestions = []
    for ctx, cnt in counts:
        # Only include if meets minimum threshold
        min_count = min_thresholds.get(ctx, 3)
        if cnt >= min_count:
            suggestions.append(
                {
                    "context_id": ctx,
                    "label": _context_label(keyword, ctx),
                    "count": cnt,
                }
            )
            if len(suggestions) >= max_suggestions:
                break

    return suggestions


def pick_primary_context(grouped: Dict[str, List[Dict[str, Any]]]) -> str:
    """
    Pick primary context based on priority hierarchy.
    If multiple contexts have similar counts (at least 60% of largest),
    pick the one with highest priority. Otherwise, pick the one with most products.
    """
    if not grouped:
        return "other"

    if len(grouped) == 1:
        return list(grouped.keys())[0]

    # Get context counts
    context_counts = [(ctx, len(items)) for ctx, items in grouped.items()]

    # Sort by count to find the largest
    sorted_by_count = sorted(context_counts, key=lambda x: x[1], reverse=True)
    largest_count = sorted_by_count[0][1]

    # Find all contexts with at least 60% of largest count
    # This allows similar-sized contexts to compete on priority
    threshold = largest_count * 0.6
    candidates = [ctx for ctx, count in context_counts if count >= threshold]

    # If only one candidate, return it
    if len(candidates) == 1:
        return candidates[0]

    # Multiple candidates within threshold - pick by priority
    best_context = max(candidates, key=_get_context_priority)
    return best_context


def filter_by_context(
    products: List[Dict[str, Any]], keyword: str, context_id: str
) -> List[Dict[str, Any]]:
    if not context_id:
        return products or []
    return [p for p in (products or []) if detectContext(p, keyword) == context_id]
