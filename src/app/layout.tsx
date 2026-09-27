import type { Metadata } from 'next';
import { Cairo } from 'next/font/google'; 
import './globals.css';
import Link from 'next/link';
import Image from 'next/image'; // 👈 استيراد مكون الصور من Next.js

const cairo = Cairo({ subsets: ['arabic'] });

export const metadata: Metadata = {
  title: "EGX Pro Analyzer",
  description: "منصة تحليل أسهم البورصة المصرية",
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
      <body className={`${cairo.className} bg-gray-50 text-gray-900 flex min-h-screen`}>
        
        {/* القائمة الجانبية (Sidebar) - ثابتة على اليمين */}
        <aside className="w-64 bg-white shadow-xl border-l border-gray-200 fixed top-0 right-0 h-screen z-50 flex flex-col">
          
          {/* قسم اللوجو المعدل */}
          <div className="p-5 border-b border-gray-100 flex items-center gap-3">
            <Image 
              src="/logo.png" 
              alt="EGX Pro Logo" 
              width={42} 
              height={42} 
              className="rounded-xl shadow-sm object-cover"
              priority
            />
            <div>
              <h1 className="text-xl font-extrabold text-blue-700 tracking-tight leading-tight">EGX Pro</h1>
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block">Analyzer</span>
            </div>
          </div>
          
          {/* روابط التنقل */}
          <nav className="flex-1 p-4 flex flex-col gap-2 mt-4">
            <Link 
              href="/" 
              className="flex items-center gap-3 font-bold text-gray-600 hover:text-blue-700 hover:bg-blue-50 p-3 rounded-xl transition-all"
            >
              <span className="text-xl">🔍</span> التحليل المفصل
            </Link>
            
            <Link 
              href="/radar" 
              className="flex items-center gap-3 font-bold text-gray-600 hover:text-green-700 hover:bg-green-50 p-3 rounded-xl transition-all"
            >
              <span className="text-xl">🎯</span> رادار السوق
            </Link>
            
            <Link 
              href="/strategies" 
              className="flex items-center gap-3 font-bold text-gray-600 hover:text-purple-700 hover:bg-purple-50 p-3 rounded-xl transition-all"
            >
              <span className="text-xl">🧠</span> التوصيات
            </Link>

            <Link 
              href="/watchlist" 
              className="flex items-center gap-3 font-bold text-gray-600 hover:text-orange-700 hover:bg-orange-50 p-3 rounded-xl transition-all"
            >
              <span className="text-xl">📋</span> محفظة المتابعة
            </Link>
          </nav>
          
          {/* تذييل القائمة الجانبية */}
          <div className="p-4 border-t border-gray-100 text-center text-xs text-gray-400">
            EGX Pro Analyzer © 2026
          </div>
        </aside>

        {/* محتوى الصفحات الديناميكي */}
        <main className="flex-1 mr-64 p-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>

      </body>
    </html>
  );
}