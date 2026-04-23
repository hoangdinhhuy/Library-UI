# 🚀 HƯỚNG DẪN DEPLOYMENT & TESTING - TIKI API

## 📁 CẤU TRÚC THƯ MỤC HIỆN TẠI

```
Tiki_Project/
├── api/              # Backend API
│   ├── main.py
│   ├── rag_engine.py
│   ├── data_loader.py
│   ├── model_loader.py
│   ├── search_engine_v2.py
│   ├── config.py
│   ├── requirements.txt
│   ├── .env
│   ├── DEPLOYMENT_GUIDE.md
│   ├── QUICKSTART.md
│   ├── README.md
│   └── verify_setup.py
├── chroma_db/        # ChromaDB vector database
├── data/             # products.json, reviews.json, timeseries.json
├── module/           # KMeans, Prophet, PhoBERT model folders
└── website/          # Frontend static app
```

---

## 🛠️ BƯỚC 1: SETUP BACKEND

### 1.1. Chuẩn bị thư mục

- `Tiki_Project/api/`: chứa backend API
- `Tiki_Project/data/`: chứa `products.json`, `reviews.json`, `timeseries.json`
- `Tiki_Project/chroma_db/`: chứa ChromaDB
- `Tiki_Project/module/`: chứa mô hình đã train
- `Tiki_Project/website/`: chứa frontend

### 1.2. Cài đặt dependencies

```bash
cd Tiki_Project/api
python -m venv venv

# Windows
venv\Scripts\activate
pip install -r requirements.txt

# Mac/Linux
source venv/bin/activate
pip install -r requirements.txt
```

### 1.3. Tạo `.env`

Tạo `Tiki_Project/api/.env` với nội dung:

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

> `MODELS_PATH=../module` là đường dẫn đúng với cấu trúc repo hiện tại.

---

## 🚀 BƯỚC 2: VERIFY SETUP

Chạy:

```bash
python verify_setup.py
```

**Nếu thành công:**
```
✅ .env file found
✅ Products data loaded
✅ Reviews data loaded
✅ Timeseries data loaded
✅ KMeans model found
✅ Prophet models found
✅ PhoBERT config found
✅ ChromaDB available
```

---

## 🚀 BƯỚC 3: CHẠY API

```bash
cd Tiki_Project/api
venv\Scripts\activate   # Windows
# hoặc source venv/bin/activate  # Mac/Linux
python main.py
```

**Truy cập:**
```
http://localhost:8000/docs
```

---

## 🌐 BƯỚC 4: CHẠY FRONTEND

### Option A: VS Code Live Server
1. Mở folder `Tiki_Project/website/`
2. Dùng Live Server mở `index.html`
3. Mở `http://127.0.0.1:5500`

### Option B: Python HTTP server
```bash
cd Tiki_Project/website
python -m http.server 5500
```

**Truy cập:**
```
http://localhost:5500
```

---

## 🧪 BƯỚC 5: TEST THỰC TẾ

### 5.1. Kiểm tra API

```bash
curl http://localhost:8000/health
```

### 5.2. Kiểm tra search

```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"keyword":"tai nghe bluetooth","market":"US","limit":10}'
```

### 5.3. Kiểm tra website

1. Mở `http://localhost:5500`
2. Nhập keyword
3. Nhấn Search
4. Kiểm tra box AI insight hiện lên

---

## 🐛 KHẮC PHỤC SỰ CỐ

### Lỗi 1: `ModuleNotFoundError: No module named 'fastapi'`

**Fix:**
```bash
pip install -r requirements.txt
```

### Lỗi 2: `FileNotFoundError: products.json`

**Fix:** kiểm tra `.env`:
```env
DATA_PATH=../data
```

### Lỗi 3: CORS error

**Fix:** thêm port frontend vào `api/main.py`:
```python
allow_origins=[
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]
```

### Lỗi 4: Chạy chậm do tải model

Lần đầu sẽ tải model embedding ~420MB.

```bash
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')"
```

---

## ✅ CHECKLIST

- [ ] `venv` đã activate
- [ ] `pip install -r requirements.txt`
- [ ] `.env` cấu hình đúng
- [ ] `verify_setup.py` chạy không lỗi
- [ ] API chạy `http://localhost:8000`
- [ ] Website truy cập được `http://localhost:5500`
- [ ] Search form hoạt động
- [ ] AI insight hiển thị đúng

---

## 🚀 NEXT STEPS

1. Thêm authentication
2. Thêm caching để tối ưu latency
3. Thêm logging và monitoring
4. Nâng cấp ChromaDB lên Pinecone/Weaviate khi mở rộng
