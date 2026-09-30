'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import StockChart from '@/components/StockChart'; 
// 👈 استدعاء مكون الفرص المرشحة (تأكد من المسار الصحيح للملف لديك)
import CandidatesList from '@/components/CandidatesList'; 

function AnalysisContent() {
  const [symbol, setSymbol] = useState('');
  const [interval, setInterval] = useState('1d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  
  const [backtestData, setBacktestData] = useState<any>(null);
  const [loadingBacktest, setLoadingBacktest] = useState(false);

  const searchParams = useSearchParams();
  const urlSymbol = searchParams.get('symbol');

  const analyzeStock = async (overrideSymbol?: string, overrideInterval?: string) => {
    const targetSymbol = overrideSymbol || symbol;
    const targetInterval = overrideInterval || interval;
    
    if (!targetSymbol) {
      setError('يرجى إدخال كود السهم أولاً');
      return;
    }
    
    setLoading(true);
    setError('');
    setData(null);
    setBacktestData(null);

    try {
      const isLocal = window.location.hostname === 'localhost';
      const baseUrl = isLocal ? 'http://localhost:8000' : 'https://egx-pro-api.onrender.com';
      
      const res = await fetch(`${baseUrl}/api/analyze/${targetSymbol}?interval=${targetInterval}`);
      if (!res.ok) throw new Error('فشل جلب البيانات، تأكد من كود السهم.');
      const result = await res.json();
      
      if (!result || !result.summary || !result.summary.action) {
         throw new Error('لا توجد بيانات كافية لتحليل هذا السهم حالياً.');
      }
      
      setData(result);
      fetchBacktest(targetSymbol, baseUrl);
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
      console.error("خطأ في جلب بيانات الاختبار التاريخي", err);
    } finally {
      setLoadingBacktest(false);
    }
  };

  useEffect(() => {
    if (urlSymbol) {
      setSymbol(urlSymbol);
      analyzeStock(urlSymbol);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSymbol]);

  const renderReport = (text: string) => {
    if (!text) return null;
    const cleanText = text.replace(/##/g, '\n##').replace(/- \*\*/g, '\n- **');
    return cleanText.split('\n').map((line, idx) => {
      const t = line.trim();
      if (!t) return null;
      if (t.startsWith('## ')) return <h3 key={idx} className="text-xl font-black text-blue-900 mt-8 mb-4 border-b-2 border-blue-100 pb-2">{t.replace('## ', '')}</h3>;
      if (t.startsWith('# ')) return <h2 key={idx} className="text-2xl font-black text-gray-800 mb-6 bg-gray-100 p-4 rounded-xl border-r-4 border-blue-600 shadow-sm">{t.replace('# ', '')}</h2>;
      if (t.startsWith('- **')) {
        const parts = t.split('**');
        return (
          <li key={idx} className="mr-6 mb-3 text-gray-800 flex items-start gap-3">
            <span className="text-blue-500 mt-1 text-lg">▪</span>
            <span className="text-lg"><span className="font-bold text-gray-900">{parts[1]}</span>{parts[2]}</span>
          </li>
        );
      }
      if (t.startsWith('- ')) {
        return <li key={idx} className="mr-6 mb-2 text-gray-700 flex items-start gap-3">
          <span className="text-gray-400 mt-1 text-lg">▪</span>
          <span className="text-lg">{t.replace('- ', '')}</span>
        </li>;
      }
      return <p key={idx} className="text-gray-800 leading-relaxed mb-4 font-medium text-lg">{t}</p>;
    });
  };

  const getTrendArabic = (trend: string) => {
    if (!trend) return "غير واضح";
    if (trend.includes("UP")) return "صاعد ↗";
    if (trend.includes("DOWN")) return "هابط ↘";
    return "عرضي ➔";
  };

  const getActionArabic = (action: string) => {
    if (!action) return "محايد";
    const upperAction = action.toUpperCase();
    if (upperAction.includes("STRONG BUY") || action.includes("شراء قوي")) return "شراء قوي 🚀";
    if (upperAction === "BUY" || action.includes("مرجح")) return "شراء مرجح 🟢";
    if (upperAction.includes("STRONG SELL") || action.includes("خروج") || action.includes("تجنب")) return "خروج / تجنب 🛑";
    if (upperAction === "SELL" || action.includes("سلبي")) return "سلبي / بيع 🔴";
    return action;
  };

  return (
    <div className="bg-gray-50 p-4 md:p-8 rounded-xl border border-gray-200 shadow-sm min-h-screen">
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-gray-100">
        <h1 className="text-3xl font-black text-gray-800 mb-6 flex items-center gap-3">
          <span className="text-4xl">📊</span> غرفة التحليل الكمّي
        </h1>
        
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {['15m', '1h', '1d', '1wk', '1mo'].map((intv) => (
            <button
              key={intv}
              onClick={() => {
                setInterval(intv);
                if (symbol) {
                  analyzeStock(symbol, intv);
                }
              }}
              className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all duration-200 ${
                interval === intv 
                  ? 'bg-blue-100 text-blue-800 border-2 border-blue-600 shadow-sm' 
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {intv === '15m' ? '15 دقيقة' : intv === '1h' ? 'ساعة' : intv === '1d' ? 'يومي' : intv === '1wk' ? 'أسبوعي' : 'شهري'}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <input 
            type="text" 
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="أدخل كود السهم (مثل: COMI)"
            className="flex-1 border-2 border-gray-200 p-4 rounded-xl text-center font-black text-xl uppercase focus:outline-none focus:border-blue-600 bg-gray-50 transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && analyzeStock()}
          />
          <button 
            id="analyze-btn"
            onClick={() => analyzeStock()}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-10 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
          >
            {loading ? <><span className="animate-spin text-xl">⏳</span> جاري المعالجة...</> : <><span className="text-xl">⚡</span> حلل السهم الآن</>}
          </button>
        </div>
      </div>

      {/* 👈 قسم الفرص المرشحة تمت إضافته هنا كلوحة تحكم (Dashboard) مستقلة */}
      <div className="mb-8">
        <CandidatesList />
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6 flex items-center gap-3 shadow-sm animate-fade-in">
          <span className="text-2xl">⚠️</span>
          <p className="text-red-700 font-bold">{error}</p>
        </div>
      )}

      {data && data.summary && data.summary.action && (
        <div className="flex flex-col gap-6 animate-fade-in">
          
          {/* Dashboard العلوية */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center relative overflow-hidden">
              <p className="text-sm text-gray-500 font-bold mb-2">السعر الحالي</p>
              <p className="text-3xl font-black text-gray-800" dir="ltr">{data.summary.current_price}</p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center relative overflow-hidden">
              <p className="text-sm text-gray-500 font-bold mb-2">الاتجاه العام</p>
              <p className={`text-2xl font-black mt-1 ${data.summary.trend?.includes('UP') ? 'text-green-600' : data.summary.trend?.includes('DOWN') ? 'text-red-600' : 'text-gray-600'}`}>
                {getTrendArabic(data.summary.trend)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center relative overflow-hidden">
              <p className="text-sm text-gray-500 font-bold mb-2">التقييم الكمّي (Score)</p>
              <p className={`text-3xl font-black ${data.summary.score >= 70 ? 'text-green-600' : data.summary.score <= 45 ? 'text-red-600' : 'text-orange-600'}`} dir="ltr">
                {data.summary.score} <span className="text-sm text-gray-400">/ 100</span>
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
              <div className="flex justify-between items-center w-full px-2">
                <div className="text-center">
                  <p className="text-xs text-green-600 font-bold mb-1">الدعم 🟢</p>
                  <p className="text-xl font-black text-gray-800" dir="ltr">{data.summary.nearest_support || 'N/A'}</p>
                </div>
                <div className="h-8 w-px bg-gray-200 mx-1"></div>
                <div className="text-center">
                  <p className="text-xs text-red-600 font-bold mb-1">المقاومة 🔴</p>
                  <p className="text-xl font-black text-gray-800" dir="ltr">{data.summary.nearest_resistance || 'N/A'}</p>
                </div>
              </div>
            </div>
            
            <div className={`p-5 rounded-2xl border shadow-sm text-center flex flex-col justify-center ${
              getActionArabic(data.summary.action).includes('شراء') ? 'bg-green-600 border-green-700 text-white' :
              getActionArabic(data.summary.action).includes('خروج') || getActionArabic(data.summary.action).includes('سلبي') || getActionArabic(data.summary.action).includes('بيع') ? 'bg-red-600 border-red-700 text-white' :
              'bg-orange-500 border-orange-600 text-white'
            }`}>
              <p className="text-sm font-bold opacity-90 mb-1">القرار الفني</p>
              <p className="text-xl font-black leading-tight">{getActionArabic(data.summary.action)}</p>
            </div>
          </div>

          {/* قسم الاختبار التاريخي (Backtest Results) */}
          {loadingBacktest ? (
             <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm text-center animate-pulse">
               <p className="text-gray-500 font-bold">⏳ جاري إجراء الاختبار التاريخي للاستراتيجية (Backtesting)...</p>
             </div>
          ) : backtestData && backtestData.status === 'success' && backtestData.metrics && (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🕰️</div>
              <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span>⚡</span> أداء الاستراتيجية تاريخياً (Institutional Backtest)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                  <p className="text-xs text-slate-400 font-bold mb-1">نسبة النجاح (Win Rate)</p>
                  <p className={`text-2xl font-black ${backtestData.metrics.win_rate_pct >= 50 ? 'text-green-400' : 'text-red-400'}`} dir="ltr">{backtestData.metrics.win_rate_pct}%</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                  <p className="text-xs text-slate-400 font-bold mb-1">عامل الربح (Profit Factor)</p>
                  <p className="text-2xl font-black text-blue-400" dir="ltr">{backtestData.metrics.profit_factor}</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                  <p className="text-xs text-slate-400 font-bold mb-1">أقصى تراجع (Max Drawdown)</p>
                  <p className="text-2xl font-black text-red-400" dir="ltr">{backtestData.metrics.max_drawdown_pct}%</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                  <p className="text-xs text-slate-400 font-bold mb-1">عائد الاستثمار (Return)</p>
                  <p className={`text-2xl font-black ${backtestData.metrics.return_pct > 0 ? 'text-green-400' : 'text-red-400'}`} dir="ltr">{backtestData.metrics.return_pct}%</p>
                </div>
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                  <p className="text-xs text-slate-400 font-bold mb-1">إجمالي الصفقات</p>
                  <p className="text-2xl font-black text-slate-100" dir="ltr">{backtestData.metrics.total_trades}</p>
                </div>
              </div>
            </div>
          )}

          {/* تفصيل نقاط التقييم (Quant Scores Breakdown) */}
          {data.summary.details && data.summary.details.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">⚙️ تحليل العوامل (Factor Breakdown)</h3>
              <div className="flex flex-wrap gap-3">
                {data.summary.details.map((detail: string, idx: number) => {
                  const [label, scorePart] = detail.split(': ');
                  if(!scorePart) return null;
                  return (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-600">{label}</span>
                      <span className="text-sm font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded" dir="ltr">{scorePart}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* الشارت */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
             <StockChart symbol={data.symbol.replace('.CA', '')} interval={interval} />
          </div>

          {/* تقرير الذكاء الاصطناعي */}
          {data.summary.report_text && (
            <div className="bg-white p-6 md:p-10 rounded-2xl border border-gray-200 shadow-md mt-4 relative overflow-hidden">
              <div className="absolute top-4 left-4 text-6xl opacity-10 select-none pointer-events-none">📝</div>
              <div className="relative z-10 w-full max-w-5xl mx-auto">
                {renderReport(data.summary.report_text)}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xl font-bold text-gray-400 animate-pulse">جاري تحميل واجهة التحليل الكمّي...</div>}>
      <AnalysisContent />
    </Suspense>
  );
}