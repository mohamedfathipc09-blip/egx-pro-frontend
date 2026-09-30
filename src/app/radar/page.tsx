'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function RadarPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLiveScan, setIsLiveScan] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const getBaseUrl = () => {
    return window.location.hostname === 'localhost' 
      ? 'http://localhost:8000' 
      : 'https://egx-pro-api.onrender.com';
  };

  // 1. جلب الفرص الجاهزة للاعتماد (CANDIDATES)
  const fetchCandidates = async () => {
    setLoading(true);
    setError('');
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/recommendations/candidates`);
      if (!res.ok) throw new Error('فشل جلب الفرص من قاعدة البيانات.');
      
      const result = await res.json();
      if (result.status === 'success') {
        // ترتيب تنازلي حسب الـ Score
        const sorted = result.candidates.sort((a: any, b: any) => b.score - a.score);
        setCandidates(sorted);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  };

  // 2. تشغيل فحص حي جديد للسوق (الرادار)
  const runLiveRadar = async () => {
    setLoading(true);
    setError('');
    setIsLiveScan(true);
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/radar`);
      if (!res.ok) throw new Error('فشل تشغيل الفحص الحي للسوق.');
      
      // بعد انتهاء المسح، نجلب الفرص الجديدة من الداتا بيز
      await fetchCandidates();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء فحص السوق.');
    } finally {
      setLoading(false);
      setIsLiveScan(false);
    }
  };

  // 3. اعتماد الفرصة ونقلها لمحفظة المتابعة
  const handleApprove = async (id: number, symbol: string) => {
    setApprovingId(id);
    try {
      const baseUrl = getBaseUrl();
      const res = await fetch(`${baseUrl}/api/recommendations/approve/${id}`, {
        method: 'POST',
      });
      const result = await res.json();
      
      if (result.status === 'success') {
        // إزالة الكارت من الشاشة فور النجاح
        setCandidates(prev => prev.filter(c => c.id !== id));
      } else {
        alert(`⚠️ ${result.message}`);
      }
    } catch (err) {
      alert('حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setApprovingId(null);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-8" dir="rtl">
      {/* الهيدر الرئيسي للرادار */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm mb-8 border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3 mb-2">
            <span className="text-4xl">🦅</span> رادار EGX المؤسسي
          </h1>
          <p className="text-gray-500 font-medium">نظام فلترة صارم يعتمد على (Quality Over Quantity). يعرض فقط الصفقات ذات Risk/Reward المرتفع.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={fetchCandidates}
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
      {!loading && !isLiveScan && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center border-b-4 border-b-green-500">
            <p className="text-xs text-green-600 font-bold mb-1 uppercase">فرص بانتظار الاعتماد</p>
            <p className="text-2xl font-black text-green-600" dir="ltr">{candidates.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
            <p className="text-xs text-gray-500 font-bold mb-1 uppercase">الحد الأدنى للتقييم</p>
            <p className="text-2xl font-black text-gray-800" dir="ltr">60 / 100</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
            <p className="text-xs text-gray-500 font-bold mb-1 uppercase">الحد الأدنى لـ R:R</p>
            <p className="text-2xl font-black text-gray-800" dir="ltr">1.2</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
            <p className="text-xs text-gray-500 font-bold mb-1 uppercase">حالة الرادار</p>
            <p className="text-xl font-black text-blue-600 mt-1">مستقر (Quality Only)</p>
          </div>
        </div>
      )}

      {/* حالة التحميل */}
      {loading && !isLiveScan && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <span className="text-4xl animate-bounce mb-4">📡</span>
          <h2 className="text-xl font-bold">جاري جلب الفرص من قاعدة البيانات...</h2>
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
      {!loading && candidates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((cand) => (
            <div key={cand.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col relative overflow-hidden group">
              
              {/* شريط علوي ملون حسب الـ Score */}
              <div className={`h-2 w-full ${cand.score >= 75 ? 'bg-green-500' : 'bg-blue-500'}`}></div>
              
              <div className="p-6 flex-1">
                {/* الهيدر */}
                <div className="flex justify-between items-start mb-4 border-b pb-4">
                  <div>
                    <h3 className="text-3xl font-black text-gray-900 leading-none">{cand.symbol}</h3>
                    <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">
                      {cand.strategy}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-black ${cand.score >= 75 ? 'text-green-600' : 'text-blue-600'}`} dir="ltr">
                      {cand.score} <span className="text-sm text-gray-400">/100</span>
                    </div>
                    <div className="text-xs text-gray-500 font-bold mt-1">Quant Score</div>
                  </div>
                </div>

                {/* خطة التداول السريعة */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-500 font-bold block mb-1">منطقة الدخول</span>
                    <span className="text-sm font-black text-gray-900" dir="ltr">{cand.entry_zone}</span>
                  </div>
                  <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                    <span className="text-xs text-red-500 font-bold block mb-1">وقف الخسارة</span>
                    <span className="text-sm font-black text-red-700" dir="ltr">{cand.stop_loss}</span>
                  </div>
                </div>

                {/* الأهداف والـ R:R */}
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mb-4 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-blue-500 font-bold block mb-1">الأهداف (TP)</span>
                    <div className="text-sm font-black text-blue-800" dir="ltr">
                      {cand.target_1} {cand.target_2 ? ` / ${cand.target_2}` : ''} {cand.target_3 ? ` / ${cand.target_3}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 font-bold block mb-1">Risk / Reward</span>
                    <span className="text-sm font-black text-green-700" dir="ltr">{cand.risk_reward} : 1</span>
                  </div>
                </div>

                {/* التقرير النصي (Reasoning) */}
                <div className="mb-4">
                  <h4 className="text-xs text-gray-400 font-bold mb-2 uppercase">التحليل الفني</h4>
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed max-h-28 overflow-y-auto">
                    {cand.reasoning ? cand.reasoning.split('\n').map((line: string, i: number) => (
                      <p key={i} className="mb-1">{line}</p>
                    )) : 'لا توجد تفاصيل إضافية.'}
                  </div>
                </div>

                {/* شرط الإلغاء */}
                <div className="text-xs font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 flex items-start gap-2">
                  <span>🛑</span>
                  <span>{cand.invalidation || "إغلاق أسفل الوقف يلغي السيناريو."}</span>
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div className="flex border-t border-gray-100">
                <Link href={`/?symbol=${cand.symbol}`} className="flex-1">
                  <button className="w-full text-gray-600 bg-gray-50 hover:bg-gray-100 font-bold text-sm py-4 transition-colors">
                    الشارت والتفاصيل
                  </button>
                </Link>
                <button 
                  onClick={() => handleApprove(cand.id, cand.symbol)}
                  disabled={approvingId === cand.id}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-sm py-4 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {approvingId === cand.id ? (
                    <><span className="animate-spin">⏳</span> جاري الاعتماد...</>
                  ) : (
                    <>✅ إضافة للمتابعة</>
                  )}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* لو مفيش فرص */}
      {!loading && !isLiveScan && candidates.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center shadow-sm">
          <span className="text-6xl mb-4 block">⚖️</span>
          <h2 className="text-2xl font-black text-gray-800 mb-2">لا توجد فرص قوية حالياً</h2>
          <p className="text-gray-500">السوق لا يلبي شروط المخاطرة الصارمة للنظام المؤسسي. الحفاظ على رأس المال هو الأولوية.</p>
        </div>
      )}
    </div>
  );
}