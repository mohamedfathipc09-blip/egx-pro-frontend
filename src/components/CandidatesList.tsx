'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface Candidate {
  id?: number;
  symbol: string;
  name?: string;
  sector?: string;
  strategy: string;
  signal_type?: string;
  score: number;
  technical_quality_score?: number;
  entry_readiness_score?: number;
  backtest_quality_score?: number;
  entry_zone: string;
  entry_ref?: number;
  stop_loss: number;
  target_1: number;
  target_2?: number | null;
  target_3?: number | null;
  risk_reward: number;
  reasoning?: string;
  why?: string[];
  invalidation?: string;
  created_at?: string;
}

interface CandidatesListProps {
  onSelectSymbol?: (symbol: string) => void;
}

export default function CandidatesList({ onSelectSymbol }: CandidatesListProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [processingSymbol, setProcessingSymbol] = useState<string | null>(null);
  const router = useRouter();

  const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '');
    }
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    return isLocal ? 'http://localhost:10000' : 'https://egx-pro-api.onrender.com';
  };

  const fetchCandidates = async () => {
    setLoading(true);
    const baseUrl = getBaseUrl();
    try {
      // 1. جلب المرشحين من قاعدة البيانات أولاً
      const res = await fetch(`${baseUrl}/api/recommendations/candidates`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.candidates) && data.candidates.length > 0) {
          setCandidates(data.candidates);
          setLoading(false);
          return;
        }
      }

      // 2. إذا كانت قائمة المرشحين في قاعدة البيانات فارغة، نعرض أفضل الفرص المؤهلة من رادار نهاية اليوم (Top 10)
      const topRes = await fetch(`${baseUrl}/api/recommendations/top10`);
      if (topRes.ok) {
        const topData = await topRes.json();
        if (topData.status === 'success' && Array.isArray(topData.data) && topData.data.length > 0) {
          const mapped: Candidate[] = topData.data.slice(0, 6).map((item: any, idx: number) => ({
            id: item.id || idx + 1000,
            symbol: item.symbol,
            name: item.name,
            sector: item.sector,
            strategy: item.strategy || item.primary_strategy_name || 'Quant EOD 2.0',
            signal_type: item.signal_type || 'WATCHING',
            score: Number(item.score || item.technical_quality_score || 0),
            technical_quality_score: item.technical_quality_score,
            entry_readiness_score: item.entry_readiness_score,
            backtest_quality_score: item.backtest_quality_score,
            entry_zone: String(item.entry_zone || item.entry_ref || item.price || ''),
            entry_ref: Number(item.entry_ref || item.price || 0),
            stop_loss: Number(item.stop_loss || 0),
            target_1: Number(item.target_1 || 0),
            target_2: item.target_2 ? Number(item.target_2) : null,
            risk_reward: Number(item.risk_reward || 0),
            reasoning: Array.isArray(item.why) ? item.why.join(' | ') : item.reasoning,
            invalidation: item.invalidation,
            created_at: item.last_bar_date || topData.last_updated || ''
          }));
          setCandidates(mapped);
        }
      }
    } catch (error) {
      console.error('خطأ في جلب المرشحين:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleApprove = async (candidate: Candidate) => {
    setProcessingSymbol(candidate.symbol);
    setActionMessage(null);
    const baseUrl = getBaseUrl();

    try {
      // إذا كان السهم قادماً من جدول المرشحين وله ID حقيقي في قاعدة البيانات (< 1000)
      if (candidate.id && candidate.id < 1000) {
        const res = await fetch(`${baseUrl}/api/recommendations/approve/${candidate.id}`, {
          method: 'POST'
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
          setActionMessage({ text: data.message || `تم اعتماد ${candidate.symbol} بنجاح 🦅`, type: 'success' });
          setCandidates((prev) => prev.filter((c) => c.symbol !== candidate.symbol));
          return;
        }
      }

      // إضافة مباشرة إلى محفظة المتابعة عبر /api/watchlist
      const entryPrice =
        candidate.entry_ref ||
        Number(String(candidate.entry_zone).split('-').pop()?.trim()) ||
        0;

      const watchRes = await fetch(`${baseUrl}/api/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: candidate.symbol,
          entry_price: entryPrice,
          target: candidate.target_1,
          stop_loss: candidate.stop_loss
        })
      });
      const watchData = await watchRes.json();

      if (watchRes.ok && watchData.status === 'success') {
        setActionMessage({ text: watchData.message || `تمت إضافة ${candidate.symbol} لمحفظة المتابعة 🦅`, type: 'success' });
        setCandidates((prev) => prev.filter((c) => c.symbol !== candidate.symbol));
      } else {
        setActionMessage({ text: watchData.message || 'تعذر اعتماد الفرصة حالياً.', type: 'error' });
      }
    } catch (error) {
      console.error('خطأ في اعتماد الفرصة:', error);
      setActionMessage({ text: 'حدث خطأ في الاتصال بالخادم أثناء الاعتماد.', type: 'error' });
    } finally {
      setProcessingSymbol(null);
    }
  };

  const handleAnalyzeClick = (sym: string) => {
    const clean = sym.replace('.CA', '').trim().toUpperCase();
    if (onSelectSymbol) {
      onSelectSymbol(clean);
    } else {
      router.push(`?symbol=${clean}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-center font-bold text-slate-500 animate-pulse" dir="rtl">
        ⏳ جاري تحميل فرص الرادار المرشحة...
      </div>
    );
  }

  return (
    <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-5">
        <div>
          <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
            <span>🦅</span> فرص الرادار الكمي المرشحة للمتابعة والتحليل
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            اضغط على «تحليل في الغرفة» لفحص هيكل السهم والشارت التفاعلي، أو «اعتماد للمحفظة» لمتابعته
          </p>
        </div>
        <button
          onClick={fetchCandidates}
          className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl transition cursor-pointer"
        >
          🔄 تحديث القائمة
        </button>
      </div>

      {actionMessage && (
        <div
          className={`mb-4 p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-700 font-black">
            ✕
          </button>
        </div>
      )}

      {candidates.length === 0 ? (
        <div className="bg-amber-50/70 text-amber-800 p-4 rounded-2xl border border-amber-200 text-xs md:text-sm font-bold">
          لا توجد فرص جديدة بانتظار الاعتماد حالياً. يمكنك البحث عن أي سهم أعلاه لتحليله كمياً.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidates.map((candidate) => {
            const isBuy = candidate.signal_type === 'BUY';
            return (
              <div
                key={candidate.symbol}
                className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-indigo-950">{candidate.symbol}</h3>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            isBuy
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {isBuy ? 'BUY CONFIRMED' : 'BUY WATCH'}
                        </span>
                      </div>
                      {candidate.name && (
                        <span className="text-[11px] text-slate-500 font-bold block">{candidate.name}</span>
                      )}
                    </div>

                    <span className="bg-indigo-100 text-indigo-900 text-xs font-black px-2.5 py-1 rounded-xl" dir="ltr">
                      {candidate.score} / 100
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-white p-3 rounded-xl border border-slate-200/80">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-500">الاستراتيجية:</span>
                      <span className="font-black text-slate-800">{candidate.strategy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-500">منطقة الدخول:</span>
                      <span className="font-black text-indigo-700" dir="ltr">{candidate.entry_zone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-500">الهدف الأول (TP1):</span>
                      <span className="font-black text-emerald-700" dir="ltr">{candidate.target_1} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-500">وقف الخسارة (SL):</span>
                      <span className="font-black text-rose-700" dir="ltr">{candidate.stop_loss} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-500">العائد/المخاطرة:</span>
                      <span className="font-black text-purple-700" dir="ltr">1 : {candidate.risk_reward}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAnalyzeClick(candidate.symbol)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-2.5 px-3 rounded-xl transition cursor-pointer"
                  >
                    🔍 تحليل في الغرفة
                  </button>
                  <button
                    onClick={() => handleApprove(candidate)}
                    disabled={processingSymbol === candidate.symbol}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black py-2.5 px-3 rounded-xl transition cursor-pointer"
                  >
                    {processingSymbol === candidate.symbol ? 'جاري الحفظ...' : 'اعتماد للمحفظة ✅'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}