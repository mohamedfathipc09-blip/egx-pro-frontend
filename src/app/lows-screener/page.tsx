'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ScreenerItem {
  symbol: string;
  name: string;
  sector: string;
  data_valid: boolean;
  data_status_ar: string;
  price_adjustment_note?: string;
  bars_count: number;
  missing_sessions_count?: number;
  last_bar_date: string;
  last_updated: string;
  data_source: string;
  current_price: number;
  low_6m: number;
  low_6m_date: string;
  high_6m: number;
  annual_low: number;
  annual_low_date: string;
  annual_high: number;
  annual_high_date: string;
  dist_from_annual_low_pct: number;
  dist_from_6m_low_pct: number;
  return_6m_pct: number | null;
  return_1y_pct: number | null;
  avg_volume_20: number;
  avg_turnover_20_egp: number;
  volume_change_pct: number;
  rvol_ratio: number;
  rsi_14: number;
  atr_14: number | null;
  ma20: number | null;
  ma50: number | null;
  ma100: number | null;
  ma200: number | null;
  ma_position_ar: string;
  trend_state_ar: string;
  trend_code: string;
  nearest_support?: { low: number; high: number; strength_score: number; tests_count: number } | null;
  nearest_resistance?: { low: number; high: number; strength_score: number; tests_count: number } | null;
  classification: string;
  classification_reasons_ar: string[];
  bottom_opportunity_score: number;
  max_available_score: number;
  data_completeness_pct: number;
  score_status_ar: string;
  score_breakdown: {
    proximity_25: number;
    liquidity_20: number;
    technical_trend_20: number;
    financial_quality_20: number | null;
    volume_improvement_10: number;
    support_proximity_5: number;
  };
  fundamentals: {
    is_available: boolean;
    status_ar: string;
    revenue_growth_pct: number | null;
    net_income_growth_pct: number | null;
    eps: number | null;
    book_value: number | null;
    pe_ratio: number | null;
    pb_ratio: number | null;
    profit_margin_pct: number | null;
    debt_to_equity_pct: number | null;
    operating_cashflow: number | null;
    last_statement_date: string;
    warnings_ar: string[];
  };
  strengths_ar: string[];
  weaknesses_ar: string[];
  alerts: Array<{ type: string; title_ar: string; message_ar: string }>;
}

interface CandlePoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma20?: number | null;
  ma50?: number | null;
  ma200?: number | null;
}

export default function LowsScreenerPage() {
  // حالة البيانات والإحصائيات
  const [items, setItems] = useState<ScreenerItem[]>([]);
  const [summaryCards, setSummaryCards] = useState<any>({});
  const [sectors, setSectors] = useState<string[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [alertsConfig, setAlertsConfig] = useState<any>({
    near_52w_low_3pct: true,
    near_6m_low_3pct: true,
    unusual_liquidity: true,
    rsi_improvement: true,
    reclaimed_ma20_or_ma50: true,
    resistance_breakout: true,
    new_financial_results: true
  });
  const [scanState, setScanState] = useState<any>({ is_running: false, progress_pct: 0 });
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // الفلاتر القابلة للتعديل (المرحلة الثالثة والتاسعة)
  const [lowScope, setLowScope] = useState<string>('EITHER');
  const [max1YReturn, setMax1YReturn] = useState<string>('5');
  const [max6MReturn, setMax6MReturn] = useState<string>('');
  const [maxDist52W, setMaxDist52W] = useState<string>('7');
  const [maxDist6M, setMaxDist6M] = useState<string>('5');
  const [minTurnover, setMinTurnover] = useState<string>('0');
  const [minBars, setMinBars] = useState<string>('126');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [rsiMin, setRsiMin] = useState<string>('');
  const [rsiMax, setRsiMax] = useState<string>('');
  const [trendState, setTrendState] = useState<string>('ALL');
  const [maRelation, setMaRelation] = useState<string>('ALL');
  const [minScore, setMinScore] = useState<string>('0');
  const [financialStatus, setFinancialStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [includeIncomplete, setIncludeIncomplete] = useState<boolean>(false);

  // الترتيب والترقيم
  const [sortBy, setSortBy] = useState<string>('bottom_opportunity_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [totalFiltered, setTotalFiltered] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // نافذة تفاصيل السهم والرسم البياني ولوحة التنبيهات
  const [selectedStockDetail, setSelectedStockDetail] = useState<ScreenerItem | null>(null);
  const [detailCandles, setDetailCandles] = useState<CandlePoint[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [showAlertsModal, setShowAlertsModal] = useState<boolean>(false);

  const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '');
    }
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    return isLocal ? 'http://localhost:10000' : 'https://egx-pro-api.onrender.com';
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchScreenerData = useCallback(async (targetPage: number = page) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        low_scope: lowScope,
        max_dist_52w_low_pct: maxDist52W || '7',
        max_dist_6m_low_pct: maxDist6M || '5',
        min_avg_turnover_egp: minTurnover || '0',
        min_bars_required: minBars || '126',
        sector: selectedSector,
        trend_state: trendState,
        ma_relation: maRelation,
        min_score: minScore || '0',
        financial_status: financialStatus,
        search_query: searchQuery,
        include_incomplete: String(includeIncomplete),
        sort_by: sortBy,
        sort_dir: sortDir,
        page: String(targetPage),
        page_size: String(pageSize)
      });

      if (max1YReturn.trim() !== '') params.set('max_1y_return_pct', max1YReturn);
      if (max6MReturn.trim() !== '') params.set('max_6m_return_pct', max6MReturn);
      if (rsiMin.trim() !== '') params.set('rsi_min', rsiMin);
      if (rsiMax.trim() !== '') params.set('rsi_max', rsiMax);

      const res = await fetch(`${getBaseUrl()}/api/lows-screener/list?${params.toString()}`);
      const data = await res.json();

      if (data.scan_state) setScanState(data.scan_state);
      if (data.summary_cards) setSummaryCards(data.summary_cards);
      if (Array.isArray(data.sectors)) setSectors(data.sectors);
      if (Array.isArray(data.active_alerts)) setActiveAlerts(data.active_alerts);
      if (data.alerts_config) setAlertsConfig(data.alerts_config);
      if (data.last_updated) setLastUpdated(data.last_updated);

      setItems(Array.isArray(data.results) ? data.results : []);
      setTotalFiltered(data.total_filtered || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('فشل جلب بيانات الماسح:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    lowScope, max1YReturn, max6MReturn, maxDist52W, maxDist6M, minTurnover,
    minBars, selectedSector, rsiMin, rsiMax, trendState, maRelation,
    minScore, financialStatus, searchQuery, includeIncomplete, sortBy, sortDir, page, pageSize
  ]);

  useEffect(() => {
    fetchScreenerData(page);
  }, [fetchScreenerData, page]);

  // متابعة شريط التقدم عند تشغيل المسح في الخلفية
  useEffect(() => {
    if (!scanState?.is_running) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${getBaseUrl()}/api/lows-screener/scan-status`);
        const st = await res.json();
        setScanState(st);
        if (!st.is_running) {
          fetchScreenerData(1);
        }
      } catch {
        // ignore
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [scanState?.is_running, fetchScreenerData]);

  const handleRunManualScan = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/lows-screener/scan?background=true`, { method: 'POST' });
      const data = await res.json();
      if (data.scan_state) setScanState(data.scan_state);
      showToast(data.message || 'بدأ مسح أسهم البورصة المصرية...');
    } catch {
      showToast('تعذر بدء الفحص اليدوي');
    }
  };

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortDir('desc');
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setLowScope('EITHER');
    setMax1YReturn('5');
    setMax6MReturn('');
    setMaxDist52W('7');
    setMaxDist6M('5');
    setMinTurnover('0');
    setMinBars('126');
    setSelectedSector('ALL');
    setRsiMin('');
    setRsiMax('');
    setTrendState('ALL');
    setMaRelation('ALL');
    setMinScore('0');
    setFinancialStatus('ALL');
    setSearchQuery('');
    setIncludeIncomplete(false);
    setPage(1);
  };

  const handleAddToWatchlist = async (item: ScreenerItem) => {
    const stopPrice = item.annual_low > 0 ? Number((item.annual_low * 0.97).toFixed(2)) : Number((item.current_price * 0.95).toFixed(2));
    const targetPrice = Number((item.current_price * 1.12).toFixed(2));
    try {
      const res = await fetch(`${getBaseUrl()}/api/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: item.symbol,
          entry_price: item.current_price,
          stop_loss: stopPrice,
          target: targetPrice
        })
      });
      const data = await res.json();
      showToast(data.message || `تمت إضافة ${item.symbol} إلى محفظة المتابعة`);
    } catch {
      showToast('تعذر الإضافة إلى محفظة المتابعة');
    }
  };

  const handleOpenStockDetails = async (item: ScreenerItem) => {
    setSelectedStockDetail(item);
    setDetailCandles([]);
    setLoadingDetails(true);
    try {
      const res = await fetch(`${getBaseUrl()}/api/lows-screener/details/${item.symbol}`);
      if (res.ok) {
        const data = await res.json();
        if (data.details) setSelectedStockDetail(data.details);
        if (Array.isArray(data.chart_candles)) setDetailCandles(data.chart_candles);
      }
    } catch (err) {
      console.error('تعذر جلب تفاصيل الرسم البياني:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSaveAlertsConfig = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/lows-screener/alerts-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertsConfig)
      });
      const data = await res.json();
      showToast(data.message || 'تم حفظ إعدادات التنبيهات');
      setShowAlertsModal(false);
    } catch {
      showToast('تعذر حفظ إعدادات التنبيهات');
    }
  };

  const handleExportCSVOrExcel = (mode: 'csv' | 'excel') => {
    if (!items.length) {
      showToast('لا توجد نتائج حالية لتصديرها');
      return;
    }
    const headers = [
      'الرمز', 'اسم الشركة', 'القطاع', 'السعر الحالي', 'قاع 6 أشهر', 'قاع 52 أسبوعاً',
      'أعلى سعر سنوي', 'البعد عن القاع السنوي %', 'البعد عن القاع النصف سنوي %',
      'أداء 6 أشهر %', 'أداء سنة %', 'متوسط قيمة التداول (ج.م)', 'RSI 14',
      'MA50', 'MA100', 'MA200', 'Bottom Opportunity Score', 'اكتمال البيانات %',
      'التصنيف', 'آخر تحديث'
    ];
    const rows = items.map((r) => [
      r.symbol,
      `"${r.name}"`,
      `"${r.sector}"`,
      r.current_price ?? 'N/A',
      r.low_6m ?? 'N/A',
      r.annual_low ?? 'N/A',
      r.annual_high ?? 'N/A',
      r.dist_from_annual_low_pct ?? 'N/A',
      r.dist_from_6m_low_pct ?? 'N/A',
      r.return_6m_pct ?? 'N/A',
      r.return_1y_pct ?? 'N/A',
      r.avg_turnover_20_egp ?? 0,
      r.rsi_14 ?? 'N/A',
      r.ma50 ?? 'N/A',
      r.ma100 ?? 'N/A',
      r.ma200 ?? 'N/A',
      `${r.bottom_opportunity_score}/${r.max_available_score}`,
      `${r.data_completeness_pct}%`,
      `"${r.classification}"`,
      r.last_bar_date
    ]);

    const sep = mode === 'excel' ? '\t' : ',';
    const content = '\ufeff' + [headers.join(sep), ...rows.map((line) => line.join(sep))].join('\n');
    const blob = new Blob([content], {
      type: mode === 'excel' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === 'excel' ? 'egx_52w_6m_lows.xls' : 'egx_52w_6m_lows.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getClassificationBadgeClass = (cls: string) => {
    if (cls.includes('بدأ الارتداد') || cls.includes('سيولة مرتفعة')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
    if (cls.includes('قريب جدًا') || cls.includes('قريب من القاعين')) {
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    }
    if (cls.includes('ضعيف السيولة') || cls.includes('غير مكتملة')) {
      return 'bg-amber-100 text-amber-800 border-amber-300';
    }
    if (cls.includes('هابط مستمر')) {
      return 'bg-rose-100 text-rose-800 border-rose-300';
    }
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  // رسم بياني SVG تفاعلي يعرض حركة السعر لـ 252 جلسة مع خط أفقي للقاع السنوي وخط أفقي للقاع النصف سنوي
  const renderPriceAndLowsChart = (candles: CandlePoint[], stock: ScreenerItem) => {
    if (!candles.length) {
      return (
        <div className="h-64 flex items-center justify-center bg-slate-900 text-slate-400 rounded-2xl text-sm font-bold">
          {loadingDetails ? '⏳ جاري تحميل الرسم البياني اليومي لـ 252 جلسة...' : 'لا تتوفر بيانات رسم بياني كافية'}
        </div>
      );
    }

    const width = 820;
    const height = 300;
    const padX = 50;
    const padY = 25;

    const allPrices = candles.flatMap((c) => [c.high, c.low]).concat([stock.annual_low, stock.low_6m]);
    const minP = Math.min(...allPrices) * 0.985;
    const maxP = Math.max(...allPrices) * 1.015;
    const priceSpan = Math.max(0.01, maxP - minP);

    const toX = (i: number) => padX + (i / Math.max(1, candles.length - 1)) * (width - padX * 2);
    const toY = (p: number) => height - padY - ((p - minP) / priceSpan) * (height - padY * 2);

    const closePoints = candles.map((c, idx) => `${toX(idx)},${toY(c.close)}`).join(' ');
    const ma50Points = candles
      .map((c, idx) => (c.ma50 ? `${toX(idx)},${toY(c.ma50)}` : null))
      .filter(Boolean)
      .join(' ');

    const yAnnualLow = toY(stock.annual_low);
    const y6MLow = toY(stock.low_6m);

    return (
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs text-slate-300">
          <div className="font-black text-white">
            📈 الشارت اليومي ({candles.length} جلسة) — {stock.name} ({stock.symbol})
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="w-3 h-0.5 bg-sky-400 inline-block" /> سعر الإغلاق
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-0.5 bg-amber-400 inline-block" /> المتوسط MA50
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-3 h-0.5 border-b-2 border-dashed border-rose-500 inline-block" /> قاع 52 أسبوعاً ({stock.annual_low} ج.م)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-0.5 border-b-2 border-dashed border-emerald-400 inline-block" /> قاع 6 أشهر ({stock.low_6m} ج.م)
            </span>
          </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64 sm:h-72">
          {/* خطوط الشبكة */}
          {[0.2, 0.5, 0.8].map((ratio, idx) => {
            const yVal = padY + ratio * (height - padY * 2);
            const pVal = (maxP - ratio * priceSpan).toFixed(2);
            return (
              <g key={idx}>
                <line x1={padX} y1={yVal} x2={width - padX} y2={yVal} stroke="#1e293b" strokeWidth="1" />
                <text x={8} y={yVal + 4} fill="#64748b" fontSize="10" fontWeight="bold">
                  {pVal}
                </text>
              </g>
            );
          })}

          {/* الخط الأفقي للقاع السنوي (52-Week Low) */}
          <line
            x1={padX}
            y1={yAnnualLow}
            x2={width - padX}
            y2={yAnnualLow}
            stroke="#f43f5e"
            strokeWidth="1.8"
            strokeDasharray="6 4"
          />
          <text x={width - padX - 155} y={Math.max(14, yAnnualLow - 6)} fill="#fb7185" fontSize="10" fontWeight="bold">
            قاع 52 أسبوعاً: {stock.annual_low} ج.م
          </text>

          {/* الخط الأفقي للقاع النصف سنوي (6-Month Low) */}
          <line
            x1={padX}
            y1={y6MLow}
            x2={width - padX}
            y2={y6MLow}
            stroke="#10b981"
            strokeWidth="1.6"
            strokeDasharray="4 4"
          />
          <text x={padX + 8} y={Math.max(14, y6MLow - 6)} fill="#34d399" fontSize="10" fontWeight="bold">
            قاع 6 أشهر: {stock.low_6m} ج.م
          </text>

          {/* خط المتوسط المتحرك MA50 */}
          {ma50Points && (
            <polyline fill="none" stroke="#f59e0b" strokeWidth="1.5" points={ma50Points} opacity="0.85" />
          )}

          {/* خط السعر اليومي */}
          <polyline fill="none" stroke="#38bdf8" strokeWidth="2.2" points={closePoints} />
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6 rtl text-right" dir="rtl">
      {/* إشعار Toast */}
      {toastMsg && (
        <div className="fixed bottom-5 left-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs sm:text-sm font-bold">
          🦅 {toastMsg}
        </div>
      )}

      {/* رأس الصفحة وأزرار التحكم العلوية */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-md border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl sm:text-3xl">📉</span>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight">
                ماسح الأسهم القريبة من القيعان السنوية والنصف سنوية
              </h1>
            </div>
            <p className="text-indigo-200 text-xs sm:text-sm mt-1 font-medium">
              52-Week & 6-Month Lows Screener — اكتشاف مبكر للأسهم القريبة من قيعانها في البورصة المصرية مع تقييم السيولة والاتجاه والوضع المالي دون توصيات شراء عشوائية
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAlertsModal(true)}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer"
            >
              🔔 التنبيهات الذكية ({activeAlerts.length})
            </button>
            <button
              type="button"
              onClick={handleRunManualScan}
              disabled={scanState?.is_running}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer shadow-xs"
            >
              {scanState?.is_running
                ? `⏳ جاري الفحص (${scanState.progress_pct || 0}%)...`
                : '🔄 تحديث وفحص السوق الآن'}
            </button>
          </div>
        </div>

        {/* شريط تقدم الفحص الخلفي */}
        {scanState?.is_running && (
          <div className="mt-4 bg-white/10 p-3 rounded-2xl border border-white/15">
            <div className="flex justify-between text-xs font-bold text-indigo-200 mb-1.5">
              <span>جاري فحص السهم: {scanState.current_symbol || '...'}</span>
              <span>
                {scanState.scanned_count} / {scanState.total_symbols} ({scanState.progress_pct}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${scanState.progress_pct || 5}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 1. البطاقات الإحصائية الـ 6 أعلى الصفحة (المرحلة التاسعة) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">عدد الأسهم المفحوصة</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {summaryCards.total_scanned ?? 0}
          </span>
          <span className="text-[10px] text-slate-400 font-bold">
            مكتمل البيانات: {summaryCards.valid_stocks_count ?? 0}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-700 block">قريبة من قاع 52 أسبوعاً</span>
          <span className="text-xl font-black text-rose-600 mt-1 block">
            {summaryCards.near_52w_low_count ?? 0}
          </span>
          <span className="text-[10px] text-slate-400 font-bold">ضمن مسافة ≤ 7%</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-2xs">
          <span className="text-[11px] font-bold text-indigo-700 block">قريبة من قاع 6 أشهر</span>
          <span className="text-xl font-black text-indigo-600 mt-1 block">
            {summaryCards.near_6m_low_count ?? 0}
          </span>
          <span className="text-[10px] text-slate-400 font-bold">ضمن مسافة ≤ 5%</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 block">ذات سيولة جيدة قرب القاع</span>
          <span className="text-xl font-black text-emerald-600 mt-1 block">
            {summaryCards.good_liquidity_near_low_count ?? 0}
          </span>
          <span className="text-[10px] text-slate-400 font-bold">تداول يومي ≥ مليون ج.م</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 block">بدأت ارتداداً فنياً</span>
          <span className="text-xl font-black text-amber-600 mt-1 block">
            {summaryCards.rebounding_count ?? 0}
          </span>
          <span className="text-[10px] text-slate-400 font-bold">أعلى MA20 وتحسن RSI</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">آخر تحديث للبيانات</span>
          <span className="text-xs font-black text-slate-800 mt-1.5 block" dir="ltr">
            {lastUpdated || 'قيد التحديث'}
          </span>
          <span className="text-[10px] text-emerald-600 font-bold">EGX Adjusted EOD</span>
        </div>
      </div>

      {/* 2. لوحة الفلاتر الشاملة القابلة للتعديل (المرحلة الثالثة والتاسعة) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h2 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-2">
            <span>🎛️</span> فلاتر البحث المتقدم في القيعان السنوية والنصف سنوية
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-slate-600 hover:text-rose-600 bg-slate-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              إعادة الضبط للقيم الافتراضية
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* اختيار شرط القاع (السنوي / النصف سنوي / أحدهما / كلاهما) */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">نطاق البحث في القيعان:</label>
            <select
              value={lowScope}
              onChange={(e) => { setLowScope(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
            >
              <option value="EITHER">أحد القاعين (السنوي أو النصف سنوي)</option>
              <option value="ANNUAL">القاع السنوي فقط (52 أسبوعاً)</option>
              <option value="SIX_MONTH">القاع النصف سنوي فقط (6 أشهر)</option>
              <option value="BOTH">كلا القاعين معاً</option>
              <option value="ALL">جميع الأسهم المفحوصة</option>
            </select>
          </div>

          {/* أقصى أداء آخر 12 شهراً */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">أداء آخر 12 شهراً ≤ (%):</label>
            <input
              type="number"
              value={max1YReturn}
              onChange={(e) => { setMax1YReturn(e.target.value); setPage(1); }}
              placeholder="الافتراضي: 5%"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
            />
          </div>

          {/* أقصى بعد عن قاع 52 أسبوعاً */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">أقصى بُعد عن قاع 52 أسبوعاً (%):</label>
            <input
              type="number"
              value={maxDist52W}
              onChange={(e) => { setMaxDist52W(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
            />
          </div>

          {/* أقصى بعد عن قاع 6 أشهر */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">أقصى بُعد عن قاع 6 أشهر (%):</label>
            <input
              type="number"
              value={maxDist6M}
              onChange={(e) => { setMaxDist6M(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
            />
          </div>

          {/* الحد الأدنى لمتوسط قيمة التداول */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">الحد الأدنى لقيمة التداول اليومية (ج.م):</label>
            <input
              type="number"
              value={minTurnover}
              onChange={(e) => { setMinTurnover(e.target.value); setPage(1); }}
              placeholder="مثال: 500000"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
            />
          </div>

          {/* القطاع */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">القطاع:</label>
            <select
              value={selectedSector}
              onChange={(e) => { setSelectedSector(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
            >
              <option value="ALL">جميع القطاعات</option>
              {sectors.map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* حالة الاتجاه */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">حالة الاتجاه الفني:</label>
            <select
              value={trendState}
              onChange={(e) => { setTrendState(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
            >
              <option value="ALL">الكل</option>
              <option value="IMPROVING_TREND">بداية تحسن في الاتجاه (أعلى MA20 وMA50)</option>
              <option value="EARLY_RECOVERY">تحسن فني أولي (استعاد MA20)</option>
              <option value="CONTINUED_DOWNTREND">اتجاه هابط مستمر</option>
              <option value="SIDEWAYS">نطاق تجميعي / عرضي</option>
            </select>
          </div>

          {/* موقع السعر بالنسبة للمتوسطات */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">السعر بالنسبة للمتوسطات:</label>
            <select
              value={maRelation}
              onChange={(e) => { setMaRelation(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
            >
              <option value="ALL">الكل</option>
              <option value="BELOW_ALL">أسفل MA50 وMA100 وMA200</option>
              <option value="ABOVE_MA20">أعلى MA20</option>
              <option value="ABOVE_MA50">أعلى MA50</option>
            </select>
          </div>

          {/* نطاق RSI */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="font-bold text-slate-600 block mb-1">RSI من:</label>
              <input
                type="number"
                value={rsiMin}
                onChange={(e) => { setRsiMin(e.target.value); setPage(1); }}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
              />
            </div>
            <div className="flex-1">
              <label className="font-bold text-slate-600 block mb-1">RSI إلى:</label>
              <input
                type="number"
                value={rsiMax}
                onChange={(e) => { setRsiMax(e.target.value); setPage(1); }}
                placeholder="100"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
              />
            </div>
          </div>

          {/* الحد الأدنى لدرجة التقييم */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">الحد الأدنى لـ Opportunity Score:</label>
            <input
              type="number"
              value={minScore}
              onChange={(e) => { setMinScore(e.target.value); setPage(1); }}
              placeholder="0"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
            />
          </div>

          {/* حالة البيانات المالية */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">حالة البيانات المالية:</label>
            <select
              value={financialStatus}
              onChange={(e) => { setFinancialStatus(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
            >
              <option value="ALL">الكل (مكتمل وغير مكتمل مالياً)</option>
              <option value="AVAILABLE">بيانات مالية متوفرة فقط</option>
              <option value="INCOMPLETE">تقييم فني فقط (بيانات مالية غير متاحة)</option>
            </select>
          </div>

          {/* بحث بالاسم أو الرمز */}
          <div>
            <label className="font-bold text-slate-600 block mb-1">بحث بالاسم أو الرمز:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="مثال: فوري أو FWRY..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* 3. شريط أدوات الجدول والتصدير CSV / Excel */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200">
        <div className="text-xs sm:text-sm font-black text-slate-700">
          النتائج المطابقة للفلاتر: <span className="text-indigo-700">{totalFiltered} سهم</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 ml-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeIncomplete}
              onChange={(e) => { setIncludeIncomplete(e.target.checked); setPage(1); }}
              className="rounded"
            />
            إظهار الأسهم ذات البيانات التاريخية غير المكتملة
          </label>

          <button
            type="button"
            onClick={() => handleExportCSVOrExcel('csv')}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer"
          >
            📥 تصدير CSV
          </button>
          <button
            type="button"
            onClick={() => handleExportCSVOrExcel('excel')}
            className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer"
          >
            📊 تصدير Excel
          </button>
        </div>
      </div>

      {/* 4. جدول النتائج الكامل (19 عموداً مع الترتيب والأزرار التفاعلية) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-slate-900 text-slate-200 font-black whitespace-nowrap">
              <tr>
                <th className="p-3 cursor-pointer" onClick={() => handleSort('symbol')}>الرمز ↕</th>
                <th className="p-3">اسم الشركة</th>
                <th className="p-3">القطاع</th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort('current_price')}>السعر الحالي ↕</th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort('low_6m')}>قاع 6 أشهر ↕</th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort('annual_low')}>قاع 52 أسبوعاً ↕</th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort('annual_high')}>أعلى سعر سنوي ↕</th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort('dist_from_annual_low_pct')}>البعد عن القاع السنوي ↕</th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort('dist_from_6m_low_pct')}>البعد عن قاع 6م ↕</th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort('return_6m_pct')}>أداء 6 أشهر ↕</th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort('return_1y_pct')}>أداء سنة ↕</th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort('avg_turnover_20_egp')}>متوسط قيمة التداول ↕</th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort('rsi_14')}>RSI ↕</th>
                <th className="p-3">MA50</th>
                <th className="p-3">MA100</th>
                <th className="p-3">MA200</th>
                <th className="p-3 cursor-pointer" onClick={() => handleSort('bottom_opportunity_score')}>Opportunity Score ↕</th>
                <th className="p-3">التصنيف</th>
                <th className="p-3">آخر تحديث</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-700 whitespace-nowrap">
              {isLoading ? (
                <tr>
                  <td colSpan={20} className="p-10 text-center text-slate-500 font-black">
                    ⏳ جاري تحميل نتائج ماسح القيعان...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={20} className="p-10 text-center text-slate-500 font-black">
                    لا توجد أسهم مطابقة لشروط الفلترة الحالية. يمكنك توسيع نسبة البعد عن القاع أو الضغط على «إعادة الضبط».
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.symbol}
                    className="hover:bg-indigo-50/40 transition cursor-pointer"
                    onClick={() => handleOpenStockDetails(item)}
                  >
                    <td className="p-3 font-black text-indigo-700" dir="ltr">{item.symbol}</td>
                    <td className="p-3 font-black text-slate-900">{item.name}</td>
                    <td className="p-3 text-slate-500">{item.sector}</td>
                    <td className="p-3 font-black text-slate-900" dir="ltr">
                      {item.current_price ?? '—'}
                    </td>
                    <td className="p-3 text-emerald-700" dir="ltr">{item.low_6m ?? '—'}</td>
                    <td className="p-3 text-rose-700" dir="ltr">{item.annual_low ?? '—'}</td>
                    <td className="p-3 text-slate-600" dir="ltr">{item.annual_high ?? '—'}</td>
                    <td className="p-3" dir="ltr">
                      {item.dist_from_annual_low_pct !== undefined ? (
                        <span className={`px-2 py-0.5 rounded-lg ${item.dist_from_annual_low_pct <= 5 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'}`}>
                          +{item.dist_from_annual_low_pct}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-3" dir="ltr">
                      {item.dist_from_6m_low_pct !== undefined ? (
                        <span className={`px-2 py-0.5 rounded-lg ${item.dist_from_6m_low_pct <= 5 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'}`}>
                          +{item.dist_from_6m_low_pct}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className={`p-3 ${Number(item.return_6m_pct) < 0 ? 'text-rose-600' : 'text-emerald-600'}`} dir="ltr">
                      {item.return_6m_pct !== null && item.return_6m_pct !== undefined ? `${item.return_6m_pct}%` : 'N/A'}
                    </td>
                    <td className={`p-3 ${Number(item.return_1y_pct) < 0 ? 'text-rose-600' : 'text-emerald-600'}`} dir="ltr">
                      {item.return_1y_pct !== null && item.return_1y_pct !== undefined ? `${item.return_1y_pct}%` : 'N/A'}
                    </td>
                    <td className="p-3" dir="ltr">
                      {item.avg_turnover_20_egp ? `${(item.avg_turnover_20_egp / 1_000_000).toFixed(2)}M ج.م` : '—'}
                    </td>
                    <td className="p-3" dir="ltr">{item.rsi_14 ?? '—'}</td>
                    <td className="p-3 text-slate-500" dir="ltr">{item.ma50 ?? 'N/A'}</td>
                    <td className="p-3 text-slate-500" dir="ltr">{item.ma100 ?? 'N/A'}</td>
                    <td className="p-3 text-slate-500" dir="ltr">{item.ma200 ?? 'N/A'}</td>
                    <td className="p-3">
                      {item.data_valid ? (
                        <div className="flex flex-col">
                          <span className="font-black text-indigo-900" dir="ltr">
                            {item.bottom_opportunity_score} / {item.max_available_score}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            اكتمال: {item.data_completeness_pct}%
                          </span>
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full border text-[11px] font-black ${getClassificationBadgeClass(item.classification)}`}>
                        {item.classification}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]" dir="ltr">{item.last_bar_date}</td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenStockDetails(item)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer"
                          title="عرض الرسم البياني وتفاصيل القيعان"
                        >
                          📈 الشارت والتفاصيل
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddToWatchlist(item)}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-800 px-2 py-1 rounded-lg text-[11px] font-black cursor-pointer"
                          title="إضافة إلى محفظة المتابعة"
                        >
                          ⭐ للمفضلة
                        </button>
                        <Link
                          href={`/?symbol=${item.symbol}`}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg text-[11px] font-black"
                          title="فتح غرفة التحليل الكمي"
                        >
                          🔍 تحليل
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ترقيم الصفحات (Pagination) */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
            <span>
              صفحة {page} من {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
              >
                السابق
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 cursor-pointer"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. نافذة تفاصيل السهم والرسم البياني وخطي القاع السنوي والنصف سنوي (المرحلة العاشرة) */}
      {selectedStockDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* رأس النافذة */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-xl font-black flex items-center gap-2">
                  <span>{selectedStockDetail.name}</span>
                  <span className="text-amber-400" dir="ltr">({selectedStockDetail.symbol})</span>
                  <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-full">
                    {selectedStockDetail.sector}
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  آخر إغلاق موثوق: {selectedStockDetail.current_price} ج.م بتاريخ {selectedStockDetail.last_bar_date} — المصدر: {selectedStockDetail.data_source}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStockDetail(null)}
                className="bg-slate-800 hover:bg-rose-700 text-white w-9 h-9 rounded-xl font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* محتوى التفاصيل القابل للتمرير */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              {/* الرسم البياني اليومي مع خطي القاع السنوي والنصف سنوي */}
              {renderPriceAndLowsChart(detailCandles, selectedStockDetail)}

              {/* بطاقات موقع السعر الحالي من القيعان والقمم */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-slate-500 text-xs block">السعر الحالي</span>
                  <span className="text-lg font-black text-slate-900" dir="ltr">
                    {selectedStockDetail.current_price} EGP
                  </span>
                  <span className="text-[11px] text-slate-400 block">{selectedStockDetail.ma_position_ar}</span>
                </div>

                <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200">
                  <span className="text-rose-700 text-xs block">قاع 52 أسبوعاً ({selectedStockDetail.annual_low_date})</span>
                  <span className="text-lg font-black text-rose-700" dir="ltr">
                    {selectedStockDetail.annual_low} EGP
                  </span>
                  <span className="text-[11px] text-rose-600 font-bold block">
                    يبعد السعر عنه: +{selectedStockDetail.dist_from_annual_low_pct}%
                  </span>
                </div>

                <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                  <span className="text-emerald-700 text-xs block">قاع 6 أشهر ({selectedStockDetail.low_6m_date})</span>
                  <span className="text-lg font-black text-emerald-700" dir="ltr">
                    {selectedStockDetail.low_6m} EGP
                  </span>
                  <span className="text-[11px] text-emerald-600 font-bold block">
                    يبعد السعر عنه: +{selectedStockDetail.dist_from_6m_low_pct}%
                  </span>
                </div>

                <div className="bg-indigo-50 p-3.5 rounded-2xl border border-indigo-200">
                  <span className="text-indigo-700 text-xs block">Bottom Opportunity Score</span>
                  <span className="text-lg font-black text-indigo-900" dir="ltr">
                    {selectedStockDetail.bottom_opportunity_score} / {selectedStockDetail.max_available_score}
                  </span>
                  <span className="text-[11px] text-indigo-600 font-bold block">
                    {selectedStockDetail.score_status_ar}
                  </span>
                </div>
              </div>

              {/* تفصيل نقاط التقييم الذكي الـ 100 وأسباب التصنيف */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-black text-slate-900">🎯 تفصيل درجة التقييم (Bottom Opportunity Score)</h4>
                  <ul className="space-y-1.5 text-xs font-bold text-slate-700">
                    <li>• القرب من القاع السنوي/النصف سنوي: <strong dir="ltr">{selectedStockDetail.score_breakdown?.proximity_25} / 25</strong></li>
                    <li>• جودة السيولة وقيمة التداول: <strong dir="ltr">{selectedStockDetail.score_breakdown?.liquidity_20} / 20</strong></li>
                    <li>• التحسن في الاتجاه الفني: <strong dir="ltr">{selectedStockDetail.score_breakdown?.technical_trend_20} / 20</strong></li>
                    <li>
                      • جودة الوضع المالي للشركة:{' '}
                      <strong dir="ltr">
                        {selectedStockDetail.score_breakdown?.financial_quality_20 !== null
                          ? `${selectedStockDetail.score_breakdown?.financial_quality_20} / 20`
                          : 'غير متاح (لم يتم اختلاق درجة مالية)'}
                      </strong>
                    </li>
                    <li>• تحسن حجم التداول: <strong dir="ltr">{selectedStockDetail.score_breakdown?.volume_improvement_10} / 10</strong></li>
                    <li>• القرب من دعم فني مختبر: <strong dir="ltr">{selectedStockDetail.score_breakdown?.support_proximity_5} / 5</strong></li>
                  </ul>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-black text-slate-900">🏷️ التصنيف وأسبابه والمؤشرات الفنية</h4>
                  <p className="text-xs font-black text-indigo-700">التصنيف: {selectedStockDetail.classification}</p>
                  <ul className="space-y-1 text-xs text-slate-700 font-bold">
                    {selectedStockDetail.classification_reasons_ar?.map((r, idx) => (
                      <li key={idx}>• {r}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-[11px] font-bold">
                    <span>RSI(14): {selectedStockDetail.rsi_14}</span>
                    <span>MA20: {selectedStockDetail.ma20 ?? 'N/A'}</span>
                    <span>MA50: {selectedStockDetail.ma50 ?? 'N/A'}</span>
                    <span>MA100: {selectedStockDetail.ma100 ?? 'N/A'}</span>
                    <span>MA200: {selectedStockDetail.ma200 ?? 'N/A'}</span>
                    <span>ATR(14): {selectedStockDetail.atr_14 ?? 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* التحليل الأساسي والمالي وتنبيهات المخاطر المالية (المرحلة الثامنة) */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-black text-slate-900">🏦 التحليل الأساسي ونتائج الأعمال المتاحة</h4>
                  <span className="text-xs font-bold text-slate-500">
                    آخر قوائم مالية: {selectedStockDetail.fundamentals?.last_statement_date || 'غير متوفر'}
                  </span>
                </div>

                {selectedStockDetail.fundamentals?.is_available ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                    <div className="p-2.5 bg-slate-50 rounded-xl">ربحية السهم EPS: <strong dir="ltr">{selectedStockDetail.fundamentals.eps ?? 'N/A'}</strong></div>
                    <div className="p-2.5 bg-slate-50 rounded-xl">مضاعف الربحية P/E: <strong dir="ltr">{selectedStockDetail.fundamentals.pe_ratio ?? 'N/A'}</strong></div>
                    <div className="p-2.5 bg-slate-50 rounded-xl">القيمة الدفترية: <strong dir="ltr">{selectedStockDetail.fundamentals.book_value ?? 'N/A'}</strong></div>
                    <div className="p-2.5 bg-slate-50 rounded-xl">مضاعف الدفترية P/B: <strong dir="ltr">{selectedStockDetail.fundamentals.pb_ratio ?? 'N/A'}</strong></div>
                    <div className="p-2.5 bg-slate-50 rounded-xl">نمو الإيرادات: <strong dir="ltr">{selectedStockDetail.fundamentals.revenue_growth_pct !== null ? `${selectedStockDetail.fundamentals.revenue_growth_pct}%` : 'N/A'}</strong></div>
                    <div className="p-2.5 bg-slate-50 rounded-xl">نمو الأرباح: <strong dir="ltr">{selectedStockDetail.fundamentals.net_income_growth_pct !== null ? `${selectedStockDetail.fundamentals.net_income_growth_pct}%` : 'N/A'}</strong></div>
                    <div className="p-2.5 bg-slate-50 rounded-xl">هامش صافي الربح: <strong dir="ltr">{selectedStockDetail.fundamentals.profit_margin_pct !== null ? `${selectedStockDetail.fundamentals.profit_margin_pct}%` : 'N/A'}</strong></div>
                    <div className="p-2.5 bg-slate-50 rounded-xl">المديونية/الملكية: <strong dir="ltr">{selectedStockDetail.fundamentals.debt_to_equity_pct !== null ? `${selectedStockDetail.fundamentals.debt_to_equity_pct}%` : 'N/A'}</strong></div>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    ⚠️ البيانات المالية التفصيلية لهذا السهم غير متوفرة حالياً من المزود، لذلك تم تقييم السهم فنياً وسيولياً فقط (من 80 نقطة) دون افتراض أو اختلاق أي مضاعفات مالية.
                  </p>
                )}

                {selectedStockDetail.fundamentals?.warnings_ar?.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs font-bold text-rose-800">
                    🚨 تنبيهات مالية جوهرية: {selectedStockDetail.fundamentals.warnings_ar.join(' | ')}
                  </div>
                )}
              </div>

              {/* أسباب القوة وأسباب الضعف */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                  <h4 className="font-black text-emerald-900 mb-2">✅ نقاط القوة والفرص المحتملة</h4>
                  <ul className="space-y-1 text-xs font-bold text-emerald-800">
                    {selectedStockDetail.strengths_ar?.map((s, idx) => <li key={idx}>• {s}</li>)}
                  </ul>
                </div>

                <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200">
                  <h4 className="font-black text-rose-900 mb-2">⚠️ نقاط الضعف والمخاطر (ليست توصية شراء تلقائية)</h4>
                  <ul className="space-y-1 text-xs font-bold text-rose-800">
                    {selectedStockDetail.weaknesses_ar?.map((w, idx) => <li key={idx}>• {w}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. نافذة التنبيهات الذكية وإعدادات تشغيلها/إيقافها (المرحلة الحادية عشرة) */}
      {showAlertsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[88vh] flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-black text-base sm:text-lg">🔔 مركز تنبيهات القيعان والسيولة والانعكاس</h3>
              <button
                type="button"
                onClick={() => setShowAlertsModal(false)}
                className="bg-slate-800 hover:bg-rose-700 text-white w-8 h-8 rounded-xl font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <h4 className="font-black text-slate-800 mb-2">⚙️ تفعيل أو إيقاف أنواع التنبيهات:</h4>
                {[
                  { key: 'near_52w_low_3pct', label: 'وصول سهم إلى مسافة ≤ 3% من قاعه السنوي (52 أسبوعاً)' },
                  { key: 'near_6m_low_3pct', label: 'وصول سهم إلى مسافة ≤ 3% من قاعه النصف سنوي (6 أشهر)' },
                  { key: 'unusual_liquidity', label: 'ارتفاع السيولة وحجم التداول بشكل غير معتاد (+50%)' },
                  { key: 'rsi_improvement', label: 'ظهور تحسن واضح في زخم مؤشر RSI' },
                  { key: 'reclaimed_ma20_or_ma50', label: 'استعادة السعر للمتوسط المتحرك MA20 أو MA50' },
                  { key: 'resistance_breakout', label: 'اختراق مقاومة فنية قريبة' },
                  { key: 'new_financial_results', label: 'توفر قوائم ونتائج مالية معلنة' }
                ].map((al) => (
                  <label key={al.key} className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(alertsConfig[al.key])}
                      onChange={(e) => setAlertsConfig({ ...alertsConfig, [al.key]: e.target.checked })}
                    />
                    <span>{al.label}</span>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={handleSaveAlertsConfig}
                  className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-black cursor-pointer"
                >
                  حفظ إعدادات التنبيهات
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-slate-800">⚡ التنبيهات النشطة المرصودة حالياً ({activeAlerts.length}):</h4>
                {activeAlerts.length === 0 ? (
                  <p className="text-slate-400 font-bold">لا توجد تنبيهات نشطة حالياً أو لم يكتمل الفحص بعد.</p>
                ) : (
                  activeAlerts.map((al, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-2">
                      <div>
                        <span className="font-black text-indigo-900">{al.name} ({al.symbol}) — {al.title_ar}</span>
                        <p className="text-slate-700 font-bold mt-0.5">{al.message_ar}</p>
                      </div>
                      <Link
                        href={`/?symbol=${al.symbol}`}
                        className="bg-white border border-slate-300 px-2.5 py-1 rounded-lg font-black text-slate-800 shrink-0"
                      >
                        فتح السهم
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}