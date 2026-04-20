import sys, logging
logging.basicConfig(level=logging.INFO)
sys.path.insert(0, ".")
from model_loader import ModelLoader
from config import settings
loader = ModelLoader(models_dir=settings.MODELS_PATH)
print("\nFinal model state:")
print(f"  KMeans: {loader.kmeans_model is not None}")
print(f"  Prophet: {loader.prophet_models is not None}")
print(f"  PhoBERT: {loader.phobert_available}")
