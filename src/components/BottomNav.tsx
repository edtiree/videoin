"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("worker"));
    setMounted(true);
  }, []);

  useEffect(() => {
    const onLogin = () => setIsLoggedIn(true);
    const onLogout = () => setIsLoggedIn(false);
    window.addEventListener("worker-login", onLogin);
    window.addEventListener("worker-logout", onLogout);
    return () => {
      window.removeEventListener("worker-login", onLogin);
      window.removeEventListener("worker-logout", onLogout);
    };
  }, []);

  if (!mounted || !isLoggedIn) return null;

  const activeTab = pathname === "/" ? "home"
    : (pathname.startsWith("/tools") || pathname.startsWith("/review") || pathname.startsWith("/instagram-card") || pathname.startsWith("/youtube-title") || pathname.startsWith("/youtube-shorts") || pathname.startsWith("/screen-material")) ? "project"
    : pathname.startsWith("/settlement") ? "settlement"
    : pathname.startsWith("/calendar") ? "calendar"
    : pathname.startsWith("/profile") ? "profile"
    : null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-toss-gray-100 md:hidden z-50 pb-[env(safe-area-inset-bottom,8px)]">
      <div className="flex items-center justify-around h-14">
        {/* 홈 */}
        <button onClick={() => router.push("/")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill={activeTab === "home" ? "currentColor" : "none"} stroke={activeTab === "home" ? "currentColor" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
            {activeTab !== "home" && <polyline points="9 22 9 12 15 12 15 22" />}
          </svg>
          <span className={`text-[10px] font-bold ${activeTab === "home" ? "text-toss-gray-900" : "text-toss-gray-400"}`}>홈</span>
        </button>

        {/* 프로젝트 */}
        <button onClick={() => router.push("/tools")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill={activeTab === "project" ? "currentColor" : "none"} stroke={activeTab === "project" ? "currentColor" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className={`text-[10px] font-bold ${activeTab === "project" ? "text-toss-gray-900" : "text-toss-gray-400"}`}>프로젝트</span>
        </button>

        {/* 정산 */}
        <button onClick={() => router.push("/settlement")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill={activeTab === "settlement" ? "currentColor" : "none"} stroke={activeTab === "settlement" ? "currentColor" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
          <span className={`text-[10px] font-bold ${activeTab === "settlement" ? "text-toss-gray-900" : "text-toss-gray-400"}`}>정산</span>
        </button>

        {/* 달력 */}
        <button onClick={() => router.push("/calendar")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill={activeTab === "calendar" ? "currentColor" : "none"} stroke={activeTab === "calendar" ? "currentColor" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span className={`text-[10px] font-bold ${activeTab === "calendar" ? "text-toss-gray-900" : "text-toss-gray-400"}`}>달력</span>
        </button>

        {/* 내 정보 */}
        <button onClick={() => router.push("/profile")}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill={activeTab === "profile" ? "currentColor" : "none"} stroke={activeTab === "profile" ? "currentColor" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className={`text-[10px] font-bold ${activeTab === "profile" ? "text-toss-gray-900" : "text-toss-gray-400"}`}>내 정보</span>
        </button>
      </div>
    </nav>
  );
}
