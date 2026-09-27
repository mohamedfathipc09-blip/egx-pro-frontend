'use client';
import React, { useState, useEffect } from 'react';

// تعريف نوع بيانات ملخص الفحص
interface ScanSummary {
  total_scanned: number;
  with_signals_count: number;
  scanned_no_signal: string[];
  excluded: string[];
}

// استقبال scanSummary كـ prop اختياري
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

  // 2. جلب الإعدادات من الباك إند عند فتح الصفحة
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

  // 3. دالة الحفظ وإرسال الداتا للباك إند
  const saveRiskSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('https://egx-pro-api.onrender.com/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const result = await res.json();
      
      alert("✅ " + result.message + "\nتم تحديث حجم المراكز لبوت التليجرام بنجاح!");
    } catch (err) {
      alert("❌ حدث خطأ أثناء الاتصال بالخادم لحفظ الإعدادات.");
    } finally {
      setIsSaving(false);
    }
  };

  // دالة لتحديث أي مربع إدخال بسهولة
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: Number(value) }));
  };

  // ==========================================
  // حسابات حية للوحة المعلومات
  // ==========================================
  const totalExposurePercent = settings.risk_per_trade * settings.max_open_trades; 
  const worstCaseScenario = (settings.capital * totalExposurePercent) / 100;
  const isRiskHigh = totalExposurePercent > settings.max_total_risk;

  if (isLoading) {
    return <div className="text-center py-4 text-gray-500 animate-pulse">جاري تحميل إعدادات المحفظة... ⚙️</div>;
  }

  return (
    <div className="mb-8 rtl">
      {/* لوحة إدارة المخاطر والانضباط */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6 relative">
        
        {/* العنوان وزر الحفظ */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span>⚖️</span> لوحة إدارة المخاطر والانضباط
          </h2>
          
          <button 
            onClick={saveRiskSettings}
            disabled={isSaving}
            className="bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-bold py-2 px-5 rounded-lg border border-gray-200 transition-all flex items-center gap-2"
          >
            {isSaving ? (
              <><span className="animate-spin">⏳</span> جاري الحفظ...</>
            ) : (
              <>إعدادات المحفظة ⚙️</>
            )}
          </button>
        </div>

        {/* مربعات الإدخال (المدخلات) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 font-bold mb-1">رأس المال (ج.م)</label>
            <input 
              type="number" name="capital" value={settings.capital} onChange={handleChange}
              className="border border-gray-200 rounded-lg p-2 text-left bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 font-bold mb-1">المخاطرة للصفقة (%)</label>
            <input 
              type="number" name="risk_per_trade" value={settings.risk_per_trade} onChange={handleChange} step="0.1"
              className="border border-gray-200 rounded-lg p-2 text-center bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 font-bold mb-1">أقصى صفقات مفتوحة</label>
            <input 
              type="number" name="max_open_trades" value={settings.max_open_trades} onChange={handleChange}
              className="border border-gray-200 rounded-lg p-2 text-center bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 font-bold mb-1">الحد الأقصى للمخاطرة الكلية (%)</label>
            <input 
              type="number" name="max_total_risk" value={settings.max_total_risk} onChange={handleChange} step="1"
              className="border border-gray-200 rounded-lg p-2 text-center bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 font-bold mb-1">أقل R:R مقبول</label>
            <input 
              type="number" name="min_rr" value={settings.min_rr} onChange={handleChange} step="0.1"
              className="border border-gray-200 rounded-lg p-2 text-center bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
            />
          </div>
        </div>

        {/* بطاقات الإحصائيات (المخرجات الحية) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col justify-center items-center">
            <span className="text-gray-500 text-sm font-bold mb-1">الصفقات النشطة</span>
            <span className="text-2xl font-black text-gray-800">0 / {settings.max_open_trades}</span>
          </div>

          <div className={`border rounded-xl p-4 flex flex-col justify-center items-center ${isRiskHigh ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
            <span className={`text-sm font-bold mb-1 ${isRiskHigh ? 'text-red-600' : 'text-blue-600'}`}>إجمالي التعرض للمخاطرة</span>
            <span className={`text-2xl font-black ${isRiskHigh ? 'text-red-700' : 'text-blue-800'}`}>{totalExposurePercent.toFixed(1)}%</span>
            <span className={`text-xs mt-1 ${isRiskHigh ? 'text-red-500' : 'text-blue-400'}`}>
              {isRiskHigh ? '⚠️ تخطيت الحد المسموح!' : `من إجمالي رأس المال (الحد: ${settings.max_total_risk}%)`}
            </span>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col justify-center items-center">
            <span className="text-red-500 text-sm font-bold mb-1">أسوأ سيناريو (Worst Case)</span>
            <span className="text-2xl font-black text-red-700">{worstCaseScenario.toLocaleString()} ج.م</span>
            <span className="text-xs text-red-400 mt-1">إذا ضربت جميع الصفقات وقف الخسارة معاً</span>
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

          <details className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200 cursor-pointer group outline-none">
            <summary className="font-bold outline-none flex justify-between items-center list-none">
              <span>عرض تفاصيل الأسهم بالأسماء (اضغط هنا)</span>
              <span className="text-gray-400 group-open:rotate-180 transition-transform duration-300">▼</span>
            </summary>
            
            <div className="mt-5 space-y-5 pt-5 border-t border-gray-200 cursor-default">
              <div>
                <strong className="text-gray-800 block mb-2">أسهم تم فحصها ولا يوجد بها إشارة (مسار عرضي/هابط):</strong>
                <div className="flex flex-wrap gap-1.5">
                  {scanSummary.scanned_no_signal.map((sym: string) => (
                    <span key={sym} className="bg-white border border-gray-300 text-gray-600 px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm">
                      {sym}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <strong className="text-red-700 block mb-2">أسهم تم استبعادها (لا توجد بيانات كافية):</strong>
                <div className="flex flex-wrap gap-1.5">
                  {scanSummary.excluded.length > 0 ? (
                    scanSummary.excluded.map((sym: string) => (
                      <span key={sym} className="bg-red-50 border border-red-200 text-red-600 px-2.5 py-1 rounded-md text-xs font-semibold">
                        {sym}
                      </span>
                    ))
                  ) : (
                    <span className="text-green-600 text-xs font-bold">لم يتم استبعاد أي سهم ✅</span>
                  )}
                </div>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}