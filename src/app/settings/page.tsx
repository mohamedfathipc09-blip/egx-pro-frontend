"use client";

import { useState, useEffect } from 'react';

interface RiskSettings {
  capital: number;
  risk_per_trade: number;
  max_open_trades: number;
  max_total_risk: number;
  min_rr: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<RiskSettings>({
    capital: 100000,
    risk_per_trade: 2.0,
    max_open_trades: 8,
    max_total_risk: 20.0,
    min_rr: 1.5
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const API_URL = 'https://egx-pro-api.onrender.com/api/settings';

  useEffect(() => {
    // جلب الإعدادات الحالية من الباك إند
    const fetchSettings = async () => {
      try {
        const res = await fetch(API_URL);
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (error) {
        console.error("خطأ في جلب الإعدادات:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح! البوت سيستخدمها الآن.' });
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ type: 'error', text: 'حدث خطأ أثناء حفظ الإعدادات.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'تعذر الاتصال بالسيرفر.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <span className="text-4xl">⚙️</span> إعدادات إدارة المخاطر
        </h1>
        <p className="text-gray-500 mt-2">
          يستخدم المساعد الآلي (Telegram Bot) هذه الإعدادات لتحديد حجم صفقاتك وحساب كمية الأسهم المناسبة لتوصيات الشراء.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl font-bold flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          <span className="text-xl">{message.type === 'success' ? '✅' : '❌'}</span>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-8">
        
        {/* رأس المال والمخاطرة */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block font-bold text-gray-700">إجمالي رأس المال (ج.م)</label>
            <div className="relative">
              <input 
                type="number" 
                name="capital"
                value={settings.capital}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold text-lg"
                required
              />
              <span className="absolute left-4 top-3.5 text-gray-400 font-bold">EGP</span>
            </div>
            <p className="text-xs text-gray-500">سيتم حساب حجم الصفقة بناءً على هذا الرقم.</p>
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-gray-700">المخاطرة في الصفقة الواحدة (%)</label>
            <div className="relative">
              <input 
                type="number"
                step="0.1" 
                name="risk_per_trade"
                value={settings.risk_per_trade}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-bold text-lg"
                required
              />
              <span className="absolute left-4 top-3.5 text-gray-400 font-bold">%</span>
            </div>
            <p className="text-xs text-gray-500">النسبة المئوية من رأس المال التي أنت مستعد لخسارتها إذا ضُرب الوقف.</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block font-bold text-gray-700 text-sm">أقصى عدد صفقات مفتوحة</label>
            <input 
              type="number" 
              name="max_open_trades"
              value={settings.max_open_trades}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-gray-700 text-sm">إجمالي المخاطرة التراكمية (%)</label>
            <input 
              type="number"
              step="0.1" 
              name="max_total_risk"
              value={settings.max_total_risk}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-gray-700 text-sm">الحد الأدنى لنسبة العائد (R:R)</label>
            <input 
              type="number"
              step="0.1" 
              name="min_rr"
              value={settings.min_rr}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit"
            disabled={saving}
            className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-md ${
              saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
            }`}
          >
            {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
          </button>
        </div>
      </form>
    </div>
  );
}