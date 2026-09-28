'use client';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';

// تعريف شكل البيانات القادمة من الباك إند
export interface RadarResult {
  symbol: string;
  price: number;
  volume: number;
  rvol: number;
  rsi: number;
  reason: string;
}

export default function RadarPage() {
  const [results, setResults] = useState<RadarResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasScanned, setHasScanned] = useState(false);

  // 👈 التعديل الجديد: جلب آخر فحص محفوظ أول ما الصفحة تفتح
  useEffect(() => {
    const fetchLastScan = async () => {
      try {
        const res = await fetch('https://egx-pro-api.onrender.com/api/radar/latest');
        if (res.ok) {
          const data = await res.json();
          if (data.scan_results && data.scan_results.length > 0) {
            setResults(data.scan_results);
            setHasScanned(true); // نعتبره عمل فحص عشان يعرض الجدول
          }
        }
      } catch (err) {
        console.error('لا يوجد فحص سابق أو حدث خطأ في جلبه');
      }
    };
    fetchLastScan();
  }, []);

  // دالة الفحص اللحظي الجديد
  const fetchRadar = async () => {
    try {
      setLoading(true);
      setError('');
      setHasScanned(true);
      
      const res = await fetch('https://egx-pro-api.onrender.com/api/radar');
      if (!res.ok) throw new Error('فشل جلب بيانات الرادار');
      
      const data = await res.json();
      if (data.scan_results) {
        setResults(data.scan_results);
      }
    } catch (err: any) {
      setError('حدث خطأ أثناء فحص السوق. تأكد من تشغيل الباك إند.');
    } finally {
      setLoading(false);
    }
  };

  // دالة لتلوين مؤشر القوة النسبية (RSI) بناءً على مناطق التشبع
  const getRsiBadge = (rsi: number) => {
    if (rsi >= 70) return <span className="bg-red-100 text-red-800 px-2 py-1 rounded font-bold">{rsi} (تشبع شرائي)</span>;
    if (rsi <= 30) return <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-bold">{rsi} (تشبع بيعي)</span>;
    return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">{rsi} (محايد)</span>;
  };

  // دالة لتوضيح قوة السيولة (RVOL)
  const getRvolBadge = (rvol: number) => {
    if (rvol >= 3) return <span className="text-purple-700 font-black text-lg">{rvol}x 🔥🔥</span>;
    if (rvol >= 1.5) return <span className="text-blue-600 font-bold">{rvol}x 🔥</span>;
    return <span className="text-gray-600">{rvol}x</span>;
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-xl border border-gray-200 shadow-sm rtl min-h-[80vh]">
      {/* الهيدر وزر التشغيل */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2">
            <span>🎯</span> الرادار والماسح الضوئي (Screener)
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            يبحث في جميع أسهم السوق النشطة لاكتشاف الانفجارات السعرية وتقاطعات الماكد اللحظية.
          </p>
        </div>
        
        <button 
          onClick={fetchRadar}
          disabled={loading}
          className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><span className="animate-spin text-2xl">⏳</span> جاري مسح السوق...</>
          ) : (
            <><span className="text-2xl">📡</span> تشغيل الرادار الآن</>
          )}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 font-bold border border-red-200 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* منطقة عرض النتائج */}
      <div className="mb-10">
        {!hasScanned ? (
          <div className="text-center p-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 font-bold flex flex-col items-center gap-4">
            <span className="text-6xl animate-pulse">📡</span>
            <p className="text-2xl text-gray-700">الرادار في وضع الاستعداد</p>
            <p className="text-sm font-normal text-gray-500 max-w-md leading-relaxed">
              انقر على زر "تشغيل الرادار" لبدء الفحص. قد تستغرق العملية حوالي <b>10 دقائق</b> نظراً للمرور على جميع الأسهم واستخراج البيانات بدقة.
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center p-16 bg-blue-50 rounded-2xl border border-blue-100 shadow-inner">
            <div className="relative">
              <span className="text-6xl mb-4 block animate-ping absolute opacity-20">📡</span>
              <span className="text-6xl mb-4 block relative">📡</span>
            </div>
            <p className="text-xl font-bold text-blue-900 mt-6">جاري الفحص العميق لجميع أسهم السوق...</p>
            <p className="text-sm text-blue-700 mt-2 font-medium">نبحث الآن عن السيولة الانفجارية والتقاطعات. <span className="text-red-600 font-bold">هذه العملية قد تستغرق حوالي 10 دقائق لمسح أكثر من 200 سهم، يرجى عدم إغلاق الصفحة.</span></p>
          </div>
        ) : !loading && !error && results.length === 0 ? (
          <div className="text-center p-12 bg-gray-50 rounded-2xl border text-gray-600 font-bold text-lg">
            لم يكتشف الرادار أي سيولة غير عادية أو تقاطعات ملحوظة في هذه اللحظة. 💤
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="mb-4 flex items-center gap-2 text-green-700 font-bold bg-green-50 p-3 rounded-lg border border-green-200">
              <span>✅</span> تمت العملية بنجاح! الرادار اصطاد {results.length} فرصة.
            </div>
            
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full text-right border-collapse bg-white">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="p-4 font-bold rounded-tr-xl">كود السهم</th>
                    <th className="p-4 font-bold">السعر</th>
                    <th className="p-4 font-bold">إشارة الرادار (السبب)</th>
                    <th className="p-4 font-bold">مؤشر (RSI)</th>
                    <th className="p-4 font-bold">السيولة النسبية (RVOL)</th>
                    <th className="p-4 font-bold rounded-tl-xl">حجم التداول</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-black text-lg">
                        <Link 
                          href={`/?symbol=${item.symbol}`} 
                          className="text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 w-fit"
                          title={`تحليل سهم ${item.symbol} بالتفصيل`}
                        >
                          {item.symbol} <span className="text-sm opacity-50">🔗</span>
                        </Link>
                      </td>
                      <td className="p-4 font-bold text-gray-800">{item.price} ج.م</td>
                      <td className="p-4">
                        <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-black shadow-sm ${
                          item.reason.includes('سيولة') 
                            ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                            : 'bg-green-100 text-green-800 border border-green-200'
                        }`}>
                          {item.reason}
                        </span>
                      </td>
                      <td className="p-4 text-sm">{getRsiBadge(item.rsi)}</td>
                      <td className="p-4">{getRvolBadge(item.rvol)}</td>
                      <td className="p-4 font-bold text-gray-600 font-mono">
                        {item.volume.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}