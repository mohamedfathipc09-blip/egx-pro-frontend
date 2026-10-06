'use client';
import React, { useState, useEffect } from 'react';

// تعريف نوع بيانات ملخص الفحص
interface ScanSummary {
  total_scanned: number;
  with_signals_count: number;
  scanned_no_signal: string[];
  excluded: string[];
}

export default function RiskDashboard({ scanSummary }: { scanSummary?: ScanSummary | null }) {
  
  // 1. حالة الإعدادات (مع قيم افتراضية)
  const [settings, setSettings] = useState({
    capital: 100000,
    risk_per_trade: 2.0,
    max_open_trades: 8,
    max_total_risk: 16.0,
    min_rr: 1.5
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // حالة حاسبة الكميات (Position Sizing)
  const [calcEntry, setCalcEntry] = useState<number | ''>('');
  const [calcStop, setCalcStop] = useState<number | ''>('');

  // 2. جلب الإعدادات من الباك إند
  useEffect(() => {
    fetch('https://egx-pro-api.onrender.com/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("⚠️ خطأ في جلب الإعدادات:", err);
        setIsLoading(false);
      });
  }, []);

  // 3. دالة الحفظ
  const saveRiskSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('https://egx-pro-api.onrender.com/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const result = await res.json();
      alert("✅ " + result.message + "\nتم تحديث حجم المراكز وإعدادات المخاطرة بنجاح!");
    } catch (err) {
      alert("❌ حدث خطأ أثناء الاتصال بالخادم لحفظ الإعدادات.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: Number(value) }));
  };

  // ==========================================
  // حسابات حية للوحة المعلومات وحاسبة الكميات
  // ==========================================
  const totalExposurePercent = settings.risk_per_trade * settings.max_open_trades; 
  const worstCaseScenario = (settings.capital * totalExposurePercent) / 100;
  const isRiskHigh = totalExposurePercent > settings.max_total_risk;
  
  // حساب أقصى مبلغ يمكن خسارته في الصفقة الواحدة (بالجنيه)
  const maxRiskAmountMoney = (settings.capital * settings.risk_per_trade) / 100;

  // حساب الكمية المقترحة
  let recommendedShares = 0;
  let totalCost = 0;
  if (calcEntry && calcStop && Number(calcEntry) > Number(calcStop)) {
    const entryPrice = Number(calcEntry);
    const stopPrice = Number(calcStop);
    const riskPerShare = entryPrice - stopPrice;
    
    recommendedShares = Math.floor(maxRiskAmountMoney / riskPerShare);
    totalCost = recommendedShares * entryPrice;
  }

  if (isLoading) {
    return <div className="text-center py-4 text-gray-500 animate-pulse">جاري تحميل إعدادات المحفظة... ⚙️</div>;
  }

  return (
    <div className="mb-8 rtl">
      {/* لوحة إدارة المخاطر والانضباط */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6 relative">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span>⚖️</span> إعدادات المحفظة وإدارة المخاطر
          </h2>
          
          <button 
            onClick={saveRiskSettings}
            disabled={isSaving}
            className="bg-slate-800 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-all flex items-center gap-2 shadow-md"
          >
            {isSaving ? <span className="animate-spin">⏳</span> : <span>💾 حفظ الإعدادات</span>}
          </button>
        </div>

        {/* مربعات إدخال الإعدادات الأساسية */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 font-bold mb-1">رأس المال (ج.م)</label>
            <input type="number" name="capital" value={settings.capital} onChange={handleChange}
              className="border border-gray-200 rounded-lg p-2 text-left bg-white focus:border-blue-500 outline-none transition-all font-bold text-blue-700" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 font-bold mb-1">المخاطرة للصفقة (%)</label>
            <input type="number" name="risk_per_trade" value={settings.risk_per_trade} onChange={handleChange} step="0.1"
              className="border border-gray-200 rounded-lg p-2 text-center bg-white focus:border-blue-500 outline-none transition-all font-bold text-red-600" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 font-bold mb-1">أقصى صفقات مفتوحة</label>
            <input type="number" name="max_open_trades" value={settings.max_open_trades} onChange={handleChange}
              className="border border-gray-200 rounded-lg p-2 text-center bg-white focus:border-blue-500 outline-none transition-all font-bold text-gray-700" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 font-bold mb-1">الحد الأقصى للمخاطرة (%)</label>
            <input type="number" name="max_total_risk" value={settings.max_total_risk} onChange={handleChange} step="1"
              className="border border-gray-200 rounded-lg p-2 text-center bg-white focus:border-blue-500 outline-none transition-all font-bold text-gray-700" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 font-bold mb-1">أقل R:R مقبول</label>
            <input type="number" name="min_rr" value={settings.min_rr} onChange={handleChange} step="0.1"
              className="border border-gray-200 rounded-lg p-2 text-center bg-white focus:border-blue-500 outline-none transition-all font-bold text-green-600" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* قسم بطاقات الإحصائيات (اليسار) */}
          <div className="flex flex-col gap-4">
            <div className={`border rounded-xl p-4 flex justify-between items-center ${isRiskHigh ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
              <div>
                <span className={`text-sm font-bold block ${isRiskHigh ? 'text-red-600' : 'text-blue-600'}`}>إجمالي التعرض للمخاطرة</span>
                <span className={`text-xs mt-1 ${isRiskHigh ? 'text-red-500' : 'text-blue-500'}`}>
                  {isRiskHigh ? '⚠️ تخطيت الحد المسموح!' : `من إجمالي رأس المال (الحد: ${settings.max_total_risk}%)`}
                </span>
              </div>
              <span className={`text-3xl font-black ${isRiskHigh ? 'text-red-700' : 'text-blue-800'}`}>{totalExposurePercent.toFixed(1)}%</span>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex justify-between items-center">
              <div>
                <span className="text-red-500 text-sm font-bold block">أسوأ سيناريو للانهيار</span>
                <span className="text-xs text-red-400 mt-1">إذا ضربت جميع صفقاتك وقف الخسارة معاً</span>
              </div>
              <span className="text-2xl font-black text-red-700">-{worstCaseScenario.toLocaleString()} ج.م</span>
            </div>
          </div>

          {/* قسم حاسبة كمية الأسهم (اليمين) - [القسم الجديد الإحترافي] */}
          <div className="bg-slate-800 rounded-xl p-5 shadow-inner border border-slate-700 text-white relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10 text-6xl">🧮</div>
            <h3 className="text-lg font-black mb-1 flex items-center gap-2">
              <span className="text-blue-400">💡</span> حاسبة الدخول الذكية
            </h3>
            <p className="text-xs text-slate-400 mb-4">أقصى مبلغ مسموح بخسارته في الصفقة: <strong className="text-white">{maxRiskAmountMoney.toLocaleString()} ج.م</strong></p>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] text-slate-400 font-bold mb-1 block">سعر الدخول (Entry)</label>
                <input type="number" value={calcEntry} onChange={e => setCalcEntry(e.target.value === '' ? '' : Number(e.target.value))} placeholder="مثال: 15.50"
                 className="w-full border border-slate-600 rounded bg-slate-700 p-2 text-center focus:border-blue-400 outline-none font-bold" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold mb-1 block">وقف الخسارة (Stop Loss)</label>
                <input type="number" value={calcStop} onChange={e => setCalcStop(e.target.value === '' ? '' : Number(e.target.value))} placeholder="مثال: 14.80"
                className="w-full border border-slate-600 rounded bg-slate-700 p-2 text-center focus:border-red-400 outline-none font-bold" />
              </div>
            </div>

            {calcEntry && calcStop && Number(calcEntry) > Number(calcStop) ? (
              <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 flex justify-between items-center">
                <div>
                  <span className="block text-[10px] text-slate-300 font-bold">الكمية المقترحة للشراء</span>
                  <span className="text-2xl font-black text-green-400">{recommendedShares.toLocaleString()} <span className="text-sm font-normal text-slate-400">سهم</span></span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-300 font-bold">التكلفة المطلوبة</span>
                  <span className="text-lg font-black text-blue-300">{totalCost.toLocaleString(undefined, {maximumFractionDigits: 0})} ج.م</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-700 rounded-lg p-3 text-center text-xs text-slate-400 font-bold border border-slate-600 border-dashed">
                أدخل سعر الدخول ووقف الخسارة لحساب الكمية الآمنة
              </div>
            )}
          </div>
        </div>
      </div>

      {/* تقرير فحص السوق التفصيلي (الذي طلبته) */}
      {scanSummary && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span>📊</span> تقرير فحص السوق التفصيلي
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-6">
            <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100">
              <span className="block text-3xl font-black mb-1">{scanSummary.with_signals_count}</span>
              <span className="text-sm font-bold">أسهم أعطت إشارة 🎯</span>
            </div>
            <div className="bg-gray-50 text-gray-700 p-4 rounded-xl border border-gray-200">
              <span className="block text-3xl font-black mb-1">{scanSummary.scanned_no_signal.length}</span>
              <span className="text-sm font-bold">تم الفحص (بدون إشارة) ⏳</span>
            </div>
            <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100">
              <span className="block text-3xl font-black mb-1">{scanSummary.excluded.length}</span>
              <span className="text-sm font-bold">مستبعد (خطأ اتصال) ⚠️</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}