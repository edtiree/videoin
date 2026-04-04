"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, openLoginModal } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const activeTab =
    pathname === "/" || pathname.startsWith("/jobs") || pathname.startsWith("/editors") ? "home"
    : pathname.startsWith("/community") ? "community"
    : (pathname.startsWith("/tools") || pathname.startsWith("/review") || pathname.startsWith("/instagram-card") || pathname.startsWith("/youtube-title") || pathname.startsWith("/youtube-shorts") || pathname.startsWith("/screen-material")) ? "ai"
    : pathname.startsWith("/messages") ? "chat"
    : pathname.startsWith("/profile") || pathname.startsWith("/dashboard") || pathname.startsWith("/settlement") || pathname.startsWith("/calendar") || pathname.startsWith("/admin") ? "me"
    : null;

  const handleTabClick = (tab: string) => {
    switch (tab) {
      case "home": router.push("/"); break;
      case "community": router.push("/community"); break;
      case "ai":
        if (!isLoggedIn) { openLoginModal(); return; }
        router.push("/tools");
        break;
      case "chat":
        if (!isLoggedIn) { openLoginModal(); return; }
        router.push("/messages");
        break;
      case "me":
        if (!isLoggedIn) { openLoginModal(); return; }
        router.push("/profile");
        break;
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-toss-gray-100 md:hidden z-50 pb-[env(safe-area-inset-bottom,8px)]">
      <div className="flex items-center justify-around h-14">
        {/* 홈 */}
        <button onClick={() => handleTabClick("home")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === "home" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>
            {activeTab !== "home" && <polyline points="9 22 9 12 15 12 15 22"/>}
          </svg>
          <span className={`text-[10px] font-bold ${activeTab === "home" ? "text-toss-gray-900" : "text-toss-gray-400"}`}>홈</span>
        </button>

        {/* 커뮤니티 */}
        <button onClick={() => handleTabClick("community")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === "community" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span className={`text-[10px] font-bold ${activeTab === "community" ? "text-toss-gray-900" : "text-toss-gray-400"}`}>커뮤니티</span>
        </button>

        {/* 도구 (가운데) */}
        <button onClick={() => handleTabClick("ai")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === "ai" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <span className={`text-[10px] font-bold ${activeTab === "ai" ? "text-toss-gray-900" : "text-toss-gray-400"}`}>도구</span>
        </button>

        {/* 채팅 */}
        <button onClick={() => handleTabClick("chat")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === "chat" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className={`text-[10px] font-bold ${activeTab === "chat" ? "text-toss-gray-900" : "text-toss-gray-400"}`}>채팅</span>
        </button>

        {/* 내 정보 */}
        <button onClick={() => handleTabClick("me")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === "me" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span className={`text-[10px] font-bold ${activeTab === "me" ? "text-toss-gray-900" : "text-toss-gray-400"}`}>내 정보</span>
        </button>
      </div>
    </nav>
  );
}
