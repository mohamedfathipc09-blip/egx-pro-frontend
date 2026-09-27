"use client";
import React, { useState, useMemo } from 'react';

// تعريف نوع البيانات القادمة من الباك إند
type StockData = {
    symbol: string;
    price: number;
    volume: number;
    rsi: number;
    rvol: number;
    isHammer: boolean;
    isEngulfing: boolean;
};

export default function RadarTable({ data }: { data: StockData[] }) {
    // 1. حالة الترتيب (Sorting)
    const [sortConfig, setSortConfig] = useState<{ key: keyof StockData; direction: 'asc' | 'desc' } | null>(null);
    // 2. حالة الفلترة (Filtering Tabs)
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'HIGH_VOL' | 'OVERSOLD' | 'T0'>('ALL');

    // دالة تنفيذ الترتيب عند النقر على رأس العمود
    const requestSort = (key: keyof StockData) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    // معالجة البيانات (تطبيق الفلترة ثم الترتيب)
    const processedData = useMemo(() => {
        // أ. تطبيق الفلترة
        let filtered = data;
        if (activeFilter === 'HIGH_VOL') {
            filtered = data.filter(s => s.rvol > 1.5); // حجم نسبي مرتفع
        } else if (activeFilter === 'OVERSOLD') {
            filtered = data.filter(s => s.rsi < 30); // تشبع بيعي
        } else if (activeFilter === 'T0') {
            filtered = data.filter(s => s.isHammer || s.isEngulfing); // أنماط انعكاسية لحظية
        }

        // ب. تطبيق الترتيب
        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [data, sortConfig, activeFilter]);

    return (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            
            {/* تبويبات الفلترة السريعة */}
            <div className="flex gap-2 p-4 border-b bg-gray-50">
                {[
                    { id: 'ALL', label: 'الكل' },
                    { id: 'HIGH_VOL', label: '🔥 سيولة عالية' },
                    { id: 'OVERSOLD', label: '📉 تشبع بيعي' },
                    { id: 'T0', label: '⚡ فرص T+0' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveFilter(tab.id as any)}
                        className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${
                            activeFilter === tab.id 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'bg-white text-gray-600 border hover:bg-gray-100'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* جدول البيانات الديناميكي */}
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 text-gray-700">
                        <tr>
                            <th className="p-3 border-b font-bold">السهم</th>
                            <th className="p-3 border-b font-bold cursor-pointer hover:bg-gray-200 transition" onClick={() => requestSort('price')}>
                                السعر {sortConfig?.key === 'price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="p-3 border-b font-bold cursor-pointer hover:bg-gray-200 transition" onClick={() => requestSort('volume')}>
                                الحجم (Volume) {sortConfig?.key === 'volume' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="p-3 border-b font-bold cursor-pointer hover:bg-gray-200 transition" onClick={() => requestSort('rsi')}>
                                RSI {sortConfig?.key === 'rsi' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="p-3 border-b font-bold">إشارات الانعكاس</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedData.map((stock, idx) => (
                            <tr 
                                key={idx} 
                                // إضافة كلاس الوميض (flash-row) إذا كان الحجم النسبي مرتفعاً جداً
                                className={`border-b hover:bg-gray-50 transition-colors ${stock.rvol > 2.0 ? 'flash-row' : ''}`}
                            >
                                <td className="p-3 font-bold text-blue-700">{stock.symbol}</td>
                                <td className="p-3">{stock.price.toFixed(2)}</td>
                                <td className="p-3" dir="ltr">
                                    <span className="font-bold">{stock.volume.toLocaleString()}</span>
                                    {stock.rvol > 1.5 && <span className="text-xs text-green-600 ml-2">(RVOL: {stock.rvol.toFixed(1)}x)</span>}
                                </td>
                                <td className={`p-3 font-bold ${stock.rsi < 30 ? 'text-green-600' : stock.rsi > 70 ? 'text-red-600' : ''}`}>
                                    {stock.rsi.toFixed(1)}
                                </td>
                                <td className="p-3 flex gap-2">
                                    {stock.isHammer && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">مطرقة 🔨</span>}
                                    {stock.isEngulfing && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">ابتلاع شرائي 📈</span>}
                                    {(!stock.isHammer && !stock.isEngulfing) && <span className="text-gray-400">-</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {processedData.length === 0 && (
                    <div className="p-8 text-center text-gray-500 font-bold">لا توجد أسهم تطابق هذا الفلتر حالياً.</div>
                )}
            </div>
        </div>
    );
}