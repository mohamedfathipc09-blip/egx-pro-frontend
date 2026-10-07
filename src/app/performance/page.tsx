"use client";
import React, { useState, useEffect } from 'react';

// ==========================================
// تعريف الواجهات (Interfaces) للبيانات القادمة من الباك إند
// ==========================================
interface SummaryData {
  total_executed: number;
  winners: number;
  losers: number;
  win_rate: string;
  profit_factor: number;
  average_return: string;
  total_return: string;
  tp1_rate: string;
  tp2_rate: string;
  tp3_rate: string;
}

interface DailyHistory {
  date: string;
  win_rate: number;
  profit_factor: number;
  total_signals: number;
  winners: number;
  losers: number;
  average_return: number;
}

interface ClosedTrade {
  id: number;
  symbol: string;
  strategy: string;
  entry_price: number;
  exit_price: number;
  return_pct: number;
  actual_rr: number;
  exit_reason: string;
  status: string;
  closed_at: string;
}

export default function PerformancePage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [history, setHistory] = useState<DailyHistory[]>([]);
  const [trades, setTrades] = useState<ClosedTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const isLocal = window.location.hostname === 'localhost';
        const baseUrl = isLocal ? 'http://localhost:8000' : 'https://egx-pro-api.onrender.com';
        
        // جلب البيانات من المسارات الثلاثة في نفس الوقت لتسريع التحميل
        const [summaryRes, historyRes, tradesRes] = await Promise.all([
          fetch(`${baseUrl}/api/performance/summary`),
          fetch(`${baseUrl}/api/performance/daily-history`),
          fetch(`${baseUrl}/api/performance/closed-trades`)
        ]);

        if (summaryRes.ok) setSummary(await summaryRes.json());
        if (historyRes.ok) setHistory(await historyRes.json());
        if (tradesRes.ok) setTrades(await tradesRes.json());
        
      } catch (error) {
        console.error("خطأ في جلب بيانات لوحة الأداء:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-blue-600"></div>
        <p className="text-gray-500 font-bold animate-pulse">جاري حساب الإحصائيات المؤسسية...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      
      {/* الهيدر */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm mb-8 border border-gray-100 flex flex-col md:flex-row justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3 mb-2">
            <span className="text-4xl">📊</span> الأداء والإحصائيات
          </h1>
          <p className="text-gray-500 font-medium">
            لوحة القياس الكمية: متابعة حية لنسب النجاح، عامل الربح (Profit Factor)، وتاريخ الصفقات.
          </p>
        </div>
      </div>

      {summary && (
        <>
          {/* كروت الإحصائيات الإجمالية */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* نسبة النجاح */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl shadow-lg text-center text-white">
              <p className="text-sm text-emerald-100 font-bold mb-2">نسبة النجاح (Win Rate)</p>
              <p className="text-5xl font-black mb-1" dir="ltr">{summary.win_rate}</p>
              <p className="text-xs text-emerald-200">من إجمالي {summary.total_executed} صفقة منتهية</p>
            </div>

            {/* عامل الربح (Profit Factor) */}
            <div className={`p-6 rounded-2xl shadow-sm border text-center ${summary.profit_factor >= 1.5 ? 'bg-white border-green-200' : 'bg-white border-red-200'}`}>
              <p className="text-sm text-gray-500 font-bold mb-2">عامل الربح (Profit Factor)</p>
              <p className={`text-4xl font-black ${summary.profit_factor >= 1.5 ? 'text-green-600' : 'text-red-500'}`} dir="ltr">
                {summary.profit_factor}
              </p>
              <p className="text-xs text-gray-400 mt-2">المعيار المؤسسي: أعلى من 1.5</p>
            </div>

            {/* العوائد */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
              <p className="text-sm text-gray-500 font-bold mb-2">متوسط ربح الصفقة</p>
              <p className="text-4xl font-black text-blue-600" dir="ltr">{summary.average_return}</p>
              <div className="mt-2 text-xs font-bold text-gray-400">
                العائد التراكمي: <span className={summary.total_return.includes('-') ? 'text-red-500' : 'text-green-500'} dir="ltr">{summary.total_return}</span>
              </div>
            </div>

            {/* أداء الأهداف (TP Rates) */}
            <div className="bg-slate-800 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-center">
              <p className="text-sm text-slate-300 font-bold mb-3 text-center">معدل تحقيق الأهداف</p>
              <div className="space-y-2 text-sm font-bold">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-400">الهدف الأول (TP1)</span>
                  <span dir="ltr">{summary.tp1_rate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-300">الهدف الثاني (TP2)</span>
                  <span dir="ltr">{summary.tp2_rate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-200">الهدف الثالث (TP3)</span>
                  <span dir="ltr">{summary.tp3_rate}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* جدول الصفقات المغلقة (يأخذ ثلثين المساحة) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-black text-gray-800">📜 أحدث الصفقات المغلقة</h2>
            <span className="text-xs bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full">آخر {trades.length} صفقة</span>
          </div>
          
          {trades.length === 0 ? (
            <div className="p-8 text-center text-gray-500">لا توجد صفقات مغلقة حتى الآن.</div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-right text-sm">
                <thead className="sticky top-0 bg-gray-50 shadow-sm">
                  <tr className="text-gray-500 border-b border-gray-200">
                    <th className="p-4 font-bold">السهم</th>
                    <th className="p-4 font-bold">الاستراتيجية</th>
                    <th className="p-4 font-bold">الدخول / الخروج</th>
                    <th className="p-4 font-bold">العائد الفعلي</th>
                    <th className="p-4 font-bold">R:R</th>
                    <th className="p-4 font-bold">سبب الإغلاق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="p-4 font-black text-gray-800">{trade.symbol}</td>
                      <td className="p-4 text-gray-600 text-xs font-medium">{trade.strategy}</td>
                      <td className="p-4 text-gray-600 font-medium" dir="ltr">
                        {trade.entry_price} → {trade.exit_price}
                      </td>
                      <td className="p-4 font-black" dir="ltr">
                        <span className={trade.return_pct > 0 ? 'text-green-600' : 'text-red-500'}>
                          {trade.return_pct > 0 ? '+' : ''}{trade.return_pct}%
                        </span>
                      </td>
                      <td className="p-4 font-bold text-gray-700" dir="ltr">{trade.actual_rr}R</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          trade.status.includes('WIN') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {trade.exit_reason.replace('_HIT', '')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* جدول الأداء اليومي (يأخذ ثلث المساحة) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xl font-black text-gray-800">📅 الأداء اليومي</h2>
          </div>
          
          {history.length === 0 ? (
            <div className="p-8 text-center text-gray-500">لم يتم تسجيل أي أداء يومي.</div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-right text-sm">
                <thead className="sticky top-0 bg-gray-50 shadow-sm">
                  <tr className="text-gray-500 border-b border-gray-200">
                    <th className="p-4 font-bold">التاريخ</th>
                    <th className="p-4 font-bold">الربح</th>
                    <th className="p-4 font-bold">الخسارة</th>
                    <th className="p-4 font-bold">Win%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((day, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-bold text-gray-700" dir="ltr">{day.date}</td>
                      <td className="p-4 font-bold text-green-600">{day.winners}</td>
                      <td className="p-4 font-bold text-red-500">{day.losers}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-black ${
                          day.win_rate >= 60 ? 'bg-green-100 text-green-700' : 
                          day.win_rate >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`} dir="ltr">
                          {day.win_rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}