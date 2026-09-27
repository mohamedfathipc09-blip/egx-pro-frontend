"use client";
import React, { useEffect, useRef, memo } from 'react';

type StockChartProps = {
  symbol: string;
  interval?: string;
};

function StockChart({ symbol, interval = "1d" }: StockChartProps) {
  const container = useRef<HTMLDivElement>(null);

  const getTradingModeConfig = (currentInterval: string) => {
    // 💡 وضعنا الـ 4 مؤشرات الأساسية فقط (أقل من الحد الأقصى المجاني)
    const activeStudies = [
      "Volume@tv-basicstudies", // حجم التداول
      "BB@tv-basicstudies",     // بولينجر باندز
      "RSI@tv-basicstudies",    // مؤشر القوة النسبية
      "MACD@tv-basicstudies"    // الماكد
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

  useEffect(() => {
    if (!container.current) return;
    
    container.current.innerHTML = '';

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
      "studies": config.studies, // هنا بيتم حقن المؤشرات الأربعة
      "support_host": "https://www.tradingview.com"
    };

    script.innerHTML = JSON.stringify(widgetConfig);
    container.current.appendChild(script);
    
  }, [symbol, interval]);

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between shadow-sm transition-all">
        <span className="font-bold text-blue-800">وضع التحليل الحالي:</span>
        <span className="font-bold text-blue-900 bg-white px-4 py-1 rounded-full shadow-sm border border-blue-100">
          {config.modeName}
        </span>
      </div>

      <div className="tradingview-widget-container rounded-lg overflow-hidden border border-gray-200" style={{ height: "750px", width: "100%" }}>
        <div className="tradingview-widget-container__widget" ref={container} style={{ height: "100%", width: "100%" }}></div>
      </div>
    </div>
  );
}

export default memo(StockChart);