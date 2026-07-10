import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Gaegu } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import BottomTab from "@/components/BottomTab";
import AuthProvider from "@/components/AuthProvider";
import InstallBanner from "@/components/InstallBanner";

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
  title: "LanguageLAB",
  description: "영어 & 일본어 학습 복습 노트",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LangLAB",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${gaegu.variable} antialiased`}>
      <head>
        <link rel="icon" href="/icon-192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script suppressHydrationWarning async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5231401865546098" crossOrigin="anonymous"></script>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `(function(){var d=document.documentElement,s=localStorage;var t=s.getItem("theme");if(t==="dark"||t==="light")d.setAttribute("data-theme",t);var v=s.getItem("theme-variant");if(v)d.setAttribute("data-variant",v);var a=s.getItem("theme-accent");if(a)d.setAttribute("data-accent",a);window.__fixPT=function(){var cs=getComputedStyle(d),c=cs.getPropertyValue("--primary").trim();if(!c)return;var r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);var L=0.2126*(r/255)+0.7152*(g/255)+0.0722*(b/255);d.style.setProperty("--primary-text",L>0.5?"#1a1a1a":"#ffffff")};setTimeout(window.__fixPT,0)})()` }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <Nav />
          <main className="flex-1 max-w-4xl w-full mx-auto px-4 pb-24 sm:pb-20 pt-3">
            {children}
          </main>
          <BottomTab />
          <InstallBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
