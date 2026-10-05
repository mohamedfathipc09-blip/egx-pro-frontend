'use client';
import React, { useState, useEffect } from 'react';
import RiskDashboard from '@/components/Risk/RiskDashboard';

// ==========================================
// 1. تعريف واجهات البيانات (Interfaces)
// ==========================================
export interface PostMarketOpportunity {
  id: number;
  symbol: string;
  price: number;
  score: number;
  opportunity_type: string;
  setup_quality: string;
  entry_confirmation: string;
  support_1: number;
  resistance_1: number;
  entry_zone_min: number;
  entry_zone_max: number;
  stop_loss: number;
  tp1: number;
  risk_reward_ratio: number;
  reasons: string[];
  scenarios: {
    Positive: string;
    Neutral: string;
    Negative: string;
  };
}

interface ScanInfo {
  date: string;
  scanned: number;
  opportunities_count: number;
  strong_count: number;
}

export default function StrategiesPage() {
  const API_BASE_URL = 'https://egx-pro-api.onrender.com/api';

  // ==========================================
  // حالات ماسح ما بعد الإغلاق (Post-Market)
  // ==========================================
  const [pmOpportunities, setPmOpportunities] = useState<PostMarketOpportunity[]>([]);
  const [pmScanInfo, setPmScanInfo] = useState<ScanInfo | null>(null);
  const [pmFilter, setPmFilter] = useState<string>('🔥 أفضل الفرص');
  const [isPmScanning, setIsPmScanning] = useState(false);
  const [isPmLoading, setIsPmLoading] = useState(true);

  // ==========================================
  // حالات الرادار اللحظي القديم (Intraday)
  // ==========================================
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // ==========================================
  // دوال ماسح ما بعد الإغلاق
  // ==========================================
  useEffect(() => {
    fetchLatestPmScan();
  }, []);

  const fetchLatestPmScan = async () => {
    setIsPmLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/scanner/post-market/latest`);
      const result = await res.json();
      if (result && result.opportunities) {
        setPmOpportunities(result.opportunities);
        setPmScanInfo(result.scan_info);
      }
    } catch (err) {
      console.error("⚠️ خطأ في جلب بيانات الفحص الاستراتيجي:", err);
    }
    setIsPmLoading(false);
  };

  const triggerPostMarketScan = async () => {
    setIsPmScanning(true);
    try {
      await fetch(`${API_BASE_URL}/scanner/post-market/run`, { method: 'POST' });
      alert("⚡ تم إرسال أمر الفحص للسيرفر. سيعمل في الخلفية، يرجى تحديث الصفحة بعد قليل.");
    } catch (err) {
      alert("❌ فشل الاتصال بالسيرفر.");
    }
    setIsPmScanning(false);
  };

  const addToWatchlist = async (opp: PostMarketOpportunity) => {
    try {
      const payload = {
        symbol: opp.symbol,
        entry_price: opp.entry_zone_max,
        target: opp.tp1,
        stop_loss: opp.stop_loss
      };
      await fetch(`${API_BASE_URL}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      alert(`✅ تم إضافة ${opp.symbol} لمحفظة المتابعة بنجاح!`);
    } catch (err) {
      alert("❌ حدث خطأ أثناء الإضافة.");
    }
  };

  // فلاتر ما بعد الإغلاق
  const pmTabs = ['🔥 أفضل الفرص', '📉 قريب من دعم', '🔄 ارتداد من دعم', '🚀 احتمالية اختراق', '📊 سيولة عالية', '⚖️ أفضل Risk/Reward'];
  const getFilteredOpportunities = () => {
    let filtered = [...pmOpportunities];
    switch (pmFilter) {
      case '🔥 أفضل الفرص': return filtered.filter(o => o.score >= 65);
      case '📉 قريب من دعم': return filtered.filter(o => o.reasons.some(r => r.includes('دعم')));
      case '🔄 ارتداد من دعم': return filtered.filter(o => o.reasons.some(r => r.includes('ارتد')));
      case '🚀 احتمالية اختراق': return filtered.filter(o => o.reasons.some(r => r.includes('اختراق') || r.includes('مقاومة')));
      case '📊 سيولة عالية': return filtered.filter(o => o.reasons.some(r => r.includes('تداول') || r.includes('سيولة') || r.includes('حجم')));
      case '⚖️ أفضل Risk/Reward': return filtered.sort((a, b) => b.risk_reward_ratio - a.risk_reward_ratio);
      default: return filtered;
    }
  };

  // ==========================================
  // دالة الرادار اللحظي القديم
  // ==========================================
  const startScan = () => {
    setHasStarted(true);
    setIsLoading(true);

    fetch(`${API_BASE_URL}/strategies`)
      .then(res => res.json())
      .then(result => {
        setData(result);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("⚠️ خطأ في جلب بيانات السوق:", err);
        setIsLoading(false);
      });
  };

  return (
    <div className="container mx-auto p-4 rtl mb-10 space-y-10">
      
      {/* العنوان الرئيسي */}
      <h1 className="text-3xl font-black mb-6 text-gray-800 flex items-center gap-2">
        <span>🧠</span> التوصيات واستراتيجيات التداول
      </h1>
      
      {/* 1. لوحة المخاطر (تظهر دائماً بالأعلى) */}
      <RiskDashboard scanSummary={data?.summary} />

      {/* ========================================== */}
      {/* 2. قسم ماسح ما بعد الإغلاق (الجديد) */}
      {/* ========================================== */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <span className="text-blue-600">🏛️</span> فرص ما بعد الإغلاق (Post-Market)
            </h2>
            {pmScanInfo && (
              <p className="text-sm text-slate-500 mt-2 font-bold flex gap-4">
                <span>🕒 آخر فحص: {new Date(pmScanInfo.date).toLocaleTimeString('ar-EG')}</span>
                <span>📊 مفحوصة: {pmScanInfo.scanned}</span>
                <span className="text-green-600">🎯 قوية: {pmScanInfo.strong_count}</span>
              </p>
            )}
          </div>
          <button 
            onClick={triggerPostMarketScan}
            disabled={isPmScanning}
            className="mt-4 md:mt-0 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all flex items-center gap-2"
          >
            {isPmScanning ? '⏳ جاري الفحص...' : '⚡ تشغيل الفحص يدوياً'}
          </button>
        </div>

        {/* فلاتر ما بعد الإغلاق */}
        <div className="flex flex-wrap gap-2 mb-6">
          {pmTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setPmFilter(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                pmFilter === tab ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* عرض فرص ما بعد الإغلاق */}
        {isPmLoading ? (
          <div className="text-center py-10 font-bold text-slate-500">⏳ جاري تحميل الفرص الاستراتيجية...</div>
        ) : pmOpportunities.length === 0 ? (
          <div className="text-center py-10 font-bold text-slate-500">لا توجد فرص قوية مسجلة حتى الآن.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {getFilteredOpportunities().map((opp) => (
              <div key={opp.id} className="bg-white p-5 rounded-xl border-t-4 border-blue-600 shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow">
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-3xl font-black text-slate-800">{opp.symbol}</h3>
                    <div className="text-sm font-bold text-slate-500 mt-1">السعر: {opp.price} ج.م</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-lg font-black mb-1">
                      {opp.score}/100
                    </span>
                    <span className="text-xs font-bold text-gray-500">{opp.opportunity_type}</span>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded ${opp.entry_confirmation.includes('مؤكدة') ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {opp.entry_confirmation}
                  </span>
                  <span className="px-2 py-1 text-xs font-bold rounded bg-purple-100 text-purple-800">
                    R:R {opp.risk_reward_ratio}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-black text-slate-400 mb-2">أسباب الترشيح:</div>
                  <div className="flex flex-wrap gap-1">
                    {opp.reasons.map((r, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded border border-slate-200">
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                </div>

                <details className="mb-4 bg-slate-50 rounded-lg p-3 text-sm border border-slate-200 cursor-pointer">
                  <summary className="font-bold text-blue-700 outline-none">السيناريوهات المتوقعة 🔮</summary>
                  <div className="mt-3 space-y-2 text-xs leading-relaxed">
                    <p className="text-green-800"><strong className="text-green-600">إيجابي:</strong> {opp.scenarios?.Positive}</p>
                    <p className="text-slate-700"><strong className="text-slate-500">محايد:</strong> {opp.scenarios?.Neutral}</p>
                    <p className="text-red-800"><strong className="text-red-600">سلبي:</strong> {opp.scenarios?.Negative}</p>
                  </div>
                </details>

                <div className="mt-auto">
                  <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                    <div className="bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                      <span className="block text-gray-500 text-xs font-bold mb-1">دخول</span>
                      <span className="font-black text-gray-800">{opp.entry_zone_max}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                      <span className="block text-gray-500 text-xs font-bold mb-1">هدف 1</span>
                      <span className="font-black text-green-600">{opp.tp1}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                      <span className="block text-gray-500 text-xs font-bold mb-1">وقف</span>
                      <span className="font-black text-red-600">{opp.stop_loss}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => addToWatchlist(opp)}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2"
                  >
                    <span>➕</span> إضافة لمحفظة المتابعة
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-gray-300" />

      {/* ========================================== */}
      {/* 3. قسم الرادار اللحظي القديم (أثناء الجلسة) */}
      {/* ========================================== */}
      <div>
        <h2 className="text-2xl font-black mb-6 text-gray-800 flex items-center gap-2">
          <span className="text-red-500">⚡</span> الرادار اللحظي (Intraday)
        </h2>

        {!hasStarted ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm mt-8">
            <span className="text-6xl block mb-4">🚀</span>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">الرادار اللحظي جاهز</h3>
            <p className="text-gray-500 mb-6">انقر على الزر بالأسفل لبدء فحص السوق أثناء الجلسة</p>
            <button 
              onClick={startScan}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all text-lg flex items-center gap-2 mx-auto"
            >
              <span>بدء مسح السوق الآن</span>
              <span>⚡</span>
            </button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm mt-8">
            <span className="text-4xl block mb-4 animate-spin w-fit mx-auto">⏳</span>
            <p className="text-xl font-bold text-gray-600 animate-pulse">
              جاري مسح السوق بالكامل واستخراج التوصيات اللحظية... يرجى الانتظار
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">
              الفرص اللحظية المتاحة 🎯 ({data?.signals?.length || 0})
            </h3>
            
            {data?.signals && data.signals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.signals.map((signal: any, index: number) => (
                  <div key={index} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xl font-black">{signal.symbol}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${signal.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {signal.type === 'BUY' ? 'شراء 🟢' : 'بيع 🔴'}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4 font-medium leading-relaxed">{signal.message}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                        <span className="block text-gray-500 text-xs font-bold mb-1">الدخول</span>
                        <span className="font-black text-gray-800">{signal.entry_price || '-'}</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                        <span className="block text-gray-500 text-xs font-bold mb-1">الهدف</span>
                        <span className="font-black text-green-600">{signal.take_profit || '-'}</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg text-center col-span-2 border border-gray-100">
                        <span className="block text-gray-500 text-xs font-bold mb-1">وقف الخسارة</span>
                        <span className="font-black text-red-600">{signal.stop_loss || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center bg-gray-50 p-12 rounded-2xl border border-gray-200">
                <span className="text-5xl block mb-4">💤</span>
                <p className="text-xl text-gray-600 font-bold">لا توجد إشارات قوية في السوق حالياً بعد الفحص اللحظي.</p>
              </div>
            )}
          </div>
        )}
      </div>
      
    </div>
  );
}