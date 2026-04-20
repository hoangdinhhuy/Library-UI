# 📦 Prophet Models - Thư Mục Lưu Trữ Models Dự Báo

## 📋 Tổng Quan

Thư mục này chứa **800 Prophet models** đã được huấn luyện để dự báo nhu cầu (demand forecasting) cho các sản phẩm trong hệ thống e-commerce. 

**Prophet** là thư viện dự báo chuỗi thời gian (time series) mã nguồn mở do Facebook phát triển, đặc biệt hiệu quả với:
* ✅ Dữ liệu có tính chu kỳ (daily, weekly, yearly seasonality)
* ✅ Xu hướng phi tuyến theo thời gian
* ✅ Xử lý outliers và missing data tốt
* ✅ Dữ liệu có nhiễu (noisy data)

### 🎯 Mục Đích Sử Dụng

* Dự báo nhu cầu sản phẩm (demand forecasting)
* Dự báo doanh số bán hàng
* Lập kế hoạch tồn kho (inventory planning)
* Phân tích xu hướng tiêu dùng

---

## 📁 Cấu Trúc Files

Thư mục chứa **4 files pickle** từ phiên bản training `20260419_121158`:

### 1️⃣ `models_full_20260419_121158.pkl` (10.16 MB)

**Dictionary chứa 800 Prophet models đã huấn luyện**

```python
# Cấu trúc
{
    459566: <Prophet model object>,
    460184: <Prophet model object>,
    800444: <Prophet model object>,
    ...
    # Tổng cộng 800 models
}
```

* **Key**: `product_id` (kiểu `int`) - ID sản phẩm
* **Value**: Prophet model object đã được fit với dữ liệu lịch sử
* **Lưu ý**: Cần cài đặt thư viện `prophet` để load models

---

### 2️⃣ `metadata_20260419_121158.pkl` (0.02 MB)

**Dictionary chứa thông tin về quá trình training**

```python
{
    'timestamp': '20260419_121158',
    'num_models': 800,
    'product_ids': [459566, 460184, 800444, ...],  # List 800 IDs
    'train_period': '2023-01-01 to 2026-03-31',
    'test_period': '2026-04-01 to 2026-04-15',
    'forecast_period': 30,  # Số ngày dự báo
    'avg_mape': 0.234,  # Trung bình MAPE
    'median_mape': 0.156,  # Trung vị MAPE
    'simulated_pct': 0.35,  # % sản phẩm được simulated
    'prophet_params': {
        'changepoint_prior_scale': 0.05,
        'seasonality_prior_scale': 10,
        'yearly_seasonality': True,
        'weekly_seasonality': True,
        'daily_seasonality': False
    }
}
```

---

### 3️⃣ `metrics_20260419_121158.pkl` (0.03 MB)

**pandas DataFrame chứa metrics đánh giá cho từng model**

```python
# Shape: (800, 5)
# Columns:
   product_id    mae       rmse      mape      avg_price
0  459566        19027.60  22606.90  0.6315    3037571.00
1  460184        2940.37   3666.78   0.0468    6334429.00
2  800444        450277.42 1178622   4.1340    10808000.00
...
```

**Ý nghĩa các columns:**
* `product_id` (int): ID sản phẩm
* `mae` (float): Mean Absolute Error - sai số tuyệt đối trung bình
* `rmse` (float): Root Mean Squared Error - căn bậc hai của sai số bình phương
* `mape` (float): Mean Absolute Percentage Error - % sai số tuyệt đối trung bình
* `avg_price` (float): Giá trung bình của sản phẩm (dùng để đánh giá mức độ error)

---

### 4️⃣ `future_forecasts_20260419_121158.pkl` (4.81 MB)

**Dictionary chứa kết quả dự báo tương lai cho từng sản phẩm**

```python
# Cấu trúc
{
    459566: <DataFrame với dự báo 30 ngày>,
    460184: <DataFrame với dự báo 30 ngày>,
    ...
}

# Mỗi DataFrame có cấu trúc:
        ds         yhat      yhat_lower  yhat_upper  trend  weekly  yearly
0  2026-04-16    1250.5    1100.2      1400.8      ...    ...     ...
1  2026-04-17    1280.3    1130.5      1430.1      ...    ...     ...
...
```

**Ý nghĩa các columns:**
* `ds` (datetime): Ngày dự báo
* `yhat` (float): Giá trị dự báo
* `yhat_lower` (float): Cận dưới của khoảng tin cậy 95%
* `yhat_upper` (float): Cận trên của khoảng tin cậy 95%
* `trend`: Thành phần xu hướng
* `weekly`: Thành phần chu kỳ tuần
* `yearly`: Thành phần chu kỳ năm

---

## 🚀 Hướng Dẫn Sử Dụng

### Bước 1: Cài Đặt Thư Viện

```bash
pip install prophet pandas numpy matplotlib
```

### Bước 2: Import và Load Data

```python
import pickle
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt

# Đường dẫn đến thư mục
BASE_PATH = 'prophet_models/'

# Load metadata
with open(BASE_PATH + 'metadata_20260419_121158.pkl', 'rb') as f:
    metadata = pickle.load(f)

print(f"📊 Số lượng models: {metadata['num_models']}")
print(f"📅 Training period: {metadata['train_period']}")
print(f"📈 Average MAPE: {metadata['avg_mape']:.2%}")

# Load metrics
with open(BASE_PATH + 'metrics_20260419_121158.pkl', 'rb') as f:
    metrics = pickle.load(f)

print(f"\n📋 Metrics shape: {metrics.shape}")
print(metrics.head())

# Load future forecasts (dự báo có sẵn)
with open(BASE_PATH + 'future_forecasts_20260419_121158.pkl', 'rb') as f:
    forecasts = pickle.load(f)

print(f"\n🔮 Số sản phẩm có forecast: {len(forecasts)}")

# Load models (chỉ khi cần train thêm hoặc dự báo custom)
# Lưu ý: Cần có thư viện prophet
try:
    from prophet import Prophet
    with open(BASE_PATH + 'models_full_20260419_121158.pkl', 'rb') as f:
        models = pickle.load(f)
    print(f"✅ Đã load {len(models)} models")
except ImportError:
    print("⚠️ Chưa cài prophet - không thể load models (nhưng vẫn dùng được forecasts)")
    models = None
```

---

## 📊 CODE MẪU 1: XEM DỰ BÁO CÓ SẴN CHO TẤT CẢ SẢN PHẨM

```python
"""
Xem và phân tích dự báo có sẵn cho tất cả sản phẩm
Không cần load models, chỉ cần load forecasts
"""

def analyze_all_forecasts(forecasts, metrics):
    """
    Phân tích dự báo cho toàn bộ sản phẩm
    
    Parameters:
    -----------
    forecasts : dict
        Dictionary {product_id: forecast_df} từ file pickle
    metrics : DataFrame
        DataFrame metrics từ file pickle
    
    Returns:
    --------
    summary_df : DataFrame
        Bảng tổng hợp thống kê dự báo
    """
    
    summary_data = []
    
    print(f"📊 Đang phân tích dự báo cho {len(forecasts)} sản phẩm...")
    print("-" * 80)
    
    for i, (product_id, forecast_df) in enumerate(forecasts.items(), 1):
        try:
            # Lấy metrics cho sản phẩm này
            product_metrics = metrics[metrics['product_id'] == product_id]
            
            if len(product_metrics) == 0:
                mape = None
                avg_price = None
            else:
                mape = product_metrics['mape'].values[0]
                avg_price = product_metrics['avg_price'].values[0]
            
            # Tính toán thống kê từ forecast
            avg_forecast = forecast_df['yhat'].mean()
            total_forecast = forecast_df['yhat'].sum()
            min_forecast = forecast_df['yhat'].min()
            max_forecast = forecast_df['yhat'].max()
            std_forecast = forecast_df['yhat'].std()
            
            # Độ rộng khoảng tin cậy
            confidence_width = (forecast_df['yhat_upper'] - forecast_df['yhat_lower']).mean()
            
            # Xu hướng
            trend = 'tăng' if forecast_df['yhat'].iloc[-1] > forecast_df['yhat'].iloc[0] else 'giảm'
            
            summary_data.append({
                'product_id': product_id,
                'avg_daily_demand': round(avg_forecast, 2),
                'total_30_days': round(total_forecast, 2),
                'min_demand': round(min_forecast, 2),
                'max_demand': round(max_forecast, 2),
                'std_demand': round(std_forecast, 2),
                'trend': trend,
                'confidence_width': round(confidence_width, 2),
                'mape': round(mape, 4) if mape is not None else None,
                'avg_price': round(avg_price, 2) if avg_price is not None else None
            })
            
            # Progress
            if i % 100 == 0:
                print(f"  ✓ Đã xử lý {i}/{len(forecasts)} sản phẩm")
                
        except Exception as e:
            print(f"  ❌ Lỗi khi phân tích product_id={product_id}: {str(e)}")
            continue
    
    # Tạo DataFrame
    summary_df = pd.DataFrame(summary_data)
    
    print(f"\n✅ Hoàn thành! Phân tích thành công {len(summary_df)} sản phẩm")
    
    return summary_df


# ===== SỬ DỤNG =====
summary = analyze_all_forecasts(forecasts, metrics)

# Hiển thị thống kê tổng quan
print("\n" + "=" * 80)
print("📈 THỐNG KÊ TỔNG QUAN")
print("=" * 80)
print(f"Tổng nhu cầu dự báo (30 ngày, tất cả sản phẩm): {summary['total_30_days'].sum():,.0f} đơn vị")
print(f"Nhu cầu trung bình mỗi ngày: {summary['avg_daily_demand'].mean():,.2f} đơn vị")
print(f"MAPE trung bình: {summary['mape'].mean():.2%} (càng thấp càng tốt)")

# Top 10 sản phẩm có nhu cầu cao nhất
print("\n📊 TOP 10 SẢN PHẨM CÓ NHU CẦU CAO NHẤT (30 ngày tới):")
print(summary.nlargest(10, 'total_30_days')[['product_id', 'avg_daily_demand', 
                                               'total_30_days', 'trend', 'mape']])

# Top 10 sản phẩm có MAPE thấp nhất (dự báo chính xác nhất)
print("\n🎯 TOP 10 SẢN PHẨM CÓ DỰ BÁO CHÍNH XÁC NHẤT (MAPE thấp):")
print(summary.nsmallest(10, 'mape')[['product_id', 'avg_daily_demand', 
                                       'mape', 'confidence_width']])

# Lưu kết quả
summary.to_csv('forecast_summary_all_products.csv', index=False)
print("\n💾 Đã lưu kết quả vào: forecast_summary_all_products.csv")
```

**Output Mẫu:**
```
📊 Đang phân tích dự báo cho 800 sản phẩm...
--------------------------------------------------------------------------------
  ✓ Đã xử lý 100/800 sản phẩm
  ✓ Đã xử lý 200/800 sản phẩm
  ...
  ✓ Đã xử lý 800/800 sản phẩm

✅ Hoàn thành! Phân tích thành công 800 sản phẩm

================================================================================
📈 THỐNG KÊ TỔNG QUAN
================================================================================
Tổng nhu cầu dự báo (30 ngày, tất cả sản phẩm): 15,234,567 đơn vị
Nhu cầu trung bình mỗi ngày: 635.61 đơn vị
MAPE trung bình: 23.40% (càng thấp càng tốt)

📊 TOP 10 SẢN PHẨM CÓ NHU CẦU CAO NHẤT (30 ngày tới):
   product_id  avg_daily_demand  total_30_days  trend    mape
0     800444          45027.74      1350832.20  tăng   4.1340
1     460184           6334.43       190032.90  giảm   0.0468
...
```

---

## 🎯 CODE MẪU 2: XEM DỰ BÁO CHO 1 SẢN PHẨM CỤ THỂ

```python
"""
Xem chi tiết dự báo và vẽ biểu đồ cho 1 sản phẩm
"""

def analyze_single_product(product_id, forecasts, metrics, plot=True):
    """
    Phân tích chi tiết cho 1 sản phẩm
    
    Parameters:
    -----------
    product_id : int
        ID sản phẩm cần phân tích
    forecasts : dict
        Dictionary chứa forecasts
    metrics : DataFrame
        DataFrame chứa metrics
    plot : bool
        Có vẽ biểu đồ hay không
    
    Returns:
    --------
    forecast_df : DataFrame
        Dự báo chi tiết
    stats : dict
        Thống kê quan trọng
    """
    
    # Kiểm tra sản phẩm tồn tại
    if product_id not in forecasts:
        print(f"❌ Không tìm thấy dự báo cho product_id={product_id}")
        print(f"📝 Có {len(forecasts)} sản phẩm. VD: {list(forecasts.keys())[:10]}")
        return None, None
    
    # Lấy forecast
    forecast_df = forecasts[product_id].copy()
    
    # Lấy metrics
    product_metrics = metrics[metrics['product_id'] == product_id]
    
    print(f"🎯 PHÂN TÍCH SẢN PHẨM: {product_id}")
    print("=" * 80)
    
    # Hiển thị metrics
    if len(product_metrics) > 0:
        print(f"\n📊 METRICS (Độ chính xác model):")
        print(f"   • MAE:  {product_metrics['mae'].values[0]:,.2f}")
        print(f"   • RMSE: {product_metrics['rmse'].values[0]:,.2f}")
        print(f"   • MAPE: {product_metrics['mape'].values[0]:.2%} {'✅ Tốt' if product_metrics['mape'].values[0] < 0.2 else '⚠️ Cần cải thiện'}")
        print(f"   • Giá TB: {product_metrics['avg_price'].values[0]:,.0f} VNĐ")
    
    # Tính toán thống kê dự báo
    stats = {
        'product_id': product_id,
        'num_days': len(forecast_df),
        'date_range': f"{forecast_df['ds'].min()} đến {forecast_df['ds'].max()}",
        'avg_daily': forecast_df['yhat'].mean(),
        'total': forecast_df['yhat'].sum(),
        'min': forecast_df['yhat'].min(),
        'max': forecast_df['yhat'].max(),
        'std': forecast_df['yhat'].std(),
        'trend': 'Tăng' if forecast_df['yhat'].iloc[-1] > forecast_df['yhat'].iloc[0] else 'Giảm',
        'peak_date': forecast_df.loc[forecast_df['yhat'].idxmax(), 'ds'],
        'peak_demand': forecast_df['yhat'].max()
    }
    
    print(f"\n📅 DỰ BÁO ({stats['num_days']} ngày):")
    print(f"   • Khoảng: {stats['date_range']}")
    print(f"   • Trung bình mỗi ngày: {stats['avg_daily']:,.2f} đơn vị")
    print(f"   • Tổng {stats['num_days']} ngày: {stats['total']:,.2f} đơn vị")
    print(f"   • Nhu cầu thấp nhất: {stats['min']:,.2f} đơn vị")
    print(f"   • Nhu cầu cao nhất: {stats['max']:,.2f} đơn vị")
    print(f"   • Độ lệch chuẩn: {stats['std']:,.2f}")
    print(f"   • Xu hướng: {stats['trend']}")
    print(f"   • Ngày có nhu cầu cao nhất: {stats['peak_date']} ({stats['peak_demand']:,.2f} đơn vị)")
    
    # Hiển thị 7 ngày đầu
    print(f"\n📋 DỰ BÁO 7 NGÀY ĐẦU TIÊN:")
    display_cols = ['ds', 'yhat', 'yhat_lower', 'yhat_upper']
    if all(col in forecast_df.columns for col in display_cols):
        print(forecast_df[display_cols].head(7).to_string(index=False))
    else:
        print(forecast_df.head(7))
    
    # Vẽ biểu đồ
    if plot:
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(15, 10))
        
        # Biểu đồ 1: Dự báo với confidence interval
        ax1.plot(forecast_df['ds'], forecast_df['yhat'], 
                'b-', linewidth=2, label='Dự báo', marker='o', markersize=3)
        ax1.fill_between(forecast_df['ds'], 
                        forecast_df['yhat_lower'],
                        forecast_df['yhat_upper'],
                        alpha=0.3, color='blue', label='Khoảng tin cậy 95%')
        
        # Đánh dấu ngày cao nhất
        peak_idx = forecast_df['yhat'].idxmax()
        ax1.scatter(forecast_df.loc[peak_idx, 'ds'], 
                   forecast_df.loc[peak_idx, 'yhat'],
                   color='red', s=200, zorder=5, label=f'Peak: {stats["peak_date"]}')
        
        ax1.set_xlabel('Ngày', fontsize=12)
        ax1.set_ylabel('Nhu cầu (đơn vị)', fontsize=12)
        ax1.set_title(f'Dự Báo Nhu Cầu Sản Phẩm {product_id} - {stats["num_days"]} Ngày', 
                     fontsize=14, fontweight='bold')
        ax1.legend(fontsize=10)
        ax1.grid(True, alpha=0.3)
        plt.setp(ax1.xaxis.get_majorticklabels(), rotation=45)
        
        # Biểu đồ 2: Phân bố nhu cầu
        ax2.hist(forecast_df['yhat'], bins=30, color='skyblue', edgecolor='black', alpha=0.7)
        ax2.axvline(stats['avg_daily'], color='red', linestyle='--', linewidth=2, 
                   label=f'Trung bình: {stats["avg_daily"]:.2f}')
        ax2.set_xlabel('Nhu cầu (đơn vị)', fontsize=12)
        ax2.set_ylabel('Số ngày', fontsize=12)
        ax2.set_title('Phân Bố Nhu Cầu Dự Báo', fontsize=14, fontweight='bold')
        ax2.legend(fontsize=10)
        ax2.grid(True, alpha=0.3, axis='y')
        
        plt.tight_layout()
        filename = f'forecast_product_{product_id}.png'
        plt.savefig(filename, dpi=300, bbox_inches='tight')
        print(f"\n📊 Đã lưu biểu đồ: {filename}")
        plt.show()
    
    # Lưu chi tiết
    output_file = f'forecast_product_{product_id}_detail.csv'
    forecast_df.to_csv(output_file, index=False)
    print(f"💾 Đã lưu dự báo chi tiết: {output_file}")
    
    return forecast_df, stats


# ===== SỬ DỤNG =====

# Xem danh sách product_id có sẵn
print("📋 MỘT SỐ PRODUCT IDs CÓ SẴN:")
product_ids = list(forecasts.keys())[:20]
print(product_ids)

# Chọn 1 sản phẩm để phân tích (thay số này)
selected_product = 459566  # Hoặc chọn ID khác từ danh sách

# Phân tích
forecast_df, stats = analyze_single_product(
    product_id=selected_product,
    forecasts=forecasts,
    metrics=metrics,
    plot=True
)
```

---

## 🔄 CODE MẪU 3: DỰ BÁO MỚI VỚI MODELS (Nâng Cao)

```python
"""
Tạo dự báo MỚI cho khoảng thời gian khác (cần load models)
"""

# Chỉ chạy được khi đã load models thành công
if models is not None:
    
    def create_new_forecast(models, product_id, periods=60, freq='D'):
        """
        Tạo dự báo mới với số ngày tùy chỉnh
        
        Parameters:
        -----------
        models : dict
            Dictionary chứa Prophet models
        product_id : int
            ID sản phẩm
        periods : int
            Số periods muốn dự báo
        freq : str
            Tần suất ('D'=ngày, 'W'=tuần, 'M'=tháng)
        
        Returns:
        --------
        forecast : DataFrame
            Kết quả dự báo
        """
        
        if product_id not in models:
            print(f"❌ Không tìm thấy model cho product_id={product_id}")
            return None
        
        model = models[product_id]
        
        # Tạo future dataframe
        future = pd.DataFrame({
            'ds': pd.date_range(
                start=datetime.now().date(),
                periods=periods,
                freq=freq
            )
        })
        
        # Dự báo
        forecast = model.predict(future)
        
        print(f"✅ Đã tạo dự báo {periods} {freq} cho product_id={product_id}")
        
        return forecast
    
    # Sử dụng
    new_forecast = create_new_forecast(models, product_id=459566, periods=90, freq='D')
    if new_forecast is not None:
        print(new_forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].head())
else:
    print("⚠️ Không thể tạo dự báo mới - chưa load models")
    print("💡 Sử dụng forecasts có sẵn trong file future_forecasts_*.pkl")
```

---

## 📚 Tài Liệu Tham Khảo

* [Facebook Prophet Documentation](https://facebook.github.io/prophet/)
* [Prophet Python API](https://facebook.github.io/prophet/docs/quick_start.html)
* [Diagnostics & Hyperparameters](https://facebook.github.io/prophet/docs/diagnostics.html)

---

## ⚙️ Lưu Ý Quan Trọng

### ✅ Best Practices

1. **Sử dụng forecasts có sẵn trước** - không cần load models để xem dự báo
2. **Kiểm tra MAPE** - MAPE < 20% là tốt, < 10% là rất tốt
3. **Xem confidence interval** - khoảng hẹp = dự báo tin cậy hơn
4. **Product IDs là số nguyên** - không phải string như 'PROD001'

### ⚠️ Cảnh Báo

* **Pickle files**: Chỉ load từ nguồn tin cậy (security risk)
* **Prophet library**: Cần cài đặt để load models (không cần nếu chỉ xem forecasts)
* **Memory**: File models_full khá lớn (10 MB) - cẩn thận khi load

---

**Timestamp**: 20260419_121158  
**Số models**: 800  
**Tác giả**: Data Science Team
