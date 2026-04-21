// ============================================================
// 📊 MARKET REPORT PAGE — Phân Tích Thị Trường
// ============================================================

function MarketReportPage() {
    const { useState, useEffect } = React;

    const [marketKeyword,       setMarketKeyword]       = useState('');
    const [loading,             setLoading]             = useState(false);
    const [result,              setResult]              = useState(null);
    const [selectedContextId,   setSelectedContextId]   = useState(null);

    useEffect(() => {
        lucide.createIcons();
    }, [result]);

    const runMarketReport = async ({ keyword, context_id }) => {
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/market-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: keyword.trim(), context_id: context_id || null })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.detail || 'Error');
            setResult(json.data);
            const ctx = json.data?.context;
            setSelectedContextId(ctx?.selected_context || null);
        } catch (e) {
            setResult({ error: e.message });
        } finally {
            setLoading(false);
            setTimeout(() => lucide.createIcons(), 100);
        }
    };

    const handleMarketReport = async () => {
        if (!marketKeyword.trim()) return;
        setSelectedContextId(null);
        return runMarketReport({ keyword: marketKeyword, context_id: null });
    };

    const handleSelectContext = async (nextContextId) => {
        if (!marketKeyword.trim()) return;
        setSelectedContextId(nextContextId);
        return runMarketReport({ keyword: marketKeyword, context_id: nextContextId });
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-10">

            {/* SEARCH BAR */}
            <div className="glass-panel p-6 rounded-xl flex gap-4 items-end animate-fade-in">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nhập từ khóa để phân tích thị trường</label>
                    <input
                        type="text"
                        value={marketKeyword}
                        onChange={(e) => setMarketKeyword(e.target.value)}
                        placeholder="Ví dụ: xe, laptop, điện thoại..."
                        className="w-full bg-[#0f172a] border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && handleMarketReport()}
                    />
                </div>
                <button
                    onClick={handleMarketReport}
                    disabled={loading || !marketKeyword.trim()}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-rose-900/20"
                >
                    {loading ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="bar-chart-2" />}
                    Phân tích
                </button>
            </div>

            {/* LOADING */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 text-rose-500 animate-pulse">
                    <Icon name="bot" size={48} className="mb-4" />
                    <p className="text-lg font-medium">Đang phân tích thị trường...</p>
                    <p className="text-sm text-gray-400">Đang thu thập dữ liệu từ {marketKeyword}</p>
                </div>
            )}

            {/* ERROR */}
            {!loading && result && result.error && (
                <div className="bg-red-900/30 border border-red-500 rounded-xl p-5 text-red-300">
                    ❌ Lỗi: {result.error}
                </div>
            )}

            {/* RESULTS */}
            {!loading && result && !result.error && (() => {
                const d   = result;
                const ov  = d.overview;
                const seg = d.price_segments;
                const trend = d.price_trend;
                const sent  = d.sentiment;
                const ctx = d.context;
                return (
                    <div className="space-y-6 animate-fade-in">

                        {/* CONTEXT SUGGESTIONS */}
                        {ctx && (
                            <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-5">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <Icon name="sparkles" size={18} className="text-cyan-400"/> Bạn có đang tìm kiếm...?
                                    </h3>
                                    {ctx.selected_context && (
                                        <span className="text-xs text-gray-400">
                                            Ngữ cảnh đang chọn: <span className="text-cyan-300 font-semibold">{ctx.selected_context_label || ctx.selected_context}</span>
                                        </span>
                                    )}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {ctx.selected_context && (
                                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-cyan-700 text-white border-cyan-400">
                                            {ctx.selected_context_label || ctx.selected_context}
                                        </span>
                                    )}
                                    {ctx.suggestions && ctx.suggestions.map((s) => (
                                        <button
                                            key={s.context_id}
                                            onClick={() => handleSelectContext(s.context_id)}
                                            disabled={loading}
                                            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all bg-[#0f172a] text-gray-200 border-gray-600 hover:border-cyan-500 hover:text-cyan-200"
                                            title={`${s.count} sản phẩm`}
                                        >
                                            {s.label} <span className="opacity-70">({s.count})</span>
                                        </button>
                                    ))}
                                </div>

                                {ctx.total_found_before_filter !== undefined && (
                                    <div className="mt-3 text-xs text-gray-500">
                                        Lọc theo ngữ cảnh: {(ctx.total_found_after_filter ?? 0).toLocaleString('vi-VN')} / {(ctx.total_found_before_filter ?? 0).toLocaleString('vi-VN')} sản phẩm
                                    </div>
                                )}
                            </div>
                        )}

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: "Tổng Sản Phẩm",  val: ov.total_products.toLocaleString('vi-VN'), icon: "package",       color: "text-blue-400"   },
                                { label: "Tổng Đã Bán",    val: ov.total_sold.toLocaleString('vi-VN'),    icon: "shopping-cart",  color: "text-green-400"  },
                                { label: "Tổng Doanh Thu", val: `${(ov.total_revenue / 1e9).toFixed(2)} tỷ đ`, icon: "dollar-sign", color: "text-yellow-400" },
                                { label: "Rating TB",      val: `${ov.avg_rating} ⭐`,                    icon: "star",           color: "text-rose-400"   },
                            ].map((item, idx) => (
                                <div key={idx} className="bg-[#1e293b] p-5 rounded-xl border border-gray-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-gray-400 text-xs">{item.label}</span>
                                        <Icon name={item.icon} size={16} className={item.color} />
                                    </div>
                                    <div className="text-xl font-bold text-white">{item.val}</div>
                                    {item.label === "Tổng Sản Phẩm" && (
                                        <div className="text-xs text-gray-500 mt-1">{ov.min_price.toLocaleString('vi-VN')}đ – {ov.max_price.toLocaleString('vi-VN')}đ</div>
                                    )}
                                    {item.label === "Tổng Đã Bán" && (
                                        <div className="text-xs text-gray-500 mt-1">Giá TB: {ov.avg_price.toLocaleString('vi-VN')}đ</div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Price Segment + Sentiment */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Price Segments */}
                            <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-5">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <Icon name="layers" size={16} className="text-purple-400"/>Phân Khúc Giá
                                </h3>
                                {[
                                    { label: "💙 Bình dân", data: seg.budget,  color: "bg-blue-500"   },
                                    { label: "💚 Trung cấp", data: seg.mid,    color: "bg-green-500"  },
                                    { label: "💎 Cao cấp",  data: seg.premium, color: "bg-purple-500" },
                                ].map((s, i) => (
                                    <div key={i} className="mb-3">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-300">{s.label}</span>
                                            <span className="text-gray-400">{s.data.count} SP ({s.data.pct}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div className={`${s.color} h-2 rounded-full transition-all`} style={{width: `${s.data.pct}%`}}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Sentiment */}
                            <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-5">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <Icon name="message-circle" size={16} className="text-cyan-400"/>Sentiment Đánh Giá
                                </h3>
                                {sent.total > 0 ? (
                                    <>
                                        <div className="text-xs text-gray-400 mb-3">Từ {sent.total.toLocaleString('vi-VN')} đánh giá</div>
                                        {[
                                            { label: "✅ Tích cực", count: sent.positive, pct: sent.pos_pct, color: "bg-green-500" },
                                            { label: "⚠️ Trung lập", count: sent.neutral,  pct: sent.neu_pct, color: "bg-yellow-500" },
                                            { label: "❌ Tiêu cực", count: sent.negative, pct: sent.neg_pct, color: "bg-red-500"    },
                                        ].map((s, i) => (
                                            <div key={i} className="mb-3">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-300">{s.label}</span>
                                                    <span className="text-gray-400">{s.count.toLocaleString('vi-VN')} ({s.pct}%)</span>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-2">
                                                    <div className={`${s.color} h-2 rounded-full`} style={{width: `${s.pct}%`}}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div className="text-gray-500 text-sm">Không có đánh giá cho từ khóa này</div>
                                )}
                            </div>
                        </div>

                        {/* Price Trend + Top Categories */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Price Trend */}
                            <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-5">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <Icon name="trending-up" size={16} className="text-yellow-400"/>Xu Hướng Giá
                                </h3>
                                {trend.products_analyzed > 0 ? (
                                    <div className="space-y-3">
                                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                                            trend.direction === 'up'   ? 'bg-green-900/50 text-green-300 border border-green-600' :
                                            trend.direction === 'down' ? 'bg-red-900/50 text-red-300 border border-red-600' :
                                            'bg-yellow-900/50 text-yellow-300 border border-yellow-600'
                                        }`}>
                                            {trend.direction === 'up' ? '⬆️ TĂNG' : trend.direction === 'down' ? '⬇️ GIẢM' : '➡️ ỔN ĐỊNH'}
                                            {' '}{Math.abs(trend.avg_change_pct)}%
                                        </div>
                                        <div className="text-xs text-gray-400">Nguồn: {trend.source} • {trend.products_analyzed} sản phẩm phân tích</div>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 text-sm">Không đủ dữ liệu chuỗi thời gian</div>
                                )}
                            </div>

                            {/* Top Categories */}
                            <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-5">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <Icon name="folder-open" size={16} className="text-orange-400"/>Top Danh Mục
                                </h3>
                                <div className="space-y-2">
                                    {d.top_categories.map((cat, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <span className="text-gray-500 text-xs w-4">{i + 1}</span>
                                            <span className="text-gray-300 text-sm flex-1 truncate" title={cat.name}>{cat.name}</span>
                                            <span className="text-xs text-gray-400">{cat.count} SP</span>
                                            <div className="w-16 bg-gray-700 rounded-full h-1.5">
                                                <div className="bg-orange-500 h-1.5 rounded-full" style={{width: `${cat.pct}%`}}></div>
                                            </div>
                                            <span className="text-xs text-orange-400 w-10 text-right">{cat.pct}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* KMeans Clusters */}
                        {d.clusters && d.clusters.length > 0 && (
                            <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-5">
                                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                    <Icon name="git-branch" size={16} className="text-pink-400"/>Phân Cụm KMeans (5 Clusters)
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-xs text-gray-400 uppercase border-b border-gray-700">
                                                <th className="py-2 text-left">Cluster</th>
                                                <th className="py-2 text-right">Số SP</th>
                                                <th className="py-2 text-right">Giá TB</th>
                                                <th className="py-2 text-right">Rating TB</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700/50">
                                            {d.clusters.map((c, i) => (
                                                <tr key={i} className="hover:bg-gray-800/50">
                                                    <td className="py-2 text-white font-medium">{c.name}</td>
                                                    <td className="py-2 text-right text-gray-400">{c.count.toLocaleString('vi-VN')}</td>
                                                    <td className="py-2 text-right text-yellow-400">{c.avg_price.toLocaleString('vi-VN')}đ</td>
                                                    <td className="py-2 text-right text-green-400">{c.avg_rating}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Top 10 Products */}
                        <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden">
                            <div className="p-4 border-b border-gray-700 bg-[#253042]">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Icon name="trophy" size={18} className="text-yellow-500"/>Top 10 Sản Phẩm Bán Chạy
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-gray-400 uppercase border-b border-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 text-center w-10">#</th>
                                            <th className="px-4 py-3 text-left">Sản phẩm</th>
                                            <th className="px-4 py-3 text-right">Giá</th>
                                            <th className="px-4 py-3 text-right">Đã bán</th>
                                            <th className="px-4 py-3 text-right">Doanh thu</th>
                                            <th className="px-4 py-3 text-right">Rating</th>
                                            <th className="px-4 py-3 text-center">Link</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {d.top_products.map((p, i) => (
                                            <tr key={i} className={`${i < 3 ? 'bg-rose-900/10 border-l-2 border-rose-500' : 'hover:bg-gray-800/50'} transition-colors`}>
                                                <td className="px-4 py-3 text-center">
                                                    {i < 3
                                                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">TOP {i + 1}</span>
                                                        : <span className="text-gray-500">{i + 1}</span>}
                                                </td>
                                                <td className="px-4 py-3 text-white max-w-[220px] truncate" title={p.name}>
                                                    {i < 3 && <span className="text-rose-400 mr-1">🏆</span>}{p.name}
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-400">{p.price.toLocaleString('vi-VN')}đ</td>
                                                <td className="px-4 py-3 text-right text-green-400 font-medium">{p.sold.toLocaleString('vi-VN')}</td>
                                                <td className="px-4 py-3 text-right text-rose-400 font-bold">{(p.revenue / 1e6).toFixed(1)}M đ</td>
                                                <td className="px-4 py-3 text-right text-yellow-400">{p.rating} ⭐</td>
                                                <td className="px-4 py-3 text-center">
                                                    <a href={p.url || `https://tiki.vn/p/${p.name}`} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center px-3 py-1 rounded-lg text-xs bg-blue-700 hover:bg-blue-600 text-white transition-colors">
                                                        <Icon name="external-link" size={12} className="mr-1"/>Xem
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* AI Report */}
                        <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg">
                                        <Icon name="bot" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Báo Cáo Phân Tích AI</h3>
                                        <p className="text-xs text-indigo-200">Phân tích chuyên sâu từ Gemini AI</p>
                                    </div>
                                </div>
                                <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10 text-sm leading-relaxed text-gray-200">
                                    {renderFormattedInsight(d.ai_report)}
                                </div>
                            </div>
                        </div>

                    </div>
                );
            })()}

            {/* EMPTY STATE */}
            {!loading && !result && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 opacity-60">
                    <Icon name="bar-chart-2" size={64} className="mb-4" />
                    <p className="text-lg">Nhập từ khóa để xem báo cáo thị trường</p>
                </div>
            )}

        </div>
    );
}
