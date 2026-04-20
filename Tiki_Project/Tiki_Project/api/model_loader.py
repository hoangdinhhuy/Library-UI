# ============================================================
# MODEL LOADER - Load All Trained Models
# ============================================================

import pickle
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import os

# Import pyspark stub FIRST to handle pickle compatibility
try:
    import pyspark_stub
except ImportError:
    pass

logger = logging.getLogger(__name__)

class ModelLoader:
    """
    Load and manage all trained models:
    - KMeans (clustering)
    - Prophet (forecasting)
    - PhoBERT (sentiment - config only)
    - ChromaDB already loaded by RAGEngine
    """
    
    def __init__(self, models_dir: str = "./models"):
        """
        Initialize model loader
        
        Args:
            models_dir: Path to models directory
        """
        self.models_dir = Path(models_dir)
        self.kmeans_model = None
        self.prophet_models = None
        self.prophet_metadata = None
        self.prophet_forecasts = None
        self.phobert_available = False
        
        self._load_all_models()
    
    def _load_all_models(self):
        """Load all available models"""
        logger.info("🤖 Loading trained models...")
        
        # 1. Load KMeans
        self._load_kmeans()
        
        # 2. Load Prophet
        self._load_prophet()
        
        # 3. Check PhoBERT availability
        self._check_phobert()
    
    def _load_kmeans(self):
        """Load KMeans clustering model"""
        try:
            # Try different possible paths
            possible_paths = [
                self.models_dir / "kmeans" / "kmeans_model.pkl",
                self.models_dir / "k_mean" / "kmeans_model_20260419_100129_model.pkl",
                self.models_dir / "KMeans_CLustering" / "KMeans_CLustering_Final" / "kmeans_model_20260419_150808_model.pkl",
            ]
            
            # Also look for any matching KMeans pickle under known folders
            kmeans_dir = self.models_dir / "KMeans_CLustering" / "KMeans_CLustering_Final"
            if kmeans_dir.exists():
                for path in kmeans_dir.glob("kmeans_model*.pkl"):
                    possible_paths.append(path)
            
            for kmeans_path in possible_paths:
                if kmeans_path.exists():
                    with open(kmeans_path, 'rb') as f:
                        self.kmeans_model = pickle.load(f)
                    logger.info(f"   ✅ KMeans loaded: {kmeans_path}")
                    return
            
            logger.warning("   ⚠️  KMeans model not found")
            
        except Exception as e:
            logger.error(f"   ❌ Failed to load KMeans: {e}")
    
    def _load_prophet(self):
        """Load Prophet forecasting models"""
        try:
            prophet_dir = self.models_dir / "Prophet"
            if not prophet_dir.exists():
                prophet_dir = self.models_dir / "prophet"
            if not prophet_dir.exists():
                prophet_dir = self.models_dir / "Prophet_models" / "prophet_models"
            
            if prophet_dir.exists():
                # Load models
                models_path = prophet_dir / "models_full.pkl"
                if not models_path.exists():
                    # Try with timestamp
                    models_files = list(prophet_dir.glob("models_full_*.pkl"))
                    if models_files:
                        models_path = models_files[0]
                
                if models_path.exists():
                    try:
                        with open(models_path, 'rb') as f:
                            self.prophet_models = pickle.load(f)
                        logger.info(f"   ✅ Prophet models loaded ({len(self.prophet_models)} products)")
                    except ModuleNotFoundError as e:
                        if 'pyspark.sql.metrics' in str(e):
                            logger.warning(f"   ⚠️  Prophet models loaded via pyspark stub (metrics ignored)")
                        else:
                            raise
                
                # Load metadata (skip on error to avoid cascading failures)
                try:
                    metadata_path = prophet_dir / "metadata.pkl"
                    if not metadata_path.exists():
                        metadata_files = list(prophet_dir.glob("metadata_*.pkl"))
                        if metadata_files:
                            metadata_path = metadata_files[0]
                    
                    if metadata_path.exists():
                        with open(metadata_path, 'rb') as f:
                            self.prophet_metadata = pickle.load(f)
                except ModuleNotFoundError as e:
                    if 'pyspark' not in str(e):
                        raise
                
                # Load forecasts (skip on error to avoid cascading failures)
                try:
                    forecasts_path = prophet_dir / "future_forecasts.pkl"
                    if not forecasts_path.exists():
                        forecast_files = list(prophet_dir.glob("future_forecasts_*.pkl"))
                        if forecast_files:
                            forecasts_path = forecast_files[0]
                    
                    if forecasts_path.exists():
                        with open(forecasts_path, 'rb') as f:
                            self.prophet_forecasts = pickle.load(f)
                        logger.info(f"   ✅ Prophet forecasts loaded")
                except ModuleNotFoundError as e:
                    if 'pyspark' not in str(e):
                        raise
            else:
                logger.warning("   ⚠️  Prophet models directory not found")
                
        except Exception as e:
            logger.error(f"   ❌ Failed to load Prophet: {e}")

    
    def _check_phobert(self):
        """Check if PhoBERT configs are available"""
        try:
            phobert_dir = self.models_dir / "PhoBert"
            if not phobert_dir.exists():
                phobert_dir = self.models_dir / "phobert"
            if not phobert_dir.exists():
                phobert_dir = self.models_dir / "Phobert_model"
            
            if phobert_dir.exists():
                config_path = phobert_dir / "config.json"
                if config_path.exists():
                    self.phobert_available = True
                    logger.info(f"   ✅ PhoBERT config found (base model will be used)")
                else:
                    logger.warning("   ⚠️  PhoBERT config not found")
            else:
                logger.warning("   ⚠️  PhoBERT directory not found")
                
        except Exception as e:
            logger.error(f"   ❌ Failed to check PhoBERT: {e}")
    
    def get_product_cluster(self, product_features: list) -> int:
        """
        Get cluster ID for a product
        
        Args:
            product_features: [price_normalized, rating_normalized, popularity_score]
            
        Returns:
            Cluster ID (0-4)
        """
        if self.kmeans_model is None:
            return -1
        
        try:
            import numpy as np
            features = np.array(product_features).reshape(1, -1)
            cluster = self.kmeans_model.predict(features)[0]
            return int(cluster)
        except Exception as e:
            logger.error(f"Cluster prediction failed: {e}")
            return -1
    
    def get_price_forecast(self, product_id: int) -> Optional[Dict]:
        """
        Get price forecast for a product
        
        Args:
            product_id: Product ID
            
        Returns:
            Forecast dict or None
        """
        if self.prophet_forecasts is None:
            return None
        
        try:
            if product_id in self.prophet_forecasts:
                forecast_df = self.prophet_forecasts[product_id]
                # Get last 7 days forecast
                last_7 = forecast_df.tail(7)
                
                return {
                    'product_id': product_id,
                    'forecast_dates': last_7['ds'].dt.strftime('%Y-%m-%d').tolist(),
                    'forecast_prices': last_7['yhat'].tolist(),
                    'lower_bound': last_7['yhat_lower'].tolist(),
                    'upper_bound': last_7['yhat_upper'].tolist(),
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Forecast retrieval failed: {e}")
            return None
    
    def get_model_stats(self) -> Dict[str, Any]:
        """Get statistics about loaded models"""
        return {
            'kmeans_loaded': self.kmeans_model is not None,
            'prophet_loaded': self.prophet_models is not None,
            'prophet_num_models': len(self.prophet_models) if self.prophet_models else 0,
            'phobert_available': self.phobert_available
        }
