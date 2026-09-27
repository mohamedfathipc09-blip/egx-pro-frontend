'use client';
import React, { useState } from 'react';
import RiskDashboard from '@/components/Risk/RiskDashboard'; // المسار الصحيح للوحة

export default function StrategiesPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false); // حالة لمنع التشغيل التلقائي

  // دالة تشغيل الفحص يدوياً عند الضغط على الزر
  const startScan = () => {
    setHasStarted(true);
    setIsLoading(true);

    fetch('https://egx-pro-api.onrender.com/api/strategies')
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
    <div className="container mx-auto p-4 rtl mb-10">
      <h1 className="text-3xl font-black mb-6 text-gray-800 flex items-center gap-2">
        <span>🧠</span> التوصيات واستراتيجيات التداول
      </h1>
      
      {/* 1. لوحة المخاطر (تظهر دائماً بالأعلى) */}
      <RiskDashboard scanSummary={data?.summary} />

      {/* 2. التحكم في الفحص وعرض النتائج */}
      {!hasStarted ? (
        // حالة البداية: زرار التشغيل اليدوي
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm mt-8">
          <span className="text-6xl block mb-4">🚀</span>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">الرادار جاهز لاستخراج التوصيات</h3>
          <p className="text-gray-500 mb-6">انقر على الزر بالأسفل لبدء فحص السوق وتطبيق الاستراتيجيات</p>
          <button 
            onClick={startScan}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all text-lg flex items-center gap-2 mx-auto"
          >
            <span>بدء مسح السوق الآن</span>
            <span>⚡</span>
          </button>
        </div>
      ) : isLoading ? (
        // حالة التحميل (أثناء الفحص)
        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm mt-8">
          <span className="text-4xl block mb-4 animate-spin w-fit mx-auto">⏳</span>
          <p className="text-xl font-bold text-gray-600 animate-pulse">
            جاري مسح السوق بالكامل واستخراج التوصيات... يرجى الانتظار
          </p>
        </div>
      ) : (
        // حالة الانتهاء: عرض التوصيات
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">
            الفرص المتاحة 🎯 ({data?.signals?.length || 0})
          </h2>
          
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
              <p className="text-xl text-gray-600 font-bold">لا توجد إشارات قوية في السوق حالياً بعد الفحص.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}