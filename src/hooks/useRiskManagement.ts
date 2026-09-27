'use client';
import { useState, useEffect } from 'react';

export interface RiskSettings {
  capital: number;
  riskPerTradePercent: number; // مثلا 2%
  maxOpenTrades: number;
  maxTotalRiskPercent: number; // مثلا 6%
  minRiskReward: number; // مثلا 1.5
}

export interface ActiveTrade {
  id: string;
  symbol: string;
  sector: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  shares: number;
  riskAmount: number;
}

const DEFAULT_SETTINGS: RiskSettings = {
  capital: 100000,
  riskPerTradePercent: 2,
  maxOpenTrades: 5,
  maxTotalRiskPercent: 6,
  minRiskReward: 1.5,
};

// دالة مساعدة لتصنيف بعض أسهم السوق المصري (يمكنك توسيعها لاحقاً)
export const getSector = (symbol: string) => {
  const sectors: Record<string, string> = {
    'COMI': 'بنوك', 'ADIB': 'بنوك', 'CIEB': 'بنوك',
    'TMGH': 'عقارات', 'HELI': 'عقارات', 'PHDC': 'عقارات',
    'FWRY': 'تكنولوجيا', 'EFIH': 'تكنولوجيا',
    'ABUK': 'بتروكيماويات', 'MFPC': 'بتروكيماويات', 'AMOC': 'بتروكيماويات',
    'HRHO': 'خدمات مالية', 'SWDY': 'صناعة',
  };
  return sectors[symbol] || 'قطاعات أخرى';
};

export function useRiskManagement() {
  const [settings, setSettings] = useState<RiskSettings>(DEFAULT_SETTINGS);
  const [portfolio, setPortfolio] = useState<ActiveTrade[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // تحميل البيانات من localStorage عند بدء تشغيل المكون (لتجنب أخطاء Hydration)
  useEffect(() => {
    const savedSettings = localStorage.getItem('egx_risk_settings');
    const savedPortfolio = localStorage.getItem('egx_portfolio');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedPortfolio) setPortfolio(JSON.parse(savedPortfolio));
    setIsLoaded(true);
  }, []);

  // حفظ الإعدادات تلقائياً عند التغيير
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('egx_risk_settings', JSON.stringify(settings));
      localStorage.setItem('egx_portfolio', JSON.stringify(portfolio));
    }
  }, [settings, portfolio, isLoaded]);

  // الحسابات الأساسية للمحفظة
  const totalRiskAmount = portfolio.reduce((sum, trade) => sum + trade.riskAmount, 0);
  const totalRiskPercent = (totalRiskAmount / settings.capital) * 100;
  
  // توزيع القطاعات
  const sectorExposure = portfolio.reduce((acc, trade) => {
    acc[trade.sector] = (acc[trade.sector] || 0) + (trade.entryPrice * trade.shares);
    return acc;
  }, {} as Record<string, number>);

  const totalInvested = portfolio.reduce((sum, trade) => sum + (trade.entryPrice * trade.shares), 0);
  const overConcentratedSectors = Object.entries(sectorExposure).filter(
    ([_, amount]) => (amount / totalInvested) > 0.40 // تنبيه إذا زاد القطاع عن 40%
  );

  // دالة حساب حجم المركز لصفقة جديدة
  const calculatePosition = (entry: number, sl: number) => {
    if (entry <= sl) return 0;
    const riskAmount = settings.capital * (settings.riskPerTradePercent / 100);
    const riskPerShare = entry - sl;
    return Math.floor(riskAmount / riskPerShare);
  };

  const calculateRR = (entry: number, sl: number, tp: number) => {
    const risk = entry - sl;
    const reward = tp - entry;
    return risk > 0 ? Number((reward / risk).toFixed(2)) : 0;
  };

  const addTrade = (trade: Omit<ActiveTrade, 'id' | 'sector' | 'riskAmount'>) => {
    if (portfolio.length >= settings.maxOpenTrades) {
      alert(`❌ لا يمكن إضافة الصفقة: تم الوصول للحد الأقصى للصفقات المفتوحة (${settings.maxOpenTrades}).`);
      return false;
    }
    
    const riskAmount = (trade.entryPrice - trade.stopLoss) * trade.shares;
    if (((totalRiskAmount + riskAmount) / settings.capital) * 100 > settings.maxTotalRiskPercent) {
      alert(`❌ لا يمكن إضافة الصفقة: ستتجاوز الحد الأقصى للمخاطرة الكلية (${settings.maxTotalRiskPercent}%).`);
      return false;
    }

    const newTrade: ActiveTrade = {
      ...trade,
      id: Date.now().toString(),
      sector: getSector(trade.symbol),
      riskAmount
    };
    
    setPortfolio([...portfolio, newTrade]);
    return true;
  };

  const removeTrade = (id: string) => {
    setPortfolio(portfolio.filter(t => t.id !== id));
  };

  return {
    isLoaded,
    settings,
    setSettings,
    portfolio,
    totalRiskPercent,
    totalRiskAmount,
    overConcentratedSectors,
    calculatePosition,
    calculateRR,
    addTrade,
    removeTrade
  };
}