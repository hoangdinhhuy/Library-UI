# Tiki RAG API

Backend FastAPI cho search sản phẩm Tiki với AI insight.

## 🚀 Tính năng chính
- Product Search với keyword / semantic search
- AI Insight bằng Google Gemini
- Batch CSV analysis
- KMeans clustering, Prophet forecasting, PhoBERT sentiment checks
- CORS ready cho frontend tĩnh

## 📁 Cấu trúc thư mục

```
Tiki_Project/
├── api/              # Backend FastAPI code
├── chroma_db/        # ChromaDB data store
├── data/             # products.json, reviews.json, timeseries.json
├── module/           # Trained model folders
└── website/          # Frontend app
```

## ⚙️ Cài đặt nhanh

```bash
cd Tiki_Project/api
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
```

Tạo file `.env` tại `Tiki_Project/api/`:

```env
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
DATA_PATH=../data
MODELS_PATH=../module
CHROMA_DB_PATH=../chroma_db
EMBEDDING_MODEL=paraphrase-multilingual-mpnet-base-v2
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO
```

## 🚀 Chạy backend

```bash
python main.py
```

Mở browser:

```
http://localhost:8000/docs
```

## 🌐 Chạy frontend

```bash
cd Tiki_Project/website
python -m http.server 5500
```

Mở browser:

```
http://localhost:5500
```

## 🔧 Lưu ý
- `DATA_PATH=../data` trỏ đến thư mục `Tiki_Project/data`
- `MODELS_PATH=../module` trỏ đến thư mục `Tiki_Project/module`
- `CHROMA_DB_PATH=../chroma_db` trỏ đến thư mục `Tiki_Project/chroma_db`

## 🔎 Test
- `/health` để kiểm tra trạng thái
- `/api/search` để tìm sản phẩm
- `/api/analyze-batch` để phân tích CSV
