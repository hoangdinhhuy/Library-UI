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
    description = _norm(product.get("description") or product.get("short_description") or "")
    text = f"{title} {category} {description}".strip()

    # Strong intent buckets (generic across keywords)
    if _contains_any(text, ["sach", "book", "giao trinh", "huong dan", "cam nang", "tu dien", "truyen", "tap chi"]):
        return "book"

    if _contains_any(text, ["do choi", "toy", "mo hinh", "model", "figure", "lego", "mini", "phien ban thu nho"]):
        return "toy"

    if _contains_any(text, ["dung cu", "tool", "do nghe", "sua chua", "repair", "bao duong", "do do", "tu vit", "co le"]):
        return "tool"

    if _contains_any(text, ["phu kien", "accessory", "op", "bao", "tui", "cap", "sac", "charger", "adapter", "hub", "dan man hinh", "gia do", "stand"]):
        return "accessory"

    # Keyword-aware disambiguation (examples: "xe", "laptop", ...)
    if kw in ("xe", "oto", "o to", "xe may", "xemay", "xe dap", "xedap", "car", "motor", "bike"):
        if _contains_any(text, ["xe dap", "xe may", "oto", "o to", "xe hoi", "motor", "scooter", "bike", "car"]):
            return "vehicle"

    if kw in ("laptop", "notebook", "may tinh", "may tinh xach tay"):
        # "laptop + ..." already caught by book/tool/accessory/toy above
        if _contains_any(text, ["laptop", "notebook", "may tinh", "may tinh xach tay"]):
            return "product"

    # Fallback: if it actually mentions the keyword, treat as product-ish; otherwise other
    if kw and (kw in text or _contains_any(text, kw.split())):
        return "product"

    return "other"


def groupByContext(products: List[Dict[str, Any]], keyword: str) -> Dict[str, List[Dict[str, Any]]]:
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for p in products or []:
        ctx = detectContext(p, keyword)
        grouped.setdefault(ctx, []).append(p)
    return grouped


def _context_label(keyword: str, context_id: str) -> str:
    kw = keyword.strip()
    mapping = {
        "vehicle": f"{kw} (phương tiện)",
        "book": f"Sách về {kw}" if kw else "Sách",
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
    Return alternative context suggestions sorted by product count (desc),
    excluding the selected_context.
    """
    counts: List[Tuple[str, int]] = [
        (ctx, len(items)) for ctx, items in grouped.items() if ctx != selected_context and len(items) > 0
    ]
    counts.sort(key=lambda x: x[1], reverse=True)
    suggestions = []
    for ctx, cnt in counts[:max_suggestions]:
        suggestions.append(
            {
                "context_id": ctx,
                "label": _context_label(keyword, ctx),
                "count": cnt,
            }
        )
    return suggestions


def pick_primary_context(grouped: Dict[str, List[Dict[str, Any]]]) -> str:
    if not grouped:
        return "other"
    return max(grouped.items(), key=lambda kv: len(kv[1]))[0]


def filter_by_context(products: List[Dict[str, Any]], keyword: str, context_id: str) -> List[Dict[str, Any]]:
    if not context_id:
        return products or []
    return [p for p in (products or []) if detectContext(p, keyword) == context_id]

