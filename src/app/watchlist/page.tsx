"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import PortfolioChart, { CandleData, TradeLevels, ChartEvent } from '@/components/PortfolioChart';

interface TradeEvent {
  id: number;
  timestamp: string;
  message: string;
  event_type: string;
}

interface ActiveTrade {
  id: number;
  symbol: string;
  strategy: string;
  state: string;
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
  monitoring_enabled?: boolean;
  events?: TradeEvent[];
}

// ==========================================
// مكون فرعي: كارت الصفقة (ليجلب بيانات الشارت الخاصة به بشكل مستقل)
// ==========================================
const TradeCard = ({ 
  trade, 
  toggleMonitoring, 
  removeTrade, 
  getBaseUrl, 
  getStateBadge 
}: { 
  trade: ActiveTrade, 
  toggleMonitoring: any, 
  removeTrade: any, 
  getBaseUrl: any, 
  getStateBadge: any 
}) => {
  const [chartData, setChartData] = useState<CandleData[]>([]);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const res = await fetch(`${getBaseUrl()}/api/portfolio/chart-data/${trade.symbol}`);
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success') {
            setChartData(json.data);
          }
        }
      } catch (err) {
        console.error("فشل جلب بيانات الشارت للسهم", trade.symbol);
      }
    };
    fetchChartData();
  }, [trade.symbol]);

  const profitPct = trade.target_1 && trade.entry_price 
    ? (((trade.target_1 - trade.entry_price) / trade.entry_price) * 100).toFixed(2) : "0.00";
  const lossPct = trade.stop_loss && trade.entry_price 
    ? (((trade.entry_price - trade.stop_loss) / trade.entry_price) * 100).toFixed(2) : "0.00";

  // تجميل منطقة الدخول (تقريب الأرقام العشرية الطويلة)
  const formattedEntryZone = trade.entry_zone.includes('-') 
    ? trade.entry_zone.split('-').map(n => Number(n.trim()).toFixed(2)).join(' - ')
    : trade.entry_zone;

  const tradeLevels: TradeLevels = {
    entry: trade.entry_price,
    tp1: trade.target_1,
    tp2: trade.target_2,
    stopLoss: trade.stop_loss
  };

  const chartEvents: ChartEvent[] = (trade.events || []).map(ev => ({
    time: ev.timestamp.split(' ')[0] || new Date().toISOString().split('T')[0], // محاولة أخذ تاريخ الحدث
    position: ev.event_type.includes('TARGET') ? 'aboveBar' : 'belowBar',
    color: ev.event_type.includes('TARGET') ? '#00E676' : (ev.event_type.includes('STOP') ? '#D50000' : '#2962FF'),
    shape: ev.event_type.includes('TARGET') ? 'arrowDown' : 'arrowUp',
    text: ev.message
  }));

  return (
    <div className={`bg-white rounded-3xl shadow-sm border p-6 relative overflow-hidden transition-all hover:shadow-lg flex flex-col ${trade.monitoring_enabled === false ? 'opacity-75 grayscale-[20%]' : 'border-blue-50'}`}>
      
      <div className={`absolute top-0 right-0 h-1.5 w-full ${trade.monitoring_enabled === false ? 'bg-gray-400' : 'bg-blue-500'}`}></div>

      {/* رأس الكارت */}
      <div className="flex justify-between items-start mb-5 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {getStateBadge(trade.state)}
            {trade.monitoring_enabled === false && (
              <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-[10px] font-bold">⏸️ مراقبة متوقفة</span>
            )}
          </div>
          <h2 className="text-3xl font-black text-gray-900">{trade.symbol}</h2>
          <p className="text-xs text-gray-500 font-bold mt-1 px-2 py-1 bg-gray-100 rounded inline-block">
            {trade.strategy}
          </p>
        </div>
        <div className="text-center bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
          <span className="block text-[10px] text-gray-500 font-bold uppercase">التقييم الفني</span>
          <span className="block text-2xl font-black text-blue-700" dir="ltr">
            {trade.score}
          </span>
        </div>
      </div>

      {/* الأهداف والوقف */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-green-50 p-3 rounded-xl border border-green-100">
          <span className="block text-xs text-green-700 font-bold mb-1">🎯 الهدف القادم</span>
          <div className="flex justify-between items-baseline">
            <span className="text-xl font-black text-green-800" dir="ltr">
              {trade.state === 'TP1_HIT' ? trade.target_2 : trade.state === 'TP2_HIT' ? trade.target_3 : trade.target_1}
            </span>
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

      {/* تفاصيل الدخول */}
      <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 mb-4 flex justify-between items-center">
        <div>
          <span className="block text-[10px] text-gray-500 font-bold uppercase mb-1">منطقة الدخول المحددة</span>
          <span className="text-sm font-black text-gray-800" dir="ltr">{formattedEntryZone}</span>
        </div>
        <div className="text-right">
          <span className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Risk / Reward</span>
          <span className="text-sm font-black text-gray-800" dir="ltr">{trade.risk_reward} : 1</span>
        </div>
      </div>

      {/* عرض الشارت المؤسسي الحقيقي */}
      <div className="mb-5 -mx-2 min-h-[250px]">
        {chartData.length > 0 ? (
           <PortfolioChart 
             data={chartData} 
             levels={tradeLevels} 
             events={chartEvents} 
             height={250} 
           />
        ) : (
           <div className="h-[250px] flex items-center justify-center bg-gray-50 border border-gray-100 rounded-lg">
              <span className="text-gray-400 font-bold animate-pulse">جاري سحب بيانات السوق الحقيقية...</span>
           </div>
        )}
      </div>

      {/* سجل الأحداث (Timeline) */}
      {trade.events && trade.events.length > 0 && (
        <div className="mb-5 border-t pt-4 flex-grow">
          <span className="flex text-xs text-gray-500 font-bold uppercase mb-3 items-center gap-1">
            <span>⏱️</span> سجل التحديثات اللحظية
          </span>
          <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {trade.events.map((ev, idx) => (
              <div key={idx} className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs">
                <span className="font-black text-blue-600 block mb-1" dir="ltr">{ev.timestamp}</span>
                <span className="text-gray-700 font-semibold leading-relaxed" dangerouslySetInnerHTML={{ __html: ev.message.replace(/\n/g, '<br/>') }}></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* أزرار التحكم */}
      <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
        <button 
          onClick={() => toggleMonitoring(trade.id, trade.monitoring_enabled ?? true)}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-xs font-bold transition-colors"
        >
          {trade.monitoring_enabled === false ? '▶️ استئناف المراقبة' : '⏸️ إيقاف مؤقت'}
        </button>
        <button 
          onClick={() => removeTrade(trade.symbol)}
          className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-lg text-xs font-bold transition-colors"
        >
          🗑️ حذف من المتابعة
        </button>
      </div>

      <div className="text-[10px] text-gray-400 text-center mt-3">
        آخر تحديث للنظام: <span dir="ltr">{trade.updated_at}</span>
      </div>

    </div>
  );
};

// ==========================================
// المكون الرئيسي: صفحة المحفظة
// ==========================================
export default function StrategiesPage() {
  const [portfolio, setPortfolio] = useState<ActiveTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getBaseUrl = () => {
    return window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'https://egx-pro-api.onrender.com';
  };

  const fetchPortfolio = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/portfolio/active`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
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
    const interval = setInterval(fetchPortfolio, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleMonitoring = async (id: number, currentState: boolean) => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/portfolio/${id}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        setPortfolio(prev => prev.map(trade => trade.id === id ? { ...trade, monitoring_enabled: !currentState } : trade));
      }
    } catch (err) {
      console.error("فشل تغيير حالة المراقبة", err);
    }
  };

  const removeTrade = async (symbol: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف ${symbol} من محفظة المتابعة؟`)) return;
    try {
      const res = await fetch(`${getBaseUrl()}/api/watchlist/${symbol}`, { method: 'DELETE' });
      if (res.ok) {
        setPortfolio(prev => prev.filter(trade => trade.symbol !== symbol));
      }
    } catch (err) {
      console.error("فشل حذف السهم", err);
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'PENDING': return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-black">⏳ قيد الانتظار</span>;
      case 'ACTIVE': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-black">▶️ صفقة مفعلة</span>;
      case 'TP1_HIT': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black">🎯 الهدف 1 تحقق</span>;
      case 'TP2_HIT': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-black">🎯🎯 الهدف 2 تحقق</span>;
      case 'STOP_HIT': return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-black">🔴 وقف الخسارة</span>;
      default: return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-black">{state}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-blue-600"></div>
        <p className="text-gray-500 font-bold animate-pulse">جاري جلب المحفظة اللحظية وتزامن الأحداث...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in p-4 md:p-8" dir="rtl">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3 mb-2">
            <span className="text-4xl">💼</span> محفظة المتابعة الذكية
          </h1>
          <p className="text-gray-500 font-medium">مراقبة حية للأسهم المعتمدة. يتم تحديث الدعوم، المقاومات، وحالة الأهداف تلقائياً.</p>
        </div>
        <div className="bg-blue-50 text-blue-800 px-5 py-3 rounded-xl font-bold text-sm shadow-sm border border-blue-100 flex items-center gap-2">
          <span>📊 فرص تحت المراقبة:</span>
          <span className="text-xl font-black">{portfolio.length}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-center gap-3">
          <span className="text-xl">⚠️</span><p className="text-red-700 font-bold">{error}</p>
        </div>
      )}

      {portfolio.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
          <span className="text-7xl mb-6 block">📡</span>
          <h3 className="text-2xl font-black text-gray-600 mb-2">المحفظة فارغة حالياً</h3>
          <p className="text-gray-400 text-lg">قم بمراجعة "رادار الفرص" واعتماد الأسهم لبدء المراقبة اللحظية.</p>
          <Link href="/radar">
            <button className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all">اكتشاف الفرص</button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {portfolio.map((trade) => (
            <TradeCard 
              key={trade.id} 
              trade={trade} 
              toggleMonitoring={toggleMonitoring} 
              removeTrade={removeTrade} 
              getBaseUrl={getBaseUrl} 
              getStateBadge={getStateBadge} 
            />
          ))}
        </div>
      )}
    </div>
  );
}