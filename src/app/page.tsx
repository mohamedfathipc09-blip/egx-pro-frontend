'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import StockChart from '@/components/StockChart';
import CandidatesList from '@/components/CandidatesList';

function AnalysisContent() {
  const [symbol, setSymbol] = useState('');
  const [interval, setInterval] = useState('1d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  const [backtestData, setBacktestData] = useState<any>(null);
  const [loadingBacktest, setLoadingBacktest] = useState(false);

  // حالة المستوى التعليمي المختار في لوحة «تعلم من تحليل السهم»
  const [eduLevel, setEduLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const urlSymbol = searchParams.get('symbol');

  const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '');
    }
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    return isLocal ? 'http://localhost:10000' : 'https://egx-pro-api.onrender.com';
  };

  const analyzeStock = async (overrideSymbol?: string, overrideInterval?: string) => {
    const targetSymbol = (overrideSymbol || symbol).trim().toUpperCase().replace('.CA', '');
    const targetInterval = overrideInterval || interval;

    if (!targetSymbol) {
      setError('يرجى إدخال كود السهم أولاً (مثال: COMI)');
      return;
    }

    setLoading(true);
    setError('');
    setData(null);
    setBacktestData(null);

    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/analyze/${targetSymbol}?interval=${targetInterval}`);
      if (!res.ok) {
        throw new Error('تعذر جلب بيانات السهم من الخادم. تأكد من صحة كود السهم (بدون .CA).');
      }
      const result = await res.json();
      const summaryObj = result?.summary || result;

      if (!summaryObj || (!summaryObj.current_price && !summaryObj.report_text)) {
        throw new Error('لا توجد بيانات كافية لتحليل هذا السهم على هذا الإطار الزمني حالياً.');
      }

      setData({
        symbol: result?.symbol || targetSymbol,
        summary: summaryObj
      });

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
      setError(err.message || 'حدث خطأ غير متوقع أثناء التحليل.');
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
      const clean = urlSymbol.replace('.CA', '').toUpperCase();
      setSymbol(clean);
      analyzeStock(clean);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSymbol]);

  const summary = data?.summary;
  const scores = summary?.scores || {
    composite_score: summary?.score ?? 0,
    technical_quality_score: summary?.technical_quality_score ?? summary?.score ?? 0,
    entry_readiness_score: summary?.entry_readiness_score ?? 0,
    backtest_quality_score: summary?.backtest_quality_score ?? 0,
    data_quality_score: summary?.data_quality_score ?? summary?.data_quality?.quality_score ?? 0
  };
  const decision = summary?.decision;
  const structure = summary?.market_structure;
  const fib = summary?.fibonacci;
  const sZones = summary?.support_zones || [];
  const rZones = summary?.resistance_zones || [];
  const tradeSetup = summary?.trade_setup;
  const eduPanel = summary?.educational_panel;
  const indAnalysis = summary?.indicators_analysis;
  const btMetrics = backtestData?.metrics || summary?.backtest_summary || {};

  const getDecisionBadgeStyle = (code: string) => {
    const upper = (code || '').toUpperCase();
    if (upper.includes('BUY CONFIRMED')) return 'bg-emerald-600 border-emerald-700 text-white';
    if (upper.includes('BUY WATCH')) return 'bg-amber-500 border-amber-600 text-white';
    if (upper.includes('SELL') || upper.includes('EXIT')) return 'bg-rose-600 border-rose-700 text-white';
    if (upper.includes('AVOID')) return 'bg-slate-800 border-slate-900 text-rose-300';
    return 'bg-slate-600 border-slate-700 text-white';
  };

  const getScoreColor = (val: number) => {
    if (val >= 70) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (val >= 55) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
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

  return (
    <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm min-h-screen rtl" dir="rtl">
      {/* 1. شريط البحث واختيار الإطار الزمني */}
      <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
              <span>📊</span> غرفة التحليل الكمّي والتعليمي (Quant Analysis Room)
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-1">
              تحليل متعدد الأطر الزمنية • هيكل السوق • دعوم ومقاومات مختبرة • نظام تعليمي تفاعلي
            </p>
          </div>

          {/* أزرار الأطر الزمنية الـ 5 */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: '15m', label: '15 دقيقة' },
              { id: '1h', label: 'ساعة' },
              { id: '1d', label: 'يومي' },
              { id: '1wk', label: 'أسبوعي' },
              { id: '1mo', label: 'شهري' }
            ].map((tf) => (
              <button
                key={tf.id}
                onClick={() => {
                  setInterval(tf.id);
                  if (symbol) analyzeStock(symbol, tf.id);
                }}
                className={`px-4 py-2 rounded-xl font-black text-xs md:text-sm transition-all cursor-pointer ${
                  interval === tf.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* حقل إدخال رمز السهم */}
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase().replace('.CA', ''))}
            placeholder="أدخل كود السهم في البورصة المصرية (مثال: COMI أو TMGH أو SWDY)"
            className="flex-1 border-2 border-slate-200 p-3.5 rounded-2xl text-center font-black text-lg uppercase focus:outline-none focus:border-indigo-600 bg-slate-50"
            onKeyDown={(e) => e.key === 'Enter' && analyzeStock()}
          />
          <button
            id="analyze-btn"
            onClick={() => analyzeStock()}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 px-8 rounded-2xl transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span> جاري التحليل الكمي...
              </>
            ) : (
              <>
                <span>⚡</span> حلل السهم الآن
              </>
            )}
          </button>
        </div>
      </div>

      {/* قائمة الأسهم المرشحة السريعة */}
      <div className="mb-6">
        <CandidatesList />
      </div>

      {error && (
        <div className="bg-rose-50 border-r-4 border-rose-500 p-4 rounded-2xl mb-6 flex items-center gap-3 shadow-sm">
          <span className="text-2xl">⚠️</span>
          <p className="text-rose-800 font-bold text-sm md:text-base">{error}</p>
        </div>
      )}

      {/* عرض نتائج غرفة التحليل الكمي */}
      {summary && (
        <div className="space-y-6">
          {/* 2. الشريط العلوي: السعر، الاتجاه، الإطار الأكبر، والقرار النهائي */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">السهم والإطار الزمني</span>
                <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md">
                  {summary.timeframe_ar || interval}
                </span>
              </div>
              <div className="my-2">
                <h2 className="text-2xl font-black text-slate-900">
                  {summary.symbol || data.symbol}{' '}
                  <span className="text-sm font-bold text-slate-500">({summary.name || ''})</span>
                </h2>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900" dir="ltr">
                    {summary.current_price ?? 'N/A'}
                  </span>
                  <span className="text-xs font-bold text-slate-400">ج.م</span>
                  {summary.daily_change_pct !== undefined && summary.daily_change_pct !== null && (
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded ${
                        Number(summary.daily_change_pct) >= 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                      dir="ltr"
                    >
                      {Number(summary.daily_change_pct) >= 0
                        ? `+${summary.daily_change_pct}%`
                        : `${summary.daily_change_pct}%`}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-[11px] font-bold text-slate-400">
                آخر شمعة مؤكدة: {summary.last_bar_date || 'محدث'}
              </div>
            </div>

            {/* حالة الاتجاه وهيكل السوق */}
            <div className="md:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">الاتجاه العام والهيكل السعري (Market Structure)</span>
                {summary.higher_timeframe_context && (
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg">
                    الإطار الأكبر ({summary.higher_timeframe_context.timeframe_ar}): {summary.higher_timeframe_context.trend_label_ar}
                  </span>
                )}
              </div>
              <div className="my-2">
                <div className="text-xl font-black text-indigo-950">
                  {summary.trend_ar || structure?.trend_label_ar || summary.trend}
                </div>
                <div className="text-xs font-bold text-slate-600 mt-1">
                  تسلسل القمم والقيعان: <span className="text-indigo-700">{structure?.structure_sequence || 'قيد التكوين'}</span>
                </div>
                {structure && (structure.bos_state !== 'NONE' || structure.choch_state !== 'NONE') && (
                  <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg mt-2 inline-block">
                    {structure.bos_state !== 'NONE' ? structure.bos_label_ar : structure.choch_label_ar}
                  </div>
                )}
              </div>
              <div className="text-xs font-bold text-rose-600">
                مستوى إبطال الهيكل الحالي: {structure?.invalidation_level ? `${structure.invalidation_level} ج.م` : 'غير محدد'}
              </div>
            </div>

            {/* القرار النهائي الهيكلي */}
            <div className={`md:col-span-4 p-5 rounded-3xl border shadow-sm flex flex-col justify-between ${getDecisionBadgeStyle(decision?.decision_code || summary.action)}`}>
              <div className="flex justify-between items-center opacity-90">
                <span className="text-xs font-bold">القرار الكمي النهائي</span>
                <span className="text-xs font-black bg-black/20 px-2.5 py-0.5 rounded-md">
                  المخاطرة: {decision?.risk_level_ar || 'محددة'}
                </span>
              </div>
              <div className="my-2">
                <div className="text-xl md:text-2xl font-black leading-snug">
                  {decision?.decision_label_ar || summary.action}
                </div>
                <p className="text-xs font-medium opacity-95 mt-1.5 leading-relaxed">
                  {decision?.meaning_ar || (summary.details && summary.details[0])}
                </p>
              </div>
            </div>
          </div>

          {/* 3. المؤشر الرباعي لجودة الفرصة (القسم 8: 4 درجات مفصولة) */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
              <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                <span>⚖️</span> مؤشر جودة الفرصة الرباعي المستقل (Opportunity Quality Matrix)
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                * هذه الدرجات تقيس توافق الشروط الفنية والتاريخية ولا تعني ضماناً إحصائياً للربح المستقبلي
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-2xl border ${getScoreColor(Number(scores.technical_quality_score))}`}>
                <span className="text-xs font-bold block opacity-80">1. الجودة الفنية (Technical)</span>
                <span className="text-2xl font-black mt-1 block" dir="ltr">
                  {scores.technical_quality_score} / 100
                </span>
                <span className="text-[11px] font-medium block mt-1 opacity-90">
                  الاتجاه، الزخم، الهيكلة، والسيولة
                </span>
              </div>

              <div className={`p-4 rounded-2xl border ${getScoreColor(Number(scores.entry_readiness_score))}`}>
                <span className="text-xs font-bold block opacity-80">2. جاهزية الدخول (Readiness)</span>
                <span className="text-2xl font-black mt-1 block" dir="ltr">
                  {scores.entry_readiness_score} / 100
                </span>
                <span className="text-[11px] font-medium block mt-1 opacity-90">
                  شمعة التأكيد، عدم التمدد، و R:R
                </span>
              </div>

              <div className={`p-4 rounded-2xl border ${getScoreColor(Number(scores.backtest_quality_score))}`}>
                <span className="text-xs font-bold block opacity-80">3. جودة الاختبار التاريخي (Backtest)</span>
                <span className="text-2xl font-black mt-1 block" dir="ltr">
                  {scores.backtest_quality_score} / 100
                </span>
                <span className="text-[11px] font-medium block mt-1 opacity-90">
                  Profit Factor، التوقع R، وحجم العينة
                </span>
              </div>

              <div className={`p-4 rounded-2xl border ${getScoreColor(Number(scores.data_quality_score))}`}>
                <span className="text-xs font-bold block opacity-80">4. جودة البيانات (Data Quality)</span>
                <span className="text-2xl font-black mt-1 block" dir="ltr">
                  {scores.data_quality_score} / 100
                </span>
                <span className="text-[11px] font-medium block mt-1 opacity-90">
                  اكتمال الشموع، الحداثة، والسيولة
                </span>
              </div>
            </div>
          </div>

          {/* 4. الرسم البياني التفاعلي (القسم 10) */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <StockChart
              symbol={(summary.symbol || data.symbol).replace('.CA', '')}
              interval={interval}
              chartPayload={summary.chart_payload}
            />
          </div>

          {/* 5. تفصيل القرار الفني وخطة التداول المحققة (القسم 6 والقسم 7) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* تفاصيل القرار الفني الـ 6 */}
            {decision && (
              <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span>🧭</span> تشريح القرار الفني ({decision.decision_code})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4">
                    <h4 className="text-xs font-black text-emerald-800 mb-2">✅ ما الذي تحقق فعلياً؟</h4>
                    <ul className="space-y-1.5 text-xs font-medium text-emerald-950">
                      {(decision.what_achieved || []).map((item: string, i: number) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4">
                    <h4 className="text-xs font-black text-amber-800 mb-2">⏳ ما الذي لم يتحقق بعد؟</h4>
                    <ul className="space-y-1.5 text-xs font-medium text-amber-950">
                      {(decision.what_missing || []).length > 0 ? (
                        decision.what_missing.map((item: string, i: number) => <li key={i}>• {item}</li>)
                      ) : (
                        <li>• جميع الشروط الأساسية مكتملة.</li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5">
                    <span className="font-black text-blue-900 block mb-1">🎯 الشرط المؤكد للإشارة:</span>
                    <span className="text-blue-800 font-medium">{decision.confirmation_condition_ar}</span>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5">
                    <span className="font-black text-rose-900 block mb-1">🛑 شرط إبطال السيناريو:</span>
                    <span className="text-rose-800 font-medium">{decision.invalidation_condition_ar}</span>
                  </div>
                </div>

                {decision.contradicting_evidence && decision.contradicting_evidence.length > 0 && (
                  <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4">
                    <h4 className="text-xs font-black text-slate-700 mb-1.5">⚠️ أدلة متعارضة أو تحذيرات يجب مراعاتها:</h4>
                    <ul className="space-y-1 text-xs text-slate-600 font-medium">
                      {decision.contradicting_evidence.map((c: string, i: number) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* بطاقة خطة التداول وإدارة المخاطر (القسم 7) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <span>📐</span> خطة التداول وإدارة المخاطر
                </h3>

                {tradeSetup && tradeSetup.plan_valid && tradeSetup.entry && tradeSetup.stop && tradeSetup.tp1 ? (
                  <div className="space-y-3">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-center">
                      <span className="text-xs text-indigo-500 font-bold block">الاستراتيجية المعتمدة</span>
                      <span className="text-sm font-black text-indigo-950">{tradeSetup.strategy}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-xs font-bold text-slate-600">منطقة الدخول (Entry Zone)</span>
                      <span className="text-base font-black text-slate-900" dir="ltr">
                        {tradeSetup.entry_zone || tradeSetup.entry}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-xl bg-rose-50 border border-rose-200">
                      <span className="text-xs font-bold text-rose-700">وقف الخسارة (Stop Loss)</span>
                      <span className="text-base font-black text-rose-700" dir="ltr">
                        {tradeSetup.stop} ج.م
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                        <span className="text-[11px] font-bold text-emerald-700 block">الهدف 1 (TP1)</span>
                        <span className="text-sm font-black text-emerald-800" dir="ltr">{tradeSetup.tp1}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                        <span className="text-[11px] font-bold text-emerald-700 block">الهدف 2 (TP2)</span>
                        <span className="text-sm font-black text-emerald-800" dir="ltr">{tradeSetup.tp2 || '-'}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50/40 border border-emerald-200">
                        <span className="text-[11px] font-bold text-emerald-700 block">الهدف 3 (TP3)</span>
                        <span className="text-sm font-black text-emerald-800" dir="ltr">{tradeSetup.tp3 || '-'}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-xl bg-purple-50 border border-purple-200">
                      <span className="text-xs font-bold text-purple-800">العائد إلى المخاطرة (Risk/Reward)</span>
                      <span className="text-base font-black text-purple-900" dir="ltr">
                        1 : {tradeSetup.risk_reward}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 font-medium space-y-1 pt-2">
                      <div>⏱️ <strong>مدة الاحتفاظ المتوقعة:</strong> {tradeSetup.expected_holding_days}</div>
                      <div>🛑 <strong>شرط الإبطال:</strong> {tradeSetup.invalidation}</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center my-4">
                    <span className="text-3xl block mb-2">🛡️</span>
                    <h4 className="text-sm font-black text-amber-900 mb-1">
                      لا توجد خطة صفقة صالحة حالياً (WAIT / WATCH)
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      يرفض المحرك الكمي إنشاء أرقام دخول أو وقف خسارة اصطناعية لأن السعر الحالي لا يحقق نسبة عائد إلى مخاطرة منطقية أو لم تكتمل شروط الاستراتيجية بعد.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 6. جدول مناطق الدعم والمقاومة المختبرة + محرك فيبوناتشي (القسم 4 والقسم 5) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <span>🧱</span> مناطق الدعم والمقاومة التاريخية المستقلة
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-black text-emerald-700 mb-2">🟢 مناطق الدعم (Supports):</h4>
                  {sZones.length === 0 ? (
                    <p className="text-xs text-slate-400">لا توجد مناطق دعم مختبرة قريبة.</p>
                  ) : (
                    <div className="space-y-2">
                      {sZones.map((z: any, i: number) => (
                        <div key={i} className="p-3 rounded-2xl bg-emerald-50/40 border border-emerald-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs">
                          <div>
                            <span className="font-black text-emerald-900" dir="ltr">
                              S{i + 1}: {z.low} - {z.high} ج.م
                            </span>{' '}
                            <span className="text-slate-500">(المحور: {z.mid})</span>
                            <p className="text-[11px] text-slate-600 mt-0.5">{z.reason_ar}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-white px-2 py-1 rounded border border-emerald-200 font-bold text-emerald-800">
                              ارتدادات: {z.successful_bounces}/{z.tests_count}
                            </span>
                            <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-black">
                              القوة: {z.strength_score}/100
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-black text-rose-700 mb-2">🔴 مناطق المقاومة (Resistances):</h4>
                  {rZones.length === 0 ? (
                    <p className="text-xs text-slate-400">لا توجد مناطق مقاومة تاريخية قريبة (أمام السهم قمم جديدة).</p>
                  ) : (
                    <div className="space-y-2">
                      {rZones.map((z: any, i: number) => (
                        <div key={i} className="p-3 rounded-2xl bg-rose-50/40 border border-rose-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs">
                          <div>
                            <span className="font-black text-rose-900" dir="ltr">
                              R{i + 1}: {z.low} - {z.high} ج.م
                            </span>{' '}
                            <span className="text-slate-500">(المحور: {z.mid})</span>
                            <p className="text-[11px] text-slate-600 mt-0.5">{z.reason_ar}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-white px-2 py-1 rounded border border-rose-200 font-bold text-rose-800">
                              اختبارات: {z.tests_count}
                            </span>
                            <span className="bg-rose-600 text-white px-2.5 py-1 rounded-lg font-black">
                              القوة: {z.strength_score}/100
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* بطاقة Fibonacci الموثقة بالتواريخ والتوافق */}
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <span>🌀</span> قياس فيبوناتشي والتوافق السعري (Fibonacci)
              </h3>

              {fib && fib.is_valid ? (
                <div className="space-y-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="font-black text-indigo-950 mb-1">{fib.direction_ar}</div>
                    <div className="text-slate-600 flex justify-between">
                      <span>البداية: <strong>{fib.start_point?.price}</strong> ({fib.start_point?.date})</span>
                      <span>النهاية: <strong>{fib.end_point?.price}</strong> ({fib.end_point?.date})</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-black text-slate-700 block">مستويات التصحيح والتوافق مع الدعوم/المقاومات:</span>
                    {(fib.confluence_analysis || []).map((c: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex justify-between items-center ${
                          c.has_sr_confluence ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <span className="font-black text-slate-900">فيبوناتشي {c.ratio}: </span>
                          <span className="font-black text-indigo-700" dir="ltr">{c.price} ج.م</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          c.has_sr_confluence ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {c.has_sr_confluence ? '🔥 متوافق مع دعم/مقاومة' : 'مستوى حسابي منفرد'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-100 font-medium">
                    {fib.invalidation_rule_ar}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">{fib?.reason || 'البيانات الحالية لا تشكل موجة قياس فيبوناتشي مكتملة.'}</p>
              )}
            </div>
          </div>

          {/* 7. نتائج الاختبار التاريخي المؤسسي (القسم 11) */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
              <div>
                <h3 className="text-base font-black text-amber-400 flex items-center gap-2">
                  <span>🧪</span> الاختبار التاريخي الخالي من الانحياز (Walk-Forward Out-of-Sample Backtest)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  الفترة المختبرة: {btMetrics.tested_period || 'البيانات المتاحة'} • شامل 0.45% عمولات وانزلاق سعري ذهاباً وإياباً
                </p>
              </div>
              {btMetrics.sample_warning || btMetrics.warning_message ? (
                <span className="bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold px-3 py-1 rounded-xl">
                  ⚠️ {btMetrics.sample_warning || btMetrics.warning_message}
                </span>
              ) : (
                <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold px-3 py-1 rounded-xl">
                  ✓ عينة تاريخية صالحة
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
              <div className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700">
                <span className="text-[11px] text-slate-400 block">عدد الصفقات</span>
                <span className="text-xl font-black text-white" dir="ltr">
                  {btMetrics.trades_count ?? btMetrics.total_trades ?? 0}
                </span>
              </div>
              <div className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700">
                <span className="text-[11px] text-slate-400 block">معدل الفوز (Win Rate)</span>
                <span className="text-xl font-black text-emerald-400" dir="ltr">
                  {btMetrics.win_rate_pct ?? btMetrics.win_rate ?? 0}%
                </span>
              </div>
              <div className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700">
                <span className="text-[11px] text-slate-400 block">Profit Factor</span>
                <span className={`text-xl font-black ${Number(btMetrics.profit_factor) >= 1.15 ? 'text-blue-400' : 'text-rose-400'}`} dir="ltr">
                  {btMetrics.profit_factor ?? 0}
                </span>
              </div>
              <div className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700">
                <span className="text-[11px] text-slate-400 block">التوقع الرياضي (Expectancy)</span>
                <span className={`text-xl font-black ${Number(btMetrics.expectancy_r) > 0 ? 'text-emerald-400' : 'text-rose-400'}`} dir="ltr">
                  {btMetrics.expectancy_r ?? 0} R
                </span>
              </div>
              <div className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700">
                <span className="text-[11px] text-slate-400 block">أقصى تراجع (Max DD)</span>
                <span className="text-xl font-black text-rose-400" dir="ltr">
                  {btMetrics.max_drawdown_pct ?? 0}%
                </span>
              </div>
              <div className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700">
                <span className="text-[11px] text-slate-400 block">فوز خارج العينة (OOS)</span>
                <span className="text-xl font-black text-indigo-300" dir="ltr">
                  {btMetrics.oos_win_rate ?? btMetrics.out_of_sample_win_rate_pct ?? 0}% ({btMetrics.oos_trades ?? btMetrics.out_of_sample_trades ?? 0})
                </span>
              </div>
            </div>
          </div>

          {/* 8. النظام التعليمي التفاعلي: لوحة «تعلم من تحليل السهم» + «لماذا صدر القرار؟» (القسم 9) */}
          {eduPanel && (
            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 text-white p-6 md:p-8 rounded-3xl border border-indigo-800/50 shadow-xl space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-indigo-800/60 pb-5">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-3 py-1 rounded-full">
                    🎓 النظام التعليمي التفاعلي المباشر
                  </span>
                  <h2 className="text-2xl font-black mt-2 text-white">
                    {eduPanel.panel_title || `تعلم من تحليل السهم (${summary.symbol})`}
                  </h2>
                  <p className="text-xs text-indigo-200 mt-1">
                    جميع الشروحات والأمثلة أدناه محسوبة لحظياً من أرقام السهم الفعلية على الإطار الزمني المختار بدون أي نصوص جامدة.
                  </p>
                </div>

                {/* أزرار المستويات التعليمية الـ 3 */}
                <div className="flex gap-2 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700">
                  {[
                    { id: 'beginner', label: '🌱 المستوى 1: مبتدئ' },
                    { id: 'intermediate', label: '⚡ المستوى 2: متوسط' },
                    { id: 'advanced', label: '🦅 المستوى 3: متقدم' }
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setEduLevel(lvl.id as any)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        eduLevel === lvl.id
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* محتوى المستوى التعليمي المختار */}
              {eduPanel.levels && eduPanel.levels[eduLevel] && (
                <div className="bg-slate-800/60 border border-indigo-500/30 rounded-2xl p-5">
                  <h3 className="text-base font-black text-amber-400 mb-4">
                    {eduPanel.levels[eduLevel].title}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(eduPanel.levels[eduLevel].lessons || []).map((lesson: any, i: number) => (
                      <div key={i} className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/80">
                        <h4 className="text-sm font-black text-indigo-300 mb-2">💡 {lesson.topic}</h4>
                        <p className="text-xs text-slate-200 leading-relaxed">{lesson.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* بطاقات المؤشرات التعليمية التفصيلية */}
              <div>
                <h3 className="text-base font-black text-white mb-3 flex items-center gap-2">
                  <span>🔬</span> تشريح المؤشرات الفنية للسهم حالياً (اضغط على أي مؤشر للتركيز عليه)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(eduPanel.indicator_cards || []).map((card: any) => {
                    const isSelected = selectedIndicatorId === card.id;
                    return (
                      <div
                        key={card.id}
                        onClick={() => setSelectedIndicatorId(isSelected ? null : card.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-900/70 border-amber-400 shadow-lg'
                            : 'bg-slate-800/70 border-slate-700 hover:border-indigo-500/50'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h4 className="text-sm font-black text-white">{card.name}</h4>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md whitespace-nowrap ${
                              card.stance?.includes('الشراء')
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : card.stance?.includes('البيع') || card.stance?.includes('الحذر')
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {card.stance}
                          </span>
                        </div>

                        <div className="text-xs font-black text-indigo-300 bg-slate-900/90 px-3 py-1.5 rounded-lg mb-2.5" dir="ltr">
                          {card.current_value}
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <p className="text-slate-300">
                            <strong className="text-white">التفسير:</strong> {card.explanation_ar}
                          </p>
                          <p className="text-emerald-300">
                            <strong className="text-white">الدلالة الحالية:</strong> {card.current_meaning_ar}
                          </p>
                          <p className="text-amber-200/90">
                            <strong className="text-amber-300">مثال السهم الفعلي:</strong> {card.live_example_ar}
                          </p>
                          <p className="text-rose-300/90 pt-1 border-t border-slate-700/80 text-[11px]">
                            <strong>حدود المؤشر (ما لا يثبته):</strong> {card.limitation_ar}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* أداة «لماذا صدر القرار؟» — السلسلة المنطقية من 8 مراحل */}
              <div>
                <h3 className="text-base font-black text-amber-400 mb-4 flex items-center gap-2">
                  <span>🔗</span> أداة «لماذا صدر القرار؟» (السلسلة المنطقية الكاملة من البيانات الفعلية)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {(eduPanel.why_decision_chain || []).map((node: any) => (
                    <div key={node.step} className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-2xl relative">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                          {node.step}
                        </span>
                        <span className="text-xs font-black text-indigo-300">{node.stage}</span>
                      </div>
                      <p className="text-xs text-slate-200 font-medium leading-relaxed">{node.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 9. التقرير الفني الكامل الموثق */}
          {summary.report_text && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="max-w-5xl mx-auto">{renderReport(summary.report_text)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-lg font-bold text-slate-400 animate-pulse">
          جاري تحميل غرفة التحليل الكمّي...
        </div>
      }
    >
      <AnalysisContent />
    </Suspense>
  );
}