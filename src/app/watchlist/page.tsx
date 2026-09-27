"use client";
import React, { useState, useEffect } from 'react';

interface WatchlistItem {
  symbol: string;
  entry_price: number;
  target: number;
  stop_loss: number;
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // جلب الأسهم من الباك إند
  // جلب الأسهم من الباك إند
  const fetchWatchlist = async () => {
    try {
      const res = await fetch("https://egx-pro-api.onrender.com/api/watchlist");
      const data = await res.json();
      
      // التعديل هنا: نتأكد إن البيانات راجعة في شكل مصفوفة (Array)
      if (Array.isArray(data)) {
        setWatchlist(data);
      } else {
        console.warn("بيانات المحفظة لم تعد في شكل مصفوفة:", data);
        setWatchlist([]); // نعتبرها فارغة عشان الصفحة ماتضربش
      }
    } catch (err) {
      console.error("Error fetching watchlist:", err);
      setWatchlist([]); // في حالة انقطاع الاتصال
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  // دالة الحذف
  const handleDelete = async (symbol: string) => {
    if (!confirm(`هل أنت متأكد من حذف ${symbol} من المراقبة اللحظية؟`)) return;
    
    try {
      const res = await fetch(`https://egx-pro-api.onrender.com/api/watchlist/${symbol}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        // تحديث الواجهة بعد الحذف
        setWatchlist(watchlist.filter(item => item.symbol !== symbol));
      } else {
        alert("❌ حدث خطأ أثناء الحذف.");
      }
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  return (
    <div className="p-6 rtl" dir="rtl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            🎯 محفظة المتابعة اللحظية
          </h2>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
            {watchlist.length} أسهم تحت المراقبة
          </span>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">جاري تحميل المحفظة...</div>
        ) : watchlist.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-gray-500 text-lg">لا توجد أسهم حالياً في قائمة المتابعة.</p>
            <p className="text-gray-400 text-sm mt-2">قم بإضافة صفقات من صفحة التوصيات ليقوم البوت بمراقبتها.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-4 font-semibold text-gray-600">السهم</th>
                  <th className="p-4 font-semibold text-gray-600">سعر الدخول</th>
                  <th className="p-4 font-semibold text-green-600">الهدف</th>
                  <th className="p-4 font-semibold text-red-600">وقف الخسارة</th>
                  <th className="p-4 font-semibold text-gray-600 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((item) => (
                  <tr key={item.symbol} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-800">{item.symbol}</td>
                    <td className="p-4 text-gray-600">{item.entry_price} ج.م</td>
                    <td className="p-4 text-green-600 font-medium">{item.target} ج.م</td>
                    <td className="p-4 text-red-600 font-medium">{item.stop_loss} ج.م</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDelete(item.symbol)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        إيقاف المراقبة 🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}