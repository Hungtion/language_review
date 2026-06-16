import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import AuthProvider from "@/components/AuthProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sean's Language Lab",
  description: "영어 & 일본어 학습 복습 노트",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <Nav />
          <main className="flex-1 max-w-4xl w-full mx-auto px-4 pb-20 pt-6">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
