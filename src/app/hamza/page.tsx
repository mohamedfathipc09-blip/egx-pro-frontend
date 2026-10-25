'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface ClarificationCandidate {
  symbol: string;
  name: string;
}

interface DataMetadata {
  current_price?: number | null;
  last_bar_date?: string | null;
  analysis_timestamp?: string | null;
  data_source?: string | null;
  data_status_ar?: string | null;
  data_quality?: {
    is_valid?: boolean;
    score?: number;
    bars_count?: number;
    reason?: string;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  isFullReport?: boolean;
  engineMode?: string;
  symbol?: string | null;
  comparedSymbols?: string[];
  timeframeAr?: string;
  dataMetadata?: DataMetadata | null;
  quantSnapshot?: any;
  candidates?: ClarificationCandidate[];
  scenarioChanged?: boolean;
  scenarioChangeNotice?: string | null;
  timestamp: string;
}

const TIMEFRAMES = [
  { id: '15m', label: '15 دقيقة' },
  { id: '1h', label: 'ساعة' },
  { id: '1d', label: 'يومي' },
  { id: '1wk', label: 'أسبوعي' },
  { id: '1mo', label: 'شهري' }
];

const DEFAULT_SUGGESTIONS = [
  'هل توجد سيولة تدعم الصعود في مدينة مصر؟',
  'اشتريت مدينة مصر بسعر 6.8، أخرج ولا أستنى؟',
  'ما أقرب مستويات الدعم والمقاومة لسهم فوري؟',
  'يعني إيه RVOL؟',
  'قارن لي مدينة مصر وفوري من حيث السيولة والاتجاه',
  'حلل سهم التجاري الدولي COMI'
];

export default function HamzaAIPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1d');
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [comparedSymbols, setComparedSymbols] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [expandedSnapshots, setExpandedSnapshots] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '');
    }
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    return isLocal ? 'http://localhost:10000' : 'https://egx-pro-api.onrender.com';
  };

  useEffect(() => {
    const newSessionId = `hamza_session_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    setSessionId(newSessionId);
    fetchSuggestions();

    setMessages([
      {
        id: 'welcome_msg',
        role: 'assistant',
        content:
          'أهلاً بك! أنا **حمزة | Hamza AI**، مساعدك الحواري والكمي في البورصة المصرية (EGX).\n\n' +
          'أجيب عن أسئلتك مباشرة وبأسلوب حواري بالاعتماد على **محرك التحليل الكمي الفعلي** دون إغراقك بتقارير مكررة:\n' +
          '- اسأل مباشرة عن السيولة: **«هل توجد سيولة تدعم الصعود في مدينة مصر؟»**\n' +
          '- راجع مركزك القائم: **«اشتريت مدينة مصر بسعر 6.8، أخرج ولا أستنى؟»**\n' +
          '- اسأل عن المستويات فقط: **«ما أقرب مستويات الدعم والمقاومة لسهم فوري؟»**\n' +
          '- اطلب شرح أي مؤشر أو مقارنة سهمين أو تقريراً كمياً كاملاً عند الحاجة.',
        engineMode: 'QUANT_ENGINE_DIRECT',
        isFullReport: false,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/hamza/suggestions`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.suggested_questions)) {
          setSuggestions(data.suggested_questions);
        }
      }
    } catch {
      // الاحتفاظ بالاقتراحات الافتراضية
    }
  };

  const handleClearSession = async () => {
    if (!sessionId) return;
    try {
      await fetch(`${getBaseUrl()}/api/hamza/session/${sessionId}`, { method: 'DELETE' });
    } catch {
      // ignore network error
    }
    const newSessionId = `hamza_session_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    setSessionId(newSessionId);
    setActiveSymbol(null);
    setComparedSymbols([]);
    setExpandedSnapshots({});
    setSuggestions(DEFAULT_SUGGESTIONS);
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        content: 'تم بدء محادثة جديدة ومسح السياق السابق. كيف يمكنني مساعدتك الآن؟',
        engineMode: 'QUANT_ENGINE_DIRECT',
        isFullReport: false,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSendMessage = async (
    text: string = inputValue,
    forceRefresh: boolean = false,
    overrideTf?: string
  ) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const tfToUse = overrideTf || selectedTimeframe;
    const nowTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      {
        id: `user_${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: nowTime
      }
    ]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch(`${getBaseUrl()}/api/hamza/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          session_id: sessionId,
          timeframe: tfToUse,
          force_refresh: forceRefresh
        })
      });

      if (!res.ok) {
        throw new Error(`تعذر الاتصال بخادم التحليل (كود الحالة: ${res.status}).`);
      }

      const data = await res.json();

      if (data.active_symbol !== undefined) {
        setActiveSymbol(data.active_symbol);
      }
      if (Array.isArray(data.compared_symbols)) {
        setComparedSymbols(data.compared_symbols);
      }
      if (data.timeframe) {
        setSelectedTimeframe(data.timeframe);
      }
      if (Array.isArray(data.suggested_questions) && data.suggested_questions.length > 0) {
        setSuggestions(data.suggested_questions);
      }

      const msgId = `ast_${Date.now()}`;
      const isFull = Boolean(data.is_full_report);
      if (isFull) {
        setExpandedSnapshots((prev) => ({ ...prev, [msgId]: true }));
      }

      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          role: 'assistant',
          content: data.reply || 'لم يتم استلام رد من الخادم.',
          intent: data.intent,
          isFullReport: isFull,
          engineMode:
            data.engine_mode ||
            (data.status === 'clarification_needed' ? 'SYSTEM_CLARIFICATION' : 'QUANT_ENGINE_VERIFIED'),
          symbol: data.active_symbol || null,
          comparedSymbols: data.compared_symbols || [],
          timeframeAr: data.timeframe_ar || tfToUse,
          dataMetadata: data.data_metadata || null,
          quantSnapshot: data.quant_snapshot || null,
          candidates: data.candidates || [],
          scenarioChanged: Boolean(data.scenario_changed),
          scenarioChangeNotice: data.scenario_change_notice || null,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content:
            `⚠️ **تعذر إتمام الطلب حالياً:** ${error.message || 'فشل الاتصال بالخادم.'}\n` +
            '- يلتزم حمزة بعدم عرض أي أسعار أو تحليلات مخمنة عند انقطاع الاتصال بمصدر البيانات.',
          engineMode: 'SYSTEM_ERROR',
          isFullReport: false,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionType: string) => {
    const sym = activeSymbol || 'فوري';
    if (actionType === 'ANALYZE') {
      handleSendMessage(activeSymbol ? `حلل سهم ${activeSymbol}` : 'حلل سهم فوري');
    } else if (actionType === 'POSITION') {
      if (activeSymbol) {
        setInputValue(`اشتريت ${activeSymbol} بسعر ، أخرج ولا أستنى؟`);
      } else {
        setInputValue('اشتريت مدينة مصر بسعر 6.8، أخرج ولا أستنى؟');
      }
      inputRef.current?.focus();
    } else if (actionType === 'LIQUIDITY') {
      handleSendMessage(`هل توجد سيولة تدعم الصعود في ${sym}؟`);
    } else if (actionType === 'SR') {
      handleSendMessage(`ما أقرب مستويات الدعم والمقاومة لسهم ${sym}؟`);
    } else if (actionType === 'EXPLAIN') {
      handleSendMessage('يعني إيه RVOL؟');
    } else if (actionType === 'COMPARE') {
      const otherSym = activeSymbol === 'FWRY' ? 'إيديتا' : 'فوري';
      handleSendMessage(`قارن لي ${sym} و ${otherSym} من حيث السيولة والاتجاه الفني`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-black text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <span
            key={index}
            className="bg-slate-100 text-indigo-800 border border-slate-200 px-1.5 py-0.5 rounded text-xs sm:text-sm font-bold mx-0.5 inline-block"
            dir="ltr"
          >
            {part.slice(1, -1)}
          </span>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  const formatAssistantMessage = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-1.5" />;

      if (trimmed.startsWith('### ')) {
        return (
          <h3
            key={idx}
            className="text-sm sm:text-base md:text-lg font-black text-indigo-950 mt-2 mb-2 pb-1.5 border-b border-slate-200"
          >
            {formatInline(trimmed.replace('### ', ''))}
          </h3>
        );
      }
      if (trimmed.startsWith('#### ')) {
        return (
          <h4 key={idx} className="text-xs sm:text-sm md:text-base font-black text-indigo-800 mt-3.5 mb-1.5">
            {formatInline(trimmed.replace('#### ', ''))}
          </h4>
        );
      }
      if (trimmed.startsWith('- ')) {
        return (
          <div
            key={idx}
            className="mr-1 sm:mr-2 mb-1.5 flex items-start gap-2 text-xs sm:text-sm md:text-base text-slate-700 leading-relaxed break-words"
          >
            <span className="text-indigo-600 font-black mt-0.5 shrink-0">•</span>
            <span className="min-w-0 flex-1">{formatInline(trimmed.replace('- ', ''))}</span>
          </div>
        );
      }
      return (
        <p key={idx} className="mb-1.5 text-xs sm:text-sm md:text-base text-slate-700 leading-relaxed break-words">
          {formatInline(trimmed)}
        </p>
      );
    });
  };

  const getEngineBadge = (mode?: string) => {
    if (!mode) return null;
    if (mode === 'QUANT_ENGINE_VERIFIED' || mode === 'QUANT_ENGINE_DIRECT') {
      return (
        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-black">
          🎯 مرتبط بمحرك التحليل الكمي
        </span>
      );
    }
    if (mode === 'AI_WITH_QUANT_ENGINE') {
      return (
        <span className="bg-purple-50 text-purple-800 border border-purple-200 text-[10px] px-2 py-0.5 rounded-full font-black">
          🧠 حوار ذكي مدعوم بالمحرك الكمي
        </span>
      );
    }
    if (mode === 'QUANT_ENGINE_FALLBACK_ON_AI_ERROR') {
      return (
        <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-black">
          ⚡ الرد الكمي الموثق
        </span>
      );
    }
    if (mode === 'SYSTEM_CLARIFICATION') {
      return (
        <span className="bg-sky-50 text-sky-800 border border-sky-200 text-[10px] px-2 py-0.5 rounded-full font-black">
          🔎 توضيح المقصود
        </span>
      );
    }
    return null;
  };

  return (
    <div className="w-full min-w-0 flex flex-col rtl" dir="rtl">
      <div className="w-full max-w-5xl mx-auto flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200 overflow-hidden min-h-[calc(100vh-5rem)]">
        {/* 1. رأس المساعد الذكي حمزة + اختيار الإطار الزمني */}
        <div className="bg-gradient-to-l from-indigo-950 via-slate-900 to-slate-900 p-3.5 sm:p-5 text-white border-b border-slate-800">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-lg sm:text-2xl shrink-0">
                🦅
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-black text-base sm:text-xl tracking-tight truncate">
                    Hamza AI | حمزة
                  </h1>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] px-2 py-0.5 rounded-full font-black">
                    مساعد حواري وكمي
                  </span>
                </div>
                <p className="text-indigo-200 text-[11px] sm:text-xs font-medium mt-0.5 truncate">
                  يفهم سؤالك ويجيب مباشرة بأدلة محرك EGX Pro دون تكرار آلي للتقارير
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {activeSymbol && (
                <button
                  type="button"
                  onClick={() => handleSendMessage(`حدث تحليل سهم ${activeSymbol}`, true)}
                  disabled={isLoading}
                  className="text-[11px] sm:text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 sm:px-3 py-1.5 rounded-xl transition font-black cursor-pointer disabled:opacity-50"
                  title="إعادة سحب أحدث بيانات السوق وتحديث التحليل"
                >
                  🔄 تحديث {activeSymbol}
                </button>
              )}
              <button
                type="button"
                onClick={handleClearSession}
                className="text-[11px] sm:text-xs bg-slate-800 hover:bg-rose-900 text-slate-200 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-xl transition font-bold border border-slate-700 cursor-pointer"
                title="مسح سياق المحادثة والبدء من جديد"
              >
                🗑️ محادثة جديدة
              </button>
            </div>
          </div>

          {/* شريط الإطار الزمني والسهم النشط في السياق */}
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 font-bold text-[11px]">الإطار الزمني:</span>
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => {
                    setSelectedTimeframe(tf.id);
                    if (activeSymbol && !isLoading) {
                      handleSendMessage(`ما وضع سهم ${activeSymbol} على الإطار ${tf.label}؟`, false, tf.id);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition cursor-pointer ${
                    selectedTimeframe === tf.id
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeSymbol ? (
                <div className="flex items-center gap-2 bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
                  <span className="text-[11px] text-slate-300">
                    السهم في السياق: <strong className="text-amber-300">{activeSymbol}</strong>
                    {comparedSymbols.length >= 2 ? ` (مقارنة: ${comparedSymbols.join(' vs ')})` : ''}
                  </span>
                  <Link
                    href={`/?symbol=${activeSymbol}`}
                    className="text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded hover:bg-amber-300 transition"
                  >
                    فتح الشارت الكمي ↗
                  </Link>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">
                  اسأل بحرية أو اختر سهماً لبدء النقاش
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. مساحة عرض الرسائل */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-slate-50">
          {messages.map((msg) => {
            const showSnapshot = Boolean(
              msg.quantSnapshot && msg.dataMetadata && (msg.isFullReport || expandedSnapshots[msg.id])
            );

            return (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                {/* رسائل المساعد حمزة */}
                {msg.role === 'assistant' && (
                  <div className="flex items-start gap-2 sm:gap-3 w-full max-w-full sm:max-w-[94%]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-xl bg-indigo-950 text-white flex items-center justify-center text-xs sm:text-sm shadow-xs mt-1">
                      🦅
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 px-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-black text-slate-700">حمزة | Hamza AI</span>
                          <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                          {getEngineBadge(msg.engineMode)}
                        </div>

                        {/* زر اختياري لإظهار/إخفاء البطاقة الرقمية أو طلب التقرير الكامل عند الرغبة فقط */}
                        {msg.quantSnapshot && msg.dataMetadata && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSnapshots((prev) => ({ ...prev, [msg.id]: !showSnapshot }))
                              }
                              className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg cursor-pointer transition"
                            >
                              {showSnapshot ? '🔼 إخفاء بطاقة الأرقام' : '📊 بطاقة أرقام السهم'}
                            </button>
                            {!msg.isFullReport && msg.symbol && (
                              <button
                                type="button"
                                onClick={() => handleSendMessage(`حلل سهم ${msg.symbol} تقرير كامل`)}
                                disabled={isLoading}
                                className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2 py-0.5 rounded-lg cursor-pointer transition"
                              >
                                📄 طلب التقرير الكامل
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* بطاقة الأرقام تظهر فقط في التقرير الكامل أو عند ضغط المستخدم على زر إظهارها */}
                      {showSnapshot && msg.quantSnapshot && msg.dataMetadata && (
                        <div className="bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 block">السهم / السعر</span>
                            <span className="font-black text-amber-400" dir="ltr">
                              {msg.quantSnapshot.symbol}: {msg.dataMetadata.current_price ?? 'N/A'} EGP
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">إشارة المحرك</span>
                            <span className="font-black text-white">
                              {msg.quantSnapshot.decision_and_plan?.decision_code || 'N/A'} (R:R:{' '}
                              {msg.quantSnapshot.decision_and_plan?.risk_reward_display || 'N/A'})
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">آخر شمعة مؤكدة</span>
                            <span className="font-bold text-slate-200" dir="ltr">
                              {msg.dataMetadata.last_bar_date || 'غير محدد'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">مصدر البيانات</span>
                            <span className="font-bold text-emerald-300 truncate block" dir="ltr">
                              {msg.dataMetadata.data_source || 'EGX Feed'}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="bg-white p-3.5 sm:p-5 rounded-2xl rounded-tr-none shadow-2xs border border-slate-200 text-slate-800 min-w-0">
                        {formatAssistantMessage(msg.content)}

                        {/* أزرار تفاعلية عند وجود التباس في اسم السهم */}
                        {msg.candidates && msg.candidates.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                            {msg.candidates.map((cand) => (
                              <button
                                key={cand.symbol}
                                type="button"
                                onClick={() => handleSendMessage(`حلل سهم ${cand.symbol}`)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-3 py-1.5 rounded-xl transition cursor-pointer"
                              >
                                اختيار {cand.symbol} ({cand.name})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* رسائل المستخدم */}
                {msg.role === 'user' && (
                  <div className="flex items-start gap-2 sm:gap-3 max-w-[90%] sm:max-w-[80%] flex-row-reverse">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-xl bg-emerald-600 flex items-center justify-center text-xs sm:text-sm text-white shadow-xs mt-1">
                      👤
                    </div>
                    <div className="flex flex-col gap-1 items-end min-w-0">
                      <div className="flex items-center gap-1.5 px-1">
                        <span className="text-[11px] font-bold text-slate-500">أنت</span>
                        <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                      </div>
                      <div className="bg-indigo-600 text-white p-3 sm:p-3.5 rounded-2xl rounded-tl-none shadow-xs text-xs sm:text-sm md:text-base leading-relaxed font-bold text-right break-words">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* مؤشر التحميل */}
          {isLoading && (
            <div className="flex justify-end items-start gap-2.5 w-full">
              <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-xl bg-indigo-950 text-white flex items-center justify-center text-xs shadow-xs mt-1">
                🦅
              </div>
              <div className="bg-white p-3.5 rounded-2xl rounded-tr-none shadow-2xs border border-slate-200 flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.12s' }} />
                <div className="w-2 h-2 bg-indigo-800 rounded-full animate-bounce" style={{ animationDelay: '0.24s' }} />
                <span className="text-xs text-slate-600 font-bold mr-1">
                  جاري فحص سؤالك واستخراج الأدلة المطلوبة...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 3. أزرار الإجراءات السريعة + الأسئلة المقترحة + حقل الإدخال الحر */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 space-y-2.5">
          {/* أزرار إجراءات سريعة مساعدة دون تقييد حرية الكتابة (البند العاشر) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 ml-1">إجراءات سريعة:</span>
            <button
              type="button"
              onClick={() => handleQuickAction('ANALYZE')}
              disabled={isLoading}
              className="text-[11px] font-black bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              📈 حلل السهم
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('POSITION')}
              disabled={isLoading}
              className="text-[11px] font-black bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              💼 راجع مركزي
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('LIQUIDITY')}
              disabled={isLoading}
              className="text-[11px] font-black bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              💧 السيولة
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('SR')}
              disabled={isLoading}
              className="text-[11px] font-black bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              🧱 الدعم والمقاومة
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('EXPLAIN')}
              disabled={isLoading}
              className="text-[11px] font-black bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              🎓 اشرح المؤشر
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('COMPARE')}
              disabled={isLoading}
              className="text-[11px] font-black bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              ⚖️ قارن سهمين
            </button>
          </div>

          {/* اقتراحات سياقية */}
          {suggestions.length > 0 && !isLoading && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.slice(0, 4).map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSendMessage(suggestion)}
                  className="bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/80 text-[11px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer text-right"
                >
                  💡 {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* حقل الكتابة الحرة */}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeSymbol
                  ? `اسأل حمزة عن ${activeSymbol} أو أي سهم آخر (مثال: طيب لو استنيت للدعم؟)...`
                  : 'اكتب سؤالك بحرية (مثال: اشتريت مدينة مصر بسعر 6.8، أخرج ولا أستنى؟)...'
              }
              disabled={isLoading}
              className="flex-1 min-w-0 bg-slate-100 border border-slate-300 focus:border-indigo-600 focus:bg-white p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm md:text-base outline-none transition disabled:opacity-50 font-bold text-slate-900"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-4 sm:px-5 h-11 sm:h-12 rounded-2xl flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 font-black text-xs sm:text-sm shadow-xs"
            >
              <span>إرسال</span>
              <span>➤</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}