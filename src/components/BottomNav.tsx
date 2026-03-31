"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const NEW_WORK_ITEMS = [
  { label: "영상 리뷰", icon: "🎬", href: "/review?new=true" },
  { label: "카드뉴스 메이커", icon: "📸", href: "/instagram-card" },
  { label: "제목 생성기", icon: "✏️", href: "/youtube-title/new" },
  { label: "쇼츠 제작기", icon: "🎬", href: "/youtube-shorts?new=true" },
  { label: "화면자료 제작기", icon: "🖼️", href: "/screen-material?new=true" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("worker"));
    setShowPopup(false);
  }, [pathname]);

  // 팝업 열릴 때 body 스크롤 차단
  useEffect(() => {
    if (showPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showPopup]);

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

  if (!isLoggedIn) return null;

  const activeTab = pathname === "/" ? "home"
    : pathname.startsWith("/tools") ? "tools"
    : pathname.startsWith("/profile") ? "profile"
    : null;

  return (
    <>
      {/* Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowPopup(false)}
          onTouchMove={(e) => e.preventDefault()}>
          <div className="absolute bottom-[60px] left-4 right-4 bg-white rounded-2xl shadow-[0_-2px_20px_rgba(0,0,0,0.12)] border border-toss-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            {NEW_WORK_ITEMS.map((item, i) => (
              <button
                key={item.href}
                onClick={() => { setShowPopup(false); router.push(item.href); }}
                className={`w-full flex items-center justify-between px-5 py-4 hover:bg-toss-gray-50 active:bg-toss-gray-100 transition ${i < NEW_WORK_ITEMS.length - 1 ? "border-b border-toss-gray-50" : ""}`}
              >
                <span className="text-[15px] text-toss-gray-900">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-toss-gray-100 md:hidden z-50 pb-1">
        <div className="flex items-center justify-around h-14">
          {/* 홈 */}
          <button onClick={() => router.push("/")}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1">
            <svg width="26" height="26" viewBox="0 0 24 24" fill={activeTab === "home" ? "#191f28" : "none"} stroke={activeTab === "home" ? "#191f28" : "#b0b8c1"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
              {activeTab !== "home" && <polyline points="9 22 9 12 15 12 15 22" />}
            </svg>
            <span className={`text-[11px] font-bold tracking-tight ${activeTab === "home" ? "text-toss-gray-900" : "text-toss-gray-400"}`}>홈</span>
          </button>

          {/* 프로젝트 */}
          <button onClick={() => router.push("/tools")}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1">
            <svg width="26" height="26" viewBox="0 0 24 24" fill={activeTab === "tools" ? "#191f28" : "none"} stroke={activeTab === "tools" ? "#191f28" : "#b0b8c1"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className={`text-[11px] font-bold tracking-tight ${activeTab === "tools" ? "text-toss-gray-900" : "text-toss-gray-400"}`}>프로젝트</span>
          </button>

          {/* 내 정보 */}
          <button onClick={() => router.push("/profile")}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1">
            <svg width="26" height="26" viewBox="0 0 24 24" fill={activeTab === "profile" ? "#191f28" : "none"} stroke={activeTab === "profile" ? "#191f28" : "#b0b8c1"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className={`text-[11px] font-bold tracking-tight ${activeTab === "profile" ? "text-toss-gray-900" : "text-toss-gray-400"}`}>내 정보</span>
          </button>

          {/* 새 작업 */}
          <button onClick={() => setShowPopup(!showPopup)}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${showPopup ? "bg-toss-gray-900" : "bg-toss-blue"}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <span className={`text-[11px] font-bold tracking-tight ${showPopup ? "text-toss-gray-900" : "text-toss-gray-400"}`}>새 작업</span>
          </button>
        </div>
      </nav>
    </>
  );
}
