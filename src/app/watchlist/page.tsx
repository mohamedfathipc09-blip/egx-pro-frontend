"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

// واجهة البيانات المطابقة للمسار المؤسسي الجديد
interface ActiveTrade {
  id: number;
  symbol: string;
  strategy: string;
  state: string; // PENDING, ACTIVE, TP1_HIT, TP2_HIT
  score: number;
  entry_zone: string;
  entry_price: number;
  stop_loss: number;
  target_1: number;
  target_2?: number;
  target_3?: number;
  risk_reward: number;
  reasoning: string;
  updated_at: string;
}

export default function StrategiesPage() {
  const [portfolio, setPortfolio] = useState<ActiveTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPortfolio = async () => {
    try {
      const isLocal = window.location.hostname === 'localhost';
      const baseUrl = isLocal ? 'http://localhost:8000' : 'https://egx-pro-api.onrender.com';
      
      const res = await fetch(`${baseUrl}/api/portfolio/active`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          // ترتيب التوصيات النشطة حسب الأحدث
          const sorted = data.portfolio.sort((a: any, b: any) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
          setPortfolio(sorted);
        }
      } else {
        setError('فشل جلب المحفظة النشطة');
      }
    } catch (error) {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    // تحديث المحفظة كل دقيقة أثناء الجلسة لرؤية تغير الحالات (TP1, ACTIVE...)
    const interval = setInterval(fetchPortfolio, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-blue-600"></div>
        <p className="text-gray-500 font-bold animate-pulse">جاري جلب المحفظة اللحظية...</p>
      </div>
    );
  }

  // دالة مساعدة لترجمة حالة الصفقة لألوان ونصوص مفهومة
  const getStateBadge = (state: string) => {
    switch (state) {
      case 'PENDING':
        return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-black">⏳ قيد الانتظار (لم تفعل)</span>;
      case 'ACTIVE':
        return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-black">▶️ صفقة مفعلة (مفتوحة)</span>;
      case 'TP1_HIT':
        return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black">🎯 حققت الهدف 1</span>;
      case 'TP2_HIT':
        return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black">🎯🎯 حققت الهدف 2</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-black">{state}</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in p-4 md:p-8" dir="rtl">
      
      {/* الهيدر الرئيسي */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3 mb-2">
            <span className="text-4xl">💼</span> المحفظة اللحظية (Active Trades)
          </h1>
          <p className="text-gray-500 font-medium">
            تراقب هذه الشاشة الصفقات المعتمدة لحظياً أثناء الجلسة وترصد ضرب الأهداف أو تفعيل الدخول.
          </p>
        </div>
        <div className="bg-blue-50 text-blue-800 px-5 py-3 rounded-xl font-bold text-sm shadow-sm border border-blue-100 flex items-center gap-2">
          <span>📊 صفقات مفتوحة:</span>
          <span className="text-xl font-black">{portfolio.length}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <p className="text-red-700 font-bold">{error}</p>
        </div>
      )}

      {/* لو مفيش صفقات نشطة */}
      {portfolio.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
          <span className="text-7xl mb-6 block">😴</span>
          <h3 className="text-2xl font-black text-gray-600 mb-2">لا توجد صفقات نشطة في المحفظة</h3>
          <p className="text-gray-400 text-lg">قم بمراجعة "رادار الفرص" واعتماد بعض الأسهم لبدء المراقبة.</p>
          <Link href="/radar">
            <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all">
              الذهاب للرادار 📡
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {portfolio.map((trade) => {
            const profitPct = trade.target_1 && trade.entry_price 
              ? (((trade.target_1 - trade.entry_price) / trade.entry_price) * 100).toFixed(2) : "0.00";
            const lossPct = trade.stop_loss && trade.entry_price 
              ? (((trade.entry_price - trade.stop_loss) / trade.entry_price) * 100).toFixed(2) : "0.00";

            return (
              <div key={trade.id} className="bg-white rounded-3xl shadow-sm border border-blue-50 p-6 relative overflow-hidden transition-all hover:shadow-lg">
                
                {/* شريط حالة علوي */}
                <div className="absolute top-0 right-0 h-1.5 w-full bg-blue-500"></div>

                {/* رأس الكارت */}
                <div className="flex justify-between items-start mb-5 border-b pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {getStateBadge(trade.state)}
                    </div>
                    <h2 className="text-3xl font-black text-gray-900">{trade.symbol}</h2>
                    <p className="text-xs text-gray-500 font-bold mt-1 px-2 py-1 bg-gray-100 rounded inline-block">
                      {trade.strategy}
                    </p>
                  </div>
                  <div className="text-center bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                    <span className="block text-[10px] text-gray-500 font-bold uppercase">التقييم</span>
                    <span className="block text-2xl font-black text-blue-700" dir="ltr">
                      {trade.score}
                    </span>
                  </div>
                </div>

                {/* الأهداف والوقف */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                    <span className="block text-xs text-green-700 font-bold mb-1">🎯 الهدف الأول</span>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xl font-black text-green-800" dir="ltr">{trade.target_1}</span>
                      <span className="text-xs font-bold text-green-600" dir="ltr">+{profitPct}%</span>
                    </div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                    <span className="block text-xs text-red-700 font-bold mb-1">🛑 الوقف</span>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xl font-black text-red-800" dir="ltr">{trade.stop_loss}</span>
                      <span className="text-xs font-bold text-red-600" dir="ltr">-{lossPct}%</span>
                    </div>
                  </div>
                </div>

                {/* تفاصيل إضافية */}
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 mb-4 flex justify-between items-center">
                  <div>
                    <span className="block text-[10px] text-gray-500 font-bold uppercase mb-1">منطقة الدخول المحددة</span>
                    <span className="text-sm font-black text-gray-800" dir="ltr">{trade.entry_zone}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Risk / Reward</span>
                    <span className="text-sm font-black text-gray-800" dir="ltr">{trade.risk_reward} : 1</span>
                  </div>
                </div>

                <div className="text-xs text-gray-400 flex justify-between px-1">
                  <span>آخر تحديث للحالة:</span>
                  <span dir="ltr">{trade.updated_at}</span>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}