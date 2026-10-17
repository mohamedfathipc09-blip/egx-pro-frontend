'use client';
import React, { useState, useEffect } from 'react';

// ==========================================
// 1. تعريف واجهات البيانات لـ EOD Radar 2.0
// ==========================================
export interface MarketStatusBar {
  session_state: string;
  session_label_ar: string;
  last_available_close_date: string;
  scan_completed_at: string;
  data_source: string;
  data_update_status: string;
  total_scanned: number;
  passed_data_quality_count: number;
  qualified_opportunities_count: number;
  buy_opportunities_count: number;
  watching_opportunities_count: number;
  confirmed_breakouts_count: number;
  support_bounce_count: number;
  excluded_count: number;
}

export interface MarketSummary {
  market_regime: string;
  egx30_trend: string;
  egx70_trend: string;
  advancing_count: number;
  declining_count: number;
  unchanged_count: number;
  advance_decline_ratio: number;
  total_turnover_egp: number;
  general_liquidity_state: string;
  strongest_sectors: { sector: string; avg_change_pct: number; stocks_count: number }[];
  weakest_sectors: { sector: string; avg_change_pct: number; stocks_count: number }[];
}

export interface BacktestSummary {
  trades_count?: number;
  total_trades?: number;
  win_rate_pct?: number;
  win_rate?: number;
  profit_factor?: number;
}

export interface PositionSizing {
  is_valid: boolean;
  recommended_shares: number;
  position_value_egp: number;
  portfolio_allocation_pct?: number;
  max_loss_allowed_egp?: number;
  actual_trade_risk_egp?: number;
}

export interface SmartRecommendation {
  symbol: string;
  name?: string;
  sector: string;
  price?: number;
  daily_change_pct?: number;
  score: number;
  technical_quality_score?: number;
  entry_readiness_score?: number;
  confidence?: string;
  opportunity_category: string;
  signal_type: string; // BUY or WATCHING
  strategy: string;
  entry_zone: string;
  entry_ref?: number;
  stop_loss: number;
  target_1: number;
  target_2?: number;
  risk_reward: number;
  market_regime?: string;
  why: string[];
  invalidation?: string;
  backtest_summary?: BacktestSummary;
  position_sizing?: PositionSizing;
  indicators_table?: { id: number; name: string; type: string; status: string; detail: string }[];
}

export default function StrategiesPage() {
  const RENDER_API_URL = 'https://egx-pro-api.onrender.com/api';

  // States
  const [statusBar, setStatusBar] = useState<MarketStatusBar | null>(null);
  const [marketSummary, setMarketSummary] = useState<MarketSummary | null>(null);
  const [categoriesData, setCategoriesData] = useState<{
    top_qualified: SmartRecommendation[];
    tested_support_bounce: SmartRecommendation[];
    volume_breakout: SmartRecommendation[];
    uptrend_pullback: SmartRecommendation[];
    unusual_liquidity: SmartRecommendation[];
    watching_list: SmartRecommendation[];
    excluded_diagnostics: any[];
    recommendations_history: any[];
  }>({
    top_qualified: [],
    tested_support_bounce: [],
    volume_breakout: [],
    uptrend_pullback: [],
    unusual_liquidity: [],
    watching_list: [],
    excluded_diagnostics: [],
    recommendations_history: []
  });

  const [activeTab, setActiveTab] = useState<string>('top_qualified');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // تتبع الأسهم المضافة للمحفظة
  const [addedSymbols, setAddedSymbols] = useState<string[]>([]);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);

  // نافذة تقرير AI
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSymbol, setAiSymbol] = useState('');
  const [currentAiReport, setCurrentAiReport] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchWatchlistSymbols();
  }, []);

  // جلب الأسهم الموجودة بالفعل في المحفظة
  const fetchWatchlistSymbols = async () => {
    try {
      const res = await fetch(`${RENDER_API_URL}/watchlist`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          setAddedSymbols(list.map((item: any) => item.symbol));
        }
      }
    } catch (err) {
      console.error('Watchlist fetch error:', err);
    }
  };

  // 1️⃣ جلب بيانات لوحة EOD Radar 2.0
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${RENDER_API_URL}/eod-radar/dashboard`);
      const data = await res.json();

      if (res.ok && data) {
        if (data.market_status_bar) setStatusBar(data.market_status_bar);
        if (data.market_summary) setMarketSummary(data.market_summary);

        if (data.categories) {
          setCategoriesData({
            top_qualified: data.categories.top_qualified || data.top_10 || [],
            tested_support_bounce: data.categories.tested_support_bounce || [],
            volume_breakout: data.categories.volume_breakout || [],
            uptrend_pullback: data.categories.uptrend_pullback || [],
            unusual_liquidity: data.categories.unusual_liquidity || [],
            watching_list: data.categories.watching_list || [],
            excluded_diagnostics: data.categories.excluded_diagnostics || [],
            recommendations_history: data.categories.recommendations_history || []
          });
        } else if (data.top_10) {
          setCategoriesData(prev => ({ ...prev, top_qualified: data.top_10 }));
        }
      } else {
        setErrorMsg(data?.message || 'لا توجد بيانات مسح متاحة حالياً.');
      }
    } catch (err) {
      console.error('Dashboard error:', err);
      setErrorMsg('تعذر الاتصال بخادم Render.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2️⃣ بدء مسح نهاية اليوم اليدوي
  const handleManualScan = async () => {
    setIsScanning(true);
    setScanProgress(5);
    try {
      const res = await fetch(`${RENDER_API_URL}/eod-radar/run-scan?background=true`, {
        method: 'POST'
      });
      if (res.ok) {
        const poll = setInterval(async () => {
          try {
            const stRes = await fetch(`${RENDER_API_URL}/eod-radar/scan-status`);
            const stData = await stRes.json();
            if (stData.is_running) {
              setScanProgress(stData.progress_pct || 25);
            } else {
              clearInterval(poll);
              setIsScanning(false);
              setScanProgress(100);
              fetchDashboardData();
            }
          } catch {
            clearInterval(poll);
            setIsScanning(false);
          }
        }, 4000);
      } else {
        setIsScanning(false);
        alert('تعذر بدء المسح السحابي.');
      }
    } catch (err) {
      setIsScanning(false);
      alert('فشل الاتصال بالسيرفر.');
    }
  };

  // 3️⃣ إضافة أي توصية للمحفظة (مفعلة لكل من BUY و WATCHING بدون قيود)
  const addToWatchlist = async (opp: SmartRecommendation) => {
    setAddingSymbol(opp.symbol);
    try {
      let entryPrice = Number(opp.entry_ref || opp.price || 0);
      if (!entryPrice && opp.entry_zone) {
        const parts = String(opp.entry_zone).split('-').map(s => parseFloat(s.trim()));
        entryPrice = parts[1] || parts[0] || 0;
      }
      if (!entryPrice && opp.stop_loss) {
        entryPrice = Number((Number(opp.stop_loss) * 1.05).toFixed(2));
      }

      const payload = {
        symbol: opp.symbol,
        entry_price: entryPrice,
        target: Number(opp.target_1) || Number((entryPrice * 1.08).toFixed(2)),
        stop_loss: Number(opp.stop_loss) || Number((entryPrice * 0.95).toFixed(2))
      };

      const res = await fetch(`${RENDER_API_URL}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (res.ok) {
        setAddedSymbols(prev => (prev.includes(opp.symbol) ? prev : [...prev, opp.symbol]));
        alert(result.message || `✅ تمت إضافة ${opp.symbol} لمحفظة المتابعة بنجاح!`);
      } else {
        alert(`⚠️ تعذر إضافة ${opp.symbol}: ${result.detail || result.message || 'خطأ في السيرفر'}`);
      }
    } catch (err) {
      console.error('Add to watchlist error:', err);
      alert('❌ حدث خطأ أثناء الإضافة للمحفظة.');
    } finally {
      setAddingSymbol(null);
    }
  };

  // 4️⃣ فتح تقرير الذكاء الاصطناعي
  const openAiReport = async (symbol: string) => {
    setAiSymbol(symbol);
    setCurrentAiReport('');
    setIsAiLoading(true);
    setIsAiModalOpen(true);

    try {
      const response = await fetch(`${RENDER_API_URL}/analyze/${symbol}`);
      const data = await response.json();
      const reportText =
        data?.report_text ||
        (typeof data?.summary === 'string' ? data.summary : data?.summary?.report_text || data?.summary?.analysis) ||
        null;

      if (response.ok && reportText) {
        setCurrentAiReport(reportText);
      } else {
        setCurrentAiReport('⚠️ لم يتم العثور على التقرير أو حدث خطأ أثناء التوليد.');
      }
    } catch {
      setCurrentAiReport('❌ فشل الاتصال بخادم الذكاء الاصطناعي.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const tabsList = [
    { id: 'top_qualified', label: '🔥 أفضل الفرص المؤهلة', count: categoriesData.top_qualified.length },
    { id: 'tested_support_bounce', label: '🟢 ارتداد من دعم مختبر', count: categoriesData.tested_support_bounce.length },
    { id: 'volume_breakout', label: '🚀 اختراق مقاومة بسيولة', count: categoriesData.volume_breakout.length },
    { id: 'uptrend_pullback', label: '📈 تصحيح في اتجاه صاعد', count: categoriesData.uptrend_pullback.length },
    { id: 'unusual_liquidity', label: '💧 سيولة غير معتادة', count: categoriesData.unusual_liquidity.length },
    { id: 'watching_list', label: '🟡 قائمة المراقبة', count: categoriesData.watching_list.length }
  ];

  const currentOpportunities: SmartRecommendation[] = (categoriesData as any)[activeTab] || [];

  return (
    <div className="container mx-auto p-4 rtl mb-12 space-y-8" dir="rtl">
      {/* شريط العنوان وأزرار التحكم */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-2">
            <span>🦅</span> رادار نهاية اليوم الكمي (EOD Radar 2.0)
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            {statusBar?.session_label_ar || 'فحص مؤسسي شامل لأسهم البورصة المصرية بعد الإغلاق'}
            {statusBar?.last_available_close_date ? ` • آخر إغلاق: ${statusBar.last_available_close_date}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => { fetchDashboardData(); fetchWatchlistSymbols(); }}
            disabled={isLoading || isScanning}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-sm transition-all disabled:opacity-50"
          >
            🔄 تحديث النتائج
          </button>

          <button
            onClick={handleManualScan}
            disabled={isScanning}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isScanning ? (
              <><span>⏳</span> جاري المسح ({scanProgress}%)...</>
            ) : (
              <><span>⚡</span> إعادة المسح اليدوي</>
            )}
          </button>
        </div>
      </div>

      {/* التبويبات */}
      <div className="flex flex-wrap gap-2">
        {tabsList.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === t.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{t.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === t.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* عرض البطاقات بنفس التصميم الحديث المعروض في موقعك */}
      {isLoading ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="font-bold text-slate-500">جاري تحميل الفرص المؤهلة من السحابة...</p>
        </div>
      ) : currentOpportunities.length === 0 ? (
        <div className="text-center py-16 bg-amber-50 rounded-3xl border border-amber-200">
          <span className="text-4xl block mb-3">🛡️</span>
          <h3 className="text-lg font-bold text-amber-800">{errorMsg || 'لا توجد فرص مطابقة في هذا التبويب حالياً.'}</h3>
        </div>
      ) : (
        <div className="space-y-6">
          {currentOpportunities.map((opp, index) => {
            const isAlreadyAdded = addedSymbols.includes(opp.symbol);
            const isAddingThis = addingSymbol === opp.symbol;
            const techScore = opp.technical_quality_score ?? opp.score ?? 0;
            const readyScore = opp.entry_readiness_score ?? 80;
            const btTrades = opp.backtest_summary?.trades_count ?? opp.backtest_summary?.total_trades ?? 0;
            const btWinRate = opp.backtest_summary?.win_rate_pct ?? opp.backtest_summary?.win_rate ?? 0;
            const btPF = opp.backtest_summary?.profit_factor ?? 0;

            return (
              <div key={opp.symbol} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all">
                {/* الهيدر العلوي للبطاقة */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-sm">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-slate-900">{opp.symbol}</h3>
                        <span className="text-sm font-bold text-slate-500">({opp.name || opp.symbol})</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md">
                          {opp.sector}
                        </span>
                        {opp.price ? (
                          <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md">
                            إغلاق: {Number(opp.price).toFixed(2)} ج.م
                          </span>
                        ) : null}
                        {opp.daily_change_pct !== undefined && (
                          <span className={`text-xs font-black ${Number(opp.daily_change_pct) >= 0 ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                            {Number(opp.daily_change_pct) >= 0 ? `+${opp.daily_change_pct}%` : `${opp.daily_change_pct}%`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* شارات التقييم والحالة */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      جودة فنية: {techScore}/100
                    </span>
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      جاهزية الدخول: {readyScore}/100
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                      opp.signal_type === 'BUY'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {opp.signal_type === 'BUY' ? '🟢 دخول (BUY)' : '🟡 للمراقبة'}
                    </span>
                  </div>
                </div>

                {/* محتوى البطاقة (3 أعمدة) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-5 items-stretch">
                  {/* العمود الأول: خطة الصفقة وإدارة المخاطر */}
                  <div className="md:col-span-4 bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 block mb-2 text-center">خطة الصفقة وإدارة المخاطر</span>
                      <div className="text-center font-black text-indigo-950 text-sm mb-4 pb-2 border-b border-slate-200">
                        الاستراتيجية: {opp.strategy}
                      </div>

                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-bold">منطقة الدخول:</span>
                          <span className="font-black text-slate-800" dir="ltr">{opp.entry_zone}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-red-600 font-bold">وقف الخسارة:</span>
                          <span className="font-black text-red-600" dir="ltr">{Number(opp.stop_loss).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-600 font-bold">الهدف الأول (TP1):</span>
                          <span className="font-black text-emerald-700" dir="ltr">{Number(opp.target_1).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                          <span className="text-indigo-700 font-bold">العائد/المخاطرة (R:R):</span>
                          <span className="font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200" dir="ltr">
                            1 : {Number(opp.risk_reward).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* العمود الثاني: أسباب الإشارة الفنية + نتائج الاختبار التاريخي */}
                  <div className="md:col-span-5 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="text-sm font-black text-emerald-700 mb-2">أسباب الإشارة الفنية</h4>
                      <ul className="space-y-1.5">
                        {(opp.why || []).map((r, i) => (
                          <li key={i} className="text-xs text-slate-700 font-medium flex items-start gap-1.5 leading-relaxed">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
                      <div className="text-xs font-black text-indigo-900 mb-2 flex items-center gap-1">
                        <span>🧪</span> نتائج الاختبار التاريخي (Backtest):
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <span className="text-slate-400 block">عدد الصفقات:</span>
                          <span className="font-black text-slate-800">{btTrades}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">معدل الفوز:</span>
                          <span className="font-black text-emerald-600">%{btWinRate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Profit Factor:</span>
                          <span className="font-black text-slate-800">{btPF}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* العمود الثالث: مقترح حاسبة المخاطر + أزرار الإجراءات المفعلة */}
                  <div className="md:col-span-3 flex flex-col justify-between space-y-4">
                    <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-inner">
                      <div className="text-xs font-bold text-amber-400 mb-3 flex items-center gap-1">
                        <span>💰</span> مقترح حاسبة المخاطر (2% رأس المال):
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">الكمية المقترحة:</span>
                          <span className="font-black text-emerald-400">
                            {opp.position_sizing?.recommended_shares ?? 0} سهم
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">إجمالي المبلغ:</span>
                          <span className="font-black text-white">
                            {(opp.position_sizing?.position_value_egp ?? 0).toLocaleString()} ج.م
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ✅ الأزرار مفعلة بالكامل لجميع الأسهم بدون شرط تعطيل WATCHING */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => openAiReport(opp.symbol)}
                        className="py-3 px-3 font-bold rounded-xl text-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex justify-center items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <span>🤖</span> تقرير AI
                      </button>

                      <button
                        onClick={() => addToWatchlist(opp)}
                        disabled={isAddingThis || isAlreadyAdded}
                        className={`py-3 px-3 font-bold rounded-xl text-sm shadow-md flex justify-center items-center gap-1.5 transition-all cursor-pointer ${
                          isAlreadyAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 hover:bg-indigo-600 text-white'
                        }`}
                      >
                        {isAddingThis ? (
                          <><span>⏳</span> جاري...</>
                        ) : isAlreadyAdded ? (
                          <><span>✅</span> بالمحفظة</>
                        ) : (
                          <><span>➕</span> للمحفظة</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة تقرير الذكاء الاصطناعي */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl relative rtl border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-black text-indigo-900 flex items-center gap-2">
                <span>🤖</span> التقرير الفني الذكي ({aiSymbol})
              </h2>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-red-500 p-2 rounded-full"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {isAiLoading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-3"></div>
                  <p className="font-bold text-slate-600">جاري توليد التقرير الفني...</p>
                </div>
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed text-slate-700 font-medium text-sm">
                  {currentAiReport}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}