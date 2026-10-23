"use client";
import React, { useState, useEffect, useRef, memo } from 'react';

type StockChartProps = {
  symbol: string;
  interval?: string;
  chartPayload?: any;
};

interface SelectedLayerExplanation {
  title: string;
  badge: string;
  description: string;
  liveValue: string;
  educationalNote: string;
}

function StockChart({ symbol, interval = "1d", chartPayload }: StockChartProps) {
  const tvContainer = useRef<HTMLDivElement>(null);

  // التبديل بين الشارت الكمي التفاعلي (الذي يعرض الدعوم والفيبوناتشي وخطة التداول) وشارت TradingView
  const [chartEngine, setChartEngine] = useState<'QUANT_CANVAS' | 'TRADINGVIEW'>(
    chartPayload && chartPayload.candles && chartPayload.candles.length > 0 ? 'QUANT_CANVAS' : 'TRADINGVIEW'
  );

  // أزرار إظهار وإخفاء العناصر على الرسم البياني (القسم 10)
  const [layers, setLayers] = useState({
    ema20: true,
    ema50: true,
    sma200: false,
    bollinger: false,
    srZones: true,
    fibonacci: true,
    swingsAndTrendline: true,
    tradePlan: true,
    volume: true,
  });

  // حالة الشمعة التي يمر عليها الماوس (Crosshair Tooltip)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // حالة الشرح التعليمي عند اختيار أي عنصر أو مستوى على الرسم البياني
  const [selectedExplanation, setSelectedExplanation] = useState<SelectedLayerExplanation | null>(null);

  useEffect(() => {
    if (chartPayload && chartPayload.candles && chartPayload.candles.length > 0) {
      setChartEngine('QUANT_CANVAS');
    }
  }, [chartPayload]);

  const getTradingModeConfig = (currentInterval: string) => {
    const activeStudies = [
      "Volume@tv-basicstudies",
      "BB@tv-basicstudies",
      "RSI@tv-basicstudies",
      "MACD@tv-basicstudies"
    ];

    switch (currentInterval) {
      case '15m':
      case '1h':
        return {
          tvInterval: currentInterval === '15m' ? '15' : '60',
          modeName: '⚡ مضاربة لحظية (Intraday / Scalping)',
          studies: activeStudies
        };
      case '1d':
        return {
          tvInterval: 'D',
          modeName: '📈 سوينج قصير المدى (يومي)',
          studies: activeStudies
        };
      case '1wk':
      case '1w':
        return {
          tvInterval: 'W',
          modeName: '📊 سوينج متوسط المدى (أسبوعي)',
          studies: activeStudies
        };
      case '1mo':
        return {
          tvInterval: 'M',
          modeName: '🏦 استثماري طويل المدى (شهري)',
          studies: activeStudies
        };
      default:
        return {
          tvInterval: 'D',
          modeName: 'تحليل عام',
          studies: activeStudies
        };
    }
  };

  const config = getTradingModeConfig(interval);

  // تحميل ودجت TradingView عند اختيار وضع TRADINGVIEW
  useEffect(() => {
    if (chartEngine !== 'TRADINGVIEW' || !tvContainer.current) return;

    tvContainer.current.innerHTML = '';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    const widgetConfig: any = {
      "autosize": true,
      "symbol": `EGX:${symbol}`,
      "interval": config.tvInterval,
      "timezone": "Africa/Cairo",
      "theme": "light",
      "style": "1",
      "locale": "ar_AE",
      "enable_publishing": false,
      "backgroundColor": "rgba(255, 255, 255, 1)",
      "gridColor": "rgba(240, 243, 250, 0)",
      "allow_symbol_change": true,
      "calendar": false,
      "studies": config.studies,
      "support_host": "https://www.tradingview.com"
    };

    script.innerHTML = JSON.stringify(widgetConfig);
    tvContainer.current.appendChild(script);
  }, [symbol, interval, chartEngine, config.tvInterval]);

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // =========================================================================
  // حسابات الرسم البياني التفاعلي (Quant SVG Chart)
  // =========================================================================
  const candles: any[] = chartPayload?.candles || [];
  const supportZones: any[] = chartPayload?.support_zones || [];
  const resistanceZones: any[] = chartPayload?.resistance_zones || [];
  const fibData: any = chartPayload?.fibonacci || null;
  const swingHighs: any[] = chartPayload?.swing_highs || [];
  const swingLows: any[] = chartPayload?.swing_lows || [];
  const trendline: any = chartPayload?.trendline || null;
  const planLevels: any = chartPayload?.trade_plan_levels || null;

  const renderQuantInteractiveChart = () => {
    if (!candles || candles.length < 10) {
      return (
        <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200">
          <p className="text-slate-500 font-bold mb-3">بيانات الشموع التفاعلية قيد التحميل أو غير متوفرة...</p>
          <button
            onClick={() => setChartEngine('TRADINGVIEW')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
          >
            التبديل إلى شارت TradingView المباشر
          </button>
        </div>
      );
    }

    const width = 1050;
    const priceHeight = layers.volume ? 440 : 540;
    const volTop = 460;
    const volHeight = 95;
    const totalHeight = 580;
    const padLeft = 18;
    const padRight = 82;
    const padTop = 22;
    const padBottom = 24;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = priceHeight - padTop - padBottom;

    // تحديد أقل وأعلى سعر ليشمل الشموع ومناطق الدعم والمقاومة القريبة وخطة الصفقة
    const allPrices: number[] = [];
    candles.forEach(c => {
      if (c.high) allPrices.push(Number(c.high));
      if (c.low) allPrices.push(Number(c.low));
      if (layers.bollinger && c.bb_upper) allPrices.push(Number(c.bb_upper));
      if (layers.bollinger && c.bb_lower) allPrices.push(Number(c.bb_lower));
    });

    if (layers.tradePlan && planLevels) {
      if (planLevels.stop_loss) allPrices.push(Number(planLevels.stop_loss));
      if (planLevels.tp1) allPrices.push(Number(planLevels.tp1));
    }

    const rawMin = Math.min(...allPrices);
    const rawMax = Math.max(...allPrices);
    const priceSpan = Math.max(rawMax - rawMin, rawMax * 0.04);
    const minPrice = rawMin - priceSpan * 0.06;
    const maxPrice = rawMax + priceSpan * 0.06;

    const maxVol = Math.max(...candles.map(c => Number(c.volume) || 0), 1);

    const xForIdx = (idx: number) => padLeft + (idx / Math.max(candles.length - 1, 1)) * plotWidth;
    const yForPrice = (p: number) => padTop + ((maxPrice - p) / Math.max(maxPrice - minPrice, 0.0001)) * plotHeight;
    const yForVol = (v: number) => volTop + volHeight - (v / maxVol) * volHeight;

    const buildLinePath = (field: string) => {
      const pts: string[] = [];
      candles.forEach((c, i) => {
        const val = c[field];
        if (val !== null && val !== undefined && !isNaN(Number(val))) {
          pts.push(`${pts.length === 0 ? 'M' : 'L'} ${xForIdx(i).toFixed(1)} ${yForPrice(Number(val)).toFixed(1)}`);
        }
      });
      return pts.join(' ');
    };

    const barWidth = Math.max(2.5, Math.min(9, (plotWidth / candles.length) * 0.68));
    const activeCandle = hoverIndex !== null && candles[hoverIndex] ? candles[hoverIndex] : candles[candles.length - 1];

    // شبكة الأسعار الأفقية
    const priceGridCount = 6;
    const gridPrices = Array.from({ length: priceGridCount }, (_, i) =>
      minPrice + ((maxPrice - minPrice) * i) / (priceGridCount - 1)
    );

    return (
      <div className="space-y-3">
        {/* شريط معلومات الشمعة المحددة بالماوس (OHLCV + Indicators Inspector) */}
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-black text-amber-400">{symbol} ({config.tvInterval})</span>
            <span className="text-slate-300">التاريخ: <strong className="text-white">{activeCandle?.date}</strong></span>
            <span>فتح: <strong dir="ltr">{activeCandle?.open}</strong></span>
            <span>أعلى: <strong className="text-emerald-400" dir="ltr">{activeCandle?.high}</strong></span>
            <span>أدنى: <strong className="text-rose-400" dir="ltr">{activeCandle?.low}</strong></span>
            <span>إغلاق: <strong className="text-amber-300" dir="ltr">{activeCandle?.close}</strong></span>
            {activeCandle?.rvol !== null && activeCandle?.rvol !== undefined && (
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                RVOL: <strong className="text-indigo-300">{activeCandle.rvol}x</strong>
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            💡 مرر الماوس على الشموع أو اضغط على أي مستوى على الرسم لعرض تفسيره التعليمي
          </span>
        </div>

        {/* لوحة الـ SVG التفاعلية */}
        <div className="relative w-full overflow-x-auto bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
          <svg
            viewBox={`0 0 ${width} ${totalHeight}`}
            className="w-full h-auto select-none"
            style={{ minWidth: "760px", maxHeight: "600px" }}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {/* 1. خطوط الشبكة الأفقية والأسعار على اليمين */}
            {gridPrices.map((gp, i) => {
              const y = yForPrice(gp);
              return (
                <g key={i}>
                  <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#1e293b" strokeDasharray="3 3" strokeWidth="1" />
                  <text x={width - padRight + 6} y={y + 4} fill="#64748b" fontSize="10" fontWeight="bold">
                    {gp.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* 2. مناطق الدعم والمقاومة المختبرة (Support & Resistance Zones) */}
            {layers.srZones &&
              supportZones.map((z, idx) => {
                if (!z.low || !z.high || z.high < minPrice || z.low > maxPrice) return null;
                const yTop = yForPrice(Math.min(z.high, maxPrice));
                const yBot = yForPrice(Math.max(z.low, minPrice));
                const rectH = Math.max(6, Math.abs(yBot - yTop));
                return (
                  <g
                    key={`sup-${idx}`}
                    className="cursor-pointer"
                    onClick={() =>
                      setSelectedExplanation({
                        title: `منطقة الدعم التاريخية S${idx + 1}`,
                        badge: `قوة المنطقة: ${z.strength_score}/100 (${z.status_ar})`,
                        description: "منطقة طلب سعري ارتد منها السهم تاريخياً في موجات مستقلة.",
                        liveValue: `النطاق: ${z.low} - ${z.high} ج.م | المحور: ${z.mid} ج.م`,
                        educationalNote: `${z.reason_ar} — لا يُعتبر الاقتراب من الدعم إشارة شراء مؤكدة إلا بعد ظهور شمعة انعكاسية.`
                      })
                    }
                  >
                    <rect
                      x={padLeft}
                      y={Math.min(yTop, yBot)}
                      width={plotWidth}
                      height={rectH}
                      fill="rgba(16, 185, 129, 0.14)"
                      stroke="#10b981"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                    />
                    <text x={padLeft + 8} y={Math.min(yTop, yBot) + 12} fill="#34d399" fontSize="10" fontWeight="bold">
                      🟢 دعم S{idx + 1} ({z.low}-{z.high}) [{z.successful_bounces} ارتدادات]
                    </text>
                  </g>
                );
              })}

            {layers.srZones &&
              resistanceZones.map((z, idx) => {
                if (!z.low || !z.high || z.high < minPrice || z.low > maxPrice) return null;
                const yTop = yForPrice(Math.min(z.high, maxPrice));
                const yBot = yForPrice(Math.max(z.low, minPrice));
                const rectH = Math.max(6, Math.abs(yBot - yTop));
                return (
                  <g
                    key={`res-${idx}`}
                    className="cursor-pointer"
                    onClick={() =>
                      setSelectedExplanation({
                        title: `منطقة المقاومة التاريخية R${idx + 1}`,
                        badge: `قوة المنطقة: ${z.strength_score}/100 (${z.status_ar})`,
                        description: "منطقة عرض سعري واجه عندها السهم ضغوطاً بيعية سابقة.",
                        liveValue: `النطاق: ${z.low} - ${z.high} ج.م | المحور: ${z.mid} ج.م`,
                        educationalNote: `${z.reason_ar} — اختراق المقاومة يتطلب إغلاق شمعة مؤكدة أعلى ${z.high} بسيولة RVOL >= 1.4x.`
                      })
                    }
                  >
                    <rect
                      x={padLeft}
                      y={Math.min(yTop, yBot)}
                      width={plotWidth}
                      height={rectH}
                      fill="rgba(244, 63, 94, 0.14)"
                      stroke="#f43f5e"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                    />
                    <text x={padLeft + 8} y={Math.min(yTop, yBot) + 12} fill="#fb7185" fontSize="10" fontWeight="bold">
                      🔴 مقاومة R{idx + 1} ({z.low}-{z.high})
                    </text>
                  </g>
                );
              })}

            {/* 3. مستويات الفيبوناتشي (Fibonacci Retracements) */}
            {layers.fibonacci &&
              fibData &&
              fibData.retracements &&
              Object.entries(fibData.retracements).map(([ratio, val]: [string, any]) => {
                const numVal = Number(val);
                if (!numVal || numVal < minPrice || numVal > maxPrice) return null;
                const y = yForPrice(numVal);
                return (
                  <g
                    key={`fib-${ratio}`}
                    className="cursor-pointer"
                    onClick={() =>
                      setSelectedExplanation({
                        title: `مستوى تصحيح فيبوناتشي ${ratio}`,
                        badge: fibData.direction_ar || "قياس فيبوناتشي",
                        description: `محسوب من النقطة (${fibData.start_point?.price}) بتاريخ ${fibData.start_point?.date} إلى (${fibData.end_point?.price}) بتاريخ ${fibData.end_point?.date}.`,
                        liveValue: `${numVal} ج.م`,
                        educationalNote: "مستوى فيبوناتشي حسابي لا يُعتبر دعماً مؤكداً بمفرده إلا إذا توافق مع منطقة دعم تاريخية أو شمعة انعكاس."
                      })
                    }
                  >
                    <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#a855f7" strokeWidth="1" strokeDasharray="2 4" />
                    <text x={width - padRight - 95} y={y - 3} fill="#c084fc" fontSize="9" fontWeight="bold">
                      Fib {ratio} ({numVal})
                    </text>
                  </g>
                );
              })}

            {/* 4. البولنجر باندز (Bollinger Bands) */}
            {layers.bollinger && (
              <g>
                <path d={buildLinePath('bb_upper')} fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
                <path d={buildLinePath('bb_middle')} fill="none" stroke="#94a3b8" strokeWidth="1" />
                <path d={buildLinePath('bb_lower')} fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
              </g>
            )}

            {/* 5. المتوسطات المتحركة (EMA 20, EMA 50, SMA 200) */}
            {layers.ema20 && <path d={buildLinePath('ema20')} fill="none" stroke="#38bdf8" strokeWidth="1.8" />}
            {layers.ema50 && <path d={buildLinePath('ema50')} fill="none" stroke="#f59e0b" strokeWidth="1.8" />}
            {layers.sma200 && <path d={buildLinePath('sma200')} fill="none" stroke="#e879f9" strokeWidth="2.2" />}

            {/* 6. خط الاتجاه والقمم والقيعان المحورية المؤكدة (Swings & Trendline) */}
            {layers.swingsAndTrendline &&
              swingHighs.map((sh, i) => {
                const idx = candles.findIndex(c => c.date === sh.date);
                if (idx === -1) return null;
                const x = xForIdx(idx);
                const y = yForPrice(Number(sh.price));
                return (
                  <g key={`sh-${i}`}>
                    <circle cx={x} cy={y - 6} r="3.5" fill="#fb7185" />
                    <text x={x - 10} y={y - 12} fill="#fda4af" fontSize="8" fontWeight="bold">
                      SH
                    </text>
                  </g>
                );
              })}

            {layers.swingsAndTrendline &&
              swingLows.map((sl, i) => {
                const idx = candles.findIndex(c => c.date === sl.date);
                if (idx === -1) return null;
                const x = xForIdx(idx);
                const y = yForPrice(Number(sl.price));
                return (
                  <g key={`sl-${i}`}>
                    <circle cx={x} cy={y + 6} r="3.5" fill="#34d399" />
                    <text x={x - 8} y={y + 18} fill="#6ee7b7" fontSize="8" fontWeight="bold">
                      SL
                    </text>
                  </g>
                );
              })}

            {/* 7. الشموع اليابانية (Candlesticks) */}
            {candles.map((c, idx) => {
              const o = Number(c.open);
              const h = Number(c.high);
              const l = Number(c.low);
              const cl = Number(c.close);
              if (!o || !h || !l || !cl) return null;

              const isBull = cl >= o;
              const color = isBull ? "#10b981" : "#f43f5e";
              const x = xForIdx(idx);
              const yHigh = yForPrice(h);
              const yLow = yForPrice(l);
              const yOpen = yForPrice(o);
              const yClose = yForPrice(cl);
              const bodyTop = Math.min(yOpen, yClose);
              const bodyH = Math.max(2, Math.abs(yClose - yOpen));

              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoverIndex(idx)}
                  className="cursor-crosshair"
                >
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.2" />
                  <rect
                    x={x - barWidth / 2}
                    y={bodyTop}
                    width={barWidth}
                    height={bodyH}
                    fill={color}
                    rx="0.5"
                  />
                </g>
              );
            })}

            {/* 8. مستويات خطة التداول الصالحة (Entry / Stop Loss / TP1) */}
            {layers.tradePlan && planLevels && (
              <g>
                {planLevels.entry && (
                  <g>
                    <line
                      x1={padLeft}
                      y1={yForPrice(Number(planLevels.entry))}
                      x2={width - padRight}
                      y2={yForPrice(Number(planLevels.entry))}
                      stroke="#3b82f6"
                      strokeWidth="1.8"
                    />
                    <text x={padLeft + 130} y={yForPrice(Number(planLevels.entry)) - 4} fill="#60a5fa" fontSize="10" fontWeight="bold">
                      🎯 الدخول المرجعي: {planLevels.entry}
                    </text>
                  </g>
                )}
                {planLevels.stop_loss && (
                  <g>
                    <line
                      x1={padLeft}
                      y1={yForPrice(Number(planLevels.stop_loss))}
                      x2={width - padRight}
                      y2={yForPrice(Number(planLevels.stop_loss))}
                      stroke="#ef4444"
                      strokeWidth="1.8"
                      strokeDasharray="5 3"
                    />
                    <text x={padLeft + 130} y={yForPrice(Number(planLevels.stop_loss)) + 12} fill="#f87171" fontSize="10" fontWeight="bold">
                      🛑 وقف الخسارة: {planLevels.stop_loss}
                    </text>
                  </g>
                )}
                {planLevels.tp1 && (
                  <g>
                    <line
                      x1={padLeft}
                      y1={yForPrice(Number(planLevels.tp1))}
                      x2={width - padRight}
                      y2={yForPrice(Number(planLevels.tp1))}
                      stroke="#22c55e"
                      strokeWidth="1.8"
                      strokeDasharray="5 3"
                    />
                    <text x={padLeft + 130} y={yForPrice(Number(planLevels.tp1)) - 4} fill="#4ade80" fontSize="10" fontWeight="bold">
                      ✅ الهدف الأول TP1: {planLevels.tp1} (R:R 1:{planLevels.risk_reward})
                    </text>
                  </g>
                )}
              </g>
            )}

            {/* 9. أعمدة الحجم والسيولة (Volume Bars) */}
            {layers.volume && (
              <g>
                <line x1={padLeft} y1={volTop} x2={width - padRight} y2={volTop} stroke="#334155" strokeWidth="1" />
                <text x={padLeft + 6} y={volTop + 14} fill="#94a3b8" fontSize="10" fontWeight="bold">
                  الحجم والسيولة (Volume)
                </text>
                {candles.map((c, idx) => {
                  const v = Number(c.volume) || 0;
                  const isBull = Number(c.close) >= Number(c.open);
                  const x = xForIdx(idx);
                  const yV = yForVol(v);
                  const hV = Math.max(1, volTop + volHeight - yV);
                  const isHighRvol = Number(c.rvol) >= 1.4;
                  return (
                    <rect
                      key={`vol-${idx}`}
                      x={x - barWidth / 2}
                      y={yV}
                      width={barWidth}
                      height={hV}
                      fill={isBull ? (isHighRvol ? "#10b981" : "rgba(16, 185, 129, 0.45)") : (isHighRvol ? "#f43f5e" : "rgba(244, 63, 94, 0.45)")}
                    />
                  );
                })}
              </g>
            )}
          </svg>
        </div>

        {/* بطاقة الشرح التعليمي عند اختيار أي مستوى أو مؤشر على الشارت */}
        {selectedExplanation && (
          <div className="bg-indigo-950 text-white p-4 rounded-2xl border border-indigo-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-amber-400">🎓 {selectedExplanation.title}</span>
                <span className="bg-indigo-800 text-indigo-200 px-2.5 py-0.5 rounded-full font-bold">
                  {selectedExplanation.badge}
                </span>
              </div>
              <p className="text-slate-200">{selectedExplanation.description}</p>
              <p className="text-emerald-300 font-bold">القيمة على السهم: {selectedExplanation.liveValue}</p>
              <p className="text-amber-200/90">💡 قاعدة التداول: {selectedExplanation.educationalNote}</p>
            </div>
            <button
              onClick={() => setSelectedExplanation(null)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl font-bold"
            >
              إغلاق الشرح ✕
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* شريط التحكم العلوي: تبديل المحرك + إظهار وإخفاء الطبقات الفنية */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-slate-700">وضع الرسم البياني:</span>
          <button
            onClick={() => setChartEngine('QUANT_CANVAS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              chartEngine === 'QUANT_CANVAS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            🎯 الشارت الكمي التفاعلي (الدعوم + الفيبوناتشي + خطة الصفقة)
          </button>
          <button
            onClick={() => setChartEngine('TRADINGVIEW')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              chartEngine === 'TRADINGVIEW'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            📈 شارت TradingView الكلاسيكي
          </button>
        </div>

        {/* أزرار إظهار وإخفاء الطبقات الفنية (تظهر في وضع الشارت الكمي التفاعلي) */}
        {chartEngine === 'QUANT_CANVAS' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'ema20', label: 'EMA 20', color: 'bg-sky-500' },
              { key: 'ema50', label: 'EMA 50', color: 'bg-amber-500' },
              { key: 'sma200', label: 'SMA 200', color: 'bg-fuchsia-500' },
              { key: 'bollinger', label: 'Bollinger', color: 'bg-slate-500' },
              { key: 'srZones', label: 'الدعوم والمقاومات', color: 'bg-emerald-600' },
              { key: 'fibonacci', label: 'Fibonacci', color: 'bg-purple-600' },
              { key: 'swingsAndTrendline', label: 'القمم والقيعان', color: 'bg-rose-500' },
              { key: 'tradePlan', label: 'خطة الصفقة', color: 'bg-blue-600' },
              { key: 'volume', label: 'السيولة', color: 'bg-teal-600' },
            ].map((item) => {
              const active = (layers as any)[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => toggleLayer(item.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-400 border border-slate-200 line-through'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* عرض المحرك المختار */}
      {chartEngine === 'QUANT_CANVAS' ? (
        renderQuantInteractiveChart()
      ) : (
        <div
          className="tradingview-widget-container rounded-2xl overflow-hidden border border-slate-200"
          style={{ height: "700px", width: "100%" }}
        >
          <div
            className="tradingview-widget-container__widget"
            ref={tvContainer}
            style={{ height: "100%", width: "100%" }}
          ></div>
        </div>
      )}
    </div>
  );
}

export default memo(StockChart);