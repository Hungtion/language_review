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
  title: "Language LAB",
  description: "AI-powered English & Japanese Study Notes",
  manifest: "/manifest.json",
  openGraph: {
    title: "Language LAB",
    description: "AI-powered English & Japanese Study Notes",
    url: "https://language-review.vercel.app",
    siteName: "Language LAB",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Language LAB",
    description: "AI-powered English & Japanese Study Notes",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Language LAB",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${gaegu.variable} antialiased`}>
      <head>
        <link rel="icon" href="/icon-192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `(function(){var d=document.documentElement,s=localStorage;var t=s.getItem("theme");if(t==="dark"||t==="light")d.setAttribute("data-theme",t);var v=s.getItem("theme-variant");if(v)d.setAttribute("data-variant",v);var a=s.getItem("theme-accent");if(a)d.setAttribute("data-accent",a);window.__fixPT=function(){var cs=getComputedStyle(d),c=cs.getPropertyValue("--primary").trim();if(!c)return;var r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);var L=0.2126*(r/255)+0.7152*(g/255)+0.0722*(b/255);d.style.setProperty("--primary-text",L>0.5?"#1a1a1a":"#ffffff")};setTimeout(window.__fixPT,0)})()` }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <div id="splash" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0B0F19", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", transition: "opacity 0.4s" }}>
          <img src="/splash-icon.png" alt="" width="120" height="120" style={{ borderRadius: "24px" }} />
          <div style={{ color: "#fff", fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Language <span style={{ fontWeight: 300, opacity: 0.6 }}>LAB</span></div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `window.addEventListener("load",function(){var s=document.getElementById("splash");if(s){setTimeout(function(){s.style.opacity="0";setTimeout(function(){s.style.display="none"},400)},300)}})` }} />
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
