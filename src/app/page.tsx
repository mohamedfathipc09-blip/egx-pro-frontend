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
    // استخدام السهم الممرر مباشرة أو السهم الموجود في مربع البحث
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
      setError(err.message || 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  };

  // التأثير ده هيشتغل أول ما الصفحة تفتح، ولو لقى سهم في الرابط هيحلله فوراً
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

  return (
    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">
        🔍 التحليل الفني المفصل للسهم
      </h1>
      
      <div className="flex gap-4 justify-center mb-6">
        <input 
          type="text" 
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="أدخل كود السهم (مثل: COMI)"
          className="border border-gray-300 p-3 rounded-lg w-64 text-center font-bold uppercase focus:outline-none focus:border-blue-500 bg-gray-50"
          onKeyDown={(e) => e.key === 'Enter' && analyzeStock()}
        />
        <button 
          id="analyze-btn"
          onClick={() => analyzeStock()}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors disabled:opacity-50 shadow-md"
        >
          {loading ? "جاري التحليل..." : "حلل السهم"}
        </button>
      </div>

      <div className="flex justify-center gap-3 mb-8 flex-wrap">
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
            className={`px-4 py-2 rounded-lg font-bold transition-all border ${
              interval === tf.val 
                ? "bg-blue-100 text-blue-700 border-blue-500 shadow-sm scale-105" 
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-600 text-center font-bold mb-4 bg-red-50 py-2 rounded">{error}</p>}

      {data && (
        <div className="flex flex-col gap-8 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
              <p className="text-sm text-gray-500">السعر الحالي</p>
              <p className="text-2xl font-bold text-gray-800">{data.summary.current_price}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
              <p className="text-sm text-gray-500">الاتجاه العام</p>
              <p className={`text-xl font-bold ${data.summary.trend.includes('صاعد') ? 'text-green-600' : 'text-red-600'}`}>
                {data.summary.trend}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
              <p className="text-sm text-gray-500">دعم / مقاومة (فيبو)</p>
              <p className="text-lg font-bold text-gray-700" dir="ltr">
                {data.summary.nearest_support} / {data.summary.nearest_resistance}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
              <p className="text-sm text-green-700 font-bold">المستهدف القادم 🎯</p>
              <p className="text-2xl font-bold text-green-700">{data.summary.target}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
              <p className="text-xs text-blue-600 font-bold mb-1">القرار {getIntervalLabel(interval)}</p>
              <p className={`text-xl font-bold ${data.summary.score >= 5 ? 'text-green-600' : 'text-red-600'}`}>
                {data.summary.action}
              </p>
            </div>
          </div>

          {data.summary.details && data.summary.details.length > 0 && (
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🤖 تقرير القراءة الفنية</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-gray-600 mb-3 border-b pb-2">التفاصيل:</h3>
                  <ul className="space-y-2">
                    {data.summary.details.map((detail: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 bg-white p-2 rounded border-r-4 border-blue-500 shadow-sm">{detail}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-gray-600 mb-3 border-b pb-2">الخلاصة:</h3>
                  <div className={`p-4 rounded-lg border shadow-sm ${data.summary.score >= 2 ? 'bg-green-100 border-green-300' : data.summary.score <= -2 ? 'bg-red-100 border-red-300' : 'bg-orange-100 border-orange-300'}`}>
                    <p className={`font-bold ${data.summary.score >= 2 ? 'text-green-900' : data.summary.score <= -2 ? 'text-red-900' : 'text-orange-900'}`}>
                      {data.summary.report_text}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-lg border border-gray-200">
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
    <Suspense fallback={<div className="p-12 text-center text-2xl font-bold text-gray-500 animate-pulse">جاري تحميل واجهة التحليل...</div>}>
      <AnalysisContent />
    </Suspense>
  );
}