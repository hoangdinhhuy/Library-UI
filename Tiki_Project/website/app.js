// ============================================================
// 🚀 TIKI ANALYST - FRONTEND (FIXED VERSION)
// ============================================================

const { useState, useRef } = React;
const { jsPDF } = window.jspdf;

// --- ICONS COMPONENT ---
const Icon = ({ name, size = 20, className = "" }) => <i data-lucide={name} width={size} height={size} className={className}></i>;

// --- CALCULATE KPI FROM PRODUCTS DATA ---
const calculateKPI = (products) => {
    if (!products || products.length === 0) {
        return {
            revenue: "$0",
            sold: "0",
            avg: "$0",
            growth: "N/A"
        };
    }

    // Parse numeric values safely from mixed locale strings (e.g. 2.542.605.000 VNĐ)
    const parseLocaleInteger = (value) => {
        if (value === null || value === undefined) return 0;
        const digits = String(value).replace(/\D/g, '');
        return digits ? parseInt(digits, 10) : 0;
    };

    const parseNumeric = (value) => {
        if (value === null || value === undefined || value === '') return null;
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        const normalized = String(value).replace(/,/g, '.').replace(/[^\d.-]/g, '');
        if (!normalized) return null;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    };

    // Tính tổng doanh thu từ estimated_revenue
    const totalRevenue = products.reduce((sum, p) => {
        const revenue = parseLocaleInteger(p.rev);
        return sum + revenue;
    }, 0);

    // Tính tổng sản phẩm bán ra từ boughtInLastMonth
    const totalSold = products.reduce((sum, p) => {
        const sold = parseLocaleInteger(p.sold);
        return sum + sold;
    }, 0);

    // Tính giá trung bình từ price
    const totalPrice = products.reduce((sum, p) => {
        const price = parseLocaleInteger(p.price);
        return sum + price;
    }, 0);
    const avgPrice = products.length > 0 ? totalPrice / products.length : 0;

    // Ưu tiên lấy tăng trưởng thật từ backend nếu có; không tự bịa công thức từ số lượng item.
    const growthValues = products
        .map((p) => parseNumeric(p.growth_percent ?? p.monthly_growth ?? p.growth_rate ?? p.growth))
        .filter((v) => v !== null);

    let growth = 'N/A';
    if (growthValues.length > 0) {
        const avgGrowth = growthValues.reduce((sum, v) => sum + v, 0) / growthValues.length;
        const sign = avgGrowth > 0 ? '+' : '';
        growth = `${sign}${avgGrowth.toFixed(1)}%`;
    } else if (products.length > 0 && totalSold > 0) {
        // Fallback: compute growth from the median of current search results.
        // This keeps the metric self-scaling when the dataset changes.
        const soldValues = products
            .map((p) => parseLocaleInteger(p.sold))
            .filter((v) => v > 0)
            .sort((a, b) => a - b);
        
        if (soldValues.length > 0) {
            const medianSold = soldValues.length % 2 === 0
                ? (soldValues[soldValues.length / 2 - 1] + soldValues[soldValues.length / 2]) / 2
                : soldValues[Math.floor(soldValues.length / 2)];
            
            const avgSoldPerProduct = totalSold / products.length;
            const growthPercent = ((avgSoldPerProduct / medianSold) - 1) * 100;
            const capped = Math.max(Math.min(growthPercent, 500), -100);
            const sign = capped > 0 ? '+' : '';
            growth = `${sign}${capped.toFixed(1)}%`;
        }
    }

    return {
        revenue: totalRevenue > 0 ? `$${(totalRevenue / 1000000).toFixed(2)}M` : "$0",
        sold: totalSold.toLocaleString(),
        avg: `$${avgPrice.toFixed(2)}`,
        growth
    };
};

// ============================================================
// 🛑 API CONFIGURATION & FUNCTIONS
// ============================================================

const resolveApiBaseUrl = () => {
    const configured = (window.__API_BASE_URL__ || '').trim();
    if (configured) {
        return configured.replace(/\/+$/, '');
    }

    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:8000';
    }

    // GitHub Pages/static hosting must point to a public backend (prefer HTTPS)
    return '';
};

const API_BASE_URL = resolveApiBaseUrl();

const executeAnalysis = async (type, payload) => {
    try {
        if (!API_BASE_URL) {
            throw new Error('Chưa cấu hình API_BASE_URL cho môi trường deploy (GitHub Pages).');
        }

        if (window.location.protocol === 'https:' && API_BASE_URL.startsWith('http://')) {
            throw new Error('Trang đang chạy HTTPS nhưng API là HTTP (mixed content sẽ bị chặn).');
        }

        let response;
        if (type === 'single') {
            // ✅ FIX: Dùng API_BASE_URL thay vì API_URL
            response = await fetch(`${API_BASE_URL}/api/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    keyword: payload.keyword,
                    market: 'US',
                    limit: 20
                })
            });
        } else {
            const formData = new FormData();
            formData.append('file', payload.file);
            // ✅ FIX: Dùng API_BASE_URL thay vì API_URL
            response = await fetch(`${API_BASE_URL}/api/analyze-batch`, {
                method: 'POST',
                body: formData
            });
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Unknown error');
        }
        
        // ✅ FIX: Response mapping đúng với backend format
        const mapApiProducts = (items = []) => items.map((p, idx) => ({
            id: idx + 1,
            product_id: p.product_id || '',
            name: p.title || p.name || p.product_name || 'N/A',  // Backend trả 'title'
            cat: p.categoryName || p.category || p.category_name || 'N/A',  // Backend trả 'categoryName'
            price: `${(p.price || 0).toLocaleString()} VNĐ`,
            sold: (p.boughtInLastMonth || p.quantity_sold || p.review_count || 0).toLocaleString(),  // Backend trả 'boughtInLastMonth'
            rev: (p.estimated_revenue || 0).toLocaleString() + ' VNĐ',  // Backend trả 'estimated_revenue'
            growth_percent: p.growth_percent ?? p.monthly_growth ?? p.growth_rate ?? p.growth ?? null,
            url: p.product_url || p.url_path || (p.product_id ? `https://tiki.vn/p/${p.product_id}` : '')
        }));

        const mappedProducts = mapApiProducts(result.data.products || []);

        const mappedPerKeywordInsights = Array.isArray(result.data.per_keyword_insights)
            ? result.data.per_keyword_insights.map((entry) => ({
                keyword: entry.keyword || 'N/A',
                totalFound: entry.total_found || 0,
                insight: entry.ai_insight || 'Không có insight',
                products: mapApiProducts(Array.isArray(entry.products) ? entry.products : [])
            }))
            : [];

        return {
            products: mappedProducts,
            insight: result.data.ai_insight || 'Không có insight',
            batchInsights: mappedPerKeywordInsights
        };
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

const renderFormattedInsight = (insight) => {
    if (!insight) {
        return <div className="text-sm text-gray-300">Không có insight để hiển thị.</div>;
    }

    const blocks = insight.split(/\n{2,}/g).filter(Boolean);

    return blocks.map((block, index) => {
        const lines = block.split('\n').filter(Boolean);
        const firstLine = lines[0].trim();
        const isHeading = /^(?:\*\*|##|###|🎯|📈|💡|📊|💰|✅|🔥)/.test(firstLine);

        return (
            <div
                key={index}
                className={`rounded-3xl p-4 mb-3 ${isHeading ? 'bg-slate-900/80 border border-cyan-500/20 shadow-sm' : 'bg-white/5'}`}
            >
                {lines.map((line, lineIndex) => {
                    const trimmed = line.trim();

                    if (/^\*\*([^\n]+)\*\*$/.test(trimmed)) {
                        const title = trimmed.replace(/^\*\*(.+)\*\*$/, '$1');
                        return (
                            <div key={lineIndex} className="text-sm font-semibold uppercase text-amber-300 mb-2">
                                {title}
                            </div>
                        );
                    }

                    if (/^##+\s+(.+)$/.test(trimmed)) {
                        const title = trimmed.replace(/^##+\s+(.+)$/, '$1');
                        return (
                            <div key={lineIndex} className="text-base font-bold uppercase text-rose-300 mb-2">
                                {title}
                            </div>
                        );
                    }

                    if (/^-\s+(.+)$/.test(trimmed)) {
                        const content = trimmed.replace(/^-\s+(.+)$/, '$1');
                        return (
                            <div key={lineIndex} className="flex gap-3 text-sm text-gray-200 leading-6">
                                <span className="text-rose-400">•</span>
                                <span>{content}</span>
                            </div>
                        );
                    }

                    return (
                        <div key={lineIndex} className="text-sm text-gray-200 leading-6">
                            {trimmed}
                        </div>
                    );
                })}
            </div>
        );
    });
};

const normalizeBotText = (value) =>
    String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

const parseFlexibleNumber = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const normalized = String(value).replace(/,/g, '.').replace(/[^\d.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
};

const formatCompactMoney = (value) => {
    if (!value || value <= 0) return '0 VNĐ';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M VNĐ`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K VNĐ`;
    return `${value.toLocaleString()} VNĐ`;
};

const extractBudgetFromText = (text) => {
    const normalized = normalizeBotText(text);
    const budgetMatch = normalized.match(/(\d+(?:[\.,]\d+)?)\s*(trieu|tr|k|nghin|ngan|m|million)/);

    if (!budgetMatch) return 0;

    const amount = parseFloat(budgetMatch[1].replace(',', '.'));
    const unit = budgetMatch[2];

    if (['trieu', 'tr', 'm', 'million'].includes(unit)) return amount * 1000000;
    if (['k', 'nghin', 'ngan'].includes(unit)) return amount * 1000;
    return amount;
};

const buildProductMetrics = (products = []) => {
    return products.map((product) => {
        const sold = parseFlexibleNumber(product.sold);
        const revenue = parseFlexibleNumber(product.rev);
        const price = parseFlexibleNumber(product.price);
        const rating = parseFlexibleNumber(product.rating);

        return {
            ...product,
            soldValue: sold,
            revenueValue: revenue,
            priceValue: price,
            ratingValue: rating,
        };
    });
};

const buildChatAdvice = ({ message, products, keyword, insight }) => {
    const normalized = normalizeBotText(message);
    const metrics = buildProductMetrics(products);

    if (!metrics.length) {
        return `Chưa có dữ liệu sản phẩm để tư vấn cho "${keyword || 'dữ liệu hiện tại'}". Hãy phân tích 1 từ khóa hoặc tải CSV trước, rồi tôi sẽ gợi ý mặt hàng tiềm năng, ít cạnh tranh và phù hợp vốn.`;
    }

    const categoryMap = new Map();
    metrics.forEach((item) => {
        const category = item.cat || 'khac';
        const current = categoryMap.get(category) || { count: 0, sold: 0, rating: 0 };
        current.count += 1;
        current.sold += item.soldValue;
        current.rating += item.ratingValue || 0;
        categoryMap.set(category, current);
    });

    const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        ...data,
        avgRating: data.count > 0 ? data.rating / data.count : 0,
    }));

    const pickBest = (list, scoreFn, limit = 3) =>
        [...list]
            .sort((a, b) => scoreFn(b) - scoreFn(a))
            .slice(0, limit);

    const topSell = pickBest(metrics, (item) => (item.soldValue * 0.7) + (item.ratingValue * 10000) + (item.revenueValue / 100000), 3);
    const topValue = pickBest(metrics, (item) => (item.revenueValue / 1000000) + (item.ratingValue * 20) - (item.priceValue / 100000), 3);
    const nicheCategories = [...categories]
        .filter((cat) => cat.count <= 2)
        .sort((a, b) => (b.avgRating - a.avgRating) || (a.count - b.count));

    const budget = extractBudgetFromText(normalized);

    const topSellText = topSell
        .map((item, index) => `${index + 1}. ${item.name} | bán ${item.soldValue.toLocaleString()} | rating ${item.ratingValue.toFixed(1)}/5 | giá ${item.price}`)
        .join('\n');

    const topValueText = topValue
        .map((item, index) => `${index + 1}. ${item.name} | doanh thu ${formatCompactMoney(item.revenueValue)} | bán ${item.soldValue.toLocaleString()} | giá ${item.price}`)
        .join('\n');

    const nicheText = nicheCategories.length
        ? nicheCategories
            .slice(0, 3)
            .map((cat, index) => `${index + 1}. ${cat.name} | ${cat.count} sản phẩm | rating TB ${cat.avgRating.toFixed(1)}/5`)
            .join('\n')
        : 'Chưa thấy ngách nhỏ rõ ràng trong tập dữ liệu này, nên ưu tiên nhóm có rating cao và lượng bán ổn định.';

    if (normalized.includes('von') || normalized.includes('ngan sach') || normalized.includes('budget')) {
        if (budget > 0) {
            const affordable = metrics
                .filter((item) => item.priceValue <= budget)
                .sort((a, b) => (b.ratingValue + b.soldValue / 100000) - (a.ratingValue + a.soldValue / 100000))
                .slice(0, 3);

            if (affordable.length) {
                return `Với vốn khoảng ${formatCompactMoney(budget)}, tôi ưu tiên 3 mặt hàng sau:\n${affordable.map((item, index) => `${index + 1}. ${item.name} | giá ${item.price} | bán ${item.soldValue.toLocaleString()} | rating ${item.ratingValue.toFixed(1)}/5`).join('\n')}\n\nLý do: giá phù hợp vốn, rating tốt và có sức bán trong nhóm đang xem.`;
            }
        }

        return `Nếu ưu tiên vốn thấp, hãy chọn nhóm có giá thấp hơn giá trung bình (${metrics.reduce((sum, item) => sum + item.priceValue, 0) / metrics.length} VND) và rating từ 4.5 trở lên. Trong dữ liệu hiện tại, 3 sản phẩm bán tốt nhất là:\n${topSellText}`;
    }

    if (normalized.includes('it canh tranh') || normalized.includes('ngach') || normalized.includes('niche')) {
        return `Gợi ý ngách ít cạnh tranh trong dữ liệu hiện tại:\n${nicheText}\n\nKhi chọn ngách, ưu tiên: ít sản phẩm cùng category + rating trung bình cao + có sản phẩm bán ra ổn định.`;
    }

    if (normalized.includes('loi nhuan') || normalized.includes('lai') || normalized.includes('ban gi') || normalized.includes('tien nang') || normalized.includes('de ban') || normalized.includes('hot')) {
        return `Tôi đề xuất 3 hướng đáng chú ý cho "${keyword || 'dữ liệu hiện tại'}":\n\nDễ bán nhất:\n${topSellText}\n\nGiá trị/Doanh thu tốt:\n${topValueText}\n\nNgách đáng thử:\n${nicheText}`;
    }

    return `Đang xem "${keyword || 'dữ liệu hiện tại'}". Tôi có thể giúp bạn theo 3 hướng nhanh:\n1. Gợi ý sản phẩm dễ bán nhất\n2. Gợi ý mặt hàng phù hợp theo vốn\n3. Tìm ngách ít cạnh tranh\n\nBạn có thể bấm nút nhanh hoặc gõ: "bán gì với vốn 1 triệu".`;
};

const defaultChatMessages = [
    {
        role: 'bot',
        text: 'Tôi có thể gợi ý mặt hàng tiềm năng từ dữ liệu bạn đang xem. Hãy thử: "gợi ý sản phẩm tiềm năng", "bán gì với vốn 1 triệu", hoặc "ngách ít cạnh tranh".'
    }
];

// ============================================================
// ✅ MAIN APP COMPONENT
// ============================================================

function App() {
    const [activeTab, setActiveTab] = useState('single');
    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState(defaultChatMessages);
    
    // State for Single Tab
    const [keyword, setKeyword] = useState('');
    const [loadingSingle, setLoadingSingle] = useState(false);
    const [resultSingle, setResultSingle] = useState(null);
    const [insightSingle, setInsightSingle] = useState('');

    // State for Batch Tab (CSV)
    const [selectedFile, setSelectedFile] = useState(null);
    const [loadingBatch, setLoadingBatch] = useState(false);
    const [resultBatch, setResultBatch] = useState(null);
    const [insightBatch, setInsightBatch] = useState('');
    const [batchInsights, setBatchInsights] = useState([]);
    const [selectedBatchInsightIndex, setSelectedBatchInsightIndex] = useState(0);

    const reportRef = useRef(null);

    const handleAnalysis = async (type, payload) => {
        if (type === 'single') {
            setLoadingSingle(true);
            setResultSingle(null);
            setInsightSingle('');
            setBatchInsights([]);
            setSelectedBatchInsightIndex(0);
        } else {
            setLoadingBatch(true);
            setResultBatch(null);
            setInsightBatch('');
            setBatchInsights([]);
            setSelectedBatchInsightIndex(0);
        }

        try {
            const result = await executeAnalysis(type, payload);
            
            if (type === 'single') {
                setResultSingle(result.products);
                setInsightSingle(result.insight);
                setLoadingSingle(false);
            } else {
                setResultBatch(result.products);
                setInsightBatch(result.insight);
                setBatchInsights(result.batchInsights || []);
                setSelectedBatchInsightIndex(0);
                setLoadingBatch(false);
            }
            
            setTimeout(() => lucide.createIcons(), 100);
            
        } catch (error) {
            const errorMsg = `❌ Lỗi kết nối Backend:\n${error.message}\n\nVui lòng kiểm tra:\n1. Backend đã chạy chưa? (python main.py)\n2. URL API đúng chưa? (${API_BASE_URL || 'CHUA_CAU_HINH'})\n3. Nếu chạy trên GitHub Pages: API phải là public URL (Render/Railway/Fly.io), không dùng localhost\n4. Nếu web là HTTPS thì API cũng phải HTTPS\n5. CORS đã cấu hình chưa?`;
            
            if (type === 'single') {
                setInsightSingle(errorMsg);
                setLoadingSingle(false);
            } else {
                setInsightBatch(errorMsg);
                setBatchInsights([]);
                setSelectedBatchInsightIndex(0);
                setLoadingBatch(false);
            }
        }
    };

    const hasBatchInsights = batchInsights.length > 0;
    const safeBatchInsightIndex = hasBatchInsights
        ? Math.min(selectedBatchInsightIndex, batchInsights.length - 1)
        : 0;
    const selectedBatchInsight = hasBatchInsights ? batchInsights[safeBatchInsightIndex] : null;
    const currentChatProducts = activeTab === 'single'
        ? (resultSingle || [])
        : (selectedBatchInsight?.products || resultBatch || []);
    const currentChatKeyword = activeTab === 'single'
        ? (keyword || 'từ khóa hiện tại')
        : (selectedBatchInsight?.keyword || selectedFile?.name || 'CSV hiện tại');
    const currentChatInsight = activeTab === 'single'
        ? insightSingle
        : (selectedBatchInsight?.insight || insightBatch);

    const handleSingleExecute = () => {
        if (!keyword.trim()) return;
        handleAnalysis('single', { keyword });
    };

    const handleBatchExecute = () => {
        if (!selectedFile) return;
        handleAnalysis('batch', { file: selectedFile });
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const sendChatMessage = (message) => {
        const trimmed = String(message || '').trim();
        if (!trimmed) return;

        setChatMessages((previous) => [
            ...previous,
            { role: 'user', text: trimmed },
            {
                role: 'bot',
                text: buildChatAdvice({
                    message: trimmed,
                    products: currentChatProducts,
                    keyword: currentChatKeyword,
                    insight: currentChatInsight,
                })
            }
        ]);
        setChatInput('');
        setChatOpen(true);
    };

    const handleChatSubmit = () => {
        sendChatMessage(chatInput);
    };

    const handleQuickChat = (prompt) => {
        sendChatMessage(prompt);
    };

    const exportToPDF = () => {
        const isSingle = activeTab === 'single';
        const resultData = isSingle
            ? resultSingle
            : (selectedBatchInsight ? selectedBatchInsight.products : resultBatch);
        const insightData = isSingle
            ? insightSingle
            : (selectedBatchInsight ? selectedBatchInsight.insight : insightBatch);
        const titleKeyword = isSingle
            ? keyword
            : (selectedBatchInsight
                ? `Từ khóa: ${selectedBatchInsight.keyword}`
                : (selectedFile ? selectedFile.name : 'File CSV'));

        const pdfContent = `
            <div style="font-family: 'Arial', sans-serif; padding: 20px; background: white; color: black;">
                <h1 style="color: #1e293b; margin-bottom: 5px;">Báo Cáo Phân Tích Thị Trường E-Commerce</h1>
                <p style="color: #666; font-size: 14px; margin: 5px 0;">
                    Nguồn: ${isSingle ? `Từ khóa: ${titleKeyword}` : `File: ${titleKeyword}`}
                </p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;">
                    Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}
                </p>
                
                <h2 style="color: #1e293b; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #e11d48; padding-bottom: 10px;">
                    AI Insights
                </h2>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; font-family: monospace; font-size: 12px; line-height: 1.6;">
                    ${(insightData || "Không có dữ liệu.").replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                </div>
                
                <h2 style="color: #1e293b; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #e11d48; padding-bottom: 10px;">
                    Top Sản Phẩm
                </h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #e11d48; color: white;">
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">STT</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Sản phẩm</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Danh mục</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Giá bán</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Đã bán</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Doanh Thu</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${resultData.map((item, idx) => `
                            <tr style="background-color: ${idx % 2 === 0 ? '#f9f9f9' : 'white'};">
                                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${idx + 1}</td>
                                <td style="border: 1px solid #ddd; padding: 10px;">${item.name}</td>
                                <td style="border: 1px solid #ddd; padding: 10px;">${item.cat}</td>
                                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${item.price}</td>
                                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">${item.sold}</td>
                                <td style="border: 1px solid #ddd; padding: 10px; text-align: right; color: #e11d48; font-weight: bold;">${item.rev}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        const element = document.createElement('div');
        element.innerHTML = pdfContent;
        
        const opt = {
            margin: 10,
            filename: `BaoCao_${isSingle ? 'Single' : 'Batch'}_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };
        
        html2pdf().set(opt).from(element).save();
    };

    React.useEffect(() => {
        lucide.createIcons();
    }, [activeTab, resultSingle, resultBatch]);

    // Reusable Result Component
    const renderResult = (result, insight, loading) => {
        const kpi = calculateKPI(result);
        
        return (
        <div ref={reportRef} className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-10 mt-8">
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "Tổng Doanh Thu", val: kpi.revenue, icon: "dollar-sign", color: "text-green-400" },
                    { label: "Sản Phẩm Bán Ra", val: kpi.sold, icon: "shopping-bag", color: "text-blue-400" },
                    { label: "Giá TB Đơn Hàng", val: kpi.avg, icon: "tag", color: "text-purple-400" },
                    { label: "Tăng Trưởng", val: kpi.growth, icon: "trending-up", color: "text-rose-400" },
                ].map((item, idx) => (
                    <div key={idx} className="bg-[#1e293b] p-5 rounded-xl border border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-gray-400 text-sm">{item.label}</span>
                            <Icon name={item.icon} size={18} className={item.color} />
                        </div>
                        <div className="text-2xl font-bold text-white">{item.val}</div>
                    </div>
                ))}
            </div>

            {/* AI INSIGHT BOX */}
            <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg">
                            <Icon name="bot" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">AI Smart Insights</h3>
                            <p className="text-xs text-indigo-200">Phân tích tự động bởi Gemini AI</p>
                        </div>
                    </div>
                    <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10 text-sm leading-relaxed text-gray-200">
                        {renderFormattedInsight(insight)}
                    </div>
                </div>
            </div>

            {/* PRODUCT TABLE */}
            <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden shadow-lg">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#253042]">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Icon name="trophy" size={18} className="text-yellow-500"/> Top Sản Phẩm
                    </h3>
                    <span className="text-xs text-gray-400">Dữ liệu từ Backend API</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-[#1e293b] border-b border-gray-700">
                            <tr>
                                <th className="px-6 py-3 w-12 text-center">Thứ tự</th>
                                <th className="px-6 py-3">Sản phẩm</th>
                                <th className="px-6 py-3">Danh mục</th>
                                <th className="px-6 py-3 text-right">Giá bán</th>
                                <th className="px-6 py-3 text-right">Đã bán</th>
                                <th className="px-6 py-3 text-right">Doanh Thu</th>
                                <th className="px-6 py-3 text-center">Link</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {result.map((item, idx) => {
                                const isTop3 = idx < 3;
                                const rank = idx + 1;
                                const rankBadge = isTop3 ? `TOP ${rank}` : rank;
                                const productLink = item.url || (item.product_id ? `https://tiki.vn/p/${item.product_id}` : '#');
                                
                                return (
                                <tr key={item.id} className={`${isTop3 ? 'bg-gradient-to-r from-rose-900/20 to-purple-900/20 border-l-4 border-rose-500' : 'hover:bg-[#253042]'} transition-colors`}>
                                    <td className="px-6 py-4 text-center text-gray-500 font-mono">
                                        {isTop3 ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-rose-600 text-white">
                                                {rankBadge}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">{rank}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white truncate max-w-[200px]" title={item.name}>
                                        {isTop3 && <span className="text-rose-400 mr-1">🏆</span>}
                                        {item.name}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isTop3 ? 'bg-rose-800 text-rose-200 border border-rose-600' : 'bg-gray-800 text-gray-300 border border-gray-600'}`}>
                                            {item.cat}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-400">{item.price}</td>
                                    <td className="px-6 py-4 text-right text-green-400 font-medium">{item.sold}</td>
                                    <td className="px-6 py-4 text-right text-rose-400 font-bold">{item.rev}</td>
                                    <td className="px-6 py-4 text-center">
                                        <a 
                                            href={productLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                        >
                                            <Icon name="external-link" size={12} className="mr-1" />
                                            Xem
                                        </a>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        );
    };

    return (
        <div className="flex h-screen bg-[#0f172a] overflow-hidden">
            
            {/* SIDEBAR */}
            <div className="w-64 bg-[#1e293b] border-r border-gray-700 flex flex-col z-20 shadow-xl">
                <div className="p-6 flex items-center gap-3 border-b border-gray-700">
                    <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                        <Icon name="sparkles" size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-white tracking-tight">TikiAnalyst</h1>
                        <p className="text-xs text-gray-400">AI-Powered</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button onClick={() => setActiveTab('single')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'single' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                        <Icon name="search" size={18} /> Phân tích đơn
                    </button>
                    <button onClick={() => setActiveTab('batch')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'batch' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                        <Icon name="upload-cloud" size={18} /> Phân tích loạt (CSV)
                    </button>
                    <div className="pt-4 mt-4 border-t border-gray-700">
                        <p className="px-4 text-xs font-semibold text-gray-500 uppercase mb-2">Hệ thống</p>
                        <div className="px-4 py-2 text-sm text-gray-400 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> API: {API_BASE_URL}
                        </div>
                        <div className="px-4 py-2 text-sm text-gray-400 flex items-center gap-2">
                            <Icon name="database" size={14} /> Source: Delta Lake
                        </div>
                    </div>
                </nav>
                
                <div className="p-4 border-t border-gray-700 text-xs text-gray-500 text-center">
                    v1.0.0 • Tiki Project
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                
                {/* HEADER */}
                <header className="h-16 bg-[#1e293b] border-b border-gray-700 flex items-center justify-between px-8 z-10">
                    <h2 className="text-xl font-bold text-white">
                        {activeTab === 'single' ? 'Phân tích từ khóa' : 'Phân tích dữ liệu CSV'}
                    </h2>
                    <div className="flex items-center gap-4">
                        {(resultSingle || resultBatch) && (
                            <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-900/20">
                                <Icon name="download" size={16} /> Xuất PDF
                            </button>
                        )}
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold border border-gray-600">
                            A
                        </div>
                    </div>
                </header>

                {/* SCROLLABLE AREA */}
                <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
                    
                    {/* INPUT SECTION - SINGLE TAB */}
                    {activeTab === 'single' && (
                        <div className="max-w-4xl mx-auto mb-8">
                            <div className="glass-panel p-6 rounded-xl flex gap-4 items-end animate-fade-in">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Nhập từ khóa sản phẩm</label>
                                    <input 
                                        type="text" 
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        placeholder="Ví dụ: tai nghe bluetooth, laptop gaming..." 
                                        className="w-full bg-[#0f172a] border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSingleExecute()}
                                    />
                                </div>
                                <button 
                                    onClick={handleSingleExecute}
                                    disabled={loadingSingle || !keyword}
                                    className="px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-rose-900/20"
                                >
                                    {loadingSingle ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="play" className="fill-current" />}
                                    Phân tích
                                </button>
                            </div>
                        </div>
                    )}

                    {/* INPUT SECTION - BATCH TAB */}
                    {activeTab === 'batch' && (
                        <div className="max-w-4xl mx-auto mb-8">
                            <div className="glass-panel p-8 rounded-xl text-center animate-fade-in">
                                <div 
                                    className="border-2 border-dashed border-gray-600 rounded-xl p-8 hover:border-rose-500 hover:bg-rose-500/5 transition-all cursor-pointer group"
                                    onClick={() => document.getElementById('fileInput').click()}
                                >
                                    <input id="fileInput" type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Icon name="upload-cloud" size={32} className="text-rose-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">
                                        {selectedFile ? selectedFile.name : "Click để tải lên file CSV"}
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(2)} KB` : "Hỗ trợ .csv (Max 50MB)"}
                                    </p>
                                </div>
                                {selectedFile && (
                                    <div className="mt-4 flex justify-center">
                                        <button 
                                            onClick={handleBatchExecute}
                                            disabled={loadingBatch}
                                            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-rose-900/20"
                                        >
                                            {loadingBatch ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="play" className="fill-current" />}
                                            Phân tích File
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* LOADING STATE */}
                    {((activeTab === 'single' && loadingSingle) || (activeTab === 'batch' && loadingBatch)) && (
                        <div className="flex flex-col items-center justify-center py-20 text-rose-500 animate-pulse">
                            <Icon name="bot" size={48} className="mb-4" />
                            <p className="text-lg font-medium">Đang gọi Backend API...</p>
                            <p className="text-sm text-gray-400">Vui lòng đợi</p>
                        </div>
                    )}

                    {/* RESULTS DASHBOARD - SINGLE */}
                    {!loadingSingle && resultSingle && activeTab === 'single' && renderResult(resultSingle, insightSingle, false)}

                    {/* RESULTS DASHBOARD - BATCH */}
                    {!loadingBatch && activeTab === 'batch' && selectedBatchInsight && (
                        <div className="space-y-6">
                            <div className="max-w-6xl mx-auto bg-[#1e293b] rounded-xl border border-gray-700 p-4">
                                <div className="text-xs text-gray-400 mb-3">Chọn từ khóa để xem dashboard chi tiết:</div>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {batchInsights.map((entry, idx) => (
                                        <button
                                            key={`${entry.keyword}-${idx}`}
                                            onClick={() => setSelectedBatchInsightIndex(idx)}
                                            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${safeBatchInsightIndex === idx ? 'bg-rose-600 text-white border-rose-500' : 'bg-[#0f172a] text-gray-300 border-gray-600 hover:border-rose-500 hover:text-white'}`}
                                        >
                                            {entry.keyword} ({entry.totalFound})
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="max-w-6xl mx-auto text-sm text-gray-300">
                                Đang xem: <span className="font-semibold text-white">{selectedBatchInsight.keyword}</span>
                            </div>
                            {renderResult(selectedBatchInsight.products, selectedBatchInsight.insight, false)}
                        </div>
                    )}

                    {!loadingBatch && activeTab === 'batch' && !selectedBatchInsight && resultBatch && renderResult(resultBatch, insightBatch, false)}

                    {/* EMPTY STATE */}
                    {!loadingSingle && !resultSingle && !loadingBatch && !resultBatch && (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500 opacity-60">
                            <Icon name="bar-chart-2" size={64} className="mb-4" />
                            <p className="text-lg">
                                {activeTab === 'single' 
                                    ? "Nhập từ khóa để bắt đầu" 
                                    : "Tải lên CSV để phân tích"}
                            </p>
                        </div>
                    )}

                </main>

                {/* CHATBOT FLOATING PANEL */}
                <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
                    {chatOpen && (
                        <div className="w-[380px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-indigo-500/30 bg-[#111827]/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
                            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white">
                                        <Icon name="bot" size={18} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">Sales Assistant</div>
                                        <div className="text-[11px] text-indigo-100">Tư vấn sản phẩm tiềm năng theo dữ liệu hiện tại</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setChatOpen(false)}
                                    className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                                    aria-label="Đóng chatbot"
                                >
                                    <Icon name="x" size={16} />
                                </button>
                            </div>

                            <div className="border-b border-white/10 px-4 py-3">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Gợi ý nhanh</div>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'Gợi ý sản phẩm tiềm năng',
                                        'Bán gì với vốn 1 triệu',
                                        'Ngách ít cạnh tranh',
                                    ].map((item) => (
                                        <button
                                            key={item}
                                            onClick={() => handleQuickChat(item)}
                                            className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-100 transition-colors hover:bg-indigo-500/20"
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-2 text-[11px] text-gray-500">
                                    Đang tư vấn theo: <span className="font-semibold text-gray-300">{currentChatKeyword}</span>
                                </div>
                            </div>

                            <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
                                {chatMessages.map((message, index) => (
                                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'bg-rose-600 text-white' : 'border border-white/10 bg-white/5 text-gray-100'}`}>
                                            {message.text}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-white/10 p-3">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                                        placeholder="Hỏi: nên bán gì, vốn bao nhiêu, ngách nào..."
                                        className="flex-1 rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-indigo-400"
                                    />
                                    <button
                                        onClick={handleChatSubmit}
                                        className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                                    >
                                        <Icon name="send" size={15} />
                                        Gửi
                                    </button>
                                </div>
                                <div className="mt-2 text-[11px] text-gray-500">
                                    Chatbot dùng dữ liệu đang xem để gợi ý mặt hàng tiềm năng.
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => setChatOpen((value) => !value)}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-2xl shadow-indigo-900/40 ring-1 ring-white/15 transition-transform hover:scale-105"
                        aria-label="Mở chatbot"
                    >
                        <Icon name={chatOpen ? 'minus' : 'message-circle'} size={22} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ✅ FIX: Render app directly without loading data.json
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);


