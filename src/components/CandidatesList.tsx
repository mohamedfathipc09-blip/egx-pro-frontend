'use client';
import React, { useState, useEffect } from 'react';

// 1. تعريف واجهة البيانات (Interface) لتتوافق مع TypeScript
interface Candidate {
  id: number;
  symbol: string;
  strategy: string;
  score: number;
  entry_zone: string;
  stop_loss: number;
  target_1: number;
  target_2: number | null;
  risk_reward: number;
  created_at: string;
}

export default function CandidatesList() {
  // 2. استخدام الـ Interface مع الـ State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 3. جلب الفرص المرشحة من قاعدة البيانات
  const fetchCandidates = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/recommendations/candidates');
      const data = await res.json();
      if (data.status === 'success') {
        setCandidates(data.candidates);
      }
    } catch (error) {
      console.error("خطأ في جلب المرشحين:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  // 4. دالة الموافقة على الفرصة
  const handleApprove = async (id: number, symbol: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/recommendations/approve/${id}`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        alert(data.message); // رسالة نجاح
        // تحديث الواجهة بحذف الفرصة التي تمت الموافقة عليها
        setCandidates(candidates.filter(c => c.id !== id));
      } else {
        alert("حدث خطأ: " + data.message);
      }
    } catch (error) {
      console.error("خطأ في اعتماد الفرصة:", error);
    }
  };

  if (loading) return <div className="text-center p-5 font-bold">جاري تحميل الفرص... ⏳</div>;

  return (
    <div className="p-4" dir="rtl">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">فرص الرادار المرشحة 🦅</h2>
      
      {candidates.length === 0 ? (
        <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg border border-yellow-200">
          لا توجد فرص جديدة بانتظار الاعتماد حالياً.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="bg-white border rounded-xl shadow-sm p-5 hover:shadow-md transition">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-extrabold text-blue-700">{candidate.symbol}</h3>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                  Score: {candidate.score}/100
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-5">
                <p><span className="font-bold text-gray-800">الاستراتيجية:</span> {candidate.strategy}</p>
                <p><span className="font-bold text-gray-800">منطقة الدخول:</span> {candidate.entry_zone}</p>
                <p><span className="font-bold text-gray-800">الهدف الأول:</span> {candidate.target_1}</p>
                <p><span className="font-bold text-gray-800">الوقف:</span> {candidate.stop_loss}</p>
                <p><span className="font-bold text-gray-800">العائد/المخاطرة:</span> {candidate.risk_reward}</p>
                <p className="text-xs text-gray-400 mt-2">تاريخ الرصد: {candidate.created_at}</p>
              </div>

              <button
                onClick={() => handleApprove(candidate.id, candidate.symbol)}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
              >
                اعتماد وإضافة للمحفظة ✅
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}