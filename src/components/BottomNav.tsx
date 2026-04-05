"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, profile, openLoginModal } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  // 안읽은 채팅 수 폴링
  useEffect(() => {
    if (!isLoggedIn || !profile?.id) return;
    const fetchUnread = () => {
      fetch(`/api/messages?user_id=${profile.id}`)
        .then(r => r.json())
        .then((data: { unread_count: number }[]) => {
          if (Array.isArray(data)) {
            setUnreadCount(data.reduce((sum, t) => sum + (t.unread_count || 0), 0));
          }
        })
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, profile?.id]);

  if (!mounted) return null;

  // 커뮤니티 상세, 채팅 대화방에서는 BottomNav 숨김
  if (/^\/community\/.+/.test(pathname) || /^\/messages\/.+/.test(pathname)) return null;

  const activeTab =
    pathname === "/" || pathname.startsWith("/jobs") || pathname.startsWith("/editors") || pathname.startsWith("/sponsorship") ? "home"
    : pathname.startsWith("/community") ? "community"
    : (pathname.startsWith("/tools") || pathname.startsWith("/review") || pathname.startsWith("/instagram-card") || pathname.startsWith("/youtube-title") || pathname.startsWith("/youtube-shorts") || pathname.startsWith("/screen-material")) ? "ai"
    : pathname.startsWith("/messages") ? "chat"
    : pathname.startsWith("/profile") || pathname.startsWith("/dashboard") || pathname.startsWith("/settlement") || pathname.startsWith("/calendar") || pathname.startsWith("/admin") ? "me"
    : null;

  const tabPaths: Record<string, string> = {
    home: "/",
    community: "/community",
    ai: "/tools",
    chat: "/messages",
    me: "/profile",
  };

  const handleTabClick = (tab: string) => {
    if (tab !== "home" && tab !== "community" && !isLoggedIn) {
      openLoginModal();
      return;
    }
    const targetPath = tabPaths[tab];
    if (activeTab === tab) {
      // 이미 해당 탭이면 새로고침
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push(targetPath);
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
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative">
          <div className="relative">
            <svg width="22" height="22" viewBox="0 0 24 24" fill={activeTab === "chat" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] rounded-full bg-toss-red text-white text-[9px] font-bold flex items-center justify-center px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
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
