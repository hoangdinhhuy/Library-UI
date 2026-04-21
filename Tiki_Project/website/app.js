// ============================================================
// 🚀 TIKI ANALYST — App Shell (Sidebar + Header + Routing)
// ============================================================

const { useState, useEffect } = React;

function App() {
    const [activeTab, setActiveTab] = React.useState('market-report');

    React.useEffect(() => {
        lucide.createIcons();
    }, [activeTab]);

    const pageTitle = {
        'market-report': 'Phân Tích Đơn',
        'batch':         'Phân tích dữ liệu CSV',
        'market':        'Market Insight — Tìm Ngách Thị Trường',
    }[activeTab] || '';

    const navItems = [
        { tab: 'market-report', icon: 'bar-chart-2',  label: 'Phân Tích Đơn'  },
        { tab: 'batch',         icon: 'upload-cloud', label: 'Phân tích loạt (CSV)'  },
        { tab: 'market',        icon: 'telescope',    label: 'Market Insight'        },
    ];

    return (
        <div className="flex h-screen bg-[#0f172a] overflow-hidden">

            {/* ── SIDEBAR ───────────────────────────────────── */}
            <div className="w-64 bg-[#1e293b] border-r border-gray-700 flex flex-col z-20 shadow-xl">

                {/* Logo */}
                <div className="p-6 flex items-center gap-3 border-b border-gray-700">
                    <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                        <Icon name="sparkles" size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-white tracking-tight">TikiAnalyst</h1>
                        <p className="text-xs text-gray-400">AI-Powered</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map(({ tab, icon, label }) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                                activeTab === tab
                                    ? 'bg-rose-600 text-white shadow-md'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }`}
                        >
                            <Icon name={icon} size={18} /> {label}
                        </button>
                    ))}

                    {/* System Info */}
                    <div className="pt-4 mt-4 border-t border-gray-700">
                        <p className="px-4 text-xs font-semibold text-gray-500 uppercase mb-2">Hệ thống</p>
                        <div className="px-4 py-2 text-sm text-gray-400 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            API: {API_BASE_URL}
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

            {/* ── MAIN CONTENT ──────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden relative">

                {/* Header */}
                <header className="h-16 bg-[#1e293b] border-b border-gray-700 flex items-center justify-between px-8 z-10">
                    <h2 className="text-xl font-bold text-white">{pageTitle}</h2>
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold border border-gray-600">
                        A
                    </div>
                </header>

                {/* Scrollable page area */}
                <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
                    {activeTab === 'market-report' && <MarketReportPage />}
                    {activeTab === 'batch'         && <BatchPage />}
                    {activeTab === 'market'        && <MarketInsightPage />}
                </main>

            </div>
        </div>
    );
}

// Mount app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
