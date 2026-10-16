'use client';
import React, { useState, useEffect } from 'react';
import RiskDashboard from '@/components/Risk/RiskDashboard';

// ==========================================
// 1. واجهات البيانات المحدثة لـ EOD Radar 2.0
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

export interface PositionSizing {
  recommended_shares: number;
  position_value_egp: number;
  portfolio_allocation_pct: number;
  max_loss_allowed_egp: number;
  actual_trade_risk_egp: number;
  actual_trade_risk_pct: number;
  estimated_commission_and_slippage_egp: number;
}

export interface BacktestSummary {
  trades_count: number;
  win_rate: number;
  expectancy_r: number;
  profit_factor: number;
  max_drawdown_pct: number;
  oos_win_rate: number;
  sample_warning?: string;
}

export interface SmartRecommendation {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  daily_change_pct: number;
  last_bar_date: string;
  market_regime: string;
  opportunity_category: string;
  strategy: string;
  signal_type: string; // BUY or WATCHING
  score: number;
  technical_quality_score: number;
  entry_readiness_score: number;
  confluence_score: number;
  confidence: string;
  entry_zone: string;
  entry_ref: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  target_3?: number;
  risk_reward: number;
  expected_holding_days: string;
  invalidation: string;
  relevant_support?: { low: number; high: number; mid: number; strength_score: number; reason_ar: string };
  next_resistance?: { low: number; high: number; mid: number };
  rvol: number;
  why: string[];
  backtest_summary?: BacktestSummary;
  position_sizing?: PositionSizing;
  indicators_table?: { id: number; name: string; type: string; status: string; detail: string }[];
}

export default function StrategiesPage() {
const RENDER_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000/api';
  // States
  const [statusBar, setStatusBar] = useState<MarketStatusBar | null>(null);
  const [marketSummary, setMarketSummary] = useState<MarketSummary | null>(null);
  
  // الفئات الـ 7
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
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Modal AI
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSymbol, setAiSymbol] = useState("");
  const [currentAiReport, setCurrentAiReport] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    fetchEodDashboard();
  }, []);

  const fetchEodDashboard = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${RENDER_API_URL}/eod-radar/dashboard`);
      const result = await res.json();
      if (res.ok && result.status !== 'empty') {
        setStatusBar(result.market_status_bar);
        setMarketSummary(result.market_summary);
        if (result.categories) {
          setCategoriesData(result.categories);
        }
      } else {
        setErrorMessage(result.message || "لا توجد بيانات مسح محفوظة.");
      }
    } catch (err) {
      console.error("خطأ في جلب لوحة EOD Radar:", err);
      setErrorMessage("فشل الاتصال بخادم السحابة.");
    }
    setIsLoading(false);
  };

  const handleTriggerScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch(`${RENDER_API_URL}/eod-radar/run-scan?background=true`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "بدأ فحص نهاية اليوم في الخلفية.");
        // متابعة حالة التقدم بعد بضع ثوانٍ
        setTimeout(() => {
          fetchEodDashboard();
          setIsScanning(false);
        }, 12000);
      } else {
        alert("خطأ: " + (data.message || "فشل بدء الفحص"));
        setIsScanning(false);
      }
    } catch (e) {
      alert("خطأ في الاتصال بالخادم.");
      setIsScanning(false);
    }
  };

  const addToWatchlist = async (opp: SmartRecommendation) => {
    try {
      const payload = {
        symbol: opp.symbol,
        entry_price: opp.entry_ref || opp.price,
        target: opp.target_1,
        stop_loss: opp.stop_loss
      };
      const res = await fetch(`${RENDER_API_URL}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      alert(data.message || `✅ تم إضافة ${opp.symbol} لمحفظة المتابعة.`);
    } catch (err) {
      alert("❌ حدث خطأ أثناء الإضافة.");
    }
  };

  const openAiReport = async (symbol: string) => {
    setAiSymbol(symbol);
    setCurrentAiReport("");
    setIsAiLoading(true);
    setIsAiModalOpen(true);
    try {
      const res = await fetch(`${RENDER_API_URL}/analyze/${symbol}`);
      const data = await res.json();
      if (res.ok && data.summary) {
        setCurrentAiReport(typeof data.summary === 'string' ? data.summary : JSON.stringify(data.summary, null, 2));
      } else {
        setCurrentAiReport("⚠️ لم يتم العثور على التقرير الفني.");
      }
    } catch (error) {
      setCurrentAiReport("❌ فشل الاتصال بخدمة التحليل الذكي.");
    }
    setIsAiLoading(false);
  };

  // التبويبات الـ 7
  const tabsConfig = [
    { key: 'top_qualified', label: '🔥 أفضل الفرص المؤهلة', count: categoriesData.top_qualified.length },
    { key: 'tested_support_bounce', label: '📉 ارتداد من دعم مختبر', count: categoriesData.tested_support_bounce.length },
    { key: 'volume_breakout', label: '🚀 اختراق مقاومة بسيولة', count: categoriesData.volume_breakout.length },
    { key: 'uptrend_pullback', label: '📈 تصحيح في اتجاه صاعد', count: categoriesData.uptrend_pullback.length },
    { key: 'unusual_liquidity', label: '⚡ تدفق سيولة غير اعتيادي', count: categoriesData.unusual_liquidity.length },
    { key: 'watching_list', label: '🟡 فرص المراقبة', count: categoriesData.watching_list.length },
    { key: 'history_log', label: '📋 سجل التوصيات السابقة', count: categoriesData.recommendations_history.length },
    { key: 'diagnostics', label: '🛡️ تشخيص الأسهم المستبعدة', count: categoriesData.excluded_diagnostics.length },
  ];

  const getActiveTabOpportunities = () => {
    switch (activeTab) {
      case 'top_qualified': return categoriesData.top_qualified;
      case 'tested_support_bounce': return categoriesData.tested_support_bounce;
      case 'volume_breakout': return categoriesData.volume_breakout;
      case 'uptrend_pullback': return categoriesData.uptrend_pullback;
      case 'unusual_liquidity': return categoriesData.unusual_liquidity;
      case 'watching_list': return categoriesData.watching_list;
      default: return [];
    }
  };

  return (
    <div className="container mx-auto p-4 rtl mb-16 space-y-8">
      
      {/* العنوان الرئيسي */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <span className="bg-indigo-50 text-indigo-700 p-2 rounded-2xl shadow-inner">🦅</span> 
            التوصيات واستراتيجيات التداول (EOD Radar 2.0)
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            محرك تداول كمي مؤسسي لنهاية اليوم مع فحص دقيق للسيولة والدعوم والمقاومات واختبارات خارج العينة.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEodDashboard}
            disabled={isLoading}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all text-sm"
          >
            🔄 تحديث العرض
          </button>
          <button
            onClick={handleTriggerScan}
            disabled={isScanning}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isScanning ? <span className="animate-spin">⏳</span> : <span>⚡</span>}
            {isScanning ? "المسح يعمل في الخلفية..." : "إعادة المسح اليدوي"}
          </button>
        </div>
      </div>

      <RiskDashboard />

      {/* ========================================== */}
      {/* A. شريط حالة السوق (Market Status Bar) */}
      {/* ========================================== */}
      {statusBar && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-indigo-900/50">
          <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-emerald-300 text-sm">{statusBar.session_label_ar}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300 text-sm">آخر إغلاق: <strong className="text-white">{statusBar.last_available_close_date}</strong></span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              المصدر: {statusBar.data_source} | تم المسح في: {statusBar.scan_completed_at}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 pt-4 text-center">
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              <span className="block text-[10px] text-slate-400 uppercase font-bold">الأسهم المفحوصة</span>
              <span className="text-xl font-black text-white">{statusBar.total_scanned}</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              <span className="block text-[10px] text-slate-400 uppercase font-bold">مطابقة للجودة</span>
              <span className="text-xl font-black text-blue-400">{statusBar.passed_data_quality_count}</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              <span className="block text-[10px] text-slate-400 uppercase font-bold">الفرص المؤهلة</span>
              <span className="text-xl font-black text-emerald-400">{statusBar.qualified_opportunities_count}</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              <span className="block text-[10px] text-slate-400 uppercase font-bold">فرص الشراء (BUY)</span>
              <span className="text-xl font-black text-green-400">{statusBar.buy_opportunities_count}</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              <span className="block text-[10px] text-slate-400 uppercase font-bold">فرص المراقبة</span>
              <span className="text-xl font-black text-amber-400">{statusBar.watching_opportunities_count}</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              <span className="block text-[10px] text-slate-400 uppercase font-bold">اختراقات مؤكدة</span>
              <span className="text-xl font-black text-purple-400">{statusBar.confirmed_breakouts_count}</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              <span className="block text-[10px] text-slate-400 uppercase font-bold">ارتداد دعم</span>
              <span className="text-xl font-black text-cyan-400">{statusBar.support_bounce_count}</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              <span className="block text-[10px] text-slate-400 uppercase font-bold">الأسهم المستبعدة</span>
              <span className="text-xl font-black text-rose-400">{statusBar.excluded_count}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* B. ملخص السوق (Market Summary) */}
      {/* ========================================== */}
      {marketSummary && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">حالة السوق واتجاه المؤشرات</h3>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-xl text-xs font-black ${marketSummary.market_regime === 'BULLISH' ? 'bg-green-100 text-green-800' : marketSummary.market_regime === 'BEARISH' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'}`}>
                {marketSummary.market_regime}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-700">EGX30: {marketSummary.egx30_trend}</p>
            <p className="text-xs font-bold text-slate-700">EGX70: {marketSummary.egx70_trend}</p>
          </div>

          <div className="space-y-3 border-t md:border-t-0 md:border-x border-slate-100 md:px-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">سلوك السيولة واتساع السوق</h3>
            <div className="flex justify-between text-xs font-bold">
              <span className="text-green-600">صاعد: {marketSummary.advancing_count}</span>
              <span className="text-red-600">هابط: {marketSummary.declining_count}</span>
              <span className="text-slate-500">ثابت: {marketSummary.unchanged_count}</span>
            </div>
            <p className="text-xs font-bold text-slate-700">إجمالي التداول: <span className="font-mono text-indigo-700">{Number(marketSummary.total_turnover_egp).toLocaleString()} ج.م</span></p>
            <p className="text-xs font-bold text-slate-700">حالة السيولة العامة: <span className="text-blue-600">{marketSummary.general_liquidity_state}</span></p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">أداء القطاعات الرئيسية</h3>
            <div className="space-y-1">
              <div className="text-xs font-bold text-green-700">🟢 الأقوى: {marketSummary.strongest_sectors[0]?.sector || '---'} ({marketSummary.strongest_sectors[0]?.avg_change_pct || 0}%)</div>
              <div className="text-xs font-bold text-red-600">🔴 الأضعف: {marketSummary.weakest_sectors[0]?.sector || '---'} ({marketSummary.weakest_sectors[0]?.avg_change_pct || 0}%)</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* C. تبويبات فئات الفرص (Tabs) */}
      {/* ========================================== */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
          {tabsConfig.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === tab.key ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* عرض المحتوى حسب التبويب النشط */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <span className="font-bold text-slate-500">⏳ جاري تحميل نتائج EOD Radar 2.0...</span>
          </div>
        ) : errorMessage ? (
          <div className="text-center py-16 bg-amber-50 rounded-2xl border border-amber-200">
            <span className="text-4xl block mb-2">ℹ️</span>
            <p className="font-bold text-amber-800">{errorMessage}</p>
          </div>
        ) : activeTab === 'history_log' ? (
          /* سجل التوصيات السابقة */
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-800 mb-4">📋 سجل التوصيات التاريخية وإحصائيات الأداء</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-black border-b border-slate-200">
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">السهم</th>
                    <th className="p-3">الاستراتيجية</th>
                    <th className="p-3">الدخول</th>
                    <th className="p-3">الوقف</th>
                    <th className="p-3">الهدف 1</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">النتيجة والسبب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {categoriesData.recommendations_history.map((rec: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono text-xs text-slate-500">{rec.signal_date}</td>
                      <td className="p-3 font-black text-slate-800">{rec.symbol}</td>
                      <td className="p-3 text-slate-600 text-xs">{rec.strategy}</td>
                      <td className="p-3 font-mono" dir="ltr">{rec.entry_zone}</td>
                      <td className="p-3 font-mono text-red-600" dir="ltr">{rec.stop_loss}</td>
                      <td className="p-3 font-mono text-green-600" dir="ltr">{rec.target_1}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${rec.state === 'TP1_HIT' ? 'bg-green-100 text-green-800' : rec.state === 'STOP_HIT' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {rec.state}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-600 font-medium">{rec.outcome_reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'diagnostics' ? (
          /* الأسهم المستبعدة مع الأسباب */
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-800 mb-4">🛡️ سجل تشخيص استبعاد الأسهم (Data Quality Diagnostics)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoriesData.excluded_diagnostics.map((ex: any, idx: number) => (
                <div key={idx} className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-black text-rose-900 text-base">{ex.symbol} <span className="text-xs font-normal text-rose-600">({ex.name})</span></h4>
                    <p className="text-xs text-rose-700 font-medium mt-1">السبب: {ex.reason}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-rose-200 text-rose-800 px-2.5 py-1 rounded-md">{ex.status}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* عرض الفرص الفئوية (Top Qualified / Support Bounce / Breakout / Pullback / Liquidity / Watching) */
          <div className="grid grid-cols-1 gap-6">
            {getActiveTabOpportunities().length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-4xl block mb-2">📭</span>
                <p className="font-bold text-slate-500">لا توجد فرص مطابقة لهذا التصنيف في الفحص الأخير.</p>
              </div>
            ) : (
              getActiveTabOpportunities().map((opp, index) => (
                <div key={opp.symbol} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                  
                  <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-600 text-white flex items-center justify-center font-black text-xl rounded-xl shadow-inner">
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                          {opp.symbol} <span className="text-xs font-bold text-slate-500">({opp.name})</span>
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">{opp.sector}</span>
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">إغلاق: {opp.price} ج.م</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${opp.daily_change_pct >= 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                            {opp.daily_change_pct >= 0 ? '+' : ''}{opp.daily_change_pct}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-xs font-black">
                        جودة فنية: {opp.technical_quality_score}/100
                      </span>
                      <span className="px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-xl text-xs font-black">
                        جاهزية الدخول: {opp.entry_readiness_score}/100
                      </span>
                      <span className={`px-3 py-1 rounded-xl text-xs font-black border ${opp.signal_type === 'BUY' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                        {opp.signal_type === 'BUY' ? '🟢 شراء مؤكد' : '🟡 للمراقبة'}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* خطة التداول المستهدفة */}
                    <div className="space-y-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">خطة الصفقة وإدارة المخاطر</h4>
                      <div className="flex justify-between text-sm py-1 border-b border-slate-200">
                        <span className="text-slate-500 font-bold">الاستراتيجية:</span>
                        <span className="font-black text-indigo-900">{opp.strategy}</span>
                      </div>
                      <div className="flex justify-between text-sm py-1 border-b border-slate-200">
                        <span className="text-slate-500 font-bold">منطقة الدخول:</span>
                        <span className="font-black text-slate-800 font-mono" dir="ltr">{opp.entry_zone}</span>
                      </div>
                      <div className="flex justify-between text-sm py-1 border-b border-slate-200">
                        <span className="text-red-600 font-bold">وقف الخسارة:</span>
                        <span className="font-black text-red-600 font-mono" dir="ltr">{opp.stop_loss}</span>
                      </div>
                      <div className="flex justify-between text-sm py-1 border-b border-slate-200">
                        <span className="text-green-600 font-bold">الهدف الأول (TP1):</span>
                        <span className="font-black text-green-700 font-mono" dir="ltr">{opp.target_1}</span>
                      </div>
                      <div className="flex justify-between text-sm py-1">
                        <span className="text-indigo-600 font-bold">العائد/المخاطرة (R:R):</span>
                        <span className="font-black text-indigo-700 font-mono bg-indigo-100 px-2 py-0.5 rounded" dir="ltr">1 : {opp.risk_reward}</span>
                      </div>
                    </div>

                    {/* أسباب الإشارة ونتيجة الباك تيست */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-green-700 uppercase tracking-wider mb-2">أسباب الإشارة الفنية</h4>
                        <ul className="space-y-1.5">
                          {opp.why.map((w, i) => (
                            <li key={i} className="text-xs text-slate-700 font-medium flex items-start gap-1.5">
                              <span className="text-green-500 font-bold">✓</span> {w}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {opp.backtest_summary && (
                        <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 text-xs space-y-1">
                          <span className="font-black text-indigo-900 block mb-1">🧪 نتائج الاختبار التاريخي (Backtest):</span>
                          <div className="flex justify-between text-slate-700 font-medium">
                            <span>عدد الصفقات: <strong>{opp.backtest_summary.trades_count}</strong></span>
                            <span>معدل الفوز: <strong className="text-green-700">{opp.backtest_summary.win_rate}%</strong></span>
                            <span>Profit Factor: <strong>{opp.backtest_summary.profit_factor}</strong></span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* حاسبة رأس المال وأزرار التفاعل */}
                    <div className="space-y-4 flex flex-col justify-between">
                      {opp.position_sizing && (
                        <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 text-xs">
                          <span className="font-black text-indigo-300 block">💰 مقترح حاسبة المخاطر (2% رأس المال):</span>
                          <div className="flex justify-between">
                            <span className="text-slate-400">الكمية المقترحة:</span>
                            <strong className="text-emerald-400">{opp.position_sizing.recommended_shares} سهم</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">إجمالي المبلغ:</span>
                            <strong>{Number(opp.position_sizing.position_value_egp).toLocaleString()} ج.م</strong>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => openAiReport(opp.symbol)}
                          className="py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold rounded-xl text-sm shadow-sm flex justify-center items-center gap-1.5"
                        >
                          <span>🤖</span> تقرير AI
                        </button>
                        <button
                          onClick={() => addToWatchlist(opp)}
                          disabled={opp.signal_type !== 'BUY'}
                          className={`py-3 font-bold rounded-xl text-sm shadow-md flex justify-center items-center gap-1.5
                            ${opp.signal_type === 'BUY' ? 'bg-slate-900 hover:bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                        >
                          <span>➕</span> للمحفظة
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* مودال تقرير الذكاء الاصطناعي */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl relative border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-2xl font-black text-indigo-900 flex items-center gap-2">
                <span>🤖</span> التحليل الذكي للسهم <span className="text-blue-600">({aiSymbol})</span>
              </h2>
              <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-red-500 p-2 rounded-full">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 text-slate-700 font-medium text-sm leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
              {isAiLoading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600 mx-auto mb-3"></div>
                  <p className="font-bold text-slate-600">جاري قراءة مؤشرات السهم وتوليد التقرير المؤسسي...</p>
                </div>
              ) : (
                currentAiReport
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}