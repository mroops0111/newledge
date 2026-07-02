import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Newledge - 智慧新聞聚合平台",
  description: "個人化新聞摘要服務，依據您的搜尋條件智慧篩選最相關的新聞內容",
  keywords: ["新聞", "聚合", "個人化", "智慧推薦", "資訊"],
  authors: [{ name: "Newledge Team" }],
  openGraph: {
    title: "Newledge - 智慧新聞聚合平台",
    description: "個人化新聞摘要服務，依據您的搜尋條件智慧篩選最相關的新聞內容",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
          <AuthProvider>
            <Navbar />
            <main className="relative">
              {children}
            </main>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
