'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function RadarPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLiveScan, setIsLiveScan] = useState(false);

  // دالة لجلب الرادار المحفوظ (عشان ميضطرش يستنى التحميل كل مرة يفتح الصفحة)
  const fetchLatestRadar = async () => {
    setLoading(true);
    setError('');
    try {
      const isLocal = window.location.hostname === 'localhost';
      const baseUrl = isLocal ? 'http://localhost:8000' : 'https://egx-pro-api.onrender.com';
      
      const res = await fetch(`${baseUrl}/api/radar/latest`);
      if (!res.ok) throw new Error('فشل جلب أحدث بيانات للرادار.');
      const result = await res.json();
      setData(result.scan_results || null);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  };

  // دالة لتشغيل فحص حي جديد للسوق (بياخد وقت أطول)
  const runLiveRadar = async () => {
    setLoading(true);
    setError('');
    setIsLiveScan(true);
    try {
      const isLocal = window.location.hostname === 'localhost';
      const baseUrl = isLocal ? 'http://localhost:8000' : 'https://egx-pro-api.onrender.com';
      
      const res = await fetch(`${baseUrl}/api/radar`);
      if (!res.ok) throw new Error('فشل تشغيل الفحص الحي للسوق.');
      const result = await res.json();
      setData(result.scan_results || null);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء فحص السوق.');
    } finally {
      setLoading(false);
      setIsLiveScan(false);
    }
  };

  useEffect(() => {
    fetchLatestRadar();
  }, []);

  // ترتيب الفرص بناءً على أعلى Quant Score
  const sortedSignals = data?.signals?.sort((a: any, b: any) => (b.score || 0) - (a.score || 0)) || [];

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-8">
      {/* الهيدر الرئيسي للرادار */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm mb-8 border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3 mb-2">
            <span className="text-4xl">📡</span> رادار الفرص الكمّي (Quant Radar)
          </h1>
          <p className="text-gray-500 font-medium">يتم فحص السوق وتصفية الأسهم بناءً على السيولة، الاتجاه، ومعدل العائد للمخاطرة.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={fetchLatestRadar}
            disabled={loading}
            className="flex-1 md:flex-none bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
          >
            🔄 تحديث العرض
          </button>
          <button 
            onClick={runLiveRadar}
            disabled={loading}
            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLiveScan ? <><span className="animate-spin text-lg">⏳</span> جاري المسح...</> : <><span className="text-lg">⚡</span> فحص السوق الآن</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-8 flex items-center gap-3 shadow-sm">
          <span className="text-2xl">⚠️</span>
          <p className="text-red-700 font-bold">{error}</p>
        </div>
      )}

      {/* شريط ملخص الفحص */}
      {data && data.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
            <p className="text-xs text-gray-500 font-bold mb-1 uppercase">إجمالي الأسهم</p>
            <p className="text-2xl font-black text-gray-800" dir="ltr">{data.summary.total_scanned}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center border-b-4 border-b-green-500">
            <p className="text-xs text-green-600 font-bold mb-1 uppercase">فرص متاحة</p>
            <p className="text-2xl font-black text-green-600" dir="ltr">{data.summary.with_signals_count}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
            <p className="text-xs text-gray-500 font-bold mb-1 uppercase">أسهم محايدة</p>
            <p className="text-2xl font-black text-gray-600" dir="ltr">{data.summary.scanned_no_signal?.length || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
            <p className="text-xs text-gray-500 font-bold mb-1 uppercase">استبعاد (سيولة/أخطاء)</p>
            <p className="text-2xl font-black text-red-400" dir="ltr">{data.summary.excluded?.length || 0}</p>
          </div>
        </div>
      )}

      {/* حالة التحميل */}
      {loading && !isLiveScan && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <span className="text-4xl animate-bounce mb-4">📡</span>
          <h2 className="text-xl font-bold">جاري تحميل أحدث الفرص...</h2>
        </div>
      )}
      {loading && isLiveScan && (
        <div className="flex flex-col items-center justify-center py-20 text-blue-600">
          <span className="text-5xl animate-spin mb-4">⚙️</span>
          <h2 className="text-xl font-bold">جاري فحص جميع أسهم البورصة وتطبيق الخوارزميات...</h2>
          <p className="text-sm mt-2 text-gray-500">قد تستغرق هذه العملية بضع دقائق</p>
        </div>
      )}

      {/* شبكة الفرص (Grid) */}
      {!loading && sortedSignals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedSignals.map((signal: any, idx: number) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group relative">
              
              {/* شريط علوي ملون حسب الـ Score */}
              <div className={`h-2 w-full ${signal.score >= 80 ? 'bg-green-500' : 'bg-blue-400'}`}></div>
              
              <div className="p-5 flex-1">
                {/* الهيدر (اسم السهم والسكور) */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 leading-none">{signal.symbol}</h3>
                    <p className="text-xs text-gray-500 mt-1 font-medium truncate max-w-[150px]" title={signal.name}>{signal.name}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg font-black text-lg ${signal.score >= 80 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`} dir="ltr">
                    {signal.score}
                  </div>
                </div>

                {/* القرار الفني */}
                <div className={`mb-4 px-3 py-1.5 rounded text-center font-bold text-sm ${signal.signal.includes('قوي') ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                  {signal.signal}
                </div>

                {/* خطة التداول السريعة */}
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-gray-500 font-bold">دخول</span>
                    <span className="text-sm font-black text-gray-900" dir="ltr">{signal.entry || signal.price}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-gray-500 font-bold">هدف أول (TP1)</span>
                    <span className="text-sm font-black text-blue-600" dir="ltr">{signal.tp1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500 font-bold">وقف خسارة</span>
                    <span className="text-sm font-black text-red-500" dir="ltr">{signal.stop_loss}</span>
                  </div>
                </div>

                {/* العائد للمخاطرة R/R */}
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Risk/Reward</span>
                  <span className="text-sm font-black text-gray-800" dir="ltr">{signal.risk_reward} : 1</span>
                </div>
              </div>

              {/* زر التحليل المفصل */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 group-hover:bg-blue-50 transition-colors">
                <Link href={`/?symbol=${signal.symbol.replace('.CA', '')}`}>
                  <button className="w-full text-blue-600 font-bold text-sm py-2 flex justify-center items-center gap-2 group-hover:text-blue-800">
                    التحليل المفصل و Backtest <span>←</span>
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* لو مفيش فرص */}
      {!loading && sortedSignals.length === 0 && data?.summary && (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center shadow-sm">
          <span className="text-6xl mb-4 block">👀</span>
          <h2 className="text-2xl font-black text-gray-800 mb-2">لا توجد فرص قوية حالياً</h2>
          <p className="text-gray-500">السوق لا يلبي شروط المخاطرة الصارمة للنظام الكمّي. يرجى العودة لاحقاً.</p>
        </div>
      )}
    </div>
  );
}