// ============================================================
// 🔧 SHARED UTILITIES — Icon, calculateKPI, API, renderResult
// ============================================================

// --- ICONS COMPONENT ---
const Icon = ({ name, size = 20, className = "" }) => <i data-lucide={name} width={size} height={size} className={className}></i>;

// --- CALCULATE KPI FROM PRODUCTS DATA ---
const calculateKPI = (products) => {
    if (!products || products.length === 0) {
        return { revenue: "$0", sold: "0", avg: "$0", growth: "N/A" };
    }

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

    const totalRevenue = products.reduce((sum, p) => sum + parseLocaleInteger(p.rev), 0);
    const totalSold    = products.reduce((sum, p) => sum + parseLocaleInteger(p.sold), 0);
    const totalPrice   = products.reduce((sum, p) => sum + parseLocaleInteger(p.price), 0);
    const avgPrice     = products.length > 0 ? totalPrice / products.length : 0;

    const growthValues = products
        .map((p) => parseNumeric(p.growth_percent ?? p.monthly_growth ?? p.growth_rate ?? p.growth))
        .filter((v) => v !== null);

    let growth = 'N/A';
    if (growthValues.length > 0) {
        const avgGrowth = growthValues.reduce((sum, v) => sum + v, 0) / growthValues.length;
        const sign = avgGrowth > 0 ? '+' : '';
        growth = `${sign}${avgGrowth.toFixed(1)}%`;
    } else if (products.length > 0 && totalSold > 0) {
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
    if (configured) return configured.replace(/\/+$/, '');
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:8000';
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
            response = await fetch(`${API_BASE_URL}/api/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keyword: payload.keyword,
                    market: 'US',
                    limit: 9999,
                    display_limit: 20,
                    context_id: payload.context_id || null,
                })
            });
        } else {
            const formData = new FormData();
            formData.append('file', payload.file);
            response = await fetch(`${API_BASE_URL}/api/analyze-batch`, {
                method: 'POST',
                body: formData
            });
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Unknown error');

        return {
            products: result.data.products.map((p, idx) => ({
                id: idx + 1,
                product_id: p.product_id || '',
                name: p.title || p.name || p.product_name || 'N/A',
                cat: p.categoryName || p.category || p.category_name || 'N/A',
                price: `${(p.price || 0).toLocaleString()} VNĐ`,
                sold: (p.boughtInLastMonth || p.quantity_sold || p.review_count || 0).toLocaleString(),
                rev: (p.estimated_revenue || 0).toLocaleString() + ' VNĐ',
                growth_percent: p.growth_percent ?? p.monthly_growth ?? p.growth_rate ?? p.growth ?? null,
                url: p.product_url || p.url_path || (p.product_id ? `https://tiki.vn/p/${p.product_id}` : '')
            })),
            insight: result.data.ai_insight || 'Không có insight',
            context: result.data.context || null,
        };
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// ============================================================
// 📝 RENDER HELPERS
// ============================================================

const renderFormattedInsight = (insight) => {
    if (!insight) return <div className="text-sm text-gray-300">Không có insight để hiển thị.</div>;

    const blocks = insight.split(/\n{2,}/g).filter(Boolean);
    return blocks.map((block, index) => {
        const lines = block.split('\n').filter(Boolean);
        const firstLine = lines[0].trim();
        const isHeading = /^(?:\*\*|##|###|🎯|📈|💡|📊|💰|✅|🔥)/.test(firstLine);
        return (
            <div key={index} className={`rounded-3xl p-4 mb-3 ${isHeading ? 'bg-slate-900/80 border border-cyan-500/20 shadow-sm' : 'bg-white/5'}`}>
                {lines.map((line, lineIndex) => {
                    const trimmed = line.trim();
                    if (/^\*\*([^\n]+)\*\*$/.test(trimmed)) {
                        return <div key={lineIndex} className="text-sm font-semibold uppercase text-amber-300 mb-2">{trimmed.replace(/^\*\*(.+)\*\*$/, '$1')}</div>;
                    }
                    if (/^##+\s+(.+)$/.test(trimmed)) {
                        return <div key={lineIndex} className="text-base font-bold uppercase text-rose-300 mb-2">{trimmed.replace(/^##+\s+(.+)$/, '$1')}</div>;
                    }
                    if (/^-\s+(.+)$/.test(trimmed)) {
                        return (
                            <div key={lineIndex} className="flex gap-3 text-sm text-gray-200 leading-6">
                                <span className="text-rose-400">•</span>
                                <span>{trimmed.replace(/^-\s+(.+)$/, '$1')}</span>
                            </div>
                        );
                    }
                    return <div key={lineIndex} className="text-sm text-gray-200 leading-6">{trimmed}</div>;
                })}
            </div>
        );
    });
};

// Shared result dashboard (used by SinglePage & BatchPage)
const renderResult = (result, insight) => {
    const kpi = calculateKPI(result);
    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-10 mt-8">
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "Tổng Doanh Thu",    val: kpi.revenue, icon: "dollar-sign",  color: "text-green-400"  },
                    { label: "Sản Phẩm Bán Ra",   val: kpi.sold,    icon: "shopping-bag", color: "text-blue-400"   },
                    { label: "Giá TB Đơn Hàng",   val: kpi.avg,     icon: "tag",          color: "text-purple-400" },
                    { label: "Tăng Trưởng",        val: kpi.growth,  icon: "trending-up",  color: "text-rose-400"   },
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
                                            {isTop3
                                                ? <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-rose-600 text-white">{rankBadge}</span>
                                                : <span className="text-gray-400">{rank}</span>}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-white truncate max-w-[200px]" title={item.name}>
                                            {isTop3 && <span className="text-rose-400 mr-1">🏆</span>}{item.name}
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
                                            <a href={productLink} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                                                <Icon name="external-link" size={12} className="mr-1" />Xem
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

// Shared PDF export helper (used by single & batch pages)
const buildPdfHtml = (resultData, insightData, titleKeyword, isSingle) => `
    <div style="font-family: 'Arial', sans-serif; padding: 20px; background: white; color: black;">
        <h1 style="color: #1e293b; margin-bottom: 5px;">Báo Cáo Phân Tích Thị Trường E-Commerce</h1>
        <p style="color: #666; font-size: 14px; margin: 5px 0;">
            Nguồn: ${isSingle ? `Từ khóa: ${titleKeyword}` : `File: ${titleKeyword}`}
        </p>
        <p style="color: #666; font-size: 14px; margin: 5px 0;">
            Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}
        </p>
        <h2 style="color: #1e293b; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #e11d48; padding-bottom: 10px;">AI Insights</h2>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap; font-family: monospace; font-size: 12px; line-height: 1.6;">
            ${(insightData || "Không có dữ liệu.").replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
        <h2 style="color: #1e293b; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #e11d48; padding-bottom: 10px;">Top Sản Phẩm</h2>
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
