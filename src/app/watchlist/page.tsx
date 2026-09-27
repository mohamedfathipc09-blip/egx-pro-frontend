"use client";

import { useState, useEffect } from 'react';

// تعريف واجهة البيانات بناءً على المخرجات الجديدة لمحرك الاستراتيجيات
interface Signal {
  symbol: string;
  name?: string;
  type: string;
  timeframe: string;
  confidence_score: number;
  confidence_text: string;
  strategies: string[];
  message: string;
  entry_price: number;
  stop_loss?: number;
  take_profit?: number;
  rsi?: number | string;
  rvol?: number | string;
  warnings?: string[];
}

export default function StrategiesPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        // جلب البيانات من مسار التوصيات المحفوظة لضمان سرعة الاستجابة
        const res = await fetch('https://egx-pro-api.onrender.com/api/recommendations');
        if (res.ok) {
          const data = await res.json();
          // ترتيب التوصيات بحيث تظهر إشارات الشراء ذات الثقة الأعلى أولاً
          const sortedData = data.sort((a: Signal, b: Signal) => {
            if (a.type === 'BUY' && b.type !== 'BUY') return -1;
            if (a.type !== 'BUY' && b.type === 'BUY') return 1;
            return b.confidence_score - a.confidence_score;
          });
          setSignals(sortedData);
        }
      } catch (error) {
        console.error("خطأ في جلب التوصيات:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-blue-600"></div>
        <p className="text-gray-500 font-bold animate-pulse">جاري جلب أحدث التوصيات الذكية...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-gray-200 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">🧠</span> التوصيات الذكية
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            إشارات تم تصفيتها آلياً بناءً على {signals.length > 0 ? 'أحدث مسح للسوق' : 'خوارزميات الذكاء الاصطناعي'}
          </p>
        </div>
        <div className="bg-blue-100 text-blue-800 px-5 py-2 rounded-xl font-bold text-sm shadow-sm border border-blue-200">
          تم رصد {signals.length} إشارة
        </div>
      </div>

      {signals.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
          <span className="text-7xl mb-6 block">🔍</span>
          <h3 className="text-2xl font-black text-gray-600">لا توجد توصيات مؤكدة حالياً</h3>
          <p className="text-gray-400 mt-3 text-lg">السوق لا يلبي شروط الخوارزميات حالياً، البوت في حالة مراقبة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {signals.map((signal, index) => {
            const isBuy = signal.type === 'BUY';
            const profitPct = isBuy && signal.take_profit && signal.entry_price 
              ? (((signal.take_profit - signal.entry_price) / signal.entry_price) * 100).toFixed(2) : "0.00";
            const lossPct = isBuy && signal.stop_loss && signal.entry_price 
              ? (((signal.entry_price - signal.stop_loss) / signal.entry_price) * 100).toFixed(2) : "0.00";

            return (
              <div key={index} className={`bg-white rounded-3xl shadow-sm border p-6 relative overflow-hidden transition-all hover:shadow-lg ${
                isBuy ? 'border-green-100 hover:border-green-300' : 'border-red-100 hover:border-red-300'
              }`}>
                {/* شريط زينة جانبي */}
                <div className={`absolute top-0 right-0 h-full w-1.5 ${isBuy ? 'bg-green-500' : 'bg-red-500'}`}></div>

                {/* رأس الكارت */}
                <div className="flex justify-between items-start mb-5 pl-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider ${
                        isBuy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {isBuy ? '🟢 شراء' : '🔴 تجنب / بيع'}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                        {signal.timeframe}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">{signal.symbol}</h2>
                    <p className="text-sm text-gray-500 font-bold">{signal.name || 'سهم مصري'}</p>
                  </div>
                  <div className="text-left bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                    <span className="block text-[10px] text-gray-500 font-bold uppercase">السعر الحالي</span>
                    <span className={`block text-xl font-black ${isBuy ? 'text-green-700' : 'text-red-700'}`}>
                      {signal.entry_price}
                    </span>
                  </div>
                </div>

                {/* المؤشرات الفنية السريعة */}
                <div className="flex gap-3 mb-5">
                  <div className="bg-gray-50 flex-1 p-2 rounded-lg text-center border border-gray-100">
                    <span className="block text-[10px] text-gray-400 font-bold">RSI</span>
                    <span className="block text-sm font-bold text-gray-700">{signal.rsi !== "N/A" ? signal.rsi : '-'}</span>
                  </div>
                  <div className="bg-gray-50 flex-1 p-2 rounded-lg text-center border border-gray-100">
                    <span className="block text-[10px] text-gray-400 font-bold">RVOL</span>
                    <span className="block text-sm font-bold text-gray-700">{signal.rvol !== "N/A" ? `${signal.rvol}x` : '-'}</span>
                  </div>
                  <div className="bg-gray-50 flex-1 p-2 rounded-lg text-center border border-gray-100">
                    <span className="block text-[10px] text-gray-400 font-bold">قوة التوافق</span>
                    <span className="block text-sm font-bold text-blue-600">{signal.confidence_text}</span>
                  </div>
                </div>

                {/* الأهداف والوقف (للشراء فقط) */}
                {isBuy && signal.take_profit && signal.stop_loss && (
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                      <span className="block text-xs text-green-700 font-bold mb-1">🎯 الهدف</span>
                      <div className="flex justify-between items-baseline">
                        <span className="text-lg font-black text-green-800">{signal.take_profit}</span>
                        <span className="text-xs font-bold text-green-600">+{profitPct}%</span>
                      </div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                      <span className="block text-xs text-red-700 font-bold mb-1">🛑 الوقف</span>
                      <div className="flex justify-between items-baseline">
                        <span className="text-lg font-black text-red-800">{signal.stop_loss}</span>
                        <span className="text-xs font-bold text-red-600">-{lossPct}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* السبب */}
                <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-100 mb-4">
                  <span className="block text-xs text-blue-700 font-bold mb-1">💡 سبب الإشارة</span>
                  <p className="text-sm font-bold text-blue-900 leading-relaxed">
                    {signal.message}
                  </p>
                </div>

                {/* 🚨 تحذيرات المخاطرة (تظهر فقط لو في تحذيرات) */}
                {signal.warnings && signal.warnings.length > 0 && (
                  <div className="bg-yellow-50 p-3.5 rounded-xl border border-yellow-200">
                    <span className="flex text-xs text-yellow-800 font-black mb-2 items-center gap-1">
                      <span>⚠️</span> تحذيرات المخاطرة
                    </span>
                    <ul className="space-y-1.5">
                      {signal.warnings.map((warn, i) => (
                        <li key={i} className="text-xs font-bold text-yellow-700 flex items-start gap-1.5">
                          <span className="text-yellow-500 mt-0.5">•</span>
                          <span>{warn}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}