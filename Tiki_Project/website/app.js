// ============================================================
// ðŸš€ TIKI ANALYST - FRONTEND (FIXED VERSION)
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

    // Parse numeric values safely from mixed locale strings (e.g. 2.542.605.000 VNÄ)
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

    // TÃ­nh tá»•ng doanh thu tá»« estimated_revenue
    const totalRevenue = products.reduce((sum, p) => {
        const revenue = parseLocaleInteger(p.rev);
        return sum + revenue;
    }, 0);

    // TÃ­nh tá»•ng sáº£n pháº©m bÃ¡n ra tá»« boughtInLastMonth
    const totalSold = products.reduce((sum, p) => {
        const sold = parseLocaleInteger(p.sold);
        return sum + sold;
    }, 0);

    // TÃ­nh giÃ¡ trung bÃ¬nh tá»« price
    const totalPrice = products.reduce((sum, p) => {
        const price = parseLocaleInteger(p.price);
        return sum + price;
    }, 0);
    const avgPrice = products.length > 0 ? totalPrice / products.length : 0;

    // Æ¯u tiÃªn láº¥y tÄƒng trÆ°á»Ÿng tháº­t tá»« backend náº¿u cÃ³; khÃ´ng tá»± bá»‹a cÃ´ng thá»©c tá»« sá»‘ lÆ°á»£ng item.
    const growthValues = products
        .map((p) => parseNumeric(p.growth_percent ?? p.monthly_growth ?? p.growth_rate ?? p.growth))
        .filter((v) => v !== null);

    let growth = 'N/A';
    if (growthValues.length > 0) {
        const avgGrowth = growthValues.reduce((sum, v) => sum + v, 0) / growthValues.length;
        const sign = avgGrowth > 0 ? '+' : '';
        growth = `${sign}${avgGrowth.toFixed(1)}%`;
    } else if (products.length > 0 && totalSold > 0) {
        // Fallback: Tính growth dựa trên MEDIAN của search results
        // Logic: So sánh avg sold per product với median của results
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
// ðŸ›‘ API CONFIGURATION & FUNCTIONS
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
            throw new Error('ChÆ°a cáº¥u hÃ¬nh API_BASE_URL cho mÃ´i trÆ°á»ng deploy (GitHub Pages).');
        }

        if (window.location.protocol === 'https:' && API_BASE_URL.startsWith('http://')) {
            throw new Error('Trang Ä‘ang cháº¡y HTTPS nhÆ°ng API lÃ  HTTP (mixed content sáº½ bá»‹ cháº·n).');
        }

        let response;
        if (type === 'single') {
            // âœ… FIX: DÃ¹ng API_BASE_URL thay vÃ¬ API_URL
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
            // âœ… FIX: DÃ¹ng API_BASE_URL thay vÃ¬ API_URL
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
        
        // âœ… FIX: Response mapping Ä‘Ãºng vá»›i backend format
        return {
            products: result.data.products.map((p, idx) => ({
                id: idx + 1,
                product_id: p.product_id || '',
                name: p.title || p.name || p.product_name || 'N/A',  // Backend tráº£ 'title'
                cat: p.categoryName || p.category || p.category_name || 'N/A',  // Backend tráº£ 'categoryName'
                price: `${(p.price || 0).toLocaleString()} VNÄ`,
                sold: (p.boughtInLastMonth || p.quantity_sold || p.review_count || 0).toLocaleString(),  // Backend tráº£ 'boughtInLastMonth'
                rev: (p.estimated_revenue || 0).toLocaleString() + ' VNÄ',  // Backend tráº£ 'estimated_revenue'
                growth_percent: p.growth_percent ?? p.monthly_growth ?? p.growth_rate ?? p.growth ?? null,
                url: p.product_url || p.url_path || (p.product_id ? `https://tiki.vn/p/${p.product_id}` : '')
            })),
            insight: result.data.ai_insight || 'KhÃ´ng cÃ³ insight'
        };
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

const renderFormattedInsight = (insight) => {
    if (!insight) {
        return <div className="text-sm text-gray-300">KhÃ´ng cÃ³ insight Ä‘á»ƒ hiá»ƒn thá»‹.</div>;
    }

    const blocks = insight.split(/\n{2,}/g).filter(Boolean);

    return blocks.map((block, index) => {
        const lines = block.split('\n').filter(Boolean);
        const firstLine = lines[0].trim();
        const isHeading = /^(?:\*\*|##|###|ðŸŽ¯|ðŸ“ˆ|ðŸ’¡|ðŸ“Š|ðŸ’°|âœ…|ðŸ”¥)/.test(firstLine);

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
                                <span className="text-rose-400">â€¢</span>
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

// ============================================================
// âœ… MAIN APP COMPONENT
// ============================================================

function App() {
    const [activeTab, setActiveTab] = useState('single');
    
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

    const reportRef = useRef(null);

    const handleAnalysis = async (type, payload) => {
        if (type === 'single') {
            setLoadingSingle(true);
            setResultSingle(null);
            setInsightSingle('');
        } else {
            setLoadingBatch(true);
            setResultBatch(null);
            setInsightBatch('');
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
                setLoadingBatch(false);
            }
            
            setTimeout(() => lucide.createIcons(), 100);
            
        } catch (error) {
            const errorMsg = `âŒ Lá»—i káº¿t ná»‘i Backend:\n${error.message}\n\nVui lÃ²ng kiá»ƒm tra:\n1. Backend Ä‘Ã£ cháº¡y chÆ°a? (python main.py)\n2. URL API Ä‘Ãºng chÆ°a? (${API_BASE_URL || 'CHUA_CAU_HINH'})\n3. Náº¿u cháº¡y trÃªn GitHub Pages: API pháº£i lÃ  public URL (Render/Railway/Fly.io), khÃ´ng dÃ¹ng localhost\n4. Náº¿u web lÃ  HTTPS thÃ¬ API cÅ©ng pháº£i HTTPS\n5. CORS Ä‘Ã£ cáº¥u hÃ¬nh chÆ°a?`;
            
            if (type === 'single') {
                setInsightSingle(errorMsg);
                setLoadingSingle(false);
            } else {
                setInsightBatch(errorMsg);
                setLoadingBatch(false);
            }
        }
    };

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

    const exportToPDF = () => {
        const isSingle = activeTab === 'single';
        const resultData = isSingle ? resultSingle : resultBatch;
        const insightData = isSingle ? insightSingle : insightBatch;
        const titleKeyword = isSingle ? keyword : (selectedFile ? selectedFile.name : 'File CSV');

        const pdfContent = `
            <div style="font-family: 'Arial', sans-serif; padding: 20px; background: white; color: black;">
                <h1 style="color: #1e293b; margin-bottom: 5px;">BÃ¡o CÃ¡o PhÃ¢n TÃ­ch Thá»‹ TrÆ°á»ng E-Commerce</h1>
                <p style="color: #666; font-size: 14px; margin: 5px 0;">
                    Nguá»“n: ${isSingle ? `Tá»« khÃ³a: ${titleKeyword}` : `File: ${titleKeyword}`}
                </p>
                <p style="color: #666; font-size: 14px; margin: 5px 0;">
                    NgÃ y táº¡o: ${new Date().toLocaleDateString('vi-VN')}
                </p>
                
                <h2 style="color: #1e293b; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #e11d48; padding-bottom: 10px;">
                    AI Insights
                </h2>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; font-family: monospace; font-size: 12px; line-height: 1.6;">
                    ${(insightData || "KhÃ´ng cÃ³ dá»¯ liá»‡u.").replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                </div>
                
                <h2 style="color: #1e293b; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #e11d48; padding-bottom: 10px;">
                    Top Sáº£n Pháº©m
                </h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #e11d48; color: white;">
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">STT</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Sáº£n pháº©m</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Danh má»¥c</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">GiÃ¡ bÃ¡n</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">ÄÃ£ bÃ¡n</th>
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
                    { label: "Tá»•ng Doanh Thu", val: kpi.revenue, icon: "dollar-sign", color: "text-green-400" },
                    { label: "Sáº£n Pháº©m BÃ¡n Ra", val: kpi.sold, icon: "shopping-bag", color: "text-blue-400" },
                    { label: "GiÃ¡ TB ÄÆ¡n HÃ ng", val: kpi.avg, icon: "tag", color: "text-purple-400" },
                    { label: "TÄƒng TrÆ°á»Ÿng", val: kpi.growth, icon: "trending-up", color: "text-rose-400" },
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
                            <p className="text-xs text-indigo-200">PhÃ¢n tÃ­ch tá»± Ä‘á»™ng bá»Ÿi Gemini AI</p>
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
                        <Icon name="trophy" size={18} className="text-yellow-500"/> Top Sáº£n Pháº©m
                    </h3>
                    <span className="text-xs text-gray-400">Dá»¯ liá»‡u tá»« Backend API</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-[#1e293b] border-b border-gray-700">
                            <tr>
                                <th className="px-6 py-3 w-12 text-center">Thá»© tá»±</th>
                                <th className="px-6 py-3">Sáº£n pháº©m</th>
                                <th className="px-6 py-3">Danh má»¥c</th>
                                <th className="px-6 py-3 text-right">GiÃ¡ bÃ¡n</th>
                                <th className="px-6 py-3 text-right">ÄÃ£ bÃ¡n</th>
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
                                        {isTop3 && <span className="text-rose-400 mr-1">ðŸ†</span>}
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
                        <Icon name="search" size={18} /> PhÃ¢n tÃ­ch Ä‘Æ¡n
                    </button>
                    <button onClick={() => setActiveTab('batch')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'batch' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                        <Icon name="upload-cloud" size={18} /> PhÃ¢n tÃ­ch loáº¡t (CSV)
                    </button>
                    <div className="pt-4 mt-4 border-t border-gray-700">
                        <p className="px-4 text-xs font-semibold text-gray-500 uppercase mb-2">Há»‡ thá»‘ng</p>
                        <div className="px-4 py-2 text-sm text-gray-400 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> API: {API_BASE_URL}
                        </div>
                        <div className="px-4 py-2 text-sm text-gray-400 flex items-center gap-2">
                            <Icon name="database" size={14} /> Source: Delta Lake
                        </div>
                    </div>
                </nav>
                
                <div className="p-4 border-t border-gray-700 text-xs text-gray-500 text-center">
                    v1.0.0 â€¢ Tiki Project
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                
                {/* HEADER */}
                <header className="h-16 bg-[#1e293b] border-b border-gray-700 flex items-center justify-between px-8 z-10">
                    <h2 className="text-xl font-bold text-white">
                        {activeTab === 'single' ? 'PhÃ¢n tÃ­ch tá»« khÃ³a' : 'PhÃ¢n tÃ­ch dá»¯ liá»‡u CSV'}
                    </h2>
                    <div className="flex items-center gap-4">
                        {(resultSingle || resultBatch) && (
                            <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-900/20">
                                <Icon name="download" size={16} /> Xuáº¥t PDF
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
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Nháº­p tá»« khÃ³a sáº£n pháº©m</label>
                                    <input 
                                        type="text" 
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        placeholder="VÃ­ dá»¥: tai nghe bluetooth, laptop gaming..." 
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
                                    PhÃ¢n tÃ­ch
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
                                        {selectedFile ? selectedFile.name : "Click Ä‘á»ƒ táº£i lÃªn file CSV"}
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(2)} KB` : "Há»— trá»£ .csv (Max 50MB)"}
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
                                            PhÃ¢n tÃ­ch File
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
                            <p className="text-lg font-medium">Äang gá»i Backend API...</p>
                            <p className="text-sm text-gray-400">Vui lÃ²ng Ä‘á»£i</p>
                        </div>
                    )}

                    {/* RESULTS DASHBOARD - SINGLE */}
                    {!loadingSingle && resultSingle && activeTab === 'single' && renderResult(resultSingle, insightSingle, false)}

                    {/* RESULTS DASHBOARD - BATCH */}
                    {!loadingBatch && resultBatch && activeTab === 'batch' && renderResult(resultBatch, insightBatch, false)}

                    {/* EMPTY STATE */}
                    {!loadingSingle && !resultSingle && !loadingBatch && !resultBatch && (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500 opacity-60">
                            <Icon name="bar-chart-2" size={64} className="mb-4" />
                            <p className="text-lg">
                                {activeTab === 'single' 
                                    ? "Nháº­p tá»« khÃ³a Ä‘á»ƒ báº¯t Ä‘áº§u" 
                                    : "Táº£i lÃªn CSV Ä‘á»ƒ phÃ¢n tÃ­ch"}
                            </p>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
}

// âœ… FIX: Render app directly without loading data.json
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);



