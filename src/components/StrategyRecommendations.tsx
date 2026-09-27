import React, { useState } from 'react';
import PositionCalculator from './Risk/PositionCalculator'; // 👈 استدعاء حاسبة المخاطر

export interface Signal {
  symbol: string;
  type: 'BUY' | 'SELL';
  confidence_score: number;
  strategies: string[];
  message: string;
  // 👇 الحقول الجديدة الخاصة بإدارة المخاطر التي سيرسلها الباك إند
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
}

interface StrategyRecommendationsProps {
  signals: Signal[];
}

const StrategyRecommendations = ({ signals }: StrategyRecommendationsProps) => {
  const [activeFilter, setActiveFilter] = useState<string>('الكل');
  
  const strategyNames = ['الكل', 'تقاطع المتوسطات', 'مؤشر القوة النسبية (RSI)', 'تقاطع الماكد (MACD)', 'انفجار بولينجر', 'الدعوم والمقاومات'];

  const filteredSignals = activeFilter === 'الكل' 
    ? signals 
    : signals.filter((signal) => signal.strategies.includes(activeFilter));

  // دالة تحديد المدى الزمني ولون الشارة لكل استراتيجية
  const getStrategyHorizon = (name: string) => {
    switch (name) {
      case 'تقاطع المتوسطات': 
        return { text: 'متوسط/طويل الأجل 📅', color: 'bg-purple-100 text-purple-800' };
      case 'مؤشر القوة النسبية (RSI)': 
        return { text: 'قصير الأجل ⚡', color: 'bg-orange-100 text-orange-800' };
      case 'تقاطع الماكد (MACD)': 
        return { text: 'قصير/متوسط ⏳', color: 'bg-blue-100 text-blue-800' };
      case 'انفجار بولينجر': 
        return { text: 'مضاربة لحظية 🚀', color: 'bg-pink-100 text-pink-800' };
      case 'الدعوم والمقاومات': 
        return { text: 'لكل الفريمات 🎯', color: 'bg-gray-200 text-gray-800' };
      default: 
        return { text: 'عام', color: 'bg-gray-100 text-gray-600' };
    }
  };

  return (
    <div className="rtl">
      {/* الفلتر (Filter) */}
      <div className="flex flex-wrap gap-2 mb-6">
        {strategyNames.map((name) => (
          <button
            key={name}
            onClick={() => setActiveFilter(name)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
              activeFilter === name 
                ? 'bg-blue-600 text-white shadow-md scale-105' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* عرض التوصيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSignals.map((signal, idx) => (
          <div key={idx} className={`p-5 rounded-xl border-r-4 shadow-sm bg-white ${signal.type === 'BUY' ? 'border-green-500' : 'border-red-500'}`}>
            <div className="flex justify-between items-start mb-3">
              <span className="text-2xl font-black text-gray-800">{signal.symbol}</span>
              <span className={`px-3 py-1 rounded-lg text-sm font-black shadow-sm ${signal.type === 'BUY' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {signal.type === 'BUY' ? 'شراء' : 'بيع / تجنب'}
              </span>
            </div>
            
            <p className="text-gray-700 text-sm mb-4 font-semibold leading-relaxed">
              {signal.message}
            </p>
            
            {/* شارات الاستراتيجيات مع المدى الزمني */}
            <div className="flex flex-col gap-2 mt-2">
              {signal.strategies.map((strat, sIdx) => {
                const horizon = getStrategyHorizon(strat);
                return (
                  <div key={sIdx} className="flex items-center text-xs border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    {/* اسم الاستراتيجية */}
                    <span className="px-2 py-1.5 bg-gray-50 text-gray-700 font-bold flex-1">
                      {strat}
                    </span>
                    {/* المدى الزمني */}
                    <span className={`px-2 py-1.5 border-r border-gray-200 font-black ${horizon.color}`}>
                      {horizon.text}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* مؤشر قوة الإشارة (التوافق) */}
            {signal.confidence_score > 1 && (
              <div className="mt-4 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800 font-black">
                <span>⭐</span> إشارة قوية مدعومة بـ {signal.confidence_score} استراتيجيات
              </div>
            )}

            {/* 👇 دمج حاسبة المخاطر فقط في حالة الشراء ووجود أسعار من الباك إند 👇 */}
            {signal.type === 'BUY' && signal.entry_price && signal.stop_loss && signal.take_profit && (
              <PositionCalculator 
                symbol={signal.symbol}
                entryPrice={signal.entry_price}
                stopLoss={signal.stop_loss}
                takeProfit={signal.take_profit}
              />
            )}
            
          </div>
        ))}
      </div>
    </div>
  );
};

export default StrategyRecommendations;