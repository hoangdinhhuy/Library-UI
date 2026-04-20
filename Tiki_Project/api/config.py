# ============================================================
# CONFIGURATION - Environment Settings
# ============================================================

import os
from pathlib import Path
from pydantic import BaseSettings, Field
from typing import Optional

ROOT_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables or .env file
    """
    
    # Gemini API
    GEMINI_API_KEY: str = Field(
        ...,
        env="GEMINI_API_KEY",
        description="Google Gemini API Key"
    )
    
    # ChromaDB
    CHROMA_DB_PATH: str = Field(
        default=str(ROOT_DIR / "chroma_db"),
        env="CHROMA_DB_PATH",
        description="Path to ChromaDB database directory"
    )
    
    # Data Path
    DATA_PATH: str = Field(
        default=str(ROOT_DIR / "data"),
        env="DATA_PATH",
        description="Path to data directory"
    )
    
    # Models Path
    MODELS_PATH: str = Field(
        default=str(ROOT_DIR / "module"),
        env="MODELS_PATH",
        description="Path to models directory"
    )
    
    # Embedding Model
    EMBEDDING_MODEL: str = Field(
        default="paraphrase-multilingual-mpnet-base-v2",
        env="EMBEDDING_MODEL",
        description="Sentence-Transformers model name"
    )
    
    # API Server
    API_HOST: str = Field(
        default="0.0.0.0",
        env="API_HOST",
        description="API server host"
    )
    
    API_PORT: int = Field(
        default=8000,
        env="API_PORT",
        description="API server port"
    )
    
    # Logging
    LOG_LEVEL: str = Field(
        default="INFO",
        env="LOG_LEVEL",
        description="Logging level (DEBUG, INFO, WARNING, ERROR)"
    )
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

# Create global settings instance
settings = Settings()
