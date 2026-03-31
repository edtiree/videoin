import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import SideNav from "@/components/SideNav";

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
    default: "에디트리 영상 제작팀",
    template: "%s | 에디트리",
  },
  description: "에디트리 영상 제작팀 내부 시스템",
  openGraph: {
    title: "에디트리 영상 제작팀",
    description: "영상 제작팀 내부 업무 시스템",
    siteName: "에디트리",
    type: "website",
    images: ["/og-image.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-full flex flex-col pb-[env(safe-area-inset-bottom)] md:pb-0">
        <SideNav />
        <div className="flex-1 pb-14 md:pb-0 md:ml-[220px]">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
