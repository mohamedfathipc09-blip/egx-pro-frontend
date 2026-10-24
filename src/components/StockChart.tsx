"use client";
import React, { useState, useEffect, useRef, useMemo, memo } from 'react';

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

const DEFAULT_LAYERS = {
  ema20: true,
  ema50: false,
  sma200: false,
  bollinger: false,
  srZones: true,
  fibonacci: false,
  swingsAndTrendline: false,
  tradePlan: true,
  volume: true,
};

function StockChart({ symbol, interval = "1d", chartPayload }: StockChartProps) {
  const tvContainer = useRef<HTMLDivElement>(null);

  const [chartEngine, setChartEngine] = useState<'QUANT_CANVAS' | 'TRADINGVIEW'>(
    chartPayload && chartPayload.candles && chartPayload.candles.length > 0 ? 'QUANT_CANVAS' : 'TRADINGVIEW'
  );

  // حفظ حالة تفعيل المؤشرات أثناء تغيير الإطار الزمني (المرحلة 3 - البند 1)
  const [layers, setLayers] = useState(DEFAULT_LAYERS);

  // أدوات التكبير والتحريك والملء الكامل للشاشة وقوائم الموبايل (المرحلة 3 - البند 2 و 3)
  const [visibleCount, setVisibleCount] = useState<number>(90);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [mobileIndicatorsMenuOpen, setMobileIndicatorsMenuOpen] = useState<boolean>(false);

  // حالة الشمعة المحددة بالماوس أو اللمس (بدون إعادة حساب مسارات المؤشرات)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedExplanation, setSelectedExplanation] = useState<SelectedLayerExplanation | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedLayers = sessionStorage.getItem('egx_pro_chart_layers');
        if (savedLayers) {
          setLayers({ ...DEFAULT_LAYERS, ...JSON.parse(savedLayers) });
        }
        if (window.innerWidth < 640) {
          setVisibleCount(55);
        }
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  useEffect(() => {
    if (chartPayload && chartPayload.candles && chartPayload.candles.length > 0) {
      setChartEngine('QUANT_CANVAS');
      setPanOffset(0);
      setHoverIndex(null);
    }
  }, [chartPayload]);

  const updateLayers = (updater: (prev: typeof DEFAULT_LAYERS) => typeof DEFAULT_LAYERS) => {
    setLayers((prev) => {
      const next = updater(prev);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('egx_pro_chart_layers', JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const toggleLayer = (key: keyof typeof DEFAULT_LAYERS) => {
    updateLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleResetChart = () => {
    updateLayers(() => DEFAULT_LAYERS);
    setVisibleCount(typeof window !== 'undefined' && window.innerWidth < 640 ? 55 : 90);
    setPanOffset(0);
    setHoverIndex(null);
    setSelectedExplanation(null);
  };

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
          modeName: 'مضاربة لحظية (Intraday)',
          studies: activeStudies
        };
      case '1d':
        return {
          tvInterval: 'D',
          modeName: 'سوينج قصير المدى (يومي)',
          studies: activeStudies
        };
      case '1wk':
      case '1w':
        return {
          tvInterval: 'W',
          modeName: 'سوينج متوسط المدى (أسبوعي)',
          studies: activeStudies
        };
      case '1mo':
        return {
          tvInterval: 'M',
          modeName: 'استثماري طويل المدى (شهري)',
          studies: activeStudies
        };
      default:
        return {
          tvInterval: 'D',
          modeName: 'تحليل فني',
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

  const allCandles: any[] = chartPayload?.candles || [];
  const supportZones: any[] = chartPayload?.support_zones || [];
  const resistanceZones: any[] = chartPayload?.resistance_zones || [];
  const fibData: any = chartPayload?.fibonacci || null;
  const swingHighs: any[] = chartPayload?.swing_highs || [];
  const swingLows: any[] = chartPayload?.swing_lows || [];
  const trendline: any = chartPayload?.trendline || null;
  const planLevels: any = chartPayload?.trade_plan_levels || null;

  // تحديد نافذة الشموع المرئية حسب التكبير والتحريك (Zoom & Pan)
  const visibleCandles = useMemo(() => {
    if (!allCandles.length) return [];
    const total = allCandles.length;
    const count = Math.min(Math.max(25, visibleCount), total);
    const maxOffset = Math.max(0, total - count);
    const safeOffset = Math.min(Math.max(0, panOffset), maxOffset);
    const endIdx = total - safeOffset;
    const startIdx = Math.max(0, endIdx - count);
    return allCandles.slice(startIdx, endIdx);
  }, [allCandles, visibleCount, panOffset]);

  // =========================================================================
  // حسابات الهندسة والمسارات داخل useMemo (المرحلة 8: لا يُعاد حسابها عند حركة الماوس)
  // =========================================================================
  const chartGeometry = useMemo(() => {
    if (!visibleCandles || visibleCandles.length < 5) return null;

    const width = 1000;
    const priceHeight = layers.volume ? 430 : 520;
    const volTop = 450;
    const volHeight = 85;
    const totalHeight = 555;
    const padLeft = 14;
    const padRight = 78;
    const padTop = 20;
    const padBottom = 22;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = priceHeight - padTop - padBottom;

    const allPrices: number[] = [];
    visibleCandles.forEach((c) => {
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
    const maxVol = Math.max(...visibleCandles.map((c) => Number(c.volume) || 0), 1);

    const xForIdx = (idx: number) => padLeft + (idx / Math.max(visibleCandles.length - 1, 1)) * plotWidth;
    const yForPrice = (p: number) => padTop + ((maxPrice - p) / Math.max(maxPrice - minPrice, 0.0001)) * plotHeight;
    const yForVol = (v: number) => volTop + volHeight - (v / maxVol) * volHeight;

    const buildLinePath = (field: string) => {
      const pts: string[] = [];
      visibleCandles.forEach((c, i) => {
        const val = c[field];
        if (val !== null && val !== undefined && !Number.isNaN(Number(val))) {
          pts.push(`${pts.length === 0 ? 'M' : 'L'} ${xForIdx(i).toFixed(1)} ${yForPrice(Number(val)).toFixed(1)}`);
        }
      });
      return pts.join(' ');
    };

    const barWidth = Math.max(3, Math.min(11, (plotWidth / visibleCandles.length) * 0.68));
    const priceGridCount = 6;
    const gridPrices = Array.from({ length: priceGridCount }, (_, i) =>
      minPrice + ((maxPrice - minPrice) * i) / (priceGridCount - 1)
    );

    return {
      width,
      priceHeight,
      volTop,
      volHeight,
      totalHeight,
      padLeft,
      padRight,
      padTop,
      padBottom,
      plotWidth,
      plotHeight,
      minPrice,
      maxPrice,
      barWidth,
      gridPrices,
      xForIdx,
      yForPrice,
      yForVol,
      paths: {
        ema20: layers.ema20 ? buildLinePath('ema20') : '',
        ema50: layers.ema50 ? buildLinePath('ema50') : '',
        sma200: layers.sma200 ? buildLinePath('sma200') : '',
        bbUpper: layers.bollinger ? buildLinePath('bb_upper') : '',
        bbMiddle: layers.bollinger ? buildLinePath('bb_middle') : '',
        bbLower: layers.bollinger ? buildLinePath('bb_lower') : '',
      }
    };
  }, [visibleCandles, layers, planLevels]);

  const activeCandle =
    hoverIndex !== null && visibleCandles[hoverIndex]
      ? visibleCandles[hoverIndex]
      : visibleCandles[visibleCandles.length - 1];

  const renderQuantInteractiveChart = () => {
    if (!chartGeometry || !visibleCandles.length) {
      return (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
          <p className="text-slate-500 font-bold mb-3 text-sm">بيانات الشموع التفاعلية قيد التحميل أو غير متوفرة...</p>
          <button
            type="button"
            onClick={() => setChartEngine('TRADINGVIEW')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
          >
            التبديل إلى شارت TradingView المباشر
          </button>
        </div>
      );
    }

    const {
      width,
      volTop,
      volHeight,
      totalHeight,
      padLeft,
      padRight,
      plotWidth,
      minPrice,
      maxPrice,
      barWidth,
      gridPrices,
      xForIdx,
      yForPrice,
      yForVol,
      paths
    } = chartGeometry;

    // إحداثيات خط الاتجاه (Trendline) إن وجد
    let trendlineCoords: { x1: number; y1: number; x2: number; y2: number } | null = null;
    if (layers.swingsAndTrendline && trendline && trendline.point_1 && trendline.point_2) {
      const idx1 = visibleCandles.findIndex((c) => c.date === trendline.point_1.date);
      const idx2 = visibleCandles.findIndex((c) => c.date === trendline.point_2.date);
      if (idx1 !== -1 && idx2 !== -1 && idx2 > idx1) {
        trendlineCoords = {
          x1: xForIdx(idx1),
          y1: yForPrice(Number(trendline.point_1.price)),
          x2: xForIdx(visibleCandles.length - 1),
          y2: yForPrice(Number(trendline.current_projected_price || trendline.point_2.price))
        };
      }
    }

    return (
      <div className="space-y-2.5">
        {/* شريط فحص الشمعة المحددة (Candle Details Inspector - المرحلة 3 - البند 1) */}
        <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-black text-amber-400">
              {symbol} ({config.tvInterval})
            </span>
            <span className="text-slate-300">
              التاريخ: <strong className="text-white" dir="ltr">{activeCandle?.date}</strong>
            </span>
            <span>
              فتح: <strong dir="ltr">{activeCandle?.open}</strong>
            </span>
            <span>
              أعلى: <strong className="text-emerald-400" dir="ltr">{activeCandle?.high}</strong>
            </span>
            <span>
              أدنى: <strong className="text-rose-400" dir="ltr">{activeCandle?.low}</strong>
            </span>
            <span>
              إغلاق: <strong className="text-amber-300" dir="ltr">{activeCandle?.close}</strong>
            </span>
            {activeCandle?.rvol !== null && activeCandle?.rvol !== undefined && (
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700" dir="ltr">
                RVOL: <strong className="text-indigo-300">{activeCandle.rvol}x</strong>
              </span>
            )}
            {activeCandle?.rsi !== null && activeCandle?.rsi !== undefined && (
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700" dir="ltr">
                RSI: <strong className="text-emerald-300">{activeCandle.rsi}</strong>
              </span>
            )}
          </div>

          {/* أزرار التكبير والتحريك السريعة */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPanOffset((p) => Math.min(p + 15, Math.max(0, allCandles.length - visibleCount)))}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
              title="تحريك للخلف (الشموع الأقدم)"
            >
              ▶ الأقدم
            </button>
            <button
              type="button"
              onClick={() => setPanOffset((p) => Math.max(0, p - 15))}
              disabled={panOffset === 0}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold cursor-pointer"
              title="تحريك للأمام (الشموع الأحدث)"
            >
              الأحدث ◀
            </button>
            <button
              type="button"
              onClick={() => setVisibleCount((c) => Math.max(30, c - 25))}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-black cursor-pointer"
              title="تكبير الشموع (Zoom In)"
            >
              + تكبير
            </button>
            <button
              type="button"
              onClick={() => setVisibleCount((c) => Math.min(140, c + 25))}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-black cursor-pointer"
              title="تصغير الشموع (Zoom Out)"
            >
              − تصغير
            </button>
          </div>
        </div>

        {/* لوحة الرسم البياني المتجاوبة (بدون إجبار الصفحة على تمرير أفقي على الموبايل) */}
        <div className="relative w-full bg-slate-950 rounded-2xl border border-slate-800 shadow-inner overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${totalHeight}`}
            className="w-full h-auto block select-none touch-manipulation"
            style={{ maxHeight: isFullscreen ? "78vh" : "580px" }}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {/* 1. خطوط الشبكة الأفقية والأسعار */}
            {gridPrices.map((gp, i) => {
              const y = yForPrice(gp);
              return (
                <g key={i}>
                  <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#1e293b" strokeDasharray="3 3" strokeWidth="1" />
                  <text x={width - padRight + 6} y={y + 4} fill="#94a3b8" fontSize="11" fontWeight="bold">
                    {gp.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* 2. مناطق الدعم والمقاومة المختبرة */}
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
                        badge: `القوة: ${z.strength_score}/100 (${z.status_ar})`,
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
                      دعم S{idx + 1} ({z.low}-{z.high})
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
                        badge: `القوة: ${z.strength_score}/100 (${z.status_ar})`,
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
                      مقاومة R{idx + 1} ({z.low}-{z.high})
                    </text>
                  </g>
                );
              })}

            {/* 3. مستويات الفيبوناتشي */}
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
                    <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#a855f7" strokeWidth="1.1" strokeDasharray="2 4" />
                    <text x={width - padRight - 95} y={y - 3} fill="#c084fc" fontSize="9.5" fontWeight="bold">
                      Fib {ratio} ({numVal})
                    </text>
                  </g>
                );
              })}

            {/* 4. البولنجر باندز */}
            {layers.bollinger && (
              <g>
                <path d={paths.bbUpper} fill="none" stroke="#64748b" strokeWidth="1.1" strokeDasharray="3 3" />
                <path d={paths.bbMiddle} fill="none" stroke="#94a3b8" strokeWidth="1.1" />
                <path d={paths.bbLower} fill="none" stroke="#64748b" strokeWidth="1.1" strokeDasharray="3 3" />
              </g>
            )}

            {/* 5. المتوسطات المتحركة */}
            {layers.ema20 && <path d={paths.ema20} fill="none" stroke="#38bdf8" strokeWidth="1.9" />}
            {layers.ema50 && <path d={paths.ema50} fill="none" stroke="#f59e0b" strokeWidth="1.9" />}
            {layers.sma200 && <path d={paths.sma200} fill="none" stroke="#e879f9" strokeWidth="2.2" />}

            {/* 6. خط الاتجاه والقمم والقيعان المحورية المؤكدة */}
            {trendlineCoords && (
              <line
                x1={trendlineCoords.x1}
                y1={trendlineCoords.y1}
                x2={trendlineCoords.x2}
                y2={trendlineCoords.y2}
                stroke="#fbbf24"
                strokeWidth="2"
                strokeDasharray="6 3"
              />
            )}

            {layers.swingsAndTrendline &&
              swingHighs.map((sh, i) => {
                const idx = visibleCandles.findIndex((c) => c.date === sh.date);
                if (idx === -1) return null;
                const x = xForIdx(idx);
                const y = yForPrice(Number(sh.price));
                return (
                  <g key={`sh-${i}`}>
                    <circle cx={x} cy={y - 6} r="3.5" fill="#fb7185" />
                    <text x={x - 9} y={y - 12} fill="#fda4af" fontSize="8.5" fontWeight="bold">
                      SH
                    </text>
                  </g>
                );
              })}

            {layers.swingsAndTrendline &&
              swingLows.map((sl, i) => {
                const idx = visibleCandles.findIndex((c) => c.date === sl.date);
                if (idx === -1) return null;
                const x = xForIdx(idx);
                const y = yForPrice(Number(sl.price));
                return (
                  <g key={`sl-${i}`}>
                    <circle cx={x} cy={y + 6} r="3.5" fill="#34d399" />
                    <text x={x - 8} y={y + 18} fill="#6ee7b7" fontSize="8.5" fontWeight="bold">
                      SL
                    </text>
                  </g>
                );
              })}

            {/* خط التقاطع للشمعة المحددة (Crosshair) */}
            {hoverIndex !== null && visibleCandles[hoverIndex] && (
              <line
                x1={xForIdx(hoverIndex)}
                y1={15}
                x2={xForIdx(hoverIndex)}
                y2={totalHeight - 15}
                stroke="#475569"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )}

            {/* 7. الشموع اليابانية (مع دعم الماوس واللمس على الموبايل) */}
            {visibleCandles.map((c, idx) => {
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
                  onClick={() => setHoverIndex(idx)}
                  className="cursor-crosshair"
                >
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.25" />
                  <rect
                    x={x - barWidth / 2}
                    y={bodyTop}
                    width={barWidth}
                    height={bodyH}
                    fill={color}
                    rx="0.6"
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
                    <text x={padLeft + 120} y={yForPrice(Number(planLevels.entry)) - 4} fill="#60a5fa" fontSize="10" fontWeight="bold">
                      🎯 الدخول: {planLevels.entry}
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
                    <text x={padLeft + 120} y={yForPrice(Number(planLevels.stop_loss)) + 12} fill="#f87171" fontSize="10" fontWeight="bold">
                      🛑 الوقف: {planLevels.stop_loss}
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
                    <text x={padLeft + 120} y={yForPrice(Number(planLevels.tp1)) - 4} fill="#4ade80" fontSize="10" fontWeight="bold">
                      ✅ الهدف 1: {planLevels.tp1} (R:R 1:{planLevels.risk_reward})
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
                  السيولة وأحجام التداول (Volume)
                </text>
                {visibleCandles.map((c, idx) => {
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
                      fill={
                        isBull
                          ? isHighRvol
                            ? "#10b981"
                            : "rgba(16, 185, 129, 0.45)"
                          : isHighRvol
                          ? "#f43f5e"
                          : "rgba(244, 63, 94, 0.45)"
                      }
                    />
                  );
                })}
              </g>
            )}
          </svg>
        </div>

        {/* بطاقة الشرح التعليمي عند النقر على أي مستوى */}
        {selectedExplanation && (
          <div className="bg-indigo-950 text-white p-3.5 sm:p-4 rounded-2xl border border-indigo-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-1 text-xs">
              <div className="flex flex-wrap items-center gap-2">
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
              type="button"
              onClick={() => setSelectedExplanation(null)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap cursor-pointer"
            >
              إغلاق ✕
            </button>
          </div>
        )}
      </div>
    );
  };

  const layerButtons = [
    { key: 'ema20', label: 'EMA 20', group: 'secondary', color: 'bg-sky-500' },
    { key: 'ema50', label: 'EMA 50', group: 'secondary', color: 'bg-amber-500' },
    { key: 'sma200', label: 'SMA 200', group: 'secondary', color: 'bg-fuchsia-500' },
    { key: 'bollinger', label: 'Bollinger', group: 'secondary', color: 'bg-slate-500' },
    { key: 'srZones', label: 'الدعم والمقاومة', group: 'primary', color: 'bg-emerald-600' },
    { key: 'fibonacci', label: 'فيبوناتشي', group: 'primary', color: 'bg-purple-600' },
    { key: 'swingsAndTrendline', label: 'القمم والقيعان', group: 'secondary', color: 'bg-rose-500' },
    { key: 'volume', label: 'السيولة', group: 'primary', color: 'bg-teal-600' },
    { key: 'tradePlan', label: 'خطة التداول', group: 'primary', color: 'bg-blue-600' },
  ];

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-950 p-3 sm:p-6 overflow-y-auto flex flex-col gap-3 rtl"
          : "w-full flex flex-col gap-3"
      }
      dir="rtl"
    >
      {/* شريط أدوات الرسم والتحليل المنظم (المرحلة 3 - البند 2 و 3) */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* التبديل بين الشارت الكمي وشارت TradingView */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setChartEngine('QUANT_CANVAS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                chartEngine === 'QUANT_CANVAS'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              🎯 الشارت الكمي التفاعلي
            </button>
            <button
              type="button"
              onClick={() => setChartEngine('TRADINGVIEW')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                chartEngine === 'TRADINGVIEW'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              📈 TradingView
            </button>
          </div>

          {/* أزرار إعادة ضبط الرسم وعرض ملء الشاشة وقائمة مؤشرات الموبايل */}
          <div className="flex items-center gap-1.5">
            {chartEngine === 'QUANT_CANVAS' && (
              <>
                <button
                  type="button"
                  onClick={() => setMobileIndicatorsMenuOpen(!mobileIndicatorsMenuOpen)}
                  className="md:hidden px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-black cursor-pointer"
                >
                  ⚙️ المؤشرات والأدوات {mobileIndicatorsMenuOpen ? '▲' : '▼'}
                </button>
                <button
                  type="button"
                  onClick={handleResetChart}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-black cursor-pointer"
                  title="إعادة ضبط الرسم والمؤشرات للوضع الافتراضي"
                >
                  ↺ إعادة ضبط الرسم
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-black cursor-pointer"
            >
              {isFullscreen ? '✕ إغلاق ملء الشاشة' : '⛶ ملء الشاشة'}
            </button>
          </div>
        </div>

        {/* شريط الطبقات على الكمبيوتر + القائمة القابلة للفتح على الموبايل */}
        {chartEngine === 'QUANT_CANVAS' && (
          <div className={`${mobileIndicatorsMenuOpen ? 'flex' : 'hidden md:flex'} flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/80`}>
            <span className="text-[11px] font-bold text-slate-400 ml-1">إظهار/إخفاء على الرسم:</span>
            {layerButtons.map((item) => {
              const active = (layers as any)[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleLayer(item.key as any)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${active ? item.color : 'bg-slate-300'}`}></span>
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
          style={{ height: isFullscreen ? "82vh" : "650px", width: "100%" }}
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