// ============================================================
// 📊 MARKET REPORT PAGE — Phân Tích Thị Trường
// ============================================================

function MarketReportPage() {
    const { useState, useEffect, useRef } = React;
    const SEARCH_HISTORY_KEY = 'tiki_market_search_history_v1';
    const HISTORY_LIMIT = 12;
    const advisorQuestions = [
        { id: '1', label: 'Nên tập trung vào phân khúc nào để dễ bán hơn?' },
        { id: '2', label: 'Mức giá đề xuất để cạnh tranh tốt là bao nhiêu?' },
        { id: '3', label: 'Gợi ý 3 hành động tăng doanh thu trong 7 ngày tới.' },
        { id: '4', label: 'Rủi ro lớn nhất hiện tại là gì và xử lý thế nào?' },
        { id: '5', label: 'Nên tối ưu sản phẩm top đầu ra sao để bứt phá?' },
    ];
    const chatHint = 'Gợi ý: Bạn có thể nhập keyword để hỏi hoặc chọn số từ 1 đến 5.';

    const buildQuestionMenuText = () => {
        const lines = advisorQuestions.map((q) => `${q.id}. ${q.label}`).join('\n');
        return `Chào bạn, đây là bảng tư vấn nhanh:\n\n${lines}\n\nBạn cũng có thể hỏi theo kiểu thực chiến: "bán gì với vốn 1 triệu", "ngách ít cạnh tranh", "mặt hàng nào dễ bán".\n\n${chatHint}`;
    };

    const [marketKeyword, setMarketKeyword] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [selectedContextId, setSelectedContextId] = useState(null);
    const [searchHistory, setSearchHistory] = useState([]);
    const [chatMessages, setChatMessages] = useState([{ role: 'assistant', text: buildQuestionMenuText() }]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const chatScrollRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [priceFilter, setPriceFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [reviewModal, setReviewModal] = useState({ open: false, product: null, reviews: [], loading: false, error: null });

    const normalizeBotText = (value) =>
        String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

    const renderChatMessageText = (text) => {
        const source = String(text || '');
        const renderLineWithBold = (line, lineIdx) => {
            const parts = [];
            const pattern = /\*\*(.*?)\*\*/g;
            let cursor = 0;
            let match;
            let partIdx = 0;

            while ((match = pattern.exec(line)) !== null) {
                if (match.index > cursor) {
                    parts.push(<React.Fragment key={`t-${lineIdx}-${partIdx}`}>{line.slice(cursor, match.index)}</React.Fragment>);
                    partIdx += 1;
                }
                parts.push(<strong key={`b-${lineIdx}-${partIdx}`} className="font-semibold text-gray-900">{match[1]}</strong>);
                partIdx += 1;
                cursor = match.index + match[0].length;
            }

            if (cursor < line.length) {
                parts.push(<React.Fragment key={`t-${lineIdx}-${partIdx}`}>{line.slice(cursor)}</React.Fragment>);
            }

            return <div key={`line-${lineIdx}`}>{parts.length ? parts : line}</div>;
        };

        return source.split('\n').map((line, idx) => renderLineWithBold(line, idx));
    };

    const parseFlexibleNumber = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        const normalized = String(value).replace(/,/g, '.').replace(/[^\d.-]/g, '');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const formatCompactMoney = (value) => {
        if (!value || value <= 0) return '0 VNĐ';
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M VNĐ`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}K VNĐ`;
        return `${value.toLocaleString('vi-VN')} VNĐ`;
    };

    const extractBudgetFromText = (text) => {
        const normalized = normalizeBotText(text);
        const budgetMatch = normalized.match(/(\d+(?:[\.,]\d+)?)\s*(trieu|tr|k|nghin|ngan|m|million)/);
        if (!budgetMatch) return 0;

        const amount = parseFloat(budgetMatch[1].replace(',', '.'));
        const unit = budgetMatch[2];
        if (['trieu', 'tr', 'm', 'million'].includes(unit)) return amount * 1000000;
        if (['k', 'nghin', 'ngan'].includes(unit)) return amount * 1000;
        return amount;
    };

    const buildProductMetrics = (products = []) => products.map((product) => {
        const sold = parseFlexibleNumber(product.sold);
        const revenue = parseFlexibleNumber(product.rev);
        const price = parseFlexibleNumber(product.price);
        const rating = parseFlexibleNumber(product.rating);

        return {
            ...product,
            soldValue: sold,
            revenueValue: revenue,
            priceValue: price,
            ratingValue: rating,
        };
    });

    const buildChatAdvice = ({ message, products, keyword }) => {
        const normalized = normalizeBotText(message);
        const metrics = buildProductMetrics(products);
        const contextLabel = keyword ? `"${keyword}"` : 'dữ liệu hiện tại';
        const withContext = (text) => `Dành cho ${contextLabel}:\n${text}`;

        if (!metrics.length) {
            return withContext('Chưa có dữ liệu sản phẩm để tư vấn. Hãy phân tích 1 từ khóa hoặc tải CSV trước, rồi tôi sẽ gợi ý mặt hàng tiềm năng, ít cạnh tranh và phù hợp vốn.');
        }

        const categoryMap = new Map();
        metrics.forEach((item) => {
            const category = item.cat || 'khac';
            const current = categoryMap.get(category) || { count: 0, sold: 0, rating: 0 };
            current.count += 1;
            current.sold += item.soldValue;
            current.rating += item.ratingValue || 0;
            categoryMap.set(category, current);
        });

        const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
            name,
            ...data,
            avgRating: data.count > 0 ? data.rating / data.count : 0,
        }));

        const pickBest = (list, scoreFn, limit = 3) => [...list].sort((a, b) => scoreFn(b) - scoreFn(a)).slice(0, limit);

        const topSell = pickBest(metrics, (item) => (item.soldValue * 0.7) + (item.ratingValue * 10000) + (item.revenueValue / 100000), 3);
        const topValue = pickBest(metrics, (item) => (item.revenueValue / 1000000) + (item.ratingValue * 20) - (item.priceValue / 100000), 3);
        const nicheCategories = [...categories]
            .filter((cat) => cat.count <= 2)
            .sort((a, b) => (b.avgRating - a.avgRating) || (a.count - b.count));

        const budget = extractBudgetFromText(normalized);

        const topSellText = topSell
            .map((item, index) => `${index + 1}. ${item.name} | bán ${item.soldValue.toLocaleString('vi-VN')} | rating ${item.ratingValue.toFixed(1)}/5 | giá ${item.price}`)
            .join('\n');

        const topValueText = topValue
            .map((item, index) => `${index + 1}. ${item.name} | doanh thu ${formatCompactMoney(item.revenueValue)} | bán ${item.soldValue.toLocaleString('vi-VN')} | giá ${item.price}`)
            .join('\n');

        const nicheText = nicheCategories.length
            ? nicheCategories
                .slice(0, 3)
                .map((cat, index) => `${index + 1}. ${cat.name} | ${cat.count} sản phẩm | rating TB ${cat.avgRating.toFixed(1)}/5`)
                .join('\n')
            : 'Chưa thấy ngách nhỏ rõ ràng trong tập dữ liệu này, nên ưu tiên nhóm có rating cao và lượng bán ổn định.';

        if (normalized.includes('von') || normalized.includes('ngan sach') || normalized.includes('budget')) {
            if (budget > 0) {
                const affordable = metrics
                    .filter((item) => item.priceValue <= budget)
                    .sort((a, b) => (b.ratingValue + b.soldValue / 100000) - (a.ratingValue + a.soldValue / 100000))
                    .slice(0, 3);

                if (affordable.length) {
                    return withContext(`Với vốn khoảng ${formatCompactMoney(budget)}, tôi ưu tiên 3 mặt hàng sau:\n${affordable.map((item, index) => `${index + 1}. ${item.name} | giá ${item.price} | bán ${item.soldValue.toLocaleString('vi-VN')} | rating ${item.ratingValue.toFixed(1)}/5`).join('\n')}\n\nLý do: giá phù hợp vốn, rating tốt và có sức bán trong nhóm đang xem.`);
                }
            }

            return withContext(`Nếu ưu tiên vốn thấp, hãy chọn nhóm có giá thấp hơn giá trung bình và rating từ 4.5 trở lên. Trong dữ liệu hiện tại, 3 sản phẩm bán tốt nhất là:\n${topSellText}`);
        }

        if (normalized.includes('it canh tranh') || normalized.includes('ngach') || normalized.includes('niche')) {
            return withContext(`Gợi ý ngách ít cạnh tranh trong dữ liệu hiện tại:\n${nicheText}\n\nKhi chọn ngách, ưu tiên: ít sản phẩm cùng category + rating trung bình cao + có sản phẩm bán ra ổn định.`);
        }

        if (normalized.includes('loi nhuan') || normalized.includes('lai') || normalized.includes('ban gi') || normalized.includes('tien nang') || normalized.includes('de ban') || normalized.includes('hot')) {
            return withContext(`Tôi đề xuất 3 hướng đáng chú ý cho dữ liệu hiện tại:\n\nDễ bán nhất:\n${topSellText}\n\nGiá trị/Doanh thu tốt:\n${topValueText}\n\nNgách đáng thử:\n${nicheText}`);
        }

        if (normalized.includes('top') || normalized.includes('san pham')) {
            return withContext(`Tôi ưu tiên 3 mặt hàng có khả năng bán tốt nhất hiện tại:\n${topSellText}\n\nNếu muốn tối ưu lợi nhuận, hãy xem thêm nhóm doanh thu tốt:\n${topValueText}`);
        }

        return withContext(`Tôi có thể giúp bạn theo 3 hướng nhanh:\n1. Gợi ý sản phẩm dễ bán nhất\n2. Gợi ý mặt hàng phù hợp theo vốn\n3. Tìm ngách ít cạnh tranh\n\nBạn có thể bấm nút nhanh hoặc gõ: "bán gì với vốn 1 triệu".`);
    };

    useEffect(() => {
        setTimeout(() => lucide.createIcons(), 100);
    }, [result, searchHistory, chatMessages, isChatOpen, reviewModal.open]);

    useEffect(() => {
        if (!isChatOpen || !chatScrollRef.current) return;
        chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [chatMessages, isChatOpen]);

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

    const runMarketReport = async ({ keyword, context_id }) => {
        const cleaned = (keyword || '').trim();
        if (!cleaned) return;

        setLoading(true);
        setResult(null);
        setCurrentPage(1);
        setPriceFilter('all');
        setCategoryFilter('all');
        try {
            const res = await fetch(`${API_BASE_URL}/api/market-report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: cleaned, context_id: context_id || null })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.detail || 'Error');
            setResult(json.data);
            setMarketKeyword(cleaned);
            saveSearchHistory(cleaned);
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

    const generateAdvisoryAnswer = (choice) => {
        if (!result || result.error) {
            return `Bạn hãy phân tích một từ khóa trước, sau đó chọn lại số từ 1 đến 5 để tôi tư vấn chính xác.\n\n${chatHint}`;
        }

        const ov = result.overview || {};
        const seg = result.price_segments || {};
        const topProducts = result.top_products || [];
        const topProduct = topProducts[0] || null;
        const topCategory = (result.top_categories || [])[0] || null;
        const sentiment = result.sentiment || {};
        const trend = result.price_trend || {};

        const avgPrice = Number(ov.avg_price || 0);
        const minPrice = Number(ov.min_price || 0);
        const maxPrice = Number(ov.max_price || 0);
        const priceFloor = Math.round(avgPrice * 0.9);
        const priceCeil = Math.round(avgPrice * 1.05);

        const budgetPct = Number(seg.budget?.pct || 0);
        const midPct = Number(seg.mid?.pct || 0);
        const premiumPct = Number(seg.premium?.pct || 0);

        const buildRecommendationHeader = (title, verdict) => `**${title}**\n${verdict}`;
        const buildRecommendationFooter = (nextSteps, caution) =>
            `\n**Việc nên làm ngay**\n${nextSteps}\n\n**Lưu ý**\n${caution}\n\n${chatHint}`;

        const pickBestSegment = () => {
            const items = [
                { name: 'bình dân', pct: budgetPct },
                { name: 'trung cấp', pct: midPct },
                { name: 'cao cấp', pct: premiumPct },
            ].sort((a, b) => b.pct - a.pct);
            return items[0];
        };

        const pickSecondSegment = () => {
            const items = [
                { name: 'bình dân', pct: budgetPct },
                { name: 'trung cấp', pct: midPct },
                { name: 'cao cấp', pct: premiumPct },
            ].sort((a, b) => b.pct - a.pct);
            return items[1];
        };

        switch (choice) {
            case '1': {
                const best = pickBestSegment();
                const second = pickSecondSegment();
                return buildRecommendationHeader(
                    'Kết luận nhanh',
                    `Nên ưu tiên phân khúc ${best.name} vì đang có độ phủ mạnh nhất (${best.pct}%).`
                ) +
                    `\n**Vì sao nên chọn**\n- Phân khúc này đang có lực kéo tốt nhất để ra đơn nhanh hơn.\n- Tệp khách đã rõ, dễ tối ưu nội dung và giá.\n- Giảm rủi ro thử sai so với đổ ngân sách dàn trải.` +
                    buildRecommendationFooter(
                        `1) Dồn 70% ngân sách vào ${best.name}.\n2) Dành 30% thử nghiệm ở ${second.name}.\n3) Theo dõi chuyển đổi theo từng phân khúc mỗi 2 ngày.`,
                        `Không nên dàn đều cả 3 phân khúc; hãy chọn 1 phân khúc chính để thắng nhanh, sau đó mới mở rộng.`
                    );
            }
            case '2':
                return buildRecommendationHeader(
                    'Kết luận nhanh',
                    `Nên đặt giá quanh ${priceFloor.toLocaleString('vi-VN')}đ - ${priceCeil.toLocaleString('vi-VN')}đ để vừa cạnh tranh vừa giữ biên lợi nhuận.`
                ) +
                    `\n**Vì sao nên chọn vùng giá này**\n- Bám sát mặt bằng thị trường, không quá rẻ để mất lợi nhuận.\n- Không quá cao để tránh bị loại khỏi nhóm khách nhạy giá.\n- Có thể tạo 1 sản phẩm mồi và 1 sản phẩm lợi nhuận tách biệt.` +
                    buildRecommendationFooter(
                        `1) Đặt 1 SKU mồi ở mức thấp hơn giá trung bình khoảng 2% - 5%.\n2) Giữ SKU chủ lực ở quanh giá trung bình.\n3) Tạo gói combo để kéo giá trị đơn hàng cao hơn.`,
                        `Nếu vượt quá ${maxPrice.toLocaleString('vi-VN')}đ mà chưa có thương hiệu mạnh, khả năng chuyển đổi sẽ giảm rõ rệt.`
                    );
            case '3':
                return buildRecommendationHeader(
                    'Kết luận nhanh',
                    'Trong 7 ngày tới nên tập trung 3 việc: tăng click, tăng chuyển đổi, và tăng giá trị đơn hàng.'
                ) +
                    `\n**Kế hoạch triển khai**\n- Tối ưu ngay 3 sản phẩm đầu bảng: ảnh, tiêu đề, 3 USP đầu mô tả.\n- Chạy ưu đãi ngắn hạn cho nhóm giá quanh ${avgPrice.toLocaleString('vi-VN')}đ để đẩy đơn nhanh.\n- Dùng danh mục mạnh nhất${topCategory ? ` (${topCategory.name})` : ''} làm mỏ neo nội dung và A/B test mô tả trong 72 giờ.` +
                    buildRecommendationFooter(
                        `1) Cập nhật ảnh chính và tiêu đề trong hôm nay.\n2) Chạy 1 ưu đãi có thời hạn 72 giờ.\n3) So sánh CTR và doanh thu giữa 2 phiên bản mô tả.`,
                        `Nếu chỉ chạy khuyến mãi mà không sửa nội dung sản phẩm, hiệu quả sẽ rất thấp.`
                    );
            case '4': {
                const negPct = Number(sentiment.neg_pct || 0);
                const riskTrend = trend.direction === 'up' ? 'giá có xu hướng tăng' : trend.direction === 'down' ? 'giá có xu hướng giảm' : 'giá đang đi ngang';
                return buildRecommendationHeader(
                    'Kết luận nhanh',
                    `${negPct >= 18 ? 'Rủi ro từ phản hồi tiêu cực đang khá đáng chú ý' : 'Rủi ro chính là bị cuốn vào cuộc chiến giá'} và ${riskTrend}.`
                ) +
                    `\n**Cách xử lý**\n- Chuẩn hóa checklist chất lượng trước giao hàng.\n- Phản hồi đánh giá xấu trong 24 giờ.\n- Theo dõi giá mỗi ngày, điều chỉnh linh hoạt trong biên độ nhỏ.\n\n**Ngưỡng cảnh báo**\n- Sentiment tiêu cực > 20%.\n- Doanh số giảm liên tiếp 3 ngày.\n- Giá đối thủ biến động quá mạnh trong 48 giờ.` +
                    buildRecommendationFooter(
                        `1) Tạo checklist kiểm hàng trước khi xuất đơn.\n2) Gắn người theo dõi review tiêu cực.\n3) Thiết lập cảnh báo khi giá hoặc doanh số biến động bất thường.`,
                        `Nếu bỏ qua review xấu, bot chỉ ra số liệu đẹp nhưng tỉ lệ mua thật vẫn sẽ tụt.`
                    );
            }
            case '5':
                return topProduct
                    ? buildRecommendationHeader(
                        'Kết luận nhanh',
                        `Sản phẩm top "${topProduct.name}" nên được dùng làm mũi nhọn kéo traffic.`
                    ) +
                    `\n**Hướng tối ưu**\n- Viết lại phần đầu mô tả thành 3 lợi ích mua ngay.\n- Tạo combo hoặc phiên bản nâng cấp để tăng giá trị đơn hàng.\n- Gắn đề xuất chéo sang 2 sản phẩm cùng danh mục để tăng giỏ hàng.` +
                    buildRecommendationFooter(
                        `1) Làm lại 3 dòng đầu mô tả ngay hôm nay.\n2) Tạo combo/bundle cho sản phẩm top.\n3) Gắn 2 sản phẩm liên quan để bán kèm.`,
                        `Nếu chỉ giữ sản phẩm top như hiện tại mà không tối ưu nội dung, bạn đang để traffic trôi đi rất phí.`
                    )
                    : `Hiện chưa có dữ liệu top sản phẩm. Bạn hãy phân tích từ khóa trước rồi chọn lại câu 5.\n\n${chatHint}`;
            default:
                return `Vui lòng chọn số từ 1 đến 5 theo bảng câu hỏi:\n\n${advisorQuestions.map((q) => `${q.id}. ${q.label}`).join('\n')}\n\n${chatHint}`;
        }
    };

    const extractChoice = (questionText) => {
        const cleaned = (questionText || '').trim();
        const match = cleaned.match(/\b([1-5])\b/);
        return match ? match[1] : null;
    };

    const inferChoiceFromText = (questionText) => {
        const q = (questionText || '').toLowerCase();
        if (/(phân khúc|segment|nên tập trung|bán hơn)/i.test(q)) return '1';
        if (/(giá|price|bao nhiêu tiền|định giá)/i.test(q)) return '2';
        if (/(doanh thu|tăng doanh thu|7 ngày|hành động|kế hoạch)/i.test(q)) return '3';
        if (/(rủi ro|cảnh báo|nguy cơ|xử lý thế nào)/i.test(q)) return '4';
        if (/(top đầu|tối ưu|bứt phá|sản phẩm top|kéo traffic)/i.test(q)) return '5';
        return null;
    };

    const sendChatQuestion = async (questionText) => {
        const question = (questionText || '').trim();
        if (!question || chatLoading) return;

        setChatMessages((prev) => [...prev, { role: 'user', text: question }]);
        setChatInput('');
        setChatLoading(true);

        try {
            const selectedChoice = extractChoice(question) || inferChoiceFromText(question);
            const asksForNewAnalysis = /(phân tích|tìm|tra cứu|keyword|từ khóa|xem)/i.test(question) && question.length > 8;

            if (selectedChoice) {
                const reply = generateAdvisoryAnswer(selectedChoice);
                setChatMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
            } else if (asksForNewAnalysis) {
                await runMarketReport({ keyword: question, context_id: null });
                setChatMessages((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        text: `Đã phân tích từ khóa "${question}".\n\nBây giờ tôi sẽ tư vấn riêng cho keyword này, không trả lời chung chung nữa.\n\n${chatHint}`
                    }
                ]);
            } else {
                const reply = buildChatAdvice({
                    message: question,
                    products: (result?.top_products || []).map((p) => ({
                        name: p.name,
                        cat: p.category,
                        price: p.price,
                        sold: p.sold,
                        rev: p.revenue,
                        rating: p.rating,
                    })),
                    keyword: marketKeyword || 'dữ liệu hiện tại',
                });
                setChatMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
            }
        } catch (error) {
            setChatMessages((prev) => [...prev, { role: 'assistant', text: `Lỗi chatbot: ${error.message}` }]);
        } finally {
            setChatLoading(false);
            setTimeout(() => lucide.createIcons(), 100);
        }
    };

    const handleSendChat = async () => {
        await sendChatQuestion(chatInput);
    };

    const handleQuickCommand = async (choice) => {
        setIsChatOpen(true);
        await sendChatQuestion(choice);
    };

    const handleExportPDF = () => {
        if (!result || result.error) return;
        const titleKeyword = marketKeyword || 'PhanTichDon';
        const element = document.createElement('div');
        const exportRows = (result.top_products || []).map((p, idx) => ({
            id: idx + 1,
            name: p.name,
            cat: p.category,
            price: `${Number(p.price || 0).toLocaleString('vi-VN')}đ`,
            sold: Number(p.sold || 0).toLocaleString('vi-VN'),
            rev: `${Number(p.revenue || 0).toLocaleString('vi-VN')}đ`,
            url: p.url || ''
        }));

        element.innerHTML = buildPdfHtml(exportRows, result.ai_report || 'Khong co insight', titleKeyword, false);
        html2pdf().set({
            margin: 10,
            filename: `BaoCao_PhanTichDon_${Date.now()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        }).from(element).save();
    };

    const handleOpenReviews = async (product) => {
        setReviewModal({ open: true, product, reviews: [], loading: true, error: null });
        try {
            const pid = product.product_id || product.id || '';
            if (!pid) throw new Error('Không tìm thấy product_id');
            const res = await fetch(`${API_BASE_URL}/api/product-reviews/${pid}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setReviewModal({ open: true, product, reviews: json.data || [], loading: false, error: null });
        } catch (e) {
            setReviewModal(prev => ({ ...prev, loading: false, error: e.message }));
        }
    };

    return (
        <ErrorBoundary>
            <div className="max-w-5xl mx-auto space-y-6 pb-10">

                {/* SEARCH BAR */}
                <div className="glass-panel p-6 rounded-xl flex gap-4 items-end animate-fade-in">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nhập từ khóa để phân tích thị trường</label>
                        <input
                            type="text"
                            value={marketKeyword}
                            onChange={(e) => setMarketKeyword(e.target.value)}
                            placeholder="Ví dụ: xe, laptop, điện thoại..."
                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && handleMarketReport()}
                        />
                    </div>
                    <button
                        onClick={handleMarketReport}
                        disabled={loading || !marketKeyword.trim()}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-200"
                    >
                        {loading ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="bar-chart-2" />}
                        Phân tích
                    </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex flex-wrap gap-2">
                        {searchHistory.map((item) => (
                            <button
                                key={item}
                                onClick={() => runMarketReport({ keyword: item, context_id: null })}
                                className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-300 text-gray-800 hover:border-blue-500 hover:text-gray-900 transition-all"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                    {searchHistory.length > 0 && (
                        <button
                            onClick={clearSearchHistory}
                            className="text-xs px-3 py-1.5 rounded-lg border border-red-500/40 text-red-600 hover:bg-red-500/20 transition-all"
                        >
                            Xóa lịch sử
                        </button>
                    )}
                </div>

                {/* LOADING */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-blue-500 animate-pulse">
                        <Icon name="bot" size={48} className="mb-4" />
                        <p className="text-lg font-medium">Đang phân tích thị trường...</p>
                        <p className="text-sm text-gray-500">Đang thu thập dữ liệu từ {marketKeyword}</p>
                    </div>
                )}

                {/* ERROR */}
                {!loading && result && result.error && (
                    <div className="bg-red-50 border border-red-500 rounded-xl p-5 text-red-600">
                        ❌ Lỗi: {result.error}
                    </div>
                )}

                {/* EXPORT BUTTON */}
                {!loading && result && !result.error && (
                    <div className="max-w-5xl mx-auto flex justify-end mb-2">
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-900/20"
                        >
                            <Icon name="download" size={16} /> Xuất PDF
                        </button>
                    </div>
                )}

                {/* RESULTS */}
                {!loading && result && !result.error && (() => {
                    const d = result;
                    const ov = d.overview;
                    const seg = d.price_segments;
                    const trend = d.price_trend;
                    const sent = d.sentiment;
                    const ctx = d.context;
                    return (
                        <div className="space-y-6 animate-fade-in">

                            {/* CONTEXT SUGGESTIONS */}
                            {ctx && (
                                <div className="bg-white rounded-xl border border-blue-100 p-5">
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <Icon name="sparkles" size={18} className="text-blue-500" /> Bạn có đang tìm kiếm...?
                                        </h3>
                                        {ctx.selected_context && (
                                            <span className="text-xs text-gray-500">
                                                Ngữ cảnh đang chọn: <span className="text-blue-700 font-semibold">{ctx.selected_context_label || ctx.selected_context}</span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {ctx.selected_context && (
                                            <span className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-blue-600 text-white border-blue-400">
                                                {ctx.selected_context_label || ctx.selected_context}
                                            </span>
                                        )}
                                        {ctx.suggestions && ctx.suggestions.map((s) => (
                                            <button
                                                key={s.context_id}
                                                onClick={() => handleSelectContext(s.context_id)}
                                                disabled={loading}
                                                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all bg-white text-gray-800 border-gray-300 hover:border-blue-500 hover:text-blue-700"
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
                                    { label: "Tổng Sản Phẩm", val: ov.total_products.toLocaleString('vi-VN'), icon: "package", color: "text-blue-400" },
                                    { label: "Tổng Đã Bán", val: ov.total_sold.toLocaleString('vi-VN'), icon: "shopping-cart", color: "text-green-600" },
                                    { label: "Tổng Doanh Thu", val: formatVND(ov.total_revenue), icon: "dollar-sign", color: "text-yellow-400" },
                                    { label: "Rating TB", val: `${ov.avg_rating} ⭐`, icon: "star", color: "text-blue-500" },
                                ].map((item, idx) => (
                                    <div key={idx} className="bg-white p-5 rounded-xl border border-blue-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-gray-500 text-xs">{item.label}</span>
                                            <Icon name={item.icon} size={16} className={item.color} />
                                        </div>
                                        <div className="text-xl font-bold text-gray-900">{item.val}</div>
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
                                <div className="bg-white rounded-xl border border-blue-100 p-5">
                                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Icon name="layers" size={16} className="text-purple-400" />Phân Khúc Giá
                                        <PriceSegmentTooltip />
                                    </h3>
                                    {[
                                        { label: "💙 Bình dân", data: seg.budget, color: "bg-blue-500" },
                                        { label: "💚 Trung cấp", data: seg.mid, color: "bg-green-500" },
                                        { label: "💎 Cao cấp", data: seg.premium, color: "bg-purple-500" },
                                    ].map((s, i) => (
                                        <div key={i} className="mb-3">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-700">{s.label}</span>
                                                <span className="text-gray-500">{s.data.count} SP ({s.data.pct}%)</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className={`${s.color} h-2 rounded-full transition-all`} style={{ width: `${s.data.pct}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Sentiment */}
                                <div className="bg-white rounded-xl border border-blue-100 p-5">
                                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Icon name="message-circle" size={16} className="text-blue-500" />Sentiment Đánh Giá
                                    </h3>
                                    {sent.total > 0 ? (
                                        <>
                                            <div className="text-xs text-gray-500 mb-3">Từ {sent.total.toLocaleString('vi-VN')} đánh giá</div>
                                            {[
                                                { label: "✅ Tích cực", count: sent.positive, pct: sent.pos_pct, color: "bg-green-500" },
                                                { label: "⚠️ Trung lập", count: sent.neutral, pct: sent.neu_pct, color: "bg-yellow-500" },
                                                { label: "❌ Tiêu cực", count: sent.negative, pct: sent.neg_pct, color: "bg-red-500" },
                                            ].map((s, i) => (
                                                <div key={i} className="mb-3">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-gray-700">{s.label}</span>
                                                        <span className="text-gray-500">{s.count.toLocaleString('vi-VN')} ({s.pct}%)</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div className={`${s.color} h-2 rounded-full`} style={{ width: `${s.pct}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <div className="text-gray-500 text-sm">Không có đánh giá cho từ khóa này</div>
                                    )}
                                </div>
                            </div>

                            {/* Top Categories */}
                            <div className="grid grid-cols-1 gap-4">

                                {/* Top Categories */}
                                <div className="bg-white rounded-xl border border-blue-100 p-5">
                                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Icon name="folder-open" size={16} className="text-orange-400" />Top Danh Mục
                                    </h3>
                                    <div className="space-y-2">
                                        {d.top_categories.map((cat, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <span className="text-gray-500 text-xs w-4">{i + 1}</span>
                                                <span className="text-gray-700 text-sm flex-1 truncate" title={cat.name}>{cat.name}</span>
                                                <span className="text-xs text-gray-500">{cat.count} SP</span>
                                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                                    <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${cat.pct}%` }}></div>
                                                </div>
                                                <span className="text-xs text-orange-400 w-10 text-right">{cat.pct}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Top 10 Products */}
                            <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
                                {/* Header + Filter */}
                                <div className="p-4 border-b border-blue-100 bg-blue-50 flex flex-col gap-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <Icon name="trophy" size={18} className="text-yellow-500" />Danh sách sản phẩm
                                        </h3>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs text-gray-500 mr-1">Phân khúc giá:</span>
                                            {[
                                                { key: 'all', label: 'Tất cả', icon: '📦', activeClass: 'bg-gray-500 text-gray-900 border-gray-400' },
                                                { key: 'budget', label: 'Bình dân', icon: '💙', activeClass: 'bg-blue-600 text-white border-blue-400' },
                                                { key: 'mid', label: 'Trung cấp', icon: '💚', activeClass: 'bg-green-600 text-gray-900 border-green-400' },
                                                { key: 'premium', label: 'Cao cấp', icon: '💎', activeClass: 'bg-purple-600 text-gray-900 border-purple-400' },
                                            ].map(({ key, label, icon, activeClass }) => (
                                                <button
                                                    key={key}
                                                    onClick={() => { setPriceFilter(key); setCurrentPage(1); }}
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${priceFilter === key
                                                        ? activeClass
                                                        : 'bg-transparent text-gray-700 border-gray-300 hover:border-gray-400 hover:text-gray-900'
                                                        }`}
                                                >
                                                    {icon} {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="text-xs text-gray-500 uppercase border-b border-blue-100">
                                            <tr>
                                                <th className="px-4 py-3 text-center w-10">#</th>
                                                <th className="px-4 py-3 text-left">Sản phẩm</th>
                                                <th className="px-4 py-3 text-right">Giá</th>
                                                <th className="px-4 py-3 text-right">Đã bán</th>
                                                <th className="px-4 py-3 text-right">Doanh thu</th>
                                                <th className="px-4 py-3 text-right">Rating</th>
                                                <th className="px-4 py-3 text-center">Đánh Giá</th>
                                                <th className="px-4 py-3 text-center">Link</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {(() => {
                                                const avgPrice = Number(ov.avg_price || 0);
                                                const budgetMax = avgPrice * 0.7;
                                                const premiumMin = avgPrice * 1.3;

                                                const filteredProducts = d.top_products.filter(p => {
                                                    const price = Number(p.price || 0);
                                                    const matchPrice =
                                                        priceFilter === 'all' ? true :
                                                            priceFilter === 'budget' ? price < budgetMax :
                                                                priceFilter === 'mid' ? price >= budgetMax && price <= premiumMin :
                                                                    priceFilter === 'premium' ? price > premiumMin : true;
                                                    const matchCat =
                                                        categoryFilter === 'all' ? true : p.category === categoryFilter;
                                                    return matchPrice && matchCat;
                                                });

                                                if (filteredProducts.length === 0) {
                                                    return (
                                                        <tr>
                                                            <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                                                                Không có sản phẩm nào trong phân khúc này.
                                                            </td>
                                                        </tr>
                                                    );
                                                }

                                                const itemsPerPage = 10;
                                                const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
                                                const safePage = Math.min(currentPage, totalPages);
                                                const startIndex = (safePage - 1) * itemsPerPage;
                                                const pageProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

                                                /* store for pagination footer – use a ref-like trick via closure */
                                                window.__mrFilteredLen = filteredProducts.length;
                                                window.__mrTotalPages = totalPages;
                                                window.__mrSafePage = safePage;
                                                window.__mrStartIndex = startIndex;

                                                return pageProducts.map((p, idx) => {
                                                    const i = startIndex + idx;
                                                    /* rank badge: only top-3 of the GLOBAL list */
                                                    const globalIdx = d.top_products.indexOf(p);
                                                    const isTop3 = globalIdx < 3;
                                                    return (
                                                        <tr key={i} className={`${isTop3 ? 'bg-blue-50 border-l-2 border-blue-400' : 'hover:bg-blue-50/50'} transition-colors`}>
                                                            <td className="px-4 py-3 text-center">
                                                                {isTop3
                                                                    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">TOP {globalIdx + 1}</span>
                                                                    : <span className="text-gray-500">{i + 1}</span>}
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-900 max-w-[220px] truncate" title={p.name}>
                                                                {isTop3 && <span className="text-blue-500 mr-1">🏆</span>}{p.name}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-gray-500">{p.price.toLocaleString('vi-VN')}đ</td>
                                                            <td className="px-4 py-3 text-right text-green-600 font-medium">{p.sold.toLocaleString('vi-VN')}</td>
                                                            <td className="px-4 py-3 text-right text-blue-500 font-bold">{formatVND(p.revenue)}</td>
                                                            <td className="px-4 py-3 text-right text-yellow-400">{p.rating} ⭐</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button onClick={() => handleOpenReviews(p)} className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-gray-200 hover:bg-blue-200 text-gray-900 transition-colors gap-1">
                                                                    <Icon name="message-square" size={11} /> Đánh giá
                                                                </button>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <a href={p.url || `https://tiki.vn/p/${p.name}`} target="_blank" rel="noopener noreferrer"
                                                                    className="inline-flex items-center px-3 py-1 rounded-lg text-xs bg-blue-700 hover:bg-blue-600 text-white transition-colors">
                                                                    <Icon name="external-link" size={12} className="mr-1" />Xem
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {(() => {
                                    const avgPrice = Number(ov.avg_price || 0);
                                    const budgetMax = avgPrice * 0.7;
                                    const premiumMin = avgPrice * 1.3;
                                    const filtered = d.top_products.filter(p => {
                                        const price = Number(p.price || 0);
                                        const matchPrice =
                                            priceFilter === 'all' ? true :
                                                priceFilter === 'budget' ? price < budgetMax :
                                                    priceFilter === 'mid' ? price >= budgetMax && price <= premiumMin :
                                                        priceFilter === 'premium' ? price > premiumMin : true;
                                        const matchCat =
                                            categoryFilter === 'all' ? true : p.category === categoryFilter;
                                        return matchPrice && matchCat;
                                    });
                                    const totalPages = Math.ceil(filtered.length / 10);
                                    const safePage = Math.min(currentPage, Math.max(totalPages, 1));
                                    const start = (safePage - 1) * 10 + 1;
                                    const end = Math.min(safePage * 10, filtered.length);
                                    if (filtered.length <= 10) return null;
                                    return (
                                        <div className="p-4 border-t border-blue-100 bg-blue-50 flex justify-between items-center">
                                            <span className="text-sm text-gray-500">
                                                Hiển thị {start}–{end} / {filtered.length} sản phẩm
                                                {(priceFilter !== 'all' || categoryFilter !== 'all') && <span className="ml-2 text-xs text-purple-300">(đã lọc)</span>}
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={safePage <= 1}
                                                    className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-gray-900 text-sm font-medium transition-colors"
                                                >
                                                    Trước
                                                </button>
                                                <span className="px-3 py-1.5 text-sm text-gray-700">{safePage} / {totalPages}</span>
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                    disabled={safePage >= totalPages}
                                                    className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-gray-900 text-sm font-medium transition-colors"
                                                >
                                                    Sau
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* AI Report */}
                            <div className="ai-insight-gradient rounded-xl p-6 relative overflow-hidden border border-blue-200 shadow-sm">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl -mr-20 -mt-20"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg text-white shadow-md">
                                            <Icon name="bot" size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">Báo Cáo Phân Tích AI</h3>
                                            <p className="text-xs text-blue-500">Phân tích chuyên sâu từ Gemini AI</p>
                                        </div>
                                    </div>
                                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-blue-100 text-sm leading-relaxed text-gray-800">
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

                {/* FLOATING CHATBOT */}
                <div className="fixed bottom-6 right-6 z-40">
                    <button
                        onClick={() => setIsChatOpen((prev) => !prev)}
                        className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-600 text-white shadow-xl shadow-blue-200/60 flex items-center justify-center border border-cyan-400/40"
                        title="Mở chatbot"
                    >
                        <Icon name={isChatOpen ? 'x' : 'message-circle'} size={24} />
                    </button>
                </div>

                {isChatOpen && (
                    <div className="fixed bottom-24 right-3 left-3 sm:left-auto sm:right-6 sm:w-[390px] z-40">
                        <div className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-2xl">
                            <div className="p-3 border-b border-blue-100 bg-blue-50 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Icon name="bot" size={18} className="text-blue-500" />
                                    <h3 className="font-bold text-gray-900 text-sm">Chatbot hỗ trợ sản phẩm</h3>
                                </div>
                                <button onClick={() => setIsChatOpen(false)} className="text-gray-700 hover:text-gray-900">
                                    <Icon name="x" size={16} />
                                </button>
                            </div>

                            <div className="p-3 border-b border-blue-100 bg-gray-50">
                                <div className="mb-2 text-[11px] text-blue-700">
                                    Đang tư vấn cho: <span className="font-semibold text-blue-700">{marketKeyword || result?.context?.selected_context_label || 'dữ liệu hiện tại'}</span>
                                </div>
                                <p className="text-[11px] text-gray-500 mb-2">Chọn số câu hỏi tư vấn (1-5):</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {advisorQuestions.map((cmd) => (
                                        <button
                                            key={cmd.id}
                                            onClick={() => handleQuickCommand(cmd.id)}
                                            disabled={chatLoading}
                                            className="text-xs text-left px-2.5 py-2 rounded-lg border border-gray-300 text-gray-800 hover:border-blue-500 hover:text-blue-700 bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="text-blue-700 font-semibold mr-1">{cmd.id}.</span> {cmd.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div ref={chatScrollRef} className="h-72 overflow-y-auto p-3 space-y-3 bg-gray-50">
                                {chatMessages.map((m, idx) => (
                                    <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[88%] px-3 py-2 rounded-lg text-xs leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-gray-800 border border-blue-100'
                                            } whitespace-pre-line`}>
                                            {renderChatMessageText(m.text)}
                                        </div>
                                    </div>
                                ))}
                                {chatLoading && <div className="text-xs text-gray-500">Chatbot đang trả lời...</div>}
                            </div>

                            <div className="p-3 border-t border-blue-100 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                    placeholder="Nhập tại đây"
                                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
                                />
                                <button
                                    onClick={handleSendChat}
                                    disabled={chatLoading || !chatInput.trim()}
                                    className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white text-sm font-semibold"
                                >
                                    Gửi
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* REVIEW MODAL */}
            {reviewModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-blue-100">
                        <div className="flex justify-between items-center p-5 border-b border-blue-100/50">
                            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                <Icon name="message-square" className="text-blue-500" /> Đánh giá: <span className="text-gray-700 line-clamp-1 max-w-[300px]" title={reviewModal.product?.name}>{reviewModal.product?.name}</span>
                            </h3>
                            <button onClick={() => setReviewModal({ open: false, product: null, reviews: [], loading: false, error: null })} className="p-2 hover:bg-blue-100 rounded-full transition-colors text-gray-500 hover:text-gray-900">
                                <Icon name="x" size={20} />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1">
                            {reviewModal.loading ? (
                                <div className="flex justify-center items-center py-10">
                                    <Icon name="loader-2" className="animate-spin text-blue-500" size={32} />
                                </div>
                            ) : reviewModal.error ? (
                                <div className="text-red-400 text-center py-5">Lỗi: {reviewModal.error}</div>
                            ) : reviewModal.reviews.length === 0 ? (
                                <div className="text-gray-500 text-center py-10 italic">Không có đánh giá nào cho sản phẩm này.</div>
                            ) : (
                                <div className="space-y-6">
                                    {/* SENTIMENT SUMMARY */}
                                    {(() => {
                                        const total = reviewModal.reviews.length;
                                        let pos = 0, neg = 0, neu = 0;
                                        reviewModal.reviews.forEach(r => {
                                            const s = (r.sentiment || '').toLowerCase();
                                            if (s === 'tích cực' || s === 'positive') pos++;
                                            else if (s === 'tiêu cực' || s === 'negative') neg++;
                                            else neu++;
                                        });
                                        const pPct = total > 0 ? ((pos / total) * 100).toFixed(1) : 0;
                                        const nPct = total > 0 ? ((neg / total) * 100).toFixed(1) : 0;
                                        const uPct = total > 0 ? ((neu / total) * 100).toFixed(1) : 0;
                                        return (
                                            <div className="bg-white rounded-xl p-5 border border-blue-100">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Icon name="message-circle" size={18} className="text-blue-500" />
                                                    <h4 className="font-bold text-gray-900">Sentiment Đánh Giá</h4>
                                                </div>
                                                <p className="text-xs text-gray-500 mb-4">Từ {total} đánh giá (hiển thị tối đa 50)</p>
                                                <div className="space-y-4">
                                                    {[{ label: 'Tích cực', count: pos, pct: pPct, color: 'bg-green-500' },
                                                    { label: 'Trung lập', count: neu, pct: uPct, color: 'bg-yellow-500' },
                                                    { label: 'Tiêu cực', count: neg, pct: nPct, color: 'bg-red-500' }].map((s, i) => (
                                                        <div key={i}>
                                                            <div className="flex justify-between text-sm mb-1.5">
                                                                <span className="flex items-center gap-1.5 text-gray-700">
                                                                    <div className={`w-3 h-3 ${s.color} rounded-sm`}></div> {s.label}
                                                                </span>
                                                                <span className="text-gray-500">{s.count} ({s.pct}%)</span>
                                                            </div>
                                                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                                <div className={`${s.color} h-1.5 rounded-full`} style={{ width: `${s.pct}%` }}></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    {/* REVIEW LIST */}
                                    <div className="space-y-4">
                                        {reviewModal.reviews.map((r, i) => {
                                            const s = (r.sentiment || '').toLowerCase();
                                            const isPos = s === 'tích cực' || s === 'positive';
                                            const isNeg = s === 'tiêu cực' || s === 'negative';
                                            return (
                                                <div key={i} className="bg-white rounded-xl p-4 border border-blue-100">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-1 text-yellow-400">
                                                            {Array.from({ length: 5 }).map((_, j) => (
                                                                <Icon key={j} name="star" size={12} className={j < r.rating ? "fill-yellow-400" : "text-gray-600"} />
                                                            ))}
                                                        </div>
                                                        <span className="text-xs text-gray-500">{r.created_at || ''}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 leading-relaxed">
                                                        {r.content || <span className="italic text-gray-500">Đánh giá không có nội dung văn bản</span>}
                                                    </p>
                                                    {r.sentiment && (
                                                        <div className="mt-3">
                                                            <span className={`text-xs px-2 py-1 rounded-full ${isPos ? 'bg-green-900/30 text-green-600 border border-green-800' : isNeg ? 'bg-red-50 text-red-400 border border-red-800' : 'bg-yellow-900/30 text-yellow-400 border border-yellow-800'}`}>
                                                                {isPos ? 'Tích cực' : isNeg ? 'Tiêu cực' : 'Trung lập'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </ErrorBoundary>
    );
}




