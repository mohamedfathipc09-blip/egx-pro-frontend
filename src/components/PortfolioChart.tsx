"use client";
import React, { useEffect, useRef, memo } from "react";
import { createChart, CandlestickSeries, ColorType, CrosshairMode, createSeriesMarkers } from "lightweight-charts";

// ==========================================
// 1. واجهات البيانات (Interfaces)
// ==========================================
export interface CandleData {
  time: string | number; 
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TradeLevels {
  entry: number;
  tp1: number;
  tp2?: number | null;
  stopLoss: number;
}

export interface ChartEvent {
  time: string | number;
  position: "aboveBar" | "belowBar";
  color: string;
  shape: "arrowUp" | "arrowDown" | "circle" | "square";
  text: string;
}

interface PortfolioChartProps {
  data: CandleData[];
  levels?: TradeLevels;
  events?: ChartEvent[];
  height?: number;
}

// ==========================================
// 2. فلتر الوقت (لمنع انهيار المكتبة بسبب صيغة 07:00)
// ==========================================
const sanitizeTime = (timeVal: string | number, index: number): string | number => {
  if (typeof timeVal === 'number') return timeVal;
  
  if (typeof timeVal === 'string') {
    const trimmedTime = timeVal.trim();
    
    // الحالة الأولى: الوقت قادم كساعات فقط "07:00" (نربطه بتاريخ اليوم ونحوله لثواني)
    if (/^\d{1,2}:\d{2}/.test(trimmedTime)) {
      const today = new Date().toISOString().split('T')[0];
      const ms = new Date(`${today}T${trimmedTime}:00`).getTime();
      if (!isNaN(ms)) return Math.floor(ms / 1000);
    }
    
    // الحالة الثانية: الوقت يحتوي على تاريخ وساعة (نحوله لثواني)
    if (trimmedTime.includes(' ') || trimmedTime.includes('T')) {
      const ms = new Date(trimmedTime).getTime();
      if (!isNaN(ms)) return Math.floor(ms / 1000);
    }
    
    // الحالة الثالثة: تاريخ نقي بصيغة YYYY-MM-DD (نقبله كما هو)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedTime)) {
      return trimmedTime;
    }
  }

  // كحماية نهائية: إعطاء وقت حالي تسلسلي لمنع الشاشة البيضاء تماماً
  return Math.floor(Date.now() / 1000) + (index * 60);
};

// ==========================================
// 3. المكون الأساسي (Component)
// ==========================================
function PortfolioChart({ data, levels, events, height = 350 }: PortfolioChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    chartContainerRef.current.innerHTML = "";

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#333",
      },
      grid: {
        vertLines: { color: "#f0f3fa" },
        horzLines: { color: "#f0f3fa" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#cccccc" },
      timeScale: { borderColor: "#cccccc", timeVisible: true },
      width: chartContainerRef.current.clientWidth,
      height: height,
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    // 👇 تمرير البيانات بعد تنظيف الوقت
    const safeData = data.map((c, i) => ({
      ...c,
      time: sanitizeTime(c.time, i)
    }));
    
    candlestickSeries.setData(safeData as any);

    if (levels) {
      candlestickSeries.createPriceLine({
        price: levels.entry,
        color: "#2962FF",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "ENTRY",
      });

      candlestickSeries.createPriceLine({
        price: levels.tp1,
        color: "#00E676",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "TP1",
      });

      if (levels.tp2) {
        candlestickSeries.createPriceLine({
          price: levels.tp2,
          color: "#00C853",
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "TP2",
        });
      }

      candlestickSeries.createPriceLine({
        price: levels.stopLoss,
        color: "#D50000",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "STOP",
      });
    }

    // 👇 تمرير الأحداث بعد تنظيف الوقت ومطابقته
    if (events && events.length > 0) {
      const safeEvents = events.map((e, i) => ({
        ...e,
        time: sanitizeTime(e.time, i)
      }));
      createSeriesMarkers(candlestickSeries, safeEvents as any);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, levels, events, height]);

  return (
    <div className="w-full relative rounded-lg border border-gray-200 overflow-hidden shadow-sm bg-white">
      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <span className="text-gray-400 font-bold">جاري تحميل بيانات الشارت...</span>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}

export default memo(PortfolioChart);