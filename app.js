// Load mock data from JSON file
let MOCK_KPI = {};
let MOCK_PRODUCTS_SINGLE = [];
let MOCK_PRODUCTS_BATCH = [];

const { useState, useRef } = React;
const { jsPDF } = window.jspdf;

// --- ICONS COMPONENT ---
const Icon = ({ name, size = 20, className = "" }) => <i data-lucide={name} width={size} height={size} className={className}></i>;

// ============================================================
// 🛑 API CONFIGURATION & FUNCTIONS
// ============================================================

// ✅ CHANGE THIS URL TO YOUR ACTUAL BACKEND URL
const API_URL = 'https://your-databricks-app-url.com'; // Or http://localhost:8000 for local testing

const executeAnalysis = async (type, payload) => {
    try {
        let response;
        if (type === 'single') {
            response = await fetch(`${API_URL}/api/search`, {
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
            response = await fetch(`${API_URL}/api/analyze-batch`, {
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
        
        return {
            products: type === 'single' 
                ? result.data.products.map((p, idx) => ({
                    id: idx + 1,
                    name: p.title,
                    cat: p.categoryName,
                    price: `$${p.price?.toFixed(2) || '0'}`,
                    sold: p.boughtInLastMonth?.toLocaleString() || '0',
                    rev: `$${(p.estimated_revenue || 0).toFixed(0)}`
                }))
                : result.data.products.slice(0, 20).map((p, idx) => ({
                    id: idx + 1,
                    name: Object.values(p)[0] || 'N/A',
                    cat: Object.values(p)[1] || 'N/A',
                    price: Object.values(p)[2] || 'N/A',
                    sold: Object.values(p)[3] || 'N/A',
                    rev: Object.values(p)[4] || 'N/A'
                })),
            insight: result.data.ai_insight
        };
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// ============================================================
// ✅ MAIN APP COMPONENT
// ============================================================

function App() {
    const [activeTab, setActiveTab] = useState('single'); // 'single' or 'batch'
    
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
            const errorMsg = `❌ Lỗi kết nối Backend:\n${error.message}\n\nVui lòng kiểm tra:\n1. Backend đã chạy chưa?\n2. URL API đúng chưa?\n3. CORS đã cấu hình chưa?`;
            
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

        // Generate HTML for PDF
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
                    Top Sản Phẩm Bán Chạy
                </h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #e11d48; color: white;">
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">STT</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Sản phẩm</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Danh mục</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Giá bán</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Đã bán</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Doanh thu</th>
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

        // Use html2pdf to export
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

    // Init icons on mount and tab change
    React.useEffect(() => {
        lucide.createIcons();
    }, [activeTab, resultSingle, resultBatch]);

    // Reusable Result Component
    const renderResult = (result, insight, loading) => (
        <div ref={reportRef} className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-10 mt-8">
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "Tổng Doanh Thu", val: MOCK_KPI.revenue, icon: "dollar-sign", color: "text-green-400" },
                    { label: "Sản Phẩm Bán Ra", val: MOCK_KPI.sold, icon: "shopping-bag", color: "text-blue-400" },
                    { label: "Giá TB Đơn Hàng", val: MOCK_KPI.avg, icon: "tag", color: "text-purple-400" },
                    { label: "Tăng Trưởng", val: MOCK_KPI.growth, icon: "trending-up", color: "text-rose-400" },
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
                            <p className="text-xs text-indigo-200">Phân tích tự động bởi Google AI Studio / OpenAI</p>
                        </div>
                    </div>
                    <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-200">
                        {insight}
                    </div>
                </div>
            </div>

            {/* PRODUCT TABLE */}
            <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden shadow-lg">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#253042]">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Icon name="trophy" size={18} className="text-yellow-500"/> Top Sản Phẩm Bán Chạy
                    </h3>
                    <span className="text-xs text-gray-400">Cập nhật realtime từ Delta Lake</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-[#1e293b] border-b border-gray-700">
                            <tr>
                                <th className="px-6 py-3 w-12 text-center">STT</th>
                                <th className="px-6 py-3">Sản phẩm</th>
                                <th className="px-6 py-3">Danh mục</th>
                                <th className="px-6 py-3 text-right">Giá bán</th>
                                <th className="px-6 py-3 text-right">Đã bán</th>
                                <th className="px-6 py-3 text-right">Doanh thu</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {result.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-[#253042] transition-colors">
                                    <td className="px-6 py-4 text-center text-gray-500 font-mono">{idx + 1}</td>
                                    <td className="px-6 py-4 font-medium text-white truncate max-w-[200px]" title={item.name}>{item.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-600">
                                            {item.cat}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-400">{item.price}</td>
                                    <td className="px-6 py-4 text-right text-green-400 font-medium">{item.sold}</td>
                                    <td className="px-6 py-4 text-right text-rose-400 font-bold">{item.rev}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-[#0f172a] overflow-hidden">
            
            {/* SIDEBAR */}
            <div className="w-64 bg-[#1e293b] border-r border-gray-700 flex flex-col z-20 shadow-xl">
                <div className="p-6 flex items-center gap-3 border-b border-gray-700">
                    <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                        <Icon name="sparkles" size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-white tracking-tight">ShopeeAnalyst</h1>
                        <p className="text-xs text-gray-400">AI-Powered Microservices</p>
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
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Server: Online
                        </div>
                        <div className="px-4 py-2 text-sm text-gray-400 flex items-center gap-2">
                            <Icon name="database" size={14} /> Source: Kaggle/Databricks
                        </div>
                    </div>
                </nav>
                
                <div className="p-4 border-t border-gray-700 text-xs text-gray-500 text-center">
                    v1.0.0 • Deployed on Digital Ocean
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                
                {/* HEADER */}
                <header className="h-16 bg-[#1e293b] border-b border-gray-700 flex items-center justify-between px-8 z-10">
                    <h2 className="text-xl font-bold text-white">
                        {activeTab === 'single' ? 'Phân tích từ khóa thị trường' : 'Phân tích dữ liệu hàng loạt (CSV)'}
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
                                        placeholder="Ví dụ: Áo sơ mi, Tai nghe bluetooth..." 
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
                                    Thực thi AI
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
                                    <input id="fileInput" type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileChange} />
                                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Icon name="upload-cloud" size={32} className="text-rose-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">
                                        {selectedFile ? selectedFile.name : "Click để tải lên tệp CSV"}
                                    </h3>
                                    <p className="text-sm text-gray-400">
                                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(2)} KB` : "Hỗ trợ định dạng .csv, .xlsx (Max 50MB)"}
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
                                            Phân tích dữ liệu từ File
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
                            <p className="text-lg font-medium">Đang truy vấn Databricks & Gọi AI...</p>
                            <p className="text-sm text-gray-400">Vui lòng đợi trong giây lát</p>
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
                                    ? "Nhập từ khóa để bắt đầu phân tích thị trường" 
                                    : "Tải lên file CSV để phân tích dữ liệu hàng loạt"}
                            </p>
                        </div>
                    )}

                </main>
            </div>
        </div>
    );
}

// Fetch data then render app
fetch('data.json')
    .then(response => response.json())
    .then(data => {
        MOCK_KPI = data.mockKPI;
        MOCK_PRODUCTS_SINGLE = data.mockProductsSingle;
        MOCK_PRODUCTS_BATCH = data.mockProductsBatch;
        
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    })
    .catch(error => console.error('Error loading data.json:', error));
