import React from 'react';

const StrategyStats = () => {
  // بيانات افتراضية (يتم جلبها لاحقاً من الباك إند بناءً على الباك تيست)
  const stats = [
    { name: "انفجار بولينجر", winRate: 72, trades: 145 },
    { name: "تقاطع المتوسطات", winRate: 68, trades: 89 },
    { name: "الدعوم والمقاومات", winRate: 64, trades: 312 },
    { name: "تقاطع الماكد (MACD)", winRate: 59, trades: 210 },
    { name: "مؤشر القوة النسبية (RSI)", winRate: 55, trades: 405 },
  ];

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm rtl mt-8">
      <h2 className="text-xl font-bold text-gray-800 mb-6">📊 أداء الاستراتيجيات في السوق المصري</h2>
      
      <div className="space-y-5">
        {stats.map((stat, idx) => (
          <div key={idx}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-gray-700">{stat.name}</span>
              <span className="text-sm font-bold text-gray-900">{stat.winRate}% (نسبة النجاح)</span>
            </div>
            
            {/* شريط التقدم (Progress Bar) */}
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${stat.winRate > 65 ? 'bg-green-500' : stat.winRate > 55 ? 'bg-blue-500' : 'bg-amber-500'}`}
                style={{ width: `${stat.winRate}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">إجمالي الصفقات: {stat.trades}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StrategyStats;