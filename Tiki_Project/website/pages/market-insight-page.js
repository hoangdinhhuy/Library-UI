// ============================================================
// 🌊 MARKET INSIGHT PAGE — KMeans Blue Ocean Analysis (v2)
// ============================================================

function MarketInsightPage() {
    const { useState, useEffect, useRef } = React;

    const [loading,   setLoading]   = useState(false);
    const [result,    setResult]    = useState(null);
    const [catFilter, setCatFilter] = useState('all');
    const [sortKey,   setSortKey]   = useState('popularity_score');
    const [sortDir,   setSortDir]   = useState('desc');

    const bubbleChartRef = useRef(null);
    const radarChartRef  = useRef(null);
    const bubbleInstance = useRef(null);
    const radarInstance  = useRef(null);

    const CLUSTER_COLORS  = ['rgba(251,113,133,0.85)','rgba(96,165,250,0.85)','rgba(52,211,153,0.85)','rgba(34,211,238,0.95)','rgba(167,139,250,0.85)'];
    const CLUSTER_BORDERS = ['#fb7185','#60a5fa','#34d399','#22d3ee','#a78bfa'];

    // fetch
    const handleMarketInsight = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/market-insight`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setResult(json.data);
        } catch (e) {
            setResult({ error: e.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { setTimeout(() => lucide.createIcons(), 100); }, [result, catFilter, sortKey, sortDir]);

    // draw charts
    useEffect(() => {
        if (!result || result.error) return;
        const cs     = result.cluster_summary;
        const maxPop = result.max_popularity || 10;

        if (bubbleInstance.current) { bubbleInstance.current.destroy(); bubbleInstance.current = null; }
        if (radarInstance.current)  { radarInstance.current.destroy();  radarInstance.current  = null; }

        if (bubbleChartRef.current) {
            bubbleInstance.current = new Chart(bubbleChartRef.current, {
                type: 'bubble',
                data: {
                    datasets: cs.map((c, i) => ({
                        label: c.cluster_name,
                        data:  [{ x: Math.round(c.avg_price / 1000), y: c.avg_rating, r: Math.max(8, c.product_count / 50) }],
                        backgroundColor: c.is_blue_ocean ? 'rgba(34,211,238,0.6)' : CLUSTER_COLORS[i % 5],
                        borderColor: CLUSTER_BORDERS[i % 5], borderWidth: c.is_blue_ocean ? 3 : 1.5,
                    }))
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#cbd5e1', font: { size: 11 } } },
                        tooltip: { callbacks: { label: ctx => {
                            const d = ctx.raw; const c = cs[ctx.datasetIndex];
                            return [` ${ctx.dataset.label}`, ` 💰 Giá TB: ${(d.x*1000).toLocaleString('vi-VN')} đ`, ` ⭐ Rating: ${d.y}`, ` 📦 ${c.product_count} sản phẩm`];
                        }}}
                    },
                    scales: {
                        x: { title:{ display:true, text:'Giá TB (nghìn đ)', color:'#94a3b8' }, ticks:{ color:'#94a3b8' }, grid:{ color:'rgba(148,163,184,0.1)' } },
                        y: { title:{ display:true, text:'Rating TB',         color:'#94a3b8' }, ticks:{ color:'#94a3b8' }, grid:{ color:'rgba(148,163,184,0.1)' }, min:0, max:5 },
                    }
                }
            });
        }

        if (radarChartRef.current) {
            const norm = (val, max) => Math.round((val / (max || 1)) * 10) / 10;
            const maxPrice = Math.max(...cs.map(c => c.avg_price));
            const maxQty   = Math.max(...cs.map(c => c.avg_qty_sold));
            radarInstance.current = new Chart(radarChartRef.current, {
                type: 'radar',
                data: {
                    labels: ['Giá', 'Rating', 'Popularity', 'Đã bán', 'Cơ hội'],
                    datasets: cs.map((c, i) => ({
                        label: c.cluster_name,
                        data: [norm(c.avg_price, maxPrice), norm(c.avg_rating, 5), norm(c.avg_popularity, maxPop), norm(c.avg_qty_sold, maxQty), norm(c.opportunity_score||0, 100)],
                        backgroundColor: CLUSTER_COLORS[i % 5].replace('0.85','0.15'),
                        borderColor: CLUSTER_BORDERS[i % 5], borderWidth: 2,
                        pointBackgroundColor: CLUSTER_BORDERS[i % 5],
                    }))
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#cbd5e1', font: { size: 11 } } } },
                    scales: { r: { min:0, max:1, ticks:{ display:false }, grid:{ color:'rgba(148,163,184,0.15)' }, angleLines:{ color:'rgba(148,163,184,0.15)' }, pointLabels:{ color:'#94a3b8', font:{ size:12 } } } }
                }
            });
        }
    }, [result]);

    // table helpers
    const getCategories = () => !result || result.error ? [] : [...new Set(result.blue_ocean_products.map(p => p.category))];
    const getTableData  = () => {
        if (!result || result.error) return [];
        let rows = catFilter === 'all' ? result.blue_ocean_products : result.blue_ocean_products.filter(p => p.category === catFilter);
        return [...rows].sort((a, b) => sortDir === 'desc' ? (b[sortKey]||0) - (a[sortKey]||0) : (a[sortKey]||0) - (b[sortKey]||0));
    };
    const handleSort = key => { if (sortKey === key) setSortDir(d => d==='desc'?'asc':'desc'); else { setSortKey(key); setSortDir('desc'); } };
    const SortIcon = ({ col }) => sortKey !== col
        ? <i data-lucide="chevrons-up-down" className="inline w-3 h-3 opacity-30 ml-1"></i>
        : <i data-lucide={sortDir==='desc'?'chevron-down':'chevron-up'} className="inline w-3 h-3 text-cyan-400 ml-1"></i>;

    const STRATEGY = [
        { icon:'rocket',      color:'text-cyan-400',   bg:'border-cyan-500/40  bg-cyan-900/20',   title:'🌊 Đại Dương Xanh',  desc:'Rating thấp + Popularity cao — nhu cầu thị trường chưa được đáp ứng. Cơ hội vàng để nhập hàng chất lượng cao và chiếm thị phần.' },
        { icon:'zap',         color:'text-yellow-400', bg:'border-yellow-500/30 bg-yellow-900/10', title:'⚡ Đại Trà',          desc:'Rating tốt + Popularity cao — thị trường bão hòa. Chiến lược: cạnh tranh giá hoặc bundle sản phẩm kèm dịch vụ.' },
        { icon:'gem',         color:'text-violet-400', bg:'border-violet-500/30 bg-violet-900/10', title:'💎 Cao Cấp',          desc:'Giá cao + Rating tốt — phân khúc premium. Tập trung thương hiệu, uy tín và trải nghiệm khách hàng.' },
        { icon:'search',      color:'text-blue-400',   bg:'border-blue-500/30  bg-blue-900/10',   title:'🔍 Ngách Nhỏ',        desc:'Popularity thấp — thị trường chưa khai thác rõ. Cần khảo sát trước khi đầu tư. Rủi ro cao, tiềm năng chưa rõ.' },
        { icon:'trending-up', color:'text-emerald-400',bg:'border-emerald-500/30 bg-emerald-900/10',title:'📈 Tăng Trưởng',   desc:'Rating khá + Popularity đang tăng — đang trong giai đoạn phát triển. Nhập hàng sớm để nắm lợi thế người đi trước.' },
    ];

    return (
        <div className="pb-10">

            {/* ACTION */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="glass-panel p-6 rounded-xl animate-fade-in text-center">
                    <p className="text-gray-300 text-sm mb-4">
                        Phân tích toàn bộ sản phẩm bằng <strong>K-Means Clustering (5 cụm)</strong> dựa trên Giá · Rating · Popularity để tìm cơ hội có thể triển khai.
                    </p>
                    <button onClick={handleMarketInsight} disabled={loading}
                        className="px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-700 text-white font-bold rounded-lg flex items-center gap-2 mx-auto transition-all shadow-lg">
                        {loading ? <Icon name="loader-2" className="animate-spin"/> : <Icon name="telescope"/>}
                        {loading ? 'Đang phân tích clusters...' : 'Chạy phân tích KMeans'}
                    </button>
                </div>
            </div>

            {/* LOADING */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 text-rose-500 animate-pulse">
                    <Icon name="bot" size={48} className="mb-4"/>
                    <p className="text-lg font-medium">Đang phân tích clusters...</p>
                </div>
            )}

            {/* ERROR */}
            {!loading && result && result.error && (
                <div className="bg-red-900/30 border border-red-500 rounded-xl p-5 text-red-300 max-w-4xl mx-auto">
                    ❌ Lỗi: {result.error}
                </div>
            )}

            {/* RESULTS */}
            {!loading && result && !result.error && (
                <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">

                    <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-4 text-sm text-gray-300">
                        Rating TB thị trường: <span className="font-semibold text-cyan-300">{Number(result.market_avg_rating || 0).toFixed(2)}</span>
                        {' '}• Ngưỡng cơ hội hiện tại: <span className="font-semibold text-yellow-300">{Number(result.rating_threshold || 0).toFixed(2)}</span>
                    </div>

                    {/* KPI CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon:'package',   label:'Tổng sản phẩm',       value: result.total_products.toLocaleString('vi-VN'),   color:'text-blue-400',    border:'border-blue-500/30'    },
                            { icon:'layers',    label:'Số Cluster',           value: result.n_clusters,                               color:'text-violet-400',  border:'border-violet-500/30'  },
                            { icon:'waves',     label:'Sản phẩm Blue Ocean',  value: result.blue_ocean_count.toLocaleString('vi-VN'), color:'text-cyan-400',    border:'border-cyan-500/40'    },
                            { icon:'activity',  label:'Silhouette Score',     value: result.silhouette_score + ' / 1.0',              color:'text-emerald-400', border:'border-emerald-500/30' },
                        ].map(({ icon, label, value, color, border }) => (
                            <div key={label} className={`bg-[#1e293b] rounded-xl border ${border} p-5 flex items-center gap-4`}>
                                <div className={`w-10 h-10 rounded-lg bg-[#0f172a] flex items-center justify-center flex-shrink-0 ${color}`}>
                                    <Icon name={icon} size={20}/>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CHARTS */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-5">
                            <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                                <Icon name="scatter-chart" size={16} className="text-rose-400"/> Phân Bổ Cluster: Giá vs Rating
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">Kích thước bong bóng = số sản phẩm. Cluster cyan = Blue Ocean.</p>
                            <div style={{height:'300px'}}><canvas ref={bubbleChartRef}></canvas></div>
                        </div>
                        <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-5">
                            <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                                <Icon name="pentagon" size={16} className="text-violet-400"/> Hồ Sơ 5 Cluster (Radar)
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">So sánh 5 chiều: Giá · Rating · Popularity · Đã bán · Cơ hội (0–1).</p>
                            <div style={{height:'300px'}}><canvas ref={radarChartRef}></canvas></div>
                        </div>
                    </div>

                    {/* CLUSTER CARDS */}
                    <div>
                        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                            <Icon name="grid-3x3" size={16} className="text-gray-400"/> Chi Tiết 5 Cluster
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {result.cluster_summary.map(c => (
                                <div key={c.cluster_id} className={`rounded-xl border p-4 flex flex-col gap-2 ${c.is_blue_ocean ? 'border-cyan-400 bg-cyan-900/20 shadow-lg shadow-cyan-500/20' : 'border-gray-700 bg-[#1e293b]'}`}>
                                    {c.is_blue_ocean && <div className="text-xs font-bold text-cyan-300">🌊 BLUE OCEAN</div>}
                                    <div className="text-sm font-bold text-white leading-tight">{c.cluster_name}</div>

                                    {/* Opportunity Score */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">Cơ hội</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                            (c.opportunity_score||0) > 40 ? 'bg-cyan-900 text-cyan-300' :
                                            (c.opportunity_score||0) > 20 ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-800 text-gray-400'
                                        }`}>{c.opportunity_score||0}%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                                        <div className={`h-1.5 rounded-full ${c.is_blue_ocean?'bg-cyan-400':'bg-rose-500'}`} style={{width:`${Math.min(c.opportunity_score||0,100)}%`}}></div>
                                    </div>

                                    <div className="text-xs text-gray-400 space-y-1 mt-1">
                                        <div>📦 {c.product_count} sản phẩm</div>
                                        {/* Rating bar */}
                                        <div>
                                            <div className="flex justify-between mb-0.5">
                                                <span>⭐ Rating</span>
                                                <span className={c.avg_rating < 2 ? 'text-red-400 font-bold' : 'text-green-400'}>{c.avg_rating}</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-1">
                                                <div className={`h-1 rounded-full ${c.avg_rating<2?'bg-red-500':'bg-green-500'}`} style={{width:`${(c.avg_rating/5)*100}%`}}></div>
                                            </div>
                                        </div>
                                        {/* Popularity bar */}
                                        <div>
                                            <div className="flex justify-between mb-0.5">
                                                <span>🔥 Popularity</span>
                                                <span className="text-orange-300">{c.avg_popularity}</span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-1">
                                                <div className="h-1 rounded-full bg-orange-500" style={{width:`${Math.min((c.avg_popularity/(result.max_popularity||10))*100,100)}%`}}></div>
                                            </div>
                                        </div>
                                        <div>💰 {c.avg_price.toLocaleString('vi-VN')} đ</div>
                                        <div>🛒 Bán TB: {c.avg_qty_sold.toLocaleString('vi-VN')}</div>
                                        <div>📂 {c.top_category}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* BLUE OCEAN EXPLANATION */}
                    <div className="bg-cyan-900/20 border border-cyan-500/40 rounded-xl p-5">
                        <h3 className="text-cyan-300 font-bold text-lg mb-2">🌊 Đại Dương Xanh (Blue Ocean) là gì?</h3>
                        <p className="text-gray-300 text-sm">
                            Đây là nhóm sản phẩm có <strong>nhu cầu còn tốt</strong> nhưng <strong>chất lượng chưa đáp ứng kỳ vọng</strong> theo ngưỡng rating động của thị trường hiện tại.
                            Cách dùng thực tế: ưu tiên sản phẩm có opportunity score cao, lượng bán ổn định, rồi vào bằng bản nâng cấp chất lượng/dịch vụ.
                        </p>
                    </div>

                    {/* BLUE OCEAN TABLE */}
                    <div className="bg-[#1e293b] rounded-xl border border-cyan-700 overflow-hidden shadow-lg">
                        <div className="p-4 border-b border-cyan-700/50 bg-cyan-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <h3 className="font-bold text-cyan-200 flex items-center gap-2">
                                <Icon name="telescope" size={18} className="text-cyan-400"/> Top Cơ Hội Blue Ocean ({getTableData().length} sản phẩm)
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Danh mục:</span>
                                <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                                    className="text-xs bg-[#0f172a] border border-gray-600 text-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500">
                                    <option value="all">Tất cả</option>
                                    {getCategories().map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-400 uppercase bg-[#0f172a] border-b border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3">#</th>
                                        <th className="px-4 py-3">Sản phẩm</th>
                                        <th className="px-4 py-3">Danh mục</th>
                                        {[['price','💰 Giá'],['rating','⭐ Rating'],['quantity_sold','🛒 Đã bán'],['popularity_score','🔥 Popularity']].map(([key,label]) => (
                                            <th key={key} className="px-4 py-3 text-right cursor-pointer select-none hover:text-cyan-300 transition-colors" onClick={() => handleSort(key)}>
                                                {label} <SortIcon col={key}/>
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 text-right cursor-pointer select-none hover:text-cyan-300 transition-colors" onClick={() => handleSort('opportunity_score')}>
                                            🎯 Cơ hội <SortIcon col="opportunity_score"/>
                                        </th>
                                        <th className="px-4 py-3 text-center">Link</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/60">
                                    {getTableData().map((p, idx) => (
                                        <tr key={p.product_id} className="hover:bg-cyan-900/10 transition-colors">
                                            <td className="px-4 py-3 text-gray-500 text-xs">{idx+1}</td>
                                            <td className="px-4 py-3 text-white max-w-[200px]">
                                                <span className="line-clamp-2 text-xs leading-4" title={p.name}>{p.name}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-300 border border-gray-600 whitespace-nowrap">{p.category}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-300 text-xs whitespace-nowrap">{p.price.toLocaleString('vi-VN')} đ</td>
                                            <td className="px-4 py-3 text-right"><span className="font-bold text-red-400">{p.rating}</span></td>
                                            <td className="px-4 py-3 text-right text-green-400 text-xs">{p.quantity_sold.toLocaleString('vi-VN')}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-12 bg-gray-700 rounded-full h-1 hidden sm:block">
                                                        <div className="h-1 rounded-full bg-cyan-500" style={{width:`${Math.min((p.popularity_score/(result.max_popularity||10))*100,100)}%`}}></div>
                                                    </div>
                                                    <span className="text-cyan-300 text-xs">{p.popularity_score}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-yellow-300 font-semibold text-xs">{Number(p.opportunity_score || 0).toFixed(1)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <a href={p.url || `https://tiki.vn/p/${p.product_id}`} target="_blank" rel="noopener noreferrer"
                                                    className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-cyan-700 hover:bg-cyan-600 text-white transition-colors gap-1">
                                                    <Icon name="external-link" size={11}/> Xem
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* STRATEGY PANEL */}
                    <div>
                        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                            <Icon name="lightbulb" size={16} className="text-yellow-400"/> Gợi Ý Chiến Lược Theo Phân Khúc
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {STRATEGY.map(s => (
                                <div key={s.title} className={`rounded-xl border p-4 ${s.bg}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-8 h-8 rounded-lg bg-[#0f172a] flex items-center justify-center ${s.color}`}>
                                            <Icon name={s.icon} size={16}/>
                                        </div>
                                        <span className={`font-bold text-sm ${s.color}`}>{s.title}</span>
                                    </div>
                                    <p className="text-xs text-gray-300 leading-relaxed">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}

            {/* EMPTY STATE */}
            {!loading && !result && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 opacity-60">
                    <Icon name="telescope" size={64} className="mb-4"/>
                    <p className="text-lg">Nhấn nút để chạy phân tích KMeans</p>
                </div>
            )}
        </div>
    );
}
