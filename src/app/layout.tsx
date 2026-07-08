import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Gaegu } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import BottomTab from "@/components/BottomTab";
import AuthProvider from "@/components/AuthProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const gaegu = Gaegu({ variable: "--font-gaegu", weight: ["400", "700"], subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Language Lab",
  description: "영어 & 일본어 학습 복습 노트",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lang Lab",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} ${gaegu.variable} antialiased`}>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <Nav />
          <main className="flex-1 max-w-4xl w-full mx-auto px-4 pb-24 sm:pb-20 pt-3">
            {children}
          </main>
          <BottomTab />
        </AuthProvider>
      </body>
    </html>
  );
}
