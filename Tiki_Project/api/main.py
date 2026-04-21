# ============================================================
# TIKI RAG API - FastAPI Server
# ============================================================

from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import time
import logging
from datetime import datetime
import io
from io import StringIO
import pandas as pd

from data_loader import DataLoader
from model_loader import ModelLoader
from search_engine_v2 import SearchEngine
from config import settings

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Tiki RAG API",
    description="E-commerce search API with AI insights",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
rag_engine: Optional[Any] = None
data_loader: Optional[DataLoader] = None
model_loader: Optional[ModelLoader] = None
search_engine: Optional[SearchEngine] = None

# Request/Response models
class SearchRequest(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=200)
    market: str = Field(default="US")
    limit: int = Field(default=9999, ge=1) 
    display_limit: int = Field(default=20, ge=1)
    context_id: Optional[str] = Field(default=None, max_length=50)

class Product(BaseModel):
    product_id: str
    title: str
    categoryName: str
    price: float
    rating: float
    boughtInLastMonth: int
    estimated_revenue: float

class SearchResponse(BaseModel):
    success: bool
    data: Dict[str, Any]

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    rag_engine_loaded: bool
    data_loaded: bool
    models_loaded: Dict[str, bool]

@app.on_event("startup")
async def startup_event():
    global rag_engine, data_loader, model_loader, search_engine
    
    logger.info("🚀 Starting Tiki RAG API...")
    
    try:
        # 1. Initialize RAG engine (optional). If onnx/chromadb fails, continue without semantic RAG.
        logger.info("🧠 Initializing RAG engine...")
        rag_engine = None
        try:
            from rag_engine import RAGEngine
            rag_engine = RAGEngine(
                gemini_api_key=settings.GEMINI_API_KEY,
                chroma_db_path=settings.CHROMA_DB_PATH,
                embedding_model_name=settings.EMBEDDING_MODEL
            )
            logger.info("✅ RAG engine ready")
        except Exception as rag_error:
            logger.warning(f"⚠️ RAG disabled due to dependency/runtime issue: {rag_error}")

        # 2. Load data files
        logger.info("📥 Loading data...")
        data_loader = DataLoader(data_dir=settings.DATA_PATH)
        
        # 3. Load models
        logger.info("🤖 Loading models...")
        model_loader = ModelLoader(models_dir=settings.MODELS_PATH)
        
        # 4. Initialize search engine
        logger.info("🔍 Initializing search engine...")
        search_engine = SearchEngine(
            data_loader=data_loader,
            model_loader=model_loader,
            rag_engine=rag_engine,
            gemini_model=rag_engine.model if rag_engine else None
        )
        
        logger.info("✅ API Ready!")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise

def get_search_engine() -> SearchEngine:
    if search_engine is None:
        raise HTTPException(status_code=503, detail="Search engine not initialized")
    return search_engine


class MarketReportRequest(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=200)
    context_id: Optional[str] = Field(default=None, max_length=50)

@app.post("/api/market-report")
async def market_report(
    request: MarketReportRequest,
    engine: SearchEngine = Depends(get_search_engine)
):
    try:
        logger.info(f"📊 Market report request: '{request.keyword}'")
        all_products = engine.search_products(keyword=request.keyword, limit=9999, use_semantic=True)
        ctx = engine.analyze_contexts(keyword=request.keyword, products=all_products, selected_context=request.context_id)
        filtered = ctx["filtered_products"]

        report = engine.generate_market_report(keyword=request.keyword, products=filtered)
        report["context"] = {
            "primary_context": ctx["primary_context"],
            "selected_context": ctx["selected_context"],
            "primary_context_label": ctx.get("primary_context_label"),
            "selected_context_label": ctx.get("selected_context_label"),
            "context_counts": ctx["context_counts"],
            "suggestions": ctx["suggestions"],
            "total_found_before_filter": len(all_products),
            "total_found_after_filter": len(filtered),
        }
        return {"success": True, "data": report}
    except Exception as e:
        logger.error(f"Market report failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market-insight")
async def market_insight():
    if not model_loader or not model_loader.kmeans_model:
        raise HTTPException(status_code=503, detail="KMeans model not loaded")
    if data_loader is None or data_loader.products_df is None or data_loader.products_df.empty:
        raise HTTPException(status_code=503, detail="Product data not loaded")
    try:
        df = data_loader.products_df.copy()
        cluster_ids, cluster_names_col = [], []
        for _, row in df.iterrows():
            cid, cname = model_loader.assign_cluster(
                float(row.get('price_normalized', 0)),
                float(row.get('rating_normalized', 0)),
                float(row.get('popularity_score', 0)),
            )
            cluster_ids.append(cid)
            cluster_names_col.append(cname)
        df['cluster_id']   = cluster_ids
        df['cluster_name'] = cluster_names_col

        cluster_summary = []
        for cid in sorted(df['cluster_id'].unique()):
            if cid < 0:
                continue
            sub = df[df['cluster_id'] == cid]
            avg_rating_orig = float(sub['original_rating'].mean())
            avg_pop = float(sub['popularity_score'].mean())
            top3 = sub.nlargest(3, 'popularity_score')
            top_products = []
            for _, r in top3.iterrows():
                top_products.append({
                    'product_id': str(r['product_id']), 'name': str(r['name']),
                    'category': str(r['category']), 'price': float(r['original_price']),
                    'rating': float(r['original_rating']), 'quantity_sold': int(r['quantity_sold']),
                })
            cluster_summary.append({
                'cluster_id': int(cid),
                'cluster_name': model_loader.cluster_names.get(cid, f'Cluster {cid}'),
                'product_count': int(len(sub)),
                'avg_price': round(float(sub['original_price'].mean()), 0),
                'avg_rating': round(avg_rating_orig, 2),
                'avg_popularity': round(avg_pop, 3),
                'avg_qty_sold': round(float(sub['quantity_sold'].mean()), 0),
                'top_category': str(sub['category'].mode().iloc[0]) if not sub.empty else '',
                'is_blue_ocean': avg_rating_orig < 2.0 and avg_pop > 2.0,
                'top_products': top_products,
            })

        blue_df = df[df['original_rating'] < 2.0].nlargest(15, 'popularity_score')
        blue_ocean_products = []
        for _, row in blue_df.iterrows():
            url = data_loader.resolve_product_url(row['product_id'], row['name'], row['category'])
            blue_ocean_products.append({
                'product_id': str(row['product_id']), 'name': str(row['name']),
                'category': str(row['category']), 'price': float(row['original_price']),
                'rating': float(row['original_rating']), 'quantity_sold': int(row['quantity_sold']),
                'popularity_score': round(float(row['popularity_score']), 3),
                'cluster_name': str(row['cluster_name']), 'url': url,
            })

        blue_ocean_count = int((df['original_rating'] < 2.0).sum())
        silhouette = 0.464  # from model metadata: silhouette_score
        if model_loader and hasattr(model_loader, 'kmeans_metadata'):
            silhouette = model_loader.kmeans_metadata.get('metrics', {}).get('silhouette_score', silhouette)
        max_popularity = float(df['popularity_score'].max()) if 'popularity_score' in df.columns else 10.0
        for c in cluster_summary:
            raw_opp = (c['avg_popularity'] / max(max_popularity, 1)) * (1 - c['avg_rating'] / 5) * 100
            c['opportunity_score'] = round(raw_opp, 1)
        return {'success': True, 'data': {
            'cluster_summary': cluster_summary,
            'blue_ocean_products': blue_ocean_products,
            'total_products': int(len(df)),
            'n_clusters': 5,
            'blue_ocean_count': blue_ocean_count,
            'silhouette_score': round(silhouette, 4),
            'max_popularity': round(max_popularity, 3),
        }}
    except Exception as e:
        logger.error(f"Market insight failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/")
async def root():
    return {
        "message": "Tiki RAG API",
        "version": "2.0.0",
        "docs": "/docs",
        "endpoints": {
            "search": "POST /api/search",
            "batch": "POST /api/analyze-batch",
            "health": "GET /health"
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        rag_engine_loaded=rag_engine is not None,
        data_loaded=data_loader is not None and not data_loader.products_df.empty,
        models_loaded={
            "kmeans": model_loader.kmeans_model is not None if model_loader else False,
            "prophet": model_loader.prophet_models is not None if model_loader else False,
            "phobert": model_loader.phobert_available if model_loader else False
        }
    )

@app.post("/api/search", response_model=SearchResponse)
async def search_products(
    request: SearchRequest,
    engine: SearchEngine = Depends(get_search_engine)
):
    """
    Search products by keyword (matches website expected format)
    
    Request:
    {
        "keyword": "tai nghe bluetooth",
        "market": "US",
        "limit": 20
    }
    
    Response:
    {
        "success": true,
        "data": {
            "products": [...],
            "ai_insight": "...",
            "total_found": 15
        }
    }
    """
    try:
        logger.info(f"🔍 Search request: '{request.keyword}' (limit: {request.limit})")
        
        # Search products
        # Bước 1: Tìm TẤT CẢ (không giới hạn)
        all_products = engine.search_products(
            keyword=request.keyword,
            limit=request.limit,       # = 9999 → lấy toàn bộ
            use_semantic=True
        )

        # Bước 2: Detect context + filter dataset (no crawl; re-analyze on existing dataset)
        ctx = engine.analyze_contexts(
            keyword=request.keyword,
            products=all_products,
            selected_context=request.context_id,
        )
        filtered = ctx["filtered_products"]

        # Bước 3: Insight phân tích từ sản phẩm ĐÚNG NGỮ CẢNH (primary/selected)
        ai_insight = engine.generate_insight(products=filtered, keyword=request.keyword, include_ml_insights=True)

        # Bước 4: Chỉ trả về display_limit sản phẩm cho UI
        return SearchResponse(success=True,data={
            "products": filtered[:request.display_limit],  # = 20 hiển thị (đúng ngữ cảnh)
            "ai_insight": ai_insight,
            "total_found": len(filtered),   # số thực tế (đúng ngữ cảnh)
            "context": {
                "primary_context": ctx["primary_context"],
                "selected_context": ctx["selected_context"],
                "primary_context_label": ctx.get("primary_context_label"),
                "selected_context_label": ctx.get("selected_context_label"),
                "context_counts": ctx["context_counts"],
                "suggestions": ctx["suggestions"],
                "total_found_before_filter": len(all_products),
                "total_found_after_filter": len(filtered),
            },
        })
        
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-batch", response_model=SearchResponse)
async def analyze_batch(
    file: UploadFile = File(...),
    engine: SearchEngine = Depends(get_search_engine)
):
    """
    Analyze batch of keywords from CSV file
    
    CSV format:
    keyword
    tai nghe
    laptop
    ...
    
    Response same as /api/search
    """
    try:
        logger.info(f"📂 Batch analysis request: {file.filename}")
        
        # Read CSV or Excel file
        contents = await file.read()
        filename = (file.filename or '').lower()

        if filename.endswith('.xlsx') or filename.endswith('.xls'):
            try:
                df = pd.read_excel(io.BytesIO(contents))
            except ImportError as exc:
                raise HTTPException(
                    status_code=400,
                    detail="Excel support requires 'openpyxl'. Please upload CSV or install openpyxl."
                ) from exc
        else:
            # Default to CSV to keep backward compatibility with current UI.
            # Try common encodings used by Excel/Windows exports so Vietnamese text is preserved.
            csv_text = None
            last_error = None
            for encoding in ('utf-8-sig', 'utf-8', 'cp1258', 'cp1252', 'latin1'):
                try:
                    csv_text = contents.decode(encoding)
                    break
                except UnicodeDecodeError as exc:
                    last_error = exc

            if csv_text is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Could not decode CSV file. Please save it as UTF-8 CSV. Details: {last_error}"
                )

            try:
                df = pd.read_csv(StringIO(csv_text))
            except Exception as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid CSV format: {exc}"
                ) from exc
        
        if 'keyword' not in df.columns:
            raise HTTPException(
                status_code=400,
                detail="File must have a 'keyword' column"
            )
        
        keywords = df['keyword'].dropna().astype(str).tolist()
        
        if not keywords:
            raise HTTPException(
                status_code=400,
                detail="No valid keywords found in CSV"
            )
        
        # Analyze batch
        result = engine.analyze_batch(keywords=keywords, limit_per_keyword=5)
        
        return SearchResponse(
            success=True,
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_stats():
    """Get API statistics"""
    stats = {
        "data": data_loader.get_stats() if data_loader else {},
        "models": model_loader.get_model_stats() if model_loader else {},
        "rag_documents": rag_engine.get_document_count() if rag_engine else 0
    }
    return stats

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )
