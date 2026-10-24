'use client';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import StockChart from '@/components/StockChart';

const TIMEFRAMES = [
  { id: '15m', label: '15 دقيقة' },
  { id: '1h', label: 'ساعة' },
  { id: '1d', label: 'يومي' },
  { id: '1wk', label: 'أسبوعي' },
  { id: '1mo', label: 'شهري' }
];

const QUICK_EGX_SYMBOLS = ['COMI', 'SWDY', 'TMGH', 'ETEL', 'ABUK', 'MFPC', 'FWRY', 'HRHO', 'ALCN', 'ORAS'];

function formatMetric(val: any, suffix = '', fallback = 'غير متاح'): string {
  if (val === null || val === undefined || val === '' || Number.isNaN(Number(val))) {
    return fallback;
  }
  return `${val}${suffix}`;
}

function AnalysisContent() {
  const [symbol, setSymbol] = useState('');
  const [interval, setInterval] = useState('1d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  const [backtestData, setBacktestData] = useState<any>(null);
  const [loadingBacktest, setLoadingBacktest] = useState(false);

  // المفضلة ومحفظة المتابعة
  const [favorites, setFavorites] = useState<string[]>([]);
  const [watchlistStatus, setWatchlistStatus] = useState<string>('');
  const [addingWatchlist, setAddingWatchlist] = useState(false);

  // التحكم في طي/فتح أقسام التقرير الفني الاحترافي وأدوات النسخ والطباعة
  const [expandedReportSections, setExpandedReportSections] = useState<Record<string, boolean>>({
    trend: true,
    momentum: true,
    liquidity: true,
    sr: true,
    fib: true,
    scenarios: true,
    plan: true,
    evidence: true,
    conclusion: true
  });
  const [copySuccess, setCopySuccess] = useState(false);

  // التحكم في القسم التعليمي القابل للطي
  const [isEduOpen, setIsEduOpen] = useState(false);
  const [eduLevel, setEduLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);

  // تخزين مؤقت آمن لمنع إعادة الطلبات المكررة غير الضرورية
  const analysisCacheRef = useRef<Record<string, { timestamp: number; payload: any }>>({});

  const searchParams = useSearchParams();
  const urlSymbol = searchParams.get('symbol');

  const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '');
    }
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    return isLocal ? 'http://localhost:10000' : 'https://egx-pro-api.onrender.com';
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('egx_pro_favorites');
        if (saved) setFavorites(JSON.parse(saved));
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  const analyzeStock = async (
    overrideSymbol?: string,
    overrideInterval?: string,
    forceRefresh: boolean = false
  ) => {
    const targetSymbol = (overrideSymbol || symbol).trim().toUpperCase().replace('.CA', '');
    const targetInterval = overrideInterval || interval;

    if (!targetSymbol) {
      setError('يرجى إدخال كود السهم أولاً (مثال: COMI أو SWDY)');
      return;
    }

    const cacheKey = `${targetSymbol}_${targetInterval}`;
    const now = Date.now();
    if (
      !forceRefresh &&
      analysisCacheRef.current[cacheKey] &&
      now - analysisCacheRef.current[cacheKey].timestamp < 90_000
    ) {
      const cachedPayload = analysisCacheRef.current[cacheKey].payload;
      setData(cachedPayload);
      setError('');
      const summaryObj = cachedPayload.summary;
      if (summaryObj?.backtest_summary && summaryObj.backtest_summary.trades_count !== undefined) {
        setBacktestData({
          status: 'success',
          ...summaryObj.backtest_summary,
          metrics: summaryObj.backtest_summary.metrics || summaryObj.backtest_summary
        });
      }
      return;
    }

    setLoading(true);
    setError('');
    setWatchlistStatus('');

    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/analyze/${targetSymbol}?interval=${targetInterval}`);
      if (!res.ok) {
        throw new Error(
          `تعذر جلب بيانات السهم (${targetSymbol}) على الإطار المختار. تأكد من صحة الكود في البورصة المصرية.`
        );
      }
      const result = await res.json();
      const summaryObj = result?.summary || result;

      if (!summaryObj || (!summaryObj.current_price && !summaryObj.report_text)) {
        throw new Error('لا توجد بيانات تاريخية كافية لتحليل هذا السهم على هذا الإطار الزمني حالياً.');
      }

      const finalData = {
        symbol: result?.symbol || targetSymbol,
        interval: targetInterval,
        summary: summaryObj
      };

      analysisCacheRef.current[cacheKey] = {
        timestamp: Date.now(),
        payload: finalData
      };

      setData(finalData);

      if (summaryObj.backtest_summary && summaryObj.backtest_summary.trades_count !== undefined) {
        setBacktestData({
          status: 'success',
          ...summaryObj.backtest_summary,
          metrics: summaryObj.backtest_summary.metrics || summaryObj.backtest_summary
        });
      } else {
        fetchBacktest(targetSymbol, baseUrl);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع أثناء الاتصال بمحرك التحليل.');
      setData(null);
      setBacktestData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchBacktest = async (targetSymbol: string, baseUrl: string) => {
    setLoadingBacktest(true);
    try {
      const res = await fetch(`${baseUrl}/api/backtest/${targetSymbol}`);
      if (res.ok) {
        const result = await res.json();
        setBacktestData(result);
      }
    } catch (err) {
      console.error('خطأ في جلب بيانات الاختبار التاريخي:', err);
    } finally {
      setLoadingBacktest(false);
    }
  };

  useEffect(() => {
    if (urlSymbol) {
      const clean = urlSymbol.replace('.CA', '').trim().toUpperCase();
      setSymbol(clean);
      analyzeStock(clean, interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSymbol]);

  const handleToggleFavoriteAndWatchlist = async () => {
    const activeSym = (data?.summary?.symbol || data?.symbol || symbol).replace('.CA', '').trim().toUpperCase();
    if (!activeSym) return;

    const updatedFavs = favorites.includes(activeSym)
      ? favorites.filter((s) => s !== activeSym)
      : [activeSym, ...favorites].slice(0, 12);

    setFavorites(updatedFavs);
    if (typeof window !== 'undefined') {
      localStorage.setItem('egx_pro_favorites', JSON.stringify(updatedFavs));
    }

    if (data?.summary?.current_price) {
      setAddingWatchlist(true);
      setWatchlistStatus('');
      try {
        const baseUrl = getBaseUrl();
        const cPrice = Number(data.summary.current_price);
        const setup = data.summary.trade_setup || {};
        const entryPrice = Number(setup.entry || cPrice);
        const targetPrice = Number(setup.tp1 || data.summary.nearest_resistance || (cPrice * 1.08).toFixed(2));
        const stopPrice = Number(setup.stop || data.summary.nearest_support || (cPrice * 0.95).toFixed(2));

        const res = await fetch(`${baseUrl}/api/watchlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: activeSym,
            entry_price: entryPrice,
            target: targetPrice,
            stop_loss: stopPrice
          })
        });
        const resJson = await res.json();
        setWatchlistStatus(resJson.message || `تم حفظ ${activeSym} في المفضلة ومحفظة المتابعة.`);
      } catch {
        setWatchlistStatus(`تم حفظ ${activeSym} في قائمة المفضلة السريعة.`);
      } finally {
        setAddingWatchlist(false);
      }
    }
  };

  const toggleReportSection = (key: string) => {
    setExpandedReportSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllReportSections = (open: boolean) => {
    setExpandedReportSections({
      trend: open,
      momentum: open,
      liquidity: open,
      sr: open,
      fib: open,
      scenarios: open,
      plan: open,
      evidence: open,
      conclusion: open
    });
  };

  const handleCopyReport = async () => {
    const textToCopy = data?.summary?.report_text;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch {
      // fallback
    }
  };

  const handlePrintReport = () => {
    setAllReportSections(true);
    setTimeout(() => {
      if (typeof window !== 'undefined') window.print();
    }, 150);
  };

  const summary = data?.summary;
  const kpis = summary?.summary_kpis || {};
  const scores = summary?.scores || {
    composite_score: summary?.score ?? 0,
    technical_quality_score: summary?.technical_quality_score ?? summary?.score ?? 0,
    entry_readiness_score: summary?.entry_readiness_score ?? 0,
    backtest_quality_score: summary?.backtest_quality_score ?? 0,
    data_quality_score: summary?.data_quality_score ?? summary?.data_quality?.quality_score ?? 0
  };
  const decision = summary?.decision;
  const structure = summary?.market_structure;
  const htf = summary?.higher_timeframe_context;
  const fib = summary?.fibonacci;
  const sZones = summary?.support_zones || [];
  const rZones = summary?.resistance_zones || [];
  const tradeSetup = summary?.trade_setup;
  const eduPanel = summary?.educational_panel;
  const indAnalysis = summary?.indicators_analysis;
  const profReport = summary?.professional_report;
  const btMetrics = backtestData?.metrics || summary?.backtest_summary || {};

  const unifiedPrice = kpis.current_price ?? summary?.current_price;
  const unifiedChange = kpis.daily_change ?? summary?.daily_change;
  const unifiedChangePct = kpis.daily_change_pct ?? summary?.daily_change_pct;
  const unifiedRsi = kpis.rsi_14 ?? indAnalysis?.momentum?.rsi_14;
  const unifiedMacd = kpis.macd_line ?? indAnalysis?.momentum?.macd_line;
  const unifiedMacdHist = kpis.macd_histogram ?? indAnalysis?.momentum?.macd_histogram;
  const unifiedAtr = kpis.atr_14 ?? indAnalysis?.volatility?.atr_14;
  const unifiedRvol = kpis.rvol ?? indAnalysis?.liquidity?.rvol;
  const unifiedSupport = kpis.nearest_support ?? (sZones[0]?.low ?? summary?.nearest_support);
  const unifiedResistance = kpis.nearest_resistance ?? (rZones[0]?.high ?? summary?.nearest_resistance);

  const getDecisionStyle = (code: string) => {
    const upper = (code || '').toUpperCase();
    if (upper === 'BUY' || upper.includes('BUY CONFIRMED')) {
      return {
        bg: 'bg-emerald-950 border-emerald-600 text-white',
        badge: 'bg-emerald-500 text-slate-950',
        icon: '🟢 BUY — إشارة دخول مستوفية للشروط'
      };
    }
    if (upper === 'WAIT' || upper.includes('BUY WATCH')) {
      return {
        bg: 'bg-amber-950 border-amber-500 text-white',
        badge: 'bg-amber-400 text-slate-950',
        icon: '⏳ WAIT — انتظار تحقق شرط التأكيد'
      };
    }
    if (upper === 'WATCH') {
      return {
        bg: 'bg-slate-900 border-indigo-500 text-white',
        badge: 'bg-indigo-400 text-slate-950',
        icon: '👁️ WATCH — مراقبة دون إشارة مكتملة'
      };
    }
    if (upper === 'EXIT' || upper.includes('SELL')) {
      return {
        bg: 'bg-rose-950 border-rose-500 text-white',
        badge: 'bg-rose-400 text-slate-950',
        icon: '🚪 EXIT — إشارة خروج لحاملي السهم وفق قاعدة معرّفة'
      };
    }
    return {
      bg: 'bg-slate-900 border-slate-700 text-white',
      badge: 'bg-slate-300 text-slate-950',
      icon: '🛑 AVOID — تجنب فتح صفقة جديدة'
    };
  };

  const getScoreBadgeClass = (val: number) => {
    if (val >= 70) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (val >= 55) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const renderReport = (text: string) => {
    if (!text) return null;
    const cleanText = text.replace(/### /g, '\n### ').replace(/## /g, '\n## ').replace(/- \*\*/g, '\n- **');

    return cleanText.split('\n').map((line, idx) => {
      const t = line.trim();
      if (!t) return null;

      if (t.includes('⚠️') && (t.includes('تنبيه') || t.includes('حجب') || t.includes('بيانات غير كافية'))) {
        return (
          <div key={idx} className="bg-amber-50 border-r-4 border-amber-500 p-4 rounded-xl my-4 shadow-sm">
            <p className="text-amber-900 font-bold text-base leading-relaxed">{t}</p>
          </div>
        );
      }

      if (t.startsWith('# ')) {
        return (
          <h2 key={idx} className="text-xl md:text-2xl font-black text-slate-900 mb-5 bg-slate-100 p-4 rounded-xl border-r-4 border-indigo-600">
            {t.replace('# ', '')}
          </h2>
        );
      }

      if (t.startsWith('## ') || t.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-lg md:text-xl font-black text-indigo-950 mt-6 mb-3 border-b border-slate-200 pb-2 flex items-center gap-2">
            <span className="text-indigo-600">◈</span> {t.replace(/^###?\s+/, '')}
          </h3>
        );
      }

      if (t.startsWith('- ')) {
        return (
          <li key={idx} className="mr-4 mb-2 text-slate-700 flex items-start gap-2 list-none">
            <span className="text-indigo-500 mt-1 font-bold">•</span>
            <span className="text-sm md:text-base leading-relaxed">{t.replace('- ', '')}</span>
          </li>
        );
      }

      return (
        <p key={idx} className="text-slate-700 leading-relaxed mb-3 font-medium text-sm md:text-base">
          {t}
        </p>
      );
    });
  };

  const activeSymClean = (summary?.symbol || data?.symbol || symbol || '').replace('.CA', '').trim().toUpperCase();
  const isFav = activeSymClean && favorites.includes(activeSymClean);

  return (
    <div className="bg-slate-100 min-h-screen w-full overflow-x-hidden p-2.5 sm:p-4 md:p-6 rtl" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-5">
        <section className="bg-white p-4 sm:p-6 rounded-3xl shadow-xs border border-slate-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  EGX Pro Quant Platform
                </span>
                <span className="text-xs text-slate-400 font-bold">البورصة المصرية (EGX)</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mt-1">
                غرفة التحليل الفني والكمّي
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                تحليل متعدد الأطر الزمنية • هيكل السوق • دعوم ومقاومات مختبرة • خطط مخاطر وتقرير فني احترافي
              </p>
            </div>

            <div className="w-full lg:w-auto flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => {
                    setInterval(tf.id);
                    if (symbol || activeSymClean) {
                      analyzeStock(activeSymClean || symbol, tf.id);
                    }
                  }}
                  className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                    interval === tf.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase().replace('.CA', ''))}
                placeholder="أدخل كود السهم في البورصة المصرية (مثال: COMI أو SWDY أو TMGH)"
                className="w-full border-2 border-slate-200 focus:border-indigo-600 bg-slate-50 focus:bg-white px-4 py-3 rounded-2xl text-center sm:text-right font-black text-base sm:text-lg uppercase focus:outline-none transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && analyzeStock()}
              />
            </div>
            <button
              id="analyze-btn"
              type="button"
              onClick={() => analyzeStock()}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 px-7 rounded-2xl transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base whitespace-nowrap"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span> جاري التحليل...
                </>
              ) : (
                <>
                  <span>⚡</span> تحليل السهم
                </>
              )}
            </button>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold ml-1">اختيار سريع:</span>
            {(favorites.length > 0 ? favorites : QUICK_EGX_SYMBOLS).map((symItem) => (
              <button
                key={symItem}
                type="button"
                onClick={() => {
                  setSymbol(symItem);
                  analyzeStock(symItem, interval);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer border ${
                  activeSymClean === symItem
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {favorites.includes(symItem) ? `★ ${symItem}` : symItem}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="bg-rose-50 border-r-4 border-rose-600 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-rose-900 font-bold text-xs sm:text-sm leading-relaxed">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => analyzeStock(activeSymClean || symbol, interval, true)}
              className="bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-rose-700 whitespace-nowrap cursor-pointer"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {loading && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
            <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <h3 className="text-base font-black text-slate-800">
              جاري فحص البيانات التاريخية وحساب الهيكل السعري والمؤشرات لسهم {symbol}...
            </h3>
            <p className="text-xs text-slate-500">
              يتم الآن مطابقة الإطار الزمني ({TIMEFRAMES.find((t) => t.id === interval)?.label}) مع الإطار الأكبر وإجراء الاختبار التاريخي.
            </p>
          </div>
        )}

        {!loading && summary && (
          <div className="space-y-5">
            <section className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-black text-xs">
                      {summary.market || 'البورصة المصرية (EGX)'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-black text-xs">
                      الإطار: {summary.timeframe_ar || interval}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px]">
                      🕒 {summary.data_status_ar || 'آخر بيانات تاريخية متاحة'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 pt-1">
                    {summary.name || activeSymClean}{' '}
                    <span className="text-indigo-600 font-black" dir="ltr">
                      ({activeSymClean})
                    </span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                    تاريخ آخر شمعة مؤكدة: <strong dir="ltr">{summary.last_bar_date || 'غير محدد'}</strong> • وقت التحليل:{' '}
                    <strong dir="ltr">{summary.analysis_timestamp || 'الآن'}</strong>
                  </p>
                </div>

                <div className="w-full lg:w-auto flex flex-wrap items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-400 block">السعر المرجعي للتحليل</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900" dir="ltr">
                        {formatMetric(unifiedPrice)}
                      </span>
                      <span className="text-xs font-bold text-slate-500">ج.م</span>
                      {unifiedChangePct !== null && unifiedChangePct !== undefined && (
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                            Number(unifiedChangePct) > 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : Number(unifiedChangePct) < 0
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                          dir="ltr"
                        >
                          {Number(unifiedChange) > 0 ? `+${unifiedChange}` : unifiedChange} (
                          {Number(unifiedChangePct) > 0 ? `+${unifiedChangePct}%` : `${unifiedChangePct}%`})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => analyzeStock(activeSymClean, interval, true)}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black transition cursor-pointer flex items-center gap-1.5"
                      title="تحديث البيانات وإعادة الحساب"
                    >
                      <span>🔄</span> تحديث
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleFavoriteAndWatchlist}
                      disabled={addingWatchlist}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 border ${
                        isFav
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>{isFav ? '⭐' : '☆'}</span>
                      <span>{addingWatchlist ? 'جاري الحفظ...' : isFav ? 'بالمفضلة / المتابعة' : 'إضافة للمفضلة'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {watchlistStatus && (
                <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex justify-between items-center">
                  <span>✅ {watchlistStatus}</span>
                  <button type="button" onClick={() => setWatchlistStatus('')} className="text-emerald-700 font-black">
                    ✕
                  </button>
                </div>
              )}
            </section>

            <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[96px]">
                <span className="text-[11px] font-bold text-slate-400">السعر الحالي</span>
                <div className="text-lg font-black text-slate-900 my-0.5" dir="ltr">
                  {formatMetric(unifiedPrice, ' ج.م')}
                </div>
                <span className="text-[10px] font-bold text-slate-500 truncate">
                  {unifiedChangePct !== null && unifiedChangePct !== undefined ? `التغير: ${unifiedChangePct}%` : 'إغلاق معتمد'}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[96px]">
                <span className="text-[11px] font-bold text-slate-400">اتجاه السهم</span>
                <div
                  className={`text-sm sm:text-base font-black my-0.5 leading-snug ${
                    structure?.market_state_ar === 'صاعد'
                      ? 'text-emerald-700'
                      : structure?.market_state_ar === 'هابط'
                      ? 'text-rose-700'
                      : 'text-amber-700'
                  }`}
                >
                  {structure?.market_state_ar || summary.trend_ar || 'غير متاح'}
                </div>
                <span className="text-[10px] font-bold text-slate-500 truncate">
                  الأكبر: {htf?.market_state_ar || htf?.trend_label_ar || 'غير متاح'}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[96px]">
                <span className="text-[11px] font-bold text-slate-400">مؤشر RSI (14)</span>
                <div className="text-lg font-black text-slate-900 my-0.5" dir="ltr">
                  {formatMetric(unifiedRsi)}
                </div>
                <span className="text-[10px] font-bold text-slate-500 truncate">
                  {unifiedRsi === null || unifiedRsi === undefined
                    ? 'غير متاح'
                    : unifiedRsi > 70
                    ? 'منطقة تشبع شرائي'
                    : unifiedRsi < 30
                    ? 'منطقة تشبع بيعي'
                    : unifiedRsi >= 50
                    ? 'زخم إيجابي (>50)'
                    : 'زخم ضعيف (<50)'}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[96px]">
                <span className="text-[11px] font-bold text-slate-400">مؤشر MACD</span>
                <div className="text-base font-black text-slate-900 my-0.5" dir="ltr">
                  {formatMetric(unifiedMacd)}
                </div>
                <span
                  className={`text-[10px] font-bold truncate ${
                    unifiedMacdHist !== null && unifiedMacdHist > 0
                      ? 'text-emerald-700'
                      : unifiedMacdHist !== null && unifiedMacdHist < 0
                      ? 'text-rose-700'
                      : 'text-slate-500'
                  }`}
                  dir="ltr"
                >
                  Hist: {formatMetric(unifiedMacdHist)}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[96px]">
                <span className="text-[11px] font-bold text-slate-400">التذبذب ATR (14)</span>
                <div className="text-lg font-black text-slate-900 my-0.5" dir="ltr">
                  {formatMetric(unifiedAtr)}
                </div>
                <span className="text-[10px] font-bold text-slate-500 truncate" dir="ltr">
                  {kpis.atr_pct ? `${kpis.atr_pct}% من السعر` : 'مدى حركة الشمعة'}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[96px]">
                <span className="text-[11px] font-bold text-slate-400">السيولة RVOL</span>
                <div
                  className={`text-lg font-black my-0.5 ${
                    unifiedRvol !== null && unifiedRvol >= 1.35 ? 'text-emerald-700' : 'text-slate-900'
                  }`}
                  dir="ltr"
                >
                  {formatMetric(unifiedRvol, 'x')}
                </div>
                <span className="text-[10px] font-bold text-slate-500 truncate">
                  {unifiedRvol === null || unifiedRvol === undefined
                    ? 'غير متاح'
                    : unifiedRvol >= 1.35
                    ? 'سيولة نشطة فوق المتوسط'
                    : unifiedRvol < 0.85
                    ? 'أقل من المتوسط'
                    : 'ضمن المتوسط المعتاد'}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between min-h-[96px]">
                <span className="text-[11px] font-bold text-emerald-700">أقرب دعم 🟢</span>
                <div className="text-lg font-black text-emerald-800 my-0.5" dir="ltr">
                  {formatMetric(unifiedSupport)}
                </div>
                <span className="text-[10px] font-bold text-slate-500 truncate" dir="ltr">
                  {kpis.nearest_support_range || (sZones[0] ? `${sZones[0].low} - ${sZones[0].high}` : 'لا يوجد دعم قريب')}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-rose-200/80 shadow-2xs flex flex-col justify-between min-h-[96px]">
                <span className="text-[11px] font-bold text-rose-700">أقرب مقاومة 🔴</span>
                <div className="text-lg font-black text-rose-800 my-0.5" dir="ltr">
                  {formatMetric(unifiedResistance)}
                </div>
                <span className="text-[10px] font-bold text-slate-500 truncate" dir="ltr">
                  {kpis.nearest_resistance_range || (rZones[0] ? `${rZones[0].low} - ${rZones[0].high}` : 'لا توجد مقاومة قريبة')}
                </span>
              </div>
            </section>

            <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {[
                { label: '1. قوة الإشارات الفنية', val: scores.technical_quality_score, desc: 'الاتجاه، الهيكل، الزخم، والسيولة' },
                { label: '2. جاهزية الدخول الفوري', val: scores.entry_readiness_score, desc: 'اكتمال التأكيد وعدم التمدد السعري' },
                { label: '3. جودة الاختبار التاريخي', val: scores.backtest_quality_score, desc: 'معامل الربح PF والتوقع الرياضي وحجم العينة' },
                { label: '4. موثوقية وجودة البيانات', val: scores.data_quality_score, desc: 'اكتمال الشموع وحداثتها وسيولة السهم' }
              ].map((sc, idx) => (
                <div key={idx} className={`p-3.5 rounded-2xl border ${getScoreBadgeClass(Number(sc.val))}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black">{sc.label}</span>
                    <span className="text-base sm:text-lg font-black" dir="ltr">
                      {sc.val} / 100
                    </span>
                  </div>
                  <p className="text-[11px] font-medium opacity-85 mt-1">{sc.desc}</p>
                </div>
              ))}
            </section>

            {/* بطاقة القرار الكمي النهائي مفصولة החالات بوضوح (المرحلة 4 - البند 3) */}
            {decision && (
              <section className={`p-5 sm:p-6 rounded-3xl border-2 shadow-sm ${getDecisionStyle(decision.decision_code).bg}`}>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pb-4 border-b border-white/15">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-black px-3 py-1 rounded-full ${getDecisionStyle(decision.decision_code).badge}`}>
                        القرار الكمي: {decision.decision_code}
                      </span>
                      <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full">
                        {decision.readiness_level_ar || `مستوى الجاهزية: ${scores.entry_readiness_score}/100`}
                      </span>
                      <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full">
                        المخاطرة: {decision.risk_level_ar}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-black mt-2">
                      {decision.decision_label_ar || getDecisionStyle(decision.decision_code).icon}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-200 mt-1 leading-relaxed">{decision.meaning_ar}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4 text-xs">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                    <h4 className="font-black text-sky-300 mb-2">🎯 حالة شرط الدخول:</h4>
                    <p className="text-slate-100 font-medium leading-relaxed">
                      {decision.state_separation?.entry_condition_status || decision.confirmation_condition_ar}
                    </p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                    <h4 className="font-black text-rose-300 mb-2">🛑 شرط إبطال السيناريو الفني:</h4>
                    <p className="text-slate-100 font-medium leading-relaxed">
                      {decision.state_separation?.scenario_invalidation_rule || decision.invalidation_condition_ar}
                    </p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                    <h4 className="font-black text-amber-300 mb-2">⚠️ وقف الخسارة وقواعد الخروج:</h4>
                    <ul className="space-y-1.5 text-slate-200 leading-relaxed font-medium">
                      <li>• {decision.state_separation?.post_entry_stop_loss || 'غير محدد'}</li>
                      <li className="pt-1 mt-1 border-t border-white/10">
                        • {decision.state_separation?.existing_position_exit_rule || 'غير محدد'}
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                    <h4 className="font-black text-emerald-300 mb-2">✅ حالة الاستراتيجية (Validity):</h4>
                    <p className="text-slate-200 leading-relaxed font-medium">
                      {decision.state_separation?.strategy_validity_status || 'غير محددة'}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section className="bg-white p-3.5 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
              <StockChart
                symbol={activeSymClean}
                interval={interval}
                chartPayload={summary.chart_payload}
              />
            </section>

            {structure && (
              <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3.5 mb-4">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <span>🏛️</span> اتجاه السهم وهيكل السوق (Trend & Market Structure)
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    استخراج القمم والقيعان المحورية المؤكدة يمنع الـ Look-ahead Bias
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 font-bold block mb-1">الاتجاه على الإطار الأكبر</span>
                    <span className="text-sm font-black text-slate-900 block">
                      {htf ? `${htf.trend_label_ar} (${htf.timeframe_ar})` : 'غير متاح (يُحلل الإطار الحالي)'}
                    </span>
                    {htf && (
                      <span className="text-[11px] text-slate-500 block mt-1">
                        الهيكل الأكبر: {htf.structure_sequence}
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 font-bold block mb-1">
                      الاتجاه على الإطار المختار ({summary.timeframe_ar || interval})
                    </span>
                    <span className="text-sm font-black text-indigo-950 block">{structure.trend_label_ar}</span>
                    <span className="text-[11px] text-slate-600 block mt-1">
                      حالة السوق: <strong>{structure.market_state_ar || structure.trend_label_ar}</strong>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 font-bold block mb-1">تسلسل القمم والقيعان المؤكدة</span>
                    <span className="text-sm font-black text-indigo-700 block">{structure.structure_sequence}</span>
                    <span className="text-[11px] text-slate-600 block mt-1">
                      آخر تغير هيكلي: {structure.last_structural_change_ar}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200">
                    <span className="text-rose-700 font-bold block mb-1">مستوى إبطال الهيكل (Invalidation)</span>
                    <span className="text-sm font-black text-rose-900 block" dir="ltr">
                      {structure.invalidation_level ? `${structure.invalidation_level} ج.م` : 'غير محدد'}
                    </span>
                    <span className="text-[11px] text-slate-700 block mt-1">
                      {structure.invalidation_reason_ar}
                    </span>
                  </div>
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <section className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <h3 className="text-base sm:text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                  <span>🧱</span> مناطق الدعم والمقاومة التاريخية المستقلة
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 whitespace-nowrap">
                        <th className="p-2.5 font-black">المستوى</th>
                        <th className="p-2.5 font-black">النطاق السعري</th>
                        <th className="p-2.5 font-black">القوة</th>
                        <th className="p-2.5 font-black">الاختبارات المستقلة</th>
                        <th className="p-2.5 font-black">موقع السعر / الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sZones.map((z: any, i: number) => (
                        <tr key={`s-${i}`} className="bg-emerald-50/30">
                          <td className="p-2.5 font-black text-emerald-800 whitespace-nowrap">🟢 دعم S{i + 1}</td>
                          <td className="p-2.5 font-black text-slate-900 whitespace-nowrap" dir="ltr">
                            {z.low} - {z.high}
                          </td>
                          <td className="p-2.5 font-black text-emerald-700 whitespace-nowrap" dir="ltr">
                            {z.strength_score}/100
                          </td>
                          <td className="p-2.5 text-slate-700 whitespace-nowrap">
                            {z.tests_count} اختبار ({z.successful_bounces} ارتداد)
                          </td>
                          <td className="p-2.5 font-bold text-slate-700 min-w-[200px]">{z.distance_label_ar}</td>
                        </tr>
                      ))}
                      {rZones.map((z: any, i: number) => (
                        <tr key={`r-${i}`} className="bg-rose-50/30">
                          <td className="p-2.5 font-black text-rose-800 whitespace-nowrap">🔴 مقاومة R{i + 1}</td>
                          <td className="p-2.5 font-black text-slate-900 whitespace-nowrap" dir="ltr">
                            {z.low} - {z.high}
                          </td>
                          <td className="p-2.5 font-black text-rose-700 whitespace-nowrap" dir="ltr">
                            {z.strength_score}/100
                          </td>
                          <td className="p-2.5 text-slate-700 whitespace-nowrap">
                            {z.tests_count} اختبار ({z.successful_bounces} رفض)
                          </td>
                          <td className="p-2.5 font-bold text-slate-700 min-w-[200px]">{z.distance_label_ar}</td>
                        </tr>
                      ))}
                      {sZones.length === 0 && rZones.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400 font-bold">
                            لا تتوفر مناطق دعم أو مقاومة تاريخية قريبة ومختبرة بشكل مستقل على هذا الإطار.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
                <h3 className="text-base sm:text-lg font-black text-slate-900 mb-3 flex items-center gap-2">
                  <span>🌀</span> مستويات فيبوناتشي (Fibonacci)
                </h3>

                {fib && fib.is_valid ? (
                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                      <div className="font-black text-indigo-950">{fib.direction_ar}</div>
                      <div className="flex justify-between text-slate-600">
                        <span>
                          البداية: <strong dir="ltr">{fib.start_point?.price}</strong> ({fib.start_point?.date})
                        </span>
                        <span>
                          النهاية: <strong dir="ltr">{fib.end_point?.price}</strong> ({fib.end_point?.date})
                        </span>
                      </div>
                      {fib.wave_selection_reason_ar && (
                        <p className="text-[10px] text-slate-500 pt-1 leading-relaxed">{fib.wave_selection_reason_ar}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {(fib.confluence_analysis || []).map((c: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl border flex justify-between items-center ${
                            c.is_strong_confluence
                              ? 'bg-amber-50 border-amber-300'
                              : c.has_sr_confluence
                              ? 'bg-indigo-50/50 border-indigo-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div>
                            <span className="font-black text-slate-900">مستوى {c.ratio}: </span>
                            <span className="font-black text-indigo-700" dir="ltr">
                              {c.price} ج.م
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              c.is_strong_confluence
                                ? 'bg-amber-200 text-amber-950'
                                : c.has_sr_confluence
                                ? 'bg-indigo-100 text-indigo-900'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {c.is_strong_confluence
                              ? '🔥 توافق قوي مختبر'
                              : c.has_sr_confluence
                              ? 'تقارب مع دعم/مقاومة'
                              : 'مستوى حسابي منفرد'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-medium">
                      {fib.invalidation_rule_ar}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">{fib?.reason || 'البيانات الحالية لا تشكل موجة فيبوناتشي صالحة.'}</p>
                )}
              </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {indAnalysis && (
                <section className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <span>📡</span> ملخص المؤشرات الفنية والسيولة
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    {Object.entries(indAnalysis.moving_averages?.items || {}).map(([maKey, maObj]: [string, any]) => (
                      <div key={maKey} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-slate-700">{maKey.replace('_', ' ')}</span>
                          <span className="font-black text-indigo-700" dir="ltr">
                            {formatMetric(maObj.value)}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-1">
                          {maObj.price_relation} • {maObj.slope_ar}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                    <div>
                      <strong className="text-slate-900">تشخيص الزخم:</strong>{' '}
                      <span className="text-slate-700">{indAnalysis.momentum?.interpretation_ar}</span>
                    </div>
                    <div>
                      <strong className="text-slate-900">تشخيص السيولة وتدفق الأموال (CMF={formatMetric(indAnalysis.liquidity?.cmf_20)}):</strong>{' '}
                      <span className="text-slate-700">{indAnalysis.liquidity?.verdict_ar}</span>
                    </div>
                  </div>
                </section>
              )}

              <section className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                    <span>📐</span> خطة التداول وإدارة المخاطر
                  </h3>

                  {tradeSetup && tradeSetup.plan_valid ? (
                    <div className="space-y-3 text-xs">
                      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 text-center">
                        <span className="text-[11px] text-indigo-600 font-bold block">الاستراتيجية المعتمدة</span>
                        <span className="text-sm font-black text-indigo-950">{tradeSetup.strategy}</span>
                      </div>

                      <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="font-bold text-slate-600">نطاق الدخول (Entry Zone)</span>
                        <span className="text-sm font-black text-slate-900" dir="ltr">
                          {tradeSetup.entry_zone || tradeSetup.entry} ج.م
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-3 rounded-xl bg-rose-50 border border-rose-200">
                        <span className="font-bold text-rose-700">وقف الخسارة (Stop Loss)</span>
                        <span className="text-sm font-black text-rose-700" dir="ltr">
                          {tradeSetup.stop} ج.م
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                          <span className="text-[10px] font-bold text-emerald-700 block">الهدف 1 (TP1)</span>
                          <span className="text-sm font-black text-emerald-800" dir="ltr">
                            {tradeSetup.tp1}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                          <span className="text-[10px] font-bold text-emerald-700 block">الهدف 2 (TP2)</span>
                          <span className="text-sm font-black text-emerald-800" dir="ltr">
                            {formatMetric(tradeSetup.tp2, '', '-')}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50/40 border border-emerald-200">
                          <span className="text-[10px] font-bold text-emerald-700 block">الهدف 3 (TP3)</span>
                          <span className="text-sm font-black text-emerald-800" dir="ltr">
                            {formatMetric(tradeSetup.tp3, '', '-')}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-3 rounded-xl bg-purple-50 border border-purple-200">
                        <span className="font-bold text-purple-800">العائد المتوقع مقابل المخاطرة (R:R)</span>
                        <span className="text-sm font-black text-purple-900" dir="ltr">
                          {tradeSetup.risk_reward_display}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1 pt-1">
                        <div>⏱️ <strong>مدة الاحتفاظ المتوقعة:</strong> {tradeSetup.expected_holding_days}</div>
                        <div>🛑 <strong>شرط الإبطال:</strong> {tradeSetup.invalidation}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 space-y-3">
                      <p className="text-xs sm:text-sm font-black text-amber-950 leading-relaxed">
                        «لا توجد خطة تداول صالحة حاليًا. لا تتوفر مستويات دخول ووقف وأهداف يمكن اعتمادها وفق شروط المحرك الحالية».
                      </p>
                      <div className="flex justify-between items-center p-3 rounded-xl bg-white border border-amber-200 text-xs">
                        <span className="font-bold text-slate-700">نسبة العائد للمخاطرة (Risk/Reward):</span>
                        <span className="font-black text-slate-900" dir="ltr">
                          N/A (غير متاحة)
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900 font-medium">
                        <strong>الشرط المطلوب لتفعيل الخطة:</strong> {decision?.next_state_condition_ar || decision?.confirmation_condition_ar}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* =====================================================================
                12. نتائج الاختبار التاريخي (يعرض N/A عند 0 صفقات)
               ===================================================================== */}
            <section className="bg-slate-900 text-white p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-2">
                    <span>🧪</span> نتائج الاختبار التاريخي (Walk-Forward Out-of-Sample Backtest)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    الفترة المختبرة: {btMetrics.tested_period || 'البيانات المتاحة'} • شامل 0.45% عمولات وانزلاق سعري
                  </p>
                </div>
                {loadingBacktest ? (
                  <span className="text-xs text-slate-300 animate-pulse">جاري التحديث...</span>
                ) : btMetrics.sample_warning || btMetrics.warning_message ? (
                  <span className="bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold px-3 py-1 rounded-xl max-w-sm text-center">
                    ⚠️ {btMetrics.sample_warning || btMetrics.warning_message}
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold px-3 py-1 rounded-xl">
                    ✓ عينة تاريخية كافية وداعمة
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center">
                <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">حجم العينة (الصفقات)</span>
                  <span className="text-lg font-black text-white" dir="ltr">
                    {btMetrics.trades_count ?? btMetrics.total_trades ?? 0}
                  </span>
                </div>
                <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">معدل الفوز (Win Rate)</span>
                  <span className={`text-lg font-black ${btMetrics.trades_count > 0 ? 'text-emerald-400' : 'text-slate-500'}`} dir="ltr">
                    {btMetrics.win_rate_display ?? (btMetrics.win_rate_pct !== undefined ? `${btMetrics.win_rate_pct}%` : 'N/A')}
                  </span>
                </div>
                <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">معامل الربح (Profit Factor)</span>
                  <span
                    className={`text-lg font-black ${
                      btMetrics.trades_count === 0 ? 'text-slate-500' : Number(btMetrics.profit_factor) >= 1.15 ? 'text-sky-400' : 'text-rose-400'
                    }`}
                    dir="ltr"
                  >
                    {btMetrics.profit_factor_display ?? btMetrics.profit_factor ?? 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">التوقع الرياضي (Expectancy)</span>
                  <span
                    className={`text-lg font-black ${
                      btMetrics.trades_count === 0 ? 'text-slate-500' : Number(btMetrics.expectancy_r) > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                    dir="ltr"
                  >
                    {btMetrics.expectancy_display ?? (btMetrics.expectancy_r !== undefined ? `${btMetrics.expectancy_r} R` : 'N/A')}
                  </span>
                </div>
                <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">أقصى تراجع (Max DD)</span>
                  <span className={`text-lg font-black ${btMetrics.trades_count > 0 ? 'text-rose-400' : 'text-slate-500'}`} dir="ltr">
                    {btMetrics.max_drawdown_display ?? (btMetrics.max_drawdown_pct !== undefined ? `${btMetrics.max_drawdown_pct}%` : 'N/A')}
                  </span>
                </div>
                <div className="bg-slate-800/90 p-3 rounded-2xl border border-slate-700">
                  <span className="text-[11px] text-slate-400 block">فوز خارج العينة (OOS)</span>
                  <span className={`text-lg font-black ${btMetrics.trades_count > 0 ? 'text-indigo-300' : 'text-slate-500'}`} dir="ltr">
                    {btMetrics.oos_display ?? (btMetrics.oos_win_rate !== undefined ? `${btMetrics.oos_win_rate}%` : 'N/A')}
                  </span>
                </div>
              </div>
            </section>

            {/* =====================================================================
                13. التقرير الفني الاحترافي الكامل الموثق
               ===================================================================== */}
            {profReport && (
              <section id="professional-report-container" className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b-2 border-slate-100 pb-5">
                  <div>
                    <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                      📝 التقرير الفني والكمي الموثق
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                      {profReport.header?.title || `التقرير الفني الاحترافي — ${summary.name}`}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5 font-medium">
                      <span>الرمز: <strong>{profReport.header?.symbol}</strong></span>
                      <span>الإطار: <strong>{profReport.header?.timeframe_ar}</strong></span>
                      <span>السعر المستخدم: <strong dir="ltr">{profReport.header?.price_used} ج.م</strong></span>
                      <span>التوقيت: <strong dir="ltr">{profReport.header?.analysis_timestamp}</strong></span>
                      <span>المحرك: <strong dir="ltr">{profReport.header?.engine_version}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={() => {
                        const allOpen = Object.values(expandedReportSections).every(Boolean);
                        setAllReportSections(!allOpen);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition cursor-pointer"
                    >
                      {Object.values(expandedReportSections).every(Boolean) ? '🔼 طي الأقسام' : '🔽 عرض الكل'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyReport}
                      className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-black transition cursor-pointer"
                    >
                      {copySuccess ? '✅ تم النسخ' : '📋 نسخ التقرير'}
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintReport}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition cursor-pointer"
                    >
                      🖨️ طباعة
                    </button>
                  </div>
                </div>

                <div className="bg-indigo-950 text-white p-5 rounded-2xl border border-indigo-800 shadow-xs">
                  <h3 className="text-sm sm:text-base font-black text-amber-400 mb-2 flex items-center gap-2">
                    <span>📌</span> 1. الملخص التنفيذي (Executive Summary)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-medium">
                    {profReport.executive_summary}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleReportSection('trend')}
                      className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex justify-between items-center text-right font-black text-sm text-slate-900 cursor-pointer"
                    >
                      <span>2. تحليل الاتجاه وهيكل السوق</span>
                      <span>{expandedReportSections.trend ? '−' : '+'}</span>
                    </button>
                    {expandedReportSections.trend && (
                      <div className="p-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                        <p>{profReport.trend_and_structure?.narrative_ar}</p>
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleReportSection('momentum')}
                      className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex justify-between items-center text-right font-black text-sm text-slate-900 cursor-pointer"
                    >
                      <span>3. تحليل الزخم والمؤشرات الفنية</span>
                      <span>{expandedReportSections.momentum ? '−' : '+'}</span>
                    </button>
                    {expandedReportSections.momentum && (
                      <div className="p-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                        <p>{profReport.momentum_analysis}</p>
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleReportSection('liquidity')}
                      className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex justify-between items-center text-right font-black text-sm text-slate-900 cursor-pointer"
                    >
                      <span>4. تحليل السيولة وتدفق الأموال</span>
                      <span>{expandedReportSections.liquidity ? '−' : '+'}</span>
                    </button>
                    {expandedReportSections.liquidity && (
                      <div className="p-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                        <p>{profReport.liquidity_analysis}</p>
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleReportSection('sr')}
                      className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex justify-between items-center text-right font-black text-sm text-slate-900 cursor-pointer"
                    >
                      <span>5. تقييم مناطق الدعم والمقاومة</span>
                      <span>{expandedReportSections.sr ? '−' : '+'}</span>
                    </button>
                    {expandedReportSections.sr && (
                      <div className="p-4 space-y-2.5 text-xs">
                        {(profReport.support_and_resistance || []).map((row: any, i: number) => (
                          <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="flex flex-wrap justify-between items-center gap-2 font-black text-slate-900 mb-1">
                              <span>
                                {row.level_label}: <span dir="ltr">{row.price_range} ج.م</span>
                              </span>
                              <span className="text-indigo-700">
                                القوة: {row.strength_score} • {row.current_status} ({row.distance_pct})
                              </span>
                            </div>
                            <p className="text-slate-600 leading-relaxed">{row.explanation_ar}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleReportSection('scenarios')}
                      className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex justify-between items-center text-right font-black text-sm text-slate-900 cursor-pointer"
                    >
                      <span>6. سيناريوهات الحركة المحتملة (مشروطة غير يقينية)</span>
                      <span>{expandedReportSections.scenarios ? '−' : '+'}</span>
                    </button>
                    {expandedReportSections.scenarios && profReport.scenarios_section && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                          <h4 className="font-black text-emerald-900">🟢 {profReport.scenarios_section.bullish?.title} ({profReport.scenarios_section.bullish?.status_ar})</h4>
                          <p><strong>الشرط السعري:</strong> {profReport.scenarios_section.bullish?.price_condition}</p>
                          <p><strong>شرط السيولة:</strong> {profReport.scenarios_section.bullish?.volume_momentum_condition}</p>
                          <p><strong>المستويات التالية:</strong> {profReport.scenarios_section.bullish?.next_potential_levels}</p>
                          <p className="text-rose-700"><strong>الإلغاء:</strong> {profReport.scenarios_section.bullish?.invalidation}</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1.5">
                          <h4 className="font-black text-rose-900">🔴 {profReport.scenarios_section.bearish?.title} ({profReport.scenarios_section.bearish?.status_ar})</h4>
                          <p><strong>مستوى الكسر:</strong> {profReport.scenarios_section.bearish?.break_level}</p>
                          <p><strong>حالة الكسر:</strong> {profReport.scenarios_section.bearish?.break_status}</p>
                          <p><strong>مناطق المراقبة:</strong> {profReport.scenarios_section.bearish?.next_watch_areas}</p>
                          <p className="text-emerald-800"><strong>الإلغاء:</strong> {profReport.scenarios_section.bearish?.invalidation}</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                          <h4 className="font-black text-amber-900">🟡 {profReport.scenarios_section.sideways?.title} ({profReport.scenarios_section.sideways?.status_ar})</h4>
                          <p><strong>حدود النطاق:</strong> {profReport.scenarios_section.sideways?.range_bounds}</p>
                          <p><strong>السلوك المتوقع:</strong> {profReport.scenarios_section.sideways?.expected_behavior}</p>
                          <p><strong>شرط انتهاء النطاق:</strong> {profReport.scenarios_section.sideways?.end_of_range_condition}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleReportSection('conclusion')}
                      className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex justify-between items-center text-right font-black text-sm text-slate-900 cursor-pointer"
                    >
                      <span>7. تقييم جودة الأدلة والخلاصة المهنية</span>
                      <span>{expandedReportSections.conclusion ? '−' : '+'}</span>
                    </button>
                    {expandedReportSections.conclusion && (
                      <div className="p-4 space-y-3 text-xs sm:text-sm text-slate-800 leading-relaxed">
                        <p className="font-medium bg-slate-50 p-4 rounded-xl border border-slate-200">
                          {profReport.professional_conclusion?.narrative_ar}
                        </p>
                        <div className="text-xs text-slate-500">
                          <strong>القيود المنهجية:</strong> {(profReport.evidence_quality_section?.limitations_ar || []).join(' | ')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* =====================================================================
                14. التفسير التعليمي التفاعلي
               ===================================================================== */}
            {eduPanel && (
              <section className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 text-white rounded-3xl border border-indigo-800/50 shadow-sm overflow-hidden print:hidden">
                <button
                  type="button"
                  onClick={() => setIsEduOpen(!isEduOpen)}
                  className="w-full p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-right cursor-pointer hover:bg-white/5 transition"
                >
                  <div>
                    <span className="text-xs font-black uppercase bg-indigo-500/30 text-indigo-200 px-3 py-1 rounded-full">
                      🎓 قسم تعليمي تفاعلي (قابل للطي)
                    </span>
                    <h2 className="text-lg sm:text-xl font-black mt-2 text-white">
                      {eduPanel.panel_title || `تعلم من تحليل السهم (${activeSymClean})`}
                    </h2>
                    <p className="text-xs text-indigo-200 mt-0.5">
                      اضغط هنا لفتح أو طي الشرح التعليمي للمؤشرات وسلسلة «لماذا صدر القرار؟» المحسوبة من أرقام السهم الفعلية
                    </p>
                  </div>
                  <span className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black whitespace-nowrap">
                    {isEduOpen ? '🔼 طي القسم التعليمي' : '🔽 فتح القسم التعليمي'}
                  </span>
                </button>

                {isEduOpen && (
                  <div className="p-5 sm:p-6 pt-0 space-y-6 border-t border-indigo-800/50">
                    <div className="flex flex-wrap gap-2 pt-4">
                      {[
                        { id: 'beginner', label: '🌱 المستوى 1: مبتدئ' },
                        { id: 'intermediate', label: '⚡ المستوى 2: متوسط' },
                        { id: 'advanced', label: '🦅 المستوى 3: متقدم' }
                      ].map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setEduLevel(lvl.id as any)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                            eduLevel === lvl.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {lvl.label}
                        </button>
                      ))}
                    </div>

                    {eduPanel.levels && eduPanel.levels[eduLevel] && (
                      <div className="bg-slate-800/60 border border-indigo-500/30 rounded-2xl p-4">
                        <h3 className="text-sm font-black text-amber-400 mb-3">{eduPanel.levels[eduLevel].title}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(eduPanel.levels[eduLevel].lessons || []).map((lesson: any, i: number) => (
                            <div key={i} className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700">
                              <h4 className="text-xs font-black text-indigo-300 mb-1.5">💡 {lesson.topic}</h4>
                              <p className="text-xs text-slate-200 leading-relaxed">{lesson.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {(eduPanel.indicator_cards || []).map((card: any) => {
                        const isSelected = selectedIndicatorId === card.id;
                        return (
                          <div
                            key={card.id}
                            onClick={() => setSelectedIndicatorId(isSelected ? null : card.id)}
                            className={`p-4 rounded-2xl border transition cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-900/70 border-amber-400'
                                : 'bg-slate-800/70 border-slate-700 hover:border-indigo-500/50'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <h4 className="text-xs sm:text-sm font-black text-white">{card.name}</h4>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/10 text-indigo-200 whitespace-nowrap">
                                {card.stance}
                              </span>
                            </div>
                            <div className="text-xs font-black text-indigo-300 bg-slate-900/90 px-3 py-1.5 rounded-lg mb-2" dir="ltr">
                              {card.current_value}
                            </div>
                            <div className="space-y-1 text-xs">
                              <p className="text-slate-300"><strong>التفسير:</strong> {card.explanation_ar}</p>
                              <p className="text-emerald-300"><strong>الدلالة الحالية:</strong> {card.current_meaning_ar}</p>
                              <p className="text-amber-200/90"><strong>مثال السهم:</strong> {card.live_example_ar}</p>
                              <p className="text-rose-300/90 pt-1 border-t border-slate-700 text-[11px]">
                                <strong>حدود المؤشر:</strong> {card.limitation_ar}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-amber-400 mb-3">🔗 سلسلة «لماذا صدر القرار؟»</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {(eduPanel.why_decision_chain || []).map((node: any) => (
                          <div key={node.step} className="bg-slate-800/90 border border-slate-700 p-3 rounded-2xl">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">
                                {node.step}
                              </span>
                              <span className="text-xs font-black text-indigo-300">{node.stage}</span>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed">{node.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-base font-bold text-slate-500 animate-pulse">
          جاري تحميل غرفة التحليل الفني والكمّي...
        </div>
      }
    >
      <AnalysisContent />
    </Suspense>
  );
}