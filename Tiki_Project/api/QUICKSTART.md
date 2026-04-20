# ⚡ QUICK START - Chạy Thử Trong 5 Phút

## 🎯 Yêu cầu trước khi bắt đầu
- Python 3.8 hoặc mới hơn đã cài đặt
- Folder repo hiện có:
  - `Tiki_Project/api/`
  - `Tiki_Project/data/`
  - `Tiki_Project/chroma_db/`
  - `Tiki_Project/module/`
  - `Tiki_Project/website/`

---

## 📁 Bước 1: Xác nhận cấu trúc thư mục

```
Tiki_Project/
├── api/              # Backend FastAPI code
├── chroma_db/        # ChromaDB store
├── data/             # products.json, reviews.json, timeseries.json
├── module/           # Trained models (KMeans, Prophet, PhoBERT)
└── website/          # Frontend app
```

> Lưu ý: backend được chạy từ `Tiki_Project/api/` và các path trong `.env` trỏ ra ngoài `api/`.

---

## ⚙️ Bước 2: Setup Backend

```bash
cd Tiki_Project/api
python -m venv venv
```

### Windows
```bash
venv\Scripts\activate
pip install -r requirements.txt
```

### Mac/Linux
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Tạo file `.env`

Tạo file mới `Tiki_Project/api/.env` với nội dung:

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

> Nếu không có `.env.example`, bạn vẫn có thể tạo thẳng file `.env`.

---

## ✅ Bước 3: Verify cấu hình

Chạy:

```bash
python verify_setup.py
```

**Kết quả mong đợi:**
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

## 🚀 Bước 4: Chạy API

```bash
python main.py
```

**Mở browser:**
```
http://localhost:8000/docs
```

---

## 🌐 Bước 5: Chạy Frontend

### Option A: Live Server (VS Code)
1. Mở folder `Tiki_Project/website/`
2. Dùng Live Server mở `index.html`
3. Mở `http://127.0.0.1:5500`

### Option B: Python HTTP server
```bash
cd Tiki_Project/website
python -m http.server 5500
```

Mở browser:
```
http://localhost:5500
```

---

## 🧪 Bước 6: Test nhanh

### API health check
```bash
curl http://localhost:8000/health
```

### Search endpoint
```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"keyword":"tai nghe bluetooth","market":"US","limit":10}'
```

### Website
1. Mở web `http://localhost:5500`
2. Nhập từ khóa
3. Nhấn Search
4. Kiểm tra AI insight hiển thị

---

## 🐛 Một số lỗi thường gặp

- `ModuleNotFoundError`: chạy `pip install -r requirements.txt`
- `FileNotFoundError: products.json`: kiểm tra `DATA_PATH` trong `.env`
- CORS lỗi: kiểm tra URL frontend và CORS trong `api/main.py`
- Thời gian chạy đầu: chờ model embedding tải xuống

---

## 📌 Tham khảo
- `Tiki_Project/api/README.md` — Hướng dẫn chi tiết hơn
- `Tiki_Project/api/DEPLOYMENT_GUIDE.md` — Hướng dẫn deploy và troubleshooting
