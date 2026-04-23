// ============================================================
// 🔍 SINGLE PAGE — Phân tích đơn (từ khóa)
// ============================================================

function SinglePage() {
    const { useState, useEffect } = React;
    const SEARCH_HISTORY_KEY = 'tiki_search_history_v1';
    const HISTORY_LIMIT = 12;

    const [keyword,      setKeyword]      = useState('');
    const [loading,      setLoading]      = useState(false);
    const [result,       setResult]       = useState(null);
    const [insight,      setInsight]      = useState('');
    const [contextInfo,  setContextInfo]  = useState(null);
    const [analytics,    setAnalytics]    = useState(null);
    const [searchHistory, setSearchHistory] = useState([]);
    const [chatMessages, setChatMessages] = useState([
        {
            role: 'assistant',
            text: 'Xin chao! Toi la chatbot ho tro phan tich. Ban co the hoi ve gia, doanh thu, top san pham, hoac nhap mot tu khoa moi de toi phan tich nhanh.'
        }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const quickCommands = [
        { id: 'overview', label: 'Tom tat nhanh', prompt: 'Tom tat tong quan cho tu khoa {keyword}' },
        { id: 'price', label: 'Gia trung binh', prompt: 'Gia trung binh hien tai la bao nhieu?' },
        { id: 'revenue', label: 'Tong doanh thu', prompt: 'Tong doanh thu uoc tinh cua ket qua nay la gi?' },
        { id: 'sold', label: 'So luong ban', prompt: 'Tong so luong ban cua nhom san pham nay la bao nhieu?' },
        { id: 'top3', label: 'Top 3 san pham', prompt: 'Top 3 san pham dang noi bat la gi?' },
        { id: 'top1', label: 'Phan tich top 1', prompt: 'Phan tich ky san pham {top_product} cho toi' },
        { id: 'segment', label: 'Phan khuc gia', prompt: 'Nhom san pham nay dang tap trung vao phan khuc gia nao?' },
        { id: 'action', label: 'Goi y hanh dong', prompt: 'De xuat 3 hanh dong toi uu de tang doanh thu cho tu khoa {keyword}' },
    ];

    useEffect(() => {
        lucide.createIcons();
    }, [result, chatMessages, searchHistory, isChatOpen]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) setSearchHistory(parsed.slice(0, HISTORY_LIMIT));
        } catch (_) {
            setSearchHistory([]);
        }
    }, []);

    const saveSearchHistory = (value) => {
        const cleaned = (value || '').trim();
        if (!cleaned) return;
        setSearchHistory((prev) => {
            const next = [cleaned, ...prev.filter((item) => item.toLowerCase() !== cleaned.toLowerCase())].slice(0, HISTORY_LIMIT);
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
            return next;
        });
    };

    const clearSearchHistory = () => {
        localStorage.removeItem(SEARCH_HISTORY_KEY);
        setSearchHistory([]);
    };

    const runSingleAnalysis = async (inputKeyword, contextId = null) => {
        const normalized = (inputKeyword || '').trim();
        if (!normalized) return;

        setLoading(true);
        setResult(null);
        setInsight('');
        setContextInfo(null);
        setAnalytics(null);
        try {
            const data = await executeAnalysis('single', { keyword: normalized, context_id: contextId });
            setKeyword(normalized);
            setResult(data.products);
            setInsight(data.insight);
            setContextInfo(data.context);
            setAnalytics(data.analytics);
            saveSearchHistory(normalized);
            return data;
        } catch (error) {
            setInsight(
                `❌ Lỗi kết nối Backend:\n${error.message}\n\nVui lòng kiểm tra:\n` +
                `1. Backend đã chạy chưa? (python main.py)\n` +
                `2. URL API đúng chưa? (${API_BASE_URL || 'CHUA_CAU_HINH'})\n` +
                `3. Nếu chạy trên GitHub Pages: API phải là public URL (Render/Railway/Fly.io), không dùng localhost\n` +
                `4. Nếu web là HTTPS thì API cũng phải HTTPS\n` +
                `5. CORS đã cấu hình chưa?`
            );
            throw error;
        } finally {
            setLoading(false);
            setTimeout(() => lucide.createIcons(), 100);
        }
    };

    const handleExecute = async () => {
        if (!keyword.trim()) return;
        await runSingleAnalysis(keyword, null);
    };

    const handleSelectContext = async (nextContextId) => {
        if (!keyword.trim()) return;
        try {
            await runSingleAnalysis(keyword, nextContextId);
        } catch (error) {
            setInsight(`❌ Lỗi phân tích lại: ${error.message}`);
        }
    };

    const summarizeForChat = (questionText) => {
        const q = (questionText || '').toLowerCase();
        if (!result || !analytics) {
            return 'Ban hay phan tich mot tu khoa truoc de toi co du lieu tra loi chi tiet.';
        }
        if (q.includes('gia')) {
            return `Gia trung binh hien tai la ${Number(analytics.avg_price || 0).toLocaleString('vi-VN')} VND.`;
        }
        if (q.includes('doanh thu')) {
            return `Tong doanh thu uoc tinh la ${Number(analytics.total_revenue || 0).toLocaleString('vi-VN')} VND.`;
        }
        if (q.includes('ban') || q.includes('so luong')) {
            return `Tong luong ban uoc tinh la ${Number(analytics.total_sold || 0).toLocaleString('vi-VN')} san pham.`;
        }
        if (q.includes('top') || q.includes('san pham')) {
            const top = result.slice(0, 3).map((p, i) => `${i + 1}. ${p.name}`).join(' | ');
            return `Top san pham hien tai: ${top}.`;
        }
        if (q.includes('tom tat') || q.includes('tong quan')) {
            return `Tom tat nhanh: ${Number(analytics.total_products || 0).toLocaleString('vi-VN')} san pham, rating TB ${Number(analytics.avg_rating || 0).toFixed(2)}, doanh thu ${Number(analytics.total_revenue || 0).toLocaleString('vi-VN')} VND.`;
        }
        return 'Toi co the tra loi nhanh ve gia, doanh thu, so luong ban, top san pham, hoac ban co the nhap mot tu khoa moi de toi phan tich.';
    };

    const resolveQuickPrompt = (template) => {
        const currentKeyword = (keyword || '').trim() || 'tu khoa hien tai';
        const topProduct = result && result[0] ? result[0].name : 'san pham top 1 hien tai';
        return template
            .replace('{keyword}', currentKeyword)
            .replace('{top_product}', topProduct);
    };

    const sendChatQuestion = async (questionText) => {
        const question = (questionText || '').trim();
        if (!question || chatLoading) return;

        setChatMessages((prev) => [...prev, { role: 'user', text: question }]);
        setChatInput('');
        setChatLoading(true);

        try {
            const asksForNewAnalysis = /(phan tich|tim|tra cuu|keyword|tu khoa|xem)/i.test(question) && question.length > 8;
            if (asksForNewAnalysis && !/(gia|doanh thu|top|so luong|rating|tom tat)/i.test(question)) {
                const data = await runSingleAnalysis(question, null);
                setChatMessages((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        text: `Da phan tich tu khoa "${question}". Toi da cap nhat bang ket qua moi, ban co the hoi tiep de dao sau.`
                    }
                ]);
                if (data && data.insight) {
                    setChatMessages((prev) => [
                        ...prev,
                        { role: 'assistant', text: `Tom tat AI: ${String(data.insight).slice(0, 260)}...` }
                    ]);
                }
            } else {
                const reply = summarizeForChat(question);
                setChatMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
            }
        } catch (error) {
            setChatMessages((prev) => [...prev, { role: 'assistant', text: `Loi chatbot: ${error.message}` }]);
        } finally {
            setChatLoading(false);
            setTimeout(() => lucide.createIcons(), 100);
        }
    };

    const handleSendChat = async () => {
        await sendChatQuestion(chatInput);
    };

    const handleQuickCommand = async (promptTemplate) => {
        const prompt = resolveQuickPrompt(promptTemplate);
        setIsChatOpen(true);
        await sendChatQuestion(prompt);
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
                <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex flex-wrap gap-2">
                        {searchHistory.map((item) => (
                            <button
                                key={item}
                                onClick={() => runSingleAnalysis(item, null)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-600 text-gray-200 hover:border-rose-500 hover:text-white transition-all"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                    {searchHistory.length > 0 && (
                        <button
                            onClick={clearSearchHistory}
                            className="text-xs px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/20 transition-all"
                        >
                            Xoa lich su
                        </button>
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
            {!loading && result && renderResult(result, insight, analytics)}

            {/* FLOATING CHATBOT */}
            <div className="fixed bottom-6 right-6 z-40">
                <button
                    onClick={() => setIsChatOpen((prev) => !prev)}
                    className="w-14 h-14 rounded-full bg-cyan-600 hover:bg-cyan-700 text-white shadow-xl shadow-cyan-900/40 flex items-center justify-center border border-cyan-400/40"
                    title="Mo chatbot"
                >
                    <Icon name={isChatOpen ? 'x' : 'message-circle'} size={24} />
                </button>
            </div>

            {isChatOpen && (
                <div className="fixed bottom-24 right-3 left-3 sm:left-auto sm:right-6 sm:w-[390px] z-40">
                    <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
                        <div className="p-3 border-b border-gray-700 bg-[#253042] flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Icon name="bot" size={18} className="text-cyan-400" />
                                <h3 className="font-bold text-white text-sm">Tro ly chat san pham</h3>
                            </div>
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="text-gray-300 hover:text-white"
                            >
                                <Icon name="x" size={16} />
                            </button>
                        </div>

                        <div className="p-3 border-b border-gray-700 bg-[#111827]">
                            <p className="text-[11px] text-gray-400 mb-2">8 cau lenh nhanh:</p>
                            <div className="grid grid-cols-2 gap-2">
                                {quickCommands.map((cmd) => (
                                    <button
                                        key={cmd.id}
                                        onClick={() => handleQuickCommand(cmd.prompt)}
                                        disabled={chatLoading}
                                        className="text-xs px-2.5 py-2 rounded-lg border border-gray-600 text-gray-200 hover:border-cyan-500 hover:text-cyan-200 bg-[#0f172a] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {cmd.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-72 overflow-y-auto p-3 space-y-3 bg-[#111827]">
                            {chatMessages.map((m, idx) => (
                                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[88%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                                        m.role === 'user' ? 'bg-rose-600 text-white' : 'bg-gray-700 text-gray-100'
                                    }`}>
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="text-xs text-gray-400">Chatbot dang tra loi...</div>
                            )}
                        </div>

                        <div className="p-3 border-t border-gray-700 flex items-center gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                placeholder="Nhap cau hoi..."
                                className="flex-1 bg-[#0f172a] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                            />
                            <button
                                onClick={handleSendChat}
                                disabled={chatLoading || !chatInput.trim()}
                                className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-semibold"
                            >
                                Gui
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
