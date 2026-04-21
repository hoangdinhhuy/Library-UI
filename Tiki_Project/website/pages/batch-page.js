// ============================================================
// 📂 BATCH PAGE — Phân tích loạt (CSV)
// ============================================================

function BatchPage() {
    const { useState, useEffect } = React;

    const [selectedFile, setSelectedFile] = useState(null);
    const [loading,      setLoading]      = useState(false);
    const [result,       setResult]       = useState(null);
    const [insight,      setInsight]      = useState('');

    useEffect(() => {
        lucide.createIcons();
    }, [result]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleExecute = async () => {
        if (!selectedFile) return;
        setLoading(true);
        setResult(null);
        setInsight('');
        try {
            const data = await executeAnalysis('batch', { file: selectedFile });
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
        const titleKeyword = selectedFile ? selectedFile.name : 'File CSV';
        const element = document.createElement('div');
        element.innerHTML = buildPdfHtml(result, insight, titleKeyword, false);
        html2pdf().set({
            margin: 10,
            filename: `BaoCao_Batch_${Date.now()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        }).from(element).save();
    };

    return (
        <div>
            {/* FILE UPLOAD SECTION */}
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
                                onClick={handleExecute}
                                disabled={loading}
                                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-rose-900/20"
                            >
                                {loading ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="play" className="fill-current" />}
                                Phân tích File
                            </button>
                        </div>
                    )}
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
            {!loading && !result && !selectedFile && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 opacity-60">
                    <Icon name="bar-chart-2" size={64} className="mb-4" />
                    <p className="text-lg">Tải lên CSV để phân tích</p>
                </div>
            )}
        </div>
    );
}
