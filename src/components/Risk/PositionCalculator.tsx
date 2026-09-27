'use client';
import React, { useState } from 'react';
import { useRiskManagement } from '@/hooks/useRiskManagement';

interface Props {
  symbol: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
}

export default function PositionCalculator({ symbol, entryPrice, stopLoss, takeProfit }: Props) {
  const { isLoaded, calculatePosition, calculateRR, settings, addTrade } = useRiskManagement();
  const [showCalc, setShowCalc] = useState(false);
const handleAddToWatchlist = async () => {
    try {
      const response = await fetch("https://egx-pro-api.onrender.com/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: symbol,
          entry_price: entryPrice,
          target: takeProfit,
          stop_loss: stopLoss,
        }),
      });

      if (response.ok) {
        alert(`✅ تم إضافة السهم ${symbol} لقائمة المراقبة اللحظية للبوت!`);
      } else {
        alert("❌ حدث خطأ أثناء الإضافة.");
      }
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      alert("❌ تأكد من أن السيرفر (Backend) يعمل.");
    }
  };
  if (!isLoaded) return null;

  const recommendedShares = calculatePosition(entryPrice, stopLoss);
  const rrRatio = calculateRR(entryPrice, stopLoss, takeProfit);
  const totalCost = recommendedShares * entryPrice;
  const isRRValid = rrRatio >= settings.minRiskReward;

  // إخفاء التوصية تماماً إذا كان فلتر الـ R:R غير مطابق (بناءً على طلبك)
  if (!isRRValid) return (
    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-bold border border-red-200 mt-4">
      ⚠️ تم حجب الصفقة رياضياً: العائد للمخاطرة ({rrRatio}:1) أقل من الحد الأدنى ({settings.minRiskReward}:1)
    </div>
  );

  return (
    <div className="mt-4 border border-blue-100 bg-blue-50/50 rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-bold text-blue-900 flex items-center gap-2">
          <span>🛡️</span> إدارة المخاطر الآلية
        </h4>
        <button 
          onClick={() => setShowCalc(!showCalc)}
          className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-50 transition"
        >
          {showCalc ? 'إخفاء التفاصيل' : 'عرض حجم المركز'}
        </button>
      </div>

      {showCalc && (
        <div className="space-y-3 mt-3 border-t border-blue-100 pt-3 animate-fade-in text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
              <span className="block text-gray-500 text-xs mb-1">نسبة العائد/المخاطرة</span>
              <span className="font-black text-green-700">{rrRatio} : 1</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
              <span className="block text-gray-500 text-xs mb-1">الأسهم المسموحة</span>
              <span className="font-black text-gray-800">{recommendedShares.toLocaleString()} سهم</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
              <span className="block text-gray-500 text-xs mb-1">تكلفة الدخول</span>
              <span className="font-black text-blue-700">{totalCost.toLocaleString()} ج.م</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-red-100 shadow-sm">
              <span className="block text-gray-500 text-xs mb-1">أقصى خسارة (وقف)</span>
              <span className="font-black text-red-600">
                {((entryPrice - stopLoss) * recommendedShares).toLocaleString()} ج.م
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => {
              addTrade({ symbol, entryPrice, stopLoss, takeProfit, shares: recommendedShares });
            }}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>➕</span> إضافة الصفقة لمحفظة المتابعة
          </button>
        </div>
      )}
    </div>
  );
}