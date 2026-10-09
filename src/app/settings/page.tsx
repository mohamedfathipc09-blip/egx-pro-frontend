'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import StockChart from '@/components/StockChart'; 

// فصلنا المحتوى في مكون داخلي عشان نقدر نغلفه بـ Suspense (مهم جداً في Next.js)
function AnalysisContent() {
  const [symbol, setSymbol] = useState('');
  const [interval, setInterval] = useState('1d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  const searchParams = useSearchParams();
  const urlSymbol = searchParams.get('symbol');

  const analyzeStock = async (overrideSymbol?: string) => {
    const targetSymbol = overrideSymbol || symbol;
    
    if (!targetSymbol) {
      setError('يرجى إدخال كود السهم أولاً');
      return;
    }
    
    setLoading(true);
    setError('');
    setData(null);

    try {
      const res = await fetch(`// استبدل رابط localhost بالرابط السحابي ده
      const res = await fetch('https://egx-pro-api.onrender.com/api/recommendations/top10');}`);
      if (!res.ok) throw new Error('فشل جلب البيانات، تأكد من كود السهم أو استجابة السيرفر.');
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع أثناء التحليل.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlSymbol) {
      setSymbol(urlSymbol);
      analyzeStock(urlSymbol);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSymbol]);

  const getIntervalLabel = (val: string) => {
    switch(val) {
      case "15m": return "للمضاربة (15د)";
      case "1h": return "للمضاربة (ساعة)";
      case "1d": return "يومي (سوينج)";
      case "1wk": return "أسبوعي (متوسط)";
      case "1mo": return "شهري (استثماري)";
      default: return "";
    }
  };

  // 👈 دالة سحرية لترجمة الماركداون القادم من AI لتصميم احترافي
  const renderReport = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="text-lg font-black text-blue-900 mt-6 mb-3 border-b-2 border-blue-100 pb-1">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="text-2xl font-black text-gray-800 mb-6 bg-gray-100 p-3 rounded-lg border-r-4 border-blue-600">{line.replace('# ', '')}</h2>;
      }
      if (line.startsWith('- **')) {
        const parts = line.split('**');
        return (
          <li key={idx} className="mr-6 mb-2 text-gray-700 flex items-start gap-2">
            <span className="text-blue-500 mt-1">▪</span>
            <span><span className="font-bold text-gray-900">{parts[1]}</span>{parts[2]}</span>
          </li>
        );
      }
      if (line.startsWith('- ')) {
        return <li key={idx} className="mr-6 mb-2 text-gray-700 flex items-start gap-2">
          <span className="text-gray-400 mt-1">▪</span>
          <span>{line.replace('- ', '')}</span>
        </li>;
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-2"></div>;
      }
      return <p key={idx} className="text-gray-700 leading-relaxed mb-3 font-medium">{line}</p>;
    });
  };

  return (
    <div className="bg-gray-50 p-4 md:p-8 rounded-xl border border-gray-200 shadow-sm min-h-screen">
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-gray-100">
        <h1 className="text-3xl font-black text-gray-800 mb-6 flex items-center gap-3">
          <span className="text-4xl">📊</span> غرفة التحليل الكمّي (Quant Engine)
        </h1>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
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

        <div className="flex justify-center gap-2 flex-wrap">
          {[
            { label: "15 دقيقة", val: "15m" },
            { label: "ساعة", val: "1h" },
            { label: "يومي", val: "1d" },
            { label: "أسبوعي", val: "1wk" },
            { label: "شهري", val: "1mo" },
          ].map((tf) => (
            <button
              key={tf.val}
              onClick={() => {
                setInterval(tf.val);
                if (symbol && data) {
                  setTimeout(() => document.getElementById("analyze-btn")?.click(), 100);
                }
              }}
              className={`px-5 py-2.5 rounded-lg font-bold transition-all border-2 ${
                interval === tf.val 
                  ? "bg-blue-50 text-blue-700 border-blue-600 shadow-sm" 
                  : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6 flex items-center gap-3 shadow-sm">
          <span className="text-2xl">⚠️</span>
          <p className="text-red-700 font-bold">{error}</p>
        </div>
      )}

      {data && data.summary && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* لوحة المؤشرات العلوية (Top Dashboard) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-1 bg-gray-200"></div>
              <p className="text-sm text-gray-500 font-bold mb-1">السعر الحالي</p>
              <p className="text-3xl font-black text-gray-800" dir="ltr">{data.summary.current_price}</p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center flex flex-col justify-center relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-full h-1 ${data.summary.score >= 70 ? 'bg-green-500' : data.summary.score <= 45 ? 'bg-red-500' : 'bg-orange-500'}`}></div>
              <p className="text-sm text-gray-500 font-bold mb-1">التقييم الكمّي (Score)</p>
              <p className={`text-3xl font-black ${data.summary.score >= 70 ? 'text-green-600' : data.summary.score <= 45 ? 'text-red-600' : 'text-orange-600'}`} dir="ltr">
                {data.summary.score} <span className="text-sm text-gray-400">/ 100</span>
              </p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <p className="text-xs text-gray-400 text-center font-bold mb-3 uppercase tracking-wider">Zones</p>
              <div className="flex justify-between items-center px-1">
                <div className="text-center">
                  <span className="block text-[10px] text-green-600 font-black mb-1 bg-green-50 px-2 py-0.5 rounded">دعم</span>
                  <span className="block text-lg font-black text-green-700" dir="ltr">{data.summary.nearest_support || 'N/A'}</span>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="text-center">
                  <span className="block text-[10px] text-red-600 font-black mb-1 bg-red-50 px-2 py-0.5 rounded">مقاومة</span>
                  <span className="block text-lg font-black text-red-700" dir="ltr">{data.summary.nearest_resistance || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-1 bg-blue-500"></div>
              <p className="text-sm text-gray-500 font-bold mb-1">المستهدف الأقرب (TP1)</p>
              <p className="text-2xl font-black text-blue-700" dir="ltr">{data.summary.target || 'N/A'}</p>
            </div>
            
            <div className={`p-5 rounded-2xl border shadow-sm text-center flex flex-col justify-center ${
              data.summary.action.includes('STRONG BUY') || data.summary.action.includes('شراء قوي') ? 'bg-green-600 border-green-700 text-white' :
              data.summary.action.includes('BUY') || data.summary.action.includes('شراء') ? 'bg-green-100 border-green-300 text-green-800' :
              data.summary.action.includes('SELL') || data.summary.action.includes('بيع') ? 'bg-red-100 border-red-300 text-red-800' :
              'bg-gray-100 border-gray-300 text-gray-800'
            }`}>
              <p className="text-xs font-bold opacity-80 mb-1">القرار الفني</p>
              <p className="text-xl font-black uppercase tracking-wide">{data.summary.action}</p>
            </div>
          </div>

          {/* تفصيل نقاط التقييم (Quant Scores Breakdown) */}
          {data.summary.details && data.summary.details.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span>⚙️</span> تحليل العوامل المؤثرة (Factor Breakdown)
              </h3>
              <div className="flex flex-wrap gap-3">
                {data.summary.details.map((detail: string, idx: number) => {
                  const [label, scorePart] = detail.split(': ');
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

          {/* تقرير الذكاء الاصطناعي المؤسسي */}
          {data.summary.report_text && (
            <div className="bg-white p-6 md:p-10 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
              {/* زخرفة خلفية */}
              <div className="absolute -top-10 -left-10 text-9xl opacity-5 select-none pointer-events-none">🤖</div>
              
              <div className="relative z-10">
                {renderReport(data.summary.report_text)}
              </div>
            </div>
          )}

          {/* الشارت */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
             <StockChart symbol={data.symbol.replace('.CA', '')} interval={interval} />
          </div>
        </div>
      )}
    </div>
  );
}

// تصدير الصفحة الأساسية مغلفة بـ Suspense لضمان استقرار التطبيق
export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xl font-bold text-gray-400 animate-pulse">جاري تحميل واجهة التحليل الكمّي...</div>}>
      <AnalysisContent />
    </Suspense>
  );
}