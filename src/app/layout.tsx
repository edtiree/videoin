import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import SplashHider from "@/components/SplashHider";
import MobileTopNav from "@/components/MobileTopNav";
import ThemeProvider from "@/components/ThemeProvider";
import AuthProvider from "@/components/AuthProvider";
import LoginModal from "@/components/LoginModal";
import RoleSelectionModal from "@/components/RoleSelectionModal";
import LandingSlide from "@/components/LandingSlide";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "영상인 - 크리에이터와 편집자를 위한 플랫폼",
    template: "%s | 영상인",
  },
  description: "유튜브 크리에이터와 영상 편집자를 위한 올인원 플랫폼",
  openGraph: {
    title: "영상인 - 크리에이터와 편집자를 위한 플랫폼",
    description: "유튜브 크리에이터와 영상 편집자를 위한 올인원 플랫폼",
    siteName: "영상인",
    type: "website",
    images: ["/og-image.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#f9fafb" />
        <link rel="manifest" href="/manifest.json" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})()` }} />
      </head>
      <body className="h-[100dvh] flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] md:pb-0 bg-gray-50">
        <ThemeProvider>
          <AuthProvider>
            <SplashHider />
            <DesktopNav />
            <MobileTopNav />
            <div className="flex-1 pb-14 md:pb-0 bg-gray-50 overflow-y-auto">{children}</div>
            <BottomNav />
            <LoginModal />
            <RoleSelectionModal />
            <LandingSlide />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
