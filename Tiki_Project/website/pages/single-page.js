// ============================================================
// 🔍 SINGLE PAGE — Phân tích đơn (từ khóa)
// ============================================================

function SinglePage() {
    const { useState, useEffect } = React;

    const [keyword,      setKeyword]      = useState('');
    const [loading,      setLoading]      = useState(false);
    const [result,       setResult]       = useState(null);
    const [insight,      setInsight]      = useState('');

    useEffect(() => {
        lucide.createIcons();
    }, [result]);

    const handleExecute = async () => {
        if (!keyword.trim()) return;
        setLoading(true);
        setResult(null);
        setInsight('');
        try {
            const data = await executeAnalysis('single', { keyword });
            setResult(data.products);
            setInsight(data.insight);
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
