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

from rag_engine import RAGEngine
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
rag_engine: Optional[RAGEngine] = None
data_loader: Optional[DataLoader] = None
model_loader: Optional[ModelLoader] = None
search_engine: Optional[SearchEngine] = None

# Request/Response models
class SearchRequest(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=200)
    market: str = Field(default="US")
    limit: int = Field(default=20, ge=1, le=50)

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
        # 1. Initialize RAG engine first so chromadb / onnxruntime load before pandas
        logger.info("🧠 Initializing RAG engine...")
        rag_engine = RAGEngine(
            gemini_api_key=settings.GEMINI_API_KEY,
            chroma_db_path=settings.CHROMA_DB_PATH,
            embedding_model_name=settings.EMBEDDING_MODEL
        )
        
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
            gemini_model=rag_engine.model
        )
        
        logger.info("✅ API Ready!")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise

def get_search_engine() -> SearchEngine:
    if search_engine is None:
        raise HTTPException(status_code=503, detail="Search engine not initialized")
    return search_engine

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
        products = engine.search_products(
            keyword=request.keyword,
            limit=request.limit,
            use_semantic=True
        )
        
        # Generate AI insight
        ai_insight = engine.generate_insight(
            products=products,
            keyword=request.keyword,
            include_ml_insights=True
        )
        
        return SearchResponse(
            success=True,
            data={
                "products": products,
                "ai_insight": ai_insight,
                "total_found": len(products)
            }
        )
        
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
        
        # Read CSV file
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        if 'keyword' not in df.columns:
            raise HTTPException(
                status_code=400,
                detail="CSV must have 'keyword' column"
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
