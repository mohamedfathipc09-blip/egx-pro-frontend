import type { Metadata } from 'next';
import { Cairo } from 'next/font/google'; 
import "./globals.css";
import Link from 'next/link';
import Image from 'next/image';

const cairo = Cairo({ subsets: ['arabic'] });

export const metadata: Metadata = {
  title: "EGX Pro Analyzer",
  description: "منصة تحليل أسهم البورصة المصرية والمساعد الذكي حمزة | Hamza AI",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.className} bg-gray-50 text-gray-900 flex flex-col md:flex-row min-h-screen overflow-x-hidden`}>
        
        {/* القائمة الجانبية (Sidebar) */}
        <aside className="w-full md:w-64 bg-white shadow-md md:shadow-xl border-b md:border-b-0 md:border-l border-gray-200 md:fixed md:top-0 md:right-0 md:h-screen z-50 flex flex-col">
          
          <div className="p-3.5 md:p-5 border-b border-gray-100 flex items-center justify-between md:justify-start gap-3">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="EGX Pro Logo" 
                width={40} 
                height={40} 
                className="rounded-xl shadow-sm object-cover"
                priority
              />
              <div>
                <h1 className="text-lg md:text-xl font-extrabold text-blue-700 tracking-tight leading-tight">EGX Pro</h1>
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block">Analyzer</span>
              </div>
            </div>

            <Link
              href="/hamza"
              className="md:hidden flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-xs"
            >
              <span>🦅</span>
              <span>Hamza AI | حمزة</span>
            </Link>
          </div>
          
          {/* روابط التنقل */}
          <nav className="flex-1 p-2.5 md:p-4 flex flex-row md:flex-col gap-1.5 md:gap-2 md:mt-2 overflow-x-auto md:overflow-visible items-center md:items-stretch">
            <Link 
              href="/" 
              className="whitespace-nowrap flex items-center gap-2 md:gap-3 font-bold text-xs sm:text-sm md:text-base text-gray-600 hover:text-blue-700 hover:bg-blue-50 p-2.5 md:p-3 rounded-xl transition-all"
            >
              <span className="text-lg md:text-xl">🔍</span> التحليل المفصل
            </Link>

            <Link 
              href="/hamza" 
              className="whitespace-nowrap flex items-center justify-between gap-2 md:gap-3 font-black text-xs sm:text-sm md:text-base text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 p-2.5 md:p-3 rounded-xl transition-all shadow-2xs"
            >
              <span className="flex items-center gap-2 md:gap-3">
                <span className="text-lg md:text-xl">🦅</span> Hamza AI | حمزة
              </span>
              <span className="hidden md:inline-block text-[10px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                AI
              </span>
            </Link>
            
            <Link 
              href="/radar" 
              className="whitespace-nowrap flex items-center gap-2 md:gap-3 font-bold text-xs sm:text-sm md:text-base text-gray-600 hover:text-green-700 hover:bg-green-50 p-2.5 md:p-3 rounded-xl transition-all"
            >
              <span className="text-lg md:text-xl">🎯</span> رادار السوق
            </Link>

            {/* 👇 الرابط الجديد: ماسح القيعان السنوية والنصف سنوية */}
            <Link 
              href="/lows-screener" 
              className="whitespace-nowrap flex items-center gap-2 md:gap-3 font-bold text-xs sm:text-sm md:text-base text-rose-700 bg-rose-50/70 hover:bg-rose-100 border border-rose-200 p-2.5 md:p-3 rounded-xl transition-all"
            >
              <span className="text-lg md:text-xl">📉</span> ماسح القيعان (52W & 6M)
            </Link>
            
            <Link 
              href="/strategies" 
              className="whitespace-nowrap flex items-center gap-2 md:gap-3 font-bold text-xs sm:text-sm md:text-base text-gray-600 hover:text-purple-700 hover:bg-purple-50 p-2.5 md:p-3 rounded-xl transition-all"
            >
              <span className="text-lg md:text-xl">🧠</span> التوصيات
            </Link>

            <Link 
              href="/watchlist" 
              className="whitespace-nowrap flex items-center gap-2 md:gap-3 font-bold text-xs sm:text-sm md:text-base text-gray-600 hover:text-orange-700 hover:bg-orange-50 p-2.5 md:p-3 rounded-xl transition-all"
            >
              <span className="text-lg md:text-xl">📋</span> محفظة المتابعة
            </Link>

            <Link 
              href="/performance" 
              className="whitespace-nowrap flex items-center gap-2 md:gap-3 font-bold text-xs sm:text-sm md:text-base text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 p-2.5 md:p-3 rounded-xl transition-all md:mt-3 md:border-t md:border-gray-100 md:pt-5"
            >
              <span className="text-lg md:text-xl">📊</span> الأداء والإحصائيات
            </Link>
          </nav>
          
          <div className="hidden md:block p-4 border-t border-gray-100 text-center text-xs text-gray-400">
            EGX Pro Analyzer © 2026
          </div>
        </aside>

        <main className="flex-1 mr-0 md:mr-64 p-2.5 sm:p-5 md:p-8 w-full min-w-0">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>

      </body>
    </html>
  );
}