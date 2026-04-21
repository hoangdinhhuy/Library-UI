// ============================================================
// 🔍 SINGLE PAGE — Phân tích đơn (từ khóa)
// ============================================================

function SinglePage() {
    const { useState, useEffect } = React;

    const [keyword,      setKeyword]      = useState('');
    const [loading,      setLoading]      = useState(false);
    const [result,       setResult]       = useState(null);
    const [insight,      setInsight]      = useState('');
    const [contextInfo,  setContextInfo]  = useState(null);

    useEffect(() => {
        lucide.createIcons();
    }, [result]);

    const handleExecute = async () => {
        if (!keyword.trim()) return;
        setLoading(true);
        setResult(null);
        setInsight('');
        setContextInfo(null);
        try {
            const data = await executeAnalysis('single', { keyword, context_id: null });
            setResult(data.products);
            setInsight(data.insight);
            setContextInfo(data.context);
        } catch (error) {
            setInsight(
                `❌ Lỗi kết nối Backend:\n${error.message}\n\nVui lòng kiểm tra:\n` +
                `1. Backend đã chạy chưa? (python main.py)\n` +
                `2. URL API đúng chưa? (${API_BASE_URL || 'CHUA_CAU_HINH'})\n` +
                `3. Nếu chạy trên GitHub Pages: API phải là public URL (Render/Railway/Fly.io), không dùng localhost\n` +
                `4. Nếu web là HTTPS thì API cũng phải HTTPS\n` +
                `5. CORS đã cấu hình chưa?`
            );
        } finally {
            setLoading(false);
            setTimeout(() => lucide.createIcons(), 100);
        }
    };

    const handleSelectContext = async (nextContextId) => {
        if (!keyword.trim()) return;
        setLoading(true);
        setResult(null);
        setInsight('');
        try {
            const data = await executeAnalysis('single', { keyword, context_id: nextContextId });
            setResult(data.products);
            setInsight(data.insight);
            setContextInfo(data.context);
        } catch (error) {
            setInsight(`❌ Lỗi phân tích lại: ${error.message}`);
        } finally {
            setLoading(false);
            setTimeout(() => lucide.createIcons(), 100);
        }
    };

    const handleExportPDF = () => {
        if (!result) return;
        const element = document.createElement('div');
        element.innerHTML = buildPdfHtml(result, insight, keyword, true);
        html2pdf().set({
            margin: 10,
            filename: `BaoCao_Single_${Date.now()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        }).from(element).save();
    };

    return (
        <div>
            {/* INPUT SECTION */}
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
                            onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                        />
                    </div>
                    <button
                        onClick={handleExecute}
                        disabled={loading || !keyword}
                        className="px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-rose-900/20"
                    >
                        {loading ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="play" className="fill-current" />}
                        Phân tích
                    </button>
                </div>
            </div>

            {/* LOADING */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 text-rose-500 animate-pulse">
                    <Icon name="bot" size={48} className="mb-4" />
                    <p className="text-lg font-medium">Đang gọi Backend API...</p>
                    <p className="text-sm text-gray-400">Vui lòng đợi</p>
                </div>
            )}

            {/* EXPORT BUTTON */}
            {!loading && result && (
                <div className="max-w-6xl mx-auto flex justify-end mb-2">
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-900/20"
                    >
                        <Icon name="download" size={16} /> Xuất PDF
                    </button>
                </div>
            )}

            {/* RESULTS */}
            {!loading && result && renderResult(result, insight)}

            {/* CONTEXT SUGGESTIONS */}
            {!loading && result && contextInfo && (
                <div className="max-w-6xl mx-auto mt-6">
                    <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-5">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Icon name="sparkles" size={18} className="text-cyan-400"/> Bạn có đang tìm kiếm...?
                            </h3>
                            {contextInfo.selected_context && (
                                <span className="text-xs text-gray-400">
                                    Ngữ cảnh đang chọn: <span className="text-cyan-300 font-semibold">{contextInfo.selected_context_label || contextInfo.selected_context}</span>
                                </span>
                            )}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-cyan-700 text-white border-cyan-400">
                                {contextInfo.selected_context_label || contextInfo.selected_context}
                            </span>
                            {contextInfo.suggestions && contextInfo.suggestions.map((s) => (
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
                        {contextInfo.total_found_before_filter !== undefined && (
                            <div className="mt-3 text-xs text-gray-500">
                                Lọc theo ngữ cảnh: {contextInfo.total_found_after_filter?.toLocaleString?.('vi-VN') || contextInfo.total_found_after_filter} / {contextInfo.total_found_before_filter.toLocaleString('vi-VN')} sản phẩm
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* EMPTY STATE */}
            {!loading && !result && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 opacity-60">
                    <Icon name="bar-chart-2" size={64} className="mb-4" />
                    <p className="text-lg">Nhập từ khóa để bắt đầu</p>
                </div>
            )}
        </div>
    );
}
