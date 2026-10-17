'use client';
import React, { useState, useEffect } from 'react';
import RiskDashboard from '@/components/Risk/RiskDashboard';

// ==========================================
// 1. تعريف واجهات البيانات للمحرك الجديد (Radar 2.0)
// ==========================================
export interface SmartRecommendation {
  symbol: string;
  name?: string;
  sector: string;
  price?: number;
  score: number;
  confidence: string;
  opportunity_category: string; // التصنيف الفني
  signal_type: string;          // WATCHING or BUY
  strategy: string;
  additional_confirmations: string[];
  entry_zone: string;
  stop_loss: number;
  target_1: number;
  target_2: number;
  risk_reward: number;
  market_regime: string;
  why: string[];
  risk: string[];
}

export default function StrategiesPage() {
  // ==========================================
  // 🚀 النظام السحابي المباشر (Radar 2.0 Cloud Architecture)
  // ==========================================
  const RENDER_API_URL = 'https://egx-pro-api.onrender.com/api';

  // State الخاص بمحرك التوصيات الذكي
  const [smartOpportunities, setSmartOpportunities] = useState<SmartRecommendation[]>([]);
  const [addedSymbols, setAddedSymbols] = useState<string[]>([]);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [isSmartLoading, setIsSmartLoading] = useState(true);
  const [isManualScanning, setIsManualScanning] = useState(false);
  const [smartError, setSmartError] = useState("");
  const [smartFilter, setSmartFilter] = useState<string>('🔥 أفضل الفرص');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // State الخاص بالذكاء الاصطناعي (AI Modal)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSymbol, setAiSymbol] = useState("");
  const [currentAiReport, setCurrentAiReport] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    fetchSmartTop10();
    fetchCurrentWatchlist();
  }, []);

  // جلب الأسهم الموجودة بالفعل في المحفظة لتحديث شكل الأزرار
  const fetchCurrentWatchlist = async () => {
    try {
      const res = await fetch(`${RENDER_API_URL}/watchlist`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          setAddedSymbols(list.map((item: any) => item.symbol));
        }
      }
    } catch (err) {
      console.error("⚠️ تعذر جلب قائمة المتابعة:", err);
    }
  };

  // 1️⃣ جلب البيانات من (Render) وتحويلها للواجهة
  const fetchSmartTop10 = async () => {
    setIsSmartLoading(true);
    setSmartError("");
    try {
      const res = await fetch(`${RENDER_API_URL}/recommendations/top10`);
      const result = await res.json();

      if (res.ok && result.data && result.data.length > 0) {
        const mappedData: SmartRecommendation[] = result.data.map((item: any) => {
          return {
            symbol: item.symbol || "Unknown",
            name: item.name || item.symbol || "",
            sector: item.sector || "EGX",
            price: Number(item.price) || 0,
            score: Number(item.score) || 0,
            confidence: item.confidence || (Number(item.score) >= 75 ? "High" : "Medium"),
            opportunity_category: item.opportunity_category || "UNKNOWN",
            signal_type: item.signal_type || "WATCHING",
            strategy: item.strategy || "Smart Quant Model",
            additional_confirmations: item.additional_confirmations || [],
            entry_zone: String(item.entry_zone || item.price || "0 - 0"),
            stop_loss: Number(item.stop_loss) || 0,
            target_1: Number(item.target_1) || 0,
            target_2: Number(item.target_2) || 0,
            risk_reward: Number(item.risk_reward) || 0,
            market_regime: item.market_regime || "NEUTRAL",
            why: Array.isArray(item.why) ? item.why : ["تم رصد فرصة فنية محتملة."],
            risk: Array.isArray(item.risk) ? item.risk : [item.invalidation || "تأكد من الالتزام الصارم بوقف الخسارة."]
          };
        });

        setSmartOpportunities(mappedData);
        setLastUpdate(result.last_updated || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
      } else {
        setSmartError(result.message || "لا توجد فرص قوية حالياً تتخطى الفلاتر.");
      }
    } catch (err) {
      console.error("⚠️ خطأ في جلب بيانات الفحص الاستراتيجي:", err);
      setSmartError("خطأ في الاتصال بخادم Render.");
    }
    setIsSmartLoading(false);
  };

  // 2️⃣ إعطاء أمر الفحص اليدوي الشامل (EOD Radar 2.0)
  const handleManualScan = async () => {
    setIsManualScanning(true);
    try {
      const response = await fetch(`${RENDER_API_URL}/eod-radar/run-scan?background=true`, {
        method: "POST"
      });
      const result = await response.json();

      if (response.ok) {
        alert("🚀 بدأ مسح نهاية اليوم (EOD Radar 2.0) في الخلفية! سيتم تحديث الفرص تلقائياً.");
        setTimeout(() => {
          fetchSmartTop10();
          setIsManualScanning(false);
        }, 12000);
      } else {
        alert("حدث خطأ: " + (result.message || "فشل الاتصال"));
        setIsManualScanning(false);
      }
    } catch (error) {
      console.error("خطأ في الاتصال:", error);
      alert("⚠️ فشل الاتصال. تأكد من عمل سيرفر Render.");
      setIsManualScanning(false);
    }
  };

  // 3️⃣ إضافة أي سهم للمحفظة (سواء BUY أو WATCHING) بشكل آمن وموثوق
  const addToWatchlist = async (opp: SmartRecommendation) => {
    setAddingSymbol(opp.symbol);
    try {
      // استخراج سعر الدخول بأمان حتى لو كانت الصيغة '27.62 - 27.71' أو '27.62-27.71' أو رقم مباشر
      let parsedEntry = 0;
      if (opp.entry_zone && opp.entry_zone.includes('-')) {
        const parts = opp.entry_zone.split('-').map(p => parseFloat(p.trim()));
        parsedEntry = parts[1] || parts[0] || 0;
      } else {
        parsedEntry = parseFloat(opp.entry_zone) || 0;
      }

      const finalEntryPrice = parsedEntry > 0 ? parsedEntry : (opp.price || Number((opp.stop_loss * 1.05).toFixed(2)));
      const finalStopLoss = Number(opp.stop_loss) > 0 ? Number(opp.stop_loss) : Number((finalEntryPrice * 0.95).toFixed(2));
      const finalTarget = Number(opp.target_1) > 0 ? Number(opp.target_1) : Number((finalEntryPrice * 1.08).toFixed(2));

      const payload = {
        symbol: opp.symbol,
        entry_price: finalEntryPrice,
        target: finalTarget,
        stop_loss: finalStopLoss
      };

      const res = await fetch(`${RENDER_API_URL}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setAddedSymbols(prev => prev.includes(opp.symbol) ? prev : [...prev, opp.symbol]);
        alert(data.message || `✅ تمت إضافة ${opp.symbol} لمحفظة المتابعة بنجاح!`);
      } else {
        alert(`⚠️ تعذر إضافة ${opp.symbol}: ${data.detail || data.message || 'خطأ في السيرفر'}`);
      }
    } catch (err) {
      console.error("Watchlist Add Error:", err);
      alert("❌ حدث خطأ في الاتصال أثناء الإضافة للمحفظة.");
    } finally {
      setAddingSymbol(null);
    }
  };

  // 4️⃣ استدعاء تقرير الذكاء الاصطناعي (AI)
  const openAiReport = async (symbol: string) => {
    setAiSymbol(symbol);
    setCurrentAiReport("");
    setIsAiLoading(true);
    setIsAiModalOpen(true);

    try {
      const response = await fetch(`${RENDER_API_URL}/analyze/${symbol}`);
      const data = await response.json();

      const reportContent =
        data?.report_text ||
        (typeof data?.summary === 'string' ? data.summary : data?.summary?.report_text || data?.summary?.analysis) ||
        null;

      if (response.ok && reportContent) {
        setCurrentAiReport(reportContent);
      } else {
        setCurrentAiReport("⚠️ لم يتم العثور على التقرير أو حدث خطأ أثناء التوليد.");
      }
    } catch (error) {
      console.error("AI Fetch Error:", error);
      setCurrentAiReport("❌ فشل الاتصال بخادم الذكاء الاصطناعي.");
    }
    setIsAiLoading(false);
  };

  const pmTabs = ['🔥 أفضل الفرص', '🟢 فرص دخول (BUY)', '🟡 مراقبة (WATCHING)', '🚀 اختراقات', '📉 دعم وارتداد'];
  const getFilteredOpportunities = () => {
    let filtered = [...smartOpportunities];
    switch (smartFilter) {
      case '🔥 أفضل الفرص': return filtered;
      case '🟢 فرص دخول (BUY)': return filtered.filter(o => o.signal_type === 'BUY');
      case '🟡 مراقبة (WATCHING)': return filtered.filter(o => o.signal_type === 'WATCHING');
      case '🚀 اختراقات': return filtered.filter(o => o.opportunity_category === 'BREAKOUT');
      case '📉 دعم وارتداد': return filtered.filter(o => o.opportunity_category.includes('SUPPORT') || o.opportunity_category === 'BOUNCE_CONFIRMED');
      default: return filtered;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "عالية": case "High": return "bg-green-100 text-green-800 border-green-200";
      case "متوسطة": case "Medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "BOUNCE_CONFIRMED":
      case "SUPPORT_BOUNCE":
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1">🟢 ارتداد دعم</span>;
      case "BREAKOUT":
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1">🚀 اختراق مقاومة</span>;
      case "NEAR_SUPPORT":
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1">🟡 قرب الدعم</span>;
      case "FIBONACCI_PULLBACK":
      case "TREND_PULLBACK":
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1">🎯 تصحيح في اتجاه صاعد</span>;
      case "TREND_FOLLOWING":
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1">📈 تتبع اتجاه</span>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-4 rtl mb-10 space-y-10">

      <h1 className="text-3xl font-black mb-6 text-gray-800 flex items-center gap-2">
        <span>🧠</span> التوصيات واستراتيجيات التداول (EOD Radar 2.0)
      </h1>

      <RiskDashboard scanSummary={undefined} />

      {/* ========================================== */}
      {/* قسم محرك الترتيب الذكي (Radar 2.0 Engine) */}
      {/* ========================================== */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-3xl font-black text-indigo-900 flex items-center gap-3">
              <span className="text-blue-600 bg-blue-50 p-2 rounded-xl">🦅</span>
              محرك أفضل الفرص المؤهلة (Radar 2.0)
            </h2>
            <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">
              يتم مسح السوق بعد الإغلاق وفلترته كمياً وعرض أفضل الفرص المتاحة للإضافة المباشرة للمحفظة.
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex flex-wrap gap-3 items-center">
            <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-center">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">آخر تحديث من السحابة</span>
              <span className="block font-black text-slate-700">{lastUpdate || "--:--"}</span>
            </div>

            <button
              onClick={() => { fetchSmartTop10(); fetchCurrentWatchlist(); }}
              disabled={isSmartLoading || isManualScanning}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold py-2 px-4 rounded-xl transition-all disabled:opacity-50"
            >
              🔄 تحديث العرض
            </button>

            <button
              onClick={handleManualScan}
              disabled={isSmartLoading || isManualScanning}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isManualScanning ? (
                <><span className="animate-spin inline-block">⏳</span> الفحص يعمل سحابياً...</>
              ) : (
                <><span>⚡</span> إعادة المسح اليدوي</>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {pmTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setSmartFilter(tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                smartFilter === tab
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {isSmartLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <span className="font-bold text-slate-500">⏳ جاري جلب البيانات من السحابة...</span>
          </div>
        ) : smartError || smartOpportunities.length === 0 ? (
          <div className="text-center py-16 bg-amber-50 rounded-2xl border border-amber-200">
            <span className="text-5xl block mb-4">🛡️</span>
            <h3 className="text-xl font-bold text-amber-800 mb-2">{smartError || "لا توجد فرص مؤهلة تتخطى الفلاتر حالياً."}</h3>
            <p className="text-amber-700 font-medium">حماية رأس المال وعدم التداول العشوائي أفضل من مطاردة فرص ضعيفة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {getFilteredOpportunities().map((opp, index) => {
              const isAlreadyAdded = addedSymbols.includes(opp.symbol);
              const isAddingThis = addingSymbol === opp.symbol;

              return (
                <div key={opp.symbol} className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-lg transition-all duration-300 group ${opp.signal_type === 'WATCHING' ? 'border-amber-200' : 'border-slate-200'}`}>

                  <div className={`p-5 border-b flex flex-col md:flex-row justify-between items-center gap-4 ${opp.signal_type === 'WATCHING' ? 'bg-amber-50/30 border-amber-100' : 'bg-gradient-to-r from-slate-50 to-white border-slate-100'}`}>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className={`w-12 h-12 flex flex-shrink-0 items-center justify-center font-black text-xl rounded-xl shadow-inner ${opp.signal_type === 'WATCHING' ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'}`}>
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-800">{opp.symbol}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md">{opp.sector}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${opp.signal_type === 'BUY' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                            {opp.signal_type === 'BUY' ? '🟢 جاهز للدخول' : '🟡 للمراقبة'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-start md:justify-end w-full md:w-auto">
                      {getCategoryBadge(opp.opportunity_category)}

                      <span className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${getConfidenceBadge(opp.confidence)}`}>
                        الثقة: {opp.confidence}
                      </span>
                      <span className="px-3 py-1.5 rounded-lg text-sm font-black bg-blue-50 text-blue-700 border border-blue-200">
                        التقييم: {opp.score}/100
                      </span>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">

                    <div className="md:col-span-4 space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">الاستراتيجية الرئيسية</span>
                        <div className={`px-4 py-2.5 rounded-xl font-bold border text-center text-sm shadow-sm ${opp.signal_type === 'WATCHING' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                          {opp.strategy}
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-slate-500 font-bold text-xs">منطقة الدخول</span>
                          <span className="font-black text-slate-800" dir="ltr">{opp.entry_zone}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-red-500 font-bold text-xs">وقف الخسارة</span>
                          <span className="font-black text-red-600" dir="ltr">{Number(opp.stop_loss).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-green-600 font-bold text-xs">الهدف الأول</span>
                          <span className="font-black text-green-700" dir="ltr">{Number(opp.target_1).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-indigo-600 font-bold text-xs">العائد/المخاطرة</span>
                          <span className="font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded" dir="ltr">1 : {Number(opp.risk_reward).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-4 space-y-3 border-t md:border-t-0 md:border-r border-slate-100 pt-4 md:pt-0 md:pr-6">
                      <h4 className="text-sm font-black text-green-700 mb-3 flex items-center gap-2">
                        <span className="bg-green-100 p-1 rounded">💡</span> لماذا هذا السهم؟
                      </h4>
                      <ul className="space-y-2">
                        {opp.why.map((reason, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium leading-relaxed">
                            <span className="text-green-500 mt-0.5">✓</span> {reason}
                          </li>
                        ))}
                      </ul>

                      {opp.additional_confirmations.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="text-[10px] text-slate-400 font-bold mb-2 uppercase">تأكيدات إضافية:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {opp.additional_confirmations.map((conf, i) => (
                              <span key={i} className="text-[10px] px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-bold border border-slate-200">
                                {conf}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-4 space-y-4 flex flex-col justify-between border-t md:border-t-0 md:border-r border-slate-100 pt-4 md:pt-0 md:pr-6">
                      <div>
                        <h4 className="text-sm font-black text-red-600 mb-3 flex items-center gap-2">
                          <span className="bg-red-100 p-1 rounded">⚠️</span> المخاطر وشرط الإلغاء
                        </h4>
                        <ul className="space-y-2 bg-red-50 p-4 rounded-xl border border-red-100">
                          {opp.risk.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-red-800 font-bold leading-relaxed">
                              <span>•</span> {r}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* أزرار الإجراءات - مفعلة لجميع التوصيات */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <button
                          onClick={() => openAiReport(opp.symbol)}
                          className="w-full font-bold py-3.5 px-2 rounded-xl transition-colors shadow-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex justify-center items-center gap-1.5 text-sm"
                        >
                          <span>🤖</span> تقرير AI
                        </button>

                        <button
                          onClick={() => addToWatchlist(opp)}
                          disabled={isAddingThis || isAlreadyAdded}
                          className={`w-full font-bold py-3.5 px-2 rounded-xl transition-colors shadow-sm flex justify-center items-center gap-1.5 text-sm ${
                            isAlreadyAdded
                              ? 'bg-emerald-600 text-white cursor-default'
                              : 'bg-slate-900 hover:bg-indigo-600 text-white'
                          }`}
                        >
                          {isAddingThis ? (
                            <><span>⏳</span> جاري الإضافة...</>
                          ) : isAlreadyAdded ? (
                            <><span>✅</span> بالمحفظة</>
                          ) : (
                            <><span>➕</span> للمحفظة</>
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* النافذة المنبثقة (Modal) للذكاء الاصطناعي */}
      {/* ========================================== */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl relative rtl border border-slate-200 overflow-hidden">

            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-2xl font-black text-indigo-900 flex items-center gap-2">
                <span>🤖</span> التقرير الفني الذكي <span className="text-blue-600">({aiSymbol})</span>
              </h2>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {isAiLoading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                  <p className="text-lg font-bold text-slate-600">جاري قراءة البيانات وتوليد التقرير المؤسسي...</p>
                  <p className="text-sm text-slate-400 mt-2">قد يستغرق الأمر بضع ثوانٍ</p>
                </div>
              ) : (
                <div className="prose prose-slate max-w-none rtl" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
                  <div className="text-slate-700 font-medium text-[15px]">
                    {currentAiReport}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <p className="text-xs text-slate-400">
                ⚠️ هذا التقرير مُولد آلياً بواسطة نماذج الذكاء الاصطناعي بناءً على القراءات الفنية ولا يمثل دعوة صريحة للبيع أو الشراء.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}