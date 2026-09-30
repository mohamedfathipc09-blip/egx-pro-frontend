"use client";
import React, { useState, useEffect } from 'react';

interface DailyPerf {
  id: number;
  date: string;
  total_signals: number;
  winners: number;
  losers: number;
  cancelled: number;
  win_rate: number;
}

export default function PerformancePage() {
  const [performance, setPerformance] = useState<DailyPerf[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const isLocal = window.location.hostname === 'localhost';
        const baseUrl = isLocal ? 'http://localhost:8000' : 'https://egx-pro-api.onrender.com';
        
        const res = await fetch(`${baseUrl}/api/performance`);
        if (res.ok) {
          const data = await res.json();
          setPerformance(data.performance);
        }
      } catch (error) {
        console.error("خطأ في جلب بيانات الأداء", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  // حساب الإحصائيات الإجمالية
  const totalTrades = performance.reduce((acc, curr) => acc + curr.total_signals, 0);
  const totalWinners = performance.reduce((acc, curr) => acc + curr.winners, 0);
  const totalLosers = performance.reduce((acc, curr) => acc + curr.losers, 0);
  const overallWinRate = totalTrades > 0 ? ((totalWinners / totalTrades) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      
      {/* الهيدر */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm mb-8 border border-gray-100">
        <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3 mb-2">
          <span className="text-4xl">📈</span> لوحة الأداء والتحليلات
        </h1>
        <p className="text-gray-500 font-medium">
          متابعة دقيقة لنسب نجاح النظام المؤسسي والصفقات المغلقة.
        </p>
      </div>

      {/* الإحصائيات الإجمالية */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-500 font-bold mb-2">إجمالي الصفقات المغلقة</p>
          <p className="text-4xl font-black text-gray-800" dir="ltr">{totalTrades}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 text-center">
          <p className="text-sm text-green-600 font-bold mb-2">الصفقات الرابحة</p>
          <p className="text-4xl font-black text-green-600" dir="ltr">{totalWinners}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 text-center">
          <p className="text-sm text-red-500 font-bold mb-2">الصفقات الخاسرة</p>
          <p className="text-4xl font-black text-red-500" dir="ltr">{totalLosers}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl shadow-lg text-center text-white">
          <p className="text-sm text-blue-100 font-bold mb-2">نسبة النجاح الكلية (Win Rate)</p>
          <p className="text-4xl font-black" dir="ltr">{overallWinRate}%</p>
        </div>
      </div>

      {/* جدول الأداء اليومي */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-black text-gray-800">سجل الأداء اليومي</h2>
        </div>
        
        {performance.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <span className="text-5xl block mb-4">📭</span>
            <p className="font-bold">لم يتم تسجيل أي أداء حتى الآن.</p>
            <p className="text-sm mt-2">سيقوم البوت بتسجيل الأداء تلقائياً بعد إغلاق جلسة التداول.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm border-b">
                  <th className="p-4 font-bold">التاريخ</th>
                  <th className="p-4 font-bold">إجمالي الإشارات</th>
                  <th className="p-4 font-bold text-green-600">الأهداف المضروبة</th>
                  <th className="p-4 font-bold text-red-500">الوقف المضروب</th>
                  <th className="p-4 font-bold">نسبة النجاح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {performance.map((day) => (
                  <tr key={day.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-800" dir="ltr">{day.date}</td>
                    <td className="p-4 font-bold">{day.total_signals}</td>
                    <td className="p-4 font-bold text-green-600">{day.winners}</td>
                    <td className="p-4 font-bold text-red-500">{day.losers}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
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
  );
}