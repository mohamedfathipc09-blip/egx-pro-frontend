"use client";
import React, { useEffect, useRef, memo } from "react";
// 👇 لاحظ استدعاء CandlestickSeries و createSeriesMarkers الخاصة بالإصدار الخامس
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
// 2. المكون الأساسي (Component)
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

    // 👇 التعديل الجوهري لـ V5: استخدام addSeries
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    candlestickSeries.setData(data as any);

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

    // 👇 التعديل الثاني لـ V5: طريقة رسم علامات التحديثات اللحظية (Markers)
    if (events && events.length > 0) {
      createSeriesMarkers(candlestickSeries, events as any);
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