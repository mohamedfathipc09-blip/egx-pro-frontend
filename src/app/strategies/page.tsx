'use client';
import React, { useState, useEffect } from 'react';
import RiskDashboard from '@/components/Risk/RiskDashboard';

// ==========================================
// 1. تعريف واجهات البيانات للمحرك الجديد (Smart Top 10)
// ==========================================
export interface SmartRecommendation {
  symbol: string;
  sector: string;
  score: number;
  confidence: string;
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
  // 🚀 النظام الهجين (Hybrid Architecture) 🚀
  // ==========================================
  const RENDER_API_URL = 'https://egx-pro-api.onrender.com/api'; // لجلب البيانات وحفظ المحفظة
  const LOCAL_API_URL = 'http://127.0.0.1:8000/api';             // لتشغيل الفحص وتخطي حظر الـ IPs

  // State الخاص بمحرك التوصيات الذكي (Top 10)
  const [smartOpportunities, setSmartOpportunities] = useState<SmartRecommendation[]>([]);
  const [isSmartLoading, setIsSmartLoading] = useState(true);
  const [isManualScanning, setIsManualScanning] = useState(false);
  const [smartError, setSmartError] = useState("");
  const [smartFilter, setSmartFilter] = useState<string>('🔥 أفضل الفرص');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // State الخاص بالرادار اللحظي القديم
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    fetchSmartTop10();
  }, []);

  // 1️⃣ جلب البيانات من (Render) وتحويلها للواجهة لتجنب الشاشة البيضاء
  const fetchSmartTop10 = async () => {
    setIsSmartLoading(true);
    setSmartError("");
    try {
      const res = await fetch(`${RENDER_API_URL}/recommendations/top10`);
      const result = await res.json();
      
      if (res.ok && result.data && result.data.length > 0) {
        // 🔥 مُترجم البيانات (Data Mapper): لمنع مشكلة الشاشة البيضاء وتوافق البيانات
        const mappedData = result.data.map((item: any) => {
          const setup = item.trade_setup || {};
          const bestStrategy = (item.matched_strategies && item.matched_strategies.length > 0) 
            ? item.matched_strategies[0] 
            : null;

          return {
            symbol: item.symbol || "Unknown",
            sector: item.name || "EGX", 
            score: item.score || 0,
            confidence: (item.score >= 80) ? "High" : ((item.score >= 70) ? "Medium" : "Low"),
            strategy: bestStrategy ? bestStrategy.strategy_name : "Smart Quant Model",
            additional_confirmations: item.scenarios?.bullish ? [item.scenarios.bullish] : [],
            entry_zone: bestStrategy?.entry_zone || `${item.price || 0}`,
            stop_loss: setup.stop || 0,
            target_1: setup.tp1 || 0,
            target_2: setup.tp2 || 0,
            risk_reward: setup.risk_reward || 0,
            market_regime: item.market_regime || "UNCLEAR",
            why: [
              bestStrategy ? `تم رصد نموذج: ${bestStrategy.strategy_name}` : "تطابق معايير السيولة والمخاطرة",
              item.scenarios?.bullish || "تمركز سعري إيجابي"
            ],
            risk: [
              item.scenarios?.bearish || "احتمالية تقلبات سعرية",
              setup.invalidation || `كسر الدعم ${setup.stop} يلغي السيناريو`
            ]
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

  // 2️⃣ إعطاء أمر الفحص اليدوي (للسيرفر المحلي فقط)
  const handleManualScan = async () => {
    setIsManualScanning(true);
    alert("🔍 جاري إرسال أمر الفحص للسيرفر المحلي (TradingView)... يرجى الانتظار (حوالي 30 ثانية).");
    
    try {
      const response = await fetch(`${LOCAL_API_URL}/scanner/run-manual`, {
        method: "POST"
      });
      const result = await response.json();
      
      if (result.status === "success") {
        alert("✅ الفحص المحلي اكتمل وتم الرفع للسحابة! جاري تحديث الصفحة...");
        setTimeout(() => {
          fetchSmartTop10();
          setIsManualScanning(false);
        }, 3000);
      } else {
        alert("حدث خطأ: " + result.message);
        setIsManualScanning(false);
      }
    } catch (error) {
      console.error("خطأ في الاتصال:", error);
      alert("⚠️ فشل الاتصال. تأكد من تشغيل الباك إند المحلي على جهازك.");
      setIsManualScanning(false);
    }
  };

  // 3️⃣ إضافة للمحفظة (على Render)
  const addToWatchlist = async (opp: SmartRecommendation) => {
    try {
      const entryMax = parseFloat(opp.entry_zone.split(' - ')[1]) || parseFloat(opp.entry_zone) || opp.stop_loss * 1.05;
      const payload = {
        symbol: opp.symbol,
        entry_price: entryMax,
        target: opp.target_1,
        stop_loss: opp.stop_loss
      };
      await fetch(`${RENDER_API_URL}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      alert(`✅ تم إضافة ${opp.symbol} لمحفظة المتابعة بنجاح!`);
    } catch (err) {
      alert("❌ حدث خطأ أثناء الإضافة.");
    }
  };

  const pmTabs = ['🔥 أفضل الفرص', '📉 قريب من دعم', '🔄 ارتداد من دعم', '🚀 احتمالية اختراق'];
  const getFilteredOpportunities = () => {
    let filtered = [...smartOpportunities];
    switch (smartFilter) {
      case '🔥 أفضل الفرص': return filtered;
      case '📉 قريب من دعم': return filtered.filter(o => o.strategy.includes('Support') || o.additional_confirmations.some(c => c.includes('Support')));
      case '🔄 ارتداد من دعم': return filtered.filter(o => o.strategy.includes('Bounce') || o.additional_confirmations.some(c => c.includes('Bounce')));
      case '🚀 احتمالية اختراق': return filtered.filter(o => o.strategy.includes('Breakout') || o.additional_confirmations.some(c => c.includes('Breakout')));
      default: return filtered;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "High": return "bg-green-100 text-green-800 border-green-200";
      case "Medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // 4️⃣ الرادار اللحظي (يتصل بالسيرفر المحلي)
  const startScan = () => {
    setHasStarted(true);
    setIsLoading(true);
    fetch(`${LOCAL_API_URL}/strategies`)
      .then(res => res.json())
      .then(result => {
        setData(result);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("⚠️ خطأ في جلب بيانات السوق:", err);
        alert("فشل تشغيل الرادار. تأكد من تشغيل السيرفر المحلي.");
        setIsLoading(false);
      });
  };

  return (
    <div className="container mx-auto p-4 rtl mb-10 space-y-10">
      
      <h1 className="text-3xl font-black mb-6 text-gray-800 flex items-center gap-2">
        <span>🧠</span> التوصيات واستراتيجيات التداول
      </h1>
      
      <RiskDashboard scanSummary={data?.summary} />

      {/* ========================================== */}
      {/* قسم محرك الترتيب الذكي (Smart Top 10 Engine) */}
      {/* ========================================== */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-3xl font-black text-indigo-900 flex items-center gap-3">
              <span className="text-blue-600 bg-blue-50 p-2 rounded-xl">🦅</span> 
              محرك أفضل 10 فرص (Smart Top 10)
            </h2>
            <p className="text-slate-500 mt-2 font-medium text-sm md:text-base">
              يتم مسح السوق محلياً (لتخطي الحظر) وعرض الفرص المرفوعة على السحابة.
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-wrap gap-3 items-center">
            <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-center">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">آخر تحديث من السحابة</span>
              <span className="block font-black text-slate-700">{lastUpdate || "--:--"}</span>
            </div>
            
            <button 
              onClick={fetchSmartTop10}
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
                <><span className="animate-spin inline-block">⏳</span> الفحص يعمل محلياً...</>
              ) : (
                <><span>⚡</span> فحص السوق الآن (Local)</>
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
            {getFilteredOpportunities().map((opp, index) => (
              <div key={opp.symbol} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                
                <div className="bg-gradient-to-r from-slate-50 to-white p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-12 h-12 flex flex-shrink-0 items-center justify-center bg-indigo-600 text-white font-black text-xl rounded-xl shadow-inner">
                      #{index + 1}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-800">{opp.symbol}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md">{opp.sector}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${opp.market_regime?.includes('UP') || opp.market_regime === 'BULLISH' ? 'bg-green-50 border-green-200 text-green-700' : opp.market_regime?.includes('DOWN') || opp.market_regime === 'BEARISH' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                          السوق: {opp.market_regime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-start md:justify-end w-full md:w-auto">
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${getConfidenceBadge(opp.confidence)}`}>
                      الثقة: {opp.confidence}
                    </span>
                    <span className="px-3 py-1.5 rounded-lg text-sm font-black bg-blue-50 text-blue-700 border border-blue-200">
                      Score: {opp.score}/100
                    </span>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
                  
                  <div className="md:col-span-4 space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">الاستراتيجية الرئيسية</span>
                      <div className="bg-purple-50 text-purple-700 px-4 py-2.5 rounded-xl font-bold border border-purple-200 text-center text-sm shadow-sm">
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
                        <span className="font-black text-red-600" dir="ltr">{opp.stop_loss.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-200">
                        <span className="text-green-600 font-bold text-xs">الهدف الأول</span>
                        <span className="font-black text-green-700" dir="ltr">{opp.target_1.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-indigo-600 font-bold text-xs">العائد/المخاطرة</span>
                        <span className="font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded" dir="ltr">1 : {opp.risk_reward}</span>
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
                        <span className="bg-red-100 p-1 rounded">⚠️</span> المخاطر
                      </h4>
                      <ul className="space-y-2 bg-red-50 p-4 rounded-xl border border-red-100">
                        {opp.risk.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-red-800 font-bold leading-relaxed">
                            <span>•</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button 
                      onClick={() => addToWatchlist(opp)}
                      className="w-full bg-slate-800 hover:bg-indigo-600 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-md flex justify-center items-center gap-2 mt-4"
                    >
                      <span>➕</span> إضافة للمحفظة
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* الرادار اللحظي القديم (Intraday) - بيشتغل محلي */}
      {/* ========================================== */}
      <div>
        <h2 className="text-2xl font-black mb-6 text-gray-800 flex items-center gap-2">
          <span className="text-red-500">⚡</span> الرادار اللحظي (Intraday)
        </h2>

        {!hasStarted ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm mt-8">
            <span className="text-6xl block mb-4">🚀</span>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">الرادار اللحظي جاهز</h3>
            <p className="text-gray-500 mb-6">انقر لبدء المسح عبر السيرفر المحلي (TradingView)</p>
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
              جاري سحب بيانات TradingView محلياً... يرجى الانتظار
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