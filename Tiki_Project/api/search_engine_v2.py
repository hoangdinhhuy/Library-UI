# ============================================================
# SEARCH ENGINE V2 - Enhanced AI Insights
# ============================================================

import logging
from typing import Dict, List, Any
import google.generativeai as genai

logger = logging.getLogger(__name__)

class SearchEngine:
    """
    Product search engine with ENHANCED AI-powered insights
    """
    
    def __init__(
        self,
        data_loader,
        model_loader,
        rag_engine,
        gemini_model
    ):
        self.data_loader = data_loader
        self.model_loader = model_loader
        self.rag_engine = rag_engine
        self.gemini_model = gemini_model
        
        logger.info("🔍 Search Engine V2 initialized")
    
    def search_products(
        self,
        keyword: str,
        limit: int = 20,
        use_semantic: bool = True
    ) -> List[Dict]:
        """Search products by keyword"""
        if use_semantic and self.rag_engine:
            try:
                docs = self.rag_engine.vector_store.similarity_search(keyword, k=limit * 2)
                
                product_ids = []
                for doc in docs:
                    if doc.metadata.get('source') == 'product':
                        pid = doc.metadata.get('product_id')
                        if pid and pid not in product_ids:
                            product_ids.append(pid)
                
                products = []
                for pid in product_ids[:limit]:
                    product = self.data_loader.get_product_by_id(int(pid))
                    if product:
                        products.append(product)
                
                if products:
                    return products
                    
            except Exception as e:
                logger.warning(f"Semantic search failed: {e}")
        
        return self.data_loader.search_products(keyword, limit)
    
    def generate_insight(
        self,
        products: List[Dict],
        keyword: str,
        include_ml_insights: bool = True
    ) -> str:
        """
        🚀 ENHANCED: Generate DETAILED AI insight (500+ words)
        """
        if not products:
            return f"Không tìm thấy sản phẩm nào phù hợp với '{keyword}'. Vui lòng thử từ khóa khác."
        
        # ============================================================
        # 🔥 BUILD RICH CONTEXT - More data = better insights!
        # ============================================================
        
        # 1. Basic stats
        avg_price = sum(p['price'] for p in products) / len(products)
        avg_rating = sum(p['rating'] for p in products) / len(products)
        total_sold = sum(p['boughtInLastMonth'] for p in products)
        max_price = max(p['price'] for p in products)
        min_price = min(p['price'] for p in products)
        
        # 2. Price segmentation
        budget_products = [p for p in products if p['price'] < avg_price * 0.7]
        mid_products = [p for p in products if avg_price * 0.7 <= p['price'] <= avg_price * 1.3]
        premium_products = [p for p in products if p['price'] > avg_price * 1.3]
        
        # 3. Category distribution
        categories = {}
        for p in products:
            cat = p['categoryName']
            categories[cat] = categories.get(cat, 0) + 1
        
        top_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # 4. Get ML insights
        ml_insights = self._get_detailed_ml_insights(products) if include_ml_insights else ""
        
        # 5. Top 5 products details
        top_5_details = ""
        for i, p in enumerate(products[:5], 1):
            top_5_details += f"""
{i}. **{p['title']}**
   - 💰 Giá: {p['price']:,.0f} VND
   - ⭐ Rating: {p['rating']}/5.0 ({p.get('reviewCount', 'N/A')} đánh giá)
   - 🛒 Đã bán: {p['boughtInLastMonth']:,} trong tháng qua
   - 📦 Danh mục: {p['categoryName']}
"""
        
        # ============================================================
        # 🎯 ENHANCED PROMPT - Yêu cầu phân tích CHI TIẾT
        # ============================================================
        
        prompt = f"""Bạn là chuyên gia phân tích thị trường e-commerce với 10 năm kinh nghiệm.

📊 **DỮ LIỆU TÌM KIẾM CHO TỪ KHÓA: "{keyword}"**

**Tổng quan thị trường:**
- Tổng số sản phẩm: {len(products)}
- Giá trung bình: {avg_price:,.0f} VND
- Khoảng giá: {min_price:,.0f} - {max_price:,.0f} VND
- Rating trung bình: {avg_rating:.1f}/5.0
- Tổng đã bán: {total_sold:,} sản phẩm

**Phân khúc giá:**
- 💙 Phân khúc bình dân (< {avg_price * 0.7:,.0f} VND): {len(budget_products)} sản phẩm
- 💚 Phân khúc trung cấp ({avg_price * 0.7:,.0f} - {avg_price * 1.3:,.0f} VND): {len(mid_products)} sản phẩm
- 💎 Phân khúc cao cấp (> {avg_price * 1.3:,.0f} VND): {len(premium_products)} sản phẩm

**Danh mục phổ biến:**
{chr(10).join(f"- {cat}: {count} sản phẩm ({count/len(products)*100:.1f}%)" for cat, count in top_categories)}

**Top 5 sản phẩm nổi bật:**
{top_5_details}

{f"**Phân tích từ Machine Learning Models:**{chr(10)}{ml_insights}" if ml_insights else ""}

---

🎯 **YÊU CẦU PHÂN TÍCH CHI TIẾT (viết 500-700 từ):**

Hãy viết một báo cáo phân tích thị trường CHUYÊN SÂU với các phần sau:

**1. 📈 TỔNG QUAN THỊ TRƯỜNG (150 từ)**
- Đánh giá quy mô và mức độ cạnh tranh
- Phân tích xu hướng giá và rating
- Nhận định về độ hot của từ khóa (dựa vào số lượng đã bán)

**2. 💰 PHÂN TÍCH PHÂN KHÚC GIÁ (150 từ)**
- So sánh 3 phân khúc: Bình dân, Trung cấp, Cao cấp
- Phân khúc nào đang thống trị thị trường?
- Phân khúc nào có cơ hội tốt nhất? (Blue Ocean vs Red Ocean)
- Đề xuất phân khúc phù hợp cho từng nhóm khách hàng

**3. 🏆 TOP PRODUCTS & COMPETITORS (100 từ)**
- Phân tích top 3 sản phẩm bán chạy nhất
- Điểm mạnh/yếu của từng sản phẩm
- So sánh giá vs quality (rating)

**4. 📊 PHÂN TÍCH DANH MỤC (100 từ)**
- Danh mục nào chiếm ưu thế?
- Có sự đa dạng hay tập trung?
- Cơ hội ở danh mục ngách (niche)?

**5. 💡 KHUYẾN NGHỊ CHIẾN LƯỢC (150 từ)**
- **Cho người mua:** Nên chọn sản phẩm nào? Lý do? Giá tốt nhất?
- **Cho người bán:** Cơ hội kinh doanh? Phân khúc nào đáng đầu tư?
- **Rủi ro:** Điều gì cần lưu ý khi tham gia thị trường này?

**YÊU CẦU FORMAT:**
- Dùng emoji để dễ đọc (✅ ❌ 💰 📈 🎯 💡)
- Mỗi tiêu đề chính phải được nhấn mạnh bằng chữ hoa và ký hiệu rõ ràng
- Dùng định dạng Markdown/đoạn văn có tiêu đề rõ ràng (##, **, -)
- Tạo ra ít nhất 5 đoạn nội dung với tiêu đề riêng biệt
- Kết thúc bằng phần "✅ KẾ HOẠCH HÀNH ĐỘNG" gồm 3 bước cụ thể
- Viết tiếng Việt chuyên nghiệp nhưng dễ hiểu
- Đưa ra con số cụ thể, không chung chung
- Tập trung vào ACTIONABLE insights (có thể hành động được)

Viết đầy đủ, chi tiết, chuyên sâu! Đây là báo cáo cho CEO, không phải tóm tắt ngắn gọn!
"""

        try:
            # 🚀 Call Gemini with enhanced prompt
            response = self.gemini_model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            logger.error(f"Gemini insight generation failed: {e}")
            
            # Enhanced fallback
            return self._generate_fallback_insight(
                keyword, products, avg_price, avg_rating, 
                total_sold, budget_products, mid_products, premium_products
            )
    
    def _get_detailed_ml_insights(self, products: List[Dict]) -> str:
        """Get DETAILED ML insights from all models"""
        insights = []
        
        # 1. KMeans Clustering
        if self.model_loader.kmeans_model:
            try:
                cluster_info = {}
                for p in products[:10]:
                    # Simplified - in reality need normalized features
                    # cluster_id = self.model_loader.get_product_cluster([...])
                    # cluster_name = self.model_loader.get_cluster_name(cluster_id)
                    # cluster_info[cluster_name] = cluster_info.get(cluster_name, 0) + 1
                    pass
                
                if cluster_info:
                    insights.append("**🎯 Phân khúc Cluster (KMeans):**")
                    for cluster, count in cluster_info.items():
                        insights.append(f"- {cluster}: {count} sản phẩm")
            except Exception as e:
                logger.debug(f"KMeans insight failed: {e}")
        
        # 2. Prophet Price Forecasting
        if self.model_loader.prophet_forecasts:
            try:
                forecasted_products = 0
                avg_forecast_change = 0
                
                for p in products[:10]:
                    pid = int(p['product_id'])
                    forecast = self.model_loader.get_price_forecast(pid, days_ahead=30)
                    
                    if forecast:
                        forecasted_products += 1
                        current_price = p['price']
                        change_pct = ((forecast - current_price) / current_price) * 100
                        avg_forecast_change += change_pct
                
                if forecasted_products > 0:
                    avg_forecast_change /= forecasted_products
                    insights.append(f"\n**📈 Dự báo giá (Prophet):**")
                    insights.append(f"- Có dữ liệu dự báo cho {forecasted_products}/{len(products[:10])} sản phẩm")
                    
                    if avg_forecast_change > 5:
                        insights.append(f"- Xu hướng: Giá dự kiến TĂNG {avg_forecast_change:.1f}% trong 30 ngày tới ⬆️")
                    elif avg_forecast_change < -5:
                        insights.append(f"- Xu hướng: Giá dự kiến GIẢM {abs(avg_forecast_change):.1f}% trong 30 ngày tới ⬇️")
                    else:
                        insights.append(f"- Xu hướng: Giá ổn định, biến động nhẹ ({avg_forecast_change:+.1f}%) ➡️")
                        
            except Exception as e:
                logger.debug(f"Prophet insight failed: {e}")
        
        # 3. PhoBERT Sentiment (if available)
        if self.model_loader.phobert_available:
            insights.append("\n**💬 Phân tích Sentiment (PhoBERT):**")
            insights.append("- Model đã sẵn sàng để phân tích đánh giá khách hàng")
            insights.append("- Có thể phân tích real-time khi có review mới")
        
        return "\n".join(insights) if insights else ""
    
    def _generate_fallback_insight(
        self, keyword, products, avg_price, avg_rating, 
        total_sold, budget_products, mid_products, premium_products
    ) -> str:
        """Enhanced fallback when Gemini fails"""
        
        # Determine market competition
        if total_sold > 50000:
            competition = "RẤT CAO 🔥"
        elif total_sold > 10000:
            competition = "CAO 📈"
        elif total_sold > 1000:
            competition = "TRUNG BÌNH 📊"
        else:
            competition = "THẤP 🌱"
        
        # Determine best segment
        if len(premium_products) > len(budget_products):
            best_segment = "cao cấp (khách hàng sẵn sàng chi tiêu)"
        elif len(budget_products) > len(mid_products):
            best_segment = "bình dân (cạnh tranh giá)"
        else:
            best_segment = "trung cấp (cân bằng giá/chất lượng)"

        top_names = [p['title'] for p in products[:3]]
        top_name_1 = top_names[0] if len(top_names) > 0 else 'Sản phẩm top 1'
        top_name_2 = top_names[1] if len(top_names) > 1 else 'Sản phẩm top 2'
        top_name_3 = top_names[2] if len(top_names) > 2 else 'Sản phẩm top 3'
        
        return f"""📊 **PHÂN TÍCH THỊ TRƯỜNG: \"{keyword}\"**
============================================================

**1. TỔNG QUAN THỊ TRƯỜNG**
- ✅ Tìm thấy {len(products)} sản phẩm liên quan
- 💰 Giá trung bình: {avg_price:,.0f} VND
- ⭐ Rating trung bình: {avg_rating:.1f}/5.0
- 🛒 Tổng đã bán: {total_sold:,} sản phẩm
- 🔥 Mức độ cạnh tranh: {competition}

**2. PHÂN KHÚC GIÁ**
- 💙 Bình dân: {len(budget_products)} sản phẩm ({len(budget_products)/len(products)*100:.0f}%)
- 💚 Trung cấp: {len(mid_products)} sản phẩm ({len(mid_products)/len(products)*100:.0f}%)
- 💎 Cao cấp: {len(premium_products)} sản phẩm ({len(premium_products)/len(products)*100:.0f}%)
- 📌 Phân khúc có nhiều sản phẩm nhất: {best_segment.upper()}

**3. TOP 3 SẢN PHẨM XUẤT SẮC**
- 1) {top_name_1}: rating cao và lượng bán ổn định, phù hợp khách hàng tìm kiếm chất lượng.
- 2) {top_name_2}: giá cạnh tranh, phù hợp nhóm người mua nhạy cảm với giá.
- 3) {top_name_3}: danh mục đặc thù, có ưu thế về khác biệt hoá sản phẩm.

**4. CHIẾN LƯỢC KINH DOANH**
- Với {total_sold:,} sản phẩm đã bán, mức độ cạnh tranh đang ở mức {competition.lower()}.
- Nếu muốn mở rộng, cần tập trung vào phân khúc {best_segment} và xây dựng lợi thế về giá/đánh giá.
- Ưu tiên cải thiện rating trên top 5 sản phẩm để tăng độ tin cậy của khách hàng.

**5. KẾ HOẠCH HÀNH ĐỘNG**
- ✅ Bước 1: Tăng hiển thị cho 3 sản phẩm top bằng chương trình khuyến mãi hoặc ưu đãi thêm.
- ✅ Bước 2: Tái cơ cấu giá trong phạm vi {avg_price * 0.8:,.0f} - {avg_price * 1.2:,.0f} VND để vừa cạnh tranh vừa đảm bảo lợi nhuận.
- ✅ Bước 3: Khuyến nghị tập trung vào danh mục có thị phần cao nhất và mở rộng sang 1-2 niche ngách ít cạnh tranh.

**GHI CHÚ:**
- Dữ liệu phân tích dựa trên {len(products)} sản phẩm đại diện.
- Mỗi đề xuất ở trên được thiết kế để áp dụng ngay trong 2-4 tuần tới.
"""
    
    def analyze_batch(self, keywords: List[str], limit_per_keyword: int = 5) -> Dict:
        """Analyze multiple keywords (batch mode)"""
        all_products = []
        seen_ids = set()
        
        for keyword in keywords[:10]:
            products = self.search_products(keyword, limit_per_keyword, use_semantic=False)
            
            for p in products:
                if p['product_id'] not in seen_ids:
                    seen_ids.add(p['product_id'])
                    all_products.append(p)
        
        batch_insight = self._generate_batch_insight(keywords, all_products)
        
        return {
            'products': all_products[:20],
            'ai_insight': batch_insight,
            'keywords_processed': len(keywords),
            'total_found': len(all_products)
        }
    
    def _generate_batch_insight(self, keywords: List[str], products: List[Dict]) -> str:
        """Generate ENHANCED batch insight"""
        if not products:
            return "Không tìm thấy sản phẩm nào cho các từ khóa đã nhập."
        
        # Aggregate stats
        categories = {}
        total_revenue = sum(p['price'] * p['boughtInLastMonth'] for p in products)
        avg_price = sum(p['price'] for p in products) / len(products)
        
        for p in products:
            cat = p['categoryName']
            categories[cat] = categories.get(cat, 0) + 1
        
        top_cats = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:5]
        
        context = f"""Phân tích BATCH cho {len(keywords)} từ khóa: {', '.join(keywords[:5])}{"..." if len(keywords) > 5 else ""}

**Kết quả tổng hợp:**
- Tổng sản phẩm độc nhất: {len(products)}
- Tổng doanh thu ước tính: {total_revenue:,.0f} VND
- Giá trung bình: {avg_price:,.0f} VND
- Số danh mục: {len(categories)}

**Top 5 danh mục:**
{chr(10).join(f"{i}. {cat}: {count} sản phẩm ({count/len(products)*100:.1f}%)" for i, (cat, count) in enumerate(top_cats, 1))}
"""

        prompt = f"""{context}

Viết báo cáo phân tích BATCH (300-400 từ) với các phần:

1. **Xu hướng tổng thể:** Nhận xét về keywords và danh mục
2. **Phân tích cơ hội:** Keywords/danh mục nào tiềm năng nhất?
3. **So sánh keywords:** Keywords nào cạnh tranh cao/thấp?
4. **Khuyến nghị:** Chiến lược cho việc kinh doanh nhiều sản phẩm

Viết chi tiết, có con số cụ thể, tập trung vào ACTIONABLE insights!
"""

        try:
            response = self.gemini_model.generate_content(prompt)
            return response.text
        except:
            return f"""📊 **PHÂN TÍCH BATCH: {len(keywords)} TỪ KHÓA**

Đã phân tích {len(keywords)} từ khóa, tìm thấy {len(products)} sản phẩm độc nhất thuộc {len(categories)} danh mục.

**Danh mục nổi bật:**
{chr(10).join(f"- {cat}: {count} sản phẩm" for cat, count in top_cats[:3])}

**Nhận định:**
Thị trường đa dạng với nhiều cơ hội. Tập trung vào top categories để tối ưu doanh thu.
"""
