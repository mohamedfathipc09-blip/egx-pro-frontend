'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import StockChart from '@/components/StockChart'; 

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
      const res = await fetch(`https://egx-pro-api.onrender.com/api/analyze/${targetSymbol}?interval=${interval}`);
      if (!res.ok) throw new Error('فشل جلب البيانات، تأكد من كود السهم.');
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

  // دالة ذكية لترجمة وتنسيق الماركداون وعرضه بشكل جمالي
  const renderReport = (text: string) => {
    if (!text) return null;
    
    // إصلاح مشكلة عدم وجود مسافات من الـ AI
    const cleanText = text.replace(/##/g, '\n##').replace(/- \*\*/g, '\n- **');
    
    return cleanText.split('\n').map((line, idx) => {
      const t = line.trim();
      if (!t) return null;
      
      if (t.startsWith('## ')) {
        return <h3 key={idx} className="text-xl font-black text-blue-900 mt-8 mb-4 border-b-2 border-blue-100 pb-2">{t.replace('## ', '')}</h3>;
      }
      if (t.startsWith('# ')) {
        return <h2 key={idx} className="text-2xl font-black text-gray-800 mb-6 bg-gray-100 p-4 rounded-xl border-r-4 border-blue-600 shadow-sm">{t.replace('# ', '')}</h2>;
      }
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

  return (
    <div className="bg-gray-50 p-4 md:p-8 rounded-xl border border-gray-200 shadow-sm min-h-screen">
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-gray-100">
        <h1 className="text-3xl font-black text-gray-800 mb-6 flex items-center gap-3">
          <span className="text-4xl">📊</span> غرفة التحليل الكمّي
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
          
          {/* Dashboard العلوية */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center relative overflow-hidden">
              <p className="text-sm text-gray-500 font-bold mb-2">السعر الحالي</p>
              <p className="text-3xl font-black text-gray-800" dir="ltr">{data.summary.current_price}</p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center relative overflow-hidden">
              <p className="text-sm text-gray-500 font-bold mb-2">التقييم الكمّي (Score)</p>
              <p className={`text-3xl font-black ${data.summary.score >= 70 ? 'text-green-600' : data.summary.score <= 45 ? 'text-red-600' : 'text-orange-600'}`} dir="ltr">
                {data.summary.score} <span className="text-sm text-gray-400">/ 100</span>
              </p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-center">
              <p className="text-sm text-gray-500 font-bold mb-2">الدعم 🟢 / المقاومة 🔴</p>
              <p className="text-xl font-black text-gray-800" dir="ltr">
                <span className="text-green-600">{data.summary.nearest_support || 'N/A'}</span>
                <span className="mx-2 text-gray-300">|</span>
                <span className="text-red-600">{data.summary.nearest_resistance || 'N/A'}</span>
              </p>
            </div>
            
            <div className={`p-5 rounded-2xl border shadow-sm text-center flex flex-col justify-center ${
              data.summary.action.includes('شراء') ? 'bg-green-600 border-green-700 text-white' :
              data.summary.action.includes('خروج') || data.summary.action.includes('تجنب') ? 'bg-red-600 border-red-700 text-white' :
              'bg-orange-500 border-orange-600 text-white'
            }`}>
              <p className="text-sm font-bold opacity-90 mb-1">القرار الفني</p>
              <p className="text-2xl font-black">{data.summary.action}</p>
            </div>
          </div>

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

          {/* 👈 التقرير تم نقله للأسفل وأصبح يعرض بعرض الشاشة بالكامل */}
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